-- ============================================================
-- ÇOK KULLANICILI GEÇİŞ MİGRASYONU (GÜVENLİ VERSİYON)
-- Supabase SQL Editor'da çalıştırın.
-- Admin okul_id = 8 — farklıysa aşağıdaki tüm "= 8" değerlerini değiştirin.
-- ============================================================

-- ============================================================
-- 1. Zorunlu tablolara okul_id ekle
-- ============================================================
ALTER TABLE ogrenciler        ADD COLUMN IF NOT EXISTS okul_id INTEGER REFERENCES okullar(id);
ALTER TABLE personel          ADD COLUMN IF NOT EXISTS okul_id INTEGER REFERENCES okullar(id);
ALTER TABLE puantaj           ADD COLUMN IF NOT EXISTS okul_id INTEGER REFERENCES okullar(id);
ALTER TABLE tahsilat          ADD COLUMN IF NOT EXISTS okul_id INTEGER REFERENCES okullar(id);
ALTER TABLE tahakkuk          ADD COLUMN IF NOT EXISTS okul_id INTEGER REFERENCES okullar(id);
ALTER TABLE bordro            ADD COLUMN IF NOT EXISTS okul_id INTEGER REFERENCES okullar(id);
ALTER TABLE giderler          ADD COLUMN IF NOT EXISTS okul_id INTEGER REFERENCES okullar(id);
ALTER TABLE hesap_hareketleri ADD COLUMN IF NOT EXISTS okul_id INTEGER REFERENCES okullar(id);
ALTER TABLE yoklama           ADD COLUMN IF NOT EXISTS okul_id INTEGER REFERENCES okullar(id);
ALTER TABLE ders_programi     ADD COLUMN IF NOT EXISTS okul_id INTEGER REFERENCES okullar(id);
ALTER TABLE ayarlar           ADD COLUMN IF NOT EXISTS okul_id INTEGER REFERENCES okullar(id);

-- Opsiyonel tablolar — tablo yoksa hata vermez
DO $$ BEGIN
  ALTER TABLE siniflar ADD COLUMN IF NOT EXISTS okul_id INTEGER REFERENCES okullar(id);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE tatiller ADD COLUMN IF NOT EXISTS okul_id INTEGER REFERENCES okullar(id);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE sinif_defteri ADD COLUMN IF NOT EXISTS okul_id INTEGER REFERENCES okullar(id);
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ============================================================
-- 2. Mevcut verileri admin okuluna (id=8) bağla
-- ============================================================
UPDATE ogrenciler        SET okul_id = 8 WHERE okul_id IS NULL;
UPDATE personel          SET okul_id = 8 WHERE okul_id IS NULL;
UPDATE puantaj           SET okul_id = 8 WHERE okul_id IS NULL;
UPDATE tahsilat          SET okul_id = 8 WHERE okul_id IS NULL;
UPDATE tahakkuk          SET okul_id = 8 WHERE okul_id IS NULL;
UPDATE bordro            SET okul_id = 8 WHERE okul_id IS NULL;
UPDATE giderler          SET okul_id = 8 WHERE okul_id IS NULL;
UPDATE hesap_hareketleri SET okul_id = 8 WHERE okul_id IS NULL;
UPDATE yoklama           SET okul_id = 8 WHERE okul_id IS NULL;
UPDATE ders_programi     SET okul_id = 8 WHERE okul_id IS NULL;
UPDATE ayarlar           SET okul_id = 8 WHERE okul_id IS NULL;

DO $$ BEGIN UPDATE siniflar      SET okul_id = 8 WHERE okul_id IS NULL; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN UPDATE tatiller      SET okul_id = 8 WHERE okul_id IS NULL; EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN UPDATE sinif_defteri SET okul_id = 8 WHERE okul_id IS NULL; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ============================================================
-- 3. UNIQUE kısıtları güncelle
-- ============================================================
ALTER TABLE tahakkuk DROP CONSTRAINT IF EXISTS tahakkuk_ay_yil_key;
ALTER TABLE tahakkuk DROP CONSTRAINT IF EXISTS tahakkuk_ay_yil_okul_key;
ALTER TABLE tahakkuk ADD CONSTRAINT tahakkuk_ay_yil_okul_key UNIQUE (ay, yil, okul_id);

ALTER TABLE ayarlar DROP CONSTRAINT IF EXISTS ayarlar_okul_key;
ALTER TABLE ayarlar ADD CONSTRAINT ayarlar_okul_key UNIQUE (okul_id);

-- ============================================================
-- 4. Oturumdaki kullanıcının okul_id'sini döndüren fonksiyon
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_okul_id()
RETURNS INTEGER AS $$
  SELECT okul_id FROM profiller WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 5. Eski "herkese açık" politikaları kaldır
-- ============================================================
DROP POLICY IF EXISTS "allow_all_ayarlar"           ON ayarlar;
DROP POLICY IF EXISTS "allow_all_ogrenciler"        ON ogrenciler;
DROP POLICY IF EXISTS "allow_all_personel"          ON personel;
DROP POLICY IF EXISTS "allow_all_puantaj"           ON puantaj;
DROP POLICY IF EXISTS "allow_all_tahsilat"          ON tahsilat;
DROP POLICY IF EXISTS "allow_all_tahakkuk"          ON tahakkuk;
DROP POLICY IF EXISTS "allow_all_bordro"            ON bordro;
DROP POLICY IF EXISTS "allow_all_giderler"          ON giderler;
DROP POLICY IF EXISTS "allow_all_hesap_hareketleri" ON hesap_hareketleri;
DROP POLICY IF EXISTS "allow_all_yoklama"           ON yoklama;
DROP POLICY IF EXISTS "allow_all_ders_programi"     ON ders_programi;
DO $$ BEGIN DROP POLICY IF EXISTS "allow_all_siniflar"      ON siniflar;      EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "allow_all_tatiller"      ON tatiller;      EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "allow_all_sinif_defteri" ON sinif_defteri; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Önceki çalıştırmadan kalan yeni politikaları da temizle
DROP POLICY IF EXISTS "okul_ayarlar"           ON ayarlar;
DROP POLICY IF EXISTS "okul_ogrenciler"        ON ogrenciler;
DROP POLICY IF EXISTS "okul_personel"          ON personel;
DROP POLICY IF EXISTS "okul_puantaj"           ON puantaj;
DROP POLICY IF EXISTS "okul_tahsilat"          ON tahsilat;
DROP POLICY IF EXISTS "okul_tahakkuk"          ON tahakkuk;
DROP POLICY IF EXISTS "okul_bordro"            ON bordro;
DROP POLICY IF EXISTS "okul_giderler"          ON giderler;
DROP POLICY IF EXISTS "okul_hesap_hareketleri" ON hesap_hareketleri;
DROP POLICY IF EXISTS "okul_yoklama"           ON yoklama;
DROP POLICY IF EXISTS "okul_ders_programi"     ON ders_programi;
DO $$ BEGIN DROP POLICY IF EXISTS "okul_siniflar"      ON siniflar;      EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "okul_tatiller"      ON tatiller;      EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "okul_sinif_defteri" ON sinif_defteri; EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ============================================================
-- 6. Okul bazlı RLS politikaları
-- ============================================================
CREATE POLICY "okul_ayarlar"           ON ayarlar           FOR ALL USING (okul_id = get_my_okul_id()) WITH CHECK (okul_id = get_my_okul_id());
CREATE POLICY "okul_ogrenciler"        ON ogrenciler        FOR ALL USING (okul_id = get_my_okul_id()) WITH CHECK (okul_id = get_my_okul_id());
CREATE POLICY "okul_personel"          ON personel          FOR ALL USING (okul_id = get_my_okul_id()) WITH CHECK (okul_id = get_my_okul_id());
CREATE POLICY "okul_puantaj"           ON puantaj           FOR ALL USING (okul_id = get_my_okul_id()) WITH CHECK (okul_id = get_my_okul_id());
CREATE POLICY "okul_tahsilat"          ON tahsilat          FOR ALL USING (okul_id = get_my_okul_id()) WITH CHECK (okul_id = get_my_okul_id());
CREATE POLICY "okul_tahakkuk"          ON tahakkuk          FOR ALL USING (okul_id = get_my_okul_id()) WITH CHECK (okul_id = get_my_okul_id());
CREATE POLICY "okul_bordro"            ON bordro            FOR ALL USING (okul_id = get_my_okul_id()) WITH CHECK (okul_id = get_my_okul_id());
CREATE POLICY "okul_giderler"          ON giderler          FOR ALL USING (okul_id = get_my_okul_id()) WITH CHECK (okul_id = get_my_okul_id());
CREATE POLICY "okul_hesap_hareketleri" ON hesap_hareketleri FOR ALL USING (okul_id = get_my_okul_id()) WITH CHECK (okul_id = get_my_okul_id());
CREATE POLICY "okul_yoklama"           ON yoklama           FOR ALL USING (okul_id = get_my_okul_id()) WITH CHECK (okul_id = get_my_okul_id());
CREATE POLICY "okul_ders_programi"     ON ders_programi     FOR ALL USING (okul_id = get_my_okul_id()) WITH CHECK (okul_id = get_my_okul_id());

DO $$ BEGIN CREATE POLICY "okul_siniflar"      ON siniflar      FOR ALL USING (okul_id = get_my_okul_id()) WITH CHECK (okul_id = get_my_okul_id()); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "okul_tatiller"      ON tatiller      FOR ALL USING (okul_id = get_my_okul_id()) WITH CHECK (okul_id = get_my_okul_id()); EXCEPTION WHEN undefined_table THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "okul_sinif_defteri" ON sinif_defteri FOR ALL USING (okul_id = get_my_okul_id()) WITH CHECK (okul_id = get_my_okul_id()); EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ============================================================
-- 7. Insert trigger: okul_id'yi otomatik ata
-- ============================================================
CREATE OR REPLACE FUNCTION auto_set_okul_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.okul_id IS NULL THEN
    NEW.okul_id := get_my_okul_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ogrenciler','personel','puantaj','tahsilat','tahakkuk',
    'bordro','giderler','hesap_hareketleri','yoklama','ders_programi',
    'ayarlar'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_auto_okul_id ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_auto_okul_id BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION auto_set_okul_id()',
      t
    );
  END LOOP;
END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS trg_auto_okul_id ON siniflar;
  CREATE TRIGGER trg_auto_okul_id BEFORE INSERT ON siniflar FOR EACH ROW EXECUTE FUNCTION auto_set_okul_id();
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS trg_auto_okul_id ON tatiller;
  CREATE TRIGGER trg_auto_okul_id BEFORE INSERT ON tatiller FOR EACH ROW EXECUTE FUNCTION auto_set_okul_id();
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS trg_auto_okul_id ON sinif_defteri;
  CREATE TRIGGER trg_auto_okul_id BEFORE INSERT ON sinif_defteri FOR EACH ROW EXECUTE FUNCTION auto_set_okul_id();
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- ============================================================
-- 8. Doğrulama — kaç satır bağlandı?
-- ============================================================
SELECT 'ogrenciler'        AS tablo, COUNT(*) AS toplam, COUNT(okul_id) AS baglandi FROM ogrenciler
UNION ALL
SELECT 'personel',          COUNT(*), COUNT(okul_id) FROM personel
UNION ALL
SELECT 'puantaj',           COUNT(*), COUNT(okul_id) FROM puantaj
UNION ALL
SELECT 'tahsilat',          COUNT(*), COUNT(okul_id) FROM tahsilat
UNION ALL
SELECT 'bordro',            COUNT(*), COUNT(okul_id) FROM bordro
UNION ALL
SELECT 'giderler',          COUNT(*), COUNT(okul_id) FROM giderler
UNION ALL
SELECT 'hesap_hareketleri', COUNT(*), COUNT(okul_id) FROM hesap_hareketleri
UNION ALL
SELECT 'ayarlar',           COUNT(*), COUNT(okul_id) FROM ayarlar;
