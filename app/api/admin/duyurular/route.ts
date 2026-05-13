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
  
  const admin = adminClient()
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return null

  const { data: profil } = await admin
    .from('profiller')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (profil?.rol !== 'super_admin') return null
  return user
}

// Duyuruları listele
export async function GET(request: NextRequest) {
  const caller = await getCallerIfSuperAdmin(request)
  if (!caller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const admin = adminClient()
  const { data: duyurular, error } = await admin
    .from('duyurular')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return serverError(error)
  return NextResponse.json({ duyurular })
}

// Duyuru ekle
export async function POST(request: NextRequest) {
  const caller = await getCallerIfSuperAdmin(request)
  if (!caller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const body = await request.json()
  const { baslik, icerik, tur, aktif } = body

  if (!baslik || !icerik) {
    return NextResponse.json({ error: 'Başlık ve içerik zorunludur' }, { status: 400 })
  }

  const admin = adminClient()
  const { data, error } = await admin
    .from('duyurular')
    .insert({ baslik, icerik, tur: tur || 'info', aktif: aktif !== undefined ? aktif : true })
    .select()

  if (error) return serverError(error)

  // LOG EKLE
  await logAudit({
    req: request,
    islem: 'duyuru_ekle',
    tablo: 'duyurular',
    kullanici_id: caller.id,
    aciklama: `"${baslik}" başlıklı yeni bir duyuru yayınlandı.`
  })

  return NextResponse.json({ ok: true, data })
}

// Duyuru güncelle (Aktif/Pasif etme vb)
export async function PUT(request: NextRequest) {
  const caller = await getCallerIfSuperAdmin(request)
  if (!caller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const body = await request.json()
  const { id, ...updateData } = body

  if (!id) return NextResponse.json({ error: 'ID zorunludur' }, { status: 400 })

  const admin = adminClient()
  const { data, error } = await admin
    .from('duyurular')
    .update(updateData)
    .eq('id', id)
    .select()

  if (error) return serverError(error)
  return NextResponse.json({ ok: true, data })
}

// Duyuru sil
export async function DELETE(request: NextRequest) {
  const caller = await getCallerIfSuperAdmin(request)
  if (!caller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID zorunludur' }, { status: 400 })

  const admin = adminClient()
  const { error } = await admin.from('duyurular').delete().eq('id', id)

  if (error) return serverError(error)
  return NextResponse.json({ ok: true })
}
