'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  Eye, Building2, FileText, ChevronRight, ChevronLeft,
  MapPin, LogOut, RefreshCw, LayoutDashboard, BarChart2, Calendar,
  Users, UserCheck, Wallet, ClipboardList, Activity
} from 'lucide-react'
import {
  isGunuSayisi, gunSayisi, tahakkukDagitimHesapla,
  tavanHesapla, gorevTavanYuzdesi, AYLAR, tatilMi,
  detectActiveCategories, bordroHesapla
} from '@/lib/hesaplama'
import { Ayarlar } from '@/lib/types'

const ayIsimleri = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
]

interface OkulSatir { 
  id: number; 
  ad: string; 
  odeme_durumu?: string;
  ogrenci_sayisi?: number;
  personel_sayisi?: number;
  son_islem?: string;
}

interface BordroSatir {
  id: number; personel_id: number; ay: number; yil: number; saat_ucreti?: number;
  toplam_saat: number; brut: number; gv_matrah: number; gv_oran: number
  gv_hesaplanan: number; gv_istisna_tutari: number; gv_tutar: number
  dv_hesaplanan: number; dv_istisna_tutari: number; damga_tutar: number
  sgk_kisi: number; sgk_issizlik_kisi: number; sgk_isveren: number
  toplam_kesinti: number; net: number; odendi: boolean
  personel?: { ad: string; gorev: string; tc?: string; sgk_li: boolean }
}

interface BilancoVerisi {
  ayarlar: Ayarlar
  toplamGelir: number
  ogrenciSayisi: number
  subeSayisi: number
  toplamDersSaati: number
  tatiller: any[]
  personel?: any[]
  puantaj?: any[]
  bordro?: any[]
}

const TAVAN_KATEGORILER = [
  { label: 'Başkan',                      gorev: 'Başkan',               sgkLi: false },
  { label: 'Başkan Yardımcısı',           gorev: 'Başkan Yardımcısı',    sgkLi: false },
  { label: 'Koordinatör Öğretmen',        gorev: 'Koordinatör Öğretmen', sgkLi: false },
  { label: 'Öğretmen',                    gorev: 'Öğretmen',             sgkLi: false },
  { label: 'Usta Öğretici',               gorev: 'Usta Öğretici',        sgkLi: true  },
  { label: 'Usta Öğretici (Emekli)',      gorev: 'Usta Öğretici',        sgkLi: true, isRetired: true },
  { label: 'Muhasebe Memuru',             gorev: 'Muhasebe Personeli',   sgkLi: true  },
  { label: 'Muhasebe Memuru (Emekli)',    gorev: 'Muhasebe Personeli',   sgkLi: true, isRetired: true },
  { label: 'Temizlik Personeli',          gorev: 'Temizlik Personeli',   sgkLi: true  },
  { label: 'Temizlik Personeli (Emekli)', gorev: 'Temizlik Personeli',   sgkLi: true, isRetired: true },
  { label: 'Denetim Yetkilisi',           gorev: 'Denetim Yetkilisi',    sgkLi: false },
]

const AY_ADI = ['','Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']

function fmt(v: number | undefined | null) {
  return Number(v ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtTL(v: number) {
  return v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL'
}
function sum(rows: BordroSatir[], key: keyof BordroSatir) {
  return rows.reduce((s, b) => s + Number(b[key] ?? 0), 0)
}

export default function DenetimPage() {
  const { profil, il, loading, signOut, refresh } = useAuth()
  const [sekme, setSekme] = useState<'ozet' | 'bordro' | 'bilanco' | 'loglar' | 'ders-programi' | 'sinif-defteri' | 'profil'>('ozet')

  // Profil state
  const [profilAd, setProfilAd] = useState('')
  const [profilSoyad, setProfilSoyad] = useState('')
  const [profilKaydediliyor, setProfilKaydediliyor] = useState(false)
  const [profilMesaj, setProfilMesaj] = useState<{ tip: 'ok' | 'hata'; text: string } | null>(null)
  const [eskiSifre, setEskiSifre] = useState('')
  const [yeniSifre, setYeniSifre] = useState('')
  const [yeniSifreTekrar, setYeniSifreTekrar] = useState('')
  const [sifreKaydediliyor, setSifreKaydediliyor] = useState(false)
  const [sifreMesaj, setSifreMesaj] = useState<{ tip: 'ok' | 'hata'; text: string } | null>(null)
  const [okullar, setOkullar] = useState<OkulSatir[]>([])
  const [okulYukleniyor, setOkulYukleniyor] = useState(false)

  // Seçim State'leri
  const [secilenOkulId, setSecilenOkulId] = useState<number | null>(null)
  const [secilenAyKey, setSecilenAyKey] = useState<string | null>(null) // "2026-3"
  const [bordroAylari, setBordroAylari] = useState<{ ay: number; yil: number }[]>([])
  const [ilceler, setIlceler] = useState<{ id: number; ad: string }[]>([])
  const [filtreIlceId, setFiltreIlceId] = useState<number | null>(null)
  
  // Veri State'leri
  const [satirlar, setSatirlar] = useState<BordroSatir[]>([])
  const [bilVeri, setBilVeri] = useState<BilancoVerisi | null>(null)
  const [dersProgrami, setDersProgrami] = useState<any[]>([])
  const [sinifDefteri, setSinifDefteri] = useState<any[]>([])
  const [siniflar, setSiniflar] = useState<any[]>([])
  const [tatiller, setTatiller] = useState<any[]>([])
  const [yukleniyor, setYukleniyor] = useState(false)
  const [sonHareketler, setSonHareketler] = useState<any[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [ilOzet, setIlOzet] = useState({ 
    toplamOgrenci: 0, 
    toplamPersonel: 0, 
    toplamTahakkuk: 0,
    gosterilenAy: new Date().getMonth() + 1,
    gosterilenYil: new Date().getFullYear(),
    onayBekleyen: 0 
  })

  const selectedOkul = okullar.find(o => o.id === secilenOkulId)

  // Profil sekmesi açılınca mevcut adı doldur
  useEffect(() => {
    if (sekme === 'profil') {
      setProfilAd(profil?.ad || '')
      setProfilSoyad(profil?.soyad || '')
      setProfilMesaj(null)
      setSifreMesaj(null)
    }
  }, [sekme, profil])

  async function handleProfilGuncelle(e: React.FormEvent) {
    e.preventDefault()
    setProfilKaydediliyor(true)
    setProfilMesaj(null)
    const { error } = await supabase
      .from('profiller')
      .update({ ad: profilAd.trim(), soyad: profilSoyad.trim() })
      .eq('id', profil!.id)
    if (error) {
      setProfilMesaj({ tip: 'hata', text: 'Güncelleme başarısız: ' + error.message })
    } else {
      await refresh()
      setProfilMesaj({ tip: 'ok', text: 'Bilgiler güncellendi.' })
    }
    setProfilKaydediliyor(false)
  }

  async function handleSifreDegistir(e: React.FormEvent) {
    e.preventDefault()
    setSifreMesaj(null)
    if (yeniSifre !== yeniSifreTekrar) {
      setSifreMesaj({ tip: 'hata', text: 'Yeni şifreler eşleşmiyor.' })
      return
    }
    if (yeniSifre.length < 6) {
      setSifreMesaj({ tip: 'hata', text: 'Şifre en az 6 karakter olmalıdır.' })
      return
    }
    setSifreKaydediliyor(true)
    // Önce mevcut şifre ile giriş doğrula
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: (await supabase.auth.getUser()).data.user?.email || '',
      password: eskiSifre,
    })
    if (signInErr) {
      setSifreMesaj({ tip: 'hata', text: 'Mevcut şifre hatalı.' })
      setSifreKaydediliyor(false)
      return
    }
    const { error } = await supabase.auth.updateUser({ password: yeniSifre })
    if (error) {
      setSifreMesaj({ tip: 'hata', text: 'Şifre değiştirilemedi: ' + error.message })
    } else {
      setSifreMesaj({ tip: 'ok', text: 'Şifre başarıyla değiştirildi.' })
      setEskiSifre('')
      setYeniSifre('')
      setYeniSifreTekrar('')
    }
    setSifreKaydediliyor(false)
  }

  // Okulları ve İl Geneli Özeti Getir
  const okullarGetir = useCallback(async () => {
    const myIlId = profil?.il_id
    if (!myIlId) return
    setOkulYukleniyor(true)
    
    // 1. Okulları Getir (İlişkili sayılarla birlikte)
    let query = supabase
      .from('okullar')
      .select('id, ad, odeme_durumu, ilce_id')
      .eq('il_id', myIlId)
      .order('ad')
    
    if (filtreIlceId) {
      query = query.eq('ilce_id', filtreIlceId)
    }

    const { data: okullarData, error: queryError } = await query
    
    if (queryError) {
      console.error('Okullar çekilirken hata:', queryError)
      setOkulYukleniyor(false)
      return
    }
    
    if (okullarData) {
      const okullarWithDetails = await Promise.all(okullarData.map(async (o) => {
        const [ogr, per, son] = await Promise.all([
          supabase.from('ogrenciler').select('id', { count: 'exact', head: true }).eq('okul_id', o.id),
          supabase.from('personel').select('id', { count: 'exact', head: true }).eq('okul_id', o.id),
          supabase.from('audit_log').select('created_at').eq('okul_id', o.id).order('created_at', { ascending: false }).limit(1).single()
        ])
        return {
          ...o,
          ogrenci_sayisi: ogr.count || 0,
          personel_sayisi: per.count || 0,
          son_islem: son.data?.created_at
        }
      }))
      setOkullar(okullarWithDetails)

      // İl Özeti Hesapla
      const ogrenciT = okullarWithDetails.reduce((a, b) => a + (b.ogrenci_sayisi || 0), 0)
      const personelT = okullarWithDetails.reduce((a, b) => a + (b.personel_sayisi || 0), 0)
      
      // Tahakkuk verisi (Önce Bu Ayı Dene, Yoksa Son Veri Olan Ayı Al)
      const buAy = new Date().getMonth() + 1
      const buYil = new Date().getFullYear()
      
      let { data: tahData } = await supabase.from('tahsilat')
        .select('tutar, ay, yil')
        .in('okul_id', okullarData.map(o => o.id))
        .eq('ay', buAy).eq('yil', buYil)
      
      let gosterilenAy = buAy
      let gosterilenYil = buYil

      // Eğer bu ay veri yoksa, il genelindeki en son tahsilat yapılan ayı bul
      if (!tahData || tahData.length === 0) {
        const { data: lastMonthData } = await supabase.from('tahsilat')
          .select('ay, yil')
          .in('okul_id', okullarData.map(o => o.id))
          .order('yil', { ascending: false }).order('ay', { ascending: false })
          .limit(1).single()
        
        if (lastMonthData) {
          gosterilenAy = lastMonthData.ay
          gosterilenYil = lastMonthData.yil
          const { data: retryData } = await supabase.from('tahsilat')
            .select('tutar, ay, yil')
            .in('okul_id', okullarData.map(o => o.id))
            .eq('ay', gosterilenAy).eq('yil', gosterilenYil)
          tahData = retryData
        }
      }
      
      const tahakkukT = (tahData || []).reduce((a, b) => a + Number(b.tutar), 0)

      setIlOzet({
        toplamOgrenci: ogrenciT,
        toplamPersonel: personelT,
        toplamTahakkuk: tahakkukT,
        gosterilenAy,
        gosterilenYil,
        onayBekleyen: okullarData.length
      })
    }

    try {
      // 2. Son Hareketleri Getir (İl Geneli)
      const { data: logs } = await supabase.from('audit_log')
        .select('*, okullar(ad)')
        .in('okul_id', okullarData?.map(o => o.id) || [])
        .order('created_at', { ascending: false })
        .limit(6)
      setSonHareketler(logs || [])
      
      // 3. Detay verilerini de tetikle
      setRefreshKey(prev => prev + 1)
    } catch (error) {
      console.error('Veri yenileme hatası:', error)
    } finally {
      setOkulYukleniyor(false)
    }
  }, [profil?.il_id, filtreIlceId])

  useEffect(() => { okullarGetir() }, [okullarGetir, filtreIlceId])

  // İlçe Listesini Getir
  useEffect(() => {
    const myIlId = profil?.il_id
    if (!myIlId) return
    
    async function ilceleriGetir() {
      const { data } = await supabase.from('ilceler').select('id, ad').eq('il_id', myIlId).order('ad')
      if (data) setIlceler(data)
    }
    ilceleriGetir()
  }, [profil?.il_id])

  // Okul seçildiğinde ayları getir
  useEffect(() => {
    if (!secilenOkulId) {
      setBordroAylari([])
      setSecilenAyKey(null)
      return
    }

    async function aylariGetir() {
      const { data } = await supabase.from('bordro').select('ay, yil')
        .eq('okul_id', secilenOkulId)
        .order('yil', { ascending: false }).order('ay', { ascending: false })
      
      const uniqueAylar = Array.from(new Map((data || []).map(r => [`${r.yil}-${r.ay}`, r])).values())
      setBordroAylari(uniqueAylar)
      
      // En son ayı otomatik seç (eğer seçili değilse)
      if (uniqueAylar.length > 0 && !secilenAyKey) {
        setSecilenAyKey(`${uniqueAylar[0].yil}-${uniqueAylar[0].ay}`)
      }
    }
    aylariGetir()
  }, [secilenOkulId])

  // Veri Yükleme Motoru
  useEffect(() => {
    if (!secilenOkulId || !secilenAyKey) {
      setSatirlar([])
      setBilVeri(null)
      return
    }

    const [yil, ay] = secilenAyKey.split('-').map(Number)

    async function veriYukle() {
      setYukleniyor(true)
      const [yil, ay] = secilenAyKey!.split('-').map(Number)

      // 1. Önce Ayarları Çek (Saat ücretini bilmek için şart)
      const { data: ayr } = await supabase.from('ayarlar')
        .select('*')
        .eq('okul_id', secilenOkulId).eq('ay', ay).eq('yil', yil)
        .maybeSingle()

      if (ayr) {
        setBilVeri({ ayarlar: ayr } as any)
      } else {
        setBilVeri(null)
      }

      if (sekme === 'bordro') {
        const { data } = await supabase.from('bordro')
          .select('*, personel(ad, gorev, tc, sgk_li)')
          .eq('okul_id', secilenOkulId).eq('ay', ay).eq('yil', yil)
        
        const gorevSirasi: Record<string, number> = {
          'Başkan': 1,
          'Başkan Yardımcısı': 2,
          'Koordinatör Öğretmen': 3,
          'Öğretmen': 4,
          'Usta Öğretici': 5,
          'Muhasebe Personeli': 6,
          'Temizlik Personeli': 7,
          'Denetim Yetkilisi': 8
        }

        const siraliData = (data || []).sort((a, b) => {
          const sA = gorevSirasi[a.personel?.gorev || ''] || 99
          const sB = gorevSirasi[b.personel?.gorev || ''] || 99
          if (sA !== sB) return sA - sB
          return (a.personel?.ad || '').localeCompare(b.personel?.ad || '', 'tr')
        })

        setSatirlar(siraliData)
      } else if (sekme === 'bilanco') {
        const startDate = `${yil}-${String(ay).padStart(2, '0')}-01`
        const lastDay = gunSayisi(yil, ay)
        const endDate = `${yil}-${String(ay).padStart(2, '0')}-${lastDay}T23:59:59`

        const [
          { data: ayr },
          { data: tahs },
          { data: brd },
          { data: sinif },
          { data: tat },
          { data: per },
          { data: puan },
        ] = await Promise.all([
          supabase.from('ayarlar').select('*').eq('okul_id', secilenOkulId).single(),
          supabase.from('tahsilat').select('tutar, ogrenci_id').eq('okul_id', secilenOkulId).eq('ay', ay).eq('yil', yil),
          supabase.from('bordro').select('*').eq('okul_id', secilenOkulId).eq('ay', ay).eq('yil', yil),
          supabase.from('siniflar').select('id').eq('okul_id', secilenOkulId).eq('aktif', true),
          supabase.from('tatiller').select('*'),
          supabase.from('personel').select('*').eq('okul_id', secilenOkulId),
          supabase.from('puantaj').select('*').eq('okul_id', secilenOkulId).gte('tarih', startDate).lte('tarih', endDate),
        ])
        
        if (ayr) {
          setBilVeri({
            ayarlar: ayr,
            toplamGelir: (tahs || []).reduce((s, t) => s + Number(t.tutar), 0),
            ogrenciSayisi: new Set((tahs || []).map(t => t.ogrenci_id)).size,
            subeSayisi: sinif?.length || 0,
            toplamDersSaati: (brd || []).reduce((s, b) => s + Number(b.toplam_saat), 0),
            tatiller: tat || [],
            personel: per || [],
            puantaj: puan || [],
            bordro: brd || [],
          })
        } else {
          setBilVeri(null)
        }
      } else if (sekme === 'ders-programi') {
        const [{ data: pr }, { data: sin }, { data: tat }] = await Promise.all([
          supabase.from('ders_programi')
            .select('*, ogretmen:personel(id,ad,gorev)')
            .eq('okul_id', secilenOkulId).eq('ay', ay).eq('yil', yil),
          supabase.from('siniflar').select('*').eq('okul_id', secilenOkulId).eq('aktif', true).order('ad'),
          supabase.from('tatiller').select('*'),
        ])
        setDersProgrami(pr || [])
        setSiniflar(sin || [])
        setTatiller(tat || [])
      } else if (sekme === 'sinif-defteri') {
        // okul_id olmayan eski kayıtlar için: okul_id filtresi olmadan çek,
        // RLS il yetkisiyle koruma sağlar; ay/yil client'ta filtrele
        const [sdRes, sinRes, tatRes] = await Promise.all([
          supabase.from('sinif_defteri')
            .select('*, ogretmen:personel(id,ad,gorev)')
            .or(`okul_id.eq.${secilenOkulId},okul_id.is.null`)
            .eq('ay', ay).eq('yil', yil),
          supabase.from('siniflar').select('*').eq('okul_id', secilenOkulId).eq('aktif', true).order('ad'),
          supabase.from('tatiller').select('*'),
        ])
        // okul_id null olan kayıtları siniflar ile doğrula
        const sinifAdlari = new Set((sinRes.data || []).map((s: any) => s.ad))
        const filtrelenmis = (sdRes.data || []).filter((p: any) =>
          p.okul_id === secilenOkulId || (p.okul_id == null && sinifAdlari.has(p.kulup_adi))
        )
        setSinifDefteri(filtrelenmis)
        setSiniflar(sinRes.data || [])
        setTatiller(tatRes.data || [])
      }
      setYukleniyor(false)
    }

    veriYukle()
  }, [secilenOkulId, secilenAyKey, sekme, refreshKey])

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 36, height: 36, border: '3px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  )

  const [selYil, selAy] = secilenAyKey?.split('-').map(Number) || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: '"DM Sans", system-ui, sans-serif', overflow: 'hidden' }}>

      {/* ── NAVBAR ── */}
      <header style={{
        minHeight: 64, flexShrink: 0,
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: 20,
        zIndex: 50, flexWrap: 'wrap', transition: 'padding 0.3s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        {/* Marka */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 20, borderRight: '1px solid var(--border-light)' }}>
          <Eye size={20} color="var(--accent)" />
          <div style={{ cursor: 'pointer' }} onClick={() => { setSekme('ozet'); setSecilenOkulId(null) }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1, letterSpacing: -0.5 }}>Kulüp360</div>
            <div style={{ fontSize: 9, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 800 }}>Denetim Merkezi</div>
          </div>
        </div>

        {/* --- SEÇİM HUB --- */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
          {/* Okul Seçici */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
            <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }}><Building2 size={14} /></div>
            <select 
              value={secilenOkulId || ''} 
              onChange={(e) => { setSecilenOkulId(Number(e.target.value)); setSecilenAyKey(null); setSekme(s => s === 'ozet' ? 'bordro' : s) }}
              style={selectStyle}
            >
              <option value="">Kurum Seçiniz...</option>
              {okullar.map(o => (
                <option key={o.id} value={o.id}>{o.ad}</option>
              ))}
            </select>
          </div>

          {/* Ay Seçici */}
          {secilenOkulId && (
            <div style={{ position: 'relative', width: 160 }}>
              <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }}><Calendar size={14} /></div>
              <select 
                value={secilenAyKey || ''} 
                onChange={(e) => setSecilenAyKey(e.target.value)}
                style={selectStyle}
                disabled={bordroAylari.length === 0}
              >
                {bordroAylari.length === 0 ? (
                  <option value="">Kayıt Yok</option>
                ) : (
                  bordroAylari.map(({ ay, yil }) => (
                    <option key={`${yil}-${ay}`} value={`${yil}-${ay}`}>{AY_ADI[ay]} {yil}</option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Görünüm Tabları */}
          {secilenOkulId && bordroAylari.length > 0 && (
            <div style={{ display: 'flex', background: 'var(--surface2)', padding: 3, borderRadius: 10, gap: 2, border: '1px solid var(--border-light)' }}>
              {[
                { id: 'bordro',        label: 'Bordro',       icon: FileText },
                { id: 'bilanco',       label: 'Bilanço',      icon: BarChart2 },
                { id: 'ders-programi', label: 'Ders Prog.',   icon: Calendar },
                { id: 'sinif-defteri', label: 'Sınıf Def.',   icon: ClipboardList },
              ].map(t => (
                <button key={t.id}
                  onClick={() => setSekme(t.id as any)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 700,
                    color: sekme === t.id ? '#fff' : 'var(--text2)',
                    background: sekme === t.id ? 'var(--accent)' : 'transparent',
                    transition: 'all 0.2s',
                  }}>
                  <t.icon size={13} />
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Profil & Çıkış */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setSekme('profil')} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer',
            background: sekme === 'profil' ? 'var(--accent-lighter)' : 'var(--surface2)',
            color: sekme === 'profil' ? 'var(--accent)' : 'var(--text2)',
            fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
          }}>
            <UserCheck size={14} />
            {typeof window !== 'undefined' && window.innerWidth > 600 ? (profil?.ad || 'Profilim') : ''}
          </button>
          <button onClick={signOut} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'var(--danger-light)', color: 'var(--danger)', fontSize: 13, fontWeight: 700,
            transition: 'all 0.2s',
          }}>
            <LogOut size={14} /> {typeof window !== 'undefined' && window.innerWidth > 600 ? 'Çıkış' : ''}
          </button>
        </div>
      </header>

      {/* ── İÇERİK ── */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* GENEL BAKIŞ / OKUL SEÇİLMEDİĞİNDE */}
        {sekme === 'ozet' && !secilenOkulId && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', background: 'var(--bg)' }}>
            
            {/* ÜST BAŞLIK VE İSTATİSTİKLER */}
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text)', marginBottom: 6, letterSpacing: -0.8, fontFamily: '"Playfair Display", serif' }}>{il?.ad} Denetim Hub</h1>
                  <p style={{ color: 'var(--text3)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                    <MapPin size={14} color="var(--accent)" /> İl Milli Eğitim Müdürlüğü Kurumsal Analiz Paneli
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <select
                    value={filtreIlceId || ''}
                    onChange={e => setFiltreIlceId(e.target.value ? Number(e.target.value) : null)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text)',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Tüm İlçeler</option>
                    {ilceler.map(i => <option key={i.id} value={i.id}>{i.ad}</option>)}
                  </select>

                  <button 
                    onClick={okullarGetir} 
                    disabled={okulYukleniyor}
                    style={{ 
                      ...actionBtn, 
                      padding: '10px 18px', 
                      background: okulYukleniyor ? 'var(--border)' : 'var(--accent)', 
                      color: '#fff', 
                      border: 'none', 
                      fontWeight: 600, 
                      borderRadius: 10, 
                      boxShadow: okulYukleniyor ? 'none' : '0 4px 12px rgba(45,90,61,0.2)',
                      opacity: okulYukleniyor ? 0.8 : 1
                    }}
                  >
                    <RefreshCw size={14} style={{ marginRight: 8 }} className={okulYukleniyor ? 'animate-spin' : ''} />
                    {okulYukleniyor ? 'Yenileniyor...' : 'Verileri Tazele'}
                  </button>
                </div>
              </div>

              {/* METRIC STRIP */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                {[
                  { label: 'Kayıtlı Okul', value: okullar.length, icon: Building2, color: 'var(--accent)' },
                  { label: 'İl Geneli Öğrenci', value: ilOzet.toplamOgrenci, icon: Users, color: 'var(--accent2)' },
                  { label: 'Aktif Personel', value: ilOzet.toplamPersonel, icon: UserCheck, color: 'var(--success)' },
                  { 
                    label: `${ayIsimleri[ilOzet.gosterilenAy - 1]} ${ilOzet.gosterilenYil} Tahakkuk`, 
                    value: fmtTL(ilOzet.toplamTahakkuk), 
                    icon: Wallet, 
                    color: 'var(--info)' 
                  },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                    <div style={statLabel}>{s.label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                       <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', fontFamily: '"Playfair Display", serif' }}>{s.value}</div>
                       <s.icon size={20} color={s.color} style={{ opacity: 0.8 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32 }}>
              
              {/* SOL SÜTUN: OKUL LİSTESİ */}
              <div>
                <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ClipboardList size={20} color="var(--accent)" />
                  <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)', letterSpacing: -0.3 }}>Kurum Portföyü</span>
                  <span style={{ fontSize: 11, background: 'var(--surface2)', color: 'var(--text3)', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>{okullar.length} KURUM</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
                  {okullar.map(o => (
                    <div key={o.id} 
                      onClick={() => { setSecilenOkulId(o.id); setSekme('bordro') }}
                      style={{ 
                        background: 'var(--surface)', padding: '20px', borderRadius: 16, border: '1px solid var(--border)', 
                        cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex', flexDirection: 'column', gap: 16,
                        position: 'relative', overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--accent)'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(45,90,61,0.08)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--border)'
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '85%' }}>{o.ad}</div>
                          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {o.odeme_durumu === 'aktif' ? <span style={{ color: 'var(--success)', fontWeight: 700 }}>● Aktif</span> : <span style={{ color: 'var(--danger)', fontWeight: 700 }}>● Pasif</span>}
                            <span style={{ color: 'var(--border)' }}>|</span>
                            {o.son_islem ? <span>{new Date(o.son_islem).toLocaleDateString('tr-TR')}</span> : 'Kayıt Yok'}
                          </div>
                        </div>
                        <ChevronRight size={16} color="var(--border)" />
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                         <div style={{ flex: 1, background: 'var(--surface2)', padding: '10px', borderRadius: 10, textAlign: 'center' }}>
                            <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 800, textTransform: 'uppercase' }}>Öğrenci</div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)' }}>{o.ogrenci_sayisi}</div>
                         </div>
                         <div style={{ flex: 1, background: 'var(--surface2)', padding: '10px', borderRadius: 10, textAlign: 'center' }}>
                            <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 800, textTransform: 'uppercase' }}>Personel</div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent2)' }}>{o.personel_sayisi}</div>
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SAĞ SÜTUN: SON HAREKETLER */}
              <div>
                <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Activity size={20} color="var(--accent2)" />
                  <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)', letterSpacing: -0.3 }}>İl Aktivite Akışı</span>
                </div>

                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '8px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  {sonHareketler.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Aktivite kaydı bulunamadı.</div>
                  ) : (
                    sonHareketler.map((log, i) => (
                      <div key={log.id} style={{ 
                        padding: '16px', 
                        borderBottom: i === sonHareketler.length - 1 ? 'none' : '1px solid var(--border-light)',
                        display: 'flex', gap: 12
                      }}>
                        <div style={{ 
                          width: 32, height: 32, borderRadius: 10, background: 'var(--surface2)', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 
                        }}>
                          <FileText size={14} color="var(--accent)" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                              {log.okullar?.ad}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600 }}>{new Date(log.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.4 }}>{log.aciklama}</div>
                        </div>
                      </div>
                    ))
                  )}
                  <div style={{ padding: '16px', borderTop: '1px solid var(--border-light)', textAlign: 'center' }}>
                     <button onClick={() => setSekme('loglar')} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Tüm İzleri Gör →</button>
                  </div>
                </div>

                <div style={{ marginTop: 32, padding: '24px', background: 'var(--surface2)', borderRadius: 16, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)', marginBottom: 8 }}>Denetim İpucu</div>
                  <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>
                    İl geneli tahakkuk verisi otomatik olarak cari ay üzerinden hesaplanır. Ödeme bekleyen okulları filtrelemek için kurum portföyünü kullanabilirsiniz.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TÜM LOGLAR GÖRÜNÜMÜ (TAM SAYFA) */}
        {sekme === 'loglar' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
             {/* Sticky Header */}
             <div style={{ 
               padding: '20px 40px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', 
               display: 'flex', alignItems: 'center', justifyContent: 'space-between',
               position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
             }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                   <button onClick={() => setSekme('ozet')} style={{ ...actionBtn, padding: '8px 16px', background: 'var(--surface2)', fontWeight: 600 }}>← Hub'a Dön</button>
                   <div>
                      <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', margin: 0, fontFamily: '"Playfair Display", serif' }}>İl Geneli Aktivite Kayıtları</h1>
                      <p style={{ color: 'var(--text3)', fontSize: 12, margin: 0, fontWeight: 500 }}>Tüm kurumların işlem dökümü (Canlı)</p>
                   </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                   <div style={{ background: 'var(--accent-lighter)', padding: '6px 14px', borderRadius: 8, fontSize: 12, color: 'var(--accent)', fontWeight: 800, border: '1px solid var(--accent-light)' }}>
                      {sonHareketler.length} Kayıt Listeleniyor
                   </div>
                   <button 
                     onClick={okullarGetir} 
                     disabled={okulYukleniyor}
                     style={{ ...actionBtn, padding: '8px 12px', opacity: okulYukleniyor ? 0.5 : 1 }}
                   >
                     <RefreshCw size={14} className={okulYukleniyor ? 'animate-spin' : ''} />
                   </button>
                </div>
             </div>

             {/* Full Width Table Content */}
             <div style={{ flex: 1, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                   <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      <tr style={{ background: 'var(--surface2)', textAlign: 'left' }}>
                         <th style={{ padding: '16px 40px', color: 'var(--text3)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', width: '180px', borderBottom: '1px solid var(--border)' }}>Tarih / Saat</th>
                         <th style={{ padding: '16px 20px', color: 'var(--text3)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', width: '220px', borderBottom: '1px solid var(--border)' }}>Kurum Adı</th>
                         <th style={{ padding: '16px 20px', color: 'var(--text3)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', width: '120px', borderBottom: '1px solid var(--border)' }}>İşlem</th>
                         <th style={{ padding: '16px 40px', color: 'var(--text3)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Açıklama</th>
                      </tr>
                   </thead>
                   <tbody>
                      {sonHareketler.length === 0 ? (
                         <tr><td colSpan={4} style={{ padding: 100, textAlign: 'center', color: 'var(--text3)', background: 'var(--surface)' }}>Kayıt bulunamadı.</td></tr>
                      ) : (
                         sonHareketler.map((log, idx) => (
                            <tr key={log.id} style={{ 
                               background: idx % 2 === 0 ? 'var(--surface)' : 'var(--bg)', 
                               borderBottom: '1px solid var(--border-light)',
                               transition: 'background 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                            onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'var(--surface)' : 'var(--bg)'}
                            >
                               <td style={{ padding: '20px 40px', fontSize: 13, color: 'var(--text3)', fontWeight: 500 }}>
                                  {new Date(log.created_at).toLocaleString('tr-TR')}
                               </td>
                               <td style={{ padding: '20px 20px', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                                  {log.okullar?.ad}
                               </td>
                               <td style={{ padding: '20px 20px' }}>
                                  <span style={{ 
                                    fontSize: 10, background: 'var(--accent-lighter)', color: 'var(--accent)', 
                                    padding: '4px 10px', borderRadius: 6, fontWeight: 800, textTransform: 'uppercase',
                                    border: '1px solid var(--accent-light)'
                                  }}>
                                     {log.islem}
                                  </span>
                               </td>
                               <td style={{ padding: '20px 40px', fontSize: 14, color: 'var(--text2)', lineHeight: 1.5, fontWeight: 500 }}>
                                  {log.aciklama}
                               </td>
                            </tr>
                         ))
                      )}
                   </tbody>
                </table>
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 12, fontWeight: 500 }}>
                   Listenin sonuna ulaşıldı.
                </div>
             </div>
          </div>
        )}

        {/* BORDRO GÖRÜNÜMÜ */}
        {secilenOkulId && sekme === 'bordro' && (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
            {/* Alt Bilgi Şeridi */}
            <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
               <div style={{ background: 'var(--accent-lighter)', padding: '6px 14px', borderRadius: 8, fontSize: 13, border: '1px solid var(--accent-light)' }}>
                  <span style={{ fontWeight: 800, color: 'var(--accent)' }}>{selectedOkul?.ad}</span>
                  <span style={{ margin: '0 10px', color: 'var(--border)' }}>|</span>
                  <span style={{ color: 'var(--text2)', fontWeight: 600 }}>{selAy ? `${AY_ADI[selAy]} ${selYil}` : 'Ay Seçilmedi'}</span>
               </div>
               
               {satirlar.length > 0 && (
                 <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
                    {[
                      { l: 'Brüt', v: sum(satirlar, 'brut'), c: 'var(--text)' },
                      { l: 'Kesinti', v: sum(satirlar, 'toplam_kesinti'), c: 'var(--danger)' },
                      { l: 'Net', v: sum(satirlar, 'net'), c: 'var(--accent)' }
                    ].map(s => (
                      <div key={s.l} style={{ textAlign: 'right', padding: '0 16px', borderRight: s.l !== 'Net' ? '1px solid var(--border-light)' : 'none' }}>
                        <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.l}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: s.c }}>{fmt(s.v)} ₺</div>
                      </div>
                    ))}
                 </div>
               )}
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
              {yukleniyor ? (
                <div style={loadingOverlay}><RefreshCw size={24} className="animate-spin" color="var(--accent)" /></div>
              ) : satirlar.length === 0 ? (
                <div style={emptyView}>
                   <FileText size={48} color="var(--border)" />
                   <p style={{ marginTop: 16, color: 'var(--text3)', fontWeight: 600 }}>Bu dönem için bordro kaydı bulunamadı.</p>
                </div>
              ) : (
                <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflowX: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', zoom: 0.85 }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'auto' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                      <tr style={{ background: 'var(--surface2)' }}>
                        <th colSpan={4} style={thGrup}>PERSONEL BİLGİLERİ</th>
                        <th colSpan={3} style={thGrup}>PUANTAJ & BRÜT</th>
                        <th colSpan={5} style={{ ...thGrup, borderBottom: '1px solid var(--border)' }}>GELİR VERGİSİ</th>
                        <th colSpan={3} style={{ ...thGrup, borderBottom: '1px solid var(--border)' }}>DAMGA VERGİSİ</th>
                        <th colSpan={3} style={{ ...thGrup, borderBottom: '1px solid var(--border)' }}>SGK KESİNTİLERİ</th>
                        <th style={{ ...thGrup, borderBottom: '1px solid var(--border)' }}>TOPLAM</th>
                        <th colSpan={5} style={{ ...thGrup, borderBottom: '1px solid var(--border)', borderRight: 'none' }}>İŞVEREN SGK DETAYLARI</th>
                      </tr>
                      <tr style={{ background: 'var(--surface)', borderBottom: '2px solid var(--accent)' }}>
                        {[
                          { l: 'S.N.', a: 'center', w: 30, sticky: 0 },
                          { l: 'GÖREVİ', a: 'left', w: 100, sticky: 30 },
                          { l: 'ADI SOYADI', a: 'left', w: 140, sticky: 130 },
                          { l: 'TC KİMLİK', a: 'center', w: 95 },
                          { l: 'Ders\nSaati', a: 'center', w: 40 },
                          { l: 'Saat\nÜcreti', a: 'center', w: 50 },
                          { l: 'Brüt', a: 'center', w: 50, bold: true },
                          { l: 'GV\nMat.', a: 'center', w: 45 },
                          { l: '%', a: 'center', w: 25 },
                          { l: 'Hes.\nGV', a: 'center', w: 40, muted: true },
                          { l: 'GV\nİst.', a: 'center', w: 40 },
                          { l: 'GV\nKes.', a: 'center', w: 45, bold: true },
                          { l: 'Hes.\nDV', a: 'center', w: 40, muted: true },
                          { l: 'DV\nİst.', a: 'center', w: 40 },
                          { l: 'DV\nKes.', a: 'center', w: 45, bold: true },
                          { l: 'SGK\n%14', a: 'center', w: 40 },
                          { l: 'İşs.\n%1', a: 'center', w: 40 },
                          { l: 'Kes.\nTop.', a: 'center', w: 50, bold: true },
                          { l: 'NET\nÖDENECEK', a: 'center', w: 65, bold: true, success: true },
                          { l: 'Kısa\n.25', a: 'center', w: 35 },
                          { l: 'Em.\n%20', a: 'center', w: 35 },
                          { l: 'Sağ.\n.5', a: 'center', w: 35 },
                          { l: 'İşs.\n%3', a: 'center', w: 35 },
                          { l: 'İşv.\nTop.', a: 'center', w: 55, bold: true },
                        ].map((h, i) => (
                          <th key={i} style={{ 
                            ...thSub, 
                            textAlign: h.a as any, 
                            minWidth: h.w, 
                            color: h.success ? 'var(--accent)' : 'var(--text2)', 
                            fontWeight: h.bold ? 800 : 700,
                            position: h.sticky !== undefined ? 'sticky' : 'relative',
                            left: h.sticky,
                            zIndex: h.sticky !== undefined ? 20 : 1
                          }}>{h.l}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Kurumsal birim saat ücretini listedeki "Öğretmen" veya "Usta Öğretici"den koklayarak bulalım
                        // Çünkü onların brüt ücretinde ek tazminat (koordinatörlük vb.) genelde yoktur.
                        const referansSatir = satirlar.find(s => (s.personel?.gorev === 'Öğretmen' || s.personel?.gorev === 'Usta Öğretici') && s.toplam_saat > 0)
                        const hesaplananRefUcret = referansSatir ? (referansSatir.brut / referansSatir.toplam_saat) : 0
                        const standartSaatUcreti = bilVeri?.ayarlar?.saat_ucreti || hesaplananRefUcret

                        return satirlar.map((b, i) => (
                          <tr key={b.id} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg)', borderBottom: '1px solid var(--border-light)' }}>
                            <td style={{ ...td, textAlign: 'center', fontWeight: 800, color: 'var(--text)', position: 'sticky', left: 0, zIndex: 10, background: 'inherit' }}>{i + 1}</td>
                            <td style={{ ...td, textAlign: 'left', fontWeight: 700, color: 'var(--text2)', position: 'sticky', left: 30, zIndex: 10, background: 'inherit', fontSize: 10 }}>{b.personel?.gorev ?? '—'}</td>
                            <td style={{ ...td, textAlign: 'left', fontWeight: 900, color: 'var(--text)', position: 'sticky', left: 130, zIndex: 10, background: 'inherit', fontSize: 13 }}>{b.personel?.ad ?? `#${b.personel_id}`}</td>
                            <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: 'var(--text3)', fontFamily: 'monospace', fontSize: 10 }}>{b.personel?.tc ?? '—'}</td>
                            <td style={{ ...td, fontWeight: 700, color: 'var(--text)' }}>{b.toplam_saat}</td>
                            <td style={{ ...td, fontWeight: 700, color: 'var(--text)' }}>{fmt(standartSaatUcreti > 0 ? standartSaatUcreti : (b.saat_ucreti || (b.toplam_saat > 0 ? (b.brut / b.toplam_saat) : 0)))}</td>
                            <td style={{ ...td, fontWeight: 700, color: 'var(--text)' }}>{fmt(b.brut)}</td>
                            <td style={{ ...td, color: 'var(--text)' }}>{fmt(b.gv_matrah)}</td>
                            <td style={{ ...td, color: 'var(--text)' }}>{fmt(b.gv_oran * 100)}%</td>
                            <td style={{ ...td, color: 'var(--text)', opacity: 0.8 }}>{fmt(b.gv_hesaplanan)}</td>
                            <td style={{ ...td, color: 'var(--text)' }}>{fmt(b.gv_istisna_tutari)}</td>
                            <td style={{ ...td, fontWeight: 700, color: 'var(--text)' }}>{fmt(b.gv_tutar)}</td>
                            <td style={{ ...td, color: 'var(--text)', opacity: 0.8 }}>{fmt(b.dv_hesaplanan)}</td>
                            <td style={{ ...td, color: 'var(--text)' }}>{fmt(b.dv_istisna_tutari || 0)}</td>
                            <td style={{ ...td, fontWeight: 700, color: 'var(--text)' }}>{fmt(b.damga_tutar)}</td>
                            <td style={{ ...td, color: 'var(--text)' }}>{b.personel?.sgk_li ? fmt(b.sgk_kisi) : '—'}</td>
                            <td style={{ ...td, color: 'var(--text)' }}>{b.personel?.sgk_li ? fmt(b.sgk_issizlik_kisi) : '—'}</td>
                            <td style={{ ...td, fontWeight: 800, color: 'var(--text)' }}>{fmt(b.toplam_kesinti)}</td>
                            <td style={{ ...td, fontWeight: 900, color: 'var(--text)', background: 'var(--surface2)', borderLeft: '2px solid var(--accent)' }}>{fmt(b.net)}</td>
                            {/* İşveren SGK Detayları */}
                            <td style={{ ...td, color: 'var(--text)', fontSize: 11 }}>{b.personel?.sgk_li ? fmt(b.brut * 0.0225) : '—'}</td>
                            <td style={{ ...td, color: 'var(--text)', fontSize: 11 }}>{b.personel?.sgk_li ? fmt(b.brut * 0.20) : '—'}</td>
                            <td style={{ ...td, color: 'var(--text)', fontSize: 11 }}>{b.personel?.sgk_li ? fmt(b.brut * 0.125) : '—'}</td>
                            <td style={{ ...td, color: 'var(--text)', fontSize: 11 }}>{b.personel?.sgk_li ? fmt(b.brut * 0.03) : '—'}</td>
                            <td style={{ ...td, fontWeight: 800, color: 'var(--text)', borderRight: 'none', fontSize: 12 }}>{b.personel?.sgk_li ? fmt(b.sgk_isveren) : '—'}</td>
                          </tr>
                        ))
                      })()}
                      {/* GENEL TOPLAM SATIRI */}
                      <tr style={{ background: 'var(--accent-lighter)', borderTop: '3px solid var(--accent)', borderBottom: '2px solid var(--border)', position: 'sticky', bottom: 0, zIndex: 30, boxShadow: '0 -4px 10px rgba(0,0,0,0.05)' }}>
                        <td colSpan={4} style={{ ...td, textAlign: 'right', fontWeight: 800, color: 'var(--accent)', background: 'inherit', fontSize: 10, position: 'sticky', left: 0, zIndex: 30 }}>GENEL TOPLAM</td>
                        <td style={{ ...td, fontWeight: 800, color: 'var(--text)', background: 'inherit', fontSize: 12 }}>{sum(satirlar, 'toplam_saat')}</td>
                        <td style={{ ...td, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 12 }}>—</td>
                        <td style={{ ...td, fontWeight: 800, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 12 }}>{fmt(sum(satirlar, 'brut'))}</td>
                        <td style={{ ...td, fontWeight: 900, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 12 }}>{fmt(sum(satirlar, 'gv_matrah'))}</td>
                        <td style={{ ...td, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 12 }}>—</td>
                        <td style={{ ...td, fontWeight: 800, color: 'var(--text)', opacity: 0.8, background: 'var(--accent-lighter)', fontSize: 11 }}>{fmt(sum(satirlar, 'gv_hesaplanan'))}</td>
                        <td style={{ ...td, fontWeight: 800, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 12 }}>{fmt(sum(satirlar, 'gv_istisna_tutari'))}</td>
                        <td style={{ ...td, fontWeight: 800, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 12 }}>{fmt(sum(satirlar, 'gv_tutar'))}</td>
                        <td style={{ ...td, fontWeight: 900, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 12 }}>{fmt(sum(satirlar, 'dv_hesaplanan'))}</td>
                        <td style={{ ...td, fontWeight: 800, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 12 }}>{fmt(sum(satirlar, 'dv_istisna_tutari'))}</td>
                        <td style={{ ...td, fontWeight: 800, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 12 }}>{fmt(sum(satirlar, 'damga_tutar'))}</td>
                        <td style={{ ...td, fontWeight: 800, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 12 }}>{fmt(sum(satirlar, 'sgk_kisi'))}</td>
                        <td style={{ ...td, fontWeight: 800, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 12 }}>{fmt(sum(satirlar, 'sgk_issizlik_kisi'))}</td>
                        <td style={{ ...td, fontWeight: 800, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 12 }}>{fmt(sum(satirlar, 'toplam_kesinti'))}</td>
                        <td style={{ ...td, fontWeight: 900, color: 'var(--accent)', background: 'var(--accent-lighter)', fontSize: 16 }}>{fmt(sum(satirlar, 'net'))}</td>
                        {/* İşveren Toplamları */}
                        <td style={{ ...td, fontWeight: 800, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 13 }}>{fmt(satirlar.reduce((s, b) => s + (b.personel?.sgk_li ? b.brut * 0.0225 : 0), 0))}</td>
                        <td style={{ ...td, fontWeight: 800, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 13 }}>{fmt(satirlar.reduce((s, b) => s + (b.personel?.sgk_li ? b.brut * 0.20 : 0), 0))}</td>
                        <td style={{ ...td, fontWeight: 800, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 13 }}>{fmt(satirlar.reduce((s, b) => s + (b.personel?.sgk_li ? b.brut * 0.125 : 0), 0))}</td>
                        <td style={{ ...td, fontWeight: 800, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 13 }}>{fmt(satirlar.reduce((s, b) => s + (b.personel?.sgk_li ? b.brut * 0.03 : 0), 0))}</td>
                        <td style={{ ...td, fontWeight: 900, color: 'var(--text)', borderRight: 'none', background: 'var(--accent-lighter)', fontSize: 14 }}>{fmt(sum(satirlar, 'sgk_isveren'))}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BİLANÇO GÖRÜNÜMÜ */}
        {secilenOkulId && sekme === 'bilanco' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 48px' }}>
             {yukleniyor ? (
                <div style={loadingOverlay}><RefreshCw size={24} className="animate-spin" color="#3b82f6" /></div>
             ) : !bilVeri ? (
                <div style={emptyView}>
                   <BarChart2 size={48} color="var(--border)" />
                   <p style={{ marginTop: 16, color: 'var(--text3)', fontWeight: 600 }}>Bu dönem için ayar veya bilanço verisi bulunamadı.</p>
                </div>
             ) : (
                <BilancoIcerik veri={bilVeri} ay={Number(selAy)} yil={Number(selYil)} okulAd={selectedOkul?.ad || ''} />
             )}
          </div>
        )}

        {/* DERS PROGRAMI GÖRÜNÜMÜ */}
        {secilenOkulId && sekme === 'ders-programi' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
            {yukleniyor ? (
              <div style={loadingOverlay}><RefreshCw size={24} className="animate-spin" color="var(--accent)" /></div>
            ) : siniflar.length === 0 ? (
              <div style={emptyView}>
                <Calendar size={48} color="var(--border)" />
                <p style={{ marginTop: 16, color: 'var(--text3)', fontWeight: 600 }}>Bu dönem için ders programı bulunamadı.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {siniflar.map(sinif => {
                  const gunSayisiAy = gunSayisi(selYil, selAy)
                  const gunler = Array.from({ length: gunSayisiAy }, (_, i) => i + 1)
                  return (
                    <div key={sinif.id} style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                      <div style={{ padding: '10px 18px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Calendar size={14} color="var(--accent)" />
                        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{sinif.ad}</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{sinif.yas_grubu}</span>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ borderCollapse: 'collapse', fontSize: 10, minWidth: '100%' }}>
                          <thead>
                            <tr style={{ background: 'var(--accent)' }}>
                              <th style={dpTh(80)}>Ders</th>
                              {gunler.map(g => {
                                const hg = new Date(selYil, selAy - 1, g, 12).getDay()
                                const isHS = hg === 0 || hg === 6
                                const isTatil = tatilMi(selAy, g, selYil, tatiller)
                                const ad = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][hg]
                                return (
                                  <th key={g} style={{ ...dpTh(52), background: (isHS || isTatil) ? '#888' : 'var(--accent)' }}>
                                    {ad}<br /><span style={{ fontSize: 11, fontWeight: 800 }}>{g}</span>
                                  </th>
                                )
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {[1,2,3,4,5,6].map((dersNo, idx) => (
                              <tr key={dersNo} style={{ background: idx % 2 === 0 ? 'var(--surface)' : 'var(--bg)' }}>
                                <td style={{ ...dpTd, fontWeight: 700, textAlign: 'center' }}>{dersNo}. Ders</td>
                                {gunler.map(g => {
                                  const hg = new Date(selYil, selAy - 1, g, 12).getDay()
                                  const isHS = hg === 0 || hg === 6
                                  const isTatil = tatilMi(selAy, g, selYil, tatiller)
                                  const kayit = dersProgrami.find(p =>
                                    p.kulup_adi === sinif.ad && (p.ders_no || 1) === dersNo && p.gun === g
                                  )
                                  const ogr = kayit?.ogretmen
                                  return (
                                    <td key={g} style={{ ...dpTd, background: (isHS || isTatil) ? 'var(--border-light)' : kayit ? 'var(--accent-lighter)' : undefined, textAlign: 'center' }}>
                                      {isHS || isTatil
                                        ? <span style={{ fontSize: 8, color: 'var(--text3)', fontWeight: 700 }}>{isTatil ? 'TATİL' : 'H.S.'}</span>
                                        : ogr ? <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 9 }}>{ogr.ad}</span>
                                        : null}
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* SINIF DEFTERİ GÖRÜNÜMÜ */}
        {secilenOkulId && sekme === 'sinif-defteri' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
            {yukleniyor ? (
              <div style={loadingOverlay}><RefreshCw size={24} className="animate-spin" color="var(--accent)" /></div>
            ) : siniflar.length === 0 ? (
              <div style={emptyView}>
                <ClipboardList size={48} color="var(--border)" />
                <p style={{ marginTop: 16, color: 'var(--text3)', fontWeight: 600 }}>Bu dönem için sınıf defteri bulunamadı.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                {siniflar.map(sinif => {
                  const gunSayisiAy = gunSayisi(selYil, selAy)
                  const gunler = Array.from({ length: gunSayisiAy }, (_, i) => i + 1)

                  const gunBasliklari = gunler.map(g => {
                    const hg = new Date(selYil, selAy - 1, g, 12).getDay()
                    const isHS = hg === 0 || hg === 6
                    const isTatil = tatilMi(selAy, g, selYil, tatiller)
                    const ad = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][hg]
                    return { g, hg, isHS, isTatil, ad }
                  })

                  const renderDefterTablosu = (
                    baslik: string,
                    renk: string,
                    satirlar: { no: number; etiket: string }[],
                    koord: boolean
                  ) => (
                    <div style={{ marginBottom: koord ? 0 : 16 }}>
                      <div style={{ padding: '6px 14px', background: renk, color: '#fff', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {baslik}
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ borderCollapse: 'collapse', fontSize: 10, minWidth: '100%' }}>
                          <thead>
                            <tr style={{ background: renk }}>
                              <th style={dpTh(80)}>Saat</th>
                              {gunBasliklari.map(({ g, isHS, isTatil, ad }) => (
                                <th key={g} style={{ ...dpTh(56), background: (isHS || isTatil) ? '#888' : renk }}>
                                  {ad}<br /><span style={{ fontSize: 11, fontWeight: 800 }}>{g}</span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {satirlar.map(({ no, etiket }, idx) => (
                              <tr key={no} style={{ background: idx % 2 === 0 ? 'var(--surface)' : 'var(--bg)' }}>
                                <td style={{ ...dpTd, fontWeight: 700, textAlign: 'center', color: koord ? 'var(--info)' : 'var(--text)' }}>{etiket}</td>
                                {gunBasliklari.map(({ g, isHS, isTatil }) => {
                                  const kayit = sinifDefteri.find(p =>
                                    p.kulup_adi === sinif.ad && p.ders_no === no && p.gun === g
                                  )
                                  const ogr = kayit?.ogretmen
                                  const geldi = kayit?.durum === 'geldi'
                                  return (
                                    <td key={g} style={{ ...dpTd, background: (isHS || isTatil) ? 'var(--border-light)' : undefined, textAlign: 'center', verticalAlign: 'middle' }}>
                                      {isHS || isTatil
                                        ? <span style={{ fontSize: 8, color: 'var(--text3)', fontWeight: 700 }}>{isTatil ? 'TATİL' : 'H.S.'}</span>
                                        : ogr ? (
                                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                            <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 9, lineHeight: 1.2 }}>{ogr.ad}</span>
                                            <span style={{ fontSize: 8, fontWeight: 800, padding: '1px 4px', borderRadius: 4, background: geldi ? renk : '#c53030', color: '#fff' }}>
                                              {geldi ? '✓' : '✕'}
                                            </span>
                                          </div>
                                        ) : null}
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )

                  return (
                    <div key={sinif.id} style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                      <div style={{ padding: '10px 18px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <ClipboardList size={14} color="var(--accent)" />
                        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{sinif.ad}</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{sinif.yas_grubu} — Öğretmen Devam Takibi</span>
                      </div>
                      {renderDefterTablosu(
                        '🏫 Öğretmen Defteri',
                        'var(--accent)',
                        [1,2,3,4,5,6].map((no, i) => ({ no, etiket: `${i+1}. Ders` })),
                        false
                      )}
                      {renderDefterTablosu(
                        '👔 Koordinatör Defteri',
                        'var(--info)',
                        [11,12,13,14,15,16].map((no, i) => ({ no, etiket: `Koord ${i+1}` })),
                        true
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── PROFİL ── */}
        {sekme === 'profil' && (
          <div style={{ flex: 1, overflow: 'auto', padding: 32 }}>
            <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Başlık */}
              <div>
                <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Profilim</h2>
                <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>{il?.ad} İli Denetçisi</p>
              </div>

              {/* Ad Soyad Güncelle */}
              <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 28, border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UserCheck size={16} color="var(--accent)" /> Kişisel Bilgiler
                </h3>
                <form onSubmit={handleProfilGuncelle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase' }}>Ad</label>
                      <input
                        type="text" value={profilAd} onChange={e => setProfilAd(e.target.value)}
                        style={{ width: '100%', height: 42, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', padding: '0 12px', fontSize: 14, boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase' }}>Soyad</label>
                      <input
                        type="text" value={profilSoyad} onChange={e => setProfilSoyad(e.target.value)}
                        style={{ width: '100%', height: 42, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', padding: '0 12px', fontSize: 14, boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  {profilMesaj && (
                    <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: profilMesaj.tip === 'ok' ? 'var(--success-light)' : 'var(--danger-light)',
                      color: profilMesaj.tip === 'ok' ? 'var(--success)' : 'var(--danger)',
                      border: `1px solid ${profilMesaj.tip === 'ok' ? 'var(--success-border)' : 'var(--danger-border)'}`,
                    }}>{profilMesaj.text}</div>
                  )}
                  <button type="submit" disabled={profilKaydediliyor} style={{
                    height: 42, borderRadius: 10, border: 'none', background: 'var(--accent)',
                    color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                    opacity: profilKaydediliyor ? 0.7 : 1,
                  }}>
                    {profilKaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                </form>
              </div>

              {/* Şifre Değiştir */}
              <div style={{ background: 'var(--surface)', borderRadius: 20, padding: 28, border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Activity size={16} color="var(--accent)" /> Şifre Değiştir
                </h3>
                <form onSubmit={handleSifreDegistir} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase' }}>Mevcut Şifre</label>
                    <input
                      type="password" required value={eskiSifre} onChange={e => setEskiSifre(e.target.value)}
                      style={{ width: '100%', height: 42, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', padding: '0 12px', fontSize: 14, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase' }}>Yeni Şifre</label>
                      <input
                        type="password" required value={yeniSifre} onChange={e => setYeniSifre(e.target.value)}
                        style={{ width: '100%', height: 42, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', padding: '0 12px', fontSize: 14, boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase' }}>Şifre Tekrar</label>
                      <input
                        type="password" required value={yeniSifreTekrar} onChange={e => setYeniSifreTekrar(e.target.value)}
                        style={{ width: '100%', height: 42, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', padding: '0 12px', fontSize: 14, boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  {sifreMesaj && (
                    <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: sifreMesaj.tip === 'ok' ? 'var(--success-light)' : 'var(--danger-light)',
                      color: sifreMesaj.tip === 'ok' ? 'var(--success)' : 'var(--danger)',
                      border: `1px solid ${sifreMesaj.tip === 'ok' ? 'var(--success-border)' : 'var(--danger-border)'}`,
                    }}>{sifreMesaj.text}</div>
                  )}
                  <button type="submit" disabled={sifreKaydediliyor} style={{
                    height: 42, borderRadius: 10, border: 'none', background: 'var(--accent)',
                    color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                    opacity: sifreKaydediliyor ? 0.7 : 1,
                  }}>
                    {sifreKaydediliyor ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
                  </button>
                </form>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  )
}

// --- YARDIMCI BİLEŞENLER VE STİLLER ---
const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 10px 10px 32px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  appearance: 'none',
  outline: 'none',
}

const statCard: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '10px 16px',
  minWidth: 120,
  textAlign: 'right'
}
const statLabel: React.CSSProperties = { fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }
const statVal: React.CSSProperties = { fontSize: 20, fontWeight: 900, color: 'var(--text)', marginTop: 2 }

const loadingOverlay: React.CSSProperties = { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(245,242,236,0.5)', backdropFilter: 'blur(2px)' }
const emptyView: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }

const thSub: React.CSSProperties = {
  padding: '10px 1px', fontSize: 9, letterSpacing: 0, textTransform: 'uppercase',
  whiteSpace: 'pre-line', lineHeight: 1.2, borderRight: '1px solid var(--border-light)',
  background: 'var(--surface2)', color: 'var(--text2)', fontWeight: 700
}

// ── Bilanço İçerik Bileşeni ───────────────────────────────────
function BilancoIcerik({ veri, ay, yil, okulAd }: { veri: BilancoVerisi; ay: number; yil: number; okulAd: string }) {
  const { ayarlar, toplamGelir, ogrenciSayisi, subeSayisi, toplamDersSaati, tatiller } = veri

  const isGunu    = isGunuSayisi(yil, ay, tatiller)
  const sonGun    = gunSayisi(yil, ay)
  const bKatsayi  = ayarlar.katsayi || 0
  const bGosterge = ayarlar.gosterge || 140
  const bGunlukSt = ayarlar.gunluk_saat || 6
  const bToplamSt = toplamDersSaati > 0 ? toplamDersSaati : (isGunu * bGunlukSt)

  const bEnAz          = Math.round(((bKatsayi * bGosterge) / 6) * 100) / 100
  const bEnCok         = Math.round(((bKatsayi * bGosterge) / 3) * 100) / 100
  const bEnYuksekMemur = Math.round((9500 * bKatsayi) * 100) / 100

  const effectiveAyarlar: Ayarlar = {
    ...ayarlar,
    tavan_katsayi:       ayarlar.tavan_katsayi       || bEnYuksekMemur,
    dagitim_temel_gider: ayarlar.dagitim_temel_gider ?? 26,
    dagitim_ogretmen:    ayarlar.dagitim_ogretmen    ?? 55,
    dagitim_baskan:      ayarlar.dagitim_baskan      ?? 7,
    dagitim_baskan_yrd:  ayarlar.dagitim_baskan_yrd  ?? 5,
    dagitim_muhasebe:    ayarlar.dagitim_muhasebe    ?? 2,
    dagitim_temizlik:    ayarlar.dagitim_temizlik    ?? 4,
    dagitim_denetim:     ayarlar.dagitim_denetim     ?? 1,
  }
  const activeCategories = detectActiveCategories(veri.personel || [], veri.puantaj || [], veri.bordro || [])
  const dagitim      = toplamGelir > 0 ? tahakkukDagitimHesapla(toplamGelir, effectiveAyarlar, activeCategories) : null
  const tavanKatsayi = effectiveAyarlar.tavan_katsayi!

  const tahakkukSatirlari = [
    { label: 'Temel Giderler (Materyal, Beslenme, SGK Primi, Diğer Giderler)', yuzde: dagitim?.pct_temel_gider ?? effectiveAyarlar.dagitim_temel_gider!, tutar: dagitim?.temel_gider || 0 },
    { label: 'Kulüp Yönetim Kurulu Başkanı (Müdür)',                           yuzde: dagitim?.pct_baskan ?? effectiveAyarlar.dagitim_baskan!,      tutar: dagitim?.baskan || 0 },
    { label: 'Kulüp Yönetim Kurulu Üyesi (Müdür Yardımcısı)',                 yuzde: dagitim?.pct_baskan_yrd ?? effectiveAyarlar.dagitim_baskan_yrd!,  tutar: dagitim?.baskan_yrd || 0 },
    { label: 'Koordinatör Öğretmen, Öğretmen, Usta Öğretici',                  yuzde: dagitim?.pct_ogretmen ?? effectiveAyarlar.dagitim_ogretmen!,    tutar: dagitim?.ogretmen_havuzu || 0 },
    { label: 'Yazışma-Muhasebe İşlerini Yürüten Personel',                     yuzde: dagitim?.pct_muhasebe ?? effectiveAyarlar.dagitim_muhasebe!,    tutar: dagitim?.muhasebe || 0 },
    { label: 'Temizlik Bakım ve Beslenme İşlerini Yürüten Personel',           yuzde: dagitim?.pct_temizlik ?? effectiveAyarlar.dagitim_temizlik!,    tutar: dagitim?.temizlik || 0 },
    { label: 'Denetim Yetkilisi',                                               yuzde: dagitim?.pct_denetim ?? effectiveAyarlar.dagitim_denetim!,     tutar: dagitim?.denetim || 0 },
  ]

  const tavanHesaplari = TAVAN_KATEGORILER.map(kat => {
    const brut = tavanHesapla(kat.gorev, tavanKatsayi)
    const yuzde = gorevTavanYuzdesi(kat.gorev)
    
    let net = brut
    if (kat.gorev.toLowerCase().includes('denetim')) {
      net = brut
    } else {
      const sonuc = bordroHesapla(
        effectiveAyarlar,
        0, // hours
        0, // cumulative matrah
        !!kat.sgkLi,
        !!(kat as any).isRetired,
        kat.gorev,
        brut,
        true // vergiIstisnasi
      )
      net = sonuc.net
    }
    
    return { ...kat, yuzde, brut, net }
  })

  const thS: React.CSSProperties = { fontSize: 10, padding: '12px 16px', background: 'var(--surface2)', border: '1px solid var(--border)', fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase' }
  const tdS: React.CSSProperties = { fontSize: 13, padding: '12px 16px', border: '1px solid var(--border)', color: 'var(--text)', background: 'var(--surface)' }
  const tdR: React.CSSProperties = { ...tdS, textAlign: 'right' }
  const tdC: React.CSSProperties = { ...tdS, textAlign: 'center' }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Başlık */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)', letterSpacing: -0.5, fontFamily: '"Playfair Display", serif' }}>
          {ayarlar.kurum_adi || okulAd}
        </div>
        <div style={{ fontSize: 15, color: 'var(--text3)', marginTop: 8, fontWeight: 500 }}>
          01 {AY_ADI[ay]} {yil} – {sonGun} {AY_ADI[ay]} {yil} Tarihleri Arası Çocuk Kulübü Bilançosu
        </div>
      </div>

      {/* Parametreler tablosu */}
      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)', boxShadow: '0 5px 15px rgba(0,0,0,0.05)', background: 'var(--surface)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
          <tbody>
            <tr>
              <th style={{...thS, fontSize: 9}}>AYLIKLAR İÇİN BELİRLENEN KATSAYI</th>
              <th style={{...thS, fontSize: 9}}>GÜNDÜZ ÖĞRETİMİ GÖSTERGESİ</th>
              <th style={{...thS, fontSize: 9}}>EN AZ SAAT ÜCRETİ</th>
              <th style={{...thS, fontSize: 9}}>EN ÇOK SAAT ÜCRETİ</th>
              <th style={{...thS, fontSize: 9}}>SAAT ÜCRETİ</th>
              <th style={{...thS, fontSize: 9}}>EN YÜKSEK MEMUR BRÜTÜ</th>
            </tr>
            <tr>
              <td style={tdC}>{bKatsayi.toFixed(6)}</td>
              <td style={tdC}>{bGosterge}</td>
              <td style={tdC}>{fmt(bEnAz)}</td>
              <td style={tdC}>{fmt(bEnCok)}</td>
              <td style={tdC}>{fmt(ayarlar.saat_ucreti)}</td>
              <td style={{ ...tdC, color: 'var(--accent)', fontWeight: 800 }}>{fmtTL(bEnYuksekMemur)}</td>
            </tr>
            <tr>
              <th style={{...thS, fontSize: 9}}>ÖĞRENCİ SAYISI</th>
              <th style={{...thS, fontSize: 9}}>ŞUBE SAYISI</th>
              <th style={{...thS, fontSize: 9}}>İŞ GÜNÜ SAYISI</th>
              <th style={{...thS, fontSize: 9}}>GÜNLÜK DERS SAATİ</th>
              <th style={{...thS, fontSize: 9}}>TOPLAM DERS SAATİ</th>
              <th style={{...thS, fontSize: 9}}>TOPLAM TAHAKKUK</th>
            </tr>
            <tr>
              <td style={tdC}>{ogrenciSayisi}</td>
              <td style={tdC}>{subeSayisi}</td>
              <td style={tdC}>{isGunu}</td>
              <td style={tdC}>{bGunlukSt}</td>
              <td style={tdC}>{bToplamSt}</td>
              <td style={{ ...tdC, color: 'var(--accent2)', fontWeight: 800 }}>{fmtTL(toplamGelir)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tahakkuk dağılım tablosu */}
      <div style={{ marginBottom: 40, borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <div style={{ fontSize: 13, fontWeight: 800, background: 'var(--accent)', color: '#fff', padding: '14px 20px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Aylık Tahakkuk Dağılımı
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...thS, textAlign: 'left', background: 'var(--surface2)' }}>KATEGORİ</th>
              <th style={{ ...thS, textAlign: 'center', width: 100, background: 'var(--surface2)' }}>ORAN</th>
              <th style={{ ...thS, textAlign: 'right', width: 200, background: 'var(--surface2)' }}>TUTAR (TL)</th>
            </tr>
          </thead>
          <tbody>
            {tahakkukSatirlari.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg)' }}>
                <td style={{ ...tdS, textAlign: 'left' }}>{row.label}</td>
                <td style={{ ...tdC, color: 'var(--accent)', fontWeight: 700 }}>%{row.yuzde}</td>
                <td style={{ ...tdR, fontWeight: 700, color: 'var(--text)' }}>{fmtTL(row.tutar)}</td>
              </tr>
            ))}
            <tr style={{ background: 'var(--surface2)', borderTop: '2px solid var(--accent)' }}>
              <td style={{ ...tdS, fontWeight: 800, color: 'var(--text)' }}>TOPLAM TAHAKKUK</td>
              <td style={tdC}></td>
              <td style={{ ...tdR, fontWeight: 800, fontSize: 16, color: 'var(--accent2)' }}>{fmtTL(toplamGelir)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tavan tabloları */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 48 }}>
        <div style={{ borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, background: 'var(--surface2)', color: 'var(--text3)', padding: '12px 16px', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Harcama Tavanı (Net)</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><th style={{...thS, padding: '10px 16px'}}>GÖREV</th><th style={{...thS, padding: '10px 16px'}}>ORAN</th><th style={{...thS, textAlign:'right', padding: '10px 16px'}}>NET (TL)</th></tr>
            </thead>
            <tbody>
              {tavanHesaplari.map((kat, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg)' }}>
                  <td style={{ ...tdS, fontSize: 12, padding: '10px 16px' }}>{kat.label}</td>
                  <td style={{ ...tdC, color: 'var(--accent)', fontSize: 12, padding: '10px 16px' }}>%{kat.yuzde}</td>
                  <td style={{ ...tdR, fontWeight: 700, fontSize: 12, padding: '10px 16px' }}>{fmtTL(kat.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, background: 'var(--surface2)', color: 'var(--text3)', padding: '12px 16px', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Harcama Tavanı (Brüt)</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><th style={{...thS, padding: '10px 16px', background: 'var(--surface2)'}}>GÖREV</th><th style={{...thS, padding: '10px 16px', background: 'var(--surface2)'}}>ORAN</th><th style={{...thS, textAlign:'right', padding: '10px 16px', background: 'var(--surface2)'}}>BRÜT (TL)</th></tr>
            </thead>
            <tbody>
              {tavanHesaplari.map((kat, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg)' }}>
                  <td style={{ ...tdS, fontSize: 12, padding: '10px 16px' }}>{kat.label}</td>
                  <td style={{ ...tdC, color: 'var(--accent2)', fontSize: 12, padding: '10px 16px' }}>%{kat.yuzde}</td>
                  <td style={{ ...tdR, fontWeight: 700, fontSize: 12, color: 'var(--accent2)', padding: '10px 16px' }}>{fmtTL(kat.brut)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* İmza Bloğu */}
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '48px 0', borderTop: '2px solid var(--border-light)' }}>
        {[
          { b: 'ÜYE (DÜZENLEYEN)', a: ayarlar.duzenleyen_adi || '—', u: ayarlar.duzenleyen_unvani || 'Müdür Yardımcısı' },
          { b: 'BAŞKAN (ONAYLAYAN)',  a: ayarlar.mudur_adi || '—',      u: ayarlar.mudur_unvani || 'Okul Müdürü' },
        ].map(i => (
          <div key={i.b} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 16, letterSpacing: 1 }}>{i.b}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{i.a}</div>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4, fontWeight: 500 }}>{i.u}</div>
            <div style={{ marginTop: 40, width: 200, borderBottom: '1.5px solid var(--border)', margin: '0 auto' }}></div>
            <div style={{ fontSize: 11, marginTop: 8, color: 'var(--text3)', fontWeight: 600 }}>İmza / Mühür</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Sınıf & Stil Sabitleri ────────────────────────────────────
const actionBtn: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '7px 8px', cursor: 'pointer', color: 'var(--text2)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0, transition: 'all 0.15s',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
}
const thGrup: React.CSSProperties = {
  padding: '12px 2px', textAlign: 'center', fontSize: 9,
  fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0,
  borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border-light)',
  background: 'var(--surface2)', lineHeight: 1.4,
}
const td: React.CSSProperties = {
  padding: '12px 4px', textAlign: 'right', fontSize: 12,
  color: 'var(--text2)', borderRight: '1px solid var(--border-light)',
  whiteSpace: 'nowrap', lineHeight: 1.4
}

function dpTh(w: number): React.CSSProperties {
  return {
    padding: '6px 2px', color: '#fff', fontWeight: 700, fontSize: 9,
    border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center',
    width: w, minWidth: w, boxSizing: 'border-box', verticalAlign: 'middle', lineHeight: 1.2,
  }
}
const dpTd: React.CSSProperties = {
  padding: '4px 2px', border: '1px solid var(--border-light)',
  fontSize: 9, verticalAlign: 'middle', minWidth: 52, height: 40,
}

