'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { RefreshCw, BarChart2, Calendar, UserCheck, ClipboardList, Activity } from 'lucide-react'
import { Filtre } from '@/components/yonetim/ortak'
import DenetciDenetimDosyasi from '@/components/DenetciDenetimDosyasi'
import DenetciHesapKontrol, { useHesapKontrol } from '@/components/DenetciHesapKontrol'
import DenetimRaporu from '@/components/denetim/DenetimRaporu'
import DenetciDuyurulari from '@/components/denetim/DenetciDuyurulari'
import { DenetimMaddeEditor } from '@/components/DenetimEvrakYonetimi'
import { DenetimIsKuyrugu, useDonemDurumlari, varsayilanDonem } from '@/components/DenetimPanel'
import { DenetimKabuk, DenetimOkullar, OkulIncelemeBasligi, VeriSecici, Bolum, OkulSekme, VeriSekme } from '@/components/DenetimDuzen'
import { AYLAR, gunSayisi } from '@/lib/hesaplama'
import { DersProgrami, SinifDefteri, Sinif, Tatil } from '@/lib/types'
import { useYukleme } from '@/lib/useYukleme'
import { useDegisince } from '@/lib/useDegisince'
import BilancoIcerik, { type BilancoVerisi } from '@/components/denetim/BilancoIcerik'
import BordroInceleme, { type BordroSatir } from '@/components/denetim/BordroInceleme'
import AylikIzgara from '@/components/denetim/AylikIzgara'
import { loadingOverlay, emptyView } from '@/components/denetim/stiller'

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
  // Oturum çerezde tutulur ve tarayıcı başına tektir: aynı tarayıcıda başka sekmede okul hesabıyla giriş yapılırsa
  // bu sekmenin istekleri de o hesapla gider. Sekmeye dönüldüğünde oturum değişmişse sayfayı yenile ki eski
  // denetçi görünümüyle işlem yapılmasın.
  useEffect(() => {
    if (!profil?.id) return
    const kontrol = async () => {
      if (document.visibilityState !== 'visible') return
      const { data } = await supabase.auth.getSession()
      if (data.session?.user.id !== profil.id) window.location.reload()
    }
    window.addEventListener('focus', kontrol)
    document.addEventListener('visibilitychange', kontrol)
    return () => { window.removeEventListener('focus', kontrol); document.removeEventListener('visibilitychange', kontrol) }
  }, [profil?.id])
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


  const donemAd = `${AYLAR[selAy]} ${selYil}`
  const ekranBaslik: Record<Bolum | 'okul', [string, string]> = {
    kuyruk: ['İş kuyruğu', `${il?.ad ? `${il.ad} İl Milli Eğitim Müdürlüğü` : 'İl Milli Eğitim Müdürlüğü'} · ${donemAd}`],
    okullar: ['Okullar', `İldeki okulların ${donemAd} dosyaları`],
    duyurular: ['Duyurular', 'İldeki okullara uyarı ve duyuru gönderin'],
    kayitlar: ['İşlem kayıtları', 'Tüm kurumların işlem dökümü (canlı)'],
    ayarlar: ['Ayarlar', ayarSekme === 'profil' ? `${il?.ad || ''} ili denetçisi`.trim() : 'İlinizdeki okulların göreceği evrak listesi'],
    okul: [selectedOkul?.ad || 'Okul', `${donemAd} dosyası`],
  }

  return (
    <DenetimKabuk
      bolum={bolum}
      onBolum={bolumSec}
      donem={secilenAyKey}
      onDonem={setSecilenAyKey}
      bekleyen={bekleyenSayisi}
      ilAd={il?.ad}
      kullaniciAd={[profil?.ad, profil?.soyad].filter(Boolean).join(' ')}
      onCikis={signOut}
      baslik={ekranBaslik[ekran][0]}
      alt={ekranBaslik[ekran][1]}
    >
        {/* İŞ KUYRUĞU (ana sayfa) */}        {/* İŞ KUYRUĞU (ana sayfa) */}
        {ekran === 'kuyruk' && (
          <DenetimIsKuyrugu
            okullar={okullar}
            ay={selAy}
            durumlar={donemDurumlari.durumlar}
            toplamMadde={donemDurumlari.toplamMadde}
            yukleniyor={donemDurumlari.yukleniyor || okulYukleniyor}
            sonHareketler={sonHareketler}
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
            ilceler={ilceler}
            filtreIlceId={filtreIlceId}
            onIlce={setFiltreIlceId}
            onIncele={okulIncele}
            onYenile={() => { okullarGetir(); setDurumYenile(x => x + 1) }}
          />
        )}

        {ekran === 'duyurular' && profil?.il_id && (
          <DenetciDuyurulari ilId={profil.il_id} ilceler={ilceler} yil={selYil} ay={selAy} />
        )}

        {ekran === 'ayarlar' && (
          <div className="dn-alt-arac">
            <Filtre<'evrak-listesi' | 'profil'> etiket="Ayarlar" deger={ayarSekme} onDegis={setAyarSekme}
              secenekler={[{ id: 'evrak-listesi', ad: 'Evrak listesi' }, { id: 'profil', ad: 'Profilim' }]} />
          </div>
        )}

        {ekran === 'ayarlar' && ayarSekme === 'evrak-listesi' && profil?.il_id && (
          <DenetimMaddeEditor ilId={profil.il_id} />
        )}

        {/* TÜM LOGLAR GÖRÜNÜMÜ (TAM SAYFA) */}
        {ekran === 'kayitlar' && (
          <div className="dn-sayfa">
            <section className="yk-kart">
              <div className="yk-kart-bas">
                <h2>Son işlemler</h2>
                <div className="yk-kart-sag">
                  <span className="badge badge-blue">{sonHareketler.length} kayıt listeleniyor</span>
                  <button type="button" className="btn btn-secondary btn-icon" onClick={okullarGetir} disabled={okulYukleniyor} aria-label="Yenile" title="Yenile">
                    <RefreshCw size={14} className={okulYukleniyor ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>
              <div className="yk-tablo">
                <table className="data-table" style={{ minWidth: 720 }}>
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: 170 }}>Tarih / saat</th>
                      <th scope="col" style={{ width: 220 }}>Kurum</th>
                      <th scope="col" style={{ width: 130 }}>İşlem</th>
                      <th scope="col">Açıklama</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sonHareketler.length === 0 ? (
                      <tr><td colSpan={4} style={{ padding: 48, textAlign: 'center', color: 'var(--text3)' }}>Kayıt bulunamadı.</td></tr>
                    ) : (
                      sonHareketler.map(log => (
                        <tr key={log.id}>
                          <td style={{ color: 'var(--text3)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString('tr-TR')}</td>
                          <td style={{ fontWeight: 600 }}>{log.okullar?.ad}</td>
                          <td><span className="badge badge-blue">{log.islem}</span></td>
                          <td style={{ color: 'var(--text2)', lineHeight: 1.5 }}>{log.aciklama}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {sonHareketler.length > 0 && <div className="yk-sayfalama"><span>Listenin sonuna ulaşıldı.</span></div>}
            </section>
          </div>
        )}

        {/* OKUL İNCELEME EKRANI: başlık (karar + özet + sekmeler) ve seçili sekmenin içeriği, tam genişlikte */}
        {ekran === 'okul' && secilenOkulId && (
          <>
            <OkulIncelemeBasligi
              key={`${secilenOkulId}-${secilenAyKey}`}
              okulId={secilenOkulId}
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
              sekmeSag={okulSekme === 'veri' ? <VeriSecici secili={veriSekme} onSec={setVeriSekme} /> : undefined}
            />

        {/* BORDRO GÖRÜNÜMÜ */}
        {aktifVeri === 'bordro' && <BordroInceleme satirlar={satirlar} yukleniyor={yukleniyor} bilVeri={bilVeri} />}

        {/* BİLANÇO GÖRÜNÜMÜ */}
        {aktifVeri === 'bilanco' && (
          <div className="dn-kaydir">
             {yukleniyor ? (
                <div style={loadingOverlay}><RefreshCw size={24} className="animate-spin" color="var(--accent)" /></div>
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

        {/* DERS PROGRAMI ve SINIF DEFTERİ: tek sınıf, ekrana sığan aylık ızgara */}
        {(aktifVeri === 'ders-programi' || aktifVeri === 'sinif-defteri') && (
          yukleniyor ? (
            <div className="dn-kaydir"><div style={loadingOverlay}><RefreshCw size={24} className="animate-spin" color="var(--accent)" /></div></div>
          ) : siniflar.length === 0 ? (
            <div className="dn-kaydir">
              <div style={emptyView}>
                {aktifVeri === 'ders-programi' ? <Calendar size={48} color="var(--border)" /> : <ClipboardList size={48} color="var(--border)" />}
                <p style={{ marginTop: 16, color: 'var(--text3)', fontWeight: 600 }}>Bu dönem için {aktifVeri === 'ders-programi' ? 'ders programı' : 'sınıf defteri'} bulunamadı.</p>
              </div>
            </div>
          ) : (
            <AylikIzgara
              key={`${secilenOkulId}-${aktifVeri}`}
              tur={aktifVeri === 'ders-programi' ? 'program' : 'defter'}
              siniflar={siniflar}
              kayitlar={aktifVeri === 'ders-programi' ? dersProgrami : sinifDefteri}
              yil={selYil}
              ay={selAy}
              tatiller={tatiller}
            />
          )
        )}

        {okulSekme === 'hesap' && <DenetciHesapKontrol veri={hesapVeri} />}

        {okulSekme === 'rapor' && (
          <DenetimRaporu key={`rapor-${secilenOkulId}-${secilenAyKey}`} okulId={secilenOkulId} yil={selYil} ay={selAy} hesap={hesapVeri}
            denetciAd={[profil?.ad, profil?.soyad].filter(Boolean).join(' ')} />
        )}

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
          <div className="dn-sayfa">
            <div style={{ width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Ad Soyad Güncelle */}
              <section className="yk-kart">
                <div className="yk-kart-bas">
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><UserCheck size={16} color="var(--accent)" aria-hidden="true" /> Kişisel bilgiler</h2>
                </div>
                <form onSubmit={handleProfilGuncelle} style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 18px 18px' }}>
                  <div className="yk-grid2">
                    <div>
                      <label className="form-label">Ad</label>
                      <input className="form-input" type="text" value={profilAd} onChange={e => setProfilAd(e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Soyad</label>
                      <input className="form-input" type="text" value={profilSoyad} onChange={e => setProfilSoyad(e.target.value)} />
                    </div>
                  </div>
                  {profilMesaj && (
                    <div role="status" style={{ padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: profilMesaj.tip === 'ok' ? 'var(--success-light)' : 'var(--danger-light)',
                      color: profilMesaj.tip === 'ok' ? 'var(--success)' : 'var(--danger)',
                      border: `1px solid ${profilMesaj.tip === 'ok' ? 'var(--success-border)' : 'var(--danger-border)'}`,
                    }}>{profilMesaj.text}</div>
                  )}
                  <div>
                    <button type="submit" className="btn btn-primary" disabled={profilKaydediliyor}>
                      {profilKaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                  </div>
                </form>
              </section>

              {/* Şifre Değiştir */}
              <section className="yk-kart">
                <div className="yk-kart-bas">
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Activity size={16} color="var(--accent)" aria-hidden="true" /> Şifre değiştir</h2>
                </div>
                <form onSubmit={handleSifreDegistir} style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 18px 18px' }}>
                    <div>
                      <label className="form-label">Mevcut şifre</label>
                      <input className="form-input" type="password" required value={eskiSifre} onChange={e => setEskiSifre(e.target.value)} />
                    </div>
                  <div className="yk-grid2">
                    <div>
                      <label className="form-label">Yeni şifre</label>
                      <input className="form-input" type="password" required value={yeniSifre} onChange={e => setYeniSifre(e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label">Şifre tekrar</label>
                      <input className="form-input" type="password" required value={yeniSifreTekrar} onChange={e => setYeniSifreTekrar(e.target.value)} />
                    </div>
                  </div>
                  {sifreMesaj && (
                    <div role="status" style={{ padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: sifreMesaj.tip === 'ok' ? 'var(--success-light)' : 'var(--danger-light)',
                      color: sifreMesaj.tip === 'ok' ? 'var(--success)' : 'var(--danger)',
                      border: `1px solid ${sifreMesaj.tip === 'ok' ? 'var(--success-border)' : 'var(--danger-border)'}`,
                    }}>{sifreMesaj.text}</div>
                  )}
                  <div>
                    <button type="submit" className="btn btn-primary" disabled={sifreKaydediliyor}>
                      {sifreKaydediliyor ? 'Değiştiriliyor...' : 'Şifreyi değiştir'}
                    </button>
                  </div>
                </form>
              </section>

            </div>
          </div>
        )}

    </DenetimKabuk>
  )
}

// --- YARDIMCI BİLEŞENLER VE STİLLER ---
