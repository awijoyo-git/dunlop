# 📱 Web Laporan Piutang Dunlop - Ramah Lansia (Senior-Friendly Mobile Web)

Aplikasi web mobile responsif yang dirancang khusus untuk kemudahan membaca data laporan umur piutang bulanan, terutama bagi orang tua (usia 74 tahun) yang kesulitan membaca teks kecil pada file PDF laporan keuangan.

Web ini siap di-hosting langsung di **GitHub Pages** secara gratis dan dapat diperbarui setiap bulan dengan mudah.

---

## ✨ Fitur Utama Ramah Lansia (Age 74+ Friendly)

1. **Ukuran Font Sangat Besar & Skalabel**:
   - Dilengkapi tombol cepat ukuran huruf di header: **`[ A ]`**, **`[ A+ ]` (default)**, dan **`[ A++ ] (Super Besar)`**.
   - Mendukung *pinch-to-zoom* alami di layar HP.
2. **Kontras Warna Tinggi & Tidak Menyilaukan**:
   - Menggunakan palet warna dengan kontras tinggi (WCAG AAA) yang nyaman untuk mata lansia.
   - Tersedia tombol mode **🌙 Malam / ☀️ Siang** untuk kenyamanan membaca di berbagai kondisi cahaya.
3. **Navigasi Sederhana & Tombol BACK Pasti**:
   - Setiap halaman sub-menu memiliki tombol **`← KEMBALI`** besar yang mencolok di bagian atas.
   - Tombol BACK dijamin kembali ke posisi/halaman persis sebelumnya (tidak akan tersesat).
4. **Alur Informasi yang Jelas (Sesuai Permintaan)**:
   - **Halaman 1: Dashboard Utama**
     - Total Piutang Bulan Ini: `Rp 17.382.231.343`
     - 4 Kotak Kategori Usia Piutang yang besar dan bisa diklik:
       - `< 30 Hari`
       - `31 - 60 Hari`
       - `61 - 90 Hari`
       - `> 90 Hari` (dengan rincian 91-120 hr & >120 hr)
   - **Halaman 2: Summary Toko per Kategori**
     - Menampilkan judul kategori & total nominal kategori.
     - Daftar toko dengan nama toko, total piutang toko pada kategori tersebut, dan rentang usia piutang (contoh: `OSCAR VRS : Rp 166.928.300 : 2 - 30 hari`).
     - Fitur pencarian nama toko & pengurutan (Piutang Terbesar, Nama A-Z, Usia Terlama).
   - **Halaman 3: Detail Nota per Toko**
     - Rincian per nota untuk toko yang dipilih:
       - Kelompok `< 30 hari`: daftar nota (nominal, tanggal, usia dalam hari).
       - Kelompok `31 - 60 hari`: daftar nota (nominal, tanggal, usia dalam hari).
       - Kelompok `61 - 90 hari`: daftar nota.
       - Kelompok `> 90 hari`: daftar nota.

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

- `index.html` : Halaman antarmuka utama (Dashboard, Summary Kategori, Detail Toko, Modal Update).
- `styles.css` : Desain responsif ramah lansia, tombol zoom huruf, dan palet warna kontras lembut.
- `app.js` : Logika aplikasi, navigasi tombol BACK pasti, pencarian toko, dan parser OCR.
- `data.js` & `data.json` : Database piutang hasil parsing 22 halaman PDF (1.674 nota, 82 toko).
- `raw_ocr.txt` : Teks OCR lengkap 22 halaman periode 30 September 2026.
- `update_monthly.ps1` : Script otomatis pemrosesan bulanan.
