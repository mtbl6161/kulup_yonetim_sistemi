'use client'
import { useEffect, useState } from 'react'
import Topbar from '@/components/Topbar'
import SayiInput from '@/components/SayiInput'
import { supabase } from '@/lib/supabase'
import { Ayarlar, VergiDilimi, Tatil } from '@/lib/types'
import { gunEkle, KULUP_BASLANGIC_TATIL_AD } from '@/lib/hesaplama'
import {
  Building2,
  Search,
  Banknote,
  Scale,
  Calendar,
  Save,
  ShieldCheck,
  Info,
  Phone,
  Mail,
  MapPin,
  User,
  Calculator,
  Trash2,
  Plus,
  CreditCard,
  CheckCircle2,
  Loader2,
  FileCode2,
  Download,
  ClipboardCheck
} from 'lucide-react'
import ConfirmModal from '@/components/ConfirmModal'
import { Okul } from '@/lib/types'
import { uyari, onayla } from '@/lib/diyalog'
import { hataMesaji } from '@/lib/hata'
import { useDegisince } from '@/lib/useDegisince'
import LisansSekmesi from '@/components/ayarlar/LisansSekmesi'
import GuvenlikSekmesi from '@/components/ayarlar/GuvenlikSekmesi'
import TatilSekmesi from '@/components/ayarlar/TatilSekmesi'
import KulupBilgileriSekmesi from '@/components/ayarlar/KulupBilgileriSekmesi'

const DEFAULT_AYARLAR: Partial<Ayarlar> = {
  kurum_adi: '',
  mudur_adi: '',
  adres: '',
  tel: '',
  email: '',
  vergi_dairesi: '',
  vergi_no: '',
  sgk_no: '',
  gosterge: 140,
  katsayi: 1.387871,         // MEB memur maaş katsayısı
  saat_ucreti: 64.75,        // 140 × 1.387871 / 3 (yemekli bölen=3)
  gunluk_saat: 6,
  yemek: true,
  asgari_ucret: 33030,
  sgk_kisi_pay: 0.14,
  sgk_issizlik_kisi: 0.01,
  sgk_kisa_vadeli: 0.0225,
  sgk_malulluk: 0.20,
  sgk_saglik: 0.125,
  sgk_issizlik_isveren: 0.03,
  damga_vergi_orani: 0.00759,
  vergi_dilimleri: [
    { ust: 190000, oran: 0.15 },
    { ust: 400000, oran: 0.20 },
    { ust: 1500000, oran: 0.27 },
    { ust: 5300000, oran: 0.35 },
    { ust: 30000000, oran: 0.40 },
  ],
  dagitim_temel_gider: 26,
  dagitim_ogretmen: 55,
  dagitim_baskan: 7,
  dagitim_baskan_yrd: 5,
  dagitim_muhasebe: 2,
  dagitim_temizlik: 4,
  dagitim_denetim: 1,
  tavan_katsayi: 13184.78,
  gv_istisna_sabiti: 0,
  dv_istisna_sabiti: 0,
  sgk_kanun_no: '05510',
  sgk_belge_turu: '01',
  sgk_araci_no: '000',
  sgk_kontrol_no: '00',
  sgk_sicil_no: ''
}

export default function AyarlarPage() {
  const [form, setForm] = useState<Partial<Ayarlar>>(DEFAULT_AYARLAR)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'kurumsal' | 'mali' | 'vergi' | 'kulup' | 'tatil' | 'guvenlik' | 'lisans'>('kurumsal')
  // Tatil Yönetimi Durumu
  const [tatiller, setTatiller] = useState<Tatil[]>([])
  const [tatilForm, setTatilForm] = useState({ ad: '', bas: '', bit: '', tip: 'ozel' })
  const [tatilSaving, setTatilSaving] = useState(false)

  // Kulüp başlangıç tarihi: eğitim yılının 1 Eylül'ünden başlangıçtan önceki güne kadar okula özel
  // "tatil" kaydı olarak tutulur → iş günü, aidat, puantaj, ders programı ve sınıf defteri otomatik uyar.
  const varsayilanEgitimYili = new Date().getMonth() + 1 >= 9 ? new Date().getFullYear() : new Date().getFullYear() - 1
  const [kbYil, setKbYil] = useState(varsayilanEgitimYili)
  const [kbTarih, setKbTarih] = useState('')
  const [kbSaving, setKbSaving] = useState(false)
  const kbMevcut = tatiller.find(t => t.okul_id !== null && t.ad === KULUP_BASLANGIC_TATIL_AD && t.baslangic_tarihi.startsWith(`${kbYil}-09-01`))
  // Yıl ya da kayıtlı başlangıç değişince tarih kutusunu kayıtlı değere getir
  useDegisince(`${kbMevcut?.id ?? ''}|${kbYil}`, () => setKbTarih(kbMevcut ? gunEkle(kbMevcut.bitis_tarihi.split('T')[0], 1) : ''))

  async function tatilleriYenile() {
    const { data } = await supabase.from('tatiller').select('*').or(`okul_id.eq.${okulData?.id ?? 0},okul_id.is.null`).order('baslangic_tarihi', { ascending: true })
    if (data) setTatiller(data)
  }

  async function kulupBaslangicKaydet(kaldir = false) {
    if (!okulData?.id) { setMsg({ type: 'error', text: 'Okul bilgisi bulunamadı, sayfayı yenileyin.' }); return }
    const yilBas = `${kbYil}-09-01`, yilBit = `${kbYil + 1}-08-31`
    if (!kaldir) {
      if (!kbTarih) { setMsg({ type: 'error', text: 'Kulüp başlangıç tarihini seçin.' }); return }
      if (kbTarih < yilBas || kbTarih > yilBit) { setMsg({ type: 'error', text: `Tarih ${kbYil}-${kbYil + 1} eğitim yılı içinde olmalı (01.09.${kbYil} – 31.08.${kbYil + 1}).` }); return }
    }
    setKbSaving(true)
    if (kbMevcut) {
      const { error } = await supabase.from('tatiller').delete().eq('id', kbMevcut.id)
      if (error) { setKbSaving(false); setMsg({ type: 'error', text: 'Hata: ' + error.message }); return }
    }
    // 1 Eylül'de başlıyorsa kapatılacak gün yok
    if (!kaldir && kbTarih > yilBas) {
      const { error } = await supabase.from('tatiller').insert({
        ad: KULUP_BASLANGIC_TATIL_AD, baslangic_tarihi: yilBas, bitis_tarihi: gunEkle(kbTarih, -1), tip: 'ozel', okul_id: okulData.id,
      })
      if (error) { setKbSaving(false); setMsg({ type: 'error', text: 'Hata: ' + error.message }); return }
    }
    await tatilleriYenile()
    setKbSaving(false)
    setMsg({ type: 'success', text: kaldir ? '✅ Kulüp başlangıç tarihi kaldırıldı.' : `✅ Kulüp başlangıcı ${new Date(kbTarih).toLocaleDateString('tr-TR')} olarak kaydedildi. Öncesindeki günler iş gününden düşüldü.` })
    setTimeout(() => setMsg(null), 4000)
  }
  const [tatilEkleAcik, setTatilEkleAcik] = useState(false)
  const [conf, setConf] = useState<{
    open: boolean,
    type: 'tatilSil' | 'tatilEklendi',
    id?: number,
    title: string,
    message: string
  } | null>(null)
  const [okulData, setOkulData] = useState<Okul | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [secilenPeriod, setSecilenPeriod] = useState<'month' | 'year'>('month')

  useEffect(() => {
    // 1. Ayarları Çek
    supabase.from('ayarlar').select('*').single().then(({ data: ayar }) => {
      if (ayar) setForm(ayar)
    })

    // 2. Okul Verisini ve Tatilleri Birlikte Çek
    const fetchOkul = async () => {
      try {
        const { data: profil, error: pErr } = await supabase
          .from('profiller')
          .select('okul_id')
          .single()

        if (pErr || !profil?.okul_id) {
          // Yine de global tatilleri çek
          const { data: tat } = await supabase.from('tatiller').select('*').is('okul_id', null).order('baslangic_tarihi', { ascending: true })
          if (tat) setTatiller(tat)
          return
        }

        const okulId = profil.okul_id

        const [{ data }, { data: tat }] = await Promise.all([
          supabase.from('okullar').select('*').eq('id', okulId).single(),
          supabase.from('tatiller').select('*').or(`okul_id.eq.${okulId},okul_id.is.null`).order('baslangic_tarihi', { ascending: true }),
        ])

        if (data) setOkulData(data)
        if (tat) setTatiller(tat)
      } catch (err) {
        console.error('❌ Beklenmedik hata:', err)
      }
    }

    fetchOkul()
  }, [])

  const isDeneme = okulData?.odeme_durumu === 'deneme' && 
                   okulData?.lisans_bitis != null && 
                   new Date(okulData.lisans_bitis) > new Date()
                   
  const isAktif = okulData?.odeme_durumu === 'aktif' && 
                  okulData?.lisans_bitis != null && 
                  new Date(okulData.lisans_bitis) > new Date()

  const lisansGecerli = isDeneme || isAktif

  const handlePayment = async (variantId: string, interval: string) => {
    if (!okulData) return
    setCheckoutLoading(true)
    try {
      const { data: { session: oturum } } = await supabase.auth.getSession()
      const res = await fetch('/api/lemonsqueezy/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${oturum?.access_token ?? ''}` },
        body: JSON.stringify({ okulId: okulData.id, variantId, interval })
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else throw new Error(data.error || 'Bağlantı oluşturulamadı')
    } catch (err) {
      uyari("Ödeme bağlantısı oluşturulamadı: " + hataMesaji(err), "Hata")
    } finally {
      setCheckoutLoading(false)
    }
  }

  function setF(key: keyof Ayarlar, val: unknown) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function setDilim(i: number, field: keyof VergiDilimi, val: number) {
    setForm(f => {
      const d = [...(f.vergi_dilimleri || [])]
      d[i] = { ...d[i], [field]: val }
      return { ...f, vergi_dilimleri: d }
    })
  }

  async function kaydet() {
    const saatUcreti = Number(form.saat_ucreti)
    if (!(saatUcreti > 0)) {
      setMsg({ type: 'error', text: 'Manuel saat ücreti 0\'dan büyük olmalı (öğrenci aidatı bu ücretle hesaplanır).' })
      return
    }

    setSaving(true)
    setMsg(null)

    // mudur_unvani, duzenleyen_adi/unvani, ssk_sube, imza_url de ayarlar tablosunda var;
    // eskiden burada ayıklandıkları için kaydedilmiyorlardı (PDF'lerde "Düzenleyen" boş çıkıyordu)
    const validData = form

    const { error } = await supabase
      .from('ayarlar')
      .upsert(
        { 
          ...validData, 
          gv_istisna_sabiti: form.gv_istisna_sabiti ?? 0,
          dv_istisna_sabiti: form.dv_istisna_sabiti ?? 0,
          saat_ucreti: saatUcreti,
          ogrenci_saat_ucreti: saatUcreti, // eski alan; saat_ucreti ile eş tutulur
          updated_at: new Date().toISOString() 
        },
        { onConflict: 'okul_id' }
      )

    setSaving(false)
    if (error) {
      setMsg({ type: 'error', text: 'Kayıt hatası: ' + error.message })
    } else {
      setMsg({ type: 'success', text: '✅ Ayarlar başarıyla kaydedildi! (Not: Ek alanlar için veritabanı güncellemesi gerekebilir)' })
      setTimeout(() => setMsg(null), 3000)
    }
  }

  // ============================================================
  // Tatil İşlemleri
  // ============================================================
  async function tatilEkle() {
    if (!tatilForm.ad || !tatilForm.bas || !tatilForm.bit) {
      setMsg({ type: 'error', text: 'Lütfen tüm alanları doldurun' })
      return
    }
    const mevcutMu = tatiller.some(t =>
      t.ad.trim().toLowerCase() === tatilForm.ad.trim().toLowerCase() &&
      t.baslangic_tarihi === tatilForm.bas &&
      t.bitis_tarihi === tatilForm.bit
    )
    if (mevcutMu) {
      setTatilEkleAcik(false)
      setConf({
        open: true,
        type: 'tatilEklendi',
        title: 'Zaten Kayıtlı',
        message: `"${tatilForm.ad}" tatili bu tarihler için zaten takvimde mevcut.`,
      })
      return
    }
    setTatilSaving(true)
    const { error } = await supabase.from('tatiller').insert({
      ad: tatilForm.ad,
      baslangic_tarihi: tatilForm.bas,
      bitis_tarihi: tatilForm.bit,
      tip: tatilForm.tip,
      okul_id: okulData?.id ?? null,
    })

    if (error) setMsg({ type: 'error', text: 'Hata: ' + error.message })
    else {
      const { data: yeniListe } = await supabase.from('tatiller').select('*').or(`okul_id.eq.${okulData?.id ?? 0},okul_id.is.null`).order('baslangic_tarihi', { ascending: true })
      if (yeniListe) setTatiller(yeniListe)
      setTatilForm({ ad: '', bas: '', bit: '', tip: 'ozel' })
      setConf({
        open: true,
        type: 'tatilEklendi',
        title: 'Tatil Eklendi',
        message: `"${tatilForm.ad}" tatili başarıyla takvime eklendi.`,
      })
    }
    setTatilSaving(false)
  }

  async function tatilSil(id: number) {
    setConf({
      open: true,
      type: 'tatilSil',
      id,
      title: 'Tatil Gününü Sil',
      message: 'Bu tatil gününü silmek istediğinize emin misiniz?'
    })
  }

  async function tatilSilGercek(id: number) {
    setConf(null)
    const { error } = await supabase.from('tatiller').delete().eq('id', id)
    if (!error) setTatiller(t => t.filter(x => x.id !== id))
  }

  const saatUcretiHesapla = () => {
    const g = form.gosterge || 140
    const k = form.katsayi || 1.387871
    const yemek = form.yemek
    return (g * k / (yemek ? 3 : 4)).toFixed(2)
  }

  const TABS = [
    { id: 'kurumsal', label: 'Kurum bilgileri', desc: 'Adınız, adresiniz, yetkili kişiler, vergi ve SGK numaraları', kw: 'kurum ad adres telefon eposta müdür imza kaşe vergi sgk sicil bildirge', icon: <Building2 size={17} /> },
    { id: 'mali', label: 'Ücret ve kesintiler', desc: 'Saat ücreti, asgari ücret, SGK ve damga vergisi oranları', kw: 'saat ücreti katsayı gösterge yemek maaş sgk damga asgari tavan istisna aidat', icon: <Banknote size={17} /> },
    { id: 'vergi', label: 'Vergi dilimleri', desc: 'Yıllık vergi dilimleri ve oranları', kw: 'vergi dilim oran gelir yıllık', icon: <Scale size={17} /> },
    { id: 'kulup', label: 'Kulüp bilgileri', desc: 'Denetim formu (EK-6) için kurum kodu, açılış onayı, etkinlik alanları', kw: 'kulüp denetim ek-6 ek6 form kurum kodu açılış onay faaliyet etkinlik alan bahçe sınıf oyun sözleşme', icon: <ClipboardCheck size={17} /> },
    { id: 'tatil', label: 'Takvim ve tatiller', desc: 'Kulübün başladığı gün, resmî ve özel tatiller', kw: 'tatil takvim başlangıç eğitim yılı bayram', icon: <Calendar size={17} /> },
    { id: 'lisans', label: 'Abonelik', desc: 'Deneme süresi, lisans durumu, plan yenileme', kw: 'lisans abonelik ödeme plan deneme süre yenile fatura', icon: <CreditCard size={17} /> },
    { id: 'guvenlik', label: 'Şifre', desc: 'Giriş şifrenizi değiştirin', kw: 'şifre parola güvenlik hesap profil', icon: <ShieldCheck size={17} /> },
  ]

  // Ayarlarda arama + kurulum kontrol listesi
  const [ayAra, setAyAra] = useState('')
  const ayAraQ = ayAra.toLocaleLowerCase('tr-TR').trim()
  const gorunenTabs = ayAraQ ? TABS.filter(t => (t.label + ' ' + t.desc + ' ' + t.kw).toLocaleLowerCase('tr-TR').includes(ayAraQ)) : TABS
  const kurulum: { label: string; ok: boolean; tab: string }[] = [
    { label: 'Kurum adı', ok: !!form.kurum_adi, tab: 'kurumsal' },
    { label: 'Müdür / onaylayan kişi', ok: !!form.mudur_adi, tab: 'kurumsal' },
    { label: 'Vergi ve SGK numaraları', ok: !!(form.vergi_no && form.sgk_no), tab: 'kurumsal' },
    { label: 'Saat ücreti', ok: !!form.saat_ucreti, tab: 'mali' },
    { label: 'Kulüp başlangıç tarihi', ok: !!kbMevcut, tab: 'tatil' },
  ]
  const kurulumTamam = kurulum.filter(k => k.ok).length

  const [passForm, setPassForm] = useState({ newP: '', confirmP: '' })
  const [passSaving, setPassSaving] = useState(false)

  async function sifreGuncelle(e: React.FormEvent) {
    e.preventDefault()
    if (passForm.newP !== passForm.confirmP) {
      setMsg({ type: 'error', text: 'Şifreler birbiriyle eşleşmiyor!' })
      return
    }
    setPassSaving(true)
    const { error } = await supabase.auth.updateUser({ password: passForm.newP })
    setPassSaving(false)
    if (error) {
      setMsg({ type: 'error', text: 'Şifre güncellenirken hata: ' + error.message })
    } else {
      setMsg({ type: 'success', text: '✅ Şifreniz başarıyla güncellendi!' })
      setPassForm({ newP: '', confirmP: '' })
      setTimeout(() => setMsg(null), 3000)
    }
  }

  const sUcret = saatUcretiHesapla()

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Topbar
        title="Okul Ayarları"
        sub="Kurum bilgilerinizi, ücretleri ve takvimi buradan yönetin"
        actions={
          <button className="btn btn-primary no-print" onClick={kaydet} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
          </button>
        }
      />
      
      <div style={{ padding: '24px 32px' }}>
        {msg && (
          <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: 24 }}>
            {msg.type === 'success' ? <CheckCircle2 size={18} /> : <Info size={18} />}
            {msg.text}
          </div>
        )}

        {/* Bölüm sekmeleri: tek satır */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <div role="tablist" aria-label="Ayar bölümleri" style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
            {gorunenTabs.map(t => {
              const aktif = activeTab === t.id
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={aktif}
                  title={t.desc}
                  onClick={() => setActiveTab(t.id as typeof activeTab)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', marginBottom: -1, border: 'none', borderBottom: '2px solid ' + (aktif ? 'var(--accent)' : 'transparent'), background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: aktif ? 600 : 500, color: aktif ? 'var(--text)' : 'var(--text3)', whiteSpace: 'nowrap' }}
                >
                  <span style={{ display: 'flex', color: aktif ? 'var(--accent)' : 'var(--text3)' }}>{t.icon}</span>
                  {t.label}
                </button>
              )
            })}
            {gorunenTabs.length === 0 && <span style={{ fontSize: 13, color: 'var(--text3)', padding: '12px 4px' }}>“{ayAra}” ile eşleşen ayar bulunamadı.</span>}
          </div>
          <div style={{ position: 'relative', width: 230, marginBottom: 6 }}>
            <Search size={15} style={{ position: 'absolute', left: 11, top: 10, color: 'var(--text3)' }} />
            <input className="form-input" style={{ paddingLeft: 34, minHeight: 34 }} placeholder="Ayarlarda ara" aria-label="Ayarlarda ara" value={ayAra} onChange={e => setAyAra(e.target.value)} />
          </div>
        </div>

        {/* Seçili bölümün tek satır açıklaması */}
        <p style={{ margin: '12px 0 16px', fontSize: 13.5, color: 'var(--text3)' }}>{TABS.find(t => t.id === activeTab)?.desc}</p>

        {/* Eksik kurulum maddeleri: yalnızca eksik varsa */}
        {kurulumTamam < kurulum.length && (
          <div className="alert alert-info" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
            <Info size={16} style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: 600 }}>Kurulum {kurulumTamam}/{kurulum.length}</span>
            <span>Eksik bilgiler:</span>
            {kurulum.filter(k => !k.ok).map(k => (
              <button key={k.label} onClick={() => setActiveTab(k.tab as typeof activeTab)} style={{ border: '1px solid #c9d4fa', background: '#fff', color: 'var(--accent-dark)', borderRadius: 99, padding: '2px 10px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>{k.label} →</button>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: activeTab === 'mali' ? '1fr 340px' : '1fr', gap: 24, alignItems: 'start' }}>
          
          <div className="flex flex-col gap-6">
            {/* TAB 1: KURUMSAL KİMLİK */}
            {activeTab === 'kurumsal' && (
              <div className="card" style={{ margin: 0 }}>
                <div className="card-title" style={{ marginBottom: 4 }}><Building2 size={20} color="var(--accent)" /> Kurum bilgileri</div>
                <p style={{ fontSize: 13, color: 'var(--text3)', margin: '0 0 18px' }}>Bu bilgiler bordro, tahakkuk cetveli ve resmî evrakların üst kısmında yazdırılır. Boş bırakılan alanlar çıktıda boş görünür.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="ay-kurum-adi" className="form-label">Kurum Adı</label>
                    <div style={{ position: 'relative' }}>
                      <Building2 size={16} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text3)' }} />
                      <input id="ay-kurum-adi" className="form-input" style={{ paddingLeft: 34 }} value={form.kurum_adi || ''} onChange={e => setF('kurum_adi', e.target.value)} />
                    </div>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="ay-oab-adi" className="form-label">Okul Aile Birliği Adı</label>
                    <div style={{ position: 'relative' }}>
                      <Building2 size={16} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text3)' }} />
                      <input id="ay-oab-adi" className="form-input" style={{ paddingLeft: 34 }} value={form.oab_adi || ''} onChange={e => setF('oab_adi', e.target.value)} placeholder={`${okulData?.ad || 'Okul adı'} Okul Aile Birliği`} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>OAB tahsilat listesi ve işletme defteri çıktılarının başlığında yazar. Boş bırakılırsa okul adının sonuna “Okul Aile Birliği” eklenir.</div>
                  </div>

                  <div>
                    <label htmlFor="ay-mudur-adi" className="form-label">Müdür Adı / Onaylayan</label>
                    <div style={{ position: 'relative' }}>
                      <User size={16} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text3)' }} />
                      <input id="ay-mudur-adi" className="form-input" style={{ paddingLeft: 34 }} value={form.mudur_adi || ''} onChange={e => setF('mudur_adi', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="ay-mudur-unvani" className="form-label">Müdür Unvanı</label>
                    <input id="ay-mudur-unvani" className="form-input" value={form.mudur_unvani || ''} onChange={e => setF('mudur_unvani', e.target.value)} placeholder="Örn: Okul Müdürü" />
                  </div>

                  <div>
                    <label htmlFor="ay-duzenleyen-adi" className="form-label">Hazırlayan / Düzenleyen</label>
                    <input id="ay-duzenleyen-adi" className="form-input" value={form.duzenleyen_adi || ''} onChange={e => setF('duzenleyen_adi', e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="ay-duzenleyen-unvani" className="form-label">Düzenleyen Unvanı</label>
                    <input id="ay-duzenleyen-unvani" className="form-input" value={form.duzenleyen_unvani || ''} onChange={e => setF('duzenleyen_unvani', e.target.value)} />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="ay-adres" className="form-label">Adres</label>
                    <div style={{ position: 'relative' }}>
                      <MapPin size={16} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text3)' }} />
                      <textarea id="ay-adres" className="form-input" style={{ paddingLeft: 34, minHeight: 60, resize: 'vertical' }} value={form.adres || ''} onChange={e => setF('adres', e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="ay-tel" className="form-label">Telefon</label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={16} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text3)' }} />
                      <input id="ay-tel" className="form-input" style={{ paddingLeft: 34 }} value={form.tel || ''} onChange={e => setF('tel', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="ay-email" className="form-label">E-posta</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text3)' }} />
                      <input id="ay-email" className="form-input" style={{ paddingLeft: 34 }} value={form.email || ''} onChange={e => setF('email', e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="ay-vergi-dairesi" className="form-label">Vergi Dairesi</label>
                    <input id="ay-vergi-dairesi" className="form-input" value={form.vergi_dairesi || ''} onChange={e => setF('vergi_dairesi', e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="ay-vergi-no" className="form-label">Vergi No</label>
                    <input id="ay-vergi-no" className="form-input" value={form.vergi_no || ''} onChange={e => setF('vergi_no', e.target.value)} />
                  </div>

                  <div>
                    <label htmlFor="ay-sgk-no" className="form-label">SGK Sicil No (Kısa)</label>
                    <input id="ay-sgk-no" className="form-input" value={form.sgk_no || ''} onChange={e => setF('sgk_no', e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="ay-ssk-sube" className="form-label">SSK Şube (Bölge)</label>
                    <input id="ay-ssk-sube" className="form-input" value={form.ssk_sube || ''} onChange={e => setF('ssk_sube', e.target.value)} />
                  </div>

                  <details style={{ gridColumn: 'span 2', padding: '12px 16px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, marginTop: 6 }}>
                    <summary style={{ fontSize: 13.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileCode2 size={15} color="var(--accent)" /> Gelişmiş: SGK e-Bildirge (XML) parametreleri
                      <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text3)', marginLeft: 'auto' }}>Yalnızca SGK bildirge dosyası alacaksanız</span>
                    </summary>
                    <div style={{ height: 12 }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
                      <div>
                        <label htmlFor="ay-sgk-sicil-no" className="form-label">Tam Sicil No (21 Hane)</label>
                        <input id="ay-sgk-sicil-no" className="form-input" maxLength={21} value={form.sgk_sicil_no || ''} onChange={e => setF('sgk_sicil_no', e.target.value)} placeholder="212340101123456703401" />
                      </div>
                      <div>
                        <label htmlFor="ay-sgk-kontrol-no" className="form-label">Kontrol No</label>
                        <input id="ay-sgk-kontrol-no" className="form-input" maxLength={2} value={form.sgk_kontrol_no || ''} onChange={e => setF('sgk_kontrol_no', e.target.value)} placeholder="00" />
                      </div>
                      <div>
                        <label htmlFor="ay-sgk-araci-no" className="form-label">Aracı No</label>
                        <input id="ay-sgk-araci-no" className="form-input" maxLength={3} value={form.sgk_araci_no || ''} onChange={e => setF('sgk_araci_no', e.target.value)} placeholder="000" />
                      </div>
                      <div>
                        <label htmlFor="ay-sgk-kanun-no" className="form-label">Kanun No</label>
                        <input id="ay-sgk-kanun-no" className="form-input" maxLength={5} value={form.sgk_kanun_no || ''} onChange={e => setF('sgk_kanun_no', e.target.value)} placeholder="05510" />
                      </div>
                      <div>
                        <label htmlFor="ay-sgk-belge-turu" className="form-label">Belge Türü</label>
                        <input id="ay-sgk-belge-turu" className="form-input" maxLength={2} value={form.sgk_belge_turu || ''} onChange={e => setF('sgk_belge_turu', e.target.value)} placeholder="01" />
                      </div>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10 }}>* Bu bilgiler SGK e-Bildirge XML dosyası oluşturulurken kullanılır.</p>
                  </details>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="ay-imza-url" className="form-label">Dijital İmza / Kaşe Görsel URL</label>
                    <input id="ay-imza-url" className="form-input" value={form.imza_url || ''} onChange={e => setF('imza_url', e.target.value)} placeholder="https://..." />
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>* Bordro zarfı ve resmi evraklarda bu görsel kullanılır.</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MALİ PARAMETRELER */}
            {activeTab === 'mali' && (
              <div className="flex flex-col gap-6">
                <div className="card" style={{ margin: 0 }}>
                  <div className="card-title" style={{ marginBottom: 4 }}><Calculator size={20} color="var(--accent)" /> Saat ücreti</div>
                  <p style={{ fontSize: 13, color: 'var(--text3)', margin: '0 0 14px' }}>Öğrenci aidatı ve öğretmen ek ders ücreti bu ücretten hesaplanır. Sağdaki özet değerleri değiştirdikçe güncellenir.</p>
                  <div className="alert alert-info">
                    <Info size={18} />
                    <span>MEB 1706 formülü: <strong>(Gösterge × Katsayı) / Bölen</strong> olarak hesaplanır. Yemek hizmeti varsa bölen 3, yoksa 4 alınır.</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div>
                      <label htmlFor="ay-katsayi" className="form-label">Maaş Katsayısı</label>
                      <SayiInput id="ay-katsayi" className="form-input" value={form.katsayi} onChange={v => setF('katsayi', v ?? 0)} />
                    </div>
                    <div>
                      <label htmlFor="ay-gosterge" className="form-label">Ek Ders Göstergesi</label>
                      <SayiInput id="ay-gosterge" className="form-input" value={form.gosterge} onChange={v => setF('gosterge', v ?? 0)} />
                    </div>
                    <div>
                      <label htmlFor="ay-gunluk-saat" className="form-label">Günlük Sabit Çalışma Saati</label>
                      <SayiInput id="ay-gunluk-saat" className="form-input" value={form.gunluk_saat} onChange={v => setF('gunluk_saat', v ?? 0)} />
                    </div>
                    <div>
                      <label htmlFor="ay-yemek" className="form-label">Yemek Hizmeti Durumu</label>
                      <select id="ay-yemek" className="form-select" value={form.yemek ? 'evet' : 'hayir'} onChange={e => setF('yemek', e.target.value === 'evet')}>
                        <option value="hayir">Hayır (Bölen 4)</option>
                        <option value="evet">Evet (Bölen 3)</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="ay-ogrenci-ucret" className="form-label">Manuel Saat Ücreti (₺)</label>
                      {/* Aidat hesabı (Ödeme Takibi, Genel Bakış, Bilanço) ayarlar.saat_ucreti'ni kullanır */}
                      <SayiInput id="ay-ogrenci-ucret" className="form-input" value={form.saat_ucreti} onChange={v => setF('saat_ucreti', v)} />
                      <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
                        * Öğrenci aidatı ve gelir havuzu bu ücret üzerinden hesaplanır.
                        {form.saat_ucreti != null && Number(form.saat_ucreti).toFixed(2) !== sUcret && (
                          <> Formüle göre hesaplanan: ₺{sUcret} — <button type="button" onClick={() => setF('saat_ucreti', parseFloat(sUcret))} style={{ border: 'none', background: 'none', padding: 0, color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', fontSize: 10, textDecoration: 'underline' }}>bunu kullan</button></>
                        )}
                      </p>
                    </div>
                    <div>
                      <label htmlFor="ay-ogretmen-manuel-ucret" className="form-label">Öğretmen Manuel Saat Ücreti (₺)</label>
                      <SayiInput id="ay-ogretmen-manuel-ucret" className="form-input" value={form.ogretmen_saat_ucreti} onChange={v => setF('ogretmen_saat_ucreti', v)} />
                      <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>* Boş bırakılırsa havuz paylaşımı (dinamik) uygulanır.</p>
                    </div>
                  </div>
                </div>

                <div className="card" style={{ margin: 0 }}>
                  <div className="card-title" style={{ marginBottom: 4 }}><ShieldCheck size={20} color="var(--success)" /> SGK ve vergi kesintileri</div>
                  <p style={{ fontSize: 13, color: 'var(--text3)', margin: '0 0 18px' }}>Bordro hesabında kesinti olarak uygulanır. Rakamlar her yıl başında değişir; resmî Gazete’deki güncel değerleri girin.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                    <div>
                      <label htmlFor="ay-asgari-ucret" className="form-label">Asgari Brüt Ücret</label>
                      <SayiInput id="ay-asgari-ucret" className="form-input" value={form.asgari_ucret} onChange={v => setF('asgari_ucret', v ?? 0)} />
                    </div>
                    <div>
                      <label htmlFor="ay-tavan" className="form-label">E.Y.D.M. Tavan Ücret</label>
                      <SayiInput id="ay-tavan" className="form-input" value={form.tavan_katsayi} onChange={v => setF('tavan_katsayi', v ?? 0)} />
                    </div>
                    <div />
                    <div>
                      <label htmlFor="ay-gv-istisna" className="form-label">Asgari Ücret GV İstisnası (₺/ay)</label>
                      <SayiInput id="ay-gv-istisna" className="form-input" placeholder="Boş: otomatik" value={form.gv_istisna_sabiti || null} onChange={v => setF('gv_istisna_sabiti', v ?? 0)} />
                      <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>* Ay ay değişir; boş bırakılırsa asgari ücretten hesaplanır.</p>
                    </div>
                    <div>
                      <label htmlFor="ay-dv-istisna" className="form-label">Asgari Ücret DV İstisnası (₺/ay)</label>
                      <SayiInput id="ay-dv-istisna" className="form-input" placeholder="Boş: otomatik" value={form.dv_istisna_sabiti || null} onChange={v => setF('dv_istisna_sabiti', v ?? 0)} />
                    </div>
                    <div />
                    <div>
                      <label htmlFor="ay-sgk-kisi" className="form-label">Kişi SGK Payı (%)</label>
                      <SayiInput id="ay-sgk-kisi" className="form-input" carpan={100} value={form.sgk_kisi_pay} onChange={v => setF('sgk_kisi_pay', v ?? 0)} />
                    </div>
                    <div>
                      <label htmlFor="ay-sgk-issizlik" className="form-label">Kişi İşsizlik Payı (%)</label>
                      <SayiInput id="ay-sgk-issizlik" className="form-input" carpan={100} value={form.sgk_issizlik_kisi} onChange={v => setF('sgk_issizlik_kisi', v ?? 0)} />
                    </div>
                    <div>
                      <label htmlFor="ay-damga" className="form-label">Damga Vergisi (Binde ‰)</label>
                      <SayiInput id="ay-damga" className="form-input" carpan={1000} placeholder="Örn: 7,59" value={form.damga_vergi_orani} onChange={v => setF('damga_vergi_orani', v ?? 0)} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: VERGİ DİLİMLERİ */}
            {activeTab === 'vergi' && (
              <div className="card" style={{ margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div className="card-title" style={{ margin: 0 }}><Scale size={20} color="var(--accent2)" /> Yıllık Gelir Vergisi Dilimleri</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-secondary btn-sm" onClick={async () => {
                      if (await onayla('2026 yılı resmi vergi dilimleri yüklenecektir. Mevcut dilimleriniz silinebilir. Devam edilsin mi?')) {
                        setForm(f => ({
                          ...f,
                          vergi_dilimleri: [
                            { "ust": 220000, "oran": 0.15 },
                            { "ust": 480000, "oran": 0.20 },
                            { "ust": 1800000, "oran": 0.27 },
                            { "ust": 6000000, "oran": 0.35 },
                            { "ust": 99999999, "oran": 0.40 }
                          ]
                        }))
                      }
                    }}>
                      <Download size={14} /> 2026 Dilimlerini Yükle
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => {
                      const d = [...(form.vergi_dilimleri || [])]
                      d.push({ ust: 0, oran: 0.15 })
                      setForm(f => ({ ...f, vergi_dilimleri: d }))
                    }}>
                      <Plus size={14} /> Yeni Dilim Ekle
                    </button>
                  </div>
                </div>
                <div className="alert alert-info">
                  <Info size={18} />
                  <span>Bu dilimler kümülatif vergi matrahı üzerinden hesaplanır. Geçerli yılın resmi rakamlarını girin.</span>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Dilim Sırası</th>
                      <th>Üst Limit (₺)</th>
                      <th style={{ width: 150 }}>Vergi Oranı (%)</th>
                      <th style={{ width: 50 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(form.vergi_dilimleri || []).length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: 30, color: 'var(--text3)' }}>Henüz vergi dilimi tanımlanmamış.</td></tr>
                    ) : (
                      (form.vergi_dilimleri || []).map((d, i) => (
                        <tr key={i}>
                          <td className="fw-600">{i + 1}. Dilim</td>
                          <td>
                            <SayiInput
                              aria-label={`${i + 1}. dilim üst limit`}
                              className="form-input"
                              value={d.ust || null}
                              onChange={v => setDilim(i, 'ust', v ?? 0)}
                            />
                          </td>
                          <td>
                            <div style={{ position: 'relative' }}>
                              <span style={{ position: 'absolute', right: 10, top: 8, color: 'var(--text3)' }}>%</span>
                              <SayiInput
                                aria-label={`${i + 1}. dilim vergi oranı`}
                                className="form-input"
                                carpan={100}
                                value={d.oran}
                                onChange={v => setDilim(i, 'oran', v ?? 0)}
                              />
                            </div>
                          </td>
                          <td>
                            <button className="btn btn-danger btn-sm" onClick={() => {
                              const d = [...(form.vergi_dilimleri || [])]
                              d.splice(i, 1)
                              setForm(f => ({ ...f, vergi_dilimleri: d }))
                            }}><Trash2 size={12} /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 4: TATİL YÖNETİMİ */}
            {activeTab === 'kulup' && <KulupBilgileriSekmesi okulId={okulData?.id} />}
            {activeTab === 'tatil' && <TatilSekmesi tatiller={tatiller} kbMevcut={kbMevcut} kbYil={kbYil} setKbYil={setKbYil} kbTarih={kbTarih} setKbTarih={setKbTarih} kbSaving={kbSaving} kulupBaslangicKaydet={kulupBaslangicKaydet} varsayilanEgitimYili={varsayilanEgitimYili} setTatilEkleAcik={setTatilEkleAcik} setTatilForm={setTatilForm} tatilSil={tatilSil} />}

            {/* TAB 6: LİSANS & ÖDEME */}
            {activeTab === 'lisans' && <LisansSekmesi okulData={okulData} lisansGecerli={lisansGecerli} secilenPeriod={secilenPeriod} setSecilenPeriod={setSecilenPeriod} checkoutLoading={checkoutLoading} handlePayment={handlePayment} />}

            {/* TAB 5: GÜVENLİK & PROFİL */}
            {activeTab === 'guvenlik' && <GuvenlikSekmesi passForm={passForm} setPassForm={setPassForm} passSaving={passSaving} sifreGuncelle={sifreGuncelle} />}
          </div>

          {/* SİDEBAR SUMMARY (Özellikle Mali Sekmesinde Aktif) */}
          {activeTab === 'mali' && (
            <div style={{ position: 'sticky', top: 24 }}>
              <div className="card" style={{ background: 'var(--accent-lighter)', color: 'var(--text)', border: '1px solid #c9d4fa' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, opacity: 0.9 }}>
                  <Calculator size={20} />
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Hesaplama Özeti</span>
                </div>
                
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4 }}>Hesaplanan Saat Ücreti</div>
                  <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-display)' }}>₺{sUcret}</div>
                  <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>
                    Aidatta uygulanan: <strong>₺{form.saat_ucreti != null ? Number(form.saat_ucreti).toFixed(2) : '—'}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid rgba(35,71,217,0.14)', paddingBottom: 8 }}>
                    <span style={{ opacity: 0.8 }}>Bölen Katsayısı</span>
                    <span className="fw-600">{form.yemek ? '3 (Yemekli)' : '4 (Yemeksiz)'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid rgba(35,71,217,0.14)', paddingBottom: 8 }}>
                    <span style={{ opacity: 0.8 }}>Günlük Çalışma</span>
                    <span className="fw-600">{form.gunluk_saat} Saat</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ opacity: 0.8 }}>Asgari Brüt</span>
                    <span className="fw-600">₺{form.asgari_ucret?.toLocaleString('tr-TR')}</span>
                  </div>
                </div>

                <div style={{ marginTop: 24, padding: '12px', background: 'rgba(35,71,217,0.14)', borderRadius: 8, fontSize: 11, lineHeight: 1.5 }}>
                  <Info size={14} style={{ marginBottom: 6 }} />
                  Katsayı veya gösterge değerlerini değiştirdiğinizde bu alan anlık olarak güncellenir.
                </div>
              </div>

              <div className="card" style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={16} color="var(--success)" /> Kesinti Özeti
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text3)' }}>SGK (Kişi)</span>
                    <span className="fw-600">%{(((form.sgk_kisi_pay || 0) + (form.sgk_issizlik_kisi || 0)) * 100).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text3)' }}>Damga Vergisi</span>
                    <span className="fw-600">‰{((form.damga_vergi_orani || 0) * 1000).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {conf?.open && conf.type === 'tatilEklendi' && (
        <ConfirmModal
          baslik={conf.title}
          mesaj={conf.message}
          onayMetni="Tamam"
          iptalMetni=""
          tehlikeli={false}
          basari={true}
          onOnayla={() => setConf(null)}
          onIptal={() => setConf(null)}
        />
      )}
      {conf?.open && conf.type !== 'tatilEklendi' && (
        <ConfirmModal
          baslik={conf.title}
          mesaj={conf.message}
          onayMetni={conf.type === 'tatilSil' ? 'Evet, Sil' : 'Evet, Yükle'}
          tehlikeli={conf.type === 'tatilSil'}
          onOnayla={() => {
            if (conf.type === 'tatilSil') tatilSilGercek(conf.id!)
          }}
          onIptal={() => setConf(null)}
        />
      )}

      {/* Tatil Ekle Popup */}
      {tatilEkleAcik && (
        <div
          onClick={() => setTatilEkleAcik(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, animation: 'fadeIn 0.15s ease' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--card-bg, #fff)', borderRadius: 16, width: '90%', maxWidth: 420, padding: '28px 28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', animation: 'slideUp 0.2s ease' }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent-light, #f0fdf4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 14 }}>
              📅
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: 'var(--text1)' }}>Yeni Tatil Ekle</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text3)' }}>Bu tatil yalnızca kendi okulunuza uygulanır.</p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="form-label">Tatil Adı</label>
                <input className="form-input" value={tatilForm.ad} onChange={e => setTatilForm({ ...tatilForm, ad: e.target.value })} placeholder="Örn: Yarıyıl Tatili" autoFocus />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="form-label">Başlangıç</label>
                  <input className="form-input" type="date" value={tatilForm.bas} onChange={e => setTatilForm({ ...tatilForm, bas: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Bitiş</label>
                  <input className="form-input" type="date" value={tatilForm.bit} onChange={e => setTatilForm({ ...tatilForm, bit: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="form-label">Tatil Türü</label>
                <select className="form-select" value={tatilForm.tip} onChange={e => setTatilForm({ ...tatilForm, tip: e.target.value })}>
                  <option value="idari">İdari İzin</option>
                  <option value="ozel">Özel Tatil / Ara Tatil</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button className="btn btn-secondary" onClick={() => setTatilEkleAcik(false)}>Vazgeç</button>
                <button className="btn btn-primary" onClick={async () => { await tatilEkle(); setTatilEkleAcik(false) }} disabled={tatilSaving}>
                  <Plus size={15} /> {tatilSaving ? 'Kaydediliyor...' : 'Ekle'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
