-- ============================================================
-- SGK EKSİK GÜN NEDENLERİ
-- Aylık prim ve hizmet belgesinde (APHB) 30 günden az bildirilen sigortalı için
-- eksik gün nedeni kodu (01 İstirahat, 02 Ücretsiz izin, 13 Diğer, ...) ve açıklaması.
-- Bordro her hesaplamada silinip yeniden yazıldığı için ayrı tabloda tutulur.
-- Supabase SQL Editor'da çalıştırın (migration_tahsilat_takip.sql sonrası; trigger fonksiyonu oradan gelir).
-- ============================================================

CREATE TABLE IF NOT EXISTS sgk_eksik_gun (
    id           BIGSERIAL PRIMARY KEY,
    personel_id  BIGINT  REFERENCES personel(id) ON DELETE CASCADE,
    yil          INTEGER NOT NULL,
    ay           INTEGER NOT NULL CHECK (ay BETWEEN 1 AND 12),
    kod          TEXT    NOT NULL,
    aciklama     TEXT,
    okul_id      INTEGER REFERENCES okullar(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (personel_id, yil, ay)
);

CREATE INDEX IF NOT EXISTS idx_sgk_eksik_gun_donem ON sgk_eksik_gun (okul_id, yil, ay);

-- --- RLS (tahsilat tabloları ile aynı desen) ---
ALTER TABLE sgk_eksik_gun ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "okul_seg_select" ON sgk_eksik_gun;
DROP POLICY IF EXISTS "okul_seg_insert" ON sgk_eksik_gun;
DROP POLICY IF EXISTS "okul_seg_update" ON sgk_eksik_gun;
DROP POLICY IF EXISTS "okul_seg_delete" ON sgk_eksik_gun;

CREATE POLICY "okul_seg_select" ON sgk_eksik_gun FOR SELECT
  USING (
    okul_id = get_my_okul_id()
    OR (get_my_il_id() IS NOT NULL AND okul_id IN (SELECT id FROM okullar WHERE il_id = get_my_il_id()))
  );
CREATE POLICY "okul_seg_insert" ON sgk_eksik_gun FOR INSERT
  WITH CHECK (okul_id = get_my_okul_id() OR okul_id IS NULL);
CREATE POLICY "okul_seg_update" ON sgk_eksik_gun FOR UPDATE
  USING (okul_id = get_my_okul_id()) WITH CHECK (okul_id = get_my_okul_id());
CREATE POLICY "okul_seg_delete" ON sgk_eksik_gun FOR DELETE
  USING (okul_id = get_my_okul_id());

DROP TRIGGER IF EXISTS trg_okul_id_seg ON sgk_eksik_gun;
CREATE TRIGGER trg_okul_id_seg BEFORE INSERT ON sgk_eksik_gun
  FOR EACH ROW EXECUTE FUNCTION auto_set_okul_id_tahsilat();

NOTIFY pgrst, 'reload schema';

SELECT 'SGK eksik gün tablosu, RLS ve trigger başarıyla oluşturuldu' AS mesaj;
