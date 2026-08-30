const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '..', 'src', 'data', 'realisasiPanganData.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

let sql = `-- ==============================================================================
-- SKRIP SQL: TABEL PRODUKSI PANGAN 2014-2025 (SUPABASE)
-- Sumber Data: Realisasi Produksi Padi & Palawija Kota Cilegon (2014-2025)
-- Total Baris: ${data.length} Data
-- ==============================================================================
-- Petunjuk:
-- 1. Buka Supabase Dashboard Anda (https://supabase.com/dashboard)
-- 2. Pilih Project Anda -> Masuk ke menu 'SQL Editor' -> 'New Query'
-- 3. Tempel (Paste) seluruh isi skrip ini lalu klik 'Run' (atau Ctrl + Enter)
-- ==============================================================================

-- 1. Buat Tabel produksi_pangan Jika Belum Ada
CREATE TABLE IF NOT EXISTS produksi_pangan (
  id BIGSERIAL PRIMARY KEY,
  tahun INT NOT NULL,
  komoditas VARCHAR(100) NOT NULL,
  kecamatan VARCHAR(100) NOT NULL,
  tanam_ha NUMERIC(12, 4) DEFAULT 0,
  panen_ha NUMERIC(12, 4) DEFAULT 0,
  produksi_ton NUMERIC(12, 4) DEFAULT 0,
  produktivitas_ku_ha NUMERIC(12, 4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Buat Index untuk Performa Query Cepat
CREATE INDEX IF NOT EXISTS idx_produksi_pangan_tahun ON produksi_pangan (tahun);
CREATE INDEX IF NOT EXISTS idx_produksi_pangan_komoditas ON produksi_pangan (komoditas);
CREATE INDEX IF NOT EXISTS idx_produksi_pangan_kecamatan ON produksi_pangan (kecamatan);
CREATE INDEX IF NOT EXISTS idx_produksi_pangan_lookup ON produksi_pangan (tahun, komoditas, kecamatan);

-- 3. Aktifkan Row Level Security (RLS)
ALTER TABLE produksi_pangan ENABLE ROW LEVEL SECURITY;

-- 4. Kebijakan Keamanan (Policies)
DROP POLICY IF EXISTS "Public read produksi_pangan" ON produksi_pangan;
CREATE POLICY "Public read produksi_pangan" ON produksi_pangan
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert produksi_pangan" ON produksi_pangan;
CREATE POLICY "Public insert produksi_pangan" ON produksi_pangan
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update produksi_pangan" ON produksi_pangan;
CREATE POLICY "Public update produksi_pangan" ON produksi_pangan
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public delete produksi_pangan" ON produksi_pangan;
CREATE POLICY "Public delete produksi_pangan" ON produksi_pangan
  FOR DELETE USING (true);

-- 5. Bersihkan data lama jika skrip dijalankan ulang (agar idempoten dan tidak menduplikasi data)
TRUNCATE TABLE produksi_pangan RESTART IDENTITY;

-- 6. Masukkan Data Realisasi Produksi Pangan (2014-2025)
`;

const chunkSize = 100;
for (let i = 0; i < data.length; i += chunkSize) {
  const chunk = data.slice(i, i + chunkSize);
  sql += `INSERT INTO produksi_pangan (tahun, komoditas, kecamatan, tanam_ha, panen_ha, produksi_ton, produktivitas_ku_ha) VALUES\n`;
  const valueRows = chunk.map(d => {
    const com = String(d.komoditas).replace(/'/g, "''");
    const kec = String(d.kecamatan).replace(/'/g, "''");
    const tanam = Number(d.tanam_ha) || 0;
    const panen = Number(d.panen_ha) || 0;
    const prod = Number(d.produksi_ton) || 0;
    const produktivitas = Number(d.produktivitas_ku_ha) || 0;
    return `  (${d.tahun}, '${com}', '${kec}', ${tanam}, ${panen}, ${prod}, ${produktivitas})`;
  });
  sql += valueRows.join(',\n') + ';\n\n';
}

const outputPath = path.join(__dirname, '..', 'supabase_produksi_pangan.sql');
fs.writeFileSync(outputPath, sql, 'utf8');
console.log('Successfully generated:', outputPath);
console.log('Total records written:', data.length);
