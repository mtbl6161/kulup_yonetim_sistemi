import { adminClient, getCallerIfSuperAdmin } from '@/lib/apiAuth'
import { NextResponse, type NextRequest } from 'next/server'
import { serverError } from '@/lib/api-error'

// İl listesi + her ilin okulları
export async function GET(request: NextRequest) {
  const caller = await getCallerIfSuperAdmin(request)
  if (!caller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const admin = adminClient()

  const { data: iller, error } = await admin
    .from('iller')
    .select('id, ad, okullar(id, ad, il_id, odeme_durumu, lisans_bitis)')
    .order('ad')

  if (error) return serverError(error)

  return NextResponse.json({ iller })
}

// Yeni il ekle
export async function POST(request: NextRequest) {
  const caller = await getCallerIfSuperAdmin(request)
  if (!caller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { ad } = await request.json()
  if (!ad?.trim()) return NextResponse.json({ error: 'İl adı zorunludur' }, { status: 400 })

  const { data, error } = await adminClient()
    .from('iller')
    .insert({ ad: ad.trim() })
    .select('id, ad')
    .single()

  if (error) return serverError(error)
  return NextResponse.json({ il: data })
}

// Okula il ata (PATCH)
export async function PATCH(request: NextRequest) {
  const caller = await getCallerIfSuperAdmin(request)
  if (!caller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { okul_id, il_id } = await request.json()
  if (!okul_id) return NextResponse.json({ error: 'okul_id zorunludur' }, { status: 400 })

  const { error } = await adminClient()
    .from('okullar')
    .update({ il_id: il_id ?? null })
    .eq('id', okul_id)

  if (error) return serverError(error)
  return NextResponse.json({ ok: true })
}
