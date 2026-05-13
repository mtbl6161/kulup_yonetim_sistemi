-- ============================================================
-- T.C. KİMLİK NO KISITLAMASI DÜZELTME (MULTI-TENANT)
-- Supabase SQL Editor'da çalıştırın.
-- ============================================================

-- 1. Personel Tablosu İçin
-- Eski kısıtlamayı kaldır (farklı isimlerde olabilir, en yaygın olanları deneyelim)
ALTER TABLE personel DROP CONSTRAINT IF EXISTS unique_tc;
ALTER TABLE personel DROP CONSTRAINT IF EXISTS personel_tc_key;

-- Yeni, okul bazlı benzersizlik kısıtlamasını ekle
-- Aynı TC farklı okullarda olabilir, ancak aynı okulda mükerrer olamaz.
ALTER TABLE personel ADD CONSTRAINT personel_tc_okul_unique UNIQUE (tc, okul_id);


-- 2. Öğrenciler Tablosu İçin
-- Eski kısıtlamayı kaldır
ALTER TABLE ogrenciler DROP CONSTRAINT IF EXISTS unique_tc;
ALTER TABLE ogrenciler DROP CONSTRAINT IF EXISTS ogrenciler_tc_key;

-- Yeni, okul bazlı benzersizlik kısıtlamasını ekle
ALTER TABLE ogrenciler ADD CONSTRAINT ogrenciler_tc_okul_unique UNIQUE (tc, okul_id);


-- 3. Doğrulama
SELECT 'T.C. benzersizlik kısıtlamaları okul bazlı (multi-tenant) olarak güncellendi' AS mesaj;
