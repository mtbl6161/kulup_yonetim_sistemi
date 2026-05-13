-- Sistem ayarları tablosu (Bakım modu vb. global ayarlar için)
CREATE TABLE IF NOT EXISTS public.sistem_ayarlari (
    anahtar TEXT PRIMARY KEY,
    deger JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Başlangıç verisi: Bakım modu kapalı
INSERT INTO public.sistem_ayarlari (anahtar, deger)
VALUES ('bakim_modu', '{"aktif": false, "mesaj": "Sistem şu anda bakım çalışması nedeniyle kapalıdır. Lütfen daha sonra tekrar deneyiniz."}')
ON CONFLICT (anahtar) DO NOTHING;

-- RLS: Sadece süper adminler okuyabilir ve yazabilir
ALTER TABLE public.sistem_ayarlari ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Süper admin her şeyi yapar" ON public.sistem_ayarlari
    USING (EXISTS (SELECT 1 FROM profiller WHERE id = auth.uid() AND rol = 'super_admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM profiller WHERE id = auth.uid() AND rol = 'super_admin'));
