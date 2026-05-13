import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { serverError } from '@/lib/api-error'
import { logAudit } from '@/lib/audit.server'
import nodemailer from 'nodemailer'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getCallerIfSuperAdmin(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await adminClient().auth.getUser(token)
  if (!user) return null
  const { data: profil } = await adminClient()
    .from('profiller').select('rol').eq('id', user.id).single()
  if (profil?.rol !== 'super_admin') return null
  return user
}

function randomPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pwd = ''
  for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
  return pwd + '!'
}

async function sendKrediBilgisiEmail(to: string, adSoyad: string, ilAdi: string, password: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://klup360.com'}/login`

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'Klup360 <destek@klup360.com>',
    to,
    subject: 'Klup360 Denetçi Paneliniz Aktif Edildi',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #f9fafb; padding: 32px;">
        <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1e3a2f; margin: 0 0 8px;">Denetçi Paneliniz Hazır</h2>
          <p style="color: #6b7280; margin: 0 0 24px;">
            Sayın <strong>${adSoyad}</strong>,<br>
            <strong>${ilAdi}</strong> iline ait Klüp360 denetçi paneliniz aktif edilmiştir.
          </p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 8px; font-size: 13px; color: #374151; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Giriş Bilgileriniz</p>
            <p style="margin: 0 0 6px; color: #111827;"><strong>E-posta:</strong> ${to}</p>
            <p style="margin: 0; color: #111827;"><strong>Geçici Şifre:</strong> <span style="font-family: monospace; background: #e5e7eb; padding: 2px 8px; border-radius: 4px;">${password}</span></p>
          </div>
          <p style="color: #6b7280; font-size: 13px; margin: 0 0 20px;">İlk girişinizden sonra şifrenizi değiştirmenizi tavsiye ederiz.</p>
          <a href="${loginUrl}" style="display: inline-block; background: #2d5a3d; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px;">
            Panele Giriş Yap
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">Bu e-posta Klüp360 tarafından gönderilmiştir.</p>
      </div>
    `,
  })
}

// Tüm denetçi taleplerini listele
export async function GET(request: NextRequest) {
  const caller = await getCallerIfSuperAdmin(request)
  if (!caller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { data: talepler, error } = await adminClient()
    .from('denetci_talepleri')
    .select('*, okullar(id, ad), iller(id, ad)')
    .order('created_at', { ascending: false })

  if (error) return serverError(error)
  return NextResponse.json({ talepler: talepler ?? [] })
}

// Talebi onayla veya reddet
export async function PATCH(request: NextRequest) {
  const caller = await getCallerIfSuperAdmin(request)
  if (!caller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { talepId, status } = await request.json()
  if (!talepId || !status) {
    return NextResponse.json({ error: 'talepId ve status zorunludur' }, { status: 400 })
  }

  const admin = adminClient()

  const { data: talep, error: talepErr } = await admin
    .from('denetci_talepleri')
    .select('*, okullar(il_id), iller(id, ad)')
    .eq('id', talepId)
    .single()

  if (talepErr || !talep) {
    return NextResponse.json({ error: 'Talep bulunamadı' }, { status: 404 })
  }

  if (status === 'reddedildi') {
    await admin.from('denetci_talepleri').update({ status: 'reddedildi' }).eq('id', talepId)
    await logAudit({
      req: request, islem: 'guncelle', tablo: 'denetci_talepleri',
      kullanici_id: caller.id,
      aciklama: `Denetçi talebi reddedildi (talep #${talepId})`,
    })
    return NextResponse.json({ ok: true })
  }

  // Onaylama akışı
  const ilId: number | null = talep.il_id ?? talep.okullar?.il_id ?? null
  const email: string | null = talep.email ?? null

  if (!email) {
    return NextResponse.json({ error: 'Talep üzerinde e-posta adresi eksik.' }, { status: 400 })
  }
  if (!ilId) {
    return NextResponse.json({ error: 'İl bilgisi bulunamadı. Okul kaydındaki il bilgisini kontrol edin.' }, { status: 400 })
  }

  // Bu ilde zaten denetçi var mı?
  const { data: mevcutDenetci } = await admin
    .from('profiller').select('id').eq('rol', 'denetim_yetkilisi').eq('il_id', ilId).maybeSingle()

  if (mevcutDenetci) {
    return NextResponse.json({ error: 'Bu ilde zaten aktif bir denetçi bulunmaktadır.' }, { status: 409 })
  }

  const password = randomPassword()

  // Auth kullanıcısı oluştur
  const { data: userData, error: userErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (userErr) return serverError(userErr, 'auth-olustur')

  // Profil oluştur (ad/soyad opsiyonel — kolonlar yoksa insert başarısız olmasın)
  const adParcalari = (talep.ad_soyad || '').trim().split(' ')
  const adStr = adParcalari.length > 1 ? adParcalari.slice(0, -1).join(' ') : talep.ad_soyad || ''
  const soyadStr = adParcalari.length > 1 ? adParcalari.slice(-1)[0] : ''

  const profilData: Record<string, any> = { id: userData.user.id, il_id: ilId, rol: 'denetim_yetkilisi' }
  if (adStr) profilData.ad = adStr
  if (soyadStr) profilData.soyad = soyadStr

  const { error: profileErr } = await admin.from('profiller').insert(profilData)

  if (profileErr) {
    // ad/soyad kolon hatası olabilir — sadece zorunlu alanlarla tekrar dene
    if (profileErr.message?.includes('column') && (profileErr.message?.includes('ad') || profileErr.message?.includes('soyad'))) {
      const { error: retryErr } = await admin.from('profiller').insert({
        id: userData.user.id, il_id: ilId, rol: 'denetim_yetkilisi'
      })
      if (retryErr) {
        await admin.auth.admin.deleteUser(userData.user.id)
        return serverError(retryErr, 'profil-olustur')
      }
    } else {
      await admin.auth.admin.deleteUser(userData.user.id)
      return serverError(profileErr, 'profil-olustur')
    }
  }

  // Talebi güncelle
  await admin.from('denetci_talepleri').update({ status: 'onaylandi' }).eq('id', talepId)

  const ilAdi = talep.iller?.ad || `İl #${ilId}`

  await logAudit({
    req: request, islem: 'ekle', tablo: 'profiller',
    kullanici_id: caller.id,
    aciklama: `Denetçi hesabı açıldı: ${email} — ${ilAdi}`,
  })

  // E-posta gönder
  let emailSent = false
  let emailError: string | null = null
  try {
    await sendKrediBilgisiEmail(email, talep.ad_soyad || 'Denetçi', ilAdi, password)
    emailSent = true
  } catch (mailErr: any) {
    emailError = mailErr?.message || 'Resend hatası'
    console.error('Denetçi e-postası gönderilemedi:', mailErr)
  }

  if (!emailSent) {
    return NextResponse.json({ ok: true, ilAdi, emailSent: false, emailError, email, password })
  }

  return NextResponse.json({ ok: true, ilAdi, emailSent: true })
}
