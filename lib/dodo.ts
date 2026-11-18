/**
 * Dodo Payments yardımcıları (yalnızca sunucu).
 * Dodo, Merchant of Record olarak satışı kendi adına yapar: vergi, fatura ve itirazlar onda.
 * Biz ödeme sayfası (checkout session) açar, imzalı webhook ile lisansı uzatırız.
 */
import 'server-only'
import DodoPayments from 'dodopayments'
import type { Subscription } from 'dodopayments/resources/subscriptions'
import type { PaymentListResponse } from 'dodopayments/resources/payments'
import { DONEM_ADI, type AbonelikDonemi } from './abonelikPlanlari'
import { bosAbonelikBilgisi, type AbonelikBilgisi, type AbonelikDurumu, type FaturaDurumu } from './abonelikBilgisi'

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL || 'https://www.klup360.com'

// Ödeme sayfasının görünümü: uygulamanın renkleri (app/globals.css) ve yazı tipi (Inter) ile aynı.
// Logo ve marka adı Dodo panelinden (Settings › Business / Brand) gelir.
export const ODEME_TEMASI = {
  font_primary_url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  radius: '8px',
  light: {
    bg_primary: '#ffffff',
    bg_secondary: '#f3f5f9',
    border_primary: '#e6e9ef',
    border_secondary: '#cbd0d8',
    button_primary: '#2347d9',
    button_primary_hover: '#1c3bbe',
    button_text_primary: '#ffffff',
    button_secondary: '#eef2fe',
    button_secondary_hover: '#dfe6fd',
    button_text_secondary: '#2347d9',
    input_focus_border: '#2347d9',
    text_primary: '#0e1116',
    text_secondary: '#5f6876',
    text_placeholder: '#8a93a1',
    text_error: '#c2410c',
    text_success: '#15803d',
  },
} as const

let istemci: DodoPayments | null = null

type DodoOrtami = 'live_mode' | 'test_mode'

/**
 * Mod anahtarın önekinden belirlenir: dodo_live_ yalnızca canlı, dodo_test_ yalnızca test sunucusunda geçerlidir,
 * bu yüzden DODO_PAYMENTS_ENVIRONMENT yanlış yazılsa bile anahtar yanlış sunucuya gitmez.
 * Önek tanınmazsa ortam değişkenine bakılır; o da açıkça 'live_mode' değilse test modu seçilir.
 */
export function dodoOrtami(anahtar: string, ortamDegiskeni: string | undefined): DodoOrtami {
  if (anahtar.startsWith('dodo_live_')) return 'live_mode'
  if (anahtar.startsWith('dodo_test_')) return 'test_mode'
  return ortamDegiskeni?.trim() === 'live_mode' ? 'live_mode' : 'test_mode'
}

export function dodo(): DodoPayments {
  if (istemci) return istemci
  const bearerToken = process.env.DODO_PAYMENTS_API_KEY?.trim()
  if (!bearerToken) throw new Error('Dodo Payments API anahtarı eksik (DODO_PAYMENTS_API_KEY)')
  const ortamDegiskeni = process.env.DODO_PAYMENTS_ENVIRONMENT
  const environment = dodoOrtami(bearerToken, ortamDegiskeni)
  if (ortamDegiskeni && ortamDegiskeni.trim() !== environment) {
    console.warn(`⚠️ DODO_PAYMENTS_ENVIRONMENT (${JSON.stringify(ortamDegiskeni)}) anahtarla uyuşmuyor; anahtara göre ${environment} kullanılıyor`)
  }
  istemci = new DodoPayments({
    bearerToken,
    webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim() || undefined,
    environment,
  })
  return istemci
}

/** Plan → Dodo ürün kodu. Test ve canlı modda ürün kodları farklıdır, bu yüzden ortam değişkenindedir. */
export function planUrunu(donem: AbonelikDonemi): string {
  const id = (donem === 'year' ? process.env.DODO_URUN_YILLIK : process.env.DODO_URUN_AYLIK)?.trim()
  if (!id) throw new Error(`Dodo ürün kodu eksik (${donem === 'year' ? 'DODO_URUN_YILLIK' : 'DODO_URUN_AYLIK'})`)
  return id
}

/** Dodo ürün kodundan dönem; tanınmayan ürün için null (istemcinin ya da webhook'un söylediğine güvenilmez) */
export function urunDonemi(productId: string | null | undefined): AbonelikDonemi | null {
  if (!productId) return null
  if (productId === process.env.DODO_URUN_AYLIK?.trim()) return 'month'
  if (productId === process.env.DODO_URUN_YILLIK?.trim()) return 'year'
  return null
}

export interface OdemeOturumuSecenekleri {
  okulId: number
  donem: AbonelikDonemi
  /** Okulun kayıtlı Dodo müşterisi; yoksa e-postayla eşleşen müşteri kullanılır ya da yenisi açılır */
  customerId?: string | null
  email?: string | null
  kurumAdi?: string | null
  /**
   * Okulun hâlâ geçerli lisans/deneme günleri. Verilirse Dodo'da deneme süresi olur:
   * kart şimdi kaydedilir, ilk ödeme bu süre bitince çekilir (kalan günler kaybolmaz).
   */
  kalanGun?: number
}

/** Bugünden lisans bitişine kalan tam gün (en az 1); süre dolduysa 0 */
export function kalanLisansGunu(lisansBitis: string | null | undefined, simdi = new Date()): number {
  if (!lisansBitis) return 0
  const ms = new Date(lisansBitis).getTime() - simdi.getTime()
  return Number.isFinite(ms) && ms > 0 ? Math.ceil(ms / 86_400_000) : 0
}

/** Barındırılan Dodo ödeme sayfası açar ve bağlantısını döner. Lisans buradan değil, webhook'tan verilir. */
export async function odemeOturumuAc({ okulId, donem, customerId, email, kurumAdi, kalanGun = 0 }: OdemeOturumuSecenekleri): Promise<string> {
  const musteri = customerId
    ? { customer_id: customerId }
    : email ? { email, ...(kurumAdi ? { name: kurumAdi } : {}) } : null

  const oturum = await dodo().checkoutSessions.create({
    product_cart: [{ product_id: planUrunu(donem), quantity: 1 }],
    // Kurum adı müşteri kaydındadır; customer_business_name Dodo'da vergi numarası (tax_id) olmadan kabul edilmiyor
    ...(musteri ? { customer: musteri } : {}),
    billing_address: { country: 'TR' },
    billing_currency: 'TRY',
    ...(kalanGun > 0 ? { subscription_data: { trial_period_days: kalanGun } } : {}),
    // Webhook'ta okulu bulmak için; abonelik ve ödemelere de aktarılır
    metadata: { okul_id: String(okulId), donem },
    feature_flags: { allow_discount_code: false },
    customization: {
      force_language: 'tr',
      theme: 'light',
      show_order_details: true,
      theme_config: { ...ODEME_TEMASI, pay_button_text: `${DONEM_ADI[donem]} aboneliği başlat` },
    },
    return_url: `${APP_URL()}/ayarlar?sekme=lisans&odeme=tamam`,
    cancel_url: `${APP_URL()}/ayarlar?sekme=lisans`,
  })
  if (!oturum.checkout_url) throw new Error('Dodo ödeme bağlantısı dönmedi')
  return oturum.checkout_url
}

// ── Abonelik bilgisi (Ayarlar › Abonelik) ─────────────────────────────

const PARA = (kurus: number, para: string) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: para, maximumFractionDigits: 2 }).format(kurus / 100)

/** Dodo abonelik durumunu ekranın anladığı duruma çevirir */
export function dodoDurumu(a: Pick<Subscription, 'status'>): AbonelikDurumu | null {
  switch (a.status) {
    case 'active': return 'active'
    case 'past_due':
    case 'on_hold': return 'past_due'       // ödeme çekilemedi; kart güncellenince sürer
    case 'paused': return 'paused'
    case 'cancelled':
    case 'expired':
    case 'failed': return 'expired'         // yenilenmeyecek; yeni abonelik gerekir
    default: return null                    // pending: henüz oluşturuluyor
  }
}

function faturaDurumu(p: PaymentListResponse): FaturaDurumu {
  if (p.refund_status === 'full') return 'refunded'
  if (p.refund_status === 'partial') return 'partial_refund'
  if (p.status === 'succeeded') return 'paid'
  if (p.status === 'failed' || p.status === 'cancelled') return 'void'
  return 'pending'
}

/** Okulun Dodo aboneliği, son ödemeleri ve müşteri portalı bağlantısı. Kayıt yoksa alanlar boş döner. */
export async function dodoAbonelikBilgisi(subscriptionId?: string | null, customerId?: string | null): Promise<AbonelikBilgisi> {
  const bilgi: AbonelikBilgisi = { ...bosAbonelikBilgisi(), saglayici: 'dodo' }
  const client = dodo()

  if (subscriptionId) {
    const [abonelik, odemeler] = await Promise.all([
      client.subscriptions.retrieve(subscriptionId),
      client.payments.list({ subscription_id: subscriptionId, page_size: 12 }),
    ])
    customerId = customerId || abonelik.customer.customer_id
    const durum = dodoDurumu(abonelik)
    const iptalEdildi = abonelik.status === 'active' && abonelik.cancel_at_next_billing_date
    Object.assign(bilgi, {
      durum,
      iptalEdildi,
      donem: urunDonemi(abonelik.product_id),
      yenilenme: durum === 'active' || durum === 'past_due' ? abonelik.next_billing_date : null,
      bitis: iptalEdildi ? abonelik.next_billing_date : abonelik.expires_at ?? abonelik.cancelled_at ?? null,
    })
    const liste = odemeler.items.slice().sort((x, y) => y.created_at.localeCompare(x.created_at))
    const kartli = liste.find(p => p.card_last_four)
    bilgi.kartMarka = kartli?.card_network ?? null
    bilgi.kartSon4 = kartli?.card_last_four ?? null
    bilgi.faturalar = liste
      .filter(p => p.status !== 'requires_payment_method' && p.status !== 'requires_customer_action')
      .map(p => ({
        id: p.payment_id,
        tarih: p.created_at,
        tutar: PARA(p.total_amount, p.currency),
        durum: faturaDurumu(p),
        url: p.invoice_url ?? null,
      }))
  }

  if (customerId) {
    const portal = await client.customers.customerPortal.create(customerId, { return_url: `${APP_URL()}/ayarlar?sekme=lisans` })
    bilgi.portalUrl = portal.link
    bilgi.kartGuncelleUrl = portal.link
  }

  return bilgi
}
