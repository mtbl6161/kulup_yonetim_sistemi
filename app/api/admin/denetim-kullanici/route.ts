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
    .from('profiller').select('rol').eq('id', user.id).single()
  if (profil?.rol !== 'super_admin') return null
  return user
}

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

  const liste = (profiller ?? []).map((p: any) => {
    const authUser = users.find((u: any) => u.id === p.id)
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

  // Auth kullanıcısı oluştur
  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (userError) return serverError(userError)

  // Profil oluştur (okul_id yok, il_id var)
  const { error: profileError } = await admin
    .from('profiller')
    .insert({ id: userData.user.id, il_id, rol: 'denetim_yetkilisi' })

  if (profileError) {
    await admin.auth.admin.deleteUser(userData.user.id)
    return serverError(profileError, 'profil-olustur')
  }

  await logAudit({
    req: request,
    islem: 'ekle',
    tablo: 'profiller',
    kullanici_id: caller.id,
    aciklama: `Denetim yetkilisi (${email}) oluşturuldu — ${il.ad} ili`,
  })

  return NextResponse.json({ ok: true, userId: userData.user.id })
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
