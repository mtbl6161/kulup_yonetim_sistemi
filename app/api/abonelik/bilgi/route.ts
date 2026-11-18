import { NextRequest, NextResponse } from 'next/server'
import { adminClient, cagiraniGetir } from '@/lib/apiAuth'
import { dodoAbonelikBilgisi } from '@/lib/dodo'
import { abonelikBilgisiGetir as lemonAbonelikBilgisi } from '@/lib/lemonsqueezy'
import { bosAbonelikBilgisi } from '@/lib/abonelikBilgisi'
import { hataMesaji } from '@/lib/hata'

// Oturumdaki kullanıcının okuluna ait abonelik ayrıntıları: plan, kart, faturalar ve müşteri portalı bağlantısı.
// Yeni abonelikler Dodo Payments'tadır; Dodo aboneliği olmayan eski okullar için Lemon Squeezy kaydı okunur
// (Lemon Squeezy 31 Mart 2027'de ödeme almayı bırakıyor).
export async function GET(req: NextRequest) {
  const cagiran = await cagiraniGetir(req)
  if (!cagiran) return NextResponse.json({ error: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.' }, { status: 401 })
  if (!cagiran.okulId) return NextResponse.json({ error: 'Hesabınıza bağlı okul bulunamadı' }, { status: 400 })

  const { data: okul, error } = await adminClient()
    .from('okullar')
    .select('dodo_subscription_id, dodo_customer_id, lemonsqueezy_subscription_id, lemonsqueezy_customer_id')
    .eq('id', cagiran.okulId)
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'Okul bilgisi okunamadı' }, { status: 500 })

  try {
    if (okul?.dodo_subscription_id) {
      return NextResponse.json(await dodoAbonelikBilgisi(okul.dodo_subscription_id, okul.dodo_customer_id))
    }
    if (okul?.lemonsqueezy_subscription_id || okul?.lemonsqueezy_customer_id) {
      return NextResponse.json(await lemonAbonelikBilgisi(okul.lemonsqueezy_subscription_id, okul.lemonsqueezy_customer_id))
    }
    return NextResponse.json(bosAbonelikBilgisi())
  } catch (e) {
    console.error('Abonelik bilgisi hatası:', hataMesaji(e))
    return NextResponse.json({ error: 'Abonelik bilgisi alınamadı. Lütfen daha sonra tekrar deneyin.' }, { status: 502 })
  }
}
