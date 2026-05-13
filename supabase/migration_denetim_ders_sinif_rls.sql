-- ============================================================
-- DENETİM: DERS PROGRAMI ve SINIF DEFTERİ OKUMA YETKİLERİ
-- Supabase SQL Editor'da çalıştırın.
-- ============================================================

-- 1. ders_programi → denetim okuma
DROP POLICY IF EXISTS "denetim_ders_programi_oku" ON ders_programi;
CREATE POLICY "denetim_ders_programi_oku"
  ON ders_programi FOR SELECT
  USING (
    okul_id = get_my_okul_id()
    OR
    (
      get_my_il_id() IS NOT NULL
      AND okul_id IN (
        SELECT id FROM okullar WHERE il_id = get_my_il_id()
      )
    )
  );

-- 2. sinif_defteri → denetim okuma
DROP POLICY IF EXISTS "denetim_sinif_defteri_oku" ON sinif_defteri;
CREATE POLICY "denetim_sinif_defteri_oku"
  ON sinif_defteri FOR SELECT
  USING (
    okul_id = get_my_okul_id()
    OR
    (
      get_my_il_id() IS NOT NULL
      AND okul_id IN (
        SELECT id FROM okullar WHERE il_id = get_my_il_id()
      )
    )
  );

SELECT 'Denetim ders/sınıf yetkileri tanımlandı' AS durum;
