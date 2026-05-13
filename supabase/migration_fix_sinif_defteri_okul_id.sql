-- ============================================================
-- sinif_defteri okul_id DÜZELTME
-- Supabase SQL Editor'da çalıştırın.
-- ============================================================

-- 1. Mevcut durum kontrolü
SELECT
  CASE WHEN okul_id IS NULL THEN 'okul_id YOK' ELSE okul_id::text END AS durum,
  COUNT(*) AS kayit_sayisi
FROM sinif_defteri
GROUP BY okul_id
ORDER BY okul_id;

-- 2. RLS etkinleştir
ALTER TABLE sinif_defteri ENABLE ROW LEVEL SECURITY;

-- 3. NULL olan okul_id'leri ders_programi tablosundan tamamla
--    (aynı kulup_adi + gun + ay + yil eşleşmesiyle)
UPDATE sinif_defteri sd
SET okul_id = dp.okul_id
FROM ders_programi dp
WHERE sd.okul_id IS NULL
  AND sd.kulup_adi = dp.kulup_adi
  AND sd.gun       = dp.gun
  AND sd.ay        = dp.ay
  AND sd.yil       = dp.yil
  AND dp.okul_id IS NOT NULL;

-- 4. Hâlâ NULL kalan varsa siniflar tablosundan tamamla
UPDATE sinif_defteri sd
SET okul_id = s.okul_id
FROM siniflar s
WHERE sd.okul_id IS NULL
  AND sd.kulup_adi = s.ad
  AND s.okul_id IS NOT NULL;

-- 5. Sonuç
SELECT
  CASE WHEN okul_id IS NULL THEN 'okul_id HÂLÂ NULL' ELSE 'okul_id OK → ' || okul_id::text END AS durum,
  COUNT(*) AS kayit_sayisi
FROM sinif_defteri
GROUP BY okul_id
ORDER BY okul_id;
