// Ayarlar › Abonelik ekranının ödeme sağlayıcısından bağımsız abonelik özeti.
// Sunucu (app/api/abonelik/bilgi) Dodo Payments ya da eski Lemon Squeezy verisini bu biçime çevirir.

import type { AbonelikDonemi } from './abonelikPlanlari'

/**
 * active     → yenileniyor (iptal edildiyse dönem sonuna kadar kullanılır, iptalEdildi = true)
 * past_due   → son ödeme çekilemedi, kart güncellenmeli
 * paused     → duraklatıldı
 * cancelled  → iptal edildi, dönem sonuna kadar erişim sürer (Lemon Squeezy)
 * expired    → sona erdi; yeni abonelik gerekir
 */
export type AbonelikDurumu = 'active' | 'on_trial' | 'past_due' | 'unpaid' | 'paused' | 'cancelled' | 'expired'

export type FaturaDurumu = 'paid' | 'pending' | 'void' | 'refunded' | 'partial_refund'

export interface AbonelikBilgisi {
  saglayici: 'dodo' | 'lemonsqueezy' | null
  durum: AbonelikDurumu | null
  iptalEdildi: boolean
  donem: AbonelikDonemi | null
  yenilenme: string | null        // sonraki ödeme tarihi
  bitis: string | null            // iptal edildiyse erişimin bittiği tarih
  kartMarka: string | null
  kartSon4: string | null
  portalUrl: string | null        // müşteri portalı (fatura, kart, plan, iptal); ~24 saat geçerli
  kartGuncelleUrl: string | null
  faturalar: { id: string; tarih: string; tutar: string; durum: FaturaDurumu; url: string | null }[]
}

export function bosAbonelikBilgisi(): AbonelikBilgisi {
  return {
    saglayici: null, durum: null, iptalEdildi: false, donem: null, yenilenme: null, bitis: null,
    kartMarka: null, kartSon4: null, portalUrl: null, kartGuncelleUrl: null, faturalar: [],
  }
}
