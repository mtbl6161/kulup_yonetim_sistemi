'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { RefreshCw, BarChart2, Calendar, UserCheck, ClipboardList, Activity } from 'lucide-react'
import DenetciDenetimDosyasi from '@/components/DenetciDenetimDosyasi'
import DenetciHesapKontrol, { useHesapKontrol } from '@/components/DenetciHesapKontrol'
import { DenetimMaddeEditor } from '@/components/DenetimEvrakYonetimi'
import { DenetimIsKuyrugu, useDonemDurumlari, varsayilanDonem } from '@/components/DenetimPanel'
import { DenetimUstBar, DenetimOkullar, OkulIncelemeBasligi, VeriSecici, Bolum, OkulSekme, VeriSekme } from '@/components/DenetimDuzen'
import { gunSayisi, tatilMi } from '@/lib/hesaplama'
import { DersProgrami, SinifDefteri, Sinif, Tatil } from '@/lib/types'
import { useYukleme } from '@/lib/useYukleme'
import { useDegisince } from '@/lib/useDegisince'
import BilancoIcerik, { actionBtn, type BilancoVerisi } from '@/components/denetim/BilancoIcerik'
import BordroInceleme, { type BordroSatir } from '@/components/denetim/BordroInceleme'
import { loadingOverlay, emptyView, dpTh, dpTd } from '@/components/denetim/stiller'

interface OkulSatir { 
  id: number; 
  ad: string; 
  odeme_durumu?: string;
  ogrenci_sayisi?: number;
  personel_sayisi?: number;
  son_islem?: string;
}



export default function DenetimPage() {
  const { profil, il, loading, signOut, refresh } = useAuth()
  // Ekran: menü bölümleri ya da açık bir okulun inceleme ekranı
  const [ekran, setEkran] = useState<Bolum | 'okul'>('kuyruk')
  const [geriBolum, setGeriBolum] = useState<Bolum>('kuyruk')   // okul ekranından dönülecek bölüm
  const [okulSekme, setOkulSekme] = useState<OkulSekme>('evrak')
  const [veriSekme, setVeriSekme] = useState<VeriSekme>('bordro')
  const [ayarSekme, setAyarSekme] = useState<'evrak-listesi' | 'profil'>('evrak-listesi')
  const [gezinme, setGezinme] = useState<number[]>([])         // okul açılan listenin sırası (‹ › için)
  const [kararYenile, setKararYenile] = useState(0)            // dosya kararı sonrası evrak listesini yeniden yükle

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
  // Panelin genel dönemi ("2026-9"); tüm okul görünümleri bu ayı gösterir
  const [secilenAyKey, setSecilenAyKey] = useState<string>(varsayilanDonem)
  const [durumYenile, setDurumYenile] = useState(0)
  const [ilceler, setIlceler] = useState<{ id: number; ad: string }[]>([])
  const [filtreIlceId, setFiltreIlceId] = useState<number | null>(null)
  
  // Veri State'leri
  const [satirlar, setSatirlar] = useState<BordroSatir[]>([])
  const [bilVeri, setBilVeri] = useState<BilancoVerisi | null>(null)
  const [dersProgrami, setDersProgrami] = useState<DersProgrami[]>([])
  const [sinifDefteri, setSinifDefteri] = useState<SinifDefteri[]>([])
  const [siniflar, setSiniflar] = useState<Sinif[]>([])
  const [tatiller, setTatiller] = useState<Tatil[]>([])
  const [yukleniyor, setYukleniyor] = useState(false)
  const [sonHareketler, setSonHareketler] = useState<{ id: number; islem: string; created_at: string; aciklama?: string; okullar?: { ad?: string } }[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const selectedOkul = okullar.find(o => o.id === secilenOkulId)
  const [selYil, selAy] = secilenAyKey.split('-').map(Number)

  // Okul Verileri sekmesinde gösterilen ham veri (veri yükleme motoru buna göre çeker)
  const aktifVeri: VeriSekme | null = ekran === 'okul' && okulSekme === 'veri' ? veriSekme : null
  const bolum: Bolum = ekran === 'okul' ? geriBolum : ekran

  function bolumSec(b: Bolum) {
    setEkran(b)
  }

  function okulIncele(okulId: number, liste?: number[]) {
    if (ekran !== 'okul') setGeriBolum(ekran)
    if (liste) setGezinme(liste)
    else if (!gezinme.includes(okulId)) setGezinme([])
    if (ekran !== 'okul') setOkulSekme('evrak') // ‹ › ile gezinirken açık sekme korunur
    setSecilenOkulId(okulId)
    setEkran('okul')
  }

  // Dönemdeki teslim durumları (kuyruk, okul listesi rozetleri, menü sayacı)
  const donemDurumlari = useDonemDurumlari(okullar.map(o => o.id), selYil, selAy, durumYenile)
  const bekleyenler = okullar
    .filter(o => donemDurumlari.durumlar.get(o.id)?.teslim?.durum === 'gonderildi')
    .sort((a, b) => (donemDurumlari.durumlar.get(a.id)?.teslim?.gonderim_tarihi || '').localeCompare(donemDurumlari.durumlar.get(b.id)?.teslim?.gonderim_tarihi || ''))
  const bekleyenSayisi = bekleyenler.length
  const gezinmeSira = secilenOkulId ? gezinme.indexOf(secilenOkulId) : -1
  const oncekiOkul = gezinmeSira > 0 ? gezinme[gezinmeSira - 1] : undefined
  const sonrakiOkul = gezinmeSira >= 0
    ? (gezinmeSira < gezinme.length - 1 ? gezinme[gezinmeSira + 1] : undefined)
    : bekleyenler.find(o => o.id !== secilenOkulId)?.id // listeden açılmadıysa kuyrukta bekleyen başka dosya
  const hesapVeri = useHesapKontrol(secilenOkulId || 0, selYil, selAy)

  // Profil sekmesi açılınca mevcut adı doldur
  useDegisince(`${ekran}|${ayarSekme}|${profil?.ad ?? ''}|${profil?.soyad ?? ''}`, () => {
    if (ekran === 'ayarlar' && ayarSekme === 'profil') {
      setProfilAd(profil?.ad || '')
      setProfilSoyad(profil?.soyad || '')
      setProfilMesaj(null)
      setSifreMesaj(null)
    }
  })

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
  const benimIlId = profil?.il_id
  const okullarGetir = useCallback(async () => {
    const myIlId = benimIlId
    if (!myIlId) return
    setOkulYukleniyor(true)
    
    // 1. Okulları Getir (İlişkili sayılarla birlikte)
    let query = supabase
      .from('okullar')
      .select('id, ad, odeme_durumu, ilce_id, lisans_bitis')
      .eq('il_id', myIlId)
      .in('odeme_durumu', ['aktif', 'deneme'])
      .order('ad')

    if (filtreIlceId) {
      query = query.eq('ilce_id', filtreIlceId)
    }

    const { data: tumOkullar, error: queryError } = await query
    // Yalnızca kullanımı geçerli okullar (AuthContext lisans kuralıyla aynı):
    // aktif abonelik süresi bitmemiş ya da deneme süresi dolmamış. Pasif / süresi dolmuş okullar gizlenir.
    const simdi = new Date()
    const okullarData = (tumOkullar || []).filter(o => {
      const bitis = o.lisans_bitis ? new Date(o.lisans_bitis) : null
      if (o.odeme_durumu === 'aktif') return !bitis || bitis > simdi
      return !!bitis && bitis > simdi
    })
    
    if (queryError) {
      console.error('Okullar çekilirken hata:', queryError)
      setOkulYukleniyor(false)
      return
    }
    
    if (okullarData) {
      const okullarWithDetails = await Promise.all(okullarData.map(async (o) => {
        const [ogr, per, son] = await Promise.all([
          supabase.from('ogrenciler').select('id', { count: 'exact', head: true }).eq('okul_id', o.id).neq('ogrenci_turu', 'okul'),
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
  }, [benimIlId, filtreIlceId])

  useYukleme(okullarGetir, [okullarGetir, filtreIlceId])

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

  // Veri Yükleme Motoru
  useYukleme(() => {
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
        setBilVeri({ ayarlar: ayr, toplamGelir: 0, ogrenciSayisi: 0, subeSayisi: 0, toplamDersSaati: 0, tatiller: [] })
      } else {
        setBilVeri(null)
      }

      if (aktifVeri === 'bordro') {
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
      } else if (aktifVeri === 'bilanco') {
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
      } else if (aktifVeri === 'ders-programi') {
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
      } else if (aktifVeri === 'sinif-defteri') {
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
        const sinifAdlari = new Set((sinRes.data || []).map((s) => s.ad))
        const filtrelenmis = (sdRes.data || []).filter((p) =>
          p.okul_id === secilenOkulId || (p.okul_id == null && sinifAdlari.has(p.kulup_adi))
        )
        setSinifDefteri(filtrelenmis)
        setSiniflar(sinRes.data || [])
        setTatiller(tatRes.data || [])
      }
      setYukleniyor(false)
    }

    veriYukle()
  }, [secilenOkulId, secilenAyKey, aktifVeri, refreshKey])

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 36, height: 36, border: '3px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
    </div>
  )


  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-sans)', overflow: 'hidden' }}>

      <DenetimUstBar
        bolum={bolum}
        onBolum={bolumSec}
        donem={secilenAyKey}
        onDonem={setSecilenAyKey}
        bekleyen={bekleyenSayisi}
        ilAd={il?.ad}
        kullaniciAd={[profil?.ad, profil?.soyad].filter(Boolean).join(' ')}
        onCikis={signOut}
      />

      {/* ── İÇERİK ── */}
      <main style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* İŞ KUYRUĞU (ana sayfa) */}
        {ekran === 'kuyruk' && (
          <DenetimIsKuyrugu
            okullar={okullar}
            yil={selYil}
            ay={selAy}
            durumlar={donemDurumlari.durumlar}
            toplamMadde={donemDurumlari.toplamMadde}
            yukleniyor={donemDurumlari.yukleniyor || okulYukleniyor}
            sonHareketler={sonHareketler}
            ilAd={il?.ad}
            ilceler={ilceler}
            filtreIlceId={filtreIlceId}
            onIlce={setFiltreIlceId}
            onIncele={okulIncele}
            onTumKayitlar={() => bolumSec('kayitlar')}
            onYenile={() => { okullarGetir(); setDurumYenile(x => x + 1) }}
          />
        )}

        {ekran === 'okullar' && (
          <DenetimOkullar
            okullar={okullar}
            durumlar={donemDurumlari.durumlar}
            toplamMadde={donemDurumlari.toplamMadde}
            yukleniyor={donemDurumlari.yukleniyor || okulYukleniyor}
            yil={selYil}
            ay={selAy}
            ilceler={ilceler}
            filtreIlceId={filtreIlceId}
            onIlce={setFiltreIlceId}
            onIncele={okulIncele}
            onYenile={() => { okullarGetir(); setDurumYenile(x => x + 1) }}
          />
        )}

        {ekran === 'ayarlar' && (
          <div role="group" aria-label="Ayarlar" style={{ flexShrink: 0, padding: '16px 28px 0', display: 'flex', gap: 2 }}>
            {([['evrak-listesi', 'Evrak listesi'], ['profil', 'Profilim']] as const).map(([id, ad]) => (
              <button key={id} type="button" onClick={() => setAyarSekme(id)} aria-pressed={ayarSekme === id}
                style={{ padding: '8px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14,
                  fontWeight: ayarSekme === id ? 700 : 500, color: ayarSekme === id ? 'var(--accent)' : 'var(--text2)',
                  borderBottom: ayarSekme === id ? '2px solid var(--accent)' : '2px solid transparent' }}>
                {ad}
              </button>
            ))}
          </div>
        )}

        {ekran === 'ayarlar' && ayarSekme === 'evrak-listesi' && profil?.il_id && (
          <DenetimMaddeEditor ilId={profil.il_id} />
        )}

        {/* TÜM LOGLAR GÖRÜNÜMÜ (TAM SAYFA) */}
        {ekran === 'kayitlar' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
             {/* Sticky Header */}
             <div style={{ 
               padding: '20px 40px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', 
               display: 'flex', alignItems: 'center', justifyContent: 'space-between',
               position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
             }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                   <div>
                      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0 }}>İşlem Kayıtları</h1>
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

        {/* OKUL İNCELEME EKRANI: başlık (karar + özet + sekmeler) ve seçili sekmenin içeriği, tam genişlikte */}
        {ekran === 'okul' && secilenOkulId && (
          <>
            <OkulIncelemeBasligi
              key={`${secilenOkulId}-${secilenAyKey}`}
              okulId={secilenOkulId}
              okulAd={selectedOkul?.ad || ''}
              yil={selYil}
              ay={selAy}
              durum={donemDurumlari.durumlar.get(secilenOkulId)}
              toplamMadde={donemDurumlari.toplamMadde}
              hesap={hesapVeri}
              sekme={okulSekme}
              onSekme={setOkulSekme}
              geriAd={geriBolum === 'okullar' ? 'Okullar' : geriBolum === 'kuyruk' ? 'İş Kuyruğu' : 'Geri'}
              onGeri={() => setEkran(geriBolum)}
              gezinme={{
                sira: gezinmeSira + 1,
                toplam: gezinmeSira >= 0 ? gezinme.length : 0,
                onOnceki: oncekiOkul ? () => okulIncele(oncekiOkul) : undefined,
                onSonraki: sonrakiOkul ? () => okulIncele(sonrakiOkul) : undefined,
              }}
              onKararVerildi={() => { setDurumYenile(x => x + 1); setKararYenile(x => x + 1) }}
            />

            {okulSekme === 'veri' && (
              <div style={{ flexShrink: 0, padding: '12px 24px', borderBottom: '1px solid var(--border-light)' }}>
                <VeriSecici secili={veriSekme} onSec={setVeriSekme} />
              </div>
            )}

        {/* BORDRO GÖRÜNÜMÜ */}
        {aktifVeri === 'bordro' && <BordroInceleme satirlar={satirlar} yukleniyor={yukleniyor} bilVeri={bilVeri} />}

        {/* BİLANÇO GÖRÜNÜMÜ */}
        {aktifVeri === 'bilanco' && (
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
        {aktifVeri === 'ders-programi' && (
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
                            <tr style={{ background: 'var(--th-bg)' }}>
                              <th style={dpTh(80)}>Ders</th>
                              {gunler.map(g => {
                                const hg = new Date(selYil, selAy - 1, g, 12).getDay()
                                const isHS = hg === 0 || hg === 6
                                const isTatil = tatilMi(selAy, g, selYil, tatiller)
                                const ad = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][hg]
                                return (
                                  <th key={g} style={{ ...dpTh(52), background: (isHS || isTatil) ? 'var(--th-off-bg)' : 'var(--th-bg)', color: (isHS || isTatil) ? 'var(--th-off-fg)' : 'var(--th-fg)' }}>
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
        {aktifVeri === 'sinif-defteri' && (
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

        {okulSekme === 'hesap' && <DenetciHesapKontrol veri={hesapVeri} />}

        {okulSekme === 'evrak' && (
          <DenetciDenetimDosyasi
            key={`${secilenOkulId}-${secilenAyKey}-${kararYenile}`}
            okulId={secilenOkulId}
            okulAd={selectedOkul?.ad || ''}
            yil={selYil}
            ay={selAy}
            onDegisti={() => setDurumYenile(x => x + 1)}
          />
        )}
          </>
        )}

        {/* ── PROFİL ── */}
        {ekran === 'ayarlar' && ayarSekme === 'profil' && (
          <div style={{ flex: 1, overflow: 'auto', padding: 32 }}>
            <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Başlık */}
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Profilim</h2>
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
