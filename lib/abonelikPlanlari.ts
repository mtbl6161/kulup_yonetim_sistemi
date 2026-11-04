// Abonelik planlarının tek kaynağı: fiyatlar, Lemon Squeezy ürün (variant) kodları ve paket içeriği.
// Ödeme ekranları, Ayarlar › Abonelik, fiyatlandırma sayfası ve checkout API'si buradan okur.
// Fiyatlar Lemon Squeezy panelindeki variant fiyatlarıyla aynı tutulmalı: ödemede çekilen tutarı orası belirler.

export type AbonelikDonemi = 'month' | 'year'

export const AYLIK_UCRET = 1250
export const YILLIK_UCRET = 12500

/** Ücretsiz deneme süresi (gün). Ödeme gerektirmez; uygulama tarafında verilir. */
export const DENEME_GUN = 15

/** Yıllık planı aylık ödemeyle karşılaştırmak için: 12 × aylık */
export const YILLIK_LISTE_UCRETI = AYLIK_UCRET * 12
export const YILLIK_TASARRUF = Math.max(0, YILLIK_LISTE_UCRETI - YILLIK_UCRET)
/** Yıllık planın aylık karşılığı (yuvarlanmış) */
export const YILLIK_AYLIK_KARSILIGI = Math.round(YILLIK_UCRET / 12)
/** Yıllık plan rozeti: gerçek tasarruf tutarı; tasarruf yoksa boş */
export const YILLIK_INDIRIM_ETIKETI = YILLIK_TASARRUF > 0 ? `₺${tl(YILLIK_TASARRUF)} tasarruf` : ''

export const PLAN_VARIANTLARI: Record<AbonelikDonemi, string> = {
  month: '1588063',
  year: '1588065',
}

/** Sunucu tarafı doğrulama: variant kodundan dönemi bulur (istemcinin söylediği döneme güvenilmez) */
export function variantDonemi(variantId: string): AbonelikDonemi | null {
  const bulunan = (Object.keys(PLAN_VARIANTLARI) as AbonelikDonemi[]).find(d => PLAN_VARIANTLARI[d] === variantId)
  return bulunan ?? null
}

export function planUcreti(donem: AbonelikDonemi) {
  return donem === 'year' ? YILLIK_UCRET : AYLIK_UCRET
}

export const DONEM_ADI: Record<AbonelikDonemi, string> = { month: 'Aylık', year: 'Yıllık' }

/** Ödeme ekranlarında gösterilen kısa özellik listesi (yalnızca sistemde gerçekten olanlar) */
export const PAKET_OZETI = [
  'Sınırsız öğrenci, personel ve sınıf',
  'Sınıf defteri, yoklama ve ders programı',
  'Puantaj, otomatik bordro ve e-posta ile gönderim',
  'Aidat, tahsilat ve gelir–gider takibi',
  'Bilanço, işletme defteri ve denetim dosyası',
]

export function tl(n: number) {
  return n.toLocaleString('tr-TR')
}
