-- Öğrenciler tablosuna bireysel günlük saat kısıtı alanı ekliyoruz
-- Bu alan boş ise genel ayarlar (örn. 6 saat) kullanılır, dolu ise öğrenciye özel hesaplama yapılır.

ALTER TABLE ogrenciler 
  ADD COLUMN IF NOT EXISTS gunluk_saat NUMERIC(4,1);

COMMENT ON COLUMN ogrenciler.gunluk_saat IS 'Öğrenciye özel günlük ders saati kısıtı (Boş ise genel ayarlar kullanılır)';

-- Şema önbelleğini yenilemek için
NOTIFY pgrst, 'reload schema';
