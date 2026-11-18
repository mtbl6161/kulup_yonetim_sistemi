# Kişisel verilerin veritabanında şifrelenmesi — tasarım önerisi

> Durum: **ÖNERİ — onay bekliyor.** Bu belgeye dayanarak henüz hiçbir uygulama kodu ya da veritabanı değişikliği yapılmadı.
> Karar verilmesi gereken yer: [§5 Öneri](#5-öneri) ve [§7 Açık sorular](#7-açık-sorular-karar-gerekenler).

## 0. Özet

- **Hedef:** Öğrenci, veli ve personelin adı, soyadı, T.C. kimlik no, IBAN, e-posta ve telefonu veritabanında okunur durmasın. Veritabanı ya da yedeği ele geçse, hatta Supabase panelinden (SQL Editor, Table Editor) bakılsa bile bu alanlar anlamsız görünsün.
- **Mimariyle ilgili önemli bir nokta:** Klüp360'ta tarayıcı Supabase'e **doğrudan** bağlanıyor (`lib/supabase.ts` → `createBrowserClient`, yetkiyi RLS sağlıyor). PDF, Excel, MUHSGK XML, banka ekstresi eşleştirme, arama ve sıralamanın neredeyse tamamı **tarayıcıda** yapılıyor. Sunucu tarafı (Next.js API rotaları) yalnızca e-posta, kayıt, yönetim ve ödeme işlerini yapıyor. Bu yüzden şifrelemenin büyük kısmı ekranlara dokunmadan, "veri getir → çöz" adımına eklenebilir.
- **Öneri:** Seçenek **(a)**, yani uygulama katmanında alan bazlı şifreleme:
  - AES-256-GCM, **her okula ayrı rastgele veri anahtarı** (DEK).
  - DEK'ler veritabanında, Supabase'in dışında duran bir **ana anahtarla** (KEK) sarılı olarak saklanır.
  - Şifre çözme yalnızca yetki denetimi yapan bir Next.js rota işleyicisinde yapılır.
  - T.C. kimlik no için kör indeks (HMAC) kullanılır.
  - Supabase Vault/pgsodium (b), "panelden bakılsa bile görülmesin" şartını karşılamıyor. Okulun elindeki anahtarla şifreleme (c), denetçi erişimini, il içi T.C. kontrolünü ve anahtar kurtarmayı kırıyor; teknik bilgisi az okul personeli için anahtar kaybı riski de çok yüksek.
- **Hemen, şifreleme beklemeden yapılabilecekler:** Öğrenci adları **denetim günlüğüne** (`audit_log.aciklama`) ve **hesap hareketleri açıklamasına** (`hesap_hareketleri.aciklama`) düz metin olarak yazılıyor. Kolonları şifrelesek bile adlar buralardan okunur kalır (bkz. §1.3).

---

## 1. Kişisel veri envanteri

### 1.1 Tablolar ve kolonlar

Öncelik: **Y** = yüksek (çocuk verisi, TC, IBAN), **O** = orta, **D** = düşük (kamu görevlisi unvanı/adı, kurum bilgisi).

| Tablo | Kolon | İçerik | Öncelik | Kaynak (şema) |
|---|---|---|---|---|
| `ogrenciler` | `ad`, `soyad` | Çocuğun adı-soyadı | Y | `schema.sql` |
| `ogrenciler` | `tc` | Çocuğun T.C. kimlik no | Y | `schema.sql`, benzersizlik: `migration_fix_unique_tc_multitenant.sql` (`UNIQUE (tc, okul_id)`) |
| `ogrenciler` | `anne_adi`, `anne_tel` | Veli adı / telefonu | Y | `schema.sql` |
| `ogrenciler` | `veli_ad` | Veli adı | Y | `migration_add_ogrenci_veli_ad.sql`, `migration_ogrenci_turu.sql` |
| `ogrenciler` | `veli_eposta` | Veli e-postası (döküm gönderimi) | Y | `migration_ogrenci_veli_eposta.sql` |
| `ogrenciler` | `ucretsiz_nedeni` | Serbest metin; "şehit yakını", "engelli" gibi hassas bilgi içerebilir | O | `schema.sql` |
| `ogrenciler` | `ogretmen` | Öğretmenin adı (serbest metin) | O | `schema.sql` |
| `personel` | `ad` | Ad **ve** soyad tek kolonda ("HAMİDE KARATAŞ DEMİRCAN") | Y | `schema.sql`; `lib/muhsgk.ts → adSoyadAyir` |
| `personel` | `tc` | T.C. kimlik no | Y | `schema.sql`, `UNIQUE (tc, okul_id, gorev)` (`migration_personel_tc_gorev_unique.sql`) |
| `personel` | `iban` | IBAN | Y | `schema.sql` |
| `personel` | `email` | E-posta (bordro gönderimi) | Y | `migration_add_personel_email.sql` |
| `personel` | `sgk_no` | SGK sicil no (çoğunlukla TC ile aynı) | Y | `lib/types.ts` |
| `personel` | `is_retired`, `vergi_istisnasi`, `kadro_durumu` | Emeklilik / istisna durumu | D | kişisel ama tek başına kimlik belirtmez; şifreleme kapsamı dışı önerilir |
| `bordro` | `brut`, `net`, … | Maaş bilgisi | D–O | `personel_id` ile bağlanır; ad şifrelenince kimliksizleşir. Kapsam dışı önerilir |
| `profiller` | `ad`, `soyad` | Okul yöneticisi / denetçinin adı | O | `migration_profiller_ad_soyad.sql` |
| `denetci_talepleri` | `ad_soyad`, `email`, `telefon`, `notlar` | Denetçi başvuranı | O | `migration_denetci_talepleri.sql` |
| `denetim_raporlari` | `denetciler` (JSONB `{ad, unvan}`), `baskan_ad` | Denetçi ve okul müdürünün adı | D | `migration_denetim_raporu.sql` |
| `ayarlar` | `mudur_adi`, `duzenleyen_adi`, `tel`, `email`, `imza_url` | Kurum yetkilisi | D | `schema.sql`, `lib/types.ts` |
| `ayarlar` | `muhsgk_bilgileri` (JSONB) | Mali müşavirin TC, ad, soyad, e-posta ve telefonu | O | `migration_muhsgk_bilgileri.sql`, `lib/muhsgk.ts:26,46` |
| `siniflar` | `ogretmen` | Öğretmenin adı (serbest metin) | O | `lib/types.ts` (`Sinif`) |
| `audit_log` | `aciklama`, `ip_adresi` | **Öğrenci adları içeriyor** (bkz. §1.3), IP | Y | `migration_audit_log*.sql` |
| `hesap_hareketleri` | `aciklama` | **"Öğrenci ödemesi: Ad Soyad …"** yazılıyor | Y | `app/isletme-defteri/IsletmeDefteri.tsx:538` |
| `tahsilat`, `tahsilat_kayitlari`, `isletme_defteri`, `giderler` | `aciklama` | Banka ekstresinden gelen serbest metin; çoğu zaman ödeyen velinin adını içerir | O | ilgili migration dosyaları |
| `tahakkuk` | `dagilim_json.ogretmen_paylari[].ad` | Tipte tanımlı; şu an yazan kod bulunamadı | D | `lib/types.ts:218` |
| Supabase Storage `personel`, denetim belgeleri | PDF dosyaları | İşe giriş bildirgesi, 4/A listesi gibi belgelerde TC ve ad var | Y | `migration_denetim_raporu.sql`, `migration_denetim_dosyasi.sql` |
| `auth.users` | `email` | Okul yöneticisi ve denetçi giriş e-postası | — | Supabase Auth'un çalışması için düz metin olmak **zorunda**; kapsam dışı |

### 1.2 Okunduğu ve yazıldığı yerler

**Okuma ve yazmanın neredeyse tamamı tarayıcıda, Supabase istemcisiyle yapılıyor.** Öğrenci ya da personel tablosuna dokunan dosyalar:

| Alan | Dosyalar | Not |
|---|---|---|
| Öğrenci listesi ve kaydı | `app/ogrenciler/page.tsx`, `app/okul-ogrenciler/page.tsx`, `components/OgrenciModal.tsx` | `select('*').order('soyad')`; sıralama ve arama tarayıcıda (`localeCompare('tr')`) |
| Personel | `app/personel/page.tsx`, `components/PersonelModal.tsx`, `app/puantaj`, `app/siniflar`, `app/ders-programi`, `app/sinif-defteri`, `app/bilanco`, `app/gelir-gider`, `lib/koordinatorTavan.ts` | `select('*').order('ad')`; `ogretmen:personel(...)` gömülü select'leri var |
| Ana sayfa araması | `app/page.tsx:73-74` | Bellekte `ad.includes(...)`, sunucuda arama yok |
| Ödeme / tahsilat | `app/odeme/page.tsx` (`ogrenciler(...)` gömülü), `app/tahsilat-takip/*` (`aramaUygun`, döküm PDF'leri) | Arama ve sıralama tarayıcıda |
| İşletme defteri | `app/isletme-defteri/IsletmeDefteri.tsx`, `lib/isletmeDefteri.ts` (`ogrenciler(...)` gömülü) | Defter PDF'i tarayıcıda |
| Banka ekstresi eşleştirme | `lib/ekstreEslesme.ts` | Açıklamadaki ad/soyadı öğrenci listesiyle **tarayıcıda** karşılaştırıyor (`foldAscii(o.ad)`, `o.soyad`). Düz metin ad gerekir, sunucuda arama gerekmez |
| Excel içe aktarma | `components/ImportModal.tsx` | Mükerrer kontrolü TC ve ad+soyad ile, **tarayıcıda**, mevcut liste üzerinden (`mevcutTcler`, `mevcutAdlar`). Ekleme `insert` ile |
| Bordro, zarf | `app/bordro/page.tsx` (`personel(...)` gömülü), `lib/bordroZarfPdf.ts` (zarfta **TC** basılıyor, satır 51), `app/muhasebe/page.tsx` | PDF'ler tarayıcıda (jsPDF) |
| MUHSGK XML | `lib/muhsgk.ts` | Tarayıcıda üretiliyor. GİB dosyasında açık ad, soyad ve TC gerekir (`<tckno>`, `<soyad>`, `adSoyadAyir`) |
| Denetim dosyası, EK-6, hesap kontrol | `lib/denetimDosyasi.ts`, `lib/ek6.ts`, `components/DenetciHesapKontrol.tsx`, `lib/hesapKontrolPdf.ts`, `app/denetim/page.tsx` | Denetçi, RLS'teki `denetim_okulu_mu(okul_id)` üzerinden **başka okulun** öğrenci ve personelini okuyor |
| **İl içi TC çapraz kontrolü** | `components/DenetciHesapKontrol.tsx:125` → `lib/hesapKontrol.ts:615-620` | `personel.in('tc', tcler).neq('okul_id', okulId)`: aynı TC'nin il içindeki **başka okullarda** da olup olmadığına bakıyor. Okul başına anahtarla bu sorgu çalışmaz; ayrı bir çözüm gerekiyor (§4.4) |
| E-posta (Resend) | `app/api/bordro/send-email/route.ts`, `app/api/ogrenci/dokum-email/route.ts`, `lib/eposta.ts` | Tarayıcı, **hazırlanmış PDF'i** ve alıcı adresini sunucuya gönderiyor; sunucu yalnızca iletiyor. Alıcı adresi ve PDF Resend'e düz metin gider (başka yolu yok) |
| Sunucu tarafında kişisel veri okuyan API | `app/api/admin/kullanici/route.ts` | Yalnızca `count` alıyor, içerik okumuyor |
| Denetim günlüğü araması | `app/api/admin/audit/route.ts:29` | `audit_log.aciklama` üzerinde **sunucuda `ilike`**. Sunucuda metin araması yapan tek yer burası |
| Veritabanı fonksiyonları (RPC) | `denetim_*`, `okul_bildirimi_okundu`, `get_my_okul_id` | Hiçbiri ad, soyad veya TC kullanmıyor; şifrelemeden etkilenmezler |

### 1.3 Şifrelemeden önce kapatılması gereken sızıntılar

1. **`audit_log.aciklama`**: `app/ogrenciler/page.tsx:111,128`, `app/okul-ogrenciler/page.tsx:122,132` ve `app/odeme/page.tsx:196` günlüğe "`Ad Soyad` arşive kaldırıldı" ya da "`Ad Soyad` için ödeme kaydedildi" yazıyor. Kolonlar şifrelense de adlar burada açık kalır. **Çözüm:** Açıklamaya ad yazılmasın, yalnızca `kayit_id` yazılsın; ekran adı gösterirken kaydı çözerek alsın. Eski satırlar maskelensin.
2. **`hesap_hareketleri.aciklama`**: `IsletmeDefteri.tsx:538` "Öğrenci ödemesi: Ad Soyad …" yazıyor. **Çözüm:** Ad yazılmasın, `kaynak='tahsilat'` ve `kaynak_id` ile öğrenciye bağlanılsın; ekranda ad çözülerek gösterilsin.
3. Banka ekstresinden gelen **serbest açıklamalar** (`tahsilat.aciklama`, `isletme_defteri.aciklama` vb.) ödeyen velinin adını içerir. Bunlar da Faz 4'te şifrelenecek alanlara eklenmeli (bkz. §6). Sunucuda arama yapılmadığı için şifrelemek bir işlevi bozmuyor.
4. **`ogrenciler.ogretmen` ve `siniflar.ogretmen`**: Ad serbest metin olarak tekrar ediyor. Ya şifrelenmeli ya da `personel_id` referansına çevrilmeli.

---

## 2. Tehdit modeli: neye karşı koruyoruz?

| # | Senaryo | (a) Uygulama katmanı | (b) Vault/pgsodium | (c) Okulun anahtarı |
|---|---|---|---|---|
| T1 | Veritabanı dökümü / yedek sızar | ✅ korunur | ⚠️ kök anahtar dökümde yoksa korunur | ✅ korunur |
| T2 | Supabase panelinden (SQL Editor / Table Editor) bakılır | ✅ korunur (anahtar Supabase'de değil) | ❌ **korunmaz**: panel `postgres` rolüyle çözülmüş görünümü okur | ✅ korunur |
| T3 | `service_role` anahtarı sızar | ✅ korunur | ❌ korunmaz | ✅ korunur |
| T4 | RLS hatası, başka okulun satırı görünür | ✅ çözme uç noktası okul yetkisini ayrıca denetler | ❌ korunmaz | ✅ korunur |
| T5 | Vercel ortam değişkenleri ve Supabase **birlikte** ele geçer | ❌ korunmaz | ❌ | ✅ kısmen (bkz. not) |
| T6 | Okul yöneticisinin hesabı ele geçer | ❌ (yetkili kullanıcı her şeyi görür) | ❌ | ❌ |
| T7 | Klüp360 işletmecisinin kendisi (içeriden tehdit) | ⚠️ KEK'e erişimi olan kişi çözebilir; çözme günlüğe yazılır | ❌ | ✅ kısmen |

> **Not (c için):** Tarayıcıda çalışan JavaScript'i Vercel'den Klüp360 sunuyor. Dağıtımı ele geçiren biri anahtarı tarayıcıdan sızdıran bir kod yayımlayabilir. Bu, web tabanlı uçtan uca şifrelemenin bilinen bir sınırı: (c) işletmeciye karşı tam değil, yalnızca "pasif" koruma sağlar.

---

## 3. Seçeneklerin karşılaştırılması

### (a) Uygulama katmanında alan bazlı şifreleme (anahtar Supabase dışında)

**Nasıl çalışır?**
- Bir **ana anahtar (KEK)** Vercel'de "Sensitive" ortam değişkeninde ya da bir KMS'te (AWS KMS / GCP KMS / Azure Key Vault) durur ve Supabase'e hiç girmez.
- Her okul için rastgele 256 bitlik bir **veri anahtarı (DEK)** üretilir. DEK, KEK ile sarılarak (AES-KW ya da AES-GCM) yeni bir `okul_anahtarlari` tablosunda saklanır. Bu tabloda RLS açıktır ve hiç politika yoktur; tarayıcı okuyamaz.
- Her alan `AES-256-GCM` ile şifrelenir. Biçim: `enc:v1:<anahtar_sürümü>:<base64(iv‖şifreli‖etiket)>`. Kolon `TEXT` olarak kalır, böylece önekten eski düz metin satırlar ayırt edilebilir.
- **AAD (ek doğrulanmış veri):** `okul_id|tablo|kolon`. Bir okulun şifreli değeri başka okula ya da başka kolona kopyalanırsa çözme başarısız olur.
- **Kör indeks:** TC için `HMAC-SHA256(indeks_anahtari, normalize(tc))` değerinin ilk 16 baytı `tc_bidx` kolonunda tutulur. Benzersizlik kısıtı ve "bu TC kayıtlı mı?" araması bunun üzerinden yapılır.

**Mevcut mimariye nasıl oturur?**
Tarayıcı Supabase'den **şifreli** satırları yine RLS ile çeker; bu kısım değişmez. Ardından şifreli alanları toplu olarak `POST /api/kisisel-veri/coz` uç noktasına gönderir. Rota işleyicisi şunları yapar:
1. JWT'yi doğrular ve `profiller` tablosundan rolü ve `okul_id`'yi alır.
2. Her değerin AAD'sindeki `okul_id` için yetkiyi denetler:
   - okul yöneticisi → `okul_id = kendi okulu`
   - denetçi → kullanıcının JWT'siyle `denetim_okulu_mu(okul_id)` çağrısı
   - süper yönetici → varsayılan olarak **çözemez** (bkz. §7)
3. DEK'i açar (bellekte kısa süre önbelleğe alınabilir), değerleri çözer ve döndürür.

Yazarken `POST /api/kisisel-veri/sifrele` şifreli değeri ve kör indeksi döndürür; tarayıcı bunları Supabase'e yazar. Böylece **sayfaların sorgu kodu değişmez**; değişen yalnızca "getir → `kvCoz(satırlar)` → kullan" ve "`kvSifrele(form)` → kaydet" adımlarıdır. Gömülü select'ler (`personel(...)`, `ogrenciler(...)`) için yardımcı, iç içe nesneleri dolaşarak çözer.

| Konu | Değerlendirme |
|---|---|
| Kim düz metni görür? | Yetkili okul kullanıcısı ve o okulu denetleyen denetçi (tarayıcıda). Sunucu fonksiyonu, istek sırasında bellekte görür; günlüğe yazmaz. Supabase, yedek ve panel **göremez**. KEK'e erişebilen işletmeci teorik olarak görebilir (§2 T7). Bu erişim günlüğe yazılır ve iki kişilik kurala bağlanabilir |
| Arama | Ad araması zaten tarayıcıda yapılıyor ve aynen çalışır. TC tam eşleşme araması `tc_bidx` ile yapılır. Sunucuda `ilike` yalnızca `audit_log`'da var ve oraya ad yazılmayacak (§1.3) |
| Sıralama | `.order('soyad')` / `.order('ad')` şifreli metinde anlamsızlaşır, kaldırılır. Sayfalar zaten `localeCompare('tr')` ile tarayıcıda sıralıyor; çözmeden sonra aynı sıralama uygulanır. Sayfalama yok (`hepsiniCek.ts` hepsini çekiyor), bu yüzden sorun çıkmaz |
| PDF / Excel / MUHSGK XML | Tarayıcıda, çözülmüş veriyle **aynen** üretilir. Kod değişmez, yalnızca girdi çözülmüş gelir |
| E-posta | Değişmez: tarayıcı PDF'i ve alıcı adresini zaten düz metin gönderiyor. Resend'e giden içerik şifrelenemez (§4.6) |
| Excel içe aktarma | Mükerrer kontrolü çözülmüş liste üzerinden tarayıcıda yapılır. Ekleme öncesinde toplu `sifrele` çağrılır |
| Banka ekstresi eşleştirme | Değişmez; çözülmüş öğrenci listesiyle tarayıcıda çalışır |
| Denetçi | Rota işleyicisi `denetim_okulu_mu` ile yetki verir; denetçi başka okulun DEK'iyle çözülmüş veriyi görür. İl içi TC kontrolü için bkz. §4.4 |
| Performans | AES-GCM çok hızlı: 500 öğrenci × 7 alan ≈ 3.500 değer, 5 ms'nin altında. Asıl maliyet sayfa yüklenirken bir ek istek (~100-300 ms, Vercel bölgesine göre). Çözülmüş listeler oturum boyunca bellekte (React context) tutulur; `localStorage`'a yazılmaz. Veri boyutu alan başına ~45 bayt artar |
| Migration | İkili okuma (önek yoksa düz metin kabul edilir) ve arka planda doldurma; ayrıntı §6 |
| Anahtar döndürme | KEK döndürme: yalnızca `okul_anahtarlari` satırları yeniden sarılır (saniyeler sürer). DEK döndürme: o okulun satırları yeniden şifrelenir (arka plan işi, `anahtar_sürümü` ile kademeli). İndeks anahtarı döndürme: nadiren, tüm `*_bidx` yeniden hesaplanır |
| Yedekler | Yedekte yalnızca şifreli değer ve sarılı DEK bulunur; KEK yedekte yoktur. **Kripto-imha:** Sözleşmesi biten okulun DEK'i silinince o okulun verisi geriye dönük **tüm yedeklerde** okunamaz hâle gelir. Bu, KVKK silme/yok etme yükümlülüğü için güçlü bir araçtır |
| Risk | KEK kaybolursa her şey kaybolur. KEK çevrimdışı iki ayrı yerde (ör. ürün sahibinin parola yöneticisi ve kasadaki kâğıt kopya) yedeklenmeli |
| KVKK | m.12 "teknik tedbir" kapsamında güçlü bir önlem. Veri ihlalinde ele geçen veri şifreli olur ve etkisi azalır (ihlal yine değerlendirilip gerekiyorsa bildirilir). Klüp360 veri işleyen olarak anahtarı tuttuğu için veri hukuken **kişisel veri olmaya devam eder**; yurt dışına aktarım yükümlülükleri ortadan kalkmaz (§4.7) |
| Geliştirme maliyeti | Orta: 1 sunucu modülü, 2 rota işleyicisi, 1 istemci yardımcısı, ~25 dosyada "çöz/şifrele" çağrısı ve şema değişiklikleri |

### (b) Supabase Vault / pgsodium sütun şifrelemesi (TCE)

**Nasıl çalışır?** pgsodium'un "Transparent Column Encryption" özelliği kolonu `SECURITY LABEL` ile işaretler ve şifreli kolonu çözen bir `decrypted_<tablo>` görünümü oluşturur. Kök anahtar Supabase altyapısında, veritabanı dışında tutulur. Vault ise aynı altyapının "gizli değer saklama" yüzüdür ve toplu kolon şifrelemesi için tasarlanmamıştır.

| Konu | Değerlendirme |
|---|---|
| Kim düz metni görür? | Çözülmüş görünüme `SELECT` yetkisi olan **her rol**: `postgres` (Supabase paneli, SQL Editor), `service_role` ve görünüme izin verilirse `authenticated`. **Ürün sahibinin "panelden bakılsa bile görülmesin" şartını karşılamaz** |
| Arama ve sıralama | Görünüm üzerinden `ilike` ve `order by` çalışır, ama her satır sorgu sırasında çözülür ve indeks kullanılamaz |
| Performans | Satır başına çözme maliyeti veritabanında oluşur; birkaç bin satırda sorun olmaz |
| Migration | Kolon etiketleme ve tetikleyiciler; PostgREST'in görünüm üzerinden yazması için ek düzen gerekir. Tarayıcı kodu `from('decrypted_ogrenciler')` kullanacak şekilde değişir |
| Anahtar döndürme | pgsodium anahtar kimlikleriyle yapılır; elle iş gerekir |
| Yedekler | Yedekteki kolon şifreli; kök anahtar Supabase'in elinde |
| Platform riski | Supabase pgsodium'u kullanımdan kaldırma sürecine aldı ve TCE'yi yeni projelere önermiyor (uygulamadan önce güncel Supabase dokümanıyla doğrulanmalı). Vault devam ediyor, ama kolon şifrelemesi için değil |
| KVKK | Veritabanı dosyası çalınmasına karşı fayda sağlar; panel ve `service_role` erişimine karşı sağlamaz |
| Sonuç | **Önerilmez.** Kritik şart olan panel/işletmeci erişimini karşılamıyor ve kullanımdan kalkan bir özelliğe bağımlı |

### (c) Okul tarafında tutulan anahtarla istemci tarafı şifreleme (sıfır bilgi)

**Nasıl çalışır?** Okulun DEK'i tarayıcıda (WebCrypto) üretilir ve sunucuya hiç açık gitmez. DEK şu biçimlerde sarılı saklanır:
1. Her okul kullanıcısı için, kullanıcının **ayrı bir şifreleme parolasından** türetilen anahtarla (PBKDF2/Argon2).
2. Bir **kurtarma anahtarıyla** (okula bir kez gösterilen 24 kelime ya da PDF).
3. Denetçi erişimi için, denetçinin **açık anahtarıyla** (ECDH P-256). Bu sarmayı okul kullanıcısının tarayıcısı yapmak zorundadır.

| Konu | Değerlendirme |
|---|---|
| Kim düz metni görür? | Yalnızca DEK'i açabilen okul kullanıcıları ve okulun yetki verdiği denetçiler. Klüp360 sunucusu, Supabase ve yedekler göremez (§2'deki "kod sunan taraf" notuyla) |
| Arama ve sıralama | (a)'daki gibi tarayıcıda çalışır. TC kör indeksi okul anahtarıyla tarayıcıda hesaplanır |
| PDF / Excel / MUHSGK | Zaten tarayıcıda üretildiği için çalışır |
| E-posta | Çalışır (PDF tarayıcıda hazırlanıyor), ama alıcı adresi ve PDF Resend'e yine açık gider |
| Denetçi | **Zor.** Okul paneline giren her yeni denetçi için okul kullanıcısının çevrimiçi olup DEK'i denetçinin anahtarına sarması gerekir. Denetçi değişirse ya da okul hiç giriş yapmazsa denetçi dosyayı göremez. İl denetimi akışı (denetçi istediği zaman okulu açar) bozulur |
| İl içi TC çapraz kontrolü | **Çalışmaz.** Okullar arası karşılaştırma için ortak bir anahtar gerekir; o anahtar tüm tarayıcılara dağıtılırsa gizli olmaktan çıkar |
| Süper yönetici desteği | Okulun verisine destek amacıyla bakılamaz. Bu bir artı, ama destek maliyeti artar |
| Anahtar kaybı | **En büyük risk.** Parolasını ve kurtarma anahtarını kaybeden okulun öğrenci, personel ve bordro geçmişi **kalıcı olarak** okunamaz; denetim dosyası, MUHSGK geçmişi ve işletme defteri dahil. Teknik bilgisi az okul personeli ve sık değişen müdürler düşünüldüğünde bu kayıp gerçekçi bir olasılık |
| Performans | Tarayıcıda çözme hızlı; ek sunucu isteği yok |
| Migration | Düz metin veriyi sunucu şifreleyemez; her okulun kullanıcısı bir kez giriş yapıp "şifrelemeyi etkinleştir" adımını tarayıcıda çalıştırmalı. Hiç giriş yapmayan okul düz metin kalır |
| Anahtar döndürme | Okul kullanıcısının tarayıcısında, tüm verinin yeniden şifrelenmesiyle |
| Yedekler | Yedekler okunamaz; kripto-imha da mümkün |
| KVKK | Veri işleyen Klüp360 veriye erişemediği için en güçlü konum. Ancak veri sorumlusu okulun **erişilebilirlik / bütünlük** yükümlülüğü (anahtar kaybında veri kaybı) ve denetime sunma yükümlülüğü zorlaşır |
| Sonuç | **Varsayılan olarak önerilmez.** İleride isteyen okullar için isteğe bağlı bir "uçtan uca mod" olarak düşünülebilir. Bu durumda il içi TC kontrolü o okulda kapalı olur ve denetçi erişimi okulun onayına bağlanır |

### Karşılaştırma özeti

| Ölçüt | (a) Uygulama katmanı | (b) pgsodium/Vault | (c) Okul anahtarı |
|---|---|---|---|
| Yedek / döküm sızıntısı | ✅ | ✅ | ✅ |
| Supabase paneli / service_role | ✅ | ❌ | ✅ |
| Denetçi erişimi | ✅ (sunucu yetkisi) | ✅ | ⚠️ okul onayı gerekir |
| İl içi TC kontrolü | ✅ (ayrı indeks anahtarı) | ✅ | ❌ |
| Arama / sıralama | ✅ (tarayıcıda, zaten öyle) | ✅ | ✅ |
| PDF / MUHSGK / Excel | ✅ değişmez | ✅ | ✅ |
| Anahtar kaybı riski | Düşük (tek KEK, yedekli) | Supabase'de | **Yüksek** (her okul) |
| Kripto-imha | ✅ | ⚠️ | ✅ |
| Geliştirme maliyeti | Orta | Orta | Yüksek |
| Platform bağımlılığı | Yok (Node `crypto`) | Kullanımdan kalkan özellik | Yok (WebCrypto) |

---

## 4. Seçilen tasarımın ayrıntıları — seçenek (a)

### 4.1 Anahtarlar

| Anahtar | Nerede | Ne işe yarar |
|---|---|---|
| `KEK` (ana anahtar, 256 bit) | **İlk aşama:** Vercel "Sensitive" ortam değişkeni (`KISISEL_VERI_KEK`), yalnızca Production. **Sonraki aşama:** KMS (ör. AWS KMS, AB/TR bölgesinde) | DEK'leri sarmak ve açmak |
| `DEK_okul` (okul başına, 256 bit, rastgele) | `okul_anahtarlari(okul_id, surum, sarili_dek, olusturma, iptal)`; RLS açık, politika yok | Alan şifreleme |
| `IDX_okul` (okul başına) | DEK'ten HKDF ile türetilir (`info="bidx"`) | Okul içi TC kör indeksi (`tc_bidx`) |
| `IDX_il` (platform geneli, 256 bit) | KEK ile aynı yerde ayrı bir sır (`KISISEL_VERI_IDX_PERSONEL`) | Yalnızca personel TC'si için il içi çapraz kontrol (`tc_bidx_genel`), §4.4 |

- Sunucu modülü `lib/kisiselVeri.server.ts` olur ve en üstünde `import 'server-only'` bulunur. Bu, Next.js rehberinin (`node_modules/next/dist/docs/01-app/02-guides/data-security.md` → "Preventing client-side execution of server-only code", "Data Access Layer") önerdiği desen: `process.env` sırlarına yalnızca bu katman erişir.
- `KEK` hiçbir zaman `NEXT_PUBLIC_` önekiyle tanımlanmaz, günlüğe yazılmaz ve yanıtla dönmez.
- Ana anahtarın çevrimdışı yedeği iki ayrı yerde tutulur. Yedekten geri dönüş tatbikatı yılda bir yapılır.

### 4.2 Şifreli değer biçimi

```
enc:v1:<dek_surum>:<base64url(iv[12] ‖ ciphertext ‖ tag[16])>
AAD = "klup360|v1|<okul_id>|<tablo>|<kolon>"
```

- Boş ya da `NULL` değer şifrelenmez, `NULL` kalır. Böylece "TC girilmemiş" bilgisi sızar; bu kabul edilebilir.
- `enc:` öneki olmayan değer **eski düz metin** kabul edilir. Geçiş döneminde ikili okuma bu sayede çalışır.
- Değer uzunluğu kısmen sızar (ad uzunluğu). İstenirse 16 baytlık dolgu eklenebilir (§7).

### 4.3 Uç noktalar (Route Handler)

Konum: `app/api/kisisel-veri/coz/route.ts`, `app/api/kisisel-veri/sifrele/route.ts`. Rehber: `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`. Mevcut API rotalarıyla aynı desen kullanılır: `Authorization: Bearer` + `adminClient.auth.getUser(token)`.

- **Yetki:** İstek gövdesindeki her öğe `{okul_id, tablo, kolon, deger}` biçimindedir.
  - `rol='admin'` ise `okul_id = profil.okul_id` olmalıdır.
  - `rol='denetim_yetkilisi'` ise kullanıcının JWT'siyle `rpc('denetim_okulu_mu', {p_okul_id})` true dönmelidir.
  - `super_admin` için varsayılan ret (§7).
  - Tablo ve kolon bir izin listesinden (allow-list) gelir.
- **Sınırlar:** İstek başına en fazla ~5.000 değer; mevcut `lib/rate-limit.ts` ile kullanıcı başına dakikalık sınır.
- **Günlük:** Kim, hangi okul, kaç değer çözdü bilgisi `audit_log`'a yazılır (değerlerin kendisi yazılmaz). Olağandışı toplu çözme (ör. denetçinin il genelinde binlerce kayıt çözmesi) için uyarı.
- **Önbellek:** Yanıtlar `Cache-Control: no-store` ile döner. Rota dinamik olmalı; Next.js önbelleğine girmemeli (`08-caching.md`'deki rota önbelleği kurallarına göre doğrulanacak).
- **Hata günlükleri:** Rota işleyicisinde `console.error(err)` istek gövdesini ya da çözülmüş değeri **içermemeli**. Mevcut e-posta rotalarındaki `console.error` kullanımları da bu açıdan gözden geçirilmeli.

İstemci yardımcısı `lib/kisiselVeriIstemci.ts` şunları sağlar:

- `kvCoz(satirlar, harita)`: Gömülü nesneler dahil şifreli alanları toplar, tek istekte çözer ve yerine yazar.
- `kvSifrele(okulId, tablo, alanlar)`: Şifreli değerleri ve `*_bidx` kolonlarını döndürür.

### 4.4 Kör indeksler ve benzersizlik

| Kolon | Hesap | Kullanım |
|---|---|---|
| `ogrenciler.tc_bidx` | `HMAC(IDX_okul, tc)[:16]` | `UNIQUE (tc_bidx, okul_id)` (eski `UNIQUE (tc, okul_id)` yerine). İçe aktarmada "bu TC kayıtlı mı?" kontrolü |
| `personel.tc_bidx` | `HMAC(IDX_okul, tc)[:16]` | `UNIQUE (tc_bidx, okul_id, gorev)` |
| `personel.tc_bidx_genel` | `HMAC(IDX_il, tc)[:16]` | `DenetciHesapKontrol.tsx:125`'teki `.in('tc', …).neq('okul_id', …)` sorgusu `.in('tc_bidx_genel', …)` olur. İl içi "başka kulüpte de kayıtlı" uyarısı korunur |

- **Normalleştirme:** Boşluklar atılır; yalnızca 11 rakam kabul edilir (`ImportModal` ile aynı kural).
- **Ödünleşim:** `tc_bidx_genel` sayesinde DB'ye erişen biri "bu iki okuldaki iki personel aynı kişi" bağlantısını kurabilir, ama TC'yi göremez. Anahtar olmadan 11 haneli TC'yi kaba kuvvetle bulmak HMAC sayesinde mümkün değildir. Bu ödünleşim yalnızca personel için kabul edilir; öğrenci TC'sinde genel indeks **yok**.
- Ad ve soyad için kör indeks **yok**, çünkü aramalar tarayıcıda yapılıyor. Ad için kör indeks, soyad sıklığı analizine de açık olurdu.

### 4.5 Neler şifrelenmeyecek (bilinçli olarak)

- `okul_id`, `id`, tarih, tutar, `ay`/`yil`, `sinif`, `aktif`, `ogrenci_turu`, bordro tutarları. Uygulamanın sorgu, filtre ve RLS mantığı bunlara dayanıyor ve ad/TC olmadan kimlik belirtmiyorlar.
- `auth.users.email`: Supabase Auth gereği.
- `okullar.ad`, `iller`, `ilceler`: kurum verisi.

### 4.6 E-posta (Resend) ve dış servisler

- Alıcı adresi, konu (`… ödeme dökümü` başlığında öğrenci adı geçiyor) ve PDF eki Resend'e açık gider. Bu, gönderimin doğası gereği şifrelenemez.
- Azaltma önerileri (ayrı karar):
  - Konudan öğrenci adını çıkarmak.
  - Bordro zarfındaki TC'yi maskelemek (`123******01`).
  - Resend'de e-posta içeriğinin saklanma süresini gözden geçirmek.
- Dodo Payments'a (ve eski aboneler için Lemon Squeezy'ye) öğrenci verisi gitmiyor; yalnızca okul ve abonelik bilgisi gidiyor.

### 4.7 KVKK açısından

> Hukuki değerlendirme değildir. Veri sorumlusu okulla yapılan sözleşme ve aydınlatma metni için bir hukukçuya danışılmalıdır.

- **m.12 (veri güvenliği):** Alan bazlı şifreleme, Kurul'un "Kişisel Veri Güvenliği Rehberi"nde sayılan teknik tedbirlerle uyumludur. Veri İşleme Sözleşmesi'ne ve aydınlatma metnine "kişisel veriler veritabanında okul bazında ayrı anahtarlarla şifreli tutulur" ifadesi eklenebilir.
- **Çocuk verisi:** Özel nitelikli kişisel veri değildir. `ucretsiz_nedeni` serbest metni ise engellilik ya da sağlık gibi özel nitelikli bilgi içerebilir; bu yüzden şifreleme kapsamına alınması önerilir.
- **İhlal bildirimi (m.12/5):** Şifreli veri sızarsa ve anahtar sızmadıysa etki ciddi biçimde azalır. Bildirim gereği yine olay bazında değerlendirilir; şifreleme bildirim yükümlülüğünü otomatik olarak kaldırmaz.
- **Silme / yok etme:** Okul ayrıldığında DEK silinerek (kripto-imha) yedeklerdeki kopyalar da okunamaz hâle gelir. Yedeklerin ayrıca silinemediği durumlar için bu önemli bir tedbirdir.
- **Yurt dışına aktarım (m.9):** Anahtarı Klüp360 tuttuğu sürece şifreli veri de kişisel veridir. Supabase ve Vercel bölgesi yurt dışındaysa aktarım hükümleri (2024 değişikliğiyle gelen standart sözleşme ve Kurum'a bildirim) uygulanır. **Supabase projesinin bölgesi henüz bilinmiyor; bu ayrıca netleştirilmeli.** KMS kullanılırsa KMS bölgesi de aynı değerlendirmeye girer. Şifreleme bu yükümlülüğün yerini tutmaz, ama riski azaltır.

### 4.8 Bilinen kalan riskler

- Tarayıcı belleğinde çözülmüş veri bulunur. Okul bilgisayarı ele geçerse görünür; oturum zaman aşımı bunu sınırlar.
- KEK ve Supabase birlikte ele geçerse koruma kalmaz. KMS'e geçiş, KEK'in dışarı çıkarılamamasını sağlayarak bu riski azaltır.
- Storage'daki PDF'ler (personel belgeleri, denetim evrakı) bu kapsamda değil. Dosya düzeyinde şifreleme (yüklemeden önce tarayıcıda DEK ile şifreleyip indirmede çözme ya da sunucu üzerinden aracı indirme) ayrı bir iş olarak planlanmalı.
- Postgres'in eski satır sürümleri, WAL ve PITR yedekleri, migration öncesi düz metni **saklama süresi dolana kadar** tutar (§6, Faz 5).

---

## 5. Öneri

**Seçenek (a) önerilir:** uygulama katmanında AES-256-GCM, okul başına sarılı DEK, Supabase dışında tutulan KEK (önce Vercel Sensitive env, sonra KMS), TC için kör indeks ve şifre çözme için yetki denetimli rota işleyicisi.

Gerekçe:
1. Ürün sahibinin asıl şartını, "**Supabase panelinden ve yedekten adlar görülmesin**", karşılayan iki seçenekten biri. Diğeri (c), denetçi akışını ve il içi TC kontrolünü bozuyor; okula kalıcı veri kaybı riski de yüklüyor.
2. Mevcut mimariye en az müdahaleyle oturuyor. PDF, Excel, MUHSGK XML, banka eşleştirme, arama ve sıralama zaten tarayıcıda; bu kodların **mantığı değişmiyor**.
3. Okul bazlı anahtar sayesinde kripto-imha mümkün, KVKK silme yükümlülüğü yedekler dahil karşılanabiliyor.
4. İleride isteyen okullar için (c) "uçtan uca mod" olarak üzerine eklenebilir. DEK'i sunucu yerine okul parolasıyla sarmak, aynı veri biçimini korur.

---

## 6. Kademeli uygulama planı

Her faz ayrı bir PR ve ayrı bir onaydır. Canlı veritabanına dokunan her adım (migration, doldurma betiği) önce bir **Supabase dal/test projesinde**, anonimleştirilmiş veriyle denenir.

### Faz 0 — Şifrelemeden bağımsız hızlı kazanımlar (1-2 gün)
- `logIslem` / `logAudit` çağrılarından öğrenci ve personel adlarını çıkar, `kayit_id` yeterli (`app/ogrenciler/page.tsx`, `app/okul-ogrenciler/page.tsx`, `app/odeme/page.tsx`). Denetim günlüğü ekranı adı gerekirse kayıttan çözerek gösterir.
- `IsletmeDefteri.tsx:538`: `hesap_hareketleri.aciklama`'ya ad yazma.
- Eski satırları maskeleyen tek seferlik SQL (onayla, önce testte).
- E-posta konusundan öğrenci adını çıkar; zarfta TC'yi maskele (karar gerekirse).
- Supabase ve Vercel bölgesini netleştir (§7).

### Faz 1 — Altyapı (kod; veriye dokunmaz)
- `lib/kisiselVeri.server.ts` (`server-only`): şifrele/çöz, DEK sarma/açma, HKDF, HMAC, biçim ayrıştırma.
- `okul_anahtarlari` tablosu için migration (RLS açık, politika yok); yeni okul kaydında (`app/api/kayit/route.ts`) DEK üretimi.
- `app/api/kisisel-veri/coz` ve `sifrele` rota işleyicileri, yetki denetimi, oran sınırı, günlük.
- `lib/kisiselVeriIstemci.ts`: `kvCoz`, `kvSifrele`; önek yoksa düz metni olduğu gibi döndürür (geriye dönük uyum).
- **Bayrak:** `ayarlar` ya da `okullar` üzerinde `sifreleme_durumu` ('kapali' | 'ikili' | 'tam'). Bir okulda deneyip açmak için.
- Testler (vitest):
  - gidiş-dönüş;
  - yanlış AAD ve başka okul → ret;
  - bozuk etiket → ret;
  - eski düz metin geçişi;
  - TC normalleştirme ve kör indeks kararlılığı;
  - KEK döndürmede eski sürümün okunabilmesi.

### Faz 2 — `personel` (önce bu: satır az, en hassas alanlar TC ve IBAN burada)
- Kolonlar: `ad`, `tc`, `iban`, `email`, `sgk_no` ve yeni `tc_bidx`, `tc_bidx_genel`.
- Okuyan dosyalara `kvCoz` eklenir (bordro, puantaj, personel, sınıflar, ders programı, sınıf defteri, bilanço, gelir-gider, muhasebe, denetim, `DenetciHesapKontrol`, `lib/denetimDosyasi.ts`, `lib/ek6.ts`, `lib/koordinatorTavan.ts`). `.order('ad')` kaldırılır ve tarayıcıda `localeCompare('tr')` ile sıralanır.
- Yazanlar: `components/PersonelModal.tsx`, `components/ImportModal.tsx`.
- İl içi TC kontrolü `tc_bidx_genel` ile çalışır.
- **Doldurma betiği** (`scripts/`, service role ile, okul okul): Düz metni okur, şifreler, indeksleri yazar. Satırlar küçük partiler halinde güncellenir ve tekrar çalıştırılabilir (yalnızca `enc:` öneki olmayanları işler).
- Benzersizlik kısıtları `tc_bidx`'e taşınır; eski `tc` kısıtı kaldırılır.

### Faz 3 — `ogrenciler`
- Kolonlar: `ad`, `soyad`, `tc`, `anne_adi`, `anne_tel`, `veli_ad`, `veli_eposta`, `ucretsiz_nedeni`, `ogretmen` ve yeni `tc_bidx`.
- Okuyan dosyalar: öğrenciler, okul öğrencileri, ödeme, tahsilat takip (döküm PDF'leri dahil), işletme defteri (`lib/isletmeDefteri.ts` gömülü select), ana sayfa araması, denetim, `lib/ek6.ts`, `DenetciHesapKontrol`.
- Yazanlar: `OgrenciModal`, `ImportModal`, `okul-ogrenciler`.

### Faz 4 — Diğer alanlar
- `profiller.ad`/`soyad`, `denetci_talepleri` (`ad_soyad`, `email`, `telefon`, `notlar`), `ayarlar.muhsgk_bilgileri` (mali müşavir TC/iletişim), `siniflar.ogretmen`.
- Serbest açıklamalar: `tahsilat.aciklama`, `tahsilat_kayitlari.aciklama`, `isletme_defteri.aciklama`, `hesap_hareketleri.aciklama`.
- Not: `profiller` ve `denetci_talepleri` süper yönetici ekranlarında (`app/api/admin/*`) sunucuda okunuyor. Bu alanlar için şifre çözme sunucu modülünden doğrudan yapılır ve süper yöneticinin bu alanları görmesi gerekir. Bu yüzden bu iki tablo için ayrı bir "platform DEK'i" kullanılır (okul DEK'i değil).
- `denetim_raporlari.denetciler`/`baskan_ad`, `ayarlar.mudur_adi`/`duzenleyen_adi`: Kamu görevlisinin unvanıyla birlikte resmî belgeye basılan adı. Düşük öncelik; ürün sahibinin kararına bağlı (§7).

### Faz 5 — Temizlik ve doğrulama
- Doldurma tamamlanınca düz metin kalmadığını doğrulayan sorgu: `WHERE ad NOT LIKE 'enc:%'` sonucu 0 satır olmalı. Bundan sonra kolonlar yalnızca `enc:` önekiyle yazılabilir; bunu bir `CHECK` kısıtı zorlar.
- Eski satır sürümlerinin diskten silinmesi için tablo yeniden yazma (`VACUUM FULL` ya da `pg_repack`, bakım penceresinde).
- **Yedekler:** Migration öncesine ait günlük yedekler ve PITR, Supabase planının saklama süresi (ör. 7 gün) dolana kadar düz metin içerir. Bu süre sonunda "artık hiçbir yedekte düz metin yok" denebilir. Bu tarih ürün sahibine ve KVKK kayıtlarına not edilir.
- KMS'e geçiş (isteğe bağlı): KEK'i KMS'e taşı, DEK'leri yeniden sar. Veri yeniden şifrelenmez.

### Geriye dönük uyum

- **Geçiş süresince ikili okuma:** `enc:` öneki olmayan değer düz metin kabul edilir. Okul okul `sifreleme_durumu='ikili'` ile açılır.
- **Geri alma:** Faz 5'e kadar doldurma betiğinin ters yönü (çöz → düz metin yaz) mümkündür. Faz 5'ten sonra geri dönüş yalnızca anahtarla, yani yeniden çözerek olur.
- Mevcut PDF, Excel ve XML çıktıları **bayt bayt aynı** kalmalıdır (bkz. test stratejisi).

### Test stratejisi

1. **Birim (vitest):** `lib/kisiselVeri.server.ts` için §Faz 1'deki senaryolar. `lib/muhsgk.test.ts`, `lib/ekstreEslesme.test.ts` ve `lib/hesapKontrol.test.ts` çözülmüş girdiyle aynen geçmeli.
2. **Altın dosya testi:** Şifreleme öncesi ve sonrası, aynı test okulu için MUHSGK XML'i, bordro zarfı PDF metni, işletme defteri ve denetim dosyası çıktıları karşılaştırılır; fark olmamalı.
3. **Yetki testleri** (test Supabase projesinde):
   - A okulu kullanıcısı B okulunun değerini çözemez.
   - Denetçi yalnızca kendi ilindeki okulları çözebilir.
   - Süper yönetici varsayılan olarak çözemez.
   - Anon istek reddedilir.
4. **Panel testi:** Doldurma sonrası Supabase Table Editor'da `ogrenciler` ve `personel` açılır; `ad`, `soyad`, `tc`, `iban` sütunlarında yalnızca `enc:v1:…` görünmeli. Bu, ürün sahibinin kabul ölçütüdür.
5. **Uçtan uca (tarayıcı):** Öğrenci ekle, düzenle, ara; Excel içe aktar (mükerrer TC yakalanmalı); banka ekstresi eşleştir; bordro hesapla ve zarf e-postala; MUHSGK indir; denetçi paneli ve "başka kulüpte de kayıtlı" uyarısı.
6. **Performans:** 1.000 öğrenci ve 100 personelli sentetik okulda sayfa açılış süresi; ek gecikme 400 ms'nin altında kalmalı.

---

## 7. Açık sorular (karar gerekenler)

1. **Seçenek onayı:** (a) uygun mu? (c) ileride isteğe bağlı mod olarak düşünülsün mü?
2. **Supabase ve Vercel bölgesi:** Bilinmiyor. KVKK m.9 açısından belirleyici. Mümkünse AB (Frankfurt) ya da TR'ye taşınması ayrıca değerlendirilmeli.
3. **Anahtar yeri:** Başlangıçta Vercel Sensitive ortam değişkeni yeterli mi, yoksa doğrudan KMS mi?
4. **Süper yönetici:** Okul verisini hiç çözemesin mi? Yoksa okulun onayıyla, süreli ve günlüğe yazılan bir "destek erişimi" mi olsun?
5. **Kamu görevlisi adları** (müdür, denetçi, mali müşavir): Şifrelensin mi? Resmî belgelerde zaten görünüyorlar.
6. **Dolgu:** Ad uzunluğunun sızmaması için 16 baytlık dolgu eklensin mi? (Maliyeti küçük, faydası sınırlı.)
7. **Zarftaki TC ve e-posta konusu:** Maskeleme veya çıkarma yapılsın mı?
8. **Storage'daki PDF'ler** için ayrı bir dosya şifreleme işi açılsın mı?
