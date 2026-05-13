-- ============================================================
-- NULL OKUL_ID DÜZELTMESİ: Tüm tablolardaki NULL okul_id'leri
-- mevcut tek okulun ID'si ile doldur.
-- ============================================================

DO $$
DECLARE
    v_okul_id INTEGER;
BEGIN
    SELECT id INTO v_okul_id FROM okullar ORDER BY id LIMIT 1;
    
    IF v_okul_id IS NULL THEN
        RAISE EXCEPTION 'okullar tablosunda hiç kayıt yok!';
    END IF;
    
    RAISE NOTICE 'Kullanılan okul_id: %', v_okul_id;

    UPDATE tahsilat          SET okul_id = v_okul_id WHERE okul_id IS NULL;
    UPDATE puantaj           SET okul_id = v_okul_id WHERE okul_id IS NULL;
    UPDATE tahakkuk          SET okul_id = v_okul_id WHERE okul_id IS NULL;
    UPDATE bordro            SET okul_id = v_okul_id WHERE okul_id IS NULL;
    UPDATE personel          SET okul_id = v_okul_id WHERE okul_id IS NULL;
    UPDATE ogrenciler        SET okul_id = v_okul_id WHERE okul_id IS NULL;
    UPDATE sinif_defteri     SET okul_id = v_okul_id WHERE okul_id IS NULL;
    UPDATE ders_programi     SET okul_id = v_okul_id WHERE okul_id IS NULL;
    UPDATE giderler          SET okul_id = v_okul_id WHERE okul_id IS NULL;
    UPDATE hesap_hareketleri SET okul_id = v_okul_id WHERE okul_id IS NULL;
    UPDATE yoklama           SET okul_id = v_okul_id WHERE okul_id IS NULL;
    UPDATE ayarlar           SET okul_id = v_okul_id WHERE okul_id IS NULL;
    
    BEGIN
        EXECUTE format('UPDATE siniflar SET okul_id = %s WHERE okul_id IS NULL', v_okul_id);
    EXCEPTION WHEN undefined_table OR undefined_column THEN
        NULL;
    END;

    RAISE NOTICE 'Tamamlandı. Tüm NULL okul_id kayıtları % ile güncellendi.', v_okul_id;
END $$;

-- Doğrulama: NULL kalan kayıt sayısı (hepsi 0 olmalı)
SELECT 
    'tahsilat'          AS tablo, COUNT(*) AS null_kalan FROM tahsilat          WHERE okul_id IS NULL
UNION ALL SELECT 'puantaj',       COUNT(*) FROM puantaj           WHERE okul_id IS NULL
UNION ALL SELECT 'tahakkuk',      COUNT(*) FROM tahakkuk          WHERE okul_id IS NULL
UNION ALL SELECT 'bordro',        COUNT(*) FROM bordro            WHERE okul_id IS NULL
UNION ALL SELECT 'personel',      COUNT(*) FROM personel          WHERE okul_id IS NULL
UNION ALL SELECT 'ogrenciler',    COUNT(*) FROM ogrenciler        WHERE okul_id IS NULL
UNION ALL SELECT 'sinif_defteri', COUNT(*) FROM sinif_defteri     WHERE okul_id IS NULL
UNION ALL SELECT 'ders_programi', COUNT(*) FROM ders_programi     WHERE okul_id IS NULL;
