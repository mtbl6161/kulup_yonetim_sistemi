-- ============================================================
-- MEB Kulüp Yönetim Sistemi — Eksik Kolon Eklemeleri
-- Mevcut verilere dokunmaz, sadece eksik kolonları ekler
-- ============================================================

-- ogrenciler: aktif kolonu ekle
ALTER TABLE ogrenciler ADD COLUMN IF NOT EXISTS aktif BOOLEAN DEFAULT true;
UPDATE ogrenciler SET aktif = true WHERE aktif IS NULL;

-- personel: gorev_kategorisi (gorev'in kopyası), aktif, kadro_durumu
ALTER TABLE personel ADD COLUMN IF NOT EXISTS gorev_kategorisi TEXT;
ALTER TABLE personel ADD COLUMN IF NOT EXISTS aktif BOOLEAN DEFAULT true;
ALTER TABLE personel ADD COLUMN IF NOT EXISTS kadro_durumu TEXT DEFAULT 'Kadrolu';
-- gorev değerini gorev_kategorisi'ne kopyala (eğer gorev_kategorisi boşsa)
UPDATE personel SET gorev_kategorisi = gorev WHERE gorev_kategorisi IS NULL;
UPDATE personel SET aktif = true WHERE aktif IS NULL;

-- puantaj: etkinlik_saati (saat'in kopyası), ay, yil
ALTER TABLE puantaj ADD COLUMN IF NOT EXISTS etkinlik_saati NUMERIC(4,1);
ALTER TABLE puantaj ADD COLUMN IF NOT EXISTS ay INTEGER;
ALTER TABLE puantaj ADD COLUMN IF NOT EXISTS yil INTEGER;
-- Mevcut saat değerlerini etkinlik_saati'ne kopyala
UPDATE puantaj SET etkinlik_saati = saat WHERE etkinlik_saati IS NULL;
-- Tarihten ay/yil hesapla
UPDATE puantaj SET
  ay = EXTRACT(MONTH FROM tarih::date),
  yil = EXTRACT(YEAR FROM tarih::date)
WHERE ay IS NULL AND tarih IS NOT NULL;

-- hesap_hareketleri: kaynak, kaynak_id, bakiye, ay, yil
ALTER TABLE hesap_hareketleri ADD COLUMN IF NOT EXISTS kaynak TEXT DEFAULT 'manuel';
ALTER TABLE hesap_hareketleri ADD COLUMN IF NOT EXISTS kaynak_id BIGINT;
ALTER TABLE hesap_hareketleri ADD COLUMN IF NOT EXISTS bakiye NUMERIC(12,2) DEFAULT 0;
ALTER TABLE hesap_hareketleri ADD COLUMN IF NOT EXISTS ay INTEGER;
ALTER TABLE hesap_hareketleri ADD COLUMN IF NOT EXISTS yil INTEGER;
UPDATE hesap_hareketleri SET kaynak = 'manuel' WHERE kaynak IS NULL;
UPDATE hesap_hareketleri SET
  ay = EXTRACT(MONTH FROM tarih::date),
  yil = EXTRACT(YEAR FROM tarih::date)
WHERE ay IS NULL AND tarih IS NOT NULL;

-- giderler: ay, yil
ALTER TABLE giderler ADD COLUMN IF NOT EXISTS ay INTEGER;
ALTER TABLE giderler ADD COLUMN IF NOT EXISTS yil INTEGER;
UPDATE giderler SET
  ay = EXTRACT(MONTH FROM tarih::date),
  yil = EXTRACT(YEAR FROM tarih::date)
WHERE ay IS NULL AND tarih IS NOT NULL;

-- yoklama: ay, yil
ALTER TABLE yoklama ADD COLUMN IF NOT EXISTS ay INTEGER;
ALTER TABLE yoklama ADD COLUMN IF NOT EXISTS yil INTEGER;
UPDATE yoklama SET
  ay = EXTRACT(MONTH FROM tarih::date),
  yil = EXTRACT(YEAR FROM tarih::date)
WHERE ay IS NULL AND tarih IS NOT NULL;

-- ayarlar: Tahakkuk dağılım kolonları
ALTER TABLE ayarlar ADD COLUMN IF NOT EXISTS dagitim_temel_gider NUMERIC(5,2) DEFAULT 26;
ALTER TABLE ayarlar ADD COLUMN IF NOT EXISTS dagitim_ogretmen NUMERIC(5,2) DEFAULT 55;
ALTER TABLE ayarlar ADD COLUMN IF NOT EXISTS dagitim_baskan NUMERIC(5,2) DEFAULT 7;
ALTER TABLE ayarlar ADD COLUMN IF NOT EXISTS dagitim_baskan_yrd NUMERIC(5,2) DEFAULT 5;
ALTER TABLE ayarlar ADD COLUMN IF NOT EXISTS dagitim_muhasebe NUMERIC(5,2) DEFAULT 2;
ALTER TABLE ayarlar ADD COLUMN IF NOT EXISTS dagitim_temizlik NUMERIC(5,2) DEFAULT 4;
ALTER TABLE ayarlar ADD COLUMN IF NOT EXISTS dagitim_denetim NUMERIC(5,2) DEFAULT 1;
ALTER TABLE ayarlar ADD COLUMN IF NOT EXISTS tavan_katsayi NUMERIC(6,4) DEFAULT 1.0;

-- bordro: gv_matrah kolonu (gv_tutar/gv_oran'dan hesaplanabilir ama kolayı ekleyelim)
ALTER TABLE bordro ADD COLUMN IF NOT EXISTS gv_matrah NUMERIC(10,2) DEFAULT 0;
ALTER TABLE bordro ADD COLUMN IF NOT EXISTS sgk_issizlik NUMERIC(10,2) DEFAULT 0;
-- Mevcut sgk_issizlik_kisi'ni sgk_issizlik'e kopyala
UPDATE bordro SET sgk_issizlik = sgk_issizlik_kisi WHERE sgk_issizlik IS NULL OR sgk_issizlik = 0;

-- tahakkuk tablosu yoksa oluştur
CREATE TABLE IF NOT EXISTS tahakkuk (
  id              BIGSERIAL PRIMARY KEY,
  ay              INTEGER NOT NULL,
  yil             INTEGER NOT NULL,
  toplam_gelir    NUMERIC(12,2) DEFAULT 0,
  dagilim_json    JSONB,
  hesaplandi_mi   BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ay, yil)
);

-- RLS politikaları (eğer yoksa)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tahakkuk') THEN
    ALTER TABLE tahakkuk ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "allow_all_tahakkuk" ON tahakkuk FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Mevcut tablolar için RLS açık değilse aç
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['ogrenciler','personel','puantaj','hesap_hareketleri','giderler','yoklama','ayarlar','bordro','ders_programi','tahsilat','tatiller','siniflar']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
