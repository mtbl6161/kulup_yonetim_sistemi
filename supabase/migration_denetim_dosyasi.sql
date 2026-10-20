-- ============================================================
-- Tekrar çalıştırmak güvenlidir: her adım "IF NOT EXISTS / OR REPLACE / DROP IF EXISTS" ile yazıldı.
-- DENETİM DOSYASI (aylık evrak teslimi)
-- Okullar her ay denetim evraklarını yükler / sistemden otomatik üretir,
-- "Denetime Gönder" der; il denetim yetkilisi görür, indirir, onaylar ya da iade eder.
-- Evrak listesini il denetim yetkilisi düzenler (il bazında).
-- Supabase SQL Editor'da bir kez çalıştırın.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Yardımcı fonksiyonlar
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION denetim_yetkilisi_mi()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiller WHERE id = auth.uid() AND rol = 'denetim_yetkilisi' AND il_id IS NOT NULL)
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Okul yöneticisinin okulunun ili
CREATE OR REPLACE FUNCTION get_my_okul_il_id()
RETURNS INTEGER AS $$
  SELECT o.il_id FROM okullar o JOIN profiller p ON p.okul_id = o.id WHERE p.id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Denetim yetkilisinin ilindeki okul mu?
CREATE OR REPLACE FUNCTION denetim_okulu_mu(p_okul_id INTEGER)
RETURNS BOOLEAN AS $$
  SELECT denetim_yetkilisi_mi() AND EXISTS (SELECT 1 FROM okullar WHERE id = p_okul_id AND il_id = get_my_il_id())
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------
-- 1. Evrak listesi (il bazında, denetçi düzenler)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS denetim_maddeleri (
  id            SERIAL PRIMARY KEY,
  il_id         INTEGER NOT NULL REFERENCES iller(id),
  sira_no       INTEGER NOT NULL,
  baslik        TEXT NOT NULL,
  aciklama      TEXT,
  tip           TEXT NOT NULL DEFAULT 'yukleme' CHECK (tip IN ('yukleme', 'otomatik')),
  otomatik_kod  TEXT,           -- personel_listesi, puantaj_sgk, puantaj_kadrolu, bordro_sgk, bordro_kadrolu, bilanco
  yillik        BOOLEAN NOT NULL DEFAULT false,  -- eğitim yılında bir kez yüklenir (örn. açılış onayı)
  zorunlu       BOOLEAN NOT NULL DEFAULT true,
  aktif         BOOLEAN NOT NULL DEFAULT true,   -- silmek yerine pasife alınır (geçmiş teslimler bozulmasın)
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS denetim_maddeleri_il_idx ON denetim_maddeleri (il_id, sira_no);

ALTER TABLE denetim_maddeleri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "denetim_maddeleri_oku" ON denetim_maddeleri;
CREATE POLICY "denetim_maddeleri_oku" ON denetim_maddeleri FOR SELECT USING (
  il_id = get_my_okul_il_id() OR (denetim_yetkilisi_mi() AND il_id = get_my_il_id())
);
DROP POLICY IF EXISTS "denetim_maddeleri_ekle" ON denetim_maddeleri;
CREATE POLICY "denetim_maddeleri_ekle" ON denetim_maddeleri FOR INSERT WITH CHECK (
  denetim_yetkilisi_mi() AND il_id = get_my_il_id()
);
DROP POLICY IF EXISTS "denetim_maddeleri_guncelle" ON denetim_maddeleri;
CREATE POLICY "denetim_maddeleri_guncelle" ON denetim_maddeleri FOR UPDATE
  USING (denetim_yetkilisi_mi() AND il_id = get_my_il_id())
  WITH CHECK (denetim_yetkilisi_mi() AND il_id = get_my_il_id());

-- İlin listesi boşsa varsayılan listeyi (Manisa İl MEM 2026) oluşturur. Okul da denetçi de çağırabilir.
CREATE OR REPLACE FUNCTION denetim_maddeleri_hazirla()
RETURNS VOID AS $$
DECLARE v_il INTEGER;
BEGIN
  v_il := COALESCE(CASE WHEN denetim_yetkilisi_mi() THEN get_my_il_id() END, get_my_okul_il_id());
  IF v_il IS NULL THEN RETURN; END IF;
  -- Eşzamanlı çağrılar listeyi iki kez oluşturmasın
  PERFORM pg_advisory_xact_lock(hashtext('denetim_maddeleri_hazirla'), v_il);
  IF EXISTS (SELECT 1 FROM denetim_maddeleri WHERE il_id = v_il) THEN RETURN; END IF;
  INSERT INTO denetim_maddeleri (il_id, sira_no, baslik, tip, otomatik_kod, yillik) VALUES
    (v_il, 1,  'Kulüp Açılış Onayı ve varsa Ek Onay', 'yukleme', NULL, true),
    (v_il, 2,  'Kulüpte görevli personel listesi ve görevleri', 'otomatik', 'personel_listesi', false),
    (v_il, 3,  'Ay başı – ay sonu banka hesap hareketleri (Excel formatında)', 'yukleme', NULL, false),
    (v_il, 4,  'Sigortalı çalışan personele ait aylık puantaj', 'otomatik', 'puantaj_sgk', false),
    (v_il, 5,  'Kadrolu çalışan personele ait aylık puantaj', 'otomatik', 'puantaj_kadrolu', false),
    (v_il, 6,  'Sigortalı çalışan personele ait aylık bordro', 'otomatik', 'bordro_sgk', false),
    (v_il, 7,  'Kadrolu çalışan personele ait aylık bordro', 'otomatik', 'bordro_kadrolu', false),
    (v_il, 8,  'Sigortalı çalışan personele ait 4/A hizmet listesi', 'yukleme', NULL, false),
    (v_il, 9,  'Kadrolu personele ait aylık Gelir ve Damga Vergisi istisna raporu (KBS''den alınmış)', 'yukleme', NULL, false),
    (v_il, 11, 'Aylık Muhtasar SGK Beyannamesi, SGK tahakkuk fişi ve hizmet listesi', 'yukleme', NULL, false),
    (v_il, 12, 'Aylık ücret dağıtımını gösteren bilanço', 'otomatik', 'bilanco', false),
    (v_il, 13, 'Kadrolu personele ödenen ücretlerin vergi matrahlarına dahil edildiğini gösteren belge', 'yukleme', NULL, false),
    (v_il, 14, 'Çocuk kulübünün vergi ve SGK borcu olmadığına dair borcu yoktur belgesi', 'yukleme', NULL, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------
-- 2. Aylık teslim (okul + yıl + ay başına bir kayıt)
-- durum: taslak → gonderildi → onaylandi | iade (iade → okul düzeltir → gonderildi)
-- Durum yalnızca aşağıdaki fonksiyonlarla değişir (doğrudan güncelleme yetkisi yok).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS denetim_teslimleri (
  id               SERIAL PRIMARY KEY,
  okul_id          INTEGER NOT NULL REFERENCES okullar(id) ON DELETE CASCADE,
  yil              INTEGER NOT NULL,
  ay               INTEGER NOT NULL CHECK (ay BETWEEN 1 AND 12),
  durum            TEXT NOT NULL DEFAULT 'taslak' CHECK (durum IN ('taslak', 'gonderildi', 'onaylandi', 'iade')),
  gonderim_tarihi  TIMESTAMPTZ,
  karar_tarihi     TIMESTAMPTZ,
  karar_veren      UUID REFERENCES auth.users(id),
  denetci_notu     TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (okul_id, yil, ay)
);

ALTER TABLE denetim_teslimleri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "denetim_teslimleri_oku" ON denetim_teslimleri;
CREATE POLICY "denetim_teslimleri_oku" ON denetim_teslimleri FOR SELECT USING (
  okul_id = get_my_okul_id() OR denetim_okulu_mu(okul_id)
);

-- Dosya düzenlenebilir mi? (taslak / iade ya da henüz teslim kaydı yok)
CREATE OR REPLACE FUNCTION denetim_dosyasi_acik_mi(p_okul_id INTEGER, p_yil INTEGER, p_ay INTEGER)
RETURNS BOOLEAN AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM denetim_teslimleri
    WHERE okul_id = p_okul_id AND yil = p_yil AND ay = p_ay AND durum IN ('gonderildi', 'onaylandi')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------
-- 3. Belgeler (yüklenen dosyalar + gönderimde alınan otomatik kopyalar)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS denetim_belgeleri (
  id            SERIAL PRIMARY KEY,
  okul_id       INTEGER NOT NULL REFERENCES okullar(id) ON DELETE CASCADE,
  yil           INTEGER NOT NULL,
  ay            INTEGER NOT NULL CHECK (ay BETWEEN 1 AND 12),
  madde_id      INTEGER NOT NULL REFERENCES denetim_maddeleri(id),
  kaynak        TEXT NOT NULL DEFAULT 'yukleme' CHECK (kaynak IN ('yukleme', 'otomatik')),
  dosya_yolu    TEXT NOT NULL,           -- storage: denetim/<okul_id>/<yil>-<ay>/<madde_id>/<dosya>
  dosya_adi     TEXT NOT NULL,
  boyut         BIGINT,
  mime          TEXT,
  durum         TEXT NOT NULL DEFAULT 'bekliyor' CHECK (durum IN ('bekliyor', 'onaylandi', 'iade')),
  denetci_notu  TEXT,
  yukleyen      UUID DEFAULT auth.uid(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS denetim_belgeleri_okul_donem_idx ON denetim_belgeleri (okul_id, yil, ay);

ALTER TABLE denetim_belgeleri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "denetim_belgeleri_oku" ON denetim_belgeleri;
CREATE POLICY "denetim_belgeleri_oku" ON denetim_belgeleri FOR SELECT USING (
  okul_id = get_my_okul_id() OR denetim_okulu_mu(okul_id)
);
DROP POLICY IF EXISTS "denetim_belgeleri_ekle" ON denetim_belgeleri;
CREATE POLICY "denetim_belgeleri_ekle" ON denetim_belgeleri FOR INSERT WITH CHECK (
  okul_id = get_my_okul_id() AND kaynak = 'yukleme' AND durum = 'bekliyor'
  AND denetim_dosyasi_acik_mi(okul_id, yil, ay)
);
DROP POLICY IF EXISTS "denetim_belgeleri_sil" ON denetim_belgeleri;
CREATE POLICY "denetim_belgeleri_sil" ON denetim_belgeleri FOR DELETE USING (
  okul_id = get_my_okul_id() AND kaynak = 'yukleme' AND durum <> 'onaylandi'
  AND denetim_dosyasi_acik_mi(okul_id, yil, ay)
);
-- Denetçi belge bazında onay/iade verir
DROP POLICY IF EXISTS "denetim_belgeleri_karar" ON denetim_belgeleri;
CREATE POLICY "denetim_belgeleri_karar" ON denetim_belgeleri FOR UPDATE
  USING (denetim_okulu_mu(okul_id)) WITH CHECK (denetim_okulu_mu(okul_id));

-- ------------------------------------------------------------
-- 4. İşlemler
-- ------------------------------------------------------------
-- Okul: otomatik belge kopyasını kaydeder (yalnızca gönderim sırasında, dosya açıkken)
CREATE OR REPLACE FUNCTION denetim_otomatik_kaydet(p_yil INTEGER, p_ay INTEGER, p_madde_id INTEGER, p_yol TEXT, p_ad TEXT, p_boyut BIGINT, p_mime TEXT)
RETURNS VOID AS $$
DECLARE v_okul INTEGER := get_my_okul_id();
BEGIN
  IF v_okul IS NULL THEN RAISE EXCEPTION 'Okul bulunamadı'; END IF;
  IF NOT denetim_dosyasi_acik_mi(v_okul, p_yil, p_ay) THEN RAISE EXCEPTION 'Dosya kilitli (denetime gönderilmiş)'; END IF;
  IF p_yol NOT LIKE v_okul || '/%' THEN RAISE EXCEPTION 'Geçersiz dosya yolu'; END IF;
  DELETE FROM denetim_belgeleri WHERE okul_id = v_okul AND yil = p_yil AND ay = p_ay AND madde_id = p_madde_id AND kaynak = 'otomatik';
  INSERT INTO denetim_belgeleri (okul_id, yil, ay, madde_id, kaynak, dosya_yolu, dosya_adi, boyut, mime)
  VALUES (v_okul, p_yil, p_ay, p_madde_id, 'otomatik', p_yol, p_ad, p_boyut, p_mime);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Okul: denetime gönderir (iade edilmiş belgeler bekliyor durumuna döner)
CREATE OR REPLACE FUNCTION denetim_gonder(p_yil INTEGER, p_ay INTEGER)
RETURNS VOID AS $$
DECLARE v_okul INTEGER := get_my_okul_id();
BEGIN
  IF v_okul IS NULL THEN RAISE EXCEPTION 'Okul bulunamadı'; END IF;
  IF NOT denetim_dosyasi_acik_mi(v_okul, p_yil, p_ay) THEN RAISE EXCEPTION 'Dosya zaten gönderilmiş'; END IF;
  UPDATE denetim_belgeleri SET durum = 'bekliyor' WHERE okul_id = v_okul AND yil = p_yil AND ay = p_ay AND durum = 'iade';
  INSERT INTO denetim_teslimleri (okul_id, yil, ay, durum, gonderim_tarihi)
  VALUES (v_okul, p_yil, p_ay, 'gonderildi', NOW())
  ON CONFLICT (okul_id, yil, ay) DO UPDATE SET durum = 'gonderildi', gonderim_tarihi = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Denetçi: dosyanın tamamını onaylar ya da iade eder
CREATE OR REPLACE FUNCTION denetim_karar(p_teslim_id INTEGER, p_durum TEXT, p_not TEXT)
RETURNS VOID AS $$
DECLARE v_okul INTEGER;
BEGIN
  IF p_durum NOT IN ('onaylandi', 'iade') THEN RAISE EXCEPTION 'Geçersiz karar'; END IF;
  SELECT okul_id INTO v_okul FROM denetim_teslimleri WHERE id = p_teslim_id;
  IF v_okul IS NULL OR NOT denetim_okulu_mu(v_okul) THEN RAISE EXCEPTION 'Yetkiniz yok'; END IF;
  UPDATE denetim_teslimleri
     SET durum = p_durum, denetci_notu = NULLIF(TRIM(p_not), ''), karar_tarihi = NOW(), karar_veren = auth.uid()
   WHERE id = p_teslim_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------
-- 5. Dosya deposu (gizli bucket) — yol: <okul_id>/<yil>-<ay>/<madde_id>/<dosya>
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('denetim', 'denetim', false, 10485760)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 10485760;

DROP POLICY IF EXISTS "denetim_dosya_oku" ON storage.objects;
CREATE POLICY "denetim_dosya_oku" ON storage.objects FOR SELECT USING (
  bucket_id = 'denetim' AND (
    (storage.foldername(name))[1] = get_my_okul_id()::text
    OR denetim_okulu_mu(((storage.foldername(name))[1])::integer)
  )
);
DROP POLICY IF EXISTS "denetim_dosya_yukle" ON storage.objects;
CREATE POLICY "denetim_dosya_yukle" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'denetim' AND (storage.foldername(name))[1] = get_my_okul_id()::text
);
DROP POLICY IF EXISTS "denetim_dosya_sil" ON storage.objects;
CREATE POLICY "denetim_dosya_sil" ON storage.objects FOR DELETE USING (
  bucket_id = 'denetim' AND (storage.foldername(name))[1] = get_my_okul_id()::text
);

-- ------------------------------------------------------------
-- 6. Denetçi, ilindeki okulların puantajını okuyabilir
--    (sistem belgelerini — puantaj cetveli, bilanço — güncel veriden görüntülemek için)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "denetim_puantaj_oku" ON puantaj;
CREATE POLICY "denetim_puantaj_oku" ON puantaj FOR SELECT USING (denetim_okulu_mu(okul_id));

-- ------------------------------------------------------------
-- 7. API önbelleğini yenile (yeni tablo/fonksiyonlar hemen görünsün)
-- ------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
