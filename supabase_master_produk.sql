-- ==============================================================================
-- SKRIP SQL: MASTER PRODUK KWT (DKPP KOTA CILEGON)
-- ==============================================================================
-- Jalankan skrip ini di SQL Editor Supabase Dashboard Anda.

-- 1. Buat Tabel master_produk_kwt
CREATE TABLE IF NOT EXISTS master_produk_kwt (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  price_unit TEXT NOT NULL DEFAULT 'Rp/kg',
  urutan INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Aktifkan Row Level Security (RLS)
ALTER TABLE master_produk_kwt ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Semua Pengguna & Tamu Bisa Membaca (Public Read)
DROP POLICY IF EXISTS "Public Read Master Produk" ON master_produk_kwt;
CREATE POLICY "Public Read Master Produk" ON master_produk_kwt
  FOR SELECT USING (true);

-- 4. Policy: Pengguna Login Bisa Mengelola (Super Admin dan Admin)
DROP POLICY IF EXISTS "Auth Manage Master Produk" ON master_produk_kwt;
CREATE POLICY "Auth Manage Master Produk" ON master_produk_kwt
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 5. Masukkan Data Awal (Default Seed)
INSERT INTO master_produk_kwt (key, label, unit, price_unit, urutan) VALUES
  ('cabai', 'Cabai', 'kg', 'Rp/kg', 1),
  ('tomat', 'Tomat', 'kg', 'Rp/kg', 2),
  ('sawi', 'Sawi', 'kg', 'Rp/kg', 3),
  ('pakcoy', 'Pakcoy', 'kg', 'Rp/kg', 4),
  ('buah_buahan', 'Buah-buahan', 'kg', 'Rp/kg', 5),
  ('sayuran', 'Sayuran', 'kg', 'Rp/kg', 6),
  ('minuman_herbal', 'Minuman herbal', 'botol', 'Rp/botol', 7),
  ('kue', 'Kue', 'kg', 'Rp/kg', 8),
  ('keripik', 'Keripik', 'kg', 'Rp/kg', 9),
  ('lainnya', 'Lainnya', 'kg', 'Rp/kg', 10)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  unit = EXCLUDED.unit,
  price_unit = EXCLUDED.price_unit,
  urutan = EXCLUDED.urutan;
