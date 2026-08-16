package render

import (
	"bytes"
	"html/template"
	"strings"
	"testing"
	"time"
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
