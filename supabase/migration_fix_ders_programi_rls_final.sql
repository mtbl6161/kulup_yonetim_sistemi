-- ============================================================
-- DERS PROGRAMI RLS VE TRIGGER FIX (KESİN ÇÖZÜM)
-- Supabase SQL Editor'da çalıştırın.
-- ============================================================

-- 1. RLS Etkinleştir
ALTER TABLE ders_programi ENABLE ROW LEVEL SECURITY;

-- 2. Eski Politikaları Temizle
DROP POLICY IF EXISTS "allow_all_ders_programi" ON ders_programi;
DROP POLICY IF EXISTS "okul_ders_programi" ON ders_programi;
DROP POLICY IF EXISTS "denetim_ders_programi_oku" ON ders_programi;

-- 3. Yeni Okul Bazlı Politikalar

-- SELECT: Kendi okulunun derslerini gör veya denetim yetkiliyse ilindekileri gör
CREATE POLICY "okul_ders_programi_select" 
  ON ders_programi FOR SELECT 
  USING (
    okul_id = get_my_okul_id() 
    OR 
    (
      get_my_il_id() IS NOT NULL 
      AND okul_id IN (SELECT id FROM okullar WHERE il_id = get_my_il_id())
    )
  );

-- INSERT: Yeni kayıt eklerken okul_id kontrolü (trigger ile atanacaksa bile RLS izin vermeli)
CREATE POLICY "okul_ders_programi_insert" 
  ON ders_programi FOR INSERT 
  WITH CHECK (
    okul_id = get_my_okul_id() 
    OR 
    okul_id IS NULL -- Trigger'ın okul_id'yi atamasına izin vermek için NULL'a izin veriyoruz
  );

-- UPDATE: Sadece kendi okulunun derslerini güncelle
CREATE POLICY "okul_ders_programi_update" 
  ON ders_programi FOR UPDATE 
  USING (okul_id = get_my_okul_id())
  WITH CHECK (okul_id = get_my_okul_id());

-- DELETE: Sadece kendi okulunun derslerini sil
CREATE POLICY "okul_ders_programi_delete" 
  ON ders_programi FOR DELETE 
  USING (okul_id = get_my_okul_id());


-- 4. Okul ID Atama Tetikleyicisi (Trigger)
-- Eğer ders_programi tablosunda okul_id boş gelirse, mevcut kullanıcının okulunu otomatik ata.

CREATE OR REPLACE FUNCTION auto_set_okul_id_ders_programi()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.okul_id IS NULL THEN
    NEW.okul_id := get_my_okul_id();
  END IF;
  
  -- Hala NULL ise (kullanıcı profili bulunamadıysa) hatayı önlemek için 
  -- varsayılan bir kontrol yapabiliriz, ancak RLS zaten engelleyecektir.
  IF NEW.okul_id IS NULL THEN
    RAISE EXCEPTION 'Kullanıcı okul bilgisi bulunamadı. Lütfen giriş yaptığınızdan emin olun.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_okul_id_ders_programi ON ders_programi;
CREATE TRIGGER trg_auto_okul_id_ders_programi
  BEFORE INSERT ON ders_programi
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_okul_id_ders_programi();

-- 5. Doğrulama Sorgusu
SELECT 'Ders programı RLS ve Trigger ayarları başarıyla güncellendi' AS mesaj;
