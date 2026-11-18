-- ============================================================
-- OKULLAR: DODO PAYMENTS KİMLİKLERİ + TARAYICIDAN YAZMA YETKİSİNİN KALDIRILMASI
-- Supabase SQL Editor'da çalıştırın. Tekrar çalıştırılabilir.
--
-- 1) Dodo Payments aboneliğini okulla eşleştiren iki kolon.
--    Webhook (app/api/webhook/dodo) ve ödeme rotası (app/api/abonelik/checkout)
--    bu kolonlara SUPABASE_SERVICE_ROLE_KEY ile yazar.
--
-- 2) GÜVENLİK AÇIĞI: Supabase varsayılanı anon/authenticated rollerine okullar
--    tablosunun tamamında INSERT/UPDATE/DELETE verir; "okul_kendi" (ALL) ve
--    "okullar_owner_update" politikaları yalnızca SATIRI sınırlar, KOLONU değil.
--    Bu yüzden giriş yapmış her kullanıcı tarayıcı konsolundan
--      supabase.from('okullar').update({ odeme_durumu: 'aktif', lisans_bitis: '2099-01-01' }).eq('id', <kendi okulu>)
--    çağırıp ödeme yapmadan lisansını uzatabiliyor, abonelik kimliklerini
--    başka bir okulunkiyle değiştirebiliyor ya da okulunu silebiliyordu.
--
--    Tarayıcıdan okullar'a YAZAN yer yok (Kasım 2026 taraması): bütün yazmalar
--    /api/kayit, /api/admin/*, /api/abonelik/* ve /api/webhook/* rotalarında
--    service_role ile yapılır; service_role bu kısıttan etkilenmez.
--    Tarayıcı yalnızca SELECT yapar (Ayarlar, AuthContext, denetim ekranları),
--    o yetkiye dokunulmaz.
-- ============================================================

ALTER TABLE public.okullar
  ADD COLUMN IF NOT EXISTS dodo_customer_id     TEXT,
  ADD COLUMN IF NOT EXISTS dodo_subscription_id TEXT;

-- Bir Dodo aboneliği / müşterisi yalnızca bir okula bağlanabilir
CREATE UNIQUE INDEX IF NOT EXISTS okullar_dodo_subscription_id_key
  ON public.okullar (dodo_subscription_id) WHERE dodo_subscription_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS okullar_dodo_customer_id_key
  ON public.okullar (dodo_customer_id) WHERE dodo_customer_id IS NOT NULL;

REVOKE INSERT, UPDATE, DELETE ON public.okullar FROM anon, authenticated;

-- Doğrulama: aşağıdaki sorgu boş dönmelidir
-- SELECT grantee, privilege_type FROM information_schema.table_privileges
--  WHERE table_schema = 'public' AND table_name = 'okullar'
--    AND grantee IN ('anon', 'authenticated') AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE');
