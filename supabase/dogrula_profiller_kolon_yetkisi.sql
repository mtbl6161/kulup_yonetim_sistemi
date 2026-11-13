-- ============================================================
-- DOĞRULAMA: profiller kolon yetkisi (migration_profiller_kolon_yetkisi.sql)
-- Hiçbir değeri değiştirmez (B testindeki UPDATE'ler kolonu kendisine eşitler).
-- Supabase SQL Editor'da bölüm bölüm çalıştırın (her bölümü seçip "Run");
-- A bölümleri sonucu ayrı görmek için tek tek, B bölümü tek parça çalıştırılmalı.
--
-- Sıra:
--   A) Migration'dan ÖNCE çalıştırın → mevcut durumu kaydedin.
--   B) migration_profiller_kolon_yetkisi.sql'i çalıştırın.
--   C) A'yı tekrar çalıştırın, ardından B ve C testlerini yapın.
-- ============================================================


-- ------------------------------------------------------------
-- A1) profiller üzerindeki RLS politikaları
--     Beklenen: profil_kendi_goruntule (SELECT), profil_kendi_guncelle (UPDATE).
--     Başka bir UPDATE/ALL politikası varsa not edin.
-- ------------------------------------------------------------
SELECT policyname, cmd, roles, permissive, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiller'
ORDER BY cmd, policyname;

-- ------------------------------------------------------------
-- A2) profiller üzerindeki tetikleyiciler (iç tetikleyiciler hariç)
-- ------------------------------------------------------------
SELECT tgname, tgenabled, pg_get_triggerdef(oid) AS tanim
FROM pg_trigger
WHERE tgrelid = 'public.profiller'::regclass AND NOT tgisinternal;

-- ------------------------------------------------------------
-- A3) Tablo düzeyindeki yetkiler
--     Migration öncesi: authenticated için UPDATE görmeniz açığın kendisidir.
--     Migration sonrası: anon ve authenticated için yalnızca SELECT
--     (ve REFERENCES/TRIGGER) kalmalı; INSERT/UPDATE/DELETE/TRUNCATE olmamalı.
-- ------------------------------------------------------------
SELECT grantee, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS yetkiler
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'profiller'
  AND grantee IN ('anon', 'authenticated', 'service_role')
GROUP BY grantee
ORDER BY grantee;

-- ------------------------------------------------------------
-- A4) Kolon bazında: authenticated hangi kolonu güncelleyebilir?
--     Migration sonrası beklenen: yalnızca ad, soyad, son_giris = true.
--     okul_id, rol, il_id, ilce_id, id = false olmalı.
-- ------------------------------------------------------------
SELECT c.column_name,
       c.data_type,
       has_column_privilege('authenticated', 'public.profiller', c.column_name, 'UPDATE') AS authenticated_yazabilir,
       has_column_privilege('anon',          'public.profiller', c.column_name, 'UPDATE') AS anon_yazabilir
FROM information_schema.columns c
WHERE c.table_schema = 'public' AND c.table_name = 'profiller'
ORDER BY authenticated_yazabilir DESC, c.column_name;


-- ------------------------------------------------------------
-- B) JWT benzetimiyle test (SQL Editor içinden)
--    Bir TEST kullanıcısının id'sini alın (Authentication → Users ya da
--    SELECT id, okul_id, rol FROM profiller WHERE ...) ve aşağıdaki
--    '00000000-0000-0000-0000-000000000000' yerine yazın.
--
--    Bu blok, isteği o kullanıcının JWT'siyle gelmiş gibi "authenticated"
--    rolünde çalıştırır. Bütün UPDATE'ler değeri kendisine eşitler
--    (okul_id = okul_id), yani açık kapalı olmasa bile hiçbir veri değişmez.
--
--    Beklenen sonuç (migration sonrası):
--      son_giris  → IZINLI (1 satır)
--      okul_id    → REDDEDILDI (42501 permission denied)
--      rol        → REDDEDILDI
--      il_id      → REDDEDILDI
--    Migration öncesi okul_id/rol/il_id satırlarında "ACIK" görürsünüz.
-- ------------------------------------------------------------
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-000000000000', 'role', 'authenticated')::text,
  true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  kolon text;
  n int;
  sonuc text := '';
BEGIN
  IF current_user <> 'authenticated' THEN
    RAISE EXCEPTION 'Rol authenticated değil (%): B bölümünü tek parça seçip çalıştırın', current_user;
  END IF;
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth.uid() boş: request.jwt.claims ayarlanamadı';
  END IF;

  FOREACH kolon IN ARRAY ARRAY['son_giris', 'okul_id', 'rol', 'il_id'] LOOP
    BEGIN
      EXECUTE format('UPDATE public.profiller SET %1$I = %1$I WHERE id = auth.uid()', kolon);
      GET DIAGNOSTICS n = ROW_COUNT;
      sonuc := sonuc || kolon || ': '
        || CASE WHEN kolon = 'son_giris' THEN 'IZINLI' ELSE 'ACIK (guncellenebildi!)' END
        || ' (' || n || ' satir)|';
    EXCEPTION WHEN insufficient_privilege THEN
      sonuc := sonuc || kolon || ': REDDEDILDI (' || SQLSTATE || ' ' || SQLERRM || ')|';
    END;
  END LOOP;

  PERFORM set_config('klup.test_sonucu', sonuc, true);
END $$;

-- Sonuç tablosu son sorgu olmalı (SQL Editor yalnızca son sonucu gösterir).
-- SET LOCAL ROLE ve jwt ayarı bu çalıştırma bitince kendiliğinden sıfırlanır.
SELECT unnest(string_to_array(rtrim(current_setting('klup.test_sonucu'), '|'), '|')) AS sonuc;


-- ------------------------------------------------------------
-- C) Gerçek JWT ile uçtan uca test (tarayıcı/terminal, isteğe bağlı)
--    Saldırının gerçek yolu PostgREST olduğu için en kesin kanıt budur.
--
--    1. Uygulamaya TEST kullanıcısıyla giriş yapın.
--    2. Tarayıcı konsolunda (F12) erişim belirtecini alın:
--         JSON.parse(localStorage.getItem(
--           Object.keys(localStorage).find(k => k.endsWith('-auth-token'))
--         )).access_token
--       (Oturum çerezde tutuluyorsa: Application → Cookies → sb-...-auth-token)
--    3. Aynı kullanıcının mevcut okul_id değerini öğrenin (değişiklik olmasın diye
--       aynı değeri göndereceğiz). Aşağıda <URL>, <ANON_KEY>, <JWT>, <UID>,
--       <MEVCUT_OKUL_ID> yerlerini doldurun:
--
--       curl -i -X PATCH "<URL>/rest/v1/profiller?id=eq.<UID>" \
--         -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <JWT>" \
--         -H "Content-Type: application/json" -H "Prefer: return=minimal" \
--         -d '{"okul_id": <MEVCUT_OKUL_ID>}'
--
--       Beklenen: HTTP 401/403, gövdede "code":"42501",
--                 "permission denied for table profiller".
--       Migration öncesi: HTTP 204 (açık).
--
--    4. İzinli kolonun hâlâ çalıştığını görün:
--       ... -d '{"son_giris": "2026-11-13T10:00:00Z"}'   → HTTP 204
--
--    5. Uygulamada denetçi hesabıyla Denetim → Bilgilerim'den ad/soyad
--       kaydedin; "Bilgiler güncellendi." mesajı gelmeli.
-- ------------------------------------------------------------
