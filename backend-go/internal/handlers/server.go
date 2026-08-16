package handlers

import (
	"context"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/vannyezha/ajar-in/internal/config"
	"github.com/vannyezha/ajar-in/internal/models"
	"github.com/vannyezha/ajar-in/internal/render"
	"github.com/vannyezha/ajar-in/internal/session"
)

type ctxKey int

const userKey ctxKey = 0

type Server struct {
	cfg          *config.Config
	pool         *pgxpool.Pool
	sessions     *session.Store
	limiter      *ipLimiter
	loginLimiter *ipLimiter
}

func NewServer(cfg *config.Config, pool *pgxpool.Pool) *Server {
	return &Server{
		cfg:          cfg,
		pool:         pool,
		sessions:     session.NewStore(pool, cfg.SessionMaxAgeSec, cfg.SessionCookie),
		limiter:      newIPLimiter(limiterMax, limiterEvery),
		loginLimiter: newIPLimiter(loginLimiterMax, loginLimiterEvery),
	}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()

	// Halaman publik
	mux.HandleFunc("GET /login", s.loginPage)
	mux.HandleFunc("POST /login", s.loginPost)
	mux.HandleFunc("POST /logout", s.logoutPost)
	mux.HandleFunc("GET /", s.root)
	mux.HandleFunc("GET /v/{code}", s.viewerPage)

	// API publik
	mux.HandleFunc("GET /api/serve/{code}", s.serveModule)
	mux.HandleFunc("POST /api/submissions", s.createSubmission)

	// Halaman autentikasi (guru & admin)
	mux.HandleFunc("GET /dashboard", s.requirePage(s.dashboardPage))
	mux.HandleFunc("GET /dashboard/upload", s.requirePage(s.uploadPage))
	mux.HandleFunc("GET /dashboard/prompt", s.requirePage(s.promptPage))
	mux.HandleFunc("GET /dashboard/rekap/{id}", s.requirePage(s.rekapPage))
	mux.HandleFunc("GET /admin", s.requirePageRole(models.RoleAdmin, s.adminPage))
	mux.HandleFunc("GET /admin/guru", s.requirePageRole(models.RoleAdmin, s.adminGuruPage))

	// API autentikasi
	mux.HandleFunc("GET /api/auth/me", s.apiAuth(s.apiMe))
	mux.HandleFunc("POST /api/auth/login", s.apiLogin)
	mux.HandleFunc("POST /api/auth/logout", s.apiAuth(s.apiLogout))
	mux.HandleFunc("GET /api/stats", s.apiAuth(s.apiStats))
	mux.HandleFunc("GET /api/modules", s.apiAuth(s.apiModules))
	mux.HandleFunc("GET /api/modules/{id}", s.apiAuth(s.apiModuleGet))
	mux.HandleFunc("PUT /api/modules/{id}", s.apiAuth(s.apiModuleUpdate))
	mux.HandleFunc("DELETE /api/modules/{id}", s.apiAuth(s.apiModuleDelete))
	mux.HandleFunc("GET /api/modules/{id}/rekap", s.apiAuth(s.apiRekap))
	mux.HandleFunc("POST /api/upload", s.apiAuth(s.apiUpload))
	mux.HandleFunc("GET /api/admin/guru", s.apiRole(models.RoleAdmin, s.apiGuruList))
	mux.HandleFunc("POST /api/admin/guru", s.apiRole(models.RoleAdmin, s.apiGuruCreate))
	mux.HandleFunc("PUT /api/admin/guru/{id}", s.apiRole(models.RoleAdmin, s.apiGuruUpdate))
	mux.HandleFunc("DELETE /api/admin/guru/{id}", s.apiRole(models.RoleAdmin, s.apiGuruDelete))

	// Statis
	assets := http.StripPrefix("/assets/", http.FileServer(http.FS(render.StaticFS())))
	mux.Handle("GET /assets/", assets)

	return s.withMiddleware(mux)
}

func (s *Server) withMiddleware(next http.Handler) http.Handler {
	return s.securityHeaders(s.logging(s.recoverPanic(s.session(next))))
}

// session mengisi user dari cookie ke context.
func (s *Server) session(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c, err := r.Cookie(s.cfg.SessionCookie)
		if err != nil || c.Value == "" {
			next.ServeHTTP(w, r)
			return
		}

		user, err := s.sessions.Get(r.Context(), c.Value)
		if err != nil {
			s.sessions.Delete(r.Context(), c.Value)
			next.ServeHTTP(w, r)
			return
		}

		if user.Status != models.StatusActive {
			s.sessions.DeleteAllForUser(r.Context(), user.ID)
			next.ServeHTTP(w, r)
			return
		}

		ctx := context.WithValue(r.Context(), userKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func userFrom(r *http.Request) *models.User {
	u, _ := r.Context().Value(userKey).(*models.User)
	return u
}

// requirePage: halaman harus login, redirect ke /login.
func (s *Server) requirePage(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if userFrom(r) == nil {
			http.Redirect(w, r, "/login", http.StatusFound)
			return
		}
		next(w, r)
	}
}

// requirePageRole: halaman harus login + role tertentu.
func (s *Server) requirePageRole(role string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u := userFrom(r)
		if u == nil {
			http.Redirect(w, r, "/login", http.StatusFound)
			return
		}
		if u.Role != role {
			http.Redirect(w, r, "/", http.StatusFound)
			return
		}
		next(w, r)
	}
}

// apiAuth: API harus login, JSON 401 bila tidak.
func (s *Server) apiAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if userFrom(r) == nil {
			render.Error(w, http.StatusUnauthorized, "Tidak terautentikasi")
			return
		}
		next(w, r)
	}
}

func (s *Server) apiRole(role string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		u := userFrom(r)
		if u == nil {
			render.Error(w, http.StatusUnauthorized, "Tidak terautentikasi")
			return
		}
		if u.Role != role {
			render.Error(w, http.StatusForbidden, "Akses ditolak")
			return
		}
		next(w, r)
	}
}

func (s *Server) securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("X-Frame-Options", "SAMEORIGIN")
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		next.ServeHTTP(w, r)
	})
}

func (s *Server) logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
	})
}

func (s *Server) recoverPanic(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("panic: %v (%s %s)", err, r.Method, r.URL.Path)
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// flashParse membaca query msg/err untuk flash message.
func flashParse(r *http.Request) (string, string) {
	q := r.URL.Query()
	return strings.TrimSpace(q.Get("msg")), strings.TrimSpace(q.Get("err"))
}
