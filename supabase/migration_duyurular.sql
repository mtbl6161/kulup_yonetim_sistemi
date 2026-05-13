-- ============================================================
-- SİSTEM DUYURULARI TABLOSU (Global Banner)
-- ============================================================

CREATE TABLE IF NOT EXISTS duyurular (
    id              BIGSERIAL PRIMARY KEY,
    baslik          TEXT NOT NULL,
    icerik          TEXT NOT NULL,
    tur             TEXT NOT NULL DEFAULT 'info', 
    -- info | warning | danger
    aktif           BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS (Yazma Sadece Super Admin, Okuma Tüm Kullanıcılar)
-- ============================================================

ALTER TABLE duyurular ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_super_admin_all_duyurular" ON duyurular;
DROP POLICY IF EXISTS "allow_authenticated_read_duyurular" ON duyurular;

-- SELECT: Tüm giriş yapmış kullanıcılar okuyabilir
CREATE POLICY "allow_authenticated_read_duyurular"
    ON duyurular
    FOR SELECT
    TO authenticated
    USING (true);

-- ALL (Insert/Update/Delete): Yalnızca super_admin
CREATE POLICY "allow_super_admin_all_duyurular"
    ON duyurular
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiller
            WHERE profiller.id = auth.uid()
            AND profiller.rol = 'super_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiller
            WHERE profiller.id = auth.uid()
            AND profiller.rol = 'super_admin'
        )
    );
