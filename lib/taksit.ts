// ============================================================
// Tahsilat Takip — öğrenci bazlı taksit yardımcıları
// Plan: tahsilat_taksit_planlari (öğrenci × kategori × dönem)
// Ödenen taksit: tahsilat_kayitlari.donem = '<dönem>/T<n>'  (ör. '2026-D1/T2', '-/T1')
// ============================================================
import type { TahsilatKategori } from './types'

export const MAX_TAKSIT = 12

/** Kategoride öğrenciye taksit açılabilir mi? Aylık ve kulüp aidatı (otomatik) kategoriler hariç. */
export const taksitAcilabilir = (k: TahsilatKategori | null | undefined) =>
  !!k && k.veri_kaynagi === 'manuel' && k.tip !== 'aylik'

export const taksitKey = (donemKey: string, no: number) => `${donemKey}/T${no}`

/** '2026-D1/T2' → { donem: '2026-D1', no: 2 } ; taksit anahtarı değilse null */
export function taksitCoz(key: string): { donem: string; no: number } | null {
  const m = /^(.*)\/T(\d+)$/.exec(key)
  return m ? { donem: m[1], no: Number(m[2]) } : null
}

/** Kayıt anahtarının ait olduğu dönem ('2026-D1/T2' → '2026-D1') */
export const anaDonem = (key: string) => taksitCoz(key)?.donem ?? key

const r2 = (n: number) => Math.round(n * 100) / 100

/** Toplamı eşit taksitlere böler — küsurat son taksitte toplanır */
export function esitBol(toplam: number, adet: number): number[] {
  const pay = r2(toplam / adet)
  return Array.from({ length: adet }, (_, i) => (i < adet - 1 ? pay : r2(toplam - pay * (adet - 1))))
}

/** İlk vadeden başlayarak her ay aynı güne vade üretir (ayın son gününü aşmaz) */
export function aylikVadeler(ilkISO: string, adet: number): string[] {
  const [y, m, d] = ilkISO.split('-').map(Number)
  return Array.from({ length: adet }, (_, i) => {
    const ay0 = m - 1 + i
    const yil = y + Math.floor(ay0 / 12)
    const ay = (ay0 % 12) + 1
    const gun = Math.min(d, new Date(yil, ay, 0).getDate())
    return `${yil}-${String(ay).padStart(2, '0')}-${String(gun).padStart(2, '0')}`
  })
}

export function fmtVade(iso: string | null | undefined): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}
