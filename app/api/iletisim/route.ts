import { NextResponse, type NextRequest } from 'next/server'
import { rateLimit, getIp } from '@/lib/rate-limit'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  const ip = getIp(request)
  const { allowed } = rateLimit(`contact:${ip}`, 5, 60 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Çok fazla istek gönderdiniz.' }, { status: 429 })
  }

  try {
    const { ad, email, konu, mesaj } = await request.json()

    if (!ad || !email || !mesaj) {
      return NextResponse.json({ error: 'Lütfen zorunlu alanları doldurun.' }, { status: 400 })
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    const mailOptions = {
      from: process.env.SMTP_FROM || 'Klüp360 <destek@klup360.com>',
      to: 'destek@klup360.com',
      replyTo: email,
      subject: `İletişim Formu: ${konu || 'Konu Belirtilmemiş'}`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color: #2d5a3d; border-bottom: 2px solid #2d5a3d; padding-bottom: 10px;">Yeni İletişim Formu Mesajı</h2>
          <p><strong>Ad Soyad:</strong> ${ad}</p>
          <p><strong>E-Posta:</strong> ${email}</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;"/>
          <p><strong>Mesaj:</strong></p>
          <p style="white-space: pre-wrap;">${mesaj}</p>
        </div>
      `,
    }

    const info = await transporter.sendMail(mailOptions)

    return NextResponse.json({ success: true, messageId: info.messageId })
  } catch (err: any) {
    console.error('Contact API Resend Error:', err)
    return NextResponse.json({ error: 'Mesaj gönderilemedi.', details: err.message }, { status: 500 })
  }
}
