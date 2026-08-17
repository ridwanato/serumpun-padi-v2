-- ==============================================================================
-- SKRIP SQL: MASTER PRODUK PERIKANAN TANGKAP (DKPP KOTA CILEGON)
-- ==============================================================================
-- Jalankan skrip ini di SQL Editor Supabase Dashboard Anda.

CREATE TABLE IF NOT EXISTS master_produk_tangkap (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  price_unit TEXT NOT NULL DEFAULT 'Rp/kg',
  urutan INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE master_produk_tangkap ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Master Tangkap" ON master_produk_tangkap;
CREATE POLICY "Public Read Master Tangkap" ON master_produk_tangkap
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth Manage Master Tangkap" ON master_produk_tangkap;
CREATE POLICY "Auth Manage Master Tangkap" ON master_produk_tangkap
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

INSERT INTO master_produk_tangkap (key, label, unit, price_unit, urutan) VALUES
  ('kuwe', 'Kuwe', 'kg', 'Rp/kg', 1),
  ('beronang', 'Beronang', 'kg', 'Rp/kg', 2),
  ('kerapu', 'Kerapu', 'kg', 'Rp/kg', 3),
  ('cumi', 'Cumi', 'kg', 'Rp/kg', 4),
  ('kembung', 'Kembung', 'kg', 'Rp/kg', 5),
  ('tenggiri', 'Tenggiri', 'kg', 'Rp/kg', 6),
  ('tongkol', 'Tongkol', 'kg', 'Rp/kg', 7),
  ('lainnya', 'Lainnya', 'kg', 'Rp/kg', 8)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  unit = EXCLUDED.unit,
  price_unit = EXCLUDED.price_unit,
  urutan = EXCLUDED.urutan;
