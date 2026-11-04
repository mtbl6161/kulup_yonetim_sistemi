import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutLink } from '@/lib/lemonsqueezy'
import { adminClient, cagiraniGetir } from '@/lib/apiAuth'
import { variantDonemi } from '@/lib/abonelikPlanlari'

export async function POST(req: NextRequest) {
  try {
    // Ödeme bağlantısı yalnızca oturum açmış kullanıcının kendi okulu için üretilir
    const cagiran = await cagiraniGetir(req)
    if (!cagiran) return NextResponse.json({ error: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.' }, { status: 401 })

    const { okulId: istenenOkul, variantId } = await req.json()
    // Dönem, istemcinin söylediğine değil ürüne göre belirlenir
    const interval = variantDonemi(String(variantId))
    if (!interval) return NextResponse.json({ error: 'Geçersiz abonelik planı' }, { status: 400 })

    const okulId = cagiran.rol === 'super_admin' && istenenOkul ? Number(istenenOkul) : cagiran.okulId
    if (!okulId) return NextResponse.json({ error: 'Hesabınıza bağlı okul bulunamadı' }, { status: 400 })

    // Kurum adı forma önceden yazılır
    const { data: okul } = await adminClient().from('okullar').select('ad').eq('id', okulId).maybeSingle()

    const url = await createCheckoutLink({
      okulId, variantId: String(variantId), donem: interval,
      email: cagiran.user.email, kurumAdi: okul?.ad,
    })
    if (!url) {
      return NextResponse.json({ error: 'Lemon Squeezy bağlantısı oluşturulamadı' }, { status: 500 })
    }

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Checkout Hatası:', error)
    return NextResponse.json({ error: 'Ödeme bağlantısı oluşturulamadı. Lütfen tekrar deneyin.' }, { status: 500 })
  }
}
