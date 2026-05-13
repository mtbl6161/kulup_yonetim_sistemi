-- ============================================================
-- Denetim yetkilisine bilanço için ek okuma yetkileri
-- ============================================================

-- tahsilat: denetim ilindeki okulları okuyabilir
DROP POLICY IF EXISTS "denetim_tahsilat_oku" ON tahsilat;
CREATE POLICY "denetim_tahsilat_oku"
  ON tahsilat FOR SELECT
  USING (
    okul_id = get_my_okul_id()
    OR (
      get_my_il_id() IS NOT NULL
      AND okul_id IN (SELECT id FROM okullar WHERE il_id = get_my_il_id())
    )
  );

-- ayarlar: denetim ilindeki okulları okuyabilir
DROP POLICY IF EXISTS "denetim_ayarlar_oku" ON ayarlar;
CREATE POLICY "denetim_ayarlar_oku"
  ON ayarlar FOR SELECT
  USING (
    okul_id = get_my_okul_id()
    OR (
      get_my_il_id() IS NOT NULL
      AND okul_id IN (SELECT id FROM okullar WHERE il_id = get_my_il_id())
    )
  );

-- siniflar: denetim ilindeki okulları okuyabilir
DROP POLICY IF EXISTS "denetim_siniflar_oku" ON siniflar;
CREATE POLICY "denetim_siniflar_oku"
  ON siniflar FOR SELECT
  USING (
    okul_id = get_my_okul_id()
    OR (
      get_my_il_id() IS NOT NULL
      AND okul_id IN (SELECT id FROM okullar WHERE il_id = get_my_il_id())
    )
  );

-- tatiller: herkese açık (global tablo, okul bazlı değil)
DROP POLICY IF EXISTS "tatiller_oku" ON tatiller;
CREATE POLICY "tatiller_oku"
  ON tatiller FOR SELECT
  USING (auth.role() = 'authenticated');
