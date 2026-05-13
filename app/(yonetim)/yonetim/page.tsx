'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  UserPlus, Trash2, Mail, Lock, Building, AlertTriangle, CheckCircle, XCircle,
  GraduationCap, Users, Search, ClipboardList, RefreshCw, ShieldCheck,
  LayoutDashboard, School, Activity, CreditCard, Wallet, TrendingUp, Megaphone,
  MapPin, Eye, ChevronRight, Compass, Zap, Star, Settings, Key, Info, User, LogOut, CalendarDays
} from 'lucide-react'
import React, { memo } from 'react'

const StatKart = memo(({ label, val, Icon, color, trend, yukleniyor, countUpFn, theme }: any) => {
  const animated = countUpFn(yukleniyor ? 0 : val);
  return (
    <div style={{ ...theme.card, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={20} color={color} /></div>
        {trend === 'up' && <span style={{ fontSize: 11, fontWeight: 800, color: theme.success, background: `${theme.success}15`, padding: '2px 8px', borderRadius: 20 }}>↑ 12%</span>}
      </div>
      <div style={{ fontSize: 11, fontWeight: 800, color: theme.secondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: theme.text, marginTop: 4 }}>{yukleniyor ? '...' : animated}</div>
    </div>
  )
})
StatKart.displayName = 'StatKart'

interface KullaniciSatir {
  id: string; rol: string; okul_id: number; created_at: string
  okullar: {
    id: number; ad: string; lisans_bitis?: string; odeme_durumu?: string;
    ogrenci_sayisi?: number; personel_sayisi?: number;
    bordro_sayisi?: number; tahsilat_sayisi?: number;
  } | null
  email?: string; last_login?: string; banned?: boolean
}
interface LogSatir {
  id: number; okul_id: number; islem: string; tablo: string
  kayit_id?: number; aciklama: string; created_at: string
  ip_adresi?: string; user_agent?: string; basarili?: boolean
  okullar?: { ad: string }
}

const ISLEM_RENK: Record<string, { bg: string; color: string }> = {
  ekle: { bg: '#dcfce7', color: '#16a34a' },
  guncelle: { bg: '#dbeafe', color: '#1d4ed8' },
  sil: { bg: '#fee2e2', color: '#dc2626' },
  import: { bg: '#f3e8ff', color: '#7c3aed' },
  hesapla: { bg: '#fef9c3', color: '#92400e' },
  ode: { bg: '#d1fae5', color: '#065f46' },
  login: { bg: '#fef3c7', color: '#d97706' },
}
const TABLO_ETIKET: Record<string, string> = {
  ogrenciler: 'Öğrenci', personel: 'Personel', tahsilat: 'Ödeme',
  bordro: 'Bordro', giderler: 'Gider', ayarlar: 'Ayarlar',
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

// ── Klasik Stillendirmeler ────────────────────────────────
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }
const inputStyle: React.CSSProperties = { width: '100%', height: 42, padding: '0 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, color: '#0f172a', fontSize: 13, outline: 'none' }
const btnStyle: React.CSSProperties = { borderRadius: 10, cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }
const actionBtnStyle: React.CSSProperties = { background: '#f8fafc', border: '1px solid #e2e8f0', padding: 8, borderRadius: 8, cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const modalOverlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }
const modalContentStyle: React.CSSProperties = { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 24, padding: 32, width: '100%', maxWidth: 440, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)' }

export default function YonetimDashboard() {
  const { session, signOut } = useAuth()
  const isMobile = useIsMobile()
  const [sekme, setSekme] = useState<'ozet' | 'kullanicilar' | 'loglar' | 'odemeler' | 'duyurular' | 'iller' | 'ayarlar' | 'tatiller'>('ozet')

  // ── State Tanımlamaları ────────────────────────────────
  const [denetciTalepleri, setDenetciTalepleri] = useState<any[]>([])
  const [talepYukleniyor, setTalepYukleniyor] = useState(false)
  const [onaylaniyorId, setOnaylaniyorId] = useState<number | null>(null)
  const [liste, setListe] = useState<KullaniciSatir[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [olusturuluyor, setOlusturuluyor] = useState(false)
  const [search, setSearch] = useState('')
  const [hata, setHata] = useState<string | null>(null)
  const [basari, setBasari] = useState<string | null>(null)
  const [silConfirm, setSilConfirm] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<KullaniciSatir | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [pwUpdating, setPwUpdating] = useState(false)
  const [selectedOkul, setSelectedOkul] = useState<KullaniciSatir | null>(null)
  const [lisansTarihi, setLisansTarihi] = useState('')
  const [odemeDurumu, setOdemeDurumu] = useState('')
  const [okulUpdating, setOkulUpdating] = useState(false)
  const [loglar, setLoglar] = useState<LogSatir[]>([])
  const [okullar, setOkullar] = useState<{ id: number; ad: string }[]>([])
  const [logYukleniyor, setLogYukleniyor] = useState(false)
  const [loglarYuklendi, setLoglarYuklendi] = useState(false)
  const [logSearch, setLogSearch] = useState('')
  const [islemFiltre, setIslemFiltre] = useState('')
  const [tabloFiltre, setTabloFiltre] = useState('')
  const [okulFiltre, setOkulFiltre] = useState('')
  const [odemeler, setOdemeler] = useState<any[]>([])
  const [odemeYukleniyor, setOdemeYukleniyor] = useState(false)
  const [odemelerYuklendi, setOdemelerYuklendi] = useState(false)
  const [showOdemeModal, setShowOdemeModal] = useState(false)
  const [selectedOkulId, setSelectedOkulId] = useState<number | null>(null)
  const [odemeTutar, setOdemeTutar] = useState('')
  const [odemeAciklama, setOdemeAciklama] = useState('')
  const [odemeYontemi, setOdemeYontemi] = useState('Havale')
  const [odemeKaydediliyor, setOdemeKaydediliyor] = useState(false)
  const [duyurular, setDuyurular] = useState<any[]>([])
  const [duyuruYukleniyor, setDuyuruYukleniyor] = useState(false)
  const [duyurularYuklendi, setDuyurularYuklendi] = useState(false)
  const [showDuyuruModal, setShowDuyuruModal] = useState(false)
  const [duyuruBaslik, setDuyuruBaslik] = useState('')
  const [duyuruIcerik, setDuyuruIcerik] = useState('')
  const [duyuruTur, setDuyuruTur] = useState('info')
  const [duyuruKaydediliyor, setDuyuruKaydediliyor] = useState(false)
  const [bakimAktif, setBakimAktif] = useState(false)
  const [bakimMesaji, setBakimMesaji] = useState('')
  const [bakimGuncelleniyor, setBakimGuncelleniyor] = useState(false)
  const [iller, setIller] = useState<{ id: number; ad: string; okullar: { id: number; ad: string }[] }[]>([])
  const [illerYukleniyor, setIllerYukleniyor] = useState(false)
  const [illerYuklendi, setIllerYuklendi] = useState(false)
  const [yeniIlAdi, setYeniIlAdi] = useState('')
  const [ilEkleniyor, setIlEkleniyor] = useState(false)
  const [okulIlMap, setOkulIlMap] = useState<Record<number, number | null>>({})
  const [denetimListe, setDenetimListe] = useState<any[]>([])
  const [denetimYukleniyor, setDenetimYukleniyor] = useState(false)
  // Resmi tatil yönetimi (okul_id = null → tüm okullara uygulanır)
  const [resmiTatiller, setResmiTatiller] = useState<any[]>([])
  const [tatilForm, setTatilForm] = useState({ ad: '', bas: '', bit: '', tip: 'resmi' })
  const [tatilKaydediliyor, setTatilKaydediliyor] = useState(false)
  const [gorunenYil, setGorunenYil] = useState(new Date().getFullYear())
  const [denetimYuklendi, setDenetimYuklendi] = useState(false)
  const [formRol, setFormRol] = useState<'okul_admin' | 'denetim_yetkilisi'>('okul_admin')
  const [formIlId, setFormIlId] = useState<number | null>(null)
  const [kisiSekme, setKisiSekme] = useState<'okullar' | 'yetkililer' | 'talepler'>('okullar')
  const [illerSearch, setIllerSearch] = useState('')
  const [activeIlFilter, setActiveIlFilter] = useState<number | null>(null)
  const [ilFilterSearch, setIlFilterSearch] = useState('')

  // ── API Helpers ────────────────────────────────
  const apiHeaders = useCallback(() => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` }), [session])

  const listeyiGetir = useCallback(async () => {
    if (!session) return
    setYukleniyor(true)
    try {
      const res = await fetch('/api/admin/kullanici', { headers: apiHeaders() })
      if (res.ok) {
        const data = await res.json()
        setListe(data.kullanicilar || [])
      }
    } finally {
      setYukleniyor(false)
    }
  }, [session, apiHeaders])

  useEffect(() => { listeyiGetir() }, [listeyiGetir])

  const loglariGetir = useCallback(async () => {
    if (!session) return
    setLogYukleniyor(true)
    const params = new URLSearchParams({ limit: '300' })
    if (okulFiltre) params.set('okul_id', okulFiltre)
    const res = await fetch(`/api/admin/audit?${params}`, { headers: apiHeaders() })
    const json = await res.json()
    setLoglar(json.loglar || [])
    setLogYukleniyor(false)
  }, [session, okulFiltre, apiHeaders])

  const odemeleriGetir = useCallback(async () => {
    if (!session) return
    setOdemeYukleniyor(true)
    const res = await fetch('/api/admin/odemeler', { headers: apiHeaders() })
    const data = await res.json()
    setOdemeler(data.odemeler || [])
    setOdemeYukleniyor(false)
  }, [session, apiHeaders])

  const duyurulariGetir = useCallback(async () => {
    if (!session) return
    setDuyuruYukleniyor(true)
    const res = await fetch('/api/admin/duyurular', { headers: apiHeaders() })
    const data = await res.json()
    setDuyurular(data.duyurular || [])
    setDuyuruYukleniyor(false)
  }, [session, apiHeaders])

  const bakimGetir = useCallback(async () => {
    if (!session) return
    const res = await fetch('/api/admin/bakim', { headers: apiHeaders() })
    if (res.ok) {
      const data = await res.json()
      setBakimAktif(data.settings.aktif)
      setBakimMesaji(data.settings.mesaj)
    }
  }, [session, apiHeaders])

  const illeriGetir = useCallback(async () => {
    if (!session) return
    setIllerYukleniyor(true)
    const res = await fetch('/api/admin/iller', { headers: apiHeaders() })
    if (res.ok) {
      const data = await res.json()
      const illerData = data.iller || []
      setIller(illerData)
      const map: Record<number, number | null> = {}
      illerData.forEach((il: any) => { (il.okullar || []).forEach((o: any) => { map[o.id] = il.id }) })
      setOkulIlMap(map)
    }
    setIllerYukleniyor(false)
  }, [session, apiHeaders])

  const denetimListesiGetir = useCallback(async () => {
    if (!session) return
    setDenetimYukleniyor(true)
    const res = await fetch('/api/admin/denetim-kullanici', { headers: apiHeaders() })
    if (res.ok) {
      const data = await res.json()
      setDenetimListe(data.kullanicilar || [])
    }
    setDenetimYukleniyor(false)
  }, [session, apiHeaders])

  const denetciTalepleriGetir = useCallback(async () => {
    if (!session) return
    setTalepYukleniyor(true)
    const res = await fetch('/api/admin/denetim-talep', { headers: apiHeaders() })
    const data = await res.json()
    if (res.ok) setDenetciTalepleri(data.talepler || [])
    setTalepYukleniyor(false)
  }, [session, apiHeaders])

  useEffect(() => {
    if (sekme === 'ozet') {
      bakimGetir();
      if (!loglarYuklendi) loglariGetir().then(() => setLoglarYuklendi(true));
      if (!odemelerYuklendi) odemeleriGetir().then(() => setOdemelerYuklendi(true));
      if (!illerYuklendi) illeriGetir().then(() => setIllerYuklendi(true));
    } else if (sekme === 'loglar' && !loglarYuklendi) {
      loglariGetir().then(() => setLoglarYuklendi(true));
    } else if (sekme === 'duyurular' && !duyurularYuklendi) {
      duyurulariGetir().then(() => setDuyurularYuklendi(true));
    } else if (sekme === 'iller' && !illerYuklendi) {
      illeriGetir().then(() => setIllerYuklendi(true));
    } else if (sekme === 'tatiller') {
      resmiTatilleriGetir()
    }
  }, [sekme, bakimGetir, loglariGetir, odemeleriGetir, illeriGetir, duyurulariGetir, loglarYuklendi, odemelerYuklendi, illerYuklendi, duyurularYuklendi])

  async function resmiTatilleriGetir() {
    const { data } = await supabase.from('tatiller').select('*').is('okul_id', null).order('baslangic_tarihi')
    setResmiTatiller(data || [])
  }

  async function resmiTatilEkle() {
    if (!tatilForm.ad || !tatilForm.bas || !tatilForm.bit) {
      setHata('Lütfen tüm alanları doldurun'); return
    }
    const mevcut = resmiTatiller.some(t =>
      t.ad.trim().toLowerCase() === tatilForm.ad.trim().toLowerCase() &&
      t.baslangic_tarihi === tatilForm.bas && t.bitis_tarihi === tatilForm.bit
    )
    if (mevcut) { setHata('Bu tatil zaten kayıtlı'); return }
    setTatilKaydediliyor(true)
    const { error } = await supabase.from('tatiller').insert({
      ad: tatilForm.ad, baslangic_tarihi: tatilForm.bas,
      bitis_tarihi: tatilForm.bit, tip: tatilForm.tip, okul_id: null,
    })
    if (error) setHata('Hata: ' + error.message)
    else { setBasari('Tatil eklendi'); setTatilForm({ ad: '', bas: '', bit: '', tip: 'resmi' }); resmiTatilleriGetir() }
    setTatilKaydediliyor(false)
  }

  async function resmiTatilSil(id: number) {
    const { error } = await supabase.from('tatiller').delete().eq('id', id)
    if (!error) setResmiTatiller(t => t.filter(x => x.id !== id))
  }

  async function resmiTatilSihirbaz() {
    if (!confirm('2026 yılı resmi tatilleri tüm okullara eklenecek. Devam edilsin mi?')) return
    setTatilKaydediliyor(true)
    const tatiller = [
      { ad: 'Yılbaşı', bas: '2026-01-01', bit: '2026-01-01' },
      { ad: '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı', bas: '2026-04-23', bit: '2026-04-23' },
      { ad: '1 Mayıs Emek ve Dayanışma Günü', bas: '2026-05-01', bit: '2026-05-01' },
      { ad: '19 Mayıs Atatürk\'ü Anma, Gençlik ve Spor Bayramı', bas: '2026-05-19', bit: '2026-05-19' },
      { ad: '15 Temmuz Demokrasi ve Milli Birlik Günü', bas: '2026-07-15', bit: '2026-07-15' },
      { ad: '30 Ağustos Zafer Bayramı', bas: '2026-08-30', bit: '2026-08-30' },
      { ad: '29 Ekim Cumhuriyet Bayramı', bas: '2026-10-28', bit: '2026-10-29' },
    ].map(t => ({ ad: t.ad, baslangic_tarihi: t.bas, bitis_tarihi: t.bit, tip: 'resmi', okul_id: null }))
    const { error } = await supabase.from('tatiller').upsert(tatiller, { onConflict: 'ad,baslangic_tarihi' })
    if (error) setHata('Sihirbaz hatası: ' + error.message)
    else { setBasari('2026 resmi tatilleri tüm okullara eklendi!'); resmiTatilleriGetir() }
    setTatilKaydediliyor(false)
  }

  const AYLAR_TR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
  const GUNLER_TR = ['Pt','Sa','Ça','Pe','Cu','Ct','Pz']

  function tatilBul(yil: number, ay: number, gun: number) {
    const d = new Date(yil, ay, gun)
    return resmiTatiller.find(t => {
      const bas = new Date(t.baslangic_tarihi); bas.setHours(0,0,0,0)
      const bit = new Date(t.bitis_tarihi); bit.setHours(23,59,59,999)
      return d >= bas && d <= bit
    })
  }

  function ayHucreleri(yil: number, ay: number) {
    const ilkGun = new Date(yil, ay, 1).getDay()
    const bosluk = ilkGun === 0 ? 6 : ilkGun - 1
    const gunSayisi = new Date(yil, ay + 1, 0).getDate()
    return { bosluk, gunSayisi }
  }

  // ── Form İşlemleri ────────────────────────────────
  async function handleOlustur(e: React.SyntheticEvent) {
    e.preventDefault()
    setOlusturuluyor(true); setHata(null); setBasari(null)
    const res = await fetch('/api/admin/kullanici', {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ email, password, schoolName: formRol === 'okul_admin' ? schoolName : null, rol: formRol, il_id: formIlId })
    })
    const body = await res.json()
    if (!res.ok) { setHata(body.error) }
    else {
      setBasari('Hesap oluşturuldu.');
      setEmail(''); setPassword(''); setSchoolName(''); setFormIlId(null);
      listeyiGetir(); denetimListesiGetir();
    }
    setOlusturuluyor(false)
  }

  async function handleUpdatePassword(e: React.SyntheticEvent) {
    e.preventDefault(); if (!selectedUser || !newPassword) return; setPwUpdating(true)
    const res = await fetch('/api/admin/kullanici', { method: 'PATCH', headers: apiHeaders(), body: JSON.stringify({ userId: selectedUser.id, newPassword }) })
    if (res.ok) { setBasari('Şifre güncellendi.'); setSelectedUser(null); setNewPassword('') } else { const b = await res.json(); setHata(b.error) }
    setPwUpdating(false)
  }

  async function handleUpdateLicense(e: React.SyntheticEvent) {
    e.preventDefault(); if (!selectedOkul) return; setOkulUpdating(true)
    const res = await fetch('/api/admin/kullanici', { method: 'PUT', headers: apiHeaders(), body: JSON.stringify({ okulId: selectedOkul.okullar?.id, lisansBitis: lisansTarihi, odemeDurumu }) })
    if (res.ok) { setBasari('Lisans güncellendi.'); setSelectedOkul(null); listeyiGetir() } else { const b = await res.json(); setHata(b.error) }
    setOkulUpdating(false)
  }

  async function handleToggleBan(u: KullaniciSatir) {
    const yasaklanacak = !u.banned
    const res = await fetch('/api/admin/kullanici', { method: 'PUT', headers: apiHeaders(), body: JSON.stringify({ userId: u.id, banned: yasaklanacak }) })
    if (res.ok) listeyiGetir()
  }

  async function handleOdemeEkle(e: React.SyntheticEvent) {
    e.preventDefault(); if (!selectedOkulId || !odemeTutar) return; setOdemeKaydediliyor(true)
    const res = await fetch('/api/admin/odemeler', { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ okul_id: selectedOkulId, tutar: odemeTutar, odeme_yontemi: odemeYontemi, aciklama: odemeAciklama }) })
    if (res.ok) { setBasari('Ödeme eklendi.'); setShowOdemeModal(false); setOdemeTutar(''); odemeleriGetir(); listeyiGetir() } else { const b = await res.json(); setHata(b.error) }
    setOdemeKaydediliyor(false)
  }

  async function handleBakimToggle() {
    setBakimGuncelleniyor(true)
    const res = await fetch('/api/admin/bakim', { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ aktif: !bakimAktif, mesaj: bakimMesaji }) })
    if (res.ok) { setBakimAktif(!bakimAktif); setBasari(`Bakım modu ${!bakimAktif ? 'aktif' : 'kapalı'}.`) }
    setBakimGuncelleniyor(false)
  }

  async function handleDuyuruEkle(e: React.SyntheticEvent) {
    e.preventDefault(); if (!duyuruBaslik || !duyuruIcerik) return; setDuyuruKaydediliyor(true)
    const res = await fetch('/api/admin/duyurular', { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ baslik: duyuruBaslik, icerik: duyuruIcerik, tur: duyuruTur }) })
    if (res.ok) { setBasari('Duyuru yayınlandı.'); setShowDuyuruModal(false); setDuyuruBaslik(''); duyurulariGetir() } else { const b = await res.json(); setHata(b.error) }
    setDuyuruKaydediliyor(false)
  }

  async function handleSil(userId: string) {
    const res = await fetch('/api/admin/kullanici', { method: 'DELETE', headers: apiHeaders(), body: JSON.stringify({ userId }) })
    if (res.ok) { setSilConfirm(null); listeyiGetir() } else { const b = await res.json(); setHata(b.error) }
  }

  async function handleDuyuruToggle(id: number, aktif: boolean) {
    const res = await fetch('/api/admin/duyurular', { method: 'PUT', headers: apiHeaders(), body: JSON.stringify({ id, aktif }) })
    if (res.ok) duyurulariGetir()
  }

  async function handleDuyuruSil(id: number) {
    if (!confirm('Duyuruyu silmek istediğinize emin misiniz?')) return
    const res = await fetch('/api/admin/duyurular', { method: 'DELETE', headers: apiHeaders(), body: JSON.stringify({ id }) })
    if (res.ok) duyurulariGetir()
  }

  // ── Utils ────────────────────────────────
  const useCountUp = (target: number, duration = 900) => {
    const [count, setCount] = useState(0)
    useEffect(() => {
      if (target === 0) { setCount(0); return }
      let start = 0; const step = Math.ceil(target / (duration / 16))
      const timer = setInterval(() => { start += step; if (start >= target) { setCount(target); clearInterval(timer) } else setCount(start) }, 16)
      return () => clearInterval(timer)
    }, [target, duration])
    return count
  }

  const toplamOkul = liste.filter(k => k.rol !== 'super_admin').length
  const aktifOkul = liste.filter(k => k.rol !== 'super_admin' && !k.banned).length
  const borcluOkul = liste.filter(k => k.okullar?.odeme_durumu === 'borclu').length
  const suresiDolmus = liste.filter(k => k.okullar?.lisans_bitis ? new Date(k.okullar.lisans_bitis) < new Date() : false).length
  const toplamGelir = odemeler.reduce((acc, curr) => acc + Number(curr.tutar), 0)
  const gelirGrafik = (() => {
    const aylar = []; for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); const label = d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' })
      const tutar = odemeler.filter((o: any) => { const od = new Date(o.odeme_tarihi); return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth() }).reduce((s: number, o: any) => s + Number(o.tutar), 0)
      aylar.push({ label, tutar })
    } return aylar
  })()
  const maxGelir = Math.max(...gelirGrafik.map(a => a.tutar), 1)

  // ── Tema Sistemi ────────────────────────────────
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light')
  const T = {
    bg: themeMode === 'light' ? '#f8fafc' : '#020617',
    sidebar: themeMode === 'light' ? '#ffffff' : '#0a1628',
    card: themeMode === 'light' ? '#ffffff' : '#111827',
    border: themeMode === 'light' ? '#e2e8f0' : '#1e2d45',
    text: themeMode === 'light' ? '#020617' : '#f1f5f9',
    secondary: themeMode === 'light' ? '#475569' : '#94a3b8',
    primary: '#059669', success: '#10b981', warning: '#f59e0b', danger: '#e11d48',
    muted: themeMode === 'light' ? '#f1f5f9' : 'rgba(0,0,0,0.2)',
    accent: themeMode === 'light' ? '#ecfdf5' : 'rgba(5,150,105,0.1)',
    shadow: themeMode === 'light' ? '0 10px 15px -3px rgba(0,0,0,0.04), 0 4px 6px -2px rgba(0,0,0,0.02)' : 'none'
  }
  const S = {
    card: { background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, boxShadow: T.shadow, overflow: 'hidden' as const },
    th: { padding: '12px 18px', color: T.secondary, fontWeight: 800, fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 0.5, textAlign: 'left' as const, borderBottom: `1px solid ${T.border}`, background: T.muted },
    td: { padding: '13px 20px', fontSize: 13, color: T.text, borderBottom: `1px solid ${T.muted}`, verticalAlign: 'middle' as const },
    btn: (bg: string, color = '#fff') => ({ display: 'inline-flex' as const, alignItems: 'center' as const, gap: 7, padding: '8px 14px', borderRadius: 10, border: 'none', background: bg, color, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }),
    input: { width: '100%', height: 40, padding: '0 12px', background: T.muted, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const },
    label: { display: 'block' as const, fontSize: 10, fontWeight: 800, color: T.secondary, marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  }


  return (
    <div style={{ display: 'flex', height: '100vh', background: T.bg, color: T.text, overflow: 'hidden', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* SIDEBAR */}
      <aside style={{ width: 260, background: T.sidebar, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${T.muted}` }}>
          <div style={{ width: 36, height: 36, background: T.primary, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${T.primary}40` }}><Compass size={20} color="white" /></div>
          <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: -0.5 }}>KULÜP<span style={{ color: T.primary }}>360</span></span>
        </div>
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {([ { id: 'ozet', label: 'Genel Bakış', icon: LayoutDashboard }, { id: 'kullanicilar', label: 'Kurum Portföyü', icon: School }, { id: 'odemeler', label: 'Tahsilat Takibi', icon: CreditCard }, { id: 'duyurular', label: 'Duyuru Yönetimi', icon: Megaphone }, { id: 'iller', label: 'Bölge Yönetimi', icon: MapPin }, { id: 'loglar', label: 'Denetim İzleri', icon: ClipboardList }, { id: 'tatiller', label: 'Tatil Takvimi', icon: CalendarDays }, { id: 'ayarlar', label: 'Sistem Ayarları', icon: Settings } ] as any[]).map(item => {
            const active = sekme === item.id; return (
              <button key={item.id} onClick={() => setSekme(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: active ? T.accent : 'transparent', color: active ? T.primary : T.secondary, fontWeight: active ? 700 : 600, fontSize: 13 }}><item.icon size={18} />{item.label}</button>
            )
          })}
        </nav>
        <div style={{ padding: 16, borderTop: `1px solid ${T.border}` }}>
          <button onClick={() => supabase.auth.signOut()} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px', borderRadius: 10, border: 'none', background: '#fef2f2', color: T.danger, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}><LogOut size={16} /> Çıkış Yap</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ height: 64, background: T.sidebar, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: T.success, boxShadow: `0 0 0 4px ${T.success}20` }} /><span style={{ fontSize: 13, fontWeight: 700, color: T.secondary }}>Yönetim Paneli Aktif</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', color: T.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{themeMode === 'light' ? <Zap size={16} /> : <Compass size={16} />}</button>
            <div style={{ textAlign: 'right' }}><div style={{ fontSize: 13, fontWeight: 700 }}>Admin</div><div style={{ fontSize: 11, color: T.secondary }}>{session?.user?.email}</div></div>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={20} /></div>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          {hata && <div style={{ background: '#fef2f2', border: `1px solid ${T.danger}20`, color: T.danger, padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13, fontWeight: 600 }}>{hata}</div>}
          {basari && <div style={{ background: '#f0fdf4', border: `1px solid ${T.success}20`, color: '#166534', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13, fontWeight: 600 }}>{basari}</div>}

          {sekme === 'ozet' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                <StatKart label="Toplam Kurum" val={toplamOkul} Icon={School} color={T.primary} yukleniyor={yukleniyor} countUpFn={useCountUp} theme={{ card: S.card, text: T.text, secondary: T.secondary, success: T.success }} />
                <StatKart label="Aktif Kurum" val={aktifOkul} Icon={Activity} color={T.success} trend="up" yukleniyor={yukleniyor} countUpFn={useCountUp} theme={{ card: S.card, text: T.text, secondary: T.secondary, success: T.success }} />
                <StatKart label="Borçlu Kurumlar" val={borcluOkul} Icon={AlertTriangle} color={T.warning} yukleniyor={yukleniyor} countUpFn={useCountUp} theme={{ card: S.card, text: T.text, secondary: T.secondary, success: T.success }} />
                <StatKart label="Lisansı Dolmuş" val={suresiDolmus} Icon={XCircle} color={T.danger} yukleniyor={yukleniyor} countUpFn={useCountUp} theme={{ card: S.card, text: T.text, secondary: T.secondary, success: T.success }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={S.card}><div style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}><div><div style={{ fontSize: 11, color: T.secondary, fontWeight: 700, textTransform: 'uppercase' }}>Tahsilat Performansı</div><div style={{ fontSize: 24, fontWeight: 900, color: T.text, marginTop: 4 }}>{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(toplamGelir)}</div></div></div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 160 }}>{gelirGrafik.map((ay, i) => { const h = maxGelir > 0 ? (ay.tutar / maxGelir) * 100 : 5; const isLast = i === gelirGrafik.length - 1; return ( <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}><div style={{ width: '100%', height: `${h}%`, background: isLast ? T.primary : T.accent, borderRadius: '6px 6px 2px 2px', minHeight: 4 }} title={`${ay.label}: ${ay.tutar} TL`} /><div style={{ fontSize: 10, fontWeight: 700, color: T.secondary }}>{ay.label}</div></div> ) })}</div>
                  </div></div>
                  <div style={S.card}>
                    <div style={{ padding: '18px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontWeight: 800, fontSize: 14 }}>Kayıtlı Kurumlar</span><button onClick={listeyiGetir} style={S.btn(T.muted, T.secondary)}><RefreshCw size={14} /></button></div>
                    <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr>{['Kurum', 'İl', 'Kapasite', 'Durum'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                      <tbody>{liste.filter(k => !!k.okullar).slice(0, 10).map(k => ( <tr key={k.id}><td style={S.td}><div style={{ fontWeight: 700 }}>{k.okullar?.ad}</div><div style={{ fontSize: 11, color: T.secondary }}>{k.email}</div></td><td style={S.td}><span style={{ fontSize: 11, fontWeight: 700, color: T.primary }}>{iller.find(i => i.id === okulIlMap[k.okullar?.id || 0])?.ad || '—'}</span></td><td style={S.td}>{k.okullar?.ogrenci_sayisi || 0} Öğr</td><td style={S.td}><div style={{ width: 8, height: 8, borderRadius: '50%', background: k.banned ? T.danger : T.success }} /></td></tr> ))}</tbody>
                    </table></div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={{ ...S.card, padding: 20 }}><div style={{ fontWeight: 800, fontSize: 13, marginBottom: 16 }}>Hızlı Aksiyonlar</div><div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><button onClick={() => setSekme('kullanicilar')} style={{ ...S.btn(T.primary), width: '100%', justifyContent: 'center' }}>Yeni Okul Ekle</button><button onClick={() => { setSekme('odemeler'); setShowOdemeModal(true) }} style={{ ...S.btn(T.success), width: '100%', justifyContent: 'center' }}>Tahsilat Girişi</button></div></div>
                  <div style={{ ...S.card, padding: 20 }}><div style={{ fontWeight: 800, fontSize: 13, marginBottom: 16 }}>Son İşlemler</div><div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{loglar.slice(0, 5).map(l => ( <div key={l.id} style={{ display: 'flex', gap: 12 }}><div style={{ width: 32, height: 32, borderRadius: 8, background: T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ClipboardList size={14} color={T.secondary} /></div><div style={{ minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 700 }}>{l.islem}</div><div style={{ fontSize: 10, color: T.secondary }}>{l.aciklama}</div></div></div> ))}</div></div>
                </div>
              </div>
            </div>
          )}

          {sekme === 'kullanicilar' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={S.card}><div style={{ padding: 24 }}><h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 900 }}>Kurum & Yetkili Tanımlama</h3><form onSubmit={handleOlustur}><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, alignItems: 'flex-end' }}><div><label style={S.label}>Rol</label><select style={S.input} value={formRol} onChange={e => setFormRol(e.target.value as any)}><option value="okul_admin">Okul Admin</option><option value="denetim_yetkilisi">Bölge Yetkilisi</option></select></div>{formRol === 'okul_admin' && <div><label style={S.label}>Kurum Adı</label><input style={S.input} value={schoolName} onChange={e => setSchoolName(e.target.value)} /></div>}<div><label style={S.label}>E-posta</label><input style={S.input} value={email} onChange={e => setEmail(e.target.value)} /></div><div><label style={S.label}>Şifre</label><input type="password" style={S.input} value={password} onChange={e => setPassword(e.target.value)} /></div><button style={{ ...S.btn(T.primary), height: 40, justifyContent: 'center' }}>Oluştur</button></div></form></div></div>
              <div style={S.card}>
                <div style={{ padding: '18px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between' }}><div style={{ display: 'flex', background: T.muted, borderRadius: 8, padding: 2 }}>{['okullar', 'yetkililer'].map(id => ( <button key={id} onClick={() => setKisiSekme(id as any)} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: kisiSekme === id ? T.card : 'transparent', color: kisiSekme === id ? T.primary : T.secondary, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>{id === 'okullar' ? 'Kurumlar' : 'Yetkililer'}</button> ))}</div></div>
                <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>{['Ad / E-posta', 'Bölge', 'Durum', 'İşlem'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>{(kisiSekme === 'okullar' ? liste.filter(k => k.rol !== 'denetim_yetkilisi') : denetimListe).map(k => ( <tr key={k.id}><td style={S.td}><div style={{ fontWeight: 700 }}>{k.okullar?.ad || k.email}</div><div style={{ fontSize: 11, color: T.secondary }}>{k.email}</div></td><td style={S.td}>{iller.find(i => i.id === okulIlMap[k.okullar?.id || 0])?.ad || '—'}</td><td style={S.td}><span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 5, background: k.banned ? `${T.danger}15` : `${T.success}15`, color: k.banned ? T.danger : T.success }}>{k.banned ? 'PASİF' : 'AKTİF'}</span></td><td style={S.td}><div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><button onClick={() => setSelectedUser(k)} style={{ ...S.btn(T.muted, T.secondary), padding: 8 }}><Lock size={14} /></button><button onClick={() => handleToggleBan(k)} style={{ ...S.btn(T.muted, k.banned ? T.success : T.warning), padding: 8 }}>{k.banned ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}</button></div></td></tr> ))}</tbody>
                </table></div>
              </div>
            </div>
          )}

          {sekme === 'odemeler' && (
            <div style={S.card}>
              <div style={{ padding: 24, borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>Tahsilat Kayıtları</h3><button onClick={() => setShowOdemeModal(true)} style={S.btn(T.success)}>Yeni Ödeme Gir</button></div>
              <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Tarih', 'Kurum', 'Tutar', 'Yöntem'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>{odemeler.map(o => ( <tr key={o.id}><td style={S.td}>{new Date(o.odeme_tarihi).toLocaleDateString('tr-TR')}</td><td style={S.td}>{o.okullar?.ad}</td><td style={S.td}><span style={{ fontWeight: 800, color: T.success }}>{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(o.tutar)}</span></td><td style={S.td}>{o.odeme_yontemi}</td></tr> ))}</tbody>
              </table></div>
            </div>
          )}

          {sekme === 'iller' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={S.card}><div style={{ padding: 24 }}><h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 900 }}>Bölge Yönetimi</h3><div style={{ display: 'flex', gap: 12 }}><input style={{ ...S.input, flex: 1 }} placeholder="Yeni bölge adı..." value={yeniIlAdi} onChange={e => setYeniIlAdi(e.target.value)} /><button onClick={async () => { const res = await fetch('/api/admin/iller', { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ ad: yeniIlAdi }) }); if (res.ok) { setYeniIlAdi(''); illeriGetir() } }} style={S.btn(T.primary)}>Ekle</button></div></div></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>{iller.map(il => ( <div key={il.id} style={{ ...S.card, padding: 20 }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}><div style={{ fontWeight: 800 }}>{il.ad}</div><div style={{ fontSize: 10, fontWeight: 800, color: T.primary, background: T.accent, padding: '2px 8px', borderRadius: 20 }}>{il.okullar?.length || 0} Kurum</div></div></div> ))}</div>
            </div>
          )}

          {sekme === 'duyurular' && (
            <div style={S.card}>
              <div style={{ padding: 24, borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>Duyuru Yönetimi</h3>
                <button onClick={() => setShowDuyuruModal(true)} style={S.btn(T.primary)}>Yeni Duyuru Yayınla</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>{['Tarih', 'Tür', 'Başlık', 'Durum', 'İşlem'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {duyurular.map(d => (
                      <tr key={d.id}>
                        <td style={S.td}>{new Date(d.created_at).toLocaleDateString('tr-TR')}</td>
                        <td style={S.td}><span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 5, background: d.tur === 'danger' ? `${T.danger}15` : `${T.primary}15`, color: d.tur === 'danger' ? T.danger : T.primary }}>{d.tur.toUpperCase()}</span></td>
                        <td style={S.td}><div style={{ fontWeight: 700 }}>{d.baslik}</div><div style={{ fontSize: 11, color: T.secondary }}>{d.icerik.slice(0, 50)}...</div></td>
                        <td style={S.td}><button onClick={() => handleDuyuruToggle(d.id, !d.aktif)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: d.aktif ? T.success : T.secondary }}>{d.aktif ? <CheckCircle size={18} /> : <XCircle size={18} />}</button></td>
                        <td style={S.td}><button onClick={() => handleDuyuruSil(d.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: T.danger }}><Trash2 size={18} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {sekme === 'loglar' && (
            <div style={S.card}>
              <div style={{ padding: 24, borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>Denetim İzleri</h3>
                <div style={{ display: 'flex', gap: 12 }}>
                  <select style={{ ...S.input, width: 180 }} value={okulFiltre} onChange={e => { setOkulFiltre(e.target.value); setLoglarYuklendi(false) }}><option value="">Tüm Kurumlar</option>{liste.filter(k => !!k.okullar).map(k => <option key={k.okullar!.id} value={k.okullar!.id}>{k.okullar!.ad}</option>)}</select>
                  <button onClick={loglariGetir} style={S.btn(T.muted, T.secondary)}><RefreshCw size={14} /></button>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>{['Tarih', 'İşlem', 'Bölüm', 'Kurum', 'Açıklama'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {loglar.map(l => {
                      const renk = ISLEM_RENK[l.islem] || { bg: '#f1f5f9', color: '#64748b' }
                      return (
                        <tr key={l.id}>
                          <td style={{ ...S.td, fontSize: 11, color: T.secondary }}>{new Date(l.created_at).toLocaleString('tr-TR')}</td>
                          <td style={S.td}><span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 5, background: renk.bg, color: renk.color }}>{l.islem.toUpperCase()}</span></td>
                          <td style={S.td}>{TABLO_ETIKET[l.tablo] || l.tablo}</td>
                          <td style={S.td}><div style={{ fontWeight: 600 }}>{l.okullar?.ad || 'Sistem'}</div></td>
                          <td style={S.td}><div style={{ fontSize: 12, color: T.secondary }}>{l.aciklama}</div></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {sekme === 'tatiller' && (
            <div style={{ maxWidth: 980 }}>
              <div style={S.card}>
                <div style={{ padding: 24 }}>
                  {/* Başlık + Aksiyon */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>Resmi Tatil Takvimi</h3>
                    <button onClick={resmiTatilSihirbaz} disabled={tatilKaydediliyor} style={{ ...S.btn(T.primary), fontSize: 12, flexShrink: 0 }}>
                      🪄 2026 Sihirbazı
                    </button>
                  </div>

                  {/* Tatil Ekle Formu */}
                  <div style={{ background: T.muted, borderRadius: 12, padding: 16, marginBottom: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.secondary, marginBottom: 10 }}>YENİ TATİL EKLE</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
                      <input style={S.input} placeholder="Tatil adı" value={tatilForm.ad} onChange={e => setTatilForm({ ...tatilForm, ad: e.target.value })} />
                      <input style={S.input} type="date" value={tatilForm.bas} onChange={e => setTatilForm({ ...tatilForm, bas: e.target.value })} />
                      <input style={S.input} type="date" value={tatilForm.bit} onChange={e => setTatilForm({ ...tatilForm, bit: e.target.value })} />
                      <select style={S.input} value={tatilForm.tip} onChange={e => setTatilForm({ ...tatilForm, tip: e.target.value })}>
                        <option value="resmi">Resmi</option>
                        <option value="idari">İdari</option>
                      </select>
                      <button onClick={resmiTatilEkle} disabled={tatilKaydediliyor} style={{ ...S.btn(T.success), whiteSpace: 'nowrap' }}>
                        {tatilKaydediliyor ? '⏳' : '➕ Ekle'}
                      </button>
                    </div>
                  </div>

                  {/* Yıl Navigasyon */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 20 }}>
                    <button onClick={() => setGorunenYil(y => y - 1)} style={{ ...S.btn(T.muted, T.secondary), padding: '6px 14px' }}>‹</button>
                    <span style={{ fontWeight: 800, fontSize: 18, minWidth: 60, textAlign: 'center' }}>{gorunenYil}</span>
                    <button onClick={() => setGorunenYil(y => y + 1)} style={{ ...S.btn(T.muted, T.secondary), padding: '6px 14px' }}>›</button>
                  </div>

                  {/* Legand */}
                  <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 20 }}>
                    {[['#dbeafe','#1d4ed8','Resmi Tatil'],['#ffedd5','#c2410c','İdari İzin']].map(([bg, color, label]) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 14, height: 14, borderRadius: 3, background: bg, border: `1px solid ${color}30` }} />
                        <span style={{ fontSize: 12, color: T.secondary }}>{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* 12 Aylık Takvim */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    {AYLAR_TR.map((ayAd, ayIdx) => {
                      const { bosluk, gunSayisi } = ayHucreleri(gorunenYil, ayIdx)
                      const hucreler = Array(bosluk).fill(null).concat(Array.from({ length: gunSayisi }, (_, i) => i + 1))
                      return (
                        <div key={ayIdx} style={{ background: T.muted, borderRadius: 10, padding: 10 }}>
                          <div style={{ fontWeight: 800, fontSize: 12, textAlign: 'center', marginBottom: 8, color: T.primary }}>{ayAd}</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
                            {GUNLER_TR.map(g => (
                              <div key={g} style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: T.secondary, paddingBottom: 4 }}>{g}</div>
                            ))}
                            {hucreler.map((gun, i) => {
                              if (!gun) return <div key={i} />
                              const tatil = tatilBul(gorunenYil, ayIdx, gun)
                              const haftaGunu = new Date(gorunenYil, ayIdx, gun).getDay()
                              const haftaSonu = haftaGunu === 0 || haftaGunu === 6
                              return (
                                <div key={i} title={tatil?.ad} style={{ textAlign: 'center', fontSize: 10, padding: '3px 1px', borderRadius: 4, fontWeight: tatil ? 700 : 400, background: tatil ? (tatil.tip === 'resmi' ? '#dbeafe' : '#ffedd5') : 'transparent', color: tatil ? (tatil.tip === 'resmi' ? '#1d4ed8' : '#c2410c') : haftaSonu ? '#94a3b8' : T.primary, cursor: tatil ? 'pointer' : 'default' }}>
                                  {gun}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Tatil Chip Listesi */}
                  {resmiTatiller.filter(t => new Date(t.baslangic_tarihi).getFullYear() === gorunenYil).length > 0 && (
                    <div style={{ marginTop: 20, borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.secondary, marginBottom: 10 }}>{gorunenYil} YILI TATİLLERİ</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {resmiTatiller.filter(t => new Date(t.baslangic_tarihi).getFullYear() === gorunenYil).map(t => (
                          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: t.tip === 'resmi' ? '#dbeafe' : '#ffedd5', borderRadius: 8, padding: '5px 10px', fontSize: 12 }}>
                            <span style={{ fontWeight: 600, color: t.tip === 'resmi' ? '#1d4ed8' : '#c2410c' }}>{t.ad}</span>
                            <span style={{ color: T.secondary, fontSize: 11 }}>
                              {new Date(t.baslangic_tarihi).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                              {t.baslangic_tarihi !== t.bitis_tarihi && ` – ${new Date(t.bitis_tarihi).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}`}
                            </span>
                            <button onClick={() => resmiTatilSil(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {sekme === 'ayarlar' && (
            <div style={{ maxWidth: 400 }}>
              <div style={S.card}><div style={{ padding: 24 }}><h3 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 900 }}>Sistem Ayarları</h3><div style={{ background: bakimAktif ? `${T.danger}10` : T.muted, borderRadius: 12, padding: 16, border: `1px solid ${bakimAktif ? T.danger : T.border}` }}><div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}><div style={{ width: 40, height: 40, borderRadius: 10, background: bakimAktif ? T.danger : T.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zap size={20} color="white" /></div><div><div style={{ fontWeight: 800, fontSize: 14 }}>Bakım Modu</div><div style={{ fontSize: 11, color: bakimAktif ? T.danger : T.secondary }}>{bakimAktif ? 'SİSTEM KAPALI' : 'SİSTEM AKTİF'}</div></div></div><button onClick={handleBakimToggle} style={{ ...S.btn(bakimAktif ? T.danger : T.primary), width: '100%', height: 44, justifyContent: 'center' }}>{bakimAktif ? 'Bakımı Kapat' : 'Bakımı Başlat'}</button></div></div></div>
            </div>
          )}
        </main>
      </div>

      {/* MODALS */}
      {selectedUser && (
        <div style={modalOverlayStyle}><div style={modalContentStyle}><h3>Şifre Güncelle</h3><p style={{ fontSize: 13, color: T.secondary, marginBottom: 24 }}>{selectedUser.email}</p><input type="password" style={S.input} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Yeni şifre..." /><div style={{ display: 'flex', gap: 12, marginTop: 24 }}><button onClick={handleUpdatePassword} style={{ ...S.btn(T.primary), flex: 1, height: 44, justifyContent: 'center' }}>Güncelle</button><button onClick={() => setSelectedUser(null)} style={{ ...S.btn(T.muted, T.secondary), flex: 1, height: 44, justifyContent: 'center' }}>İptal</button></div></div></div>
      )}
      {showOdemeModal && (
        <div style={modalOverlayStyle}><div style={modalContentStyle}><h3>Tahsilat Girişi</h3><form onSubmit={handleOdemeEkle} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}><div><label style={S.label}>Kurum Seçin</label><select style={S.input} value={selectedOkulId || ''} onChange={e => setSelectedOkulId(Number(e.target.value))}><option value="">Seçiniz...</option>{okullar.map(o => <option key={o.id} value={o.id}>{o.ad}</option>)}</select></div><div><label style={S.label}>Tutar (TL)</label><input type="number" style={S.input} value={odemeTutar} onChange={e => setOdemeTutar(e.target.value)} /></div><div style={{ display: 'flex', gap: 12, marginTop: 8 }}><button type="submit" style={{ ...S.btn(T.success), flex: 1, height: 44, justifyContent: 'center' }}>Kaydet</button><button type="button" onClick={() => setShowOdemeModal(false)} style={{ ...S.btn(T.muted, T.secondary), flex: 1, height: 44, justifyContent: 'center' }}>Vazgeç</button></div></form></div></div>
      )}
      {showDuyuruModal && (
        <div style={modalOverlayStyle}><div style={modalContentStyle}><h3>Yeni Duyuru Yayınla</h3><form onSubmit={handleDuyuruEkle} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}><div><label style={S.label}>Başlık</label><input style={S.input} value={duyuruBaslik} onChange={e => setDuyuruBaslik(e.target.value)} /></div><div><label style={S.label}>İçerik</label><textarea style={{ ...S.input, height: 100, padding: 12 }} value={duyuruIcerik} onChange={e => setDuyuruIcerik(e.target.value)} /></div><div><label style={S.label}>Tür</label><select style={S.input} value={duyuruTur} onChange={e => setDuyuruTur(e.target.value)}><option value="info">Bilgi (Mavi)</option><option value="warning">Uyarı (Sarı)</option><option value="danger">Kritik (Kırmızı)</option></select></div><div style={{ display: 'flex', gap: 12, marginTop: 8 }}><button type="submit" style={{ ...S.btn(T.primary), flex: 1, height: 44, justifyContent: 'center' }}>Yayınla</button><button type="button" onClick={() => setShowDuyuruModal(false)} style={{ ...S.btn(T.muted, T.secondary), flex: 1, height: 44, justifyContent: 'center' }}>İptal</button></div></form></div></div>
      )}
    </div>
  )
}
