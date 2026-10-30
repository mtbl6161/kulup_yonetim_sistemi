-- ============================================================
-- Tekrar çalıştırmak güvenlidir.
-- DENETİM DOSYASI: OKUL GÖNDERMEDEN DENETÇİ GÖRMESİN
-- Denetçi bir ayın belgelerini ancak okul o ayın dosyasını denetime gönderdikten sonra görür.
--   * Gönderildi / onaylandı : o ayın belgeleri görünür.
--   * İade edildi            : iade anına kadar yüklenmiş belgeler görünür; okulun iadeden sonra yüklediği
--                              belgeler, okul dosyayı yeniden gönderene kadar görünmez.
--   * Yıllık maddeler (ör. açılış onayı) eğitim yılında bir kez yüklenir; eğitim yılının gönderilmiş
--     herhangi bir ayının dosyasında görünür.
-- Önkoşul: migration_denetim_dosyasi.sql. Supabase SQL Editor'da bir kez çalıştırın.
-- ============================================================

CREATE OR REPLACE FUNCTION denetim_belgesi_gorunur(p_okul INTEGER, p_yil INTEGER, p_ay INTEGER, p_madde INTEGER, p_yuklenme TIMESTAMPTZ)
RETURNS BOOLEAN AS $$
  SELECT denetim_okulu_mu(p_okul) AND EXISTS (
    SELECT 1 FROM denetim_teslimleri t
     WHERE t.okul_id = p_okul
       AND (
         (t.yil = p_yil AND t.ay = p_ay)
         OR EXISTS (
           SELECT 1 FROM denetim_maddeleri m
            WHERE m.id = p_madde AND m.yillik
              AND (CASE WHEN t.ay >= 9 THEN t.yil ELSE t.yil - 1 END) = (CASE WHEN p_ay >= 9 THEN p_yil ELSE p_yil - 1 END)
         )
       )
       AND (
         t.durum IN ('gonderildi', 'onaylandi')
         OR (t.durum = 'iade' AND p_yuklenme <= COALESCE(t.karar_tarihi, NOW()))
       )
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Belge kayıtları
DROP POLICY IF EXISTS "denetim_belgeleri_oku" ON denetim_belgeleri;
CREATE POLICY "denetim_belgeleri_oku" ON denetim_belgeleri FOR SELECT USING (
  okul_id = get_my_okul_id()
  OR denetim_belgesi_gorunur(okul_id, yil, ay, madde_id, created_at)
);

-- Dosyalar — yol: <okul_id>/<yil>-<ay>/<madde_id>/<dosya>
DROP POLICY IF EXISTS "denetim_dosya_oku" ON storage.objects;
CREATE POLICY "denetim_dosya_oku" ON storage.objects FOR SELECT USING (
  bucket_id = 'denetim' AND (
    (storage.foldername(name))[1] = get_my_okul_id()::text
    OR denetim_belgesi_gorunur(
      ((storage.foldername(name))[1])::integer,
      split_part((storage.foldername(name))[2], '-', 1)::integer,
      split_part((storage.foldername(name))[2], '-', 2)::integer,
      ((storage.foldername(name))[3])::integer,
      created_at
    )
  )
);

NOTIFY pgrst, 'reload schema';
