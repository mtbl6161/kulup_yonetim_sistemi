-- MUHSGK (muhtasar + SGK) beyanname XML'i için ayarlarda olmayan bilgiler:
-- vergi dairesi kodu, düzenleyen (mali müşavir) bilgileri ve işyeri ek bilgileri.
-- Sütun yokken Muhasebe sayfası bu bilgileri yalnızca tarayıcıda saklar.
ALTER TABLE public.ayarlar ADD COLUMN IF NOT EXISTS muhsgk_bilgileri JSONB;
