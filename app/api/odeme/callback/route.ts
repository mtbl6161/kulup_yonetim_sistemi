import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { iyzicoAuth3DS } from '@/lib/iyzico'

const YILLIK_TL = 1000 // 4320 TL (yıllık) ile 450 TL (aylık) arasındaki eşik

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// iyzico, 3DS tamamlandığında bu endpoint'e POST gönderir
export async function POST(request: NextRequest) {
  // Veriyi yakala ve tüm anahtarları küçük harfe çevirecek bir harita oluştur
  const bodyText = await request.text().catch(() => '')
  const currentParams = new URL(request.url).searchParams
  const bodyParams = new URLSearchParams(bodyText)
  
  // Tüm verileri birleştir
  const allData: Record<string, string> = {
    ...Object.fromEntries(currentParams.entries()),
    ...Object.fromEntries(bodyParams.entries())
  }

  // Harf duyarsız arama fonksiyonu
  const findVal = (keyName: string) => {
    const target = keyName.toLowerCase()
    const foundKey = Object.keys(allData).find(k => k.toLowerCase() === target)
    return foundKey ? allData[foundKey] : null
  }

  const paymentId = findVal('paymentId') || findVal('payment_id')
  const conversationId = findVal('conversationData') || findVal('conversationId') || ''
  const status = findVal('status')
  const mdStatus = findVal('mdStatus')

  // Yönlendirme URL'si: prod'da Host header'ına GÜVENME, yapılandırılmış domaini kullan
  // (Host header saldırgan tarafından değiştirilebilir → open-redirect/XSS riski).
  const host = request.headers.get('host')
  const currentAppUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (host?.includes('localhost') ? `http://${host}` : 'https://klup360.com')

  // Önce Iyzico'nun genel hata durumuna bak (ID kontrolünden önce)
  if (status === 'failure' || (mdStatus && mdStatus !== '1')) {
    const errorMsg = '3D Secure doğrulaması başarısız oldu veya kullanıcı tarafından iptal edildi.'
    console.error('[iyzico callback] 3DS Failure:', { status, mdStatus })
    return new NextResponse(
      `<html><body><script>window.parent.location.href = "${currentAppUrl}/odeme-yap?sonuc=hata&mesaj=${encodeURIComponent(errorMsg)}";</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  if (!paymentId) {
    // Debug: Hem isimleri hem değerleri göster
    const debugInfo = Object.entries(allData)
      .map(([k, v]) => `${k}: ${v ? (v.length > 10 ? v.substring(0, 10) + '...' : v) : 'BOŞ'}`)
      .join(', ')
    
    console.error('[iyzico callback] Veri okuma hatası. Detaylar:', debugInfo)
    return new NextResponse(
      `<html><body><script>window.parent.location.href = "${currentAppUrl}/odeme-yap?sonuc=hata&mesaj=${encodeURIComponent('Ödeme doğrulanamadı. Lütfen tekrar deneyin.')}";</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  try {
    const config = {
      apiKey: process.env.IYZICO_API_KEY!,
      secretKey: process.env.IYZICO_SECRET_KEY!,
      baseUrl: process.env.IYZICO_BASE_URL ?? 'https://sandbox-api.iyzipay.com'
    }

    const result = await iyzicoAuth3DS(config, {
      locale: 'tr',
      conversationId,
      paymentId
    })

    if (result.status !== 'success') {
      const errorMsg = result.errorMessage || result.errorGroup || 'Ödeme doğrulanamadı (Iyzico)'
      console.error('[iyzico callback failure]', result)
      return new NextResponse(
        `<html><body><script>window.parent.location.href = "${currentAppUrl}/odeme-yap?sonuc=hata&mesaj=${encodeURIComponent(errorMsg)}";</script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    // conversationId formatı: klup360-{okulId}-{timestamp}
    const okulIdStr = conversationId?.split('-')[1]
    const okulId = okulIdStr ? parseInt(okulIdStr) : NaN

    if (isNaN(okulId)) {
      throw new Error(`Geçersiz okul ID (ConversationId: ${conversationId})`)
    }
    const tutar  = result.paidPrice ? parseFloat(result.paidPrice) : 0
    const donem  = tutar >= YILLIK_TL ? 'yillik' : 'aylik'

    const admin = adminClient()

    // 0. Replay (tekrar) koruması: bu ödeme daha önce işlendi mi?
    //    islenen_odemeler tablosundaki PRIMARY KEY sayesinde aynı paymentId
    //    ikinci kez işlenemez; böylece sahte/çift callback lisansı tekrar uzatamaz.
    const disOdemeId = `iyzico:${result.paymentId}`
    const mark = await admin
      .from('islenen_odemeler')
      .insert({ dis_odeme_id: disOdemeId, saglayici: 'iyzico', okul_id: okulId })

    if (mark.error) {
      if (mark.error.code === '23505') {
        // Bu ödeme zaten işlenmiş → lisansı TEKRAR uzatma, kullanıcıyı başarıya yönlendir
        console.warn('[iyzico callback] Tekrar eden ödeme yoksayıldı:', disOdemeId)
        return new NextResponse(
          `<html><body><script>window.parent.location.href = "${currentAppUrl}/odeme-yap?sonuc=basarili&donem=${donem}";</script></body></html>`,
          { headers: { 'Content-Type': 'text/html' } }
        )
      }
      // 42P01 = tablo henüz yok (migration çalıştırılmamış) → ödemeyi bloke etme, sadece uyar
      if (mark.error.code !== '42P01') {
        throw new Error(`Replay kontrol hatası: ${mark.error.message}`)
      }
      console.warn('[iyzico callback] islenen_odemeler tablosu yok; replay koruması PASİF. migration_islenen_odemeler.sql çalıştırın.')
    }
    const replayKorumaAktif = !mark.error

    try {
    // 1. Ödeme kaydını kaydet
    const { error: odemeHata } = await admin.from('okul_odemeleri').insert({
      okul_id:        okulId,
      tutar,
      odeme_tarihi:   new Date().toISOString().split('T')[0],
      odeme_yontemi:  'Kredi Kartı (iyzico)',
      aciklama:       `iyzico ödeme — ${donem} abonelik | paymentId: ${result.paymentId}`,
    })

    if (odemeHata) {
      console.error('[iyzico callback db odeme]', odemeHata)
      throw new Error(`Veritabanı hatası (ödeme): ${odemeHata.message}`)
    }

    // 2. Lisans süresini uzat
    const { data: okul, error: okulGetHata } = await admin
      .from('okullar')
      .select('lisans_bitis')
      .eq('id', okulId)
      .single()

    if (okulGetHata) {
      console.error('[iyzico callback db okul_get]', okulGetHata)
      throw new Error(`Veritabanı hatası (okul): ${okulGetHata.message}`)
    }

    const mevcutBitis = okul?.lisans_bitis ? new Date(okul.lisans_bitis) : new Date()
    const baslangic   = mevcutBitis > new Date() ? mevcutBitis : new Date()

    const yeniBitis = new Date(baslangic)
    if (donem === 'yillik') {
      yeniBitis.setFullYear(yeniBitis.getFullYear() + 1)
    } else {
      yeniBitis.setMonth(yeniBitis.getMonth() + 1)
    }

    const { error: okulUpdateHata } = await admin.from('okullar').update({
      odeme_durumu: 'aktif',
      lisans_bitis: yeniBitis.toISOString(),
    }).eq('id', okulId)

    if (okulUpdateHata) {
      console.error('[iyzico callback db okul_up]', okulUpdateHata)
      throw new Error(`Veritabanı hatası (lisans update): ${okulUpdateHata.message}`)
    }

    // 3. Kullanıcıların banını kaldır (İsteğe bağlı, hata alsa da ödeme yanmasın)
    const { data: profiller } = await admin
      .from('profiller')
      .select('id')
      .eq('okul_id', okulId)

    if (profiller) {
      for (const p of profiller) {
        try {
          await admin.auth.admin.updateUserById(p.id, { ban_duration: 'none' })
        } catch (authErr) {
          console.error(`[iyzico callback auth_unban] User: ${p.id}`, authErr)
        }
      }
    }

    } catch (isErr) {
      // İşlem yarıda kaldıysa marker'ı geri al ki GEÇERLİ bir ödeme tekrar denenebilsin
      if (replayKorumaAktif) {
        await admin.from('islenen_odemeler').delete().eq('dis_odeme_id', disOdemeId)
          .then(() => {}, () => {})
      }
      throw isErr
    }

    // Başarı sayfasına yönlendir (window.parent kullanarak)
    return new NextResponse(
      `<html><body><script>window.parent.location.href = "${currentAppUrl}/odeme-yap?sonuc=basarili&donem=${donem}";</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  } catch (err: any) {
    console.error('[iyzico callback fatal]', err)
    const msg = encodeURIComponent(err?.message ?? 'İşlem sırasında bilinmeyen bir hata oluştu')
    return new NextResponse(
      `<html><body><script>window.parent.location.href = "${currentAppUrl}/odeme-yap?sonuc=hata&mesaj=${msg}";</script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
}
