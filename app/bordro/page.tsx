'use client'
import { useEffect, useState, useCallback } from 'react'
import Topbar from '@/components/Topbar'
import { useAy } from '@/lib/AyContext'
import { supabase } from '@/lib/supabase'
import {
  ayLabel, fmtTL, fmt, bordroHesapla, isGunuSayisi, tavanHesapla, gunSayisi,
  AYLAR, gvDilimiBul, tatilMi, gelirVergisiHesapla,
  tahakkukDagitimHesapla, detectActiveCategories,
  isOgretmen, isBaskan, isBaskanYrd, isMuhasebe, isTemizlik, isDenetim
} from '@/lib/hesaplama'
import { Personel, SinifDefteri, Ayarlar, Bordro, BordroSonuc, Tahakkuk, Puantaj, BordroSatir } from '@/lib/types'
import { logIslem } from '@/lib/audit'
import { useAuth } from '@/lib/AuthContext'
import { Users, Layers, Calendar, Clock, TrendingUp, Wallet, CheckCircle2, FileText, Printer, Download, Mail, Info, RotateCw, AlertTriangle, XCircle } from 'lucide-react'
import { useRef } from 'react'
import BordroZarfi from '@/components/BordroZarfi'
import ConfirmModal from '@/components/ConfirmModal'

export default function BordroPage() {
  const { ay, yil } = useAy()
  const { okul, profil } = useAuth()
  const [personel, setPersonel] = useState<Personel[]>([])
  const [defter, setDefter] = useState<SinifDefteri[]>([])
  const [puantajData, setPuantajData] = useState<Puantaj[]>([])
  const [siniflar, setSiniflar] = useState<any[]>([])
  const [ayarlar, setAyarlar] = useState<Ayarlar | null>(null)
  const [kaydedilmis, setKaydedilmis] = useState<Bordro[]>([])
  const [tahakkuk, setTahakkuk] = useState<Tahakkuk | null>(null)
  const [tatiller, setTatiller] = useState<any[]>([])
  const [ogrenciSayisi, setOgrenciSayisi] = useState(0)
  const [subeSayisi, setSubeSayisi] = useState(0)
  const [satirlar, setSatirlar] = useState<BordroSatir[]>([])
  const [hesaplandi, setHesaplandi] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [selectedRow, setSelectedRow] = useState<BordroSatir | null>(null)
  const [bulkMode, setBulkMode] = useState(false)
  const [mailProgress, setMailProgress] = useState<{ current: number, total: number, name: string } | null>(null)
  const cancelMailRef = useRef(false)
  const [mailing, setMailing] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; type: 'single' | 'bulk'; row?: BordroSatir; count?: number } | null>(null)
  const [matrahDegistiPersonel, setMatrahDegistiPersonel] = useState<string[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const startDate = `${yil}-${String(ay).padStart(2, '0')}-01`
    const lastDay = gunSayisi(yil, ay)
    const endDate = `${yil}-${String(ay).padStart(2, '0')}-${lastDay}T23:59:59`

    const [
      { data: per },
      { data: sd },
      { data: puan },
      { data: ayr },
      { data: brd },
      { data: tah },
      { data: sin },
      { data: tat },
      { count: subeCount },
      { data: tahsData },
    ] = await Promise.all([
      supabase.from('personel').select('*').order('ad'),
      supabase.from('sinif_defteri').select('*').eq('ay', Number(ay)).eq('yil', Number(yil)).eq('durum', 'geldi'),
      supabase.from('puantaj').select('*').gte('tarih', startDate).lte('tarih', endDate),
      supabase.from('ayarlar').select('*').single(),
      supabase.from('bordro').select('*, personel(*)').eq('ay', Number(ay)).eq('yil', Number(yil)),
      supabase.from('tahakkuk').select('*').eq('ay', Number(ay)).eq('yil', Number(yil)).maybeSingle(),
      supabase.from('siniflar').select('*').eq('aktif', true),
      supabase.from('tatiller').select('*').or(`okul_id.eq.${okul?.id ?? 0},okul_id.is.null`),
      supabase.from('siniflar').select('id', { count: 'exact', head: true }).eq('aktif', true),
      supabase.from('tahsilat').select('ogrenci_id, tutar').eq('ay', Number(ay)).eq('yil', Number(yil)),
    ])
    const filteredPer = (per || []).filter(p => {
      if (p.aktif !== false) return true;
      const hasPuantaj = (puan || []).some(x => x.personel_id === p.id && Number(x.saat) > 0);
      const hasSavedBordro = (brd || []).some(b => b.personel_id === p.id);
      return hasPuantaj || hasSavedBordro;
    })
    setPersonel(filteredPer)
    setDefter(sd || [])
    setPuantajData(puan || [])
    setAyarlar(ayr)
    setKaydedilmis(brd || [])
    setTahakkuk(tah || null)
    setSiniflar(sin || [])
    setTatiller(tat || [])
    
    // Gerçekleşen toplam tahsilatı (kasanıza giren para) hesapla
    const gercekTahsilat = (tahsData || []).reduce((sum, t) => sum + (Number(t.tutar) || 0), 0)
    const uniqueStudents = new Set((tahsData || []).map(t => t.ogrenci_id)).size
    
    setOgrenciSayisi(uniqueStudents)
    setSubeSayisi(subeCount || 0)
    setLoading(false)

    if (brd && brd.length > 0) {
      // 1. Gerekli ön hesaplamaları yap (hesapla() ile aynı mantık)
      const gelir = tah?.toplam_gelir || 0
      const activeCategories = detectActiveCategories(filteredPer, puan || [], brd || [])
      const dagitim = tahakkukDagitimHesapla(gelir, ayr!, activeCategories)
      const pools = {
        ogretmen:  dagitim.ogretmen_havuzu,
        baskan:    dagitim.baskan,
        baskanYrd: dagitim.baskan_yrd,
        muhasebe:  dagitim.muhasebe,
        temizlik:  dagitim.temizlik,
        denetim:   dagitim.denetim,
      }

      const isWorking = (p: Personel) => {
        const hasSavedBordro = (brd || []).some(b => b.personel_id === p.id)
        if (hasSavedBordro) return true

        if (p.aktif !== false) {
          if (isBaskan(p.gorev) || isBaskanYrd(p.gorev) || isMuhasebe(p.gorev) || isTemizlik(p.gorev) || isDenetim(p.gorev)) {
            return true
          }
          const hasPuantaj = (puan || []).some(pu => pu.personel_id === p.id && Number(pu.saat) > 0)
          return hasPuantaj
        }

        const hasPuantaj = (puan || []).some(pu => pu.personel_id === p.id && Number(pu.saat) > 0)
        if (hasPuantaj) return true

        return false
      }

      const workingPersonel = filteredPer.filter(isWorking)
      const temizlikSay = workingPersonel.filter(p => isTemizlik(p.gorev)).length || 1
      const ogretmenler = filteredPer.filter(p => isOgretmen(p.gorev))
      let toplamOgretmenSaat = 0
      if (ogretmenler.length > 0) {
        toplamOgretmenSaat = (brd || []).reduce((s, b) => {
          if (isOgretmen(b.personel?.gorev || '')) return s + Number(b.toplam_saat)
          return s
        }, 0)
      }
      const ogretmenBirimSaatUcreti = toplamOgretmenSaat > 0 ? Math.round((pools.ogretmen / toplamOgretmenSaat) * 100) / 100 : 0

      const satirlar: BordroSatir[] = (brd || []).map((b: any) => {
        const p = b.personel
        const brut = Number(b.brut)
        const sgk_kisi = Number(b.sgk_kisi)
        const sgk_issizlik = Number(b.sgk_issizlik_kisi || 0)
        const gv_matrah = Number(b.gv_matrah ?? 0)
        const gv_hesaplanan = Number(b.gv_hesaplanan ?? 0)
        const gv_istisna = Number(b.gv_istisna_tutari ?? 0)
        const gv = Number(b.gv_tutar)
        const dv_hesaplanan = Number(b.dv_hesaplanan ?? 0)
        const dv_istisna = Number(b.dv_istisna_tutari ?? 0)
        const dv = Number(b.damga_tutar)
        const sgk_isveren = Number(b.sgk_isveren)

        // Gösterim metni (hesapla() ile aynı)
        let sUcretDisplay: string
        if (isOgretmen(p.gorev)) {
          sUcretDisplay = fmt(ogretmenBirimSaatUcreti)
        } else if (isBaskan(p.gorev)) {
          sUcretDisplay = `%${dagitim.pct_baskan}`
        } else if (isBaskanYrd(p.gorev)) {
          sUcretDisplay = `%${dagitim.pct_baskan_yrd}`
        } else if (isMuhasebe(p.gorev)) {
          sUcretDisplay = `%${dagitim.pct_muhasebe}`
        } else if (isTemizlik(p.gorev)) {
          sUcretDisplay = `%${dagitim.pct_temizlik} / ${temizlikSay}`
        } else if (isDenetim(p.gorev)) {
          sUcretDisplay = `%${dagitim.pct_denetim}`
        } else {
          sUcretDisplay = ayr?.saat_ucreti?.toString() || "0"
        }

        return {
          personel: b.personel,
          toplamSaat: Number(b.toplam_saat),
          saatUcreti: sUcretDisplay as any,
          hamBrut: Number(b.brut),
          sonuc: {
            brut,
            sgk_kisi,
            sgk_issizlik,
            gv_matrah,
            gv_oran: Number(b.gv_oran),
            gv_hesaplanan,
            gv_istisna,
            gv,
            dv_hesaplanan,
            dv_istisna,
            dv,
            toplam_kesinti: Number(b.toplam_kesinti),
            net: Number(b.net),
            sgk_isveren,
            sgk_detay_kisa:     b.personel?.sgk_li ? Math.round(brut * (ayr?.sgk_kisa_vadeli      || 0.0225) * 100 + 1e-9) / 100 : 0,
            sgk_detay_malulluk: b.personel?.sgk_li ? Math.round(brut * (ayr?.sgk_malulluk         || 0.20)   * 100 + 1e-9) / 100 : 0,
            sgk_detay_saglik:   b.personel?.sgk_li ? Math.round(brut * (ayr?.sgk_saglik           || 0.125)  * 100 + 1e-9) / 100 : 0,
            sgk_detay_issizlik: b.personel?.sgk_li ? Math.round(brut * (ayr?.sgk_issizlik_isveren || 0.03)   * 100 + 1e-9) / 100 : 0,
            sgk_detay_toplam: 0,
          },
          odendi: b.odendi || false,
          bordroId: b.id,
        }
      })
      satirlar.forEach(s => {
        if (s.personel.sgk_li) {
          s.sonuc.sgk_detay_toplam = Math.round((s.sonuc.sgk_detay_kisa + s.sonuc.sgk_detay_malulluk + s.sonuc.sgk_detay_saglik + s.sonuc.sgk_detay_issizlik) * 100 + 1e-9) / 100
        }
      })

      // ── Yıllık vergi matrahı değişim kontrolü ───────────────────────────
      // Kaydedilmiş gv_hesaplanan ile şu anki yillik_matrah'a göre
      // yeniden hesaplanan değer karşılaştırılır; fark varsa uyarı gösterilir.
      if (ayr?.vergi_dilimleri && ayr.vergi_dilimleri.length > 0) {
        const degisen = satirlar.filter(s => {
          // Denetim yetkilileri ve GV matrahı 0 olanları atla
          if (s.sonuc.gv_matrah === 0 && s.sonuc.gv_hesaplanan === 0) return false
          const dilimler = ayr!.vergi_dilimleri!
          const yillikMatrah = Number(s.personel.yillik_matrah || 0)
          
          const gvOnceki = gelirVergisiHesapla(yillikMatrah, dilimler)
          const gvYeniToplam = gelirVergisiHesapla(yillikMatrah + s.sonuc.gv_matrah, dilimler)
          const beklenen = Math.round((gvYeniToplam.tutar - gvOnceki.tutar) * 100 + 1e-9) / 100
          
          return Math.abs(beklenen - s.sonuc.gv_hesaplanan) > 0.01
        }).map(s => s.personel.ad)
        setMatrahDegistiPersonel(degisen)
      } else {
        setMatrahDegistiPersonel([])
      }

      setSatirlar(satirlar)
      setHesaplandi(true)
    } else {
      setSatirlar([])
      setHesaplandi(false)
    }
  }, [ay, yil])

  useEffect(() => { load() }, [load])


  const handleBulkPrint = useCallback(() => {
    setBulkMode(true)
    setTimeout(() => {
      window.print()
      setBulkMode(false)
    }, 100)
  }, [])

  const handlePdfDownload = async () => {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    // ── Türkçe karakter desteği için NotoSans regular + bold yükle ─────────
    async function loadFontB64(path: string) {
      const res = await fetch(path)
      const buf = await res.arrayBuffer()
      const bytes = new Uint8Array(buf)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      return btoa(binary)
    }
    const [regularB64, boldB64] = await Promise.all([
      loadFontB64('/fonts/NotoSans-Regular.ttf'),
      loadFontB64('/fonts/NotoSans-Bold.ttf'),
    ])

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    pdf.addFileToVFS('NotoSans-Regular.ttf', regularB64)
    pdf.addFileToVFS('NotoSans-Bold.ttf',    boldB64)
    pdf.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal', 'Identity-H')
    pdf.addFont('NotoSans-Bold.ttf',    'NotoSans', 'bold',   'Identity-H')
    pdf.setFont('NotoSans')

    const PW = pdf.internal.pageSize.getWidth()   // 297mm
    const M  = 5  // margin mm

    // ── Başlık ─────────────────────────────────────────────────────────────
    pdf.setFontSize(10)
    pdf.setFont('NotoSans')
    pdf.setTextColor(0, 0, 0)
    pdf.text(ayarlar?.kurum_adi || 'KULÜP', PW / 2, 10, { align: 'center' })
    pdf.setTextColor(0, 0, 0)
    pdf.setFontSize(7.5)
    pdf.setFont('NotoSans')
    pdf.text(`01 ${AYLAR[ay]} ${yil} - ${sonGun} ${AYLAR[ay]} ${yil} Tarihleri Arası Bordro Özeti`, PW / 2, 15, { align: 'center' })

    // PDF-safe renkler (Siyah Beyaz Baskı İçin Sadeleştirildi)
    const C = {
      personel:  [255, 255, 255] as [number,number,number],
      vergi:     [255, 255, 255] as [number,number,number],
      sgkKes:    [255, 255, 255] as [number,number,number],
      kurumSgk:  [255, 255, 255] as [number,number,number],
      totRow:    [245, 245, 245] as [number,number,number], // Hafif gri toplu alanlar için
      net:       [255, 255, 255] as [number,number,number],
      header:    [255, 255, 255] as [number,number,number],
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
      'Brüt Üret',
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
    ] as any[]]

    // ── autoTable ──────────────────────────────────────────────────────────
    autoTable(pdf, {
      head: [ROW1, ROW2],
      body,
      foot,
      startY: 19,
      margin: { top: M, right: M, bottom: M, left: M },
      tableWidth: 'wrap',
      styles: {
        fontSize: 5.0,
        cellPadding: 0.8,
        lineWidth: 0.1,
        lineColor: [40, 40, 40] as [number, number, number],
        font: 'NotoSans',
        overflow: 'linebreak',
        halign: 'right',
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0,0,0],
        fontStyle: 'bold',
        fontSize: 5.5,
        cellPadding: 1.2,
        halign: 'center',
        valign: 'middle',
      },
      footStyles: {
        fillColor: C.totRow,
        fontStyle: 'bold',
        fontSize: 4.8,
        textColor: [0,0,0],
        cellPadding: { top: 2, right: 0.5, bottom: 2, left: 0.5 },
        minCellHeight: 6,
        lineWidth: 0.1,
      },
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
      theme: 'grid',
    })

    // ── Düzenleyen / Onaylayan imza blokları ───────────────────────────────
    // autoTable'ın bittiği Y koordinatını al
    const finalY: number = (pdf as any).lastAutoTable?.finalY ?? 190
    const signY = finalY + 8   // tablonun 8mm altından başla

    // Sayfa sınırını aş mıyoruz kontrol et (A4 landscape yüksekliği 210mm)
    const pageH = pdf.internal.pageSize.getHeight()
    if (signY + 30 > pageH - M) {
      pdf.addPage()
    }
    const useY = signY + 30 > pageH - M ? M + 10 : signY

    const duzenleyenAdi   = ayarlar?.duzenleyen_adi   ?? '___________________'
    const duzenleyenUnvan = ayarlar?.duzenleyen_unvani ?? 'Büro Personeli'
    const onaylayanAdi    = ayarlar?.mudur_adi         ?? '___________________'
    const onaylayanUnvan  = 'Okul Müdürü / Kulüp Başkanı'

    // İki blok: sol = Düzenleyen, sağ = Onaylayan
    const leftX    = M                   // 5mm — sol kenar
    const rightX   = PW - M - 80        // sağ kenar: 297-5-80 = 212mm

    pdf.setFont('NotoSans', 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(0, 0, 0)

    // — Sol blok: Düzenleyen —
    pdf.text('DÜZENLEYEN', leftX + 40, useY, { align: 'center' })
    pdf.setFont('NotoSans', 'bold')
    pdf.setFontSize(6.5)
    pdf.text(duzenleyenAdi,   leftX + 40, useY + 5,  { align: 'center' })
    pdf.setFont('NotoSans', 'normal')
    pdf.setFontSize(6)
    pdf.text(duzenleyenUnvan, leftX + 40, useY + 9,  { align: 'center' })
    pdf.setDrawColor(80, 80, 80)
    pdf.setLineWidth(0.3)
    pdf.line(leftX, useY + 18, leftX + 80, useY + 18)
    pdf.setFontSize(5.5)
    pdf.text('(İmza)', leftX + 40, useY + 22, { align: 'center' })

    // — Sağ blok: Onaylayan —
    pdf.setFont('NotoSans', 'bold')
    pdf.setFontSize(7)
    pdf.text('ONAYLAYAN', rightX + 40, useY, { align: 'center' })
    pdf.setFont('NotoSans', 'bold')
    pdf.setFontSize(6.5)
    pdf.text(onaylayanAdi,    rightX + 40, useY + 5,  { align: 'center' })
    pdf.setFont('NotoSans', 'normal')
    pdf.setFontSize(6)
    pdf.text(onaylayanUnvan,  rightX + 40, useY + 9,  { align: 'center' })
    pdf.setDrawColor(80, 80, 80)
    pdf.setLineWidth(0.3)
    pdf.line(rightX, useY + 18, rightX + 80, useY + 18)
    pdf.setFontSize(5.5)
    pdf.text('(İmza)', rightX + 40, useY + 22, { align: 'center' })

    // ── Tarayıcı PDF viewer'ında önizle ────────────────────────────────────
    const blob = pdf.output('blob')
    const url  = URL.createObjectURL(blob)
    window.open(url, '_blank')
    // Not: blob URL'yi temizlemek için kullanıcı pencereyi kapattıktan sonra revoke edilir
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  const generateSlipPdfBase64 = async (row: BordroSatir) => {
    const [{ default: html2canvas }, { default: jsPDF }, { createRoot }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
      import('react-dom/client')
    ])

    const container = document.getElementById('hidden-slip-container')
    if (!container) return null

    const div = document.createElement('div')
    container.appendChild(div)
    const root = createRoot(div)
    root.render(<BordroZarfi row={row} ayarlar={ayarlar} ay={ay} yil={yil} />)

    // Render için kısa bir bekleme
    await new Promise(r => setTimeout(r, 400))

    try {
      const canvas = await html2canvas(div, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.9)
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      })

      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height)
      const b64 = pdf.output('datauristring').split(',')[1]
      return b64
    } finally {
      root.unmount()
      container.removeChild(div)
    }
  }

  const tekMailGonder = async (row: BordroSatir) => {
    if (!row.personel.email) {
      alert('Bu personelin e-posta adresi kayıtlı değil!')
      return
    }
    setConfirmModal({ isOpen: true, type: 'single', row })
  }

  const startTekMail = async (row: BordroSatir) => {
    setMailing(true)
    setMsg('📧 Mail hazırlanıyor...')
    
    try {
      const pdfBase64 = await generateSlipPdfBase64(row)
      if (!pdfBase64) throw new Error('PDF oluşturulamadı')

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/bordro/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`
        },
        body: JSON.stringify({
          email: row.personel.email,
          personelAd: row.personel.ad,
          ay: AYLAR[ay],
          yil: yil,
          kurumAdi: ayarlar?.kurum_adi || 'Çocuk Kulübü',
          pdfBase64
        })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.details || data.error)

      setMsg(`✅ Mail başarıyla gönderildi: ${row.personel.ad}`)
    } catch (err: any) {
      console.error(err)
      setMsg(`❌ Mail gönderim hatası: ${err.message}`)
    } finally {
      setMailing(false)
      setTimeout(() => setMsg(''), 5000)
    }
  }

  const topluMailGonder = async () => {
    const mailliPersoneller = sortedSatirlar.filter(s => s.personel.email)
    if (mailliPersoneller.length === 0) {
      alert('E-posta adresi kayıtlı personel bulunamadı!')
      return
    }

    setConfirmModal({ isOpen: true, type: 'bulk', count: mailliPersoneller.length })
  }

  const startTopluMail = async () => {
    const mailliPersoneller = sortedSatirlar.filter(s => s.personel.email)
    setMailing(true)
    cancelMailRef.current = false
    let sentCount = 0

    for (let i = 0; i < mailliPersoneller.length; i++) {
      if (cancelMailRef.current) {
        setMsg(`🛑 İşlem kullanıcı tarafından durduruldu. (${sentCount} mail gönderildi)`)
        break
      }

      const s = mailliPersoneller[i]
      setMailProgress({ current: i + 1, total: mailliPersoneller.length, name: s.personel.ad })

      try {
        const pdfBase64 = await generateSlipPdfBase64(s)
        if (!pdfBase64) continue

        const { data: { session: bulkSession } } = await supabase.auth.getSession()
        const res = await fetch('/api/bordro/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${bulkSession?.access_token ?? ''}`
          },
          body: JSON.stringify({
            email: s.personel.email,
            personelAd: s.personel.ad,
            ay: AYLAR[ay],
            yil: yil,
            kurumAdi: ayarlar?.kurum_adi || 'Çocuk Kulübü',
            pdfBase64
          })
        })
        const data = await res.json()
        if (!data.error) {
          sentCount++
        } else {
          console.error(`${s.personel.ad} mail hatası:`, data.details || data.error)
        }
      } catch (err) {
        console.error(`${s.personel.ad} mail hatası:`, err)
      }
    }

    setMailing(false)
    setMailProgress(null)
    if (!cancelMailRef.current) {
      setMsg(`✅ Toplu mail gönderimi tamamlandı: ${sentCount}/${mailliPersoneller.length} başarılı.`)
    }
    setTimeout(() => setMsg(''), 5000)
  }

  async function hesapla() {
    if (!ayarlar) return
    setLoading(true)
    setMsg('🔄 Ödemeler kontrol ediliyor...')

    // okul_id'yi güvenli bir şekilde belirle
    const okulId = okul?.id ?? profil?.okul_id
    if (!okulId) {
      setMsg('❌ Hata: Oturum bilgisi eksik. Lütfen sayfayı yenileyerek tekrar giriş yapın.')
      setLoading(false)
      return
    }

    try {
      // 0. Personel listesini taze çek — yillik_matrah gibi alanlar
      //    personel sayfasında değişmiş olabilir, stale state riskini önle
      const { data: freshPer, error: perErr } = await supabase
        .from('personel')
        .select('*')
        .order('ad')
      if (perErr) throw new Error('Personel listesi çekilemedi: ' + perErr.message)
      const filteredPer = (freshPer || []).filter(p => {
        if (p.aktif !== false) return true;
        const hasPuantaj = puantajData.some(x => x.personel_id === p.id && Number(x.saat) > 0);
        const hasSavedBordro = kaydedilmis.some(b => b.personel_id === p.id);
        return hasPuantaj || hasSavedBordro;
      })
      const aktifPersonelListesi: Personel[] = filteredPer
      setPersonel(aktifPersonelListesi)  // state'i de güncelle

      // 1. Gerçekleşen Tahsilat Toplamını bul (Kasanıza giren gerçek para)
      const { data: currentTahs, error: tErr } = await supabase
        .from('tahsilat')
        .select('tutar')
        .eq('ay', ay)
        .eq('yil', yil)
      
      if (tErr) throw new Error('Tahsilatlar çekilemedi: ' + tErr.message)
      
      const gercekGelir = (currentTahs || []).reduce((sum, t) => sum + (Number(t.tutar) || 0), 0)
      
      console.log('💰 Gerçek Gelir Havuzu:', gercekGelir)
      setMsg(`📊 Gerçekleşen Tahsilat Toplamı: ${fmt(gercekGelir)} TL Havuz`)

      // 2. Tahakkuk (havuz) kaydını bu gerçek rakamla güncelle/eşitle
      const { data: freshTahakkuk, error: e2 } = await supabase.from('tahakkuk').upsert({
        ay, yil, toplam_gelir: gercekGelir, hesaplandi_mi: true, okul_id: okulId
      }, { onConflict: 'ay,yil,okul_id' }).select().single()
      
      if (e2) throw new Error('Tahakkuk kaydedilemedi: ' + e2.message)
      setTahakkuk(freshTahakkuk)
      
      const finalGelir = gercekGelir
      if (finalGelir <= 0) {
        setMsg(prev => prev + ' ⚠️ Uyarı: Havuz "0" olarak hesaplandı. Lütfen tahsilatları kontrol edin.')
      }

      const effectiveTavan = ayarlar.tavan_katsayi || 13184.78

      const isWorking = (p: Personel) => {
        const hasSavedBordro = kaydedilmis.some(b => b.personel_id === p.id)
        if (hasSavedBordro) return true

        if (p.aktif !== false) {
          if (isBaskan(p.gorev) || isBaskanYrd(p.gorev) || isMuhasebe(p.gorev) || isTemizlik(p.gorev) || isDenetim(p.gorev)) {
            return true
          }
          const hasPuantaj = puantajData.some(pu => pu.personel_id === p.id && Number(pu.saat) > 0)
          return hasPuantaj
        }

        const hasPuantaj = puantajData.some(pu => pu.personel_id === p.id && Number(pu.saat) > 0)
        if (hasPuantaj) return true

        return false
      }

      const activeCategories = detectActiveCategories(aktifPersonelListesi, puantajData, kaydedilmis)
      const dagitim = tahakkukDagitimHesapla(finalGelir, ayarlar, activeCategories)

      const pools = {
        ogretmen:  dagitim.ogretmen_havuzu,
        baskan:    dagitim.baskan,
        baskanYrd: dagitim.baskan_yrd,
        muhasebe:  dagitim.muhasebe,
        temizlik:  dagitim.temizlik,
        denetim:   dagitim.denetim,
      }

      // Öğretmen türündeki personel ve saatleri
      const ogretmenler = aktifPersonelListesi.filter(p => isOgretmen(p.gorev))
      const ogretmenSaatMap = new Map<number, number>()
      ogretmenler.forEach(p => {
        const pSaatler = puantajData.filter(x => x.personel_id === p.id)
        const toplamSaat = pSaatler.filter(x => {
          const d = Number(x.tarih.split('T')[0].split('-')[2])
          return !tatilMi(ay, d, yil, tatiller)
        }).reduce((sum, x) => sum + (Number(x.saat) || 0), 0)
        ogretmenSaatMap.set(p.id, toplamSaat)
      })
      const toplamOgretmenSaat = ogretmenler.reduce((s, p) => s + (ogretmenSaatMap.get(p.id) || 0), 0)

      const ogretmenBrutMap = new Map<number, number>()
      let ogretmenBirimSaatUcreti = 0
      if (toplamOgretmenSaat > 0) {
        // Kullanıcı manuel ücret girmemişse havuzu saatlere böl (Dinamik), girmişse onu kullan (Manuel)
        ogretmenBirimSaatUcreti = (ayarlar.ogretmen_saat_ucreti && ayarlar.ogretmen_saat_ucreti > 0) 
          ? ayarlar.ogretmen_saat_ucreti 
          : Math.round((pools.ogretmen / toplamOgretmenSaat) * 100) / 100
        
        ogretmenler.forEach(p => {
          const saat = ogretmenSaatMap.get(p.id) || 0
          let pay = ogretmenBirimSaatUcreti * saat
          const tavan = tavanHesapla(p.gorev, effectiveTavan)
          if (pay > tavan) pay = tavan
          ogretmenBrutMap.set(p.id, Math.round(pay * 100) / 100)
        })
      }

      // Sadece aktif personeller üzerinden dağıtım yap (Excel mantığı)
      const aktifPersonel = aktifPersonelListesi.filter(isWorking)
      const baskanSayisi = aktifPersonel.filter(p => isBaskan(p.gorev)).length || 1
      const baskanYrdSay = aktifPersonel.filter(p => isBaskanYrd(p.gorev)).length || 1
      const muhasebeSay  = aktifPersonel.filter(p => isMuhasebe(p.gorev)).length || 1
      const temizlikSay  = aktifPersonel.filter(p => isTemizlik(p.gorev)).length || 1
      const denetimSay   = aktifPersonel.filter(p => isDenetim(p.gorev)).length || 1

      const hesapAyarlar: Ayarlar = { ...ayarlar, tavan_katsayi: effectiveTavan }

      const yeniSatirlar: BordroSatir[] = aktifPersonelListesi.map(p => {
        const pSaat = ogretmenSaatMap.get(p.id) || 0
        let havuzBrut: number
        if (isOgretmen(p.gorev)) havuzBrut = ogretmenBrutMap.get(p.id) || 0
        else if (isBaskan(p.gorev)) havuzBrut = Math.round(pools.baskan / baskanSayisi * 100) / 100
        else if (isBaskanYrd(p.gorev)) havuzBrut = Math.round(pools.baskanYrd / baskanYrdSay * 100) / 100
        else if (isMuhasebe(p.gorev)) havuzBrut = Math.round(pools.muhasebe / muhasebeSay * 100) / 100
        else if (isTemizlik(p.gorev)) havuzBrut = Math.round(pools.temizlik / temizlikSay * 100) / 100
        else if (isDenetim(p.gorev)) havuzBrut = Math.round(pools.denetim / denetimSay * 100) / 100
        else havuzBrut = 0

        const hamBrut = havuzBrut
        const mevcut = kaydedilmis.find(b => b.personel_id === p.id)
        const sonuc = bordroHesapla(hesapAyarlar, pSaat, Number(p.yillik_matrah || 0), !!p.sgk_li, !!p.is_retired, p.gorev, havuzBrut, p.vergi_istisnasi)
        
        // Excel uyumlu "Saat Ücreti" gösterim metni (display string)
        let sUcretDisplay: string
        if (isOgretmen(p.gorev)) {
          sUcretDisplay = fmt(ogretmenBirimSaatUcreti)
        } else if (isBaskan(p.gorev)) {
          sUcretDisplay = `%${dagitim.pct_baskan}`
        } else if (isBaskanYrd(p.gorev)) {
          sUcretDisplay = `%${dagitim.pct_baskan_yrd}`
        } else if (isMuhasebe(p.gorev)) {
          sUcretDisplay = `%${dagitim.pct_muhasebe}`
        } else if (isTemizlik(p.gorev)) {
          sUcretDisplay = `%${dagitim.pct_temizlik} / ${temizlikSay}`
        } else if (isDenetim(p.gorev)) {
          sUcretDisplay = `%${dagitim.pct_denetim}`
        } else {
          sUcretDisplay = "0"
        }

        if (isDenetim(p.gorev)) {
          // Denetim Yetkilisi: Brüt = Net (Excel standardı)
          sonuc.brut = havuzBrut
          sonuc.gv_matrah = 0
          sonuc.gv_hesaplanan = 0; sonuc.gv_istisna = 0; sonuc.gv = 0
          sonuc.dv_hesaplanan = 0; sonuc.dv_istisna = 0; sonuc.dv = 0
          sonuc.sgk_kisi = 0; sonuc.sgk_issizlik = 0; sonuc.toplam_kesinti = 0
          sonuc.sgk_isveren = 0
          sonuc.sgk_detay_kisa = 0; sonuc.sgk_detay_malulluk = 0
          sonuc.sgk_detay_saglik = 0; sonuc.sgk_detay_issizlik = 0
          sonuc.sgk_detay_toplam = 0
          sonuc.net = havuzBrut
        }

        return {
          personel: p,
          toplamSaat: pSaat,
          saatUcreti: sUcretDisplay as any,
          hamBrut,
          sonuc,
          odendi: !!mevcut?.odendi,
          bordroId: mevcut?.id
        }
      })

      setSatirlar(yeniSatirlar)
      setHesaplandi(true)
      setMatrahDegistiPersonel([]) // Hesaplama yapıldığına göre uyarıları temizle
      setMsg('🔄 Bordro kaydediliyor...')

      // ── Kayıt: DELETE + INSERT (upsert onConflict constraint sorununu önler) ─
      // Mevcut ödendi bayraklarını sakla (silmeden önce)
      const odendiMap = new Map<number, boolean>()
      kaydedilmis.forEach(b => odendiMap.set(b.personel_id, b.odendi))

      const kayitlar = yeniSatirlar.map(s => ({
        personel_id: s.personel.id,
        ay, yil,
        okul_id: okulId,
        toplam_saat: s.toplamSaat,
        brut: s.sonuc.brut,
        gv_matrah: s.sonuc.gv_matrah,
        gv_oran: s.sonuc.gv_oran,
        gv_hesaplanan: s.sonuc.gv_hesaplanan,
        gv_istisna_tutari: s.sonuc.gv_istisna,
        gv_tutar: s.sonuc.gv,
        dv_hesaplanan: s.sonuc.dv_hesaplanan,
        dv_istisna_tutari: s.sonuc.dv_istisna,
        damga_tutar: s.sonuc.dv,
        sgk_kisi: s.sonuc.sgk_kisi,
        sgk_issizlik_kisi: s.sonuc.sgk_issizlik,
        sgk_isveren: s.sonuc.sgk_isveren,
        toplam_kesinti: s.sonuc.toplam_kesinti,
        net: s.sonuc.net,
        odendi: odendiMap.get(s.personel.id) ?? false,
      }))

      // Önce bu ay/yıl/okul için mevcut kayıtları sil
      console.log('🗑️ Eski bordro kayıtları siliniyor... okul_id:', okulId, 'ay:', ay, 'yil:', yil)
      const { error: delErr } = await supabase
        .from('bordro')
        .delete()
        .eq('ay', ay)
        .eq('yil', yil)
        .eq('okul_id', okulId)
      if (delErr) throw new Error('Bordro silinemedi: ' + delErr.message)

      // Sonra yeni hesaplanan değerleri ekle
      console.log('💾 Bordro yeniden ekleniyor...', kayitlar.length, 'kayıt')
      const { error: saveErr } = await supabase.from('bordro').insert(kayitlar)
      if (saveErr) throw new Error('Bordro kaydedilemedi: ' + saveErr.message + ' | Kod: ' + saveErr.code)

      logIslem({ 
        islem: 'hesapla', 
        tablo: 'bordro', 
        okul_id: okulId,
        aciklama: `${ayLabel(ay, yil)} bordrosu hesaplandı (${yeniSatirlar.length} personel)` 
      })
      setMsg('✅ Bordro hesaplandı ve kaydedildi.')
      await load() // Verileri tekrar çekerek DB ile senkronize et
    } catch (err: any) {
      console.error('❌ Bordro hesaplama hatası:', err)
      setMsg('❌ Hata: ' + (err.message || JSON.stringify(err)))
    } finally {
      setLoading(false)
      setTimeout(() => setMsg(''), 8000)  // 8 saniye göster - hata okunabilsin
    }
  }




  async function odemeIsaretle(bordroId: number, odendi: boolean) {
    await supabase.from('bordro').update({ odendi }).eq('id', bordroId)
    if (odendi) {
      const satir = satirlar.find(x => x.bordroId === bordroId)
      if (satir) logIslem({ islem: 'ode', tablo: 'bordro', kayit_id: bordroId, aciklama: `${satir.personel.ad} maaşı ödendi (${ayLabel(ay, yil)})` })
    }
    setSatirlar(s => s.map(x => x.bordroId === bordroId ? { ...x, odendi } : x))
  }

  // Tüm personeli tek tabloda sıralı göster
  const sortedSatirlar = [...satirlar].sort((a, b) => {
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
  
  // Bordro henüz hesaplanmadıysa puantaj verilerinden toplamı çek
  const sistemToplamSaat = puantajData.reduce((sum, x) => {
    const d = Number(x.tarih.split('T')[0].split('-')[2])
    if (tatilMi(ay, d, yil, tatiller)) return sum
    return sum + (Number(x.saat) || 0)
  }, 0)
  
  const hDisplaySaat = hesaplandi ? toplamSaat : sistemToplamSaat

  const isGunu = isGunuSayisi(yil, ay, tatiller)
  const topSaat = defter.reduce((s, d) => s + (d.etkinlik_saati || 1), 0)
  const toplamTahakkuk = tahakkuk?.toplam_gelir || 0
  const sonGun = gunSayisi(yil, ay)

  const dagitimRows = [
    { label: 'Temel Giderler (Materyal, Beslenme, SGK Prim, Diğer)', pct: ayarlar?.dagitim_temel_gider ?? 26 },
    { label: 'Kulüp Yönetim Kurulu Başkanı - Müdür', pct: ayarlar?.dagitim_baskan ?? 7 },
    { label: 'Kulüp Yönetim Kurulu Üyesi - Müdür Yardımcısı', pct: ayarlar?.dagitim_baskan_yrd ?? 5 },
    { label: 'Öğretmen, Usta Öğretici, Koordinatör Öğretmen', pct: ayarlar?.dagitim_ogretmen ?? 55 },
    { label: 'Yazışma-Muhasebe İşlerini Yürüten Personel', pct: ayarlar?.dagitim_muhasebe ?? 2 },
    { label: 'Temizlik Bakım ve Beslenme İşlerini Yürüten Personel', pct: ayarlar?.dagitim_temizlik ?? 4 },
    { label: 'Denetim Yetkilisi', pct: ayarlar?.dagitim_denetim ?? 1 },
  ]

  const tavanKatsayi = ayarlar?.tavan_katsayi || 13184.78
  const tavanRows = [
    { gorev: 'Başkan', pct: 275 },
    { gorev: 'Başkan Yardımcısı', pct: 250 },
    { gorev: 'Öğretmen', pct: 300 },
    { gorev: 'Koordinatör Öğretmen', pct: 275 },
    { gorev: 'Usta Öğretici', pct: 400 },
    { gorev: 'Muhasebe Memuru', pct: 80 },
    { gorev: 'Temizlik Personeli', pct: 80 },
  ]

  // Tablo hücre stilleri
  const thStyle: React.CSSProperties = { fontSize: 9, padding: '4px 3px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', borderRight: '1px solid #ccc', borderBottom: '1px solid #999', background: '#f0e6d2', color: '#333', fontWeight: 700 }
  const tdStyle: React.CSSProperties = { fontSize: 9, padding: '3px 4px', textAlign: 'right', borderRight: '1px solid #ddd', borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }
  const tdLeftStyle: React.CSSProperties = { ...tdStyle, textAlign: 'left' }
return (
    <div className={(selectedRow || bulkMode) ? 'printing-slip' : ''}>
      <Topbar
        title="Bordro"
        sub={`${ayLabel(ay, yil)} — Ücret hesaplama`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              className="btn btn-primary btn-sm" 
              onClick={hesapla} 
              disabled={loading || mailing}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Hesapla & Kaydet</span>
            </button>
            <button className="btn btn-secondary btn-sm no-print" onClick={handleBulkPrint} disabled={!hesaplandi || mailing}>
              <Printer size={14} style={{ marginRight: 4 }} /> Toplu Zarf
            </button>
            <button className="btn btn-primary btn-sm no-print" onClick={handlePdfDownload} style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }} disabled={mailing}>
              <Download size={14} style={{ marginRight: 4 }} /> PDF İndir
            </button>
            <button className="btn btn-secondary btn-sm no-print" onClick={topluMailGonder} disabled={!hesaplandi || mailing} style={{ background: 'var(--info)', color: 'white', borderColor: 'var(--info)' }}>
              <Mail size={14} style={{ marginRight: 4 }} /> Toplu Mail Gönder
            </button>
          </div>
        }
      />
      <div style={{ padding: 28 }}>
        {msg && !mailProgress && <div className={`no-print alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: 16 }}>{msg}</div>}
        {mailProgress && (
          <div className="alert alert-info no-print" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 20px', alignItems: 'stretch', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14 }}>📧 <strong>{mailProgress.name}</strong> için mail hazırlanıyor...</span>
              <span className="fw-600" style={{ fontSize: 15, color: 'var(--info)' }}>{mailProgress.current} / {mailProgress.total}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 15, width: '100%' }}>
              <div className="prog-bar" style={{ flex: 1, height: 10, marginTop: 0, background: 'rgba(0,0,0,0.08)' }}>
                <div className="prog-fill" style={{ width: `${(mailProgress.current / mailProgress.total) * 100}%`, boxShadow: '0 0 10px rgba(45,90,61,0.3)' }}></div>
              </div>
              <button 
                className="btn" 
                onClick={() => (cancelMailRef.current = true)}
                style={{ 
                  height: 28, padding: '0 14px', fontSize: 12,
                  background: 'white', color: 'var(--danger)',
                  border: '1px solid var(--danger-border)',
                  borderRadius: 6, transition: 'all 0.2s',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                🛑 Durdur
              </button>
            </div>
          </div>
        )}
        {loading && <div className="no-print alert alert-info" style={{ marginBottom: 16 }}>⏳ Veriler yükleniyor...</div>}

        <div className="main-content">
          <div className="no-print card" style={{ marginBottom: 24, padding: '24px 30px' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--danger)', letterSpacing: 0.5 }}>
                {ayarlar?.kurum_adi || 'KULÜP ADI TANIMLANMAMIŞ'}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginTop: 6, opacity: 0.8 }}>
                {ayLabel(ay, yil).toUpperCase()} — ÇOCUK KULÜBÜ BİLANÇOSU
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                01 {AYLAR[ay]} - {sonGun} {AYLAR[ay]} {yil}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 8 }}>
              <div className="stat-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '10px', background: 'rgba(45,90,61,0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={18} />
                  </div>
                  <div className="stat-label">Öğrenci Sayısı</div>
                </div>
                <div className="stat-value">{ogrenciSayisi}</div>
                <div className="stat-sub">Aktif ödeme yapan</div>
              </div>

              <div className="stat-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '10px', background: 'rgba(200,131,42,0.1)', color: 'var(--accent2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Layers size={18} />
                  </div>
                  <div className="stat-label">Şube Sayısı</div>
                </div>
                <div className="stat-value">{subeSayisi}</div>
                <div className="stat-sub">Aktif kulüp sınıfları</div>
              </div>

              <div className="stat-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '10px', background: 'rgba(138,128,112,0.1)', color: 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calendar size={18} />
                  </div>
                  <div className="stat-label">İş Günü</div>
                </div>
                <div className="stat-value">{isGunu}</div>
                <div className="stat-sub">Haftasonu ve tatil hariç</div>
              </div>

              <div className="stat-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '10px', background: 'rgba(45,90,61,0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={18} />
                  </div>
                  <div className="stat-label">Günlük Saat</div>
                </div>
                <div className="stat-value">{ayarlar?.gunluk_saat ?? 6}</div>
                <div className="stat-sub">Yönerge standartı</div>
              </div>

              <div className="stat-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '10px', background: 'rgba(192,57,43,0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={18} />
                  </div>
                  <div className="stat-label">Toplam Saat</div>
                </div>
                <div className="stat-value">{hDisplaySaat}</div>
                <div className="stat-sub">Ders + Koordinatörlük</div>
              </div>

              <div className="stat-card" style={{ background: 'var(--accent)', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '10px', background: 'rgba(255,255,255,0.2)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Wallet size={18} />
                  </div>
                  <div className="stat-label" style={{ color: 'rgba(255,255,255,0.8)' }}>Gelir Havuzu</div>
                </div>
                <div className="stat-value" style={{ color: 'white' }}>{fmtTL(toplamTahakkuk)}</div>
                <div className="stat-sub" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {toplamTahakkuk > 0 ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={12} /> Otomatik Hesaplandı</span> : 'Tahakkuk Bekleniyor'}
                </div>
              </div>
            </div>
          </div>

          {!hesaplandi && !loading && (
            <div
              className="no-print"
              style={{
                marginBottom: 16,
                padding: '14px 18px',
                borderRadius: 12,
                background: toplamTahakkuk > 0
                  ? 'linear-gradient(135deg, #fffbea 0%, #fef3c7 100%)'
                  : 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
                border: `1.5px solid ${toplamTahakkuk > 0 ? '#f59e0b' : '#f87171'}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                boxShadow: toplamTahakkuk > 0
                  ? '0 2px 8px rgba(245,158,11,0.15)'
                  : '0 2px 8px rgba(248,113,113,0.15)',
              }}
            >
              <span style={{ lineHeight: 1, marginTop: 1, display: 'flex', alignItems: 'center' }}>
                {toplamTahakkuk > 0 ? <AlertTriangle size={24} style={{ color: '#d97706' }} /> : <XCircle size={24} style={{ color: '#dc2626' }} />}
              </span>
              <div style={{ flex: 1 }}>
                {toplamTahakkuk > 0 ? (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e', marginBottom: 4 }}>
                      {AYLAR[ay]} {yil} Bordrousu Henüz Hesaplanmadı
                    </div>
                    <div style={{ fontSize: 12.5, color: '#78350f', lineHeight: 1.7 }}>
                      Personel <strong>Yıllık Vergi Matrahı</strong> dahil tüm güncel veriler bordro
                      hesaplamasına <em>ancak aşağıdaki buton ile</em> yansıtılır.
                      Personel sayfasında yaptığınız değişiklikler (matrah, SGK durumu vb.)
                      otomatik uygulanmaz — hesaplama başlatılmalıdır.
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={hesapla}
                      disabled={loading || mailing}
                      style={{
                        marginTop: 10,
                        background: '#d97706',
                        borderColor: '#b45309',
                        fontSize: 12,
                        padding: '6px 16px',
                        borderRadius: 8,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
                      <span>Hesapla &amp; Kaydet</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#991b1b', marginBottom: 4 }}>
                      Bu Ay İçin Tahakkuk Kaydı Bulunamadı
                    </div>
                    <div style={{ fontSize: 12.5, color: '#7f1d1d', lineHeight: 1.7 }}>
                      Bordro hesaplanabilmesi için önce <strong>Tahsilat</strong> girişi yapılmış olmalıdır.
                      Tahsilatlar tamamlandığında bordro otomatik hesaplanabilir hale gelecektir.
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Yıllık vergi matrahı değişim uyarısı */}
          {matrahDegistiPersonel.length > 0 && !loading && (
            <div
              className="no-print"
              style={{
                marginBottom: 16,
                padding: '14px 18px',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #fffbea 0%, #fef3c7 100%)',
                border: '1.5px solid #f59e0b',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                boxShadow: '0 2px 8px rgba(245,158,11,0.15)',
              }}
            >
              <span style={{ lineHeight: 1, marginTop: 1, display: 'flex', alignItems: 'center' }}>
                <AlertTriangle size={24} style={{ color: '#d97706' }} />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e', marginBottom: 4 }}>
                  Yıllık Vergi Matrahı Değişti — Bordroyu Yeniden Hesaplayın!
                </div>
                <div style={{ fontSize: 12.5, color: '#78350f', lineHeight: 1.6 }}>
                  Aşağıdaki personelin <strong>Yıllık Vergi Matrahı</strong> güncellendi ancak
                  bordro henüz yeniden hesaplanmadı. Gösterilen gelir vergisi tutarları
                  eski değerlere göre hesaplanmıştır:
                </div>
                <ul style={{ margin: '6px 0 10px 18px', padding: 0, fontSize: 12.5, color: '#92400e' }}>
                  {matrahDegistiPersonel.map(ad => (
                    <li key={ad} style={{ fontWeight: 600 }}>{ad}</li>
                  ))}
                </ul>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={hesapla}
                  disabled={loading || mailing}
                  style={{
                    background: '#d97706',
                    borderColor: '#b45309',
                    fontSize: 12,
                    padding: '6px 16px',
                    borderRadius: 8,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
                  <span>Şimdi Hesapla &amp; Güncelle</span>
                </button>
              </div>
            </div>
          )}

          {satirlar.length > 0 && (
            <div className="card print-area" style={{ marginTop: 20 }}>
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--danger)', letterSpacing: 0.5 }}>{ayarlar?.kurum_adi || 'KULÜP ADI TANIMLANMAMIŞ'}</div>
                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>01 {AYLAR[ay]} {yil} - {sonGun} {AYLAR[ay]} {yil} Tarihleri Arası Bordro Özeti</div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #999', fontSize: 9 }}>
                  <thead>
                    <tr>
                      <th colSpan={6} style={{ ...thStyle, background: '#f8f9fa' }}>PERSONEL BİLGİLERİ</th>
                      <th colSpan={3} style={{ ...thStyle, background: '#f8f9fa' }}>PUANTAJ & BRÜT</th>
                      <th colSpan={8} style={{ ...thStyle, background: '#e9ecef' }}>VERGİ HESAPLAMALARI (GV & DV)</th>
                      <th colSpan={4} style={{ ...thStyle, background: 'var(--danger-light)' }}>SGK KESİNTİLERİ & NET ÜCRET</th>
                      <th colSpan={6} style={{ ...thStyle, background: 'var(--info-light)', color: '#0c5460' }}>KURUM BÜTÇESİNDEN ÖDENECEK SGK DETAYLARI</th>
                    </tr>
                    <tr>
                      <th style={{ ...thStyle, width: 25, position: 'sticky', left: 0, zIndex: 10 }}>S.N.</th>
                      <th style={{ ...thStyle, minWidth: 120, position: 'sticky', left: 25, zIndex: 10 }}>GÖREVİ</th>
                      <th style={{ ...thStyle, minWidth: 150, position: 'sticky', left: 145, zIndex: 10 }}>ADI SOYADI</th>
                      <th style={{ ...thStyle, width: 40, position: 'sticky', left: 295, zIndex: 10, background: '#e1f5fe' }} className="no-print">Mail</th>
                      <th style={{ ...thStyle, width: 40, position: 'sticky', left: 335, zIndex: 10, background: '#e2d8c3' }} className="no-print">Zarf</th>
                      <th style={{ ...thStyle, minWidth: 95 }}>TC KİMLİK NO</th>
                      <th style={{ ...thStyle, width: 40 }}>Ders Saati</th>
                      <th style={{ ...thStyle, width: 50 }}>Saat Ücreti</th>
                      <th style={{ ...thStyle, width: 65 }}>Brüt Ücret</th>
                      <th style={{ ...thStyle, width: 65 }}>GV Matrahı</th>
                      <th style={{ ...thStyle, width: 35 }}>Oran</th>
                      <th style={{ ...thStyle, width: 50 }}>Hesaplanan GV</th>
                      <th style={{ ...thStyle, width: 50 }}>GV İstisnası</th>
                      <th style={{ ...thStyle, width: 50, fontWeight: 800 }}>GV Kesintisi</th>
                      <th style={{ ...thStyle, width: 50 }}>Hesaplanan DV</th>
                      <th style={{ ...thStyle, width: 50 }}>DV İstisnası</th>
                      <th style={{ ...thStyle, width: 50, fontWeight: 800 }}>DV Kesintisi</th>
                      <th style={{ ...thStyle, width: 55, background: 'var(--danger-light)' }}>SGK KİŞİ<br/>PAYI %14</th>
                      <th style={{ ...thStyle, width: 55, background: 'var(--danger-light)' }}>İŞSİZLİK<br/>KİŞİ %1</th>
                      <th style={{ ...thStyle, width: 65, background: '#eee' }}>Kesinti<br/>Toplamı</th>
                      <th style={{ ...thStyle, width: 75, background: '#fff3cd', color: '#856404', fontWeight: 800 }}>Net<br/>Ödenecek</th>
                      <th style={{ ...thStyle, width: 45, background: 'var(--info-light)', fontSize: 8 }}>Kısa V.<br/>%2.25</th>
                      <th style={{ ...thStyle, width: 45, background: 'var(--info-light)', fontSize: 8 }}>Emekli<br/>%20.0</th>
                      <th style={{ ...thStyle, width: 45, background: 'var(--info-light)', fontSize: 8 }}>Sağlık<br/>%12.5</th>
                      <th style={{ ...thStyle, width: 45, background: 'var(--info-light)', fontSize: 8 }}>İşsizlik<br/>%3.0</th>
                      <th style={{ ...thStyle, width: 60, background: '#bee5eb', fontWeight: 800 }}>TOTAL<br/>SGK</th>
                      <th style={{ ...thStyle, width: 100 }}>İmza</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSatirlar.map((s, i) => (
                      <tr key={s.personel.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ ...tdStyle, textAlign: 'center', position: 'sticky', left: 0, zIndex: 1, background: 'inherit' }}>{i + 1}</td>
                        <td style={{ ...tdLeftStyle, position: 'sticky', left: 25, zIndex: 1, background: 'inherit' }}>{s.personel.gorev}</td>
                        <td style={{ ...tdLeftStyle, fontWeight: 600, position: 'sticky', left: 145, zIndex: 1, background: 'inherit' }}>
                          {s.personel.ad}
                          {s.personel.aktif === false && <span style={{ color: 'var(--danger)', fontSize: 10, marginLeft: 6 }}> (Ayrıldı)</span>}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', position: 'sticky', left: 295, zIndex: 1, background: '#eefaff' }} className="no-print">
                          <button 
                            className="btn btn-outline-info btn-sm" 
                            style={{ padding: '2px 4px', background: s.personel.email ? 'var(--info)' : '#ccc', color: 'white', border: 'none' }} 
                            title={s.personel.email ? `Mail Gönder: ${s.personel.email}` : 'E-posta adresi eksik'}
                            disabled={!s.personel.email || mailing}
                            onClick={() => tekMailGonder(s)}
                          >
                            <Mail size={14} />
                          </button>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', position: 'sticky', left: 335, zIndex: 1, background: '#f8f4eb' }} className="no-print">
                          <button className="btn btn-secondary btn-sm" style={{ padding: '2px 4px' }} onClick={() => setSelectedRow(s)}><FileText size={14} /></button>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{s.personel.tc || '—'}</td>
                        <td style={tdStyle}>{s.toplamSaat || 0}</td>
                        <td style={tdStyle}>{typeof s.saatUcreti === 'string' ? s.saatUcreti : fmt(Number(s.saatUcreti))}</td>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>{fmt(s.sonuc.brut)}</td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            {fmt(s.sonuc.gv_matrah)}
                            <span style={{ cursor: 'help' }} title={`Devreden Matrah: ${fmt(s.personel.yillik_matrah)} \nToplam Kümülatif: ${fmt((Number(s.personel.yillik_matrah || 0)) + (s.sonuc.gv_matrah || 0))}`}>
                              <Info size={10} style={{ color: 'var(--info)' }} />
                            </span>
                          </div>
                        </td>
                        <td style={tdStyle}>{fmt(s.sonuc.gv_oran * 100)}%</td>
                        <td style={{ ...tdStyle, color: '#666' }}>{fmt(s.sonuc.gv_hesaplanan)}</td>
                        <td style={{ ...tdStyle, color: 'var(--warn)' }}>{fmt(s.sonuc.gv_istisna)}</td>
                        <td style={{ ...tdStyle, fontWeight: 800 }}>{fmt(s.sonuc.gv)}</td>
                        <td style={{ ...tdStyle, color: '#666' }}>{fmt(s.sonuc.dv_hesaplanan)}</td>
                        <td style={{ ...tdStyle, color: 'var(--warn)' }}>{fmt(s.sonuc.dv_istisna)}</td>
                        <td style={{ ...tdStyle, fontWeight: 800 }}>{fmt(s.sonuc.dv)}</td>
                        <td style={{ ...tdStyle, background: '#fdf3f2' }}>{s.personel.sgk_li ? fmt(s.sonuc.sgk_kisi) : '0,00'}</td>
                        <td style={{ ...tdStyle, background: '#fdf3f2' }}>{s.personel.sgk_li ? fmt(s.sonuc.sgk_issizlik) : '0,00'}</td>
                        <td style={{ ...tdStyle, background: '#f8f9fa', fontWeight: 700 }}>{fmt(s.sonuc.toplam_kesinti)}</td>
                        <td style={{ ...tdStyle, background: '#fff3cd', color: '#856404', fontWeight: 800 }}>{fmt(s.sonuc.net)}</td>
                        <td style={tdStyle}>{s.personel.sgk_li ? fmt(s.sonuc.sgk_detay_kisa) : '0,00'}</td>
                        <td style={tdStyle}>{s.personel.sgk_li ? fmt(s.sonuc.sgk_detay_malulluk) : '0,00'}</td>
                        <td style={tdStyle}>{s.personel.sgk_li ? fmt(s.sonuc.sgk_detay_saglik) : '0,00'}</td>
                        <td style={tdStyle}>{s.personel.sgk_li ? fmt(s.sonuc.sgk_detay_issizlik) : '0,00'}</td>
                        <td style={{ ...tdStyle, background: 'var(--info-light)', fontWeight: 700 }}>{s.personel.sgk_li ? fmt(s.sonuc.sgk_detay_toplam) : '0,00'}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', width: 100 }}>
                          <div className="no-print" style={{ color: '#aaa', fontSize: 8 }}>(İmza)</div>
                          <div className="only-print" style={{ display: 'none', height: 20, borderBottom: '1px dotted #999', margin: '4px 0' }}></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f0e6d2', fontWeight: 800, borderTop: '2px solid #999' }}>
                      {/* Cols 1-3: S.N + Görev + Ad */}
                      <td colSpan={3} style={{ ...tdStyle, textAlign: 'left', fontWeight: 800, position: 'sticky', left: 0, zIndex: 1, background: '#f0e6d2', fontSize: 9 }}>TOPLAM</td>
                      {/* Col 4: Mail (sadece ekranda) */}
                      <td className="no-print" style={{ ...tdStyle, position: 'sticky', left: 295, background: '#f0e6d2' }}></td>
                      {/* Col 5: Zarf (sadece ekranda) */}
                      <td className="no-print" style={{ ...tdStyle, position: 'sticky', left: 335, background: '#f0e6d2' }}></td>
                      {/* Col 6: TC - boş */}
                      <td style={{ ...tdStyle, background: '#f0e6d2' }}></td>
                      {/* Col 6: Ders Saati */}
                      <td style={{ ...tdStyle, fontWeight: 800, background: '#f0e6d2' }}>{toplamSaat}</td>
                      {/* Col 7: Saat Ücreti - boş (oran) */}
                      <td style={{ ...tdStyle, background: '#f0e6d2' }}></td>
                      {/* Col 8: Brüt */}
                      <td style={{ ...tdStyle, fontWeight: 800, background: '#f0e6d2' }}>{fmt(toplamBrut)}</td>
                      {/* Col 9: GV Matrahı */}
                      <td style={{ ...tdStyle, fontWeight: 800, background: '#f0e6d2' }}>{fmt(toplamGvMatrah)}</td>
                      {/* Col 10: GV Oran - boş */}
                      <td style={{ ...tdStyle, background: '#f0e6d2' }}></td>
                      {/* Col 11: Hesaplanan GV */}
                      <td style={{ ...tdStyle, fontWeight: 800, background: '#f0e6d2' }}>{fmt(toplamGvHesaplanan)}</td>
                      {/* Col 12: GV İstisnası */}
                      <td style={{ ...tdStyle, fontWeight: 800, background: '#f0e6d2' }}>{fmt(toplamGvIstisna)}</td>
                      {/* Col 13: GV Kesintisi */}
                      <td style={{ ...tdStyle, fontWeight: 800, background: '#f0e6d2' }}>{fmt(toplamGv)}</td>
                      {/* Col 14: Hesaplanan DV */}
                      <td style={{ ...tdStyle, fontWeight: 800, background: '#f0e6d2' }}>{fmt(toplamDvHesaplanan)}</td>
                      {/* Col 15: DV İstisnası */}
                      <td style={{ ...tdStyle, fontWeight: 800, background: '#f0e6d2' }}>{fmt(toplamDvIstisna)}</td>
                      {/* Col 16: DV Kesintisi */}
                      <td style={{ ...tdStyle, fontWeight: 800, background: '#f0e6d2' }}>{fmt(toplamDv)}</td>
                      {/* Col 17: SGK Kişi */}
                      <td style={{ ...tdStyle, fontWeight: 800, background: '#fde8e6' }}>{fmt(toplamSgkKisi)}</td>
                      {/* Col 18: SGK İşsizlik */}
                      <td style={{ ...tdStyle, fontWeight: 800, background: '#fde8e6' }}>{fmt(toplamSgkIssiz)}</td>
                      {/* Col 19: Kesinti Toplamı */}
                      <td style={{ ...tdStyle, fontWeight: 800, background: '#f0f0f0' }}>{fmt(toplamKesinti)}</td>
                      {/* Col 20: Net */}
                      <td style={{ ...tdStyle, fontWeight: 800, background: '#fff3cd', color: '#856404', fontSize: 10 }}>{fmt(toplamNet)}</td>
                      {/* Col 21: Kısa V. */}
                      <td style={{ ...tdStyle, fontWeight: 800, background: '#f0e6d2' }}>{fmt(toplamSgkDetayKisa)}</td>
                      {/* Col 22: Emekli */}
                      <td style={{ ...tdStyle, fontWeight: 800, background: '#f0e6d2' }}>{fmt(toplamSgkDetayMalul)}</td>
                      {/* Col 23: Sağlık */}
                      <td style={{ ...tdStyle, fontWeight: 800, background: '#f0e6d2' }}>{fmt(toplamSgkDetaySaglik)}</td>
                      {/* Col 24: İşsizlik */}
                      <td style={{ ...tdStyle, fontWeight: 800, background: '#f0e6d2' }}>{fmt(toplamSgkDetayIssiz)}</td>
                      {/* Col 25: TOTAL SGK */}
                      <td style={{ ...tdStyle, fontWeight: 800, background: '#bee5eb' }}>{fmt(toplamSgkDetayToplam)}</td>
                      {/* Col 26: İmza - boş */}
                      <td style={{ ...tdStyle, background: '#f0e6d2' }}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div style={{ marginTop: 24, padding: '0 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 20, textDecoration: 'underline' }}>DÜZENLEYEN</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                      <div style={{ fontSize: 10, fontWeight: 600 }}>{ayarlar?.duzenleyen_adi || '___________________'}</div>
                      <div style={{ fontSize: 9, color: '#666' }}>{ayarlar?.duzenleyen_unvani || 'Büro Personeli'}</div>
                      <div className="no-print" style={{ marginTop: 6, width: 160, borderBottom: '1px solid #333', height: 28 }}></div>
                      <div className="no-print" style={{ fontSize: 9, marginTop: 2 }}>(İmza)</div>
                      <div className="only-print" style={{ display: 'none', height: 20, borderBottom: '1px dotted #999', margin: '4px 0' }}></div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 20, textDecoration: 'underline' }}>ONAYLAYAN</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                      <div style={{ fontSize: 10, fontWeight: 600 }}>{ayarlar?.mudur_adi || '___________________'}</div>
                      <div style={{ fontSize: 9, color: '#666' }}>Okul Müdürü / Kulüp Başkanı</div>
                      <div className="no-print" style={{ marginTop: 6, width: 160, borderBottom: '1px solid #333', height: 28 }}></div>
                      <div className="no-print" style={{ fontSize: 9, marginTop: 2 }}>(İmza)</div>
                      <div className="only-print" style={{ display: 'none', height: 20, borderBottom: '1px dotted #999', margin: '4px 0' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {selectedRow && (
          <div className="modal-overlay" onClick={() => setSelectedRow(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, overflowY: 'auto', padding: 20 }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 12, maxWidth: '210mm', width: '100%', position: 'relative' }}>
              <div className="no-print" style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 8 }}>
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={() => window.print()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Printer size={14} />
                  <span>Yazdır</span>
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedRow(null)}>✕ Kapat</button>
              </div>
              <div className="print-area-zarf"><BordroZarfi row={selectedRow} ayarlar={ayarlar} ay={ay} yil={yil} /></div>
            </div>
          </div>
        )}

        {bulkMode && (
          <div className="only-print">
            {sortedSatirlar.map(s => <BordroZarfi key={s.personel.id} row={s} ayarlar={ayarlar} ay={ay} yil={yil} />)}
          </div>
        )}

        {/* PDF üretimi için gizli konteyner */}
        <div id="hidden-slip-container" style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm' }}></div>

        {confirmModal?.isOpen && (
          <ConfirmModal
            baslik={confirmModal.type === 'single' ? 'Mail Gönder' : 'Toplu Mail Gönder'}
            mesaj={confirmModal.type === 'single' 
              ? `${confirmModal.row?.personel.ad} isimli personele maaş bordrosu e-posta ile gönderilsin mi?`
              : `${confirmModal.count} personele maaş bordroları e-posta ile gönderilecektir. Onaylıyor musunuz?`
            }
            onayMetni="Evet, Gönder"
            iptalMetni="Vazgeç"
            tehlikeli={false}
            onOnayla={() => {
              if (confirmModal.type === 'single' && confirmModal.row) startTekMail(confirmModal.row)
              else if (confirmModal.type === 'bulk') startTopluMail()
              setConfirmModal(null)
            }}
            onIptal={() => setConfirmModal(null)}
          />
        )}
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .only-print { display: block !important; }
          .printing-slip .main-content { display: none !important; }
          body { background: white !important; padding: 0 !important; margin: 0 !important; }
          .print-area-zarf { width: 100% !important; margin: 0 !important; padding: 0 !important; display: block !important; }
          .bordro-zarfi:not(:last-child) { page-break-after: always !important; }
          .card { border: none !important; box-shadow: none !important; padding: 4px !important; }
          @page { margin: 4mm; size: A4 landscape; }
          /* Overflow wrapper'lar gizlemesin - zoom zaten scale eder */
          .print-area { overflow: visible !important; }
          .print-area > div { overflow: visible !important; }
          /* Sticky kaldır */
          th, td { position: static !important; }
          tfoot td { position: static !important; }
          /* Metin sadece nowrap - word wrap yok, zoom küçültecek */
          .print-area table th,
          .print-area table td {
            white-space: nowrap !important;
            overflow: hidden !important;
          }
        }
        .modal-overlay { animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        th[style*="sticky"], td[style*="sticky"] { box-shadow: 2px 0 5px rgba(0,0,0,0.05); }
      `}</style>
    </div>
  )
}
