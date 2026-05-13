-- profiller tablosuna ad/soyad kolonları ekle
ALTER TABLE profiller ADD COLUMN IF NOT EXISTS ad TEXT;
ALTER TABLE profiller ADD COLUMN IF NOT EXISTS soyad TEXT;
