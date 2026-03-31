// ============================================================
// MEB Çocuk Kulüpleri Yönergesi - İş Mantığı Hesaplamaları
// ============================================================
import { Ayarlar, BordroSonuc, VergiDilimi } from './types'

export const AYLAR = [
  '', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

export const GUNLER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma']

export const RESMI_TATILLER: string[] = [
  '01-01', '04-23', '05-01', '05-19', '07-15', '08-30', '10-29',
]

// ============================================================
// Tarih yardımcıları
// ============================================================

/** Ayın toplam gün sayısı */
export function gunSayisi(yil: number, ay: number): number {
  return new Date(yil, ay, 0).getDate()
}

/** Verilen tarih hafta içi mi? */
export function haftaIciMi(yil: number, ay: number, gun: number): boolean {
  const d = new Date(yil, ay - 1, gun)
  return d.getDay() !== 0 && d.getDay() !== 6
}

/** Resmi tatil mi? */
export function tatilMi(ay: number, gun: number): boolean {
  const str = `${String(ay).padStart(2, '0')}-${String(gun).padStart(2, '0')}`
  return RESMI_TATILLER.includes(str)
}

/** Aydaki iş günü sayısı (haftasonu + tatil hariç) */
export function isGunuSayisi(yil: number, ay: number): number {
  const toplam = gunSayisi(yil, ay)
  let sayac = 0
  for (let g = 1; g <= toplam; g++) {
    if (haftaIciMi(yil, ay, g) && !tatilMi(ay, g)) sayac++
  }
  return sayac
}

// ============================================================
// Saat ücreti hesaplama (MEB Yönergesi)
// Saat ücreti = Gösterge(140) × Katsayı / bölen
// Bölen: min=6, max=4, yemekli max=3
// ============================================================
export function saatUcretiHesapla(
  gosterge: number,
  katsayi: number,
  yemek: boolean,
  tip: 'min' | 'max' = 'max'
): number {
  const bolen = yemek ? 3 : tip === 'min' ? 6 : 4
  return (gosterge * katsayi) / bolen
}

// ============================================================
// Öğrenci aylık ücreti
// ============================================================
export function ogrenciUcretiHesapla(
  ayarlar: Ayarlar,
  yil: number,
  ay: number,
  kardesIndirimi: boolean
): number {
  const isGunu = isGunuSayisi(yil, ay)
  let ucret = isGunu * ayarlar.gunluk_saat * ayarlar.saat_ucreti
  if (kardesIndirimi) ucret *= 0.5 // %50 kardeş indirimi
  return Math.round(ucret * 100) / 100
}

// ============================================================
// Gelir vergisi dilimi bulma
// ============================================================
export function gvDilimiBul(matrah: number, dilimler: VergiDilimi[]): number {
  for (const d of dilimler) {
    if (matrah <= d.ust) return d.oran
  }
  return 0.40
}

// ============================================================
// Gelir vergisi hesaplama (kümülatif dilimli)
// ============================================================
export function gelirVergisiHesapla(
  matrah: number,
  dilimler: VergiDilimi[]
): { oran: number; tutar: number } {
  let vergi = 0
  let prev = 0
  let son_oran = 0
  for (const d of dilimler) {
    if (matrah <= prev) break
    const dilimIci = Math.min(matrah, d.ust) - prev
    if (dilimIci <= 0) { prev = d.ust; continue }
    vergi += dilimIci * d.oran
    son_oran = d.oran
    prev = d.ust
    if (matrah <= d.ust) break
  }
  return { oran: son_oran, tutar: Math.round(vergi * 100) / 100 }
}

// ============================================================
// Bordro hesaplama (tek kişi)
// ============================================================
export function bordroHesapla(
  ayarlar: Ayarlar,
  toplamSaat: number,
  yillikMatrah: number,
  sgkLi: boolean
): BordroSonuc {
  const brut = Math.round(toplamSaat * ayarlar.saat_ucreti * 100) / 100

  // SGK kesintileri (sadece SGK'lı personel)
  const sgk_kisi = sgkLi
    ? Math.round(brut * ayarlar.sgk_kisi_pay * 100) / 100
    : 0
  const sgk_issizlik = sgkLi
    ? Math.round(brut * ayarlar.sgk_issizlik_kisi * 100) / 100
    : 0

  // GV matrahı = Brüt - SGK kişi payları
  const gv_matrah = brut - sgk_kisi - sgk_issizlik

  // Gelir vergisi (kümülatif: yılbaşından bu aya kadarki matrah)
  const gv_result = gelirVergisiHesapla(
    gv_matrah + (yillikMatrah || 0),
    ayarlar.vergi_dilimleri
  )
  const gv_oran = gvDilimiBul(gv_matrah + (yillikMatrah || 0), ayarlar.vergi_dilimleri)
  const gv = Math.round(gv_matrah * gv_oran * 100) / 100

  // Damga vergisi
  const dv = Math.round(gv_matrah * ayarlar.damga_vergi_orani * 100) / 100

  // SGK işveren payı
  const sgk_isveren = sgkLi
    ? Math.round(
        brut *
          (ayarlar.sgk_kisa_vadeli +
            ayarlar.sgk_malulluk +
            ayarlar.sgk_saglik +
            ayarlar.sgk_issizlik_isveren) *
          100
      ) / 100
    : 0

  const toplam_kesinti = gv + dv + sgk_kisi + sgk_issizlik
  const net = Math.round((brut - toplam_kesinti) * 100) / 100

  return {
    brut,
    sgk_kisi,
    sgk_issizlik,
    gv_matrah,
    gv_oran,
    gv,
    dv,
    toplam_kesinti,
    net,
    sgk_isveren,
  }
}

// ============================================================
// Tahakkuk dağılımı
// ============================================================
export interface TahakkukHesap {
  toplam: number
  temel_gider: number
  ogretmen_havuzu: number
  baskan: number
  baskan_yrd: number
  muhasebe: number
  temizlik: number
  denetim: number
}

export function tahakkukDagitimHesapla(
  toplamGelir: number,
  ayarlar: Ayarlar
): TahakkukHesap {
  const pct = (oran: number | undefined) =>
    Math.round((toplamGelir * (oran ?? 0)) / 100 * 100) / 100

  return {
    toplam: toplamGelir,
    temel_gider: pct(ayarlar.dagitim_temel_gider),
    ogretmen_havuzu: pct(ayarlar.dagitim_ogretmen),
    baskan: pct(ayarlar.dagitim_baskan),
    baskan_yrd: pct(ayarlar.dagitim_baskan_yrd),
    muhasebe: pct(ayarlar.dagitim_muhasebe),
    temizlik: pct(ayarlar.dagitim_temizlik),
    denetim: pct(ayarlar.dagitim_denetim),
  }
}

// ============================================================
// Formatlama yardımcıları
// ============================================================

export function fmtTL(n: number | null | undefined): string {
  if (n == null) return '₺0,00'
  return '₺' + Number(n).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function fmt(n: number | null | undefined): string {
  if (n == null) return '0,00'
  return Number(n).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function fmtSaat(n: number | null | undefined): string {
  if (n == null) return '0'
  return Number(n).toLocaleString('tr-TR', { maximumFractionDigits: 1 })
}

export function ayLabel(ay: number, yil: number): string {
  return `${AYLAR[ay]} ${yil}`
}

export function tarihFmt(tarih: string): string {
  if (!tarih) return '-'
  const d = new Date(tarih)
  return d.toLocaleDateString('tr-TR')
}
