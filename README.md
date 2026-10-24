# 📱 Web Laporan Piutang Dunlop - Ramah Lansia & Brankas Terenkripsi (Senior-Friendly Mobile Web)

Aplikasi web mobile responsif yang dirancang khusus untuk kemudahan membaca data laporan umur piutang bulanan, terutama bagi orang tua (usia 74 tahun) yang kesulitan membaca teks kecil pada file PDF laporan keuangan.

Web ini siap di-hosting langsung di **GitHub Pages** secara gratis dan dilengkapi **enkripsi kriptografis tingkat tinggi (AES-256-GCM)** agar aman diakses langsung via `github.io`.

---

## 🛡️ Arsitektur Keamanan Khusus GitHub Pages (AES-256-GCM)

Karena di-hosting langsung pada server publik statis seperti `github.io`, sistem dirancang dengan proteksi keamanan berlapis:

1. **Enkripsi Kriptografis Brankas (AES-256-GCM Vault)**:
   - Seluruh data keuangan 9 periode (Januari s/d September 2026) tersimpan di dalam file `vault.js` dalam keadaan terenkripsi penuh menggunakan **AES-256-GCM** dengan derivasi kunci **PBKDF2-SHA256 (100.000 iterasi)**, salt acak 128-bit, dan IV unik 96-bit.
   - **Zero Plaintext Password**: Tidak ada kata sandi tersimpan di dalam kode sumber JavaScript.
   - Siapapun yang melihat kode sumber (*View Source* / *Network DevTools* / download file `vault.js`) **tidak dapat membaca angka keuangan, nama toko, maupun nomor nota** tanpa mengetahui kata sandi yang valid.
2. **Dekripsi Langsung di Memori Perangkat (RAM Only)**:
   - Saat pengguna mengetik kata sandi `mihardjo`, browser menggunakan native **Web Crypto API** (`crypto.subtle`) untuk menurunkan kunci AES dan mendekripsi brankas langsung ke memori RAM sementara browser.
   - Data tidak pernah disimpan dalam bentuk teks polos (*plaintext*) ke dalam `localStorage` perangkat.
3. **Kunci Otomatis (Auto-Lock 15 Menit Tidak Aktif)**:
   - Jika tablet atau HP dibiarkan terbuka tanpa sentuhan selama **15 menit**, aplikasi otomatis menghapus data dari memori RAM dan mengunci kembali layar ke tampilan Login.
4. **Anti-Indexing Mesin Pencari (Search Engine Anti-Crawl)**:
   - Dilengkapi `<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">`.
   - File `robots.txt` melarang seluruh bot pencari (*Googlebot*, *Bingbot*, dll.) untuk mengindeks atau mengarsipkan halaman web ini.
5. **Autentikasi Pengguna**:
   - **Kata Sandi**: `mihardjo` (tidak peka huruf besar/kecil).
   - Tombol 👁️ untuk memastikan pengetikan benar di layar sentuh HP/tablet.

---

## 📊 Database Lengkap 9 Bulan (Januari - September 2026)

Seluruh 9 periode berurutan telah diekstrak, diverifikasi, dan cocok 100% matematis dengan angka Grand Total PDF resmi (selisih = 0):

| Periode | Tanggal Laporan | Grand Total Piutang (Rp) | Jumlah Toko | Jumlah Nota |
|---|---|---|---|---|
| **Januari 2026** | Per 31 Januari 2026 | `12.837.649.297` | 89 toko | 1.529 nota |
| **Februari 2026** | Per 28 Pebruari 2026 | `14.228.148.030` | 83 toko | 1.665 nota |
| **Maret 2026** | Per 31 Maret 2026 | `14.344.105.532` | 85 toko | 1.645 nota |
| **April 2026** | Per 30 April 2026 | `16.466.868.951` | 89 toko | 1.779 nota |
| **Mei 2026** | Per 31 Mei 2026 | `16.950.854.618` | 89 toko | 1.821 nota |
| **Juni 2026** | Per 30 Juni 2026 | `17.250.492.386` | 88 toko | 1.740 nota |
| **Juli 2026** | Per 31 Juli 2026 | `16.342.685.105` | 86 toko | 1.691 nota |
| **Agustus 2026** | Per 31 Agustus 2026 | `17.889.231.915` | 86 toko | 1.781 nota |
| **September 2026** | Per 30 September 2026 | `17.382.231.343` | 82 toko | 1.674 nota |

---

## ✨ Fitur Utama Ramah Lansia (Age 74+ Friendly)

1. **Tampilan Nyaman & Bawaan (Default)**:
   - **Default: Mode Malam (`🌙 Malam`)** dengan latar belakang biru-gelap yang lembut dan kontras tinggi tanpa menyilaukan mata.
   - **Default: Ukuran Font Standar/Kecil (`[ A ]`)** dengan tombol cepat perbesar **`[ A+ ]`** dan **`[ A++ ] (Super Besar)`** yang bisa diganti kapan saja dengan 1 ketukan.
   - Mendukung *pinch-to-zoom* bebas di layar sentuh HP.
2. **Navigasi Sederhana & Tombol BACK Pasti**:
   - Setiap halaman sub-menu memiliki tombol **`← KEMBALI`** besar yang mencolok di bagian atas.
   - Tombol BACK sinkron dan dijamin kembali ke posisi/halaman persis sebelumnya.
3. **Pilihan Periode Fleksibel (Multi-Period Switcher)**:
   - Dropdown di header memungkinkan perpindahan instan antar 9 bulan (September 2026 mundur hingga Januari 2026).
   - Seluruh dashboard, summary kategori, audit Data BL, dan detail toko langsung berganti sesuai periode yang dipilih.
4. **Header Rapi, Fleksibel & Tombol FULL SCREEN (`⛶ Layar Penuh`)**:
   - Dilengkapi tombol **`⛶ Layar Penuh`** di header (dan tombol mengambang `⛶` saat header ditutup) untuk memaksimalkan seluruh area pandang tablet/HP tanpa terhalang address bar browser.
   - Tombol **`✕ Tutup`** untuk menyembunyikan header dan membebaskan ruang baca layar.
   - Begitu header ditutup, muncul tombol melayang (*floating cluster*) **`⚙️ Menu`** & **`⛶`** di pojok kanan atas layar.
5. **Responsif Cerdas & Tampilan Rapi di Tablet 8" (Bebas Overflow)**:
   - Layout header ditata rapi dalam 2 baris terstruktur sehingga tidak berjejal atau overflow di layar tablet portrait maupun landscape.
   - **Seluruh Widget Dapat Diklik Langsung (*Full-Card Clickable*)**:
     - Mengetuk kotak **Total Piutang Bulan Ini** langsung membuka daftar semua toko.
     - Mengetuk batang komposisi atau kotak legenda umur piutang langsung membuka kategori tersebut.
     - Mengetuk kartu kategori piutang, kartu audit Data BL, maupun kartu toko langsung membuka halaman tujuan.
   - **Di Tablet 8" Landscape (1024px - 1280px)**:
     - Kartu Total Piutang & Komposisi Persentase tampil berdampingan (*side-by-side*).
     - 5 Kotak Kategori Piutang tertata dalam grid 2-3 kolom sehingga ayah Anda dapat melihat semua kelompok piutang tanpa perlu scroll panjang.
     - Daftar toko tertata dalam grid multi-kolom yang lapang dan mudah dipindai.
6. **Pelacakan Cicilan Nota Multi-Bulan (Installment Tracker)**:
   - Sistem master invoice otomatis melacak riwayat nota dari 9 bulan berjalan: jika sebuah nota berkurang dari bulan-bulan sebelumnya, otomatis muncul badge:
     *`Sudah Dicicil: [Nominal] dari Total Nota [Total Awal] ([%])`*
7. **Menu Data BL (Pelanggaran Blacklist Toko Macet &gt; 120 Hari)**:
   - Mengidentifikasi toko-toko yang memiliki tunggakan macet usia `> 120 hari` namun anehnya masih diterbitkan nota tagihan baru.
   - Dilengkapi menu khusus `⛔ Data BL (N)`, kartu perbandingan macet vs nota baru, lencana khusus di kartu toko & nota, serta rincian nota yang dapat dibuka/tutup (*accordion*).
8. **Menu Pembayaran & Rekonsiliasi Keuangan (Rantai 9 Bulan Otomatis)**:
   - Sistem membandingkan posisi nota antar 2 bulan berurutan:
     - `Jan ➔ Feb`: Terbayar `3.923.303.337`
     - `Feb ➔ Mar`: Terbayar `5.070.429.689`
     - `Mar ➔ Apr`: Terbayar `4.371.201.436`
     - `Apr ➔ Mei`: Terbayar `4.497.462.033`
     - `Mei ➔ Jun`: Terbayar `4.876.767.475`
     - `Jun ➔ Jul`: Terbayar `5.878.162.397`
     - `Jul ➔ Ags`: Terbayar `4.162.910.725`
     - `Ags ➔ Sep`: Terbayar `5.891.176.844`
   - Tim Finance dapat langsung mencocokkan (*cross-check*) nilai pelunasan nota dengan mutasi rekening bank (Lunas Penuh vs Cicil Sebagian).
9. **Dashboard Khusus Owner (Analisa Tren 9 Bulan)**:
   - Tren Aging Value, Tren Aging Toko, Tren Omzet Bulanan, dan Tren Toko Bertransaksi dari Januari hingga September 2026.
   - Dilengkapi visual grafik SVG responsif dan tabel komparasi detail.

---

## 🌐 Cara Hosting & Deploy ke GitHub Pages

1. **Inisialisasi & Push ke GitHub**:
   ```powershell
   git init
   git add .
   git commit -m "Deploy Dunlop Web Laporan Piutang Terenkripsi AES-256"
   git branch -M main
   git remote add origin https://github.com/USERNAME/dunlop.git
   git push -u origin main
   ```

2. **Aktifkan GitHub Pages**:
   - Masuk ke repository GitHub -> **Settings** -> **Pages**.
   - Pada bagian **Build and deployment**:
     - *Source*: pilih **Deploy from a branch**.
     - *Branch*: pilih `main` dan folder `/(root)` -> klik **Save**.
   - Dalam 1-2 menit, link live Anda akan aktif di:
     `https://USERNAME.github.io/dunlop/`

3. **Buka di HP/Tablet Ayah**:
   - Buka link di browser Chrome atau Safari di tablet/HP.
   - Ketik kata sandi: `mihardjo`.
   - Di menu browser, pilih **"Add to Home Screen"** (Tambahkan ke Layar Utama) agar icon Dunlop muncul langsung di desktop HP/tablet beliau.

---

## 📂 Struktur File

- `index.html` : Halaman antarmuka utama (Dashboard, Kategori, Detail Toko, Data BL, Rekonsiliasi Pembayaran, Owner Dashboard, Modal Update).
- `styles.css` : Desain responsif ramah lansia, layout fleksibel mobile/tablet 8", tema kontras lembut.
- `app.js` : Engine aplikasi, dekripsi AES-256-GCM, auto-lock 15 menit, period switcher 9 bulan, reconciler, dan audit blacklist.
- `vault.js` : Brankas terenkripsi kriptografis AES-256-GCM yang memuat seluruh dataset 9 bulan (Jan-Sep 2026).
- `robots.txt` : Kebijakan anti-crawling mesin pencari untuk privasi maksimal.
- `data_*.js` / `data_*.json` : Database terurai per bulan (Jan, Feb, Mar, Apr, Mei, Jun, Jul, Ags, Sep 2026).
- `raw_ocr_*.txt` : Arsip teks mentah OCR resmi tiap bulan.
