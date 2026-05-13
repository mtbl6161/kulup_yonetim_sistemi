import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { serverError } from '@/lib/api-error'

function supabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Aktif en güncel duyuruyu getir
export async function GET() {
  const supabase = supabaseClient()
  
  const { data, error } = await supabase
    .from('duyurular')
    .select('*')
    .eq('aktif', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
    return serverError(error)
  }
  
  return NextResponse.json({ duyuru: data || null })
}
