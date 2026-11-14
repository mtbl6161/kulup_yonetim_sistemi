'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAy } from '@/lib/AyContext'
import { supabase } from '@/lib/supabase'
import { ayLabel, isGunuSayisi, RESMI_TATILLER, AYLAR, isOgretmen } from '@/lib/hesaplama'
import { Ogrenci, Tahsilat, HesapHareketi, Ayarlar, Personel, kulupOgrencisi, Sinif, Bordro, Puantaj, Tatil, type OkulBildirimi } from '@/lib/types'
import { kulupAySonuBakiye, kulupAySonuBakiyeleri } from '@/lib/isletmeDefteri'
import { belgeDonemde, donemBelgeleriniGetir, TESLIM_DURUM_ETIKET, type DenetimMadde, type DenetimBelge, type DenetimTeslim } from '@/lib/denetimDosyasi'
import Link from 'next/link'

import { useAuth } from '@/lib/AuthContext'
import { uyari } from '@/lib/diyalog'
import {
  CheckCircle2, PlusCircle, UserCheck, AlertTriangle, Megaphone, GraduationCap, ShieldCheck, Search, Info,
  Check,
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
  const { okul, profil, session, demo } = useAuth()
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>([])
  const [tahsilatlar, setTahsilatlar] = useState<Tahsilat[]>([])
  const [prevTahsilatlar, setPrevTahsilatlar] = useState<Tahsilat[]>([])
  const [hareketler, setHareketler] = useState<HesapHareketi[]>([])
  const [ayarlar, setAyarlar] = useState<Ayarlar | null>(null)
  const [duyuru, setDuyuru] = useState<{ baslik: string; icerik: string; tur: 'info' | 'warning' | 'danger' | string } | null>(null)
  const [bildirimler, setBildirimler] = useState<OkulBildirimi[]>([])
  const [loading, setLoading] = useState(true)
  const [personel, setPersonel] = useState<Personel[]>([])
  const [siniflar, setSiniflar] = useState<Pick<Sinif, 'ad' | 'kapasite'>[]>([])
  const [bordrolar, setBordrolar] = useState<Pick<Bordro, 'personel_id' | 'net'>[]>([])
  // Bakiye eğrisi için ay sonu bakiyeleri: [önceki yıl 12 ay, bu yıl 12 ay] (yüklenemezse null)
  const [bakiyeSerisi, setBakiyeSerisi] = useState<number[] | null>(null)
  const [grafikAy, setGrafikAy] = useState<6 | 12>(6)
  const [grafikOdak, setGrafikOdak] = useState<number | null>(null)
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
      bakiyeler,
    ] = await Promise.all([
      supabase.from('ogrenciler').select('id,ad,soyad,sinif,aktif,ucretsiz_mi,kardes_indirimi,gunluk_saat,ogrenci_turu').eq('okul_id', okul?.id),
      supabase.from('tahsilat').select('ogrenci_id,tutar').eq('ay', ay).eq('yil', yil).eq('okul_id', okul?.id),
      supabase.from('tahsilat').select('ogrenci_id,tutar').eq('ay', prevMonth).eq('yil', prevYear).eq('okul_id', okul?.id),
      supabase.from('hesap_hareketleri').select('tur,tutar,ay,yil').eq('okul_id', okul?.id),
      supabase.from('ayarlar').select('*').eq('okul_id', okul?.id).single(),
      supabase.from('tatiller').select('*').or(`okul_id.eq.${okul?.id ?? 0},okul_id.is.null`),
      supabase.from('personel').select('id,ad,aktif,iban,tc,gorev').eq('okul_id', okul?.id),
      supabase.from('siniflar').select('ad,kapasite').eq('aktif', true).eq('okul_id', okul?.id),
      supabase.from('bordro').select('personel_id,net').eq('ay', ay).eq('yil', yil).eq('okul_id', okul?.id),
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
      // Önceki yıl yalnızca son 6 ay ona taştığında gerekir
      Promise.all([ay < 6 ? kulupAySonuBakiyeleri(yil - 1) : Promise.resolve(Array(12).fill(0)), kulupAySonuBakiyeleri(yil)])
        .then(([o, b]) => [...o, ...b]).catch(() => null),
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
    setBakiyeSerisi(bakiyeler)
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

  // Okula gelen bildirimler (migration_denetim_raporu.sql yoksa sessizce boş kalır)
  useYukleme(async () => {
    if (!okul?.id) return
    const { data } = await supabase.from('okul_bildirimleri').select('*').eq('okul_id', okul.id).eq('okundu', false).order('created_at', { ascending: false })
    const simdi = Date.now()
    setBildirimler((data || []).filter(b => !b.son_tarih || new Date(b.son_tarih).getTime() > simdi))
  }, [okul?.id])

  async function bildirimOkundu(id: number) {
    setBildirimler(x => x.filter(b => b.id !== id))
    await supabase.rpc('okul_bildirimi_okundu', { p_id: id })
  }

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
    // Demoda deneme süresi uyarısının yerini üstteki demo şeridi alır
    if (demo || !okul?.lisans_bitis) return null
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
  // Grafikte gösterilen aylar (6 ya da 12), en eskiden bu aya
  const seri = (() => {
    const liste: { ay: number; yil: number }[] = []
    let tAy = ay, tYil = yil
    for (let i = 0; i < grafikAy; i++) { liste.push({ ay: tAy, yil: tYil }); tAy--; if (tAy === 0) { tAy = 12; tYil-- } }
    return liste.reverse().map(m => {
      const gelir = hareketler.filter(h => h.tur === 'gelir' && h.ay === m.ay && h.yil === m.yil).reduce((s, h) => s + Number(h.tutar), 0)
      const gider = hareketler.filter(h => h.tur === 'gider' && h.ay === m.ay && h.yil === m.yil).reduce((s, h) => s + Number(h.tutar), 0)
      return { ...m, gelir, gider, net: gelir - gider }
    })
  })()
  const buAy = seri[seri.length - 1]
  const oncekiAy = seri[seri.length - 2]
  const buAyNet = buAy.net
  const grafikMax = (() => {
    const m = Math.max(...seri.flatMap(d => [d.gelir, d.gider]), 1)
    const us = Math.pow(10, Math.floor(Math.log10(m)))
    return Math.ceil(m / us * 2) / 2 * us || 1
  })()
  const kisalt = (v: number) => v >= 1e6 ? `${(v / 1e6).toFixed(1).replace('.', ',')} Mn` : v >= 1e3 ? `${Math.round(v / 1e3)} B` : `${Math.round(v)}`
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
  // Ayın ilk 10 günü aidat henüz "beklenen"dir, "geciken" değil
  const aidatErken = buAyMi && simdi.getDate() <= 10
  // Geçen ayla karşılaştırma, ay yeterince ilerlemeden yanıltıcıdır (ayın 5'inde "−%100")
  const trendAnlamli = gunGecti(20)

  if (denetimOzet?.durum === 'iade') uyarilar.push({ text: `Denetim dosyası iade edildi${denetimOzet.not ? `: ${denetimOzet.not}` : '.'}`, type: 'alert', link: '/evrak-dosyasi' })
  if (banka && banka.bakiye < 0) uyarilar.push({ text: `Bankada kalan eksiye düştü (${tlTam(banka.bakiye)}); işletme defterini kontrol edin.`, type: 'alert', link: '/kulup/isletme-defteri' })
  if (buAyMi && muhsgk.getMonth() + 1 === ay) {
    const k = kalanGun(muhsgk.getDate())
    if (k >= 0 && k <= 7) uyarilar.push({ text: `${AYLAR[ay === 1 ? 12 : ay - 1]} MUHSGK beyannamesinin son günü ${k === 0 ? 'bugün' : `${k} gün sonra`} (${muhsgk.getDate()} ${AYLAR[ay]}).`, type: k <= 3 ? 'alert' : 'warn', link: '/bordro' })
  }
  if (bordroDurumu === 0 && gunGecti(20)) uyarilar.push({ text: `${AYLAR[ay]} bordrosu tahakkuk edilmedi.`, type: 'alert', link: '/bordro' })
  if (borcluSayisi > 0) {
    uyarilar.push({ text: `${borcluSayisi} öğrencinin ${AYLAR[ay]} aidatı ${aidatErken ? 'bekleniyor' : 'gecikmiş'} (toplam ${tlTam(toplamBorc)}).`, type: aidatErken ? 'info' : 'warn', link: '/odeme' })
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

  const ayKisa3 = (a: number) => AYLAR[a].slice(0, 3)
  const degisim = (simdi: number, once: number) => (trendAnlamli && once > 0 ? Math.round(((simdi - once) / once) * 100) : null)

  // Bankada kalan: son 6 ayın ay sonu bakiyesi
  const bakiyeNoktalari = bakiyeSerisi ? Array.from({ length: 6 }, (_, i) => {
    let a = ay - 5 + i, y = yil
    if (a <= 0) { a += 12; y-- }
    return { ay: a, bakiye: bakiyeSerisi[(y === yil ? 12 : 0) + a - 1] }
  }) : null
  const bakiyeEgrisi = (() => {
    if (!bakiyeNoktalari) return null
    const v = bakiyeNoktalari.map(n => n.bakiye)
    const mn = Math.min(...v), mx = Math.max(...v), aralik = mx - mn || 1
    // Bakiye hiç değişmediyse çizgi ortada durur
    const pts = v.map((x, i) => [(i / (v.length - 1)) * 300, mx === mn ? 40 : 62 - ((x - mn) / aralik) * 52])
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
    return { d, alan: `${d} L300 70 L0 70Z` }
  })()

  // Tahsilat
  const ucretliOgrenciler = ogrenciler.filter(o => o.aktif !== false && getGereken(o) > 0)
  const odeyenSayisi = ucretliOgrenciler.filter(o => odenen(o) >= getGereken(o) - 1).length
  const tahsilatOrani = toplamBeklenen > 0 ? Math.min(toplamTahsilat / toplamBeklenen, 1) : 0

  // Şubeler: öğrencinin sınıf alanı şube adıyla eşleşir
  const subeler = siniflar
    .filter(c => (c.kapasite || 0) > 0)
    .map(c => ({ ad: c.ad, kapasite: c.kapasite || 0, mevcut: ogrenciler.filter(o => o.aktif !== false && o.sinif === c.ad).length }))
  const bosYer = Math.max(toplamKapasite - aktifOgrenci, 0)
  const tasanSube = subeler.filter(c => c.mevcut > c.kapasite).length

  // Bordro adımları: puantaj, tahakkuk, MUHSGK beyanı (bu ayın bordrosu ertesi ayın 26'sında beyan edilir)
  const ogretmenSayisi = personel.filter(p => p.aktif !== false && isOgretmen(p.gorev)).length
  const puantajTamam = ogretmenSayisi - personel.filter(p => p.aktif !== false && isOgretmen(p.gorev) && !puantajliPersonel.has(p.id)).length
  const netBordro = bordrolar.reduce((s, b) => s + Number(b.net || 0), 0)
  const beyanAy = ay === 12 ? 1 : ay + 1, beyanYil = ay === 12 ? yil + 1 : yil
  const beyanGunu = isGununeKaydir(beyanYil, beyanAy, 26)
  const beyanaKalan = Math.round((beyanGunu.getTime() - new Date(new Date().setHours(0, 0, 0, 0)).getTime()) / 86400000)
  const bordroAdimlari = (() => {
    const tamam = [ogretmenSayisi === 0 || puantajTamam >= ogretmenSayisi, bordroDurumu > 0, false]
    const ilkAcik = tamam.indexOf(false)
    const notlar = [
      ogretmenSayisi ? `${puantajTamam} / ${ogretmenSayisi}` : 'Gerekmiyor',
      bordroDurumu ? `${tlTam(netBordro)} net` : 'Bekleniyor',
      beyanaKalan >= 0 && beyanaKalan <= 45 ? `${beyanGunu.getDate()} ${ayKisa3(beyanAy)}, ${beyanaKalan === 0 ? 'bugün' : `${beyanaKalan} gün`}` : `${beyanGunu.getDate()} ${ayKisa3(beyanAy)}`,
    ]
    return ['Puantaj', 'Bordro tahakkuku', 'MUHSGK beyanı'].map((ad, i) => ({ ad, not: notlar[i], durum: tamam[i] ? 'tamam' as const : i === ilkAcik ? 'sirada' as const : 'bekliyor' as const }))
  })()

  const chipStyle = (ok: boolean | null): React.CSSProperties => ({
    fontSize: 12.5, fontWeight: 600, padding: '2px 7px', borderRadius: 5, whiteSpace: 'nowrap',
    background: ok === null ? '#eef0f4' : ok ? 'var(--success-light)' : 'var(--danger-light)',
    color: ok === null ? 'var(--text2)' : ok ? 'var(--success-dark)' : 'var(--danger-dark)',
  })
  const panel: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-card)' }
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
                        <div style={{ width: 28, height: 28, background: item.type === 'ogrenci' ? 'var(--accent-lighter)' : 'var(--coral-light)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.type === 'ogrenci' ? 'var(--accent)' : 'var(--accent2)' }}>
                          {item.type === 'ogrenci' ? <GraduationCap size={15} /> : <UserCheck size={15} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.ad}</div>
                          <div style={{ fontSize: 12, color: 'var(--text3)' }}>{item.type === 'ogrenci' ? 'Öğrenci' : 'Personel'}</div>
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
        {(duyuru || bildirimler.length > 0 || lisansBitisBanner || denetciDurumu === 'yok' || denetciDurumu === 'beklemede') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* İl denetçisinin duyuruları ve "denetim tamamlandı" bildirimi: okul "Tamam" diyene ya da son tarih geçene kadar */}
            {bildirimler.map(b => (
              <Banner key={b.id}
                color={b.kaynak === 'denetim_raporu' ? 'var(--success)' : 'var(--warn)'}
                bg={b.kaynak === 'denetim_raporu' ? 'var(--success-light)' : 'var(--warn-light)'}
                border={b.kaynak === 'denetim_raporu' ? '#BFE8D3' : 'var(--warn-border)'}
                icon={b.kaynak === 'denetim_raporu' ? <ShieldCheck size={16} /> : <Megaphone size={16} />}
                title={`${b.kaynak === 'duyuru' ? 'İl MEM duyurusu: ' : ''}${b.baslik}.`}
                action={<button type="button" className="btn btn-secondary btn-sm" onClick={() => bildirimOkundu(b.id)}>Tamam</button>}
              >
                {b.icerik}{b.son_tarih ? <> <strong>Son tarih: {new Date(b.son_tarih).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></> : null}
              </Banner>
            ))}
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

        {/* ÖZET KARTLARI */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
          {/* Bankada kalan: son 6 ayın ay sonu bakiyesi */}
          <div style={{
            position: 'relative', overflow: 'hidden', borderRadius: 18, padding: '18px 20px 14px', color: '#fff', display: 'flex', flexDirection: 'column',
            background: 'linear-gradient(150deg, var(--accent) 0%, var(--accent-dark) 60%, #14287f 100%)',
            boxShadow: '0 18px 40px -14px rgba(35, 71, 217, 0.55)',
          }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', fontWeight: 500 }}>Bankada kalan</div>
            <div className="tabular" style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '6px 0 8px' }}>{banka ? tlTam(banka.bakiye) : '—'}</div>
            {banka && (
              <div><span className="tabular" style={{ display: 'inline-block', fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.16)' }}>
                Bu ay {banka.ayNet >= 0 ? '+' : '−'}{tlTam(Math.abs(banka.ayNet))}
              </span></div>
            )}
            {bakiyeEgrisi && bakiyeNoktalari ? (
              <div style={{ marginTop: 'auto', paddingTop: 12 }}>
                <svg viewBox="0 0 300 70" preserveAspectRatio="none" width="100%" height="64" role="img"
                  aria-label={`Son 6 ay ay sonu bakiyesi: ${bakiyeNoktalari.map(n => `${AYLAR[n.ay]} ${tlTam(n.bakiye)}`).join(', ')}`}>
                  <defs>
                    <linearGradient id="bakiyeDolgu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#fff" stopOpacity="0.3" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={bakiyeEgrisi.alan} fill="url(#bakiyeDolgu)" />
                  <path d={bakiyeEgrisi.d} fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                </svg>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'rgba(255,255,255,0.72)', marginTop: 4 }}>
                  {bakiyeNoktalari.map(n => <span key={n.ay}>{ayKisa3(n.ay)}</span>)}
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 'auto', paddingTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{AYLAR[ay]} sonu, kulüp işletme defterine göre</div>
            )}
          </div>

          {/* Tahsilat verimi */}
          <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div className="stat-label">Tahsilat verimi</div>
                <div className="stat-value">%{tahsilatYuzdesi}</div>
                <div className="stat-sub">{odeyenSayisi} / {ucretliOgrenciler.length} öğrenci ödedi</div>
              </div>
              <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true" style={{ flexShrink: 0 }}>
                <circle cx="36" cy="36" r="29" fill="none" strokeWidth="9" stroke={toplamBorc > 0 ? 'var(--coral)' : '#eef0f4'} />
                {tahsilatOrani > 0 && (
                  <circle cx="36" cy="36" r="29" fill="none" strokeWidth="9" stroke="var(--accent)" transform="rotate(-90 36 36)"
                    strokeDasharray={`${Math.max(2 * Math.PI * 29 * tahsilatOrani - (tahsilatOrani < 1 ? 3 : 0), 0)} ${2 * Math.PI * 29}`} />
                )}
              </svg>
            </div>
            <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, color: 'var(--text2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--accent)', marginRight: 7 }} />Tahsil edilen</span>
                <b className="tabular" style={{ color: 'var(--text)', fontWeight: 600 }}>{tlTam(toplamTahsilat)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'var(--coral)', marginRight: 7 }} />{aidatErken ? 'Beklenen' : 'Geciken'}</span>
                <b className="tabular" style={{ color: 'var(--text)', fontWeight: 600 }}>{tlTam(toplamBorc)}</b>
              </div>
            </div>
          </div>

          {/* Kontenjan doluluğu: şube şube */}
          <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div>
                <div className="stat-label">Kontenjan doluluğu</div>
                <div className="stat-value">%{kapasiteYuzdesi}</div>
              </div>
              <span className="tabular" style={chipStyle((aktifOgrenci > toplamKapasite && toplamKapasite > 0) || tasanSube > 0 ? false : null)}>
                {aktifOgrenci > toplamKapasite && toplamKapasite > 0 ? `${aktifOgrenci - toplamKapasite} kişi fazla` : tasanSube > 0 ? `${tasanSube} şubede fazla` : bosYer > 0 ? `${bosYer} boş yer` : 'Dolu'}
              </span>
            </div>
            <div style={{ marginTop: 'auto', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {subeler.length === 0 ? (
                <div className="stat-sub">Şube kontenjanı tanımlanmamış. <Link href="/siniflar" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Sınıflar</Link></div>
              ) : subeler.slice(0, 3).map(c => {
                const oran = Math.min(c.mevcut / c.kapasite, 1)
                return (
                  <div key={c.ad}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--text2)', marginBottom: 4, gap: 8 }}>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.ad}</span>
                      <b className="tabular" style={{ color: c.mevcut > c.kapasite ? 'var(--danger)' : 'var(--text)', fontWeight: 600 }}>{c.mevcut} / {c.kapasite}</b>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: '#eef0f4', overflow: 'hidden' }}>
                      <div style={{ width: `${oran * 100}%`, height: '100%', borderRadius: 3, background: c.mevcut > c.kapasite ? 'var(--danger)' : c.mevcut === c.kapasite ? 'var(--success)' : 'var(--accent)' }} />
                    </div>
                  </div>
                )
              })}
              {subeler.length > 3 && <Link href="/siniflar" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>+{subeler.length - 3} şube daha</Link>}
            </div>
          </div>

          {/* Bordro adımları */}
          <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div className="stat-label">{AYLAR[ay]} bordrosu</div>
                <div className="stat-value" style={{ fontSize: bordroDurumu ? 24 : 22 }}>{bordroDurumu ? tlTam(netBordro) : 'Bekleniyor'}</div>
              </div>
              <span style={chipStyle(bordroDurumu ? true : null)}>{bordroDurumu ? 'Tahakkuk edildi' : 'Hazırlanıyor'}</span>
            </div>
            <ol style={{ listStyle: 'none', margin: 'auto 0 0', padding: '14px 0 0' }}>
              {bordroAdimlari.map((a, i) => (
                <li key={a.ad} style={{ display: 'grid', gridTemplateColumns: '22px 1fr auto', gap: 10, alignItems: 'center', padding: '5px 0', position: 'relative', fontSize: 12.5 }}>
                  {i > 0 && <span aria-hidden style={{ position: 'absolute', left: 10, top: -6, width: 2, height: 12, background: bordroAdimlari[i - 1].durum === 'tamam' ? 'var(--success)' : 'var(--border)' }} />}
                  <span aria-hidden style={{
                    width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, position: 'relative', zIndex: 1,
                    border: `2px solid ${a.durum === 'tamam' ? 'var(--success)' : a.durum === 'sirada' ? 'var(--coral)' : 'var(--border-strong)'}`,
                    background: a.durum === 'tamam' ? 'var(--success)' : a.durum === 'sirada' ? 'var(--coral-light)' : '#fff',
                    color: a.durum === 'tamam' ? '#fff' : a.durum === 'sirada' ? 'var(--accent2)' : 'var(--text3)',
                  }}>{a.durum === 'tamam' ? <Check size={12} strokeWidth={3} /> : i + 1}</span>
                  <span style={{ color: a.durum === 'bekliyor' ? 'var(--text3)' : 'var(--text)' }}>
                    {a.ad}<span className="sr-only">{a.durum === 'tamam' ? ' (tamamlandı)' : a.durum === 'sirada' ? ' (sırada)' : ''}</span>
                  </span>
                  <span className="tabular" style={{ fontSize: 12, color: a.durum === 'sirada' ? 'var(--accent2)' : 'var(--text3)', fontWeight: a.durum === 'sirada' ? 600 : 400 }}>{a.not}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* GRAFİK + AKILLI TAKİP */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
          <section style={{ ...panel, padding: '18px 22px 14px', gridColumn: 'span 2', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <h3 style={panelTitle}>Gelir ve gider</h3>
                <div style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 2 }}>Ayın ayrıntısı için çubukların üzerine gelin</div>
              </div>
              <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap' }}>
                {([
                  ['gelir', `${AYLAR[ay]} geliri`, buAy.gelir, 'var(--accent)', degisim(buAy.gelir, oncekiAy.gelir)],
                  ['gider', `${AYLAR[ay]} gideri`, buAy.gider, 'var(--text)', degisim(buAy.gider, oncekiAy.gider)],
                ] as const).map(([k, etiket, v, renk, d]) => (
                  <div key={k}>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{etiket}</div>
                    <div className="tabular" style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 650, letterSpacing: '-0.02em', color: renk }}>{tlTam(v)}</div>
                    {d !== null && (
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: k === 'gelir' ? (d >= 0 ? 'var(--success)' : 'var(--danger)') : 'var(--text3)' }}>
                        {d >= 0 ? '↑' : '↓'} %{Math.abs(d)} {AYLAR[oncekiAy.ay]}&apos;a göre
                      </div>
                    )}
                  </div>
                ))}
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>Net</div>
                  <div className="tabular" style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 650, letterSpacing: '-0.02em', color: buAyNet >= 0 ? 'var(--success)' : 'var(--danger)' }}>{buAyNet >= 0 ? '+' : '−'}{tlTam(Math.abs(buAyNet))}</div>
                </div>
              </div>
              <div role="group" aria-label="Dönem" style={{ display: 'inline-flex', background: 'var(--surface2)', border: '1px solid var(--border-light)', borderRadius: 9, padding: 3 }}>
                {([6, 12] as const).map(n => (
                  <button key={n} type="button" aria-pressed={grafikAy === n} onClick={() => { setGrafikAy(n); setGrafikOdak(null) }}
                    style={{ border: 0, borderRadius: 7, padding: '5px 11px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                      background: grafikAy === n ? '#fff' : 'transparent', color: grafikAy === n ? 'var(--text)' : 'var(--text3)',
                      boxShadow: grafikAy === n ? '0 1px 2px rgba(16,24,40,0.08)' : 'none' }}>
                    {n} ay
                  </button>
                ))}
              </div>
            </div>

            {(() => {
              const netVar = seri.some(d => Math.abs(d.net) > 1)
              const W = 780, H = 250, L = 52, R = netVar ? 52 : 12, T = 12, B = 30, iw = W - L - R, ih = H - T - B
              const Y = (v: number) => T + ih - (v / grafikMax) * ih
              const netMax = Math.max(...seri.map(d => Math.abs(d.net)), 1) * 1.25
              const YN = (v: number) => T + ih / 2 - (v / netMax) * (ih / 2)
              const slot = iw / seri.length, bw = Math.min(26, slot * 0.27)
              const noktalar = seri.map((d, i) => [L + slot * i + slot / 2, YN(d.net)] as const)
              const odak = grafikOdak != null ? seri[grafikOdak] : null
              const isaret = (v: number) => (v > 0 ? '+' : v < 0 ? '−' : '')
              return (
                <div style={{ position: 'relative', marginTop: 16 }} onMouseLeave={() => setGrafikOdak(null)}>
                  <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" style={{ display: 'block', overflow: 'visible' }}
                    aria-label={`Son ${seri.length} ay gelir ve gider: ${seri.map(d => `${AYLAR[d.ay]} gelir ${tlTam(d.gelir)}, gider ${tlTam(d.gider)}`).join('; ')}`}>
                    {[0, 1, 2, 3, 4].map(i => {
                      const y = Y((grafikMax * i) / 4)
                      return (
                        <g key={i}>
                          <line x1={L} x2={W - R} y1={y} y2={y} stroke={i ? 'var(--border-light)' : 'var(--border-strong)'} strokeDasharray={i ? '3 4' : undefined} />
                          <text x={L - 10} y={y + 4} textAnchor="end" fontSize="12" fill="var(--text3)">{i ? kisalt((grafikMax * i) / 4) : '0'}</text>
                        </g>
                      )
                    })}
                    {netVar && [-1, 0, 1].map(k => (
                      <text key={k} x={W - R + 10} y={YN((k * netMax) / 1.25) + 4} fontSize="11.5" fill="var(--success)">
                        {k ? `${k > 0 ? '+' : '−'}${kisalt(netMax / 1.25)}` : '0'}
                      </text>
                    ))}
                    {seri.map((d, i) => {
                      const cx = L + slot * i + slot / 2
                      const sonAy = i === seri.length - 1
                      return (
                        <g key={`${d.ay}-${d.yil}`}>
                          {grafikOdak === i && <rect x={cx - slot / 2 + 4} y={T} width={slot - 8} height={ih} rx="10" fill="var(--accent-lighter)" opacity="0.8" />}
                          <rect x={cx - bw - 2} y={Y(d.gelir)} width={bw} height={Math.max(T + ih - Y(d.gelir), d.gelir > 0 ? 2 : 0)} rx={Math.min(6, bw / 2)} fill={sonAy ? 'var(--accent)' : 'var(--accent-light)'} />
                          <rect x={cx + 2} y={Y(d.gider)} width={bw} height={Math.max(T + ih - Y(d.gider), d.gider > 0 ? 2 : 0)} rx={Math.min(6, bw / 2)} fill={sonAy ? 'var(--coral)' : '#ffc2ad'} />
                          <text x={cx} y={H - 10} textAnchor="middle" fontSize="12.5" fill={sonAy ? 'var(--text)' : 'var(--text3)'} fontWeight={sonAy ? 700 : 400}>{ayKisa3(d.ay)}</text>
                        </g>
                      )
                    })}
                    {/* Net çizgisi yalnızca gelir ile gider ayrıştığında anlamlı */}
                    {netVar && <path d={noktalar.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')} fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinejoin="round" />}
                    {netVar && noktalar.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={grafikOdak === i ? 6 : 4.5} fill="#fff" stroke="var(--success)" strokeWidth="2.5" />)}
                    {seri.map((d, i) => (
                      <rect key={`h-${i}`} x={L + slot * i} y={0} width={slot} height={H} fill="transparent" tabIndex={0}
                        aria-label={`${ayLabel(d.ay, d.yil)}: gelir ${tlTam(d.gelir)}, gider ${tlTam(d.gider)}, net ${isaret(d.net)}${tlTam(Math.abs(d.net))}`}
                        onMouseEnter={() => setGrafikOdak(i)} onFocus={() => setGrafikOdak(i)} onBlur={() => setGrafikOdak(null)} style={{ outline: 'none' }} />
                    ))}
                  </svg>
                  {odak && grafikOdak != null && (
                    <div role="status" style={{
                      position: 'absolute', pointerEvents: 'none', zIndex: 5,
                      left: `clamp(90px, ${((L + slot * grafikOdak + slot / 2) / W) * 100}%, calc(100% - 90px))`,
                      top: `${(Y(Math.max(odak.gelir, odak.gider)) / H) * 100}%`,
                      transform: 'translate(-50%, calc(-100% - 10px))',
                      background: '#10131a', color: '#fff', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, minWidth: 176,
                      boxShadow: '0 12px 28px -8px rgba(16,19,26,0.45)',
                    }}>
                      <div style={{ fontWeight: 600, color: '#c9ced6', marginBottom: 6 }}>{ayLabel(odak.ay, odak.yil)}</div>
                      {([['Gelir', odak.gelir, 'var(--accent-light)'], ['Gider', odak.gider, 'var(--coral)'], ['Net', odak.net, '#5fd39b']] as const).map(([k, v, r]) => (
                        <div key={k} className="tabular" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 3 }}>
                          <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: r, marginRight: 6 }} />{k}</span>
                          <b style={{ fontWeight: 600 }}>{k === 'Net' ? isaret(v) : ''}{tlTam(Math.abs(v))}</b>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}

            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 8, fontSize: 12.5, color: 'var(--text2)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--accent)' }} />Gelir</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--coral)' }} />Gider</span>
              {seri.some(d => Math.abs(d.net) > 1) && <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ width: 12, height: 3, borderRadius: 2, background: 'var(--success)' }} />Net (sağ eksen)</span>}
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
                {u.link && <Link href={u.link} style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', whiteSpace: 'nowrap' }}>Yönet</Link>}
              </div>
            ))}
          </section>
        </div>

        {/* GECİKEN ÖDEMELER + DENETİM DOSYASI + TAKVİM */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, alignItems: 'start' }}>
          <section style={{ ...panel, gridColumn: 'span 2', overflow: 'hidden', minWidth: 0 }}>
            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h3 style={panelTitle}>{aidatErken ? 'Aidatı beklenen öğrenciler' : 'Ödemesi geciken öğrenciler'}</h3>
                {borcluSayisi > 0 && <span className="tabular" style={chipStyle(aidatErken ? null : false)}>{borcluSayisi} öğrenci, {tlTam(toplamBorc)}</span>}
              </div>
              <Link href="/odeme" style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>Aidat Takibi</Link>
            </div>
            {borcluSayisi === 0 ? (
              <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--text3)' }}>
                <CheckCircle2 size={26} color="var(--success)" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Geciken ödeme yok</div>
                <div style={{ fontSize: 12.5, marginTop: 2 }}>{ayLabel(ay, yil)} için ödemesi eksik öğrenci bulunmuyor.</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 110px', gap: 12, padding: '8px 20px', background: 'var(--surface2)', fontSize: 12.5, fontWeight: 600, color: 'var(--text3)' }}>
                  <span>Öğrenci</span><span>Ödenen / aidat</span><span style={{ textAlign: 'right' }}>Kalan</span>
                </div>
                {borclular.slice(0, 6).map(b => (
                  <div key={b.o.id} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 110px', gap: 12, padding: '10px 20px', borderTop: '1px solid var(--border-light)', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span style={{ width: 30, height: 30, borderRadius: '50%', background: '#eef0f4', color: 'var(--text2)', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {[b.o.ad, b.o.soyad].map(w => (w || '').trim()[0]).filter(Boolean).join('').toLocaleUpperCase('tr-TR')}
                      </span>
                      <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.o.ad} {b.o.soyad}</span>
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', height: 6, background: '#eef0f4', borderRadius: 3, overflow: 'hidden' }}>
                        <span style={{ display: 'block', height: '100%', width: `${Math.min((b.odenen / b.gereken) * 100, 100)}%`, background: 'var(--accent)', borderRadius: 3 }} />
                      </span>
                      <span className="tabular" style={{ display: 'block', marginTop: 4, fontSize: 12.5, color: 'var(--text3)' }}>{tlTam(b.odenen)} / {tlTam(b.gereken)}</span>
                    </span>
                    <span className="tabular" style={{ textAlign: 'right', fontWeight: 600, color: aidatErken ? 'var(--text)' : 'var(--danger)' }}>{tlTam(b.borc)}</span>
                  </div>
                ))}
                {borcluSayisi > 6 && (
                  <Link href="/odeme" style={{ display: 'block', padding: '10px 20px', borderTop: '1px solid var(--border-light)', fontSize: 12.5, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>
                    +{borcluSayisi - 6} öğrenci daha
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 12, borderRadius: 12, background: 'var(--surface2)' }}>
                    <svg width="52" height="52" viewBox="0 0 52 52" role="img" aria-label={`${denetimOzet.tamam} / ${denetimOzet.toplam} madde hazır`} style={{ flexShrink: 0 }}>
                      <circle cx="26" cy="26" r="21" fill="none" stroke="var(--border)" strokeWidth="5" />
                      <circle cx="26" cy="26" r="21" fill="none" strokeWidth="5" strokeLinecap="round" transform="rotate(-90 26 26)"
                        stroke={denetimOzet.tamam === denetimOzet.toplam ? 'var(--success)' : 'var(--accent)'}
                        strokeDasharray={`${(denetimOzet.tamam / denetimOzet.toplam) * 2 * Math.PI * 21} ${2 * Math.PI * 21}`} />
                    </svg>
                    <div>
                      <div className="tabular" style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 650, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{denetimOzet.tamam}/{denetimOzet.toplam}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 2 }}>madde hazır</div>
                    </div>
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
              <Link href="/evrak-dosyasi" style={{ display: 'inline-block', marginTop: 12, fontSize: 12.5, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}>Dosyaya git</Link>
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
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{ayKisa}</span>
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
