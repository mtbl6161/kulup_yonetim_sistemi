-- ============================================================
-- DENETİM YETKİLERİ EK RLS POLİTİKALARI
-- Bu dosyayı Supabase SQL Editor'da çalıştırın.
-- ============================================================

-- 1. Öğrenciler Tablosu SELECT Yetkisi
DROP POLICY IF EXISTS "denetim_ogrenciler_oku" ON ogrenciler;
CREATE POLICY "denetim_ogrenciler_oku"
  ON ogrenciler FOR SELECT
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

-- 2. Tahsilat Tablosu SELECT Yetkisi
DROP POLICY IF EXISTS "denetim_tahsilat_oku" ON tahsilat;
CREATE POLICY "denetim_tahsilat_oku"
  ON tahsilat FOR SELECT
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

-- 3. Audit Log Tablosu SELECT Yetkisi
DROP POLICY IF EXISTS "denetim_audit_log_oku" ON audit_log;
CREATE POLICY "denetim_audit_log_oku"
  ON audit_log FOR SELECT
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

-- 4. Ayarlar Tablosu SELECT Yetkisi (Hesaplamalar için)
DROP POLICY IF EXISTS "denetim_ayarlar_oku" ON ayarlar;
CREATE POLICY "denetim_ayarlar_oku"
  ON ayarlar FOR SELECT
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

-- 5. Sınıflar Tablosu SELECT Yetkisi (Kapasite Analizi için)
DROP POLICY IF EXISTS "denetim_siniflar_oku" ON siniflar;
CREATE POLICY "denetim_siniflar_oku"
  ON siniflar FOR SELECT
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

SELECT 'Denetim ek yetkileri tanımlandı' AS durum;
