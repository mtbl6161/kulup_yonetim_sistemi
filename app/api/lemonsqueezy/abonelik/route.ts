import { NextRequest, NextResponse } from 'next/server'
import { adminClient, cagiraniGetir } from '@/lib/apiAuth'
import { abonelikBilgisiGetir } from '@/lib/lemonsqueezy'

// Oturumdaki kullanıcının okuluna ait abonelik ayrıntıları: plan, kart, faturalar ve müşteri portalı bağlantısı.
export async function GET(req: NextRequest) {
  const cagiran = await cagiraniGetir(req)
  if (!cagiran) return NextResponse.json({ error: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.' }, { status: 401 })
  if (!cagiran.okulId) return NextResponse.json({ error: 'Hesabınıza bağlı okul bulunamadı' }, { status: 400 })

  const { data: okul, error } = await adminClient()
    .from('okullar')
    .select('lemonsqueezy_subscription_id, lemonsqueezy_customer_id')
    .eq('id', cagiran.okulId)
    .maybeSingle()
  if (error) return NextResponse.json({ error: 'Okul bilgisi okunamadı' }, { status: 500 })

  try {
    const bilgi = await abonelikBilgisiGetir(okul?.lemonsqueezy_subscription_id, okul?.lemonsqueezy_customer_id)
    return NextResponse.json(bilgi)
  } catch (e) {
    console.error('Abonelik bilgisi hatası:', e)
    return NextResponse.json({ error: 'Abonelik bilgisi alınamadı. Lütfen daha sonra tekrar deneyin.' }, { status: 502 })
  }
}
