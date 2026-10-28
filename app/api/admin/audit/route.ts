import { adminClient, getCallerIfSuperAdmin } from '@/lib/apiAuth'
import { NextResponse, type NextRequest } from 'next/server'
import { serverError } from '@/lib/api-error'

// Denetim izleri: kurum, işlem, bölüm ve açıklama metnine göre süzülür; sayfa sayfa döner.
export async function GET(request: NextRequest) {
  const caller = await getCallerIfSuperAdmin(request)
  if (!caller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const okulId = searchParams.get('okul_id')
  const islem = searchParams.get('islem')
  const tablo = searchParams.get('tablo')
  const ara = (searchParams.get('q') || '').trim().slice(0, 100)
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50') || 50, 1), 500)
  const sayfa = Math.max(parseInt(searchParams.get('sayfa') || '1') || 1, 1)
  const bas = (sayfa - 1) * limit

  let query = adminClient()
    .from('audit_log')
    .select('*, okullar(ad)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(bas, bas + limit - 1)

  if (okulId) query = query.eq('okul_id', parseInt(okulId))
  if (islem) query = query.eq('islem', islem)
  if (tablo) query = query.eq('tablo', tablo)
  // PostgREST ilike deseninde % ve _ joker; kullanıcı metnindekileri kaçır
  if (ara) query = query.ilike('aciklama', `%${ara.replace(/[%_\\]/g, m => '\\' + m)}%`)

  const { data, error, count } = await query
  if (error) return serverError(error)

  return NextResponse.json({ loglar: data, toplam: count ?? 0, sayfa, limit })
}
