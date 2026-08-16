package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/vannyezha/ajar-in/internal/auth"
	"github.com/vannyezha/ajar-in/internal/config"
	"github.com/vannyezha/ajar-in/internal/db"
)

// ---------- setup ----------

const (
	testAdminEmail = "admin-test@ajar.in"
	testAdminPass  = "admin123"
	testDBName     = "ajar_test"
)

var moduleHTML = []byte("<!DOCTYPE html><html><head><title>t</title></head><body>h</body></html>")

// testPool menghubungkan ke DB uji (membuat ajar_test bila perlu),
// menjalankan migrasi, dan membersihkan semua tabel.
func testPool(t *testing.T) *pgxpool.Pool {
	t.Helper()

	baseURL := os.Getenv("TEST_DATABASE_URL")
	if baseURL == "" {
		baseURL = "postgres://ajar:ajar@localhost:5432/ajar?sslmode=disable"
	}

	admin, err := db.Connect(t.Context(), baseURL)
	if err != nil {
		t.Skipf("DB tidak tersedia (skip): %v", err)
	}
	_, _ = admin.Exec(t.Context(), "CREATE DATABASE "+testDBName)
	admin.Close()

	u, err := url.Parse(baseURL)
	if err != nil {
		t.Fatalf("URL DB tidak valid: %v", err)
	}
	u.Path = "/" + testDBName

	pool, err := db.Connect(t.Context(), u.String())
	if err != nil {
		t.Skipf("DB uji tidak tersedia (skip): %v", err)
	}
	t.Cleanup(pool.Close)

	if err := db.Migrate(t.Context(), pool); err != nil {
		t.Fatalf("migrasi gagal: %v", err)
	}
	if _, err := pool.Exec(t.Context(), `TRUNCATE users, sessions, modules, submissions CASCADE`); err != nil {
		t.Fatalf("bersihkan tabel gagal: %v", err)
	}
	return pool
}

// setupTestServer membangun server lengkap dengan DB uji.
func setupTestServer(t *testing.T) *httptest.Server {
	ts, _ := setupTestServerWithPool(t)
	return ts
}

func setupTestServerWithPool(t *testing.T) (*httptest.Server, *pgxpool.Pool) {
	t.Helper()

	pool := testPool(t)

	hash, err := auth.HashPassword(testAdminPass)
	if err != nil {
		t.Fatalf("hash admin gagal: %v", err)
	}
	if _, err := pool.Exec(t.Context(), `
		INSERT INTO users (name, email, password_hash, role, status)
		VALUES ('Admin Uji', $1, $2, 'admin', 'active')
	`, testAdminEmail, hash); err != nil {
		t.Fatalf("seed admin gagal: %v", err)
	}

	cfg := &config.Config{
		Port:             "0",
		DatabaseURL:      "",
		UploadDir:        t.TempDir(),
		SessionCookie:    "ajar_session_test",
		SessionMaxAgeSec: 3600,
		MaxFileSizeBytes: 5 << 20,
		AdminEmail:       "",
		AdminPassword:    "",
		AppName:          "Ajar.in Uji",
		AppURL:           "http://localhost",
	}

	ts := httptest.NewServer(NewServer(cfg, pool).Handler())
	t.Cleanup(ts.Close)
	return ts, pool
}

func newClient(t *testing.T, ts *httptest.Server) *http.Client {
	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatalf("cookiejar gagal: %v", err)
	}
	// ts.Client() mengembalikan objek yang sama (cache), jadi bangun
	// client baru dengan jar sendiri agar sesi antar-pengguna terpisah
	base := ts.Client()
	return &http.Client{Transport: base.Transport, CheckRedirect: base.CheckRedirect, Jar: jar}
}

func login(t *testing.T, client *http.Client, ts *httptest.Server, email, pass string) int {
	t.Helper()
	resp, err := client.Post(ts.URL+"/api/auth/login", "application/json",
		strings.NewReader(fmt.Sprintf(`{"email":%q,"password":%q}`, email, pass)))
	if err != nil {
		t.Fatalf("login gagal: %v", err)
	}
	resp.Body.Close()
	return resp.StatusCode
}

func loginAdmin(t *testing.T, ts *httptest.Server) *http.Client {
	t.Helper()
	client := newClient(t, ts)
	if code := login(t, client, ts, testAdminEmail, testAdminPass); code != http.StatusOK {
		t.Fatalf("login admin gagal: %d", code)
	}
	return client
}

func createGuru(t *testing.T, client *http.Client, ts *httptest.Server, email, pass string) string {
	t.Helper()
	resp, err := client.Post(ts.URL+"/api/admin/guru", "application/json",
		strings.NewReader(fmt.Sprintf(`{"name":%q,"email":%q,"password":%q}`, email, email, pass)))
	if err != nil {
		t.Fatalf("buat guru gagal: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("buat guru: %d", resp.StatusCode)
	}
	var body struct {
		Guru struct {
			ID string `json:"id"`
		} `json:"guru"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("parse guru gagal: %v", err)
	}
	return body.Guru.ID
}

func uploadModule(t *testing.T, client *http.Client, ts *httptest.Server, title, customLink, content string) (id, shortCode string, status int) {
	t.Helper()

	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	_ = mw.WriteField("title", title)
	if customLink != "" {
		_ = mw.WriteField("customLink", customLink)
	}
	fw, err := mw.CreateFormFile("file", "modul.html")
	if err != nil {
		t.Fatalf("form file gagal: %v", err)
	}
	if _, err := fw.Write([]byte(content)); err != nil {
		t.Fatalf("tulis file gagal: %v", err)
	}
	_ = mw.Close()

	req, err := http.NewRequest("POST", ts.URL+"/api/upload", &buf)
	if err != nil {
		t.Fatalf("request gagal: %v", err)
	}
	req.Header.Set("Content-Type", mw.FormDataContentType())

	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("upload gagal: %v", err)
	}
	defer resp.Body.Close()

	var body struct {
		ShortCode string `json:"shortCode"`
		Module    struct {
			ID string `json:"id"`
		} `json:"module"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&body)
	return body.Module.ID, body.ShortCode, resp.StatusCode
}

func postSubmission(t *testing.T, ts *httptest.Server, moduleID, body string, xff string) int {
	t.Helper()
	req, err := http.NewRequest("POST", ts.URL+"/api/submissions", strings.NewReader(body))
	if err != nil {
		t.Fatalf("request gagal: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if xff != "" {
		req.Header.Set("X-Forwarded-For", xff)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("submit gagal: %v", err)
	}
	resp.Body.Close()
	return resp.StatusCode
}

func submissionBody(moduleID, name string, score int) string {
	return fmt.Sprintf(`{"moduleId":%q,"studentName":%q,"studentClass":"7A","score":%d}`,
		moduleID, name, score)
}

// ---------- tes ----------

func TestLoginRateLimit(t *testing.T) {
	ts := setupTestServer(t)

	for i := 0; i < 11; i++ {
		client := newClient(t, ts)
		code := login(t, client, ts, "siapa@ajar.in", "salah")
		want := http.StatusUnauthorized
		if i == 10 {
			want = http.StatusTooManyRequests
		}
		if code != want {
			t.Fatalf("percobaan ke-%d: got %d, want %d", i+1, code, want)
		}
	}
}

func TestSubmissionRateLimitMengabaikanXFF(t *testing.T) {
	ts := setupTestServer(t)
	client := loginAdmin(t, ts)

	moduleID, _, status := uploadModule(t, client, ts, "Uji XFF", "", string(moduleHTML))
	if status != http.StatusCreated {
		t.Fatal("upload modul gagal")
	}

	for i := 0; i < 6; i++ {
		code := postSubmission(t, ts, moduleID, submissionBody(moduleID, fmt.Sprintf("Siswa %d", i), 80),
			fmt.Sprintf("10.9.%d.1", i))
		want := http.StatusCreated
		if i == 5 {
			want = http.StatusTooManyRequests
		}
		if code != want {
			t.Fatalf("submit ke-%d (XFF %d): got %d, want %d", i+1, i, code, want)
		}
	}
}

func TestSubmissionJawabanTerlaluPanjang(t *testing.T) {
	ts := setupTestServer(t)
	client := loginAdmin(t, ts)

	moduleID, _, status := uploadModule(t, client, ts, "Uji Jawaban", "", string(moduleHTML))
	if status != http.StatusCreated {
		t.Fatal("upload modul gagal")
	}

	big := "[" + strings.Repeat("12345,", 30000) + "0]"
	body := fmt.Sprintf(`{"moduleId":%q,"studentName":"Siswa","studentClass":"7A","score":50,"answersJson":%q}`,
		moduleID, big)
	if len(big) < maxAnswersJSONLen {
		t.Fatalf("data uji harus >100KB, got %d", len(big))
	}

	if code := postSubmission(t, ts, moduleID, body, ""); code != http.StatusBadRequest {
		t.Fatalf("answers >100KB: got %d, want 400", code)
	}
}

func TestSubmissionBodyTerlaluBesar(t *testing.T) {
	ts := setupTestServer(t)
	client := loginAdmin(t, ts)

	moduleID, _, status := uploadModule(t, client, ts, "Uji Body", "", string(moduleHTML))
	if status != http.StatusCreated {
		t.Fatal("upload modul gagal")
	}

	huge := "[" + strings.Repeat("1,", 600000) + "0]"
	body := fmt.Sprintf(`{"moduleId":%q,"studentName":"Siswa","studentClass":"7A","score":50,"answersJson":%q}`,
		moduleID, huge)
	if len(body) < maxJSONBodyBytes {
		t.Fatalf("data uji harus >1MB, got %d", len(body))
	}

	if code := postSubmission(t, ts, moduleID, body, ""); code != http.StatusBadRequest {
		t.Fatalf("body >1MB: got %d, want 400", code)
	}
}

func TestUploadCustomLinkBentrok(t *testing.T) {
	ts := setupTestServer(t)
	client := loginAdmin(t, ts)

	_, _, status := uploadModule(t, client, ts, "Pertama", "konflik-test", string(moduleHTML))
	if status != http.StatusCreated {
		t.Fatalf("upload pertama harus sukses, got %d", status)
	}

	_, _, status = uploadModule(t, client, ts, "Kedua", "konflik-test", string(moduleHTML))
	if status != http.StatusConflict {
		t.Fatalf("custom link sama harus 409, got %d", status)
	}
}

func TestUploadValidasiFile(t *testing.T) {
	ts := setupTestServer(t)
	client := loginAdmin(t, ts)

	// isi bukan HTML
	if _, _, status := uploadModule(t, client, ts, "Bukan Html", "", "not html"); status != http.StatusBadRequest {
		t.Fatalf("isi bukan HTML: got %d, want 400", status)
	}

	// tanpa autentikasi
	anon := newClient(t, ts)
	if _, _, status := uploadModule(t, anon, ts, "Anonim", "", string(moduleHTML)); status != http.StatusUnauthorized {
		t.Fatalf("upload tanpa login: got %d, want 401", status)
	}
}

func TestSuspendMencabutSesiGuru(t *testing.T) {
	ts := setupTestServer(t)
	admin := loginAdmin(t, ts)

	email := "guru-suspend@ajar.in"
	guruID := createGuru(t, admin, ts, email, "guru123")

	guru := newClient(t, ts)
	if code := login(t, guru, ts, email, "guru123"); code != http.StatusOK {
		t.Fatalf("login guru: %d", code)
	}
	if resp, err := guru.Get(ts.URL + "/api/auth/me"); err != nil {
		t.Fatalf("me gagal: %v", err)
	} else {
		resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("me sebelum suspend: %d", resp.StatusCode)
		}
	}

	// admin suspend guru
	req, err := http.NewRequest("PUT", ts.URL+"/api/admin/guru/"+guruID, strings.NewReader(`{"status":"suspended"}`))
	if err != nil {
		t.Fatalf("request gagal: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := admin.Do(req)
	if err != nil {
		t.Fatalf("suspend gagal: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("suspend: %d", resp.StatusCode)
	}

	// sesi lama harus mati
	if resp, err := guru.Get(ts.URL + "/api/auth/me"); err != nil {
		t.Fatalf("me gagal: %v", err)
	} else {
		resp.Body.Close()
		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("me setelah suspend: got %d, want 401", resp.StatusCode)
		}
	}

	// login ulang harus ditolak
	if code := login(t, guru, ts, email, "guru123"); code != http.StatusForbidden {
		t.Fatalf("login guru nonaktif: got %d, want 403", code)
	}
}

func TestAdminTidakBisaMengubahAdminLain(t *testing.T) {
	ts, pool := setupTestServerWithPool(t)
	admin := loginAdmin(t, ts)

	hash, err := auth.HashPassword("rahasia1")
	if err != nil {
		t.Fatalf("hash gagal: %v", err)
	}
	var admin2ID string
	if err := pool.QueryRow(t.Context(), `
		INSERT INTO users (name, email, password_hash, role, status)
		VALUES ('Admin Kedua', 'admin2@ajar.in', $1, 'admin', 'active')
		RETURNING id
	`, hash).Scan(&admin2ID); err != nil {
		t.Fatalf("seed admin kedua gagal: %v", err)
	}

	// ubah admin lain → harus 403
	req, err := http.NewRequest("PUT", ts.URL+"/api/admin/guru/"+admin2ID,
		strings.NewReader(`{"name":"Disusupi"}`))
	if err != nil {
		t.Fatalf("request gagal: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := admin.Do(req)
	if err != nil {
		t.Fatalf("PUT admin lain gagal: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("ubah admin lain: got %d, want 403", resp.StatusCode)
	}

	// hapus admin lain → harus 403
	req, err = http.NewRequest("DELETE", ts.URL+"/api/admin/guru/"+admin2ID, nil)
	if err != nil {
		t.Fatalf("request gagal: %v", err)
	}
	resp, err = admin.Do(req)
	if err != nil {
		t.Fatalf("DELETE admin lain gagal: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden {
		t.Fatalf("hapus admin lain: got %d, want 403", resp.StatusCode)
	}
}

func TestRekapCSV(t *testing.T) {
	ts := setupTestServer(t)
	admin := loginAdmin(t, ts)

	moduleID, _, status := uploadModule(t, admin, ts, "Uji Rekap", "rekap-test", string(moduleHTML))
	if status != http.StatusCreated {
		t.Fatal("upload modul gagal")
	}
	if code := postSubmission(t, ts, moduleID, submissionBody(moduleID, "Andi", 90), ""); code != http.StatusCreated {
		t.Fatalf("submit: %d", code)
	}

	resp, err := admin.Get(ts.URL + "/api/modules/" + moduleID + "/rekap?format=csv")
	if err != nil {
		t.Fatalf("rekap gagal: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("rekap: %d", resp.StatusCode)
	}
	buf := new(bytes.Buffer)
	_, _ = buf.ReadFrom(resp.Body)

	// BOM UTF-8
	if !bytes.HasPrefix(buf.Bytes(), []byte{0xEF, 0xBB, 0xBF}) {
		t.Fatal("CSV harus diawali BOM")
	}
	body := buf.String()
	if !strings.Contains(body, "Nama Siswa") || !strings.Contains(body, "Andi") {
		t.Fatalf("isi CSV tidak sesuai:\n%s", body)
	}
}
