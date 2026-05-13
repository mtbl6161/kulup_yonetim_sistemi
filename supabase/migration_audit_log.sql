-- ============================================================
-- AUDIT LOG TABLOSU
-- Supabase SQL Editor'da çalıştırın.
-- migration_multiuser.sql daha önce uygulanmış olmalıdır.
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id           BIGSERIAL PRIMARY KEY,
  okul_id      INTEGER REFERENCES okullar(id) ON DELETE CASCADE,
  kullanici_id UUID,
  islem        TEXT NOT NULL,   -- ekle | guncelle | sil | import | hesapla | ode
  tablo        TEXT NOT NULL,   -- ogrenciler | personel | tahsilat | bordro | giderler | ayarlar
  kayit_id     BIGINT,
  aciklama     TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- İndeksler (hızlı sorgulama için)
CREATE INDEX IF NOT EXISTS idx_audit_okul    ON audit_log (okul_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_tablo   ON audit_log (tablo);

-- RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_goruntule" ON audit_log;
DROP POLICY IF EXISTS "audit_ekle"      ON audit_log;

-- SELECT: Sadece super_admin service_role üzerinden okuyabilir (RLS bypass).
-- Normal kullanıcılar audit_log'u doğrudan okuyamaz; /api/admin/audit endpoint'i kullanılır.
-- (Önceki SELECT policy kaldırıldı — sadece INSERT yetkisi tutuldu)

-- INSERT: Sadece kendi okulu için log ekleyebilir
CREATE POLICY "audit_ekle"
  ON audit_log FOR INSERT
  WITH CHECK (okul_id = get_my_okul_id());

-- Trigger: okul_id ve kullanici_id'yi otomatik ata
CREATE OR REPLACE FUNCTION auto_set_audit_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.okul_id IS NULL THEN
    NEW.okul_id := get_my_okul_id();
  END IF;
  IF NEW.kullanici_id IS NULL THEN
    NEW.kullanici_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_fields ON audit_log;
CREATE TRIGGER trg_audit_fields
  BEFORE INSERT ON audit_log
  FOR EACH ROW EXECUTE FUNCTION auto_set_audit_fields();

-- Doğrulama
SELECT 'audit_log tablosu hazır' AS durum;
