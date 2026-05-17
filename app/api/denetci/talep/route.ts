import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const { data: profil } = await supabase
      .from('profiller')
      .select('okul_id')
      .eq('id', user.id)
      .single()

    if (!profil?.okul_id) return NextResponse.json({ error: 'Okul bulunamadı' }, { status: 404 })

    const { data: talepler, error } = await supabase
      .from('denetci_talepleri')
      .select('*')
      .eq('okul_id', profil.okul_id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ talepler })
  } catch (err) {
    console.error('[denetci/talep GET]', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

    const { ad_soyad, email, telefon, notlar, il_id: ilIdFromForm } = await request.json()

    const { data: profil } = await supabase
      .from('profiller')
      .select('okul_id, il_id')
      .eq('id', user.id)
      .single()

    if (!profil?.okul_id) return NextResponse.json({ error: 'Okul bilgisi eksik' }, { status: 400 })

    let ilId: number | null = ilIdFromForm ?? profil.il_id ?? null

    if (!ilId) {
      const { data: okul } = await supabase
        .from('okullar')
        .select('il_id')
        .eq('id', profil.okul_id)
        .single()
      ilId = okul?.il_id ?? null
    }

    if (!ilId) {
      return NextResponse.json(
        { error: 'İl bilgisi bulunamadı. Lütfen talep formunda ilinizi seçin.' },
        { status: 400 }
      )
    }

    const { data: mevcutTalep } = await supabase
      .from('denetci_talepleri')
      .select('id, status')
      .eq('okul_id', profil.okul_id)
      .eq('status', 'beklemede')
      .maybeSingle()

    if (mevcutTalep) {
      return NextResponse.json(
        { error: 'Bu okul için zaten bekleyen bir talep mevcut.' },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('denetci_talepleri')
      .insert({ okul_id: profil.okul_id, il_id: ilId, ad_soyad, email, telefon, notlar, status: 'beklemede' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[denetci/talep POST]', err)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
