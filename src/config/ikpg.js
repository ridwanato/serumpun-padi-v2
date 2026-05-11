// Warna FSVA (6 prioritas)
export const FSVA_COLORS = {
  sangat_rentan: { fill: '#d62828', border: '#9b1c1c' },
  rentan:        { fill: '#e76f51', border: '#c1440e' },
  agak_rentan:   { fill: '#f4a261', border: '#c97230' },
  agak_tahan:    { fill: '#a8dadc', border: '#6aacaf' },
  tahan:         { fill: '#57cc99', border: '#2d9e6b' },
  sangat_tahan:  { fill: '#2dc653', border: '#1a7a32' },
};

// Warna SKPG (3 kategori)
export const SKPG_COLORS = {
  rentan:  { fill: '#d62828', border: '#9b1c1c' },
  waspada: { fill: '#fcbf49', border: '#c49200' },
  aman:    { fill: '#2dc653', border: '#1a7a32' },
};

// Warna Borda Desil (10 level)
export const BORDA_DESIL_COLORS = {
  1:  { fill: '#7b0000', border: '#4a0000' },  // Sangat Prioritas
  2:  { fill: '#b71c1c', border: '#7f0000' },  // Prioritas Tinggi
  3:  { fill: '#d32f2f', border: '#9a0007' },  // Prioritas
  4:  { fill: '#e57373', border: '#c62828' },  // Prioritas Sedang
  5:  { fill: '#ef9a9a', border: '#d32f2f' },  // Perlu Perhatian
  6:  { fill: '#a5d6a7', border: '#66bb6a' },  // Cukup Tahan
  7:  { fill: '#66bb6a', border: '#388e3c' },  // Tahan
  8:  { fill: '#43a047', border: '#2e7d32' },  // Sangat Tahan
  9:  { fill: '#2e7d32', border: '#1b5e20' },  // Mandiri
  10: { fill: '#1b5e20', border: '#0d3b0d' },  // Sangat Mandiri
};

export const NO_DATA_COLOR = { fill: '#cccccc', border: '#999999' };

// Threshold FSVA (BKP standard)
export const getFSVACategory = (ikp) => {
  if (ikp < 46.37) return { p: 1, k: 'sangat_rentan' };
  if (ikp < 53.95) return { p: 2, k: 'rentan' };
  if (ikp < 61.83) return { p: 3, k: 'agak_rentan' };
  if (ikp < 69.71) return { p: 4, k: 'agak_tahan' };
  if (ikp < 77.29) return { p: 5, k: 'tahan' };
  return { p: 6, k: 'sangat_tahan' };
};

// Kategorisasi Borda per Desil
export const getBordaDesil = (rank, total) => {
  const desilSize = Math.ceil(total / 10);
  const desil = Math.ceil(rank / desilSize);
  const labels = {
    1: 'sangat_prioritas', 2: 'prioritas_tinggi', 3: 'prioritas',
    4: 'prioritas_sedang', 5: 'perlu_perhatian', 6: 'cukup_tahan',
    7: 'tahan', 8: 'sangat_tahan', 9: 'mandiri', 10: 'sangat_mandiri',
  };
  return { d: desil, k: labels[desil] || 'tidak_diketahui' };
};

// Legend
export const FSVA_LEGEND = [
  ['#d62828', 'P1 Sangat Rentan'], ['#e76f51', 'P2 Rentan'],
  ['#f4a261', 'P3 Agak Rentan'], ['#a8dadc', 'P4 Agak Tahan'],
  ['#57cc99', 'P5 Tahan'], ['#2dc653', 'P6 Sangat Tahan'],
];

export const SKPG_LEGEND = [
  ['#d62828', 'Rentan (>15%)'], ['#fcbf49', 'Waspada (10-15%)'], ['#2dc653', 'Aman (<10%)'],
];

export const BORDA_LEGEND = [
  ['#7b0000', 'D1 Sangat Prioritas'], ['#b71c1c', 'D2 Prioritas Tinggi'],
  ['#d32f2f', 'D3 Prioritas'], ['#e57373', 'D4 Prioritas Sedang'],
  ['#ef9a9a', 'D5 Perlu Perhatian'], ['#a5d6a7', 'D6 Cukup Tahan'],
  ['#66bb6a', 'D7 Tahan'], ['#43a047', 'D8 Sangat Tahan'],
  ['#2e7d32', 'D9 Mandiri'], ['#1b5e20', 'D10 Sangat Mandiri'],
];