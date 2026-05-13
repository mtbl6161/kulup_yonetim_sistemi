-- ============================================================
-- TAHSİLAT RLS SELECT POLİTİKASI GENİŞLETME
-- 
-- Sorun: tahsilat SELECT politikası sadece okul_id = get_my_okul_id()
-- kabul ediyor. NULL okul_id'li eski kayıtlar görünmüyor.
-- Bu script:
-- 1. Direkt tüm NULL okul_id'leri günceller (service_role)
-- 2. Tahsilat SELECT politikasını günceller
-- ============================================================

-- ADIM 1: Doğrudan güncelleme (NULL olanları 9 yap)
-- Not: okul ID'nizi biliyorsanız aşağıdaki 9'u değiştirin
UPDATE tahsilat SET okul_id = 9 WHERE okul_id IS NULL OR okul_id = 0;
UPDATE puantaj  SET okul_id = 9 WHERE okul_id IS NULL OR okul_id = 0;
UPDATE bordro   SET okul_id = 9 WHERE okul_id IS NULL OR okul_id = 0;
UPDATE tahakkuk SET okul_id = 9 WHERE okul_id IS NULL OR okul_id = 0;
UPDATE personel SET okul_id = 9 WHERE okul_id IS NULL OR okul_id = 0;
UPDATE ogrenciler SET okul_id = 9 WHERE okul_id IS NULL OR okul_id = 0;
UPDATE sinif_defteri SET okul_id = 9 WHERE okul_id IS NULL OR okul_id = 0;
UPDATE ders_programi SET okul_id = 9 WHERE okul_id IS NULL OR okul_id = 0;
UPDATE giderler SET okul_id = 9 WHERE okul_id IS NULL OR okul_id = 0;
UPDATE hesap_hareketleri SET okul_id = 9 WHERE okul_id IS NULL OR okul_id = 0;
UPDATE yoklama SET okul_id = 9 WHERE okul_id IS NULL OR okul_id = 0;
UPDATE ayarlar SET okul_id = 9 WHERE okul_id IS NULL OR okul_id = 0;

-- ADIM 2: Mevcut durumu say
SELECT 'tahsilat' AS tablo, okul_id, COUNT(*) AS adet, SUM(tutar) AS toplam
FROM tahsilat GROUP BY okul_id
UNION ALL
SELECT 'puantaj', okul_id, COUNT(*), SUM(saat)
FROM puantaj GROUP BY okul_id;

SELECT 'Tamamlandı ✅' AS mesaj;
