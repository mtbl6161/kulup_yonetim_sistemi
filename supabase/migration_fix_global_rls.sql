-- ============================================================
-- GLOBAL RLS VE TRIGGER FIX (TÜM TABLOLAR İÇİN KESİN ÇÖZÜM)
-- Supabase SQL Editor'da çalıştırın.
-- ============================================================

DO $$
DECLARE
    t_name TEXT;
    table_list TEXT[] := ARRAY[
        'ogrenciler', 'personel', 'puantaj', 'tahsilat', 'tahakkuk',
        'bordro', 'giderler', 'hesap_hareketleri', 'yoklama', 'ders_programi',
        'ayarlar', 'siniflar', 'tatiller', 'sinif_defteri'
    ];
BEGIN
    FOR t_name IN SELECT unnest(table_list)
    LOOP
        -- 1. RLS Etkinleştir
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t_name);

        -- 2. Eski Politikaları Temizle
        EXECUTE format('DROP POLICY IF EXISTS "allow_all_%I" ON %I', t_name, t_name);
        EXECUTE format('DROP POLICY IF EXISTS "okul_%I" ON %I', t_name, t_name);
        EXECUTE format('DROP POLICY IF EXISTS "okul_%I_select" ON %I', t_name, t_name);
        EXECUTE format('DROP POLICY IF EXISTS "okul_%I_insert" ON %I', t_name, t_name);
        EXECUTE format('DROP POLICY IF EXISTS "okul_%I_update" ON %I', t_name, t_name);
        EXECUTE format('DROP POLICY IF EXISTS "okul_%I_delete" ON %I', t_name, t_name);
        EXECUTE format('DROP POLICY IF EXISTS "denetim_%I_oku" ON %I', t_name, t_name);

        -- 3. Seçme (SELECT) Politikası: Kendi okulunu veya yetkili ilini görebilir
        EXECUTE format('
            CREATE POLICY "okul_%I_select" ON %I FOR SELECT USING (
                okul_id = get_my_okul_id() 
                OR 
                (get_my_il_id() IS NOT NULL AND okul_id IN (SELECT id FROM okullar WHERE il_id = get_my_il_id()))
            )', t_name, t_name);

        -- 4. Ekleme (INSERT) Politikası: okul_id eşit olmalı veya NULL olmalı (Trigger için)
        EXECUTE format('
            CREATE POLICY "okul_%I_insert" ON %I FOR INSERT WITH CHECK (
                okul_id = get_my_okul_id() OR okul_id IS NULL
            )', t_name, t_name);

        -- 5. Güncelleme (UPDATE) Politikası: Sadece kendi okulu
        EXECUTE format('
            CREATE POLICY "okul_%I_update" ON %I FOR UPDATE USING (
                okul_id = get_my_okul_id()
            ) WITH CHECK (okul_id = get_my_okul_id())', t_name, t_name);

        -- 6. Silme (DELETE) Politikası: Sadece kendi okulu
        EXECUTE format('
            CREATE POLICY "okul_%I_delete" ON %I FOR DELETE USING (
                okul_id = get_my_okul_id()
            )', t_name, t_name);

        -- 7. Tetikleyici Fonksiyonu ve Tetikleyici (Trigger)
        EXECUTE format('
            CREATE OR REPLACE FUNCTION auto_set_okul_id_%I()
            RETURNS TRIGGER AS $func$
            BEGIN
                IF NEW.okul_id IS NULL THEN
                    NEW.okul_id := get_my_okul_id();
                END IF;
                IF NEW.okul_id IS NULL THEN
                    RAISE EXCEPTION ''Kullanıcı okul bilgisi bulunamadı. Lütfen giriş yaptığınızdan emin olun.'';
                END IF;
                RETURN NEW;
            END;
            $func$ LANGUAGE plpgsql SECURITY DEFINER', t_name);

        EXECUTE format('DROP TRIGGER IF EXISTS trg_auto_okul_id_%I ON %I', t_name, t_name);
        EXECUTE format('
            CREATE TRIGGER trg_auto_okul_id_%I
            BEFORE INSERT ON %I
            FOR EACH ROW
            EXECUTE FUNCTION auto_set_okul_id_%I()', t_name, t_name, t_name);

    END LOOP;
END $$;

SELECT 'Global RLS ve Trigger düzeltmeleri tüm tablolar için başarıyla uygulandı' AS mesaj;
