Tentu, ini adalah draf **Product Requirements Document (PRD)** yang mendetail dan terstruktur untuk MVP (Minimum Viable Product) dari project ini. Anda bisa langsung menyalin teks di bawah ini dan menyimpannya sebagai file `prd.md` di repository project Anda.

***

```markdown
# Product Requirements Document (PRD)
**Nama Project:** Ajar.in (Placeholder: Platform Hosting & Tracking Media Pembelajaran HTML)
**Versi:** 1.0 (MVP)
**Tanggal:** 24 Mei 2024
**Status:** Draft

---

## 1. Executive Summary
**Ajar.in** adalah web aplikasi shortlink yang dirancang khusus untuk ekosistem pendidikan. Aplikasi ini memungkinkan guru untuk meng-hosting media pembelajaran interaktif berbasis **Single File HTML** (yang di-generate menggunakan AI) dan mengubahnya menjadi link singkat yang mudah dibagikan. 

Fitur unggulan MVP ini adalah **"Invisible Wrapper"** dan **"Prompt Library"**. Sistem akan membungkus HTML guru dengan form identitas siswa dan listener untuk menangkap data penilaian (skor) secara otomatis, sehingga guru mendapatkan rekap nilai tanpa perlu memahami backend atau database.

## 2. Target Audience & Personas
1. **Super Admin (IT Sekolah / Kepala Sekolah):** Mengelola akses guru, memantau penggunaan storage, dan memoderasi konten.
2. **Guru (Uploader):** Membuat media pembelajaran menggunakan AI, mengupload file HTML, membagikan link, dan merekap nilai siswa. (Karakteristik: Gaptek secara coding, butuh solusi praktis).
3. **Siswa (Viewer):** Mengerjakan kuis/simulasi dari link yang diberikan guru. (Karakteristik: Tidak perlu login, akses via HP/Laptop).

---

## 3. User Flow (Alur Pengguna)

### 3.1. Alur Guru (Membuat & Mengupload)
1. Guru login ke Dashboard.
2. Guru membuka menu **"Pustaka Prompt"**, menyalin prompt yang sesuai (misal: Kuis Gamifikasi).
3. Guru men-generate HTML menggunakan AI (ChatGPT/Gemini) dan mendownload file `.html`.
4. Guru mengupload file `.html` ke Dashboard Ajar.in.
5. Sistem memvalidasi file (harus single HTML, maks 5MB), menyimpannya, dan men-generate **Shortlink** (misal: `ajar.in/k8x9p`).
6. Guru menyalin link dan membagikannya ke grup WhatsApp kelas.

### 3.2. Alur Siswa (Mengerjakan)
1. Siswa mengklik link `ajar.in/k8x9p`.
2. Sistem menampilkan **Halaman Wrapper**: Form input "Nama Lengkap" dan "Kelas".
3. Siswa mengisi form dan klik "Mulai Mengerjakan".
4. Sistem me-load HTML guru di dalam `<iframe>`.
5. Siswa berinteraksi dengan HTML (mengerjakan kuis/simulasi).
6. Siswa klik tombol "Kirim Nilai" di dalam HTML.
7. HTML mengirim sinyal `postMessage` ke Wrapper.
8. Wrapper menangkap data (Nama, Kelas, Skor), menyimpan ke Database, dan menampilkan pesan "Berhasil Dikirim!".

### 3.3. Alur Admin
1. Admin login.
2. Admin membuat akun guru, mereset password, atau menonaktifkan akun guru yang tidak aktif.

---

## 4. Functional Requirements (Fitur MVP)

### 4.1. Modul Autentikasi & Manajemen User (Admin)
*   **Login:** Email & Password.
*   **Manajemen Guru:** 
    *   Create, Read, Update, Delete (CRUD) akun guru.
    *   Toggle status akun (Aktif / Nonaktif).
    *   Reset password guru.
*   *Catatan:* Guru tidak bisa register sendiri (harus dibuatkan oleh Admin untuk menjaga keamanan dan lisensi sekolah).

### 4.2. Modul Dashboard Guru
*   **Statistik Singkat:** Total modul diupload, total siswa yang mengerjakan, total storage terpakai.
*   **Manajemen Modul:** Tabel list semua file HTML yang sudah diupload.
    *   Kolom: Judul, Shortlink, Tanggal Upload, Status (Aktif/Nonaktif), Aksi (Copy Link, Hapus, Lihat Rekap).

### 4.3. Modul Pustaka Prompt (Prompt Library)
*   Halaman berisi kumpulan "Prompt Sakti" yang sudah dioptimalkan.
*   Kategori Prompt: 
    *   Kuis Pilihan Ganda (Gamifikasi).
    *   Simulasi Interaktif (Sains/Fisika).
    *   Drag & Drop (Mencocokkan gambar).
*   Fitur **Tombol Copy** untuk setiap prompt.
*   Panduan singkat: "Cara menggunakan prompt ini di ChatGPT/Gemini".

### 4.4. Modul Upload & Shortlink Generator
*   **Upload Interface:** Drag & drop area untuk file `.html`.
*   **Validasi Backend:**
    *   Hanya menerima ekstensi `.html` atau `.htm`.
    *   Cek MIME type (wajib `text/html`).
    *   Batas ukuran maksimal: **5 MB** (untuk mencegah file Base64 yang terlalu berat).
*   **Shortlink Generator:** Menghasilkan string acak 5-7 karakter (menggunakan `nanoid`).
*   **Metadata Input:** Guru wajib mengisi "Judul Modul" sebelum upload.

### 4.5. Modul Viewer & Wrapper (Sisi Siswa)
Ini adalah inti dari sistem tracking. Halaman ini yang diakses siswa saat membuka shortlink.
*   **Step 1: Form Identitas.** Menampilkan Judul Modul, input Nama, input Kelas, tombol "Mulai".
*   **Step 2: Iframe Container.** Setelah form disubmit, form hilang dan menampilkan `<iframe>` yang me-load file HTML dari storage.
*   **Step 3: Message Listener.** Script JavaScript di halaman ini mendengarkan `window.addEventListener('message', ...)`.
    *   Jika menerima payload `{ action: 'KIRIM_NILAI', skor: X }`, sistem akan:
        1. Mengambil Nama & Kelas dari state Step 1.
        2. Mengirim data ke API Backend untuk disimpan.
        3. Menampilkan overlay "Terima kasih, nilai kamu (X) sudah tercatat!".
        4. Meng-disable iframe agar siswa tidak bisa submit ulang.

### 4.6. Modul Rekap Penilaian (Assessment Tracking)
*   Terintegrasi di Dashboard Guru (Klik "Lihat Rekap" pada list modul).
*   **Tabel Rekap:** Menampilkan Nama Siswa, Kelas, Skor, Waktu Submit.
*   **Export Data:** Tombol "Download CSV/Excel" untuk memudahkan guru menginput nilai ke buku nilai sekolah.

---

## 5. Non-Functional Requirements & Constraints

### 5.1. Constraints (Batasan Ketat)
*   **Strict Single File:** Sistem **TIDAK** menerima file ZIP atau folder. Hanya 1 file HTML. Semua aset (CSS, JS, Gambar Base64) harus inline.
*   **No External Dependencies (Opsional tapi disarankan):** Prompt harus menginstruksikan AI untuk tidak menggunakan library JS eksternal yang berat, kecuali CDN ikon (FontAwesome) atau Font (Google Fonts).

### 5.2. Security (Keamanan)
*   **Iframe Sandboxing:** Iframe yang me-load HTML guru harus menggunakan atribut `sandbox="allow-scripts allow-same-origin"`. Ini mencegah HTML guru mengakses cookie domain utama atau melakukan redirect paksa.
*   **Content Security Policy (CSP):** Header HTTP saat serve file HTML harus membatasi domain luar yang boleh diakses (misal: hanya mengizinkan CDN font dan gambar).
*   **Rate Limiting:** Batasi jumlah upload per guru per hari untuk mencegah spam/abuse.

### 5.3. Performance
*   Halaman Wrapper harus load dalam < 1 detik.
*   Loading state (spinner) wajib ditampilkan saat iframe sedang memuat file HTML guru (karena file HTML dengan Base64 bisa berukuran beberapa MB).

---

## 6. Technical Architecture (High-Level)

### 6.1. Tech Stack Recommendations
*   **Frontend:** Next.js (React) atau Laravel (Blade) + Tailwind CSS. (Pilih yang paling dikuasai tim).
*   **Backend:** Node.js (Express) atau PHP (Laravel).
*   **Database:** PostgreSQL atau MySQL.
*   **Object Storage:** **Cloudflare R2** (Sangat disarankan karena gratis egress/bandwidth) atau AWS S3. *Jangan simpan file di local storage server.*

### 6.2. Database Schema (Relational)
```sql
-- Tabel Users (Admin & Guru)
CREATE TABLE users (
    id UUID PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    role ENUM('admin', 'guru'),
    status ENUM('active', 'suspended'),
    created_at TIMESTAMP
);

-- Tabel Modules (File HTML yang diupload)
CREATE TABLE modules (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    title VARCHAR(255),
    short_code VARCHAR(10) UNIQUE, -- Misal: 'k8x9p'
    file_url VARCHAR(500), -- URL ke Cloudflare R2
    file_size_bytes INT,
    is_assessment BOOLEAN DEFAULT false, -- True jika ada script postMessage
    created_at TIMESTAMP
);

-- Tabel Submissions (Hasil kerja siswa)
CREATE TABLE submissions (
    id UUID PRIMARY KEY,
    module_id UUID REFERENCES modules(id),
    student_name VARCHAR(100),
    student_class VARCHAR(50),
    score DECIMAL(5,2),
    answers_json JSONB, -- Menyimpan detail jawaban jika ada
    submitted_at TIMESTAMP
);
```

---

## 7. Out of Scope (Untuk MVP)
Fitur berikut **TIDAK** akan dibangun di fase MVP, namun dicatat untuk versi 2.0:
*   Registrasi mandiri untuk guru (MVP menggunakan invite/create by Admin).
*   Custom domain / Custom alias (MVP hanya menggunakan random shortlink).
*   Fitur komentar/diskusi di dalam modul.
*   Galeri publik (Marketplace) untuk berbagi modul antar guru.
*   Integrasi langsung ke LMS sekolah (Moodle/Canvas).

---

## 8. Milestones & Timeline (Estimasi 4 Minggu)

*   **Minggu 1: Setup & Backend Core**
    *   Setup DB, Storage (R2), dan Auth (Admin & Guru).
    *   API untuk Upload file, validasi HTML, dan generate shortlink.
*   **Minggu 2: Frontend Dashboard & Upload**
    *   UI Dashboard Admin (Manajemen Guru).
    *   UI Dashboard Guru (List Modul, Upload, Pustaka Prompt).
*   **Minggu 3: The Wrapper & Tracking (Critical Path)**
    *   Membangun halaman Viewer (Form Identitas -> Iframe).
    *   Implementasi `postMessage` listener dan API untuk menyimpan `submissions`.
    *   Testing dengan berbagai HTML yang di-generate AI.
*   **Minggu 4: Rekap, Export & Polish**
    *   UI Rekap Nilai dan fitur Export CSV.
    *   Security hardening (Sandboxing iframe, CSP headers).
    *   UAT (User Acceptance Testing) dengan 2-3 guru di sekolah.
```

***

### Catatan Tambahan untuk Anda (Developer/PM):
1. **Fokus Utama di Minggu 3:** Bagian `Wrapper` dan `postMessage` adalah jantung dari aplikasi ini. Pastikan Anda menguji cobanya secara manual di minggu ke-3. Buat file HTML dummy yang berisi tombol, lalu pastikan saat diklik, data berhasil masuk ke database.
2. **Ukuran File:** Batasan 5MB di PRD sudah cukup untuk HTML + beberapa gambar Base64. Jika guru mengeluh filenya ditolak, arahkan mereka untuk menggunakan *Prompt* yang menyuruh AI menggunakan *URL gambar dari internet* alih-alih Base64.
3. **Pustaka Prompt:** Di MVP, Anda bisa hardcode 3-4 prompt terbaik di database atau file konfigurasi. Nanti di V2 bisa dibuat fitur CRUD untuk prompt.

Apakah struktur PRD ini sudah cukup komprehensif untuk Anda mulai *coding* atau handed-over ke tim developer? Ada bagian database atau alur yang ingin disesuaikan lagi?
