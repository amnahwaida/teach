package handlers

import (
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// ---------- ipLimiter ----------

func TestIPLimiterBatasDanBlokir(t *testing.T) {
	l := newIPLimiter(3, time.Minute)

	for i := 0; i < 3; i++ {
		if !l.Allow("k1") {
			t.Fatalf("percobaan ke-%d harus diizinkan", i+1)
		}
	}
	if l.Allow("k1") {
		t.Fatal("percobaan ke-4 harus diblokir")
	}
	if l.Allow("k1") {
		t.Fatal("percobaan ke-5 tetap harus diblokir")
	}
}

func TestIPLimiterWindowKadaluarsa(t *testing.T) {
	l := newIPLimiter(2, 20*time.Millisecond)

	l.Allow("k")
	l.Allow("k")
	if l.Allow("k") {
		t.Fatal("harus diblokir saat window masih aktif")
	}

	time.Sleep(40 * time.Millisecond)
	if !l.Allow("k") {
		t.Fatal("window sudah lewat, harus diizinkan lagi")
	}
}

func TestIPLimiterKeyTerpisah(t *testing.T) {
	l := newIPLimiter(1, time.Minute)

	if !l.Allow("a") {
		t.Fatal("key a harus diizinkan")
	}
	if !l.Allow("b") {
		t.Fatal("key b tidak terpengaruh key a")
	}
	if l.Allow("a") {
		t.Fatal("key a sudah lewat batas")
	}
}

func TestIPLimiterPurgeMembatasiMemori(t *testing.T) {
	l := newIPLimiter(5, time.Minute)

	for i := 0; i < 10_001; i++ {
		l.Allow("k" + string(rune('a'+i%26)) + string(rune('0'+i%10)))
	}

	l.mu.Lock()
	n := len(l.count)
	l.mu.Unlock()
	if n > 10_000 {
		t.Fatalf("peta tidak boleh membengkak: %d entri", n)
	}
}

// ---------- clientIP ----------

func TestClientIPTidakPercayaXFF(t *testing.T) {
	r := httptest.NewRequest("GET", "/", nil)
	r.RemoteAddr = "1.2.3.4:5678"
	r.Header.Set("X-Forwarded-For", "9.9.9.9, 8.8.8.8")

	if got := clientIP(r); got != "1.2.3.4" {
		t.Fatalf("XFF harus diabaikan, got %q", got)
	}
}

func TestClientIPVarianRemoteAddr(t *testing.T) {
	cases := map[string]string{
		"1.2.3.4:5678": "1.2.3.4",
		"[::1]:8080":   "::1",
		"1.2.3.4":      "1.2.3.4",
		"10.0.0.1:443": "10.0.0.1",
	}

	for in, want := range cases {
		r := httptest.NewRequest("GET", "/", nil)
		r.RemoteAddr = in
		if got := clientIP(r); got != want {
			t.Errorf("clientIP(%q) = %q, want %q", in, got, want)
		}
	}
}

// ---------- buildUpdateQuery ----------

func TestBuildUpdateQueryKolomTerurut(t *testing.T) {
	set := map[string]any{"is_active": true, "title": "X", "short_code": "abc"}
	q, args := buildUpdateQuery("modules", "id", set, "uid-1")

	want := "UPDATE modules SET is_active = $1, short_code = $2, title = $3 WHERE id = $4 RETURNING id"
	if q != want {
		t.Fatalf("query tidak sesuai:\n got %q\nwant %q", q, want)
	}
	if len(args) != 4 || args[0] != true || args[1] != "abc" || args[2] != "X" || args[3] != "uid-1" {
		t.Fatalf("args tidak sesuai: %#v", args)
	}
}

func TestBuildUpdateQueryNamaKolomTidakDisanitasi(t *testing.T) {
	// kolom diambil dari whitelist kunci request, jadi nama tabel/kolom
	// yang aneh sekalipun hanya menjadi string biasa (tanpa injeksi)
	q, args := buildUpdateQuery(`users; DROP TABLE x; --`, `id`, map[string]any{"name": "N"}, "1")
	if !strings.HasPrefix(q, "UPDATE users; DROP TABLE x; -- SET name = $1 WHERE id = $2 RETURNING id") {
		t.Fatalf("query aneh: %q", q)
	}
	if args[0] != "N" || args[1] != "1" {
		t.Fatalf("args: %#v", args)
	}
}

// ---------- randomShortCode ----------

func TestRandomShortCodePanjangDanKarakter(t *testing.T) {
	for i := 0; i < 100; i++ {
		code := randomShortCode(8)
		if len(code) != 8 {
			t.Fatalf("panjang harus 8, got %q", code)
		}
		for _, c := range code {
			if !strings.ContainsRune(shortCodeAlphabet, c) {
				t.Fatalf("karakter di luar alfabet: %q", c)
			}
		}
	}
}

func TestIsValidShortCode(t *testing.T) {
	valid := []string{"abc", "abc-123", "A1b2", "a" + strings.Repeat("b", 19)}
	for _, s := range valid {
		if !isValidShortCode(s) {
			t.Errorf("%q harus valid", s)
		}
	}

	invalid := []string{"", "ab c", "abc_def", strings.Repeat("a", 21), "abc/def"}
	for _, s := range invalid {
		if isValidShortCode(s) {
			t.Errorf("%q harus invalid", s)
		}
	}
}

// ---------- safeFileName ----------

func TestSafeFileName(t *testing.T) {
	cases := map[string]string{
		"kuis-ipa2": "kuis-ipa2",
		"a b/c<>d":  "a-b-c--d",
		"":          "modul",
		"12_3":      "12_3",
	}
	for in, want := range cases {
		if got := safeFileName(in); got != want {
			t.Errorf("safeFileName(%q) = %q, want %q", in, got, want)
		}
	}
}

// ---------- decodeJSON (batas body) ----------

func TestDecodeJSONBodyTerlaluBesar(t *testing.T) {
	huge := strings.Repeat("a", 2<<20)
	req := httptest.NewRequest("POST", "/", strings.NewReader(`{"x":"`+huge+`"}`))

	var v struct {
		X string `json:"x"`
	}
	if err := decodeJSON(req, &v); err == nil {
		t.Fatal("body >1MB harus ditolak")
	}
	if v.X != "" {
		t.Fatal("tidak boleh ada nilai yang terbaca")
	}
}

func TestDecodeJSONTolakFieldTakDikenal(t *testing.T) {
	req := httptest.NewRequest("POST", "/", strings.NewReader(`{"x":"ok","y":1}`))
	var v struct {
		X string `json:"x"`
	}
	if err := decodeJSON(req, &v); err == nil {
		t.Fatal("field tak dikenal harus ditolak (DisallowUnknownFields)")
	}
}

// ---------- maxStr ----------

func TestMaxStrMemotongBerdasarkanByte(t *testing.T) {
	s := "hél" // 4 byte UTF-8
	if got := maxStr(s, 3); len(got) != 3 {
		t.Fatalf("panjang hasil harus 3 byte, got %d", len(got))
	}
	if got := maxStr("abc", 5); got != "abc" {
		t.Fatalf("di bawah batas tidak boleh berubah: %q", got)
	}
}

// ---------- validEmail ----------

func TestValidEmail(t *testing.T) {
	valid := []string{"a@b.co", "guru@ajar.in", "name+tag@mail.com", "x.y@z.edu"}
	for _, e := range valid {
		if !validEmail(e) {
			t.Errorf("%q harus valid", e)
		}
	}

	invalid := []string{"", "a@b", "@b.com", "a@@b.com", "a@.com", "a@b.com@c.com", "a b@c.com"}
	for _, e := range invalid {
		if validEmail(e) {
			t.Errorf("%q harus invalid", e)
		}
	}
}

// ---------- writeFile ----------

func TestWriteFileMenulisDanMembatasiUkuran(t *testing.T) {
	dir := t.TempDir()

	n, err := writeFile(filepath.Join(dir, "ok.txt"), strings.NewReader("hello world"), 100)
	if err != nil {
		t.Fatalf("tidak boleh gagal: %v", err)
	}
	if n != 11 {
		t.Fatalf("byte aktual = %d, want 11", n)
	}
	b, err := os.ReadFile(filepath.Join(dir, "ok.txt"))
	if err != nil || string(b) != "hello world" {
		t.Fatalf("isi file tidak sesuai: %q, %v", b, err)
	}

	_, err = writeFile(filepath.Join(dir, "big.txt"), strings.NewReader("hello world"), 5)
	if err == nil {
		t.Fatal("melebihi batas harus gagal")
	}
}
