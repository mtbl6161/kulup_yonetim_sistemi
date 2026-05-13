import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-signature') || ''
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || ''

  // 1. Güvenlik Kontrolü: Lemon Squeezy'den geldiğini doğrula
  const hmac = crypto.createHmac('sha256', secret)
  const digest = hmac.update(body).digest('hex')

  if (signature !== digest) {
    return NextResponse.json({ error: 'Geçersiz imza' }, { status: 401 })
  }

  const payload = JSON.parse(body)
  const eventName = payload.meta.event_name
  const data = payload.data

  console.log(`🔔 Lemon Squeezy Webhook: ${eventName}`, data.id)

  try {
    // 2. Ödeme Başarılı Olayını Yakala
    if (eventName === 'order_created' || eventName === 'subscription_payment_success') {
      const attributes = data.attributes
      const customData = payload.meta.custom_data
      const okulId = customData?.okul_id
      
      console.log(`🔍 İşlemdeki Okul ID: ${okulId}`)

      if (okulId) {
        // RLS'i aşmak için Service Role Key ile yeni bir client oluştur
        const { createClient } = await import('@supabase/supabase-js')
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const interval = customData?.interval || 'year'
        
        // 1. Mevcut lisans bitişini bul veya bugünü baz al
        const { data: currentOkul } = await supabaseAdmin
          .from('okullar')
          .select('lisans_bitis')
          .eq('id', okulId)
          .single()

        let baslangicTarihi = new Date()
        // Eğer mevcut lisans bitişi gelecek bir tarihse, onun üzerine ekle
        if (currentOkul?.lisans_bitis && new Date(currentOkul.lisans_bitis) > new Date()) {
          baslangicTarihi = new Date(currentOkul.lisans_bitis)
        }

        const yeniBitis = new Date(baslangicTarihi)
        if (interval === 'month') {
          yeniBitis.setMonth(yeniBitis.getMonth() + 1)
        } else {
          yeniBitis.setFullYear(yeniBitis.getFullYear() + 1)
        }

        console.log(`⏳ Süre hesaplandı: ${interval} - Yeni Tarih: ${yeniBitis.toISOString()}`)

        const { error: updateErr } = await supabaseAdmin.from('okullar').update({
          odeme_durumu: 'aktif',
          lisans_bitis: yeniBitis.toISOString(),
          lemonsqueezy_customer_id: String(attributes.customer_id),
          lemonsqueezy_subscription_id: attributes.subscription_id ? String(attributes.subscription_id) : null
        }).eq('id', okulId)

        if (updateErr) {
          console.error('❌ Supabase Güncelleme Hatası:', updateErr.message)
          throw updateErr
        }

        console.log(`✅ Okul Lisansı Güncellendi: Okul ID ${okulId}`)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('❌ Webhook Hatası:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
