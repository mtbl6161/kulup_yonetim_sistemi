// EK-6 Çocuk Kulübü Denetim Formu (Çocuk Kulüpleri Yönergesi değişikliği, MADDE 16).
// Soru listesi, sistem verisinden ön doldurma ve resmî düzende PDF çıktısı.
import { supabase } from './supabase'
import { pdfHazirla, pdfTablo, pdfAc, PDF_RENK, type Pdf, type CellInput, type CellHookData } from './pdf'
import { kulupOgrencisi, type Ayarlar, type DenetimRaporu, type KulupBilgileri } from './types'
import type { HesapKontrolSonuc } from './hesapKontrol'

export type Cevap = string | boolean | null
export type Cevaplar = Record<string, Cevap>

type SoruTur = 'metin' | 'evethayir' | 'uzun'
export interface Soru {
  anahtar: string
  etiket: string
  tur: SoruTur
  /** Cevabın geldiği yer: formda ipucu olarak gösterilir */
  kaynak?: 'sistem' | 'kulup' | 'onceki' | 'hesap'
  /** "Hayır" cevabı eksiklik sayılmaz (ör. yemek hizmeti verilmemesi) */
  hayirEksikDegil?: boolean
}

// Formdaki sırayla. İlk bölüm üst bilgiler, ikinci bölüm evet/hayır soruları, sonra açık uçlu sorular.
export const UST_BILGILER: Soru[] = [
  { anahtar: 'kurum_kodu', etiket: 'Kurum Kodu', tur: 'metin', kaynak: 'kulup' },
  { anahtar: 'kurum_adi', etiket: 'Kurum Adı', tur: 'metin', kaynak: 'sistem' },
  { anahtar: 'telefon', etiket: 'Telefon No', tur: 'metin', kaynak: 'sistem' },
  { anahtar: 'web', etiket: 'Web Adresi', tur: 'metin', kaynak: 'kulup' },
  { anahtar: 'eposta', etiket: 'E-Posta Adresi', tur: 'metin', kaynak: 'sistem' },
  { anahtar: 'ogretim_sekli', etiket: 'Öğretim Şekli', tur: 'metin', kaynak: 'kulup' },
  { anahtar: 'ogretmen_sayisi', etiket: 'Kulüpte Görevli Öğretmen Sayısı', tur: 'metin', kaynak: 'sistem' },
  { anahtar: 'usta_sayisi', etiket: 'Kulüpte Görevli Usta Öğretici Sayısı', tur: 'metin', kaynak: 'sistem' },
  { anahtar: 'koordinator_belirlenmis', etiket: 'Kulüpte görevli koordinatör öğretmen sayısı yönerge doğrultusunda belirlenmiş mi?', tur: 'evethayir' },
  { anahtar: 'acilis_onay', etiket: 'Kulüp açılış onay tarihi ve sayısı', tur: 'metin', kaynak: 'kulup' },
  { anahtar: 'faaliyet_turleri', etiket: 'Kulüpte verilen faaliyet türleri', tur: 'metin', kaynak: 'kulup' },
  { anahtar: 'okul_ogrenci', etiket: 'Okuldaki öğrenci sayısı', tur: 'metin', kaynak: 'sistem' },
  { anahtar: 'kulup_ogrenci', etiket: 'Kulüpteki öğrenci sayısı', tur: 'metin', kaynak: 'sistem' },
  { anahtar: 'ucretsiz_ogrenci', etiket: 'Kulüpten ücretsiz faydalanan (şehit/gazi/yoksul) öğrenci sayısı', tur: 'metin', kaynak: 'sistem' },
  { anahtar: 'onceki_tarih', etiket: 'Bir önceki denetim tarihi', tur: 'metin', kaynak: 'onceki' },
  { anahtar: 'onceki_denetciler', etiket: 'Bir önceki denetimi yapan kişilerin adı soyadı', tur: 'metin', kaynak: 'onceki' },
  { anahtar: 'onceki_eksik', etiket: 'Bir önceki denetimde görülen eksiklik var mı?', tur: 'evethayir', kaynak: 'onceki', hayirEksikDegil: true },
  { anahtar: 'eksiklikler', etiket: 'Varsa görülen eksiklikler', tur: 'uzun', kaynak: 'onceki' },
  { anahtar: 'tedbirler', etiket: 'Alınan tedbirler', tur: 'uzun' },
]

export const EVET_HAYIR: Soru[] = [
  { anahtar: 'odeme_oran', etiket: 'Çocuk kulübünde görevli personele Yönergede belirtilen oranlarda ödeme yapılıyor mu?', tur: 'evethayir', kaynak: 'hesap' },
  { anahtar: 'ek2', etiket: 'Çocuk kulübüne kayıt yaptıran çocuklar için EK-2 Çocuk Kulübü Sözleşmesi dolduruluyor mu?', tur: 'evethayir', kaynak: 'kulup' },
  { anahtar: 'ek4', etiket: 'EK-4 Kayıt Formu dolduruluyor mu?', tur: 'evethayir', kaynak: 'kulup' },
  { anahtar: 'ek5', etiket: 'EK-5 Acil Durumlarda Başvurulacak Kişiler Formu dolduruluyor mu?', tur: 'evethayir', kaynak: 'kulup' },
  { anahtar: 'fiziki', etiket: 'Okulun fiziki imkânları çocuk kulübü etkinlikleri için yeterli mi?', tur: 'evethayir' },
  { anahtar: 'temizlik', etiket: 'Okulun bakım ve temizliği çocuk kulübü etkinlikleri için yeterli midir?', tur: 'evethayir' },
  { anahtar: 'beslenme', etiket: 'Çocuk kulübünde beslenme/yemek hizmeti veriliyor mu?', tur: 'evethayir', kaynak: 'sistem', hayirEksikDegil: true },
  { anahtar: 'vergi_matrah', etiket: 'Öğretmenlere yapılan ödemeler vergi matrahlarına ekleniyor mu?', tur: 'evethayir', kaynak: 'hesap' },
  { anahtar: 'usta_sgk', etiket: 'Usta öğreticiler için aylık ödeme ve SGK primi ödemeleri mevzuata uygun olarak yapılıyor mu?', tur: 'evethayir', kaynak: 'hesap' },
  { anahtar: 'yas_gelisim', etiket: 'Çocuk kulübü etkinlikleri öğrencilerin yaş ve gelişim durumlarına göre belirlenmiş mi?', tur: 'evethayir' },
  { anahtar: 'ders_disi', etiket: 'Çocuk kulübü etkinlikleri ders saatleri dışında mı yapılıyor?', tur: 'evethayir' },
  { anahtar: 'ogrenci_gorusme', etiket: 'Çocuk kulübü etkinlikleri ile ilgili olarak öğrenciler ile görüşme yapıldı mı?', tur: 'evethayir' },
  { anahtar: 'veli_gorusme', etiket: 'Çocuk kulübü etkinlikleri ile ilgili olarak veliler ile görüşme yapıldı mı?', tur: 'evethayir' },
]

export const ACIK_UCLU: Soru[] = [
  { anahtar: 'memnuniyet', etiket: 'Öğrenci ve veliler ile yapılan görüşmelerde memnuniyet durumuna ilişkin görüşlerinizi belirtiniz.', tur: 'uzun' },
  { anahtar: 'etkinlik_alanlari', etiket: 'Çocuk kulübü etkinliklerinin yapıldığı alanlar nelerdir?', tur: 'uzun', kaynak: 'kulup' },
  { anahtar: 'diger', etiket: 'Diğer hususlar varsa belirtiniz.', tur: 'uzun' },
]

export const TUM_SORULAR = [...UST_BILGILER, ...EVET_HAYIR, ...ACIK_UCLU]

export const KAYNAK_ETIKET: Record<NonNullable<Soru['kaynak']>, string> = {
  sistem: 'Sistemden', kulup: 'Okulun kulüp bilgilerinden', onceki: 'Önceki rapordan', hesap: 'Hesap kontrolünün önerisi',
}

const tarihTr = (iso?: string | null) => (iso ? new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('tr-TR') : '')

/** Raporda olumsuz çıkan maddeler (bir sonraki ayın "önceki denetimdeki eksiklikler" alanına gider) */
export function eksikMaddeler(c: Cevaplar): string[] {
  const liste = [...UST_BILGILER, ...EVET_HAYIR].filter(s => s.tur === 'evethayir' && !s.hayirEksikDegil && c[s.anahtar] === false).map(s => s.etiket)
  const diger = typeof c.diger === 'string' ? c.diger.trim() : ''
  return diger ? [...liste, diger] : liste
}

const KOTU = new Set(['hata', 'uyari'])

/** Hesap kontrolü bulgularından öneri cevaplar (denetçi değiştirebilir) */
export function hesaptanOneriler(s: HesapKontrolSonuc | null): Cevaplar {
  if (!s) return {}
  const oranSorunu = s.genel.some(b => KOTU.has(b.durum) && /dağıtım oran|Gider kalemi payı/i.test(b.baslik))
  const matrahSorunu = s.kisiler.some(k => k.bulgular.some(b => b.durum === 'hata' && /Gelir vergisi (matrahı hatalı|hesaplanmamış)/i.test(b.baslik)))
  const ustalar = s.kisiler.filter(k => /usta/i.test(k.gorev))
  const ustaSorunu = ustalar.some(k => k.bulgular.some(b => b.durum === 'hata' && /SGK|İşsizlik|Net ödenen|Toplam kesinti/i.test(b.baslik)))
  return { odeme_oran: !oranSorunu, vergi_matrah: !matrahSorunu, usta_sgk: ustalar.length ? !ustaSorunu : null }
}

/** Yeni rapor için cevapları sistemden, okulun kulüp bilgilerinden ve önceki rapordan doldurur */
export async function ek6OnDoldur(okulId: number, yil: number, ay: number, hesap: HesapKontrolSonuc | null): Promise<{ cevaplar: Cevaplar; baskanAd: string }> {
  const [{ data: ayr }, { data: kb }, { data: per }, { data: ogr }, { data: onceki }] = await Promise.all([
    supabase.from('ayarlar').select('kurum_adi, tel, email, mudur_adi, yemek').eq('okul_id', okulId).maybeSingle(),
    supabase.from('kulup_bilgileri').select('*').eq('okul_id', okulId).maybeSingle(),
    supabase.from('personel').select('gorev, aktif').eq('okul_id', okulId),
    supabase.from('ogrenciler').select('aktif, ucretsiz_mi, ogrenci_turu').eq('okul_id', okulId),
    supabase.from('denetim_raporlari').select('*').eq('okul_id', okulId).neq('durum', 'taslak')
      .or(`yil.lt.${yil},and(yil.eq.${yil},ay.lt.${ay})`).order('yil', { ascending: false }).order('ay', { ascending: false }).limit(1),
  ])
  const a = ayr as Pick<Ayarlar, 'kurum_adi' | 'tel' | 'email' | 'mudur_adi' | 'yemek'> | null
  const k = kb as KulupBilgileri | null
  const aktifPer = (per || []).filter(p => p.aktif !== false)
  const gorevSay = (re: RegExp) => aktifPer.filter(p => re.test((p.gorev || '').toLocaleLowerCase('tr-TR'))).length
  const aktifOgr = (ogr || []).filter(o => o.aktif !== false)
  const kulupOgr = aktifOgr.filter(kulupOgrencisi)
  const o = (onceki || [])[0] as DenetimRaporu | undefined
  const oncekiEksik = o ? eksikMaddeler(o.cevaplar) : []
  const alanlar = [...(k?.etkinlik_alanlari || []), ...(k?.etkinlik_alanlari_diger ? [k.etkinlik_alanlari_diger] : [])]

  const cevaplar: Cevaplar = {
    kurum_kodu: k?.kurum_kodu || '',
    kurum_adi: a?.kurum_adi || '',
    telefon: a?.tel || '',
    web: k?.web_adresi || '',
    eposta: a?.email || '',
    ogretim_sekli: k?.ogretim_sekli || '',
    ogretmen_sayisi: String(gorevSay(/öğretmen|ogretmen/) - gorevSay(/koordinat/)),
    usta_sayisi: String(gorevSay(/usta/)),
    koordinator_belirlenmis: null,
    acilis_onay: [tarihTr(k?.acilis_onay_tarihi), k?.acilis_onay_sayisi].filter(Boolean).join(' / '),
    faaliyet_turleri: k?.faaliyet_turleri || '',
    okul_ogrenci: String(aktifOgr.length),
    kulup_ogrenci: String(kulupOgr.length),
    ucretsiz_ogrenci: String(kulupOgr.filter(x => x.ucretsiz_mi).length),
    onceki_tarih: o ? tarihTr(o.denetim_tarihi) : '',
    onceki_denetciler: o ? o.denetciler.map(d => d.ad).filter(Boolean).join(', ') : '',
    onceki_eksik: o ? oncekiEksik.length > 0 : null,
    eksiklikler: oncekiEksik.map(x => `- ${x}`).join('\n'),
    tedbirler: '',
    ek2: k?.ek2_sozlesme ?? null,
    ek4: k?.ek4_kayit ?? null,
    ek5: k?.ek5_acil ?? null,
    fiziki: null, temizlik: null,
    beslenme: a ? !!a.yemek : null,
    yas_gelisim: null, ders_disi: null, ogrenci_gorusme: null, veli_gorusme: null,
    memnuniyet: '',
    etkinlik_alanlari: alanlar.join(', '),
    diger: '',
    ...hesaptanOneriler(hesap),
  }
  return { cevaplar, baskanAd: a?.mudur_adi || '' }
}

/** Boş bırakılmış evet/hayır sorusu var mı (rapor oluşturmadan önce uyarmak için) */
export function bosEvetHayir(c: Cevaplar): Soru[] {
  return [...UST_BILGILER, ...EVET_HAYIR].filter(s => s.tur === 'evethayir' && typeof c[s.anahtar] !== 'boolean')
}

// ── PDF ─────────────────────────────────────────────────────

const KUTU_META = '__evetHayir'

/** Hücreye "Evet ☐ Hayır ☐" çizer; seçili olan kutuya çarpı atar */
function kutuCiz(pdf: Pdf, x: number, yOrta: number, deger: Cevap) {
  pdf.setFont('NotoSans', 'normal'); pdf.setFontSize(9); pdf.setTextColor(...PDF_RENK.metin)
  pdf.setDrawColor(...PDF_RENK.metin); pdf.setLineWidth(0.25)
  let cx = x
  for (const [etiket, v] of [['Evet', true], ['Hayır', false]] as const) {
    pdf.text(etiket, cx, yOrta + 1.1)
    cx += pdf.getTextWidth(etiket) + 1.6
    pdf.rect(cx, yOrta - 1.8, 3.6, 3.6)
    if (deger === v) { pdf.line(cx + 0.6, yOrta - 1.2, cx + 3, yOrta + 1.2); pdf.line(cx + 3, yOrta - 1.2, cx + 0.6, yOrta + 1.2) }
    cx += 3.6 + 6
  }
}

export async function ek6Pdf(r: Pick<DenetimRaporu, 'cevaplar' | 'denetciler' | 'baskan_ad' | 'denetim_tarihi'>) {
  const { pdf, autoTable } = await pdfHazirla('portrait')
  const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight()
  const M = 14
  const c = r.cevaplar
  const deger = (s: Soru): CellInput => s.tur === 'evethayir'
    ? { content: '', styles: { minCellHeight: 7 }, [KUTU_META]: c[s.anahtar] } as never
    : String(c[s.anahtar] ?? '')

  pdf.setFont('NotoSans', 'bold'); pdf.setFontSize(10)
  pdf.text('EK-6', W - M, 14, { align: 'right' })
  pdf.setFontSize(12.5)
  pdf.text('ÇOCUK KULÜBÜ DENETİM FORMU', W / 2, 20, { align: 'center' })

  const ortak = {
    margin: { left: M, right: M, top: 14, bottom: 16 },
    theme: 'grid' as const,
    styles: { fontSize: 9, cellPadding: 1.8, lineColor: PDF_RENK.cizgi, lineWidth: 0.15, valign: 'middle' as const },
    didDrawCell: (d: CellHookData) => {
      const raw = d.cell.raw as Record<string, unknown> | null
      if (d.section === 'body' && raw && typeof raw === 'object' && KUTU_META in raw) {
        kutuCiz(pdf, d.cell.x + 2, d.cell.y + d.cell.height / 2, raw[KUTU_META] as Cevap)
      }
    },
  }

  // Üst bilgiler: etiket : değer
  autoTable(pdf, pdfTablo({
    ...ortak, startY: 25,
    body: UST_BILGILER.map(s => [{ content: s.etiket, styles: { fontStyle: 'bold' } }, deger(s)]),
    columnStyles: { 0: { cellWidth: 82 }, 1: { cellWidth: W - 2 * M - 82 } },
  }))

  // Evet / hayır soruları
  autoTable(pdf, pdfTablo({
    ...ortak, startY: (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4,
    body: EVET_HAYIR.map(s => [s.etiket, deger(s)]),
    columnStyles: { 0: { cellWidth: W - 2 * M - 36 }, 1: { cellWidth: 36 } },
  }))

  // Açık uçlu sorular
  autoTable(pdf, pdfTablo({
    ...ortak, startY: (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4,
    body: ACIK_UCLU.flatMap(s => [
      [{ content: s.etiket, styles: { fontStyle: 'bold', fillColor: PDF_RENK.baslikZemin } }],
      [{ content: String(c[s.anahtar] ?? '') || ' ', styles: { minCellHeight: 16, valign: 'top' } }],
    ]),
    columnStyles: { 0: { cellWidth: W - 2 * M } },
  }))

  // İmza alanı: denetim yetkilileri, kulüp yönetim kurulu başkanı, denetim tarihi — ıslak imza için boş satır
  let y = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  if (y + 34 > H - 14) { pdf.addPage(); y = 24 }
  const bloklar = [
    ...(r.denetciler.length ? r.denetciler : [{ ad: '', unvan: '' }]).map(d => ({ baslik: 'Denetim Yetkilisi', ad: d.ad, alt: d.unvan })),
    { baslik: 'Kulüp Yönetim K. Baş.', ad: r.baskan_ad || '', alt: '' },
    { baslik: 'Denetim Tarihi', ad: new Date(r.denetim_tarihi + 'T12:00:00').toLocaleDateString('tr-TR'), alt: '', tarih: true },
  ]
  const genislik = (W - 2 * M) / bloklar.length
  bloklar.forEach((b, i) => {
    const x = M + genislik * i + genislik / 2
    pdf.setFont('NotoSans', 'bold'); pdf.setFontSize(9); pdf.setTextColor(...PDF_RENK.metin)
    pdf.text(b.baslik, x, y, { align: 'center' })
    pdf.setFont('NotoSans', 'normal')
    pdf.text(b.ad || '', x, y + 6, { align: 'center', maxWidth: genislik - 4 })
    if (b.alt) { pdf.setFontSize(8); pdf.setTextColor(...PDF_RENK.ikincil); pdf.text(b.alt, x, y + 10.5, { align: 'center', maxWidth: genislik - 4 }); pdf.setTextColor(...PDF_RENK.metin) }
    if (!('tarih' in b)) {
      pdf.setDrawColor(...PDF_RENK.cizgi); pdf.setLineWidth(0.25)
      pdf.line(x - genislik / 2 + 6, y + 24, x + genislik / 2 - 6, y + 24)
      pdf.setFontSize(7.5); pdf.setTextColor(...PDF_RENK.ikincil)
      pdf.text('İmza', x, y + 28, { align: 'center' })
      pdf.setTextColor(...PDF_RENK.metin)
    }
  })

  pdfAc(pdf, 'EK-6 Çocuk Kulübü Denetim Formu', false)
}

