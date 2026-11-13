-- ============================================================
-- PROFILLER: KOLON DÜZEYİNDE YAZMA YETKİSİ (yetki yükseltme açığı)
-- Supabase SQL Editor'da çalıştırın. Tekrar çalıştırılabilir.
-- Önce migration_rls_profiller_okullar.sql uygulanmış olmalıdır.
--
-- SORUN
--   "profil_kendi_guncelle" politikası (USING/WITH CHECK id = auth.uid())
--   yalnızca HANGİ SATIRIN güncellenebileceğini sınırlar, HANGİ KOLONUN
--   değil. Supabase varsayılanı authenticated rolüne tablonun tamamında
--   UPDATE verdiği için, giriş yapmış herkes tarayıcı konsolundan
--     supabase.from('profiller').update({ okul_id: X, rol: 'super_admin' })
--   çağırıp başka okulun verisine (get_my_okul_id) veya il denetimine
--   (get_my_il_id) ya da süper yönetici yetkisine erişebilir.
--
-- ÇÖZÜM: Tablo düzeyindeki yazma yetkisini kaldır, yalnızca uygulamanın
--   tarayıcıdan yazdığı kolonlara UPDATE ver (izin listesi).
--
--   Tarayıcıdan profiller'e yazan yerler (Kasım 2026 taraması):
--     lib/AuthContext.tsx      → son_giris
--     app/denetim/page.tsx     → ad, soyad   (denetçi "Bilgilerim" formu)
--   Diğer bütün profiller yazmaları (okul_id, rol, il_id, insert, delete)
--   /api/admin/*, /api/kayit ve /api/denetci/* rotalarında
--   SUPABASE_SERVICE_ROLE_KEY ile yapılır; service_role bu kısıttan
--   etkilenmez. SECURITY DEFINER fonksiyonlar da tablo sahibi olarak
--   çalıştığı için etkilenmez.
--
-- NEDEN TETİKLEYİCİ DEĞİL?
--   BEFORE UPDATE tetikleyicisi (okul_id/rol/il_id değişirse ve çağıran
--   service_role değilse hata ver) bir "yasak listesi"dir: ilce_id gibi
--   unutulan ya da ileride eklenecek yetki kolonları açık kalır, çağıranı
--   JWT ayarından okumak kırılgandır. Kolon yetkisi ise "izin listesi"dir:
--   yeni kolonlar kendiliğinden yazılamaz, kontrolü Postgres yapar
--   (PostgREST 42501 "permission denied for table profiller" döner).
--   Bedeli: kullanıcıların düzenleyeceği yeni bir kolon eklenirse aşağıdaki
--   GRANT listesine eklenmelidir.
-- ============================================================

-- Uygulamanın yazdığı kolonlar her ortamda bulunsun (GRANT, olmayan kolonda hata verir).
ALTER TABLE profiller ADD COLUMN IF NOT EXISTS ad TEXT;
ALTER TABLE profiller ADD COLUMN IF NOT EXISTS soyad TEXT;
ALTER TABLE profiller ADD COLUMN IF NOT EXISTS son_giris TIMESTAMPTZ;

-- 1. Tablo düzeyindeki yazma yetkilerini kaldır.
--    INSERT/DELETE zaten RLS ile kapalı (politika yok); TRUNCATE RLS'e tabi
--    olmadığı için o da kaldırılır. SELECT yetkisine dokunulmaz.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.profiller FROM anon, authenticated;

-- Önceden elle verilmiş olabilecek kolon düzeyindeki yazma yetkilerini de
-- temizle (izin listesi dışındaki bütün mevcut kolonlar; olmayan kolon hata vermez).
DO $$
DECLARE k record;
BEGIN
  FOR k IN
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiller'
      AND column_name NOT IN ('ad', 'soyad', 'son_giris')
  LOOP
    EXECUTE format('REVOKE INSERT (%1$I), UPDATE (%1$I) ON public.profiller FROM anon, authenticated', k.column_name);
  END LOOP;
END $$;

-- 2. Yalnızca uygulamanın tarayıcıdan yazdığı kolonlar.
--    Bu listeyi değiştirirseniz yukarıdaki NOT IN (...) listesini de aynı tutun.
--    Satır kısıtı (yalnızca kendi profilin) "profil_kendi_guncelle" politikasıyla sürer.
GRANT UPDATE (ad, soyad, son_giris) ON public.profiller TO authenticated;

-- 3. Hızlı kontrol: authenticated yalnızca ad, soyad, son_giris'i
--    güncelleyebilmeli (yazilabilir = true). Ayrıntılı doğrulama ve JWT testi:
--    dogrula_profiller_kolon_yetkisi.sql
SELECT c.column_name,
       has_column_privilege('authenticated', 'public.profiller', c.column_name, 'UPDATE') AS yazilabilir
FROM information_schema.columns c
WHERE c.table_schema = 'public' AND c.table_name = 'profiller'
ORDER BY yazilabilir DESC, c.column_name;
