/**
 * Lemon Squeezy (eski ödeme altyapısı). Yeni abonelikler Dodo Payments'tadır (lib/dodo.ts).
 * Lemon Squeezy 31 Mart 2027'de ödeme almayı bırakıyor; o güne kadar mevcut aboneliklerin
 * bilgisi buradan okunur ve yenileme webhook'ları app/api/webhook/lemonsqueezy ile işlenir.
 */

import 'server-only'
import { variantDonemi } from './abonelikPlanlari'
import { bosAbonelikBilgisi, type AbonelikBilgisi, type AbonelikDurumu, type FaturaDurumu } from './abonelikBilgisi'

const API_BASE = 'https://api.lemonsqueezy.com/v1'

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

const DURUMLAR: AbonelikDurumu[] = ['active', 'on_trial', 'past_due', 'unpaid', 'paused', 'cancelled', 'expired']
const FATURA_DURUMLARI: FaturaDurumu[] = ['paid', 'pending', 'void', 'refunded', 'partial_refund']

/** Okulun Lemon Squeezy aboneliği, faturaları ve portal bağlantıları. Kayıt yoksa alanlar boş döner. */
export async function abonelikBilgisiGetir(subscriptionId?: string | null, customerId?: string | null): Promise<AbonelikBilgisi> {
  const bilgi: AbonelikBilgisi = { ...bosAbonelikBilgisi(), saglayici: 'lemonsqueezy' }

  if (subscriptionId) {
    const [abonelik, faturalar] = await Promise.all([
      lsGet(`/subscriptions/${encodeURIComponent(subscriptionId)}`),
      lsGet(`/subscription-invoices?filter[subscription_id]=${encodeURIComponent(subscriptionId)}&page[size]=12`),
    ])
    const a = abonelik?.data?.attributes
    if (a) {
      Object.assign(bilgi, {
        durum: DURUMLAR.includes(a.status) ? a.status : null,
        iptalEdildi: !!a.cancelled,
        donem: a.variant_id != null ? variantDonemi(String(a.variant_id)) : null,
        yenilenme: a.renews_at ?? null,
        bitis: a.ends_at ?? null,
        kartMarka: a.card_brand ?? null,
        kartSon4: a.card_last_four ?? null,
        portalUrl: a.urls?.customer_portal ?? null,
        kartGuncelleUrl: a.urls?.update_payment_method ?? null,
      })
    }
    type Fatura = { id: string; attributes: { created_at: string; total_formatted: string; status: string; urls?: { invoice_url?: string | null } } }
    bilgi.faturalar = ((faturalar?.data ?? []) as Fatura[])
      .map(f => ({
        id: f.id,
        tarih: f.attributes.created_at,
        tutar: f.attributes.total_formatted,
        durum: (FATURA_DURUMLARI as string[]).includes(f.attributes.status) ? f.attributes.status as FaturaDurumu : 'pending',
        url: f.attributes.urls?.invoice_url ?? null,
      }))
      .sort((x, y) => y.tarih.localeCompare(x.tarih))
  }

  if (!bilgi.portalUrl && customerId) {
    const musteri = await lsGet(`/customers/${encodeURIComponent(customerId)}`)
    bilgi.portalUrl = musteri?.data?.attributes?.urls?.customer_portal ?? null
  }

  return bilgi
}

/** Aboneliğin Lemon Squeezy'deki ürün (variant) kodu; webhook'ta dönem bilinmediğinde kullanılır */
export async function abonelikVariantGetir(subscriptionId: string): Promise<string | null> {
  const abonelik = await lsGet(`/subscriptions/${encodeURIComponent(subscriptionId)}`)
  const v = abonelik?.data?.attributes?.variant_id
  return v != null ? String(v) : null
}
