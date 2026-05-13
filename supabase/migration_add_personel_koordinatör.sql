-- Personel tablosuna koordinator_id sütunu ekleme
-- Bu sütun yine personel tablosundaki bir id'yi işaret eder.
-- ON DELETE SET NULL: Koordinatör silinirse, ona bağlı personellerin koordinatör alanı temizlenir.

ALTER TABLE personel 
ADD COLUMN IF NOT EXISTS koordinator_id BIGINT REFERENCES personel(id) ON DELETE SET NULL;

-- Performans için index ekleyelim
CREATE INDEX IF NOT EXISTS idx_personel_koordinator_id ON personel(koordinator_id);

-- Mevcut veriler için koordinator_id null olarak kalacaktır.
