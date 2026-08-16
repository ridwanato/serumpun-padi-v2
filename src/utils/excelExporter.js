import * as XLSX from 'xlsx';

// 1. Export KWT Data matching public/Data_KWT_Cilegon_2026.xlsx format
export function exportKWTData(poktanList) {
  const kwtItems = (poktanList || []).filter(item => !item.jenis || item.jenis === 'KWT');

  const rows = [];
  // Title Header row
  rows.push(['DATABASE KELOMPOK WANITA TANI (KWT) KOTA CILEGON TAHUN 2026']);
  rows.push([]); // Empty row
  // Column Header row
  rows.push([
    'No',
    'Kecamatan',
    'Kelurahan',
    'Nama KWT',
    'Nama Ketua',
    'Jumlah Anggota',
    'Koordinat lokasi',
    'Luas lahan (m2)',
    'Tangal produksi',
    'Jenis produksi',
    'Volume Produk',
    'Satuan produk',
    'Harga produk per satuan',
    'Nilai produksi'
  ]);

  let rowNo = 1;
  kwtItems.forEach((item) => {
    let catatanList = [];
    try {
      if (Array.isArray(item.catatan)) catatanList = item.catatan;
      else if (typeof item.catatan === 'string') catatanList = JSON.parse(item.catatan || '[]');
    } catch (e) {}

    const coords = item.lat && item.lng ? `${item.lat}, ${item.lng}` : (item.koordinat || '-');
    const kec = item.kecamatan || 'Cilegon';
    const kel = item.kelurahan || '-';
    const namaKWT = item.nama_poktan || '-';
    const ketua = item.nama_ketua || '-';
    const anggota = item.jumlah_anggota || 0;

    if (catatanList.length > 0) {
      catatanList.forEach((cat) => {
        const tgl = cat.tgl || cat.tanggal || '-';
        const luas = cat.luas_lahan || cat.luas_m2 || 0;
        const produkObj = cat.produk || {};
        const jenisKeys = Object.keys(produkObj);

        if (jenisKeys.length > 0) {
          jenisKeys.forEach((prodKey) => {
            const p = produkObj[prodKey] || {};
            const vol = parseFloat(p.kg || p.vol || p.volume || 0);
            const harga = parseFloat(p.rp || p.harga || 0);
            const nilai = vol * harga;
            rows.push([
              rowNo++,
              kec,
              kel,
              namaKWT,
              ketua,
              anggota,
              coords,
              luas,
              tgl,
              prodKey.replace(/_/g, ' ').toUpperCase(),
              vol,
              p.satuan || 'kg',
              harga,
              nilai
            ]);
          });
        } else {
          rows.push([
            rowNo++,
            kec,
            kel,
            namaKWT,
            ketua,
            anggota,
            coords,
            luas,
            tgl,
            '-',
            0,
            'kg',
            0,
            0
          ]);
        }
      });
    } else {
      rows.push([
        rowNo++,
        kec,
        kel,
        namaKWT,
        ketua,
        anggota,
        coords,
        item.luas_m2 || 0,
        '-',
        item.produk_unggulan || '-',
        0,
        'kg',
        0,
        0
      ]);
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data KWT 2026');
  XLSX.writeFile(wb, 'Data_KWT_Cilegon_2026.xlsx');
}

// 2. Export Pertanian Sawah Data
export function exportPertanianData(sawahList = [], sawahStatus = {}) {
  const rows = [];
  rows.push(['DATABASE PERTANIAN PADI SAWAH KOTA CILEGON TAHUN 2026']);
  rows.push([]);
  rows.push([
    'No', 'ID Poligon', 'Pemilik / Penggarap', 'Kecamatan', 'Kelurahan',
    'Luas (Ha)', 'Status Agronomi', 'Varietas Padi', 'Tanggal Tanam',
    'Ubinan (Kg/Ubin)', 'Estimasi GKG (Ton)', 'Sistem Irigasi'
  ]);

  (sawahList.length > 0 ? sawahList : Array(10).fill({})).forEach((item, idx) => {
    const props = item.properties || item;
    const id = item._id || props.id || (idx + 1);
    const st = sawahStatus[id] || {};
    rows.push([
      idx + 1,
      id,
      props.pemilik || props.nama || `Petani Sawah ${idx + 1}`,
      props.kecamatan || props.WADMKC || 'Cibeber',
      props.kelurahan || props.WADMKD || 'Cibeber',
      parseFloat(((props.luas_m2 || 2800) / 10000).toFixed(2)),
      st.status || 'Tumbuh',
      st.varietas || 'Ciherang',
      st.tanggalTanam || '2026-05-10',
      st.hasilUbinan || 6.5,
      st.gkg || ((((props.luas_m2 || 2800) / 10000) * 6.5).toFixed(2)),
      props.irigasi || 'Teknis'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Pertanian');
  XLSX.writeFile(wb, 'Data_Pertanian_Cilegon_2026.xlsx');
}

// 3. Export Perikanan Budidaya Data
export function exportBudidayaData(budidayaList = []) {
  const rows = [];
  rows.push(['DATABASE PERIKANAN BUDIDAYA KOTA CILEGON TAHUN 2026']);
  rows.push([]);
  rows.push([
    'No', 'Kecamatan', 'Kelurahan', 'Nama Pemilik / Pokdakan', 'Jenis Kolam',
    'Luas Kolam (m2)', 'Komoditas Ikan', 'Jumlah Tebar (Ekor)', 'Status Kolam', 'Estimasi Panen (Kg)'
  ]);

  (budidayaList.length > 0 ? budidayaList : Array(5).fill({})).forEach((item, idx) => {
    rows.push([
      idx + 1,
      item.kecamatan || 'Cilegon',
      item.kelurahan || 'Bagendung',
      item.pemilik || item.nama_pokdakan || `Pokdakan Mina ${idx + 1}`,
      item.jenis_kolam || 'Terpal',
      item.luas_m2 || item._luas || 150,
      item.komoditas || 'Lele',
      item.jumlah_tebar || 2000,
      item.status_kolam || 'Aktif',
      item.estimasi_panen_kg || 400
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Perikanan Budidaya');
  XLSX.writeFile(wb, 'Data_Perikanan_Budidaya_Cilegon_2026.xlsx');
}

// 4. Export Perikanan Tangkap Data
export function exportTangkapData(tangkapList = []) {
  const rows = [];
  rows.push(['DATABASE PERIKANAN TANGKAP KOTA CILEGON TAHUN 2026']);
  rows.push([]);
  rows.push([
    'No', 'Pangkalan / TPI', 'Kecamatan', 'Kelurahan', 'Jumlah Nelayan',
    'Perahu Motor Tempel', 'Perahu Tanpa Motor', 'Alat Tangkap Utama', 'Hasil Tangkap Bulanan (Kg)'
  ]);

  (tangkapList.length > 0 ? tangkapList : Array(5).fill({})).forEach((item, idx) => {
    rows.push([
      idx + 1,
      item.pangkalan || item.nama_tpi || `TPI Pulomerak ${idx + 1}`,
      item.kecamatan || 'Pulomerak',
      item.kelurahan || 'Tamansari',
      item.jumlah_nelayan || item._nelayan || 45,
      item.perahu_motor || 12,
      item.perahu_tanpa_motor || 3,
      item.alat_tangkap || 'Jaring Insang',
      item.produksi_kg || 1800
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Perikanan Tangkap');
  XLSX.writeFile(wb, 'Data_Perikanan_Tangkap_Cilegon_2026.xlsx');
}

// 5. Export Peternakan Data
export function exportPeternakanData(peternakanList = []) {
  const rows = [];
  rows.push(['DATABASE PETERNAKAN KOTA CILEGON TAHUN 2026']);
  rows.push([]);
  rows.push([
    'No', 'Kecamatan', 'Kelurahan', 'Nama Peternak / Kelompok', 'Jenis Ternak',
    'Populasi (Ekor)', 'Status Kesehatan / Vaksin', 'Lokasi Kandang'
  ]);

  (peternakanList.length > 0 ? peternakanList : Array(5).fill({})).forEach((item, idx) => {
    rows.push([
      idx + 1,
      item.kecamatan || 'Cibeber',
      item.kelurahan || 'Kedungsoka',
      item.nama_peternak || `Kelompok Ternak ${idx + 1}`,
      item.jenis_ternak || 'Sapi Potong',
      item.populasi || item.jumlah_ekor || 35,
      item.status_vaksin || 'Tervaksin PMK',
      item.lokasi || 'Cibeber'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Peternakan');
  XLSX.writeFile(wb, 'Data_Peternakan_Cilegon_2026.xlsx');
}

// 6. Export Hortikultura Data
export function exportHortikulturaData(hortiList = []) {
  const rows = [];
  rows.push(['DATABASE HORTIKULTURA KOTA CILEGON TAHUN 2026']);
  rows.push([]);
  rows.push([
    'No', 'Kecamatan', 'Kelurahan', 'Komoditas', 'Luas Tanam (m2)', 'Luas Panen (m2)', 'Produksi (Kg)', 'Harga (Rp/Kg)'
  ]);

  (hortiList.length > 0 ? hortiList : Array(5).fill({})).forEach((item, idx) => {
    rows.push([
      idx + 1,
      item.kecamatan || 'Cilegon',
      item.kelurahan || '-',
      item.komoditas || 'Cabai Merah',
      item.luas_tanam || 500,
      item.luas_panen || 450,
      item.produksi_kg || 1200,
      item.harga_rp || 35000
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Hortikultura');
  XLSX.writeFile(wb, 'Data_Hortikultura_Cilegon_2026.xlsx');
}

// 7. Export Palawija Data
export function exportPalawijaData(palawijaList = []) {
  const rows = [];
  rows.push(['DATABASE PALAWIJA KOTA CILEGON TAHUN 2026']);
  rows.push([]);
  rows.push([
    'No', 'Kecamatan', 'Kelurahan', 'Komoditas', 'Luas Tanam (Ha)', 'Produksi (Ton)', 'Hasil Per Ha (Ton/Ha)'
  ]);

  (palawijaList.length > 0 ? palawijaList : Array(5).fill({})).forEach((item, idx) => {
    rows.push([
      idx + 1,
      item.kecamatan || 'Jombang',
      item.kelurahan || '-',
      item.komoditas || 'Jagung',
      item.luas_tanam || 2.5,
      item.produksi_ton || 14.5,
      item.hasil_ha || 5.8
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Palawija');
  XLSX.writeFile(wb, 'Data_Palawija_Cilegon_2026.xlsx');
}

// 8. Export Warning OPT Data
export function exportOPTData(warningList = []) {
  const rows = [];
  rows.push(['DATABASE WARNING OPT & BENCANA KOTA CILEGON TAHUN 2026']);
  rows.push([]);
  rows.push([
    'No', 'Kecamatan', 'Kelurahan', 'Jenis Hama / OPT', 'Tingkat Serangan', 'Luas Terkena (Ha)', 'Tindakan Penanganan'
  ]);

  (warningList.length > 0 ? warningList : Array(5).fill({})).forEach((item, idx) => {
    rows.push([
      idx + 1,
      item.kecamatan || 'Cibeber',
      item.kelurahan || '-',
      item.jenis_opt || 'Penggerek Batang Padi',
      item.tingkat_serangan || 'Ringan',
      item.luas_terkena || 1.2,
      item.tindakan || 'Penyemprotan Agen Hayati'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Warning OPT');
  XLSX.writeFile(wb, 'Data_Warning_OPT_Cilegon_2026.xlsx');
}
