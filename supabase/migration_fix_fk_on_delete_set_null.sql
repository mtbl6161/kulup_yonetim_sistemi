-- ============================================================
-- ADIM 1: Mevcut FK kısıtlamalarını ve silme davranışlarını gör
-- Supabase SQL Editor'da önce bunu çalıştırın.
-- confdeltype: a=NO ACTION, r=RESTRICT, c=CASCADE, n=SET NULL
-- ============================================================
SELECT 
    c.conname AS kisitlama_adi,
    c.conrelid::regclass AS tablo,
    c.confrelid::regclass AS referans_tablo,
    CASE c.confdeltype
        WHEN 'a' THEN 'NO ACTION'
        WHEN 'r' THEN 'RESTRICT'
        WHEN 'c' THEN 'CASCADE ⚠️'
        WHEN 'n' THEN 'SET NULL ✅'
        WHEN 'd' THEN 'SET DEFAULT'
    END AS silme_davranisi,
    array_agg(a.attname) AS kolonlar
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE c.confrelid IN (
    SELECT oid FROM pg_class WHERE relname IN ('personel', 'ogrenciler')
) AND c.contype = 'f'
GROUP BY c.conname, c.conrelid, c.confrelid, c.confdeltype
ORDER BY tablo;

-- ============================================================
-- ADIM 2: Yukarıdaki sorgudan gelen GERÇEK isimlerle FK'ları düzelt
-- CASCADE olan tüm kısıtlamaları SET NULL yapıyoruz.
-- "kisitlama_adi" sütunundaki değerleri aşağıya yazın.
-- ============================================================

DO $$
DECLARE
    rec RECORD;
    tablo_adi TEXT;
    kolon_adi TEXT;
    ref_tablo TEXT;
BEGIN
    -- CASCADE olan tüm FK'ları bul ve SET NULL'a çevir
    FOR rec IN
        SELECT 
            c.conname,
            c.conrelid::regclass::text AS tablo,
            c.confrelid::regclass::text AS ref_tablo,
            array_agg(a.attname) AS kolonlar
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        WHERE c.confrelid IN (
            SELECT oid FROM pg_class WHERE relname IN ('personel', 'ogrenciler')
        )
        AND c.contype = 'f'
        AND c.confdeltype = 'c' -- sadece CASCADE olanlar
        GROUP BY c.conname, c.conrelid, c.confrelid
    LOOP
        tablo_adi := rec.tablo;
        kolon_adi := rec.kolonlar[1];
        ref_tablo := rec.ref_tablo;

        RAISE NOTICE 'Düzeltiliyor: % . % -> %', tablo_adi, kolon_adi, ref_tablo;

        -- NOT NULL kısıtlamasını kaldır
        EXECUTE format('ALTER TABLE %s ALTER COLUMN %I DROP NOT NULL', tablo_adi, kolon_adi);

        -- Eski CASCADE FK'yı sil
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', tablo_adi, rec.conname);

        -- SET NULL FK ekle
        EXECUTE format('ALTER TABLE %s ADD FOREIGN KEY (%I) REFERENCES %s(id) ON DELETE SET NULL', 
            tablo_adi, kolon_adi, ref_tablo);

        RAISE NOTICE '✅ % tamamlandı', tablo_adi;
    END LOOP;

    -- NO ACTION veya RESTRICT olanları da SET NULL yap
    FOR rec IN
        SELECT 
            c.conname,
            c.conrelid::regclass::text AS tablo,
            c.confrelid::regclass::text AS ref_tablo,
            array_agg(a.attname) AS kolonlar
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        WHERE c.confrelid IN (
            SELECT oid FROM pg_class WHERE relname IN ('personel', 'ogrenciler')
        )
        AND c.contype = 'f'
        AND c.confdeltype IN ('a', 'r') -- NO ACTION ve RESTRICT
        GROUP BY c.conname, c.conrelid, c.confrelid
    LOOP
        tablo_adi := rec.tablo;
        kolon_adi := rec.kolonlar[1];
        ref_tablo := rec.ref_tablo;

        EXECUTE format('ALTER TABLE %s ALTER COLUMN %I DROP NOT NULL', tablo_adi, kolon_adi);
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', tablo_adi, rec.conname);
        EXECUTE format('ALTER TABLE %s ADD FOREIGN KEY (%I) REFERENCES %s(id) ON DELETE SET NULL',
            tablo_adi, kolon_adi, ref_tablo);

        RAISE NOTICE '✅ % SET NULL yapıldı', tablo_adi;
    END LOOP;
END $$;

-- ADIM 3: Doğrulama — artık hiçbirinde CASCADE kalmamalı
SELECT 
    c.conname AS kisitlama_adi,
    c.conrelid::regclass AS tablo,
    CASE c.confdeltype
        WHEN 'c' THEN 'CASCADE ⚠️ HALA VAR!'
        WHEN 'n' THEN 'SET NULL ✅'
        ELSE 'DİĞER'
    END AS durum
FROM pg_constraint c
WHERE c.confrelid IN (
    SELECT oid FROM pg_class WHERE relname IN ('personel', 'ogrenciler')
) AND c.contype = 'f';
