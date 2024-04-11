package main

import (
	"archive/zip"
	"bytes"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"text/template"
)

type Colors struct {
	Foreground   string `json:"foreground,omitempty"`
	Background   string `json:"background,omitempty"`
	Link         string `json:"link,omitempty"`
	Selected     string `json:"selected,omitempty"`
	SelectedText string `json:"selectedText,omitempty"`
}
type ApiCall struct {
	GenerateMode string `json:"generateMode,omitempty"`
	Colors       Colors `json:"colors,omitempty"`
}

type Iterm struct {
	t            *template.Template
	Foreground   []float64
	Background   []float64
	Link         []float64
	Selected     []float64
	SelectedText []float64
}

type Kitty struct {
	t            *template.Template
	Foreground   []float64
	Background   []float64
	Link         []float64
	Selected     []float64
	SelectedText []float64
}

type Alacritty struct {
	t            *template.Template
	Foreground   []float64
	Background   []float64
	Link         []float64
	Selected     []float64
	SelectedText []float64
}

type HyperJs struct {
	t            *template.Template
	Foreground   []float64
	Background   []float64
	Link         []float64
	Selected     []float64
	SelectedText []float64
}

type Warp struct {
	t          *template.Template
	Foreground string
	Background string
	Accent     string
}
type ZipConfig struct {
	filename string
	data     []byte
}

const maxRGB = 255.0

func RGBAToHex(rgba []float32) string {
	r := strconv.FormatUint(uint64(rgba[0]*255), 16)
	g := strconv.FormatUint(uint64(rgba[1]*255), 16)
	b := strconv.FormatUint(uint64(rgba[2]*255), 16)
	a := strconv.FormatUint(uint64(rgba[3]*255), 16)

	hex := "#" + r + g + b + a

	return hex
}

func ExtractRGBA(str string) ([]float64, error) {
	var result []float64
	rgbaRegex := regexp.MustCompile(`rgba\((\d+), (\d+), (\d+), ([\d.]+)\)`)
	matches := rgbaRegex.FindStringSubmatch(str)
	if len(matches) != 5 {
		return result, fmt.Errorf("invalid RGBA string: %s", str)
	}

	for _, match := range matches[1:] {
		value, err := strconv.ParseFloat(match, 64)
		if err != nil {
			return nil, err
		}
		result = append(result, value)
	}
	return result, nil
}

func Zip(arg1, args2 ZipConfig) (*bytes.Buffer, error) {
	var zipbuffer bytes.Buffer
	writter := zip.NewWriter(&zipbuffer)

	f, err := writter.Create(arg1.filename)
	if err != nil {
		return nil, err
	}

	if _, err := f.Write(arg1.data); err != nil {
		return nil, err
	}

	f2, err := writter.Create(args2.filename)
	if err != nil {
		return nil, err
	}
	if _, err := f2.Write(args2.data); err != nil {
		return nil, err
	}
	if err := writter.Close(); err != nil {
		return nil, err
	}

	return &zipbuffer, nil
}

func (i *Iterm) Decimalize(value float64) float64 {
	return value / maxRGB
}

func (i *Iterm) Convert(c Colors) error {
	var err error
	i.Foreground, err = ExtractRGBA(c.Foreground)
	if err != nil {
		return err
	}
	i.Background, err = ExtractRGBA(c.Background)
	if err != nil {
		return err
	}
	i.Link, err = ExtractRGBA(c.Link)
	if err != nil {
		return err
	}
	i.SelectedText, err = ExtractRGBA(c.SelectedText)
	if err != nil {
		return err
	}
	i.Selected, err = ExtractRGBA(c.Selected)
	if err != nil {
		return err
	}
	return nil
}

func (i *Iterm) Draw(buffer io.Writer, path string) error {
	tmpl, err := template.New("custom").Funcs(template.FuncMap{"decimalize": i.Decimalize}).ParseFiles(path)
	if err != nil {
		return fmt.Errorf("error parsing template file: %v", err)
	}

	if tmpl.Lookup("custom") == nil {
		return errors.New("template 'custom' not found in the parsed files")
	}

	if err := tmpl.ExecuteTemplate(buffer, "custom", i); err != nil {
		return fmt.Errorf("error executing template: %v", err)
	}

	return nil
}

func (i *Iterm) SendZip(data Colors, w http.ResponseWriter, r *http.Request) error {
	if err := i.Convert(data); err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return err
	}
	var xmlBuf bytes.Buffer
	if err := i.Draw(&xmlBuf, "./template/itermTemplate.xml"); err != nil {

		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return fmt.Errorf("failed to create XML content: %v", err)
	}

	b, err := os.ReadFile("./template/InstallIterm.txt")
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return err
	}
	z1 := ZipConfig{
		filename: "HowToInstall.txt",
		data:     b,
	}
	z2 := ZipConfig{
		filename: "colorterm.itermcolors",
		data:     xmlBuf.Bytes(),
	}
	z, err := Zip(z1, z2)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return err
	}

	w.Header().Set("Content-Disposition", "attachment; filename=colorterm.zip")
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Length", strconv.Itoa(z.Len()))

	if _, err := z.WriteTo(w); err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return fmt.Errorf("failed to write ZIP archive to response: %v", err)
	}

	return nil
}

func RGBAFloatToHex(rgba []float64) string {
	R := uint8(rgba[0])
	G := uint8(rgba[1])
	B := uint8(rgba[2])

	hex := fmt.Sprintf("#%02x%02x%02x", R, G, B)
	return hex
}

func (wa *Warp) Convert(c Colors) error {
	var err error
	background, err := ExtractRGBA(c.Background)
	if err != nil {
		return err
	}
	wa.Background = RGBAFloatToHex(background)

	foreground, err := ExtractRGBA(c.Foreground)
	if err != nil {
		return err
	}
	wa.Foreground = RGBAFloatToHex(foreground)
	accent, err := ExtractRGBA(c.Link)
	if err != nil {
		return err
	}
	wa.Accent = RGBAFloatToHex(accent)
	return nil
}

func (wa *Warp) Draw(buffer io.Writer, path string) error {
	tmpl, err := template.New("custom").ParseFiles(path)
	if err != nil {
		return fmt.Errorf("error parsing template file: %v", err)
	}

	if tmpl.Lookup("custom") == nil {
		return errors.New("template 'custom' not found in the parsed files")
	}

	if err := tmpl.ExecuteTemplate(buffer, "custom", wa); err != nil {
		return fmt.Errorf("error executing template: %v", err)
	}

	return nil
}

func (wa *Warp) SendZip(data Colors, w http.ResponseWriter, r *http.Request) error {
	if err := wa.Convert(data); err != nil {
		http.Error(w, "Failed to convert data", http.StatusInternalServerError)
		fmt.Println("Error converting data to YAML:", err)
		return err
	}

	var yamlbuf bytes.Buffer
	if err := wa.Draw(&yamlbuf, "./template/warpTemplate.yaml"); err != nil {
		http.Error(w, "Failed to create YAML content", http.StatusInternalServerError)
		fmt.Println("Error creating XML content:", err)
		return err
	}

	b, err := os.ReadFile("./template/InstallWarp.txt")
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return err
	}
	z1 := ZipConfig{
		filename: "HowToInstall.txt",
		data:     b,
	}
	z2 := ZipConfig{
		filename: "colorterm.yaml",
		data:     yamlbuf.Bytes(),
	}
	z, err := Zip(z1, z2)
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return err
	}

	w.Header().Set("Content-Disposition", "attachment; filename=colorterm.zip")
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Length", strconv.Itoa(z.Len()))

	if _, err := z.WriteTo(w); err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return fmt.Errorf("failed to write ZIP archive to response: %v", err)
	}

	return nil
}

func SwitchMode(t string, c Colors, w http.ResponseWriter, r *http.Request) {
	switch t {
	case "iterm":
		var iterm Iterm
		if err := iterm.SendZip(c, w, r); err != nil {
			return
		}
	case "warp":
		var warp Warp
		if err := warp.SendZip(c, w, r); err != nil {
			return
		}

	}
}
