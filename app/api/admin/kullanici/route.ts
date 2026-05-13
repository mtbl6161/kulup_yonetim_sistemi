import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { serverError } from '@/lib/api-error'
import { logAudit } from '@/lib/audit.server'

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
    .from('profiller')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (profil?.rol !== 'super_admin') return null
  return user
}

// Kullanıcı listesi
export async function GET(request: NextRequest) {
  const caller = await getCallerIfSuperAdmin(request)
  if (!caller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const admin = adminClient()

  // Proflilleri çek (Kendimiz hariç)
  const { data: profiller, error: profileError } = await admin
    .from('profiller')
    .select('id, rol, okul_id, created_at, okullar(id, ad, lisans_bitis, odeme_durumu)')
    .neq('id', caller.id)
    .order('created_at', { ascending: false })

  if (profileError) return serverError(profileError)
  if (!profiller) return NextResponse.json({ kullanicilar: [] })

  // Auth kullanıcılarını çek (E-posta ve Son Giriş için)
  const { data: { users }, error: authError } = await admin.auth.admin.listUsers()
  if (authError) return serverError(authError)

  // Okul istatistiklerini hesapla
  const okulIds = Array.from(new Set(profiller.map((p: any) => p.okul_id).filter(Boolean)))
  const okulStats: Record<number, { ogrenci: number; personel: number; bordro: number; tahsilat: number }> = {}

  await Promise.all(okulIds.map(async (oid) => {
    const { count: ogrenciCount } = await admin
      .from('ogrenciler')
      .select('*', { count: 'exact', head: true })
      .eq('okul_id', oid)
    
    const { count: personelCount } = await admin
      .from('personel')
      .select('*', { count: 'exact', head: true })
      .eq('okul_id', oid)

    const { count: bordroCount } = await admin
      .from('bordro')
      .select('*', { count: 'exact', head: true })
      .eq('okul_id', oid)

    const { count: tahsilatCount } = await admin
      .from('tahsilat')
      .select('*', { count: 'exact', head: true })
      .eq('okul_id', oid)

    okulStats[oid!] = {
      ogrenci: ogrenciCount || 0,
      personel: personelCount || 0,
      bordro: bordroCount || 0,
      tahsilat: tahsilatCount || 0
    }
  }))

  // Verileri birleştir
  const birlesikListe = profiller.map((p: any) => {
    const authUser = users.find((u: any) => u.id === p.id)
    const stats = p.okul_id ? (okulStats[p.okul_id] || { ogrenci: 0, personel: 0, bordro: 0, tahsilat: 0 }) : { ogrenci: 0, personel: 0, bordro: 0, tahsilat: 0 }
    
    return {
      ...p,
      email: authUser?.email,
      last_login: authUser?.last_sign_in_at,
      banned: !!authUser?.banned_until && new Date(authUser.banned_until) > new Date(),
      okullar: p.okullar ? {
        ...(p.okullar as any),
        ogrenci_sayisi: stats.ogrenci,
        personel_sayisi: stats.personel,
        bordro_sayisi: stats.bordro,
        tahsilat_sayisi: stats.tahsilat
      } : null
    }
  })

  return NextResponse.json({ kullanicilar: birlesikListe })
}

// Yeni kullanıcı oluştur
export async function POST(request: NextRequest) {
  const caller = await getCallerIfSuperAdmin(request)
  if (!caller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { email, password, schoolName } = await request.json()

  if (!email || !password || !schoolName) {
    return NextResponse.json({ error: 'E-posta, şifre ve okul adı zorunludur' }, { status: 400 })
  }

  const admin = adminClient()

  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (userError) return serverError(userError)

  const newUser = userData.user

  const { data: school, error: schoolError } = await admin
    .from('okullar')
    .insert({ 
      ad: schoolName.trim(),
      lisans_bitis: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(), // +1 Yıl
      odeme_durumu: 'aktif'
    })
    .select('id')
    .single()

  if (schoolError) {
    await admin.auth.admin.deleteUser(newUser.id)
    return serverError(schoolError, 'okul-olustur')
  }

  const { error: profileError } = await admin
    .from('profiller')
    .insert({ id: newUser.id, okul_id: school.id, rol: 'admin' })

  if (profileError) {
    await admin.auth.admin.deleteUser(newUser.id)
    return serverError(profileError, 'profil-olustur')
  }

  // LOG EKLE
  await logAudit({
    req: request,
    islem: 'ekle',
    tablo: 'profiller',
    okul_id: school.id,
    kullanici_id: caller.id,
    aciklama: `Yeni okul (${schoolName}) ve yönetici hesabı (${email}) oluşturuldu.`
  })

  return NextResponse.json({ ok: true, userId: newUser.id })
}

// Şifre Güncelle (PATCH)
export async function PATCH(request: NextRequest) {
  const caller = await getCallerIfSuperAdmin(request)
  if (!caller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { userId, newPassword } = await request.json()
  if (!userId || !newPassword) return NextResponse.json({ error: 'Veriler eksik' }, { status: 400 })

  const { error } = await adminClient().auth.admin.updateUserById(userId, {
    password: newPassword
  })

  if (error) return serverError(error)

  // LOG EKLE
  await logAudit({
    req: request,
    islem: 'guncelle',
    tablo: 'auth',
    kullanici_id: caller.id,
    aciklama: `Sistem yöneticisi (${userId}) şifresi güncellendi.`
  })

  return NextResponse.json({ ok: true })
}

// Hesap Durumu Güncelle (Dondur/Aktif Et) - PUT
export async function PUT(request: NextRequest) {
  const caller = await getCallerIfSuperAdmin(request)
  if (!caller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { userId, banned, okulId, lisansBitis, odemeDurumu } = await request.json()
  
  // EĞER OKUL BİLGİSİ GÜNCELLENİYORSA
  if (okulId && (lisansBitis || odemeDurumu)) {
    const updateData: any = {}
    if (lisansBitis) updateData.lisans_bitis = lisansBitis
    if (odemeDurumu) updateData.odeme_durumu = odemeDurumu

    const { error: schoolErr } = await adminClient()
      .from('okullar')
      .update(updateData)
      .eq('id', okulId)

    if (schoolErr) return serverError(schoolErr)
    return NextResponse.json({ ok: true })
  }

  // EĞER KULLANICI BANLANIYORSA (ESKİ MANTIK)
  if (userId === undefined || banned === undefined) return NextResponse.json({ error: 'Veriler eksik' }, { status: 400 })

  const { error } = await adminClient().auth.admin.updateUserById(userId, {
    ban_duration: banned ? '876000h' : 'none'
  })

  if (error) return serverError(error)
  return NextResponse.json({ ok: true })
}

// Kullanıcı sil
export async function DELETE(request: NextRequest) {
  const caller = await getCallerIfSuperAdmin(request)
  if (!caller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { userId } = await request.json()
  if (!userId) return NextResponse.json({ error: 'userId zorunludur' }, { status: 400 })

  if (userId === caller.id) {
    return NextResponse.json({ error: 'Kendi hesabınızı silemezsiniz' }, { status: 400 })
  }

  const { error } = await adminClient().auth.admin.deleteUser(userId)
  if (error) return serverError(error)

  // LOG EKLE
  await logAudit({
    req: request,
    islem: 'sil',
    tablo: 'profiller',
    kullanici_id: caller.id,
    aciklama: `Kullanıcı hesabı (${userId}) kalıcı olarak silindi.`
  })

  return NextResponse.json({ ok: true })
}
