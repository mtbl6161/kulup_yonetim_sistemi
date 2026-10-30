'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAy } from '@/lib/AyContext'
import { supabase } from '@/lib/supabase'
import { ayLabel, isGunuSayisi, RESMI_TATILLER, AYLAR, isOgretmen } from '@/lib/hesaplama'
import { Ogrenci, Tahsilat, HesapHareketi, Ayarlar, Personel, kulupOgrencisi, Sinif, Bordro, Puantaj, Tatil } from '@/lib/types'
import { kulupAySonuBakiye } from '@/lib/isletmeDefteri'
import { belgeDonemde, donemBelgeleriniGetir, TESLIM_DURUM_ETIKET, type DenetimMadde, type DenetimBelge, type DenetimTeslim } from '@/lib/denetimDosyasi'
import Link from 'next/link'

import { useAuth } from '@/lib/AuthContext'
import { uyari } from '@/lib/diyalog'
import {
  CheckCircle2, PlusCircle, UserCheck, AlertTriangle, Megaphone, GraduationCap, ShieldCheck, Search, Info,
} from 'lucide-react'
import { useYukleme } from '@/lib/useYukleme'

/** Vergi/SGK son günü hafta sonuna ya da resmî tatile denk gelirse ilk iş gününe kayar */
function isGununeKaydir(yil: number, ay: number, gun: number): Date {
  const d = new Date(yil, ay - 1, gun)
  const tatil = (t: Date) => t.getDay() === 0 || t.getDay() === 6 || RESMI_TATILLER.includes(`${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`)
  while (tatil(d)) d.setDate(d.getDate() + 1)
  return d
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
  const [bordrolar, setBordrolar] = useState<Pick<Bordro, 'personel_id'>[]>([])
  const [tatiller, setTatiller] = useState<Tatil[]>([])
  const [puantajliPersonel, setPuantajliPersonel] = useState<Set<number>>(new Set())
  const [banka, setBanka] = useState<{ bakiye: number; ayNet: number } | null>(null)
  const [denetim, setDenetim] = useState<{ maddeler: DenetimMadde[]; teslim: DenetimTeslim | null; belgeler: DenetimBelge[] } | null>(null)
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
      { data: brd },
      bankaDurumu,
      denetimDurumu,
    ] = await Promise.all([
      supabase.from('ogrenciler').select('id,ad,soyad,aktif,ucretsiz_mi,kardes_indirimi,gunluk_saat,ogrenci_turu').eq('okul_id', okul?.id),
      supabase.from('tahsilat').select('ogrenci_id,tutar').eq('ay', ay).eq('yil', yil).eq('okul_id', okul?.id),
      supabase.from('tahsilat').select('ogrenci_id,tutar').eq('ay', prevMonth).eq('yil', prevYear).eq('okul_id', okul?.id),
      supabase.from('hesap_hareketleri').select('tur,tutar,ay,yil').eq('okul_id', okul?.id),
      supabase.from('ayarlar').select('*').eq('okul_id', okul?.id).single(),
      supabase.from('tatiller').select('*').or(`okul_id.eq.${okul?.id ?? 0},okul_id.is.null`),
      supabase.from('personel').select('id,ad,aktif,iban,tc,gorev').eq('okul_id', okul?.id),
      supabase.from('siniflar').select('kapasite').eq('aktif', true).eq('okul_id', okul?.id),
      supabase.from('bordro').select('personel_id').eq('ay', ay).eq('yil', yil).eq('okul_id', okul?.id),
      // Kartlardan biri yüklenemezse (ör. migration eksik) panelin geri kalanı yine açılır
      kulupAySonuBakiye(yil, ay).catch(() => null),
      (async () => {
        const [m, t, b] = await Promise.all([
          supabase.from('denetim_maddeleri').select('*').eq('aktif', true).order('sira_no'),
          supabase.from('denetim_teslimleri').select('*').eq('okul_id', okul.id).eq('yil', yil).eq('ay', ay).maybeSingle(),
          donemBelgeleriniGetir(okul.id, yil, ay),
        ])
        if (m.error) throw m.error
        return { maddeler: (m.data || []) as DenetimMadde[], teslim: (t.data as DenetimTeslim) || null, belgeler: b }
      })().catch(() => null),
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
    setPuantajliPersonel(new Set(pua.filter(x => Number(x.saat) > 0).map(x => x.personel_id)))
    setBanka(bankaDurumu)
    setDenetim(denetimDurumu)
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

  // Bordro ekranında "ödendi" işaretlenmediği için yalnızca tahakkuk var/yok ayrımı yapılır
  const bordroDurumu = bordrolar.length > 0 ? 1 : 0

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

  const borclular = ogrenciler
    .filter(o => o.aktif !== false)
    .map(o => { const gereken = getGereken(o), od = odenen(o); return { o, gereken, odenen: od, borc: gereken - od } })
    .filter(b => b.gereken > 0 && b.borc > 1)
    .sort((a, b) => b.borc - a.borc)
  const borcluSayisi = borclular.length
  const toplamBorc = borclular.reduce((s, b) => s + b.borc, 0)

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

  const tatilListesi: { ad: string; gun: number; tip: string; sonGun?: boolean }[] = (() => {
    const buAy = tatiller.filter(t => new Date(t.baslangic_tarihi).getMonth() + 1 === ay && new Date(t.baslangic_tarihi).getFullYear() === yil)
    const ayGun = (gun: number) => `${String(ay).padStart(2, '0')}-${String(gun).padStart(2, '0')}`
    const dbTatiller = buAy.map(t => {
      const gun = new Date(t.baslangic_tarihi).getDate()
      return { ad: t.ad, gun, tip: RESMI_TATILLER.includes(ayGun(gun)) ? 'Resmi tatil' : 'Tatil / etkinlik' }
    })
    // Aynı günü kapsayan kayıtlı tatil varsa (ör. "29 Ekim Cumhuriyet Bayramı") sabit listedeki resmî tatil ikinci kez gösterilmez
    const kayitli = (gun: number) => {
      const iso = `${yil}-${ayGun(gun)}`
      return buAy.some(t => t.baslangic_tarihi.slice(0, 10) <= iso && iso <= (t.bitis_tarihi || t.baslangic_tarihi).slice(0, 10))
    }
    const rtNames: Record<string, string> = { '01-01': 'Yılbaşı', '04-23': '23 Nisan Çocuk B.', '05-01': '1 Mayıs', '05-19': '19 Mayıs', '07-15': '15 Temmuz', '08-30': '30 Ağustos', '10-29': '29 Ekim' }
    const rtList = RESMI_TATILLER.filter(rt => Number(rt.split('-')[0]) === ay && !kayitli(Number(rt.split('-')[1]))).map(rt => ({ ad: rtNames[rt] || 'Resmi tatil', gun: Number(rt.split('-')[1]), tip: 'Resmi tatil' }))
    return [...dbTatiller, ...rtList]
  })()
  // Takvim: tatiller + önceki ayın muhtasar ve prim hizmet beyannamesi (MUHSGK) son günü (ayın 26'sı, iş gününe kayar)
  const muhsgk = isGununeKaydir(yil, ay, 26)
  const takvim = [
    ...tatilListesi,
    ...(muhsgk.getMonth() + 1 === ay ? [{ ad: `${AYLAR[ay === 1 ? 12 : ay - 1]} MUHSGK beyannamesi`, gun: muhsgk.getDate(), tip: 'Muhtasar ve SGK son gün', sonGun: true }] : []),
  ].sort((a, b) => a.gun - b.gun).slice(0, 5)
  const kalanGun = (gun: number) => {
    const bugun = new Date(); bugun.setHours(0, 0, 0, 0)
    return Math.round((new Date(yil, ay - 1, gun).getTime() - bugun.getTime()) / 86400000)
  }
  const ayKisa = ayLabel(ay, yil).split(' ')[0].slice(0, 3).toLocaleUpperCase('tr-TR')

  // Denetim dosyası: evrak sayfasındaki "x/y madde hazır" ile aynı sayım
  const denetimOzet = (() => {
    if (!denetim || denetim.maddeler.length === 0) return null
    const { maddeler, teslim, belgeler } = denetim
    const acik = !teslim || teslim.durum === 'taslak' || teslim.durum === 'iade'
    const yuklu = (m: DenetimMadde) => belgeler.some(b => b.madde_id === m.id && belgeDonemde(b, m, yil, ay))
    const tamam = maddeler.filter(m => yuklu(m) || (m.tip === 'otomatik' && acik)).length
    const eksik = maddeler.filter(m => m.tip === 'yukleme' && m.zorunlu && !yuklu(m))
    const durum = teslim?.durum ?? 'taslak'
    return { tamam, toplam: maddeler.length, eksik, durum, not: teslim?.denetci_notu }
  })()

  // Akıllı takip: seçili ayın durumuna göre maddeler. Ayın ilk günlerinde erken uyarı vermemek için
  // zamana bağlı kurallar geçmiş aylarda hemen, içinde bulunulan ayda ancak ilgili günden sonra devreye girer.
  const simdi = new Date()
  const buAyMi = ay === simdi.getMonth() + 1 && yil === simdi.getFullYear()
  const gecmisAy = yil < simdi.getFullYear() || (yil === simdi.getFullYear() && ay < simdi.getMonth() + 1)
  const gunGecti = (gun: number) => gecmisAy || (buAyMi && simdi.getDate() > gun)
  const uyarilar: { text: string; type: 'alert' | 'warn' | 'info'; link?: string }[] = []

  if (denetimOzet?.durum === 'iade') uyarilar.push({ text: `Denetim dosyası iade edildi${denetimOzet.not ? `: ${denetimOzet.not}` : '.'}`, type: 'alert', link: '/evrak-dosyasi' })
  if (banka && banka.bakiye < 0) uyarilar.push({ text: `Bankada kalan eksiye düştü (${tlTam(banka.bakiye)}); işletme defterini kontrol edin.`, type: 'alert', link: '/kulup/isletme-defteri' })
  if (buAyMi && muhsgk.getMonth() + 1 === ay) {
    const k = kalanGun(muhsgk.getDate())
    if (k >= 0 && k <= 7) uyarilar.push({ text: `${AYLAR[ay === 1 ? 12 : ay - 1]} MUHSGK beyannamesinin son günü ${k === 0 ? 'bugün' : `${k} gün sonra`} (${muhsgk.getDate()} ${AYLAR[ay]}).`, type: k <= 3 ? 'alert' : 'warn', link: '/bordro' })
  }
  if (bordroDurumu === 0 && gunGecti(20)) uyarilar.push({ text: `${AYLAR[ay]} bordrosu tahakkuk edilmedi.`, type: 'alert', link: '/bordro' })
  if (borcluSayisi > 0) {
    const erken = buAyMi && simdi.getDate() <= 10
    uyarilar.push({ text: `${borcluSayisi} öğrencinin ${AYLAR[ay]} aidatı ${erken ? 'bekleniyor' : 'gecikmiş'} (toplam ${tlTam(toplamBorc)}).`, type: erken ? 'info' : 'warn', link: '/odeme' })
  }
  if (prevToplamTahsilat > 0 && tahsilatTrendi <= -20 && gunGecti(20)) uyarilar.push({ text: `Tahsilat geçen aya göre %${Math.abs(tahsilatTrendi)} düşük.`, type: 'warn', link: '/odeme' })
  // Yalnızca saatle ücret alanlar (öğretmen, usta öğretici); başkan, muhasebe, temizlik ve denetim dağıtım payı alır, puantajı olmaz
  const puantajsiz = personel.filter(p => p.aktif !== false && isOgretmen(p.gorev) && !puantajliPersonel.has(p.id)).length
  if (puantajsiz > 0 && gunGecti(20)) uyarilar.push({ text: `${puantajsiz} öğretmenin ${AYLAR[ay]} puantajı girilmedi.`, type: 'warn', link: '/puantaj' })
  if (denetimOzet?.durum === 'taslak') {
    if (denetimOzet.eksik.length > 0 && gunGecti(20)) uyarilar.push({ text: `Denetim dosyasında ${denetimOzet.eksik.length} zorunlu belge eksik.`, type: 'warn', link: '/evrak-dosyasi' })
    else if (denetimOzet.eksik.length === 0 && gunGecti(0)) uyarilar.push({ text: 'Denetim dosyası hazır, denetime gönderilebilir.', type: 'info', link: '/evrak-dosyasi' })
  }
  if (toplamKapasite > 0 && aktifOgrenci > toplamKapasite) uyarilar.push({ text: `Kontenjan aşıldı: ${aktifOgrenci} aktif öğrenci, ${toplamKapasite} kişilik kapasite.`, type: 'warn', link: '/siniflar' })
  const eksikBilgili = personel.filter(p => p.aktif !== false && (!p.iban || !p.tc)).length
  if (eksikBilgili > 0) uyarilar.push({ text: `${eksikBilgili} personelin IBAN veya TC bilgisi eksik.`, type: 'info', link: '/personel' })
  const onem = { alert: 0, warn: 1, info: 2 }
  uyarilar.sort((a, b) => onem[a.type] - onem[b.type])

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
      label: 'Bordro', value: bordroDurumu ? 'Tahakkuk edildi' : 'Bekleniyor',
      chip: `${bordrolar.length} kayıt`, chipOk: bordroDurumu > 0 ? true : null,
      bar: bordroDurumu ? 100 : 8, barColor: bordroDurumu > 0 ? 'var(--success)' : 'var(--warn)',
      sub: bordroDurumu > 0 ? `${ayLabel(ay, yil)} dönemi` : 'Veri girişi bekleniyor',
    },
    {
      label: 'Bankada kalan', value: banka ? tlTam(banka.bakiye) : '—',
      chip: banka ? `${banka.ayNet >= 0 ? '+' : '−'}${tlTam(Math.abs(banka.ayNet))}` : '—', chipOk: banka ? banka.ayNet >= 0 : null,
      bar: -1, barColor: '',
      sub: `${AYLAR[ay]} sonu · kulüp işletme defterine göre`,
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

        {/* GECİKEN ÖDEMELER + DENETİM DOSYASI + TAKVİM */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, alignItems: 'start' }}>
          <section style={{ ...panel, gridColumn: 'span 2', overflow: 'hidden', minWidth: 0 }}>
            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h3 style={panelTitle}>Ödemesi geciken öğrenciler</h3>
                {borcluSayisi > 0 && <span className="tabular" style={chipStyle(false)}>{borcluSayisi} öğrenci · {tlTam(toplamBorc)}</span>}
              </div>
              <Link href="/odeme" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>Ödeme Takibi →</Link>
            </div>
            {borcluSayisi === 0 ? (
              <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--text3)' }}>
                <CheckCircle2 size={26} color="var(--success)" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Geciken ödeme yok</div>
                <div style={{ fontSize: 12.5, marginTop: 2 }}>{ayLabel(ay, yil)} için ödemesi eksik öğrenci bulunmuyor.</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '32px 2fr 2fr 110px', gap: 12, padding: '8px 20px', background: '#f8f9fb', fontSize: 11, fontWeight: 600, letterSpacing: '0.7px', textTransform: 'uppercase', color: 'var(--text3)' }}>
                  <span>#</span><span>Öğrenci</span><span>Ödenen / aidat</span><span style={{ textAlign: 'right' }}>Kalan</span>
                </div>
                {borclular.slice(0, 6).map((b, idx) => (
                  <div key={b.o.id} style={{ display: 'grid', gridTemplateColumns: '32px 2fr 2fr 110px', gap: 12, padding: '10px 20px', borderTop: '1px solid var(--border-light)', alignItems: 'center' }}>
                    <span className="tabular" style={{ fontSize: 12, color: 'var(--text3)' }}>{String(idx + 1).padStart(2, '0')}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#eef0f4', color: 'var(--text2)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {[b.o.ad, b.o.soyad].map(w => (w || '').trim()[0]).filter(Boolean).join('').toLocaleUpperCase('tr-TR')}
                      </span>
                      <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.o.ad} {b.o.soyad}</span>
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', height: 6, background: '#eef0f4', borderRadius: 3, overflow: 'hidden' }}>
                        <span style={{ display: 'block', height: '100%', width: `${Math.min((b.odenen / b.gereken) * 100, 100)}%`, background: 'var(--accent)', borderRadius: 3 }} />
                      </span>
                      <span className="tabular" style={{ display: 'block', marginTop: 4, fontSize: 11.5, color: 'var(--text3)' }}>{tlTam(b.odenen)} / {tlTam(b.gereken)}</span>
                    </span>
                    <span className="tabular" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>{tlTam(b.borc)}</span>
                  </div>
                ))}
                {borcluSayisi > 6 && (
                  <Link href="/odeme" style={{ display: 'block', padding: '10px 20px', borderTop: '1px solid var(--border-light)', fontSize: 12.5, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>
                    +{borcluSayisi - 6} öğrenci daha →
                  </Link>
                )}
              </>
            )}
          </section>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            <section style={{ ...panel, padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <h3 style={panelTitle}>Denetim dosyası</h3>
                {denetimOzet && (
                  <span style={chipStyle(denetimOzet.durum === 'onaylandi' ? true : denetimOzet.durum === 'iade' ? false : null)}>{TESLIM_DURUM_ETIKET[denetimOzet.durum]}</span>
                )}
              </div>
              {!denetimOzet ? (
                <div style={{ fontSize: 13, color: 'var(--text3)' }}>{AYLAR[ay]} dosyası henüz hazırlanmadı.</div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span className="tabular" style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>{denetimOzet.tamam}/{denetimOzet.toplam}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--text3)' }}>madde hazır</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: '#eef0f4', marginTop: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${(denetimOzet.tamam / denetimOzet.toplam) * 100}%`, height: '100%', background: denetimOzet.tamam === denetimOzet.toplam ? 'var(--success)' : 'var(--accent)', borderRadius: 2 }} />
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.45, color: denetimOzet.durum === 'iade' ? 'var(--danger)' : 'var(--text2)' }}>
                    {denetimOzet.durum === 'iade' ? `Denetçi iade etti${denetimOzet.not ? `: ${denetimOzet.not}` : '.'}`
                      : denetimOzet.durum === 'gonderildi' ? 'Dosya denetçinin incelemesinde.'
                      : denetimOzet.durum === 'onaylandi' ? 'Dosya onaylandı.'
                      : denetimOzet.eksik.length === 0 ? 'Zorunlu belgeler tamam, denetime gönderilebilir.'
                      : `${denetimOzet.eksik.length} zorunlu belge yüklenmedi:`}
                  </div>
                  {(denetimOzet.durum === 'taslak' || denetimOzet.durum === 'iade') && denetimOzet.eksik.slice(0, 3).map(m => (
                    <div key={m.id} style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.sira_no}. {m.baslik}
                    </div>
                  ))}
                </>
              )}
              <Link href="/evrak-dosyasi" style={{ display: 'inline-block', marginTop: 12, fontSize: 12.5, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>Dosyaya git →</Link>
            </section>

            <section style={{ ...panel, padding: '16px 18px' }}>
              <h3 style={{ ...panelTitle, marginBottom: 6 }}>Bu ayın takvimi</h3>
              {takvim.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text3)', padding: '8px 0' }}>Bu ay için tatil veya son gün yok.</div>
              ) : takvim.map((t, i) => {
                const kalan = t.sonGun ? kalanGun(t.gun) : null
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-light)' }}>
                    <div style={{ width: 40, height: 44, border: `1px solid ${t.sonGun ? 'var(--warn)' : 'var(--border)'}`, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1.1, flexShrink: 0 }}>
                      <span className="tabular" style={{ fontSize: 15, fontWeight: 500 }}>{t.gun}</span>
                      <span style={{ fontSize: 9.5, letterSpacing: '0.6px', color: 'var(--text3)' }}>{ayKisa}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.ad}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{t.tip}</div>
                    </div>
                    {kalan != null && kalan >= 0 && kalan <= 31 && (
                      <span className="tabular" style={chipStyle(kalan <= 3 ? false : null)}>{kalan === 0 ? 'Bugün' : `${kalan} gün`}</span>
                    )}
                  </div>
                )
              })}
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
