-- idx_sinif_defteri_sync kısıtlamasını (gun, ay, yil, kulup_adi, ders_no, okul_id) üzerinde yeniden tanımla

-- 1. Mevcut kısıtlamayı kaldır (isim ya da index olabilir)
DO $$ BEGIN
  DROP INDEX IF EXISTS idx_sinif_defteri_sync;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE sinif_defteri DROP CONSTRAINT IF EXISTS idx_sinif_defteri_sync;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 2. Bu sütunlar üzerinde duplicate kayıtları temizle — en son eklenen kalır
DELETE FROM sinif_defteri a
USING sinif_defteri b
WHERE a.id < b.id
  AND a.gun = b.gun
  AND a.ay = b.ay
  AND a.yil = b.yil
  AND a.kulup_adi = b.kulup_adi
  AND a.ders_no = b.ders_no
  AND a.okul_id IS NOT DISTINCT FROM b.okul_id;

-- 3. Yeni kısıtlamayı oluştur
CREATE UNIQUE INDEX idx_sinif_defteri_sync
  ON sinif_defteri (gun, ay, yil, kulup_adi, ders_no, okul_id);
