'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAy } from '@/lib/AyContext'
import { supabase } from '@/lib/supabase'
import { ayLabel, isGunuSayisi, tatilMi, RESMI_TATILLER } from '@/lib/hesaplama'
import { Ogrenci, Tahsilat, HesapHareketi, Ayarlar, Personel, kulupOgrencisi, Sinif, Bordro, Puantaj, Tatil } from '@/lib/types'
import Link from 'next/link'

import { useAuth } from '@/lib/AuthContext'
import { uyari } from '@/lib/diyalog'
import {
  TrendingUp, CheckCircle2, PlusCircle, Settings, FileText, Clock, UserCheck, AlertTriangle, Megaphone, GraduationCap, ShieldCheck, Search, Info,
} from 'lucide-react'
import { useYukleme } from '@/lib/useYukleme'

// Saat kendi bileşeninde güncellenir: tüm panel her saniye yeniden çizilmesin
function Saat() {
  const [t, setT] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setT(new Date()), 15000)
    return () => clearInterval(timer)
  }, [])
  return <>{t.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</>
}

function Banner({ color, bg, border, icon, title, children, action }: { color: string; bg: string; border: string; icon: React.ReactNode; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', borderRadius: 8, background: bg, border: `1px solid ${border}`, flexWrap: 'wrap' }}>
      <span style={{ color, display: 'flex', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 200, fontSize: 13, color: 'var(--text2)', lineHeight: 1.45 }}>
        <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{title}</strong>{children ? <> {children}</> : null}
      </div>
      {action}
    </div>
  )
}

export default function DashboardPage() {
  const { ay, yil } = useAy()
  const { okul, profil, session } = useAuth()
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>([])
  const [tahsilatlar, setTahsilatlar] = useState<Tahsilat[]>([])
  const [prevTahsilatlar, setPrevTahsilatlar] = useState<Tahsilat[]>([])
  const [hareketler, setHareketler] = useState<HesapHareketi[]>([])
  const [ayarlar, setAyarlar] = useState<Ayarlar | null>(null)
  const [duyuru, setDuyuru] = useState<{ baslik: string; icerik: string; tur: 'info' | 'warning' | 'danger' | string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [personel, setPersonel] = useState<Personel[]>([])
  const [siniflar, setSiniflar] = useState<Pick<Sinif, 'kapasite'>[]>([])
  const [bordrolar, setBordrolar] = useState<Pick<Bordro, 'personel_id' | 'odendi'>[]>([])
  const [puantajlar, setPuantajlar] = useState<Pick<Puantaj, 'personel_id' | 'tarih' | 'saat'>[]>([])
  const [tatiller, setTatiller] = useState<Tatil[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Denetçi Durumu State
  const [denetciDurumu, setDenetciDurumu] = useState<'yukleniyor' | 'aktif' | 'yok' | 'beklemede'>('yukleniyor')
  const [showDenetciModal, setShowDenetciModal] = useState(false)
  const [talepForm, setTalepForm] = useState({ ad_soyad: '', email: '', telefon: '', notlar: '', il_id: 0 })
  const [talepGonderiliyor, setTalepGonderiliyor] = useState(false)
  const [iller, setIller] = useState<{ id: number; ad: string }[]>([])

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
      supabase.from('ogrenciler').select('id,ad,soyad,aktif,ucretsiz_mi,kardes_indirimi,gunluk_saat,ogrenci_turu').eq('okul_id', okul?.id),
      supabase.from('tahsilat').select('ogrenci_id,tutar').eq('ay', ay).eq('yil', yil).eq('okul_id', okul?.id),
      supabase.from('tahsilat').select('ogrenci_id,tutar').eq('ay', prevMonth).eq('yil', prevYear).eq('okul_id', okul?.id),
      supabase.from('hesap_hareketleri').select('tur,tutar,ay,yil').eq('okul_id', okul?.id),
      supabase.from('ayarlar').select('*').eq('okul_id', okul?.id).single(),
      supabase.from('tatiller').select('*').or(`okul_id.eq.${okul?.id ?? 0},okul_id.is.null`),
      supabase.from('personel').select('id,ad,aktif,iban,tc').eq('okul_id', okul?.id),
      supabase.from('siniflar').select('kapasite').eq('aktif', true).eq('okul_id', okul?.id),
      supabase.from('bordro').select('personel_id,odendi').eq('ay', ay).eq('yil', yil).eq('okul_id', okul?.id)
    ])

    let pua: Pick<Puantaj, 'personel_id' | 'tarih' | 'saat'>[] = []
    if (per && per.length > 0) {
      const { data } = await supabase.from('puantaj')
        .select('personel_id,tarih,saat')
        .in('personel_id', per.map(p => p.id))
        .gte('tarih', startDate).lte('tarih', endDate)
      pua = data || []
    }

    const filteredOgr = (ogr || []).filter(o => {
      if (o.aktif !== false) return true;
      const hasCurrentTah = (tah || []).some(t => t.ogrenci_id === o.id);
      const hasPrevTah = (prevTah || []).some(t => t.ogrenci_id === o.id);
      return hasCurrentTah || hasPrevTah;
    })

    const filteredPer = (per || []).filter(p => {
      if (p.aktif !== false) return true;
      const hasPuantaj = pua.some(x => x.personel_id === p.id && Number(x.saat) > 0);
      const hasBordro = (brd || []).some(b => b.personel_id === p.id);
      return hasPuantaj || hasBordro;
    })

    setOgrenciler(filteredOgr.filter(kulupOgrencisi))
    setTahsilatlar((tah || []) as unknown as Tahsilat[])
    setPrevTahsilatlar((prevTah || []) as unknown as Tahsilat[])
    setHareketler((hh || []) as unknown as HesapHareketi[])
    setAyarlar(ayr)
    setTatiller(tat || [])
    setPersonel(filteredPer as unknown as Personel[])
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
      uyari('Lütfen ilinizi seçin.')
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
        uyari(body.error || 'Talep gönderilirken bir hata oluştu.')
      }
    } catch {
      uyari('Talep gönderilirken bir hata oluştu.')
    } finally {
      setTalepGonderiliyor(false)
    }
  }

  useYukleme(() => {
    loadData()
    loadDuyuru()
  }, [loadData, loadDuyuru])

  useYukleme(() => {
    if (session?.access_token) checkDenetciDurumu(session.access_token)
  }, [session?.access_token, checkDenetciDurumu])

  function odenen(o: Ogrenci) {
    return tahsilatlar.filter(t => t.ogrenci_id === o.id).reduce((s, t) => s + Number(t.tutar), 0)
  }

  const getGereken = useCallback((o: Ogrenci) => {
    const hasPayment = tahsilatlar.some(t => t.ogrenci_id === o.id)
    if (o.ucretsiz_mi || (o.aktif === false && !hasPayment)) return 0
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
  }, [ay, yil, ayarlar, tatiller, tahsilatlar])

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
    // Deneme sürümündeki kurumlara ödeme baskısı yapma — sadece kalan günü bilgi olarak göster
    if (okul.odeme_durumu === 'deneme') return { kalanGun, seviye: 'deneme' as const }
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

  // ---- Atlas genel bakış: görünüm için türetilen değerler ----
  const son6 = (() => {
    const liste: { ay: number; yil: number }[] = []
    let tAy = ay, tYil = yil
    for (let i = 0; i < 6; i++) { liste.push({ ay: tAy, yil: tYil }); tAy--; if (tAy === 0) { tAy = 12; tYil-- } }
    return liste.reverse().map(m => ({
      ...m,
      gelir: hareketler.filter(h => h.tur === 'gelir' && h.ay === m.ay && h.yil === m.yil).reduce((s, h) => s + Number(h.tutar), 0),
      gider: hareketler.filter(h => h.tur === 'gider' && h.ay === m.ay && h.yil === m.yil).reduce((s, h) => s + Number(h.tutar), 0),
    }))
  })()
  const buAy = son6[son6.length - 1]
  const buAyNet = buAy.gelir - buAy.gider
  const grafikMax = (() => {
    const m = Math.max(...son6.flatMap(d => [d.gelir, d.gider]), 1)
    const us = Math.pow(10, Math.floor(Math.log10(m)))
    return Math.ceil(m / us * 2) / 2 * us || 1
  })()
  const kisalt = (v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(1).replace('.', ',')} Mn` : v >= 1e3 ? `${Math.round(v / 1e3)} B` : `${Math.round(v)}`
  const GRAFIK_H = 200
  const tlTam = (v: number) => `₺${Math.round(v).toLocaleString('tr-TR')}`

  const tatilListesi = (() => {
    const dbTatiller = tatiller.filter(t => new Date(t.baslangic_tarihi).getMonth() + 1 === ay && new Date(t.baslangic_tarihi).getFullYear() === yil).map(t => ({ ad: t.ad, gun: new Date(t.baslangic_tarihi).getDate(), tip: 'Tatil / etkinlik' }))
    const rtNames: Record<string, string> = { '01-01': 'Yılbaşı', '04-23': '23 Nisan Çocuk B.', '05-01': '1 Mayıs', '05-19': '19 Mayıs', '07-15': '15 Temmuz', '08-30': '30 Ağustos', '10-29': '29 Ekim' }
    const rtList = RESMI_TATILLER.filter(rt => Number(rt.split('-')[0]) === ay).map(rt => ({ ad: rtNames[rt] || 'Resmi tatil', gun: Number(rt.split('-')[1]), tip: 'Resmi tatil' }))
    return [...dbTatiller, ...rtList].sort((a, b) => a.gun - b.gun).slice(0, 4)
  })()
  const ayKisa = ayLabel(ay, yil).split(' ')[0].slice(0, 3).toLocaleUpperCase('tr-TR')

  const personelKarnesi = personel.map(p => ({
    ...p,
    pSaat: puantajlar.filter(x => x.personel_id === p.id && !tatilMi(ay, new Date(x.tarih).getDate(), yil, tatiller)).reduce((s, x) => s + (Number(x.saat) || 0), 0),
  })).filter(p => p.pSaat > 0).sort((a, b) => b.pSaat - a.pSaat).slice(0, 5)
  const maxSaat = Math.max(...personelKarnesi.map(p => p.pSaat), 1)

  const kpis = [
    {
      label: 'Tahsilat verimi', value: `%${tahsilatYuzdesi}`,
      chip: `${tahsilatTrendi >= 0 ? '+' : '−'}%${Math.abs(tahsilatTrendi)}`, chipOk: tahsilatTrendi >= 0,
      bar: tahsilatYuzdesi, barColor: 'var(--accent)',
      sub: `${tlTam(toplamTahsilat)} / ${tlTam(toplamBeklenen)}`,
    },
    {
      label: 'Kapasite doluluğu', value: `%${kapasiteYuzdesi}`,
      chip: `${aktifOgrenci} / ${toplamKapasite}`, chipOk: null as boolean | null,
      bar: kapasiteYuzdesi, barColor: 'var(--accent)',
      sub: toplamKapasite > aktifOgrenci ? `${toplamKapasite - aktifOgrenci} boş kontenjan` : 'Kontenjan dolu',
    },
    {
      label: 'Bordro döngüsü', value: bordroDurumu === 2 ? 'Ödendi' : bordroDurumu === 1 ? 'Tahakkuk edildi' : 'Bekleniyor',
      chip: `${bordrolar.length} kayıt`, chipOk: bordroDurumu > 0 ? true : null,
      bar: bordroDurumu === 2 ? 100 : bordroDurumu === 1 ? 60 : 8, barColor: bordroDurumu > 0 ? 'var(--success)' : 'var(--warn)',
      sub: bordroDurumu > 0 ? `${ayLabel(ay, yil)} dönemi` : 'Veri girişi bekleniyor',
    },
    {
      label: 'Net bakiye', value: tlTam(netBakiye),
      chip: `${buAyNet >= 0 ? '+' : '−'}${tlTam(Math.abs(buAyNet))}`, chipOk: buAyNet >= 0,
      bar: -1, barColor: '',
      sub: 'Tüm hareketlerin toplamı',
    },
  ]

  const chipStyle = (ok: boolean | null): React.CSSProperties => ({
    fontSize: 11.5, fontWeight: 600, padding: '2px 7px', borderRadius: 5, whiteSpace: 'nowrap',
    background: ok === null ? '#eef0f4' : ok ? 'var(--success-light)' : 'var(--danger-light)',
    color: ok === null ? 'var(--text2)' : ok ? '#0b6b42' : '#a91f26',
  })
  const panel: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }
  const panelTitle: React.CSSProperties = { fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em', margin: 0, color: 'var(--text)' }
  const tone = (t: string) => t === 'danger' || t === 'alert' ? 'var(--danger)' : t === 'warning' || t === 'warn' ? 'var(--warn)' : 'var(--accent)'

  // Üst şerit bildirimleri: tek satır, sakin
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '24px 32px 40px' }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* BAŞLIK */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12.5, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', animation: 'pulse 2s infinite' }} />
              {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, margin: 0, letterSpacing: '-0.03em', color: 'var(--text)' }}>
              Hoş geldiniz, {profil?.ad?.split(' ')[0] || 'Yönetici'}
            </h1>
            <div style={{ color: 'var(--text3)', marginTop: 3, fontSize: 13.5 }}>{ayLabel(ay, yil)} · tahsilat, kapasite ve bordro durumunuzun özeti</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: 280 }}>
              <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', display: 'flex' }}><Search size={15} /></span>
              <input
                type="text"
                aria-label="Öğrenci veya personel ara"
                placeholder="Öğrenci veya personel ara"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: 34, height: 36 }}
              />
              {filteredResults.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', boxShadow: 'var(--shadow-float)', padding: 6, zIndex: 1000 }}>
                  {filteredResults.map(item => (
                    <Link key={`${item.type}-${item.id}`} href={item.type === 'ogrenci' ? `/ogrenciler?id=${item.id}` : `/personel?id=${item.id}`} style={{ textDecoration: 'none' }}>
                      <div className="sidebar-link" style={{ padding: '8px 10px', borderRadius: 7, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                        <div style={{ width: 28, height: 28, background: item.type === 'ogrenci' ? 'var(--accent-lighter)' : 'var(--warn-light)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.type === 'ogrenci' ? 'var(--accent)' : 'var(--warn)' }}>
                          {item.type === 'ogrenci' ? <GraduationCap size={15} /> : <UserCheck size={15} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.ad}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.type === 'ogrenci' ? 'Öğrenci' : 'Personel'}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="tabular" style={{ ...panel, height: 36, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 8, fontSize: 14, fontWeight: 500 }}>
              <Clock size={15} color="var(--text3)" />
              <Saat />
            </div>
            <Link href="/odeme" className="btn btn-secondary" style={{ textDecoration: 'none' }}>Tahsilat al</Link>
            <Link href="/ogrenciler" className="btn btn-primary" style={{ textDecoration: 'none' }}><PlusCircle size={15} />Yeni öğrenci</Link>
          </div>
        </header>

        {/* BİLDİRİMLER */}
        {(duyuru || lisansBitisBanner || denetciDurumu === 'yok' || denetciDurumu === 'beklemede') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {duyuru && (
              <Banner
                color={tone(duyuru.tur)}
                bg={duyuru.tur === 'danger' ? 'var(--danger-light)' : duyuru.tur === 'warning' ? 'var(--warn-light)' : 'var(--info-light)'}
                border={duyuru.tur === 'danger' ? 'var(--danger-border)' : duyuru.tur === 'warning' ? 'var(--warn-border)' : 'var(--info-border)'}
                icon={<Megaphone size={16} />} title={duyuru.baslik}
              >{duyuru.icerik}</Banner>
            )}
            {lisansBitisBanner?.seviye === 'deneme' && (
              <Banner color="var(--accent)" bg="var(--accent-lighter)" border="#c9d4fa" icon={<Info size={16} />} title="Ücretsiz deneme sürümündesiniz."
                action={<Link href="/odeme-yap" style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-dark)', textDecoration: 'underline' }}>Planları gör</Link>}
              >Tüm özellikleri <strong>{lisansBitisBanner.kalanGun} gün</strong> boyunca ücretsiz kullanabilirsiniz.</Banner>
            )}
            {lisansBitisBanner && lisansBitisBanner.seviye !== 'deneme' && (
              <Banner
                color={lisansBitisBanner.seviye === 'kritik' ? 'var(--danger)' : 'var(--warn)'}
                bg={lisansBitisBanner.seviye === 'kritik' ? 'var(--danger-light)' : 'var(--warn-light)'}
                border={lisansBitisBanner.seviye === 'kritik' ? 'var(--danger-border)' : 'var(--warn-border)'}
                icon={<AlertTriangle size={16} />} title="Lisans süresi uyarısı."
                action={<Link href="/odeme-yap" className={`btn btn-sm ${lisansBitisBanner.seviye === 'kritik' ? 'btn-danger' : 'btn-warn'}`} style={{ textDecoration: 'none' }}>Yenile</Link>}
              >Kesintisiz kullanım için <strong>{lisansBitisBanner.kalanGun} gün</strong> içinde yenileme yapmalısınız.</Banner>
            )}
            {denetciDurumu === 'yok' && (
              <Banner color="var(--accent)" bg="var(--accent-lighter)" border="#c9d4fa" icon={<ShieldCheck size={16} />} title="Denetçi paneliniz henüz aktif değil."
                action={<button onClick={openDenetciModal} className="btn btn-primary btn-sm">Talep oluştur</button>}
              >İlinize ait denetim mekanizmasını başlatmak için talep oluşturabilirsiniz.</Banner>
            )}
            {denetciDurumu === 'beklemede' && (
              <Banner color="var(--info)" bg="var(--info-light)" border="var(--info-border)" icon={<ShieldCheck size={16} />} title="Denetçi paneli talebi beklemede.">
                Talebiniz inceleniyor, onaylandığında paneliniz aktif olacak.
              </Banner>
            )}
          </div>
        )}

        {/* KPI ŞERİDİ */}
        <section style={{ ...panel, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {kpis.map((k, i) => (
            <div key={k.label} style={{ padding: '16px 20px', borderLeft: i === 0 ? 'none' : '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12.5, color: 'var(--text3)', fontWeight: 500 }}>{k.label}</span>
                <span className="tabular" style={chipStyle(k.chipOk)}>{k.chip}</span>
              </div>
              <div className="tabular" style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1, marginTop: 8, color: 'var(--text)' }}>{k.value}</div>
              {k.bar >= 0 ? (
                <div style={{ height: 4, borderRadius: 2, background: '#eef0f4', marginTop: 12, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(k.bar, 100)}%`, height: '100%', background: k.barColor, borderRadius: 2 }} />
                </div>
              ) : <div style={{ height: 4, marginTop: 12 }} />}
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text3)' }}>{k.sub}</div>
            </div>
          ))}
        </section>

        {/* GRAFİK + AKILLI TAKİP */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
          <section style={{ ...panel, padding: '18px 20px', gridColumn: 'span 2', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <h3 style={panelTitle}>Finansal akış</h3>
                <div style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 2 }}>Son 6 aylık gelir ve gider</div>
              </div>
              <div style={{ display: 'flex', gap: 22, textAlign: 'right' }}>
                <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Gelir</div><div className="tabular" style={{ fontSize: 15, fontWeight: 500, color: 'var(--accent)' }}>{tlTam(buAy.gelir)}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Gider</div><div className="tabular" style={{ fontSize: 15, fontWeight: 500 }}>{tlTam(buAy.gider)}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Net</div><div className="tabular" style={{ fontSize: 15, fontWeight: 500, color: buAyNet >= 0 ? 'var(--success)' : 'var(--danger)' }}>{buAyNet >= 0 ? '+' : '−'}{tlTam(Math.abs(buAyNet))}</div></div>
              </div>
            </div>

            <div style={{ display: 'flex', marginTop: 18 }}>
              <div className="tabular" style={{ width: 46, height: GRAFIK_H, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 10, fontSize: 10.5, color: 'var(--text3)' }}>
                {[1, 0.75, 0.5, 0.25, 0].map(f => <span key={f}>{f === 0 ? '0' : kisalt(grafikMax * f)}</span>)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ position: 'relative', height: GRAFIK_H }}>
                  <div aria-hidden style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    {[0, 1, 2, 3].map(i => <div key={i} style={{ borderTop: '1px dashed var(--border)' }} />)}
                    <div style={{ borderTop: '1px solid var(--border-strong)' }} />
                  </div>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around' }}>
                    {son6.map((d, i) => (
                      <div key={`${d.ay}-${d.yil}`} style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }} title={`${ayLabel(d.ay, d.yil)} · Gelir ${tlTam(d.gelir)} · Gider ${tlTam(d.gider)}`}>
                        <div style={{ width: 24, height: Math.max((d.gelir / grafikMax) * GRAFIK_H, d.gelir > 0 ? 3 : 0), background: i === son6.length - 1 ? 'var(--accent)' : '#8ea3ee', borderRadius: '3px 3px 0 0' }} />
                        <div style={{ width: 24, height: Math.max((d.gider / grafikMax) * GRAFIK_H, d.gider > 0 ? 3 : 0), background: '#c5cad3', borderRadius: '3px 3px 0 0' }} />
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 8, fontSize: 11.5, color: 'var(--text3)' }}>
                  {son6.map((d, i) => <span key={`l-${d.ay}-${d.yil}`} style={{ width: 52, textAlign: 'center', fontWeight: i === son6.length - 1 ? 600 : 400, color: i === son6.length - 1 ? 'var(--text)' : undefined }}>{ayLabel(d.ay, d.yil).split(' ')[0].slice(0, 3)}</span>)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-light)', fontSize: 12.5, color: 'var(--text2)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent)' }} />Gelirler</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#c5cad3' }} />Giderler</span>
            </div>
          </section>

          <section style={{ ...panel, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={panelTitle}>Akıllı takip</h3>
              {uyarilar.length > 0 && <span style={{ ...chipStyle(false) }}>{uyarilar.length} açık madde</span>}
            </div>
            {uyarilar.length === 0 ? (
              <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--text3)' }}>
                <CheckCircle2 size={26} color="var(--success)" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Her şey yolunda</div>
                <div style={{ fontSize: 12.5, marginTop: 2 }}>Şu an dikkat gerektiren bir madde yok.</div>
              </div>
            ) : uyarilar.map((u, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--border-light)', alignItems: 'center' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: tone(u.type), flexShrink: 0 }} />
                <div style={{ flex: 1, fontWeight: 500, lineHeight: 1.4 }}>{u.text}</div>
                {u.link && <Link href={u.link} style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}>Yönet →</Link>}
              </div>
            ))}
          </section>
        </div>

        {/* PERSONEL + HIZLI İŞLEMLER + TATİLLER */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, alignItems: 'start' }}>
          <section style={{ ...panel, gridColumn: 'span 2', overflow: 'hidden', minWidth: 0 }}>
            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
              <h3 style={panelTitle}>Aktif personel karnesi</h3>
              <Link href="/bordro" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>Tümünü gör →</Link>
            </div>
            {personelKarnesi.length === 0 ? (
              <div style={{ padding: '28px 20px', textAlign: 'center', fontSize: 13, color: 'var(--text3)' }}>Bu ay için puantaj girişi yok.</div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '32px 2fr 3fr 70px', gap: 12, padding: '8px 20px', background: '#f8f9fb', fontSize: 11, fontWeight: 600, letterSpacing: '0.7px', textTransform: 'uppercase', color: 'var(--text3)' }}>
                  <span>#</span><span>Personel</span><span>Aylık ders saati</span><span style={{ textAlign: 'right' }}>Saat</span>
                </div>
                {personelKarnesi.map((p, idx) => (
                  <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '32px 2fr 3fr 70px', gap: 12, padding: '11px 20px', borderTop: '1px solid var(--border-light)', alignItems: 'center' }}>
                    <span className="tabular" style={{ fontSize: 12, color: 'var(--text3)' }}>{String(idx + 1).padStart(2, '0')}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#eef0f4', color: 'var(--text2)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {String(p.ad || '?').split(' ').map((w: string) => w[0]).filter(Boolean).slice(0, 2).join('').toLocaleUpperCase('tr-TR')}
                      </span>
                      <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.ad}</span>
                    </span>
                    <span style={{ height: 6, background: '#eef0f4', borderRadius: 3, overflow: 'hidden' }}>
                      <span style={{ display: 'block', height: '100%', width: `${(p.pSaat / maxSaat) * 100}%`, background: 'var(--accent)', borderRadius: 3 }} />
                    </span>
                    <span className="tabular" style={{ textAlign: 'right', fontWeight: 500 }}>{p.pSaat}</span>
                  </div>
                ))}
              </>
            )}
          </section>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            <section style={{ ...panel, padding: '16px 18px' }}>
              <h3 style={{ ...panelTitle, marginBottom: 12 }}>Hızlı işlemler</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Öğrenci kaydı', icon: <PlusCircle size={16} />, link: '/ogrenciler', desc: 'Yeni kayıt' },
                  { label: 'Tahsilat', icon: <TrendingUp size={16} />, link: '/odeme', desc: 'Aidat alımı' },
                  { label: 'Bordro', icon: <FileText size={16} />, link: '/bordro', desc: 'Maaş işlemleri' },
                  { label: 'Ayarlar', icon: <Settings size={16} />, link: '/ayarlar', desc: 'Parametreler' },
                ].map(a => (
                  <Link key={a.link} href={a.link} className="sidebar-link" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 11px', border: '1px solid var(--border)', borderRadius: 8, background: '#fbfbfc', color: 'var(--text)' }}>
                    <span style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--accent-lighter)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{a.icon}</span>
                    <span style={{ minWidth: 0 }}><span style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>{a.label}</span><span style={{ fontSize: 11.5, color: 'var(--text3)' }}>{a.desc}</span></span>
                  </Link>
                ))}
              </div>
            </section>

            <section style={{ ...panel, padding: '16px 18px' }}>
              <h3 style={{ ...panelTitle, marginBottom: 6 }}>Bu ayın tatilleri</h3>
              {tatilListesi.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text3)', padding: '8px 0' }}>Bu ay için kayıtlı tatil yok.</div>
              ) : tatilListesi.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-light)' }}>
                  <div style={{ width: 40, height: 44, border: '1px solid var(--border)', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1.1, flexShrink: 0 }}>
                    <span className="tabular" style={{ fontSize: 15, fontWeight: 500 }}>{t.gun}</span>
                    <span style={{ fontSize: 9.5, letterSpacing: '0.6px', color: 'var(--text3)' }}>{ayKisa}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.ad}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{t.tip}</div>
                  </div>
                </div>
              ))}
            </section>
          </div>
        </div>
      </div>

      {/* Denetçi talep penceresi */}
      {showDenetciModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-box" style={{ padding: 24, maxWidth: 480 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>Denetçi paneli talebi</h2>
            <p style={{ color: 'var(--text3)', fontSize: 13, margin: '0 0 18px', lineHeight: 1.5 }}>İlinizdeki yetkili denetçinin (MEB / İl-İlçe Milli Eğitim) bilgilerini girerek panelin açılmasını talep edebilirsiniz.</p>

            <form onSubmit={handleTalepGonder} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {okul?.il_id ? (
                <div className="alert alert-success" style={{ marginBottom: 0 }}>İl sistem tarafından otomatik algılandı.</div>
              ) : (
                <div>
                  <label className="form-label">İl <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select required className="form-select" value={talepForm.il_id || ''} onChange={e => setTalepForm({ ...talepForm, il_id: Number(e.target.value) })}>
                    <option value="">İl seçiniz…</option>
                    {iller.map(il => <option key={il.id} value={il.id}>{il.ad}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="form-label">Denetçi ad soyad</label>
                <input type="text" required className="form-input" value={talepForm.ad_soyad} onChange={e => setTalepForm({ ...talepForm, ad_soyad: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">E-posta</label>
                  <input type="email" required className="form-input" value={talepForm.email} onChange={e => setTalepForm({ ...talepForm, email: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Telefon</label>
                  <input type="tel" className="form-input" value={talepForm.telefon} onChange={e => setTalepForm({ ...talepForm, telefon: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="form-label">Notlar (isteğe bağlı)</label>
                <textarea rows={3} className="form-input" value={talepForm.notlar} onChange={e => setTalepForm({ ...talepForm, notlar: e.target.value })} placeholder="Eklemek istediğiniz bilgiler…" />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowDenetciModal(false)}>Vazgeç</button>
                <button type="submit" className="btn btn-primary" disabled={talepGonderiliyor}>{talepGonderiliyor ? 'Gönderiliyor…' : 'Talebi gönder'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
