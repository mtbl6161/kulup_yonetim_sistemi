-- Ders programındaki günlük ders saati (satır) sayısını okul bazında ayarlanabilir yapıyoruz.
-- Boş ise varsayılan 6 saat kullanılır. Kullanıcı ders programı ekranından artırıp azaltabilir.

ALTER TABLE ayarlar
  ADD COLUMN IF NOT EXISTS ders_saati_sayisi INTEGER DEFAULT 6;

COMMENT ON COLUMN ayarlar.ders_saati_sayisi IS 'Ders programında gösterilen günlük ders saati (satır) sayısı. Varsayılan 6.';

-- Mevcut kayıtlarda boş kalanları 6 ile dolduralım
UPDATE ayarlar SET ders_saati_sayisi = 6 WHERE ders_saati_sayisi IS NULL;

-- Şema önbelleğini yenile
NOTIFY pgrst, 'reload schema';
