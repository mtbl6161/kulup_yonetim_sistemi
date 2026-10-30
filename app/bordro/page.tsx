'use client'
import { useState, useCallback } from 'react'
import Topbar from '@/components/Topbar'
import { useAy } from '@/lib/AyContext'
import { perdeKapat } from '@/lib/perdeKapat'
import { supabase } from '@/lib/supabase'
import { pdfAc } from '@/lib/pdf'
import {
  ayLabel, fmtTL, fmt, isGunuSayisi, gunSayisi, AYLAR, tatilMi, gelirVergisiHesapla, tahakkukDagitimHesapla, detectActiveCategories, isOgretmen, isBaskan, isBaskanYrd, isMuhasebe, isTemizlik, isDenetim,
} from '@/lib/hesaplama'
import { Personel, SinifDefteri, Ayarlar, Bordro, Tahakkuk, Puantaj, BordroSatir, Sinif, Tatil } from '@/lib/types'
import { logIslem } from '@/lib/audit'
import { useAuth } from '@/lib/AuthContext'
import { Users, Layers, Calendar, Clock, TrendingUp, Wallet, CheckCircle2, FileText, Download, Mail, Info, RotateCw, AlertTriangle, XCircle, X } from 'lucide-react'
import { useRef } from 'react'
import BordroZarfi from '@/components/BordroZarfi'
import ConfirmModal from '@/components/ConfirmModal'
import { uyari } from '@/lib/diyalog'
import { hataMesaji } from '@/lib/hata'
import { useYukleme } from '@/lib/useYukleme'
import { bordroOzetPdf, bordroSirala, bordroToplamlari } from '@/lib/bordroOzet'
import { bordroSatirlariHesapla } from '@/lib/bordroHesap'

export default function BordroPage() {
  const { ay, yil } = useAy()
  const { okul, profil } = useAuth()
  const [, setPersonel] = useState<Personel[]>([])
  const [, setDefter] = useState<SinifDefteri[]>([])
  const [puantajData, setPuantajData] = useState<Puantaj[]>([])
  const [, setSiniflar] = useState<Sinif[]>([])
  const [ayarlar, setAyarlar] = useState<Ayarlar | null>(null)
  const [kaydedilmis, setKaydedilmis] = useState<Bordro[]>([])
  const [tahakkuk, setTahakkuk] = useState<Tahakkuk | null>(null)
  const [tatiller, setTatiller] = useState<Tatil[]>([])
  const [ogrenciSayisi, setOgrenciSayisi] = useState(0)
  const [subeSayisi, setSubeSayisi] = useState(0)
  const [satirlar, setSatirlar] = useState<BordroSatir[]>([])
  const [hesaplandi, setHesaplandi] = useState(false)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [selectedRow, setSelectedRow] = useState<BordroSatir | null>(null)
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
      // Küsürat atılır: 480,90 → 480,00
      const ogretmenBirimSaatUcreti = toplamOgretmenSaat > 0 ? Math.floor(pools.ogretmen / toplamOgretmenSaat) : 0

      const satirlar: BordroSatir[] = (brd || []).map((b) => {
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
          saatUcreti: sUcretDisplay,
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
  }, [ay, yil, okul?.id])

  useYukleme(load)


  const zarfPdfAc = async (satirlar: BordroSatir[]) => {
    if (!ayarlar || satirlar.length === 0) return
    const { zarfPdfUret } = await import('@/lib/bordroZarfPdf')
    pdfAc(await zarfPdfUret(satirlar, ayarlar, ay, yil), 'Ücret bordro zarfı')
  }

  const handlePdfDownload = () => bordroOzetPdf({ satirlar: sortedSatirlar, ayarlar, ay, yil })

  const generateSlipPdfBase64 = async (row: BordroSatir) => {
    if (!ayarlar) return null
    const { zarfBase64 } = await import('@/lib/bordroZarfPdf')
    return zarfBase64(row, ayarlar, ay, yil)
  }

  const tekMailGonder = async (row: BordroSatir) => {
    if (!row.personel.email) {
      uyari('Bu personelin e-posta adresi kayıtlı değil!')
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
    } catch (err) {
      console.error(err)
      setMsg(`❌ Mail gönderim hatası: ${hataMesaji(err)}`)
    } finally {
      setMailing(false)
      setTimeout(() => setMsg(''), 5000)
    }
  }

  const topluMailGonder = async () => {
    const mailliPersoneller = sortedSatirlar.filter(s => s.personel.email)
    if (mailliPersoneller.length === 0) {
      uyari('E-posta adresi kayıtlı personel bulunamadı!')
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

      const { yeniSatirlar, elenenGorevler } = bordroSatirlariHesapla({
        ayarlar, personel: aktifPersonelListesi, kaydedilmis, puantaj: puantajData, tatiller, ay, yil, gelir: finalGelir,
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
      const { error: delErr } = await supabase
        .from('bordro')
        .delete()
        .eq('ay', ay)
        .eq('yil', yil)
        .eq('okul_id', okulId)
      if (delErr) throw new Error('Bordro silinemedi: ' + delErr.message)

      // Sonra yeni hesaplanan değerleri ekle
      const { error: saveErr } = await supabase.from('bordro').insert(kayitlar)
      if (saveErr) throw new Error('Bordro kaydedilemedi: ' + saveErr.message + ' | Kod: ' + saveErr.code)

      logIslem({ 
        islem: 'hesapla', 
        tablo: 'bordro', 
        okul_id: okulId,
        aciklama: `${ayLabel(ay, yil)} bordrosu hesaplandı (${yeniSatirlar.length} personel)` 
      })
      setMsg('✅ Bordro hesaplandı ve kaydedildi.' + (elenenGorevler.length > 0
        ? ` İkinci görev ücreti ödenmedi (okulda kaldı): ${elenenGorevler.map(s => `${s.personel.ad} – ${s.personel.gorev} ${fmt(s.sonuc.brut)} TL`).join(', ')}`
        : ''))
      await load() // Verileri tekrar çekerek DB ile senkronize et
    } catch (err) {
      console.error('❌ Bordro hesaplama hatası:', err)
      setMsg('❌ Hata: ' + (hataMesaji(err) || JSON.stringify(err)))
    } finally {
      setLoading(false)
      setTimeout(() => setMsg(''), 8000)  // 8 saniye göster - hata okunabilsin
    }
  }




  // Tüm personeli tek tabloda sıralı göster
  const sortedSatirlar = bordroSirala(satirlar)

  const { toplamBrut, toplamGvMatrah, toplamGvHesaplanan, toplamGvIstisna, toplamGv, toplamDvHesaplanan, toplamDvIstisna, toplamDv, toplamSgkKisi, toplamSgkIssiz, toplamKesinti, toplamNet, toplamSaat, toplamSgkDetayKisa, toplamSgkDetayMalul, toplamSgkDetaySaglik, toplamSgkDetayIssiz, toplamSgkDetayToplam } = bordroToplamlari(sortedSatirlar)
  
  // Bordro henüz hesaplanmadıysa puantaj verilerinden toplamı çek
  const sistemToplamSaat = puantajData.reduce((sum, x) => {
    const d = Number(x.tarih.split('T')[0].split('-')[2])
    if (tatilMi(ay, d, yil, tatiller)) return sum
    return sum + (Number(x.saat) || 0)
  }, 0)
  
  const hDisplaySaat = hesaplandi ? toplamSaat : sistemToplamSaat

  const isGunu = isGunuSayisi(yil, ay, tatiller)
  const toplamTahakkuk = tahakkuk?.toplam_gelir || 0
  const sonGun = gunSayisi(yil, ay)


  // Tablo hücre stilleri
  const thStyle: React.CSSProperties = { fontSize: 9, padding: '4px 3px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap', borderRight: '1px solid #ccc', borderBottom: '1px solid #999', background: '#f0e6d2', color: '#333', fontWeight: 700 }
  const tdStyle: React.CSSProperties = { fontSize: 9, padding: '3px 4px', textAlign: 'right', borderRight: '1px solid #ddd', borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }
  const tdLeftStyle: React.CSSProperties = { ...tdStyle, textAlign: 'left' }
return (
    <div>
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
            <button className="btn btn-secondary btn-sm no-print" onClick={() => zarfPdfAc(sortedSatirlar)} disabled={!hesaplandi || mailing}>
              <Download size={14} style={{ marginRight: 4 }} /> Toplu Zarf
            </button>
            <button className="btn btn-pdf btn-sm no-print" onClick={handlePdfDownload} disabled={mailing}>
              <Download size={14} style={{ marginRight: 4 }} /> PDF İndir
            </button>
            <button className="btn btn-info btn-sm no-print" onClick={topluMailGonder} disabled={!hesaplandi || mailing}>
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
                <div className="prog-fill" style={{ width: `${(mailProgress.current / mailProgress.total) * 100}%`, boxShadow: '0 0 10px rgba(35,71,217,0.3)' }}></div>
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
                  <div style={{ width: 34, height: 34, borderRadius: '10px', background: 'rgba(35,71,217,0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                  <div style={{ width: 34, height: 34, borderRadius: '10px', background: 'rgba(35,71,217,0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                            className="btn btn-info btn-sm"
                            style={{ padding: '2px 4px' }}
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
          <div className="modal-overlay" {...perdeKapat(() => setSelectedRow(null))} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, overflowY: 'auto', padding: 20 }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 12, maxWidth: '210mm', width: '100%', position: 'relative' }}>
              <div className="no-print" style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 8 }}>
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={() => zarfPdfAc([selectedRow])}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Download size={14} />
                  <span>PDF</span>
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedRow(null)}><X size={14} /> Kapat</button>
              </div>
              <div className="print-area-zarf"><BordroZarfi row={selectedRow} ayarlar={ayarlar} ay={ay} yil={yil} /></div>
            </div>
          </div>
        )}



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
