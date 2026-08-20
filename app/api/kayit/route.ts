import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { rateLimit, getIp } from '@/lib/rate-limit'
import { serverError } from '@/lib/api-error'

export async function POST(request: NextRequest) {
  // 10 dakikada 5 kayıt denemesi (IP bazlı)
  const { allowed } = rateLimit(`kayit:${getIp(request)}`, 5, 10 * 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Çok fazla istek. Lütfen bekleyin.' }, { status: 429 })
  }

  const {
    schoolName, token, userId,
    // Kurum profili
    mudurAdi, tel, adres,
    ilId, ilceId,
    // Ücretlendirme
    gunlukSaat, saatUcreti
  } = await request.json()

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let user: { id: string; email?: string } | null = null

  if (token) {
    const { data, error } = await adminClient.auth.getUser(token)
    if (error || !data.user) {
      return NextResponse.json({ error: 'Geçersiz oturum' }, { status: 401 })
    }
    user = data.user
  } else if (userId) {
    const { data, error } = await adminClient.auth.admin.getUserById(userId)
    if (error || !data.user) {
      return NextResponse.json({ error: 'Bu e-posta adresi zaten kayıtlı. Lütfen giriş yapın veya farklı bir e-posta kullanın.' }, { status: 401 })
    }
    // Güvenlik: kullanıcı son 5 dakikada oluşturulmuş olmalı
    const ageSeconds = (Date.now() - new Date(data.user.created_at).getTime()) / 1000
    if (ageSeconds > 300) {
      return NextResponse.json({ error: 'Kayıt süresi doldu. Lütfen tekrar deneyin.' }, { status: 401 })
    }
    user = data.user
  } else {
    return NextResponse.json({ error: 'Kimlik doğrulama bilgisi eksik' }, { status: 401 })
  }

  // Zaten profili varsa tekrar oluşturma
  const { data: existingProfile } = await adminClient
    .from('profiller')
    .select('id')
    .eq('id', user.id)
    .single()

  if (existingProfile) {
    return NextResponse.json({ ok: true })
  }

  // Ücretsiz 7 Günlük Deneme Süresi Hesapla
  const denemeBitis = new Date()
  denemeBitis.setDate(denemeBitis.getDate() + 7)

  // Okul oluştur — 7 gün ücretsiz deneme (deneme statüsü)
  const name = schoolName?.trim() || user.email!.split('@')[0] + ' Okulu'
  const { data: school, error: schoolError } = await adminClient
    .from('okullar')
    .insert({
      ad: name,
      odeme_durumu: 'deneme',
      lisans_bitis: denemeBitis.toISOString(),
      il_id: ilId || null,
      ilce_id: ilceId || null
    })
    .select('id')
    .single()

  if (schoolError) {
    return serverError(schoolError, 'okul-olustur')
  }

  // Profil oluştur
  const { error: profileError } = await adminClient
    .from('profiller')
    .insert({ id: user.id, okul_id: school.id, rol: 'admin' })

  if (profileError) {
    return serverError(profileError, 'profil-olustur')
  }

  // Ayarlar tablosuna kayıt yap (hata olursa sessizce geç — kayıt engellenmemeli)
  if (mudurAdi || saatUcreti) {
    await adminClient.from('ayarlar').insert({
      okul_id:     school.id,
      kurum_adi:   name,
      mudur_adi:   mudurAdi?.trim()  || '',
      tel:         tel?.trim()       || '',
      adres:       adres?.trim()     || '',
      gunluk_saat: gunlukSaat        || 6,
      saat_ucreti: saatUcreti        || 0,
      // Zorunlu varsayılan alanlar
      email:                user.email || '',
      vergi_dairesi:        '',
      vergi_no:             '',
      sgk_no:               '',
      gosterge:             0,
      katsayi:              0,
      yemek:                false,
      // NOT: Oranlar ONDALIK olarak saklanır (hesaplama.ts ve ayarlar sayfası ile uyumlu).
      // Örn: %14 → 0.14, binde 7,59 damga → 0.00759, %15 vergi dilimi → 0.15
      asgari_ucret:         26005.50,
      sgk_kisi_pay:         0.14,
      sgk_issizlik_kisi:    0.01,
      sgk_kisa_vadeli:      0.02,
      sgk_malulluk:         0.02,
      sgk_saglik:           0.075,
      sgk_issizlik_isveren: 0.02,
      damga_vergi_orani:    0.00759,
      vergi_dilimleri:    [
        { "ust": 220000,  "oran": 0.15 },
        { "ust": 480000,  "oran": 0.20 },
        { "ust": 1800000, "oran": 0.27 },
        { "ust": 6000000, "oran": 0.35 },
        { "ust": 99999999, "oran": 0.40 }
      ],
    })
  }

  return NextResponse.json({ ok: true })
}