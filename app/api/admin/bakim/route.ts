import { NextRequest, NextResponse } from 'next/server'
import { getCallerIfSuperAdmin } from '@/lib/apiAuth'
import { createClient } from '@supabase/supabase-js'
import { logAudit } from '@/lib/audit.server'
import { serverError } from '@/lib/api-error'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient(supabaseUrl, supabaseServiceRoleKey)

export async function GET(request: NextRequest) {
  const caller = await getCallerIfSuperAdmin(request)
  if (!caller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { data } = await admin
    .from('sistem_ayarlari')
    .select('*')
    .eq('anahtar', 'bakim_modu')
    .single()

  return NextResponse.json({ settings: data?.deger || { aktif: false, mesaj: '' } })
}

export async function POST(request: NextRequest) {
  const caller = await getCallerIfSuperAdmin(request)
  if (!caller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { aktif, mesaj } = await request.json()

  const { error } = await admin
    .from('sistem_ayarlari')
    .upsert({
      anahtar: 'bakim_modu',
      deger: { aktif, mesaj },
      updated_at: new Date().toISOString()
    })

  if (error) return serverError(error, 'bakim')

  // LOG EKLE
  await logAudit({
    req: request,
    islem: 'ayarlar',
    tablo: 'sistem_ayarlari',
    kullanici_id: caller.id,
    aciklama: `Bakım modu ${aktif ? 'AKTİF' : 'KAPALI'} duruma getirildi.`
  })

  return NextResponse.json({ success: true })
}
