import { adminClient, getCallerIfSuperAdmin } from '@/lib/apiAuth'
import { NextResponse, type NextRequest } from 'next/server'
import { serverError } from '@/lib/api-error'

export async function GET(request: NextRequest) {
  const caller = await getCallerIfSuperAdmin(request)
  if (!caller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const okulId = searchParams.get('okul_id')
  const limit = parseInt(searchParams.get('limit') || '200')

  let query = adminClient()
    .from('audit_log')
    .select('*, okullar(ad)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (okulId) query = query.eq('okul_id', parseInt(okulId))

  const { data, error } = await query
  if (error) return serverError(error)
  
  // SUNUCU KONSOLU İÇİN (Hata tespiti)
  
  return NextResponse.json({ loglar: data })
}
