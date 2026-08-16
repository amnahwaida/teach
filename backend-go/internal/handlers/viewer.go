package handlers

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/vannyezha/ajar-in/internal/models"
	"github.com/vannyezha/ajar-in/internal/render"
)

// ---------- Halaman viewer (siswa) ----------

func (s *Server) viewerPage(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")

	var m models.Module
	err := s.pool.QueryRow(r.Context(), `
		SELECT id, title, short_code, is_active FROM modules WHERE short_code = $1
	`, code).Scan(&m.ID, &m.Title, &m.ShortCode, &m.IsActive)
	if err == pgx.ErrNoRows || m.ID == "" {
		render.View(w, "viewer", struct {
			render.PageData
			Module   models.Module
			Error    string
			NotFound bool
		}{PageData: render.PageData{Title: "Link Tidak Ditemukan"}, Error: "Link tidak ditemukan", NotFound: true})
		return
	}
	if err != nil {
		serverError(w, "Terjadi kesalahan server", err)
		return
	}
	if !m.IsActive {
		render.View(w, "viewer", struct {
			render.PageData
			Module   models.Module
			Error    string
			NotFound bool
		}{PageData: render.PageData{Title: "Modul Tidak Aktif"}, Error: "Modul ini sedang tidak aktif"})
		return
	}

	render.View(w, "viewer", struct {
		render.PageData
		Module models.Module
	}{
		PageData: render.PageData{Title: m.Title},
		Module:   m,
	})
}

// serveModule melayani file HTML guru di dalam iframe.
func (s *Server) serveModule(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")

	var m models.Module
	err := s.pool.QueryRow(r.Context(), `
		SELECT id, short_code, file_path, is_active FROM modules WHERE short_code = $1
	`, code).Scan(&m.ID, &m.ShortCode, &m.FilePath, &m.IsActive)
	if err == pgx.ErrNoRows {
		http.Error(w, "404 - Modul tidak ditemukan", http.StatusNotFound)
		return
	}
	if err != nil {
		serverError(w, "Terjadi kesalahan server", err)
		return
	}
	if !m.IsActive {
		http.Error(w, "Modul sedang tidak aktif", http.StatusForbidden)
		return
	}

	// aman dari path traversal: hanya ambil basename
	filePath := filepath.Join(s.cfg.UploadDir, filepath.Base(m.FilePath))
	f, err := os.Open(filePath)
	if err != nil {
		log.Printf("file modul %s tidak ditemukan: %v", m.FilePath, err)
		http.Error(w, "404 - File tidak ditemukan", http.StatusNotFound)
		return
	}
	defer f.Close()

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Content-Security-Policy", "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; frame-ancestors 'self'")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Content-Disposition", "inline")
	_, _ = io.Copy(w, f)
}

// ---------- Submission ----------

type submissionRequest struct {
	ModuleID     string  `json:"moduleId"`
	StudentName  string  `json:"studentName"`
	StudentClass string  `json:"studentClass"`
	Score        float64 `json:"score"`
	AnswersJSON  *string `json:"answersJson"`
}

const (
	maxStudentNameLen  = 100
	maxStudentClassLen = 50
	maxAnswersJSONLen  = 100_000 // 100KB
)

func (s *Server) createSubmission(w http.ResponseWriter, r *http.Request) {
	var req submissionRequest
	if err := decodeJSON(r, &req); err != nil {
		render.Error(w, http.StatusBadRequest, "Body JSON tidak valid")
		return
	}

	req.StudentName = strings.TrimSpace(maxStr(req.StudentName, maxStudentNameLen))
	req.StudentClass = strings.TrimSpace(maxStr(req.StudentClass, maxStudentClassLen))

	if req.ModuleID == "" || req.StudentName == "" || req.StudentClass == "" {
		render.Error(w, http.StatusBadRequest, "moduleId, studentName, dan studentClass wajib diisi")
		return
	}
	if len(req.StudentName) < 2 {
		render.Error(w, http.StatusBadRequest, "Nama siswa tidak valid")
		return
	}
	// paksa skor 0-100 (ceil ke 2 desimal)
	if req.Score < 0 || req.Score > 100 || req.Score != req.Score {
		render.Error(w, http.StatusBadRequest, "Skor harus antara 0 dan 100")
		return
	}

	// rate limit per modul + IP
	ip := clientIP(r)
	if !s.limiter.Allow(req.ModuleID + ":" + ip) {
		render.Error(w, http.StatusTooManyRequests, "Terlalu banyak submit. Coba lagi beberapa saat.")
		return
	}

	var moduleID string
	var isActive bool
	err := s.pool.QueryRow(r.Context(), `
		SELECT id, is_active FROM modules WHERE id = $1
	`, req.ModuleID).Scan(&moduleID, &isActive)
	if err == pgx.ErrNoRows {
		render.Error(w, http.StatusNotFound, "Modul tidak ditemukan")
		return
	}
	if err != nil {
		serverError(w, "Terjadi kesalahan server", err)
		return
	}
	if !isActive {
		render.Error(w, http.StatusForbidden, "Modul sedang tidak aktif")
		return
	}

	answers := ""
	if req.AnswersJSON != nil {
		answers = *req.AnswersJSON
		if len(answers) > maxAnswersJSONLen {
			render.Error(w, http.StatusBadRequest, "Jawaban terlalu panjang (maksimal 100KB)")
			return
		}
		// pastikan JSON valid agar tidak mengotori DB
		var probe any
		if json.Unmarshal([]byte(answers), &probe) != nil {
			answers = ""
		}
	}

	var id string
	err = s.pool.QueryRow(r.Context(), `
		INSERT INTO submissions (module_id, student_name, student_class, score, answers_json)
		VALUES ($1, $2, $3, $4, NULLIF($5, ''))
		RETURNING id
	`, req.ModuleID, req.StudentName, req.StudentClass, req.Score, answers).Scan(&id)
	if err != nil {
		serverError(w, "Terjadi kesalahan server", err)
		return
	}

	render.JSON(w, http.StatusCreated, map[string]any{
		"message": "Jawaban berhasil disimpan",
		"id":      id,
	})
}

// ---------- CSV export ----------

func (s *Server) apiRekap(w http.ResponseWriter, r *http.Request) {
	u := userFrom(r)
	id := r.PathValue("id")

	var title, shortCode, ownerID string
	err := s.pool.QueryRow(r.Context(), `
		SELECT title, short_code, user_id FROM modules WHERE id = $1
	`, id).Scan(&title, &shortCode, &ownerID)
	if err == pgx.ErrNoRows {
		render.Error(w, http.StatusNotFound, "Modul tidak ditemukan")
		return
	}
	if err != nil {
		serverError(w, "Terjadi kesalahan server", err)
		return
	}
	if u.Role != models.RoleAdmin && ownerID != u.ID {
		render.Error(w, http.StatusForbidden, "Akses ditolak")
		return
	}

	rows, err := s.pool.Query(r.Context(), `
		SELECT student_name, student_class, score, submitted_at
		FROM submissions WHERE module_id = $1 ORDER BY submitted_at DESC
	`, id)
	if err != nil {
		serverError(w, "Terjadi kesalahan server", err)
		return
	}
	defer rows.Close()

	type rowData struct {
		Name string
		Cls  string
		Scor float64
		Time time.Time
	}
	var data []rowData
	for rows.Next() {
		var d rowData
		if err := rows.Scan(&d.Name, &d.Cls, &d.Scor, &d.Time); err != nil {
			serverError(w, "Terjadi kesalahan server", err)
			return
		}
		data = append(data, d)
	}

	if r.URL.Query().Get("format") == "csv" {
		w.Header().Set("Content-Type", "text/csv; charset=utf-8")
		w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="rekap-%s.csv"`, safeFileName(shortCode)))
		// BOM agar Excel membaca UTF-8 dengan benar
		_, _ = w.Write([]byte{0xEF, 0xBB, 0xBF})

		cw := csv.NewWriter(w)
		_ = cw.Write([]string{"No", "Nama Siswa", "Kelas", "Skor", "Waktu Pengerjaan"})
		for i, d := range data {
			_ = cw.Write([]string{
				fmt.Sprintf("%d", i+1),
				d.Name,
				d.Cls,
				fmt.Sprintf("%g", d.Scor),
				d.Time.Format("02/01/2006 15:04"),
			})
		}
		cw.Flush()
		return
	}

	render.JSON(w, http.StatusOK, map[string]any{
		"module":      map[string]any{"id": id, "title": title, "shortCode": shortCode},
		"submissions": data,
	})
}

func safeFileName(s string) string {
	s = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			return r
		}
		return '-'
	}, s)
	if s == "" {
		return "modul"
	}
	return s
}

// ---------- Rate limiter ----------

// batas: maksimal 5 submit per 10 menit per kunci (modul+IP)
const (
	limiterMax   = 5
	limiterEvery = 10 * time.Minute
)
