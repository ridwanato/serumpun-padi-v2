// Wilayah Data - Kecamatan dan Kelurahan Kota Cilegon
export const WILAYAH = {
  'Cibeber':    ['Cibeber','Kedaleman','Bulakan','Cikerai','Karang Asem','Kalitimbang'],
  'Cilegon':    ['Bagendung','Ciwedus','Bendungan','Ketileng','Ciwaduk'],
  'Pulo Merak': ['Tamansari','Lebakgede','Mekarsari','Suralaya'],
  'Ciwandan':   ['Banjar Negara','Tegal Ratu','Kubangsari','Gunung Sugih','Kepuh','Randakari'],
  'Jombang':    ['Sukmajaya','Jombang Wetan','Masigit','Panggung Rawi','Gedong Dalem'],
  'Gerogol':    ['Kotasari','Gerogol','Rawa Arum','Gerem'],
  'Purwakarta': ['Ramanuju','Kotabumi','Kebon Dalem','Purwakarta','Tegal Bunder','Pabean'],
  'Citangkil':  ['Warnasari','Deringo','Kebonsari','Taman Baru','Lebak Denok','Samangraya','Citangkil'],
};

export const KEL_TO_KEC = {};
Object.entries(WILAYAH).forEach(([kec, kels]) => {
  kels.forEach(k => { KEL_TO_KEC[k] = kec; });
});

export const ALL_KEL = Object.values(WILAYAH).flat().sort();
export const ALL_KEC = Object.keys(WILAYAH).sort();
