-- ============================================================
-- TAHAKKUk TABLOSU UNIQUE CONSTRAINT DÜZELTMESİ
-- 
-- Sorun: tahakkuk tablosunun UNIQUE(ay, yil) kısıtlaması
-- çok kiracılı (multi-tenant) mimaride sorun yaratıyor.
-- Farklı okullar aynı ay/yıl için kayıt ekleyemiyor.
-- Üstelik okul_id'siz upsert yapılınca başka okulun
-- verisini sıfırlıyor veya RLS hatası veriyor.
--
-- Çözüm:
--   1. Eski (ay, yil) unique constraint'i kaldır
--   2. (ay, yil, okul_id) üçlü unique ekle
--   3. tahakkuk tablosuna okul_id kolonu ekle (yoksa)
-- ============================================================

-- 1. okul_id kolonunu ekle (zaten varsa hata vermesin)
ALTER TABLE tahakkuk ADD COLUMN IF NOT EXISTS okul_id INTEGER REFERENCES okullar(id) ON DELETE CASCADE;

-- 2. Eski unique constraint'i düşür
ALTER TABLE tahakkuk DROP CONSTRAINT IF EXISTS tahakkuk_ay_yil_key;
ALTER TABLE tahakkuk DROP CONSTRAINT IF EXISTS tahakkuk_ay_yil_unique;

-- 3. Yeni üçlü unique constraint ekle
-- Önce çakışan kayıtları temizle (aynı ay+yil+okul_id varsa)
DELETE FROM tahakkuk t1
WHERE okul_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM tahakkuk t2
    WHERE t2.ay = t1.ay AND t2.yil = t1.yil AND t2.okul_id = t1.okul_id AND t2.id > t1.id
  );

-- Yeni unique index ekle
ALTER TABLE tahakkuk ADD CONSTRAINT tahakkuk_ay_yil_okul_id_key UNIQUE (ay, yil, okul_id);

-- 4. Mevcut kayıtların okul_id'sini RLS üzerinden güncelle (opsiyonel, sadece tek okul varsa çalışır)
-- Bu adımı atlayabilirsiniz, yeni kayıtlar zaten doğru okul_id ile gelecek.

SELECT 'Tahakkuk tablosu çok kiracılı mimariye hazırlandı ✅' AS mesaj;
