-- Audit log tetikleyicisi güçlendirme: 
-- Giriş yapmamış kullanıcılar (hatalı giriş) veya okulu olmayan süper adminler için hata vermesini engelle.

CREATE OR REPLACE FUNCTION auto_set_audit_fields()
RETURNS TRIGGER AS $$
DECLARE
  v_okul_id INTEGER;
BEGIN
  -- Eğer okul_id manuel gönderilmediyse otomatik bulmaya çalış
  IF NEW.okul_id IS NULL THEN
    BEGIN
      -- get_my_okul_id() hata verirse yakala ve null bırak
      SELECT get_my_okul_id() INTO v_okul_id;
      NEW.okul_id := v_okul_id;
    EXCEPTION WHEN OTHERS THEN
      NEW.okul_id := NULL;
    END;
  END IF;

  -- Eğer kullanici_id manuel gönderilmediyse auth.uid() ata
  IF NEW.kullanici_id IS NULL THEN
    NEW.kullanici_id := auth.uid();
  END IF;

  -- IP ve User Agent gelmediyse (direkt SQL ile ekleme yapılıyorsa) default'ları koru
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
