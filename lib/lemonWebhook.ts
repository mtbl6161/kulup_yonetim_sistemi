// Lemon Squeezy webhook kararları (saf fonksiyonlar; route ve testler ortak kullanır).
//
// Yeni abonelik alındığında Lemon Squeezy şu olayları gönderir:
//   order_created + subscription_created + subscription_payment_success (billing_reason: 'initial')
// Her yenilemede: subscription_payment_success (billing_reason: 'renewal') + subscription_updated
// Lisans yalnızca subscription_payment_success ile uzatılır; böylece her ödeme tam bir kez sayılır.
// order_created'ta abonelik kimliği yoktur, lisansa dokunmaz.

import type { AbonelikDonemi } from './abonelikPlanlari'

export type WebhookIslemi =
  | { tur: 'uzat' }        // ödeme alındı → lisansı bir dönem uzat
  | { tur: 'eslestir' }    // abonelik oluştu → okulla abonelik/müşteri kimliğini eşleştir (süreye dokunmaz)
  | { tur: 'yoksay' }

export function webhookIslemi(eventName: string): WebhookIslemi {
  if (eventName === 'subscription_payment_success') return { tur: 'uzat' }
  if (eventName === 'subscription_created') return { tur: 'eslestir' }
  return { tur: 'yoksay' }
}

export function gecerliDonem(d: unknown): AbonelikDonemi | null {
  return d === 'month' || d === 'year' ? d : null
}

/** Yeni lisans bitişi: mevcut bitiş gelecekteyse onun üzerine, değilse bugünden itibaren bir dönem */
export function yeniLisansBitisi(mevcutBitis: string | null | undefined, donem: AbonelikDonemi, simdi = new Date()): Date {
  const mevcut = mevcutBitis ? new Date(mevcutBitis) : null
  const baslangic = mevcut && mevcut > simdi ? mevcut : simdi
  const bitis = new Date(baslangic)
  if (donem === 'month') bitis.setMonth(bitis.getMonth() + 1)
  else bitis.setFullYear(bitis.getFullYear() + 1)
  return bitis
}
