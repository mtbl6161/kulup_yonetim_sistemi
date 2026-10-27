// Ücret bordro zarfı: ortak PDF stilinde, A4 dikey sayfaya iki zarf (kesim çizgili).
// Yazdırma, toplu zarf ve e-posta ekleri aynı çıktıyı kullanır.
import { pdfHazirla, pdfTablo, pdfAltBilgi, PDF_RENK, PDF_KENAR, type Pdf } from './pdf'
import { ayLabel, fmtTL } from './hesaplama'
import type { Ayarlar, BordroSatir } from './types'

type AutoTable = Awaited<ReturnType<typeof pdfHazirla>>['autoTable']

async function imzaGorseli(url?: string): Promise<string | null> {
  if (!url) return null
  try {
    const blob = await (await fetch(url)).blob()
    return await new Promise<string>((ok, hata) => {
      const r = new FileReader()
      r.onload = () => ok(String(r.result))
      r.onerror = hata
      r.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function sonY(pdf: Pdf) {
  return (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
}

function zarfCiz(pdf: Pdf, autoTable: AutoTable, row: BordroSatir, a: Ayarlar, ay: number, yil: number, ust: number, imza: string | null) {
  const W = pdf.internal.pageSize.getWidth()
  const sag = W - PDF_KENAR
  const s = row.sonuc, p = row.personel

  // Başlık: kurum solda, belge adı ve dönem sağda
  pdf.setTextColor(...PDF_RENK.metin)
  pdf.setFont('NotoSans', 'bold'); pdf.setFontSize(10)
  pdf.text((a.kurum_adi || 'ÇOCUK KULÜBÜ').toLocaleUpperCase('tr-TR'), PDF_KENAR, ust + 4, { maxWidth: 120 })
  pdf.text('ÜCRET BORDRO ZARFI', sag, ust + 4, { align: 'right' })
  pdf.setFont('NotoSans', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(...PDF_RENK.ikincil)
  if (a.adres) pdf.text(a.adres, PDF_KENAR, ust + 8.5, { maxWidth: 120 })
  pdf.text(ayLabel(ay, yil), sag, ust + 8.5, { align: 'right' })
  pdf.setDrawColor(...PDF_RENK.metin); pdf.setLineWidth(0.4)
  pdf.line(PDF_KENAR, ust + 11, sag, ust + 11)
  pdf.setTextColor(...PDF_RENK.metin)

  // Personel ve kurum bilgileri
  const etiket = { textColor: PDF_RENK.ikincil, cellWidth: 26 }
  autoTable(pdf, pdfTablo({
    theme: 'plain',
    body: [
      ['Adı soyadı', { content: p.ad, styles: { fontStyle: 'bold' } }, 'Vergi no', a.vergi_no || '-'],
      ['T.C. kimlik', p.tc || '-', 'SGK işveren no', a.sgk_no || '-'],
      ['Görevi', p.gorev || '-', 'SSK şube', a.ssk_sube || '-'],
      ['SGK no', p.sgk_no || '-', 'Ders saati', { content: `${row.toplamSaat} saat`, styles: { fontStyle: 'bold' } }],
    ],
    startY: ust + 13,
    styles: { fontSize: 7.5, cellPadding: { top: 0.6, bottom: 0.6, left: 0, right: 2 } },
    columnStyles: { 0: etiket, 2: etiket },
  }))

  // Kazançlar ve kesintiler tek tabloda; toplam satırları vurgulu
  const toplam = { fontStyle: 'bold' as const, fillColor: PDF_RENK.toplamZemin }
  const bolum = (ad: string) => [{ content: ad, colSpan: 2, styles: { fontStyle: 'bold' as const, fillColor: PDF_RENK.baslikZemin, fontSize: 7 } }]
  const satir = (ad: string, tutar: number, ek: object = {}) => [{ content: ad, styles: ek }, { content: fmtTL(tutar), styles: { halign: 'right' as const, ...ek } }]
  autoTable(pdf, pdfTablo({
    body: [
      bolum('ÖDEME KALEMLERİ'),
      satir('Aylık brüt ücret', s.brut),
      satir('Gelir vergisi matrahı (bu ay)', s.gv_matrah),
      satir('Devreden vergi matrahı (önceki aylar)', Number(p.yillik_matrah || 0), { textColor: PDF_RENK.ikincil }),
      satir('Kümülatif vergi matrahı', Number(p.yillik_matrah || 0) + (s.gv_matrah || 0)),
      satir('Kazançlar toplamı', s.brut, toplam),
      bolum('KESİNTİLER'),
      satir('SGK işçi payı (%14 + %1)', s.sgk_kisi + s.sgk_issizlik),
      satir('Gelir vergisi (istisna düşülmüş)', s.gv),
      satir('Damga vergisi (istisna düşülmüş)', s.dv),
      satir('Kesintiler toplamı', s.toplam_kesinti, toplam),
      [
        { content: 'ÖDENECEK NET ÜCRET', styles: { fontStyle: 'bold', fontSize: 9, fillColor: PDF_RENK.baslikZemin } },
        { content: fmtTL(s.net), styles: { fontStyle: 'bold', fontSize: 10, halign: 'right', fillColor: PDF_RENK.baslikZemin } },
      ],
    ],
    startY: sonY(pdf) + 2,
    styles: { fontSize: 7.5, cellPadding: { top: 0.9, bottom: 0.9, left: 2, right: 2 } },
    columnStyles: { 1: { cellWidth: 40 } },
  }))

  // İmzalar
  const y = sonY(pdf) + 5
  const orta = W / 2
  pdf.setFont('NotoSans', 'bold'); pdf.setFontSize(7.5)
  pdf.text('İŞVEREN TASDİK', PDF_KENAR + 45, y, { align: 'center' })
  pdf.text('PERSONEL İMZA', orta + 45, y, { align: 'center' })
  if (imza) {
    try { pdf.addImage(imza, PDF_KENAR + 30, y + 1, 30, 11) } catch { /* bozuk görsel atlanır */ }
  }
  pdf.setDrawColor(...PDF_RENK.cizgi); pdf.setLineWidth(0.2)
  pdf.line(PDF_KENAR + 15, y + 13, PDF_KENAR + 75, y + 13)
  pdf.line(orta + 15, y + 13, orta + 75, y + 13)
  pdf.setFontSize(7.5); pdf.text(a.mudur_adi || '', PDF_KENAR + 45, y + 17, { align: 'center' })
  pdf.setFont('NotoSans', 'normal'); pdf.setFontSize(7); pdf.setTextColor(...PDF_RENK.ikincil)
  pdf.text(a.mudur_unvani || 'Okul Müdürü', PDF_KENAR + 45, y + 20.5, { align: 'center' })
  pdf.text('Yukarıda dökümü yapılan net ücretimi teslim aldım.', orta + 45, y + 4, { align: 'center' })
  pdf.text('İmza / Tarih', orta + 45, y + 17, { align: 'center' })
  pdf.setTextColor(...PDF_RENK.metin)
}

/** Verilen satırlar için zarf PDF'i (sayfa başına iki zarf). Alt bilgi pdfAc / zarfBase64 ile eklenir. */
export async function zarfPdfUret(satirlar: BordroSatir[], ayarlar: Ayarlar, ay: number, yil: number): Promise<Pdf> {
  const { pdf, autoTable } = await pdfHazirla('portrait')
  const imza = await imzaGorseli(ayarlar.imza_url)
  const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight()
  const yari = H / 2
  satirlar.forEach((row, i) => {
    const alt = i % 2 === 1
    if (i > 0 && !alt) pdf.addPage()
    if (alt) {
      // Kesim çizgisi
      pdf.setDrawColor(...PDF_RENK.cizgi); pdf.setLineWidth(0.15)
      pdf.setLineDashPattern([1.5, 1.5], 0)
      pdf.line(PDF_KENAR, yari, W - PDF_KENAR, yari)
      pdf.setLineDashPattern([], 0)
    }
    zarfCiz(pdf, autoTable, row, ayarlar, ay, yil, alt ? yari + 8 : 10, imza)
  })
  return pdf
}

/** E-posta eki için tek zarfın base64 PDF'i. */
export async function zarfBase64(row: BordroSatir, ayarlar: Ayarlar, ay: number, yil: number): Promise<string> {
  const pdf = await zarfPdfUret([row], ayarlar, ay, yil)
  pdfAltBilgi(pdf, 'Ücret bordro zarfı')
  return pdf.output('datauristring').split(',')[1]
}
