'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAy } from '@/lib/AyContext'
import { supabase } from '@/lib/supabase'
import { fmtTL, ayLabel, isGunuSayisi, tarihFmt, tatilMi, RESMI_TATILLER } from '@/lib/hesaplama'
import { Ogrenci, Tahsilat, HesapHareketi, Ayarlar, Personel } from '@/lib/types'
import Link from 'next/link'

import { useAuth } from '@/lib/AuthContext'
import {
  Users,
  Wallet,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ArrowRightCircle,
  Settings,
  FileText,
  Clock,
  PieChart,
  UserCheck,
  AlertTriangle,
  User,
  XCircle,
  Megaphone,
  Bell,
  Calendar,
  GraduationCap,
  ArrowUpRight,
  Activity,
  Zap,
  Target,
  ShieldCheck
} from 'lucide-react'

export default function DashboardPage() {
  const { ay, yil } = useAy()
  const { okul, profil, session } = useAuth()
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>([])
  const [tahsilatlar, setTahsilatlar] = useState<Tahsilat[]>([])
  const [prevTahsilatlar, setPrevTahsilatlar] = useState<Tahsilat[]>([])
  const [hareketler, setHareketler] = useState<HesapHareketi[]>([])
  const [ayarlar, setAyarlar] = useState<Ayarlar | null>(null)
  const [duyuru, setDuyuru] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [personel, setPersonel] = useState<Personel[]>([])
  const [siniflar, setSiniflar] = useState<any[]>([])
  const [bordrolar, setBordrolar] = useState<any[]>([])
  const [puantajlar, setPuantajlar] = useState<any[]>([])
  const [tatiller, setTatiller] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())

  // Denetçi Durumu State
  const [denetciDurumu, setDenetciDurumu] = useState<'yukleniyor' | 'aktif' | 'yok' | 'beklemede'>('yukleniyor')
  const [showDenetciModal, setShowDenetciModal] = useState(false)
  const [talepForm, setTalepForm] = useState({ ad_soyad: '', email: '', telefon: '', notlar: '', il_id: 0 })
  const [talepGonderiliyor, setTalepGonderiliyor] = useState(false)
  const [iller, setIller] = useState<{ id: number; ad: string }[]>([])

  // Canlı Saat Güncelleme
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const filteredResults = searchQuery.length > 1
    ? [
      ...ogrenciler.filter(o => o.ad.toLowerCase().includes(searchQuery.toLowerCase())).map(o => ({ ...o, type: 'ogrenci' as const })),
      ...personel.filter(p => p.ad.toLowerCase().includes(searchQuery.toLowerCase())).map(p => ({ ...p, type: 'personel' as const }))
    ].slice(0, 6)
    : []

  const loadData = useCallback(async () => {
    if (!okul?.id) return
    setLoading(true)
    const startDate = `${yil}-${String(ay).padStart(2, '0')}-01`
    const lastDay = new Date(yil, ay, 0).getDate()
    const endDate = `${yil}-${String(ay).padStart(2, '0')}-${lastDay}T23:59:59`

    const prevMonth = ay === 1 ? 12 : ay - 1
    const prevYear = ay === 1 ? yil - 1 : yil

    const [
      { data: ogr },
      { data: tah },
      { data: prevTah },
      { data: hh },
      { data: ayr },
      { data: tat },
      { data: per },
      { data: sin },
      { data: brd }
    ] = await Promise.all([
      supabase.from('ogrenciler').select('*').eq('okul_id', okul?.id),
      supabase.from('tahsilat').select('*').eq('ay', ay).eq('yil', yil).eq('okul_id', okul?.id),
      supabase.from('tahsilat').select('*').eq('ay', prevMonth).eq('yil', prevYear).eq('okul_id', okul?.id),
      supabase.from('hesap_hareketleri').select('*').eq('okul_id', okul?.id).order('tarih', { ascending: false }),
      supabase.from('ayarlar').select('*').eq('okul_id', okul?.id).single(),
      supabase.from('tatiller').select('*').or(`okul_id.eq.${okul?.id ?? 0},okul_id.is.null`),
      supabase.from('personel').select('*').eq('okul_id', okul?.id),
      supabase.from('siniflar').select('*').eq('aktif', true).eq('okul_id', okul?.id),
      supabase.from('bordro').select('*').eq('ay', ay).eq('yil', yil).eq('okul_id', okul?.id)
    ])

    let pua: any[] = []
    if (per && per.length > 0) {
      const { data } = await supabase.from('puantaj')
        .select('*')
        .in('personel_id', per.map(p => p.id))
        .gte('tarih', startDate).lte('tarih', endDate)
      pua = data || []
    }

    setOgrenciler(ogr || [])
    setTahsilatlar(tah || [])
    setPrevTahsilatlar(prevTah || [])
    setHareketler(hh || [])
    setAyarlar(ayr)
    setTatiller(tat || [])
    setPersonel(per || [])
    setSiniflar(sin || [])
    setBordrolar(brd || [])
    setPuantajlar(pua || [])
    setLoading(false)
  }, [ay, yil, okul?.id])

  const router = useRouter()

  useEffect(() => {
    if (!profil) return

    if (profil.rol === 'super_admin') {
      router.replace('/yonetim')
    } else if (profil.rol === 'denetim_yetkilisi') {
      router.replace('/denetim')
    }
  }, [profil, router])

  const loadDuyuru = useCallback(async () => {
    try {
      const res = await fetch('/api/duyurular')
      const data = await res.json()
      setDuyuru(data.duyuru)
    } catch (e) {
      console.error('Duyuru yüklenemedi:', e)
    }
  }, [])

  const checkDenetciDurumu = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/denetci/durum', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setDenetciDurumu(data.status ?? 'yok')
    } catch (e) {
      console.error('Denetçi durumu kontrol edilemedi:', e)
      setDenetciDurumu('yok')
    }
  }, [])

  async function openDenetciModal() {
    // il_id'yi önce okul kaydından doldur
    setTalepForm({ ad_soyad: '', email: '', telefon: '', notlar: '', il_id: okul?.il_id || 0 })
    // okul.il_id yoksa il listesini çek (kullanıcı seçsin)
    if (!okul?.il_id && iller.length === 0) {
      const { data } = await supabase.from('iller').select('id, ad').order('ad')
      setIller(data || [])
    }
    setShowDenetciModal(true)
  }

  async function handleTalepGonder(e: React.FormEvent) {
    e.preventDefault()
    if (!talepForm.il_id) {
      alert('Lütfen ilinizi seçin.')
      return
    }
    setTalepGonderiliyor(true)
    try {
      const res = await fetch('/api/denetci/talep', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(talepForm)
      })
      const body = await res.json()
      if (res.ok) {
        setShowDenetciModal(false)
        setDenetciDurumu('beklemede')
      } else {
        alert(body.error || 'Talep gönderilirken bir hata oluştu.')
      }
    } catch {
      alert('Talep gönderilirken bir hata oluştu.')
    } finally {
      setTalepGonderiliyor(false)
    }
  }

  useEffect(() => {
    loadData()
    loadDuyuru()
  }, [loadData, loadDuyuru])

  useEffect(() => {
    if (session?.access_token) checkDenetciDurumu(session.access_token)
  }, [session?.access_token, checkDenetciDurumu])

  function odenen(o: Ogrenci) {
    return tahsilatlar.filter(t => t.ogrenci_id === o.id).reduce((s, t) => s + Number(t.tutar), 0)
  }

  const getGereken = useCallback((o: Ogrenci) => {
    if (o.ucretsiz_mi || o.aktif === false) return 0
    if (!ayarlar) return 0

    if (o.gunluk_saat != null && o.gunluk_saat > 0) {
      let u = o.gunluk_saat * (ayarlar.saat_ucreti || 0)
      if (o.kardes_indirimi) u *= 0.75
      return Math.round(u * 100) / 100
    }

    const isGunu = isGunuSayisi(yil, ay, tatiller)
    let u = isGunu * (ayarlar.gunluk_saat || 6) * (ayarlar.saat_ucreti || 0)

    if (o.kardes_indirimi) u *= 0.75
    return Math.round(u * 100) / 100
  }, [ay, yil, ayarlar, tatiller])

  const toplamTahsilat = Math.round(tahsilatlar.reduce((s, t) => s + Number(t.tutar), 0) * 100) / 100
  const prevToplamTahsilat = Math.round(prevTahsilatlar.reduce((s, t) => s + Number(t.tutar), 0) * 100) / 100
  const toplamBeklenen = ogrenciler.reduce((s, o) => s + getGereken(o), 0)
  const tahsilatYuzdesi = toplamBeklenen > 0 ? Math.round((toplamTahsilat / toplamBeklenen) * 100) : 0

  const tahsilatTrendi = prevToplamTahsilat > 0 ? Math.round(((toplamTahsilat - prevToplamTahsilat) / prevToplamTahsilat) * 100) : 0

  const toplamKapasite = siniflar.reduce((s, c) => s + (c.kapasite || 0), 0)
  const aktifOgrenci = ogrenciler.filter(o => o.aktif !== false).length
  const kapasiteYuzdesi = toplamKapasite > 0 ? Math.round((aktifOgrenci / toplamKapasite) * 100) : 0

  const bordroDurumu = bordrolar.length > 0 ? (bordrolar.every(b => b.odendi) ? 2 : 1) : 0

  const netBakiye = Math.round(hareketler.reduce((s, h) => (h.tur === 'gelir' ? s + Number(h.tutar) : s - Number(h.tutar)), 0) * 100) / 100

  const lisansBitisBanner = (() => {
    if (!okul?.lisans_bitis) return null
    const bugun = new Date()
    const bitis = new Date(okul.lisans_bitis)
    const kalanGun = Math.ceil((bitis.getTime() - bugun.getTime()) / (1000 * 60 * 60 * 24))
    if (kalanGun <= 0) return null 
    if (kalanGun <= 7) return { kalanGun, seviye: 'kritik' as const }
    if (kalanGun <= 30) return { kalanGun, seviye: 'uyari' as const }
    return null
  })()

  const uyarilar: { text: string; type: string; link?: string }[] = []
  const borcluSayisi = ogrenciler.filter(o => {
    if (o.aktif === false) return false
    const gereken = getGereken(o)
    if (gereken <= 0) return false
    return (gereken - odenen(o)) > 1
  }).length

  if (borcluSayisi > 0) uyarilar.push({ text: `${borcluSayisi} öğrencinin ödemesi gecikmiş.`, type: 'warn', link: '/odeme' })
  if (personel.some(p => !p.iban || !p.tc)) uyarilar.push({ text: `Personel bilgilerinde eksikler var.`, type: 'info', link: '/personel' })
  if (bordroDurumu === 0 && new Date().getDate() > 20) uyarilar.push({ text: `Ay sonu yaklaşıyor, bordro tahakkuk edilmedi.`, type: 'alert', link: '/bordro' })

  if (loading) {
     return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text3)' }}>Yükleniyor...</div>
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '40px', fontFamily: '"DM Sans", sans-serif' }}>
      
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        
        {/* HEADER */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 12px var(--success-border)', animation: 'pulse 2s infinite' }} />
              {currentTime.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: 32, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>
              Hoş Geldiniz, <span style={{ color: 'var(--accent)' }}>{profil?.ad?.split(' ')[0] || 'Yönetici'}</span>
            </h1>
            <p style={{ color: 'var(--text2)', fontSize: 15, marginTop: 6, margin: 0 }}>
              Kurumunuzdaki anlık durum ve güncel veriler aşağıdadır.
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            {/* Search */}
            <div style={{ position: 'relative', width: 340 }}>
              <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }}>
                <Users size={18} />
              </div>
              <input
                type="text"
                placeholder="Öğrenci veya personel ara..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', height: 48, background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 16, padding: '0 48px', fontSize: 14, outline: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)', transition: 'all 0.2s',
                  color: 'var(--text)'
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(45,90,61,0.08)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)' }}
              />
              {filteredResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: '110%', left: 0, right: 0, background: 'var(--surface)',
                  borderRadius: 16, border: '1px solid var(--border)', boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
                  padding: 8, zIndex: 1000
                }}>
                  {filteredResults.map(item => (
                    <Link key={`${item.type}-${item.id}`} href={item.type === 'ogrenci' ? `/ogrenciler?id=${item.id}` : `/personel?id=${item.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{
                        padding: '10px 12px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12,
                        cursor: 'pointer', transition: 'all 0.2s', background: 'transparent'
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{
                          width: 32, height: 32, background: item.type === 'ogrenci' ? 'var(--accent-lighter)' : 'var(--warn-light)',
                          borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: item.type === 'ogrenci' ? 'var(--accent)' : 'var(--warn)'
                        }}>
                          {item.type === 'ogrenci' ? <GraduationCap size={16} /> : <UserCheck size={16} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{item.ad}</div>
                          <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 800 }}>
                            {item.type === 'ogrenci' ? 'Öğrenci' : 'Personel'}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', padding: '10px 20px', borderRadius: 16, border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
              <Clock size={18} color="var(--accent)" />
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                {currentTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </header>

        {/* BANNERS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
          {duyuru && (
            <div style={{
              background: duyuru.tur === 'danger' ? 'var(--danger-light)' : duyuru.tur === 'warning' ? 'var(--warn-light)' : 'var(--info-light)',
              border: `1px solid ${duyuru.tur === 'danger' ? 'var(--danger-border)' : duyuru.tur === 'warning' ? 'var(--warn-border)' : 'var(--info-border)'}`,
              padding: '16px 24px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16
            }}>
              <Megaphone size={20} color={duyuru.tur === 'danger' ? 'var(--danger)' : duyuru.tur === 'warning' ? 'var(--warn)' : 'var(--info)'} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{duyuru.baslik}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{duyuru.icerik}</div>
              </div>
            </div>
          )}
          {lisansBitisBanner && (
            <div style={{
              background: lisansBitisBanner.seviye === 'kritik' ? 'var(--danger-light)' : 'var(--warn-light)',
              border: `1px solid ${lisansBitisBanner.seviye === 'kritik' ? 'var(--danger-border)' : 'var(--warn-border)'}`,
              padding: '16px 24px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16
            }}>
              <AlertTriangle size={20} color={lisansBitisBanner.seviye === 'kritik' ? 'var(--danger)' : 'var(--warn)'} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Lisans Süresi Uyarısı</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>Sistemi kesintisiz kullanmaya devam etmek için <strong>{lisansBitisBanner.kalanGun} gün</strong> içinde yenileme yapmalısınız.</div>
              </div>
              <Link href="/odeme-yap" style={{ padding: '8px 16px', background: lisansBitisBanner.seviye === 'kritik' ? 'var(--danger)' : 'var(--warn)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Yenile</Link>
            </div>
          )}

          {/* Denetçi Paneli — sadece aktif denetçi YOKSA göster */}
          {denetciDurumu === 'yok' && (
            <div style={{
              background: 'var(--accent-lighter)',
              border: '1px solid var(--accent-border)',
              padding: '16px 24px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16
            }}>
              <ShieldCheck size={20} color="var(--accent)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Denetçi Paneliniz Henüz Aktif Değil</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>
                  İlinize ait denetim mekanizmasını başlatmak ve denetçi panelini ücretsiz aktif etmek için talep oluşturabilirsiniz.
                </div>
              </div>
              <button
                onClick={openDenetciModal}
                style={{ padding: '8px 16px', background: 'var(--accent)', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Talep Oluştur
              </button>
            </div>
          )}
          {denetciDurumu === 'beklemede' && (
            <div style={{
              background: 'var(--info-light)',
              border: '1px solid var(--info-border)',
              padding: '16px 24px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 16
            }}>
              <ShieldCheck size={20} color="var(--info)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Denetçi Paneli Talebi Beklemede</div>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>
                  Talebiniz yöneticilerimiz tarafından incelenmektedir. Onaylandığında paneliniz aktif olacaktır.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* TOP STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
          {/* Tahsilat */}
          <div style={{ background: 'var(--surface)', borderRadius: 24, padding: 28, border: '1px solid var(--border)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={24} color="var(--success)" />
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: tahsilatTrendi >= 0 ? 'var(--success)' : 'var(--danger)', background: tahsilatTrendi >= 0 ? 'var(--success-light)' : 'var(--danger-light)', padding: '4px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                {tahsilatTrendi >= 0 ? <ArrowUpRight size={14} /> : <ArrowUpRight size={14} style={{ transform: 'rotate(90deg)' }} />}
                {Math.abs(tahsilatTrendi)}%
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1 }}>Tahsilat Verimi</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <div style={{ fontFamily: '"Playfair Display", serif', fontSize: 32, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>%{tahsilatYuzdesi}</div>
            </div>
            <div style={{ marginTop: 16, height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${tahsilatYuzdesi}%`, height: '100%', background: 'var(--success)', borderRadius: 3 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 13, fontWeight: 600 }}>
              <span style={{ color: 'var(--text)' }}>{fmtTL(toplamTahsilat)}</span>
              <span style={{ color: 'var(--text3)' }}>Hedef: {fmtTL(toplamBeklenen)}</span>
            </div>
          </div>

          {/* Kapasite */}
          <div style={{ background: 'var(--surface)', borderRadius: 24, padding: 28, border: '1px solid var(--border)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--info-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target size={24} color="var(--info)" />
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1 }}>Kapasite Doluluğu</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <div style={{ fontFamily: '"Playfair Display", serif', fontSize: 32, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>%{kapasiteYuzdesi}</div>
            </div>
            <div style={{ marginTop: 16, height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${kapasiteYuzdesi}%`, height: '100%', background: 'var(--info)', borderRadius: 3 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 13, fontWeight: 600 }}>
              <span style={{ color: 'var(--text)' }}>{aktifOgrenci} Öğrenci</span>
              <span style={{ color: 'var(--text3)' }}>Max: {toplamKapasite}</span>
            </div>
          </div>

          {/* Bordro */}
          <div style={{ background: 'var(--surface)', borderRadius: 24, padding: 28, border: '1px solid var(--border)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 16, background: bordroDurumu > 0 ? 'var(--success-light)' : 'var(--warn-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={24} color={bordroDurumu > 0 ? 'var(--success)' : 'var(--warn)'} />
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1 }}>Bordro Döngüsü</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginTop: 4, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {bordroDurumu > 0 ? 'Tahakkuk Edildi' : 'Hesaplama Bekleniyor'}
            </div>
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: bordroDurumu > 0 ? 'var(--success-light)' : 'var(--warn-light)', borderRadius: 12, border: `1px solid ${bordroDurumu > 0 ? 'var(--success-border)' : 'var(--warn-border)'}` }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: bordroDurumu > 0 ? 'var(--success)' : 'var(--warn)', animation: bordroDurumu === 0 ? 'pulse 2s infinite' : 'none' }} />
              <div style={{ fontSize: 12, fontWeight: 700, color: bordroDurumu > 0 ? 'var(--success)' : 'var(--warn)' }}>
                {bordroDurumu > 0 ? `${ayLabel(ay, yil)} Dönemi Onaylandı` : 'Veri girişi bekleniyor'}
              </div>
            </div>
          </div>
        </div>

        {/* MAIN GRID: FINANCIAL & AGENDA */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32, marginBottom: 32 }}>
          
          {/* FİNANSAL GRAFİK */}
          <div style={{ background: 'var(--surface)', borderRadius: 28, padding: 32, border: '1px solid var(--border)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Finansal Akış Analizi</h3>
                <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4, margin: 0 }}>Son 6 aylık gelir-gider trendi</p>
              </div>
              <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Cari Net Bakiye</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: netBakiye >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmtTL(netBakiye)}</div>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 12, paddingBottom: 16 }}>
              {(() => {
                const last6Months = []
                let tAy = ay, tYil = yil
                for (let i = 0; i < 6; i++) { last6Months.push({ ay: tAy, yil: tYil }); tAy--; if (tAy === 0) { tAy = 12; tYil-- } }
                const chartData = last6Months.reverse().map(m => {
                  const mGelir = hareketler.filter(h => h.tur === 'gelir' && h.ay === m.ay && h.yil === m.yil).reduce((s, h) => s + Number(h.tutar), 0)
                  const mGider = hareketler.filter(h => h.tur === 'gider' && h.ay === m.ay && h.yil === m.yil).reduce((s, h) => s + Number(h.tutar), 0)
                  return { ...m, gelir: mGelir, gider: mGider }
                })

                let visibleBars: any[] = []
                chartData.forEach(d => {
                  visibleBars.push({ tutar: d.gelir, tur: 'gelir', label: ayLabel(d.ay, d.yil) })
                  visibleBars.push({ tutar: d.gider, tur: 'gider', label: ayLabel(d.ay, d.yil) })
                })

                const maxVal = Math.max(...visibleBars.map(h => Number(h.tutar)), 1)

                return visibleBars.map((h, i) => {
                  const isGap = i > 0 && i % 2 === 0
                  return (
                    <div key={i} style={{
                      flex: 1, height: `${Math.max((Number(h.tutar) / maxVal) * 100, 5)}%`,
                      background: h.tur === 'gelir' ? 'linear-gradient(180deg, var(--accent-light) 0%, var(--accent) 100%)' : 'linear-gradient(180deg, var(--danger-border) 0%, var(--danger) 100%)',
                      borderRadius: '8px 8px 4px 4px', position: 'relative', marginLeft: isGap ? 24 : 0, transition: 'all 0.2s', opacity: 0.9
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scaleY(1.02)' }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'scaleY(1)' }}
                    title={`${h.label} - ${h.tur === 'gelir' ? 'Gelir' : 'Gider'}: ${fmtTL(Number(h.tutar))}`}
                    />
                  )
                })
              })()}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16, borderTop: '1px solid var(--surface2)', paddingTop: 16 }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>
                 <div style={{ width: 12, height: 12, borderRadius: 4, background: 'var(--accent)' }} /> Gelirler
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>
                 <div style={{ width: 12, height: 12, borderRadius: 4, background: 'var(--danger)' }} /> Giderler
               </div>
            </div>
          </div>

          {/* SAĞ PANEL: UYARILAR & AJANDA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Akıllı Uyarılar */}
            <div style={{ background: 'var(--surface)', borderRadius: 28, padding: 28, border: '1px solid var(--border)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, background: 'var(--danger-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bell size={18} color="var(--danger)" />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Akıllı Takip</h3>
              </div>
              
              {uyarilar.length === 0 ? (
                <div style={{ background: 'var(--surface2)', borderRadius: 16, padding: '24px', textAlign: 'center', border: '1px dashed var(--border)' }}>
                  <CheckCircle2 size={28} color="var(--success)" style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text2)' }}>Her Şey Yolunda</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {uyarilar.map((u, i) => (
                    <div key={i} style={{ padding: '16px', background: u.type === 'alert' ? 'var(--danger-light)' : u.type === 'warn' ? 'var(--warn-light)' : 'var(--info-light)', borderRadius: 16, borderLeft: `4px solid ${u.type === 'alert' ? 'var(--danger)' : u.type === 'warn' ? 'var(--warn)' : 'var(--info)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{u.text}</div>
                      {u.link && <Link href={u.link} style={{ fontSize: 11, fontWeight: 800, color: u.type === 'alert' ? 'var(--danger)' : u.type === 'warn' ? 'var(--warn)' : 'var(--info)', textDecoration: 'none' }}>YÖNET →</Link>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ajanda */}
            <div style={{ background: 'var(--surface)', borderRadius: 28, padding: 28, border: '1px solid var(--border)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, background: 'var(--info-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={18} color="var(--info)" />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Tatiller</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(() => {
                  const dbTatiller = tatiller.filter(t => new Date(t.bas).getMonth() + 1 === ay && new Date(t.bas).getFullYear() === yil).map(t => ({ ad: t.ad, gun: new Date(t.bas).getDate(), tip: 'Tatil / Etkinlik' }))
                  const rtNames: Record<string, string> = { '01-01': 'Yılbaşı', '04-23': '23 Nisan Çocuk B.', '05-01': '1 Mayıs', '05-19': '19 Mayıs', '07-15': '15 Temmuz', '08-30': '30 Ağustos', '10-29': '29 Ekim' }
                  const rtList = RESMI_TATILLER.filter(rt => Number(rt.split('-')[0]) === ay).map(rt => ({ ad: rtNames[rt] || 'Resmi Tatil', gun: Number(rt.split('-')[1]), tip: 'Resmi Tatil' }))
                  const combined = [...dbTatiller, ...rtList].sort((a,b) => a.gun - b.gun).slice(0, 4)

                  if (combined.length === 0) return <div style={{ fontSize: 13, color: 'var(--text3)' }}>Bu ay için kayıtlı tatil yok.</div>

                  return combined.map((t, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', background: 'var(--bg)', borderRadius: 16, border: '1px solid var(--border-light)' }}>
                      <div style={{ width: 40, height: 40, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)' }}>{t.gun}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.ad}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>{t.tip}</div>
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </div>

          </div>
        </div>

        {/* BOTTOM SECTION: QUICK ACTIONS & PERSONNEL */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 32 }}>
          
          {/* Quick Actions (Grid 2x2) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[
              { label: 'Öğrenci Kaydı', icon: <PlusCircle size={22} />, color: 'var(--success)', bg: 'var(--success-light)', link: '/ogrenciler', desc: 'Yeni kayıt' },
              { label: 'Tahsilat', icon: <TrendingUp size={22} />, color: 'var(--accent)', bg: 'var(--accent-lighter)', link: '/odeme', desc: 'Aidat alımı' },
              { label: 'Bordro', icon: <FileText size={22} />, color: 'var(--warn)', bg: 'var(--warn-light)', link: '/bordro', desc: 'Maaş işlemleri' },
              { label: 'Ayarlar', icon: <Settings size={22} />, color: 'var(--text2)', bg: 'var(--surface2)', link: '/ayarlar', desc: 'Parametreler' }
            ].map((action, idx) => (
              <Link key={idx} href={action.link} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'var(--surface)', padding: '24px', borderRadius: 24, border: '1px solid var(--border)',
                  display: 'flex', flexDirection: 'column', gap: 16, transition: 'all 0.2s',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = 'var(--accent-light)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.03)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  <div style={{ width: 48, height: 48, background: action.bg, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: action.color }}>
                    {action.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>{action.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{action.desc}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Personnel Performance */}
          <div style={{ background: 'var(--surface)', borderRadius: 28, padding: 32, border: '1px solid var(--border)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, background: 'var(--info-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={18} color="var(--info)" />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Aktif Personel Karnesi</h3>
              </div>
              <Link href="/bordro" style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', textDecoration: 'none', padding: '8px 16px', background: 'var(--accent-lighter)', borderRadius: 10 }}>TÜMÜNÜ GÖR</Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(() => {
                const mapped = personel.map(p => ({
                  ...p,
                  pSaat: puantajlar.filter(x => x.personel_id === p.id && !tatilMi(ay, new Date(x.tarih).getDate(), yil, tatiller)).reduce((s, x) => s + (Number(x.saat) || 0), 0)
                })).filter(p => p.pSaat > 0).sort((a, b) => b.pSaat - a.pSaat)

                const maxSaat = Math.max(...mapped.map(p => p.pSaat), 1)

                return mapped.slice(0, 4).map((p, idx) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: idx === 0 ? 'var(--warn-light)' : 'var(--surface2)', color: idx === 0 ? 'var(--warn)' : 'var(--text3)', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {idx + 1}
                    </div>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>
                      <User size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{p.ad}</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)' }}>{p.pSaat} <span style={{ fontSize: 10, color: 'var(--text3)' }}>SAAT</span></div>
                      </div>
                      <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${(p.pSaat / maxSaat) * 100}%`, height: '100%', background: idx === 0 ? 'var(--warn)' : 'var(--accent)', borderRadius: 3 }} />
                      </div>
                    </div>
                  </div>
                ))
              })()}
            </div>
          </div>
        </div>

      </div>

      {/* Denetçi Talep Modalı */}
      {showDenetciModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 24, padding: 32, width: '100%', maxWidth: 500, boxShadow: '0 20px 50px rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}>
            <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 24, marginBottom: 8, color: 'var(--text)' }}>Denetçi Paneli Talebi</h2>
            <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 24 }}>İlinizdeki yetkili denetçinin (MEB/İl-İlçe Milli Eğitim) bilgilerini girerek panelin açılmasını talep edebilirsiniz.</p>
            
            <form onSubmit={handleTalepGonder} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* İl bilgisi */}
              {okul?.il_id ? (
                <div style={{ padding: '10px 14px', background: 'var(--success-light)', border: '1px solid var(--success-border)', borderRadius: 10, fontSize: 13, color: 'var(--text2)' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text)' }}>İl:</span> Sistem tarafından otomatik algılandı ✓
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase' }}>İl <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select
                    required
                    value={talepForm.il_id || ''}
                    onChange={e => setTalepForm({ ...talepForm, il_id: Number(e.target.value) })}
                    style={{ width: '100%', height: 44, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', padding: '0 12px' }}
                  >
                    <option value="">İl seçiniz...</option>
                    {iller.map(il => <option key={il.id} value={il.id}>{il.ad}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase' }}>Denetçi Ad Soyad</label>
                <input 
                  type="text" required
                  value={talepForm.ad_soyad}
                  onChange={e => setTalepForm({...talepForm, ad_soyad: e.target.value})}
                  style={{ width: '100%', height: 44, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', padding: '0 12px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase' }}>E-Posta</label>
                  <input 
                    type="email" required
                    value={talepForm.email}
                    onChange={e => setTalepForm({...talepForm, email: e.target.value})}
                    style={{ width: '100%', height: 44, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', padding: '0 12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase' }}>Telefon</label>
                  <input 
                    type="tel"
                    value={talepForm.telefon}
                    onChange={e => setTalepForm({...talepForm, telefon: e.target.value})}
                    style={{ width: '100%', height: 44, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', padding: '0 12px' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase' }}>Notlar (Opsiyonel)</label>
                <textarea 
                  rows={3}
                  value={talepForm.notlar}
                  onChange={e => setTalepForm({...talepForm, notlar: e.target.value})}
                  style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', padding: '12px' }}
                  placeholder="Eklemek istediğiniz bilgiler..."
                />
              </div>
              
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button 
                  type="button" 
                  onClick={() => setShowDenetciModal(false)}
                  style={{ flex: 1, height: 48, borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontWeight: 700, cursor: 'pointer' }}
                >
                  Vazgeç
                </button>
                <button 
                  type="submit" 
                  disabled={talepGonderiliyor}
                  style={{ flex: 1, height: 48, borderRadius: 12, border: 'none', background: 'var(--accent)', color: 'white', fontWeight: 700, cursor: 'pointer', opacity: talepGonderiliyor ? 0.7 : 1 }}
                >
                  {talepGonderiliyor ? 'Gönderiliyor...' : 'Talebi Gönder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
      `}</style>
    </div>
  )
}
