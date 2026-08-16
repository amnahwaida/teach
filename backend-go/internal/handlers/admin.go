package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"

	"github.com/vannyezha/ajar-in/internal/auth"
	"github.com/vannyezha/ajar-in/internal/db"
	"github.com/vannyezha/ajar-in/internal/models"
	"github.com/vannyezha/ajar-in/internal/render"
)

type GuruRow struct {
	models.User
	ModuleCount int64
}

func (s *Server) adminPage(w http.ResponseWriter, r *http.Request) {
	u := userFrom(r)
	flash, flashErr := flashParse(r)

	var stats models.Stats
	err := s.pool.QueryRow(r.Context(), `
		SELECT
		  (SELECT count(*) FROM users WHERE role = 'guru'),
		  (SELECT count(*) FROM modules),
		  (SELECT count(*) FROM submissions),
		  (SELECT COALESCE(sum(file_size_bytes), 0) FROM modules)
	`).Scan(&stats.TotalGuru, &stats.TotalModules, &stats.TotalSubmissions, &stats.TotalStorageBytes)
	if err != nil {
		serverError(w, "Gagal memuat statistik", err)
		return
	}

	rows, err := s.pool.Query(r.Context(), `
		SELECT m.id, m.title, m.short_code, m.is_active, m.created_at,
		       (SELECT count(*) FROM submissions sub WHERE sub.module_id = m.id),
		       u.name
		FROM modules m
		JOIN users u ON u.id = m.user_id
		ORDER BY m.created_at DESC
	`)
	if err != nil {
		serverError(w, "Gagal memuat modul", err)
		return
	}
	defer rows.Close()

	var modules []*models.Module
	for rows.Next() {
		var m models.Module
		if err := rows.Scan(&m.ID, &m.Title, &m.ShortCode, &m.IsActive, &m.CreatedAt, &m.SubCount, &m.UserName); err == nil {
			modules = append(modules, &m)
		}
	}

	render.View(w, "admin", struct {
		render.PageData
		Stats   models.Stats
		Modules []*models.Module
	}{
		PageData: render.PageData{User: u, Title: "Dashboard Admin", Active: "admin", Flash: flash, FlashErr: flashErr},
		Stats:    stats,
		Modules:  modules,
	})
}

func (s *Server) adminGuruPage(w http.ResponseWriter, r *http.Request) {
	u := userFrom(r)
	flash, flashErr := flashParse(r)

	rows, err := s.pool.Query(r.Context(), `
		SELECT u.id, u.name, u.email, u.role, u.status, u.created_at,
		       (SELECT count(*) FROM modules m WHERE m.user_id = u.id)
		FROM users u
		WHERE u.role = 'guru'
		ORDER BY u.created_at DESC
	`)
	if err != nil {
		serverError(w, "Gagal memuat daftar guru", err)
		return
	}
	defer rows.Close()

	var guru []GuruRow
	for rows.Next() {
		var g GuruRow
		if err := rows.Scan(&g.ID, &g.Name, &g.Email, &g.Role, &g.Status, &g.CreatedAt, &g.ModuleCount); err != nil {
			serverError(w, "Gagal membaca daftar guru", err)
			return
		}
		guru = append(guru, g)
	}

	render.View(w, "admin-guru", struct {
		render.PageData
		Guru []GuruRow
	}{
		PageData: render.PageData{User: u, Title: "Kelola Guru", Active: "guru", Flash: flash, FlashErr: flashErr},
		Guru:     guru,
	})
}

// ---------- API ----------

func (s *Server) apiGuruList(w http.ResponseWriter, r *http.Request) {
	rows, err := s.pool.Query(r.Context(), `
		SELECT u.id, u.name, u.email, u.role, u.status, u.created_at,
		       (SELECT count(*) FROM modules m WHERE m.user_id = u.id)
		FROM users u
		WHERE u.role = 'guru'
		ORDER BY u.created_at DESC
	`)
	if err != nil {
		serverError(w, "Gagal memuat daftar guru", err)
		return
	}
	defer rows.Close()

	var guru []GuruRow
	for rows.Next() {
		var g GuruRow
		if err := rows.Scan(&g.ID, &g.Name, &g.Email, &g.Role, &g.Status, &g.CreatedAt, &g.ModuleCount); err != nil {
			serverError(w, "Gagal membaca daftar guru", err)
			return
		}
		guru = append(guru, g)
	}
	render.JSON(w, http.StatusOK, map[string]any{"guru": guru})
}

type guruRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Status   string `json:"status"`
}

func (s *Server) apiGuruCreate(w http.ResponseWriter, r *http.Request) {
	var req guruRequest
	if err := decodeJSON(r, &req); err != nil {
		render.Error(w, http.StatusBadRequest, "Body JSON tidak valid")
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	if req.Name == "" || len(req.Name) > 100 {
		render.Error(w, http.StatusBadRequest, "Nama wajib diisi (maksimal 100 karakter)")
		return
	}
	if !validEmail(req.Email) {
		render.Error(w, http.StatusBadRequest, "Email tidak valid")
		return
	}
	if len(req.Password) < 6 {
		render.Error(w, http.StatusBadRequest, "Password minimal 6 karakter")
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		serverError(w, "Gagal membuat akun", err)
		return
	}

	var id string
	err = s.pool.QueryRow(r.Context(), `
		INSERT INTO users (name, email, password_hash, role, status)
		VALUES ($1, $2, $3, 'guru', 'active')
		RETURNING id
	`, req.Name, req.Email, hash).Scan(&id)
	if err != nil {
		if db.IsUniqueViolation(err) {
			render.Error(w, http.StatusConflict, "Email sudah terdaftar")
			return
		}
		serverError(w, "Gagal membuat akun", err)
		return
	}

	render.JSON(w, http.StatusCreated, map[string]any{"guru": map[string]any{"id": id, "name": req.Name, "email": req.Email}})
}

func (s *Server) apiGuruUpdate(w http.ResponseWriter, r *http.Request) {
	admin := userFrom(r)
	id := r.PathValue("id")

	var existing models.User
	err := s.pool.QueryRow(r.Context(), `
		SELECT id, name, email, role, status FROM users WHERE id = $1
	`, id).Scan(&existing.ID, &existing.Name, &existing.Email, &existing.Role, &existing.Status)
	if err == pgx.ErrNoRows {
		render.Error(w, http.StatusNotFound, "Guru tidak ditemukan")
		return
	}
	if err != nil {
		serverError(w, "Gagal memuat guru", err)
		return
	}

	// Proteksi: hanya boleh mengelola akun guru, bukan admin lain
	if existing.Role != models.RoleGuru {
		render.Error(w, http.StatusForbidden, "Tidak dapat mengubah akun admin")
		return
	}

	var req guruRequest
	if err := decodeJSON(r, &req); err != nil {
		render.Error(w, http.StatusBadRequest, "Body JSON tidak valid")
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	set := map[string]any{}
	if req.Name != "" {
		if len(req.Name) > 100 {
			render.Error(w, http.StatusBadRequest, "Nama maksimal 100 karakter")
			return
		}
		set["name"] = req.Name
	}
	if req.Email != "" {
		if !validEmail(req.Email) {
			render.Error(w, http.StatusBadRequest, "Email tidak valid")
			return
		}
		var taken bool
		_ = s.pool.QueryRow(r.Context(),
			`SELECT EXISTS(SELECT 1 FROM users WHERE email = $1 AND id <> $2)`,
			req.Email, id).Scan(&taken)
		if taken {
			render.Error(w, http.StatusConflict, "Email sudah terdaftar")
			return
		}
		set["email"] = req.Email
	}
	if req.Password != "" {
		if len(req.Password) < 6 {
			render.Error(w, http.StatusBadRequest, "Password minimal 6 karakter")
			return
		}
		hash, err := auth.HashPassword(req.Password)
		if err != nil {
			serverError(w, "Gagal menyimpan", err)
			return
		}
		set["password_hash"] = hash
		// reset semua session guru agar password lama tidak dipakai lagi
		_ = s.sessions.DeleteAllForUser(r.Context(), id)
	}
	if req.Status != "" {
		if req.Status != models.StatusActive && req.Status != models.StatusSuspended {
			render.Error(w, http.StatusBadRequest, "Status tidak valid")
			return
		}
		set["status"] = req.Status
		if req.Status == models.StatusSuspended {
			_ = s.sessions.DeleteAllForUser(r.Context(), id)
		}
	}

	if len(set) == 0 {
		render.Error(w, http.StatusBadRequest, "Tidak ada data yang diubah")
		return
	}

	query := "UPDATE users SET "
	args := []any{}
	i := 1
	for col, val := range set {
		query += col + " = $" + strconv.Itoa(i) + ", "
		args = append(args, val)
		i++
	}
	query = query[:len(query)-2] + " WHERE id = $" + strconv.Itoa(i) + " RETURNING id"
	args = append(args, id)

	var updatedID string
	if err := s.pool.QueryRow(r.Context(), query, args...).Scan(&updatedID); err != nil {
		if db.IsUniqueViolation(err) {
			render.Error(w, http.StatusConflict, "Email sudah terdaftar")
			return
		}
		serverError(w, "Gagal memperbarui guru", err)
		return
	}

	// self-suspend: admin menonaktifkan dirinya sendiri -> logout
	if updatedID == admin.ID && req.Status == models.StatusSuspended {
		s.clearSession(r, w)
	}

	render.JSON(w, http.StatusOK, map[string]string{"message": "Guru berhasil diperbarui"})
}

func (s *Server) apiGuruDelete(w http.ResponseWriter, r *http.Request) {
	admin := userFrom(r)
	id := r.PathValue("id")

	var role string
	err := s.pool.QueryRow(r.Context(),
		`SELECT role FROM users WHERE id = $1`, id).Scan(&role)
	if err == pgx.ErrNoRows {
		render.Error(w, http.StatusNotFound, "Guru tidak ditemukan")
		return
	}
	if err != nil {
		serverError(w, "Gagal memuat guru", err)
		return
	}

	if role != models.RoleGuru {
		render.Error(w, http.StatusForbidden, "Tidak dapat menghapus akun admin")
		return
	}
	if id == admin.ID {
		render.Error(w, http.StatusBadRequest, "Tidak dapat menghapus akun sendiri")
		return
	}

	// hapus file modul guru sebelum user dihapus (cascade menghapus record DB)
	rows, err := s.pool.Query(r.Context(),
		`SELECT file_path FROM modules WHERE user_id = $1`, id)
	if err == nil {
		for rows.Next() {
			var fp string
			if rows.Scan(&fp) == nil {
				_ = s.removeModuleFile(fp)
			}
		}
		rows.Close()
	}

	if _, err := s.pool.Exec(r.Context(), `DELETE FROM users WHERE id = $1`, id); err != nil {
		serverError(w, "Gagal menghapus guru", err)
		return
	}

	render.JSON(w, http.StatusOK, map[string]string{"message": "Guru berhasil dihapus"})
}

func validEmail(email string) bool {
	if len(email) < 5 || len(email) > 255 || !strings.Contains(email, "@") {
		return false
	}
	at := strings.LastIndex(email, "@")
	return at > 0 && at < len(email)-2 && !strings.Contains(email[at+1:], "@") && strings.Contains(email[at+1:], ".")
}

