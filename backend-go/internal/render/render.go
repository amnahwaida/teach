package render

import (
	"embed"
	"encoding/json"
	"fmt"
	"html/template"
	"io/fs"
	"net/http"
	"time"

	"github.com/vannyezha/ajar-in/internal/models"
)

//go:embed templates
var templateFS embed.FS

//go:embed static
var staticFS embed.FS

var monthsID = [...]string{
	"Januari", "Februari", "Maret", "April", "Mei", "Juni",
	"Juli", "Agustus", "September", "Oktober", "November", "Desember",
}

func funcMap() template.FuncMap {
	return template.FuncMap{
		"formatDate": func(t time.Time) string {
			return fmt.Sprintf("%d %s %d, %02d:%02d", t.Day(), monthsID[t.Month()-1], t.Year(), t.Hour(), t.Minute())
		},
		"formatBytes": func(n int64) string {
			if n <= 0 {
				return "0 B"
			}
			units := []string{"B", "KB", "MB", "GB"}
			f := float64(n)
			i := 0
			for f >= 1024 && i < len(units)-1 {
				f /= 1024
				i++
			}
			if i == 0 {
				return fmt.Sprintf("%.0f %s", f, units[i])
			}
			return fmt.Sprintf("%.1f %s", f, units[i])
		},
		"formatScore": func(s float64) string {
			if s == float64(int64(s)) {
				return fmt.Sprintf("%.0f", s)
			}
			return fmt.Sprintf("%.1f", s)
		},
		"scoreColor": func(s float64) string {
			if s >= 80 {
				return "var(--success-500)"
			}
			if s >= 60 {
				return "var(--warning-500)"
			}
			return "var(--danger-500)"
		},
		"scoreBg": func(s float64) string {
			if s >= 80 {
				return "rgba(34, 197, 94, 0.15)"
			}
			if s >= 60 {
				return "rgba(245, 158, 11, 0.15)"
			}
			return "rgba(239, 68, 68, 0.15)"
		},
		"avg": func(s []float64) float64 {
			if len(s) == 0 {
				return 0
			}
			sum := 0.0
			for _, v := range s {
				sum += v
			}
			return sum / float64(len(s))
		},
		"add": func(a, b int) int { return a + b },
	}
}

var tmpl *template.Template

var staticRoot fs.FS

func init() {
	base := template.New("").Funcs(funcMap())
	t, err := base.ParseFS(templateFS, "templates/*.html")
	if err != nil {
		panic(fmt.Sprintf("gagal parse template: %v", err))
	}
	tmpl = t

	staticRoot, err = fs.Sub(staticFS, "static")
	if err != nil {
		panic(fmt.Sprintf("gagal muat static: %v", err))
	}
}

func StaticFS() fs.FS {
	return staticRoot
}

// PageData adalah data dasar untuk semua halaman server-rendered.
type PageData struct {
	User     *models.User
	Title    string
	Active   string
	Flash    string
	FlashErr string
}

// JSON menulis response JSON.
func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func Error(w http.ResponseWriter, status int, message string) {
	JSON(w, status, map[string]string{"error": message})
}

// View menulis halaman sesuai nama template.
func View(w http.ResponseWriter, name string, data any) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if err := tmpl.ExecuteTemplate(w, "layout-"+name, data); err != nil {
		fmt.Printf("render error %s: %v\n", name, err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
	}
}

// NotFound halaman sederhana.
func NotFound(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusNotFound)
	_, _ = w.Write([]byte("<h1 style='font-family:sans-serif'>404 - Halaman tidak ditemukan</h1>"))
}