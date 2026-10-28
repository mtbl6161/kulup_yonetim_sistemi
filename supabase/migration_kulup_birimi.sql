-- ============================================================
-- KULÜP BİRİMİ — TAHSİLAT TAKİP VE İŞLETME DEFTERİ
-- Okul ve okul aile birliğinin yanına üçüncü birim: birim = 'kulup'.
--   · Kulüp tahsilat takibi aidat dışı tahsilatlar içindir (kırtasiye, gezi, etkinlik, forma).
--     Aidat yalnızca Ödeme Takibi'nde girilir.
--   · Kulüp işletme defteri; Hesap Hareketleri (aidat gelirleri, dağıtım giderleri) ile
--     kulüp tahsilat takibi ödemelerini kendiliğinden gösterir, elle girilen kayıtları
--     isletme_defteri tablosunda birim = 'kulup' olarak tutar.
-- Supabase SQL Editor'da çalıştırın (migration_okul_aile_birligi.sql sonrası).
-- ============================================================

ALTER TABLE tahsilat_kategorileri DROP CONSTRAINT IF EXISTS tahsilat_kategorileri_birim_check;
ALTER TABLE tahsilat_kategorileri ADD CONSTRAINT tahsilat_kategorileri_birim_check CHECK (birim IN ('okul', 'oab', 'kulup'));

ALTER TABLE isletme_defteri DROP CONSTRAINT IF EXISTS isletme_defteri_birim_check;
ALTER TABLE isletme_defteri ADD CONSTRAINT isletme_defteri_birim_check CHECK (birim IN ('okul', 'oab', 'kulup'));

ALTER TABLE isletme_devir DROP CONSTRAINT IF EXISTS isletme_devir_birim_check;
ALTER TABLE isletme_devir ADD CONSTRAINT isletme_devir_birim_check CHECK (birim IN ('okul', 'oab', 'kulup'));

NOTIFY pgrst, 'reload schema';

SELECT 'Kulüp birimi eklendi' AS mesaj;
