-- ============================================================
-- PROFILLER ve OKULLAR TABLOLARI İÇİN RLS POLİTİKALARI
-- Supabase SQL Editor'da çalıştırın.
-- Önce migration_multiuser.sql uygulanmış olmalıdır.
-- ============================================================

-- ============================================================
-- 1. profiller tablosu
-- Her kullanıcı yalnızca kendi satırını görmeli ve güncelleyebilmeli.
-- get_my_okul_id() fonksiyonu SECURITY DEFINER olduğundan RLS'i atlar,
-- yani bu politika var olsa bile fonksiyon düzgün çalışmaya devam eder.
-- ============================================================
ALTER TABLE profiller ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profil_kendi_goruntule" ON profiller;
DROP POLICY IF EXISTS "profil_kendi_guncelle"  ON profiller;

-- SELECT: Yalnızca kendi profilini görebilir
CREATE POLICY "profil_kendi_goruntule"
  ON profiller FOR SELECT
  USING (id = auth.uid());

-- UPDATE: Yalnızca kendi profilini güncelleyebilir
CREATE POLICY "profil_kendi_guncelle"
  ON profiller FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- INSERT: Yeni profil yalnızca /api/kayit üzerinden service_role ile eklenir.
-- Normal kullanıcıların INSERT yapmasına izin verilmez (service_role RLS'i atlar).

-- ============================================================
-- 2. okullar tablosu
-- Her kullanıcı yalnızca kendi okulunun bilgilerini okuyabilmeli.
-- Okul güncellemeleri yalnızca /api/admin/kullanici üzerinden
-- service_role key ile yapıldığından burada UPDATE politikası gerekmez.
-- ============================================================
ALTER TABLE okullar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "okul_kendi_goruntule" ON okullar;

-- SELECT: Yalnızca kendi okulunu görebilir
CREATE POLICY "okul_kendi_goruntule"
  ON okullar FOR SELECT
  USING (id = get_my_okul_id());

-- ============================================================
-- 3. Doğrulama
-- Aşağıdaki sorgular her tablo için politikaları listeler.
-- ============================================================
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('profiller', 'okullar')
ORDER BY tablename, policyname;
