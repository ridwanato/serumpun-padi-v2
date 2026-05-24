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

export const parseCoordinates = (input) => {
  if (!input) return null;
  // Menghilangkan spasi berlebih dan karakter tak perlu
  let clean = input.trim().replace(/[°'"a-zA-Z]/g, '');
  // Coba pisahkan dengan koma atau spasi
  const parts = clean.split(/,|\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  return null;
};