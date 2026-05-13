-- bordro tablosuna okul_id dahil UNIQUE constraint ekle
-- migration_multiuser.sql tahakkuk'u güncelledi ama bordro'yu atladı

ALTER TABLE bordro DROP CONSTRAINT IF EXISTS bordro_personel_id_ay_yil_key;
ALTER TABLE bordro ADD CONSTRAINT bordro_personel_id_ay_yil_okul_key UNIQUE (personel_id, ay, yil, okul_id);
