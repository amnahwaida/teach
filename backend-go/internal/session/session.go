package session

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/vannyezha/ajar-in/internal/models"
)

var (
	ErrNotFound = errors.New("session tidak ditemukan")
	ErrExpired  = errors.New("session sudah kedaluwarsa")
)

type Store struct {
	pool       *pgxpool.Pool
	maxAgeSec  int
	cookieName string
}

func NewStore(pool *pgxpool.Pool, maxAgeSec int, cookieName string) *Store {
	return &Store{pool: pool, maxAgeSec: maxAgeSec, cookieName: cookieName}
}

func (s *Store) CookieName() string { return s.cookieName }
func (s *Store) MaxAgeSec() int     { return s.maxAgeSec }

func newToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// Create membuat session baru untuk user, mengembalikan token plaintext.
func (s *Store) Create(ctx context.Context, userID string) (string, error) {
	token, err := newToken()
	if err != nil {
		return "", err
	}
	expiresAt := time.Now().Add(time.Duration(s.maxAgeSec) * time.Second)

	_, err = s.pool.Exec(ctx,
		`INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`,
		userID, token, expiresAt,
	)
	if err != nil {
		return "", err
	}
	return token, nil
}

// Get memvalidasi token dan mengembalikan user pemilik session.
func (s *Store) Get(ctx context.Context, token string) (*models.User, error) {
	var user models.User

	err := s.pool.QueryRow(ctx, `
		SELECT u.id, u.name, u.email, u.password_hash, u.role, u.status, u.created_at
		FROM sessions s
		JOIN users u ON u.id = s.user_id
		WHERE s.token = $1 AND s.expires_at > now()
	`, token).Scan(
		&user.ID, &user.Name, &user.Email, &user.PasswordHash,
		&user.Role, &user.Status, &user.CreatedAt,
	)
	if err == pgx.ErrNoRows {
		// cek apakah session ada tapi expired (untuk error message yang tepat)
		var exists bool
		if err := s.pool.QueryRow(ctx,
			`SELECT EXISTS(SELECT 1 FROM sessions WHERE token = $1)`, token).Scan(&exists); err != nil {
			return nil, err
		}
		if exists {
			return nil, ErrExpired
		}
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	if user.Status != models.StatusActive && user.Status != models.StatusSuspended {
		return nil, ErrNotFound
	}

	return &user, nil
}

// Delete menghapus satu session (logout).
func (s *Store) Delete(ctx context.Context, token string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM sessions WHERE token = $1`, token)
	return err
}

// DeleteAllForUser menghapus semua session user (mis. saat akun dinonaktifkan).
func (s *Store) DeleteAllForUser(ctx context.Context, userID string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM sessions WHERE user_id = $1`, userID)
	return err
}

// CleanupExpired menghapus session kedaluwarsa.
func (s *Store) CleanupExpired(ctx context.Context) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM sessions WHERE expires_at <= now()`)
	return err
}
