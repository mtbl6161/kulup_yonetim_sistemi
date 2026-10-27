-- ============================================================
-- ÖDEME TEKRAR (REPLAY) KORUMASI
-- Her dış ödeme (iyzico paymentId / Lemon Squeezy event) yalnızca
-- BİR KEZ işlenebilir. dis_odeme_id PRIMARY KEY olduğu için aynı
-- ödeme ikinci kez geldiğinde veritabanı reddeder; böylece sahte
-- ya da tekrar gönderilen callback/webhook lisansı yeniden uzatamaz.
-- ============================================================

CREATE TABLE IF NOT EXISTS islenen_odemeler (
    dis_odeme_id TEXT PRIMARY KEY,        -- örn: "iyzico:12345" veya "ls:order_created:67890"
    saglayici    TEXT NOT NULL,           -- iyzico | lemonsqueezy
    okul_id      INTEGER,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Bu tabloya sadece sunucu (service_role) erişir.
ALTER TABLE islenen_odemeler ENABLE ROW LEVEL SECURITY;
-- Bilerek hiç policy eklenmedi: service_role RLS'i baypas eder ve yazabilir,
-- normal (authenticated / anon) kullanıcılar bu tabloya hiç erişemez.
