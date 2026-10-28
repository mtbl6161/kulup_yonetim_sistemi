// Bordro özeti: personel sıralaması, sütun toplamları ve resmî özet PDF'i (ortak PDF stili).
import { pdfHazirla, pdfBaslik, pdfTablo, pdfImza, pdfSonY, pdfAc, PDF_RENK } from './pdf'
import type { CellInput } from './pdf'
import { AYLAR, fmt, gunSayisi } from './hesaplama'
import type { Ayarlar, BordroSatir } from './types'

/** Yönerge sırası: başkan, koordinatör, öğretmen, usta öğretici, yardımcı, muhasebe, temizlik, denetim; sonra ada göre */
export function bordroSirala(satirlar: BordroSatir[]): BordroSatir[] {
  return [...satirlar].sort((a, b) => {
    const getPriority = (gorev: string = '') => {
      const g = gorev.toLowerCase()
      if (g.includes('başkan') && !g.includes('yardımcısı') && !g.includes('yrd')) return 1
      if (g.includes('koordinatör')) return 2
      if (g.includes('öğretmen') && !g.includes('usta')) return 3
      if (g.includes('usta')) return 4
      if (g.includes('yardımcı') || g.includes('yrd')) return 5
      if (g.includes('muhasebe') || g.includes('memur')) return 6
      if (g.includes('temizlik') || g.includes('hizmet')) return 7
      if (g.includes('denetim')) return 8
      return 9
    }
    const p1 = getPriority(a.personel.gorev)
    const p2 = getPriority(b.personel.gorev)
    if (p1 !== p2) return p1 - p2
    return (a.personel.ad || '').localeCompare(b.personel.ad || '', 'tr')
  })
}

/** Bordro tablosunun alt toplam satırı */
export function bordroToplamlari(sortedSatirlar: BordroSatir[]) {
  const toplamBrut           = Math.round(sortedSatirlar.reduce((s, r) => s + r.sonuc.brut, 0) * 100) / 100
  const toplamGvMatrah        = Math.round(sortedSatirlar.reduce((s, r) => s + r.sonuc.gv_matrah, 0) * 100) / 100
  const toplamGvHesaplanan    = Math.round(sortedSatirlar.reduce((s, r) => s + r.sonuc.gv_hesaplanan, 0) * 100) / 100
  const toplamGvIstisna       = Math.round(sortedSatirlar.reduce((s, r) => s + r.sonuc.gv_istisna, 0) * 100) / 100
  const toplamGv              = Math.round(sortedSatirlar.reduce((s, r) => s + r.sonuc.gv, 0) * 100) / 100
  const toplamDvHesaplanan    = Math.round(sortedSatirlar.reduce((s, r) => s + r.sonuc.dv_hesaplanan, 0) * 100) / 100
  const toplamDvIstisna       = Math.round(sortedSatirlar.reduce((s, r) => s + r.sonuc.dv_istisna, 0) * 100) / 100
  const toplamDv              = Math.round(sortedSatirlar.reduce((s, r) => s + r.sonuc.dv, 0) * 100) / 100
  const toplamSgkKisi         = Math.round(sortedSatirlar.reduce((s, r) => s + r.sonuc.sgk_kisi, 0) * 100) / 100
  const toplamSgkIssiz        = Math.round(sortedSatirlar.reduce((s, r) => s + r.sonuc.sgk_issizlik, 0) * 100) / 100
  const toplamKesinti         = Math.round(sortedSatirlar.reduce((s, r) => s + r.sonuc.toplam_kesinti, 0) * 100) / 100
  const toplamNet             = Math.round(sortedSatirlar.reduce((s, r) => s + r.sonuc.net, 0) * 100) / 100
  const toplamSgkIsv          = Math.round(sortedSatirlar.reduce((s, r) => s + r.sonuc.sgk_isveren, 0) * 100) / 100
  const toplamSaat            = sortedSatirlar.reduce((s, r) => s + r.toplamSaat, 0)
  const toplamSgkDetayKisa    = Math.round(sortedSatirlar.reduce((s, r) => s + (r.personel.sgk_li ? r.sonuc.sgk_detay_kisa : 0), 0) * 100) / 100
  const toplamSgkDetayMalul   = Math.round(sortedSatirlar.reduce((s, r) => s + (r.personel.sgk_li ? r.sonuc.sgk_detay_malulluk : 0), 0) * 100) / 100
  const toplamSgkDetaySaglik  = Math.round(sortedSatirlar.reduce((s, r) => s + (r.personel.sgk_li ? r.sonuc.sgk_detay_saglik : 0), 0) * 100) / 100
  const toplamSgkDetayIssiz   = Math.round(sortedSatirlar.reduce((s, r) => s + (r.personel.sgk_li ? r.sonuc.sgk_detay_issizlik : 0), 0) * 100) / 100
  const toplamSgkDetayToplam  = Math.round(sortedSatirlar.reduce((s, r) => s + (r.personel.sgk_li ? r.sonuc.sgk_detay_toplam : 0), 0) * 100) / 100
  return { toplamBrut, toplamGvMatrah, toplamGvHesaplanan, toplamGvIstisna, toplamGv, toplamDvHesaplanan, toplamDvIstisna, toplamDv, toplamSgkKisi, toplamSgkIssiz, toplamKesinti, toplamNet, toplamSgkIsv, toplamSaat, toplamSgkDetayKisa, toplamSgkDetayMalul, toplamSgkDetaySaglik, toplamSgkDetayIssiz, toplamSgkDetayToplam }
}

export async function bordroOzetPdf({ satirlar: sortedSatirlar, ayarlar, ay, yil }: { satirlar: BordroSatir[]; ayarlar: Ayarlar | null; ay: number; yil: number }) {
  const sonGun = gunSayisi(yil, ay)
  const { toplamBrut, toplamGvMatrah, toplamGvHesaplanan, toplamGvIstisna, toplamGv, toplamDvHesaplanan, toplamDvIstisna, toplamDv, toplamSgkKisi, toplamSgkIssiz, toplamKesinti, toplamNet, toplamSaat, toplamSgkDetayKisa, toplamSgkDetayMalul, toplamSgkDetaySaglik, toplamSgkDetayIssiz, toplamSgkDetayToplam } = bordroToplamlari(sortedSatirlar)
  const { pdf, autoTable } = await pdfHazirla('landscape')
  const M = 5 // geniş tablo (287 mm) için dar kenar

  const baslangicY = pdfBaslik(pdf, {
    kurum: ayarlar?.kurum_adi,
    baslik: 'Bordro özeti',
    alt: `01 ${AYLAR[ay]} ${yil} – ${sonGun} ${AYLAR[ay]} ${yil} tarihleri arası`,
  })

  // Siyah-beyaz baskıya uygun ortak tonlar
  const C = {
    personel:  PDF_RENK.baslikZemin,
    vergi:     PDF_RENK.baslikZemin,
    sgkKes:    PDF_RENK.baslikZemin,
    kurumSgk:  PDF_RENK.baslikZemin,
    totRow:    PDF_RENK.toplamZemin,
    net:       [255, 255, 255] as [number, number, number],
    header:    PDF_RENK.baslikZemin,
  }

  // ── Tablo başlıkları (2 satır) ─────────────────────────────────────────
  const ROW1 = [
    { content: 'PERSONEL BİLGİLERİ',               colSpan: 3, styles: { fillColor: C.personel,  textColor: [0,0,0] as [number,number,number] } },
    { content: 'PUANTAJ & BRÜT',                    colSpan: 4, styles: { fillColor: C.personel,  textColor: [0,0,0] as [number,number,number] } },
    { content: 'VERGİ HESAPLAMALARI (GV & DV)',      colSpan: 8, styles: { fillColor: C.vergi,     textColor: [0,0,0] as [number,number,number] } },
    { content: 'SGK KESİNTİLERİ & NET ÜCRET',       colSpan: 4, styles: { fillColor: C.sgkKes,    textColor: [0,0,0] as [number,number,number] } },
    { content: 'KURUM BÜTÇESİNDEN ÖDENECEK SGK',   colSpan: 6, styles: { fillColor: C.kurumSgk,  textColor: [0,0,0] as [number,number,number] } },
  ]
// ... (ROW2 mapping remains same)
  const ROW2 = [
    'S.N.',
    'GÖREVİ',
    'ADI SOYADI',
    'TC KİMLİK',
    'Ders\nSaati',
    'Saat\nÜcreti',
    'Brüt Ücret',
    'GV Matrah',
    'Oran',
    'Hes.GV',
    'GV İst.',
    'GV',
    'Hes.DV',
    'DV İst.',
    'DV',
    'SGK\n%14',
    'İşsiz\n%1',
    'Kes.Top.',
    'Net Öd.',
    '%2.25\nKısaV',
    '%20\nEmekli',
    '%12.5\nSağlık',
    '%3\nİşsiz',
    'TOTAL\nSGK',
    'İmza',
  ]

  // ── Veri satırları ─────────────────────────────────────────────────────
  const body = sortedSatirlar.map((s, i) => [
    i + 1,
    s.personel.gorev,
    s.personel.ad + (s.personel.aktif === false ? ' (Ayrıldı)' : ''),
    s.personel.tc || '-',
    s.toplamSaat || 0,
    typeof s.saatUcreti === 'string' ? s.saatUcreti : fmt(Number(s.saatUcreti)),
    fmt(s.sonuc.brut),
    fmt(s.sonuc.gv_matrah),
    `${fmt(s.sonuc.gv_oran * 100)}%`,
    fmt(s.sonuc.gv_hesaplanan),
    fmt(s.sonuc.gv_istisna),
    fmt(s.sonuc.gv),
    fmt(s.sonuc.dv_hesaplanan),
    fmt(s.sonuc.dv_istisna),
    fmt(s.sonuc.dv),
    s.personel.sgk_li ? fmt(s.sonuc.sgk_kisi)            : '0,00',
    s.personel.sgk_li ? fmt(s.sonuc.sgk_issizlik)        : '0,00',
    fmt(s.sonuc.toplam_kesinti),
    fmt(s.sonuc.net),
    s.personel.sgk_li ? fmt(s.sonuc.sgk_detay_kisa)      : '0,00',
    s.personel.sgk_li ? fmt(s.sonuc.sgk_detay_malulluk)  : '0,00',
    s.personel.sgk_li ? fmt(s.sonuc.sgk_detay_saglik)    : '0,00',
    s.personel.sgk_li ? fmt(s.sonuc.sgk_detay_issizlik)  : '0,00',
    s.personel.sgk_li ? fmt(s.sonuc.sgk_detay_toplam)    : '0,00',
    '',  // İmza
  ])

  // ── Toplam satırı ─────────────────────────────────────────────────────
  const foot = [[
    { content: 'TOPLAM', colSpan: 3, styles: { fontStyle: 'bold', fillColor: C.totRow, textColor: [0,0,0], halign: 'left' } },
    { content: '',                   styles: { fillColor: C.totRow } }, 
    { content: String(toplamSaat),   styles: { fontStyle: 'bold', fillColor: C.totRow, textColor: [0,0,0], halign: 'center' } },
    { content: '',                   styles: { fillColor: C.totRow } }, 
    { content: fmt(toplamBrut),      styles: { fontStyle: 'bold', fillColor: C.totRow, textColor: [0,0,0], halign: 'right' } },
    { content: fmt(toplamGvMatrah),  styles: { fontStyle: 'bold', fillColor: C.totRow, textColor: [0,0,0], halign: 'right' } },
    { content: '',                   styles: { fillColor: C.totRow } }, 
    { content: fmt(toplamGvHesaplanan),  styles: { fontStyle: 'bold', fillColor: C.totRow, textColor: [0,0,0], halign: 'right' } },
    { content: fmt(toplamGvIstisna),     styles: { fontStyle: 'bold', fillColor: C.totRow, textColor: [0,0,0], halign: 'right' } },
    { content: fmt(toplamGv),            styles: { fontStyle: 'bold', fillColor: C.totRow, textColor: [0,0,0], halign: 'right' } },
    { content: fmt(toplamDvHesaplanan),  styles: { fontStyle: 'bold', fillColor: C.totRow, textColor: [0,0,0], halign: 'right' } },
    { content: fmt(toplamDvIstisna),     styles: { fontStyle: 'bold', fillColor: C.totRow, textColor: [0,0,0], halign: 'right' } },
    { content: fmt(toplamDv),            styles: { fontStyle: 'bold', fillColor: C.totRow, textColor: [0,0,0], halign: 'right' } },
    { content: fmt(toplamSgkKisi),       styles: { fontStyle: 'bold', fillColor: C.totRow, textColor: [0,0,0], halign: 'right' } },
    { content: fmt(toplamSgkIssiz),      styles: { fontStyle: 'bold', fillColor: C.totRow, textColor: [0,0,0], halign: 'right' } },
    { content: fmt(toplamKesinti),       styles: { fontStyle: 'bold', fillColor: C.totRow, textColor: [0,0,0], halign: 'right' } },
    { content: fmt(toplamNet),           styles: { fontStyle: 'bold', fillColor: C.totRow, textColor: [0,0,0], halign: 'right' } },
    { content: fmt(toplamSgkDetayKisa),    styles: { fontStyle: 'bold', fillColor: C.totRow, textColor: [0,0,0], halign: 'right' } },
    { content: fmt(toplamSgkDetayMalul),   styles: { fontStyle: 'bold', fillColor: C.totRow, textColor: [0,0,0], halign: 'right' } },
    { content: fmt(toplamSgkDetaySaglik),  styles: { fontStyle: 'bold', fillColor: C.totRow, textColor: [0,0,0], halign: 'right' } },
    { content: fmt(toplamSgkDetayIssiz),   styles: { fontStyle: 'bold', fillColor: C.totRow, textColor: [0,0,0], halign: 'right' } },
    { content: fmt(toplamSgkDetayToplam),  styles: { fontStyle: 'bold', fillColor: C.totRow, textColor: [0,0,0], halign: 'right' } },
    { content: '',                         styles: { fillColor: C.totRow } },
  ] as CellInput[]]

  // ── autoTable ──────────────────────────────────────────────────────────
  autoTable(pdf, pdfTablo({
    head: [ROW1, ROW2],
    body,
    foot,
    startY: baslangicY,
    margin: { top: 14, right: M, bottom: 14, left: M },
    tableWidth: 'wrap',
    styles: { fontSize: 5.0, cellPadding: 0.8, halign: 'right' },
    headStyles: { fontSize: 5.5, cellPadding: 1.2 },
    footStyles: { fontSize: 4.8, cellPadding: { top: 2, right: 0.5, bottom: 2, left: 0.5 }, minCellHeight: 6 },
    columnStyles: {
      // Toplam = 287mm = 297mm A4 landscape - (5+5)mm kenar boşluğu
      0:  { cellWidth:  5, halign: 'center' },          // S.N.
      1:  { cellWidth: 20, halign: 'left'   },           // GÖREVİ
      2:  { cellWidth: 32, halign: 'left', fontStyle: 'bold' }, // ADI SOYADI (uzun isimler)
      3:  { cellWidth: 17, halign: 'center' },           // TC KİMLİK (11 hane)
      4:  { cellWidth:  8, halign: 'center' },           // Ders Saati
      5:  { cellWidth:  9  },                            // Saat Ücreti
      6:  { cellWidth: 13  },                            // Brüt Ücret
      7:  { cellWidth: 12  },                            // GV Matrahı
      8:  { cellWidth:  7, halign: 'center' },           // Oran
      9:  { cellWidth:  9  },                            // Hes. GV
      10: { cellWidth:  9  },                            // GV İst.
      11: { cellWidth:  9  },                            // GV
      12: { cellWidth:  9  },                            // Hes. DV
      13: { cellWidth:  9  },                            // DV İst.
      14: { cellWidth:  9  },                            // DV
      15: { cellWidth: 10  },                            // SGK %14
      16: { cellWidth:  9  },                            // İşsiz %1
      17: { cellWidth: 11  },                            // Kes. Top.
      18: { cellWidth: 12, fontStyle: 'bold' },          // Net Öd.
      19: { cellWidth:  9  },                            // Kısa V %2.25
      20: { cellWidth:  9  },                            // Emekli %20
      21: { cellWidth:  9  },                            // Sağlık %12.5
      22: { cellWidth:  9  },                            // İşsizlik %3
      23: { cellWidth: 11  },                            // TOTAL SGK
      24: { cellWidth: 21, halign: 'center' },           // İmza
      // Kontrol: 5+20+32+17+8+9+13+12+7+9+9+9+9+9+9+10+9+11+12+9+9+9+9+11+21 = 287
    },
  }))

  // ── Düzenleyen / Onaylayan imza blokları ───────────────────────────────
  pdfImza(pdf, {
    duzenleyen_adi: ayarlar?.duzenleyen_adi,
    duzenleyen_unvani: ayarlar?.duzenleyen_unvani || 'Büro Personeli',
    mudur_adi: ayarlar?.mudur_adi,
    mudur_unvani: ayarlar?.mudur_unvani || 'Okul Müdürü / Kulüp Başkanı',
  }, pdfSonY(pdf, 190))

  pdfAc(pdf, 'Bordro özeti')
}
