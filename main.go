package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"time"
)

func main() {
	router := Routing()
	server := http.Server{
		Addr:              ":9101",
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		ReadHeaderTimeout: 2 * time.Second,
		Handler:           router,
	}
	fmt.Println("http://localhost:9101/home")
	if err := server.ListenAndServe(); err != nil {
		log.Fatalln(err)
	}
}

func Routing() *http.ServeMux {
	router := http.NewServeMux()
	router.Handle("/assets/*", http.StripPrefix("/assets/", http.FileServer(http.Dir("./dist/assets/"))))
	router.HandleFunc("GET /home", GetHome)
	router.HandleFunc("POST /generate", PostGenerate)

	return router
}

func GetHome(w http.ResponseWriter, r *http.Request) {
	t, err := template.ParseFiles("./dist/index.html")
	if err != nil {
		fmt.Printf("%s", err)
		return
	}
	if err := t.Execute(w, nil); err != nil {
		fmt.Printf("%s", err)
		return
	}
}

func PostGenerate(w http.ResponseWriter, r *http.Request) {
	var data ApiCall
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, "Failed to decode request body", http.StatusInternalServerError)
		fmt.Println("Error decoding request body:", err)
		return
	}
	SwitchMode(data.GenerateMode, data.Colors, w, r)
}
