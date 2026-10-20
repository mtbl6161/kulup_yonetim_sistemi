-- ============================================================
-- Denetim evrak listesi mükerrer kayıt düzeltmesi
-- Sorun: denetim_maddeleri_hazirla() aynı anda iki kez çağrılınca (örn. iki sekme / iki bileşen)
-- ikisi de listeyi boş görüp varsayılan 13 maddeyi ikişer kez ekledi.
-- 1) Fonksiyon il bazında kilit alır → aynı anda tek çağrı listeyi oluşturur.
-- 2) Var olan mükerrer maddeler temizlenir (en eski kayıt kalır; varsa belgeleri ona taşınır).
-- Supabase SQL Editor'da bir kez çalıştırın. Tekrar çalıştırmak güvenlidir.
-- ============================================================

CREATE OR REPLACE FUNCTION denetim_maddeleri_hazirla()
RETURNS VOID AS $$
DECLARE v_il INTEGER;
BEGIN
  v_il := COALESCE(CASE WHEN denetim_yetkilisi_mi() THEN get_my_il_id() END, get_my_okul_il_id());
  IF v_il IS NULL THEN RETURN; END IF;
  -- Aynı il için eşzamanlı çağrıları sıraya sok (işlem sonunda kilit kendiliğinden bırakılır)
  PERFORM pg_advisory_xact_lock(hashtext('denetim_maddeleri_hazirla'), v_il);
  IF EXISTS (SELECT 1 FROM denetim_maddeleri WHERE il_id = v_il) THEN RETURN; END IF;
  INSERT INTO denetim_maddeleri (il_id, sira_no, baslik, tip, otomatik_kod, yillik) VALUES
    (v_il, 1,  'Kulüp Açılış Onayı ve varsa Ek Onay', 'yukleme', NULL, true),
    (v_il, 2,  'Kulüpte görevli personel listesi ve görevleri', 'otomatik', 'personel_listesi', false),
    (v_il, 3,  'Ay başı – ay sonu banka hesap hareketleri (Excel formatında)', 'yukleme', NULL, false),
    (v_il, 4,  'Sigortalı çalışan personele ait aylık puantaj', 'otomatik', 'puantaj_sgk', false),
    (v_il, 5,  'Kadrolu çalışan personele ait aylık puantaj', 'otomatik', 'puantaj_kadrolu', false),
    (v_il, 6,  'Sigortalı çalışan personele ait aylık bordro', 'otomatik', 'bordro_sgk', false),
    (v_il, 7,  'Kadrolu çalışan personele ait aylık bordro', 'otomatik', 'bordro_kadrolu', false),
    (v_il, 8,  'Sigortalı çalışan personele ait 4/A hizmet listesi', 'yukleme', NULL, false),
    (v_il, 9,  'Kadrolu personele ait aylık Gelir ve Damga Vergisi istisna raporu (KBS''den alınmış)', 'yukleme', NULL, false),
    (v_il, 11, 'Aylık Muhtasar SGK Beyannamesi, SGK tahakkuk fişi ve hizmet listesi', 'yukleme', NULL, false),
    (v_il, 12, 'Aylık ücret dağıtımını gösteren bilanço', 'otomatik', 'bilanco', false),
    (v_il, 13, 'Kadrolu personele ödenen ücretlerin vergi matrahlarına dahil edildiğini gösteren belge', 'yukleme', NULL, false),
    (v_il, 14, 'Çocuk kulübünün vergi ve SGK borcu olmadığına dair borcu yoktur belgesi', 'yukleme', NULL, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mükerrer maddeler: aynı il + sıra + başlık → en küçük id kalır
WITH esler AS (
  SELECT id, MIN(id) OVER (PARTITION BY il_id, sira_no, baslik) AS kalan
  FROM denetim_maddeleri
)
UPDATE denetim_belgeleri b SET madde_id = e.kalan
FROM esler e
WHERE b.madde_id = e.id AND e.id <> e.kalan;

WITH esler AS (
  SELECT id, MIN(id) OVER (PARTITION BY il_id, sira_no, baslik) AS kalan
  FROM denetim_maddeleri
)
DELETE FROM denetim_maddeleri m
USING esler e
WHERE m.id = e.id AND e.id <> e.kalan;

NOTIFY pgrst, 'reload schema';
