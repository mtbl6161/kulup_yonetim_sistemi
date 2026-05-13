-- Personel tablosuna emeklilik durumunu takip etmek için sütun eklenmesi
ALTER TABLE personel ADD COLUMN IF NOT EXISTS is_retired BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN personel.is_retired IS 'Personelin emekli olup olmadığı (SGK prim oranını etkiler)';
