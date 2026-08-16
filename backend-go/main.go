package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/vannyezha/ajar-in/internal/auth"
	"github.com/vannyezha/ajar-in/internal/config"
	"github.com/vannyezha/ajar-in/internal/db"
	"github.com/vannyezha/ajar-in/internal/handlers"
	"github.com/vannyezha/ajar-in/internal/session"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("konfigurasi gagal: %v", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("koneksi database gagal: %v", err)
	}
	defer pool.Close()

	if err := db.Migrate(ctx, pool); err != nil {
		log.Fatalf("migrasi gagal: %v", err)
	}

	seedAdmin(ctx, pool, cfg)
	go sessionCleanupLoop(ctx, pool)

	srv := handlers.NewServer(cfg, pool)

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           srv.Handler(),
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	go func() {
		log.Printf("%s berjalan di :%s", cfg.AppName, cfg.Port)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server gagal: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("mematikan server...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = server.Shutdown(shutdownCtx)
}

// seedAdmin membuat akun admin dari env bila belum ada.
func seedAdmin(ctx context.Context, pool *pgxpool.Pool, cfg *config.Config) {
	if cfg.AdminEmail == "" || cfg.AdminPassword == "" {
		log.Println("ADMIN_EMAIL/ADMIN_PASSWORD tidak disetel, lewati pembuatan akun admin")
		return
	}

	var exists bool
	if err := pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM users WHERE role = 'admin' AND email = $1)`,
		cfg.AdminEmail).Scan(&exists); err != nil {
		log.Printf("cek admin gagal: %v", err)
		return
	}
	if exists {
		return
	}

	hash, err := auth.HashPassword(cfg.AdminPassword)
	if err != nil {
		log.Printf("hash password admin gagal: %v", err)
		return
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO users (name, email, password_hash, role, status)
		VALUES ('Super Admin', $1, $2, 'admin', 'active')
	`, cfg.AdminEmail, hash); err != nil {
		log.Printf("buat admin gagal: %v", err)
		return
	}
	log.Printf("akun admin dibuat untuk %s", cfg.AdminEmail)
}

func sessionCleanupLoop(ctx context.Context, pool *pgxpool.Pool) {
	store := session.NewStore(pool, 0, "")
	ticker := time.NewTicker(time.Hour)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := store.CleanupExpired(ctx); err != nil {
				log.Printf("cleanup session gagal: %v", err)
			}
		}
	}
}

var _ = os.Getenv