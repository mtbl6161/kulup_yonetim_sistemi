import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { hataMesaji } from '@/lib/hata'
import { adminClient } from '@/lib/apiAuth'
import { abonelikVariantGetir } from '@/lib/lemonsqueezy'
import { variantDonemi } from '@/lib/abonelikPlanlari'
import { gecerliDonem, webhookIslemi, yeniLisansBitisi } from '@/lib/lemonWebhook'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-signature') || ''
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || ''

  // 1. Güvenlik Kontrolü: Lemon Squeezy'den geldiğini doğrula
  const hmac = crypto.createHmac('sha256', secret)
  const digest = hmac.update(body).digest('hex')

  // Sabit zamanlı karşılaştırma (timing attack'e karşı). Geçersiz/eksik imza,
  // uzunluk uyuşmazlığı nedeniyle güvenle reddedilir.
  const sigBuf = Buffer.from(signature, 'hex')
  const digBuf = Buffer.from(digest, 'hex')
  if (sigBuf.length !== digBuf.length || !crypto.timingSafeEqual(sigBuf, digBuf)) {
    return NextResponse.json({ error: 'Geçersiz imza' }, { status: 401 })
  }

  const payload = JSON.parse(body)
  const eventName = payload.meta.event_name
  const data = payload.data


  try {
    const islem = webhookIslemi(eventName)
    if (islem.tur === 'yoksay') return NextResponse.json({ received: true, ignored: eventName })

    const attributes = data.attributes ?? {}
    const customData = payload.meta.custom_data ?? {}
    // subscription_created → data.id abonelik kimliği; subscription_payment_success → data bir fatura, abonelik kimliği attributes'ta
    const subscriptionId = islem.tur === 'eslestir'
      ? String(data.id)
      : attributes.subscription_id != null ? String(attributes.subscription_id) : null
    const customerId = attributes.customer_id != null ? String(attributes.customer_id) : null

    const supabaseAdmin = adminClient()

    // Okul: ödeme sırasında gönderilen okul_id; yoksa (ör. yenileme olayında) abonelik kimliğinden bulunur
    let okulId: number | null = customData.okul_id ? Number(customData.okul_id) : null
    if (!okulId && subscriptionId) {
      const { data: bulunan } = await supabaseAdmin.from('okullar').select('id').eq('lemonsqueezy_subscription_id', subscriptionId).maybeSingle()
      okulId = bulunan?.id ?? null
    }
    if (!okulId) {
      console.warn('⚠️ Webhook okulla eşleşmedi:', eventName, data.id)
      return NextResponse.json({ received: true, unmatched: true })
    }

    // Eşleştirme alanları: boş değerle mevcut kimliğin üzerine yazılmaz
    const kimlikler: Record<string, string> = {}
    if (customerId) kimlikler.lemonsqueezy_customer_id = customerId
    if (subscriptionId) kimlikler.lemonsqueezy_subscription_id = subscriptionId

    if (islem.tur === 'eslestir') {
      const { error } = await supabaseAdmin.from('okullar').update(kimlikler).eq('id', okulId)
      if (error) throw error
      return NextResponse.json({ received: true })
    }

    // Ödeme alındı: replay (tekrar) koruması — aynı fatura yalnızca bir kez işlenir
    const disOdemeId = `ls:${eventName}:${data.id}`
    const mark = await supabaseAdmin
      .from('islenen_odemeler')
      .insert({ dis_odeme_id: disOdemeId, saglayici: 'lemonsqueezy', okul_id: okulId })
    if (mark.error) {
      if (mark.error.code === '23505') {
        console.warn('⚠️ Tekrar eden webhook yoksayıldı:', disOdemeId)
        return NextResponse.json({ received: true, duplicate: true })
      }
      // 42P01 = tablo yok (migration çalıştırılmamış) → bloke etme, sadece uyar
      if (mark.error.code !== '42P01') throw mark.error
      console.warn('⚠️ islenen_odemeler tablosu yok; replay koruması PASİF. migration_islenen_odemeler.sql çalıştırın.')
    }
    const replayKorumaAktif = !mark.error
    const markeriGeriAl = async () => {
      if (replayKorumaAktif) await supabaseAdmin.from('islenen_odemeler').delete().eq('dis_odeme_id', disOdemeId).then(() => {}, () => {})
    }

    try {
      // Dönem: ödemede gönderilen interval; yoksa aboneliğin ürününden (varsayılan olarak yıllık sayılmaz)
      let donem = gecerliDonem(customData.interval)
      if (!donem && subscriptionId) {
        const variant = await abonelikVariantGetir(subscriptionId)
        donem = variant ? variantDonemi(variant) : null
      }
      if (!donem) throw new Error(`Abonelik dönemi belirlenemedi (fatura ${data.id})`)

      const { data: currentOkul } = await supabaseAdmin.from('okullar').select('lisans_bitis').eq('id', okulId).single()
      const yeniBitis = yeniLisansBitisi(currentOkul?.lisans_bitis, donem)

      const { error: updateErr } = await supabaseAdmin.from('okullar').update({
        odeme_durumu: 'aktif',
        lisans_bitis: yeniBitis.toISOString(),
        ...kimlikler,
      }).eq('id', okulId)
      if (updateErr) throw updateErr
    } catch (e) {
      // İşlem başarısızsa marker'ı geri al ki Lemon Squeezy tekrar denediğinde işlensin
      await markeriGeriAl()
      throw e
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('❌ Webhook Hatası:', hataMesaji(error))
    return NextResponse.json({ error: hataMesaji(error) }, { status: 500 })
  }
}
