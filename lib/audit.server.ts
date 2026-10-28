import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { hataMesaji } from '@/lib/hata'

interface AuditOptions {
  islem: string
  tablo: string
  aciklama: string
  okul_id?: number | string | null
  kullanici_id?: string | null
  kayit_id?: number | string | null
  basarili?: boolean
  req?: Request
}

function serverClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function logAudit({
  islem,
  tablo,
  aciklama,
  okul_id = null,
  kullanici_id = null,
  kayit_id = null,
  basarili = true,
}: AuditOptions) {
  try {
    const clean_okul_id = (okul_id && okul_id !== '') ? parseInt(okul_id.toString()) : null
    const clean_kullanici_id = (kullanici_id && kullanici_id !== '') ? kullanici_id : null

    const { error } = await serverClient().from('audit_log').insert({
      okul_id: clean_okul_id,
      kullanici_id: clean_kullanici_id,
      islem,
      tablo,
      kayit_id,
      aciklama,
      basarili,
    })

    if (error) {
      console.error(`[Audit Error] ${islem}: ${error.message}`)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error(`[Audit Critical] ${hataMesaji(err)}`)
    return { success: false, error: hataMesaji(err) }
  }
}

export { logAudit as logIslem }
