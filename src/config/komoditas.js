export const STATUS_CONFIG = {
  belum:      { label: 'Belum Ditentukan', color: '#aaaaaa', fillColor: '#cccccc' },
  baru_tanam: { label: '🌱 Baru Tanam',    color: '#52b788', fillColor: '#b7e4c7' },
  tumbuh:     { label: '🌿 Sedang Tumbuh', color: '#2d6a4f', fillColor: '#52b788' },
  siap_panen: { label: '🌾 Siap Panen',    color: '#e9c46a', fillColor: '#ffd166' },
  bera:       { label: '⬜ Bera / Kosong', color: '#888888', fillColor: '#eeeeee' },
};

export const VARIETAS_CONFIG = {
  inpari13: { label: 'Inpari 13',        umur: 95  },
  inpari32: { label: 'Inpari 32',        umur: 120 },
  inpari33: { label: 'Inpari 33',        umur: 107 },
  inpari42: { label: 'Inpari 42 Agritan',umur: 112 },
  ciherang: { label: 'Ciherang',         umur: 116 },
  lainnya:  { label: 'Lainnya / Umum',   umur: 110 },
};

export const HORTIKULTURA_CONFIG = {
  cabai_merah:    { label: 'Cabai Merah',    icon: '🌶️', umur: 90  },
  cabai_rawit:    { label: 'Cabai Rawit',    icon: '🔴', umur: 75  },
  sawi:           { label: 'Sawi',           icon: '🥬', umur: 30  },
  pakcoy:         { label: 'Pakcoy',         icon: '🥦', umur: 25  },
  tomat:          { label: 'Tomat',          icon: '🍅', umur: 75  },
  timun:          { label: 'Timun',          icon: '🥒', umur: 45  },
  kacang_panjang: { label: 'Kacang Panjang', icon: '🫘', umur: 55  },
  melon_golden:   { label: 'Melon Golden',   icon: '🍈', umur: 70  },
  melon_hijau:    { label: 'Melon Hijau',    icon: '🍈', umur: 65  },
  semangka:       { label: 'Semangka',       icon: '🍉', umur: 75  },
  terong:         { label: 'Terong',         icon: '🍆', umur: 70  },
  buncis:         { label: 'Buncis',         icon: '🫛', umur: 50  },
};

export const PALAWIJA_CONFIG = {
  kelapa:       { label: 'Kelapa',       icon: '🥥', umur: 365 },
  kacang_tanah: { label: 'Kacang Tanah', icon: '🥜', umur: 90  },
  singkong:     { label: 'Singkong',     icon: '🌿', umur: 240 },
  ubi_jalar:    { label: 'Ubi Jalar',    icon: '🍠', umur: 120 },
  jagung:       { label: 'Jagung',       icon: '🌽', umur: 95  },
  kedelai:      { label: 'Kedelai',      icon: '🫘', umur: 85  },
  kacang_hijau: { label: 'Kacang Hijau', icon: '🟢', umur: 65  },
  talas:        { label: 'Talas',        icon: '🍃', umur: 180 },
};

export const WARNING_CONFIG = {
  opt:        { label: 'Serangan OPT', icon: '🐛', cls: 'opt'        },
  kekeringan: { label: 'Kekeringan',   icon: '☀️', cls: 'kekeringan' },
  kebanjiran: { label: 'Kebanjiran',   icon: '🌊', cls: 'kebanjiran' },
  puso:       { label: 'Puso',         icon: '💀', cls: 'puso'       },
};

export const JENIS_IKAN_BUDIDAYA = ['Lele','Nila','Gurame','Mas','Patin','Bawal','Udang','Bandeng','Lainnya'];
export const ALAT_TANGKAP = ['Jaring','Pancing','Bubu','Sero','Purse seine','Lainnya'];
export const ARMADA_TYPES = ['Perahu tanpa motor','Perahu motor tempel','Kapal motor'];
