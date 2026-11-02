// ============================================================
// Banka ekstresi açıklamasından öğrenci ödemesi çıkarımı
// Format genelde: "<ÖDEYEN ADI> 'DAN <ÖĞRENCİ + SINIF + AÇIKLAMA> , <BANKA ADI>"
// Bu modül metni ayrıştırır, öğrenciyi kelime bazında eşleştirir ve ödemenin hangi
// tahsilat kategorisine (kırtasiye, personel, aylık aidat…) ait olduğunu tahmin eder.
//
// Not: Tüm ayrıştırma ASCII'ye indirgenmiş (Türkçe karaktersiz) metin üzerinde
// yapılır. Sebep: banka ekstrelerinde büyük harf "I" sıkça "İ" yerine kullanılıyor;
// Türkçe yerel küçük harfe çevirmede "I" -> "ı" olur ("i" değil), bu da "KIRTASIYE"
// gibi ASCII yazılmış kelimelerin "kırtasiye" ile eşleşmesini engelliyordu.
// ============================================================
import { kulupOgrencisi, type Ogrenci, type TahsilatKategori } from './types'

const AY_INDEX: Record<string, number> = {
  ocak: 1, subat: 2, mart: 3, nisan: 4, mayis: 5, haziran: 6, temmuz: 7,
  agustos: 8, eylul: 9, ekim: 10, kasim: 11, aralik: 12,
}

// Türkçe karakterleri ASCII'ye indirger (ı/İ dahil) — tüm eşleştirme bunun üzerinden yapılır
export function foldAscii(s: string): string {
  return (s || '').toLocaleLowerCase('tr').trim()
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
    .replace(/[âà]/g, 'a').replace(/[îì]/g, 'i').replace(/[ûù]/g, 'u')
}

const kelimeler = (s: string) => s.split(/[^a-z0-9]+/).filter(Boolean)

/** Ödeme türü aileleri: açıklamada ve kategori adında aynı kökle aranır (yaygın yazım hataları dahil) */
const AILE: Record<'kirtasiye' | 'personel' | 'kulup', RegExp> = {
  kirtasiye: /kirtas|kirats|kiratas|kirtsiy/,
  personel: /personel|calisan/,
  kulup: /kulub|kulup|klub|klup/,
}
const AYLIK_IPUCU = /aidat|aylik|ayi ucret|ay ucret|okul parasi|okul ucret/
// İade, devir vb. öğrenci ödemesi olmayan girişler: eşleşmese de uyarı verilmez
const ODEME_DEGIL = /iade|devri\b|devir\b|faiz|geri odeme|virman/

// Kategori adından anahtar kelime çıkarılırken atlanan genel sözcükler
const GENEL = new Set(['ucret', 'ucreti', 'ucretleri', 'aidat', 'aidati', 'odeme', 'odemesi', 'tahsilat', 'bedeli', 'bedel', 'para', 'parasi', 'aylik', 'donem', 'donemlik', 'yillik', 'katki', 'payi'])

export interface AciklamaAyristirma {
  odeyen: string | null
  hedef: string        // öğrenci adının arandığı kısım (ASCII, küçük harf)
  sinifIpucu: string | null
  ayIpucu: number | null
  odemeDegil: boolean
}

// Ekstre açıklamasını ödeyen / hedef metin / sınıf / ay olarak ayrıştırır.
export function aciklamayiAyristir(aciklamaHam: string): AciklamaAyristirma {
  const s = foldAscii(aciklamaHam)
  if (!s) return { odeyen: null, hedef: '', sinifIpucu: null, ayIpucu: null, odemeDegil: false }

  // Ödeyen / hedef ayrımı: "... 'dan ..." veya "...   /..."
  let odeyen: string | null = null
  let hedef = s
  const danMatch = s.match(/^(.*?)\s*'\s*(?:dan|den|tan|ten)\b\s*(.*)$/) || s.match(/^(.*?)\s+(?:dan|den)\s+(.*)$/)
  if (danMatch && danMatch[1].trim().length >= 3) {
    odeyen = danMatch[1].trim()
    hedef = danMatch[2].trim()
  } else {
    const slashIdx = s.indexOf('/')
    // "4/B" gibi sınıf yazımını ayraç sanma: ayraçtan önce en az bir kelime ve boşluk olmalı
    if (slashIdx > 2 && slashIdx < s.length - 2 && /[a-z]\s*$/.test(s.slice(0, slashIdx)) && !/\d\s*$/.test(s.slice(0, slashIdx))) {
      odeyen = s.slice(0, slashIdx).trim()
      hedef = s.slice(slashIdx + 1).trim()
    }
  }

  // Sondaki banka adı bölümünü at (son virgülden sonrası, banka adıysa)
  const virgulIdx = hedef.lastIndexOf(',')
  if (virgulIdx > 0 && /bank|katilim|a\.?s\b|t\.?a\.?o|t\.?a\.?s|ziraat|vakif|halk/.test(hedef.slice(virgulIdx))) hedef = hedef.slice(0, virgulIdx).trim()

  let ayIpucu: number | null = null
  for (const ay of Object.keys(AY_INDEX)) {
    if (new RegExp(`\\b${ay}`).test(hedef)) { ayIpucu = AY_INDEX[ay]; break }
  }

  // Sınıf ipucu: "5/b", "4-c", "4 b", "4c", "3 yas b"
  let sinifIpucu: string | null = null
  const sinifM = hedef.match(/\b(\d{1,2})\s*yas\s*([a-h])\b/) || hedef.match(/\b(\d{1,2})\s*[-/]?\s*([a-h])\b/)
  if (sinifM) sinifIpucu = `${sinifM[1]}${sinifM[2]}`

  return { odeyen, hedef, sinifIpucu, ayIpucu, odemeDegil: ODEME_DEGIL.test(s) }
}

/** İki kısa kelime arasında en fazla bir harf farkı var mı (yazım hatası toleransı) */
function birFark(a: string, b: string): boolean {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0, j = 0, fark = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue }
    if (++fark > 1) return false
    if (a.length > b.length) i++
    else if (b.length > a.length) j++
    else { i++; j++ }
  }
  return fark + (a.length - i) + (b.length - j) <= 1
}

/** Öğrenci adındaki bir kelime açıklamada geçiyor mu: tam, ek almış ("durmazin") ya da tek harf hatalı */
function kelimeVar(token: string, metin: string[]): boolean {
  return metin.some(w => w === token
    || (token.length >= 4 && w.startsWith(token) && w.length - token.length <= 3)
    || (token.length >= 5 && birFark(w, token)))
}

export interface OgrenciEslesme {
  ogrenci: Ogrenci
  skor: number
  belirgin: boolean // yüksek güven: soyadı + ad eşleşmiş ve başka aday yok, otomatik işaretlemeye uygun
  /** Açıklamada aynı güçte birden fazla öğrenci var (kardeşler): tutar bölünmüş olabilir */
  coklu: boolean
}

// Hedef metni öğrenci listesiyle kelime bazında karşılaştırıp en iyi eşleşmeyi döndürür.
export function ogrenciEslestir(hedef: string, sinifIpucu: string | null, ogrenciler: Ogrenci[]): OgrenciEslesme | null {
  const metin = kelimeler(foldAscii(hedef))
  if (!metin.length) return null

  const adaylar: { ogrenci: Ogrenci; skor: number; soyad: boolean; ad: boolean }[] = []
  for (const o of ogrenciler) {
    const adT = kelimeler(foldAscii(o.ad || ''))
    const soyadT = kelimeler(foldAscii(o.soyad || ''))
    if (!adT.length && !soyadT.length) continue
    const adBulunan = adT.filter(t => t.length >= 2 && kelimeVar(t, metin)).length
    const soyadBulunan = soyadT.filter(t => t.length >= 2 && kelimeVar(t, metin)).length
    if (!soyadBulunan && !adBulunan) continue
    let skor = (adBulunan + soyadBulunan) / (adT.length + soyadT.length)
    if (sinifIpucu && o.sinif && foldAscii(o.sinif).replace(/[^a-z0-9]/g, '') === sinifIpucu) skor += 0.3
    adaylar.push({ ogrenci: o, skor, soyad: soyadBulunan > 0, ad: adBulunan > 0 })
  }
  if (!adaylar.length) return null
  adaylar.sort((a, b) => b.skor - a.skor)
  const en = adaylar[0]
  if (en.skor < 0.5 || !en.soyad) return null
  // Yalnız adı tutan (soyadı farklı) öğrenciler rakip sayılmaz: "Aybüke Aras" yazılınca Aybüke Karan'a kaymaz
  const ikinci = adaylar.slice(1).find(a => a.soyad)?.skor ?? 0
  const adSoyad = en.soyad && en.ad
  // Kardeşler: ikisi de adı + soyadıyla tam geçiyorsa
  const coklu = adaylar.filter(a => a.soyad && a.ad && a.skor >= 1).length > 1
  const belirgin = adSoyad && !coklu && en.skor - ikinci >= 0.2 - 1e-9
  return { ogrenci: en.ogrenci, skor: en.skor, belirgin, coklu }
}

// ── Kategori tahmini ──

/** Ödemenin yazılabileceği yer: bir tahsilat kategorisi ya da kulüp Ödeme Takibi (aidat) */
export interface OdemeHedefi {
  anahtar: string            // 'kulup' | `k${kategori.id}`
  ad: string
  tip: TahsilatKategori['tip']
  kategori: TahsilatKategori | null
  aile: keyof typeof AILE | null
  kelimeler: string[]
  kapsar: (o: Ogrenci) => boolean
  ucret: (o: Ogrenci) => number | null
}

export const KULUP_HEDEF = 'kulup'

export function hedefleriHazirla(
  kategoriler: TahsilatKategori[],
  uyelikler: { kategori_id: number; ogrenci_id: number }[],
  kulupAidati: { dahil: boolean; ucret?: (o: Ogrenci) => number | null },
): OdemeHedefi[] {
  const hedefler: OdemeHedefi[] = kategoriler.filter(k => k.veri_kaynagi === 'manuel' && k.aktif !== false).map(k => {
    const ad = foldAscii(k.ad)
    const aile = (Object.keys(AILE) as (keyof typeof AILE)[]).find(a => AILE[a].test(ad)) ?? null
    const uyeler = new Set(uyelikler.filter(u => u.kategori_id === k.id).map(u => u.ogrenci_id))
    return {
      anahtar: `k${k.id}`, ad: k.ad, tip: k.tip, kategori: k, aile,
      kelimeler: kelimeler(ad).filter(w => w.length >= 4 && !GENEL.has(w) && !(aile && AILE[aile].test(w))),
      kapsar: (o: Ogrenci) => k.kapsam === 'tumu' || uyeler.has(o.id),
      ucret: (o: Ogrenci) => {
        const v = kulupOgrencisi(o) ? k.varsayilan_tutar : (k.varsayilan_tutar_okul ?? k.varsayilan_tutar)
        return v != null ? Number(v) : null
      },
    }
  })
  if (kulupAidati.dahil) hedefler.push({
    anahtar: KULUP_HEDEF, ad: 'Kulüp aidatı (Aidat Takibi)', tip: 'aylik', kategori: null, aile: 'kulup', kelimeler: [],
    kapsar: kulupOgrencisi, ucret: kulupAidati.ucret ?? (() => null),
  })
  return hedefler
}

export interface OdemeTahmini {
  ogrenciId: number | null
  hedef: string | null
  ay: number | null          // aylık hedef için ödenen ay
  isaretle: boolean
  /** Otomatik işaretlenmediyse nedeni (önizlemede uyarı olarak gösterilir) */
  uyari: string | null
  /** Tahmin yalnızca tutara dayanıyor */
  tutaraGore: boolean
  odemeDegil: boolean
}

/** Ödeme tarihinin eğitim yılı içindeki ay ipucunun yılı ("2026-09" ödemesinde "Haziran" → 2027) */
export function aylikDonem(tarih: string, ay: number): string {
  const [y, m] = tarih.split('-').map(Number)
  const ey = m >= 9 ? y : y - 1
  return `${ay >= 9 ? ey : ey + 1}-${String(ay).padStart(2, '0')}`
}

/** Dönemlik kategoride ödemenin düştüğü dönem: Eylül–Ocak 1. dönem, Şubat–Ağustos 2. dönem */
export function donemlikDonem(tarih: string): string {
  const [y, m] = tarih.split('-').map(Number)
  const ey = m >= 9 ? y : y - 1
  return `${ey}-${m >= 9 || m === 1 ? 'D1' : 'D2'}`
}

/** Ekstre satırından öğrenci + kategori + ay tahmini */
export function odemeTahminEt(aciklama: string, tutar: number, tarih: string, ogrenciler: Ogrenci[], hedefler: OdemeHedefi[]): OdemeTahmini {
  const ayr = aciklamayiAyristir(aciklama)
  const bos: OdemeTahmini = { ogrenciId: null, hedef: null, ay: null, isaretle: false, uyari: null, tutaraGore: false, odemeDegil: ayr.odemeDegil }
  if (ayr.odemeDegil) return bos

  // Önce açıklamanın öğrenci kısmında, bulunamazsa tüm metinde (ödeyen adı öğrencininkiyle aynı olabilir) ara
  const eslesme = ogrenciEslestir(ayr.hedef, ayr.sinifIpucu, ogrenciler)
    ?? (ayr.odeyen ? ogrenciEslestir(`${ayr.odeyen} ${ayr.hedef}`, ayr.sinifIpucu, ogrenciler) : null)
  if (!eslesme) return { ...bos, uyari: 'Öğrenci bulunamadı' }
  const o = eslesme.ogrenci
  const metin = foldAscii(aciklama)
  const metinK = kelimeler(metin)

  const adaylar = hedefler.filter(h => h.kapsar(o)).map(h => {
    let skor = 0
    // Ödeme türü kökü (kırtasiye, personel) kategori adındaki diğer sözcüklerden ("öğleci") güçlüdür
    if (h.aile && AILE[h.aile].test(metin)) skor += 3
    if (h.kelimeler.some(k => kelimeVar(k, metinK))) skor += 2
    if (h.tip === 'aylik' && (ayr.ayIpucu || AYLIK_IPUCU.test(metin))) skor += 1
    const ucret = h.ucret(o)
    const tutarUyar = ucret != null && Math.abs(ucret - tutar) < 0.01
    if (h.anahtar === KULUP_HEDEF) skor -= 0.5 // aynı ada sahip kategori varsa ona öncelik
    return { h, skor, tutarUyar }
  })
  const temel = { ...bos, ogrenciId: o.id }
  if (!adaylar.length) return { ...temel, uyari: 'Öğrencinin dahil olduğu tahsilat kategorisi yok' }

  const anahtarli = adaylar.filter(a => a.skor >= 1.5).sort((a, b) => b.skor - a.skor)
  let secilen: typeof adaylar[number] | null = null
  let tutaraGore = false
  let uyari: string | null = null
  if (anahtarli.length) {
    secilen = anahtarli[0]
    if (anahtarli.length > 1 && anahtarli[1].skor >= secilen.skor) uyari = 'Ödeme türü belirsiz'
    // Açıklama birden fazla türü anıyorsa (ör. "okul parası, kırtasiye") ve tutar tutmuyorsa birleşik ödeme olabilir
    else if (adaylar.some(a => a !== secilen && a.skor >= 1 && a.h.aile !== secilen!.h.aile) && !secilen.tutarUyar) uyari = 'Birden fazla ödeme içeriyor olabilir'
  } else {
    const tutan = adaylar.filter(a => a.tutarUyar)
    if (tutan.length === 1) { secilen = tutan[0]; tutaraGore = true }
    else uyari = tutan.length > 1 ? 'Tutar birden fazla kategoriye uyuyor' : 'Ödeme türü anlaşılamadı'
  }
  if (!secilen) return { ...temel, uyari }

  const ay = secilen.h.tip === 'aylik' ? (ayr.ayIpucu ?? Number(tarih.slice(5, 7))) : null
  if (!uyari && eslesme.coklu) uyari = 'Birden fazla öğrenci adı geçiyor'
  if (!uyari && !eslesme.belirgin) uyari = 'Öğrenci eşleşmesi kesin değil'
  return { ...temel, hedef: secilen.h.anahtar, ay, isaretle: !uyari, uyari, tutaraGore }
}
