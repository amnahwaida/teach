# Ajar.in — Backend Go

Migrasi penuh aplikasi Ajar.in (sebelumnya Next.js + Prisma + SQLite) ke **Go murni**:
server-rendered dengan `html/template`, PostgreSQL, session server-side.

## Fitur

- **Autentikasi** — login/logout, session server-side (tabel `sessions`, token acak dari `crypto/rand`), revocable (suspend/logout langsung memutus sesi)
- **Guru** — upload modul HTML (validasi ekstensi, ukuran 5MB, sniff konten HTML), shortlink otomatis/custom, toggle aktif, edit, hapus, rekap nilai + export CSV (BOM untuk Excel)
- **Siswa** — halaman viewer `/v/{code}`: form identitas → iframe (sandbox + CSP) → `postMessage` → simpan submission
- **Admin** — dashboard, kelola guru (CRUD, reset password, suspend), lihat semua modul
- **Pustaka Prompt** — 14 prompt siap pakai untuk ChatGPT/Gemini (server-rendered)

## Perbaikan dibanding versi Next.js

| Masalah lama | Solusi baru |
|---|---|
| `JWT_SECRET` hardcoded fallback | Session token acak 256-bit, tanpa secret |
| Admin bisa mengubah/menghapus akun admin lain | Diblokir (`role = guru` wajib) |
| File yatim saat custom link ditolak | Validasi link dilakukan **sebelum** file ditulis |
| Skor bisa dikirim bebas (negatif/duplikat) | Skor dipaksa 0–100 + rate limit 5 submit/10 mnt per modul+IP |
| Siswa melihat "sukses" walau submit gagal | Halaman error + tombol "Coba Kirim Ulang" |
| CSV manual tanpa escaping | `encoding/csv` + BOM |
| `.env` secret sederhana | `.env` via compose, admin dibuat otomatis saat start |
| Rate limit bisa dilewati header `X-Forwarded-For` | IP klien hanya dari `RemoteAddr` (XFF tidak dipercaya) |
| Login tanpa batasan percobaan | Rate limit login 10 percobaan/15 mnt per IP (form + API) |
| Body JSON tak terbatas | `MaxBytesReader` 1MB di semua endpoint JSON |
| Slowloris / koneksi macet | `ReadTimeout`/`WriteTimeout` di `http.Server` |

## Menjalankan

```bash
cp .env.example .env   # setel ADMIN_EMAIL / ADMIN_PASSWORD / APP_URL
docker compose up -d --build
```

Atau tanpa Docker (butuh PostgreSQL):

```bash
DATABASE_URL="postgres://ajar:ajar@localhost:5432/ajar?sslmode=disable" \
ADMIN_EMAIL=admin@ajar.in ADMIN_PASSWORD=admin123 \
go run .
```

Migrasi DB dijalankan otomatis saat start (embedded, idempotent). Akun admin
pertama dibuat otomatis dari `ADMIN_EMAIL`/`ADMIN_PASSWORD`.

## Struktur

```
internal/
  config/    pembacaan env
  db/        koneksi pgxpool + migrasi embedded
  models/    struct domain
  session/   session server-side (DB)
  auth/      bcrypt
  handlers/  routing (Go 1.22 ServeMux), middleware, semua endpoint
  prompts/   pustaka prompt (data JSON embedded)
  render/    template engine + static embedded
web/ (tidak dipakai; arsitektur lama)
```

Template & static di-embed ke binary (`internal/render`), jadi deployment hanya
satu binary + volume uploads.

## Route utama

| Route | Deskripsi |
|---|---|
| `GET /login` `POST /login` `POST /logout` | Autentikasi |
| `GET /dashboard`, `/dashboard/upload`, `/dashboard/prompt`, `/dashboard/rekap/{id}` | Halaman guru |
| `GET /admin`, `/admin/guru` | Halaman admin |
| `GET /v/{code}` | Viewer siswa |
| `GET /api/serve/{code}` | Serve HTML modul (iframe) |
| `POST /api/submissions` | Simpan nilai siswa (publik, divalidasi) |
| `POST /api/upload` | Upload modul |
| `GET/PUT/DELETE /api/modules/{id}`, `GET /api/modules/{id}/rekap?format=csv` | CRUD modul |
| `GET/POST /api/admin/guru`, `PUT/DELETE /api/admin/guru/{id}` | Kelola guru |
| `GET /api/stats`, `GET /api/auth/me` | Statistik & profil |

## Catatan

- File modul disimpan di `uploads/` (volume persist di compose). Untuk skala
  lebih besar, ganti dengan object storage (R2/S3) — cukup ubah `apiUpload`,
  `serveModule`, dan `removeModuleFile`.
- Rate limiter submission & login in-memory (per instance). Untuk
  multi-instance, pindahkan ke Redis.
- `clientIP` hanya memakai `RemoteAddr` (bukan `X-Forwarded-For`). Saat
  berjalan di belakang banyak proxy, ganti dengan daftar trusted proxy.