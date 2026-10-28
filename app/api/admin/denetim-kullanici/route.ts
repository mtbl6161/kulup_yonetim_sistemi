import { adminClient, getCallerIfSuperAdmin } from '@/lib/apiAuth'
import { NextResponse, type NextRequest } from 'next/server'
import { serverError } from '@/lib/api-error'
import { logAudit } from '@/lib/audit.server'

// Denetim yetkilisi listesi
export async function GET(request: NextRequest) {
  const caller = await getCallerIfSuperAdmin(request)
  if (!caller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const admin = adminClient()

  const { data: profiller, error } = await admin
    .from('profiller')
    .select('id, rol, il_id, created_at, iller(id, ad)')
    .eq('rol', 'denetim_yetkilisi')
    .order('created_at', { ascending: false })

  if (error) return serverError(error)

  const { data: { users } } = await admin.auth.admin.listUsers()

  const liste = (profiller ?? []).map((p) => {
    const authUser = users.find((u) => u.id === p.id)
    return {
      ...p,
      email: authUser?.email,
      son_giris: authUser?.last_sign_in_at,
    }
  })

  return NextResponse.json({ kullanicilar: liste })
}

// Yeni denetim yetkilisi oluştur
export async function POST(request: NextRequest) {
  const caller = await getCallerIfSuperAdmin(request)
  if (!caller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { email, password, il_id } = await request.json()

  if (!email || !password || !il_id) {
    return NextResponse.json(
      { error: 'E-posta, şifre ve il zorunludur' },
      { status: 400 }
    )
  }

  const admin = adminClient()

  // İl var mı kontrol et
  const { data: il, error: ilError } = await admin
    .from('iller').select('id, ad').eq('id', il_id).single()
  if (ilError || !il) {
    return NextResponse.json({ error: 'Geçersiz il' }, { status: 400 })
  }

  if (String(password).length < 6) {
    return NextResponse.json({ error: 'Şifre en az 6 karakter olmalıdır' }, { status: 400 })
  }

  const normalizedEmail = String(email).trim().toLowerCase()

  // Bu e-posta ile daha önce auth kullanıcısı açılmış mı? (ör. panel dışından
  // oluşturulup profili hiç yazılmamış hesaplar). Profilsizse denetçi olarak bağla.
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const mevcut = users.find(u => u.email?.toLowerCase() === normalizedEmail)

  let userId: string
  let yeniKullanici = false

  if (mevcut) {
    const { data: mevcutProfil } = await admin
      .from('profiller').select('rol').eq('id', mevcut.id).maybeSingle()
    if (mevcutProfil) {
      const rolAdi = mevcutProfil.rol === 'denetim_yetkilisi' ? 'denetim yetkilisi'
                   : mevcutProfil.rol === 'super_admin' ? 'sistem yöneticisi' : 'okul yöneticisi'
      return NextResponse.json(
        { error: `Bu e-posta zaten ${rolAdi} olarak kayıtlı` },
        { status: 409 }
      )
    }
    const { error: updError } = await admin.auth.admin.updateUserById(mevcut.id, {
      password,
      email_confirm: true,
    })
    if (updError) return serverError(updError)
    userId = mevcut.id
  } else {
    // Auth kullanıcısı oluştur
    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
    })
    if (userError) return serverError(userError)
    userId = userData.user.id
    yeniKullanici = true
  }

  // Profil oluştur (okul_id yok, il_id var)
  const { error: profileError } = await admin
    .from('profiller')
    .insert({ id: userId, il_id, rol: 'denetim_yetkilisi' })

  if (profileError) {
    if (yeniKullanici) await admin.auth.admin.deleteUser(userId)
    return serverError(profileError, 'profil-olustur')
  }

  await logAudit({
    req: request,
    islem: 'ekle',
    tablo: 'profiller',
    kullanici_id: caller.id,
    aciklama: `Denetim yetkilisi (${normalizedEmail}) ${yeniKullanici ? 'oluşturuldu' : 'mevcut hesaba bağlandı'} — ${il.ad} ili`,
  })

  return NextResponse.json({ ok: true, userId })
}

// Denetim yetkilisi sil
export async function DELETE(request: NextRequest) {
  const caller = await getCallerIfSuperAdmin(request)
  if (!caller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { userId } = await request.json()
  if (!userId) return NextResponse.json({ error: 'userId zorunludur' }, { status: 400 })

  const { error } = await adminClient().auth.admin.deleteUser(userId)
  if (error) return serverError(error)

  await logAudit({
    req: request,
    islem: 'sil',
    tablo: 'profiller',
    kullanici_id: caller.id,
    aciklama: `Denetim yetkilisi (${userId}) silindi`,
  })

  return NextResponse.json({ ok: true })
}
