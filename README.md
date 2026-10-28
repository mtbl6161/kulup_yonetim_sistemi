# Klüp360

MEB çocuk kulüpleri ve okullar için yönetim yazılımı: öğrenci kaydı, ders programı, sınıf defteri,
puantaj, bordro, tahsilat takibi, işletme defteri, okul aile birliği muhasebesi ve il / ilçe denetimi.

## Teknoloji

- **Next.js 16** (App Router, Turbopack) ve **React 19**. Bu sürümde API ve dosya kuralları eski sürümlerden farklıdır;
  kod yazmadan önce `node_modules/next/dist/docs/` altındaki ilgili belgeye bakın (bkz. `AGENTS.md`).
- **Supabase**: veritabanı, kimlik doğrulama ve dosya deposu. Okul verisi satır düzeyi güvenlikle (RLS) ayrılır.
- **Resend** (e-posta), **Lemon Squeezy** (abonelik ödemesi), **Upstash Redis** (istek sınırlama).
- PDF çıktıları `jspdf` + `jspdf-autotable` ile istemcide üretilir (`lib/pdf.ts` ortak stil).

## Kurulum

```bash
npm install
cp .env.example .env.local   # değerleri doldurun
npm run dev                  # http://localhost:3000
```

Veritabanı kurulumu için `supabase/README.md` dosyasına bakın.

## Komutlar

| Komut | Açıklama |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Üretim derlemesi (tip denetimi dahil) |
| `npm test` | Hesaplama testleri (bordro, vergi, SGK, tavan, tahakkuk) |
| `npm run lint` | ESLint |

İlk süper yönetici hesabı: `SUPABASE_SERVICE_ROLE_KEY="…" node scripts/create-admin.mjs <eposta> <şifre>`

## Klasörler

- `app/` — sayfalar ve API uçları (`app/api/*`). Yönetici uçları `lib/apiAuth.ts` ile yetki denetler.
- `components/` — ortak bileşenler (yan menü, üst çubuk, modallar, bildirimler).
- `lib/` — iş kuralları: `hesaplama.ts` (bordro, vergi, tahakkuk), `pdf.ts`, `excel.ts`, `supabase.ts`, `eposta.ts`.
- `supabase/` — SQL geçiş betikleri.
- `public/` — logo, yazı tipleri (PDF için NotoSans).

## Notlar

- Kişisel veri işlendiği için (T.C. kimlik, IBAN) `.env*`, Excel dosyaları ve `scratch/`, `worksheets/` klasörleri depoya alınmaz.
- Başarısız veritabanı yazmaları `lib/supabase.ts` üzerinden yakalanıp ekranın altında kullanıcıya bildirilir.
