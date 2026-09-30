-- ============================================================
-- TAHSİLAT TAKİP MODÜLÜ (Okul / Kulüp / Kırtasiye / Etkinlik vb.)
-- Memurun veli/öğrenciden topladığı paraların kategori bazlı takibi.
-- Supabase SQL Editor'da çalıştırın.
-- ============================================================

-- 1) KATEGORİLER --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tahsilat_kategorileri (
    id                BIGSERIAL PRIMARY KEY,
    ad                TEXT    NOT NULL,
    -- Dönem tipi: aylik | donemlik | tek_seferlik
    tip               TEXT    NOT NULL DEFAULT 'aylik'
                        CHECK (tip IN ('aylik', 'donemlik', 'tek_seferlik')),
    -- Veri kaynağı: manuel (memur işaretler) | otomatik_kulup (mevcut aidattan salt-okunur)
    veri_kaynagi      TEXT    NOT NULL DEFAULT 'manuel'
                        CHECK (veri_kaynagi IN ('manuel', 'otomatik_kulup')),
    -- Kapsam: tumu (tüm öğrenciler) | secili (üyelik tablosundakiler)
    kapsam            TEXT    NOT NULL DEFAULT 'tumu'
                        CHECK (kapsam IN ('tumu', 'secili')),
    varsayilan_tutar  NUMERIC(12,2),
    sira              INTEGER DEFAULT 0,
    aktif             BOOLEAN DEFAULT TRUE,
    okul_id           INTEGER REFERENCES okullar(id) ON DELETE CASCADE,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 2) KATEGORİ-ÖĞRENCİ ÜYELİĞİ (kapsam = 'secili' olan kategoriler için) --------
CREATE TABLE IF NOT EXISTS tahsilat_kategori_ogrenci (
    id           BIGSERIAL PRIMARY KEY,
    kategori_id  BIGINT  REFERENCES tahsilat_kategorileri(id) ON DELETE CASCADE,
    ogrenci_id   BIGINT  REFERENCES ogrenciler(id) ON DELETE CASCADE,
    okul_id      INTEGER REFERENCES okullar(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (kategori_id, ogrenci_id)
);

-- 3) TAHSİLAT KAYITLARI (satır varsa = o dönem ÖDENDİ) -------------------------
CREATE TABLE IF NOT EXISTS tahsilat_kayitlari (
    id           BIGSERIAL PRIMARY KEY,
    kategori_id  BIGINT  REFERENCES tahsilat_kategorileri(id) ON DELETE CASCADE,
    ogrenci_id   BIGINT  REFERENCES ogrenciler(id) ON DELETE CASCADE,
    -- Dönem etiketi: aylik -> '2025-09', donemlik -> 'D1'/'D2', tek_seferlik -> '-'
    donem        TEXT    NOT NULL DEFAULT '-',
    tutar        NUMERIC(12,2),
    tarih        DATE,
    aciklama     TEXT,
    okul_id      INTEGER REFERENCES okullar(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (kategori_id, ogrenci_id, donem)
);

CREATE INDEX IF NOT EXISTS idx_tahsilat_kayitlari_kategori ON tahsilat_kayitlari (kategori_id, donem);
CREATE INDEX IF NOT EXISTS idx_tahsilat_kayitlari_okul    ON tahsilat_kayitlari (okul_id);
CREATE INDEX IF NOT EXISTS idx_tahsilat_kat_ogrenci_kat   ON tahsilat_kategori_ogrenci (kategori_id);

-- ============================================================
-- OKUL BAZLI RLS (ders_programi deseniyle aynı: get_my_okul_id / get_my_il_id)
-- ============================================================

-- Ortak okul_id atama tetikleyicisi (okul_id boş gelirse mevcut kullanıcının okulunu ata)
CREATE OR REPLACE FUNCTION auto_set_okul_id_tahsilat()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.okul_id IS NULL THEN
    NEW.okul_id := get_my_okul_id();
  END IF;
  IF NEW.okul_id IS NULL THEN
    RAISE EXCEPTION 'Kullanıcı okul bilgisi bulunamadı. Lütfen giriş yaptığınızdan emin olun.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --- tahsilat_kategorileri ---
ALTER TABLE tahsilat_kategorileri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "okul_tk_select" ON tahsilat_kategorileri;
DROP POLICY IF EXISTS "okul_tk_insert" ON tahsilat_kategorileri;
DROP POLICY IF EXISTS "okul_tk_update" ON tahsilat_kategorileri;
DROP POLICY IF EXISTS "okul_tk_delete" ON tahsilat_kategorileri;

CREATE POLICY "okul_tk_select" ON tahsilat_kategorileri FOR SELECT
  USING (
    okul_id = get_my_okul_id()
    OR (get_my_il_id() IS NOT NULL AND okul_id IN (SELECT id FROM okullar WHERE il_id = get_my_il_id()))
  );
CREATE POLICY "okul_tk_insert" ON tahsilat_kategorileri FOR INSERT
  WITH CHECK (okul_id = get_my_okul_id() OR okul_id IS NULL);
CREATE POLICY "okul_tk_update" ON tahsilat_kategorileri FOR UPDATE
  USING (okul_id = get_my_okul_id()) WITH CHECK (okul_id = get_my_okul_id());
CREATE POLICY "okul_tk_delete" ON tahsilat_kategorileri FOR DELETE
  USING (okul_id = get_my_okul_id());

DROP TRIGGER IF EXISTS trg_okul_id_tk ON tahsilat_kategorileri;
CREATE TRIGGER trg_okul_id_tk BEFORE INSERT ON tahsilat_kategorileri
  FOR EACH ROW EXECUTE FUNCTION auto_set_okul_id_tahsilat();

-- --- tahsilat_kategori_ogrenci ---
ALTER TABLE tahsilat_kategori_ogrenci ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "okul_tko_select" ON tahsilat_kategori_ogrenci;
DROP POLICY IF EXISTS "okul_tko_insert" ON tahsilat_kategori_ogrenci;
DROP POLICY IF EXISTS "okul_tko_update" ON tahsilat_kategori_ogrenci;
DROP POLICY IF EXISTS "okul_tko_delete" ON tahsilat_kategori_ogrenci;

CREATE POLICY "okul_tko_select" ON tahsilat_kategori_ogrenci FOR SELECT
  USING (
    okul_id = get_my_okul_id()
    OR (get_my_il_id() IS NOT NULL AND okul_id IN (SELECT id FROM okullar WHERE il_id = get_my_il_id()))
  );
CREATE POLICY "okul_tko_insert" ON tahsilat_kategori_ogrenci FOR INSERT
  WITH CHECK (okul_id = get_my_okul_id() OR okul_id IS NULL);
CREATE POLICY "okul_tko_update" ON tahsilat_kategori_ogrenci FOR UPDATE
  USING (okul_id = get_my_okul_id()) WITH CHECK (okul_id = get_my_okul_id());
CREATE POLICY "okul_tko_delete" ON tahsilat_kategori_ogrenci FOR DELETE
  USING (okul_id = get_my_okul_id());

DROP TRIGGER IF EXISTS trg_okul_id_tko ON tahsilat_kategori_ogrenci;
CREATE TRIGGER trg_okul_id_tko BEFORE INSERT ON tahsilat_kategori_ogrenci
  FOR EACH ROW EXECUTE FUNCTION auto_set_okul_id_tahsilat();

-- --- tahsilat_kayitlari ---
ALTER TABLE tahsilat_kayitlari ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "okul_tky_select" ON tahsilat_kayitlari;
DROP POLICY IF EXISTS "okul_tky_insert" ON tahsilat_kayitlari;
DROP POLICY IF EXISTS "okul_tky_update" ON tahsilat_kayitlari;
DROP POLICY IF EXISTS "okul_tky_delete" ON tahsilat_kayitlari;

CREATE POLICY "okul_tky_select" ON tahsilat_kayitlari FOR SELECT
  USING (
    okul_id = get_my_okul_id()
    OR (get_my_il_id() IS NOT NULL AND okul_id IN (SELECT id FROM okullar WHERE il_id = get_my_il_id()))
  );
CREATE POLICY "okul_tky_insert" ON tahsilat_kayitlari FOR INSERT
  WITH CHECK (okul_id = get_my_okul_id() OR okul_id IS NULL);
CREATE POLICY "okul_tky_update" ON tahsilat_kayitlari FOR UPDATE
  USING (okul_id = get_my_okul_id()) WITH CHECK (okul_id = get_my_okul_id());
CREATE POLICY "okul_tky_delete" ON tahsilat_kayitlari FOR DELETE
  USING (okul_id = get_my_okul_id());

DROP TRIGGER IF EXISTS trg_okul_id_tky ON tahsilat_kayitlari;
CREATE TRIGGER trg_okul_id_tky BEFORE INSERT ON tahsilat_kayitlari
  FOR EACH ROW EXECUTE FUNCTION auto_set_okul_id_tahsilat();

-- Şema önbelleğini yenile
NOTIFY pgrst, 'reload schema';

SELECT 'Tahsilat Takip tabloları, RLS ve trigger''lar başarıyla oluşturuldu' AS mesaj;
