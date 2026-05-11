export const FSVA_COLORS = {
  sangat_rentan: { fill:'#d62828', border:'#9b1c1c' },
  rentan:        { fill:'#e76f51', border:'#c1440e' },
  agak_rentan:   { fill:'#f4a261', border:'#c97230' },
  agak_tahan:    { fill:'#a8dadc', border:'#6aacaf' },
  tahan:         { fill:'#57cc99', border:'#2d9e6b' },
  sangat_tahan:  { fill:'#2dc653', border:'#1a7a32' },
};

export const SKPG_COLORS = {
  rentan:  { fill:'#d62828', border:'#9b1c1c' },
  waspada: { fill:'#fcbf49', border:'#c49200' },
  aman:    { fill:'#2dc653', border:'#1a7a32' },
};

export const BORDA_COLORS = {
  sangat_prioritas: { fill:'#7b2d8b', border:'#4a1a54' },
  prioritas:        { fill:'#c77dff', border:'#8b5cf6' },
  perlu_perhatian:  { fill:'#a8dadc', border:'#6aacaf' },
  relatif_tahan:    { fill:'#2dc653', border:'#1a7a32' },
};

export const NO_DATA_COLOR = { fill:'#cccccc', border:'#999999' };

export const getFSVACategory = (ikp) => {
  if (ikp < 46.37) return { p: 1, k: 'sangat_rentan' };
  if (ikp < 53.95) return { p: 2, k: 'rentan' };
  if (ikp < 61.83) return { p: 3, k: 'agak_rentan' };
  if (ikp < 69.71) return { p: 4, k: 'agak_tahan' };
  if (ikp < 77.29) return { p: 5, k: 'tahan' };
  return { p: 6, k: 'sangat_tahan' };
};

export const FSVA_LEGEND = [
  ['#d62828','P1 Sangat Rentan'],
  ['#e76f51','P2 Rentan'],
  ['#f4a261','P3 Agak Rentan'],
  ['#a8dadc','P4 Agak Tahan'],
  ['#57cc99','P5 Tahan'],
  ['#2dc653','P6 Sangat Tahan'],
];

export const SKPG_LEGEND = [
  ['#d62828','Rentan (>15%)'],
  ['#fcbf49','Waspada (10-15%)'],
  ['#2dc653','Aman (<10%)'],
];

export const BORDA_LEGEND = [
  ['#7b2d8b','L1 Sangat Prioritas'],
  ['#c77dff','L2 Prioritas'],
  ['#a8dadc','L3 Perlu Perhatian'],
  ['#2dc653','L4 Relatif Tahan'],
];
