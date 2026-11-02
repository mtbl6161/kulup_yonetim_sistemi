import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { epostaGonder, htmlKacis } from '@/lib/eposta'
import { hataMesaji } from '@/lib/hata'

const EPOSTA_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAKS_PDF = 6 * 1024 * 1024 // base64 karakter (~4,5 MB PDF)

// Öğrencinin ödeme dökümünü (PDF) veliye e-postayla gönderir.
// Kurum adı ve yanıt adresi istemciden değil, gönderenin okul ayarlarından alınır.
export async function POST(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: { user } } = await adminClient.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { data: profil } = await adminClient.from('profiller').select('okul_id, rol').eq('id', user.id).maybeSingle()
  if (!profil?.okul_id) return NextResponse.json({ error: 'Bu işlem için okul hesabıyla giriş yapmalısınız.' }, { status: 403 })

  const { allowed, remaining } = await rateLimit(`email:${user.id}`, 100, 60 * 60 * 1000)
  if (!allowed) return NextResponse.json({ error: 'Saatlik e-posta limitine ulaştınız (100 adet).' }, { status: 429 })

  try {
    const { email, ogrenciAd, egitimYili, toplamOdenen, toplamBekleyen, not, pdfBase64 } = await request.json()
    const alici = String(email || '').trim()
    if (!EPOSTA_RE.test(alici)) return NextResponse.json({ error: 'Geçerli bir e-posta adresi girin.' }, { status: 400 })
    if (!pdfBase64 || typeof pdfBase64 !== 'string') return NextResponse.json({ error: 'PDF verisi eksik.' }, { status: 400 })
    if (pdfBase64.length > MAKS_PDF) return NextResponse.json({ error: 'PDF çok büyük.' }, { status: 413 })

    const { data: ayarlar } = await adminClient.from('ayarlar').select('kurum_adi, email').eq('okul_id', profil.okul_id).maybeSingle()
    const { data: okul } = await adminClient.from('okullar').select('ad').eq('id', profil.okul_id).maybeSingle()
    const kurum = htmlKacis(ayarlar?.kurum_adi || okul?.ad || 'Çocuk Kulübü')
    const ad = htmlKacis(ogrenciAd)
    const yil = htmlKacis(egitimYili)
    const tl = (n: unknown) => `${Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`
    const notHtml = typeof not === 'string' && not.trim() ? `<p style="background:#f4f5f8;border-radius:8px;padding:10px 12px;margin:14px 0">${htmlKacis(not.trim().slice(0, 1000)).replace(/\n/g, '<br/>')}</p>` : ''

    const html = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #2347D9; border-bottom: 2px solid #2347D9; padding-bottom: 10px; margin-top: 0;">Öğrenci Ödeme Dökümü</h2>
        <p>Sayın Velimiz,</p>
        <p><strong>${ad}</strong> adlı öğrencimizin <strong>${yil}</strong> eğitim öğretim yılına ait ödeme dökümü ekte bilgilerinize sunulmuştur.</p>
        <table style="border-collapse: collapse; margin: 12px 0;">
          <tr><td style="padding: 4px 16px 4px 0;">Toplam ödenen</td><td style="padding: 4px 0; font-weight: bold;">${tl(toplamOdenen)}</td></tr>
          <tr><td style="padding: 4px 16px 4px 0;">Ödenmemiş / bekleyen</td><td style="padding: 4px 0; font-weight: bold; color: ${Number(toplamBekleyen) > 0 ? '#aa1e26' : '#0b7a4b'};">${tl(toplamBekleyen)}</td></tr>
        </table>
        ${notHtml}
        <p>Ayrıntılar ekteki PDF belgesindedir. Sorularınız için bu e-postayı yanıtlayabilirsiniz.</p>
        <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 16px;">
          <p style="margin: 0; font-weight: bold;">Saygılarımızla,</p>
          <p style="margin: 0; color: #2347D9; font-size: 1.1em; font-weight: bold;">${kurum}</p>
        </div>
      </div>
    `
    const dosyaAdi = `Odeme_Dokumu_${String(ogrenciAd || 'ogrenci').normalize('NFD').replace(/[^a-zA-Z0-9]+/g, '_')}_${String(egitimYili || '').replace(/[^0-9-]/g, '')}.pdf`

    let messageId: string | undefined
    try {
      messageId = await epostaGonder({
        to: alici,
        subject: `${ayarlar?.kurum_adi || okul?.ad || 'Çocuk Kulübü'} · ${String(ogrenciAd || '')} ödeme dökümü`,
        html,
        replyTo: ayarlar?.email || undefined,
        attachments: [{ filename: dosyaAdi, content: pdfBase64.replace(/^data:application\/pdf;[^,]*,/, '') }],
      })
    } catch (error) {
      console.error('❌ Döküm e-postası gönderilemedi:', error)
      return NextResponse.json({ error: 'E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin.' }, { status: 500 })
    }
    return NextResponse.json({ success: true, remaining, messageId })
  } catch (err) {
    console.error('❌ Döküm e-postası hatası:', err)
    return NextResponse.json({ error: 'Sistem hatası', details: hataMesaji(err) }, { status: 500 })
  }
}
