import { NextRequest, NextResponse } from 'next/server'
import { adminClient, cagiraniGetir } from '@/lib/apiAuth'
import { gecerliDonem } from '@/lib/lemonWebhook'
import { dodo, kalanLisansGunu, odemeOturumuAc } from '@/lib/dodo'
import { hataMesaji } from '@/lib/hata'

// Dodo Payments ödeme sayfası. Bağlantı yalnızca oturum açmış kullanıcının kendi okulu için üretilir;
// istemci yalnızca dönemi ('month' | 'year') söyler, ürün kodu ve tutar sunucuda belirlenir.
export async function POST(req: NextRequest) {
  try {
    const cagiran = await cagiraniGetir(req)
    if (!cagiran) return NextResponse.json({ error: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.' }, { status: 401 })

    const govde = await req.json().catch(() => ({}))
    const donem = gecerliDonem(govde?.donem)
    if (!donem) return NextResponse.json({ error: 'Geçersiz abonelik planı' }, { status: 400 })

    const okulId = cagiran.rol === 'super_admin' && govde?.okulId ? Number(govde.okulId) : cagiran.okulId
    if (!okulId || !Number.isSafeInteger(okulId)) return NextResponse.json({ error: 'Hesabınıza bağlı okul bulunamadı' }, { status: 400 })

    const admin = adminClient()
    const { data: okul, error } = await admin.from('okullar')
      .select('ad, dodo_customer_id, odeme_durumu, lisans_bitis').eq('id', okulId).maybeSingle()
    if (error) throw error
    if (!okul) return NextResponse.json({ error: 'Okul bulunamadı' }, { status: 404 })

    // Okulun Dodo müşterisi ödemeden önce açılır ve kaydedilir: webhook okulu müşteri kimliğinden de bulabilsin
    let customerId: string | null = okul.dodo_customer_id ?? null
    if (!customerId && cagiran.user.email) {
      const musteri = await dodo().customers.create({
        email: cagiran.user.email,
        name: okul.ad || cagiran.user.email,
        metadata: { okul_id: String(okulId) },
      })
      customerId = musteri.customer_id
      const { error: kayitHata } = await admin.from('okullar').update({ dodo_customer_id: customerId }).eq('id', okulId)
      if (kayitHata) throw kayitHata
    }

    // Geçerli deneme/lisans günleri Dodo'da deneme süresi olur; ilk ödeme o süre bitince çekilir
    const kalanGun = okul.odeme_durumu === 'deneme' || okul.odeme_durumu === 'aktif' ? kalanLisansGunu(okul.lisans_bitis) : 0

    const url = await odemeOturumuAc({ okulId, donem, customerId, email: cagiran.user.email, kurumAdi: okul.ad, kalanGun })
    return NextResponse.json({ url })
  } catch (error) {
    console.error('Checkout hatası:', hataMesaji(error))
    return NextResponse.json({ error: 'Ödeme bağlantısı oluşturulamadı. Lütfen tekrar deneyin.' }, { status: 500 })
  }
}
