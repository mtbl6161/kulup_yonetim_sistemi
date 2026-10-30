# Veritabanı (Supabase) betikleri

Bu klasördeki `.sql` dosyaları Supabase SQL Editor'da **elle** çalıştırılmış geçiş betikleridir.
Hepsi tekrar çalıştırılabilir yazılmıştır (`IF NOT EXISTS`, `DROP POLICY IF EXISTS` …), ancak
bir kısmı tek seferlik veri düzeltmesidir.

> **Gerçek şema, canlı veritabanıdır.** Yeni bir ortam kurarken en güvenli yol, canlı veritabanından
> tek parça bir şema almak ve onu çalıştırmaktır:
>
> ```bash
> npx supabase db dump --schema public -f supabase/baseline.sql
> ```
>
> Bu döküm alınana kadar aşağıdaki sıra, betiklerin depoya eklenme tarihine göre önerilen sıradır.

## Önerilen çalıştırma sırası

1. **Temel şema:** `schema.sql`, `migration_add_columns.sql`
2. **Nisan 2026:** `migration_add_sinif_id.sql`, `migration_add_tax_overrides.sql`, `migration_fix_ders_programi.sql`
3. **Çok kullanıcılı yapı ve güvenlik (Mayıs 2026)** — önce `migration_multiuser.sql`, `master_il_ilce_migration.sql`,
   `migration_ilce_data.sql`, `migration_rls_profiller_okullar.sql`, `migration_fix_global_rls.sql`; ardından
   `migration_add_*`, `migration_audit_log*.sql`, `migration_denetci_talepleri.sql`, `migration_denetim_*_rls.sql`,
   `migration_duyurular.sql`, `migration_il_denetim.sql`, `migration_okul_odemeleri.sql`,
   `migration_profiller_ad_soyad.sql`, `migration_sistem_ayarlari.sql`, `migration_update_precision.sql`,
   `migration_bordro_gv_matrah.sql` ve `migration_fix_*.sql`
4. **Eylül 2026:** `migration_add_ders_saati_sayisi.sql`, `migration_add_ogrenci_veli_ad.sql`,
   `migration_add_ogretmen_saat_ucreti.sql`, `migration_personel_istisna_tutari.sql`, `migration_ogrenci_turu.sql`,
   `migration_tahsilat_takip.sql` → `migration_tahsilat_taksit.sql`, `migration_isletme_defteri.sql`
5. **Ekim 2026:** `migration_denetim_dosyasi.sql` → `migration_denetim_maddeleri_mukerrer_duzelt.sql`,
   `migration_personel_tc_gorev_unique.sql`, `migration_denetim_banka_rls.sql`, `migration_islenen_odemeler.sql`,
   `migration_okul_aile_birligi.sql`
6. **Kasım 2026:** `migration_denetim_raporu.sql` (EK-6 denetim raporu, kulüp bilgileri, personel belgeleri,
   okul bildirimleri; önce `migration_denetim_dosyasi.sql` çalışmış olmalı)

`debug_sinif_defteri.sql` yalnızca inceleme sorgusudur; çalıştırılması gerekmez.

## Kural

Yeni bir değişiklik eklerken dosyayı `migration_<konu>.sql` adıyla buraya koyun, tekrar çalıştırılabilir yazın
ve bu listenin sonuna ekleyin.
