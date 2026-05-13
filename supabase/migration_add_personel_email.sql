-- Personel tablosuna email kolonu ekleme
ALTER TABLE personel ADD COLUMN IF NOT EXISTS email TEXT;

-- RLS politikalarını güncellemeye gerek yok çünkü mevcut politikalar "true" dönüyor, 
-- ancak ileride spesifik kurallar gelirse buraya eklenebilir.
