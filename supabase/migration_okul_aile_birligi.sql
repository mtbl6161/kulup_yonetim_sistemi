-- ============================================================
-- OKUL AİLE BİRLİĞİ (OAB)
-- Tahsilat takibi ve işletme hesabı defteri, okuldan bağımsız ikinci bir "birim" olarak tutulur.
--   birim = 'okul' → mevcut okul kayıtları (varsayılan, eski veriler buraya düşer)
--   birim = 'oab'  → okul aile birliği kayıtları
-- Kategoriye bağlı tablolar (tahsilat_kayitlari, tahsilat_kategori_ogrenci, tahsilat_taksit_planlari)
-- birimini kategoriden alır; ayrı sütun gerekmez.
-- Supabase SQL Editor'da çalıştırın (migration_tahsilat_takip.sql ve migration_isletme_defteri.sql sonrası).
-- ============================================================

-- 1) Tahsilat kategorileri
ALTER TABLE tahsilat_kategorileri
  ADD COLUMN IF NOT EXISTS birim TEXT NOT NULL DEFAULT 'okul';

-- 2) İşletme defteri hareketleri
ALTER TABLE isletme_defteri
  ADD COLUMN IF NOT EXISTS birim TEXT NOT NULL DEFAULT 'okul';

-- 3) Yıl devri: her birimin kendi devreden tutarı olur
ALTER TABLE isletme_devir
  ADD COLUMN IF NOT EXISTS birim TEXT NOT NULL DEFAULT 'okul';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tahsilat_kategorileri_birim_check') THEN
    ALTER TABLE tahsilat_kategorileri ADD CONSTRAINT tahsilat_kategorileri_birim_check CHECK (birim IN ('okul', 'oab'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'isletme_defteri_birim_check') THEN
    ALTER TABLE isletme_defteri ADD CONSTRAINT isletme_defteri_birim_check CHECK (birim IN ('okul', 'oab'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'isletme_devir_birim_check') THEN
    ALTER TABLE isletme_devir ADD CONSTRAINT isletme_devir_birim_check CHECK (birim IN ('okul', 'oab'));
  END IF;
END $$;

-- Devir tekilliği (yil, okul_id) → (yil, okul_id, birim)
ALTER TABLE isletme_devir DROP CONSTRAINT IF EXISTS isletme_devir_yil_okul_id_key;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'isletme_devir_yil_okul_birim_key') THEN
    ALTER TABLE isletme_devir ADD CONSTRAINT isletme_devir_yil_okul_birim_key UNIQUE (yil, okul_id, birim);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tahsilat_kategorileri_birim ON tahsilat_kategorileri (okul_id, birim);
CREATE INDEX IF NOT EXISTS idx_isletme_defteri_birim      ON isletme_defteri (okul_id, birim, yil);

-- 4) PDF başlıklarında kullanılacak birlik adı (boşsa "<okul adı> Okul Aile Birliği")
ALTER TABLE ayarlar ADD COLUMN IF NOT EXISTS oab_adi TEXT;

NOTIFY pgrst, 'reload schema';

SELECT 'Okul Aile Birliği birimi eklendi' AS mesaj;
