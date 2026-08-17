-- ============================================================
-- FIX: RLS DELETE POLICY untuk tabel peternakan
-- Jalankan di Supabase Dashboard → SQL Editor
-- ============================================================

-- Aktifkan RLS jika belum
ALTER TABLE peternakan ENABLE ROW LEVEL SECURITY;

-- Public SELECT (siapa saja bisa baca)
DROP POLICY IF EXISTS "Public read peternakan" ON peternakan;
CREATE POLICY "Public read peternakan" ON peternakan
  FOR SELECT USING (true);

-- Authenticated INSERT
DROP POLICY IF EXISTS "Auth insert peternakan" ON peternakan;
CREATE POLICY "Auth insert peternakan" ON peternakan
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Owner + SuperAdmin UPDATE
DROP POLICY IF EXISTS "Owner update peternakan" ON peternakan;
CREATE POLICY "Owner update peternakan" ON peternakan
  FOR UPDATE USING (
    auth.uid() = user_id
    OR auth.email() = 'ketapangcilegon@gmail.com'
  );

-- Owner + SuperAdmin DELETE  ← INI YANG HILANG!
DROP POLICY IF EXISTS "Owner delete peternakan" ON peternakan;
CREATE POLICY "Owner delete peternakan" ON peternakan
  FOR DELETE USING (
    auth.uid() = user_id
    OR auth.email() = 'ketapangcilegon@gmail.com'
  );
