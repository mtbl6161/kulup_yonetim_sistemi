-- ============================================================
-- Tekrar çalıştırmak güvenlidir.
-- DENETİM KARARI: AÇIKLAYICI HATA MESAJLARI
-- denetim_karar (dosyayı onayla / iade et) yetki yoksa yalnızca "Yetkiniz yok" diyordu.
-- Aynı kontroller nedeni söyleyecek şekilde yazıldı. En sık neden: aynı tarayıcıda okul hesabıyla da
-- oturum açılması (Supabase oturumu tarayıcı başına tektir; açık denetçi sekmesi okul hesabına geçer).
-- Önkoşul: migration_denetim_dosyasi.sql. Supabase SQL Editor'da bir kez çalıştırın.
-- ============================================================

CREATE OR REPLACE FUNCTION denetim_karar(p_teslim_id INTEGER, p_durum TEXT, p_not TEXT)
RETURNS VOID AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_rol TEXT; v_il INTEGER;
  v_okul INTEGER; v_okul_il INTEGER;
BEGIN
  IF p_durum NOT IN ('onaylandi', 'iade') THEN RAISE EXCEPTION 'Geçersiz karar'; END IF;
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Oturum bulunamadı. Çıkış yapıp yeniden giriş yapın.'; END IF;

  SELECT rol, il_id INTO v_rol, v_il FROM profiller WHERE id = v_uid;
  IF v_rol IS DISTINCT FROM 'denetim_yetkilisi' THEN
    RAISE EXCEPTION 'Bu tarayıcıda şu an denetim yetkilisi değil, % hesabıyla oturum açık. Okul ve denetçi hesaplarını aynı tarayıcıda aynı anda kullanmayın (farklı tarayıcı ya da gizli pencere kullanın); sayfayı yenileyip denetçi hesabıyla yeniden giriş yapın.',
      CASE v_rol WHEN 'admin' THEN 'okul' WHEN 'super_admin' THEN 'sistem yöneticisi' ELSE COALESCE(v_rol, 'tanımsız') END;
  END IF;
  IF v_il IS NULL THEN RAISE EXCEPTION 'Denetçi profilinizde il tanımlı değil; sistem yöneticisine başvurun.'; END IF;

  SELECT t.okul_id, o.il_id INTO v_okul, v_okul_il
    FROM denetim_teslimleri t JOIN okullar o ON o.id = t.okul_id
   WHERE t.id = p_teslim_id;
  IF v_okul IS NULL THEN RAISE EXCEPTION 'Teslim kaydı bulunamadı (no: %). Sayfayı yenileyin.', p_teslim_id; END IF;
  IF v_okul_il IS DISTINCT FROM v_il THEN
    RAISE EXCEPTION 'Bu okul sizin ilinizde değil (okulun il kodu: %, sizin il kodunuz: %).', COALESCE(v_okul_il::text, 'yok'), v_il;
  END IF;

  UPDATE denetim_teslimleri
     SET durum = p_durum, denetci_notu = NULLIF(TRIM(p_not), ''), karar_tarihi = NOW(), karar_veren = v_uid
   WHERE id = p_teslim_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

NOTIFY pgrst, 'reload schema';
