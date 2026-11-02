// Öğrenci ödeme dökümünün verisi ve PDF sayfası — tek öğrenci ve toplu döküm aynı düzeni kullanır
import { supabase } from '@/lib/supabase'
import { hepsiniCek } from '@/lib/hepsiniCek'
import { pdfHazirla, pdfBaslik, pdfTablo, pdfImza, pdfSonY, PDF_RENK, PDF_KENAR } from '@/lib/pdf'
import { fmtTL, tarihFmt } from '@/lib/hesaplama'
import { fmtVade } from '@/lib/taksit'
import { kulupOgrencisi, type Ayarlar, type Ogrenci, type TahsilatKategori, type TahsilatKaydi, type TahsilatTaksitPlani, type Tatil } from '@/lib/types'
import type { Dokum, KulupTahsilat } from './ogrenciDokumu'

export type KulupSatiri = KulupTahsilat & { aciklama?: string | null; dekont_no?: string | null }
export interface DokumVerisi {
  kategoriler: TahsilatKategori[]
  uyelikler: { kategori_id: number; ogrenci_id: number }[]
  kayitlar: TahsilatKaydi[]
  planlar: TahsilatTaksitPlani[]
  kulupTahsilat: KulupSatiri[]
  ayarlar: Ayarlar | null
  tatiller: Tatil[]
}

/** Döküm verisi: ogrenciId verilirse yalnız o öğrencinin, verilmezse tüm öğrencilerin kayıtları */
export async function dokumVerisiYukle(egitimYili: number, okulId: number | undefined, ogrenciId?: number): Promise<DokumVerisi> {
  function satirlar<T>(tablo: string, sutunlar: string, yillar?: number[]) {
    return hepsiniCek<T>((a, b) => {
      let q = supabase.from(tablo).select(sutunlar)
      if (ogrenciId) q = q.eq('ogrenci_id', ogrenciId)
      if (yillar) q = q.in('yil', yillar)
      return q.order('id').range(a, b) as unknown as PromiseLike<{ data: T[] | null; error: { message: string } | null }>
    })
  }
  const [ayr, tat, kat, uyelikler, kayitlar, planlar, kulupTahsilat] = await Promise.all([
    supabase.from('ayarlar').select('*').single(),
    supabase.from('tatiller').select('*').or(`okul_id.eq.${okulId ?? 0},okul_id.is.null`),
    supabase.from('tahsilat_kategorileri').select('*').order('sira').order('id'),
    satirlar<{ kategori_id: number; ogrenci_id: number }>('tahsilat_kategori_ogrenci', 'kategori_id, ogrenci_id'),
    satirlar<TahsilatKaydi>('tahsilat_kayitlari', '*'),
    satirlar<TahsilatTaksitPlani>('tahsilat_taksit_planlari', '*'),
    satirlar<KulupSatiri>('tahsilat', 'ogrenci_id, ay, yil, tarih, tutar, aciklama, dekont_no', [egitimYili, egitimYili + 1]),
  ])
  if (kat.error) throw new Error(kat.error.message)
  return { kategoriler: kat.data || [], uyelikler, kayitlar, planlar, kulupTahsilat, ayarlar: ayr.data || null, tatiller: tat.data || [] }
}

/** Toplu dökümde her öğrenciye yalnız kendi kayıtları verilir */
export function ogrenciVerisi(v: DokumVerisi, ogrenciId: number): DokumVerisi {
  return {
    ...v,
    uyelikler: v.uyelikler.filter(x => x.ogrenci_id === ogrenciId),
    kayitlar: v.kayitlar.filter(x => x.ogrenci_id === ogrenciId),
    planlar: v.planlar.filter(x => x.ogrenci_id === ogrenciId),
    kulupTahsilat: v.kulupTahsilat.filter(x => x.ogrenci_id === ogrenciId),
  }
}

export function dokumBilgileri(o: Ogrenci, egitimYili: number): [string, string][] {
  return [
    ['Adı Soyadı', `${o.ad} ${o.soyad}`],
    ['Sınıfı', o.sinif || '—'],
    ['Öğrenci türü', kulupOgrencisi(o) ? 'Kulüp öğrencisi' : 'Okul öğrencisi'],
    ...(o.veli_ad || o.anne_adi ? [['Veli', o.veli_ad || o.anne_adi || ''] as [string, string]] : []),
    ...(o.anne_tel ? [['Telefon', o.anne_tel] as [string, string]] : []),
    ['Eğitim yılı', `${egitimYili}-${egitimYili + 1}`],
  ]
}

type Pdf = Awaited<ReturnType<typeof pdfHazirla>>['pdf']
type AutoTable = Awaited<ReturnType<typeof pdfHazirla>>['autoTable']

/** Bir öğrencinin döküm sayfası (sayfa başından başlar, gerekirse taşar) */
export function dokumSayfasi(pdf: Pdf, autoTable: AutoTable, p: { kurumAdi: string; ayarlar: Ayarlar | null; ogrenci: Ogrenci; dokum: Dokum; egitimYili: number; bugun: string }) {
  const { dokum, egitimYili } = p
  let y = pdfBaslik(pdf, { kurum: p.kurumAdi, baslik: 'Öğrenci Ödeme Dökümü', alt: `${egitimYili}-${egitimYili + 1} Eğitim Öğretim Yılı · Düzenlenme: ${tarihFmt(p.bugun)}` })
  autoTable(pdf, pdfTablo({
    startY: y, theme: 'plain', body: dokumBilgileri(p.ogrenci, egitimYili),
    styles: { fontSize: 8.5, cellPadding: 0.9 }, columnStyles: { 0: { cellWidth: 32, fontStyle: 'bold' } },
  }))
  y = pdfSonY(pdf) + 4
  const baslikYaz = (t: string) => { pdf.setFont('NotoSans', 'bold'); pdf.setFontSize(9); pdf.setTextColor(...PDF_RENK.metin); pdf.text(t, PDF_KENAR, y); y += 2 }
  baslikYaz(`YAPILAN ÖDEMELER (${dokum.odemeler.length})`)
  autoTable(pdf, pdfTablo({
    startY: y,
    head: [['Sıra', 'Ödeme Tarihi', 'Nereye', 'Ödeme Kalemi', 'Dönem', 'Tutar (₺)', 'Açıklama']],
    body: dokum.odemeler.length
      ? dokum.odemeler.map((x, i) => [String(i + 1), x.tarih ? tarihFmt(x.tarih) : '—', x.birim, x.kalem, x.donem, x.tutar != null ? fmtTL(x.tutar) : '—', x.aciklama || ''])
      : [[{ content: 'Bu eğitim yılında kayıtlı ödeme yok.', colSpan: 7, styles: { halign: 'center', textColor: PDF_RENK.ikincil } }]],
    foot: [[{ content: 'TOPLAM ÖDENEN', colSpan: 5, styles: { halign: 'right' } }, { content: fmtTL(dokum.toplamOdenen), styles: { halign: 'right' } }, '']],
    columnStyles: { 0: { cellWidth: 9, halign: 'center' }, 1: { cellWidth: 20, halign: 'center' }, 2: { cellWidth: 26 }, 3: { cellWidth: 38 }, 4: { cellWidth: 28 }, 5: { cellWidth: 22, halign: 'right' }, 6: { fontSize: 6.5 } },
  }))
  y = pdfSonY(pdf) + 6
  if (y > pdf.internal.pageSize.getHeight() - 40) { pdf.addPage(); y = 16 }
  baslikYaz(`ÖDENMEMİŞ / BEKLEYEN KALEMLER (${dokum.bekleyenler.length})`)
  autoTable(pdf, pdfTablo({
    startY: y,
    head: [['Sıra', 'Nereye', 'Ödeme Kalemi', 'Dönem', 'Vade', 'Tutar (₺)']],
    body: dokum.bekleyenler.length
      ? dokum.bekleyenler.map((x, i) => [String(i + 1), x.birim, x.kalem, x.donem, x.vade ? fmtVade(x.vade) : '', x.tutar != null ? fmtTL(x.tutar) : '—'])
      : [[{ content: 'Ödenmemiş kalem yok.', colSpan: 6, styles: { halign: 'center', textColor: PDF_RENK.ikincil } }]],
    foot: dokum.toplamBekleyen > 0 ? [[{ content: 'TOPLAM', colSpan: 5, styles: { halign: 'right' } }, { content: fmtTL(dokum.toplamBekleyen), styles: { halign: 'right' } }]] : undefined,
    columnStyles: { 0: { cellWidth: 9, halign: 'center' }, 1: { cellWidth: 30 }, 4: { cellWidth: 20, halign: 'center' }, 5: { cellWidth: 24, halign: 'right' } },
  }))
  pdfImza(pdf, p.ayarlar, pdfSonY(pdf))
}
