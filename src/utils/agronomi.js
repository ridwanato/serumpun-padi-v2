// Hitung hari sejak tanam
export const hitungHariTanam = (tgl) =>
  !tgl ? null : Math.floor((Date.now() - new Date(tgl)) / 864e5);

// Hitung status otomatis berdasarkan HST
export const hitungStatusOtomatis = (tgl, umur = 110) => {
  const h = hitungHariTanam(tgl);
  if (h === null) return 'belum';
  if (h <= Math.round(umur * 0.36)) return 'baru_tanam';
  if (h <= Math.round(umur * 0.73)) return 'tumbuh';
  if (h <= umur) return 'siap_panen';
  return 'bera';
};

// Estimasi tanggal panen
export const hitungEstimasiPanen = (tgl, umur = 110) => {
  if (!tgl) return '-';
  return new Date(new Date(tgl).getTime() + umur * 864e5)
    .toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Hitung fase HST
export const hitungFaseHST = (hari, umur = 110) => {
  if (hari === null || hari === undefined) return null;
  if (hari <= Math.round(umur * 0.36)) return { fase: 'Vegetatif',    icon: '🌱', color: '#52b788', pct: (hari/umur)*100 };
  if (hari <= Math.round(umur * 0.73)) return { fase: 'Generatif',    icon: '🌿', color: '#2d6a4f', pct: (hari/umur)*100 };
  if (hari <= umur)                    return { fase: 'Pematangan',   icon: '🌾', color: '#e9c46a', pct: (hari/umur)*100 };
  return { fase: 'Lewat Estimasi', icon: '⚠️', color: '#e76f51', pct: 100 };
};

// Hitung produksi (SKGB 2018)
export const hitungProduksi = (luasM2, hasilUbinan) => {
  if (!hasilUbinan || !luasM2) return null;
  const tonHa = (parseFloat(hasilUbinan) / 6.25) * 10000 / 1000;
  const luasHa = luasM2 / 10000;
  const gkp = tonHa * luasHa;
  return { tonHa, gkp, gkg: gkp * 0.8602, beras: gkp * 0.8602 * 0.6402 };
};

// Format tanggal
export const fmtTgl = (d) => d
  ? new Date(d).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })
  : '-';

// Format hektar
export const fmtHa = (m2) => (m2 / 10000).toFixed(2);