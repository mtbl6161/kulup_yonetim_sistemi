-- ============================================================
-- OKUL_ID DÜZELTME: 8 → 9
-- Supabase Dashboard > SQL Editor'da çalıştırın (service_role).
-- Eski kayıtlar okul_id=8 ile kayıtlıydı, gerçek okul_id=9'dur.
-- ============================================================

UPDATE personel          SET okul_id = 9 WHERE okul_id = 8;
UPDATE ogrenciler        SET okul_id = 9 WHERE okul_id = 8;
UPDATE puantaj           SET okul_id = 9 WHERE okul_id = 8;
UPDATE tahsilat          SET okul_id = 9 WHERE okul_id = 8;
UPDATE tahakkuk          SET okul_id = 9 WHERE okul_id = 8;
UPDATE bordro            SET okul_id = 9 WHERE okul_id = 8;
UPDATE giderler          SET okul_id = 9 WHERE okul_id = 8;
UPDATE hesap_hareketleri SET okul_id = 9 WHERE okul_id = 8;
UPDATE yoklama           SET okul_id = 9 WHERE okul_id = 8;
UPDATE ders_programi     SET okul_id = 9 WHERE okul_id = 8;
UPDATE sinif_defteri     SET okul_id = 9 WHERE okul_id = 8;
UPDATE ayarlar           SET okul_id = 9 WHERE okul_id = 8;

DO $$ BEGIN UPDATE siniflar SET okul_id = 9 WHERE okul_id = 8; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN UPDATE tatiller SET okul_id = 9 WHERE okul_id = 8; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Doğrulama: okul_id=8 kalan kayıt yoksa başarılı
SELECT 'personel'          AS tablo, COUNT(*) AS okul8_kalan FROM personel          WHERE okul_id = 8
UNION ALL SELECT 'ogrenciler',        COUNT(*) FROM ogrenciler        WHERE okul_id = 8
UNION ALL SELECT 'puantaj',           COUNT(*) FROM puantaj           WHERE okul_id = 8
UNION ALL SELECT 'tahsilat',          COUNT(*) FROM tahsilat          WHERE okul_id = 8
UNION ALL SELECT 'bordro',            COUNT(*) FROM bordro            WHERE okul_id = 8
UNION ALL SELECT 'ders_programi',     COUNT(*) FROM ders_programi     WHERE okul_id = 8
UNION ALL SELECT 'sinif_defteri',     COUNT(*) FROM sinif_defteri     WHERE okul_id = 8;
