-- ============================================================
-- İL MİLLİ EĞİTİM & DENETİM YETKİLİSİ MİGRASYONU
-- Supabase SQL Editor'da çalıştırın.
-- ============================================================

-- ============================================================
-- 1. iller tablosu
-- ============================================================
CREATE TABLE IF NOT EXISTS iller (
  id         SERIAL PRIMARY KEY,
  ad         TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Yaygın il örnekleri (isteğe bağlı, silebilirsiniz)
INSERT INTO iller (ad) VALUES
  ('Adana'),('Adıyaman'),('Afyonkarahisar'),('Ağrı'),('Amasya'),
  ('Ankara'),('Antalya'),('Artvin'),('Aydın'),('Balıkesir'),
  ('Bilecik'),('Bingöl'),('Bitlis'),('Bolu'),('Burdur'),
  ('Bursa'),('Çanakkale'),('Çankırı'),('Çorum'),('Denizli'),
  ('Diyarbakır'),('Edirne'),('Elazığ'),('Erzincan'),('Erzurum'),
  ('Eskişehir'),('Gaziantep'),('Giresun'),('Gümüşhane'),('Hakkari'),
  ('Hatay'),('Isparta'),('Mersin'),('İstanbul'),('İzmir'),
  ('Kars'),('Kastamonu'),('Kayseri'),('Kırklareli'),('Kırşehir'),
  ('Kocaeli'),('Konya'),('Kütahya'),('Malatya'),('Manisa'),
  ('Kahramanmaraş'),('Mardin'),('Muğla'),('Muş'),('Nevşehir'),
  ('Niğde'),('Ordu'),('Rize'),('Sakarya'),('Samsun'),
  ('Siirt'),('Sinop'),('Sivas'),('Tekirdağ'),('Tokat'),
  ('Trabzon'),('Tunceli'),('Şanlıurfa'),('Uşak'),('Van'),
  ('Yozgat'),('Zonguldak'),('Aksaray'),('Bayburt'),('Karaman'),
  ('Kırıkkale'),('Batman'),('Şırnak'),('Bartın'),('Ardahan'),
  ('Iğdır'),('Yalova'),('Karabük'),('Kilis'),('Osmaniye'),('Düzce')
ON CONFLICT (ad) DO NOTHING;

-- ============================================================
-- 2. okullar tablosuna il_id ekle
-- ============================================================
ALTER TABLE okullar ADD COLUMN IF NOT EXISTS il_id INTEGER REFERENCES iller(id);

-- ============================================================
-- 3. profiller tablosuna il_id ekle (denetim yetkilileri için)
-- ============================================================
ALTER TABLE profiller ADD COLUMN IF NOT EXISTS il_id INTEGER REFERENCES iller(id);

-- ============================================================
-- 4. Yardımcı fonksiyon: kullanıcının il_id'sini döndürür
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_il_id()
RETURNS INTEGER AS $$
  SELECT il_id FROM profiller WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 5. iller tablosu RLS
-- ============================================================
ALTER TABLE iller ENABLE ROW LEVEL SECURITY;

-- Herkes il listesini okuyabilir (login olmuş kullanıcı)
DROP POLICY IF EXISTS "iller_oku" ON iller;
CREATE POLICY "iller_oku"
  ON iller FOR SELECT
  USING (auth.role() = 'authenticated');

-- Sadece super_admin ekleyip değiştirebilir (service_role üzerinden)
-- INSERT/UPDATE/DELETE: RLS policy yok → sadece service_role erişir

-- ============================================================
-- 6. okullar tablosuna denetim okuma politikası
-- ============================================================
-- Denetim yetkilisi kendi ilindeki okulları görebilir
DROP POLICY IF EXISTS "denetim_okullar_oku" ON okullar;
CREATE POLICY "denetim_okullar_oku"
  ON okullar FOR SELECT
  USING (
    -- Kendi okulu (mevcut admin politikası)
    id = get_my_okul_id()
    OR
    -- İlindeki okullar (denetim yetkilisi)
    (get_my_il_id() IS NOT NULL AND il_id = get_my_il_id())
  );

-- ============================================================
-- 7. bordro tablosuna denetim okuma politikası
-- ============================================================
DROP POLICY IF EXISTS "denetim_bordro_oku" ON bordro;
CREATE POLICY "denetim_bordro_oku"
  ON bordro FOR SELECT
  USING (
    -- Kendi okulu (mevcut okul_bordro politikası)
    okul_id = get_my_okul_id()
    OR
    -- İlindeki okulların bordrolarını okuyabilir
    (
      get_my_il_id() IS NOT NULL
      AND okul_id IN (
        SELECT id FROM okullar WHERE il_id = get_my_il_id()
      )
    )
  );

-- ============================================================
-- 8. personel tablosuna denetim okuma politikası
--    (bordro'da personel adı göstermek için)
-- ============================================================
DROP POLICY IF EXISTS "denetim_personel_oku" ON personel;
CREATE POLICY "denetim_personel_oku"
  ON personel FOR SELECT
  USING (
    okul_id = get_my_okul_id()
    OR
    (
      get_my_il_id() IS NOT NULL
      AND okul_id IN (
        SELECT id FROM okullar WHERE il_id = get_my_il_id()
      )
    )
  );

-- ============================================================
-- 9. Doğrulama
-- ============================================================
SELECT 'iller' AS tablo, COUNT(*) AS kayit FROM iller
UNION ALL
SELECT 'okullar.il_id', COUNT(*) FROM okullar WHERE il_id IS NOT NULL;
