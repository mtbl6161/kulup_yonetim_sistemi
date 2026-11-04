/**
 * Lemon Squeezy Ödeme Yardımcıları
 */

const API_BASE = 'https://api.lemonsqueezy.com/v1'

export async function createCheckoutLink(ogrenciId: number, okulId: number, variantId: string, interval?: string) {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY
  const storeId = process.env.LEMONSQUEEZY_STORE_ID

  if (!apiKey || !storeId) {
    throw new Error('Lemon Squeezy API anahtarı veya Store ID eksik (.env.local)')
  }

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
          product_options: {
            redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.klup360.com'}/ayarlar?sekme=lisans&odeme=tamam`
          },
          checkout_data: {
            custom: {
              okul_id: String(okulId),
              ogrenci_id: String(ogrenciId),
              interval: interval || 'year'
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
