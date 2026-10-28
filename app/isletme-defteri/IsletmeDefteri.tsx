'use client'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import Topbar from '@/components/Topbar'
import { useAy } from '@/lib/AyContext'
import { pdfHazirla, pdfBaslik, pdfTablo, pdfAc, PDF_RENK, PDF_KENAR } from '@/lib/pdf'
import type { RowInput, UserOptions } from '@/lib/pdf'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { ayLabel, fmtTL, tarihFmt, AYLAR } from '@/lib/hesaplama'
import { IsletmeHareket, IsletmeTur, Ayarlar, Ogrenci, TahsilatKategori, kulupOgrencisi, Birim, birimKurumAdi } from '@/lib/types'
import { taksitAcilabilir, taksitKey, taksitCoz } from '@/lib/taksit'
import { aciklamayiAyristir, ogrenciEslestir } from '@/lib/ekstreEslesme'
import ConfirmModal from '@/components/ConfirmModal'
import {
  BookText, BookOpen, Pencil, Trash2, TrendingUp, TrendingDown, Scale, Save, X, ArrowDownCircle, ArrowUpCircle, ListChecks, LayoutList, Download, FileSpreadsheet,
} from 'lucide-react'
import { hataMesaji } from '@/lib/hata'
import { useYukleme } from '@/lib/useYukleme'
import { useDegisince } from '@/lib/useDegisince'
import { bugunISO, OdemeTipi, ParsedRow, parseTutar, parseTarih, cellStr, ekstreBasligiBul, ColMap, autoDetect, FormState, bosForm, DefterTablo, turBtn } from './yardimcilar'
import EkstreModal from '@/app/isletme-defteri/EkstreModal'

// Kulüp defterinin kendiliğinden gelen satırları: Hesap Hareketleri (Ödeme Takibi aidatları ve dağıtım giderleri)
// ile kulüp tahsilat takibi ödemeleri. Kimlikler negatiftir; elle girilen isletme_defteri satırlarıyla çakışmaz.
async function kulupOtomatikHareketler(yil: number): Promise<IsletmeHareket[]> {
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
    setHareketler([...(data || []), ...(birim === 'kulup' ? await kulupOtomatikHareketler(yil) : [])])
    setAyarlar(ayr || null)
    const dv = devir?.devreden_tutar != null ? Number(devir.devreden_tutar) : 0
    setDevreden(dv)
    setDevredenInput(dv ? String(dv) : '')
    setLoading(false)
  }, [yil, birim])

  useYukleme(load)

  // Ay değişince form tarihini güncelle (düzenleme yokken)
  useDegisince(`${ay}-${yil}`, () => { if (editId == null) setForm(f => ({ ...f, tarih: varsayilanTarih() })) })

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
      const colStyles: UserOptions['columnStyles'] = {
        0: { cellWidth: wSira, halign: 'center' },
        1: { cellWidth: wTarih, halign: 'center' },
        2: { cellWidth: wNo, halign: 'center' },
        3: { cellWidth: wAcik, halign: 'left' },
        4: { cellWidth: wTutar, halign: 'right' },
      }

      const asc = (a: IsletmeHareket, b: IsletmeHareket) => (a.tarih < b.tarih ? -1 : a.tarih > b.tarih ? 1 : (a.id - b.id))
      const giderler = hareketler.filter(h => h.tur === 'gider').sort(asc)
      const gelirler = hareketler.filter(h => h.tur === 'gelir').sort(asc)

      function headFor(title: 'GİDER' | 'GELİR'): RowInput[] {
        return [
          [
            { content: 'Sıra No', rowSpan: 2 },
            // İki başlık da iki satır: karşılıklı sayfalarda tablolar aynı hizada başlar
            { content: title === 'GİDER' ? 'Alınan Fatura\nveya Belgenin' : 'Alındı Belgesi veya\nBanka Dekontunun', colSpan: 2 },
            { content: 'Açıklama', rowSpan: 2 },
            { content: 'Miktarı / Tutarı (₺)', rowSpan: 2 },
          ],
          [
            { content: 'Tarihi' },
            { content: title === 'GİDER' ? "No'su" : 'Sıra No' },
          ],
        ]
      }

      // Gerçek defter mantığı: açık defterde solda GİDER, sağda GELİR sayfası karşılıklı durur.
      // Sayfalar çift çift dizilir (Gider 1, Gelir 1, Gider 2, Gelir 2 …); bir taraf daha kısa
      // kalsa da karşısına aynı numaralı boş sayfa gelir. Her sayfa RPP satırlık sabit cetveldir;
      // sıra no ve Nakli Toplam/Toplam sayfadan sayfaya devam eder. GELİR devreden'den, GİDER 0'dan başlar.
      const taraflar = [
        { title: 'GİDER' as const, rows: giderler, run: 0, sira: 0 },
        { title: 'GELİR' as const, rows: gelirler, run: devreden, sira: 0 },
      ]
      const nPages = Math.max(Math.ceil(giderler.length / RPP), Math.ceil(gelirler.length / RPP), 1)

      for (let p = 0; p < nPages; p++) {
        for (const t of taraflar) {
          if (p > 0 || t.title === 'GELİR') pdf.addPage()
          const y0 = pdfBaslik(pdf, { kurum: birimKurumAdi(birim, ayarlar, okul?.ad), baslik: 'İşletme hesabı defteri', alt: `${t.title} · ${yil}` })
          // Defter sayfa numarası: sağ üstte yalnızca rakam, kalın ve büyük
          pdf.setFont('NotoSans', 'bold'); pdf.setFontSize(16); pdf.setTextColor(...PDF_RENK.metin)
          pdf.text(String(p + 1), PW - M, 15, { align: 'right' })

          const slice = t.rows.slice(p * RPP, (p + 1) * RPP)
          const body: RowInput[] = []
          body.push([{ content: 'Nakli Toplam', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold' } }, { content: fmtTL(t.run), styles: { halign: 'right', fontStyle: 'bold' } }])
          for (const r of slice) { t.sira++; t.run += Number(r.tutar || 0); body.push([t.sira, tarihFmt(r.tarih), r.belge_no || '-', r.aciklama || '', fmtTL(Number(r.tutar))]) }
          // Boş satırlar: karşılıklı sayfalar aynı boyda, elle yazmaya uygun cetvel
          for (let i = slice.length; i < RPP; i++) body.push(['', '', '', '', ''])
          body.push([{ content: 'Toplam', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fillColor: PDF_RENK.toplamZemin } }, { content: fmtTL(t.run), styles: { halign: 'right', fontStyle: 'bold', fillColor: PDF_RENK.toplamZemin } }])

          autoTable(pdf, pdfTablo({
            head: headFor(t.title),
            body,
            startY: y0,
            margin: { left: M, right: M, top: 14, bottom: 14 },
            tableWidth: usable,
            styles: { fontSize: 8, cellPadding: 1.6, minCellHeight: 7 },
            columnStyles: colStyles,
          }))
        }
      }

      // Resmî defter: sayfa altında üretim bilgisi basılmaz
      pdfAc(pdf, 'İşletme hesabı defteri', false)
      bilgi('✅ Defter PDF hazırlandı.')
    } catch (err) {
      bilgi('❌ PDF hatası: ' + (hataMesaji(err, 'Bilinmiyor')), 5000)
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
    } catch (err) {
      bilgi('❌ Kayıt hatası: ' + (hataMesaji(err, 'Bilinmiyor')), 5000)
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
  }, [importOpen, odemeVerisiYuklendi, birim])

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
      const aoa: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, blankrows: false })
      const tumSatirlar = aoa.map(r => (r || []).map(cellStr)).filter(r => r.some(c => c && c.trim()))
      if (!tumSatirlar.length) { bilgi('⚠️ Dosyada veri bulunamadı.'); setImportReading(false); return }
      const basIdx = ekstreBasligiBul(tumSatirlar)
      const rows = basIdx > 0 ? tumSatirlar.slice(basIdx) : tumSatirlar
      setImportRows(rows)
      setColMap(autoDetect(rows, basSatirAtla))
    } catch (err) {
      bilgi('❌ Dosya okunamadı: ' + (hataMesaji(err, 'Bilinmiyor')), 5000)
    } finally {
      setImportReading(false)
    }
  }

  // Dosya / eşleme / başlık değişince önizlemeyi canlı üret
  useDegisince([importRows, colMap, basSatirAtla, ogrencilerSirali, kirtasiyeKategori, birim], () => {
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
  })

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
        title={birim === 'oab' ? 'OAB İşletme Defteri' : birim === 'kulup' ? 'Kulüp İşletme Defteri' : 'İşletme Defteri'}
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
        {birim === 'kulup' && (
          <div className="alert alert-info" style={{ marginBottom: 16 }}>
            Ödeme Takibi’ndeki aidat tahsilatları, Hesap Hareketleri’ndeki giderler ve Kulüp Tahsilat Takip ödemeleri deftere kendiliğinden yazılır; onları kendi ekranlarında düzeltin. Burada yalnızca o ekranlarda olmayan gelir ve giderleri (kira, fatura, malzeme vb.) girin.
          </div>
        )}

        {view === 'kapak' ? (
          <>
            {/* Devreden tutar */}
            <div className="card" style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div className="card-title" style={{ marginBottom: 6 }}>Devreden Tutar — {yil}</div>
                <div style={{ fontSize: 12.5, color: 'var(--text3)', lineHeight: 1.5, maxWidth: 460 }}>
                  Önceki yıldan bu yıla devreden banka bakiyesi. Aylık “Bankada Kalan” bu tutardan başlayarak yürür.
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
            {!editId && birim !== 'kulup' && (
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
              <select className="form-select" style={{ width: 130 }} value={kapsam} onChange={e => setKapsam(e.target.value as typeof kapsam)}>
                <option value="ay">Bu Ay</option>
                <option value="yil">Tüm Yıl</option>
              </select>
              <select className="form-select" style={{ width: 130 }} value={turFiltre} onChange={e => setTurFiltre(e.target.value as typeof turFiltre)}>
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
                    <td>
                      {h.aciklama || <span style={{ color: 'var(--text3)' }}>—</span>}
                      {h.otomatikKaynak && <span className="badge badge-gray" style={{ marginLeft: 8, fontSize: 10.5 }}>{h.otomatikKaynak}</span>}
                    </td>
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
                      {h.kaynak === 'otomatik' ? <span style={{ fontSize: 11.5, color: 'var(--text3)' }}>Otomatik</span> : (
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-icon" title="Düzenle" onClick={() => duzenle(h)}><Pencil size={13} /></button>
                        <button className="btn btn-outline-danger btn-icon" title="Sil" onClick={() => setConf({ id: h.id, aciklama: h.aciklama || tarihFmt(h.tarih) })}><Trash2 size={13} /></button>
                      </div>
                      )}
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

      {importOpen && <EkstreModal setImportOpen={setImportOpen} importFileName={importFileName} importReading={importReading} dosyaSec={dosyaSec} importRows={importRows} colCount={colCount} gelismisAcik={gelismisAcik} setGelismisAcik={setGelismisAcik} colMap={colMap} setColMap={setColMap} sutunSecenekleri={sutunSecenekleri} basSatirAtla={basSatirAtla} setBasSatirAtla={setBasSatirAtla} onizleme={onizleme} setOnizleme={setOnizleme} setEslesmePop={setEslesmePop} ogrencilerSirali={ogrencilerSirali} ogrenciAdMap={ogrenciAdMap} importSaving={importSaving} importKaydet={importKaydet} />}

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
