// ============================================================
// Öğrenci ödeme dökümü: bir öğrencinin bir eğitim yılında okul, OAB ve kulübe yaptığı
// tüm ödemeler (ne, nereye, ne zaman, ne kadar) ve ödenmemiş / geciken kalemleri.
// ============================================================
import { kulupOgrencisi, type Ayarlar, type Birim, type Ogrenci, type TahsilatKategori, type TahsilatKaydi, type TahsilatTaksitPlani, type Tatil } from '@/lib/types'
import { AYLAR, ogrenciUcretiHesapla } from '@/lib/hesaplama'
import { taksitCoz } from '@/lib/taksit'
import { kapsamOgrencileri, donemGeldi, ucretBul, hesaplaDonemler } from './yardimcilar'

/** Ödeme Takibi'ndeki (tahsilat tablosu) kulüp aidatı ödemesi */
export interface KulupTahsilat { ogrenci_id: number; ay: number; yil: number; tarih?: string | null; tutar?: number | null }

const OKUL_AYLARI = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6]
const KULUP_ADI = /k[uü]l[uü]p|kul[uü]b|klup|klub/i
/** Okul tarafında kulüp aidatını izleyen aylık kategori (kulüp birimindeki ya da adında "kulüp" geçen) */
const kulupAylikKategorisi = (k: TahsilatKategori) => k.tip === 'aylik' && (k.birim === 'kulup' || KULUP_ADI.test(k.ad))

export const BIRIM_ADI: Record<Birim, string> = { okul: 'Okul', oab: 'Okul Aile Birliği', kulup: 'Kulüp' }
const ODEME_TAKIBI = 'Aylık kulüp ücreti'

export interface DokumOdeme { birim: string; kalem: string; donem: string; tarih: string | null; tutar: number | null; aciklama: string | null }
export interface DokumBekleyen { birim: string; kalem: string; donem: string; tutar: number | null; gecikti: boolean; vade?: string | null }
export interface Dokum { odemeler: DokumOdeme[]; bekleyenler: DokumBekleyen[]; toplamOdenen: number; toplamBekleyen: number }

/** Dönem anahtarını okunur yazar: '2026-09' → 'Eylül 2026', '2026-D1' → '1. Dönem', '-/T2' → '2. taksit' */
/** Bekleyen kalemin kısa adı: "Aylık kulüp ücreti – Kasım 2026" */
export const bekleyenAdi = (b: DokumBekleyen) => (b.donem === 'Tek ödeme' ? b.kalem : `${b.kalem} – ${b.donem}`)

export function donemYaz(key: string): string {
  const t = taksitCoz(key)
  if (t) return `${t.donem === '-' ? '' : donemYaz(t.donem) + ' · '}${t.no}. taksit`
  if (key === '-') return 'Tek ödeme'
  const [y, p] = key.split('-')
  if (p === 'D1') return `${y}-${Number(y) + 1} 1. Dönem`
  if (p === 'D2') return `${y}-${Number(y) + 1} 2. Dönem`
  return `${AYLAR[Number(p)]} ${y}`
}

export function ogrenciDokumu(p: {
  ogrenci: Ogrenci
  kategoriler: TahsilatKategori[]
  uyelikler: { kategori_id: number; ogrenci_id: number }[]
  kayitlar: TahsilatKaydi[]          // yalnız bu öğrencinin kayıtları
  planlar: TahsilatTaksitPlani[]     // yalnız bu öğrencinin planları
  kulupTahsilat: (KulupTahsilat & { aciklama?: string | null; dekont_no?: string | null })[]
  egitimYili: number
  bugun: string
  /** Kulüp aylık ücreti hesabı için (Ödeme Takibi ile aynı formül); yoksa ödenmeyen ayın tutarı boş kalır */
  ayarlar?: Ayarlar | null
  tatiller?: Tatil[]
}): Dokum {
  const { ogrenci: o, egitimYili: ey, bugun } = p
  const kulup = kulupOgrencisi(o)
  const yilBas = `${ey}-09-01`, yilSon = `${ey + 1}-08-31`
  const ayKeys = new Set(Array.from({ length: 12 }, (_, i) => { const m = ((i + 8) % 12) + 1; return `${m >= 9 ? ey : ey + 1}-${String(m).padStart(2, '0')}` }))
  const buYilda = (k: TahsilatKategori, donem: string, tarih?: string | null) => {
    const ana = taksitCoz(donem)?.donem ?? donem
    if (k.tip === 'aylik') return ayKeys.has(ana)
    if (k.tip === 'donemlik') return ana.startsWith(`${ey}-`)
    return !tarih || (tarih >= yilBas && tarih <= yilSon)
  }
  const katMap = new Map(p.kategoriler.map(k => [k.id, k]))
  // Bir ayda birden fazla (parça) kulüp ödemesi olabilir: hepsi ayrı satır, ay toplamı eksik kalanı bulmak için
  const ayAnahtari = (t: { yil: number; ay: number }) => `${t.yil}-${String(t.ay).padStart(2, '0')}`
  const kulupAyMap = new Map<string, typeof p.kulupTahsilat>()
  for (const t of p.kulupTahsilat) if (ayKeys.has(ayAnahtari(t))) kulupAyMap.set(ayAnahtari(t), [...(kulupAyMap.get(ayAnahtari(t)) || []), t])
  const kulupUcreti = (key: string) => {
    if (o.ucretsiz_mi) return 0
    if (!p.ayarlar) return null
    const [y, m] = key.split('-').map(Number)
    return Math.round(ogrenciUcretiHesapla(p.ayarlar, y, m, !!o.kardes_indirimi, p.tatiller, o.gunluk_saat ?? undefined) * 100) / 100
  }

  const odemeler: DokumOdeme[] = []
  for (const [key, liste] of kulupAyMap) for (const t of liste) {
    odemeler.push({ birim: BIRIM_ADI.kulup, kalem: ODEME_TAKIBI, donem: donemYaz(key), tarih: t.tarih ?? null, tutar: t.tutar != null ? Number(t.tutar) : null, aciklama: t.aciklama ?? t.dekont_no ?? null })
  }
  for (const r of p.kayitlar) {
    const k = katMap.get(r.kategori_id)
    if (!k || !buYilda(k, r.donem, r.tarih)) continue
    // Kulüp öğrencisinin aylık kulüp ücreti Ödeme Takibi'nde de varsa aynı ödemedir, iki kez yazılmaz
    if (kulup && kulupAylikKategorisi(k) && kulupAyMap.has(r.donem)) continue
    odemeler.push({ birim: BIRIM_ADI[k.birim ?? 'okul'], kalem: k.ad, donem: donemYaz(r.donem), tarih: r.tarih ?? null, tutar: r.tutar != null ? Number(r.tutar) : null, aciklama: r.aciklama ?? null })
  }
  odemeler.sort((a, b) => (a.tarih || '9999').localeCompare(b.tarih || '9999'))

  // Ödenmemiş kalemler: başlamış dönemlerden ödenmeyenler (aylıklarda Eylül–Haziran)
  const bekleyenler: DokumBekleyen[] = []
  const kayitVar = (kId: number, donem: string) => p.kayitlar.some(r => r.kategori_id === kId && (r.donem === donem || taksitCoz(r.donem)?.donem === donem))
  const okulAylari = OKUL_AYLARI.map(m => `${m >= 9 ? ey : ey + 1}-${String(m).padStart(2, '0')}`)
  if (kulup && !o.ucretsiz_mi) for (const key of okulAylari) {
    if (!donemGeldi(key, bugun)) continue
    const gereken = kulupUcreti(key)
    const odenen = (kulupAyMap.get(key) || []).reduce((t, x) => t + Number(x.tutar || 0), 0)
    if (!kulupAyMap.has(key)) bekleyenler.push({ birim: BIRIM_ADI.kulup, kalem: ODEME_TAKIBI, donem: donemYaz(key), tutar: gereken, gecikti: true })
    else if (gereken != null && odenen < gereken - 0.01) bekleyenler.push({ birim: BIRIM_ADI.kulup, kalem: ODEME_TAKIBI, donem: `${donemYaz(key)} · kalan`, tutar: Math.round((gereken - odenen) * 100) / 100, gecikti: true })
  }
  for (const k of p.kategoriler) {
    if (k.veri_kaynagi !== 'manuel' || k.aktif === false) continue
    if (!kapsamOgrencileri(k, [o], p.uyelikler).length) continue
    if (kulup && kulupAylikKategorisi(k)) continue // Ödeme Takibi satırları zaten kapsıyor
    const birim = BIRIM_ADI[k.birim ?? 'okul']
    const donemler = hesaplaDonemler(k, ey).filter(d => k.tip !== 'aylik' || okulAylari.includes(d.key))
    for (const d of donemler) {
      const plan = p.planlar.find(x => x.kategori_id === k.id && x.donem === d.key)
      if (plan) {
        plan.vadeler.forEach((vade, i) => {
          const no = i + 1
          if (!p.kayitlar.some(r => r.kategori_id === k.id && r.donem === `${d.key}/T${no}`)) {
            bekleyenler.push({ birim, kalem: k.ad, donem: `${d.key === '-' ? '' : donemYaz(d.key) + ' · '}${no}. taksit`, tutar: Number(plan.tutarlar[i]) || null, gecikti: vade < bugun, vade })
          }
        })
        continue
      }
      if (kayitVar(k.id, d.key) || !donemGeldi(d.key, bugun)) continue
      bekleyenler.push({ birim, kalem: k.ad, donem: k.tip === 'tek_seferlik' ? 'Tek ödeme' : donemYaz(d.key), tutar: ucretBul(k, o), gecikti: true })
    }
  }

  return {
    odemeler, bekleyenler,
    toplamOdenen: odemeler.reduce((t, x) => t + (x.tutar || 0), 0),
    toplamBekleyen: bekleyenler.reduce((t, x) => t + (x.tutar || 0), 0),
  }
}
