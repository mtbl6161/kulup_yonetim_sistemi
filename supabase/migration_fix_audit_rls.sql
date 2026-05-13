-- ============================================================
-- AUDIT LOG RLS VE TRIGGER FIX
-- Supabase SQL Editor'da çalıştırın.
-- ============================================================

-- 1. RLS Etkinleştir
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 2. Eski Politikaları Temizle
DROP POLICY IF EXISTS "allow_all_audit_log" ON audit_log;
DROP POLICY IF EXISTS "okul_audit_log" ON audit_log;
DROP POLICY IF EXISTS "okul_audit_log_select" ON audit_log;
DROP POLICY IF EXISTS "okul_audit_log_insert" ON audit_log;

-- 3. Yeni Politikalar

-- SELECT: Sadece kendi okulunun loglarını gör
CREATE POLICY "okul_audit_log_select" 
  ON audit_log FOR SELECT 
  USING (okul_id = get_my_okul_id());

-- INSERT: Yeni log girişi (trigger ile okul_id atanmasına izin ver)
CREATE POLICY "okul_audit_log_insert" 
  ON audit_log FOR INSERT 
  WITH CHECK (okul_id = get_my_okul_id() OR okul_id IS NULL);


-- 4. Okul ID Atama Tetikleyicisi (Trigger)
CREATE OR REPLACE FUNCTION auto_set_okul_id_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.okul_id IS NULL THEN
    NEW.okul_id := get_my_okul_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_okul_id_audit_log ON audit_log;
CREATE TRIGGER trg_auto_okul_id_audit_log
  BEFORE INSERT ON audit_log
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_okul_id_audit_log();

-- 5. Doğrulama
SELECT 'Audit log RLS ve Trigger ayarları güncellendi' AS mesaj;
