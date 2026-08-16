package render

import (
	"bytes"
	"html/template"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/vannyezha/ajar-in/internal/models"
)

// renderFmt menjalankan ekspresi template dengan funcs produksi.
func renderFmt(t *testing.T, expr string, data any) string {
	t.Helper()
	tpl := template.Must(template.New("t").Funcs(funcMap()).Parse(expr))
	var buf bytes.Buffer
	if err := tpl.Execute(&buf, data); err != nil {
		t.Fatalf("template gagal: %v", err)
	}
	return buf.String()
}

func TestFormatBytes(t *testing.T) {
	cases := map[int64]string{
		0:                      "0 B",
		1:                      "1 B",
		1023:                   "1023 B",
		1024:                   "1.0 KB",
		5 * 1024:               "5.0 KB",
		1024*1024 + 512*1024:   "1.5 MB",
		3 * 1024 * 1024 * 1024: "3.0 GB",
	}
	for in, want := range cases {
		if got := renderFmt(t, `{{formatBytes .}}`, in); got != want {
			t.Errorf("formatBytes(%d) = %q, want %q", in, got, want)
		}
	}
}

func TestFormatScore(t *testing.T) {
	if got := renderFmt(t, `{{formatScore .}}`, float64(80)); got != "80" {
		t.Errorf("formatScore(80) = %q, want \"80\"", got)
	}
	if got := renderFmt(t, `{{formatScore .}}`, 80.5); got != "80.5" {
		t.Errorf("formatScore(80.5) = %q, want \"80.5\"", got)
	}
	if got := renderFmt(t, `{{formatScore .}}`, float64(0)); got != "0" {
		t.Errorf("formatScore(0) = %q, want \"0\"", got)
	}
}

func TestFormatDate(t *testing.T) {
	ts := time.Date(2026, time.August, 16, 9, 5, 0, 0, time.UTC)
	want := "16 Agustus 2026, 09:05"
	if got := renderFmt(t, `{{formatDate .}}`, ts); got != want {
		t.Errorf("formatDate = %q, want %q", got, want)
	}
}

func TestAvgDanAdd(t *testing.T) {
	if got := renderFmt(t, `{{avg .}}`, []float64{80, 90, 100}); got != "90" {
		t.Errorf("avg = %q, want \"90\"", got)
	}
	if got := renderFmt(t, `{{avg .}}`, []float64{}); got != "0" {
		t.Errorf("avg kosong = %q, want \"0\"", got)
	}
	if got := renderFmt(t, `{{add 2 3}}`, nil); got != "5" {
		t.Errorf("add = %q, want \"5\"", got)
	}
}

func TestInitials(t *testing.T) {
	if got := initials("Budi"); got != "B" {
		t.Errorf("initials(Budi) = %q, want \"B\"", got)
	}
	if got := initials(""); got != "?" {
		t.Errorf("initials(\"\") = %q, want \"?\"", got)
	}
	// karakter multi-byte (emoji) tidak boleh terpotong di tengah
	if got := initials("🧠 Naufal"); got != "🧠" {
		t.Errorf("initials emoji = %q, want \"🧠\"", got)
	}
}

// TestViewerSandboxTanpaSameOrigin mengunci: konten modul guru tidak boleh
// mendapat akses origin penuh (tanpa allow-same-origin) dan pesan postMessage
// dari window lain harus ditolak.
func TestViewerSandboxTanpaSameOrigin(t *testing.T) {
	rec := httptest.NewRecorder()
	View(rec, "viewer", struct {
		PageData
		Module   models.Module
		Error    string
		NotFound bool
	}{
		PageData: PageData{Title: "Uji"},
		Module:   models.Module{ID: "m1", Title: "Modul Uji", ShortCode: "abc", IsActive: true},
	})

	out := rec.Body.String()
	if !strings.Contains(out, `sandbox="allow-scripts"`) {
		t.Fatalf("iframe harus punya sandbox=\"allow-scripts\":\n%s", snippet(out, "iframe"))
	}
	if strings.Contains(out, "allow-same-origin") {
		t.Fatalf("sandbox TIDAK boleh mengandung allow-same-origin:\n%s", snippet(out, "iframe"))
	}
	if !strings.Contains(out, "event.origin !== window.location.origin") {
		t.Fatalf("listener message harus memeriksa origin:\n%s", snippet(out, "message"))
	}
}

// TestViewKegagalanRenderMenghasilkan500: render yang gagal tidak boleh
// menulis body parsial dengan status 200.
func TestViewKegagalanRenderMenghasilkan500(t *testing.T) {
	rec := httptest.NewRecorder()
	View(rec, "tidak-ada-template-xyz", PageData{Title: "x"})

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status harus 500, dapat %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "Internal Server Error") {
		t.Fatalf("body harus memuat pesan error server, dapat: %q", rec.Body.String())
	}
}

// snippet mengambil sekeliling teks pertama di output untuk pesan error.
func snippet(out, needle string) string {
	i := strings.Index(out, needle)
	if i < 0 {
		return out[:300]
	}
	lo := i - 120
	if lo < 0 {
		lo = 0
	}
	hi := i + 200
	if hi > len(out) {
		hi = len(out)
	}
	return out[lo:hi]
}

func TestTemplateLayoutsTersedia(t *testing.T) {
	for _, name := range []string{"login", "error", "dashboard", "upload", "prompt", "rekap", "admin", "admin-guru", "viewer"} {
		if tmpl.Lookup("layout-"+name) == nil {
			t.Errorf("layout-%s tidak terdefinisi", name)
		}
	}
	// pastikan partial yang dipakai benar-benar ter-parse tanpa error
	names := []string{}
	for _, nt := range tmpl.Templates() {
		if strings.HasPrefix(nt.Name(), "partial") {
			names = append(names, nt.Name())
		}
	}
	if len(names) == 0 {
		t.Error("tidak ada partial ter-parse")
	}
}
