// Dodo Payments webhook kararları (saf fonksiyonlar; route ve testler ortak kullanır).
//
// Dodo webhook'ları sırasız ve tekrarlı gelebilir. Bu yüzden olayın içeriğine göre lisansı
// "bir dönem uzat"mak yerine, aboneliğin Dodo'daki GÜNCEL hâli API'den okunur ve lisans bitişi
// bir sonraki ödeme tarihine (next_billing_date) eşitlenir. Aynı olay iki kez gelse de sonuç değişmez.
//
//   subscription.active   → ilk ödeme alındı (ya da ödeme sorunu çözüldü): lisans next_billing_date'e kadar
//   subscription.renewed  → yenileme ödemesi alındı: next_billing_date bir dönem ileri gider
//   subscription.updated / plan_changed / past_due / cancelled / on_hold / expired → yalnızca eşitleme
// Ödeme çekilemezse next_billing_date ilerlemez; lisans süresi dolunca sistem ödeme sayfasına yönlendirir.

export type DodoWebhookIslemi = { tur: 'esitle' } | { tur: 'yoksay' }

const ESITLENEN = new Set([
  'subscription.active',
  'subscription.renewed',
  'subscription.updated',
  'subscription.plan_changed',
  'subscription.past_due',
  'subscription.on_hold',
  'subscription.cancelled',
  'subscription.expired',
])

export function dodoWebhookIslemi(type: string): DodoWebhookIslemi {
  return ESITLENEN.has(type) ? { tur: 'esitle' } : { tur: 'yoksay' }
}

/** Yenileme ödemesi ile webhook'un ulaşması arasındaki kısa gecikmede erişim kesilmesin diye */
export const YENILEME_TOLERANSI_SAAT = 24

/**
 * Aboneliğin güncel hâline göre yeni lisans bitişi; lisansa dokunulmayacaksa null.
 * Lisans yalnızca ileri alınır: elle uzatılmış ya da daha uzun ödenmiş süre kısaltılmaz.
 */
export function dodoLisansBitisi(
  mevcutBitis: string | null | undefined,
  abonelik: { status: string; next_billing_date: string | null | undefined },
): Date | null {
  // past_due: Dodo'nun tanıdığı ek süre içinde, ödenmiş dönem bitene kadar erişim sürer
  if (abonelik.status !== 'active' && abonelik.status !== 'past_due') return null
  if (!abonelik.next_billing_date) return null
  const sonraki = new Date(abonelik.next_billing_date)
  if (Number.isNaN(sonraki.getTime())) return null
  const hedef = new Date(sonraki.getTime() + YENILEME_TOLERANSI_SAAT * 3600_000)
  const mevcut = mevcutBitis ? new Date(mevcutBitis) : null
  if (mevcut && !Number.isNaN(mevcut.getTime()) && mevcut >= hedef) return null
  return hedef
}

/** Webhook metadata'sındaki okul kimliği (checkout oturumunda biz yazarız) */
export function metadataOkulId(metadata: Record<string, unknown> | null | undefined): number | null {
  const ham = metadata?.okul_id
  const n = typeof ham === 'number' ? ham : typeof ham === 'string' && /^\d+$/.test(ham) ? Number(ham) : NaN
  return Number.isSafeInteger(n) && n > 0 ? n : null
}
