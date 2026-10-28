-- ============================================================
-- KULÜP BİRİMİ — TAHSİLAT TAKİP VE İŞLETME DEFTERİ
-- Okul ve okul aile birliğinin yanına üçüncü birim: birim = 'kulup'.
--   · Kulüp tahsilat takibi aidat dışı tahsilatlar içindir (kırtasiye, gezi, etkinlik, forma).
--     Aidat yalnızca Ödeme Takibi'nde girilir.
--   · Kulüp işletme defteri; Hesap Hareketleri (aidat gelirleri, dağıtım giderleri) ile
--     kulüp tahsilat takibi ödemelerini kendiliğinden gösterir, elle girilen kayıtları
--     isletme_defteri tablosunda birim = 'kulup' olarak tutar.
-- Tek başına çalışır: migration_okul_aile_birligi.sql çalıştırılmamışsa birim sütunlarını da ekler
-- (mevcut kayıtlar 'okul' birimine düşer). Birden fazla kez çalıştırmak güvenlidir.
-- Supabase SQL Editor'da çalıştırın (migration_tahsilat_takip.sql ve migration_isletme_defteri.sql sonrası).
-- ============================================================

-- 1) Birim sütunları (yoksa)
ALTER TABLE tahsilat_kategorileri ADD COLUMN IF NOT EXISTS birim TEXT NOT NULL DEFAULT 'okul';
ALTER TABLE isletme_defteri       ADD COLUMN IF NOT EXISTS birim TEXT NOT NULL DEFAULT 'okul';
ALTER TABLE isletme_devir         ADD COLUMN IF NOT EXISTS birim TEXT NOT NULL DEFAULT 'okul';

-- 2) İzin verilen birimler: okul, oab, kulup
ALTER TABLE tahsilat_kategorileri DROP CONSTRAINT IF EXISTS tahsilat_kategorileri_birim_check;
ALTER TABLE tahsilat_kategorileri ADD CONSTRAINT tahsilat_kategorileri_birim_check CHECK (birim IN ('okul', 'oab', 'kulup'));

ALTER TABLE isletme_defteri DROP CONSTRAINT IF EXISTS isletme_defteri_birim_check;
ALTER TABLE isletme_defteri ADD CONSTRAINT isletme_defteri_birim_check CHECK (birim IN ('okul', 'oab', 'kulup'));

ALTER TABLE isletme_devir DROP CONSTRAINT IF EXISTS isletme_devir_birim_check;
ALTER TABLE isletme_devir ADD CONSTRAINT isletme_devir_birim_check CHECK (birim IN ('okul', 'oab', 'kulup'));

-- 3) Devir tekilliği her birim için ayrı: (yil, okul_id) → (yil, okul_id, birim)
ALTER TABLE isletme_devir DROP CONSTRAINT IF EXISTS isletme_devir_yil_okul_id_key;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'isletme_devir_yil_okul_birim_key') THEN
    ALTER TABLE isletme_devir ADD CONSTRAINT isletme_devir_yil_okul_birim_key UNIQUE (yil, okul_id, birim);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tahsilat_kategorileri_birim ON tahsilat_kategorileri (okul_id, birim);
CREATE INDEX IF NOT EXISTS idx_isletme_defteri_birim      ON isletme_defteri (okul_id, birim, yil);

-- 4) OAB PDF başlığındaki birlik adı (OAB migration'ı çalıştırılmamışsa)
ALTER TABLE ayarlar ADD COLUMN IF NOT EXISTS oab_adi TEXT;

NOTIFY pgrst, 'reload schema';

SELECT 'Kulüp birimi eklendi' AS mesaj;
