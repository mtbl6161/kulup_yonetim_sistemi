-- Personel tablosuna meslek_kodu sütunu ekleme
ALTER TABLE personel ADD COLUMN IF NOT EXISTS meslek_kodu TEXT;

-- Yorum ekle
COMMENT ON COLUMN personel.meslek_kodu IS 'SGK Meslek Kodu';
