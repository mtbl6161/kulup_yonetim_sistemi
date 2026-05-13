-- ============================================================
-- PUANTAJ TABLOSU RLS INSERT POLİTİKASI DÜZELTMESİ
-- 
-- Sorun: "Sınıf Defterinden Getir" butonuna basıldığında
--   "new row violates row-level security policy for table puantaj"
--   hatası veriyordu.
--
-- Kök Neden: INSERT politikası "okul_id = get_my_okul_id()"
--   şartını arıyor. Trigger BEFORE INSERT'te okul_id'yi NULL
--   iken dolduruyor ANCAK RLS WITH CHECK trigger'dan ÖNCE
--   çalışıyor olabilir, ya da upsert conflict durumunda
--   trigger tetiklenmeden RLS devreye giriyor.
--
-- Çözüm: INSERT politikasına "okul_id IS NULL" koşulunu
--   ekleyerek trigger'ın çalışmasına izin veriyoruz.
--   (Frontend de artık profil.okul_id'yi payload'a ekliyor)
-- ============================================================

-- Mevcut INSERT politikasını düşür
DROP POLICY IF EXISTS "okul_puantaj_insert" ON puantaj;

-- Yeni INSERT politikası: okul_id eşleşmesi VEYA NULL
-- (Trigger NULL ise dolduracak, RLS bunu engellemez)
CREATE POLICY "okul_puantaj_insert" ON puantaj
  FOR INSERT WITH CHECK (
    okul_id = get_my_okul_id()
    OR okul_id IS NULL
  );

SELECT 'Puantaj RLS INSERT politikası güncellendi ✅' AS mesaj;
