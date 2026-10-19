import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import nodemailer from 'nodemailer'
import { serverError } from '@/lib/api-error'
import { logAudit } from '@/lib/audit.server'
import { DENEME_GUN, denemeBitisTarihi } from '@/lib/deneme'

// Süresi dolmuş deneme kurumlarına bir defalık ek ücretsiz deneme verir ve
// kurum yöneticisine e-posta ile bildirir. Aynı kuruma ikinci kez verilmemesi
// için uzatılan okul id'leri sistem_ayarlari'nda tutulur.
const KAYIT_ANAHTARI = 'deneme_uzatma_kampanyasi'

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

function escape(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

type Aday = { okul_id: number; okul_adi: string; lisans_bitis: string; email: string }

async function uzatilanlariGetir(admin: ReturnType<typeof adminClient>): Promise<number[]> {
  const { data } = await admin
    .from('sistem_ayarlari').select('deger').eq('anahtar', KAYIT_ANAHTARI).maybeSingle()
  return Array.isArray(data?.deger?.okul_ids) ? data.deger.okul_ids : []
}

async function adaylariGetir(admin: ReturnType<typeof adminClient>): Promise<Aday[]> {
  const { data: okullar, error } = await admin
    .from('okullar')
    .select('id, ad, lisans_bitis')
    .eq('odeme_durumu', 'deneme')
    .lt('lisans_bitis', new Date().toISOString())
  if (error) throw error
  if (!okullar?.length) return []

  const uzatilanlar = new Set(await uzatilanlariGetir(admin))
  const okulIds = okullar.filter(o => !uzatilanlar.has(o.id)).map(o => o.id)
  if (!okulIds.length) return []

  const { data: profiller } = await admin
    .from('profiller').select('id, okul_id').eq('rol', 'admin').in('okul_id', okulIds)
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })

  const adaylar: Aday[] = []
  for (const o of okullar) {
    if (uzatilanlar.has(o.id)) continue
    // Kurumun yöneticisi olmayan (yarım kalmış/yinelenen) okul kayıtları atlanır
    const p = profiller?.find(p => p.okul_id === o.id)
    const u = p && users.find(u => u.id === p.id)
    if (!u?.email) continue
    adaylar.push({ okul_id: o.id, okul_adi: o.ad, lisans_bitis: o.lisans_bitis, email: u.email })
  }
  return adaylar
}

async function bilgilendirmeMailiGonder(to: string, okulAdi: string, bitis: Date) {
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
  const bitisStr = bitis.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'Klup360 <destek@klup360.com>',
    to,
    subject: `Klüp360: ${DENEME_GUN} gün ücretsiz deneme hediyeniz tanımlandı`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #f9fafb; padding: 32px;">
        <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1e3a2f; margin: 0 0 8px;">Deneme Süreniz Yenilendi</h2>
          <p style="color: #374151; margin: 0 0 16px; line-height: 1.6;">
            Merhaba,<br>
            <strong>${escape(okulAdi)}</strong> için Klüp360 deneme süreniz sona ermişti. Sistemi rahatça
            tanıyabilmeniz için hesabınıza <strong>${DENEME_GUN} gün ücretsiz kullanım</strong> tanımladık.
          </p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px;">
            <p style="margin: 0; color: #111827;">Yeni deneme bitiş tarihi: <strong>${bitisStr}</strong></p>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 20px; line-height: 1.6;">
            Öğrenci kaydı, aidat tahsilatı, puantaj, bordro ve işletme defteri dahil tüm modüller açık.
            Kredi kartı gerekmez; süre sonunda dilerseniz abone olabilirsiniz.
          </p>
          <a href="${loginUrl}" style="display: inline-block; background: #2d5a3d; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px;">
            Panele Giriş Yap
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">Bu e-posta Klüp360 tarafından gönderilmiştir.</p>
      </div>
    `,
  })
}

// Uzatmaya uygun kurumları listele (hiçbir şey göndermez)
export async function GET(request: NextRequest) {
  const caller = await getCallerIfSuperAdmin(request)
  if (!caller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  try {
    const adaylar = await adaylariGetir(adminClient())
    return NextResponse.json({ adaylar, gun: DENEME_GUN })
  } catch (e) {
    return serverError(e, 'deneme-uzat-liste')
  }
}

// Seçilen kurumlara ek deneme tanımla ve e-posta gönder
export async function POST(request: NextRequest) {
  const caller = await getCallerIfSuperAdmin(request)
  if (!caller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { okulIds } = await request.json()
  if (!Array.isArray(okulIds) || !okulIds.length) {
    return NextResponse.json({ error: 'En az bir kurum seçmelisiniz' }, { status: 400 })
  }

  const admin = adminClient()
  let adaylar: Aday[]
  try {
    adaylar = (await adaylariGetir(admin)).filter(a => okulIds.includes(a.okul_id))
  } catch (e) {
    return serverError(e, 'deneme-uzat-liste')
  }

  const bitis = denemeBitisTarihi()
  const sonuclar: { okul_id: number; okul_adi: string; email: string; uzatildi: boolean; mail: boolean; hata?: string }[] = []
  const uzatilanlar = await uzatilanlariGetir(admin)

  for (const a of adaylar) {
    const { error: updErr } = await admin
      .from('okullar')
      .update({ lisans_bitis: bitis.toISOString(), odeme_durumu: 'deneme' })
      .eq('id', a.okul_id)
    if (updErr) {
      console.error('[deneme-uzat] güncelleme hatası', a.okul_id, updErr.message)
      sonuclar.push({ ...a, uzatildi: false, mail: false, hata: 'Lisans güncellenemedi' })
      continue
    }
    uzatilanlar.push(a.okul_id)

    let mail = true
    let hata: string | undefined
    try {
      await bilgilendirmeMailiGonder(a.email, a.okul_adi, bitis)
    } catch (e) {
      mail = false
      hata = 'E-posta gönderilemedi'
      console.error('[deneme-uzat] mail hatası', a.okul_id, e instanceof Error ? e.message : e)
    }
    sonuclar.push({ ...a, uzatildi: true, mail, hata })

    await logAudit({
      req: request, islem: 'guncelle', tablo: 'okullar', okul_id: a.okul_id,
      kullanici_id: caller.id,
      aciklama: `${a.okul_adi}: süresi dolan denemeye ${DENEME_GUN} gün ek süre verildi${mail ? ', e-posta gönderildi' : ' (e-posta gönderilemedi)'}`,
    })
  }

  await admin.from('sistem_ayarlari').upsert({
    anahtar: KAYIT_ANAHTARI,
    deger: { okul_ids: Array.from(new Set(uzatilanlar)) },
    updated_at: new Date().toISOString(),
  })

  return NextResponse.json({ ok: true, sonuclar })
}
