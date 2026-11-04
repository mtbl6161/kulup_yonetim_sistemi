'use client'
import { supabase } from '@/lib/supabase'
import { PLAN_VARIANTLARI, type AbonelikDonemi } from '@/lib/abonelikPlanlari'

/** Lemon Squeezy ödeme sayfası bağlantısı üretir ve tarayıcıyı oraya yönlendirir. Hata olursa fırlatır. */
export async function odemeyeYonlendir(okulId: number, donem: AbonelikDonemi) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/lemonsqueezy/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
    body: JSON.stringify({ okulId, variantId: PLAN_VARIANTLARI[donem], interval: donem }),
  })
  const data = await res.json().catch(() => ({}))
  if (!data.url) throw new Error(data.error || 'Ödeme bağlantısı oluşturulamadı')
  window.location.href = data.url
}
