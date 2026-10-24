# 📱 Web Laporan Piutang Dunlop - Ramah Lansia (Senior-Friendly Mobile Web)

Aplikasi web mobile responsif yang dirancang khusus untuk kemudahan membaca data laporan umur piutang bulanan, terutama bagi orang tua (usia 74 tahun) yang kesulitan membaca teks kecil pada file PDF laporan keuangan.

Web ini siap di-hosting langsung di **GitHub Pages** secara gratis dan dapat diperbarui setiap bulan dengan mudah.

---

## 🔐 Keamanan & Login
- Saat pertama kali membuka website, akan muncul **halaman login** pengaman.
- **Kata Sandi (Password)**: `mihardjo` (tidak peka huruf besar/kecil).
- Dilengkapi tombol 👁️ untuk melihat sandi yang diketik agar tidak salah ketik di layar HP.
- Pengunjung tidak dapat mengakses dashboard atau halaman apapun sebelum login berhasil.
- Tersedia tombol **"🚪 Keluar"** di pojok kanan atas untuk mengunci kembali layar.

---

## ✨ Fitur Utama Ramah Lansia (Age 74+ Friendly)

1. **Tampilan Nyaman & Bawaan (Default)**:
   - **Default: Mode Malam (`🌙 Malam`)** dengan latar belakang biru-gelap yang lembut dan kontras tinggi tanpa menyilaukan mata.
   - **Default: Ukuran Font Standar/Kecil (`[ A ]`)** dengan tombol cepat perbesar **`[ A+ ]`** dan **`[ A++ ] (Super Besar)`** yang bisa diganti kapan saja dengan 1 ketukan.
   - Mendukung *pinch-to-zoom* bebas di layar sentuh HP.
2. **Navigasi Sederhana & Tombol BACK Pasti**:
   - Setiap halaman sub-menu memiliki tombol **`← KEMBALI`** besar yang mencolok di bagian atas.
   - Tombol BACK dijamin kembali ke posisi/halaman persis sebelumnya (tidak akan tersesat).
3. **Pilihan Periode Fleksibel (Multi-Period Switcher)**:
   - Tersedia pemilih periode di header yang dapat diganti sewaktu-waktu:
     - **September 2026** (`17.382.231.343` | 82 Toko)
     - **April 2026** (`16.466.868.951` | 89 Toko)
     - **Maret 2026** (`14.344.105.532` | 85 Toko)
     - **Februari 2026** (`14.228.148.030` | 83 Toko)
     - **Januari 2026** (`12.837.649.297` | 89 Toko)
   - Seluruh dashboard, summary kategori, audit Data BL, dan detail toko akan langsung berganti sesuai periode yang dipilih.
3. **5 Kategori Usia Piutang & Persentase Sesuai Kolom PDF**:
   - **Halaman 1: Dashboard Utama**
     - Total Piutang Bulan Ini: **`17.382.231.343`** (ditampilkan dalam 1 baris tanpa terpotong/overflow)
     - Seluruh angka piutang ditampilkan langsung dalam format angka rapi tanpa awalan `Rp` untuk keterbacaan optimal di layar HP.
     - **Grafik Komposisi & Persentase Visual (1 Desimal)**:
       - `< 30 Hari` : **31,9%** (`5.553.323.252` • 60 Toko)
       - `31 - 60 Hari` : **27,4%** (`4.768.110.414` • 58 Toko)
       - `61 - 90 Hari` : **18,7%** (`3.248.508.499` • 41 Toko)
       - `91 - 120 Hari` : **9,5%** (`1.654.010.739` • 22 Toko)
       - `> 120 Hari` : **12,4%** (`2.158.278.439` • 16 Toko)
     - Setiap kotak kategori dilengkapi lencana persentase (*badge* 1 desimal), batang rasio, dan status kelancaran piutang (Lancar, Perhatian, Peringatan, Jatuh Tempo, Macet/Kritis).
   - **Halaman 2: Summary Toko per Kategori & Halaman Semua Toko**
     - Menampilkan judul kategori, lencana persentase porsi piutang, & total nominal tanpa `Rp`.
     - Daftar toko dengan nama toko, total piutang toko, dan rentang usia piutang (contoh: `OSCAR VRS : 166.928.300 : 2 - 28 hari`).
     - Fitur pencarian nama toko & pengurutan (Piutang Terbesar, Nama A-Z, Usia Terlama).
   - **Halaman 3: Detail Nota per Toko**
     - Rincian per nota untuk toko yang dipilih, dikelompokkan rapi ke dalam 5 kategori usia piutang:
       - `< 30 Hari`: daftar nota (nominal, no nota, tanggal, usia dalam hari).
       - `31 - 60 Hari`: daftar nota.
       - `61 - 90 Hari`: daftar nota.
       - `91 - 120 Hari`: daftar nota.
       - `> 120 Hari`: daftar nota.
4. **Header Rapi, Fleksibel & Tombol FULL SCREEN (`⛶ Layar Penuh`)**:
   - Dilengkapi tombol **`⛶ Layar Penuh`** di header (dan tombol mengambang `⛶` saat header ditutup) untuk memaksimalkan seluruh area pandang tablet/HP tanpa terhalang address bar browser.
   - Di pojok kanan atas header terdapat tombol **`✕ Tutup`** untuk menyembunyikan header dan membebaskan ruang baca layar.
   - Begitu header ditutup, muncul tombol melayang (*floating cluster*) **`⚙️ Menu`** & **`⛶`** di pojok kanan atas layar.
5. **Responsif Cerdas & Tampilan Rapi di Tablet 8" (Bebas Overflow)**:
   - Layout header ditata rapi dalam 2 baris terstruktur sehingga tidak berjejal atau overflow di layar tablet portrait maupun landscape.
   - **Default Font Lebih Rapi**: Ukuran font dasar diperkecil 2pt (`15.5px`) agar seluruh informasi tampil padat, elegan, dan proporsional.
   - **Seluruh Widget Dapat Diklik Langsung (*Full-Card Clickable*)**:
     - Mengetuk kotak **Total Piutang Bulan Ini** langsung membuka daftar semua 82 toko.
     - Mengetuk batang komposisi atau kotak legenda umur piutang langsung membuka kategori tersebut.
     - Mengetuk kartu kategori piutang, kartu audit Data BL, maupun kartu toko langsung membuka halaman tujuan tanpa harus tepat membidik tombol teks kecil.
   - **Di Tablet 8" Landscape (1024px - 1280px)**:
     - Kartu Total Piutang & Komposisi Persentase tampil berdampingan (*side-by-side*).
     - 5 Kotak Kategori Piutang tertata dalam grid 2-3 kolom sehingga ayah Anda dapat melihat semua kelompok piutang tanpa perlu scroll panjang.
     - Daftar toko tertata dalam grid multi-kolom yang lapang dan mudah dipindai.
6. **Menu Data BL (Pelanggaran Blacklist Toko Macet &gt; 120 Hari)**:
   - Mengidentifikasi toko-toko yang memiliki tunggakan macet usia `> 120 hari` namun anehnya masih diterbitkan nota tagihan baru.
   - Sesuai kebijakan kredit, toko seperti ini seharusnya diblokir (blacklist) dari penerbitan faktur baru sebelum melunasi tunggakan lama.
   - Hasil audit pada data September 2026 mendeteksi **9 Toko Pelanggaran BL**:
     - Total Tunggakan Macet (>120H): **`1.840.774.527`** (218 nota).
     - Total Nota Baru yang Tetap Diterbitkan: **`4.129.585.100`** (284 nota baru).
   - Dilengkapi menu khusus `⛔ Data BL (9)`, kartu perbandingan macet vs nota baru, lencana khusus di kartu toko & nota, serta rincian nota yang dapat dibuka/tutup (*accordion*).
7. **Menu Pembayaran & Rekonsiliasi Keuangan (Otomatis Antar Periode)**:
   - Saat Anda mengunggah laporan bulan berikutnya, sistem secara cerdas membandingkan seluruh nota per toko antara dua periode.
   - Menghitung seluruh nota yang saldo piutangnya berkurang atau hilang (lunas), dianggap sebagai pembayaran yang telah dilakukan oleh toko.
   - Tim Finance dapat langsung menggunakan menu ini untuk mencocokkan (*cross-check*) nilai pelunasan nota dengan mutasi rekening koran bank:
     - **Lunas Penuh**: Nota periode lalu yang sudah hilang dari laporan (saldo menjadi 0).
     - **Cicil Sebagian**: Nota yang saldo piutangnya berkurang dari bulan lalu.
8. **Dashboard Khusus Owner (Analisa Tren & Pertumbuhan Bisnis)**:
   - Dashboard eksekutif khusus pemilik perusahaan untuk melihat dinamika dan tren bisnis dari bulan ke bulan:
     1. **Tren Aging Value**: Grafik interaktif perkembangan nominal piutang per kelompok umur (`< 30H`, `31-60H`, `61-90H`, `91-120H`, `> 120H`) dengan mode *Stacked (Komposisi)* & *Grouped (Per Kategori)*.
     2. **Tren Aging Jumlah Toko**: Sebaran banyaknya toko yang berutang di tiap kelompok umur per bulan (khususnya memantau tren pertambahan/pengurangan toko macet `> 120H`).
     3. **Tren Omzet Bulanan**: Grafik pertumbuhan penjualan kotor (faktur terbit berdasarkan tanggal nota) dilengkapi lencana pertumbuhan MoM (*Month-over-Month Growth*).
     4. **Tren Toko Bertransaksi**: Keaktifan toko yang melakukan pembelian per bulan serta rata-rata nominal pembelian per toko.
   - **Pemilihan Periode Fleksibel**:
     - Tombol preset cepat: `[ 3 Bulan Terakhir ]`, `[ 6 Bulan Terakhir (Bawaan) ]`, `[ Tahun 2026 ]`, `[ Semua Periode ]`.
     - Dropdown kustom `Dari Bulan` s/d `Sampai Bulan` untuk menganalisa rentang bulan tertentu.
     - Form `➕ Tambah Data Periode` untuk memasukkan atau menyesuaikan angka proyeksi/realisasi bulan baru.
   - Disajikan dalam antarmuka visual grafik SVG responsif beresolusi tinggi, ramah lansia, tanpa awalan `Rp`, dan tabel rincian angka eksak di bawah masing-masing grafik.

---

## 🚀 Cara Menjalankan Secara Lokal

Cukup buka file `index.html` langsung di browser Chrome/Edge/Safari di komputer atau HP Anda (double-click `index.html`). Tidak memerlukan web server khusus karena data sudah disematkan dalam format siap pakai (`data.js` & `data.json`).

---

## 🌐 Cara Hosting Gratis di GitHub Pages

1. **Inisialisasi Git & Commit**:
   ```powershell
   git init
   git add .
   git commit -m "Inisialisasi web mobile piutang Dunlop"
   ```

2. **Buat Repository Baru di GitHub**:
   - Buat repo di GitHub (misal: `piutang-dunlop` atau `dunlop`).
   - Hubungkan remote dan push:
     ```powershell
     git remote add origin https://github.com/USERNAME/piutang-dunlop.git
     git branch -M main
     git push -u origin main
     ```

3. **Aktifkan GitHub Pages**:
   - Buka halaman repository di GitHub -> klik menu **Settings** -> pilih tab **Pages**.
   - Pada bagian **Build and deployment**:
     - *Source*: pilih **Deploy from a branch**.
     - *Branch*: pilih `main` dan folder `/(root)` -> klik **Save**.
   - Dalam 1-2 menit, link website ayah Anda akan aktif, misalnya:
     `https://USERNAME.github.io/piutang-dunlop/`
   - Buka link tersebut di HP ayah Anda dan klik **"Add to Home Screen"** di browser HP agar menjadi seperti icon aplikasi di HP beliau!

---

## 🔄 Cara Update Data Setiap Bulan

Ada 2 cara praktis untuk memperbarui data piutang bulanan:

### Cara 1: Lewat Website Langsung (Paling Mudah)
1. Buka website di browser.
2. Klik tombol **`⚙️ Update`** di pojok kanan atas header.
3. Anda bisa:
   - **Upload file `data.json` baru**, ATAU
   - **Tempel (paste) teks OCR dari PDF laporan baru** ke kotak teks, lalu klik **"⚡ Proses & Update Teks Ini"**.
4. Website akan otomatis memproses semua toko, nota, menghitung usia piutang, dan langsung menampilkan laporan terbaru!
5. Anda juga bisa mengunduh file `data.json` baru dengan tombol **"💾 Download data.json"** untuk di-commit ke GitHub Pages.

### Cara 2: Lewat Script PowerShell Otomatis
Jika Anda memiliki file teks hasil OCR lokal dari PDF baru (misal `laporan_oktober.txt`):
```powershell
.\update_monthly.ps1 -InputFile "laporan_oktober.txt"
```
Script akan otomatis:
1. Membaca periode laporan baru.
2. Memverifikasi seluruh nota dan nominal piutang.
3. Memperbarui file `data.json` dan `data.js`.
4. Anda tinggal push ke GitHub:
   ```powershell
   git commit -am "Update laporan piutang bulan baru"
   git push
   ```
Website di GitHub Pages akan langsung terupdate otomatis!

---

## 📂 Struktur File

- `index.html` : Halaman antarmuka utama (Dashboard, Summary Kategori, Detail Toko, Data BL, Rekonsiliasi Pembayaran, Owner Dashboard, Modal Update).
- `styles.css` : Desain responsif ramah lansia, tombol zoom huruf, layout fleksibel mobile/tablet, dan palet warna kontras lembut.
- `app.js` : Logika aplikasi, period switcher, navigasi tombol BACK pasti, rekonsiliasi antar periode, analitika owner, dan parser OCR.
- `data.js` & `data.json` : Database piutang periode 30 September 2026 (17.382.231.343 | 82 toko | 1.674 nota).
- `data_apr2026.js` & `data_apr2026.json` : Database piutang periode 30 April 2026 (16.466.868.951 | 89 toko | 1.779 nota).
- `data_mar2026.js` & `data_mar2026.json` : Database piutang periode 31 Maret 2026 (14.344.105.532 | 85 toko | 1.645 nota).
- `data_feb2026.js` & `data_feb2026.json` : Database piutang periode 28 Pebruari 2026 (14.228.148.030 | 83 toko | 1.665 nota).
- `data_jan2026.js` & `data_jan2026.json` : Database piutang periode 31 Januari 2026 (12.837.649.297 | 89 toko | 1.529 nota).
- `raw_ocr.txt` : Teks OCR lengkap periode 30 September 2026.
- `raw_ocr_apr2026.txt` : Teks OCR lengkap periode 30 April 2026.
- `raw_ocr_mar2026.txt` : Teks OCR lengkap periode 31 Maret 2026.
- `raw_ocr_feb2026.txt` : Teks OCR lengkap periode 28 Pebruari 2026.
- `raw_ocr_jan2026.txt` : Teks OCR lengkap periode 31 Januari 2026.
- `update_monthly.ps1` : Script otomatis pemrosesan bulanan.
