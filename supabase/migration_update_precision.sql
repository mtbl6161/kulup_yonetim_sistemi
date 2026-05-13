-- Hassasiyeti artırmak için tutar kolonlarını NUMERIC(15,4) olarak güncelliyoruz
-- Bu sayede yarım kuruşlar (0.875 gibi) yuvarlanmadan saklanabilir ve toplamda kuruş farkı oluşmaz.

ALTER TABLE tahsilat 
  ALTER COLUMN tutar TYPE NUMERIC(15,4);

ALTER TABLE tahakkuk 
  ALTER COLUMN toplam_gelir TYPE NUMERIC(15,4);

ALTER TABLE giderler 
  ALTER COLUMN tutar TYPE NUMERIC(15,4);

ALTER TABLE hesap_hareketleri 
  ALTER COLUMN tutar TYPE NUMERIC(15,4);

ALTER TABLE bordro 
  ALTER COLUMN brut TYPE NUMERIC(15,4),
  ALTER COLUMN net TYPE NUMERIC(15,4),
  ALTER COLUMN toplam_kesinti TYPE NUMERIC(15,4);

-- Şema önbelleğini yenilemek için (Supabase Dashboard'da gerekebilir)
NOTIFY pgrst, 'reload schema';
