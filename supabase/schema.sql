-- ============================================================
-- MEB ÇOCUK KULÜPLERİ YÖNETİM SİSTEMİ - SUPABASE ŞEMASI
-- ============================================================

-- Ayarlar (tekil satır)
CREATE TABLE IF NOT EXISTS ayarlar (
  id              BIGINT PRIMARY KEY DEFAULT 1,
  kurum_adi       TEXT    DEFAULT 'TÜRKİYE YÜZYILI ANAOKULU',
  mudur_adi       TEXT    DEFAULT '',
  adres           TEXT    DEFAULT '',
  tel             TEXT    DEFAULT '',
  email           TEXT    DEFAULT '',
  vergi_dairesi   TEXT    DEFAULT '',
  vergi_no        TEXT    DEFAULT '',
  sgk_no          TEXT    DEFAULT '',
  -- Ücret parametreleri
  gosterge        INTEGER DEFAULT 140,
  katsayi         NUMERIC(10,6) DEFAULT 1.387871,
  saat_ucreti     NUMERIC(10,2) DEFAULT 64.75,
  gunluk_saat     INTEGER DEFAULT 6,
  yemek           BOOLEAN DEFAULT true,
  -- Asgari ücret
  asgari_ucret    NUMERIC(10,2) DEFAULT 33030,
  -- SGK oranları
  sgk_kisi_pay          NUMERIC(6,4) DEFAULT 0.14,
  sgk_issizlik_kisi     NUMERIC(6,4) DEFAULT 0.01,
  sgk_kisa_vadeli       NUMERIC(6,4) DEFAULT 0.0225,
  sgk_malulluk          NUMERIC(6,4) DEFAULT 0.20,
  sgk_saglik            NUMERIC(6,4) DEFAULT 0.125,
  sgk_issizlik_isveren  NUMERIC(6,4) DEFAULT 0.03,
  -- Damga vergisi
  damga_vergi_orani     NUMERIC(8,5) DEFAULT 0.00759,
  -- Gelir vergisi dilimleri (JSON)
  vergi_dilimleri JSONB DEFAULT '[
    {"ust":190000,"oran":0.15},
    {"ust":400000,"oran":0.20},
    {"ust":1500000,"oran":0.27},
    {"ust":5300000,"oran":0.35},
    {"ust":30000000,"oran":0.40}
  ]',
  -- Tahakkuk dağılım oranları (%)
  dagitim_temel_gider   NUMERIC(5,2) DEFAULT 26,
  dagitim_ogretmen      NUMERIC(5,2) DEFAULT 55,
  dagitim_baskan        NUMERIC(5,2) DEFAULT 7,
  dagitim_baskan_yrd    NUMERIC(5,2) DEFAULT 5,
  dagitim_muhasebe      NUMERIC(5,2) DEFAULT 2,
  dagitim_temizlik      NUMERIC(5,2) DEFAULT 4,
  dagitim_denetim       NUMERIC(5,2) DEFAULT 1,
  -- En yüksek devlet memuru brüt aylık tavan katsayısı
  tavan_katsayi         NUMERIC(6,4) DEFAULT 1.0,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Tek satır garantisi
INSERT INTO ayarlar (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Öğrenciler
-- ============================================================
CREATE TABLE IF NOT EXISTS ogrenciler (
  id              BIGSERIAL PRIMARY KEY,
  ad              TEXT    NOT NULL,
  soyad           TEXT    NOT NULL,
  tc              TEXT,
  sinif           TEXT,
  ogretmen        TEXT,
  kardes_indirimi BOOLEAN DEFAULT false,
  anne_adi        TEXT,
  anne_tel        TEXT,
  ucretsiz_mi     BOOLEAN DEFAULT false,
  ucretsiz_nedeni TEXT,
  aktif           BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Personel
-- ============================================================
CREATE TABLE IF NOT EXISTS personel (
  id              BIGSERIAL PRIMARY KEY,
  ad              TEXT    NOT NULL,
  tc              TEXT,
  gorev_kategorisi TEXT NOT NULL DEFAULT 'Öğretmen',
  -- Öğretmen | Usta Öğretici | Koordinatör Öğretmen | Muhasebe Personeli | Temizlik Personeli | Başkan | Başkan Yrd. | Denetim
  kadro_durumu    TEXT    DEFAULT 'Kadrolu',
  sgk_li          BOOLEAN DEFAULT false,
  vergi_istisnasi BOOLEAN DEFAULT false,
  iban            TEXT,
  yillik_matrah   NUMERIC(12,2) DEFAULT 0,
  aktif           BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Puantaj (aylık çalışma saatleri)
-- ============================================================
CREATE TABLE IF NOT EXISTS puantaj (
  id              BIGSERIAL PRIMARY KEY,
  personel_id     BIGINT  REFERENCES personel(id) ON DELETE CASCADE,
  tarih           DATE    NOT NULL,
  etkinlik_saati  NUMERIC(4,1) DEFAULT 0,
  ay              INTEGER NOT NULL,
  yil             INTEGER NOT NULL,
  UNIQUE(personel_id, tarih)
);

-- ============================================================
-- Tahsilat (öğrenci ödemeleri)
-- ============================================================
CREATE TABLE IF NOT EXISTS tahsilat (
  id              BIGSERIAL PRIMARY KEY,
  ogrenci_id      BIGINT  REFERENCES ogrenciler(id) ON DELETE CASCADE,
  tarih           DATE    NOT NULL,
  tutar           NUMERIC(10,2) NOT NULL,
  ay              INTEGER NOT NULL,
  yil             INTEGER NOT NULL,
  dekont_no       TEXT,
  aciklama        TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Tahakkuk (aylık)
-- ============================================================
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

-- ============================================================
-- Bordro
-- ============================================================
CREATE TABLE IF NOT EXISTS bordro (
  id              BIGSERIAL PRIMARY KEY,
  personel_id     BIGINT  REFERENCES personel(id) ON DELETE CASCADE,
  ay              INTEGER NOT NULL,
  yil             INTEGER NOT NULL,
  toplam_saat     NUMERIC(6,1) DEFAULT 0,
  brut            NUMERIC(10,2) DEFAULT 0,
  gv_matrah       NUMERIC(10,2) DEFAULT 0,
  gv_oran         NUMERIC(5,4) DEFAULT 0,
  gv              NUMERIC(10,2) DEFAULT 0,
  dv              NUMERIC(10,2) DEFAULT 0,
  sgk_kisi        NUMERIC(10,2) DEFAULT 0,
  sgk_issizlik    NUMERIC(10,2) DEFAULT 0,
  sgk_isveren     NUMERIC(10,2) DEFAULT 0,
  toplam_kesinti  NUMERIC(10,2) DEFAULT 0,
  net             NUMERIC(10,2) DEFAULT 0,
  odendi          BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(personel_id, ay, yil)
);

-- ============================================================
-- Giderler
-- ============================================================
CREATE TABLE IF NOT EXISTS giderler (
  id              BIGSERIAL PRIMARY KEY,
  tarih           DATE    NOT NULL,
  kategori        TEXT    DEFAULT 'Genel',
  tutar           NUMERIC(10,2) NOT NULL,
  aciklama        TEXT,
  dekont_no       TEXT,
  ay              INTEGER NOT NULL,
  yil             INTEGER NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Hesap Hareketleri
-- ============================================================
CREATE TABLE IF NOT EXISTS hesap_hareketleri (
  id              BIGSERIAL PRIMARY KEY,
  tarih           DATE    NOT NULL,
  tutar           NUMERIC(10,2) NOT NULL,
  tur             TEXT    NOT NULL CHECK (tur IN ('gelir','gider')),
  aciklama        TEXT,
  dekont_no       TEXT,
  kaynak          TEXT    DEFAULT 'manuel',
  -- kaynak: manuel | tahsilat | bordro | gider
  kaynak_id       BIGINT,
  bakiye          NUMERIC(12,2) DEFAULT 0,
  ay              INTEGER,
  yil             INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Yoklama
-- ============================================================
CREATE TABLE IF NOT EXISTS yoklama (
  id              BIGSERIAL PRIMARY KEY,
  ogrenci_id      BIGINT  REFERENCES ogrenciler(id) ON DELETE CASCADE,
  tarih           DATE    NOT NULL,
  durum           TEXT    NOT NULL DEFAULT 'belirsiz',
  -- geldi | gelmedi | izinli | belirsiz
  ay              INTEGER NOT NULL,
  yil             INTEGER NOT NULL,
  UNIQUE(ogrenci_id, tarih)
);

-- ============================================================
-- Ders Programı
-- ============================================================
CREATE TABLE IF NOT EXISTS ders_programi (
  id              BIGSERIAL PRIMARY KEY,
  kulup_adi       TEXT    NOT NULL,
  ogretmen_id     BIGINT  REFERENCES personel(id) ON DELETE SET NULL,
  gun             INTEGER NOT NULL CHECK (gun BETWEEN 1 AND 5),
  -- 1=Pazartesi ... 5=Cuma
  seans           TEXT    DEFAULT 'sabah',
  -- sabah | ogle
  saat            TEXT,
  etkinlik_saati  NUMERIC(4,1) DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS (Row Level Security) - Geliştirme için kapalı
-- Üretimde her tablo için politika eklenmeli
-- ============================================================
ALTER TABLE ayarlar               ENABLE ROW LEVEL SECURITY;
ALTER TABLE ogrenciler            ENABLE ROW LEVEL SECURITY;
ALTER TABLE personel              ENABLE ROW LEVEL SECURITY;
ALTER TABLE puantaj               ENABLE ROW LEVEL SECURITY;
ALTER TABLE tahsilat              ENABLE ROW LEVEL SECURITY;
ALTER TABLE tahakkuk              ENABLE ROW LEVEL SECURITY;
ALTER TABLE bordro                ENABLE ROW LEVEL SECURITY;
ALTER TABLE giderler              ENABLE ROW LEVEL SECURITY;
ALTER TABLE hesap_hareketleri     ENABLE ROW LEVEL SECURITY;
ALTER TABLE yoklama               ENABLE ROW LEVEL SECURITY;
ALTER TABLE ders_programi         ENABLE ROW LEVEL SECURITY;

-- Geliştirme için herkese tam erişim (anon key ile)
CREATE POLICY "allow_all_ayarlar"           ON ayarlar           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_ogrenciler"        ON ogrenciler        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_personel"          ON personel          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_puantaj"           ON puantaj           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_tahsilat"          ON tahsilat          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_tahakkuk"          ON tahakkuk          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_bordro"            ON bordro            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_giderler"          ON giderler          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_hesap_hareketleri" ON hesap_hareketleri FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_yoklama"           ON yoklama           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_ders_programi"     ON ders_programi     FOR ALL USING (true) WITH CHECK (true);
