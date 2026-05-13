    -- ============================================================
    -- MEB Kulüp Yönetim Sistemi — Bordro Vergi Detay Kolonları
    -- ============================================================

    ALTER TABLE bordro ADD COLUMN IF NOT EXISTS gv_hesaplanan    NUMERIC(12,2) DEFAULT 0;
    ALTER TABLE bordro ADD COLUMN IF NOT EXISTS gv_istisna_tutari NUMERIC(12,2) DEFAULT 0;
    ALTER TABLE bordro ADD COLUMN IF NOT EXISTS dv_hesaplanan    NUMERIC(12,2) DEFAULT 0;
    ALTER TABLE bordro ADD COLUMN IF NOT EXISTS dv_istisna_tutari NUMERIC(12,2) DEFAULT 0;

    COMMENT ON COLUMN bordro.gv_hesaplanan IS 'İstisna öncesi hesaplanan toplam gelir vergisi';
    COMMENT ON COLUMN bordro.gv_istisna_tutari IS 'Asgari ücret istisnası nedeniyle düşülen GV tutarı';
    COMMENT ON COLUMN bordro.dv_hesaplanan IS 'İstisna öncesi hesaplanan toplam damga vergisi';
    COMMENT ON COLUMN bordro.dv_istisna_tutari IS 'Asgari ücret istisnası nedeniyle düşülen DV tutarı';
