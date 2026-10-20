// ============================================================
// Denetim Dosyası — aylık denetim evrakları
// Evrak listesi il bazında denetim yetkilisince düzenlenir (denetim_maddeleri).
// Otomatik maddeler sistem verisinden PDF olarak üretilir; "Denetime Gönder"
// anında o anki kopyaları depoya kaydedilir.
// ============================================================
import { supabase } from './supabase'
import { AYLAR, fmt, gunSayisi, tahakkukDagitimHesapla, detectActiveCategories, isDenetim } from './hesaplama'
import { Ayarlar } from './types'

export const DENETIM_BUCKET = 'denetim'
export const MAKS_DOSYA_BOYUTU = 10 * 1024 * 1024
export const KABUL_EDILEN = '.pdf,.xls,.xlsx,.xlsm,.csv,.doc,.docx,.jpg,.jpeg,.png,.zip'

export type MaddeTip = 'yukleme' | 'otomatik'
export type TeslimDurum = 'taslak' | 'gonderildi' | 'onaylandi' | 'iade'
export type BelgeDurum = 'bekliyor' | 'onaylandi' | 'iade'

export interface DenetimMadde {
  id: number
  il_id: number
  sira_no: number
  baslik: string
  aciklama?: string | null
  tip: MaddeTip
  otomatik_kod?: OtomatikKod | null
  yillik: boolean
  zorunlu: boolean
  aktif: boolean
}

export interface DenetimBelge {
  id: number
  okul_id: number
  yil: number
  ay: number
  madde_id: number
  kaynak: MaddeTip
  dosya_yolu: string
  dosya_adi: string
  boyut?: number | null
  mime?: string | null
  durum: BelgeDurum
  denetci_notu?: string | null
  created_at: string
}

export interface DenetimTeslim {
  id: number
  okul_id: number
  yil: number
  ay: number
  durum: TeslimDurum
  gonderim_tarihi?: string | null
  karar_tarihi?: string | null
  denetci_notu?: string | null
}

export type OtomatikKod = 'personel_listesi' | 'puantaj_sgk' | 'puantaj_kadrolu' | 'bordro_sgk' | 'bordro_kadrolu' | 'bilanco'

export const OTOMATIK_KODLAR: { kod: OtomatikKod; ad: string }[] = [
  { kod: 'personel_listesi', ad: 'Personel listesi ve görevleri' },
  { kod: 'puantaj_sgk', ad: 'Puantaj – sigortalı personel' },
  { kod: 'puantaj_kadrolu', ad: 'Puantaj – kadrolu personel' },
  { kod: 'bordro_sgk', ad: 'Bordro – sigortalı personel' },
  { kod: 'bordro_kadrolu', ad: 'Bordro – kadrolu personel' },
  { kod: 'bilanco', ad: 'Ücret dağıtımını gösteren bilanço' },
]

export const TESLIM_DURUM_ETIKET: Record<TeslimDurum, string> = {
  taslak: 'Hazırlanıyor', gonderildi: 'Denetimde', onaylandi: 'Onaylandı', iade: 'İade edildi',
}

// ------------------------------------------------------------
// Dönem yardımcıları
// ------------------------------------------------------------

/** Eylül–Ağustos eğitim yılının başladığı yıl */
export function egitimYiliBaslangic(yil: number, ay: number): number {
  return ay >= 9 ? yil : yil - 1
}

/** Belge bu döneme mi ait? Yıllık maddelerde aynı eğitim yılındaki herhangi bir ay sayılır. */
export function belgeDonemde(b: { yil: number; ay: number }, madde: DenetimMadde, yil: number, ay: number): boolean {
  if (!madde.yillik) return b.yil === yil && b.ay === ay
  return egitimYiliBaslangic(b.yil, b.ay) === egitimYiliBaslangic(yil, ay)
}

/** Bir okulun ilgili dönem belgelerini (yıllık maddeler için tüm eğitim yılı) çeker */
export async function donemBelgeleriniGetir(okulId: number, yil: number, ay: number): Promise<DenetimBelge[]> {
  const bas = egitimYiliBaslangic(yil, ay)
  const { data, error } = await supabase
    .from('denetim_belgeleri')
    .select('*')
    .eq('okul_id', okulId)
    .in('yil', [bas, bas + 1])
    .order('created_at')
  if (error) throw error
  return (data || []) as DenetimBelge[]
}

/** Depo anahtarı için Türkçe karakter ve boşlukları temizler */
export function guvenliAd(ad: string): string {
  const tr: Record<string, string> = { ç: 'c', Ç: 'C', ğ: 'g', Ğ: 'G', ı: 'i', İ: 'I', ö: 'o', Ö: 'O', ş: 's', Ş: 'S', ü: 'u', Ü: 'U' }
  const temiz = ad.replace(/[çÇğĞıİöÖşŞüÜ]/g, c => tr[c]).replace(/[^A-Za-z0-9._-]+/g, '_').replace(/_+/g, '_')
  return temiz.slice(-120) || 'dosya'
}

export function depoYolu(okulId: number, yil: number, ay: number, maddeId: number, dosyaAdi: string): string {
  return `${okulId}/${yil}-${ay}/${maddeId}/${Date.now()}_${guvenliAd(dosyaAdi)}`
}

export function boyutFmt(b?: number | null): string {
  if (!b) return ''
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} KB`
  return `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

// ------------------------------------------------------------
// PDF altyapısı (NotoSans ile Türkçe karakter desteği — bordro PDF'iyle aynı yöntem)
// ------------------------------------------------------------
let fontCache: Promise<[string, string]> | null = null
function fontlariYukle(): Promise<[string, string]> {
  async function b64(path: string) {
    const buf = new Uint8Array(await (await fetch(path)).arrayBuffer())
    let s = ''
    for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i])
    return btoa(s)
  }
  if (!fontCache) fontCache = Promise.all([b64('/fonts/NotoSans-Regular.ttf'), b64('/fonts/NotoSans-Bold.ttf')])
  return fontCache
}

async function yeniPdf(yon: 'portrait' | 'landscape') {
  const [{ default: jsPDF }, { default: autoTable }, [reg, bold]] = await Promise.all([
    import('jspdf'), import('jspdf-autotable'), fontlariYukle(),
  ])
  const pdf = new jsPDF({ orientation: yon, unit: 'mm', format: 'a4' })
  pdf.addFileToVFS('NotoSans-Regular.ttf', reg)
  pdf.addFileToVFS('NotoSans-Bold.ttf', bold)
  pdf.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal', 'Identity-H')
  pdf.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold', 'Identity-H')
  pdf.setFont('NotoSans')
  return { pdf, autoTable }
}

type Pdf = Awaited<ReturnType<typeof yeniPdf>>['pdf']

function baslikYaz(pdf: Pdf, kurum: string, baslik: string, alt: string) {
  const W = pdf.internal.pageSize.getWidth()
  pdf.setFont('NotoSans', 'bold'); pdf.setFontSize(11)
  pdf.text(kurum.toLocaleUpperCase('tr-TR'), W / 2, 12, { align: 'center' })
  pdf.setFontSize(10)
  pdf.text(baslik, W / 2, 18, { align: 'center' })
  pdf.setFont('NotoSans', 'normal'); pdf.setFontSize(8)
  pdf.text(alt, W / 2, 23, { align: 'center' })
}

function sonY(pdf: Pdf): number {
  return (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 30
}

function imzaYaz(pdf: Pdf, ayarlar: Partial<Ayarlar> | null, y: number) {
  const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight()
  if (y + 25 > H - 8) { pdf.addPage(); y = 20 }
  pdf.setFontSize(8)
  const bloklar = [
    { x: W * 0.25, baslik: 'Düzenleyen', ad: ayarlar?.duzenleyen_adi || '', unvan: ayarlar?.duzenleyen_unvani || '' },
    { x: W * 0.75, baslik: 'Onaylayan', ad: ayarlar?.mudur_adi || '', unvan: ayarlar?.mudur_unvani || 'Okul Müdürü' },
  ]
  for (const b of bloklar) {
    pdf.setFont('NotoSans', 'bold'); pdf.text(b.baslik, b.x, y + 6, { align: 'center' })
    pdf.setFont('NotoSans', 'normal')
    pdf.text(b.ad, b.x, y + 18, { align: 'center' })
    pdf.text(b.unvan, b.x, y + 22, { align: 'center' })
  }
}

function bosNotYaz(pdf: Pdf, metin: string) {
  pdf.setFontSize(10); pdf.setFont('NotoSans', 'normal')
  pdf.text(metin, pdf.internal.pageSize.getWidth() / 2, 45, { align: 'center' })
}

const TABLO_STIL = {
  theme: 'grid' as const,
  styles: { font: 'NotoSans', fontSize: 7, cellPadding: 1, textColor: [0, 0, 0] as [number, number, number], lineColor: [60, 60, 60] as [number, number, number], lineWidth: 0.1 },
  headStyles: { fillColor: [235, 235, 235] as [number, number, number], textColor: [0, 0, 0] as [number, number, number], fontStyle: 'bold' as const, halign: 'center' as const },
  footStyles: { fillColor: [245, 245, 245] as [number, number, number], textColor: [0, 0, 0] as [number, number, number], fontStyle: 'bold' as const },
}

// ------------------------------------------------------------
// Otomatik belge üretimi
// ------------------------------------------------------------
interface DonemVerisi {
  ayarlar: Ayarlar | null
  personel: PersonelSatir[]
  puantaj: { personel_id: number; tarih: string; saat: number }[]
  bordro: BordroKayit[]
  tahsilatToplam: number
}
interface PersonelSatir { id: number; ad: string; tc?: string | null; gorev: string; sgk_li?: boolean | null; is_retired?: boolean | null; aktif?: boolean | null; personel_turu?: string | null }
interface BordroKayit { personel_id: number; toplam_saat: number; brut: number; sgk_kisi: number; sgk_issizlik_kisi: number; gv_matrah: number; gv_hesaplanan: number; gv_istisna_tutari: number; gv_tutar: number; dv_hesaplanan: number; dv_istisna_tutari: number; damga_tutar: number; toplam_kesinti: number; net: number; sgk_isveren: number }

async function donemVerisiGetir(okulId: number, yil: number, ay: number): Promise<DonemVerisi> {
  const bas = `${yil}-${String(ay).padStart(2, '0')}-01`
  const bit = `${yil}-${String(ay).padStart(2, '0')}-${gunSayisi(yil, ay)}T23:59:59`
  const [ayr, per, puan, brd, tahs] = await Promise.all([
    supabase.from('ayarlar').select('*').eq('okul_id', okulId).maybeSingle(),
    supabase.from('personel').select('id, ad, tc, gorev, sgk_li, is_retired, aktif, personel_turu').eq('okul_id', okulId).order('ad'),
    supabase.from('puantaj').select('personel_id, tarih, saat').eq('okul_id', okulId).gte('tarih', bas).lte('tarih', bit),
    supabase.from('bordro').select('*').eq('okul_id', okulId).eq('yil', yil).eq('ay', ay),
    supabase.from('tahsilat').select('tutar').eq('okul_id', okulId).eq('yil', yil).eq('ay', ay),
  ])
  for (const r of [per, puan, brd, tahs]) if (r.error) throw r.error
  return {
    ayarlar: (ayr.data as Ayarlar) || null,
    personel: (per.data || []) as PersonelSatir[],
    puantaj: (puan.data || []) as DonemVerisi['puantaj'],
    bordro: (brd.data || []) as BordroKayit[],
    tahsilatToplam: (tahs.data || []).reduce((s, t) => s + (Number(t.tutar) || 0), 0),
  }
}

/** Dönemde çalışan (bordroda ya da puantajda yer alan, ya da aktif) personel; denetim yetkilisi hariç */
function donemPersoneli(v: DonemVerisi): PersonelSatir[] {
  return v.personel.filter(p => {
    if (isDenetim(p.gorev)) return false
    if (v.bordro.some(b => b.personel_id === p.id)) return true
    if (v.puantaj.some(x => x.personel_id === p.id && Number(x.saat) > 0)) return true
    return p.aktif !== false
  })
}

const GOREV_SIRA = ['Başkan', 'Başkan Yrd.', 'Koordinatör Öğretmen', 'Öğretmen', 'Usta Öğretici', 'Muhasebe Personeli', 'Temizlik Personeli']
function gorevSirala<T extends { gorev: string; ad: string }>(a: T, b: T) {
  const ia = GOREV_SIRA.indexOf(a.gorev), ib = GOREV_SIRA.indexOf(b.gorev)
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.ad.localeCompare(b.ad, 'tr')
}

export async function otomatikBelgeUret(kod: OtomatikKod, okulId: number, yil: number, ay: number): Promise<{ blob: Blob; ad: string }> {
  const v = await donemVerisiGetir(okulId, yil, ay)
  const kurum = v.ayarlar?.kurum_adi || 'Çocuk Kulübü'
  const sonGun = gunSayisi(yil, ay)
  const donem = `01.${String(ay).padStart(2, '0')}.${yil} – ${sonGun}.${String(ay).padStart(2, '0')}.${yil} (${AYLAR[ay]} ${yil})`
  const sgkMi = kod.endsWith('_sgk')
  const turAd = sgkMi ? 'Sigortalı' : 'Kadrolu'

  if (kod === 'personel_listesi') {
    const { pdf, autoTable } = await yeniPdf('portrait')
    baslikYaz(pdf, kurum, 'KULÜPTE GÖREVLİ PERSONEL LİSTESİ VE GÖREVLERİ', donem)
    const liste = donemPersoneli(v).sort(gorevSirala)
    autoTable(pdf, {
      ...TABLO_STIL, startY: 28,
      head: [['S.N.', 'Adı Soyadı', 'T.C. Kimlik No', 'Görevi', 'Çalışma Şekli', 'Emekli']],
      body: liste.map((p, i) => [i + 1, p.ad, p.tc || '-', p.gorev, p.sgk_li ? 'Sigortalı' : 'Kadrolu', p.is_retired ? 'Evet' : 'Hayır']),
      columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 2: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center', cellWidth: 14 } },
    })
    imzaYaz(pdf, v.ayarlar, sonY(pdf) + 6)
    return { blob: pdf.output('blob'), ad: `Personel_Listesi_${AYLAR[ay]}_${yil}.pdf` }
  }

  if (kod === 'puantaj_sgk' || kod === 'puantaj_kadrolu') {
    const { pdf, autoTable } = await yeniPdf('landscape')
    baslikYaz(pdf, kurum, `${turAd.toLocaleUpperCase('tr-TR')} PERSONEL PUANTAJ CETVELİ`, donem)
    const liste = donemPersoneli(v).filter(p => !!p.sgk_li === sgkMi).sort(gorevSirala)
    if (liste.length === 0) {
      bosNotYaz(pdf, `Bu dönemde ${turAd.toLocaleLowerCase('tr-TR')} personel bulunmamaktadır.`)
    } else {
      const gunler = Array.from({ length: sonGun }, (_, i) => i + 1)
      const saatMap = new Map<string, number>()
      for (const x of v.puantaj) {
        const g = Number(x.tarih.split('T')[0].split('-')[2])
        const k = `${x.personel_id}-${g}`
        saatMap.set(k, (saatMap.get(k) || 0) + (Number(x.saat) || 0))
      }
      const hs = (n: number) => (n ? String(n).replace('.', ',') : '')
      const body = liste.map((p, i) => {
        const satir = gunler.map(g => saatMap.get(`${p.id}-${g}`) || 0)
        const top = satir.reduce((a, b) => a + b, 0)
        const gun = satir.filter(s => s > 0).length
        return [i + 1, p.ad, p.gorev, ...satir.map(hs), String(gun), hs(top)]
      })
      autoTable(pdf, {
        ...TABLO_STIL, startY: 28,
        styles: { ...TABLO_STIL.styles, fontSize: 5.5, cellPadding: 0.6, halign: 'center' },
        head: [['S.N.', 'Adı Soyadı', 'Görevi', ...gunler.map(String), 'Gün', 'Saat']],
        body,
        columnStyles: { 1: { halign: 'left', cellWidth: 34 }, 2: { halign: 'left', cellWidth: 24 } },
      })
    }
    imzaYaz(pdf, v.ayarlar, sonY(pdf) + 6)
    return { blob: pdf.output('blob'), ad: `Puantaj_${turAd}_${AYLAR[ay]}_${yil}.pdf` }
  }

  if (kod === 'bordro_sgk' || kod === 'bordro_kadrolu') {
    const { pdf, autoTable } = await yeniPdf('landscape')
    baslikYaz(pdf, kurum, `${turAd.toLocaleUpperCase('tr-TR')} PERSONEL ÜCRET BORDROSU`, donem)
    const pm = new Map(v.personel.map(p => [p.id, p]))
    const satirlar = v.bordro
      .map(b => ({ b, p: pm.get(b.personel_id)! }))
      .filter(x => x.p && !isDenetim(x.p.gorev) && !!x.p.sgk_li === sgkMi)
      .sort((a, b) => gorevSirala(a.p, b.p))
    if (satirlar.length === 0) {
      bosNotYaz(pdf, v.bordro.length === 0 ? 'Bu dönem için bordro hesaplanmamıştır.' : `Bu dönemde ${turAd.toLocaleLowerCase('tr-TR')} personel bulunmamaktadır.`)
    } else {
      const alanlar: (keyof BordroKayit)[] = ['brut', 'sgk_kisi', 'sgk_issizlik_kisi', 'gv_matrah', 'gv_hesaplanan', 'gv_istisna_tutari', 'gv_tutar', 'dv_hesaplanan', 'dv_istisna_tutari', 'damga_tutar', 'toplam_kesinti', 'net', 'sgk_isveren']
      const top = (k: keyof BordroKayit) => satirlar.reduce((s, x) => s + Number(x.b[k] || 0), 0)
      autoTable(pdf, {
        ...TABLO_STIL, startY: 28,
        styles: { ...TABLO_STIL.styles, fontSize: 6.5, halign: 'right' },
        head: [['S.N.', 'Adı Soyadı', 'T.C. Kimlik', 'Görevi', 'Saat', 'Brüt', 'SGK İşçi', 'İşsizlik', 'GV Matrahı', 'Hes. GV', 'GV İst.', 'GV', 'Hes. DV', 'DV İst.', 'DV', 'Kesinti Top.', 'Net Ödenen', 'İşveren SGK', 'İmza']],
        body: satirlar.map((x, i) => [i + 1, x.p.ad, x.p.tc || '-', x.p.gorev, String(x.b.toplam_saat || ''), ...alanlar.map(k => fmt(Number(x.b[k] || 0))), '']),
        foot: [[{ content: 'TOPLAM', colSpan: 4, styles: { halign: 'left' } }, String(satirlar.reduce((s, x) => s + Number(x.b.toplam_saat || 0), 0)), ...alanlar.map(k => fmt(top(k))), '']],
        columnStyles: { 0: { halign: 'center', cellWidth: 8 }, 1: { halign: 'left', cellWidth: 32 }, 2: { halign: 'center', cellWidth: 18 }, 3: { halign: 'left', cellWidth: 22 }, 4: { halign: 'center', cellWidth: 9 }, 18: { cellWidth: 16 } },
      })
    }
    imzaYaz(pdf, v.ayarlar, sonY(pdf) + 6)
    return { blob: pdf.output('blob'), ad: `Bordro_${turAd}_${AYLAR[ay]}_${yil}.pdf` }
  }

  // bilanco — gelirin dağılımı ve kişi bazında ödenen ücretler
  const { pdf, autoTable } = await yeniPdf('portrait')
  baslikYaz(pdf, kurum, 'ÜCRET DAĞITIMINI GÖSTEREN BİLANÇO', donem)
  if (!v.ayarlar) {
    bosNotYaz(pdf, 'Okul ayarları bulunamadı.')
  } else {
    const aktif = detectActiveCategories(v.personel, v.puantaj, v.bordro)
    const d = tahakkukDagitimHesapla(v.tahsilatToplam, v.ayarlar, aktif)
    const dag: [string, number, number][] = [
      ['Temel Giderler (Materyal, Beslenme, SGK Primi, Diğer Giderler)', d.pct_temel_gider, d.temel_gider],
      ['Kulüp Yönetim Kurulu Başkanı – Müdür', d.pct_baskan, d.baskan],
      ['Kulüp Yönetim Kurulu Üyesi – Müdür Yardımcısı', d.pct_baskan_yrd, d.baskan_yrd],
      ['Öğretmen, Usta Öğretici, Koordinatör Öğretmen', d.pct_ogretmen, d.ogretmen_havuzu],
      ['Yazışma–Muhasebe İşlerini Yürüten Personel', d.pct_muhasebe, d.muhasebe],
      ['Temizlik, Bakım ve Beslenme İşlerini Yürüten Personel', d.pct_temizlik, d.temizlik],
      ['Denetim Yetkilisi', d.pct_denetim, d.denetim],
    ]
    autoTable(pdf, {
      ...TABLO_STIL, startY: 28,
      head: [['Gelirin Dağılımı', 'Oran', 'Tutar (TL)']],
      body: dag.map(([a, p, t]) => [a, `%${String(p).replace('.', ',')}`, fmt(t)]),
      foot: [['TOPLAM GELİR (Tahsilat)', '%100', fmt(d.toplam)]],
      columnStyles: { 1: { halign: 'center', cellWidth: 18 }, 2: { halign: 'right', cellWidth: 32 } },
    })
    const pm = new Map(v.personel.map(p => [p.id, p]))
    const odemeler = v.bordro.map(b => ({ b, p: pm.get(b.personel_id) })).filter(x => x.p).sort((a, b) => gorevSirala(a.p!, b.p!))
    const topBrut = odemeler.reduce((s, x) => s + Number(x.b.brut || 0), 0)
    const topNet = odemeler.reduce((s, x) => s + Number(x.b.net || 0), 0)
    const topIsv = odemeler.reduce((s, x) => s + Number(x.b.sgk_isveren || 0), 0)
    autoTable(pdf, {
      ...TABLO_STIL, startY: sonY(pdf) + 6,
      head: [['S.N.', 'Adı Soyadı', 'Görevi', 'Brüt Ücret', 'Net Ödenen', 'İşveren SGK']],
      body: odemeler.map((x, i) => [i + 1, x.p!.ad, x.p!.gorev, fmt(x.b.brut), fmt(x.b.net), fmt(x.b.sgk_isveren)]),
      foot: [[{ content: 'TOPLAM', colSpan: 3 }, fmt(topBrut), fmt(topNet), fmt(topIsv)]],
      columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
    })
    if (odemeler.length === 0) {
      pdf.setFontSize(8); pdf.text('Bu dönem için bordro hesaplanmamıştır.', 14, sonY(pdf) + 6)
    }
  }
  imzaYaz(pdf, v.ayarlar, sonY(pdf) + 8)
  return { blob: pdf.output('blob'), ad: `Bilanco_${AYLAR[ay]}_${yil}.pdf` }
}

// ------------------------------------------------------------
// Kontrol listesi (dosyanın en üstünde yer alacak kapak)
// ------------------------------------------------------------
export async function kontrolListesiUret(kurum: string, yil: number, ay: number, maddeler: DenetimMadde[], belgeler: DenetimBelge[], teslim?: DenetimTeslim | null): Promise<Blob> {
  const { pdf, autoTable } = await yeniPdf('portrait')
  baslikYaz(pdf, kurum, 'DENETİM DOSYASI – EVRAK KONTROL LİSTESİ', `${AYLAR[ay]} ${yil}`)
  const var_ = (m: DenetimMadde) => belgeler.some(b => b.madde_id === m.id && belgeDonemde(b, m, yil, ay))
  autoTable(pdf, {
    ...TABLO_STIL, startY: 28,
    styles: { ...TABLO_STIL.styles, fontSize: 8.5, cellPadding: 2 },
    head: [['No', 'Evrak', 'Var', 'Dosya']],
    body: maddeler.map(m => {
      const say = belgeler.filter(b => b.madde_id === m.id && belgeDonemde(b, m, yil, ay)).length
      return [String(m.sira_no), m.baslik, var_(m) ? 'X' : '', say ? `${say} dosya` : '—']
    }),
    columnStyles: { 0: { halign: 'center', cellWidth: 12 }, 2: { halign: 'center', cellWidth: 14, fontStyle: 'bold' }, 3: { halign: 'center', cellWidth: 22 } },
  })
  let y = sonY(pdf) + 8
  pdf.setFontSize(8); pdf.setFont('NotoSans', 'normal')
  pdf.text('Not: Evraklar madde numarasına göre dosyada sıralanmıştır. Bu liste dosyanın en üstünde yer alır.', 14, y)
  if (teslim?.gonderim_tarihi) {
    y += 5
    pdf.text(`Denetime gönderim: ${new Date(teslim.gonderim_tarihi).toLocaleString('tr-TR')}   Durum: ${TESLIM_DURUM_ETIKET[teslim.durum]}`, 14, y)
  }
  return pdf.output('blob')
}

// ------------------------------------------------------------
// Depo işlemleri
// ------------------------------------------------------------
export async function belgeIndir(b: Pick<DenetimBelge, 'dosya_yolu' | 'dosya_adi'>) {
  const { data, error } = await supabase.storage.from(DENETIM_BUCKET).download(b.dosya_yolu)
  if (error || !data) throw error || new Error('Dosya indirilemedi')
  blobKaydet(data, b.dosya_adi)
}

export async function belgeAc(b: Pick<DenetimBelge, 'dosya_yolu'>) {
  // Önce sekmeyi aç (açılır pencere engelleyicisine takılmamak için), sonra imzalı bağlantıya yönlendir
  const w = window.open('', '_blank')
  const { data, error } = await supabase.storage.from(DENETIM_BUCKET).createSignedUrl(b.dosya_yolu, 300)
  if (error || !data) { w?.close(); throw error || new Error('Bağlantı oluşturulamadı') }
  if (w) w.location.href = data.signedUrl
  else window.location.href = data.signedUrl
}

export function blobKaydet(blob: Blob, ad: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = ad
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

/** Kontrol listesi + madde klasörleri halinde tüm dosyayı ZIP olarak indirir */
export async function dosyayiZiple(kurum: string, yil: number, ay: number, maddeler: DenetimMadde[], belgeler: DenetimBelge[], teslim?: DenetimTeslim | null, ilerleme?: (m: string) => void) {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  ilerleme?.('Kontrol listesi hazırlanıyor...')
  zip.file('00_Kontrol_Listesi.pdf', await kontrolListesiUret(kurum, yil, ay, maddeler, belgeler, teslim))
  for (const m of maddeler) {
    const mb = belgeler.filter(b => b.madde_id === m.id && belgeDonemde(b, m, yil, ay))
    if (mb.length === 0) continue
    const klasor = zip.folder(`${String(m.sira_no).padStart(2, '0')}_${guvenliAd(m.baslik).slice(0, 60)}`)!
    for (const b of mb) {
      ilerleme?.(`${m.sira_no}. madde indiriliyor: ${b.dosya_adi}`)
      const { data, error } = await supabase.storage.from(DENETIM_BUCKET).download(b.dosya_yolu)
      if (error || !data) throw new Error(`${b.dosya_adi} indirilemedi`)
      klasor.file(b.dosya_adi, data)
    }
  }
  ilerleme?.('ZIP oluşturuluyor...')
  const blob = await zip.generateAsync({ type: 'blob' })
  blobKaydet(blob, `Denetim_Dosyasi_${guvenliAd(kurum)}_${AYLAR[ay]}_${yil}.zip`)
}
