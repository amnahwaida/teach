package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	Port             string
	DatabaseURL      string
	UploadDir        string
	SessionCookie    string
	SessionMaxAgeSec int
	MaxFileSizeBytes int64
	AdminEmail       string
	AdminPassword    string
	AppName          string
	AppURL           string
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getenvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:             getenv("PORT", "3000"),
		DatabaseURL:      getenv("DATABASE_URL", "postgres://ajar:ajar@localhost:5432/ajar?sslmode=disable"),
		UploadDir:        getenv("UPLOAD_DIR", "uploads"),
		SessionCookie:    getenv("SESSION_COOKIE", "ajar_session"),
		SessionMaxAgeSec: getenvInt("SESSION_MAX_AGE_SEC", 7*24*3600),
		MaxFileSizeBytes: int64(getenvInt("MAX_FILE_SIZE_MB", 5)) * 1024 * 1024,
		AdminEmail:       getenv("ADMIN_EMAIL", ""),
		AdminPassword:    getenv("ADMIN_PASSWORD", ""),
		AppName:          getenv("APP_NAME", "Ajar.in"),
		AppURL:           getenv("APP_URL", "http://localhost:3000"),
	}

	if err := os.MkdirAll(cfg.UploadDir, 0o755); err != nil {
		return nil, fmt.Errorf("gagal membuat direktori upload: %w", err)
	}

	return cfg, nil
}
