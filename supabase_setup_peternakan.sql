-- ==============================================================================
-- SKRIP SETUP & REPARASI LENGKAP TABEL PETERNAKAN (SUPABASE)
-- Jalankan skrip ini di Supabase Dashboard → SQL Editor Anda
-- ==============================================================================

-- 1. Buat Tabel peternakan Jika Belum Ada
CREATE TABLE IF NOT EXISTS peternakan (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  pemilik TEXT,
  kecamatan TEXT,
  kelurahan TEXT,
  sapi INT DEFAULT 0,
  kambing INT DEFAULT 0,
  ayam INT DEFAULT 0,
  itik INT DEFAULT 0,
  catatan TEXT,
  lat DOUBLE PRECISION DEFAULT 0,
  lng DOUBLE PRECISION DEFAULT 0,
  user_id UUID
);

-- 2. Pastikan Semua Kolom yang Dibutuhkan Terbuat di Database
ALTER TABLE peternakan ADD COLUMN IF NOT EXISTS sapi INT DEFAULT 0;
ALTER TABLE peternakan ADD COLUMN IF NOT EXISTS kambing INT DEFAULT 0;
ALTER TABLE peternakan ADD COLUMN IF NOT EXISTS ayam INT DEFAULT 0;
ALTER TABLE peternakan ADD COLUMN IF NOT EXISTS itik INT DEFAULT 0;
ALTER TABLE peternakan ADD COLUMN IF NOT EXISTS catatan TEXT;
ALTER TABLE peternakan ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION DEFAULT 0;
ALTER TABLE peternakan ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION DEFAULT 0;
ALTER TABLE peternakan ADD COLUMN IF NOT EXISTS user_id UUID;

-- 3. Aktifkan Row Level Security (RLS)
ALTER TABLE peternakan ENABLE ROW LEVEL SECURITY;

-- 4. Policy SELECT (Semua Pengguna Bisa Membaca Data)
DROP POLICY IF EXISTS "Public read peternakan" ON peternakan;
CREATE POLICY "Public read peternakan" ON peternakan
  FOR SELECT USING (true);

-- 5. Policy INSERT (Pengguna Terautentikasi / Public Bisa Menambah Data)
DROP POLICY IF EXISTS "Auth insert peternakan" ON peternakan;
CREATE POLICY "Auth insert peternakan" ON peternakan
  FOR INSERT WITH CHECK (true);

-- 6. Policy UPDATE (Pengguna Bisa Merubah Data)
DROP POLICY IF EXISTS "Owner update peternakan" ON peternakan;
CREATE POLICY "Owner update peternakan" ON peternakan
  FOR UPDATE USING (true);

-- 7. Policy DELETE (Pengguna Bisa Menghapus Data)
DROP POLICY IF EXISTS "Owner delete peternakan" ON peternakan;
CREATE POLICY "Owner delete peternakan" ON peternakan
  FOR DELETE USING (true);
