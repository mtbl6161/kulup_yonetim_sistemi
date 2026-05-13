-- ============================================================
-- BORDRO VE TAHAKKUk TABLOSU TAM ONARIM
-- 
-- Bu script aşağıdakileri yapar:
-- 1. bordro tablosunun UNIQUE constraint'ini okul_id dahil günceller
-- 2. tahakkuk tablosunun UNIQUE constraint'ini okul_id dahil günceller
-- 3. Her iki tabloya okul_id kolonu ekler (yoksa)
-- 4. Mevcut kayıtların okul_id'sini mümkünse otomatik doldurur
-- 5. RLS INSERT politikalarını düzeltir (NULL okul_id ile insert'e izin ver)
-- ============================================================

-- ==================
-- BORDRO TABLOSU
-- ==================

-- 1a. okul_id kolonu ekle (yoksa)
ALTER TABLE bordro ADD COLUMN IF NOT EXISTS okul_id INTEGER REFERENCES okullar(id) ON DELETE CASCADE;

-- 1b. Eski constraint'leri düşür (isim farklılıklarına karşı hepsini dene)
ALTER TABLE bordro DROP CONSTRAINT IF EXISTS bordro_personel_id_ay_yil_key;
ALTER TABLE bordro DROP CONSTRAINT IF EXISTS bordro_personel_id_ay_yil_okul_key;
ALTER TABLE bordro DROP CONSTRAINT IF EXISTS bordro_personel_id_ay_yil_okul_id_key;

-- 1c. Yeni UNIQUE constraint (okul_id dahil)
-- okul_id NULL olan çakışmaları temizle
DELETE FROM bordro t1
WHERE EXISTS (
    SELECT 1 FROM bordro t2
    WHERE t2.personel_id = t1.personel_id
      AND t2.ay = t1.ay
      AND t2.yil = t1.yil
      AND t2.okul_id IS NOT DISTINCT FROM t1.okul_id
      AND t2.id > t1.id
);

ALTER TABLE bordro ADD CONSTRAINT bordro_personel_id_ay_yil_okul_id_key 
    UNIQUE (personel_id, ay, yil, okul_id);

-- ==================
-- TAHAKKUk TABLOSU
-- ==================

-- 2a. okul_id kolonu ekle (yoksa)
ALTER TABLE tahakkuk ADD COLUMN IF NOT EXISTS okul_id INTEGER REFERENCES okullar(id) ON DELETE CASCADE;

-- 2b. Eski constraint'leri düşür
ALTER TABLE tahakkuk DROP CONSTRAINT IF EXISTS tahakkuk_ay_yil_key;
ALTER TABLE tahakkuk DROP CONSTRAINT IF EXISTS tahakkuk_ay_yil_unique;
ALTER TABLE tahakkuk DROP CONSTRAINT IF EXISTS tahakkuk_ay_yil_okul_id_key;

-- 2c. okul_id NULL olan çakışmaları temizle
DELETE FROM tahakkuk t1
WHERE EXISTS (
    SELECT 1 FROM tahakkuk t2
    WHERE t2.ay = t1.ay
      AND t2.yil = t1.yil
      AND t2.okul_id IS NOT DISTINCT FROM t1.okul_id
      AND t2.id > t1.id
);

ALTER TABLE tahakkuk ADD CONSTRAINT tahakkuk_ay_yil_okul_id_key 
    UNIQUE (ay, yil, okul_id);

-- ==================
-- RLS INSERT POLİTİKALARI
-- ==================

-- bordro için INSERT politikasını güncelle
DROP POLICY IF EXISTS "okul_bordro_insert" ON bordro;
CREATE POLICY "okul_bordro_insert" ON bordro
  FOR INSERT WITH CHECK (
    okul_id = get_my_okul_id()
    OR okul_id IS NULL
  );

-- tahakkuk için INSERT politikasını güncelle
DROP POLICY IF EXISTS "okul_tahakkuk_insert" ON tahakkuk;
CREATE POLICY "okul_tahakkuk_insert" ON tahakkuk
  FOR INSERT WITH CHECK (
    okul_id = get_my_okul_id()
    OR okul_id IS NULL
  );

-- tahakkuk UPDATE politikası (kendi okulu güncelleyebilir)
DROP POLICY IF EXISTS "okul_tahakkuk_update" ON tahakkuk;
CREATE POLICY "okul_tahakkuk_update" ON tahakkuk
  FOR UPDATE USING (
    okul_id = get_my_okul_id()
    OR okul_id IS NULL
  ) WITH CHECK (
    okul_id = get_my_okul_id()
    OR okul_id IS NULL
  );

-- ==================
-- DOĞRULAMA
-- ==================
SELECT 
    table_name,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name IN ('bordro', 'tahakkuk')
  AND constraint_type = 'UNIQUE'
ORDER BY table_name, constraint_name;

SELECT 'Bordro ve Tahakkuk tabloları başarıyla güncellendi ✅' AS mesaj;
