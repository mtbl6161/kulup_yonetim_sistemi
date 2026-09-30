-- ============================================================
-- İŞLETME HESABI DEFTERİ MODÜLÜ (Yasal gelir/gider defteri)
-- Banka hareketlerinden beslenen resmî defter + aylık özet.
-- Supabase SQL Editor'da çalıştırın.
-- ============================================================

-- 1) DEFTER HAREKETLERİ --------------------------------------------------------
CREATE TABLE IF NOT EXISTS isletme_defteri (
    id          BIGSERIAL PRIMARY KEY,
    tarih       DATE    NOT NULL,
    belge_no    TEXT,
    aciklama    TEXT,
    tutar       NUMERIC(14,2) NOT NULL,
    -- tur: gelir | gider
    tur         TEXT    NOT NULL CHECK (tur IN ('gelir', 'gider')),
    -- kaynak: manuel | banka
    kaynak      TEXT    NOT NULL DEFAULT 'manuel' CHECK (kaynak IN ('manuel', 'banka')),
    ay          INTEGER,
    yil         INTEGER,
    okul_id     INTEGER REFERENCES okullar(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_isletme_defteri_okul_yil ON isletme_defteri (okul_id, yil, ay);
CREATE INDEX IF NOT EXISTS idx_isletme_defteri_tur      ON isletme_defteri (yil, tur);

-- 2) YIL BAZLI DEVREDEN TUTAR (önceki yıldan devir) ----------------------------
CREATE TABLE IF NOT EXISTS isletme_devir (
    id              BIGSERIAL PRIMARY KEY,
    yil             INTEGER NOT NULL,
    devreden_tutar  NUMERIC(14,2) NOT NULL DEFAULT 0,
    okul_id         INTEGER REFERENCES okullar(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (yil, okul_id)
);

-- ============================================================
-- OKUL BAZLI RLS (ders_programi deseniyle aynı)
-- ============================================================
CREATE OR REPLACE FUNCTION auto_set_okul_id_isletme()
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

-- --- isletme_defteri ---
ALTER TABLE isletme_defteri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "okul_id_select" ON isletme_defteri;
DROP POLICY IF EXISTS "okul_id_insert" ON isletme_defteri;
DROP POLICY IF EXISTS "okul_id_update" ON isletme_defteri;
DROP POLICY IF EXISTS "okul_id_delete" ON isletme_defteri;

CREATE POLICY "okul_id_select" ON isletme_defteri FOR SELECT
  USING (
    okul_id = get_my_okul_id()
    OR (get_my_il_id() IS NOT NULL AND okul_id IN (SELECT id FROM okullar WHERE il_id = get_my_il_id()))
  );
CREATE POLICY "okul_id_insert" ON isletme_defteri FOR INSERT
  WITH CHECK (okul_id = get_my_okul_id() OR okul_id IS NULL);
CREATE POLICY "okul_id_update" ON isletme_defteri FOR UPDATE
  USING (okul_id = get_my_okul_id()) WITH CHECK (okul_id = get_my_okul_id());
CREATE POLICY "okul_id_delete" ON isletme_defteri FOR DELETE
  USING (okul_id = get_my_okul_id());

DROP TRIGGER IF EXISTS trg_okul_id_isletme_defteri ON isletme_defteri;
CREATE TRIGGER trg_okul_id_isletme_defteri BEFORE INSERT ON isletme_defteri
  FOR EACH ROW EXECUTE FUNCTION auto_set_okul_id_isletme();

-- --- isletme_devir ---
ALTER TABLE isletme_devir ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "okul_id_select" ON isletme_devir;
DROP POLICY IF EXISTS "okul_id_insert" ON isletme_devir;
DROP POLICY IF EXISTS "okul_id_update" ON isletme_devir;
DROP POLICY IF EXISTS "okul_id_delete" ON isletme_devir;

CREATE POLICY "okul_id_select" ON isletme_devir FOR SELECT
  USING (
    okul_id = get_my_okul_id()
    OR (get_my_il_id() IS NOT NULL AND okul_id IN (SELECT id FROM okullar WHERE il_id = get_my_il_id()))
  );
CREATE POLICY "okul_id_insert" ON isletme_devir FOR INSERT
  WITH CHECK (okul_id = get_my_okul_id() OR okul_id IS NULL);
CREATE POLICY "okul_id_update" ON isletme_devir FOR UPDATE
  USING (okul_id = get_my_okul_id()) WITH CHECK (okul_id = get_my_okul_id());
CREATE POLICY "okul_id_delete" ON isletme_devir FOR DELETE
  USING (okul_id = get_my_okul_id());

DROP TRIGGER IF EXISTS trg_okul_id_isletme_devir ON isletme_devir;
CREATE TRIGGER trg_okul_id_isletme_devir BEFORE INSERT ON isletme_devir
  FOR EACH ROW EXECUTE FUNCTION auto_set_okul_id_isletme();

NOTIFY pgrst, 'reload schema';

SELECT 'İşletme Hesabı Defteri tabloları, RLS ve trigger''lar başarıyla oluşturuldu' AS mesaj;
