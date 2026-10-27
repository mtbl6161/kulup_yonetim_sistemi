'use client'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import Topbar from '@/components/Topbar'
import { useAy } from '@/lib/AyContext'
import { pdfHazirla, pdfBaslik, pdfTablo, pdfAc, PDF_RENK, PDF_KENAR } from '@/lib/pdf'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { ayLabel, fmtTL, tarihFmt, AYLAR } from '@/lib/hesaplama'
import { IsletmeHareket, IsletmeTur, Ayarlar, Ogrenci, TahsilatKategori, kulupOgrencisi, Birim, birimKurumAdi } from '@/lib/types'
import { taksitAcilabilir, taksitKey, taksitCoz } from '@/lib/taksit'
import { aciklamayiAyristir, ogrenciEslestir } from '@/lib/ekstreEslesme'
import ConfirmModal from '@/components/ConfirmModal'
import { BookText, BookOpen, Pencil, Trash2, TrendingUp, TrendingDown, Scale, Save, X, ArrowDownCircle, ArrowUpCircle, ListChecks, LayoutList, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, UserCheck, ChevronDown, ChevronUp, Circle } from 'lucide-react'

const bugunISO = () => new Date().toISOString().split('T')[0]

type OdemeTipi = 'kulup' | 'kirtasiye'
interface ParsedRow {
  tarih: string; tutar: number; tur: IsletmeTur; aciklama: string; belge: string; gecerli: boolean
  odemeTipi: OdemeTipi | null
  ogrenciId: number | null
  ayIpucu: number | null
  isaretle: boolean
}

// Türk formatındaki tutarı sayıya çevir ("1.234,56" -> 1234.56). İşaret ayrı ele alınır.
function parseTutar(s: string): number {
  if (!s) return NaN
  const t = s.replace(/[^\d.,-]/g, '').trim()
  if (!t || t === '-') return NaN
  const neg = t.startsWith('-')
  const dec = Math.max(t.lastIndexOf(','), t.lastIndexOf('.'))
  if (dec === -1) { const n = parseFloat(t.replace(/[^\d]/g, '')); return neg ? -n : n }
  const intp = t.slice(0, dec).replace(/[^\d]/g, '')
  const frac = t.slice(dec + 1).replace(/[^\d]/g, '')
  const v = parseFloat(`${intp || '0'}.${frac || '0'}`)
  return neg ? -v : v
}

// Tarihi ISO'ya çevir (dd.mm.yyyy / yyyy-mm-dd destekli)
function parseTarih(s: string): string {
  if (!s) return ''
  const t = s.trim()
  let m = t.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  m = t.match(/(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  return ''
}

// Excel hücresini düz metne çevir (tarih -> dd.mm.yyyy, sayı -> ondalık)
function cellStr(v: any): string {
  if (v == null) return ''
  if (v instanceof Date) return `${String(v.getDate()).padStart(2, '0')}.${String(v.getMonth() + 1).padStart(2, '0')}.${v.getFullYear()}`
  return String(v).trim()
}

// Ekstredeki gerçek tablo başlığını bul: "tarih" ve "tutar/miktar" kelimelerini aynı satırda
// içeren ilk satır. Banka ekstrelerinde tablo öncesinde hesap bilgisi bloğu (Şube, IBAN,
// Bakiye vb.) yer alabilir; bu blok tabloya dahil edilmeden atlanır. Böyle bir başlık
// bulunamazsa (ör. dosya zaten ilk satırdan tablo) hiçbir şey değişmez.
function ekstreBasligiBul(rows: string[][]): number {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i].map(c => (c || '').toLocaleLowerCase('tr'))
    if (r.some(c => c.includes('tarih')) && r.some(c => c.includes('tutar') || c.includes('miktar'))) return i
  }
  return -1
}

interface ColMap { tarih: number; tutar: number; yon: number; aciklama: number; belge: number }

// Excel/CSV sütunlarını otomatik tanı (banka bağımsız: başlık adı + içerik desenine göre)
function autoDetect(rows: string[][], hasHeader: boolean): ColMap {
  const n = rows.reduce((m, r) => Math.max(m, r.length), 0)
  const header = hasHeader && rows[0] ? rows[0].map(h => (h || '').toLocaleLowerCase('tr')) : []
  const data = hasHeader ? rows.slice(1) : rows
  const findHead = (kw: string[]) => header.findIndex(h => kw.some(k => h.includes(k)))
  const colScore = (test: (s: string) => boolean, skip: number[] = []) => {
    let best = -1, bestOk = 0
    for (let c = 0; c < n; c++) {
      if (skip.includes(c)) continue
      let ok = 0, tot = 0
      for (const r of data.slice(0, 25)) { const v = r[c]; if (v && v.trim()) { tot++; if (test(v)) ok++ } }
      if (tot && ok / tot > 0.6 && ok > bestOk) { bestOk = ok; best = c }
    }
    return best
  }
  let tarih = findHead(['tarih']); if (tarih < 0) tarih = colScore(s => !!parseTarih(s))
  if (tarih < 0) tarih = 0
  let tutar = findHead(['işlem tutar', 'islem tutar', 'tutar', 'miktar', 'tutarı'])
  if (tutar < 0) tutar = colScore(s => { const x = parseTutar(s); return !isNaN(x) && x !== 0 }, [tarih])
  if (tutar < 0) tutar = Math.min(2, n - 1)
  const yon = findHead(['(+/-)', '+/-', 'borç/alacak', 'g/ç', 'işlem türü', 'islem türü'])
  const aciklama = findHead(['açıklama', 'aciklama', 'detay', 'ad soyad', 'gönderen', 'gonderen'])
  const belge = findHead(['dekont', 'belge', 'referans', 'fiş', 'fis', 'işlem no', 'islem no'])
  return { tarih, tutar, yon, aciklama, belge }
}

interface FormState {
  tarih: string
  tur: IsletmeTur
  tutar: string
  belge_no: string
  aciklama: string
}
const bosForm = (tarih: string): FormState => ({ tarih, tur: 'gelir', tutar: '', belge_no: '', aciklama: '' })

export default function IsletmeDefteri({ birim }: { birim: Birim }) {
  const { ay, yil } = useAy()
  const { okul, profil } = useAuth()
  const okulId = okul?.id ?? profil?.okul_id ?? null

  const [hareketler, setHareketler] = useState<IsletmeHareket[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const [view, setView] = useState<'hareketler' | 'defter' | 'kapak'>('hareketler')
  const [kapsam, setKapsam] = useState<'ay' | 'yil'>('ay')
  const [turFiltre, setTurFiltre] = useState<'hepsi' | IsletmeTur>('hepsi')

  const [devreden, setDevreden] = useState(0)
  const [devredenInput, setDevredenInput] = useState('')
  const [devredenSaving, setDevredenSaving] = useState(false)
  const [ayarlar, setAyarlar] = useState<Ayarlar | null>(null)

  const varsayilanTarih = () => {
    const t = new Date()
    return (t.getMonth() + 1 === ay && t.getFullYear() === yil) ? bugunISO() : `${yil}-${String(ay).padStart(2, '0')}-01`
  }
  const [form, setForm] = useState<FormState>(bosForm(varsayilanTarih()))
  const [editId, setEditId] = useState<number | null>(null)
  const [conf, setConf] = useState<{ id: number; aciklama: string } | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  // Banka ekstresi içe aktarma (Excel/CSV)
  const [importOpen, setImportOpen] = useState(false)
  const [importRows, setImportRows] = useState<string[][]>([])
  const [importFileName, setImportFileName] = useState('')
  const [importReading, setImportReading] = useState(false)
  const [basSatirAtla, setBasSatirAtla] = useState(true)
  const [colMap, setColMap] = useState<ColMap>({ tarih: 0, tutar: 2, yon: 3, aciklama: 6, belge: 7 })
  const [onizleme, setOnizleme] = useState<ParsedRow[] | null>(null)
  const [importSaving, setImportSaving] = useState(false)

  // Ödeme Takip eşleştirmesi için öğrenci/kategori verisi (import penceresi açılınca yüklenir)
  const [odemeOgrenciler, setOdemeOgrenciler] = useState<Ogrenci[]>([])
  const [odemeKategoriler, setOdemeKategoriler] = useState<TahsilatKategori[]>([])
  const [odemeVerisiYuklendi, setOdemeVerisiYuklendi] = useState(false)
  const [gelismisAcik, setGelismisAcik] = useState(false)
  const [eslesmePop, setEslesmePop] = useState<{ idx: number; rect: DOMRect } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data }, { data: devir }, { data: ayr }] = await Promise.all([
      supabase.from('isletme_defteri').select('*').eq('birim', birim).eq('yil', yil).order('tarih', { ascending: false }).order('id', { ascending: false }),
      supabase.from('isletme_devir').select('devreden_tutar').eq('birim', birim).eq('yil', yil).maybeSingle(),
      supabase.from('ayarlar').select('*').single(),
    ])
    setHareketler(data || [])
    setAyarlar(ayr || null)
    const dv = devir?.devreden_tutar != null ? Number(devir.devreden_tutar) : 0
    setDevreden(dv)
    setDevredenInput(dv ? String(dv) : '')
    setLoading(false)
  }, [yil, birim])

  useEffect(() => { load() }, [load])

  // Ay değişince form tarihini güncelle (düzenleme yokken)
  useEffect(() => {
    if (editId == null) setForm(f => ({ ...f, tarih: varsayilanTarih() }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ay, yil])

  function bilgi(text: string, sure = 3000) { setMsg(text); if (sure) setTimeout(() => setMsg(''), sure) }

  const gorunen = useMemo(() => {
    let list = hareketler
    if (kapsam === 'ay') list = list.filter(h => h.ay === ay)
    if (turFiltre !== 'hepsi') list = list.filter(h => h.tur === turFiltre)
    return list
  }, [hareketler, kapsam, ay, turFiltre])

  const ozet = useMemo(() => {
    const baz = kapsam === 'ay' ? hareketler.filter(h => h.ay === ay) : hareketler
    const gelir = baz.filter(h => h.tur === 'gelir').reduce((s, h) => s + Number(h.tutar || 0), 0)
    const gider = baz.filter(h => h.tur === 'gider').reduce((s, h) => s + Number(h.tutar || 0), 0)
    return { gelir, gider, net: gelir - gider, adet: baz.length }
  }, [hareketler, kapsam, ay])

  // Kümülatif banka bakiyesi: tüm hareketler kronolojik sırayla devreden'den yürür
  // (banka ekstresindeki "Bakiye" sütununun karşılığı). Filtreden bağımsız, her satırın gerçek bakiyesi.
  const bakiyeMap = useMemo(() => {
    const asc = (a: IsletmeHareket, b: IsletmeHareket) => (a.tarih < b.tarih ? -1 : a.tarih > b.tarih ? 1 : (a.id - b.id))
    const sirali = [...hareketler].sort(asc)
    const map = new Map<number, number>()
    let run = devreden
    for (const h of sirali) { run += (h.tur === 'gelir' ? 1 : -1) * Number(h.tutar || 0); map.set(h.id, run) }
    return map
  }, [hareketler, devreden])

  // KAPAK: aylık gelir/gider + yürüyen banka bakiyesi
  const aylikOzet = useMemo(() => {
    const rows: { ay: number; gelir: number; gider: number; bakiye: number }[] = []
    let bakiye = devreden
    for (let m = 1; m <= 12; m++) {
      const gelir = hareketler.filter(h => h.ay === m && h.tur === 'gelir').reduce((s, h) => s + Number(h.tutar || 0), 0)
      const gider = hareketler.filter(h => h.ay === m && h.tur === 'gider').reduce((s, h) => s + Number(h.tutar || 0), 0)
      bakiye = bakiye + gelir - gider
      rows.push({ ay: m, gelir, gider, bakiye })
    }
    return rows
  }, [hareketler, devreden])

  const yilToplam = useMemo(() => ({
    gelir: aylikOzet.reduce((s, r) => s + r.gelir, 0),
    gider: aylikOzet.reduce((s, r) => s + r.gider, 0),
  }), [aylikOzet])
  const sonBakiye = aylikOzet.length ? aylikOzet[aylikOzet.length - 1].bakiye : devreden

  // DEFTER görünümü: seçili ay için GİDER/GELİR + nakli toplam (önceki aylardan) / toplam
  const defterData = useMemo(() => {
    const asc = (a: IsletmeHareket, b: IsletmeHareket) => (a.tarih < b.tarih ? -1 : a.tarih > b.tarih ? 1 : (a.id - b.id))
    const gider = hareketler.filter(h => h.tur === 'gider').sort(asc)
    const gelir = hareketler.filter(h => h.tur === 'gelir').sort(asc)
    const topla = (arr: IsletmeHareket[]) => arr.reduce((s, h) => s + Number(h.tutar || 0), 0)
    const giderOnce = gider.filter(h => (h.ay || 0) < ay)
    const gelirOnce = gelir.filter(h => (h.ay || 0) < ay)
    const giderAy = gider.filter(h => h.ay === ay)
    const gelirAy = gelir.filter(h => h.ay === ay)
    const giderNakli = topla(giderOnce)
    const gelirNakli = devreden + topla(gelirOnce)
    return {
      giderAy, gelirAy,
      giderNakli, gelirNakli,
      giderSira0: giderOnce.length, gelirSira0: gelirOnce.length,
      giderToplam: giderNakli + topla(giderAy),
      gelirToplam: gelirNakli + topla(gelirAy),
    }
  }, [hareketler, ay, devreden])

  async function devredenKaydet() {
    if (!okulId) { bilgi('❌ Oturum bilgisi eksik, sayfayı yenileyin.'); return }
    const v = devredenInput ? parseFloat(devredenInput) : 0
    if (isNaN(v)) { bilgi('❌ Geçerli bir tutar girin.'); return }
    setDevredenSaving(true)
    const { error } = await supabase.from('isletme_devir').upsert({ yil, devreden_tutar: v, okul_id: okulId, birim }, { onConflict: 'yil,okul_id,birim' })
    setDevredenSaving(false)
    if (error) bilgi('❌ Kayıt hatası: ' + error.message, 5000)
    else { setDevreden(v); bilgi('✅ Devreden tutar kaydedildi.') }
  }

  // ── Resmî İşletme Hesabı Defteri PDF (çift taraflı, nakli toplam devirli) ──
  async function defterPdf() {
    if (!hareketler.length) { bilgi('⚠️ Bu yıl için defter hareketi yok.'); return }
    bilgi('⌛ Defter PDF hazırlanıyor...', 0)
    try {
      const { pdf, autoTable } = await pdfHazirla('portrait')

      const PW = pdf.internal.pageSize.getWidth()
      const M = PDF_KENAR
      const usable = PW - 2 * M
      const RPP = 26

      const wSira = 16, wTarih = 24, wNo = 22, wTutar = 32
      const wAcik = usable - (wSira + wTarih + wNo + wTutar)
      const colStyles: any = {
        0: { cellWidth: wSira, halign: 'center' },
        1: { cellWidth: wTarih, halign: 'center' },
        2: { cellWidth: wNo, halign: 'center' },
        3: { cellWidth: wAcik, halign: 'left' },
        4: { cellWidth: wTutar, halign: 'right' },
      }

      const asc = (a: IsletmeHareket, b: IsletmeHareket) => (a.tarih < b.tarih ? -1 : a.tarih > b.tarih ? 1 : (a.id - b.id))
      const giderler = hareketler.filter(h => h.tur === 'gider').sort(asc)
      const gelirler = hareketler.filter(h => h.tur === 'gelir').sort(asc)

      let firstPage = true

      function headFor(title: 'GİDER' | 'GELİR'): any {
        return [
          [
            { content: 'Sıra No', rowSpan: 2 },
            { content: title === 'GİDER' ? 'Alınan Fatura veya Belgenin' : 'Alındı Belgesi veya Banka Dekontunun', colSpan: 2 },
            { content: 'Açıklama', rowSpan: 2 },
            { content: 'Miktarı / Tutarı (₺)', rowSpan: 2 },
          ],
          [
            { content: 'Tarihi' },
            { content: title === 'GİDER' ? "No'su" : 'Sıra No' },
          ],
        ]
      }

      // Gerçek defter mantığı: her taraf (GİDER / GELİR) KENDİ bölümü ve KENDİ sayfa numarasıyla.
      // Satırlar tarih sırasıyla akar; sayfa dolunca (RPP satır) o tarafın bir sonraki sayfasına geçer.
      // Sıra no ve Nakli Toplam/Toplam sayfadan sayfaya devam eder. GELİR devreden'den, GİDER 0'dan başlar.
      function renderSection(title: 'GİDER' | 'GELİR', rows: IsletmeHareket[], run0: number) {
        let run = run0, sira = 0
        const nPages = Math.max(Math.ceil(rows.length / RPP), 1)
        for (let p = 0; p < nPages; p++) {
          if (!firstPage) pdf.addPage()
          firstPage = false
          const y0 = pdfBaslik(pdf, { kurum: birimKurumAdi(birim, ayarlar, okul?.ad), baslik: 'İşletme hesabı defteri', alt: title, sag: `${title} sayfası ${p + 1} / ${nPages}` })

          const slice = rows.slice(p * RPP, (p + 1) * RPP)
          const nakli = run
          const body: any[] = []
          body.push([{ content: 'Nakli Toplam', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold' } }, { content: fmtTL(nakli), styles: { halign: 'right', fontStyle: 'bold' } }])
          for (const r of slice) { sira++; run += Number(r.tutar || 0); body.push([sira, tarihFmt(r.tarih), r.belge_no || '-', r.aciklama || '', fmtTL(Number(r.tutar))]) }
          body.push([{ content: 'Toplam', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fillColor: PDF_RENK.toplamZemin } }, { content: fmtTL(run), styles: { halign: 'right', fontStyle: 'bold', fillColor: PDF_RENK.toplamZemin } }])

          autoTable(pdf, pdfTablo({
            head: headFor(title),
            body,
            startY: y0,
            margin: { left: M, right: M, top: 14, bottom: 14 },
            tableWidth: usable,
            styles: { fontSize: 8, cellPadding: 1.6 },
            columnStyles: colStyles,
          }))
        }
      }

      // Önce GİDER bölümü (kendi sayfa 1..N), sonra GELİR bölümü (kendi sayfa 1..M)
      if (giderler.length) renderSection('GİDER', giderler, 0)
      if (gelirler.length) renderSection('GELİR', gelirler, devreden)

      pdfAc(pdf, 'İşletme hesabı defteri')
      bilgi('✅ Defter PDF hazırlandı.')
    } catch (err: any) {
      bilgi('❌ PDF hatası: ' + (err.message || 'Bilinmiyor'), 5000)
    }
  }

  async function kaydet() {
    if (!form.tarih || !form.tutar) { bilgi('❌ Tarih ve tutar zorunlu.'); return }
    if (!okulId) { bilgi('❌ Oturum bilgisi eksik, sayfayı yenileyin.'); return }
    const tutarN = parseFloat(form.tutar)
    if (isNaN(tutarN) || tutarN <= 0) { bilgi('❌ Geçerli bir tutar girin.'); return }

    setSaving(true)
    const d = new Date(form.tarih)
    const payload = {
      tarih: form.tarih,
      belge_no: form.belge_no.trim() || null,
      aciklama: form.aciklama.trim() || null,
      tutar: tutarN,
      tur: form.tur,
      kaynak: 'manuel',
      ay: d.getMonth() + 1,
      yil: d.getFullYear(),
      okul_id: okulId,
      birim,
    }
    try {
      if (editId) {
        const { error } = await supabase.from('isletme_defteri').update(payload).eq('id', editId)
        if (error) throw error
        bilgi('✅ Hareket güncellendi.')
      } else {
        const { error } = await supabase.from('isletme_defteri').insert(payload)
        if (error) throw error
        bilgi('✅ Hareket eklendi.')
      }
      setEditId(null)
      setForm(bosForm(varsayilanTarih()))
      // Kaydedilen yıl seçili yıldan farklıysa uyar
      if (payload.yil !== yil) bilgi(`✅ Kaydedildi. (Not: ${payload.yil} yılına işlendi, listede görmek için yılı değiştirin.)`, 5000)
      load()
    } catch (err: any) {
      bilgi('❌ Kayıt hatası: ' + (err.message || 'Bilinmiyor'), 5000)
    } finally { setSaving(false) }
  }

  function duzenle(h: IsletmeHareket) {
    setEditId(h.id)
    setForm({ tarih: h.tarih, tur: h.tur, tutar: String(h.tutar), belge_no: h.belge_no || '', aciklama: h.aciklama || '' })
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  function vazgec() { setEditId(null); setForm(bosForm(varsayilanTarih())) }

  async function silOnayla() {
    if (!conf) return
    const { id } = conf
    setConf(null)
    setHareketler(prev => prev.filter(h => h.id !== id))
    const { error } = await supabase.from('isletme_defteri').delete().eq('id', id)
    if (error) { bilgi('❌ Silme hatası: ' + error.message, 5000); load() }
    else bilgi('✅ Hareket silindi.')
  }

  // ── Banka ekstresi içe aktarma (Excel/CSV) ──
  const colCount = useMemo(() => importRows.reduce((m, r) => Math.max(m, r.length), 0), [importRows])

  // Ekstredeki öğrenci ödemelerini eşleştirebilmek için öğrenci/kategori listesini yükle
  useEffect(() => {
    if (!importOpen || odemeVerisiYuklendi) return
    ;(async () => {
      const [{ data: ogr }, { data: kat }] = await Promise.all([
        supabase.from('ogrenciler').select('*').order('soyad'),
        supabase.from('tahsilat_kategorileri').select('*').eq('birim', birim),
      ])
      setOdemeOgrenciler((ogr || []).filter((o: Ogrenci) => o.aktif !== false))
      setOdemeKategoriler(kat || [])
      setOdemeVerisiYuklendi(true)
    })()
  }, [importOpen, odemeVerisiYuklendi])

  const kirtasiyeKategori = useMemo(
    () => odemeKategoriler.find(k => k.veri_kaynagi === 'manuel' && /k[ıi]rtasiye/i.test(k.ad)) || null,
    [odemeKategoriler]
  )
  const ogrencilerSirali = useMemo(
    () => [...odemeOgrenciler].sort((a, b) => `${a.ad} ${a.soyad}`.localeCompare(`${b.ad} ${b.soyad}`, 'tr')),
    [odemeOgrenciler]
  )
  const ogrenciAdMap = useMemo(() => new Map(ogrencilerSirali.map(o => [o.id, `${o.ad} ${o.soyad}`])), [ogrencilerSirali])

  function onizlemeGuncelle(idx: number, patch: Partial<ParsedRow>) {
    setOnizleme(o => o ? o.map((x, i) => i === idx ? { ...x, ...patch } : x) : o)
  }

  async function dosyaSec(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // aynı dosyayı tekrar seçebilmek için
    if (!file) return
    setImportReading(true)
    setImportFileName(file.name)
    setOnizleme(null)
    setEslesmePop(null)
    try {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const aoa: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, blankrows: false })
      const tumSatirlar = aoa.map(r => (r || []).map(cellStr)).filter(r => r.some(c => c && c.trim()))
      if (!tumSatirlar.length) { bilgi('⚠️ Dosyada veri bulunamadı.'); setImportReading(false); return }
      const basIdx = ekstreBasligiBul(tumSatirlar)
      const rows = basIdx > 0 ? tumSatirlar.slice(basIdx) : tumSatirlar
      setImportRows(rows)
      setColMap(autoDetect(rows, basSatirAtla))
    } catch (err: any) {
      bilgi('❌ Dosya okunamadı: ' + (err.message || 'Bilinmiyor'), 5000)
    } finally {
      setImportReading(false)
    }
  }

  // Dosya / eşleme / başlık değişince önizlemeyi canlı üret
  useEffect(() => {
    if (!importRows.length) { setOnizleme(null); return }
    const data = basSatirAtla ? importRows.slice(1) : importRows
    const rows: ParsedRow[] = data.map(c => {
      const tarih = parseTarih(c[colMap.tarih] || '')
      const tutarHam = parseTutar(c[colMap.tutar] || '')
      const tutar = Math.abs(tutarHam)
      let tur: IsletmeTur = 'gelir'
      if (colMap.yon >= 0 && c[colMap.yon] != null) {
        const y = (c[colMap.yon] || '').toLocaleLowerCase('tr').trim()
        if (y.includes('-') || y.includes('borç') || y.includes('gider') || y.includes('çık') || y.includes('giden')) tur = 'gider'
        else if (y.includes('+') || y.includes('alacak') || y.includes('gelir') || y.includes('giriş') || y.includes('gelen')) tur = 'gelir'
        else tur = tutarHam < 0 ? 'gider' : 'gelir'
      } else {
        tur = tutarHam < 0 ? 'gider' : 'gelir'
      }
      const aciklama = (colMap.aciklama >= 0 ? (c[colMap.aciklama] || '') : '').trim()
      const belge = (colMap.belge >= 0 ? (c[colMap.belge] || '') : '').trim()
      const gecerli = !!tarih && !isNaN(tutar) && tutar > 0

      // Gelir satırlarında açıklamadan öğrenci ödemesi tahmini (Kulüp/Kırtasiye) — sadece önizleme, kullanıcı düzeltebilir
      let odemeTipi: OdemeTipi | null = null
      let ogrenciId: number | null = null
      let ayIpucu: number | null = null
      let isaretle = false
      if (birim === 'okul' && gecerli && tur === 'gelir' && aciklama && ogrencilerSirali.length) {
        const ayr = aciklamayiAyristir(aciklama)
        odemeTipi = ayr.odemeTipi
        ayIpucu = ayr.ayIpucu
        const eslesme = ogrenciEslestir(ayr.adayIsim, ayr.sinifIpucu, ogrencilerSirali)
        if (eslesme) {
          ogrenciId = eslesme.ogrenci.id
          // Kulüp aidatı sadece kulüp öğrencisine işlenir; okul öğrencisi yalnızca kırtasiye vb. öder
          const tipUygulanabilir = (odemeTipi === 'kulup' && kulupOgrencisi(eslesme.ogrenci)) || (odemeTipi === 'kirtasiye' && !!kirtasiyeKategori && kirtasiyeKategori.tip !== 'donemlik')
          isaretle = eslesme.belirgin && tipUygulanabilir
        }
      }
      return { tarih, tutar, tur, aciklama, belge, gecerli, odemeTipi, ogrenciId, ayIpucu, isaretle }
    })
    setOnizleme(rows)
  }, [importRows, colMap, basSatirAtla, ogrencilerSirali, kirtasiyeKategori, birim])

  async function importKaydet() {
    if (!onizleme || !okulId) { bilgi('❌ Oturum bilgisi eksik, sayfayı yenileyin.'); return }
    const gecerliler = onizleme.filter(r => r.gecerli)
    if (!gecerliler.length) { bilgi('❌ Kaydedilecek geçerli satır yok.'); return }
    setImportSaving(true)
    const payloads = gecerliler.map(r => {
      const d = new Date(r.tarih)
      return { tarih: r.tarih, belge_no: r.belge || null, aciklama: r.aciklama || null, tutar: r.tutar, tur: r.tur, kaynak: 'banka', ay: d.getMonth() + 1, yil: d.getFullYear(), okul_id: okulId, birim }
    })

    // Mükerrer koruması: aynı tarih+tutar+tür+belge zaten varsa atla
    const anahtar = (t: string, tt: number, tr: string, b: string | null) => `${t}|${Number(tt).toFixed(2)}|${tr}|${(b || '').trim()}`
    const yillar = Array.from(new Set(payloads.map(p => p.yil)))
    const { data: mevcut } = await supabase.from('isletme_defteri').select('tarih, tutar, tur, belge_no').eq('birim', birim).in('yil', yillar)
    const mevcutSet = new Set((mevcut || []).map(m => anahtar(m.tarih, Number(m.tutar), m.tur, m.belge_no)))
    const yeni = payloads.filter(p => !mevcutSet.has(anahtar(p.tarih, p.tutar, p.tur, p.belge_no)))
    const atlanan = payloads.length - yeni.length

    if (!yeni.length) {
      setImportSaving(false)
      bilgi(`⚠️ Kaydedilecek yeni satır yok — ${atlanan} satır zaten mevcut (mükerrer).`, 5000)
      return
    }

    const { error } = await supabase.from('isletme_defteri').insert(yeni)
    if (error) { setImportSaving(false); bilgi('❌ Aktarım hatası: ' + error.message, 6000); return }

    // Ödeme Takip senkronizasyonu: öğrenciyle eşleşen ve "işaretle" seçili gelir satırları
    const isaretliler = gecerliler.filter(r => r.tur === 'gelir' && r.isaretle && r.ogrenciId && r.odemeTipi)
    let odemeBasarili = 0, odemeAtlanan = 0, odemeHata = 0
    for (const r of isaretliler) {
      const d = new Date(r.tarih)
      const ay = r.ayIpucu || (d.getMonth() + 1)
      const rYil = d.getFullYear()
      try {
        if (r.odemeTipi === 'kulup') {
          const { data: mevcutT } = await supabase.from('tahsilat').select('id').eq('ogrenci_id', r.ogrenciId).eq('ay', ay).eq('yil', rYil).maybeSingle()
          if (mevcutT) { odemeAtlanan++; continue }
          const { data: tahNew, error: e1 } = await supabase.from('tahsilat').insert({
            ogrenci_id: r.ogrenciId, tutar: r.tutar, tarih: r.tarih, aciklama: r.aciklama || null,
            dekont_no: r.belge || null, ay, yil: rYil, okul_id: okulId,
          }).select('id').single()
          if (e1 || !tahNew) { odemeHata++; continue }
          const ogr = odemeOgrenciler.find(o => o.id === r.ogrenciId)
          const { error: e2 } = await supabase.from('hesap_hareketleri').insert({
            tarih: r.tarih, tutar: r.tutar, tur: 'gelir',
            aciklama: `Öğrenci ödemesi: ${ogr ? ogr.ad + ' ' + ogr.soyad : ''} ${r.aciklama || ''}`.trim(),
            dekont_no: r.belge || null, kaynak: 'tahsilat', kaynak_id: tahNew.id,
            ay, yil: rYil, okul_id: okulId,
          })
          if (e2) odemeHata++; else odemeBasarili++
        } else if (r.odemeTipi === 'kirtasiye' && kirtasiyeKategori) {
          let donem = kirtasiyeKategori.tip === 'tek_seferlik' ? '-' : `${rYil}-${String(ay).padStart(2, '0')}`
          // Öğrencinin bu dönem için taksit planı varsa ödemeyi ödenmemiş ilk taksite işle; hepsi ödenmişse atla
          const { data: plan } = taksitAcilabilir(kirtasiyeKategori)
            ? await supabase.from('tahsilat_taksit_planlari').select('vadeler').eq('kategori_id', kirtasiyeKategori.id).eq('ogrenci_id', r.ogrenciId).eq('donem', donem).maybeSingle()
            : { data: null }
          if (plan) {
            const { data: odenen } = await supabase.from('tahsilat_kayitlari').select('donem').eq('kategori_id', kirtasiyeKategori.id).eq('ogrenci_id', r.ogrenciId).like('donem', `${donem}/T%`)
            const odenenNo = new Set((odenen || []).map(k => taksitCoz(k.donem)?.no))
            const siradaki = Array.from({ length: (plan.vadeler as string[]).length }, (_, i) => i + 1).find(no => !odenenNo.has(no))
            if (!siradaki) { odemeAtlanan++; continue }
            donem = taksitKey(donem, siradaki)
          } else {
            const { data: mevcutK } = await supabase.from('tahsilat_kayitlari').select('id').eq('kategori_id', kirtasiyeKategori.id).eq('ogrenci_id', r.ogrenciId).eq('donem', donem).maybeSingle()
            if (mevcutK) { odemeAtlanan++; continue }
          }
          const { error: e3 } = await supabase.from('tahsilat_kayitlari').insert({
            kategori_id: kirtasiyeKategori.id, ogrenci_id: r.ogrenciId, donem, tutar: r.tutar, tarih: r.tarih, aciklama: r.aciklama || null, okul_id: okulId,
          })
          if (e3) odemeHata++; else odemeBasarili++
        }
      } catch { odemeHata++ }
    }

    setImportSaving(false)
    const farkliYil = yeni.some(p => p.yil !== yil)
    setImportOpen(false); setImportRows([]); setImportFileName(''); setOnizleme(null)
    const odemeMsg = isaretliler.length
      ? ` · Ödeme Takip: ${odemeBasarili} işaretlendi${odemeAtlanan ? `, ${odemeAtlanan} zaten mevcuttu` : ''}${odemeHata ? `, ${odemeHata} hata` : ''}.`
      : ''
    bilgi(`✅ ${yeni.length} hareket içe aktarıldı.${atlanan ? ` ${atlanan} mükerrer atlandı.` : ''}${farkliYil ? ' (Bazıları farklı yıla işlendi.)' : ''}${odemeMsg}`, 6000)
    load()
  }

  const sutunSecenekleri = Array.from({ length: colCount }, (_, i) => i)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Topbar
        title={birim === 'oab' ? 'OAB İşletme Defteri' : 'İşletme Defteri'}
        sub={`${view === 'kapak' ? `${yil} Yılı — Aylık Özet (Kapak)` : view === 'defter' ? `${ayLabel(ay, yil)} — Defter Görünümü` : `${ayLabel(ay, yil)} — Gelir / Gider Hareketleri`}`}
        actions={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="id-seg">
              <button className={view === 'hareketler' ? 'on' : ''} onClick={() => setView('hareketler')}><ListChecks size={14} /> Hareketler</button>
              <button className={view === 'defter' ? 'on' : ''} onClick={() => setView('defter')}><BookOpen size={14} /> Defter</button>
              <button className={view === 'kapak' ? 'on' : ''} onClick={() => setView('kapak')}><LayoutList size={14} /> Aylık Özet</button>
            </div>
            <button className="btn btn-pdf btn-sm" onClick={defterPdf}>
              <Download size={14} /> Defter PDF
            </button>
          </div>
        }
      />

      <div style={{ padding: 28 }}>
        {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : msg.startsWith('❌') ? 'alert-danger' : 'alert-info'}`} style={{ marginBottom: 16 }}>{msg}</div>}

        {view === 'kapak' ? (
          <>
            {/* Devreden tutar */}
            <div className="card" style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div className="card-title" style={{ marginBottom: 6 }}>Devreden Tutar — {yil}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text3)', lineHeight: 1.5, maxWidth: 460 }}>
                  Önceki yıldan bu yıla devreden banka bakiyesi. Aylık "Bankada Kalan" bu tutardan başlayarak yürür.
                </div>
              </div>
              <div style={{ width: 180 }}>
                <label className="form-label">Devreden (₺)</label>
                <input className="form-input" type="number" step="0.01" value={devredenInput} onChange={e => setDevredenInput(e.target.value)} placeholder="0,00" />
              </div>
              <button className="btn btn-primary" onClick={devredenKaydet} disabled={devredenSaving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Save size={15} /> {devredenSaving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>

            {/* Yıllık özet kartları */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
              <div className="stat-card"><div className="stat-label">Yıllık Gelir</div><div className="stat-value" style={{ color: 'var(--success)' }}>{fmtTL(yilToplam.gelir)}</div></div>
              <div className="stat-card red"><div className="stat-label">Yıllık Gider</div><div className="stat-value">{fmtTL(yilToplam.gider)}</div></div>
              <div className="stat-card teal"><div className="stat-label">Yıl Sonu Bankada Kalan</div><div className="stat-value" style={{ color: sonBakiye >= 0 ? 'var(--accent)' : 'var(--danger)' }}>{fmtTL(sonBakiye)}</div></div>
            </div>

            {/* Aylık tablo */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="card-title" style={{ padding: '14px 18px', marginBottom: 0, borderBottom: '1px solid var(--border)' }}>{yil} Yılı Aylık Özet</div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 140 }}>Ay</th>
                      <th className="td-num">Gelir (₺)</th>
                      <th className="td-num">Gider (₺)</th>
                      <th className="td-num">Ay Sonu Bankada Kalan (₺)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ background: 'var(--surface2)' }}>
                      <td style={{ fontWeight: 700 }}>Devreden</td>
                      <td className="td-num" style={{ color: 'var(--text3)' }}>—</td>
                      <td className="td-num" style={{ color: 'var(--text3)' }}>—</td>
                      <td className="td-num fw-600">{fmtTL(devreden)}</td>
                    </tr>
                    {aylikOzet.map(r => (
                      <tr key={r.ay} style={r.ay === ay ? { background: 'var(--accent-lighter)' } : undefined}>
                        <td style={{ fontWeight: 600 }}>{AYLAR[r.ay]}</td>
                        <td className="td-num" style={{ color: r.gelir ? 'var(--success)' : 'var(--text3)' }}>{r.gelir ? fmtTL(r.gelir) : '—'}</td>
                        <td className="td-num" style={{ color: r.gider ? 'var(--danger)' : 'var(--text3)' }}>{r.gider ? fmtTL(r.gider) : '—'}</td>
                        <td className="td-num fw-600">{fmtTL(r.bakiye)}</td>
                      </tr>
                    ))}
                    <tr className="sum-row">
                      <td>YILLIK TOPLAM</td>
                      <td className="td-num" style={{ color: 'var(--success)' }}>{fmtTL(yilToplam.gelir)}</td>
                      <td className="td-num" style={{ color: 'var(--danger)' }}>{fmtTL(yilToplam.gider)}</td>
                      <td className="td-num" style={{ fontWeight: 700 }}>{fmtTL(sonBakiye)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : view === 'defter' ? (
          <>
            <div className="card" style={{ padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700 }}>{ayLabel(ay, yil)} Defteri</div>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>Ayı değiştirmek için sol menüdeki ay/yıl seçicisini kullanın.</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 18, fontSize: 12.5 }}>
                <span>Ay Geliri: <strong style={{ color: 'var(--success)' }}>{fmtTL(defterData.gelirToplam - defterData.gelirNakli)}</strong></span>
                <span>Ay Gideri: <strong style={{ color: 'var(--danger)' }}>{fmtTL(defterData.giderToplam - defterData.giderNakli)}</strong></span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <DefterTablo title="GİDER" rows={defterData.giderAy} nakli={defterData.giderNakli} toplam={defterData.giderToplam} sira0={defterData.giderSira0} />
              <DefterTablo title="GELİR" rows={defterData.gelirAy} nakli={defterData.gelirNakli} toplam={defterData.gelirToplam} sira0={defterData.gelirSira0} />
            </div>
          </>
        ) : (
        <>
        {/* Özet */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-label"><TrendingUp size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Gelir</div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>{fmtTL(ozet.gelir)}</div>
            <div className="stat-sub">{kapsam === 'ay' ? ayLabel(ay, yil) : `${yil} yılı`}</div>
          </div>
          <div className="stat-card red">
            <div className="stat-label"><TrendingDown size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Gider</div>
            <div className="stat-value">{fmtTL(ozet.gider)}</div>
            <div className="stat-sub">{kapsam === 'ay' ? ayLabel(ay, yil) : `${yil} yılı`}</div>
          </div>
          <div className="stat-card teal">
            <div className="stat-label"><Scale size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Net (Gelir − Gider)</div>
            <div className="stat-value" style={{ color: ozet.net >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmtTL(ozet.net)}</div>
            <div className="stat-sub">{ozet.adet} hareket</div>
          </div>
        </div>

        {/* Hareket formu */}
        <div ref={formRef} className="card">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <BookText size={19} style={{ color: 'var(--accent)' }} />
              {editId ? 'Hareketi Düzenle' : 'Yeni Hareket'}
            </span>
            {!editId && (
              <button className="btn btn-secondary btn-sm" onClick={() => { setImportOpen(true); setOnizleme(null) }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                <FileSpreadsheet size={14} /> Ekstre Aktar
              </button>
            )}
          </div>

          {/* Tür seçici */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <button type="button" onClick={() => setForm(f => ({ ...f, tur: 'gelir' }))} style={turBtn(form.tur === 'gelir', 'gelir')}>
              <ArrowDownCircle size={16} /> Gelir
            </button>
            <button type="button" onClick={() => setForm(f => ({ ...f, tur: 'gider' }))} style={turBtn(form.tur === 'gider', 'gider')}>
              <ArrowUpCircle size={16} /> Gider
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={{ width: 150 }}>
              <label className="form-label">Tarih</label>
              <input className="form-input" type="date" value={form.tarih} onChange={e => setForm(f => ({ ...f, tarih: e.target.value }))} />
            </div>
            <div style={{ width: 150 }}>
              <label className="form-label">Tutar (₺)</label>
              <input className="form-input" type="number" step="0.01" min="0" value={form.tutar} onChange={e => setForm(f => ({ ...f, tutar: e.target.value }))} />
            </div>
            <div style={{ width: 150 }}>
              <label className="form-label">Belge / Dekont No</label>
              <input className="form-input" value={form.belge_no} onChange={e => setForm(f => ({ ...f, belge_no: e.target.value }))} placeholder="Opsiyonel" />
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <label className="form-label">Açıklama</label>
              <input className="form-input" value={form.aciklama} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))} placeholder="Örn. Kulüp ücreti tahsilatı / Kırtasiye alımı" />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            {editId && <button className="btn btn-secondary" onClick={vazgec} disabled={saving}><X size={15} /> Vazgeç</button>}
            <button className="btn btn-primary" onClick={kaydet} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Save size={15} /> {saving ? 'Kaydediliyor...' : (editId ? 'Güncelle' : 'Kaydet')}
            </button>
          </div>
        </div>

        {/* Liste */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Hareketler</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select className="form-select" style={{ width: 130 }} value={kapsam} onChange={e => setKapsam(e.target.value as any)}>
                <option value="ay">Bu Ay</option>
                <option value="yil">Tüm Yıl</option>
              </select>
              <select className="form-select" style={{ width: 130 }} value={turFiltre} onChange={e => setTurFiltre(e.target.value as any)}>
                <option value="hepsi">Tümü</option>
                <option value="gelir">Gelir</option>
                <option value="gider">Gider</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Tarih</th>
                  <th style={{ width: 120 }}>Belge No</th>
                  <th>Açıklama</th>
                  <th style={{ width: 90, textAlign: 'center' }}>Tür</th>
                  <th className="td-num" style={{ width: 130 }}>Tutar (₺)</th>
                  <th className="td-num" style={{ width: 140 }}>Bakiye (₺)</th>
                  <th style={{ width: 90, textAlign: 'center' }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ padding: 28, textAlign: 'center', color: 'var(--text3)' }}>Yükleniyor...</td></tr>
                ) : gorunen.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 36, textAlign: 'center', color: 'var(--text3)' }}>Bu dönemde hareket yok. Yukarıdan yeni hareket ekleyin.</td></tr>
                ) : gorunen.map(h => (
                  <tr key={h.id}>
                    <td>{tarihFmt(h.tarih)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text2)' }}>{h.belge_no || '-'}</td>
                    <td>{h.aciklama || <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${h.tur === 'gelir' ? 'badge-green' : 'badge-red'}`}>{h.tur === 'gelir' ? 'Gelir' : 'Gider'}</span>
                    </td>
                    <td className="td-num fw-600" style={{ color: h.tur === 'gelir' ? 'var(--success)' : 'var(--danger)' }}>
                      {h.tur === 'gelir' ? '+' : '−'}{fmtTL(Number(h.tutar))}
                    </td>
                    <td className="td-num" style={{ fontWeight: 600, color: (bakiyeMap.get(h.id) ?? 0) < 0 ? 'var(--danger)' : 'var(--text2)' }}>
                      {fmtTL(bakiyeMap.get(h.id) ?? 0)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-icon" title="Düzenle" onClick={() => duzenle(h)}><Pencil size={13} /></button>
                        <button className="btn btn-outline-danger btn-icon" title="Sil" onClick={() => setConf({ id: h.id, aciklama: h.aciklama || tarihFmt(h.tarih) })}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {gorunen.length > 0 && (
                  <tr className="sum-row">
                    <td colSpan={4}>DÖNEM TOPLAMI ({gorunen.length} hareket)</td>
                    <td className="td-num" style={{ fontWeight: 700 }}>{fmtTL(gorunen.reduce((s, h) => s + (h.tur === 'gelir' ? 1 : -1) * Number(h.tutar || 0), 0))}</td>
                    <td />
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}
      </div>

      {importOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(26,26,20,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }} onClick={() => !importSaving && setImportOpen(false)}>
          <div className="card" style={{ width: '100%', maxWidth: 960, maxHeight: '92vh', overflowY: 'auto', padding: '22px 24px', marginBottom: 0 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileSpreadsheet size={20} style={{ color: 'var(--accent)' }} /> Banka Ekstresi Aktar
              </h2>
              <button onClick={() => setImportOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text3)' }}><X size={20} /></button>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--text3)', lineHeight: 1.5 }}>
              Bankadan indirdiğiniz ekstre dosyasını (.xlsx / .xls / .csv) yükleyin — sütunlar otomatik tanınır.
            </p>

            {/* Dosya seçimi */}
            {!importFileName && !importReading ? (
              <div style={{ border: '1.5px dashed var(--border)', borderRadius: 10, padding: '18px', textAlign: 'center', background: 'var(--bg)' }}>
                <label className="btn btn-primary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <FileSpreadsheet size={15} /> Dosya Seç
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={dosyaSec} style={{ display: 'none' }} />
                </label>
                <div style={{ marginTop: 9, fontSize: 12.5, color: 'var(--text3)' }}>Excel / CSV dosyası (.xlsx, .xls, .csv)</div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg)', fontSize: 12.5 }}>
                <FileSpreadsheet size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {importReading ? 'Dosya okunuyor…' : <><strong>{importFileName}</strong> — {importRows.length} satır</>}
                </span>
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', flexShrink: 0 }}>
                  Değiştir
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={dosyaSec} style={{ display: 'none' }} />
                </label>
              </div>
            )}

            {/* Gelişmiş: sütun eşleştirme (varsayılan kapalı — otomatik tanıma genelde yeterli) */}
            {colCount > 0 && (
              <div style={{ marginTop: 12 }}>
                <button type="button" onClick={() => setGelismisAcik(v => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 11.5, fontWeight: 600, padding: '4px 0' }}>
                  {gelismisAcik ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Sütun eşleştirmeyi göster
                </button>
                {gelismisAcik && (
                  <div style={{ marginTop: 8, padding: 12, background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      {([['tarih', 'Tarih *'], ['tutar', 'Tutar *'], ['yon', 'Yön / Borç-Alacak'], ['aciklama', 'Açıklama'], ['belge', 'Belge No']] as const).map(([key, label]) => (
                        <div key={key} style={{ width: 150 }}>
                          <label className="form-label">{label}</label>
                          <select className="form-select" value={(colMap as any)[key]} onChange={e => setColMap(m => ({ ...m, [key]: Number(e.target.value) }))}>
                            {(key === 'yon' || key === 'aciklama' || key === 'belge') && <option value={-1}>Yok</option>}
                            {sutunSecenekleri.map(i => {
                              const baslik = basSatirAtla && importRows[0] ? importRows[0][i] : ''
                              return <option key={i} value={i}>{baslik ? `${i + 1}. ${baslik}` : `Sütun ${i + 1}`}</option>
                            })}
                          </select>
                        </div>
                      ))}
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text2)', paddingBottom: 8 }}>
                        <input type="checkbox" checked={basSatirAtla} onChange={e => setBasSatirAtla(e.target.checked)} /> İlk satır başlık
                      </label>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 8 }}>
                      Gelir/gider &ldquo;Yön&rdquo; sütunundan (+/−, Borç/Alacak) belirlenir; yoksa tutarın işaretine göre.
                    </div>
                  </div>
                )}
              </div>
            )}

            {onizleme && (() => {
              const gecerli = onizleme.filter(r => r.gecerli)
              const gImp = gecerli.filter(r => r.tur === 'gelir').reduce((s, r) => s + r.tutar, 0)
              const gdImp = gecerli.filter(r => r.tur === 'gider').reduce((s, r) => s + r.tutar, 0)
              const atlanacak = onizleme.length - gecerli.length
              const isaretliSayisi = onizleme.filter(r => r.isaretle).length
              return (
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    <StatPil label="Satır" value={`${gecerli.length}/${onizleme.length}`} />
                    <StatPil label="Gelir" value={fmtTL(gImp)} color="var(--success)" />
                    <StatPil label="Gider" value={fmtTL(gdImp)} color="var(--danger)" />
                    {atlanacak > 0 && <StatPil label="Atlanacak" value={String(atlanacak)} color="var(--warn)" />}
                    {isaretliSayisi > 0 && <StatPil label="Ödeme Takip" value={String(isaretliSayisi)} color="var(--accent)" />}
                  </div>
                  {ogrencilerSirali.length > 0 && (
                    <div style={{ fontSize: 11.5, color: 'var(--text3)', marginBottom: 10, lineHeight: 1.5 }}>
                      Açıklamadan tahmin edilen öğrenci ödemeleri sağdaki rozette görünür — tıklayıp düzeltebilir veya kaldırabilirsiniz. Sadece işaretli satırlar Ödeme Takip&rsquo;e yazılır.
                    </div>
                  )}
                  <div style={{ maxHeight: 340, overflowY: 'auto', overflowX: 'hidden', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <table className="data-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                      <colgroup>
                        <col style={{ width: 30 }} />
                        <col style={{ width: 78 }} />
                        <col style={{ width: 60 }} />
                        <col />
                        <col style={{ width: 88 }} />
                        <col style={{ width: 150 }} />
                        <col style={{ width: 30 }} />
                      </colgroup>
                      <thead><tr>
                        <th style={{ padding: '9px 4px' }}></th>
                        <th style={{ padding: '9px 6px' }}>Tarih</th>
                        <th style={{ textAlign: 'center', padding: '9px 4px' }}>Tür</th>
                        <th>Açıklama</th>
                        <th className="td-num" style={{ padding: '9px 6px' }}>Tutar (₺)</th>
                        <th style={{ padding: '9px 6px' }}>Ödeme Takip</th>
                        <th style={{ padding: '9px 4px' }}></th>
                      </tr></thead>
                      <tbody>
                        {onizleme.map((r, idx) => (
                          <tr key={idx} style={r.gecerli ? undefined : { background: 'var(--warn-light)' }}>
                            <td style={{ textAlign: 'center', padding: '9px 4px' }}>{r.gecerli ? <CheckCircle2 size={15} color="var(--success)" /> : <AlertTriangle size={15} color="var(--warn)" />}</td>
                            <td style={{ fontSize: 12, padding: '9px 6px' }}>{r.tarih ? tarihFmt(r.tarih) : <span style={{ color: 'var(--danger)', fontSize: 11 }}>geçersiz</span>}</td>
                            <td style={{ textAlign: 'center', padding: '9px 4px' }}>
                              <button
                                onClick={() => setOnizleme(o => o ? o.map((x, i) => i === idx ? { ...x, tur: x.tur === 'gelir' ? 'gider' : 'gelir' } : x) : o)}
                                className={`badge ${r.tur === 'gelir' ? 'badge-green' : 'badge-red'}`}
                                style={{ border: 'none', cursor: 'pointer', padding: '2px 6px', fontSize: 10.5 }}
                                title="Gelir/Gider değiştir"
                              >{r.tur === 'gelir' ? 'Gelir' : 'Gider'}</button>
                            </td>
                            <td style={{ fontSize: 12, whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word', padding: '8px 6px' }}>
                              <div>{r.aciklama || '—'}</div>
                              {r.belge && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>Belge: {r.belge}</div>}
                            </td>
                            <td className="td-num" style={{ fontSize: 12, padding: '9px 6px' }}>{isNaN(r.tutar) ? '—' : fmtTL(r.tutar)}</td>
                            <td style={{ padding: '6px', textAlign: 'center' }}>
                              {r.tur !== 'gelir' ? (
                                <span style={{ color: 'var(--text3)', fontSize: 11 }}>—</span>
                              ) : (
                                <button
                                  onClick={e => setEslesmePop({ idx, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() })}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5, maxWidth: '100%',
                                    padding: '4px 9px', borderRadius: 20, fontSize: 10.5, fontWeight: 600, cursor: 'pointer',
                                    border: `1px solid ${r.ogrenciId ? (r.isaretle ? 'var(--success-border)' : 'var(--border)') : 'var(--border)'}`,
                                    background: r.ogrenciId ? (r.isaretle ? 'var(--success-light)' : 'var(--surface2)') : 'var(--surface)',
                                    color: r.ogrenciId ? (r.isaretle ? '#1a7a3a' : 'var(--text2)') : 'var(--text3)',
                                  }}
                                  title="Öğrenci eşleştirmesini düzenle"
                                >
                                  {r.ogrenciId ? (r.isaretle ? <CheckCircle2 size={12} /> : <Circle size={12} />) : <UserCheck size={12} />}
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 118 }}>
                                    {r.ogrenciId ? (ogrenciAdMap.get(r.ogrenciId) || '—') : 'Eşleştir'}
                                  </span>
                                </button>
                              )}
                            </td>
                            <td style={{ textAlign: 'center', padding: '9px 4px' }}>
                              <button onClick={() => { setOnizleme(o => o ? o.filter((_, i) => i !== idx) : o); setEslesmePop(null) }} title="Satırı çıkar" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text3)' }}><X size={14} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })()}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setImportOpen(false)} disabled={importSaving}>İptal</button>
              <button className="btn btn-primary" onClick={importKaydet} disabled={importSaving || !onizleme || !onizleme.some(r => r.gecerli)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Save size={15} /> {importSaving ? 'Kaydediliyor...' : 'İçe Aktar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ödeme Takip eşleştirme popover */}
      {eslesmePop && onizleme && onizleme[eslesmePop.idx] && (() => {
        const idx = eslesmePop.idx
        const r = onizleme[idx]
        const rect = eslesmePop.rect
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1000
        const vh = typeof window !== 'undefined' ? window.innerHeight : 800
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1200 }} onClick={() => setEslesmePop(null)}>
            <div
              style={{ position: 'absolute', top: Math.min(rect.bottom + 6, vh - 280), left: Math.min(Math.max(rect.left - 100, 10), vw - 270), background: 'var(--surface)', borderRadius: 12, boxShadow: '0 16px 44px rgba(0,0,0,0.22)', padding: 16, width: 254, border: '1px solid var(--border)' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>Ödeme Takip Eşleştirme</div>
              <label className="form-label">Öğrenci</label>
              <select
                className="form-select"
                value={r.ogrenciId ?? ''}
                onChange={e => { const v = e.target.value ? Number(e.target.value) : null; onizlemeGuncelle(idx, { ogrenciId: v, isaretle: v && r.odemeTipi ? r.isaretle : false }) }}
                style={{ marginBottom: 10 }}
              >
                <option value="">— Seçilmedi —</option>
                {ogrencilerSirali.map(o => <option key={o.id} value={o.id}>{o.ad} {o.soyad}{o.sinif ? ` (${o.sinif})` : ''}</option>)}
              </select>
              <label className="form-label">Ödeme Tipi</label>
              <select
                className="form-select"
                value={r.odemeTipi ?? ''}
                onChange={e => { const v = (e.target.value || null) as OdemeTipi | null; onizlemeGuncelle(idx, { odemeTipi: v, isaretle: v && r.ogrenciId ? r.isaretle : false }) }}
                style={{ marginBottom: 12 }}
              >
                <option value="">Tip yok</option>
                <option value="kulup">Kulüp</option>
                <option value="kirtasiye">Kırtasiye</option>
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text2)', marginBottom: 14, opacity: (!r.ogrenciId || !r.odemeTipi) ? 0.5 : 1 }}>
                <input type="checkbox" checked={r.isaretle} disabled={!r.ogrenciId || !r.odemeTipi} onChange={e => onizlemeGuncelle(idx, { isaretle: e.target.checked })} />
                Ödeme Takip&rsquo;e işle
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setEslesmePop(null)}>Kapat</button>
                {r.ogrenciId && (
                  <button
                    className="btn btn-sm"
                    style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid var(--danger-border)' }}
                    onClick={() => { onizlemeGuncelle(idx, { ogrenciId: null, odemeTipi: null, isaretle: false }); setEslesmePop(null) }}
                  >Kaldır</button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {conf && (
        <ConfirmModal
          baslik="Hareketi Sil"
          mesaj={`"${conf.aciklama}" hareketini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
          onayMetni="Evet, Sil"
          tehlikeli
          onOnayla={silOnayla}
          onIptal={() => setConf(null)}
        />
      )}

      <style jsx>{`
        .id-seg { display: inline-flex; background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 3px; gap: 2px; }
        .id-seg button { display: inline-flex; align-items: center; gap: 6px; border: none; background: transparent; color: var(--text2); font-size: 12.5px; font-weight: 600; padding: 6px 12px; border-radius: 7px; cursor: pointer; transition: all 0.15s; }
        .id-seg button:hover { color: var(--accent); }
        .id-seg button.on { background: var(--surface); color: var(--accent); box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
      `}</style>
    </div>
  )
}

function DefterTablo({ title, rows, nakli, toplam, sira0 }: { title: 'GİDER' | 'GELİR'; rows: IsletmeHareket[]; nakli: number; toplam: number; sira0: number }) {
  const gelir = title === 'GELİR'
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 0 }}>
      <div style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 800, letterSpacing: 1.5, fontSize: 14, borderBottom: '1px solid var(--border)', background: gelir ? 'var(--accent-lighter)' : 'var(--danger-light)', color: gelir ? 'var(--accent)' : 'var(--danger)' }}>
        {title}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ width: 64, textAlign: 'center', verticalAlign: 'middle' }}>Sıra No</th>
              <th colSpan={2} style={{ textAlign: 'center' }}>{gelir ? 'Alındı Belgesi veya Banka Dekontunun' : 'Alınan Fatura veya Belgenin'}</th>
              <th rowSpan={2} style={{ verticalAlign: 'middle' }}>Açıklama</th>
              <th rowSpan={2} className="td-num" style={{ width: 150, verticalAlign: 'middle' }}>Miktarı / Tutarı (₺)</th>
            </tr>
            <tr>
              <th style={{ width: 100, textAlign: 'center' }}>Tarihi</th>
              <th style={{ width: 100, textAlign: 'center' }}>{gelir ? 'Sıra No' : "No'su"}</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: 'var(--surface2)' }}>
              <td colSpan={4} style={{ textAlign: 'center', fontWeight: 700 }}>Nakli Toplam</td>
              <td className="td-num" style={{ fontWeight: 600 }}>{fmtTL(nakli)}</td>
            </tr>
            {rows.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text3)', padding: 22 }}>Bu ay {gelir ? 'gelir' : 'gider'} kaydı yok.</td></tr>
            ) : rows.map((r, idx) => (
              <tr key={r.id}>
                <td style={{ textAlign: 'center' }}>{sira0 + idx + 1}</td>
                <td style={{ textAlign: 'center' }}>{tarihFmt(r.tarih)}</td>
                <td style={{ textAlign: 'center', fontSize: 12 }}>{r.belge_no || '-'}</td>
                <td>{r.aciklama || <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                <td className="td-num">{fmtTL(Number(r.tutar))}</td>
              </tr>
            ))}
            <tr className="sum-row">
              <td colSpan={4} style={{ textAlign: 'center', fontWeight: 700 }}>Toplam</td>
              <td className="td-num" style={{ fontWeight: 700 }}>{fmtTL(toplam)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatPil({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '6px 12px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', minWidth: 64 }}>
      <span style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text3)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: color || 'var(--text)' }}>{value}</span>
    </div>
  )
}

function turBtn(active: boolean, tur: IsletmeTur): React.CSSProperties {
  const renk = tur === 'gelir' ? 'var(--success)' : 'var(--danger)'
  return {
    flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    padding: '10px 12px', borderRadius: 9, fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
    border: `1.5px solid ${active ? renk : 'var(--border)'}`,
    background: active ? renk : 'var(--surface)',
    color: active ? '#fff' : 'var(--text2)',
    boxShadow: active ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
    transition: 'all 0.15s',
  }
}
