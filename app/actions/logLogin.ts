'use server'
import { createClient } from '@supabase/supabase-js'

export async function logLoginAttempt(params: {
  email: string
  basarili: boolean
  userId?: string
}) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Başarılı girişte kullanıcının okul_id'sini bul
    let okul_id: number | null = null
    if (params.userId) {
      const { data } = await supabase
        .from('profiller')
        .select('okul_id')
        .eq('id', params.userId)
        .single()
      okul_id = data?.okul_id ?? null
    }

    await supabase.from('audit_log').insert({
      okul_id,
      kullanici_id: params.userId ?? null,
      islem: 'login',
      tablo: 'auth',
      aciklama: params.basarili
        ? `${params.email} girişi başarılı.`
        : `${params.email} hatalı giriş denemesi.`,
      basarili: params.basarili,
    })
  } catch (err) {
    // Audit log hatası kullanıcıyı etkilememeli, ancak hata olduğunu bilelim
    console.error('CRITICAL LOGIN AUDIT ERROR:', err)
    return { success: false }
  }
}
