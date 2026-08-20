// ============================================================
// MEB Çocuk Kulüpleri Yönergesi - İş Mantığı Hesaplamaları
// ============================================================
import { Ayarlar, BordroSonuc, VergiDilimi } from './types'

export const AYLAR = [
  '', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

export const GUNLER = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma']

export const RESMI_TATILLER = [
  '01-01', '04-23', '05-01', '05-19', '07-15', '08-30', '10-29'
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

/**
 * Tarih bir tatil aralığında mı?
 * @param yil Yıl
 * @param ay Ay (1-12)
 * @param gun Gün
 * @param customTatiller Veritabanından gelen özel tatil listesi
 */
export function tatilMi(ay: number, gun: number, yil?: number, customTatiller?: any[]): boolean {
  // 1. Sabit resmi tatil kontrolü (ay-gün bazlı)
  const str = `${String(ay).padStart(2, '0')}-${String(gun).padStart(2, '0')}`
  if (RESMI_TATILLER.includes(str)) return true

  // 2. Dinamik tatil kontrolü (veritabanı aralıkları bazlı)
  if (yil && customTatiller && customTatiller.length > 0) {
    const d = new Date(yil, ay - 1, gun, 12, 0, 0)
    for (const t of customTatiller) {
      // "2026-05-26" formatını UTC değil yerel saat olarak parse et
      const [basY, basM, basD] = (t.baslangic_tarihi as string).split('T')[0].split('-').map(Number)
      const [bitY, bitM, bitD] = (t.bitis_tarihi as string).split('T')[0].split('-').map(Number)
      const bas = new Date(basY, basM - 1, basD, 0, 0, 0)
      const bit = new Date(bitY, bitM - 1, bitD, 23, 59, 59, 999)
      if (d >= bas && d <= bit) return true
    }
  }

  return false
}

/** Aydaki iş günü sayısı (haftasonu + tatil hariç) */
export function isGunuSayisi(yil: number, ay: number, customTatiller?: any[]): number {
  const toplam = gunSayisi(yil, ay)
  let sayac = 0
  for (let g = 1; g <= toplam; g++) {
    if (haftaIciMi(yil, ay, g) && !tatilMi(ay, g, yil, customTatiller)) sayac++
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
  kardesIndirimi: boolean,
  customTatiller?: any[],
  toplamSaatOverride?: number
): number {
  if (toplamSaatOverride != null && toplamSaatOverride > 0) {
    // Eğer özel bir TOPLAM SAAT girilmişse, iş günüyle çarpmadan direkt hesapla
    let ucret = toplamSaatOverride * ayarlar.saat_ucreti
    if (kardesIndirimi) ucret *= 0.75
    return ucret
  }

  const isGunu = isGunuSayisi(yil, ay, customTatiller)
  let ucret = isGunu * ayarlar.gunluk_saat * ayarlar.saat_ucreti
  if (kardesIndirimi) ucret *= 0.75 // %25 kardeş indirimi
  return ucret
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
  return { oran: son_oran, tutar: Math.round(vergi * 100 + 1e-9) / 100 }
}

// ============================================================
// Görev Tavan Yüzdeleri (MEB Yönergesi — En Yüksek Devlet Memuru Brüt Aylığının %'si)
// ============================================================
export function gorevTavanYuzdesi(gorev: string): number {
  const g = (gorev || '').toLowerCase()
  if (g.includes('koordinatör') || g.includes('koordinator')) return 275
  if (g.includes('usta')) return 400
  if (g.includes('öğretmen') || g.includes('ogretmen')) return 300
  if ((g.includes('başkan') || g.includes('baskan')) && !g.includes('yardımcı') && !g.includes('yardimci')) return 275
  if (g.includes('yardımcı') || g.includes('yardimci')) return 250
  if (g.includes('muhasebe') || g.includes('memur')) return 80
  if (g.includes('temizlik') || g.includes('hizmet') || g.includes('bakım')) return 80
  if (g.includes('denetim')) return 275
  return 300
}

export function tavanHesapla(gorev: string, tavanKatsayi: number): number {
  return Math.round(tavanKatsayi * gorevTavanYuzdesi(gorev) / 100 * 100 + 1e-9) / 100
}

// ============================================================
// Bordro hesaplama (tek kişi)
// gorev : rol adı (tavan uygulaması için)
// havuzBrut: havuzdan hesaplanan brüt (verilmezse saat × ücret kullanılır)
// ============================================================
export function bordroHesapla(
  ayarlar: Ayarlar,
  toplamSaat: number,
  yillikMatrah: number,
  sgkLi: boolean,
  isRetired: boolean, // New parameter
  gorev?: string,
  havuzBrut?: number,
  vergiIstisnasi?: boolean
): BordroSonuc {
  const br0 = havuzBrut !== undefined ? havuzBrut : toplamSaat * ayarlar.saat_ucreti
  let brut = Math.round(br0 * 100 + 1e-9) / 100

  // Tavan uygulaması
  if (gorev && ayarlar.tavan_katsayi) {
    const tavan = tavanHesapla(gorev, ayarlar.tavan_katsayi)
    brut = Math.min(brut, tavan)
  }

  // SGK kesintileri
  let sgk_kisi = 0
  let sgk_issizlik = 0

  if (sgkLi) {
    if (isRetired) {
      // Emekli çalışan için sadece %7.5 SGDP kesilir, işsizlik kesilmez
      sgk_kisi = Math.round(brut * 0.075 * 100 + 1e-9) / 100
      sgk_issizlik = 0
    } else {
      sgk_kisi = Math.round(brut * (ayarlar.sgk_kisi_pay || 0.14) * 100 + 1e-9) / 100
      sgk_issizlik = Math.round(brut * (ayarlar.sgk_issizlik_kisi || 0.01) * 100 + 1e-9) / 100
    }
  }

  // GV matrahı = Brüt - SGK kişi payları
  const gv_matrah = Math.round((brut - sgk_kisi - sgk_issizlik) * 100 + 1e-9) / 100

  // Gelir vergisi — Kümülatif fark yöntemi (Kademeli & Vergi mevzuatı uyumlu):
  // Bu aya atfedilen GV = GV(yılbaşı + bu ay) − GV(yılbaşı)
  // Bu sayede dilim sınırı bu ayda aşılsa bile sadece aşan kısım üst dilimden vergilenir.
  const dilimler = ayarlar.vergi_dilimleri || []
  
  const gvOnceki = gelirVergisiHesapla(yillikMatrah || 0, dilimler)
  const gvYeniToplam = gelirVergisiHesapla((yillikMatrah || 0) + gv_matrah, dilimler)
  
  const gv_hesaplanan = Math.round((gvYeniToplam.tutar - gvOnceki.tutar) * 100 + 1e-9) / 100
  const gv_oran = gvYeniToplam.oran // Nihai ulaşılan en üst vergi oranı
  let gv_istisna = 0

  // Damga vergisi (Brüt üzerinden - Excel ile uyumlu)
  const dv_hesaplanan = Math.round(brut * ayarlar.damga_vergi_orani * 100 + 1e-9) / 100
  let dv_istisna = 0

  // Asgari Ücret Vergi İstisnası (İndirimi)
  if (vergiIstisnasi) {
    // GV İstisnası
    if (ayarlar.gv_istisna_sabiti && ayarlar.gv_istisna_sabiti > 0) {
      gv_istisna = ayarlar.gv_istisna_sabiti
    } else if (ayarlar.asgari_ucret) {
      const asgariMatrah = ayarlar.asgari_ucret * (1 - (ayarlar.sgk_kisi_pay || 0.14) - (ayarlar.sgk_issizlik_kisi || 0.01))
      gv_istisna = Math.round(asgariMatrah * 0.15 * 100 + 1e-9) / 100
    }
    // İstisna, hesaplanan vergiyi aşamaz
    gv_istisna = Math.round(Math.min(gv_hesaplanan, gv_istisna) * 100 + 1e-9) / 100

    // DV İstisnası
    if (ayarlar.dv_istisna_sabiti && ayarlar.dv_istisna_sabiti > 0) {
      dv_istisna = ayarlar.dv_istisna_sabiti
    } else if (ayarlar.asgari_ucret) {
      dv_istisna = Math.round(ayarlar.asgari_ucret * ayarlar.damga_vergi_orani * 100 + 1e-9) / 100
    }
    dv_istisna = Math.round(Math.min(dv_hesaplanan, dv_istisna) * 100 + 1e-9) / 100
  }

  const gv = Math.round((gv_hesaplanan - gv_istisna) * 100 + 1e-9) / 100
  const dv = Math.round((dv_hesaplanan - dv_istisna) * 100 + 1e-9) / 100

  // SGK işveren payı
  let sgk_isveren = 0
  let sgk_detay_kisa = 0
  let sgk_detay_malulluk = 0
  let sgk_detay_saglik = 0
  let sgk_detay_issizlik = 0

  if (sgkLi) {
    if (isRetired) {
      // Emekli (SGDP) İşveren Payı: %22.5 SGDP + %2 Kısa Vadeli = %24.5
      sgk_detay_kisa = Math.round(brut * 0.02 * 100 + 1e-9) / 100
      sgk_detay_malulluk = Math.round(brut * 0.225 * 100 + 1e-9) / 100
      sgk_detay_saglik = 0
      sgk_detay_issizlik = 0
      sgk_isveren = Math.round((sgk_detay_kisa + sgk_detay_malulluk) * 100 + 1e-9) / 100
    } else {
      sgk_detay_kisa = Math.round(brut * (ayarlar.sgk_kisa_vadeli || 0.0225) * 100 + 1e-9) / 100
      sgk_detay_malulluk = Math.round(brut * (ayarlar.sgk_malulluk || 0.20) * 100 + 1e-9) / 100
      sgk_detay_saglik = Math.round(brut * (ayarlar.sgk_saglik || 0.125) * 100 + 1e-9) / 100
      sgk_detay_issizlik = Math.round(brut * (ayarlar.sgk_issizlik_isveren || 0.03) * 100 + 1e-9) / 100
      sgk_isveren = Math.round((sgk_detay_kisa + sgk_detay_malulluk + sgk_detay_saglik + sgk_detay_issizlik) * 100 + 1e-9) / 100
    }
  }

  const toplam_kesinti = Math.round((gv + dv + sgk_kisi + sgk_issizlik) * 100 + 1e-9) / 100
  const net = Math.round((brut - toplam_kesinti) * 100 + 1e-9) / 100

  const res: BordroSonuc = {
    brut,
    sgk_kisi,
    sgk_issizlik,
    gv_matrah,
    gv_oran,
    gv_hesaplanan,
    gv_istisna,
    gv,
    dv_hesaplanan,
    dv_istisna,
    dv,
    toplam_kesinti,
    net,
    sgk_isveren,
    sgk_detay_kisa,
    sgk_detay_malulluk,
    sgk_detay_saglik,
    sgk_detay_issizlik,
    sgk_detay_toplam: 0,
  }

  res.sgk_detay_toplam = Math.round((res.sgk_detay_kisa + res.sgk_detay_malulluk + res.sgk_detay_saglik + res.sgk_detay_issizlik) * 100 + 1e-9) / 100

  return res
}

// ============================================================
// Tahakkuk dağılımı
// ============================================================
export function isOgretmen(gorev: string | null | undefined): boolean {
  const g = (gorev || '').toLowerCase()
  return g.includes('öğretmen') || g.includes('ogretmen') || g.includes('usta')
}
export function isBaskan(gorev: string | null | undefined): boolean {
  const g = (gorev || '').toLowerCase()
  return (g.includes('başkan') || g.includes('baskan') || g.includes('müdür')) &&
    !g.includes('yardımcı') && !g.includes('yardimci') && !g.includes('yrd')
}
export function isBaskanYrd(gorev: string | null | undefined): boolean {
  const g = (gorev || '').toLowerCase()
  return g.includes('yardımcı') || g.includes('yardimci') || g.includes('yrd')
}
export function isMuhasebe(gorev: string | null | undefined): boolean {
  const g = (gorev || '').toLowerCase()
  return g.includes('muhasebe') || g.includes('memur') || g.includes('yazışma')
}
export function isTemizlik(gorev: string | null | undefined): boolean {
  const g = (gorev || '').toLowerCase()
  return g.includes('temizlik') || g.includes('hizmet') || g.includes('bakım')
}
export function isDenetim(gorev: string | null | undefined): boolean {
  return (gorev || '').toLowerCase().includes('denetim')
}

export interface ActiveCategories {
  baskan: boolean
  baskan_yrd: boolean
  muhasebe: boolean
  temizlik: boolean
  denetim: boolean
}

export function detectActiveCategories(
  personelList: any[],
  puantajList: any[],
  bordroList: any[]
): ActiveCategories {
  const hasWorked = (p: any) => {
    // If they have a saved bordro, they worked.
    const hasSavedBordro = bordroList.some(b => b.personel_id === p.id)
    if (hasSavedBordro) return true

    // If they are active:
    if (p.aktif !== false) {
      if (isBaskan(p.gorev) || isBaskanYrd(p.gorev) || isMuhasebe(p.gorev) || isTemizlik(p.gorev) || isDenetim(p.gorev)) {
        return true
      }
      // Teachers must have puantaj hours > 0
      const hasPuantaj = puantajList.some(pu => pu.personel_id === p.id && Number(pu.saat) > 0)
      return hasPuantaj
    }

    // If they are inactive but have puantaj:
    const hasPuantaj = puantajList.some(pu => pu.personel_id === p.id && Number(pu.saat) > 0)
    if (hasPuantaj) return true

    return false
  }

  return {
    baskan: personelList.some(p => isBaskan(p.gorev) && hasWorked(p)),
    baskan_yrd: personelList.some(p => isBaskanYrd(p.gorev) && hasWorked(p)),
    muhasebe: personelList.some(p => isMuhasebe(p.gorev) && hasWorked(p)),
    temizlik: personelList.some(p => isTemizlik(p.gorev) && hasWorked(p)),
    denetim: personelList.some(p => isDenetim(p.gorev) && hasWorked(p)),
  }
}

export interface TahakkukHesap {
  toplam: number
  temel_gider: number
  ogretmen_havuzu: number
  baskan: number
  baskan_yrd: number
  muhasebe: number
  temizlik: number
  denetim: number
  pct_temel_gider: number
  pct_ogretmen: number
  pct_baskan: number
  pct_baskan_yrd: number
  pct_muhasebe: number
  pct_temizlik: number
  pct_denetim: number
}

export function tahakkukDagitimHesapla(
  toplamGelir: number,
  ayarlar: Ayarlar,
  activeCategories?: ActiveCategories
): TahakkukHesap {
  const isBaskanActive = activeCategories ? activeCategories.baskan : true
  const isBaskanYrdActive = activeCategories ? activeCategories.baskan_yrd : true
  const isMuhasebeActive = activeCategories ? activeCategories.muhasebe : true
  const isTemizlikActive = activeCategories ? activeCategories.temizlik : true
  const isDenetimActive = activeCategories ? activeCategories.denetim : true

  const rawBaskan = isBaskanActive ? (ayarlar.dagitim_baskan ?? 7) : 0
  const rawBaskanYrd = isBaskanYrdActive ? (ayarlar.dagitim_baskan_yrd ?? 5) : 0
  const rawMuhasebe = isMuhasebeActive ? (ayarlar.dagitim_muhasebe ?? 2) : 0
  const rawTemizlik = isTemizlikActive ? (ayarlar.dagitim_temizlik ?? 4) : 0
  const rawDenetim = isDenetimActive ? (ayarlar.dagitim_denetim ?? 1) : 0

  const sumUnused = 
    (!isBaskanActive ? (ayarlar.dagitim_baskan ?? 7) : 0) +
    (!isBaskanYrdActive ? (ayarlar.dagitim_baskan_yrd ?? 5) : 0) +
    (!isMuhasebeActive ? (ayarlar.dagitim_muhasebe ?? 2) : 0) +
    (!isTemizlikActive ? (ayarlar.dagitim_temizlik ?? 4) : 0) +
    (!isDenetimActive ? (ayarlar.dagitim_denetim ?? 1) : 0)

  const rawTemelGider = (ayarlar.dagitim_temel_gider ?? 26) + sumUnused
  const rawOgretmen = ayarlar.dagitim_ogretmen ?? 55

  const pct = (oran: number) =>
    Math.round((toplamGelir * oran) / 100 * 100) / 100

  const baskan = pct(rawBaskan)
  const baskan_yrd = pct(rawBaskanYrd)
  const muhasebe = pct(rawMuhasebe)
  const temizlik = pct(rawTemizlik)
  const denetim = pct(rawDenetim)
  const ogretmen_havuzu = pct(rawOgretmen)

  const temel_gider = Math.round((toplamGelir - (baskan + baskan_yrd + muhasebe + temizlik + denetim + ogretmen_havuzu)) * 100) / 100

  return {
    toplam: toplamGelir,
    temel_gider,
    ogretmen_havuzu,
    baskan,
    baskan_yrd,
    muhasebe,
    temizlik,
    denetim,
    pct_temel_gider: rawTemelGider,
    pct_ogretmen: rawOgretmen,
    pct_baskan: rawBaskan,
    pct_baskan_yrd: rawBaskanYrd,
    pct_muhasebe: rawMuhasebe,
    pct_temizlik: rawTemizlik,
    pct_denetim: rawDenetim,
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
