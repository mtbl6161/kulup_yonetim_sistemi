import { supabase } from './supabase'
import type { IsletmeHareket } from './types'

// Kulüp defterinin kendiliğinden gelen satırları: Hesap Hareketleri (Ödeme Takibi aidatları ve dağıtım giderleri)
// ile kulüp tahsilat takibi ödemeleri. Kimlikler negatiftir; elle girilen isletme_defteri satırlarıyla çakışmaz.
export async function kulupOtomatikHareketler(yil: number): Promise<IsletmeHareket[]> {
  const bas = `${yil}-01-01`, bit = `${yil}-12-31`
  const [{ data: hh }, { data: tk }] = await Promise.all([
    supabase.from('hesap_hareketleri').select('id, tarih, tutar, tur, aciklama, dekont_no, kaynak').gte('tarih', bas).lte('tarih', bit),
    supabase.from('tahsilat_kayitlari').select('id, tarih, tutar, aciklama, tahsilat_kategorileri!inner(ad, birim), ogrenciler(ad, soyad)')
      .eq('tahsilat_kategorileri.birim', 'kulup').gte('tarih', bas).lte('tarih', bit),
  ])
  const ayi = (t: string) => Number(t.slice(5, 7))
  const hesap: IsletmeHareket[] = (hh || []).map(h => ({
    id: -h.id, tarih: h.tarih, tutar: Number(h.tutar), tur: h.tur, belge_no: h.dekont_no, aciklama: h.aciklama,
    kaynak: 'otomatik', otomatikKaynak: h.kaynak === 'tahsilat' ? 'Ödeme Takibi' : 'Hesap Hareketleri', ay: ayi(h.tarih), yil,
  }))
  type Bir<T> = T | T[] | null
  type TkSatir = { id: number; tarih: string; tutar: number | null; aciklama: string | null; tahsilat_kategorileri: Bir<{ ad: string }>; ogrenciler: Bir<{ ad: string; soyad: string }> }
  const tek = <T,>(v: Bir<T>): T | null => (Array.isArray(v) ? v[0] ?? null : v)
  const tahsilat: IsletmeHareket[] = ((tk || []) as unknown as TkSatir[]).filter(t => Number(t.tutar) > 0).map(t => {
    const ogr = tek(t.ogrenciler)
    const aciklama = [tek(t.tahsilat_kategorileri)?.ad, ogr ? `${ogr.ad} ${ogr.soyad}` : null, t.aciklama].filter(Boolean).join(' · ')
    return { id: -(1_000_000_000 + t.id), tarih: t.tarih, tutar: Number(t.tutar), tur: 'gelir', aciklama, kaynak: 'otomatik', otomatikKaynak: 'Tahsilat Takip', ay: ayi(t.tarih), yil }
  })
  return [...hesap, ...tahsilat].sort((a, b) => (a.tarih < b.tarih ? 1 : a.tarih > b.tarih ? -1 : 0))
}

/** Kulüp işletme defterine göre seçili ayın sonunda bankada kalan ve o ayın neti (defter kapağındaki "Ay Sonu Bankada Kalan" ile aynı hesap). */
export async function kulupAySonuBakiye(yil: number, ay: number): Promise<{ bakiye: number; ayNet: number }> {
  const [{ data: elle }, { data: devir }, otomatik] = await Promise.all([
    supabase.from('isletme_defteri').select('tur, tutar, ay').eq('birim', 'kulup').eq('yil', yil),
    supabase.from('isletme_devir').select('devreden_tutar').eq('birim', 'kulup').eq('yil', yil).maybeSingle(),
    kulupOtomatikHareketler(yil),
  ])
  const hareketler: Pick<IsletmeHareket, 'tur' | 'tutar' | 'ay'>[] = [...(elle || []), ...otomatik]
  const topla = (liste: typeof hareketler) => liste.reduce((s, h) => s + (h.tur === 'gelir' ? 1 : -1) * Number(h.tutar || 0), 0)
  return {
    bakiye: Number(devir?.devreden_tutar || 0) + topla(hareketler.filter(h => (h.ay || 0) <= ay)),
    ayNet: topla(hareketler.filter(h => h.ay === ay)),
  }
}
