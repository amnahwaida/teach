# Ajar.in — Platform Hosting & Tracking Media Pembelajaran HTML

Platform shortlink untuk ekosistem pendidikan: guru meng-hosting media pembelajaran
interaktif berbasis **single-file HTML** (dibuat dengan AI), membagikannya sebagai
link pendek, dan otomatis merekap nilai siswa tanpa perlu memahami backend.

**Alur inti:**
1. Guru login → upload file `.html` → sistem membuat shortlink `/v/{code}`.
2. Siswa membuka link → halaman wrapper meminta Nama & Kelas → modul dimuat di dalam `<iframe>` (sandboxed).
3. Saat siswa selesai, HTML mengirim nilai via `window.parent.postMessage({ action: 'KIRIM_NILAI', skor })`.
4. Wrapper menyimpan submission ke database → guru melihat rekap + export CSV.

## Struktur Repository

```
├── backend-go/          # ← BACKEND BARU (Go) — DISARANKAN UNTUK DIPAKAI
├── app/                 # Backend lama: halaman & API Next.js (App Router)
├── prisma/              # Backend lama: schema & SQLite (Prisma ORM)
├── lib/                 # Backend lama: auth, prisma client, pustaka prompt
├── scripts/             # Backend lama: seed database
├── middleware.js        # Backend lama: proteksi rute Next.js
├── docker-compose.yml   # Backend lama: web (Next.js) + Cloudflare Tunnel
├── prd.md               # Product Requirements Document (referensi fitur)
└── uploads/             # File HTML modul yang diupload
```

## Migration to Go — Status

Project telah dimigrasi dari **Next.js + Prisma + SQLite** ke **Go murni +
PostgreSQL + session server-side** di `backend-go/`. Backend lama di root masih
dipertahankan sebagai referensi dan tidak lagi dipertahankan (maintenance mode).

| Aspek | Lama (root, Next.js) | Baru (`backend-go/`) |
|---|---|---|
| Bahasa & runtime | Node.js 18, Next.js 14 | Go 1.24, satu binary statis |
| Rendering UI | React (client-side fetch) | Server-rendered `html/template` |
| Database | SQLite (file, race-prone) | PostgreSQL |
| Autentikasi | JWT stateless, secret hardcoded fallback | Session server-side (DB), token acak, revocable |
| Keamanan upload | File yatim bila custom link ditolak | Validasi lengkap sebelum file ditulis |
| Validasi nilai | Skor bebas (bisa negatif/spam) | Skor 0–100 + rate limit per modul+IP |
| Export CSV | Manual escaping (mudah rusak) | `encoding/csv` + BOM (Excel) |
| Deploy | Docker multi-layer Node build | Multi-stage build, image ~10MB, template/static di-embed |

Detail arsitektur, API, dan perbaikan keamanan lengkap: [backend-go/README.md](backend-go/README.md).

## Menjalankan Backend Baru (Go)

### Dengan Docker (disarankan)

```bash
cd backend-go
cp .env.example .env      # setel ADMIN_EMAIL, ADMIN_PASSWORD, APP_URL, TUNNEL_TOKEN
docker compose up -d --build
```

Hasilnya: PostgreSQL (persisten via volume), aplikasi Go di port `3000`,
dan Cloudflare Tunnel (opsional) untuk akses publik.

- Migrasi database **otomatis** saat start (embedded, idempotent).
- Akun admin pertama **dibuat otomatis** dari `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
- Upload tersimpan di `backend-go/uploads/` (volume persist).

### Tanpa Docker (butuh PostgreSQL lokal)

```bash
cd backend-go
DATABASE_URL="postgres://ajar:ajar@localhost:5432/ajar?sslmode=disable" \
ADMIN_EMAIL=admin@ajar.in ADMIN_PASSWORD=ganti-ini! \
go run .
```

## Menjalankan Backend Lama (Next.js — legacy)

> Hanya untuk referensi; gunakan `backend-go/` untuk produksi.

```bash
npm install
npx prisma db push && npm run seed   # inisialisasi SQLite + akun demo
npm run dev                          # http://localhost:3000
```

## Kredensial Awal

Setelah start pertama, login dengan akun admin dari `.env` (default template:
`admin@ajar.in` / password yang Anda setel). Buat akun guru via menu
**Admin → Kelola Guru**.

## Endpoint API (backend-go)

| Route | Deskripsi |
|---|---|
| `GET /login`, `POST /login`, `POST /logout` | Autentikasi (form) |
| `GET /dashboard`, `/dashboard/upload`, `/dashboard/prompt`, `/dashboard/rekap/{id}` | Halaman guru |
| `GET /admin`, `/admin/guru` | Halaman admin |
| `GET /v/{code}` | Viewer siswa (wrapper + iframe) |
| `GET /api/serve/{code}` | Serve HTML modul (dengan CSP & sandbox) |
| `POST /api/submissions` | Simpan nilai siswa (publik, divalidasi + rate limit) |
| `POST /api/upload` | Upload modul HTML (≤5MB, sniff konten) |
| `GET/PUT/DELETE /api/modules/{id}` | CRUD modul |
| `GET /api/modules/{id}/rekap?format=csv` | Rekap nilai + export CSV |
| `GET/POST /api/admin/guru`, `PUT/DELETE /api/admin/guru/{id}` | Kelola akun guru |
| `GET /api/stats`, `GET /api/auth/me` | Statistik & profil |
