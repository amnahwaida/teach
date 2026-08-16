package handlers

import (
	"crypto/rand"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/jackc/pgx/v5"

	"github.com/vannyezha/ajar-in/internal/db"
	"github.com/vannyezha/ajar-in/internal/models"
	"github.com/vannyezha/ajar-in/internal/prompts"
	"github.com/vannyezha/ajar-in/internal/render"
)

// ---------- Halaman ----------

func (s *Server) dashboardPage(w http.ResponseWriter, r *http.Request) {
	u := userFrom(r)
	flash, flashErr := flashParse(r)

	stats, err := s.statsFor(r, u)
	if err != nil {
		serverError(w, "Gagal memuat statistik", err)
		return
	}

	var modules []*models.Module
	if u.Role == models.RoleAdmin {
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
		for rows.Next() {
			var m models.Module
			if err := rows.Scan(&m.ID, &m.Title, &m.ShortCode, &m.IsActive, &m.CreatedAt, &m.SubCount, &m.UserName); err != nil {
				log.Printf("skip baris modul: %v", err)
				continue
			}
			modules = append(modules, &m)
		}
	} else {
		rows, err := s.pool.Query(r.Context(), `
			SELECT m.id, m.title, m.short_code, m.is_active, m.created_at,
			       (SELECT count(*) FROM submissions sub WHERE sub.module_id = m.id)
			FROM modules m
			WHERE m.user_id = $1
			ORDER BY m.created_at DESC
		`, u.ID)
		if err != nil {
			serverError(w, "Gagal memuat modul", err)
			return
		}
		defer rows.Close()
		for rows.Next() {
			var m models.Module
			if err := rows.Scan(&m.ID, &m.Title, &m.ShortCode, &m.IsActive, &m.CreatedAt, &m.SubCount); err != nil {
				log.Printf("skip baris modul: %v", err)
				continue
			}
			modules = append(modules, &m)
		}
	}

	render.View(w, "dashboard", struct {
		render.PageData
		Stats   models.Stats
		Modules []*models.Module
	}{
		PageData: render.PageData{User: u, Title: "Dashboard", Active: "dashboard", Flash: flash, FlashErr: flashErr},
		Stats:    stats,
		Modules:  modules,
	})
}

func (s *Server) uploadPage(w http.ResponseWriter, r *http.Request) {
	u := userFrom(r)
	flash, flashErr := flashParse(r)
	render.View(w, "upload", struct {
		render.PageData
		MaxFileSizeBytes int64
	}{
		PageData:         render.PageData{User: u, Title: "Upload Modul", Active: "upload", Flash: flash, FlashErr: flashErr},
		MaxFileSizeBytes: s.cfg.MaxFileSizeBytes,
	})
}

func (s *Server) promptPage(w http.ResponseWriter, r *http.Request) {
	u := userFrom(r)
	render.View(w, "prompt", struct {
		render.PageData
		Prompts    []prompts.Prompt
		Categories []string
	}{
		PageData:   render.PageData{User: u, Title: "Pustaka Prompt", Active: "prompt"},
		Prompts:    prompts.All(),
		Categories: prompts.Categories(),
	})
}

func (s *Server) rekapPage(w http.ResponseWriter, r *http.Request) {
	u := userFrom(r)
	id := r.PathValue("id")

	var module models.Module
	err := s.pool.QueryRow(r.Context(), `
		SELECT id, user_id, title, short_code, is_active FROM modules WHERE id = $1
	`, id).Scan(&module.ID, &module.UserID, &module.Title, &module.ShortCode, &module.IsActive)
	if err == pgx.ErrNoRows {
		render.Error(w, http.StatusNotFound, "Modul tidak ditemukan")
		return
	}
	if err != nil {
		serverError(w, "Gagal memuat modul", err)
		return
	}

	if u.Role != models.RoleAdmin && module.UserID != u.ID {
		render.Error(w, http.StatusForbidden, "Akses ditolak")
		return
	}

	rows, err := s.pool.Query(r.Context(), `
		SELECT id, student_name, student_class, score, submitted_at
		FROM submissions WHERE module_id = $1 ORDER BY submitted_at DESC
	`, id)
	if err != nil {
		serverError(w, "Gagal memuat rekap", err)
		return
	}
	defer rows.Close()

	var subs []models.Submission
	for rows.Next() {
		var sub models.Submission
		if err := rows.Scan(&sub.ID, &sub.StudentName, &sub.StudentClass, &sub.Score, &sub.SubmittedAt); err != nil {
			serverError(w, "Gagal membaca rekap", err)
			return
		}
		subs = append(subs, sub)
	}

	maxScore, minScore, sum := 0.0, 0.0, 0.0
	if len(subs) > 0 {
		minScore = subs[0].Score
		for _, s := range subs {
			if s.Score > maxScore {
				maxScore = s.Score
			}
			if s.Score < minScore {
				minScore = s.Score
			}
			sum += s.Score
		}
	}

	render.View(w, "rekap", struct {
		render.PageData
		Module        models.Module
		Submissions   []models.Submission
		TotalStudents int
		AvgScore      float64
		MaxScore      float64
		MinScore      float64
	}{
		PageData:      render.PageData{User: u, Title: "Rekap Penilaian", Active: "dashboard"},
		Module:        module,
		Submissions:   subs,
		TotalStudents: len(subs),
		AvgScore:      safeDiv(sum, float64(len(subs))),
		MaxScore:      maxScore,
		MinScore:      minScore,
	})
}

// ---------- JSON API ----------

func (s *Server) apiStats(w http.ResponseWriter, r *http.Request) {
	u := userFrom(r)

	if u.Role == models.RoleAdmin {
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
		render.JSON(w, http.StatusOK, stats)
		return
	}

	stats, err := s.statsFor(r, u)
	if err != nil {
		serverError(w, "Gagal memuat statistik", err)
		return
	}
	render.JSON(w, http.StatusOK, stats)
	return
}

func (s *Server) statsFor(r *http.Request, u *models.User) (models.Stats, error) {
	var stats models.Stats
	err := s.pool.QueryRow(r.Context(), `
		SELECT
		  (SELECT count(*) FROM modules WHERE user_id = $1),
		  (SELECT count(*) FROM submissions sub JOIN modules m ON m.id = sub.module_id WHERE m.user_id = $1),
		  (SELECT COALESCE(sum(file_size_bytes), 0) FROM modules WHERE user_id = $1)
	`, u.ID).Scan(&stats.TotalModules, &stats.TotalSubmissions, &stats.TotalStorageBytes)
	return stats, err
}

func (s *Server) apiModules(w http.ResponseWriter, r *http.Request) {
	u := userFrom(r)

	rows, err := s.pool.Query(r.Context(), `
		SELECT m.id, m.title, m.short_code, m.is_active, m.created_at,
		       (SELECT count(*) FROM submissions sub WHERE sub.module_id = m.id),
		       u.name
		FROM modules m
		JOIN users u ON u.id = m.user_id
		WHERE $1::bool OR m.user_id = $2
		ORDER BY m.created_at DESC
	`, u.Role == models.RoleAdmin, u.ID)
	if err != nil {
		serverError(w, "Gagal memuat modul", err)
		return
	}
	defer rows.Close()

	var modules []*models.Module
	for rows.Next() {
		var m models.Module
		if err := rows.Scan(&m.ID, &m.Title, &m.ShortCode, &m.IsActive, &m.CreatedAt, &m.SubCount, &m.UserName); err != nil {
			serverError(w, "Gagal membaca modul", err)
			return
		}
		modules = append(modules, &m)
	}
	render.JSON(w, http.StatusOK, map[string]any{"modules": modules})
}

func (s *Server) apiModuleGet(w http.ResponseWriter, r *http.Request) {
	u := userFrom(r)
	m, err := s.getModule(r, r.PathValue("id"))
	if err == pgx.ErrNoRows {
		render.Error(w, http.StatusNotFound, "Modul tidak ditemukan")
		return
	}
	if err != nil {
		serverError(w, "Gagal memuat modul", err)
		return
	}
	if !canAccess(u, m) {
		render.Error(w, http.StatusForbidden, "Akses ditolak")
		return
	}
	render.JSON(w, http.StatusOK, map[string]any{"module": m})
}

type moduleUpdateRequest struct {
	Title     *string `json:"title"`
	ShortCode *string `json:"shortCode"`
	IsActive  *bool   `json:"isActive"`
}

func (s *Server) apiModuleUpdate(w http.ResponseWriter, r *http.Request) {
	u := userFrom(r)
	id := r.PathValue("id")

	var req moduleUpdateRequest
	if err := decodeJSON(r, &req); err != nil {
		render.Error(w, http.StatusBadRequest, "Body JSON tidak valid")
		return
	}

	existing, err := s.getModule(r, id)
	if err == pgx.ErrNoRows {
		render.Error(w, http.StatusNotFound, "Modul tidak ditemukan")
		return
	}
	if err != nil {
		serverError(w, "Gagal memuat modul", err)
		return
	}
	if !canAccess(u, existing) {
		render.Error(w, http.StatusForbidden, "Akses ditolak")
		return
	}

	set := map[string]any{}
	if req.Title != nil {
		t := strings.TrimSpace(*req.Title)
		if t == "" || len(t) > 255 {
			render.Error(w, http.StatusBadRequest, "Judul wajib diisi dan maksimal 255 karakter")
			return
		}
		set["title"] = t
	}
	if req.ShortCode != nil {
		code := strings.TrimSpace(*req.ShortCode)
		if code != "" && code != existing.ShortCode {
			if !isValidShortCode(code) {
				render.Error(w, http.StatusBadRequest, "Custom link hanya boleh berisi huruf, angka, dan tanda hubung (-), maksimal 20 karakter")
				return
			}
			var exists bool
			if err := s.pool.QueryRow(r.Context(),
				`SELECT EXISTS(SELECT 1 FROM modules WHERE short_code = $1 AND id <> $2)`,
				code, id).Scan(&exists); err != nil {
				serverError(w, "Gagal memeriksa custom link", err)
				return
			}
			if exists {
				render.Error(w, http.StatusConflict, "Custom link sudah digunakan")
				return
			}
			set["short_code"] = code
		} else if code == "" {
			render.Error(w, http.StatusBadRequest, "Custom link tidak boleh kosong (gunakan tombol Edit untuk mengatur ulang)")
			return
		}
	}
	if req.IsActive != nil {
		set["is_active"] = *req.IsActive
	}

	if len(set) == 0 {
		render.Error(w, http.StatusBadRequest, "Tidak ada data yang diubah")
		return
	}

	// bangun query dinamis (kolom berasal dari whitelist kunci request)
	query, args := buildUpdateQuery("modules", "id", set, id)

	var newID string
	if err := s.pool.QueryRow(r.Context(), query, args...).Scan(&newID); err != nil {
		if db.IsUniqueViolation(err) {
			render.Error(w, http.StatusConflict, "Custom link sudah digunakan")
			return
		}
		serverError(w, "Gagal memperbarui modul", err)
		return
	}

	m, err := s.getModule(r, newID)
	if err != nil {
		serverError(w, "Gagal memuat modul", err)
		return
	}
	render.JSON(w, http.StatusOK, map[string]any{"module": m})
}

func (s *Server) apiModuleDelete(w http.ResponseWriter, r *http.Request) {
	u := userFrom(r)
	id := r.PathValue("id")

	existing, err := s.getModule(r, id)
	if err == pgx.ErrNoRows {
		render.Error(w, http.StatusNotFound, "Modul tidak ditemukan")
		return
	}
	if err != nil {
		serverError(w, "Gagal memuat modul", err)
		return
	}
	if !canAccess(u, existing) {
		render.Error(w, http.StatusForbidden, "Akses ditolak")
		return
	}

	if _, err := s.pool.Exec(r.Context(), `DELETE FROM modules WHERE id = $1`, id); err != nil {
		serverError(w, "Gagal menghapus modul", err)
		return
	}

	// hapus file dari disk (jangan fatal jika gagal)
	_ = s.removeModuleFile(existing.FilePath)

	render.JSON(w, http.StatusOK, map[string]string{"message": "Modul berhasil dihapus"})
}

func (s *Server) getModule(r *http.Request, id string) (*models.Module, error) {
	var m models.Module
	err := s.pool.QueryRow(r.Context(), `
		SELECT id, user_id, title, short_code, file_path, file_size_bytes, is_active, created_at,
		       (SELECT count(*) FROM submissions sub WHERE sub.module_id = modules.id),
		       (SELECT name FROM users WHERE id = modules.user_id)
		FROM modules WHERE id = $1
	`, id).Scan(&m.ID, &m.UserID, &m.Title, &m.ShortCode, &m.FilePath,
		&m.FileSizeBytes, &m.IsActive, &m.CreatedAt, &m.SubCount, &m.UserName)
	return &m, err
}

func (s *Server) removeModuleFile(filePath string) error {
	if filePath == "" {
		return nil
	}
	p := filepath.Join(s.cfg.UploadDir, filepath.Base(filePath))
	if _, err := os.Stat(p); err == nil {
		return os.Remove(p)
	}
	return nil
}

// ---------- Upload ----------

var allowedExt = map[string]bool{".html": true, ".htm": true}

func (s *Server) apiUpload(w http.ResponseWriter, r *http.Request) {
	u := userFrom(r)

	if err := r.ParseMultipartForm(s.cfg.MaxFileSizeBytes + 1<<20); err != nil {
		render.Error(w, http.StatusBadRequest, "File terlalu besar atau tidak valid (maks 5MB)")
		return
	}

	_, fileHeader, err := r.FormFile("file")
	if err != nil {
		render.Error(w, http.StatusBadRequest, "File wajib diisi")
		return
	}
	title := strings.TrimSpace(r.FormValue("title"))
	customLink := strings.TrimSpace(r.FormValue("customLink"))

	if title == "" || len(title) > 255 {
		render.Error(w, http.StatusBadRequest, "Judul modul wajib diisi (maksimal 255 karakter)")
		return
	}

	// 1. Validasi ekstensi
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if !allowedExt[ext] {
		render.Error(w, http.StatusBadRequest, "Hanya file .html atau .htm yang diperbolehkan")
		return
	}

	// 2. Validasi ukuran
	if fileHeader.Size > s.cfg.MaxFileSizeBytes {
		render.Error(w, http.StatusBadRequest, "Ukuran file maksimal 5MB")
		return
	}

	// 3. Validasi konten HTML (sniff awal file)
	file, err := fileHeader.Open()
	if err != nil {
		serverError(w, "Gagal membaca file", err)
		return
	}
	defer file.Close()

	head := make([]byte, 512)
	n, err := io.ReadFull(file, head)
	if err != nil && err != io.ErrUnexpectedEOF {
		serverError(w, "Gagal membaca file", err)
		return
	}
	headStr := strings.ToLower(strings.TrimSpace(string(head[:n])))
	if !(strings.HasPrefix(headStr, "<!doctype html") || strings.HasPrefix(headStr, "<html")) {
		render.Error(w, http.StatusBadRequest, "File bukan HTML yang valid")
		return
	}
	if seeker, ok := file.(io.Seeker); ok {
		_, _ = seeker.Seek(0, io.SeekStart)
	}

	// 4. Validasi custom link SEBELUM menulis file (hindari file yatim)
	shortCode := ""
	if customLink != "" {
		if !isValidShortCode(customLink) {
			render.Error(w, http.StatusBadRequest, "Custom link hanya boleh berisi huruf, angka, dan tanda hubung (-), maksimal 20 karakter")
			return
		}
		var exists bool
		if err := s.pool.QueryRow(r.Context(),
			`SELECT EXISTS(SELECT 1 FROM modules WHERE short_code = $1)`, customLink).Scan(&exists); err != nil {
			serverError(w, "Gagal memeriksa custom link", err)
			return
		}
		if exists {
			render.Error(w, http.StatusConflict, "Custom link sudah digunakan, silakan pilih yang lain")
			return
		}
		shortCode = customLink
	}

	// 5. Simpan file dengan nama UUID
	fileName := fmt.Sprintf("%s%s", randomUUID(), ext)
	destPath := filepath.Join(s.cfg.UploadDir, fileName)
	nWritten, err := writeFile(destPath, file, s.cfg.MaxFileSizeBytes)
	if err != nil {
		serverError(w, "Gagal menyimpan file", err)
		return
	}

	// 6. Buat record modul (retry hanya untuk shortcode acak)
	for attempt := 0; attempt < 3; attempt++ {
		if shortCode == "" {
			shortCode = randomShortCode(8)
		}
		var moduleID string
		err := s.pool.QueryRow(r.Context(), `
			INSERT INTO modules (user_id, title, short_code, file_path, file_size_bytes)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id
		`, u.ID, title, shortCode, fileName, nWritten).Scan(&moduleID)
		if err == nil {
			render.JSON(w, http.StatusCreated, map[string]any{
				"shortCode": shortCode,
				"module":    map[string]any{"id": moduleID, "title": title, "shortCode": shortCode},
			})
			return
		}
		if db.IsUniqueViolation(err) {
			if customLink != "" {
				// custom link bentrok karena race setelah cek EXISTS:
				// jangan diam-diam mengganti link pilihan guru
				_ = os.Remove(destPath)
				render.Error(w, http.StatusConflict, "Custom link sudah digunakan, silakan pilih yang lain")
				return
			}
			if attempt < 2 {
				shortCode = "" // regenerate
				continue
			}
		}
		// gagal permanen: bersihkan file
		_ = os.Remove(destPath)
		serverError(w, "Gagal menyimpan modul", err)
		return
	}
}

func randomUUID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

const shortCodeAlphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

// bit batas bawah kelipatan 62 terbesar yang < 256 (reject sampling
// menghilangkan bias modular pada randomShortCode)
const shortCodeReject = uint8(256 - 256%len(shortCodeAlphabet))

func randomShortCode(n int) string {
	out := make([]byte, n)
	buf := make([]byte, n*2)
	for i := 0; i < n; {
		_, _ = rand.Read(buf)
		for _, c := range buf {
			if i >= n {
				break
			}
			if c < shortCodeReject {
				out[i] = shortCodeAlphabet[int(c)%len(shortCodeAlphabet)]
				i++
			}
		}
	}
	return string(out)
}

func isValidShortCode(code string) bool {
	return len(code) > 0 && len(code) <= 20 && matchAlnumDash(code)
}

func matchAlnumDash(code string) bool {
	for _, c := range code {
		if !((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '-') {
			return false
		}
	}
	return true
}

// writeFile menyalin konten ke dest dan mengembalikan jumlah byte aktual.
func writeFile(dest string, src io.Reader, maxBytes int64) (int64, error) {
	f, err := os.Create(dest)
	if err != nil {
		return 0, err
	}
	defer f.Close()
	n, err := io.Copy(f, src)
	if err != nil {
		return n, err
	}
	if n > maxBytes {
		return n, errors.New("file terlalu besar")
	}
	return n, nil
}

func serverError(w http.ResponseWriter, msg string, err error) {
	log.Printf("%s: %v", msg, err)
	render.Error(w, http.StatusInternalServerError, "Terjadi kesalahan server")
}

func safeDiv(a, b float64) float64 {
	if b == 0 {
		return 0
	}
	return a / b
}

func canAccess(u *models.User, m *models.Module) bool {
	return u.Role == models.RoleAdmin || m.UserID == u.ID
}
