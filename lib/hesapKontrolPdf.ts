// Denetçi hesap kontrolünün PDF raporu: genel kontroller, gider dağıtımı, personel bazında bordro
// (adlarla ve genel toplamla), personel bulguları ve SGK'lı / kadrolu kırılımlı muhtasar beyanname özeti.
// Ekrandaki hesap kontrolü sonucunu olduğu gibi kullanır; yeniden hesap yapmaz.
import { AYLAR, fmt } from './hesaplama'
import { muhtasarOzeti, type HesapKontrolSonuc, type KisiKontrol, type KontrolBulgu, type KontrolDurum } from './hesapKontrol'
import { pdfHazirla, pdfBaslik, pdfTablo, pdfSonY, pdfIndir, PDF_RENK, PDF_KENAR, type Pdf } from './pdf'

const DURUM_AD: Record<KontrolDurum, string> = { ok: 'Uygun', uyari: 'Uyarı', hata: 'Hata', bilgi: 'Bilgi' }

/** Personel tablosunda sütunun hangi bulgularla ilgili olduğu (ekrandaki hücre renklendirmesiyle aynı) */
const SUTUN_BULGULARI: Record<string, string[]> = {
  brut: ['Tavan aşılmış', 'Olması gerekenden fazla ödeme', 'Olması gerekenden az ödeme', 'Aynı kişiye birden fazla görevden ödeme'],
  sgk: ['SGK işçi payı hatalı', 'İşsizlik sigortası işçi payı hatalı', 'Kadrolu personelden SGK kesintisi'],
  gvMatrah: ['Gelir vergisi matrahı hatalı', 'Gelir vergisi oranı dilim dışında', 'Gelir vergisi hesaplanmamış', 'Bordrodaki vergi oranı geçersiz'],
  istisna: ['Gelir vergisi istisnası fazla uygulanmış', 'Damga vergisi istisnası fazla uygulanmış', 'Damga vergisi hatalı'],
  net: ['Net ödenen tutmuyor', 'Toplam kesinti tutmuyor', 'Kesilen gelir vergisi tutmuyor', 'Kesilen damga vergisi tutmuyor', 'Denetim yetkilisinden kesinti yapılmış'],
}

const sayi = (v: unknown) => Number(v || 0)
const issizlik = (k: KisiKontrol) => sayi(k.satir.sgk_issizlik_kisi ?? k.satir.sgk_issizlik)

function bulguMetni(b: KontrolBulgu): string {
  const fark = b.beklenen != null && b.bulunan != null ? b.bulunan - b.beklenen : null
  return [
    b.aciklama,
    fark != null ? `Olması gereken ${fmt(b.beklenen)} · Bordroda ${fmt(b.bulunan)} · Fark ${fark > 0 ? '+' : ''}${fmt(fark)}` : null,
    b.kural ? `Kural: ${b.kural}` : null,
  ].filter(Boolean).join('\n')
}

/** Bölüm başlığı yazar; altındaki ilk satırlara (gerekli mm) yer kalmadıysa yeni sayfaya geçer.
 *  Tablonun başlayacağı Y'yi döner. */
function bolum(pdf: Pdf, y: number, baslik: string, gerekli = 30): number {
  if (y + gerekli > pdf.internal.pageSize.getHeight() - 14) { pdf.addPage(); y = 14 }
  pdf.setFont('NotoSans', 'bold'); pdf.setFontSize(9.5); pdf.setTextColor(...PDF_RENK.metin)
  pdf.text(baslik.toLocaleUpperCase('tr-TR'), PDF_KENAR, y + 4)
  return y + 6
}

/** Durum sütununu renklendirir (siyah-beyaz çıktıda kalın yazı da ayırt eder) */
function durumBoya(durum: KontrolDurum | undefined, styles: { textColor?: unknown; fontStyle?: string }) {
  if (durum === 'hata') { styles.textColor = PDF_RENK.hata; styles.fontStyle = 'bold' }
  else if (durum === 'uyari') { styles.textColor = [138, 82, 0]; styles.fontStyle = 'bold' }
}

export async function hesapKontrolPdf(sonuc: HesapKontrolSonuc, o: { okulAd: string; ay: number; yil: number }) {
  const { pdf, autoTable: tabloCiz } = await pdfHazirla('landscape')
  // Satır sayfa sonunda bölünmez; toplam satırı yalnız tablonun bittiği sayfada yazılır
  const autoTable: typeof tabloCiz = (p, ayar) => tabloCiz(p, { rowPageBreak: 'avoid', showFoot: 'lastPage', ...ayar })
  const { genel, dagitim, kisiler, muhtasar } = sonuc
  const donem = `${AYLAR[o.ay]} ${o.yil}`

  let y = pdfBaslik(pdf, { kurum: o.okulAd, baslik: `Hesap Kontrol Raporu · ${donem}` })

  // ── Genel kontroller ──
  y = bolum(pdf, y, 'Genel kontroller')
  autoTable(pdf, pdfTablo({
    startY: y,
    head: [['Durum', 'Kontrol', 'Açıklama', 'Yapılması gereken']],
    body: genel.map(b => [DURUM_AD[b.durum], b.baslik, bulguMetni(b), b.durum !== 'ok' ? b.oneri || '' : '']),
    columnStyles: { 0: { cellWidth: 16, halign: 'center' }, 1: { cellWidth: 50, fontStyle: 'bold' }, 3: { cellWidth: 70 } },
    didParseCell: d => { if (d.section === 'body' && d.column.index === 0) durumBoya(genel[d.row.index]?.durum, d.cell.styles) },
  }))

  // ── Gider kalemleri dağıtımı ──
  y = bolum(pdf, pdfSonY(pdf) + 6, 'Gider kalemleri dağıtımı')
  autoTable(pdf, pdfTablo({
    startY: y,
    head: [['Kalem', 'Oran', 'Havuz (olması gereken)', 'Bordroda dağıtılan', 'Kalan', 'Kişi', 'Durum']],
    body: dagitim.map(x => {
      const temel = x.kategori === 'temel_gider'
      return [x.ad, `%${String(x.oran).replace('.', ',')}`, fmt(x.havuz), temel ? '—' : fmt(x.dagitilan), temel ? '—' : fmt(x.havuz - x.dagitilan),
        temel ? '—' : String(x.kisi), temel ? `Okulda kalan: ${fmt(x.dagitilan)} TL` : DURUM_AD[x.durum]]
    }),
    foot: [['Toplam tahsilat', '', fmt(sonuc.toplamGelir), '', '', '', '']],
    columnStyles: { 1: { halign: 'center', cellWidth: 16 }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'center', cellWidth: 14 } },
    didParseCell: d => {
      if (d.section !== 'body') { if (d.column.index >= 2 && d.column.index <= 4) d.cell.styles.halign = 'right'; return }
      const x = dagitim[d.row.index]
      if (d.column.index === 6 && x?.kategori !== 'temel_gider') durumBoya(x?.durum, d.cell.styles)
    },
  }))

  // ── Personel bordrosu (adlarla) ve genel toplam ──
  y = bolum(pdf, pdfSonY(pdf) + 6, 'Personel bazında bordro kontrolü')
  const toplam = (f: (k: KisiKontrol) => number) => fmt(kisiler.reduce((s, k) => s + f(k), 0))
  // Sütun → ilgili bulgu grubu (renklendirme için)
  const sutunGrubu: Record<number, string> = { 5: 'brut', 8: 'sgk', 9: 'sgk', 10: 'gvMatrah', 11: 'istisna', 12: 'net', 13: 'istisna', 14: 'net', 15: 'net', 16: 'net' }
  autoTable(pdf, pdfTablo({
    startY: y,
    styles: { fontSize: 6.3, cellPadding: 0.9 },
    head: [['S.N.', 'Adı Soyadı', 'Görevi', 'Tür', 'Saat', 'Brüt', 'Gereken brüt', 'Tavan', 'SGK işçi', 'İşsizlik işçi', 'GV matrahı', 'GV istisnası', 'Kesilen GV', 'DV istisnası', 'Kesilen DV', 'Kesinti top.', 'Net ödenen', 'İşveren SGK', 'Durum']],
    body: kisiler.map((k, i) => {
      const b = k.satir
      const denetim = k.kategori === 'denetim'
      return [
        String(i + 1), k.ad, k.gorev, b.personel?.sgk_li ? "SGK'lı" : 'Kadrolu',
        k.kategori === 'ogretmen' ? String(b.toplam_saat || 0) : '', fmt(b.brut), k.kategori === 'diger' ? '—' : fmt(k.beklenenBrut), fmt(k.tavan),
        fmt(b.sgk_kisi), fmt(issizlik(k)), denetim ? '—' : fmt(b.gv_matrah), denetim ? '—' : fmt(b.gv_istisna_tutari), fmt(b.gv_tutar),
        denetim ? '—' : fmt(b.dv_istisna_tutari), fmt(b.damga_tutar), fmt(b.toplam_kesinti), fmt(b.net), fmt(b.sgk_isveren), DURUM_AD[k.durum],
      ]
    }),
    foot: [[
      { content: `GENEL TOPLAM (${kisiler.length} personel)`, colSpan: 4, styles: { halign: 'left' } },
      String(kisiler.reduce((s, k) => s + (k.kategori === 'ogretmen' ? sayi(k.satir.toplam_saat) : 0), 0)),
      toplam(k => sayi(k.satir.brut)), '', '',
      toplam(k => sayi(k.satir.sgk_kisi)), toplam(issizlik), toplam(k => sayi(k.satir.gv_matrah)), toplam(k => sayi(k.satir.gv_istisna_tutari)),
      toplam(k => sayi(k.satir.gv_tutar)), toplam(k => sayi(k.satir.dv_istisna_tutari)), toplam(k => sayi(k.satir.damga_tutar)),
      toplam(k => sayi(k.satir.toplam_kesinti)), toplam(k => sayi(k.satir.net)), toplam(k => sayi(k.satir.sgk_isveren)), '',
    ]],
    columnStyles: { 0: { halign: 'center', cellWidth: 7 }, 1: { cellWidth: 30 }, 2: { cellWidth: 22 }, 3: { halign: 'center', cellWidth: 12 }, 4: { halign: 'center', cellWidth: 8 }, 18: { halign: 'center', cellWidth: 12 } },
    didParseCell: d => {
      const c = d.column.index
      if (c >= 5 && c <= 17) d.cell.styles.halign = 'right'
      if (d.section !== 'body') return
      const k = kisiler[d.row.index]
      if (!k) return
      if (c === 18) { durumBoya(k.durum, d.cell.styles); return }
      const grup = sutunGrubu[c]
      if (grup) {
        const ilgili = k.bulgular.filter(x => SUTUN_BULGULARI[grup].includes(x.baslik))
        durumBoya(ilgili.some(x => x.durum === 'hata') ? 'hata' : ilgili.some(x => x.durum === 'uyari') ? 'uyari' : undefined, d.cell.styles)
      }
    },
  }))

  // ── Personel bulguları ──
  const bulgular = kisiler.flatMap(k => k.bulgular.filter(b => b.durum !== 'ok').map(b => ({ k, b })))
  y = bolum(pdf, pdfSonY(pdf) + 6, 'Personel bulguları')
  if (!bulgular.length) {
    pdf.setFont('NotoSans', 'normal'); pdf.setFontSize(8)
    pdf.text('Personel bordrolarında hata ya da uyarı bulunmadı.', PDF_KENAR, y + 3)
    y += 8
  } else {
    autoTable(pdf, pdfTablo({
      startY: y,
      head: [['Personel', 'Durum', 'Bulgu', 'Açıklama', 'Yapılması gereken']],
      body: bulgular.map(({ k, b }) => [`${k.ad}\n${k.gorev}`, DURUM_AD[b.durum], b.baslik, bulguMetni(b), b.oneri || '']),
      columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: 14, halign: 'center' }, 2: { cellWidth: 44, fontStyle: 'bold' }, 4: { cellWidth: 64 } },
      didParseCell: d => { if (d.section === 'body' && d.column.index === 1) durumBoya(bulgular[d.row.index]?.b.durum, d.cell.styles) },
    }))
    y = pdfSonY(pdf)
  }

  // ── Muhtasar beyanname özeti (SGK'lı / kadrolu kırılımlı) ──
  const sgkli = muhtasarOzeti(kisiler.filter(k => k.satir.personel?.sgk_li))
  const kadrolu = muhtasarOzeti(kisiler.filter(k => !k.satir.personel?.sgk_li))
  const satirlar: [string, keyof HesapKontrolSonuc['muhtasar']][] = [
    ['Toplam brüt ücret', 'brut'], ['Gelir vergisi matrahı', 'gvMatrah'], ['Hesaplanan gelir vergisi', 'gvHesaplanan'],
    ['Asgari ücret GV istisnası', 'gvIstisna'], ['Kesilen (beyan edilecek) gelir vergisi', 'gv'], ['Hesaplanan damga vergisi', 'dvHesaplanan'],
    ['Asgari ücret DV istisnası', 'dvIstisna'], ['Kesilen (beyan edilecek) damga vergisi', 'dv'], ['SGK işçi payı', 'sgkKisi'],
    ['İşsizlik sigortası işçi payı', 'sgkIssizlik'], ['SGK işveren payı', 'sgkIsveren'], ['Toplam net ödenen', 'net'],
  ]
  const vergi = (m: HesapKontrolSonuc['muhtasar']) => fmt(m.gv + m.dv)
  const prim = (m: HesapKontrolSonuc['muhtasar']) => fmt(m.sgkKisi + m.sgkIssizlik + m.sgkIsveren)
  // Özet tablosu (16 satır × ≈8 mm) bölünmeden tek sayfada, sayfa genişliğinde ve okunur boyutta kalsın
  y = bolum(pdf, y + 6, 'Muhtasar beyanname özeti', 145)
  autoTable(pdf, pdfTablo({
    startY: y,
    styles: { fontSize: 9.5, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } },
    head: [['Kalem', "SGK'lı", 'Kadrolu', 'Toplam']],
    body: [
      ...satirlar.map(([ad, a]) => [ad, fmt(sgkli[a]), fmt(kadrolu[a]), fmt(muhtasar[a])]),
      ['Çalışan sayısı', String(muhtasar.sgkliSayisi), String(muhtasar.kadroluSayisi), String(muhtasar.sgkliSayisi + muhtasar.kadroluSayisi)],
    ],
    foot: [
      ['Beyan edilecek vergi toplamı (GV + DV)', vergi(sgkli), vergi(kadrolu), vergi(muhtasar)],
      ['SGK primleri toplamı (işçi + işsizlik + işveren)', prim(sgkli), prim(kadrolu), prim(muhtasar)],
    ],
    columnStyles: { 0: { cellWidth: 115 }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } },
    didParseCell: d => { if (d.column.index > 0) d.cell.styles.halign = 'right' },
  }))

  // Ör. "VİLAYETLER BİRLİĞİ ANAOKULU - Hesap Kontrol Raporu - Ekim 2026.pdf"
  const okul = (o.okulAd || 'Okul').toLocaleUpperCase('tr-TR')
  pdfIndir(pdf, `${okul} - Hesap Kontrol Raporu - ${donem}.pdf`, `Hesap kontrol raporu · ${okul} · ${donem}`)
}
