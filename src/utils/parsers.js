// Parse catatan produksi (JSON array atau format lama 'tgl|kg')
export const parseCatatan = (cat) => {
  if (!cat) return [];
  try { 
    const a = JSON.parse(cat); 
    if (Array.isArray(a)) return a; 
  } catch(e) {}
  const [tgl, kg] = cat.split('|');
  return (tgl && parseFloat(kg||'0') > 0) ? [{tgl, kg: parseFloat(kg)}] : [];
};