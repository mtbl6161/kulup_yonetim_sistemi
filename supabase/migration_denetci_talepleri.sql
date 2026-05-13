-- ============================================================
-- DENETÇİ PANELİ TALEP SİSTEMİ
-- ============================================================

CREATE TABLE IF NOT EXISTS denetci_talepleri (
    id              BIGSERIAL PRIMARY KEY,
    okul_id         INTEGER REFERENCES okullar(id) ON DELETE CASCADE,
    il_id           INTEGER REFERENCES iller(id),
    status          TEXT DEFAULT 'beklemede', -- beklemede, onaylandi, reddedildi
    ad_soyad        TEXT,
    email           TEXT,
    telefon         TEXT,
    notlar          TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security)
ALTER TABLE denetci_talepleri ENABLE ROW LEVEL SECURITY;

-- 1. Okullar sadece kendi taleplerini görebilir
DROP POLICY IF EXISTS "okul_talep_gorme" ON denetci_talepleri;
CREATE POLICY "okul_talep_gorme" 
    ON denetci_talepleri 
    FOR SELECT 
    USING (okul_id = (SELECT okul_id FROM profiller WHERE id = auth.uid()));

-- 2. Okullar yeni talep ekleyebilir
DROP POLICY IF EXISTS "okul_talep_ekleme" ON denetci_talepleri;
CREATE POLICY "okul_talep_ekleme" 
    ON denetci_talepleri 
    FOR INSERT 
    WITH CHECK (okul_id = (SELECT okul_id FROM profiller WHERE id = auth.uid()));

-- 3. Super Admin her şeyi görebilir ve güncelleyebilir
DROP POLICY IF EXISTS "super_admin_talep_yonetimi" ON denetci_talepleri;
CREATE POLICY "super_admin_talep_yonetimi" 
    ON denetci_talepleri 
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM profiller 
            WHERE id = auth.uid() 
            AND rol = 'super_admin'
        )
    );
