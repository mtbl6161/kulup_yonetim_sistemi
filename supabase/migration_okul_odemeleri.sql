-- ============================================================
-- OKUL ÖDEMELERİ TABLOSU (SaaS Gelir Takibi)
-- ============================================================

CREATE TABLE IF NOT EXISTS okul_odemeleri (
    id              BIGSERIAL PRIMARY KEY,
    okul_id         INTEGER REFERENCES okullar(id) ON DELETE CASCADE,
    tutar           NUMERIC(12,2) NOT NULL,
    odeme_tarihi    DATE NOT NULL DEFAULT CURRENT_DATE,
    odeme_yontemi   TEXT NOT NULL DEFAULT 'Havale', 
    -- Havale | Kredi Kartı | Nakit | Diğer
    aciklama        TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS (Sadece Super Admin Erişebilir)
-- ============================================================

ALTER TABLE okul_odemeleri ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_super_admin_all_odemeler" ON okul_odemeleri;

-- Yalnızca super_admin rolüne sahip olanlar her şeyi yapabilir
CREATE POLICY "allow_super_admin_all_odemeler"
    ON okul_odemeleri
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

-- ============================================================
-- Okullar Tablosu İçin İpuçları (İhtiyaç duyulursa)
-- ============================================================
-- Okullar tablosunda 'odeme_durumu' ve 'lisans_bitis' zaten mevcut. 
-- Bu tablo sayesinde bir okulun gerçek para girişlerini takip edebiliriz.
