// Klüp360 PDF ortak altyapısı: tüm resmî çıktılar aynı yazı tipi, başlık, tablo, imza ve alt bilgiyle üretilir.
// Çıktılar genelde siyah-beyaz yazdırıldığı için renk yalnızca hafif gri tonlarla ve "gelmedi / tatil" gibi durumlarda kullanılır.
import type { jsPDF } from 'jspdf'
import type { UserOptions } from 'jspdf-autotable'

export type Pdf = jsPDF
type Rgb = [number, number, number]

export const PDF_RENK = {
  metin: [17, 20, 26] as Rgb,
  ikincil: [90, 97, 110] as Rgb,
  cizgi: [150, 155, 165] as Rgb,
  baslikZemin: [236, 239, 244] as Rgb,
  toplamZemin: [244, 245, 248] as Rgb,
  kapaliZemin: [242, 243, 246] as Rgb,
  kapaliMetin: [130, 136, 146] as Rgb,
  tatilZemin: [252, 236, 237] as Rgb,
  hata: [170, 30, 38] as Rgb,
}

let fontOnbellek: Promise<[string, string]> | null = null
function fontlariYukle(): Promise<[string, string]> {
  async function b64(yol: string) {
    const buf = new Uint8Array(await (await fetch(yol)).arrayBuffer())
    let s = ''
    for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i])
    return btoa(s)
  }
  if (!fontOnbellek) {
    fontOnbellek = Promise.all([b64('/fonts/NotoSans-Regular.ttf'), b64('/fonts/NotoSans-Bold.ttf')])
    fontOnbellek.catch(() => { fontOnbellek = null })
  }
  return fontOnbellek
}

/** Türkçe karakter destekli (NotoSans) yeni A4 PDF ve autoTable döner. */
export async function pdfHazirla(yon: 'portrait' | 'landscape' = 'portrait') {
  const [{ default: JsPDF }, { default: autoTable }, [reg, bold]] = await Promise.all([
    import('jspdf'), import('jspdf-autotable'), fontlariYukle(),
  ])
  const pdf = new JsPDF({ orientation: yon, unit: 'mm', format: 'a4' })
  pdf.addFileToVFS('NotoSans-Regular.ttf', reg)
  pdf.addFileToVFS('NotoSans-Bold.ttf', bold)
  pdf.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal', 'Identity-H')
  pdf.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold', 'Identity-H')
  pdf.setFont('NotoSans')
  pdf.setTextColor(...PDF_RENK.metin)
  return { pdf, autoTable }
}

export const PDF_KENAR = 10

/**
 * Sayfa başlığı: kurum adı, belge adı, dönem/açıklama ve altında ince çizgi.
 * Tablonun başlayabileceği Y değerini döner.
 */
export function pdfBaslik(pdf: Pdf, o: { kurum?: string | null; baslik: string; alt?: string; sag?: string; y?: number }) {
  const W = pdf.internal.pageSize.getWidth()
  const y = o.y ?? 12
  pdf.setTextColor(...PDF_RENK.metin)
  pdf.setFont('NotoSans', 'bold'); pdf.setFontSize(11)
  pdf.text((o.kurum || 'ÇOCUK KULÜBÜ').toLocaleUpperCase('tr-TR'), W / 2, y, { align: 'center' })
  pdf.setFontSize(10)
  pdf.text(o.baslik.toLocaleUpperCase('tr-TR'), W / 2, y + 5.5, { align: 'center' })
  let son = y + 5.5
  if (o.alt) {
    pdf.setFont('NotoSans', 'normal'); pdf.setFontSize(8); pdf.setTextColor(...PDF_RENK.ikincil)
    pdf.text(o.alt, W / 2, y + 10.5, { align: 'center' })
    son = y + 10.5
  }
  if (o.sag) {
    pdf.setFont('NotoSans', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(...PDF_RENK.ikincil)
    pdf.text(o.sag, W - PDF_KENAR, y, { align: 'right' })
  }
  pdf.setDrawColor(...PDF_RENK.metin); pdf.setLineWidth(0.4)
  pdf.line(PDF_KENAR, son + 2.5, W - PDF_KENAR, son + 2.5)
  pdf.setTextColor(...PDF_RENK.metin)
  return son + 6
}

/** Tüm tablolar için ortak görünüm; sayfaya özel ayarlar üzerine yazılır. */
export function pdfTablo(ek: Partial<UserOptions> = {}): UserOptions {
  const { styles, headStyles, footStyles, bodyStyles, margin, ...kalan } = ek
  return {
    theme: 'grid',
    margin: margin ?? { top: 14, left: PDF_KENAR, right: PDF_KENAR, bottom: 14 },
    styles: { font: 'NotoSans', fontSize: 7.5, cellPadding: 1.2, valign: 'middle', textColor: PDF_RENK.metin, lineColor: PDF_RENK.cizgi, lineWidth: 0.1, overflow: 'linebreak', ...(styles || {}) },
    headStyles: { fillColor: PDF_RENK.baslikZemin, textColor: PDF_RENK.metin, fontStyle: 'bold', halign: 'center', valign: 'middle', ...(headStyles || {}) },
    bodyStyles: { ...(bodyStyles || {}) },
    footStyles: { fillColor: PDF_RENK.toplamZemin, textColor: PDF_RENK.metin, fontStyle: 'bold', ...(footStyles || {}) },
    ...kalan,
  }
}

/** Son tablonun bittiği Y. */
export function pdfSonY(pdf: Pdf, varsayilan = 30): number {
  return (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? varsayilan
}

/** Düzenleyen / Onaylayan imza alanı. Sığmazsa yeni sayfaya geçer. Bittiği Y'yi döner. */
export function pdfImza(pdf: Pdf, a: { duzenleyen_adi?: string | null; duzenleyen_unvani?: string | null; mudur_adi?: string | null; mudur_unvani?: string | null } | null, y: number, sabitAlt = false) {
  const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight()
  let ust = sabitAlt ? Math.max(y + 8, H - 34) : y + 8
  if (ust + 24 > H - 12) { pdf.addPage(); ust = 20 }
  const bloklar = [
    { x: PDF_KENAR + 45, baslik: 'DÜZENLEYEN', ad: a?.duzenleyen_adi || '', unvan: a?.duzenleyen_unvani || '' },
    { x: W - PDF_KENAR - 45, baslik: 'ONAYLAYAN', ad: a?.mudur_adi || '', unvan: a?.mudur_unvani || 'Okul Müdürü' },
  ]
  pdf.setTextColor(...PDF_RENK.metin)
  for (const b of bloklar) {
    pdf.setFont('NotoSans', 'bold'); pdf.setFontSize(8)
    pdf.text(b.baslik, b.x, ust, { align: 'center' })
    pdf.setFontSize(8); pdf.text(b.ad, b.x, ust + 14, { align: 'center' })
    pdf.setFont('NotoSans', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(...PDF_RENK.ikincil)
    pdf.text(b.unvan, b.x, ust + 18, { align: 'center' })
    pdf.setTextColor(...PDF_RENK.metin)
    pdf.setDrawColor(...PDF_RENK.cizgi); pdf.setLineWidth(0.2)
    pdf.line(b.x - 32, ust + 10, b.x + 32, ust + 10)
  }
  return ust + 20
}

/** Her sayfanın altına üretim bilgisi ve sayfa numarası yazar (çıktı almadan hemen önce çağrılır). */
export function pdfAltBilgi(pdf: Pdf, belge?: string) {
  const n = pdf.getNumberOfPages()
  const tarih = new Date().toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  for (let i = 1; i <= n; i++) {
    pdf.setPage(i)
    const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight()
    pdf.setDrawColor(...PDF_RENK.cizgi); pdf.setLineWidth(0.1)
    pdf.line(PDF_KENAR, H - 8, W - PDF_KENAR, H - 8)
    pdf.setFont('NotoSans', 'normal'); pdf.setFontSize(6.5); pdf.setTextColor(...PDF_RENK.ikincil)
    pdf.text(`Klüp360 · ${tarih}${belge ? ` · ${belge}` : ''}`, PDF_KENAR, H - 4.5)
    pdf.text(`Sayfa ${i} / ${n}`, W - PDF_KENAR, H - 4.5, { align: 'right' })
  }
  pdf.setTextColor(...PDF_RENK.metin)
}

/** Alt bilgiyi ekleyip PDF'i yeni sekmede açar. */
export function pdfAc(pdf: Pdf, belge?: string) {
  pdfAltBilgi(pdf, belge)
  const url = URL.createObjectURL(pdf.output('blob'))
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
