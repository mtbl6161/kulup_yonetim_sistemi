-- ============================================================
-- Denetim yetkilisine banka/hesap hareketleri için okuma yetkisi
-- (Hesap Kontrolü: kulüp aidatı tahsilatlarının banka hareketlerinde karşılığı var mı)
-- Yalnızca SELECT; mevcut okul politikalarıyla OR'lanır, okulların yetkisini değiştirmez.
-- Supabase SQL Editor'da çalıştırın.
-- ============================================================

-- isletme_defteri: banka ekstresinden aktarılan gerçek hesap hareketleri
DROP POLICY IF EXISTS "denetim_isletme_defteri_oku" ON isletme_defteri;
CREATE POLICY "denetim_isletme_defteri_oku"
  ON isletme_defteri FOR SELECT
  USING (
    get_my_il_id() IS NOT NULL
    AND okul_id IN (SELECT id FROM okullar WHERE il_id = get_my_il_id())
  );

-- isletme_devir: önceki yıldan devreden tutar
DROP POLICY IF EXISTS "denetim_isletme_devir_oku" ON isletme_devir;
CREATE POLICY "denetim_isletme_devir_oku"
  ON isletme_devir FOR SELECT
  USING (
    get_my_il_id() IS NOT NULL
    AND okul_id IN (SELECT id FROM okullar WHERE il_id = get_my_il_id())
  );

-- hesap_hareketleri: tahsilat/giderden otomatik oluşan iç hareketler
DROP POLICY IF EXISTS "denetim_hesap_hareketleri_oku" ON hesap_hareketleri;
CREATE POLICY "denetim_hesap_hareketleri_oku"
  ON hesap_hareketleri FOR SELECT
  USING (
    get_my_il_id() IS NOT NULL
    AND okul_id IN (SELECT id FROM okullar WHERE il_id = get_my_il_id())
  );

-- tahsilat_kayitlari (kırtasiye vb.) denetçiye açılmaz: Hesap Kontrolü yalnızca kulüp aidatına bakar.
-- Bu dosyanın önceki sürümü çalıştırıldıysa o izni geri alır.
DROP POLICY IF EXISTS "denetim_tahsilat_kayitlari_oku" ON tahsilat_kayitlari;
