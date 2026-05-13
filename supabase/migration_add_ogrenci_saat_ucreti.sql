-- migration_add_ogrenci_saat_ucreti.sql
ALTER TABLE ayarlar ADD COLUMN IF NOT EXISTS ogrenci_saat_ucreti NUMERIC(10,2) DEFAULT 64.75;
COMMENT ON COLUMN ayarlar.ogrenci_saat_ucreti IS 'Öğrenci tahakkuk havuzu hesabı için kullanılan manuel saat ücreti';
