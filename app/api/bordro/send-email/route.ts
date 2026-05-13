import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import nodemailer from 'nodemailer'

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

  // Saatte 100 e-posta limiti
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
    const safeAy = escape(ay)
    const safeYil = escape(yil)
    const safeKurumAdi = escape(kurumAdi)

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

    // Dosya adını çok basit tutalım (Örn: Bordro_Ahmet_Yilmaz.pdf)
    const simpleAd = safePersonelAd.replace(/[^a-zA-Z0-9]/g, '_')
    const safeFilename = `Bordro_${simpleAd}_${safeAy}_${safeYil}.pdf`

    // Eğer base64 verisinin başında 'data:application/pdf;base64,' gibi bir tanım varsa onu temizlemeliyiz.
    // Aksi takdirde PDF bozuk oluşur ve Gmail virüs sanıp maili sessizce siler.
    const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, '')

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'Klüp360 <destek@klup360.com>',
      to: email,
      subject: subject || `${safeAy} ${safeYil} Maas Bordrosu - Klup360`,
      html,
      attachments: [{
        filename: safeFilename,
        content: Buffer.from(base64Data, 'base64'),
        contentType: 'application/pdf'
      }]
    })

    console.log('✅ SMTP Send Success:', {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected
    })

    return NextResponse.json({ success: true, remaining, messageId: info.messageId })
  } catch (err: any) {
    console.error('❌ SMTP ERROR:', err)
    return NextResponse.json({ error: 'Sistem hatası', details: err.message }, { status: 500 })
  }
}
