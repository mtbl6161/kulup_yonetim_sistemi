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
import { kulupOgrencisi, type Ogrenci, type TahsilatKategori, type TahsilatTaksitPlani } from './types'

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
  /** Adı ve soyadıyla tam geçen öğrenciler (kardeş ödemesinde hepsi) */
  kardesler: Ogrenci[]
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
  // Kardeşler: adı + soyadıyla tam geçenler
  const kardesler = adaylar.filter(a => a.soyad && a.ad && a.skor >= 1).map(a => a.ogrenci)
  const coklu = kardesler.length > 1
  const belirgin = adSoyad && !coklu && en.skor - ikinci >= 0.2 - 1e-9
  return { ogrenci: en.ogrenci, skor: en.skor, belirgin, coklu, kardesler }
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
  /** Öğrencinin bu kalemdeki taksit planının taksit tutarları (planı yoksa boş) */
  taksitler: (o: Ogrenci) => number[]
}

export const KULUP_HEDEF = 'kulup'

export function hedefleriHazirla(
  kategoriler: TahsilatKategori[],
  uyelikler: { kategori_id: number; ogrenci_id: number }[],
  kulupAidati: { dahil: boolean; ucret?: (o: Ogrenci) => number | null },
  planlar: Pick<TahsilatTaksitPlani, 'kategori_id' | 'ogrenci_id' | 'tutarlar'>[] = [],
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
      taksitler: (o: Ogrenci) => planlar.filter(pl => pl.kategori_id === k.id && pl.ogrenci_id === o.id).flatMap(pl => pl.tutarlar.map(Number)),
    }
  })
  if (kulupAidati.dahil) hedefler.push({
    anahtar: KULUP_HEDEF, ad: 'Kulüp aidatı (Aidat Takibi)', tip: 'aylik', kategori: null, aile: 'kulup', kelimeler: [],
    kapsar: kulupOgrencisi, ucret: kulupAidati.ucret ?? (() => null), taksitler: () => [],
  })
  return hedefler
}

/** Bir banka satırının bir kısmı: bir öğrencinin bir ödeme kalemi */
export interface OdemeParcasi {
  ogrenciId: number | null
  hedef: string | null
  ay: number | null          // aylık hedef için ödenen ay
  tutar: number
}

export interface OdemeTahmini {
  /** Satır tek ödemeyse bir parça; birleşik ödeme (personel + kırtasiye) ya da kardeş ödemesinde birden fazla */
  parcalar: OdemeParcasi[]
  isaretle: boolean
  /** Otomatik işaretlenmediyse nedeni (önizlemede uyarı olarak gösterilir) */
  uyari: string | null
  /** Tahmin yalnızca tutara dayanıyor */
  tutaraGore: boolean
  odemeDegil: boolean
}

const kurus = (n: number) => Math.round(n * 100) / 100
const esit = (a: number, b: number) => Math.abs(a - b) < 0.01

/** Ücretleri toplamı tutara eşit olan tek kalem grubu (2–3 kalem); birden fazla grup tutuyorsa null */
function tutanGrup<T extends { ucret: number | null }>(liste: T[], tutar: number): T[] | null {
  const bilinen = liste.filter(x => x.ucret != null && x.ucret > 0)
  const bulunan: T[][] = []
  const n = bilinen.length
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if (esit(bilinen[i].ucret! + bilinen[j].ucret!, tutar)) bulunan.push([bilinen[i], bilinen[j]])
    for (let k = j + 1; k < n; k++) if (esit(bilinen[i].ucret! + bilinen[j].ucret! + bilinen[k].ucret!, tutar)) bulunan.push([bilinen[i], bilinen[j], bilinen[k]])
  }
  return bulunan.length === 1 ? bulunan[0] : null
}

/** Tutarı parçalara dağıtır: bilinen ücretler sırayla doldurulur (toplamı aşmadan), kalan bilinmeyenlere
 *  eşit bölünür ya da hepsi biliniyorsa son parçaya eklenir */
function dagit(ucretler: (number | null)[], tutar: number): number[] {
  let kalan = tutar
  const sonuc = ucretler.map(u => { if (u == null) return null; const v = Math.min(u, Math.max(0, kalan)); kalan = kurus(kalan - v); return v })
  const bilinmeyen = sonuc.filter(v => v == null).length
  if (bilinmeyen) { const pay = kurus(Math.max(0, kalan) / bilinmeyen); return sonuc.map(v => v ?? pay) }
  const dolu = sonuc as number[]
  dolu[dolu.length - 1] = kurus(dolu[dolu.length - 1] + kalan)
  return dolu
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

/** Ekstre satırından öğrenci + kategori + ay tahmini; birleşik ve kardeş ödemelerini parçalara böler */
export function odemeTahminEt(aciklama: string, tutar: number, tarih: string, ogrenciler: Ogrenci[], hedefler: OdemeHedefi[]): OdemeTahmini {
  const ayr = aciklamayiAyristir(aciklama)
  const bos: OdemeTahmini = { parcalar: [], isaretle: false, uyari: null, tutaraGore: false, odemeDegil: ayr.odemeDegil }
  if (ayr.odemeDegil) return bos

  // Önce açıklamanın öğrenci kısmında, bulunamazsa tüm metinde (ödeyen adı öğrencininkiyle aynı olabilir) ara
  const dogrudan = ogrenciEslestir(ayr.hedef, ayr.sinifIpucu, ogrenciler)
  const eslesme = dogrudan ?? (ayr.odeyen ? ogrenciEslestir(`${ayr.odeyen} ${ayr.hedef}`, ayr.sinifIpucu, ogrenciler) : null)
  const metin = foldAscii(aciklama)
  const metinK = kelimeler(metin)
  const ay = ayr.ayIpucu ?? Number(tarih.slice(5, 7))
  const parca = (o: Ogrenci, h: OdemeHedefi | null, t: number): OdemeParcasi => ({ ogrenciId: o.id, hedef: h?.anahtar ?? null, ay: h?.tip === 'aylik' ? ay : null, tutar: kurus(t) })

  // ── Öğrenci adı açıklamada yok, yalnız veli adı var ("HALİME KIROĞLU 'DAN GELEN FAST ÖDEMESİ"): velinin soyadını
  // taşıyan birden fazla öğrenci varsa hangisi olduğu bilinemez; tutar kardeşlerin ortak ücretine uyuyorsa bölmeyi öner ──
  if (!dogrudan && ayr.odeyen) {
    const veliSoyadi = kelimeler(ayr.odeyen).pop() || ''
    const ayniSoyad = veliSoyadi.length >= 3 ? ogrenciler.filter(x => kelimeler(foldAscii(x.soyad || '')).some(t => t === veliSoyadi || birFark(t, veliSoyadi))) : []
    if (ayniSoyad.length > 1 && ayniSoyad.length <= 4) {
      const adlar = ayniSoyad.map(x => `${x.ad} ${x.soyad}${x.sinif ? ` (${x.sinif})` : ''}`).join(', ')
      const ortak = hedefler.filter(h => ayniSoyad.every(x => h.kapsar(x)))
      const tutanlar = ortak.filter(h => { const u = ayniSoyad.map(x => h.ucret(x)); return u.every(v => v != null) && esit(u.reduce<number>((t, v) => t + v!, 0), tutar) })
      if (tutanlar.length === 1) {
        const h = tutanlar[0]
        return { ...bos, parcalar: ayniSoyad.map(x => parca(x, h, h.ucret(x)!)), uyari: `Veli adından bulundu, kardeşlere bölündü: ${adlar} — kontrol edin`, tutaraGore: true }
      }
      return { ...bos, parcalar: [{ ogrenciId: null, hedef: null, ay: null, tutar: kurus(tutar) }], uyari: `Velinin öğrencisi belirsiz: ${adlar}` }
    }
  }
  if (!eslesme) return { ...bos, uyari: 'Öğrenci bulunamadı' }

  // Öğrencinin dahil olduğu kalemler ve açıklamada anılma güçleri
  const adaylariBul = (o: Ogrenci) => hedefler.filter(h => h.kapsar(o)).map(h => {
    let skor = 0
    // Ödeme türü kökü (kırtasiye, personel) kategori adındaki diğer sözcüklerden ("öğleci") güçlüdür
    if (h.aile && AILE[h.aile].test(metin)) skor += 3
    if (h.kelimeler.some(k => kelimeVar(k, metinK))) skor += 2
    if (h.tip === 'aylik' && (ayr.ayIpucu || AYLIK_IPUCU.test(metin))) skor += 1
    if (h.anahtar === KULUP_HEDEF) skor -= 0.5 // aynı ada sahip kategori varsa ona öncelik
    const ucret = h.ucret(o)
    const taksitUyar = h.taksitler(o).some(t => esit(t, tutar))
    return { h, skor, ucret, tutarUyar: (ucret != null && esit(ucret, tutar)) || taksitUyar, taksitUyar }
  })
  // Aynı türü anan adaylardan en güçlüsü (ör. kulüp aidatı kategorisi ile Aidat Takibi aynı ödemedir)
  const turBasina = <T extends { h: OdemeHedefi; skor: number }>(l: T[]) => l.filter(x => !l.some(y => y !== x && y.h.aile && y.h.aile === x.h.aile && (y.skor > x.skor || (y.skor === x.skor && l.indexOf(y) < l.indexOf(x)))))

  // ── Kardeş ödemesi: her kardeşe kendi ücreti ──
  if (eslesme.coklu && eslesme.kardesler.length <= 4) {
    const kardesler = eslesme.kardesler
    const secimler = kardesler.map(o => {
      const ad = adaylariBul(o)
      const anahtarli = turBasina(ad.filter(a => a.skor >= 1.5)).sort((a, b) => b.skor - a.skor)
      return { o, ad, sec: anahtarli.length === 1 ? anahtarli[0] : null }
    })
    if (secimler.every(x => x.sec)) {
      const ucretler = secimler.map(x => x.sec!.ucret)
      const tam = ucretler.every(u => u != null) && esit(ucretler.reduce<number>((t, u) => t + u!, 0), tutar)
      // Ücretler toplamı tutarı aşıyorsa kardeşler kısmi ödemiştir: eşit bölünür (kimseye 0 ₺ yazılmaz)
      const asiyor = ucretler.every(u => u != null) && ucretler.reduce<number>((t, u) => t + u!, 0) > tutar + 0.01
      const tutarlar = asiyor ? dagit(ucretler.map(() => null), tutar) : dagit(ucretler, tutar)
      return { ...bos, parcalar: secimler.map((x, i) => parca(x.o, x.sec!.h, tutarlar[i])), isaretle: tam, uyari: tam ? null : 'Kardeş ödemesi: tutar dağılımını kontrol edin', tutaraGore: false }
    }
    // Tür yazılmamışsa: kardeşlerin ortak kaleminde ücretler toplamı tutara eşitse o kalem
    const ortak = secimler[0].ad.map(a => a.h).filter(h => secimler.every(x => x.ad.some(a => a.h === h)))
    const tutanlar = ortak.filter(h => { const u = secimler.map(x => h.ucret(x.o)); return u.every(v => v != null) && esit(u.reduce<number>((t, v) => t + v!, 0), tutar) })
    if (tutanlar.length === 1) {
      const h = tutanlar[0]
      return { ...bos, parcalar: secimler.map(x => parca(x.o, h, h.ucret(x.o)!)), isaretle: true, uyari: null, tutaraGore: true }
    }
    const pay = dagit(kardesler.map(() => null), tutar)
    return { ...bos, parcalar: kardesler.map((o, i) => parca(o, null, pay[i])), uyari: 'Kardeş ödemesi: her öğrencinin ödeme türünü seçin' }
  }

  const o = eslesme.ogrenci
  const adaylar = adaylariBul(o)
  if (!adaylar.length) return { ...bos, parcalar: [parca(o, null, tutar)], uyari: 'Öğrencinin dahil olduğu tahsilat kategorisi yok' }
  const kesinDegil = !eslesme.belirgin ? 'Öğrenci eşleşmesi kesin değil' : null
  const sonuc = (parcalar: OdemeParcasi[], uyari: string | null, tutaraGore: boolean): OdemeTahmini =>
    ({ ...bos, parcalar, uyari: uyari ?? kesinDegil, isaretle: !(uyari ?? kesinDegil), tutaraGore })

  // Açıklamada anılan kalemler (her türden en güçlüsü)
  const anilan = turBasina(adaylar.filter(a => a.skor >= 1)).sort((a, b) => b.skor - a.skor)
  const guclu = anilan.filter(a => a.skor >= 1.5)

  // ── Birleşik ödeme: açıklama birden fazla kalemi anıyor ("personel ve kırtasiye", "eylül + personel") ──
  // En güçlü anılan kalemin ücreti tutarı karşılıyorsa birleşik değil, o kalemin (kısmi) ödemesidir
  // ("öğleci grup kırtasiye ücreti" 4.000 ₺ → kırtasiye; "öğleci" yalnız öğrencinin grubunu anlatır)
  const enGuclu = guclu[0]
  const tekKalemYeter = !!enGuclu && (guclu.length === 1 || (guclu[1].skor < enGuclu.skor)) && (enGuclu.ucret == null ? guclu.length === 1 : tutar <= enGuclu.ucret + 0.01)
  if (guclu.length >= 1 && anilan.length >= 2 && !tekKalemYeter) {
    const ucretler = anilan.map(a => a.ucret)
    if (ucretler.every(u => u != null) && esit(ucretler.reduce<number>((t, u) => t + u!, 0), tutar)) {
      return sonuc(anilan.map(a => parca(o, a.h, a.ucret!)), null, false)
    }
    const grup = tutanGrup(anilan, tutar)
    if (grup) return sonuc(grup.map(a => parca(o, a.h, a.ucret!)), null, false)
    const t = dagit(ucretler, tutar)
    const oneri = anilan.map((a, i) => parca(o, a.h, t[i])).filter(x => x.tutar > 0)
    return { ...sonuc(oneri, 'Birden fazla ödeme: tutar dağılımını kontrol edin', false), isaretle: false }
  }

  // ── Tek kalem anılmış ──
  if (guclu.length) {
    if (guclu.length > 1 && guclu[1].skor >= guclu[0].skor) return { ...sonuc([parca(o, guclu[0].h, tutar)], 'Ödeme türü belirsiz', false), isaretle: false }
    const sec = guclu[0]
    // Tutar anılan kalemin ücretinden fazlaysa ve fark tek bir başka kalemin ücretine eşitse birlikte ödenmiştir
    if (sec.ucret != null && tutar > sec.ucret + 0.01) {
      const ek = adaylar.filter(a => a !== sec && a.h.aile !== sec.h.aile && a.ucret != null && esit(a.ucret, tutar - sec.ucret!))
      if (ek.length === 1) return { ...sonuc([parca(o, sec.h, sec.ucret), parca(o, ek[0].h, ek[0].ucret!)], 'Tutar fazla: başka bir ödemeyle birlikte yapılmış olabilir, kontrol edin', true), isaretle: false }
    }
    return sonuc([parca(o, sec.h, tutar)], null, false)
  }

  // ── Açıklamada tür yok: tutara göre ──
  const tutan = adaylar.filter(a => a.tutarUyar)
  if (tutan.length === 1) return sonuc([parca(o, tutan[0].h, tutar)], null, true)
  if (tutan.length > 1) return { ...sonuc([parca(o, null, tutar)], 'Tutar birden fazla kategoriye uyuyor', true), isaretle: false }
  const grup = tutanGrup(turBasina(adaylar), tutar)
  if (grup) return sonuc(grup.map(a => parca(o, a.h, a.ucret!)), null, true)
  // Tutar tek bir kalemin yarısı / üçte biri / çeyreği ise kısmi ödeme (taksit) olabilir: öner, işaretleme
  // (önce yarım ödeme aranır: 2.000 ₺ hem 4.000'in yarısı hem 6.000'in üçte biriyse yarısı seçilir)
  const kismi = [2, 3, 4].map(n => adaylar.filter(a => a.h.tip !== 'aylik' && a.ucret != null && esit(a.ucret / n, tutar))).find(l => l.length) ?? []
  if (kismi.length === 1) return { ...sonuc([parca(o, kismi[0].h, tutar)], `Kısmi ödeme / taksit olabilir (${kismi[0].h.ad} ${kismi[0].ucret} ₺) — kontrol edin`, true), isaretle: false }
  return { ...sonuc([parca(o, null, tutar)], 'Ödeme türü anlaşılamadı', false), isaretle: false }
}
