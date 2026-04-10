-- ders_programi tablosuna sinif_id kolonu ekle
ALTER TABLE ders_programi
  ADD COLUMN IF NOT EXISTS sinif_id INTEGER REFERENCES siniflar(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ders_programi_sinif_id ON ders_programi(sinif_id);
