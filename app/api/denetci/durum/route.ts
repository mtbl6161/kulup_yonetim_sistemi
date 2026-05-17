import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ status: 'yok' })

    const admin = adminClient()

    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ status: 'yok' })

    // Kullanıcının okul ve il bilgisini al
    const { data: profil } = await admin
      .from('profiller')
      .select('okul_id, il_id')
      .eq('id', user.id)
      .single()

    if (!profil?.okul_id) return NextResponse.json({ status: 'yok' })

    // il_id: profil → okullar tablosu fallback
    let ilId: number | null = profil.il_id ?? null
    if (!ilId) {
      const { data: okul } = await admin
        .from('okullar')
        .select('il_id')
        .eq('id', profil.okul_id)
        .single()
      ilId = okul?.il_id ?? null
    }

    // 1. il_id biliniyorsa ilde aktif denetçi var mı? (service_role → RLS bypass)
    if (ilId) {
      const { data: denetci } = await admin
        .from('profiller')
        .select('id')
        .eq('rol', 'denetim_yetkilisi')
        .eq('il_id', ilId)
        .limit(1)
        .maybeSingle()

      if (denetci) return NextResponse.json({ status: 'aktif' })
    }

    // 2. Bu okulun taleplerine bak
    const { data: talepler } = await admin
      .from('denetci_talepleri')
      .select('id, status')
      .eq('okul_id', profil.okul_id)
      .order('created_at', { ascending: false })
      .limit(1)

    const sonTalep = talepler?.[0]

    if (!sonTalep) return NextResponse.json({ status: 'yok' })

    if (sonTalep.status === 'onaylandi') return NextResponse.json({ status: 'aktif' })
    if (sonTalep.status === 'beklemede') return NextResponse.json({ status: 'beklemede' })

    return NextResponse.json({ status: 'yok' })
  } catch (err) {
    console.error('[denetci/durum]', err)
    return NextResponse.json({ status: 'yok' })
  }
}
