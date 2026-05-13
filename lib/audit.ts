import { supabase } from './supabase'

interface AuditOptions {
  islem: string
  tablo: string
  aciklama: string
  okul_id?: any
  kullanici_id?: any
  kayit_id?: any
  basarili?: boolean
  req?: Request  // server-side çağrılar için kabul edilir, kullanılmaz
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

    const { error } = await supabase.from('audit_log').insert({
      okul_id: clean_okul_id,
      kullanici_id: clean_kullanici_id,
      islem,
      tablo,
      kayit_id,
      aciklama,
      basarili
    })

    if (error) {
      console.error(`[Audit Error] ${islem}: ${error.message}`)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    console.error(`[Audit Critical] ${err.message}`)
    return { success: false, error: err.message }
  }
}

export { logAudit as logIslem }
