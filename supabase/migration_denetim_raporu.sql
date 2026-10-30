-- ============================================================
-- Tekrar çalıştırmak güvenlidir: her adım "IF NOT EXISTS / OR REPLACE / DROP IF EXISTS" ile yazıldı.
-- EK-6 DENETİM RAPORU, KULÜP BİLGİLERİ, PERSONEL BELGELERİ, OKUL BİLDİRİMLERİ
--   * kulup_bilgileri      : EK-6'da sistemden çıkmayan sorular (okul bir kez girer, denetçi okur)
--   * personel_belgeleri   : personelin işe başlama evrakları (PDF, serbest yükleme)
--   * denetim_raporlari    : denetçinin aylık EK-6 raporu (taslak → imzalandı → teslim edildi)
--   * okul_bildirimleri    : rapor imzalanınca ve denetçi duyurularında okula giden mesajlar
-- Önkoşul: migration_denetim_dosyasi.sql (denetim_yetkilisi_mi, denetim_okulu_mu fonksiyonları).
-- Supabase SQL Editor'da bir kez çalıştırın.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Kulüp bilgileri (okul başına tek satır)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kulup_bilgileri (
  okul_id               INTEGER PRIMARY KEY REFERENCES okullar(id) ON DELETE CASCADE,
  kurum_kodu            TEXT,
  web_adresi            TEXT,
  ogretim_sekli         TEXT,            -- normal / ikili öğretim
  acilis_onay_tarihi    DATE,
  acilis_onay_sayisi    TEXT,
  faaliyet_turleri      TEXT,
  etkinlik_alanlari     TEXT[] NOT NULL DEFAULT '{}',
  etkinlik_alanlari_diger TEXT,
  ek2_sozlesme          BOOLEAN,         -- EK-2 Çocuk Kulübü Sözleşmesi dolduruluyor mu
  ek4_kayit             BOOLEAN,         -- EK-4 Kayıt Formu dolduruluyor mu
  ek5_acil              BOOLEAN,         -- EK-5 Acil Durum Formu dolduruluyor mu
  guncellendi           TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE kulup_bilgileri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kulup_bilgileri_okul" ON kulup_bilgileri;
CREATE POLICY "kulup_bilgileri_okul" ON kulup_bilgileri FOR ALL
  USING (okul_id = get_my_okul_id()) WITH CHECK (okul_id = get_my_okul_id());
DROP POLICY IF EXISTS "kulup_bilgileri_denetim_oku" ON kulup_bilgileri;
CREATE POLICY "kulup_bilgileri_denetim_oku" ON kulup_bilgileri FOR SELECT USING (denetim_okulu_mu(okul_id));

-- ------------------------------------------------------------
-- 2. Personel belgeleri — dosya yolu: <okul_id>/<personel_id>/<dosya>
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS personel_belgeleri (
  id           SERIAL PRIMARY KEY,
  okul_id      INTEGER NOT NULL REFERENCES okullar(id) ON DELETE CASCADE,
  personel_id  INTEGER NOT NULL REFERENCES personel(id) ON DELETE CASCADE,
  ad           TEXT NOT NULL,            -- kullanıcının verdiği belge adı (ör. "SGK işe giriş bildirgesi")
  dosya_yolu   TEXT NOT NULL,
  dosya_adi    TEXT NOT NULL,
  boyut        BIGINT,
  yukleyen     UUID DEFAULT auth.uid(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS personel_belgeleri_personel_idx ON personel_belgeleri (personel_id);
ALTER TABLE personel_belgeleri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "personel_belgeleri_okul" ON personel_belgeleri;
CREATE POLICY "personel_belgeleri_okul" ON personel_belgeleri FOR ALL
  USING (okul_id = get_my_okul_id()) WITH CHECK (okul_id = get_my_okul_id());
DROP POLICY IF EXISTS "personel_belgeleri_denetim_oku" ON personel_belgeleri;
CREATE POLICY "personel_belgeleri_denetim_oku" ON personel_belgeleri FOR SELECT USING (denetim_okulu_mu(okul_id));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('personel', 'personel', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 10485760, allowed_mime_types = ARRAY['application/pdf'];

DROP POLICY IF EXISTS "personel_dosya_oku" ON storage.objects;
CREATE POLICY "personel_dosya_oku" ON storage.objects FOR SELECT USING (
  bucket_id = 'personel' AND (
    (storage.foldername(name))[1] = get_my_okul_id()::text
    OR denetim_okulu_mu(((storage.foldername(name))[1])::integer)
  )
);
DROP POLICY IF EXISTS "personel_dosya_yukle" ON storage.objects;
CREATE POLICY "personel_dosya_yukle" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'personel' AND (storage.foldername(name))[1] = get_my_okul_id()::text
);
DROP POLICY IF EXISTS "personel_dosya_sil" ON storage.objects;
CREATE POLICY "personel_dosya_sil" ON storage.objects FOR DELETE USING (
  bucket_id = 'personel' AND (storage.foldername(name))[1] = get_my_okul_id()::text
);

-- ------------------------------------------------------------
-- 3. EK-6 denetim raporları (okul + ay başına bir rapor)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS denetim_raporlari (
  id              SERIAL PRIMARY KEY,
  okul_id         INTEGER NOT NULL REFERENCES okullar(id) ON DELETE CASCADE,
  yil             INTEGER NOT NULL,
  ay              INTEGER NOT NULL CHECK (ay BETWEEN 1 AND 12),
  denetim_tarihi  DATE NOT NULL DEFAULT CURRENT_DATE,
  denetciler      JSONB NOT NULL DEFAULT '[]',   -- [{ "ad": "...", "unvan": "..." }] — bir ya da iki denetçi
  baskan_ad       TEXT,                          -- Kulüp Yönetim Kurulu Başkanı (okul müdürü)
  cevaplar        JSONB NOT NULL DEFAULT '{}',   -- formdaki tüm alanlar
  durum           TEXT NOT NULL DEFAULT 'taslak' CHECK (durum IN ('taslak', 'imzalandi', 'teslim_edildi')),
  imzalandi_at    TIMESTAMPTZ,
  teslim_at       TIMESTAMPTZ,
  olusturan       UUID DEFAULT auth.uid(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (okul_id, yil, ay)
);
ALTER TABLE denetim_raporlari ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "denetim_raporlari_denetci" ON denetim_raporlari;
CREATE POLICY "denetim_raporlari_denetci" ON denetim_raporlari FOR ALL
  USING (denetim_okulu_mu(okul_id)) WITH CHECK (denetim_okulu_mu(okul_id));
-- Okul kendi raporunun durumunu görür (taslaklar hariç)
DROP POLICY IF EXISTS "denetim_raporlari_okul_oku" ON denetim_raporlari;
CREATE POLICY "denetim_raporlari_okul_oku" ON denetim_raporlari FOR SELECT
  USING (okul_id = get_my_okul_id() AND durum <> 'taslak');

-- ------------------------------------------------------------
-- 4. Okul bildirimleri
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS okul_bildirimleri (
  id          SERIAL PRIMARY KEY,
  okul_id     INTEGER NOT NULL REFERENCES okullar(id) ON DELETE CASCADE,
  baslik      TEXT NOT NULL,
  icerik      TEXT NOT NULL,
  kaynak      TEXT NOT NULL DEFAULT 'duyuru' CHECK (kaynak IN ('duyuru', 'denetim_raporu')),
  son_tarih   TIMESTAMPTZ,                 -- duyuruda belirtilen son tarih/saat (geçince panelde gösterilmez)
  okundu      BOOLEAN NOT NULL DEFAULT false,
  grup        UUID,                        -- aynı duyurunun okullara giden kopyaları
  gonderen    UUID DEFAULT auth.uid(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS okul_bildirimleri_okul_idx ON okul_bildirimleri (okul_id, okundu);
ALTER TABLE okul_bildirimleri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "okul_bildirimleri_okul_oku" ON okul_bildirimleri;
CREATE POLICY "okul_bildirimleri_okul_oku" ON okul_bildirimleri FOR SELECT USING (okul_id = get_my_okul_id());
DROP POLICY IF EXISTS "okul_bildirimleri_denetci_oku" ON okul_bildirimleri;
CREATE POLICY "okul_bildirimleri_denetci_oku" ON okul_bildirimleri FOR SELECT USING (denetim_okulu_mu(okul_id));

-- Okul bildirimi okundu işaretler (başka alanı değiştiremez)
CREATE OR REPLACE FUNCTION okul_bildirimi_okundu(p_id INTEGER)
RETURNS VOID AS $$
  UPDATE okul_bildirimleri SET okundu = true WHERE id = p_id AND okul_id = get_my_okul_id();
$$ LANGUAGE sql SECURITY DEFINER;

-- ------------------------------------------------------------
-- 5. İşlemler
-- ------------------------------------------------------------
-- Denetçi: imzalı raporu işaretler → okula "denetim tamamlandı" bildirimi gider
CREATE OR REPLACE FUNCTION denetim_raporu_imzalandi(p_rapor_id INTEGER)
RETURNS VOID AS $$
DECLARE r denetim_raporlari%ROWTYPE;
BEGIN
  SELECT * INTO r FROM denetim_raporlari WHERE id = p_rapor_id;
  IF r.id IS NULL OR NOT denetim_okulu_mu(r.okul_id) THEN RAISE EXCEPTION 'Yetkiniz yok'; END IF;
  IF r.durum <> 'taslak' THEN RETURN; END IF;
  UPDATE denetim_raporlari SET durum = 'imzalandi', imzalandi_at = NOW(), updated_at = NOW() WHERE id = p_rapor_id;
  INSERT INTO okul_bildirimleri (okul_id, baslik, icerik, kaynak)
  VALUES (r.okul_id, 'Denetiminiz tamamlandı',
    'Ek-6 Çocuk Kulübü Denetim Formu imzalandı. Denetim raporunuzu İl Millî Eğitim Müdürlüğünden alabilirsiniz.',
    'denetim_raporu');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Denetçi: raporun okula teslim edildiğini işaretler
CREATE OR REPLACE FUNCTION denetim_raporu_teslim(p_rapor_id INTEGER)
RETURNS VOID AS $$
DECLARE v_okul INTEGER;
BEGIN
  SELECT okul_id INTO v_okul FROM denetim_raporlari WHERE id = p_rapor_id;
  IF v_okul IS NULL OR NOT denetim_okulu_mu(v_okul) THEN RAISE EXCEPTION 'Yetkiniz yok'; END IF;
  UPDATE denetim_raporlari SET durum = 'teslim_edildi', teslim_at = NOW(), updated_at = NOW()
   WHERE id = p_rapor_id AND durum = 'imzalandi';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Denetçi: ilindeki okullara duyuru gönderir (yetkisi olmayan okullar atlanır). Gönderilen okul sayısını döner.
CREATE OR REPLACE FUNCTION denetci_duyuru_gonder(p_okul_ids INTEGER[], p_baslik TEXT, p_icerik TEXT, p_son_tarih TIMESTAMPTZ)
RETURNS INTEGER AS $$
DECLARE v_grup UUID := gen_random_uuid(); v_sayi INTEGER;
BEGIN
  IF NOT denetim_yetkilisi_mi() THEN RAISE EXCEPTION 'Yetkiniz yok'; END IF;
  IF COALESCE(TRIM(p_baslik), '') = '' OR COALESCE(TRIM(p_icerik), '') = '' THEN RAISE EXCEPTION 'Başlık ve mesaj zorunlu'; END IF;
  INSERT INTO okul_bildirimleri (okul_id, baslik, icerik, kaynak, son_tarih, grup)
  SELECT o, TRIM(p_baslik), TRIM(p_icerik), 'duyuru', p_son_tarih, v_grup
    FROM unnest(p_okul_ids) AS o WHERE denetim_okulu_mu(o);
  GET DIAGNOSTICS v_sayi = ROW_COUNT;
  RETURN v_sayi;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------
-- 6. API önbelleğini yenile
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
