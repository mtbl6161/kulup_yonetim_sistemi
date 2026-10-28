import { NextResponse, type NextRequest } from 'next/server'
import { rateLimit, getIp } from '@/lib/rate-limit'
import { epostaGonder, htmlKacis } from '@/lib/eposta'

export async function POST(request: NextRequest) {
  const ip = getIp(request)
  const { allowed } = await rateLimit(`contact:${ip}`, 5, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Çok fazla istek gönderdiniz.' }, { status: 429 })
  }

  try {
    const { ad, email, konu, mesaj } = await request.json()

    if (!ad || !email || !mesaj) {
      return NextResponse.json({ error: 'Lütfen zorunlu alanları doldurun.' }, { status: 400 })
    }

    const mailOptions = {
      to: 'destek@klup360.com',
      replyTo: email,
      subject: `İletişim Formu: ${String(konu || 'Konu Belirtilmemiş').replace(/[\r\n]+/g, ' ').slice(0, 150)}`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color: #2347D9; border-bottom: 2px solid #2347D9; padding-bottom: 10px;">Yeni İletişim Formu Mesajı</h2>
          <p><strong>Ad Soyad:</strong> ${htmlKacis(ad)}</p>
          <p><strong>E-Posta:</strong> ${htmlKacis(email)}</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;"/>
          <p><strong>Mesaj:</strong></p>
          <p style="white-space: pre-wrap;">${htmlKacis(mesaj)}</p>
        </div>
      `,
    }

    const messageId = await epostaGonder(mailOptions)

    return NextResponse.json({ success: true, messageId })
  } catch (err) {
    console.error('Contact API Resend Error:', err)
    return NextResponse.json({ error: 'Mesaj gönderilemedi. Lütfen daha sonra tekrar deneyin.' }, { status: 500 })
  }
}
