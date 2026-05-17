import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { Resend } from 'resend'

function escape(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: { user } } = await adminClient.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { allowed, remaining } = rateLimit(`email:${user.id}`, 100, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Saatlik e-posta limitine ulaştınız (100 adet).' }, { status: 429 })
  }

  try {
    const { email, subject, personelAd, ay, yil, kurumAdi, pdfBase64 } = await request.json()

    if (!email || !pdfBase64) {
      return NextResponse.json({ error: 'E-posta ve PDF verisi zorunlu!' }, { status: 400 })
    }

    const safePersonelAd = escape(personelAd)
    const safeAy         = escape(ay)
    const safeYil        = escape(yil)
    const safeKurumAdi   = escape(kurumAdi)

    const html = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #2d5a3d; border-bottom: 2px solid #2d5a3d; padding-bottom: 10px;">Maaş Bordrosu Bilgilendirmesi</h2>
        <p>Sayın <strong>${safePersonelAd}</strong>,</p>
        <p><strong>${safeAy}/${safeYil}</strong> dönemine ait maaş bordronuz ekte ilginize sunulmuştur.</p>
        <p>Kurumumuza kattığınız değer, gösterdiğiniz özveri ve emekleriniz için yürekten teşekkür ederiz.</p>
        <br/>
        <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
          <p style="margin: 0; font-weight: bold;">Saygılarımızla,</p>
          <p style="margin: 0; color: #2d5a3d; font-size: 1.1em; font-weight: bold;">${safeKurumAdi}</p>
        </div>
      </div>
    `

    const simpleAd    = safePersonelAd.replace(/[^a-zA-Z0-9]/g, '_')
    const safeFilename = `Bordro_${simpleAd}_${safeAy}_${safeYil}.pdf`
    const base64Data   = pdfBase64.replace(/^data:application\/pdf;base64,/, '')

    const resend = new Resend(process.env.RESEND_API_KEY)

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM || 'Klüp360 <destek@klup360.com>',
      to: email,
      subject: subject || `${safeAy} ${safeYil} Maaş Bordrosu`,
      html,
      attachments: [{
        filename: safeFilename,
        content: base64Data,
      }],
    })

    if (error) {
      console.error('❌ Resend Error:', error)
      return NextResponse.json({ error: 'Mail gönderilemedi', details: error.message }, { status: 500 })
    }

    console.log('✅ Resend Send Success:', data?.id)
    return NextResponse.json({ success: true, remaining, messageId: data?.id })
  } catch (err: any) {
    console.error('❌ Send Email Error:', err)
    return NextResponse.json({ error: 'Sistem hatası', details: err.message }, { status: 500 })
  }
}
