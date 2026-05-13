-- Audit Log tablosunu genişlet: IP ve Cihaz bilgisi ekle
ALTER TABLE public.audit_log 
ADD COLUMN IF NOT EXISTS ip_adresi TEXT,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS basarili BOOLEAN DEFAULT true;

-- Giriş denemelerini daha iyi izlemek için bir index
CREATE INDEX IF NOT EXISTS idx_audit_login ON public.audit_log (islem) WHERE islem = 'login';
