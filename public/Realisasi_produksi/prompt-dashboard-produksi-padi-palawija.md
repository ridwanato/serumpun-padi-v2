# PROMPT: Halaman Dashboard Produksi Padi & Palawija Kota Cilegon (2014–2025)

## KONTEKS
Bangun **satu halaman khusus** (route baru, mis. `/produksi-pangan` atau `/padi-palawija`) di dalam aplikasi Dashboard Ketahanan Pangan Kota Cilegon (pangancilegon.web.id) yang menampilkan **data time series realisasi tanam, panen, produksi, dan produktivitas komoditas padi & palawija tahun 2014–2025** untuk 8 kecamatan di Kota Cilegon (Ciwandan, Citangkil, Pulomerak, Purwakarta, Grogol, Cilegon, Jombang, Cibeber).

Target pengguna: **awam** (kepala dinas, camat, masyarakat umum) sampai **teknis** (Bappeda, analis). Halaman harus bisa langsung dipahami tanpa penjelasan tambahan, dan cukup kredibel untuk dipakai sebagai dasar proyeksi & pengambilan keputusan (rapat Bappeda, RPJMD, evaluasi ketahanan pangan).

## SUMBER DATA — SKEMA FILE (WAJIB DIPAHAMI SEBELUM CODING)

Data mentah berupa **file Excel per tahun**, nama pola `Realisasi_[TAHUN].xlsx` (tahun 2014 s/d 2025). Struktur berikut **konsisten di semua tahun** kecuali disebutkan:

### A. Sheet per komoditas
Nama sheet: `padi sawah`, `padi ladang`, `puso`, `jagung`, `kedelai`, `kc tanah`, `ubi kayu`, `ubi jalar`, `kc ijo`, dan mulai beberapa tahun terakhir bertambah `talas`, `sorgum`, `porang`. **Daftar sheet per file bisa berbeda** — parser harus mendeteksi sheet yang tersedia secara dinamis, jangan hardcode 9 komoditas saja.

Setiap sheet komoditas (kecuali `puso`) berisi **4 blok data bulanan yang ditumpuk vertikal dalam satu sheet**, dengan pola:

```
Baris judul blok: "DATA LUAS TANAM [KOMODITAS] PER BULAN"
Baris subjudul  : "KOTA CILEGON TAHUN [TAHUN]"
... 2-3 baris kosong/header unit ("(Ha)", "(Ton)", "(Ku/Ha)") ...
Header kolom    : No | Kecamatan | Jan | Feb | Maret | Apr | Mei | Juni | Juli | Agst | Sept | Okt | Nov | Des | Jumlah
8 baris data    : 1 baris per kecamatan (urutan tetap: Ciwandan, Citangkil, Pulomerak, Purwakarta, Grogol, Cilegon, Jombang, Cibeber)
1 baris total   : "JUMLAH" (total kota, JANGAN dihitung ulang sebagai kecamatan ke-9)
```

Urutan 4 blok dalam satu sheet komoditas:
1. **DATA LUAS TANAM** — satuan Ha
2. **DATA LUAS PANEN** — satuan Ha
3. **DATA PRODUKSI** — satuan Ton (padi: Ton GKG)
4. **DATA PRODUKTIVITAS** — satuan Ku/Ha

Sheet `puso` (gagal panen) hanya punya 1 blok: Luas Puso (Ha), struktur baris sama.

### B. Sheet rekap tahunan (sumber utama untuk time series lintas tahun)
Ada satu sheet ringkasan per file (nama sheet = tahun, atau `rekap`) yang sudah mengagregasi **total 1 tahun penuh** (bukan bulanan) per komoditas, formatnya:

```
"N. [NAMA KOMODITAS]"
Header: No | Kecamatan | TANAM | PANEN | PRODUKSI | PRODUKTIVITAS
Satuan : (Ha) | (Ha) | (Ton) | (Ku/Ha)
8 baris kecamatan + 1 baris JUMLAH
```

Blok ini berulang untuk tiap komoditas dalam sheet yang sama (dipisahkan baris kosong). **Gunakan sheet ini sebagai sumber utama untuk grafik tahunan 2014–2025**, karena jauh lebih ringan diparsing daripada menjumlahkan 12 bulan × 8 kecamatan × N komoditas dari sheet detail. Sheet detail bulanan dipakai hanya untuk fitur drill-down musiman (opsional/lanjutan).

### C. Data quality yang harus ditangani
- Sel bisa berisi `"#DIV/0!"` (produktivitas saat luas panen = 0) → perlakukan sebagai `0` atau `null`, jangan biarkan crash parser.
- Sel bisa berisi `"-"` sebagai pengganti angka 0.
- Baris `JUMLAH`/total tidak boleh ikut dihitung sebagai kecamatan saat melakukan sorting/ranking per kecamatan.
- Tidak semua komoditas ada di semua tahun (mis. talas/sorgum/porang baru muncul belakangan) — tampilkan sebagai "data belum tersedia" bukan 0, agar tidak menyesatkan grafik tren.
- Baris header punya banyak baris kosong & merged cell di atasnya — pakai deteksi berbasis teks ("DATA LUAS TANAM...", "No", "Kecamatan") bukan nomor baris tetap, karena posisi bisa sedikit bergeser antar tahun.

### D. Cakupan data yang tersedia saat ini
Baru 2 contoh file yang diberikan (2014 dan 2025) untuk memvalidasi skema. Bangun parser secara **generik** agar begitu file tahun 2015–2024 ditambahkan dengan skema yang sama, otomatis masuk ke time series tanpa ubah kode. Sediakan folder `/data/raw/` tempat semua `Realisasi_[TAHUN].xlsx` diletakkan, dan buat script ETL yang membaca semua file yang ada lalu menghasilkan JSON/DB terstruktur.

## STRUKTUR DATA TARGET (setelah ETL)
Hasilkan satu struktur ternormalisasi, misal:

```ts
type Record = {
  tahun: number
  komoditas: string        // "padi sawah", "jagung", dst — pakai label rapi (title case)
  kecamatan: string        // salah satu dari 8 kecamatan, atau "KOTA CILEGON" untuk agregat
  tanam_ha: number | null
  panen_ha: number | null
  produksi_ton: number | null
  produktivitas_ku_ha: number | null
}
```
Simpan sebagai JSON statis (build-time) atau tabel Supabase, sesuai stack yang sudah dipakai di proyek ini.

## FITUR HALAMAN

### 1. Ringkasan atas (kartu KPI)
- Total produksi tahun terkini (semua komoditas, semua kecamatan) + persentase perubahan vs tahun sebelumnya.
- Komoditas dengan produksi tertinggi tahun ini.
- Kecamatan dengan produksi tertinggi tahun ini.
- Rata-rata produktivitas kota dibanding rata-rata 5 tahun terakhir.

### 2. Grafik tren time series 2014–2025 (utama)
- Line/area chart multi-komoditas, dengan **toggle**: pilih komoditas (multi-select), pilih level (Kota / per kecamatan), pilih metrik (Tanam/Panen/Produksi/Produktivitas).
- Sumbu X = tahun, sumbu Y = nilai metrik. Tooltip jelas dengan satuan.
- Beri anotasi otomatis pada titik anomali (lonjakan/penurunan >30% YoY).

### 3. Perbandingan antar kecamatan
- Bar chart / heatmap: kecamatan × tahun untuk metrik terpilih, agar terlihat kecamatan mana konsisten unggul atau tertinggal.

### 4. Interpretasi & narasi otomatis (WAJIB, untuk pengguna awam)
Buat blok narasi bahasa Indonesia sederhana yang otomatis ter-generate dari data terpilih, contoh pola kalimat:
- "Produksi padi sawah Kota Cilegon [naik/turun] X% dari tahun [Y] ke [Y+1], didorong oleh kecamatan [Z]."
- "Kecamatan [X] konsisten menjadi penghasil [komoditas] terbesar selama N tahun terakhir."
- "Produktivitas [komoditas] di Kota Cilegon [di atas/di bawah] rata-rata periode 2014–2025."
Sertakan tooltip/glossary singkat untuk istilah: Luas Tanam, Luas Panen, Produksi, Produktivitas, Puso — karena banyak pengguna bukan orang pertanian.

### 5. Fitur sortir "Top" (permintaan utama)
Panel filter interaktif dengan kombinasi:
- **Metrik**: Tanam / Panen / Produksi / Produktivitas
- **Dimensi urut**: per Komoditas, per Kecamatan, per Tahun
- **Arah**: Tertinggi → Terendah, atau Terendah → Tertinggi
- **Filter tambahan**: rentang tahun, subset komoditas, subset kecamatan
Output: tabel ranking otomatis (mis. "Top 5 kecamatan penghasil jagung tertinggi 2020–2025") + chart pendukung yang otomatis update sesuai filter. Semua kombinasi (semua komoditas × semua kecamatan × semua tahun) harus bisa diakses lewat filter ini, bukan hardcode beberapa kombinasi saja.

### 6. Proyeksi sederhana (bantu pengambilan keputusan)
- Hitung tren linear sederhana atau moving average 3 tahun untuk memproyeksikan 1–3 tahun ke depan per komoditas/kecamatan.
- Tampilkan sebagai garis putus-putus pada chart tren, dengan disclaimer jelas: "Proyeksi sederhana berbasis tren historis, bukan model resmi/BPS — gunakan sebagai indikasi awal."

### 7. Pusat unduh data bersih (WAJIB — link download tiap segmen)
Di setiap segmen (grafik tren, perbandingan kecamatan, tabel ranking) sediakan tombol/link **"Unduh Excel"** yang men-generate file `.xlsx` rapi (bukan raw), dengan opsi granularitas:
- Per komoditas (semua tahun, semua kecamatan)
- Per kecamatan (semua komoditas, semua tahun)
- Per kota/Kota Cilegon (agregat semua kecamatan, semua komoditas, semua tahun)
- Per tahun (semua komoditas, semua kecamatan)
Format file hasil unduhan: kolom rapi (Tahun, Kecamatan, Komoditas, Tanam(Ha), Panen(Ha), Produksi(Ton), Produktivitas(Ku/Ha)), siap dipakai ulang di Excel/laporan tanpa perlu dibersihkan lagi. Generate on-the-fly dari data ternormalisasi (bukan file mentah).

## PRINSIP DESAIN & UX
- Bahasa Indonesia, sederhana, hindari jargon tanpa penjelasan.
- Palet warna profesional & ramah buta warna, konsisten dengan tema dashboard yang sudah ada.
- Mobile-responsive (banyak pengguna akan buka lewat HP saat rapat).
- Tampilkan state kosong yang jujur ("Data tahun [X] belum tersedia") daripada menampilkan grafik terputus tanpa keterangan.
- Loading state saat filter berubah, tidak nge-lag.

## OUTPUT YANG DIHARAPKAN DARI AGENT
1. Script/module ETL (`parse-realisasi-xlsx.ts` atau `.py`) yang membaca semua file `Realisasi_[TAHUN].xlsx` di folder data mentah dan menghasilkan data ternormalisasi sesuai skema di atas — termasuk unit test/sample untuk memverifikasi hasil parsing dua contoh file (2014 & 2025) sesuai isi aslinya.
2. Halaman/route baru dengan semua fitur di atas, terintegrasi ke navigasi dashboard yang sudah ada.
3. Endpoint/fungsi generate-xlsx untuk fitur unduh data bersih.
4. Dokumentasi singkat (README) cara menambahkan file tahun baru (2015–2024, dst) agar otomatis masuk time series.
