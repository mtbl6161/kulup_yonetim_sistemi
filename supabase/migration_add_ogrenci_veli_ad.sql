-- migration_add_ogrenci_veli_ad.sql
-- Öğrenci "Veli Adı" alanı (Okul Öğrencileri formu + toplu Excel aktarımı kullanır).
-- Hata: "Could not find the 'veli_ad' column of 'ogrenciler' in the schema cache"
ALTER TABLE ogrenciler ADD COLUMN IF NOT EXISTS veli_ad TEXT;

NOTIFY pgrst, 'reload schema';
