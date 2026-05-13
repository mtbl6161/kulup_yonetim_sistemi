import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { logAudit } from '@/lib/audit.server'
import { serverError } from '@/lib/api-error'

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

// Tüm ödemeleri listele
export async function GET(request: NextRequest) {
  const caller = await getCallerIfSuperAdmin(request)
  if (!caller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const admin = adminClient()
  
  const { data: odemeler, error } = await admin
    .from('okul_odemeleri')
    .select('*, okullar(ad)')
    .order('odeme_tarihi', { ascending: false })

  if (error) return serverError(error, 'odemeler')
  return NextResponse.json({ odemeler })
}

// Yeni ödeme kaydı ekle
export async function POST(request: NextRequest) {
  const caller = await getCallerIfSuperAdmin(request)
  if (!caller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const body = await request.json()
  const { okul_id, tutar, odeme_tarihi, odeme_yontemi, aciklama } = body

  if (!okul_id || !tutar) {
    return NextResponse.json({ error: 'Okul ve tutar zorunludur' }, { status: 400 })
  }

  const admin = adminClient()
  
  const { data, error } = await admin
    .from('okul_odemeleri')
    .insert({
      okul_id,
      tutar,
      odeme_tarihi: odeme_tarihi || new Date().toISOString().split('T')[0],
      odeme_yontemi: odeme_yontemi || 'Havale',
      aciklama
    })
    .select()

  if (error) return serverError(error, 'odemeler')
  
  // Ödeme eklendiğinde okulun durumunu 'aktif'e çek
  await admin.from('okullar').update({ odeme_durumu: 'aktif' }).eq('id', okul_id)

  // Okulun tüm kullanıcılarını bul ve banını kaldır (unban)
  const { data: profiller } = await admin
    .from('profiller')
    .select('id')
    .eq('okul_id', okul_id)
  
  if (profiller && profiller.length > 0) {
    for (const p of profiller) {
      await admin.auth.admin.updateUserById(p.id, {
        ban_duration: 'none'
      })
    }
  }

  // LOG EKLE
  await logAudit({
    req: request,
    islem: 'ode',
    tablo: 'okul_odemeleri',
    okul_id: okul_id,
    kullanici_id: caller.id,
    aciklama: `${tutar} TL ödeme kaydı eklendi. (Yöntem: ${odeme_yontemi})`
  })

  return NextResponse.json({ ok: true, data })
}
