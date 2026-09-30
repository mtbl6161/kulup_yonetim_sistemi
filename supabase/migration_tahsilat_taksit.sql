-- ============================================================
-- TAHSİLAT TAKİP — ÖĞRENCİ BAZLI TAKSİT PLANI
-- Okul ödemelerinde (manuel, tek seferlik / dönemlik kategoriler) isteyen öğrenciye
-- özel taksit planı açılır; diğer öğrenciler peşin öder. Kulüp aidatı taksitlendirilmez.
--
-- Plan: bir öğrencinin bir kategorideki bir dönemi (donem: '-' veya '2026-D1') için
--   vadeler  : ["2026-10-15","2026-11-15",...]  (ISO tarih)
--   tutarlar : [500, 500, 500]                  (her taksitin tutarı)
-- Ödenen taksitler tahsilat_kayitlari'na donem = '<dönem>/T<n>' ile yazılır (ör. '-/T2', '2026-D1/T1').
-- Supabase SQL Editor'da çalıştırın (migration_tahsilat_takip.sql sonrası).
-- ============================================================

CREATE TABLE IF NOT EXISTS tahsilat_taksit_planlari (
    id           BIGSERIAL PRIMARY KEY,
    kategori_id  BIGINT  REFERENCES tahsilat_kategorileri(id) ON DELETE CASCADE,
    ogrenci_id   BIGINT  REFERENCES ogrenciler(id) ON DELETE CASCADE,
    donem        TEXT    NOT NULL DEFAULT '-',
    vadeler      JSONB   NOT NULL,
    tutarlar     JSONB   NOT NULL,
    aciklama     TEXT,
    okul_id      INTEGER REFERENCES okullar(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (kategori_id, ogrenci_id, donem)
);

CREATE INDEX IF NOT EXISTS idx_taksit_plan_kategori ON tahsilat_taksit_planlari (kategori_id, donem);

-- --- RLS (tahsilat_kayitlari ile aynı desen) ---
ALTER TABLE tahsilat_taksit_planlari ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "okul_ttp_select" ON tahsilat_taksit_planlari;
DROP POLICY IF EXISTS "okul_ttp_insert" ON tahsilat_taksit_planlari;
DROP POLICY IF EXISTS "okul_ttp_update" ON tahsilat_taksit_planlari;
DROP POLICY IF EXISTS "okul_ttp_delete" ON tahsilat_taksit_planlari;

CREATE POLICY "okul_ttp_select" ON tahsilat_taksit_planlari FOR SELECT
  USING (
    okul_id = get_my_okul_id()
    OR (get_my_il_id() IS NOT NULL AND okul_id IN (SELECT id FROM okullar WHERE il_id = get_my_il_id()))
  );
CREATE POLICY "okul_ttp_insert" ON tahsilat_taksit_planlari FOR INSERT
  WITH CHECK (okul_id = get_my_okul_id() OR okul_id IS NULL);
CREATE POLICY "okul_ttp_update" ON tahsilat_taksit_planlari FOR UPDATE
  USING (okul_id = get_my_okul_id()) WITH CHECK (okul_id = get_my_okul_id());
CREATE POLICY "okul_ttp_delete" ON tahsilat_taksit_planlari FOR DELETE
  USING (okul_id = get_my_okul_id());

DROP TRIGGER IF EXISTS trg_okul_id_ttp ON tahsilat_taksit_planlari;
CREATE TRIGGER trg_okul_id_ttp BEFORE INSERT ON tahsilat_taksit_planlari
  FOR EACH ROW EXECUTE FUNCTION auto_set_okul_id_tahsilat();

NOTIFY pgrst, 'reload schema';

SELECT 'Taksit planı tablosu, RLS ve trigger başarıyla oluşturuldu' AS mesaj;
