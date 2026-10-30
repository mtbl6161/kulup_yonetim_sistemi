-- ============================================================
-- Tekrar çalıştırmak güvenlidir.
-- BORDRO İSTİSNA KAYDI
-- Bordro kaydedilirken personel kartındaki asgari ücret istisnası ayarı (açık/kapalı, tam/tutar, GV/DV tutarı)
-- bordroyla birlikte saklanır. Böylece kart sonradan (ör. sonraki ay için) değiştirilse de hesap kontrolü
-- geçmiş ayın bordrosunu o ayın ayarına göre değerlendirir.
-- Supabase SQL Editor'da bir kez çalıştırın.
-- ============================================================
ALTER TABLE bordro ADD COLUMN IF NOT EXISTS istisna_karti JSONB;
COMMENT ON COLUMN bordro.istisna_karti IS 'Bordro anındaki istisna ayarı: { vergi_istisnasi, tip: tam|tutar, gv, dv }';

NOTIFY pgrst, 'reload schema';
