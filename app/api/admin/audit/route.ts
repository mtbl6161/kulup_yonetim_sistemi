import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
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
  const { data: { user } } = await adminClient().auth.getUser(token)
  if (!user) return null
  const { data: profil } = await adminClient().from('profiller').select('rol').eq('id', user.id).single()
  if (profil?.rol !== 'super_admin') return null
  return user
}

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
  console.log(`[Audit API] ${data?.length || 0} kayıt bulundu ve gönderiliyor.`)
  
  return NextResponse.json({ loglar: data })
}
