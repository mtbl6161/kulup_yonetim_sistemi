'use client'
import { useEffect, useState, useCallback } from 'react'
import Topbar from '@/components/Topbar'
import { useAy } from '@/lib/AyContext'
import { supabase } from '@/lib/supabase'
import { ayLabel, fmtTL, fmt, bordroHesapla, isGunuSayisi, tavanHesapla, gunSayisi, AYLAR, gvDilimiBul, tatilMi } from '@/lib/hesaplama'
import { Personel, SinifDefteri, Ayarlar, Bordro, BordroSonuc, Tahakkuk, Puantaj, BordroSatir } from '@/lib/types'
import { Users, Layers, Calendar, Clock, TrendingUp, Wallet, CheckCircle2, FileText, Printer } from 'lucide-react'
import BordroZarfi from '@/components/BordroZarfi'

function isOgretmen(gorev: string) {
  const g = gorev.toLowerCase()
  return g.includes('öğretmen') || g.includes('ogretmen') || g.includes('usta')
}
function isBaskan(gorev: string) {
  const g = gorev.toLowerCase()
  return (g.includes('başkan') || g.includes('baskan') || g.includes('müdür')) &&
    !g.includes('yardımcı') && !g.includes('yardimci') && !g.includes('yrd')
}
function isBaskanYrd(gorev: string) {
  const g = gorev.toLowerCase()
  return g.includes('yardımcı') || g.includes('yardimci') || g.includes('yrd')
}
function isMuhasebe(gorev: string) {
  const g = gorev.toLowerCase()
  return g.includes('muhasebe') || g.includes('memur') || g.includes('yazışma')
}
function isTemizlik(gorev: string) {
  const g = gorev.toLowerCase()
  return g.includes('temizlik') || g.includes('hizmet') || g.includes('bakım')
}
function isDenetim(gorev: string) {
  return gorev.toLowerCase().includes('denetim')
}

export default function BordroPage() {
  const { ay, yil } = useAy()
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
      supabase.from('tatiller').select('*'),
      supabase.from('siniflar').select('id', { count: 'exact', head: true }).eq('aktif', true),
      supabase.from('tahsilat').select('ogrenci_id').eq('ay', Number(ay)).eq('yil', Number(yil)),
    ])
    setPersonel(per || [])
    setDefter(sd || [])
    setPuantajData(puan || [])
    setAyarlar(ayr)
    setKaydedilmis(brd || [])
    setTahakkuk(tah || null)
    setSiniflar(sin || [])
    setTatiller(tat || [])
    
    // Ödeme yapan benzersiz öğrenci sayısını hesapla
    const uniqueStudents = new Set((tahsData || []).map(t => t.ogrenci_id)).size
    setOgrenciSayisi(uniqueStudents)
    setSubeSayisi(subeCount || 0)
    setLoading(false)

    if (brd && brd.length > 0) {
      const satirlar: BordroSatir[] = (brd || []).map((b: any) => {
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

        return {
          personel: b.personel,
          toplamSaat: Number(b.toplam_saat),
          saatUcreti: ayr?.saat_ucreti || 0,
          hamBrut: Number(b.toplam_saat) * (ayr?.saat_ucreti || 0),
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
            sgk_detay_kisa: Math.round(brut * 0.0225 * 100 + 1e-9) / 100,
            sgk_detay_malulluk: Math.round(brut * 0.20 * 100 + 1e-9) / 100,
            sgk_detay_saglik: Math.round(brut * 0.125 * 100 + 1e-9) / 100,
            sgk_detay_issizlik: Math.round(brut * 0.03 * 100 + 1e-9) / 100,
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
      setSatirlar(satirlar)
      setHesaplandi(true)
    } else {
      setSatirlar([])
      setHesaplandi(false)
    }
  }, [ay, yil])

  useEffect(() => { load() }, [load])

  // Yazdırma: tabloyu ölç → A4 landscape'e sığacak zoom hesapla → uygula → print → sıfırla
  const handlePrint = useCallback(() => {
    const printArea = document.querySelector('.print-area') as HTMLElement | null
    if (!printArea) { window.print(); return }

    printArea.style.removeProperty('zoom')

    // Tablonun gerçek (overflow dahil) genişliğini ölç
    const table = printArea.querySelector('table') as HTMLElement | null
    const naturalWidth = table ? table.scrollWidth : printArea.scrollWidth

    // A4 yatay baskı alanı: 297mm − 12mm kenar boşlukları ≈ 1075px (96 dpi)
    const a4PrintWidth = 1075
    const scale = Math.min(1, a4PrintWidth / naturalWidth)

    if (scale < 1) {
      printArea.style.zoom = scale.toFixed(4)
    }

    const cleanup = () => {
      printArea.style.removeProperty('zoom')
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)

    window.print()
  }, [])

  const handleBulkPrint = useCallback(() => {
    setBulkMode(true)
    setTimeout(() => {
      window.print()
      setBulkMode(false)
    }, 100)
  }, [])

  async function hesapla() {
    if (!ayarlar) return
    setLoading(true)
    setMsg('🔄 Ödemeler kontrol ediliyor...')

    try {
      // 1. Ödemeleri (tahsilat) çekerek gelir havuzunu otomatik güncelle
      const { data: tahs, error: e1 } = await supabase.from('tahsilat').select('tutar').eq('ay', ay).eq('yil', yil)
      if (e1) throw e1
      
      const gelirToplami = (tahs || []).reduce((s, t) => s + Number(t.tutar), 0)
      
      // Tahakkuk (gelir havuzu) kaydını oluştur veya güncelle
      const { data: freshTahakkuk, error: e2 } = await supabase.from('tahakkuk').upsert({
        ay, yil, toplam_gelir: gelirToplami, hesaplandi_mi: true
      }, { onConflict: 'ay,yil' }).select().single()
      
      if (e2) throw e2
      setTahakkuk(freshTahakkuk)
      
      if (gelirToplami <= 0) {
        setMsg('⚠️ Bu ay için hiç ödeme (tahsilat) bulunamadı. Havuz "0" olarak hesaplanacak.')
      } else {
        setMsg('🔄 Bordro payları hesaplanıyor...')
      }

      const toplam = gelirToplami
      const pct = (oran: number | undefined) => toplam * (oran ?? 0) / 100
      const effectiveTavan = ayarlar.tavan_katsayi || 13184.78

      const pools = {
        ogretmen:  pct(ayarlar.dagitim_ogretmen ?? 55),
        baskan:    pct(ayarlar.dagitim_baskan ?? 7),
        baskanYrd: pct(ayarlar.dagitim_baskan_yrd ?? 5),
        muhasebe:  pct(ayarlar.dagitim_muhasebe ?? 2),
        temizlik:  pct(ayarlar.dagitim_temizlik ?? 4),
        denetim:   pct(ayarlar.dagitim_denetim ?? 1),
      }

      // Öğretmen türündeki personel ve saatleri
      const ogretmenler = personel.filter(p => isOgretmen(p.gorev))
      const ogretmenSaatMap = new Map<number, number>()
      ogretmenler.forEach(p => {
        const pSaatler = puantajData.filter(x => {
          if (x.personel_id !== p.id) return false
          const d = new Date(x.tarih).getDate()
          return !tatilMi(ay, d, yil, tatiller)
        })
        const toplamSaat = pSaatler.reduce((sum, x) => sum + (Number(x.saat) || 0), 0)
        ogretmenSaatMap.set(p.id, toplamSaat)
      })
      const toplamOgretmenSaat = ogretmenler.reduce((s, p) => s + (ogretmenSaatMap.get(p.id) || 0), 0)

      const ogretmenBrutMap = new Map<number, number>()
      if (toplamOgretmenSaat > 0) {
        const birimSaatUcreti = Math.round((pools.ogretmen / toplamOgretmenSaat) * 100) / 100
        ogretmenler.forEach(p => {
          const saat = ogretmenSaatMap.get(p.id) || 0
          let pay = birimSaatUcreti * saat
          const tavan = tavanHesapla(p.gorev, effectiveTavan)
          if (pay > tavan) pay = tavan
          ogretmenBrutMap.set(p.id, Math.round(pay * 100) / 100)
        })
      }

      const baskanSayisi = personel.filter(p => isBaskan(p.gorev)).length || 1
      const baskanYrdSay = personel.filter(p => isBaskanYrd(p.gorev)).length || 1
      const muhasebeSay  = personel.filter(p => isMuhasebe(p.gorev)).length || 1
      const temizlikSay  = personel.filter(p => isTemizlik(p.gorev)).length || 1
      const denetimSay   = personel.filter(p => isDenetim(p.gorev)).length || 1

      const hesapAyarlar: Ayarlar = { ...ayarlar, tavan_katsayi: effectiveTavan }

      const yeniSatirlar: BordroSatir[] = personel.map(p => {
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
        const sonuc = bordroHesapla(hesapAyarlar, pSaat, Number(p.yillik_matrah || 0), p.sgk_li, p.gorev, havuzBrut, p.vergi_istisnasi)
        
        if (isDenetim(p.gorev)) {
          sonuc.gv_hesaplanan = 0; sonuc.gv_istisna = 0; sonuc.gv = 0
          sonuc.dv_hesaplanan = 0; sonuc.dv_istisna = 0; sonuc.dv = 0
          sonuc.sgk_kisi = 0; sonuc.sgk_issizlik = 0; sonuc.toplam_kesinti = 0
          sonuc.net = sonuc.brut
        }

        return {
          personel: p, toplamSaat: pSaat, sonuc,
          saatUcreti: ayarlar.saat_ucreti || 0,
          hamBrut, odendi: mevcut?.odendi || false, bordroId: mevcut?.id
        }
      })

      setSatirlar(yeniSatirlar)
      setHesaplandi(true)
      setMsg('🔄 Bordro kaydediliyor...')

      // Otomatik Kaydetme Mantığı
      // Gerçek DB sütunları (test ile doğrulandı)
      const upserts = yeniSatirlar.map(s => ({
        personel_id: s.personel.id,
        ay, yil,
        toplam_saat: s.toplamSaat,
        brut: s.sonuc.brut,
        gv_oran: s.sonuc.gv_oran,
        gv_tutar: s.sonuc.gv,
        damga_tutar: s.sonuc.dv,
        sgk_kisi: s.sonuc.sgk_kisi,
        sgk_issizlik_kisi: s.sonuc.sgk_issizlik,
        sgk_isveren: s.sonuc.sgk_isveren,
        toplam_kesinti: s.sonuc.toplam_kesinti,
        net: s.sonuc.net,
        odendi: s.odendi,
      }))

      const { error: saveErr } = await supabase.from('bordro').upsert(upserts, { onConflict: 'personel_id,ay,yil' })
      if (saveErr) throw saveErr

      setMsg('✅ Bordro hesaplandı ve kaydedildi.')
      load() // Veritabanından taze veri çek
    } catch (err: any) {
      setMsg('❌ Hata: ' + err.message)
    } finally {
      setLoading(false)
      setTimeout(() => setMsg(''), 3000)
    }
  }




  async function odemeIsaretle(bordroId: number, odendi: boolean) {
    await supabase.from('bordro').update({ odendi }).eq('id', bordroId)
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

  const toplamBrut      = sortedSatirlar.reduce((s, r) => s + r.sonuc.brut, 0)
  const toplamGvMatrah   = sortedSatirlar.reduce((s, r) => s + r.sonuc.gv_matrah, 0)
  const toplamGv        = sortedSatirlar.reduce((s, r) => s + r.sonuc.gv, 0)
  const toplamDv        = sortedSatirlar.reduce((s, r) => s + r.sonuc.dv, 0)
  const toplamSgkKisi   = sortedSatirlar.reduce((s, r) => s + r.sonuc.sgk_kisi, 0)
  const toplamSgkIssiz  = sortedSatirlar.reduce((s, r) => s + r.sonuc.sgk_issizlik, 0)
  const toplamKesinti   = sortedSatirlar.reduce((s, r) => s + r.sonuc.toplam_kesinti, 0)
  const toplamNet       = sortedSatirlar.reduce((s, r) => s + r.sonuc.net, 0)
  const toplamSgkIsv    = sortedSatirlar.reduce((s, r) => s + r.sonuc.sgk_isveren, 0)
  const toplamSaat      = sortedSatirlar.reduce((s, r) => s + r.toplamSaat, 0)
  
  // Bordro henüz hesaplanmadıysa puantaj verilerinden toplamı çek
  const sistemToplamSaat = puantajData.reduce((sum, x) => {
    const d = new Date(x.tarih).getDate()
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
            <button className="btn btn-primary btn-sm" onClick={hesapla} disabled={loading}>
              🔄 Hesapla & Kaydet
            </button>
            <button className="btn btn-secondary btn-sm no-print" onClick={handleBulkPrint} disabled={!hesaplandi}>
              <Printer size={14} style={{ marginRight: 4 }} /> Toplu Zarf
            </button>
            <button className="btn btn-secondary btn-sm no-print" onClick={handlePrint}>🖨️ Tabloyu Yazdır</button>
          </div>
        }
      />
      <div style={{ padding: 28 }}>
        {msg && <div className={`no-print alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: 16 }}>{msg}</div>}
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
            <div className={`no-print alert ${toplamTahakkuk > 0 ? 'alert-warn' : 'alert-danger'}`}>
              {toplamTahakkuk > 0 ? <>⚠️ Bordroyu hesaplamak için <strong>"🔄 Hesapla"</strong> butonuna tıklayın.</> : <>❌ Bu ay için <strong>tahakkuk kaydı bulunamadı.</strong></>}
            </div>
          )}

          {satirlar.length > 0 && (
            <div className="card print-area" style={{ marginTop: 20 }}>
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#c0392b', letterSpacing: 0.5 }}>{ayarlar?.kurum_adi || 'KULÜP ADI TANIMLANMAMIŞ'}</div>
                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>01 {AYLAR[ay]} {yil} - {sonGun} {AYLAR[ay]} {yil} Tarihleri Arası Bordro Özeti</div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #999', fontSize: 9 }}>
                  <thead>
                    <tr>
                      <th colSpan={4} style={{ ...thStyle, background: '#f8f9fa' }}>PERSONEL BİLGİLERİ</th>
                      <th colSpan={3} style={{ ...thStyle, background: '#f8f9fa' }}>PUANTAJ & BRÜT</th>
                      <th colSpan={8} style={{ ...thStyle, background: '#e9ecef' }}>VERGİ HESAPLAMALARI (GV & DV)</th>
                      <th colSpan={4} style={{ ...thStyle, background: '#fde8e6' }}>SGK KESİNTİLERİ & NET ÜCRET</th>
                      <th colSpan={5} style={{ ...thStyle, background: '#d1ecf1', color: '#0c5460' }}>KURUM BÜTÇESİNDEN ÖDENECEK SGK DETAYLARI</th>
                    </tr>
                    <tr>
                      <th style={{ ...thStyle, width: 25, position: 'sticky', left: 0, zIndex: 10 }}>S.N.</th>
                      <th style={{ ...thStyle, minWidth: 120, position: 'sticky', left: 25, zIndex: 10 }}>GÖREVİ</th>
                      <th style={{ ...thStyle, minWidth: 150, position: 'sticky', left: 145, zIndex: 10 }}>ADI SOYADI</th>
                      <th style={{ ...thStyle, width: 40, position: 'sticky', left: 295, zIndex: 10, background: '#e2d8c3' }} className="no-print">Zarf</th>
                      <th style={{ ...thStyle, minWidth: 95 }}>TC KİMLİK NO</th>
                      <th style={{ ...thStyle, width: 40 }}>Ders<br/>Saati</th>
                      <th style={{ ...thStyle, width: 50 }}>Saat<br/>Ücreti</th>
                      <th style={{ ...thStyle, width: 65 }}>Brüt Ücret</th>
                      <th style={{ ...thStyle, width: 65 }}>GV<br/>Matrahı</th>
                      <th style={{ ...thStyle, width: 35 }}>Oran</th>
                      <th style={{ ...thStyle, width: 50 }}>Hesaplanan<br/>GV</th>
                      <th style={{ ...thStyle, width: 50 }}>GV<br/>İstisnası</th>
                      <th style={{ ...thStyle, width: 50, fontWeight: 800 }}>GV<br/>Kesintisi</th>
                      <th style={{ ...thStyle, width: 50 }}>Hesaplanan<br/>DV</th>
                      <th style={{ ...thStyle, width: 50 }}>DV<br/>İstisnası</th>
                      <th style={{ ...thStyle, width: 50, fontWeight: 800 }}>DV<br/>Kesintisi</th>
                      <th style={{ ...thStyle, width: 55, background: '#fde8e6' }}>SGK KİŞİ<br/>PAYI %14</th>
                      <th style={{ ...thStyle, width: 55, background: '#fde8e6' }}>İŞSİZLİK<br/>KİŞİ %1</th>
                      <th style={{ ...thStyle, width: 65, background: '#eee' }}>Kesinti<br/>Toplamı</th>
                      <th style={{ ...thStyle, width: 75, background: '#fff3cd', color: '#856404', fontWeight: 800 }}>Net<br/>Ödenecek</th>
                      <th style={{ ...thStyle, width: 45, background: '#d1ecf1', fontSize: 8 }}>Kısa V.<br/>%2.25</th>
                      <th style={{ ...thStyle, width: 45, background: '#d1ecf1', fontSize: 8 }}>Emekli<br/>%20.0</th>
                      <th style={{ ...thStyle, width: 45, background: '#d1ecf1', fontSize: 8 }}>Sağlık<br/>%12.5</th>
                      <th style={{ ...thStyle, width: 45, background: '#d1ecf1', fontSize: 8 }}>İşsizlik<br/>%3.0</th>
                      <th style={{ ...thStyle, width: 60, background: '#bee5eb', fontWeight: 800 }}>TOTAL<br/>SGK</th>
                      <th style={{ ...thStyle, width: 100 }}>İmza</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSatirlar.map((s, i) => (
                      <tr key={s.personel.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ ...tdStyle, textAlign: 'center', position: 'sticky', left: 0, zIndex: 1, background: 'inherit' }}>{i + 1}</td>
                        <td style={{ ...tdLeftStyle, position: 'sticky', left: 25, zIndex: 1, background: 'inherit' }}>{s.personel.gorev}</td>
                        <td style={{ ...tdLeftStyle, fontWeight: 600, position: 'sticky', left: 145, zIndex: 1, background: 'inherit' }}>{s.personel.ad}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', position: 'sticky', left: 295, zIndex: 1, background: '#f8f4eb' }} className="no-print">
                          <button className="btn btn-secondary btn-sm" style={{ padding: '2px 4px' }} onClick={() => setSelectedRow(s)}><FileText size={14} /></button>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{s.personel.tc || '—'}</td>
                        <td style={tdStyle}>{s.toplamSaat || 0}</td>
                        <td style={tdStyle}>{fmt(s.saatUcreti)}</td>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>{fmt(s.sonuc.brut)}</td>
                        <td style={tdStyle}>{fmt(s.sonuc.gv_matrah)}</td>
                        <td style={tdStyle}>{fmt(s.sonuc.gv_oran * 100)}%</td>
                        <td style={{ ...tdStyle, color: '#666' }}>{fmt(s.sonuc.gv_hesaplanan)}</td>
                        <td style={{ ...tdStyle, color: '#e67e22' }}>{fmt(s.sonuc.gv_istisna)}</td>
                        <td style={{ ...tdStyle, fontWeight: 800 }}>{fmt(s.sonuc.gv)}</td>
                        <td style={{ ...tdStyle, color: '#666' }}>{fmt(s.sonuc.dv_hesaplanan)}</td>
                        <td style={{ ...tdStyle, color: '#e67e22' }}>{fmt(s.sonuc.dv_istisna)}</td>
                        <td style={{ ...tdStyle, fontWeight: 800 }}>{fmt(s.sonuc.dv)}</td>
                        <td style={{ ...tdStyle, background: '#fdf3f2' }}>{s.personel.sgk_li ? fmt(s.sonuc.sgk_kisi) : '0,00'}</td>
                        <td style={{ ...tdStyle, background: '#fdf3f2' }}>{s.personel.sgk_li ? fmt(s.sonuc.sgk_issizlik) : '0,00'}</td>
                        <td style={{ ...tdStyle, background: '#f8f9fa', fontWeight: 700 }}>{fmt(s.sonuc.toplam_kesinti)}</td>
                        <td style={{ ...tdStyle, background: '#fff3cd', color: '#856404', fontWeight: 800 }}>{fmt(s.sonuc.net)}</td>
                        <td style={tdStyle}>{s.personel.sgk_li ? fmt(s.sonuc.sgk_detay_kisa) : '0,00'}</td>
                        <td style={tdStyle}>{s.personel.sgk_li ? fmt(s.sonuc.sgk_detay_malulluk) : '0,00'}</td>
                        <td style={tdStyle}>{s.personel.sgk_li ? fmt(s.sonuc.sgk_detay_saglik) : '0,00'}</td>
                        <td style={tdStyle}>{s.personel.sgk_li ? fmt(s.sonuc.sgk_detay_issizlik) : '0,00'}</td>
                        <td style={{ ...tdStyle, background: '#d1ecf1', fontWeight: 700 }}>{s.personel.sgk_li ? fmt(s.sonuc.sgk_detay_toplam) : '0,00'}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', width: 100 }}>
                          <div className="no-print" style={{ color: '#aaa', fontSize: 8 }}>(İmza)</div>
                          <div className="only-print" style={{ display: 'none', height: 20, borderBottom: '1px dotted #999', margin: '4px 0' }}></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
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
                <button className="btn btn-primary btn-sm" onClick={() => window.print()}>🖨️ Yazdır</button>
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
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .only-print { display: block !important; }
          .printing-slip .main-content { display: none !important; }
          body { background: white !important; padding: 0 !important; margin: 0 !important; }
          .print-area-zarf { width: 100% !important; margin: 0 !important; padding: 0 !important; display: block !important; }
          .bordro-zarfi:not(:last-child) { page-break-after: always !important; }
          .card { border: none !important; box-shadow: none !important; }
          @page { margin: 10mm; size: auto; }
          .print-area { zoom: 1 !important; transform: none !important; }
          th, td { position: static !important; }
        }
        .modal-overlay { animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        th[style*="sticky"], td[style*="sticky"] { box-shadow: 2px 0 5px rgba(0,0,0,0.05); }
      `}</style>
    </div>
  )
}
