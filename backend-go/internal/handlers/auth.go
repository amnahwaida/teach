package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/vannyezha/ajar-in/internal/auth"
	"github.com/vannyezha/ajar-in/internal/models"
	"github.com/vannyezha/ajar-in/internal/render"
)

// batas percobaan login per IP
const (
	loginLimiterMax   = 10
	loginLimiterEvery = 15 * time.Minute
)

func (s *Server) loginPage(w http.ResponseWriter, r *http.Request) {
	if userFrom(r) != nil {
		http.Redirect(w, r, s.homeFor(userFrom(r)), http.StatusFound)
		return
	}
	base := render.PageData{Title: "Masuk"}

	// login page pakai query ?err=
	base.FlashErr = r.URL.Query().Get("err")
	render.View(w, "login", base)
}

func (s *Server) loginPost(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Redirect(w, r, "/login?err="+urlEscape("Terjadi kesalahan"), http.StatusFound)
		return
	}

	email := strings.ToLower(strings.TrimSpace(r.FormValue("email")))
	password := r.FormValue("password")

	if email == "" || password == "" {
		http.Redirect(w, r, "/login?err="+urlEscape("Email dan password wajib diisi"), http.StatusFound)
		return
	}

	if !s.loginLimiter.Allow(clientIP(r)) {
		http.Redirect(w, r, "/login?err="+urlEscape("Terlalu banyak percobaan masuk. Coba lagi nanti."), http.StatusFound)
		return
	}

	var user models.User
	err := s.pool.QueryRow(r.Context(), `
		SELECT id, name, email, password_hash, role, status, created_at
		FROM users WHERE email = $1
	`, email).Scan(&user.ID, &user.Name, &user.Email, &user.PasswordHash,
		&user.Role, &user.Status, &user.CreatedAt)
	if err != nil || !auth.ComparePassword(password, user.PasswordHash) {
		http.Redirect(w, r, "/login?err="+urlEscape("Email atau password salah"), http.StatusFound)
		return
	}

	if user.Status != models.StatusActive {
		http.Redirect(w, r, "/login?err="+urlEscape("Akun Anda telah dinonaktifkan"), http.StatusFound)
		return
	}

	token, err := s.sessions.Create(r.Context(), user.ID)
	if err != nil {
		http.Redirect(w, r, "/login?err="+urlEscape("Terjadi kesalahan server"), http.StatusFound)
		return
	}
	s.setSessionCookie(w, token)
	http.Redirect(w, r, s.homeFor(&user), http.StatusFound)
}

func (s *Server) logoutPost(w http.ResponseWriter, r *http.Request) {
	s.clearSession(r, w)
	http.Redirect(w, r, "/login", http.StatusFound)
}

func (s *Server) homeFor(u *models.User) string {
	if u.Role == models.RoleAdmin {
		return "/admin"
	}
	return "/dashboard"
}

func (s *Server) root(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		render.NotFound(w)
		return
	}
	u := userFrom(r)
	if u == nil {
		http.Redirect(w, r, "/login", http.StatusFound)
		return
	}
	http.Redirect(w, r, s.homeFor(u), http.StatusFound)
}

// ---------- API (legacy keperluan JSON) ----------

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (s *Server) apiLogin(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := decodeJSON(r, &req); err != nil {
		render.Error(w, http.StatusBadRequest, "Body JSON tidak valid")
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	if req.Email == "" || req.Password == "" {
		render.Error(w, http.StatusBadRequest, "Email dan password wajib diisi")
		return
	}

	if !s.loginLimiter.Allow(clientIP(r)) {
		render.Error(w, http.StatusTooManyRequests, "Terlalu banyak percobaan masuk. Coba lagi nanti.")
		return
	}

	var user models.User
	err := s.pool.QueryRow(r.Context(), `
		SELECT id, name, email, password_hash, role, status, created_at
		FROM users WHERE email = $1
	`, req.Email).Scan(&user.ID, &user.Name, &user.Email, &user.PasswordHash,
		&user.Role, &user.Status, &user.CreatedAt)
	if err != nil || !auth.ComparePassword(req.Password, user.PasswordHash) {
		render.Error(w, http.StatusUnauthorized, "Email atau password salah")
		return
	}
	if user.Status != models.StatusActive {
		render.Error(w, http.StatusForbidden, "Akun Anda telah dinonaktifkan")
		return
	}

	token, err := s.sessions.Create(r.Context(), user.ID)
	if err != nil {
		render.Error(w, http.StatusInternalServerError, "Terjadi kesalahan server")
		return
	}
	s.setSessionCookie(w, token)

	render.JSON(w, http.StatusOK, map[string]any{
		"user": map[string]any{
			"id": user.ID, "name": user.Name, "email": user.Email, "role": user.Role,
		},
	})
}

func (s *Server) apiLogout(w http.ResponseWriter, r *http.Request) {
	s.clearSession(r, w)
	render.JSON(w, http.StatusOK, map[string]string{"message": "Berhasil keluar"})
}

func (s *Server) apiMe(w http.ResponseWriter, r *http.Request) {
	render.JSON(w, http.StatusOK, map[string]any{
		"id":    userFrom(r).ID,
		"name":  userFrom(r).Name,
		"email": userFrom(r).Email,
		"role":  userFrom(r).Role,
	})
}

func (s *Server) setSessionCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     s.cfg.SessionCookie,
		Value:    token,
		Path:     "/",
		MaxAge:   s.cfg.SessionMaxAgeSec,
		HttpOnly: true,
		Secure:   s.cfg.AppURL != "" && strings.HasPrefix(s.cfg.AppURL, "https://"),
		SameSite: http.SameSiteLaxMode,
	})
}

func (s *Server) clearSession(r *http.Request, w http.ResponseWriter) {
	if c, err := r.Cookie(s.cfg.SessionCookie); err == nil {
		_ = s.sessions.Delete(r.Context(), c.Value)
	}
	http.SetCookie(w, &http.Cookie{
		Name:     s.cfg.SessionCookie,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
	})
}
