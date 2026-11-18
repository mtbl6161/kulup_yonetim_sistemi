import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/apiAuth'
import { dodo } from '@/lib/dodo'
import { dodoLisansBitisi, dodoWebhookIslemi, metadataOkulId } from '@/lib/dodoWebhook'
import { hataMesaji } from '@/lib/hata'

// Dodo Payments webhook'u (Standard Webhooks imzası). Dodo panelinde: Developer › Webhooks.
// Başarısız yanıtta (2xx dışı) Dodo tekrar dener; bu yüzden işlem hata verirse 500 döneriz.
export async function POST(req: NextRequest) {
  const govde = await req.text()

  if (!process.env.DODO_PAYMENTS_WEBHOOK_KEY) {
    console.error('❌ DODO_PAYMENTS_WEBHOOK_KEY tanımlı değil; webhook doğrulanamıyor')
    return NextResponse.json({ error: 'Webhook yapılandırılmamış' }, { status: 500 })
  }

  let olay
  try {
    // İmza ham gövde üzerinde doğrulanır (webhook-id.webhook-timestamp.gövde), zaman damgası da denetlenir
    olay = dodo().webhooks.unwrap(govde, {
      headers: {
        'webhook-id': req.headers.get('webhook-id') ?? '',
        'webhook-signature': req.headers.get('webhook-signature') ?? '',
        'webhook-timestamp': req.headers.get('webhook-timestamp') ?? '',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Geçersiz imza' }, { status: 401 })
  }

  if (dodoWebhookIslemi(olay.type).tur === 'yoksay') return NextResponse.json({ received: true, ignored: olay.type })

  try {
    const veri = olay.data as { subscription_id?: string }
    if (!veri.subscription_id) return NextResponse.json({ received: true, ignored: olay.type })

    // Webhook'lar sırasız gelebilir: aboneliğin güncel hâli Dodo'dan okunur
    const abonelik = await dodo().subscriptions.retrieve(veri.subscription_id)
    const customerId = abonelik.customer.customer_id
    const admin = adminClient()

    // Okul: ödeme oturumunda yazdığımız okul_id; yoksa kayıtlı abonelik ya da müşteri kimliği
    let okulId: number | null = metadataOkulId(abonelik.metadata)
    for (const [kolon, deger] of [['dodo_subscription_id', abonelik.subscription_id], ['dodo_customer_id', customerId]] as const) {
      if (okulId) break
      const { data: bulunan } = await admin.from('okullar').select('id').eq(kolon, deger).maybeSingle()
      okulId = bulunan?.id ?? null
    }
    if (!okulId) {
      console.warn('⚠️ Dodo webhook okulla eşleşmedi:', olay.type, abonelik.subscription_id)
      return NextResponse.json({ received: true, unmatched: true })
    }

    const { data: okul, error: okumaHata } = await admin.from('okullar')
      .select('lisans_bitis, dodo_subscription_id').eq('id', okulId).maybeSingle()
    if (okumaHata) throw okumaHata
    if (!okul) return NextResponse.json({ received: true, unmatched: true })

    // Okulun başka (daha yeni) bir aktif aboneliği varsa eskisinin olayları onu ezmez
    const baskaAbonelik = okul.dodo_subscription_id && okul.dodo_subscription_id !== abonelik.subscription_id
    if (baskaAbonelik && abonelik.status !== 'active') {
      return NextResponse.json({ received: true, stale: true })
    }

    const guncelleme: Record<string, string> = {
      dodo_subscription_id: abonelik.subscription_id,
      dodo_customer_id: customerId,
    }
    const yeniBitis = dodoLisansBitisi(okul.lisans_bitis, abonelik)
    if (yeniBitis) {
      guncelleme.odeme_durumu = 'aktif'
      guncelleme.lisans_bitis = yeniBitis.toISOString()
    }

    const { error } = await admin.from('okullar').update(guncelleme).eq('id', okulId)
    if (error) throw error
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('❌ Dodo webhook hatası:', olay.type, hataMesaji(error))
    return NextResponse.json({ error: 'İşlenemedi' }, { status: 500 })
  }
}
