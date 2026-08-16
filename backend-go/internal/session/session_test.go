package session

import (
	"errors"
	"net/url"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/vannyezha/ajar-in/internal/db"
)

// testStore menghubungkan ke DB uji (ajar_test), menjalankan migrasi, dan
// membersihkan tabel. Skip bila DB tidak tersedia.
func testStore(t *testing.T) *Store {
	t.Helper()

	baseURL := os.Getenv("TEST_DATABASE_URL")
	if baseURL == "" {
		baseURL = "postgres://ajar:ajar@localhost:5432/ajar?sslmode=disable"
	}

	admin, err := db.Connect(t.Context(), baseURL)
	if err != nil {
		t.Skipf("DB tidak tersedia (skip): %v", err)
	}
	_, _ = admin.Exec(t.Context(), "CREATE DATABASE ajar_test")
	admin.Close()

	u, err := url.Parse(baseURL)
	if err != nil {
		t.Fatalf("URL DB tidak valid: %v", err)
	}
	u.Path = "/ajar_test"

	pool, err := db.Connect(t.Context(), u.String())
	if err != nil {
		t.Skipf("DB uji tidak tersedia (skip): %v", err)
	}
	t.Cleanup(pool.Close)

	if err := db.Migrate(t.Context(), pool); err != nil {
		t.Fatalf("migrasi gagal: %v", err)
	}
	if _, err := pool.Exec(t.Context(), `TRUNCATE users, sessions CASCADE`); err != nil {
		t.Fatalf("bersihkan tabel gagal: %v", err)
	}
	seedUser(t, pool)
	return NewStore(pool, 3600, "ajar_session_test")
}

func seedUser(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	if _, err := pool.Exec(t.Context(), `
		INSERT INTO users (name, email, password_hash, role, status)
		VALUES ('Sesi Uji', 'sesi@ajar.in', 'hash', 'guru', 'active')
	`); err != nil {
		t.Fatalf("seed user gagal: %v", err)
	}
}

func userID(t *testing.T, pool *pgxpool.Pool) string {
	var id string
	if err := pool.QueryRow(t.Context(),
		`SELECT id FROM users WHERE email = 'sesi@ajar.in'`).Scan(&id); err != nil {
		t.Fatalf("ambil user gagal: %v", err)
	}
	return id
}

func TestStoreCreateDanGet(t *testing.T) {
	st := testStore(t)

	token, err := st.Create(t.Context(), userID(t, st.pool))
	if err != nil {
		t.Fatalf("Create gagal: %v", err)
	}
	if len(token) < 32 {
		t.Fatalf("token terlalu pendek: %q", token)
	}

	user, err := st.Get(t.Context(), token)
	if err != nil {
		t.Fatalf("Get gagal: %v", err)
	}
	if user.Email != "sesi@ajar.in" || user.Role != "guru" {
		t.Fatalf("user tidak sesuai: %#v", user)
	}
}

func TestStoreTokenTidakDitemukan(t *testing.T) {
	st := testStore(t)

	if _, err := st.Get(t.Context(), "tidak-ada-token"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("token asing harus ErrNotFound, got %v", err)
	}
}

func TestStoreSessionKedaluwarsa(t *testing.T) {
	st := testStore(t)
	uid := userID(t, st.pool)

	// sisipkan session yang sudah kedaluwarsa langsung ke DB
	var token string
	if err := st.pool.QueryRow(t.Context(), `
		INSERT INTO sessions (user_id, token, expires_at)
		VALUES ($1, $2, now() - interval '1 hour')
		RETURNING token
	`, uid, "expired-token-xyz").Scan(&token); err != nil {
		t.Fatalf("insert sessio kadaluarsa gagal: %v", err)
	}

	if _, err := st.Get(t.Context(), token); !errors.Is(err, ErrExpired) {
		t.Fatalf("session expired harus ErrExpired, got %v", err)
	}
}

func TestStoreDeleteDanDeleteAllForUser(t *testing.T) {
	st := testStore(t)
	uid := userID(t, st.pool)

	tokenA, err := st.Create(t.Context(), uid)
	if err != nil {
		t.Fatalf("Create A gagal: %v", err)
	}
	tokenB, err := st.Create(t.Context(), uid)
	if err != nil {
		t.Fatalf("Create B gagal: %v", err)
	}
	if tokenA == tokenB {
		t.Fatal("token tidak boleh sama")
	}

	// Delete satu session
	if err := st.Delete(t.Context(), tokenA); err != nil {
		t.Fatalf("Delete gagal: %v", err)
	}
	if _, err := st.Get(t.Context(), tokenA); !errors.Is(err, ErrNotFound) {
		t.Fatalf("token terhapus harus ErrNotFound, got %v", err)
	}

	// DeleteAllForUser menghapus sisanya
	if err := st.DeleteAllForUser(t.Context(), uid); err != nil {
		t.Fatalf("DeleteAllForUser gagal: %v", err)
	}
	if _, err := st.Get(t.Context(), tokenB); !errors.Is(err, ErrNotFound) {
		t.Fatalf("token setelah purge harus ErrNotFound, got %v", err)
	}
}

func TestStoreCleanupExpired(t *testing.T) {
	st := testStore(t)

	if err := st.CleanupExpired(t.Context()); err != nil {
		t.Fatalf("CleanupExpired gagal: %v", err)
	}
	var n int
	if err := st.pool.QueryRow(t.Context(),
		`SELECT count(*) FROM sessions WHERE expires_at <= now()`).Scan(&n); err != nil {
		t.Fatalf("hitung sisa gagal: %v", err)
	}
	if n != 0 {
		t.Fatalf("masih ada %d sessio kedaluwarsa setelah cleanup", n)
	}
}
