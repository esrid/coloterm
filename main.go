package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"html/template"
	"io/fs"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi"
	"github.com/go-chi/chi/middleware"
)

//go:embed all:dist
var static embed.FS

func Assets() (fs.FS, error) {
	return fs.Sub(static, "dist/assets")
}

var assets, _ = Assets()

//go:embed template/*
var tpl embed.FS

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "80"
	}

	router := Routing()
	server := http.Server{
		Addr:              fmt.Sprintf(":%s", port),
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		ReadHeaderTimeout: 2 * time.Second,
		Handler:           router,
	}
	if err := server.ListenAndServe(); err != nil {
		log.Fatalln(err)
	}
}

func Routing() *chi.Mux {
	r := chi.NewRouter()
	r.Use(middleware.AllowContentType("application/json"))
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.CleanPath)
	r.Handle("/assets/*", http.StripPrefix("/assets/", http.FileServer(http.FS(assets))))
	r.Get("/", HandlerError(GetHome))
	r.Post("/generate", HandlerError(PostGenerate))

	return r
}

func GetHome(w http.ResponseWriter, r *http.Request) error {
	t, err := template.ParseFS(static, "dist/index.html")
	if err != nil {
		return err
	}
	if err := t.Execute(w, nil); err != nil {
		return err
	}
	return nil
}

func PostGenerate(w http.ResponseWriter, r *http.Request) error {
	var data ApiCall
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		return err
	}
	if err := SwitchMode(data.GenerateMode, data.Colors, w, r); err != nil {
		return err
	}
	return nil
}

type ErrorHTTP func(w http.ResponseWriter, r *http.Request) error

func HandlerError(next ErrorHTTP) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := next(w, r); err != nil {
			http.Error(w, "Internal server Error", http.StatusInternalServerError)
			return
		}
	}
}
