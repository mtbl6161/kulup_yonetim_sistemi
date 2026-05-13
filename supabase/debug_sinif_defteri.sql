-- sinif_defteri gerçek içeriğini göster
-- okul_id, ay, yil dağılımı
SELECT
  okul_id,
  ay,
  yil,
  COUNT(*) AS kayit_sayisi
FROM sinif_defteri
GROUP BY okul_id, ay, yil
ORDER BY yil DESC, ay DESC, okul_id;
