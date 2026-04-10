-- Bordro vergi istisnası sabitlerini ayarlar tablosuna ekler
ALTER TABLE ayarlar 
ADD COLUMN IF NOT EXISTS gv_istisna_sabiti DECIMAL(12,2) DEFAULT 2470.10,
ADD COLUMN IF NOT EXISTS dv_istisna_sabiti DECIMAL(12,2) DEFAULT 147.04;

COMMENT ON COLUMN ayarlar.gv_istisna_sabiti IS 'Gelir Vergisi İstisna Tutarı (Manuel Sabit)';
COMMENT ON COLUMN ayarlar.dv_istisna_sabiti IS 'Damga Vergisi İstisna Tutarı (Manuel Sabit)';
