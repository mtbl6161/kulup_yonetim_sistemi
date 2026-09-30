-- migration_personel_istisna_tutari.sql
-- Personel kartında "Vergi İstisnası: Evet" seçildiğinde istisnanın türü:
--   'tam'   → asgari ücret GV/DV istisnasının tamamı uygulanır (eski davranış)
--   'tutar' → yalnızca aşağıda girilen sabit tutarlar düşülür (örn. 400 TL)
ALTER TABLE personel ADD COLUMN IF NOT EXISTS vergi_istisna_tipi TEXT DEFAULT 'tam';
ALTER TABLE personel ADD COLUMN IF NOT EXISTS istisna_gv_tutari NUMERIC(12,2) DEFAULT 0;
ALTER TABLE personel ADD COLUMN IF NOT EXISTS istisna_dv_tutari NUMERIC(12,2) DEFAULT 0;
COMMENT ON COLUMN personel.vergi_istisna_tipi IS 'tam | tutar — vergi istisnası tam mı, belirli tutar mı';
COMMENT ON COLUMN personel.istisna_gv_tutari IS 'Tutar tipinde aylık uygulanacak gelir vergisi istisnası (TL)';
COMMENT ON COLUMN personel.istisna_dv_tutari IS 'Tutar tipinde aylık uygulanacak damga vergisi istisnası (TL)';

NOTIFY pgrst, 'reload schema';
