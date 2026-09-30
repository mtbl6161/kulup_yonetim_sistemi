// ============================================================
// Banka ekstresi açıklamasından öğrenci ödemesi çıkarımı
// Format genelde: "<ÖDEYEN ADI> 'DAN <ÖĞRENCİ + SINIF + AÇIKLAMA> , <BANKA ADI>"
// Bu modül metni ayrıştırıp öğrenci listesiyle bulanık eşleştirme yapar.
//
// Not: Tüm ayrıştırma ASCII'ye indirgenmiş (Türkçe karaktersiz) metin üzerinde
// yapılır. Sebep: banka ekstrelerinde büyük harf "I" sıkça "İ" yerine kullanılıyor;
// Türkçe yerel küçük harfe çevirmede "I" -> "ı" olur ("i" değil), bu da "KIRTASIYE"
// gibi ASCII yazılmış kelimelerin "kırtasiye" ile eşleşmesini engelliyordu.
// ============================================================
import { Ogrenci } from './types'

const AY_INDEX: Record<string, number> = {
  ocak: 1, subat: 2, mart: 3, nisan: 4, mayis: 5, haziran: 6, temmuz: 7,
  agustos: 8, eylul: 9, ekim: 10, kasim: 11, aralik: 12,
}

// Ödeme amacıyla ilgisiz, açıklamada sık geçen gürültü kelimeleri (ASCII, aday isimden temizlenir)
const NOISE_KELIMELER = [
  'cocuk', 'kulub\\w*', 'klub\\w*', 'klup\\w*', 'aidat\\w*',
  'kirtasiye\\w*', 'ucret\\w*', 'odeme\\w*',
  'ayi', 'taksit\\w*', 'sube\\w*', 'sinif\\w*',
  'ogrenim\\w*', 'ogretim\\w*', 'egitim\\w*',
  'yaz\\s*okul\\w*', 'okul\\w*', 'dahil', 'devri', 'yili', 'grup\\w*',
  'oglenci\\w*', 'ilk', 'ikinci', 'birinci', 'donem\\w*',
  'gelen', 'fast', 'tarafindan', 'aktarilan',
]

function normalizeTr(s: string): string {
  return (s || '').toLocaleLowerCase('tr').trim()
}

// Türkçe karakterleri ASCII'ye indirger (ı/İ dahil) — tüm eşleştirme bunun üzerinden yapılır
function sadelestir(s: string): string {
  return s
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
}

function foldAscii(s: string): string {
  return sadelestir(normalizeTr(s))
}

export interface AciklamaAyristirma {
  odeyen: string | null
  adayIsim: string
  sinifIpucu: string | null
  ayIpucu: number | null
  odemeTipi: 'kulup' | 'kirtasiye' | null
}

// Ekstre açıklamasını ödeyen / hedef öğrenci adayı / sınıf / ay / ödeme tipi olarak ayrıştırır.
// Dönen alanlar (adayIsim, odeyen, sinifIpucu) ASCII/küçük harftir — yalnızca iç eşleştirme için kullanılır.
export function aciklamayiAyristir(aciklamaHam: string): AciklamaAyristirma {
  const s = foldAscii(aciklamaHam)
  if (!s) return { odeyen: null, adayIsim: '', sinifIpucu: null, ayIpucu: null, odemeTipi: null }

  let odemeTipi: 'kulup' | 'kirtasiye' | null = null
  if (/kirtasiye/.test(s)) odemeTipi = 'kirtasiye'
  if (/kulub|klub|klup|aidat/.test(s)) odemeTipi = 'kulup'

  // Ödeyen / hedef ayrımı: "... dan ..." veya "... / ..."
  let odeyen: string | null = null
  let hedef = s
  const danMatch = s.match(/^(.*?)\s*'?dan\b\s*(.*)$/)
  if (danMatch && danMatch[1].trim().length >= 3) {
    odeyen = danMatch[1].trim()
    hedef = danMatch[2].trim()
  } else {
    const slashIdx = s.indexOf('/')
    if (slashIdx > 2 && slashIdx < s.length - 2) {
      odeyen = s.slice(0, slashIdx).trim()
      hedef = s.slice(slashIdx + 1).trim()
    }
  }

  // Sondaki banka adı bölümünü at (son virgülden sonrası)
  const virgulIdx = hedef.lastIndexOf(',')
  if (virgulIdx > 0) hedef = hedef.slice(0, virgulIdx).trim()

  // Parantez içini çıkar
  hedef = hedef.replace(/\([^)]*\)/g, ' ')

  // 4 haneli yıl (20xx) çıkar
  const yilM = hedef.match(/\b20\d{2}\b/)
  if (yilM) hedef = hedef.replace(yilM[0], ' ')

  // 6+ haneli referans/TC/telefon gibi sayı dizilerini çıkar
  hedef = hedef.replace(/\b\d{6,}\b/g, ' ')

  // Ay ismini yakala ve çıkar
  let ayIpucu: number | null = null
  for (const ay of Object.keys(AY_INDEX)) {
    const re = new RegExp(`\\b${ay}\\w*`)
    if (re.test(hedef)) { ayIpucu = AY_INDEX[ay]; hedef = hedef.replace(re, ' '); break }
  }

  // Sınıf ipucu: "5/b", "4-c", "5b", "3 yas b"
  let sinifIpucu: string | null = null
  const sinifM =
    hedef.match(/\b(\d{1,2})\s*[-\/]\s*([a-z])\b/) ||
    hedef.match(/\b(\d{1,2})\s*yas\s*([a-z])\b/)
  if (sinifM) {
    sinifIpucu = `${sinifM[1]}${sinifM[2]}`
    hedef = hedef.replace(sinifM[0], ' ')
  }

  // Gürültü kelimelerini çıkar
  for (const kw of NOISE_KELIMELER) {
    hedef = hedef.replace(new RegExp(`\\b${kw}`, 'g'), ' ')
  }

  // Kalan noktalama/rakam/fazla boşlukları temizle
  let adayIsim = hedef
    .replace(/['".,;:!?()]/g, ' ')
    .replace(/[-_/]+/g, ' ')
    .replace(/\d+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (adayIsim.length < 2) adayIsim = hedef.trim() || odeyen || s

  return { odeyen, adayIsim, sinifIpucu, ayIpucu, odemeTipi }
}

export interface OgrenciEslesme {
  ogrenci: Ogrenci
  skor: number
  belirgin: boolean // yüksek güven: tek/net eşleşme, otomatik işaretlemeye uygun
}

// Aday ismi (ve varsa sınıf ipucunu) öğrenci listesiyle karşılaştırıp en iyi eşleşmeyi döndürür.
// adayIsim / sinifIpucu, aciklamayiAyristir'den gelen ASCII/küçük harf metinlerdir.
export function ogrenciEslestir(adayIsim: string, sinifIpucu: string | null, ogrenciler: Ogrenci[]): OgrenciEslesme | null {
  const aday = foldAscii(adayIsim)
  if (aday.replace(/\s+/g, '').length < 3) return null

  let en: { ogrenci: Ogrenci; skor: number } | null = null
  let ikinciSkor = 0

  for (const o of ogrenciler) {
    const tamAd = `${o.ad || ''} ${o.soyad || ''}`.trim()
    const tokenlar = tamAd.split(/\s+/).filter(Boolean)
    if (!tokenlar.length) continue
    let bulunan = 0
    for (const t of tokenlar) {
      const tf = foldAscii(t)
      if (tf.length < 2) { bulunan += 0.3; continue }
      if (aday.includes(tf)) bulunan++
    }
    let skor = bulunan / tokenlar.length
    if (sinifIpucu && o.sinif) {
      const sinifSade = foldAscii(o.sinif).replace(/[^a-z0-9]/g, '')
      if (sinifSade.includes(sinifIpucu)) skor += 0.3
    }
    if (!en || skor > en.skor) { ikinciSkor = en ? en.skor : 0; en = { ogrenci: o, skor } }
    else if (skor > ikinciSkor) { ikinciSkor = skor }
  }

  if (!en || en.skor < 0.5) return null
  const belirgin = en.skor >= 1 && (en.skor - ikinciSkor) >= 0.34
  return { ogrenci: en.ogrenci, skor: en.skor, belirgin }
}
