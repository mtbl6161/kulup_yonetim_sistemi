/**
 * Lemon Squeezy Ödeme Yardımcıları
 */

import { DONEM_ADI, planUcreti, tl, type AbonelikDonemi } from './abonelikPlanlari'

const API_BASE = 'https://api.lemonsqueezy.com/v1'

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL || 'https://www.klup360.com'

// Ödeme sayfasının görünümü: uygulamanın renkleri (app/globals.css) ile aynı
const ODEME_RENKLERI = {
  background_color: '#ffffff',
  headings_color: '#0e1116',
  primary_text_color: '#0e1116',
  secondary_text_color: '#5f6876',
  links_color: '#2347d9',
  borders_color: '#e3e6eb',
  checkbox_color: '#2347d9',
  active_state_color: '#2347d9',
  button_color: '#2347d9',
  button_text_color: '#ffffff',
  terms_privacy_color: '#5f6876',
}

export interface OdemeBaglantisiSecenekleri {
  okulId: number
  variantId: string
  donem: AbonelikDonemi
  /** Forma önceden yazılır */
  email?: string | null
  kurumAdi?: string | null
  /** Lemon Squeezy test modu (gerçek ödeme alınmaz) */
  testModu?: boolean
}

export async function createCheckoutLink({ okulId, variantId, donem, email, kurumAdi, testModu }: OdemeBaglantisiSecenekleri) {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY
  const storeId = process.env.LEMONSQUEEZY_STORE_ID

  if (!apiKey || !storeId) {
    throw new Error('Lemon Squeezy API anahtarı veya Store ID eksik (.env.local)')
  }

  const yillik = donem === 'year'
  const tutar = `₺${tl(planUcreti(donem))} / ${yillik ? 'yıl' : 'ay'}`

  const response = await fetch(`${API_BASE}/checkouts`, {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          ...(testModu ? { test_mode: true } : {}),
          product_options: {
            name: `Klüp360 · ${DONEM_ADI[donem]} abonelik`,
            description: `${kurumAdi ? `${kurumAdi} için ` : ''}Klüp360 çocuk kulübü yönetim sistemi, tüm modüller dahil (${tutar}). `
              + `Aboneliğiniz her ${yillik ? 'yıl' : 'ay'} otomatik yenilenir; istediğiniz an Ayarlar › Abonelik'ten iptal edebilirsiniz.`,
            // Ödeme sayfasında yalnızca seçilen plan görünür
            enabled_variants: [Number(variantId)],
            redirect_url: `${APP_URL()}/ayarlar?sekme=lisans&odeme=tamam`,
            receipt_button_text: "Klüp360'a dön",
            receipt_link_url: `${APP_URL()}/ayarlar?sekme=lisans`,
            receipt_thank_you_note: "Klüp360'ı tercih ettiğiniz için teşekkür ederiz. Lisansınız ödemeyle birlikte otomatik olarak etkinleşti. "
              + 'Faturalarınıza ve aboneliğinize her zaman Ayarlar › Abonelik bölümünden ulaşabilirsiniz.',
          },
          checkout_options: {
            locale: 'tr',
            media: false,        // ürünlerin görseli yok
            discount: false,     // mağazada indirim kodu tanımlı değil; tanımlanırsa true yapın
            logo: true,
            desc: true,
            subscription_preview: true,
            ...ODEME_RENKLERI,
          },
          checkout_data: {
            ...(email ? { email } : {}),
            ...(kurumAdi ? { name: kurumAdi } : {}),
            billing_address: { country: 'TR' },
            custom: {
              okul_id: String(okulId),
              interval: donem,
            }
          }
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: String(storeId)
            }
          },
          variant: {
            data: {
              type: 'variants',
              id: String(variantId)
            }
          }
        }
      }
    })
  })

  const result = await response.json()
  
  if (!response.ok) {
    console.error('❌ Lemon Squeezy API Hatası:', JSON.stringify(result, null, 2))
    throw new Error(result.errors?.[0]?.detail || 'Lemon Squeezy API hatası')
  }

  return result.data?.attributes?.url
}

// ── Abonelik bilgisi (Ayarlar › Abonelik) ─────────────────────────────

async function lsGet(path: string) {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY
  if (!apiKey) throw new Error('Lemon Squeezy API anahtarı eksik (.env.local)')
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/vnd.api+json', Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  })
  if (res.status === 404) return null
  const json = await res.json()
  if (!res.ok) throw new Error(json.errors?.[0]?.detail || 'Lemon Squeezy API hatası')
  return json
}

export interface AbonelikBilgisi {
  durum: string | null            // active, on_trial, past_due, unpaid, paused, cancelled, expired
  iptalEdildi: boolean
  variantId: string | null
  yenilenme: string | null        // renews_at
  bitis: string | null            // ends_at (iptal edildiyse)
  kartMarka: string | null
  kartSon4: string | null
  portalUrl: string | null        // imzalı müşteri portalı bağlantısı (~24 saat geçerli)
  kartGuncelleUrl: string | null
  faturalar: { id: string; tarih: string; tutar: string; durum: string; url: string | null }[]
}

/** Okulun Lemon Squeezy aboneliği, faturaları ve portal bağlantıları. Kayıt yoksa alanlar boş döner. */
export async function abonelikBilgisiGetir(subscriptionId?: string | null, customerId?: string | null): Promise<AbonelikBilgisi> {
  const bos: AbonelikBilgisi = {
    durum: null, iptalEdildi: false, variantId: null, yenilenme: null, bitis: null,
    kartMarka: null, kartSon4: null, portalUrl: null, kartGuncelleUrl: null, faturalar: [],
  }

  if (subscriptionId) {
    const [abonelik, faturalar] = await Promise.all([
      lsGet(`/subscriptions/${encodeURIComponent(subscriptionId)}`),
      lsGet(`/subscription-invoices?filter[subscription_id]=${encodeURIComponent(subscriptionId)}&page[size]=12`),
    ])
    const a = abonelik?.data?.attributes
    if (a) {
      Object.assign(bos, {
        durum: a.status ?? null,
        iptalEdildi: !!a.cancelled,
        variantId: a.variant_id != null ? String(a.variant_id) : null,
        yenilenme: a.renews_at ?? null,
        bitis: a.ends_at ?? null,
        kartMarka: a.card_brand ?? null,
        kartSon4: a.card_last_four ?? null,
        portalUrl: a.urls?.customer_portal ?? null,
        kartGuncelleUrl: a.urls?.update_payment_method ?? null,
      })
    }
    type Fatura = { id: string; attributes: { created_at: string; total_formatted: string; status: string; urls?: { invoice_url?: string | null } } }
    bos.faturalar = ((faturalar?.data ?? []) as Fatura[])
      .map(f => ({ id: f.id, tarih: f.attributes.created_at, tutar: f.attributes.total_formatted, durum: f.attributes.status, url: f.attributes.urls?.invoice_url ?? null }))
      .sort((x, y) => y.tarih.localeCompare(x.tarih))
  }

  if (!bos.portalUrl && customerId) {
    const musteri = await lsGet(`/customers/${encodeURIComponent(customerId)}`)
    bos.portalUrl = musteri?.data?.attributes?.urls?.customer_portal ?? null
  }

  return bos
}

/** Aboneliğin Lemon Squeezy'deki ürün (variant) kodu; webhook'ta dönem bilinmediğinde kullanılır */
export async function abonelikVariantGetir(subscriptionId: string): Promise<string | null> {
  const abonelik = await lsGet(`/subscriptions/${encodeURIComponent(subscriptionId)}`)
  const v = abonelik?.data?.attributes?.variant_id
  return v != null ? String(v) : null
}
