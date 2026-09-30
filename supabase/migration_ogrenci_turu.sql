-- ============================================================
-- ÖĞRENCİ TÜRÜ (Kulüp / Okul) + KATEGORİDE İKİ AYRI ÜCRET
-- Kulüp öğrencisi ile normal okul öğrencisinin farklı ücret
-- ödediği kategoriler (ör. Kırtasiye) için.
-- Supabase SQL Editor'da çalıştırın.
-- ============================================================

-- 1) Öğrenci türü: mevcut tüm öğrenciler 'kulup' kalır
ALTER TABLE ogrenciler
  ADD COLUMN IF NOT EXISTS ogrenci_turu TEXT NOT NULL DEFAULT 'kulup';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ogrenciler_ogrenci_turu_check') THEN
    ALTER TABLE ogrenciler
      ADD CONSTRAINT ogrenciler_ogrenci_turu_check CHECK (ogrenci_turu IN ('kulup', 'okul'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ogrenciler_okul_tur ON ogrenciler (okul_id, ogrenci_turu);

-- Veli adı (Okul Öğrencileri formu ve Excel aktarımı kullanır)
ALTER TABLE ogrenciler ADD COLUMN IF NOT EXISTS veli_ad TEXT;

-- 2) Tahsilat kategorisi: varsayilan_tutar = kulüp öğrencisi ücreti,
--    varsayilan_tutar_okul = okul öğrencisi ücreti
ALTER TABLE tahsilat_kategorileri
  ADD COLUMN IF NOT EXISTS varsayilan_tutar_okul NUMERIC(12,2);

-- Mevcut kategorilerde okul ücreti boşsa kulüp ücretiyle aynı başlasın
UPDATE tahsilat_kategorileri
   SET varsayilan_tutar_okul = varsayilan_tutar
 WHERE varsayilan_tutar_okul IS NULL AND varsayilan_tutar IS NOT NULL;
