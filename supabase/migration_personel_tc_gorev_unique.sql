-- Aynı kişi aynı okulda birden fazla görevde olabilir
-- (örn. Koordinatör Öğretmen + Başkan Yrd.). Bordroda yalnızca brütü yüksek görev ödenir,
-- diğerinin payı okulda kalır (lib/hesaplama.ts → mukerrerGorevAyikla).
-- T.C. artık okul + görev bazında benzersiz.
ALTER TABLE personel DROP CONSTRAINT IF EXISTS personel_tc_okul_unique;
ALTER TABLE personel ADD CONSTRAINT personel_tc_okul_gorev_unique UNIQUE (tc, okul_id, gorev);
