/**
 * Pustaka Prompt - Hardcoded prompt templates for MVP
 * These are optimized prompts for generating interactive HTML learning media
 */

const prompts = [
  {
    id: 'kuis-pilgan-gamifikasi',
    title: 'Kuis Pilihan Ganda (Gamifikasi)',
    category: 'Kuis',
    icon: '🎮',
    description: 'Membuat kuis interaktif dengan pilihan ganda, skor otomatis, timer, efek suara, dan animasi. Cocok untuk ulangan harian atau latihan soal.',
    guide: 'Salin prompt di bawah, buka ChatGPT atau Gemini, paste, lalu ganti bagian [TOPIK], [JUMLAH SOAL], dan [MATA PELAJARAN] sesuai kebutuhan Anda. Setelah AI menghasilkan kode HTML, salin seluruh kode dan simpan sebagai file .html.',
    prompt: `Buatkan saya sebuah file HTML tunggal (single file, semua CSS dan JavaScript inline) berupa kuis interaktif bertema gamifikasi dengan spesifikasi berikut:

**TOPIK:** [TOPIK KUIS ANDA, misal: Sistem Tata Surya]
**MATA PELAJARAN:** [MATA PELAJARAN, misal: IPA]
**JUMLAH SOAL:** [JUMLAH, misal: 10]

**FITUR YANG HARUS ADA:**
1. Tampilan modern, colorful, dan responsif (mobile-friendly).
2. Setiap soal memiliki 4 pilihan jawaban (A, B, C, D).
3. Ada timer countdown per soal (30 detik).
4. Setelah memilih jawaban, tampilkan feedback benar/salah dengan animasi.
5. Ada progress bar yang menunjukkan soal ke berapa dari total soal.
6. Di akhir kuis, tampilkan skor total dan ringkasan jawaban.
7. Ada efek confetti saat skor di atas 80.
8. Tampilkan bintang/rating berdasarkan skor (1-5 bintang).

**PENTING - INTEGRASI PENGIRIMAN NILAI:**
Di halaman hasil akhir, tambahkan tombol "Kirim Nilai" yang ketika diklik menjalankan kode JavaScript berikut:
\`\`\`javascript
window.parent.postMessage({
  action: 'KIRIM_NILAI',
  answers: dataJawaban, // (opsional) array/objek berisi data rekap jawaban siswa
  skor: skorAkhir // variabel skor akhir (0-100)
}, '*');
\`\`\`

**ATURAN:**
- SEMUA kode harus dalam satu file HTML (inline CSS & JS).
- JANGAN gunakan library JavaScript eksternal yang berat.
- Gambar boleh menggunakan emoji atau CSS art, jangan Base64 yang besar.
- Pastikan font menggunakan Google Fonts (embed via @import di CSS).
- Desain harus menarik untuk siswa SMP/SMA.`,
  },
  {
    id: 'simulasi-interaktif-sains',
    title: 'Simulasi Interaktif (Sains/Fisika)',
    category: 'Simulasi',
    icon: '🔬',
    description: 'Membuat simulasi interaktif untuk eksperimen sains atau fisika. Siswa bisa mengubah parameter dan melihat hasilnya secara real-time.',
    guide: 'Salin prompt di bawah, buka ChatGPT atau Gemini, paste, lalu sesuaikan bagian [TOPIK SIMULASI] dan parameter yang ingin Anda sediakan untuk siswa.',
    prompt: `Buatkan saya sebuah file HTML tunggal (single file, semua CSS dan JavaScript inline) berupa simulasi interaktif sains dengan spesifikasi berikut:

**TOPIK SIMULASI:** [TOPIK, misal: Hukum Newton - Gaya dan Percepatan]
**MATA PELAJARAN:** [MATA PELAJARAN, misal: Fisika]

**FITUR YANG HARUS ADA:**
1. Canvas atau area visual untuk menampilkan simulasi (animasi objek bergerak).
2. Slider/input untuk mengubah parameter (misal: massa, gaya, kecepatan awal).
3. Tampilan nilai parameter secara real-time saat slider digeser.
4. Tombol "Mulai Simulasi", "Reset", dan "Pause".
5. Grafik sederhana (bisa pakai CSS/Canvas) yang menampilkan hubungan antar variabel.
6. Penjelasan singkat teori di bagian atas halaman.
7. 3-5 pertanyaan refleksi di akhir simulasi untuk menguji pemahaman siswa.
8. Sistem penilaian otomatis berdasarkan jawaban pertanyaan refleksi.

**PENTING - INTEGRASI PENGIRIMAN NILAI:**
Setelah siswa menjawab semua pertanyaan refleksi, tampilkan skor dan tombol "Kirim Nilai":
\`\`\`javascript
window.parent.postMessage({
  action: 'KIRIM_NILAI',
  answers: dataJawaban, // (opsional) array/objek berisi data rekap jawaban siswa
  skor: skorRefleksi // skor dari pertanyaan refleksi (0-100)
}, '*');
\`\`\`

**ATURAN:**
- SEMUA kode harus dalam satu file HTML (inline CSS & JS).
- Gunakan Canvas API untuk animasi, JANGAN gunakan library eksternal.
- Desain harus clean, modern, dan scientific-looking.
- Responsif untuk mobile dan desktop.
- Gunakan Google Fonts untuk tipografi yang rapi.`,
  },
  {
    id: 'drag-drop-mencocokkan',
    title: 'Drag & Drop (Mencocokkan)',
    category: 'Interaktif',
    icon: '🧩',
    description: 'Membuat aktivitas drag & drop untuk mencocokkan pasangan konsep, gambar dengan keterangan, atau istilah dengan definisi.',
    guide: 'Salin prompt di bawah, buka ChatGPT atau Gemini, paste, lalu sesuaikan bagian [TOPIK] dan [PASANGAN] sesuai materi yang ingin diajarkan.',
    prompt: `Buatkan saya sebuah file HTML tunggal (single file, semua CSS dan JavaScript inline) berupa aktivitas drag and drop mencocokkan dengan spesifikasi berikut:

**TOPIK:** [TOPIK, misal: Organ Tubuh Manusia dan Fungsinya]
**MATA PELAJARAN:** [MATA PELAJARAN, misal: Biologi]
**JUMLAH PASANGAN:** [JUMLAH, misal: 8]

**FITUR YANG HARUS ADA:**
1. Dua kolom: kolom kiri berisi item yang bisa di-drag, kolom kanan berisi target drop area.
2. Item bisa di-drag dengan mouse DAN touch (untuk HP).
3. Animasi smooth saat drag dan saat item "snap" ke tempatnya.
4. Visual feedback: hijau jika benar, merah jika salah, dengan animasi shake.
5. Counter: "X dari Y pasangan benar".
6. Tombol "Reset" untuk mengulang dari awal.
7. Tombol "Cek Jawaban" yang menampilkan semua jawaban benar/salah.
8. Setelah semua benar, tampilkan celebration animation.
9. Skor dihitung berdasarkan: jumlah benar di percobaan pertama.

**PENTING - INTEGRASI PENGIRIMAN NILAI:**
Setelah siswa menyelesaikan aktivitas, tampilkan skor dan tombol "Kirim Nilai":
\`\`\`javascript
window.parent.postMessage({
  action: 'KIRIM_NILAI',
  answers: dataJawaban, // (opsional) array/objek berisi data rekap jawaban siswa
  skor: skorAkhir // skor berdasarkan akurasi (0-100)
}, '*');
\`\`\`

**ATURAN:**
- SEMUA kode harus dalam satu file HTML (inline CSS & JS).
- Drag & Drop HARUS bekerja di mobile (touch events).
- JANGAN gunakan library JS eksternal.
- Gunakan emoji atau CSS shapes untuk visual, bukan gambar Base64 besar.
- Desain colorful dan child-friendly.
- Gunakan Google Fonts.`,
  },
  {
    id: 'flashcard-interaktif',
    title: 'Flashcard Interaktif',
    category: 'Kuis',
    icon: '📇',
    description: 'Membuat flashcard interaktif dengan efek flip untuk menghafal konsep, kosakata, atau rumus. Dilengkapi mode kuis di akhir.',
    guide: 'Salin prompt di bawah, buka ChatGPT atau Gemini, paste, lalu sesuaikan [TOPIK] dan [MATERI] yang ingin Anda buat flashcard-nya.',
    prompt: `Buatkan saya sebuah file HTML tunggal (single file, semua CSS dan JavaScript inline) berupa flashcard interaktif dengan spesifikasi berikut:

**TOPIK:** [TOPIK, misal: Kosakata Bahasa Inggris - Daily Activities]
**MATA PELAJARAN:** [MATA PELAJARAN, misal: Bahasa Inggris]
**JUMLAH KARTU:** [JUMLAH, misal: 15]

**FITUR YANG HARUS ADA:**
1. Kartu bisa di-flip (depan: pertanyaan/istilah, belakang: jawaban/definisi) dengan animasi 3D flip.
2. Navigasi: tombol Previous, Next, dan indikator kartu ke berapa.
3. Fitur "Tandai Sudah Hafal" dan "Belum Hafal" dengan warna berbeda.
4. Shuffle/acak urutan kartu.
5. Progress: "X dari Y kartu sudah dihafal".
6. MODE KUIS di akhir: 
   - Tampilkan pertanyaan dari kartu secara acak.
   - Siswa mengetik jawaban (text input).
   - Cek jawaban dengan toleransi typo sederhana.
   - Tampilkan skor akhir.

**PENTING - INTEGRASI PENGIRIMAN NILAI:**
Di akhir mode kuis, tampilkan skor dan tombol "Kirim Nilai":
\`\`\`javascript
window.parent.postMessage({
  action: 'KIRIM_NILAI',
  answers: dataJawaban, // (opsional) array/objek berisi data rekap jawaban siswa
  skor: skorKuis // skor dari mode kuis (0-100)
}, '*');
\`\`\`

**ATURAN:**
- SEMUA kode harus dalam satu file HTML (inline CSS & JS).
- Animasi flip harus smooth menggunakan CSS 3D transforms.
- Responsif dan touch-friendly.
- Desain modern dengan gradient background.
- Gunakan Google Fonts.`,
  },
  {
    id: 'duel-kuis-kolaborasi',
    title: 'Duel Kuis Kolaborasi (2 Pemain 1 Layar)',
    category: 'Kolaborasi',
    icon: '⚔️',
    description: 'Membuat game kuis duel untuk 2 pemain di satu layar yang sama (split-screen). Siapa cepat dia dapat (buzzer style).',
    guide: 'Salin prompt di bawah, paste di AI, dan sesuaikan bagian [TOPIK] dan [MATA PELAJARAN]. Siswa A dan Siswa B bisa menggunakan satu layar (HP/Tablet/Laptop) yang sama untuk bertanding.',
    prompt: `Buatkan saya sebuah file HTML tunggal (single file, semua CSS dan JavaScript inline) berupa game duel kuis interaktif (split-screen) untuk 2 pemain dalam 1 layar dengan spesifikasi berikut:

**TOPIK:** [TOPIK KUIS ANDA, misal: Perkalian Dasar]
**MATA PELAJARAN:** [MATA PELAJARAN, misal: Matematika]
**JUMLAH SOAL:** [JUMLAH, misal: 10]

**FITUR YANG HARUS ADA:**
1. Layar terbagi menjadi dua bagian (kiri untuk Pemain 1, kanan untuk Pemain 2). Jika dimainkan di HP/potret, layar terbagi atas-bawah.
2. Tiap pemain punya area bermain sendiri dan tombol "Buzzer" atau "Pilihan Jawaban" masing-masing yang besar dan mudah ditekan.
3. Soal muncul di tengah layar yang bisa dibaca kedua pemain.
4. Pemain yang lebih cepat menekan buzzer/jawaban benar akan mendapat poin.
5. Jika salah, poin dikurangi atau poin diberikan ke lawan (pilih salah satu).
6. Efek suara dan animasi benturan/duel yang seru saat menjawab.
7. Tampilkan live score (skor terkini) untuk kedua pemain.
8. Di akhir game, tampilkan siapa pemenangnya (Player 1 atau Player 2) dengan efek confetti.

**PENTING - INTEGRASI PENGIRIMAN NILAI:**
Tampilkan tombol "Kirim Laporan Duel" yang akan mengirimkan skor tertinggi (pemenang) atau skor rata-rata:
\`\`\`javascript
window.parent.postMessage({
  action: 'KIRIM_NILAI',
  answers: dataJawaban, // (opsional) array/objek berisi data rekap jawaban siswa
  skor: (skorPlayer1 > skorPlayer2) ? skorPlayer1 : skorPlayer2 // Mengirimkan skor pemenang saja sebagai contoh
}, '*');
\`\`\`

**ATURAN:**
- SEMUA kode harus dalam satu file HTML (inline CSS & JS).
- Desain harus responsif dan mendukung multi-touch agar dua orang bisa menyentuh layar HP/tablet bersamaan tanpa error.
- JANGAN gunakan library JS eksternal. Gunakan CSS Grid/Flexbox untuk membagi layar.
- Gunakan Google Fonts dan palet warna kontras (misal: Merah vs Biru).`,
  },
  {
    id: 'tic-tac-toe-kolaborasi',
    title: 'Tic-Tac-Toe Pengetahuan (2 Pemain)',
    category: 'Kolaborasi',
    icon: '⭕',
    description: 'Bermain Tic-Tac-Toe klasik (X dan O), namun setiap petak berisi pertanyaan yang harus dijawab benar untuk merebut petak tersebut.',
    guide: 'Salin prompt di bawah, paste ke AI, dan tentukan [TOPIK] untuk soal-soal di dalam petak Tic-Tac-Toe.',
    prompt: `Buatkan saya file HTML tunggal (inline CSS & JS) berupa game Tic-Tac-Toe edukatif untuk 2 pemain dengan spesifikasi berikut:

**TOPIK:** [TOPIK, misal: Ibu Kota Negara ASEAN]
**MATA PELAJARAN:** [MATA PELAJARAN, misal: IPS]

**FITUR YANG HARUS ADA:**
1. Papan Tic-Tac-Toe 3x3 di tengah layar.
2. Pemain 1 (X - Merah) dan Pemain 2 (O - Biru) bermain secara bergantian.
3. Saat pemain memilih petak yang kosong, sebuah popup/modal pertanyaan akan muncul.
4. Jika pemain menjawab dengan BENAR, petak tersebut menjadi milik mereka (ditandai X atau O).
5. Jika SALAH, petak tetap kosong dan giliran berpindah ke lawan.
6. Bank soal minimal berisi 15-20 pertanyaan acak.
7. Deteksi pemenang (3 sejajar vertikal, horizontal, diagonal) atau seri (draw).
8. Tombol "Main Lagi" setelah game selesai.

**PENTING - INTEGRASI PENGIRIMAN NILAI:**
Di akhir game, sediakan tombol "Kirim Rekap" yang menjalankan:
\`\`\`javascript
window.parent.postMessage({
  action: 'KIRIM_NILAI',
  answers: dataJawaban, // (opsional) array/objek berisi data rekap jawaban siswa
  skor: (pemenang === 'X' || pemenang === 'O') ? 100 : 50 // 100 jika ada yang menang, 50 jika seri
}, '*');
\`\`\`

**ATURAN:**
- Hanya gunakan file tunggal HTML, tanpa library eksternal.
- Desain bersih dan responsif.
- Gunakan animasi transisi saat X atau O muncul di papan.`,
  },
  {
    id: 'tarik-tambang-edukasi',
    title: 'Tarik Tambang Edukasi (Tug of War)',
    category: 'Kolaborasi',
    icon: '🪢',
    description: 'Game adu cepat menjawab soal. Jawaban benar akan menarik "tali/objek" ke sisi pemain, jawaban salah menolaknya.',
    guide: 'Salin prompt ini untuk membuat mini-game tarik tambang virtual yang kompetitif dalam satu layar sentuh.',
    prompt: `Buatkan saya file HTML tunggal (inline CSS & JS) berupa game "Tarik Tambang" (Tug of War) edukatif untuk 2 pemain di satu layar:

**TOPIK:** [TOPIK, misal: Sinonim & Antonim Kata]
**MATA PELAJARAN:** [MATA PELAJARAN, misal: Bahasa Indonesia]

**FITUR YANG HARUS ADA:**
1. Layar dibagi dua (Pemain Kiri dan Pemain Kanan / Atas dan Bawah).
2. Di tengah layar terdapat ilustrasi sebuah objek/tali dengan bendera penanda posisi (di tengah pada awalnya).
3. Pertanyaan muncul di tengah. Masing-masing pemain memiliki tombol opsi jawaban di area mereka.
4. Jika pemain menjawab BENAR dan lebih cepat dari lawannya, posisi tali bergeser 1 langkah ke arahnya (ke wilayahnya).
5. Jika menjawab SALAH, tali bergeser ke arah lawannya.
6. Pemain yang berhasil menarik tali hingga melewati batas akhir wilayahnya dinobatkan sebagai Pemenang.
7. Efek suara dan indikator visual bergetar saat tali ditarik.
8. Game over terjadi ketika tali mencapai salah satu ujung, lalu tampilkan perayaan (confetti).

**PENTING - INTEGRASI PENGIRIMAN NILAI:**
Tampilkan tombol "Selesai & Kirim Laporan" di akhir ronde:
\`\`\`javascript
window.parent.postMessage({
  action: 'KIRIM_NILAI',
  answers: dataJawaban, // (opsional) array/objek berisi data rekap jawaban siswa
  skor: skorPemenang // bisa dikalkulasi dari selisih jarak tarikan atau jumlah benar
}, '*');
\`\`\`

**ATURAN:**
- Format file tunggal (HTML+CSS+JS inline).
- Multi-touch friendly (penting agar sentuhan 2 pemain bersamaan tidak terganggu).
- UI/UX modern, gunakan CSS transitions untuk pergeseran "tali".`,
  },
  {
    id: 'ludo-edukasi-4pemain',
    title: 'Ludo Edukasi (2-4 Pemain)',
    category: 'Kolaborasi',
    icon: '🎲',
    description: 'Game papan (Board Game) interaktif berbasis giliran untuk 2 hingga 4 pemain dalam satu layar (cocok untuk tablet/laptop).',
    guide: 'Salin prompt ini ke AI. Game ini sangat cocok untuk diskusi kelompok. Siswa bisa bermain secara bergiliran menggunakan 1 perangkat yang sama.',
    prompt: `Buatkan saya file HTML tunggal (inline CSS & JS) berupa game "Ludo Edukasi" atau Board Game sederhana untuk 2 hingga 4 pemain secara lokal (bergiliran di 1 layar):

**TOPIK:** [TOPIK, misal: Sejarah Kemerdekaan Indonesia]
**MATA PELAJARAN:** [MATA PELAJARAN, misal: Sejarah]

**FITUR YANG HARUS ADA:**
1. Papan permainan melingkar/persegi dengan minimal 20-30 petak dari "Start" hingga "Finish".
2. Mendukung pemilihan jumlah pemain (2, 3, atau 4 pemain) dengan warna berbeda (Merah, Biru, Hijau, Kuning).
3. Terdapat dadu virtual (animasi acak angka 1-6) di tengah layar.
4. **Sistem Giliran (Turn-based):** 
   - Pemain memutar dadu.
   - Sebelum bidaknya melangkah, akan muncul pertanyaan pilihan ganda.
   - Jika menjawab BENAR, bidak maju sesuai angka dadu.
   - Jika SALAH, bidak tidak maju dan giliran pindah ke pemain berikutnya.
5. Indikator visual yang sangat jelas tentang giliran siapa saat ini.
6. Bank soal minimal 30 pertanyaan yang diacak.
7. Saat ada pemain yang mencapai "Finish", game selesai dan tampilkan peringkat 1, 2, 3, 4.

**PENTING - INTEGRASI PENGIRIMAN NILAI:**
Karena dimainkan dalam kelompok, kirimkan skor rata-rata kelompok atau laporkan penyelesaiannya:
\`\`\`javascript
window.parent.postMessage({
  action: 'KIRIM_NILAI',
  answers: dataJawaban, // (opsional) array/objek berisi data rekap jawaban siswa
  skor: 100 // Anggap 100 jika kelompok berhasil menyelesaikan permainan
}, '*');
\`\`\`

**ATURAN:**
- Format file tunggal (HTML+CSS+JS inline) tanpa backend.
- Desain UI responsif, papan permainan akan mengecil agar muat di layar HP, tapi idealnya dirancang nyaman untuk ukuran Tablet/Laptop.
- JANGAN gunakan gambar eksternal, gunakan CSS untuk mendesain papan dan bidak.`,
  },
  {
    id: 'laboratorium-virtual-kimia',
    title: 'Laboratorium Virtual (Campuran & Reaksi)',
    category: 'Simulasi',
    icon: '🧪',
    description: 'Simulasi lab virtual di mana siswa dapat mencampurkan berbagai "zat" atau elemen untuk melihat reaksi yang terjadi.',
    guide: 'Salin prompt ini ke AI dan sesuaikan jenis zat/elemen serta reaksi yang Anda inginkan (misalnya pencampuran warna, asam basa, atau elemen kimia).',
    prompt: `Buatkan saya file HTML tunggal (inline CSS & JS) berupa simulasi Laboratorium Virtual edukatif dengan spesifikasi berikut:

**TOPIK:** [TOPIK, misal: Reaksi Asam Basa / Pencampuran Warna]
**MATA PELAJARAN:** [MATA PELAJARAN, misal: Kimia / Seni Rupa]

**FITUR YANG HARUS ADA:**
1. Area "Meja Kerja" dengan sebuah wadah/tabung reaksi utama di tengah.
2. Deretan botol/zat pilihan (minimal 5 jenis zat berbeda) yang bisa diklik atau di-drag ke tabung utama.
3. Saat zat ditambahkan, tampilkan animasi cairan masuk dan perubahan visual dalam tabung reaksi (misal: perubahan warna, gelembung, atau bahkan "ledakan" kecil menggunakan partikel CSS/Canvas).
4. Panel observasi yang mencatat formula/kombinasi zat yang sudah dimasukkan dan hasil akhirnya.
5. Sediakan 3 "Misi" (misalnya: "Buat cairan menjadi warna ungu" atau "Buat larutan netral").
6. Fitur "Kosongkan Tabung" untuk mengulang eksperimen.

**PENTING - INTEGRASI PENGIRIMAN NILAI:**
Setelah siswa berhasil menyelesaikan semua misi, tampilkan tombol "Kirim Laporan Lab":
\`\`\`javascript
window.parent.postMessage({
  action: 'KIRIM_NILAI',
  answers: dataJawaban, // (opsional) array/objek berisi data rekap jawaban siswa
  skor: 100 // Nilai keberhasilan eksperimen
}, '*');
\`\`\`

**ATURAN:**
- Hanya gunakan file tunggal HTML, tanpa library eksternal. Gunakan Canvas API jika butuh partikel, tapi CSS murni lebih disukai.
- Desain harus terlihat saintifik, clean, dan interaktif.
- Responsif untuk dijalankan di HP (gunakan klik/tap sebagai pengganti drag and drop jika drag and drop rumit di mobile).`,
  },
  {
    id: 'simulasi-ekosistem',
    title: 'Simulasi Ekosistem & Populasi',
    category: 'Simulasi',
    icon: '🌱',
    description: 'Simulasi di mana siswa bisa menambah/mengurangi hewan/tumbuhan untuk melihat dampak berantai dalam rantai makanan.',
    guide: 'Ubah [TOPIK] untuk ekosistem yang spesifik, misalnya Ekosistem Laut, Hutan, atau Kolam.',
    prompt: `Buatkan saya file HTML tunggal (inline CSS & JS) berupa simulasi Ekosistem Rantai Makanan dengan spesifikasi berikut:

**TOPIK:** [TOPIK, misal: Keseimbangan Ekosistem Hutan]
**MATA PELAJARAN:** [MATA PELAJARAN, misal: Biologi]

**FITUR YANG HARUS ADA:**
1. Area visual "Taman Nasional" di mana sprite/ikon hewan dan tumbuhan bergerak secara acak.
2. 3 tingkatan rantai makanan: Produsen (misal rumput), Konsumen 1 (misal kelinci), Konsumen 2 (misal serigala).
3. Panel kontrol (slider atau tombol +/-) untuk mengatur populasi awal tiap spesies.
4. Tombol "Jalankan Waktu" (Time Lapse). Saat dijalankan, populasi akan berfluktuasi berdasarkan logika predator-mangsa sederhana.
5. Grafik Garis (Line Chart) sederhana (buat menggunakan Canvas API murni) yang memperlihatkan grafik populasi ketiga spesies tersebut seiring berjalannya waktu.
6. 3 pertanyaan analisa di akhir (misalnya: "Apa yang terjadi pada produsen jika predator puncak musnah?").

**PENTING - INTEGRASI PENGIRIMAN NILAI:**
Di akhir sesi setelah siswa menjawab pertanyaan analisa, munculkan tombol "Kirim Analisa":
\`\`\`javascript
window.parent.postMessage({
  action: 'KIRIM_NILAI',
  answers: dataJawaban, // (opsional) array/objek berisi data rekap jawaban siswa
  skor: skorAnalisa // Skor berdasarkan jawaban benar (0-100)
}, '*');
\`\`\`

**ATURAN:**
- Format file tunggal (HTML+CSS+JS inline) tanpa library eksternal (jangan gunakan Chart.js, buat grafik sederhana dari Canvas).
- Animasi pergerakan ekosistem simpel menggunakan requestAnimationFrame.
- Layout responsif, di mobile grafik bisa di-scroll atau ditaruh di bawah area visual.`,
  },
  {
    id: 'memory-match-hafalan',
    title: 'Kartu Memori (Cocokkan Pasangan)',
    category: 'Menghafal',
    icon: '🎴',
    description: 'Game klasik membalik kartu untuk mencari pasangan yang cocok (misal: Tahun dan Peristiwa, atau Kosakata dan Artinya).',
    guide: 'Salin prompt ini ke AI dan ganti [TOPIK] dengan daftar pasangan yang harus dihafal siswa.',
    prompt: `Buatkan saya file HTML tunggal (inline CSS & JS) berupa game "Kartu Memori" (Memory Match) edukatif dengan spesifikasi berikut:

**TOPIK:** [TOPIK, misal: Pahlawan Nasional dan Asal Daerahnya / Kosakata Bahasa Arab]
**MATA PELAJARAN:** [MATA PELAJARAN, misal: Sejarah / Bahasa]
**JUMLAH PASANGAN:** [JUMLAH, misal: 8 pasangan (berarti ada 16 kartu)]

**FITUR YANG HARUS ADA:**
1. Grid kartu posisi tertutup di layar. Grid menyesuaikan ukuran layar (responsif).
2. Ketika diklik, kartu memutar (3D flip) dan menunjukkan isinya.
3. Siswa hanya bisa membalik maksimal 2 kartu sekaligus. Jika cocok, kartu akan tetap terbuka dan berwarna hijau. Jika salah, kartu memerah sejenak lalu kembali tertutup.
4. Terdapat Counter untuk menghitung "Jumlah Percobaan / Langkah".
5. Terdapat Timer yang menghitung waktu sejak kartu pertama dibalik.
6. Saat semua pasangan ditemukan, tampilkan "Game Over" dengan efek Confetti, Waktu Selesai, dan Jumlah Langkah.

**PENTING - INTEGRASI PENGIRIMAN NILAI:**
Setelah game selesai, munculkan tombol "Kirim Nilai":
\`\`\`javascript
// Skor bisa dihitung terbalik dari waktu atau jumlah percobaan (makin sedikit percobaan, makin tinggi skor)
window.parent.postMessage({
  action: 'KIRIM_NILAI',
  answers: dataJawaban, // (opsional) array/objek berisi data rekap jawaban siswa
  skor: skorAkhir 
}, '*');
\`\`\`

**ATURAN:**
- Format file tunggal (HTML+CSS+JS inline).
- JANGAN gunakan library JS eksternal. Gunakan CSS transform untuk efek membalik kartu.
- Kartu diletakkan secara ACAK setiap kali halaman dimuat ulang.
- Desain color-palette modern dan eye-catching.`,
  },
  {
    id: 'teka-teki-silang',
    title: 'Teka-Teki Silang (TTS Edukasi)',
    category: 'Menghafal',
    icon: '📝',
    description: 'Game Teka-Teki Silang (Crossword) interaktif. Sangat efektif untuk menguji hafalan istilah, nama tokoh, atau kosakata.',
    guide: 'Salin prompt ini ke AI beserta daftar Kata dan Pertanyaannya (Clue) untuk dibuatkan TTS otomatis.',
    prompt: `Buatkan saya file HTML tunggal (inline CSS & JS) berupa game "Teka-Teki Silang" (Crossword Puzzle) edukatif dengan spesifikasi berikut:

**TOPIK:** [TOPIK, misal: Istilah dalam Sistem Pencernaan Manusia]
**MATA PELAJARAN:** [MATA PELAJARAN, misal: Biologi]
**JUMLAH KATA:** [JUMLAH, misal: 7 kata mendatar, 7 kata menurun]

**FITUR YANG HARUS ADA:**
1. Papan kotak-kotak TTS di bagian tengah (atau atas di mobile). Saat kotak diklik, highlight kata tersebut.
2. Daftar pertanyaan "Mendatar" (Across) dan "Menurun" (Down) di panel terpisah.
3. Keyboard virtual on-screen (opsional) atau dukungan keyboard fisik/mobile untuk mengetik jawaban ke dalam kotak.
4. Fitur pengecekan: "Cek Jawaban". Kotak yang salah akan berwarna merah, yang benar berwarna hijau dan terkunci.
5. Tombol "Beri Petunjuk (Hint)" yang akan membuka 1 huruf acak, namun memotong potensi skor maksimal.
6. Jika seluruh papan terisi dengan benar, munculkan animasi sukses.

**PENTING - INTEGRASI PENGIRIMAN NILAI:**
Ketika seluruh papan selesai, munculkan tombol "Kirim Nilai":
\`\`\`javascript
window.parent.postMessage({
  action: 'KIRIM_NILAI',
  answers: dataJawaban, // (opsional) array/objek berisi data rekap jawaban siswa
  skor: skorAkhir // Misalnya 100 dikurangi jika menggunakan Hint
}, '*');
\`\`\`

**ATURAN:**
- Format file tunggal (HTML+CSS+JS inline).
- Struktur TTS harus digenerate/dihardcode oleh Anda (AI) agar kotak-kotak yang berpotongan (intersection) pas (hurufnya sama).
- Layout harus responsif! (Ini penting, pastikan di HP TTS bisa di-zoom/scroll atau beradaptasi).
- Tampilan rapi, minimalis bergaya koran digital modern.`,
  },
  {
    id: 'label-gambar-biologi',
    title: 'Label Gambar Interaktif (Biologi/Anatomi)',
    category: 'Visual',
    icon: '🏷️',
    description: 'Beri label pada bagian-bagian dari sebuah gambar atau diagram (seperti organ tubuh atau sel) dengan cara drag-and-drop.',
    guide: 'Penting: Minta AI untuk menggunakan gambar berformat SVG buatan AI atau gunakan link gambar (URL) eksternal agar file HTML tetap ringan.',
    prompt: `Buatkan saya file HTML tunggal (inline CSS & JS) berupa game edukasi "Label Gambar Interaktif" dengan spesifikasi berikut:

**TOPIK:** [TOPIK, misal: Bagian-Bagian Jantung Manusia]
**MATA PELAJARAN:** [MATA PELAJARAN, misal: Biologi]

**FITUR YANG HARUS ADA:**
1. Sebuah diagram/gambar besar di tengah layar. (TOLONG generate gambar ini menggunakan SVG murni di dalam kode HTML agar bentuknya jelas, misal ilustrasi sederhana jantung, sel, atau daun).
2. Terdapat kotak-kotak target (drop zone) yang kosong pada titik-titik tertentu di gambar, lengkap dengan garis penunjuk ke bagian anatomi terkait.
3. Di bagian bawah/samping layar, sediakan label-label teks (nama-nama organ/bagian) yang bisa di-drag oleh siswa.
4. Siswa harus men-drag label ke drop zone yang tepat di atas gambar.
5. Tombol "Cek Jawaban". Jika benar, label terkunci dan berwarna hijau. Jika salah, label kembali ke tempat semula.
6. Hitung jumlah percobaan yang dilakukan siswa.

**PENTING - INTEGRASI PENGIRIMAN NILAI:**
Setelah semua bagian berhasil dilabeli dengan benar, munculkan tombol "Kirim Nilai":
\`\`\`javascript
window.parent.postMessage({
  action: 'KIRIM_NILAI',
  answers: dataJawaban, // (opsional) array/objek berisi data rekap jawaban siswa
  skor: skorAkhir // Hitung berdasarkan jumlah kesalahan/percobaan
}, '*');
\`\`\`

**ATURAN:**
- Format file tunggal (HTML+CSS+JS inline).
- JANGAN gunakan gambar Base64 yang raksasa. Wajib buat grafis SVG langsung di dalam HTML, atau gunakan placeholder URL gambar publik (seperti Wikimedia Commons) jika SVG terlalu sulit.
- Pastikan fitur Drag & Drop bekerja mulus di perangkat sentuh (Touch Events untuk HP).`,
  },
  {
    id: 'hotspot-eksplorasi',
    title: 'Eksplorasi Gambar (Hotspot Info)',
    category: 'Visual',
    icon: '🔍',
    description: 'Media pembelajaran mandiri di mana siswa bisa mengklik pin/titik pada gambar untuk memunculkan penjelasan detail dan kuis pop-up.',
    guide: 'Sangat cocok untuk materi geografi (Peta) atau biologi (Sistem Tubuh). Gunakan URL gambar eksternal berkualitas tinggi pada prompt.',
    prompt: `Buatkan saya file HTML tunggal (inline CSS & JS) berupa media interaktif "Eksplorasi Gambar Hotspot" dengan spesifikasi berikut:

**TOPIK:** [TOPIK, misal: Peta Penyebaran Flora & Fauna / Struktur Sel Tumbuhan]
**MATA PELAJARAN:** [MATA PELAJARAN, misal: Geografi / Biologi]

**FITUR YANG HARUS ADA:**
1. Gambar latar belakang interaktif (gunakan URL gambar dari Wikimedia Commons atau Unsplash sesuai dengan topik).
2. Sebarkan minimal 5 "Pin" atau "Hotspot" (bisa berdenyut/animasi pulse) di titik-titik penting pada gambar tersebut.
3. Saat siswa mengklik sebuah pin, munculkan Modal/Popup berisi:
   - Penjelasan detail mengenai bagian tersebut (maksimal 2 paragraf).
   - 1 pertanyaan kuis pilihan ganda terkait penjelasan tersebut.
4. Siswa harus membaca penjelasan dan menjawab kuis untuk "menyelesaikan" pin tersebut (pin berubah warna menjadi hijau jika sudah diselesaikan).
5. Ada progress bar: "1/5 Titik Diselesaikan".

**PENTING - INTEGRASI PENGIRIMAN NILAI:**
Setelah semua titik/pin diselesaikan dan semua kuis dijawab, tampilkan tombol "Selesai & Kirim Nilai":
\`\`\`javascript
window.parent.postMessage({
  action: 'KIRIM_NILAI',
  answers: dataJawaban, // (opsional) array/objek berisi data rekap jawaban siswa
  skor: skorTotalKuis // Total nilai dari kuis-kuis pop-up
}, '*');
\`\`\`

**ATURAN:**
- Format file tunggal (HTML+CSS+JS inline).
- Harus responsif, gambar bisa di-pan/scroll jika di layar HP kecil.
- Desain UI mirip museum digital atau infografis modern.`,
  },
];

/**
 * Get all prompts
 */
function getAllPrompts() {
  return prompts;
}

/**
 * Get prompt by ID
 */
function getPromptById(id) {
  return prompts.find(p => p.id === id) || null;
}

/**
 * Get prompts by category
 */
function getPromptsByCategory(category) {
  return prompts.filter(p => p.category === category);
}

/**
 * Get all unique categories
 */
function getCategories() {
  return [...new Set(prompts.map(p => p.category))];
}

module.exports = {
  getAllPrompts,
  getPromptById,
  getPromptsByCategory,
  getCategories,
};
