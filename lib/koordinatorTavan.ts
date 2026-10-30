// Koordinatör öğretmenin tavan ücret kontrolü.
// Koordinatör, bağlı öğretmenlerinin her dersi için bir koordinatörlük saati alır ve bordroda öğretmen gibi
// saat × saat ücretiyle ödenir; ücret görev tavanını (E.Y.D.M. × %275) aşarsa tavana kesilir (bordroHesap.ts).
// Tavana ulaştıktan sonra yazılan saatler ücrete yansımaz; bu modül o noktayı önceden haber vermek içindir.
import { supabase } from './supabase'
import { tavanHesapla, tatilMi, isOgretmen, gunSayisi, AYLAR } from './hesaplama'
import type { Ayarlar, Tatil } from './types'

const VARSAYILAN_TAVAN = 13184.78 // bordroHesap.ts ile aynı

export interface SaatUcreti {
  ucret: number
  /** Saat ücreti elle girilmemişse ay sonunda havuzdan hesaplanır; o zaman geçen ayın ücreti tahmindir */
  tahmini: boolean
  kaynak: string
}

/** Ayarlar'daki öğretmen saat ücreti; yoksa son kaydedilmiş bordrodaki öğretmen saat ücreti (tahmini) */
export async function saatUcretiBul(ayarlar: Ayarlar | null, okulId: number, ay: number, yil: number): Promise<SaatUcreti | null> {
  if (ayarlar?.ogretmen_saat_ucreti && ayarlar.ogretmen_saat_ucreti > 0) {
    return { ucret: ayarlar.ogretmen_saat_ucreti, tahmini: false, kaynak: 'Ayarlar’daki öğretmen saat ücreti' }
  }
  const [{ data: bordro }, { data: per }] = await Promise.all([
    supabase.from('bordro').select('personel_id, ay, yil, brut, toplam_saat').eq('okul_id', okulId).gt('toplam_saat', 0)
      .order('yil', { ascending: false }).order('ay', { ascending: false }).limit(300),
    supabase.from('personel').select('id, gorev').eq('okul_id', okulId),
  ])
  const ogretmen = new Set((per || []).filter(p => isOgretmen(p.gorev)).map(p => p.id))
  const onceki = (bordro || []).filter(b => ogretmen.has(b.personel_id) && (b.yil < yil || (b.yil === yil && b.ay < ay)))
  if (!onceki.length) return null
  const { ay: sonAy, yil: sonYil } = onceki[0]
  // Herkese aynı birim ücret uygulanır; tavana kesilenlerin oranı düşük çıkar, bu yüzden en yükseği alınır
  const ucret = Math.max(...onceki.filter(b => b.ay === sonAy && b.yil === sonYil).map(b => Number(b.brut) / Number(b.toplam_saat)))
  if (!(ucret > 0)) return null
  return { ucret: Math.round(ucret * 100) / 100, tahmini: true, kaynak: `${AYLAR[sonAy]} ${sonYil} bordrosundaki saat ücreti, tahmini` }
}

export interface KoordinatorDurumu {
  id: number
  ad: string
  /** Bu ay şimdiye kadar yazılmış saatler (tatil günleri ve hariç tutulan günler sayılmaz) */
  mevcut: number
  ek: number
  /** Tavan ücrete karşılık gelen en fazla saat */
  sinir: number
  tavan: number
  saatUcreti: SaatUcreti
}

/**
 * Verilen koordinatörlere ek saat yazılırsa tavanı aşanları döner.
 * haricGunler: yeniden yazılacak (silinip tekrar eklenecek) günler; mevcut saate katılmaz.
 */
async function tatilleriGetir(okulId: number): Promise<Tatil[]> {
  const { data } = await supabase.from('tatiller').select('*').or(`okul_id.eq.${okulId},okul_id.is.null`)
  return data || []
}

/** Kişilerin ay içindeki puantaj saatleri (bordrodaki gibi tatil günleri sayılmaz); haricGunler de sayılmaz */
export async function aylikSaatler(ids: number[], okulId: number, ay: number, yil: number, tatiller?: Tatil[], haricGunler: number[] = []): Promise<Map<number, number>> {
  const bas = `${yil}-${String(ay).padStart(2, '0')}-01`
  const bit = `${yil}-${String(ay).padStart(2, '0')}-${gunSayisi(yil, ay)}`
  const [{ data: puantaj }, tat] = await Promise.all([
    supabase.from('puantaj').select('personel_id, tarih, saat').in('personel_id', ids).gte('tarih', bas).lte('tarih', bit),
    tatiller ? Promise.resolve(tatiller) : tatilleriGetir(okulId),
  ])
  const haric = new Set(haricGunler)
  const saat = new Map<number, number>(ids.map(id => [id, 0]))
  for (const p of puantaj || []) {
    const gun = Number(String(p.tarih).slice(8, 10))
    if (haric.has(gun) || tatilMi(ay, gun, yil, tat)) continue
    saat.set(p.personel_id, (saat.get(p.personel_id) || 0) + (Number(p.saat) || 0))
  }
  return saat
}

export async function tavaniAsanKoordinatorler(o: {
  ayarlar: Ayarlar | null; okulId: number; ay: number; yil: number; tatiller?: Tatil[]
  ekSaat: Map<number, number>; haricGunler?: number[]
}): Promise<KoordinatorDurumu[]> {
  const ids = [...o.ekSaat.keys()].filter(id => (o.ekSaat.get(id) || 0) > 0)
  if (!ids.length) return []
  const saatUcreti = await saatUcretiBul(o.ayarlar, o.okulId, o.ay, o.yil)
  if (!saatUcreti) return [] // ücret bilinmiyorsa uyarı verilemez
  const [{ data: kisiler }, saatler] = await Promise.all([
    supabase.from('personel').select('id, ad, gorev, sgk_li').in('id', ids),
    aylikSaatler(ids, o.okulId, o.ay, o.yil, o.tatiller, o.haricGunler),
  ])
  const katsayi = o.ayarlar?.tavan_katsayi || VARSAYILAN_TAVAN
  const sonuc: KoordinatorDurumu[] = []
  for (const k of kisiler || []) {
    const mevcut = saatler.get(k.id) || 0
    const ek = o.ekSaat.get(k.id) || 0
    const tavan = tavanHesapla(k.gorev, katsayi, !!k.sgk_li)
    const sinir = Math.floor(tavan / saatUcreti.ucret)
    if (mevcut + ek > sinir) sonuc.push({ id: k.id, ad: k.ad, mevcut, ek, sinir, tavan, saatUcreti })
  }
  return sonuc
}

const tl = (n: number) => '₺' + n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })

/** Onay penceresinde gösterilecek açıklama */
export function tavanAciklamasi(d: KoordinatorDurumu[]): string {
  const satirlar = d.map(k => {
    const asan = k.mevcut + k.ek - Math.max(k.sinir, k.mevcut)
    return k.mevcut >= k.sinir
      ? `• ${k.ad}: bu ay ${k.mevcut} saatle tavan ücrete (${tl(k.tavan)}) zaten ulaştı; eklenecek ${k.ek} saat ücrete yansımaz.`
      : `• ${k.ad}: ${k.mevcut} + ${k.ek} = ${k.mevcut + k.ek} saat olacak; tavan ücret ${tl(k.tavan)} en fazla ${k.sinir} saate karşılık geliyor. Aşan ${asan} saat ücrete yansımaz.`
  })
  const u = d[0].saatUcreti
  return `${satirlar.join('\n')}\n\nSaat ücreti: ${tl(u.ucret)} (${u.kaynak}).`
}
