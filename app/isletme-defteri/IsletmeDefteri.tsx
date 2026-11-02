'use client'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import Topbar from '@/components/Topbar'
import { useAy } from '@/lib/AyContext'
import { perdeKapat } from '@/lib/perdeKapat'
import { pdfHazirla, pdfBaslik, pdfTablo, pdfAc, PDF_RENK, PDF_KENAR } from '@/lib/pdf'
import type { RowInput, UserOptions } from '@/lib/pdf'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { ayLabel, fmtTL, tarihFmt, AYLAR } from '@/lib/hesaplama'
import { IsletmeHareket, IsletmeTur, Ayarlar, Ogrenci, TahsilatKategori, Birim, birimKurumAdi } from '@/lib/types'
import { taksitAcilabilir, taksitKey, taksitCoz, aylikVadeler } from '@/lib/taksit'
import { aylikDonem, donemlikDonem, hedefleriHazirla, odemeTahminEt, KULUP_HEDEF, type OdemeParcasi } from '@/lib/ekstreEslesme'
import ConfirmModal from '@/components/ConfirmModal'
import {
  Plus,
  BookText, BookOpen, Pencil, Trash2, TrendingUp, TrendingDown, Scale, Save, X, ArrowDownCircle, ArrowUpCircle, ListChecks, LayoutList, Download, FileSpreadsheet,
} from 'lucide-react'
import { hataMesaji } from '@/lib/hata'
import { useYukleme } from '@/lib/useYukleme'
import { useDegisince } from '@/lib/useDegisince'
import { bugunISO, ParsedRow, parcaEksigi, type ImportSonuc, parseTutar, parseTarih, cellStr, ekstreBasligiBul, ColMap, autoDetect, FormState, bosForm, DefterTablo, turBtn } from './yardimcilar'
import EkstreModal from '@/app/isletme-defteri/EkstreModal'
import { defterKapagi, makamSatirlari, BIRIM_HESAP_ADI, type KapakVerisi } from './kapakPdf'
import { kulupOtomatikHareketler } from '@/lib/isletmeDefteri'

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
  const [odemeUyelikler, setOdemeUyelikler] = useState<{ kategori_id: number; ogrenci_id: number }[]>([])
  const [odemePlanlari, setOdemePlanlari] = useState<{ kategori_id: number; ogrenci_id: number; tutarlar: number[] }[]>([])
  const [importSonuc, setImportSonuc] = useState<ImportSonuc | null>(null)
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

  // Kapak başlığındaki makam satırları için okulun ilçe/il adı yalnızca PDF üretilirken sorgulanır
  async function kapakVerisi(): Promise<KapakVerisi> {
    const [ilce, il] = await Promise.all([
      okul?.ilce_id ? supabase.from('ilceler').select('ad').eq('id', okul.ilce_id).maybeSingle() : null,
      okul?.il_id ? supabase.from('iller').select('ad').eq('id', okul.il_id).maybeSingle() : null,
    ])
    return {
      makam: makamSatirlari(il?.data?.ad, ilce?.data?.ad),
      // Ayarlar'daki Kurum Adı esastır (diğer resmî çıktılardaki gibi); boşsa kayıttaki okul adı kullanılır
      okulAdi: ayarlar?.kurum_adi?.trim() || okul?.ad || '',
      hesapAdi: BIRIM_HESAP_ADI[birim],
      yil, devreden, aylar: aylikOzet,
    }
  }

  async function kapakPdf() {
    bilgi('⌛ Kapak PDF hazırlanıyor...', 0)
    try {
      const [{ pdf, autoTable }, kapak] = await Promise.all([pdfHazirla('portrait'), kapakVerisi()])
      defterKapagi(pdf, autoTable, kapak)
      pdfAc(pdf, 'İşletme hesabı defteri kapağı', false)
      bilgi('✅ Kapak PDF hazırlandı.')
    } catch (err) {
      bilgi('❌ PDF hatası: ' + (hataMesaji(err, 'Bilinmiyor')), 5000)
    }
  }

  // ── Resmî İşletme Hesabı Defteri PDF (kapak + çift taraflı, nakli toplam devirli) ──
  async function defterPdf() {
    if (!hareketler.length) { bilgi('⚠️ Bu yıl için defter hareketi yok.'); return }
    bilgi('⌛ Defter PDF hazırlanıyor...', 0)
    try {
      const [{ pdf, autoTable }, kapak] = await Promise.all([pdfHazirla('portrait'), kapakVerisi()])
      defterKapagi(pdf, autoTable, kapak)

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
      // Kapaktan sonra sayfalar çift çift dizilir (Gider 1, Gelir 1, Gider 2, Gelir 2 …); çift taraflı
      // basımda kapak sağ sayfa olduğundan GİDER hep sola, GELİR hep sağa düşer. Bir taraf daha kısa
      // kalsa da karşısına aynı numaralı boş sayfa gelir. Her sayfa RPP satırlık sabit cetveldir;
      // sıra no ve Nakli Toplam/Toplam sayfadan sayfaya devam eder. GELİR devreden'den, GİDER 0'dan başlar.
      const taraflar = [
        { title: 'GİDER' as const, rows: giderler, run: 0, sira: 0 },
        { title: 'GELİR' as const, rows: gelirler, run: devreden, sira: 0 },
      ]
      const nPages = Math.max(Math.ceil(giderler.length / RPP), Math.ceil(gelirler.length / RPP), 1)

      for (let p = 0; p < nPages; p++) {
        for (const t of taraflar) {
          pdf.addPage()
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

  // Ekstredeki öğrenci ödemelerini eşleştirebilmek için öğrenci/kategori listesini yükle.
  // Aynı banka hesabına okulun, OAB'nin ve kulübün tahsilatları gelebildiği için tüm birimlerin kategorileri aranır.
  // Taksit planları da yüklenir: açıklamasız ödeme, öğrencinin taksit tutarıyla eşleşebilir.
  useEffect(() => {
    if (!importOpen || odemeVerisiYuklendi) return
    ;(async () => {
      const [{ data: ogr }, { data: kat }, { data: uye }, { data: pl }] = await Promise.all([
        supabase.from('ogrenciler').select('*').order('soyad'),
        supabase.from('tahsilat_kategorileri').select('*'),
        supabase.from('tahsilat_kategori_ogrenci').select('kategori_id, ogrenci_id'),
        supabase.from('tahsilat_taksit_planlari').select('kategori_id, ogrenci_id, tutarlar'),
      ])
      setOdemeOgrenciler((ogr || []).filter((o: Ogrenci) => o.aktif !== false))
      setOdemeKategoriler(kat || [])
      setOdemeUyelikler(uye || [])
      setOdemePlanlari(pl || [])
      setOdemeVerisiYuklendi(true)
    })()
  }, [importOpen, odemeVerisiYuklendi, birim])

  // OAB hesabına kulüp aidatı gelmez; kulüp Ödeme Takibi yalnız okul/kulüp defterinden işlenir
  const odemeHedefleri = useMemo(
    () => hedefleriHazirla(odemeKategoriler, odemeUyelikler, { dahil: birim !== 'oab' }, odemePlanlari),
    [odemeKategoriler, odemeUyelikler, odemePlanlari, birim]
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
    setImportSonuc(null)
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
  useDegisince([importRows, colMap, basSatirAtla, ogrencilerSirali, odemeHedefleri], () => {
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
      const satir: ParsedRow = { tarih, tutar, tur, aciklama, belge, gecerli, parcalar: [], isaretle: false, uyari: null, tutaraGore: false, odemeDegil: false }

      // Gelir satırlarında açıklamadan öğrenci ödemesi tahmini — sadece önizleme, kullanıcı düzeltebilir
      if (gecerli && tur === 'gelir' && aciklama && ogrencilerSirali.length && odemeHedefleri.length) {
        const t = odemeTahminEt(aciklama, tutar, tarih, ogrencilerSirali, odemeHedefleri)
        Object.assign(satir, { parcalar: t.parcalar, isaretle: t.isaretle, uyari: t.uyari, tutaraGore: t.tutaraGore, odemeDegil: t.odemeDegil })
      }
      return satir
    })
    setOnizleme(rows)
  })

  /** Parçanın Tahsilat Takip'te düştüğü dönem anahtarı (taksit planı varsa kaydetme sırasında taksite çevrilir) */
  function parcaDonemi(tarih: string, p: OdemeParcasi, k: TahsilatKategori): string {
    if (k.tip === 'tek_seferlik') return '-'
    if (k.tip === 'donemlik') return donemlikDonem(tarih)
    return aylikDonem(tarih, p.ay || Number(tarih.slice(5, 7)))
  }

  async function importKaydet() {
    if (!onizleme || !okulId) { bilgi('❌ Oturum bilgisi eksik, sayfayı yenileyin.'); return }
    const gecerliler = onizleme.filter(r => r.gecerli)
    if (!gecerliler.length) { bilgi('❌ Kaydedilecek geçerli satır yok.'); return }
    setImportSaving(true)
    const payloads = gecerliler.map(r => {
      const d = new Date(r.tarih)
      return { tarih: r.tarih, belge_no: r.belge || null, aciklama: r.aciklama || null, tutar: r.tutar, tur: r.tur, kaynak: 'banka', ay: d.getMonth() + 1, yil: d.getFullYear(), okul_id: okulId, birim }
    })

    // Mükerrer koruması: aynı tarih+tutar+tür+belge+açıklama zaten varsa atla
    // (açıklama dahil: aynı gün aynı tutarda iki velinin ödemesi tek satır sayılmasın)
    const anahtar = (t: string, tt: number, tr: string, b: string | null, a: string | null) => `${t}|${Number(tt).toFixed(2)}|${tr}|${(b || '').trim()}|${(a || '').trim()}`
    const yillar = Array.from(new Set(payloads.map(p => p.yil)))
    const { data: mevcut } = await supabase.from('isletme_defteri').select('tarih, tutar, tur, belge_no, aciklama').eq('birim', birim).in('yil', yillar)
    const mevcutSet = new Set((mevcut || []).map(m => anahtar(m.tarih, Number(m.tutar), m.tur, m.belge_no, m.aciklama)))
    const yeni = payloads.filter(p => !mevcutSet.has(anahtar(p.tarih, p.tutar, p.tur, p.belge_no, p.aciklama)))
    const atlanan = payloads.length - yeni.length

    if (yeni.length) {
      const { error } = await supabase.from('isletme_defteri').insert(yeni)
      if (error) { setImportSaving(false); bilgi('❌ Aktarım hatası: ' + error.message, 6000); return }
    }

    // Tahsilat Takip / Ödeme Takibi: işaretli gelir satırlarının her parçası ekstredeki tarihle ödendi işaretlenir.
    // Defterde zaten olan satırlar da işlenir; böylece aynı ekstre yeniden yüklenince eksik işaretler tamamlanır.
    const sonuc: ImportSonuc = { hareket: yeni.length, mukerrer: atlanan, isaretlenen: 0, tarihiGuncellenen: 0, zatenVardi: 0, hata: 0, taksitAcilan: 0, elle: [] }
    const elle = (r: ParsedRow, neden: string, p?: OdemeParcasi) => sonuc.elle.push({
      tarih: r.tarih, aciklama: r.aciklama, tutar: p && r.parcalar.length > 1 ? p.tutar : r.tutar,
      neden: p && r.parcalar.length > 1 ? `${ogrenciAdMap.get(p.ogrenciId ?? -1) || 'öğrenci seçilmedi'} · ${odemeHedefleri.find(h => h.anahtar === p.hedef)?.ad || 'tür seçilmedi'}: ${neden}` : neden,
    })

    /** Bir parçayı (öğrenci × ödeme kalemi) işler */
    async function parcaIsle(r: ParsedRow, p: OdemeParcasi) {
      const ogrenciId = p.ogrenciId!
      if (p.hedef === KULUP_HEDEF) {
        const [yStr, mStr] = aylikDonem(r.tarih, p.ay || Number(r.tarih.slice(5, 7))).split('-')
        const ay = Number(mStr), rYil = Number(yStr)
        const { data: mevcutT } = await supabase.from('tahsilat').select('id, tarih').eq('ogrenci_id', ogrenciId).eq('ay', ay).eq('yil', rYil).maybeSingle()
        if (mevcutT) {
          if (mevcutT.tarih !== r.tarih) {
            const { error } = await supabase.from('tahsilat').update({ tarih: r.tarih }).eq('id', mevcutT.id)
            if (error) sonuc.hata++; else sonuc.tarihiGuncellenen++
          } else sonuc.zatenVardi++
          return
        }
        const { data: tahNew, error: e1 } = await supabase.from('tahsilat').insert({
          ogrenci_id: ogrenciId, tutar: p.tutar, tarih: r.tarih, aciklama: r.aciklama || null,
          dekont_no: r.belge || null, ay, yil: rYil, okul_id: okulId,
        }).select('id').single()
        if (e1 || !tahNew) { sonuc.hata++; return }
        const ogr = odemeOgrenciler.find(o => o.id === ogrenciId)
        const { error: e2 } = await supabase.from('hesap_hareketleri').insert({
          tarih: r.tarih, tutar: p.tutar, tur: 'gelir',
          aciklama: `Öğrenci ödemesi: ${ogr ? ogr.ad + ' ' + ogr.soyad : ''} ${r.aciklama || ''}`.trim(),
          dekont_no: r.belge || null, kaynak: 'tahsilat', kaynak_id: tahNew.id,
          ay, yil: rYil, okul_id: okulId,
        })
        if (e2) sonuc.hata++; else sonuc.isaretlenen++
        return
      }

      const hedef = odemeHedefleri.find(h => h.anahtar === p.hedef)
      const k = hedef?.kategori
      if (!k) { elle(r, 'Kategori bulunamadı', p); return }
      let donem = parcaDonemi(r.tarih, p, k)
      const { data: kayitlarHam } = await supabase.from('tahsilat_kayitlari').select('id, donem, tarih, tutar, aciklama').eq('kategori_id', k.id).eq('ogrenci_id', ogrenciId).like('donem', `${donem}%`)
      const kayitlar = ((kayitlarHam || []) as { id: number; donem: string; tarih: string | null; tutar: number | null; aciklama: string | null }[])
        .sort((a, b) => a.donem.localeCompare(b.donem, 'tr', { numeric: true }))
      // Bu ödeme zaten işlenmiş (aynı tarih) ya da elle işaretlenmişse yeni kayıt açma, tarihi ekstredekiyle düzelt.
      // Elle işaret: açıklamasız (ekstreden gelenlerde banka açıklaması olur) ve tutarı aynı/boş kayıt — taksitler dahil, ilk taksitten başlanır
      if (kayitlar.some(x => x.tarih === r.tarih)) { sonuc.zatenVardi++; return }
      const ayniDonem = (x: { donem: string }) => x.donem === donem || taksitCoz(x.donem)?.donem === donem
      const elleIsaretli = kayitlar.find(x => ayniDonem(x) && !x.aciklama && (x.tutar == null || Math.abs(Number(x.tutar) - p.tutar) < 0.01))
      if (elleIsaretli) {
        const { error } = await supabase.from('tahsilat_kayitlari').update({ tarih: r.tarih, tutar: elleIsaretli.tutar ?? p.tutar, aciklama: r.aciklama || null }).eq('id', elleIsaretli.id)
        if (error) sonuc.hata++; else sonuc.tarihiGuncellenen++
        return
      }
      // Öğrencinin bu dönem için taksit planı varsa ödemeyi ödenmemiş ilk taksite işle
      const { data: plan } = taksitAcilabilir(k)
        ? await supabase.from('tahsilat_taksit_planlari').select('vadeler').eq('kategori_id', k.id).eq('ogrenci_id', ogrenciId).eq('donem', donem).maybeSingle()
        : { data: null }
      const ogr = odemeOgrenciler.find(o => o.id === ogrenciId)
      const ucret = ogr && hedef ? hedef.ucret(ogr) : null
      if (plan) {
        const odenenNo = new Set(kayitlar.map(x => taksitCoz(x.donem)?.no))
        const siradaki = Array.from({ length: (plan.vadeler as string[]).length }, (_, i) => i + 1).find(no => !odenenNo.has(no))
        if (!siradaki) { elle(r, 'Tüm taksitler zaten ödenmiş görünüyor', p); return }
        donem = taksitKey(donem, siradaki)
      } else if (kayitlar.some(x => x.donem === donem)) {
        elle(r, `${k.ad} bu dönem için başka tutarla zaten işaretli (kısmi ödeme olabilir)`, p)
        return
      } else if (taksitAcilabilir(k) && ucret != null && p.tutar < ucret - 0.01 && !kayitlar.length) {
        // Planı olmayan kısmi ödeme: ödenen kısım 1. taksit, kalan 2. taksit olarak plan açılır
        // (Tahsilat Takip'te ve dökümde kalan taksit "bekliyor" görünür; sonraki ödeme 2. taksite işlenir)
        const vadeler = aylikVadeler(r.tarih, 2)
        const { error: pe } = await supabase.from('tahsilat_taksit_planlari').insert({
          kategori_id: k.id, ogrenci_id: ogrenciId, donem, vadeler, tutarlar: [p.tutar, Math.round((ucret - p.tutar) * 100) / 100],
          aciklama: 'Ekstre aktarımında kısmi ödemeden açıldı', okul_id: okulId,
        })
        if (pe) { sonuc.hata++; return }
        sonuc.taksitAcilan++
        donem = taksitKey(donem, 1)
      }
      const { error: e3 } = await supabase.from('tahsilat_kayitlari').insert({
        kategori_id: k.id, ogrenci_id: ogrenciId, donem, tutar: p.tutar, tarih: r.tarih, aciklama: r.aciklama || null, okul_id: okulId,
      })
      if (e3) sonuc.hata++; else sonuc.isaretlenen++
    }

    for (const r of gecerliler) {
      if (r.tur !== 'gelir' || r.odemeDegil) continue
      const eksik = parcaEksigi(r)
      if (!r.isaretle || eksik) { elle(r, r.uyari || eksik || 'İşaretlenmedi'); continue }
      for (const p of r.parcalar) {
        try { await parcaIsle(r, p) } catch { sonuc.hata++ }
      }
    }

    setImportSaving(false)
    setImportSonuc(sonuc)
    const farkliYil = yeni.some(p => p.yil !== yil)
    bilgi(`✅ ${yeni.length} hareket içe aktarıldı.${atlanan ? ` ${atlanan} mükerrer atlandı.` : ''}${farkliYil ? ' (Bazıları farklı yıla işlendi.)' : ''} Tahsilat Takip: ${sonuc.isaretlenen} işaretlendi${sonuc.elle.length ? `, ${sonuc.elle.length} satır elle işaretlenmeli` : ''}.`, 8000)
    load()
  }

  function importKapat() {
    setImportOpen(false); setImportRows([]); setImportFileName(''); setOnizleme(null); setImportSonuc(null); setEslesmePop(null)
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
            Aidat Takibi’ndeki aidat tahsilatları, Hesap Hareketleri’ndeki giderler ve Diğer Tahsilatlar’daki ödemeler deftere kendiliğinden yazılır; onları kendi ekranlarında düzeltin. Burada yalnızca o ekranlarda olmayan gelir ve giderleri (kira, fatura, malzeme vb.) girin.
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
              <div className="card-title" style={{ padding: '14px 18px', marginBottom: 0, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                {yil} Yılı Aylık Özet
                <button className="btn btn-pdf btn-sm" onClick={kapakPdf}><Download size={14} /> Kapak PDF</button>
              </div>
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

      {importOpen && <EkstreModal setImportOpen={setImportOpen} importFileName={importFileName} importReading={importReading} dosyaSec={dosyaSec} importRows={importRows} colCount={colCount} gelismisAcik={gelismisAcik} setGelismisAcik={setGelismisAcik} colMap={colMap} setColMap={setColMap} sutunSecenekleri={sutunSecenekleri} basSatirAtla={basSatirAtla} setBasSatirAtla={setBasSatirAtla} onizleme={onizleme} setOnizleme={setOnizleme} setEslesmePop={setEslesmePop} ogrencilerSirali={ogrencilerSirali} ogrenciAdMap={ogrenciAdMap} importSaving={importSaving} importKaydet={importKaydet} importSonuc={importSonuc} importKapat={importKapat} hedefAdi={(a: string | null) => odemeHedefleri.find(h => h.anahtar === a)?.ad ?? null} />}

      {/* Tahsilat Takip eşleştirme penceresi: satır bir ya da birden fazla parçaya (öğrenci × ödeme kalemi) bölünebilir */}
      {eslesmePop && onizleme && onizleme[eslesmePop.idx] && (() => {
        const idx = eslesmePop.idx
        const r = onizleme[idx]
        const rect = eslesmePop.rect
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1000
        const vh = typeof window !== 'undefined' ? window.innerHeight : 800
        const parcalar = r.parcalar.length ? r.parcalar : [{ ogrenciId: null, hedef: null, ay: null, tutar: r.tutar }]
        const toplam = Math.round(parcalar.reduce((t, p) => t + (Number(p.tutar) || 0), 0) * 100) / 100
        const fark = Math.round((r.tutar - toplam) * 100) / 100
        const eksik = parcaEksigi({ ...r, parcalar })
        const guncelle = (yeni: OdemeParcasi[], isaretle?: boolean) => {
          const sonraki = { ...r, parcalar: yeni }
          onizlemeGuncelle(idx, { parcalar: yeni, isaretle: isaretle ?? !parcaEksigi(sonraki) })
        }
        const parcaDegistir = (i: number, patch: Partial<OdemeParcasi>) => guncelle(parcalar.map((p, j) => j === i ? { ...p, ...patch } : p))
        const parcaEkle = () => {
          const son = parcalar[parcalar.length - 1]
          guncelle([...parcalar, { ogrenciId: son?.ogrenciId ?? null, hedef: null, ay: null, tutar: Math.max(0, fark) }], false)
        }
        const genislik = 380
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1200 }} {...perdeKapat(() => setEslesmePop(null))}>
            <div
              style={{ position: 'absolute', top: Math.max(10, Math.min(rect.bottom + 6, vh - 520)), left: Math.min(Math.max(rect.left - 200, 10), vw - genislik - 16), background: 'var(--surface)', borderRadius: 12, boxShadow: '0 16px 44px rgba(0,0,0,0.22)', padding: 16, width: genislik, maxHeight: vh - 20, overflowY: 'auto', border: '1px solid var(--border)' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Tahsilat Takip Eşleştirme</div>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{fmtTL(r.tutar)} · {tarihFmt(r.tarih)}</div>
              </div>
              {r.uyari && <div className="alert alert-warn" style={{ fontSize: 11.5, padding: '6px 9px', marginBottom: 10 }}>{r.uyari}</div>}

              {parcalar.map((p, i) => {
                const ogr = odemeOgrenciler.find(o => o.id === p.ogrenciId)
                // Öğrencinin dahil olduğu kategoriler önce; diğerleri de seçilebilir (kapsam eksik girilmiş olabilir)
                const uygun = ogr ? odemeHedefleri.filter(h => h.kapsar(ogr)) : odemeHedefleri
                const diger = ogr ? odemeHedefleri.filter(h => !h.kapsar(ogr)) : []
                const hedef = odemeHedefleri.find(h => h.anahtar === p.hedef)
                const ucret = ogr && hedef ? hedef.ucret(ogr) : null
                return (
                  <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 10, marginBottom: 8, background: parcalar.length > 1 ? 'var(--surface2)' : undefined }}>
                    {parcalar.length > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text2)' }}>{i + 1}. ödeme</span>
                        <button type="button" onClick={() => guncelle(parcalar.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 11.5 }} title="Bu parçayı çıkar"><X size={13} /></button>
                      </div>
                    )}
                    <label className="form-label">Öğrenci</label>
                    <select className="form-select" value={p.ogrenciId ?? ''} style={{ marginBottom: 8 }}
                      onChange={e => parcaDegistir(i, { ogrenciId: e.target.value ? Number(e.target.value) : null })}>
                      <option value="">— Seçilmedi —</option>
                      {ogrencilerSirali.map(o => <option key={o.id} value={o.id}>{o.ad} {o.soyad}{o.sinif ? ` (${o.sinif})` : ''}</option>)}
                    </select>
                    <div style={{ display: 'grid', gridTemplateColumns: hedef?.tip === 'aylik' ? '1fr 96px' : '1fr', gap: 8 }}>
                      <div>
                        <label className="form-label">Ödeme türü</label>
                        <select className="form-select" value={p.hedef ?? ''}
                          onChange={e => {
                            const v = e.target.value || null
                            const h = odemeHedefleri.find(x => x.anahtar === v)
                            parcaDegistir(i, { hedef: v, ay: h?.tip === 'aylik' ? (p.ay ?? Number(r.tarih.slice(5, 7))) : null })
                          }}>
                          <option value="">— Seçilmedi —</option>
                          {uygun.map(h => <option key={h.anahtar} value={h.anahtar}>{h.ad}</option>)}
                          {diger.length > 0 && <optgroup label="Öğrencinin dahil olmadığı kategoriler">{diger.map(h => <option key={h.anahtar} value={h.anahtar}>{h.ad}</option>)}</optgroup>}
                        </select>
                      </div>
                      {hedef?.tip === 'aylik' && (
                        <div>
                          <label className="form-label">Ay</label>
                          <select className="form-select" value={p.ay ?? ''} onChange={e => parcaDegistir(i, { ay: Number(e.target.value) })}>
                            {[9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8].map(m => <option key={m} value={m}>{AYLAR[m]}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 8 }}>
                      <div style={{ flex: 1 }}>
                        <label className="form-label">Tutar (₺)</label>
                        <input className="form-input" inputMode="decimal" value={String(p.tutar).replace('.', ',')}
                          onChange={e => { const n = Number(e.target.value.replace(/\./g, '').replace(',', '.')); parcaDegistir(i, { tutar: isNaN(n) ? 0 : n }) }} />
                      </div>
                      {ucret != null && Math.abs(ucret - p.tutar) > 0.01 && (
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => parcaDegistir(i, { tutar: ucret })} title="Kalemin ücretini yaz">Ücret: {fmtTL(ucret)}</button>
                      )}
                      {ucret != null && p.tutar > 0 && p.tutar < ucret - 0.01 && <span style={{ fontSize: 11, color: '#8a5200', paddingBottom: 8 }}>kısmi → taksit</span>}
                    </div>
                  </div>
                )
              })}

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-success btn-sm" onClick={parcaEkle} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Plus size={13} /> Ödeme ekle</button>
                <span style={{ fontSize: 11.5, color: 'var(--text3)' }}>Birden fazla kalem (personel + kırtasiye) ya da kardeşler için</span>
              </div>
              {parcalar.length > 1 && (
                <div style={{ fontSize: 12, marginBottom: 10, color: Math.abs(fark) > 0.01 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                  Parçalar toplamı {fmtTL(toplam)}{Math.abs(fark) > 0.01 ? ` · ${fark > 0 ? 'eksik' : 'fazla'} ${fmtTL(Math.abs(fark))}` : ' · satır tutarına eşit'}
                </div>
              )}
              <div style={{ fontSize: 11.5, color: 'var(--text3)', marginBottom: 10 }}>Ödeme tarihi ekstredeki tarihtir. Ücretin altındaki ödeme taksit sayılır; kalan için taksit açılır.</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text2)', marginBottom: 14, opacity: eksik ? 0.5 : 1 }} title={eksik || undefined}>
                <input type="checkbox" checked={r.isaretle && !eksik} disabled={!!eksik} onChange={e => onizlemeGuncelle(idx, { isaretle: e.target.checked })} />
                Ödendi olarak işaretle{eksik ? ` — ${eksik}` : ''}
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setEslesmePop(null)}>Kapat</button>
                {r.parcalar.some(p => p.ogrenciId || p.hedef) && (
                  <button
                    className="btn btn-sm"
                    style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid var(--danger-border)' }}
                    onClick={() => { onizlemeGuncelle(idx, { parcalar: [], isaretle: false }); setEslesmePop(null) }}
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
