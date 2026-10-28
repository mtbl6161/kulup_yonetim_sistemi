import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutLink } from '@/lib/lemonsqueezy'
import { cagiraniGetir } from '@/lib/apiAuth'

// Satılan planlar: aylık ve yıllık abonelik. Dönem, istemcinin söylediğine değil ürüne göre belirlenir.
const PLANLAR: Record<string, 'month' | 'year'> = { '1588063': 'month', '1588065': 'year' }

export async function POST(req: NextRequest) {
  try {
    // Ödeme bağlantısı yalnızca oturum açmış kullanıcının kendi okulu için üretilir
    const cagiran = await cagiraniGetir(req)
    if (!cagiran) return NextResponse.json({ error: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.' }, { status: 401 })

    const { okulId: istenenOkul, variantId } = await req.json()
    const interval = PLANLAR[String(variantId)]
    if (!interval) return NextResponse.json({ error: 'Geçersiz abonelik planı' }, { status: 400 })

    const okulId = cagiran.rol === 'super_admin' && istenenOkul ? Number(istenenOkul) : cagiran.okulId
    if (!okulId) return NextResponse.json({ error: 'Hesabınıza bağlı okul bulunamadı' }, { status: 400 })

    const url = await createCheckoutLink(0, okulId, String(variantId), interval)
    if (!url) {
      return NextResponse.json({ error: 'Lemon Squeezy bağlantısı oluşturulamadı' }, { status: 500 })
    }

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Checkout Hatası:', error)
    return NextResponse.json({ error: 'Ödeme bağlantısı oluşturulamadı. Lütfen tekrar deneyin.' }, { status: 500 })
  }
}
