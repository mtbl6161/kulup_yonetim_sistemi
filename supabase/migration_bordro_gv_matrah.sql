-- bordro tablosuna gv_matrah kolonu ekle
ALTER TABLE bordro ADD COLUMN IF NOT EXISTS gv_matrah NUMERIC(12,2) DEFAULT 0;
