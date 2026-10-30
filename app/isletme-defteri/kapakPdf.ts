// İşletme hesabı defterinin kapağı: resmî başlık, hesap adı, devreden tutar ve aylık gelir/gider/bankada kalan çizelgesi.
import { pdfHazirla, pdfTablo, PDF_RENK, type Pdf, type RowInput } from '@/lib/pdf'
import { fmtTL, AYLAR } from '@/lib/hesaplama'
import type { Birim } from '@/lib/types'

type AutoTable = Awaited<ReturnType<typeof pdfHazirla>>['autoTable']

export const BIRIM_HESAP_ADI: Record<Birim, string> = {
  okul: 'Okul Hesabı',
  kulup: 'Çocuk Kulübü Hesabı',
  oab: 'Okul Aile Birliği Hesabı',
}

/** Resmî yazı başlığının makam satırları: merkez ilçede valilik / il MEM, diğer ilçelerde kaymakamlık / ilçe MEM. */
export function makamSatirlari(ilAd?: string | null, ilceAd?: string | null): string[] {
  const buyuk = (s: string) => s.trim().toLocaleUpperCase('tr-TR')
  if (ilceAd && buyuk(ilceAd) !== 'MERKEZ') return [`${buyuk(ilceAd)} KAYMAKAMLIĞI`, 'İlçe Millî Eğitim Müdürlüğü']
  if (ilAd) return [`${buyuk(ilAd)} VALİLİĞİ`, 'İl Millî Eğitim Müdürlüğü']
  return []
}

// Kayıtta küçük harfle girilmiş okul adında her kelimenin baş harfi büyütülür; kelimenin geri kalanına
// dokunulmaz ki "TOKİ" gibi kısaltmalar bozulmasın.
const basHarfleriBuyuk = (s: string) => s.replace(/(^|\s)(\S)/g, (_, bosluk: string, harf: string) => bosluk + harf.toLocaleUpperCase('tr-TR'))

export interface KapakVerisi {
  makam: string[]
  okulAdi: string
  hesapAdi: string
  yil: number
  devreden: number
  aylar: { ay: number; gelir: number; gider: number; bakiye: number }[]
}

/** Kapağı pdf'in o anki sayfasına çizer. Henüz gelmemiş ve hareketi olmayan aylar elle doldurulmak üzere boş kalır. */
export function defterKapagi(pdf: Pdf, autoTable: AutoTable, k: KapakVerisi) {
  const W = pdf.internal.pageSize.getWidth()
  const M = 18
  const genislik = W - 2 * M
  const bugun = new Date()
  const gelecek = (ay: number) => k.yil > bugun.getFullYear() || (k.yil === bugun.getFullYear() && ay > bugun.getMonth() + 1)

  pdf.setTextColor(...PDF_RENK.metin)
  pdf.setFont('NotoSans', 'bold'); pdf.setFontSize(13)
  let y = 32
  for (const satir of ['T.C.', ...k.makam, basHarfleriBuyuk(k.okulAdi)].filter(Boolean)) {
    pdf.text(satir, W / 2, y, { align: 'center', maxWidth: genislik })
    y += 6.5
  }

  // Hesap adı bandı
  const bandY = 100, bandH = 16
  pdf.setFillColor(...PDF_RENK.baslikZemin); pdf.setDrawColor(...PDF_RENK.metin); pdf.setLineWidth(0.3)
  pdf.rect(M, bandY, genislik, bandH, 'FD')
  pdf.setFontSize(15)
  pdf.text(k.hesapAdi, W / 2, bandY + bandH / 2, { align: 'center', baseline: 'middle' })

  pdf.setFontSize(13)
  pdf.text(`${k.yil} Yılı İşletme Hesabı Defteri`, W / 2, bandY + bandH + 13, { align: 'center' })

  const ortak = { margin: { top: 14, bottom: 14, left: M, right: M }, styles: { fontSize: 10, cellPadding: 1.8, minCellHeight: 8, lineColor: PDF_RENK.metin, lineWidth: 0.2 } }

  autoTable(pdf, pdfTablo({
    ...ortak,
    startY: bandY + bandH + 22,
    tableWidth: 100,
    body: [[{ content: 'Devreden Tutar', styles: { fontStyle: 'bold' } }, { content: fmtTL(k.devreden), styles: { halign: 'right' } }]],
    columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 50 } },
  }))
  const devirSon = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

  const dolu = k.aylar.filter(r => r.gelir || r.gider || !gelecek(r.ay))
  const sonDoluAy = dolu.length ? dolu[dolu.length - 1].ay : 0
  const body: RowInput[] = k.aylar.map(r => {
    const bos = !r.gelir && !r.gider && gelecek(r.ay)
    return [
      r.ay,
      { content: AYLAR[r.ay], styles: { fontStyle: 'bold' } },
      bos ? '' : fmtTL(r.gelir),
      bos ? '' : fmtTL(r.gider),
      { content: bos ? '' : fmtTL(r.bakiye), styles: r.ay === sonDoluAy ? { fontStyle: 'bold' } : {} },
    ]
  })
  const toplam = (alan: 'gelir' | 'gider') => k.aylar.reduce((s, r) => s + r[alan], 0)

  autoTable(pdf, pdfTablo({
    ...ortak,
    startY: devirSon + 8,
    tableWidth: genislik,
    head: [[{ content: '', colSpan: 2 }, 'Gelir', 'Gider', 'Ay Sonu Bankada Kalan']],
    body,
    foot: [[{ content: 'TOPLAM', colSpan: 2, styles: { halign: 'right' } }, fmtTL(toplam('gelir')), fmtTL(toplam('gider')), '']],
    columnStyles: {
      0: { cellWidth: 9, halign: 'center', fontSize: 9 },
      1: { cellWidth: 32 },
      2: { cellWidth: 42, halign: 'right' },
      3: { cellWidth: 42, halign: 'right' },
      4: { cellWidth: 49, halign: 'right' },
    },
    footStyles: { halign: 'right' },
  }))
}
