-- Öğrenci ödeme dökümünü veliye e-postayla göndermek için veli e-posta adresi.
-- Sütun yokken döküm yine gönderilir; yalnızca adres öğrenci kaydında saklanmaz.
ALTER TABLE public.ogrenciler ADD COLUMN IF NOT EXISTS veli_eposta TEXT;
