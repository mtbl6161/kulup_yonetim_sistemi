-- ============================================================
-- MEB Kulüp Yönetim Sistemi — Ders Programı Fix
-- ders_programi tablosuna eksik kolonları ekler
-- ============================================================

ALTER TABLE ders_programi ADD COLUMN IF NOT EXISTS ders_no INTEGER NOT NULL DEFAULT 1;
ALTER TABLE ders_programi ADD COLUMN IF NOT EXISTS ay INTEGER;
ALTER TABLE ders_programi ADD COLUMN IF NOT EXISTS yil INTEGER;

-- RLS politikası zaten mevcut ancak emin olalım
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='ders_programi' AND policyname='allow_all_ders_programi') THEN
    ALTER TABLE ders_programi ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "allow_all_ders_programi" ON ders_programi FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
