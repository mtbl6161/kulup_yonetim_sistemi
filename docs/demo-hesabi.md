# Demo hesabı — tasarım ve uygulama

> **Durum:** Uygulandı (2026-11-13). Yön: tarayıcı içi demo, seçenek (a). Ürün sahibinin sözleri: *"buraya eklenen bilgiler backende kaydolmasın"*, *"a olsun"*, ardından *"Yes, start coding"*.
> Veritabanı şeması, canlı veri ve ortam değişkenleri **değişmedi**. Değişiklikler commit edilmedi.
> Uygulamanın özeti ve doğrulanamayanlar: [§9 Uygulama durumu](#9-uygulama-durumu).

## 0. Özet

- Tanıtım sayfasındaki **"Demoyu deneyin"** düğmesi ziyaretçiyi `/demo` adresine götürür. Bu adres tarayıcıya bir demo çerezi yazar ve **gerçek panel arayüzünü** açar. Sayfalar, PDF'ler, hesaplar ve ekranlar canlıdakiyle aynı koddur.
- Demo modunda panelin veri katmanı **canlı Supabase'e hiç bağlanmaz.** `lib/supabase.ts`'in dışa verdiği istemci, istekleri tarayıcının belleğindeki örnek veriye yönlendiren bir **demo istemcisiyle** değiştirilir. Okuma ve yazma tarayıcıda kalır; sunucuya ya da veritabanına hiçbir istek gitmez.
- **Sayfa yenilenince her şey başa döner.** Veri yalnızca açık sekmenin belleğindedir; `localStorage`, `sessionStorage` ya da çerezde tutulmaz.
- Demo için **veritabanı değişikliği, yeni giriş hesabı, yeni ortam değişkeni, zamanlanmış görev ya da hız sınırı gerekmez.** Sunucuda tutulan, temizlenmesi ya da kötüye kullanılması gereken hiçbir demo kaynağı yoktur.
- Örnek veri tamamen kurgusaldır ve tarayıcıda bir üreteçle oluşturulur (`lib/demo/demoVerisi.ts`). Tutarlar uygulamanın kendi hesap fonksiyonlarıyla hesaplanır.
- **Ekranların davranışı:**
  - PDF, Excel ve MUHSGK XML gerçekten üretilip indirilir, üzerlerinde "ÖRNEK" işareti bulunur.
  - E-posta gönderilmez; gerçek hesapta neyin gideceği gösterilir.
  - Yüklenen dosyalar yalnızca tarayıcı belleğinde tutulur.
  - Ödeme sayfası yerine "15 gün ücretsiz deneyin" gösterilir.
- Panelin üstünde kapatılamayan bir şerit durur: **"Demo modundasınız · Girdiğiniz bilgiler kaydedilmez, sayfayı yenileyince sıfırlanır · 15 gün ücretsiz deneyin →"**.

---

## 1. Seçenek karşılaştırması

| Ölçüt | **(a) Tarayıcı içi demo (seçilen)** | (b) Ayrı demo Supabase projesi | (eski öneri) Canlı veritabanında geçici demo okul |
|---|---|---|---|
| Ziyaretçinin girdiği bilgi | Tarayıcıdan çıkmaz | Sunucuya gider (ayrı projeye) | Canlı veritabanına gider |
| Canlı veritabanıyla bağlantı | Yok | Yok | **Var** (şartı ihlal ediyor, elendi) |
| Ziyaretçi demoya gerçek çocuk verisi girerse (KVKK) | Klüp360 o veriyi hiç almaz | Klüp360 sözleşmesiz kişisel veri saklamış olur | Aynı sorun, üstelik canlıda |
| Panelin canlıyla aynılığı | Arayüz ve hesaplar aynı. Veri katmanı bir taklit; RLS, tetikleyici ve kısıtların davranışı taklit edilir (§3.4) | Tam aynı (gerçek Postgres ve RLS) | Tam aynı |
| İşletme yükü | Yok | İkinci Supabase projesi (ek ücret), şema iki yerde senkron tutulmalı (migration'lar elle çalıştırılıyor, kayma riski yüksek), ayrı Vercel ortamı, gece sıfırlama, temizlik, hız sınırı | Hesap açma, temizlik, hız sınırı, RLS kısıtları |
| Kötüye kullanım yüzeyi | Yok (sunucu kaynağı tüketmez) | Hesap açma, veri şişirme, dosya barındırma | Aynı, üstelik canlıda |
| Eşzamanlı ziyaretçi | Herkesin kendi sekmesi; çakışma yok | Ziyaretçi başına kopya gerekir | Ziyaretçi başına kopya gerekir |
| Yenileme sonrası | Sıfırlanır (istenen davranış) | Kalır | Kalır |
| Geliştirme maliyeti | Orta: tarayıcı içi veri taklidi (§3) | Orta-yüksek: altyapı ve işletme | Orta |

**Neden (a)?** Şartı en güçlü biçimde karşılayan tek seçenek bu: veri tarayıcıdan hiç çıkmaz. İşletme yükü sıfırdır. Ziyaretçi gerçek bir okulun verisini denemek için yazsa bile Klüp360'a kişisel veri ulaşmaz. Bedeli, Supabase'in veri katmanını tarayıcıda taklit etmek; bunun kapsamı ölçülüdür (§3.2).

---

## 2. Demoya giriş ve çıkış

### 2.1 `/demo` (Route Handler, `app/demo/route.ts`)

1. `klup360_demo=1` çerezi yazılır: oturum çerezi (tarayıcı kapanınca silinir), `SameSite=Lax`, `Path=/`. Çerez kimlik bilgisi taşımaz, yalnızca "bu sekme demo modunda" der.
2. Ardından `303 → /` yönlendirmesi yapılır.

Sunucuda hiçbir kayıt oluşturulmadığı için bu bir GET olabilir. Arama motoru tarayıcısı bağlantıyı izlese bile yalnızca boş bir panel kabuğu görür. `robots.ts` içine `/demo` için `disallow` eklenir.

Rehber: `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`. Bu sürümde `cookies()` **async**; çerez yazmak yalnızca Route Handler ya da Server Function içinde mümkün (`.../03-api-reference/04-functions/cookies.md`).

### 2.2 `proxy.ts`

Demo çerezi varsa:
- **Panel sayfaları** oturum aranmadan açılır.
- **Bakım modu sorgusu ve rol/lisans sorguları yapılmaz.** Demo isteği veritabanına anonim okuma bile göndermez.
- `/yonetim`, `/denetim`, `/kurulum`, `/odeme-yap` ve `/abonelik-yenile` adresleri `/` sayfasına yönlendirilir.

Bu çerezi elle yazan biri yalnızca boş bir panel kabuğu alır. Panel sayfaları istemci bileşenidir ve sunucuda veri çekmez (taramada doğrulandı: sunucu bileşeni olan `isletme-defteri` ve `tahsilat-takip` sayfaları yalnızca istemci bileşenini sarıyor). Bu yüzden çerez hiçbir veriye erişim açmaz.

### 2.3 Çıkış

- Şeritteki **"15 gün ücretsiz deneyin"** düğmesi `/demo/cikis?sonra=/signup` adresine gider: çerez silinir, ardından `/signup?kaynak=demo` sayfasına yönlendirilir.
- **"Demodan çık"** bağlantısı çerezi siler ve `/tanitim` sayfasına götürür.
- Giriş sayfasında başarılı girişten sonra demo çerezi de silinir.

**Gerçek bir kullanıcı oturumluyken demoya girerse:** Demo istemcisi kullanılır; gerçek oturum çerezine dokunulmaz ve gerçek veriye hiçbir istek gitmez. Demodan çıkınca kendi paneline döner.

---

## 3. Veri katmanı: demo istemcisi

### 3.1 Bağlantı noktası

Panelin tamamı veriye tek bir nesneden ulaşıyor: `lib/supabase.ts` → `supabase`. Demo bu noktada devreye girer:

```ts
// lib/supabase.ts (taslak)
export const supabase = tarayicidaDemoMu() ? demoIstemcisiOlustur() : gercekIstemci
```

- `tarayicidaDemoMu()`: `typeof window !== 'undefined'` ve `document.cookie` içinde `klup360_demo=1` olup olmadığına bakar. Sunucu tarafı işlemede (SSR) her zaman `false` döner. Panel sayfaları veriyi yalnızca `useEffect` içinde çektiği için SSR sırasında sorgu çalışmaz.
- `demoIstemcisiOlustur()`, supabase-js'in kendi `createClient`'ını şu ayarlarla kurar:
  - `url = 'https://demo.invalid'`: `.invalid` hiçbir zaman çözülmeyen, ayrılmış bir alan adıdır. Taklitte bir açık kalsa bile istek canlı Supabase'e değil **hiçbir yere** gider ve başarısız olur. Demo istemcisi gerçek Supabase adresini ve anahtarını **hiç kullanmaz**.
  - `global.fetch = demoFetch`: supabase-js'in REST (`/rest/v1`), depolama (`/storage/v1`) ve kimlik (`/auth/v1`) istekleri bu fonksiyona gelir ve bellekten yanıtlanır.
  - `auth: { persistSession: false, autoRefreshToken: false, storage: bellekDeposu }`: Bellek deposuna kurgusal bir oturum yerleştirilir; `getSession()` bunu döner, `getUser()` ise `/auth/v1/user` taklidinden kurgusal kullanıcıyı alır.
- **Paket boyutu:** `demoFetch` taklit motorunu ve üreteci ilk istekte `import()` ile yükler. Demo kullanmayan ziyaretçilerin indirdiği koda yük eklenmez.

### 3.2 Taklit edilecek kapsam (taramadan çıkan gerçek kullanım)

| Konu | Panelde kullanılan | Taklitte |
|---|---|---|
| Tablolar | Okul panelinin kullandığı ~35 tablo (`ogrenciler`, `personel`, `puantaj`, `bordro`, `tahsilat*`, `isletme_defteri`, `hesap_hareketleri`, `denetim_*`, `ayarlar`, `okullar`, `profiller`, `iller`, `ilceler`, `tatiller`, …) | Bellekte tablo başına dizi |
| Filtreler | `eq` (356), `in` (28), `match` (19), `or` (17), `gte`/`lte`, `neq`, `is`, `lt`/`gt`, `like`/`ilike` | PostgREST sorgu dizgesinin bu alt kümesi ayrıştırılır |
| Okuma biçimi | `select` kolon listesi, `order` (72), `limit`, `range`, `single` (59), `maybeSingle` (36), `count: 'exact'` (10) | `Accept` ve `Prefer` başlıklarına göre tekil nesne, 406 ya da `Content-Range` |
| Gömülü ilişki | `okullar(...)`, `ogretmen:personel(...)`, `personel(...)`, `iller(...)`, `ogrenciler(...)`, `tahsilat_kategorileri!inner(...)` | Elle yazılmış ilişki haritası (yabancı anahtar → tablo) |
| Yazma | `insert` (55), `update` (37), `delete` (47), `upsert` (18, `onConflict`) | Kimlik (`id`) sayacı, `created_at`, `okul_id` varsayılanı (tetikleyici taklidi), `return=representation` |
| Kısıtlar | `UNIQUE (tc, okul_id)`, `UNIQUE (tc, okul_id, gorev)`, bordro/puantaj benzersizlikleri | Kullanıcının karşılaşacağı benzersizlik kısıtları taklit edilir ve aynı hata kodu (`23505`) döner. Böylece `lib/supabase.ts`'teki anlaşılır hata mesajları aynen çalışır |
| RPC | Okul tarafı: `get_my_okul_id`, `denetim_maddeleri_hazirla`, `denetim_otomatik_kaydet`, `denetim_gonder`, `okul_bildirimi_okundu`, `denetim_raporu_imzalandi`, `denetim_raporu_teslim` | JavaScript karşılıkları. Denetçi tarafı RPC'leri (`denetim_karar`, `denetci_duyuru_gonder`) demoda yoktur |
| Depolama | `upload`, `remove`, `download`, `createSignedUrl` (`denetim`, `personel` kovaları) | `Blob` olarak bellekte; imzalı adres yerine `blob:` adresi |
| Gerçek zamanlı | `AuthContext`'teki `okul_status_*` kanalı | Demoda abone olunmaz |

**Desteklenmeyen bir sorgu biçimi gelirse** taklit sessizce yanlış sonuç dönmez. `DEMO_DESTEKLENMEYEN_SORGU` hatası fırlatır; bu hata geliştirmede konsola ve uçtan uca testlere yansır (§6). Böylece ileride panele yeni bir sorgu biçimi eklendiğinde demonun bozulduğu test aşamasında görülür.

### 3.3 Sunucu rotalarına giden istekler

Panelden `fetch('/api/...')` ile yapılan 9 çağrı var (e-posta, ödeme, denetçi, duyurular, kayıt). Demoda bunların hiçbiri sunucuya gitmez:

1. **Açık dal:** Her çağrı yerinde demo kontrolü yapılır ve ekranın demo davranışı uygulanır (§4).
2. **Güvenlik ağı:** Demo modunda `window.fetch` sarmalanır. `/api/` ile başlayan ya da `*.supabase.co`'ya giden her istek, ağa çıkmadan `403 { error: 'Demoda bu işlem yapılamaz' }` yanıtıyla döner. Unutulmuş bir çağrı olsa bile ziyaretçinin verisi sunucuya ulaşmaz.

### 3.4 Taklidin sınırı (bilinçli olarak kabul edilen)

- Taklit RLS'i uygulamaz; gerek de yoktur, çünkü bellekte yalnızca tek bir kurgusal okul vardır.
- Postgres tetikleyicilerinden yalnızca kullanıcının fark edeceği olanlar taklit edilir: `okul_id` varsayılanı, benzersizlik, kimlik sayacı. `audit_log` tetikleyicileri taklit edilmez; denetim günlüğü demoda üretecin yazdığı örnek kayıtları gösterir.
- Gerçek veritabanında yeni bir kısıt eklendiğinde demo bunu kendiliğinden bilmez. Bu yüzden canlı ile demo arasında küçük davranış farkları olabilir. Testler (§6) önemli akışları denetler.

---

## 4. Ekranların demodaki davranışı

| Ekran / işlem | Demoda ne olur |
|---|---|
| **Öğrenci, personel, sınıf, puantaj, tahsilat, işletme defteri, ders programı, sınıf defteri** | Tam çalışır: ekleme, düzenleme, silme, arşivleme. Değişiklik yalnızca bellekte kalır; sayfa yenilenince başa döner |
| **Bordro hesaplama** | Tam çalışır (uygulamanın kendi hesap kodu) |
| **PDF'ler** (bordro zarfı, veli dökümü, işletme defteri, denetim dosyası, EK-6, hesap kontrol) | Tarayıcıda gerçekten üretilir ve indirilir. Her sayfanın köşesinde **"ÖRNEK — KURGUSAL VERİ"** yazar, dosya adı `DEMO_` ile başlar. Bu işaret, demo çıktısının gerçek belge gibi kullanılmasını önler |
| **Excel dışa aktarma** | Üretilir ve indirilir; dosya adı `DEMO_` ile başlar |
| **MUHSGK XML** | Üretilir ve indirilir; dosya adı `DEMO_` ile başlar. XML şemasını bozmamak için dosyanın içine işaret konmaz. İndirme sırasında şu not gösterilir: *"Bu dosya kurgusal örnek veriden üretildi. Vergi numarası geçersiz olduğu için GİB'e yüklenemez."* |
| **E-posta** (bordro zarfı, veli dökümü) | Gönderilmez; sunucuya istek gitmez. Düğme bir pencere açar: *"Demoda e-posta gönderilmez. Gerçek hesabınızda bu e-posta şu adrese gider:"* + alıcı, konu ve ekli PDF'i indirme bağlantısı. Kullanıcı özelliğin ne yaptığını görür |
| **Dosya yükleme** (evrak dosyası, personel belgeleri) | Dosya tarayıcıda okunur, belleğe `Blob` olarak konur, listede görünür ve yeni sekmede açılır. Sunucuya yüklenmez, sayfa yenilenince kaybolur. Canlıdaki sınır (10 MB, personel belgelerinde yalnızca PDF) aynen uygulanır; bellek koruması için toplam 50 MB üst sınır vardır. Yükleme alanında *"Demoda dosyalar yalnızca bu tarayıcıda tutulur"* notu görünür |
| **Belge açma** | `window.location.href = signedUrl` kullanan iki yer (`lib/denetimDosyasi.ts:387`, `components/PersonelBelgeleri.tsx:20`) demoda belgeyi **yeni sekmede** açar. Aynı sekmede açılsaydı panelden çıkılır ve demo sıfırlanırdı |
| **Excel içe aktarma, banka ekstresi eşleştirme** | Tam çalışır (zaten tarayıcıda yapılıyor), sonuç belleğe yazılır |
| **Denetim dosyasını gönderme** | Çalışır; durum "Gönderildi" olur. Altında *"Demoda dosya gerçek bir denetçiye gitmez"* yazar. Geçmiş aylarda örnek olarak onaylanmış ve iade edilmiş birer ay vardır, ziyaretçi denetçi kararlarının nasıl göründüğünü görür |
| **Denetçi talebi** | Düğme pasif: *"Demoda kullanılamaz"* |
| **Duyurular** | Gerçek duyurular çekilmez; üreteçten 1–2 örnek duyuru gelir |
| **Ödeme / abonelik** (`/odeme-yap`, `/abonelik-yenile`, Ayarlar → Lisans) | Sayfalara gidilemez (§2.2). Lisans sekmesinde ödeme yerine *"Bu bir demo hesabı · 15 gün ücretsiz deneyin"* kartı görünür |
| **Ayarlar → kurum bilgileri, ücretler, oranlar** | **Değiştirilebilir**, çünkü değişiklik yalnızca bellekte kalır ve kimseyi etkilemez. Ziyaretçi saat ücretini değiştirip bordroya etkisini görebilir (ilk taslakta bu ayarlar kilitliydi; o kısıt, paylaşımlı sunucu verisini korumak içindi) |
| **Ayarlar → şifre değiştir** | Gizli: *"Demo hesabının şifresi yoktur"* |
| **Çıkış yap** | Demodan çıkar (§2.3) |
| **Deneme süresi uyarıları** | Demoda gizlenir; yerini demo şeridi alır |

### 4.1 Demo şeridi (`components/DemoSeridi.tsx`)

- Konum: Panelin en üstünde, kapatılamaz ve mobilde de görünür. `role="status"`.
- Metin: *"Demo modundasınız · Girdiğiniz bilgiler kaydedilmez, sayfayı yenileyince sıfırlanır"*.
- Düğmeler: **"15 gün ücretsiz deneyin"** (birincil) · "Demodan çık".
- Çerez yalnızca tarayıcıda okunabildiği için şerit, hidrasyon uyuşmazlığı olmasın diye sayfa yüklendikten sonra gösterilir.
- Tasarım tanıtım sayfasıyla aynı dilde olur (`tasarim-onerileri/tanitim/famly-tarzi.html`).

---

## 5. Demo verisi

### 5.1 Üreteç

`lib/demo/demoVerisi.ts` → `demoVerisiUret({ tohum, bugun })`. Saf bir fonksiyondur ve tarayıcıda çalışır. Her tablo için düz satır dizileri döner ve ilişkileri kendi kurar. Tarihler `bugun`'e göredir (son 6 ay), böylece demo her gün güncel görünür. Aynı tohum aynı okulu üretir.

Tutarlar elle uydurulmaz; uygulamanın kendi hesap kodu kullanılır: `lib/hesaplama.ts`, `lib/bordroHesap.ts`, `lib/taksit.ts`, `lib/isletmeDefteri.ts`, `lib/sgkEksikGun.ts`. Böylece bordro, tahakkuk, defter ve MUHSGK tutarlı olur; `lib/hesapKontrol.ts` demo verisinde hata bulmaz (bu bir testtir).

Demo ilk açılışta bir kez üretilir (hedef < 200 ms). Görev metnindeki "tekrar çalıştırılabilir betik" ihtiyacını bu üreteç karşılar: her açılışta, aynı tohumla aynı veri. Veritabanına yazan bir betik **yoktur**, çünkü demo veritabanı kullanmıyor.

### 5.2 İçerik

| Alan | Ne üretilir |
|---|---|
| Okul ve ayarlar | Okul adı **"Papatya Örnek Ortaokulu"**. Müdür "Deniz Örnek", adres "Örnek Mah. Kurgu Sok. No:1", telefon `0 (500) 000 00 00`, e-posta `iletisim@example.com`. Vergi ve SGK numaraları kurgusal. Asgari ücret ve SGK oranları `api/kayit`'taki güncel varsayılanlarla aynı. İl ve ilçe kurgusal ("Örnek İli") |
| Sınıflar | 4 kulüp ("Satranç", "Robotik", "Drama", "Resim"), ders programı, sınıf defteri kayıtları |
| Personel | 7 kişi: 5 öğretmen (biri koordinatör, biri emekli), 1 memur, 1 hizmetli. Örnek personel belgeleri (küçük, "ÖRNEK" damgalı PDF'ler) |
| Öğrenciler | 48 öğrenci: normal, kardeş indirimli, ücretsiz (nedeni "Örnek muafiyet") ve 2 arşivlenmiş |
| Aidat / tahakkuk | Son 6 ay, taksit planları dahil |
| Tahsilat | Çoğu ödenmiş; birkaç gecikmiş ve kısmi ödeme (tahsilat takipteki "borçlu" listesi boş görünmesin) |
| Puantaj | Son 6 ay; bir ayda tatil ve eksik gün örneği |
| Bordro | Son 6 ay, istisna kartı dahil |
| İşletme defteri / hesap hareketleri | Gelir, gider ve devir kayıtları |
| Denetim dosyası | Geçmiş aylar "onaylandı", bir ay "iade edildi" (denetçi notuyla), içinde bulunulan ay "hazırlanıyor" |
| Bildirim ve duyurular | 1–2 kurgusal kayıt |

### 5.3 Kurgusallık kuralları (testle denetlenir)

- **Soyadları** açıkça kurgusal bir havuzdan gelir: "Örnek", "Kurgu", "Taslak", "Masalcı", "Deneme", "Hayalsu". Adlar sıradan Türkçe adlardır. Ünlü, tarihî ya da gerçek bir listeden alınmış isim kullanılmaz.
- **T.C. kimlik no:** 11 hane, ama T.C. doğrulama algoritmasına **bilerek uymaz**. Böylece hiçbir gerçek kişiye ait olamaz. Taramada algoritma doğrulayan bir ekran bulunamadı; uygulama sırasında yeniden kontrol edilecek.
- **E-posta:** Yalnızca `example.com`.
- **Telefon:** `0 (500) 000 00 xx`.
- **IBAN:** `TR` + kontrol hanesi + `00000` banka kodu (var olmayan banka).
- **Açıklama alanları:** Öğrenci adı yazılmaz (şifreleme belgesindeki Faz 0 kuralıyla aynı).

---

## 6. Kişisel veri şifrelemesiyle uyum (`docs/kisisel-veri-sifreleme.md`)

- Demo hiçbir zaman veritabanına yazmadığı için şifreleme anahtarına (DEK) ihtiyacı yoktur. Okul anahtarı oluşturulmaz, çözme uç noktası çağrılmaz.
- Şifreleme tasarımında `enc:` öneki olmayan değer düz metin kabul ediliyor. Demo verisi bu önek olmadan geldiği için şifreleme devreye girdiğinde de **ekranlar aynen çalışır**.
- İstemci yardımcıları (`kvCoz`, `kvSifrele`) demoda sunucuyu çağırmamalı:
  - `kvCoz` değerleri olduğu gibi döner.
  - `kvSifrele` düz metni döner ve kör indeksi (`tc_bidx`) tarayıcıda WebCrypto ile SHA-256'dan üretir.
  - Bu kural şifreleme Faz 1'de yardımcıya eklenmeli; şifreleme belgesine de not düşülecek.
- §3.3'teki güvenlik ağı `/api/kisisel-veri/*` çağrılarını da keser.
- Şifreleme Faz 2–3'te sorgular değişirse (ör. `.eq('tc', …)` yerine `.eq('tc_bidx', …)`), taklit motoru bu kolonları da desteklemeli. Uçtan uca testler bu tür kırılmaları yakalar.

---

## 7. Uygulama planı

Veritabanı, ortam değişkeni, Vercel ayarı ya da canlı veri değişikliği **yoktur**. Bütün iş depo içindeki koddur.

| # | İş | Dosyalar | Bitti sayılması için |
|---|---|---|---|
| 1 | **Üreteç** | `lib/demo/demoVerisi.ts`, `lib/demo/kurgusalAdlar.ts`, `lib/demo/demoVerisi.test.ts` | Testler: aynı tohum aynı çıktıyı verir; ilişkiler tutarlı; kurgusallık desenleri sağlanır; `hesapKontrol` temiz; bordro toplamları `bordroHesap` ile aynı; MUHSGK XML üretilebilir |
| 2 | **Taklit motoru** | `lib/demo/taklit/sorgu.ts` (PostgREST ayrıştırıcı), `depo.ts` (tablolar, varsayılanlar, kısıtlar), `iliskiler.ts`, `rpc.ts`, `depolama.ts`, `kimlik.ts`, `demoFetch.ts`, `*.test.ts` | §3.2'deki her işlem için birim testi; desteklenmeyen sorguda açık hata |
| 3 | **Bağlantı** | `lib/demo/mod.ts` (çerez, `tarayicidaDemoMu`), `lib/supabase.ts`, `lib/AuthContext.tsx` (`demo` alanı, realtime atlama, çıkış), `proxy.ts` (demo dalı), `app/demo/route.ts`, `app/demo/cikis/route.ts`, `app/robots.ts`, `app/login/page.tsx` (çerez temizliği) | Demo çereziyle panel açılır, çerezsiz davranış değişmez |
| 4 | **Ekran davranışları** | `components/DemoSeridi.tsx`, `app/ClientLayout.tsx`; e-posta penceresi (`app/bordro`, `app/tahsilat-takip`); PDF işareti (`lib/pdf.ts` ve PDF üreten yardımcılar); dosya adı öneki (`lib/excel.ts`, `lib/muhsgk.ts` indirme noktası); belge açma (`lib/denetimDosyasi.ts`, `components/PersonelBelgeleri.tsx`); Lisans sekmesi; şifre bölümü; denetçi talebi düğmesi; `window.fetch` güvenlik ağı | §4 tablosundaki her satır |
| 5 | **Tanıtım düğmesi** | Tanıtım sayfasındaki "Demoyu deneyin" → `/demo` (tasarım oturumundaki yeni sayfayla birlikte) | Düğme demoyu açar |
| 6 | **Uçtan uca test** (Playwright, projede kurulu) | `tests/demo.e2e.ts` (konum projeye göre) | Aşağıdaki senaryo geçer |
| 7 | **Kalite kapısı** | — | `npm run lint`, `npx tsc --noEmit`, `npm test` geçer |

**Uçtan uca senaryo:**
1. Tanıtım → "Demoyu deneyin" → panel açılır, şerit görünür.
2. **Bütün panel sayfaları** sırayla gezilir; konsolda hata ve `DEMO_DESTEKLENMEYEN_SORGU` olmamalı.
3. Öğrenci eklenir ve listede görünür → bordro PDF'i indirilir → "E-posta ile gönder" penceresi açılır → `/odeme-yap` adresi `/` sayfasına döner → sayfa yenilenince eklenen öğrenci kaybolur → "15 gün ücretsiz deneyin" düğmesi `/signup` sayfasına götürür ve demo çerezi silinmiş olur.
4. **Ağ denetimi (kabul ölçütü):** Senaryo boyunca yakalanan isteklerin hiçbiri `*.supabase.co`'ya ya da `/api/` adresine gitmemeli. Yalnızca statik dosyalar ve sayfa geçişleri olmalı.

Sıralama: 1 ve 2 birbirinden bağımsız, önce bunlar yapılır. 3, 2'ye; 4 ise 3'e bağlı. Testler her adımla birlikte yazılır.

---

## 8. Kararlar (önceki açık sorular)

1. **Kurum ayarları:** Demoda değiştirilebilir (yalnızca bellekte kalıyor).
2. **"ÖRNEK" işareti:** PDF'lerde köşe işareti ve `DEMO_` dosya adı öneki var.
3. **Okul adı ve ad havuzu:** "Papatya Örnek Ortaokulu" ve §5.3'teki soyadları kullanıldı.
4. **Denetçi demosu:** Şimdilik yok.

## 9. Uygulama durumu

### Dosyalar

| Dosya | Görev |
|---|---|
| `lib/demo/mod.ts` | Çerez adı, sabitler (`https://demo.invalid`, demo okul kimlikleri), `tarayicidaDemoMu()`, `demoDosyaAdi()` |
| `lib/demo/kurgusalAdlar.ts` | Tohumlu rastgele sayı; T.C. algoritmasına bilerek uymayan T.C., `00000` banka kodlu IBAN, `0 (500)` telefon, `example.com` e-posta |
| `lib/demo/demoVerisi.ts` | Kurgusal okul üreteci (saf fonksiyon). Bordro `bordroSatirlariHesapla`, aidat `ogrenciUcretiHesapla`, istisna kartı `istisnaKartiOlustur` ile hesaplanır; SGK'lı personelin eksik gün nedenleri MUHSGK için hazırdır |
| `lib/demo/taklit/sorgu.ts` | PostgREST sorgu ayrıştırıcı ve değerlendirici (filtreler, `or`/`and`, sıralama, gömülü seçimler) |
| `lib/demo/taklit/depo.ts` | Bellek içi tablolar: varsayılanlar, benzersizlik (`23505`), `okul_id` tetikleyicisi, denetim dosyası kilidi (`42501`), ilişkiler |
| `lib/demo/taklit/rpc.ts` | Okul tarafı RPC'leri: `get_my_okul_id`, `denetim_maddeleri_hazirla`, `denetim_otomatik_kaydet`, `denetim_gonder`, `okul_bildirimi_okundu` |
| `lib/demo/taklit/depolama.ts` | Bellek içi dosya deposu (10 MB/dosya, sekme başına 50 MB, `personel` kovasında yalnızca PDF) |
| `lib/demo/taklit/sunucu.ts` | supabase-js'in REST, depolama ve kimlik isteklerini yanıtlayan yönlendirici |
| `lib/demo/kimlik.ts` | Kurgusal, imzasız oturum (yalnızca bellekte) |
| `lib/demo/istemci.ts` | Demo Supabase istemcisi, `/api` ve Supabase isteklerini kesen ağ koruması, imzalı belge adresini `blob:` adresine çevirme |
| `lib/demo/ekran.ts` | "Demoda e-posta gönderilmez" penceresi (eki indirme seçeneğiyle) |
| `components/DemoSeridi.tsx` | Demo şeridi, demoda kapalı bölüm kartı, dosya yükleme notu |
| `app/demo/route.ts`, `app/demo/cikis/route.ts` | Demo çerezini yazan ve silen rotalar (çıkışta yalnızca `/tanitim` ve `/signup?kaynak=demo` adreslerine yönlendirilir) |
| `lib/supabase.ts` | Demo çereziyle demo istemcisini seçer |
| `proxy.ts` | Demo dalı: veritabanı sorgusu yok; `/yonetim`, `/denetim`, `/kurulum`, `/odeme-yap`, `/abonelik-yenile` → `/`; `/login`, `/signup`, `/reset-password` açılınca demo çerezi silinir |
| `lib/AuthContext.tsx` | `demo` alanı; demoda gerçek zamanlı kanal açılmaz; çıkış `/demo/cikis` üzerinden |
| `lib/pdf.ts`, `lib/excel.ts`, `app/muhasebe/page.tsx`, `lib/denetimDosyasi.ts` | PDF işareti, `DEMO_` öneki, MUHSGK notu, belge açma |
| `app/bordro/page.tsx`, `app/tahsilat-takip/OgrenciDokumuModal.tsx` | E-posta yerine demo penceresi |
| `app/ayarlar/page.tsx`, `app/page.tsx`, `app/evrak-dosyasi/page.tsx`, `components/PersonelBelgeleri.tsx`, `app/ClientLayout.tsx` | Abonelik/şifre kartları, deneme uyarısının gizlenmesi, yükleme notu, şerit |
| `app/tanitim/page.tsx` | Girişteki "Demoyu deneyin" düğmesi (`<a href="/demo">`; tam sayfa geçişi gerekir) |
| `app/robots.ts` | `/demo` için `disallow` |
| `scripts/demo-e2e.mjs`, `package.json` → `npm run demo:e2e` | Uçtan uca denetim |

### Doğrulama

- `npx tsc --noEmit`: geçti.
- `npm test`: 96 test geçti (yeni: `lib/demo/demoVerisi.test.ts` 11, `lib/demo/taklit/taklit.test.ts` 12).
- `npx eslint app components lib proxy.ts scripts/demo-e2e.mjs`: hatasız.
  - `npm run lint` proje genelinde hata veriyor. Hataların hepsi bu işten önce de var olan klasörlerde: `.claude/worktrees`, eski `scripts/*.mjs`, `scratch/`, `tmp/`.
- **Uçtan uca** (`npm run demo:e2e`, `next dev -p 3001` karşısında): geçti. Senaryo:
  - Tanıtım → "Demoyu deneyin".
  - 23 panel sayfası konsol hatası ve desteklenmeyen sorgu olmadan açılır.
  - Öğrenci eklenir, listede görünür; sayfa yenilenince kaybolur.
  - Bordro hesaplanıp kaydedilir.
  - "Mail Gönder" düğmesi demo penceresini açar.
  - `/odeme-yap` adresi `/` sayfasına döner.
  - "15 gün ücretsiz deneyin" `/signup` sayfasına götürür ve demo çerezi silinir.
  - **Senaryo boyunca `*.supabase.co`'ya ve `/api/` adresine hiç istek gitmedi.**
- Tarayıcıda ayrıca denendi:
  - Denetim dosyasına bellek içi PDF yükleme.
  - Örnek belgenin `blob:` adresinden açılması.
  - Ayarlar'daki abonelik ve şifre kartları.
  - Demo açıkken `/login`'e gidilince çerezin silinmesi.
  - `/demo/cikis?sonra=https://example.com` isteğinin `/tanitim` sayfasına düşmesi.

### Doğrulanamayanlar / sınırlar

- **Üretim derlemesi (`next build`) çalıştırılmadı.** `.next` klasörü aynı klasörde çalışan diğer oturumların geliştirme sunucularıyla ortak. Demo kodunun yalnızca demoda yüklendiği (ayrı parça) üretim derlemesinde ayrıca kontrol edilmeli.
- **PDF'teki "ÖRNEK — KURGUSAL VERİ" işareti gözle kontrol edilmedi.** İndirme izni istememek için PDF indirilip açılmadı; işaret koddan doğrulandı (`lib/pdf.ts`, bütün PDF'ler `pdfHazirla`'dan geçiyor).
- **Mobil görünüm:** Şeridin dar ekranda kırılması stil olarak ayarlandı, ama mobil boyutta ekran görüntüsüyle kontrol edilmedi.
- **Uçtan uca senaryoda denenmeyen akışlar:** Excel içe aktarma, banka ekstresi eşleştirme, taksit planı düzenleme, ders programı kopyalama. Bunlar aynı taklit motorundan geçiyor; desteklenmeyen bir sorgu kullanırlarsa konsola `DEMO_DESTEKLENMEYEN_SORGU` düşer.
- **Taklidin bilinen sınırları:** §3.4'te anlatılıyor. Postgres'e yeni bir kısıt ya da tetikleyici eklendiğinde demo bunu kendiliğinden bilmez.
- **Ekteki `profiller` RLS açığı bu işte ele alınmadı** (istenmedi).

---

## Ek: Demodan bağımsız güvenlik bulgusu

İnceleme sırasında bulundu. Demo artık veritabanına dokunmadığı için **demonun ön koşulu değil**, ama ayrıca ve öncelikle ele alınmalı.

`supabase/migration_rls_profiller_okullar.sql` dosyasındaki `profil_kendi_guncelle` politikası, kullanıcının kendi `profiller` satırındaki **her kolonu** güncellemesine izin veriyor (`USING (id = auth.uid()) WITH CHECK (id = auth.uid())`). Depoda bu kolonları koruyan bir tetikleyici ya da kolon yetkisi yok. Ücretsiz denemeye kaydolan herhangi biri tarayıcı konsolundan şunları yapabilir:
- Kendi `okul_id`'sini değiştirip başka okulun verisine erişebilir.
- `il_id` ile bir ilin bütün okullarını okuyabilir.
- `rol`'ünü süper yöneticiye çevirebilir.

Canlıda depoda görünmeyen bir koruma olup olmadığı Supabase panelinden doğrulanmalı.

Önerilen düzeltme:

```sql
REVOKE UPDATE ON profiller FROM authenticated;
GRANT UPDATE (ad, soyad, son_giris) ON profiller TO authenticated;
```

Bu açık kişisel veri şifrelemesinin de ön koşuludur: kullanıcı `okul_id`'sini değiştirebilirse çözme uç noktası onu yeni okulun kullanıcısı sayar.
