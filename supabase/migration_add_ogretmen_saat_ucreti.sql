-- migration_add_ogretmen_saat_ucreti.sql
-- Ayarlar > Mali Parametreler > "Öğretmen Manuel Saat Ücreti" alanı için sütun.
-- Boş/0 ise bordroda öğretmen havuzu saatlere bölünür (dinamik), doluysa bu ücret kullanılır.
ALTER TABLE ayarlar ADD COLUMN IF NOT EXISTS ogretmen_saat_ucreti NUMERIC(10,2);
COMMENT ON COLUMN ayarlar.ogretmen_saat_ucreti IS 'Bordroda öğretmen için manuel saat ücreti (boşsa havuz paylaşımı)';

-- Eski "Manuel Saat Ücreti" (ogrenci_saat_ucreti) artık saat_ucreti ile eş tutuluyor
UPDATE ayarlar SET ogrenci_saat_ucreti = saat_ucreti WHERE saat_ucreti IS NOT NULL;

NOTIFY pgrst, 'reload schema';
