'use client'
import { useEffect, useState } from 'react'
import Topbar from '@/components/Topbar'
import { supabase } from '@/lib/supabase'
import { Ayarlar, VergiDilimi, Tatil } from '@/lib/types'
import { 
  Building2, 
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
  Hash,
  Calculator,
  Zap,
  Trash2,
  Plus,
  Lock,
  CreditCard,
  CheckCircle2,
  Globe,
  AlertTriangle,
  Key,
  Clock
} from 'lucide-react'
import ConfirmModal from '@/components/ConfirmModal'
import { createCheckoutLink } from '@/lib/lemonsqueezy'
import { Okul } from '@/lib/types'

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
  const [activeTab, setActiveTab] = useState<'kurumsal' | 'mali' | 'vergi' | 'tatil' | 'guvenlik' | 'lisans'>('kurumsal')
  // Tatil Yönetimi Durumu
  const [tatiller, setTatiller] = useState<Tatil[]>([])
  const [tatilForm, setTatilForm] = useState({ ad: '', bas: '', bit: '', tip: 'ozel' })
  const [tatilSaving, setTatilSaving] = useState(false)
  const [tatilEkleAcik, setTatilEkleAcik] = useState(false)
  const [conf, setConf] = useState<{
    open: boolean,
    type: 'tatilSil' | 'sihirbaz' | 'tatilEklendi',
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
          console.warn('⚠️ Profil veya okul_id bulunamadı:', pErr?.message)
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
      const res = await fetch('/api/lemonsqueezy/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ okulId: okulData.id, variantId, interval })
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else throw new Error(data.error || 'Bağlantı oluşturulamadı')
    } catch (err: any) {
      alert("Hata: " + err.message)
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
    setSaving(true)
    setMsg(null)

    // gv_istisna_sabiti ve dv_istisna_sabiti artık kaydediliyor
    // Sadece DB şemasında olmayan alanları filtrele
    const { 
      mudur_unvani, duzenleyen_adi, duzenleyen_unvani, ssk_sube, imza_url,
      ...validData 
    } = form as any

    const { error } = await supabase
      .from('ayarlar')
      .upsert(
        { 
          ...validData, 
          gv_istisna_sabiti: form.gv_istisna_sabiti ?? 0,
          dv_istisna_sabiti: form.dv_istisna_sabiti ?? 0,
          ogrenci_saat_ucreti: form.ogrenci_saat_ucreti ?? 0,
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

  async function tatilSihirbazı2026() {
    setConf({
      open: true,
      type: 'sihirbaz',
      title: 'Resmi Tatil Sihirbazı',
      message: '2026 yılı resmi tatilleri otomatik olarak eklenecek. Devam edilsin mi?'
    })
  }

  async function tatilSihirbazıGercek() {
    setConf(null)
    setTatilSaving(true)
    
    // Mevcut okulun ID'sini al
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profil } = await supabase.from('profiller').select('okul_id').eq('id', user?.id).single()
    const okulId = profil?.okul_id

    if (!okulId) {
      setMsg({ type: 'error', text: 'Okul bilgisi bulunamadı' })
      setTatilSaving(false)
      return
    }

    const resmiTatiller = [
      { ad: 'Yılbaşı', bas: '2026-01-01', bit: '2026-01-01', tip: 'resmi' },
      { ad: '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı', bas: '2026-04-23', bit: '2026-04-23', tip: 'resmi' },
      { ad: '1 Mayıs Emek ve Dayanışma Günü', bas: '2026-05-01', bit: '2026-05-01', tip: 'resmi' },
      { ad: '19 Mayıs Atatürk\'ü Anma, Gençlik ve Spor Bayramı', bas: '2026-05-19', bit: '2026-05-19', tip: 'resmi' },
      { ad: '15 Temmuz Demokrasi ve Milli Birlik Günü', bas: '2026-07-15', bit: '2026-07-15', tip: 'resmi' },
      { ad: '30 Ağustos Zafer Bayramı', bas: '2026-08-30', bit: '2026-08-30', tip: 'resmi' },
      { ad: '29 Ekim Cumhuriyet Bayramı', bas: '2026-10-29', bit: '2026-10-29', tip: 'resmi' },
      { ad: 'Ramazan Bayramı 1. Gün', bas: '2026-03-20', bit: '2026-03-20', tip: 'resmi' },
      { ad: 'Ramazan Bayramı 2. Gün', bas: '2026-03-21', bit: '2026-03-21', tip: 'resmi' },
      { ad: 'Ramazan Bayramı 3. Gün', bas: '2026-03-22', bit: '2026-03-22', tip: 'resmi' },
      { ad: 'Kurban Bayramı 1. Gün', bas: '2026-05-27', bit: '2026-05-27', tip: 'resmi' },
      { ad: 'Kurban Bayramı 2. Gün', bas: '2026-05-28', bit: '2026-05-28', tip: 'resmi' },
      { ad: 'Kurban Bayramı 3. Gün', bas: '2026-05-29', bit: '2026-05-29', tip: 'resmi' },
      { ad: 'Kurban Bayramı 4. Gün', bas: '2026-05-30', bit: '2026-05-30', tip: 'resmi' },
    ]

    const inserts = resmiTatiller.map(t => ({
      okul_id: okulId,
      ad: t.ad,
      baslangic_tarihi: t.bas,
      bitis_tarihi: t.bit,
      tip: t.tip
    }))

    // Önce hepsini ekle (Hata almamak için düz insert)
    const { error } = await supabase.from('tatiller').insert(inserts)
    
    if (error && !error.message.includes('duplicate')) {
      setMsg({ type: 'error', text: 'Sihirbaz hatası: ' + error.message })
    } else {
      const { data } = await supabase.from('tatiller').select('*').eq('okul_id', okulId).order('baslangic_tarihi')
      setTatiller(data || [])
      setMsg({ type: 'success', text: '✅ Sihirbaz: 2026 Resmi tatilleri başarıyla eklendi!' })
      setTimeout(() => setMsg(null), 3000)
    }
    setTatilSaving(false)
  }

  const saatUcretiHesapla = () => {
    const g = form.gosterge || 140
    const k = form.katsayi || 1.387871
    const yemek = form.yemek
    return (g * k / (yemek ? 3 : 4)).toFixed(2)
  }

  const TABS = [
    { id: 'kurumsal', label: 'Kurumsal Kimlik', icon: <Building2 size={18} /> },
    { id: 'mali', label: 'Mali Parametreler', icon: <Banknote size={18} /> },
    { id: 'vergi', label: 'Vergi Dilimleri', icon: <Scale size={18} /> },
    { id: 'tatil', label: 'Tatil Takvimi', icon: <Calendar size={18} /> },
    { id: 'lisans', label: 'Lisans & Ödeme', icon: <CreditCard size={18} /> },
    { id: 'guvenlik', label: 'Güvenlik & Profil', icon: <ShieldCheck size={18} /> },
  ]

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
        title="Kurum Ayarları"
        sub="Sistem parametreleri ve kurumsal bilgiler"
        actions={
          <button className="btn btn-primary no-print" onClick={kaydet} disabled={saving}>
            {saving ? <Zap size={16} className="animate-pulse" /> : <Save size={16} />}
            {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
          </button>
        }
      />
      
      <div style={{ padding: '24px 32px' }}>
        {msg && (
          <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: 24 }}>
            {msg.type === 'success' ? <Zap size={18} /> : <Info size={18} />}
            {msg.text}
          </div>
        )}

        <div className="tab-bar">
          {TABS.map(t => (
            <div 
              key={t.id} 
              className={`tab-item ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id as any)}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {t.icon}
              {t.label}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: activeTab === 'mali' ? '1fr 340px' : '1fr', gap: 24, alignItems: 'start' }}>
          
          <div className="flex flex-col gap-6">
            {/* TAB 1: KURUMSAL KİMLİK */}
            {activeTab === 'kurumsal' && (
              <div className="card" style={{ margin: 0 }}>
                <div className="card-title"><Building2 size={20} color="var(--accent)" /> Kurumsal Kimlik & İletişim</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="ay-kurum-adi" className="form-label">Kurum Adı</label>
                    <div style={{ position: 'relative' }}>
                      <Building2 size={16} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text3)' }} />
                      <input id="ay-kurum-adi" className="form-input" style={{ paddingLeft: 34 }} value={form.kurum_adi || ''} onChange={e => setF('kurum_adi', e.target.value)} />
                    </div>
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

                  <div style={{ gridColumn: 'span 2', padding: '16px', background: 'var(--bg2)', borderRadius: 12, marginTop: 10 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Zap size={16} color="var(--accent)" /> e-Bildirge (SGK XML) Parametreleri
                    </h4>
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
                  </div>

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
                  <div className="card-title"><Calculator size={20} color="var(--accent)" /> MEB Saat Ücreti Hesaplama Parametreleri</div>
                  <div className="alert alert-info">
                    <Info size={18} />
                    <span>MEB 1706 formülü: <strong>(Gösterge × Katsayı) / Bölen</strong> olarak hesaplanır. Yemek hizmeti varsa bölen 3, yoksa 4 alınır.</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div>
                      <label htmlFor="ay-katsayi" className="form-label">Maaş Katsayısı</label>
                      <input id="ay-katsayi" className="form-input" type="number" step="0.000001" value={form.katsayi || 0} onChange={e => setF('katsayi', parseFloat(e.target.value))} />
                    </div>
                    <div>
                      <label htmlFor="ay-gosterge" className="form-label">Ek Ders Göstergesi</label>
                      <input id="ay-gosterge" className="form-input" type="number" value={form.gosterge || 0} onChange={e => setF('gosterge', parseInt(e.target.value))} />
                    </div>
                    <div>
                      <label htmlFor="ay-gunluk-saat" className="form-label">Günlük Sabit Çalışma Saati</label>
                      <input id="ay-gunluk-saat" className="form-input" type="number" value={form.gunluk_saat || 6} onChange={e => setF('gunluk_saat', parseInt(e.target.value))} />
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
                      <input id="ay-ogrenci-ucret" className="form-input" type="number" step="0.01" value={form.ogrenci_saat_ucreti || 0} onChange={e => setF('ogrenci_saat_ucreti', parseFloat(e.target.value))} />
                      <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>* Öğrenci gelir havuzu bu ücret üzerinden hesaplanır.</p>
                    </div>
                    <div>
                      <label htmlFor="ay-ogretmen-manuel-ucret" className="form-label">Öğretmen Manuel Saat Ücreti (₺)</label>
                      <input id="ay-ogretmen-manuel-ucret" className="form-input" type="number" step="0.01" value={form.ogretmen_saat_ucreti || 0} onChange={e => setF('ogretmen_saat_ucreti', parseFloat(e.target.value))} />
                      <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>* Boş bırakılırsa havuz paylaşımı (dinamik) uygulanır.</p>
                    </div>
                  </div>
                </div>

                <div className="card" style={{ margin: 0 }}>
                  <div className="card-title"><ShieldCheck size={20} color="var(--success)" /> SGK & Vergi Kesinti Oranları</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                    <div>
                      <label htmlFor="ay-asgari-ucret" className="form-label">Asgari Brüt Ücret</label>
                      <input id="ay-asgari-ucret" className="form-input" type="number" value={form.asgari_ucret || 0} onChange={e => setF('asgari_ucret', parseFloat(e.target.value))} />
                    </div>
                    <div>
                      <label htmlFor="ay-tavan" className="form-label">E.Y.D.M. Tavan Ücret</label>
                      <input id="ay-tavan" className="form-input" type="number" value={form.tavan_katsayi || 0} onChange={e => setF('tavan_katsayi', parseFloat(e.target.value))} />
                    </div>
                    <div />
                    <div>
                      <label htmlFor="ay-sgk-kisi" className="form-label">Kişi SGK Payı (%)</label>
                      <input id="ay-sgk-kisi" className="form-input" type="number" step="any" value={Number(((form.sgk_kisi_pay || 0) * 100).toFixed(4))} onChange={e => setF('sgk_kisi_pay', parseFloat(e.target.value) / 100)} />
                    </div>
                    <div>
                      <label htmlFor="ay-sgk-issizlik" className="form-label">Kişi İşsizlik Payı (%)</label>
                      <input id="ay-sgk-issizlik" className="form-input" type="number" step="any" value={Number(((form.sgk_issizlik_kisi || 0) * 100).toFixed(4))} onChange={e => setF('sgk_issizlik_kisi', parseFloat(e.target.value) / 100)} />
                    </div>
                    <div>
                      <label htmlFor="ay-damga" className="form-label">Damga Vergisi (Binde ‰)</label>
                      <input id="ay-damga" className="form-input" type="number" step="any" placeholder="Örn: 7.59" value={Number(((form.damga_vergi_orani || 0) * 1000).toFixed(5))} onChange={e => setF('damga_vergi_orani', parseFloat(e.target.value) / 1000)} />
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
                    <button className="btn btn-secondary btn-sm" onClick={() => {
                      if (confirm('2026 yılı resmi vergi dilimleri yüklenecektir. Mevcut dilimleriniz silinebilir. Devam edilsin mi?')) {
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
                      <Zap size={14} /> 2026 Dilimlerini Yükle
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
                            <input 
                              aria-label={`${i + 1}. dilim üst limit`} 
                              className="form-input" 
                              type="number" 
                              value={d.ust || ''} 
                              onChange={e => setDilim(i, 'ust', e.target.value === '' ? 0 : parseFloat(e.target.value))} 
                            />
                          </td>
                          <td>
                            <div style={{ position: 'relative' }}>
                              <span style={{ position: 'absolute', right: 10, top: 8, color: 'var(--text3)' }}>%</span>
                              <input 
                                aria-label={`${i + 1}. dilim vergi oranı`} 
                                className="form-input" 
                                type="number" 
                                value={isNaN(d.oran) ? '' : d.oran * 100} 
                                onChange={e => setDilim(i, 'oran', e.target.value === '' ? 0 : parseFloat(e.target.value) / 100)} 
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
            {activeTab === 'tatil' && (
              <div className="card" style={{ margin: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>

                  {/* SOL: Global tatiller */}
                  <div style={{ borderRight: '1px solid var(--border)', paddingRight: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Calendar size={16} color="var(--accent)" />
                      <span style={{ fontWeight: 700, fontSize: 13 }}>Resmi &amp; İdari Tatiller</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', background: 'var(--surface2)', padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                        Yönetimden
                      </span>
                    </div>
                    <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                      {tatiller.filter(t => t.okul_id === null).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 12 }}>
                          Henüz eklenmemiş.
                        </div>
                      ) : (
                        tatiller.filter(t => t.okul_id === null).map(t => (
                          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{t.ad}</div>
                              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                                {new Date(t.baslangic_tarihi).toLocaleDateString('tr-TR')}
                                {t.baslangic_tarihi !== t.bitis_tarihi && ` – ${new Date(t.bitis_tarihi).toLocaleDateString('tr-TR')}`}
                              </div>
                            </div>
                            <span className={`badge ${t.tip === 'resmi' ? 'badge-blue' : 'badge-orange'}`} style={{ fontSize: 10, whiteSpace: 'nowrap' }}>
                              {t.tip === 'resmi' ? 'Resmi' : 'İdari'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* SAĞ: Okula özel tatiller */}
                  <div style={{ paddingLeft: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Plus size={16} color="var(--accent)" />
                        <span style={{ fontWeight: 700, fontSize: 13 }}>Okula Özel Tatiller</span>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => { setTatilForm({ ad: '', bas: '', bit: '', tip: 'ozel' }); setTatilEkleAcik(true) }}>
                        <Plus size={13} /> Ekle
                      </button>
                    </div>
                    <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                      {tatiller.filter(t => t.okul_id !== null).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 12 }}>
                          Henüz okula özel tatil eklenmemiş.
                        </div>
                      ) : (
                        tatiller.filter(t => t.okul_id !== null).map(t => (
                          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{t.ad}</div>
                              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                                {new Date(t.baslangic_tarihi).toLocaleDateString('tr-TR')}
                                {t.baslangic_tarihi !== t.bitis_tarihi && ` – ${new Date(t.bitis_tarihi).toLocaleDateString('tr-TR')}`}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                              <span className={`badge ${t.tip === 'idari' ? 'badge-orange' : 'badge-green'}`} style={{ fontSize: 10 }}>
                                {t.tip === 'idari' ? 'İdari' : 'Özel'}
                              </span>
                              <button className="btn btn-danger btn-sm" style={{ padding: '2px 6px' }} onClick={() => tatilSil(t.id)}><Trash2 size={11} /></button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB 6: LİSANS & ÖDEME */}
            {activeTab === 'lisans' && (
              <div className="card" style={{ margin: 0, maxWidth: 600 }}>
                <div className="card-title"><CreditCard size={20} color="var(--accent)" /> Sistem Lisans Durumu</div>
                
                <div style={{ padding: '24px', background: 'var(--bg2)', borderRadius: 16, marginBottom: 24 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Lisans Durumu</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: okulData?.odeme_durumu === 'aktif' ? '#10b981' : '#f59e0b' }}></div>
                        <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>{okulData?.odeme_durumu || 'Deneme'}</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Bitiş Tarihi</div>
                      <div style={{ fontWeight: 700 }}>
                        {okulData?.lisans_bitis ? new Date(okulData.lisans_bitis).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Belirlenmedi'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="alert alert-info" style={{ marginBottom: 24 }}>
                  <Info size={18} />
                  <span>Sistem lisansınız <strong>{secilenPeriod === 'month' ? 'aylık' : 'yıllık'}</strong> olarak yenilenir. Ödeme yapıldığında süreniz otomatik olarak <strong>{secilenPeriod === 'month' ? '1 ay' : '1 yıl'}</strong> uzatılacaktır.</span>
                </div>

                {/* Paket Seçici Toggle */}
                <div style={{ 
                  display: 'flex', background: 'var(--surface2)', padding: 4, borderRadius: 12, 
                  gap: 4, marginBottom: 20, border: '1px solid var(--border-light)', marginTop: 20 
                }}>
                  {(['month', 'year'] as const).map(d => (
                    <button 
                      key={d} 
                      onClick={() => setSecilenPeriod(d)} 
                      style={{
                        flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                        border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                        background: secilenPeriod === d ? 'var(--accent)' : 'transparent',
                        color: secilenPeriod === d ? '#fff' : 'var(--text2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                      }}
                    >
                      {d === 'month' ? 'Aylık Ödeme' : 'Yıllık Ödeme'}
                      {d === 'year' && <span style={{ fontSize: 9, background: '#fbbf24', color: '#000', padding: '1px 6px', borderRadius: 4 }}>%20 İNDİRİM</span>}
                    </button>
                  ))}
                </div>

                {/* Fiyat Bilgisi ve Özellikler */}
                <div style={{ background: 'var(--surface2)', borderRadius: 16, padding: '24px', border: '1px solid var(--border-light)', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                    {secilenPeriod === 'year' && (
                      <span style={{ fontSize: 16, color: 'var(--text3)', textDecoration: 'line-through', marginBottom: -8 }}>₺9.000</span>
                    )}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>₺</span>
                      <span style={{ fontSize: 42, fontWeight: 800, color: 'var(--text)' }}>{secilenPeriod === 'month' ? '750' : '7.500'}</span>
                      <span style={{ fontSize: 14, color: 'var(--text2)' }}>/ {secilenPeriod === 'month' ? 'ay' : 'yıl'}</span>
                    </div>
                  </div>
                  
                  <div style={{ height: 1, background: 'var(--border)', margin: '20px 0', opacity: 0.5 }} />
                  
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', textAlign: 'left', display: 'inline-block' }}>
                    {[
                      'Sınırsız Öğrenci ve Personel Kaydı',
                      'Otomatik Bordro ve Puantaj Takibi',
                      'Dijital Sınıf Defteri ve Yoklama',
                      'Ödeme ve Aidat Otomasyonu',
                      '7/24 Teknik Destek ve Güncellemeler'
                    ].map((f, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>
                        <CheckCircle2 size={14} color="var(--success)" /> {f}
                      </li>
                    ))}
                  </ul>

                  {lisansGecerli ? (
                    <div className="flex flex-col gap-4">
                      <div style={{ 
                        background: 'rgba(39, 174, 96, 0.1)', 
                        border: '1px solid var(--success-border)',
                        padding: '16px', borderRadius: 12, textAlign: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--success)', fontWeight: 700, fontSize: 15 }}>
                          <CheckCircle2 size={18} />
                          Lisansınız Aktif
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
                          {okulData?.odeme_durumu === 'deneme' ? 'Deneme süreniz devam ediyor.' : 'Abonelik süreniz devam ediyor.'}
                        </div>
                      </div>

                      <button 
                        onClick={() => handlePayment(secilenPeriod === 'month' ? '1581329' : '1581465', secilenPeriod)}
                        disabled={checkoutLoading || !okulData}
                        style={{
                          width: '100%',
                          background: 'white',
                          color: 'var(--accent)',
                          padding: '14px',
                          borderRadius: '12px',
                          fontSize: '14px',
                          fontWeight: '700',
                          border: '2px solid var(--accent)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'var(--accent)' }}
                      >
                        {checkoutLoading ? 'Hazırlanıyor...' : (
                          okulData?.odeme_durumu === 'deneme' ? 'Şimdi Lisans Al' : 
                          (secilenPeriod === 'year' ? 'Yıllık Pakete Yükselt (%20 İndirim)' : 'Abonelik Süresini Uzat')
                        )}
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handlePayment(secilenPeriod === 'month' ? '1581329' : '1581465', secilenPeriod)}
                      disabled={checkoutLoading || !okulData}
                      style={{
                        width: '100%',
                        background: 'var(--accent)',
                        color: '#fff',
                        padding: '16px',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: '700',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(45, 90, 61, 0.2)'
                      }}
                    >
                      {checkoutLoading ? 'Bağlantı Hazırlanıyor...' : 'Hemen Güvenli Öde'}
                    </button>
                  )}
                </div>
                
                <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)', marginTop: 16 }}>
                  Ödemeleriniz Lemon Squeezy güvencesiyle 256-bit SSL ile korunmaktadır.
                </p>
              </div>
            )}

            {/* TAB 5: GÜVENLİK & PROFİL */}
            {activeTab === 'guvenlik' && (
              <div className="card" style={{ margin: 0, maxWidth: 500 }}>
                <div className="card-title"><ShieldCheck size={20} color="var(--accent)" /> Güvenlik Ayarları</div>
                <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>Hesap güvenliğiniz için şifrenizi buradan güncelleyebilirsiniz.</p>
                
                <form onSubmit={sifreGuncelle} className="flex flex-col gap-5">
                  <div>
                    <label htmlFor="new-p" className="form-label">Yeni Şifre</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#999' }} />
                      <input 
                        id="new-p"
                        type="password" 
                        required 
                        minLength={6}
                        className="form-input" 
                        style={{ paddingLeft: 38 }}
                        placeholder="Minimum 6 karakter"
                        value={passForm.newP}
                        onChange={e => setPassForm({ ...passForm, newP: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirm-p" className="form-label">Yeni Şifre (Tekrar)</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#999' }} />
                      <input 
                        id="confirm-p"
                        type="password" 
                        required 
                        minLength={6}
                        className="form-input" 
                        style={{ paddingLeft: 38 }}
                        placeholder="Şifreyi onaylayın"
                        value={passForm.confirmP}
                        onChange={e => setPassForm({ ...passForm, confirmP: e.target.value })}
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ marginTop: 8, height: 46 }}
                    disabled={passSaving}
                  >
                    {passSaving ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                  </button>
                </form>

                <div style={{ marginTop: 24, padding: 16, background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 12, display: 'flex', gap: 12 }}>
                  <Info size={18} color="#d97706" style={{ flexShrink: 0 }} />
                  <p style={{ fontSize: 12, color: '#92400e', margin: 0 }}>
                    <b>Dikkat:</b> Şifrenizi değiştirdikten sonra tüm cihazlarınızda oturumunuz açık kalmaya devam edebilir ancak bir sonraki girişte yeni şifreniz istenecektir.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* SİDEBAR SUMMARY (Özellikle Mali Sekmesinde Aktif) */}
          {activeTab === 'mali' && (
            <div style={{ position: 'sticky', top: 24 }}>
              <div className="card" style={{ background: 'var(--accent)', color: 'white', border: 'none', boxShadow: '0 8px 30px rgba(45,90,61,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, opacity: 0.9 }}>
                  <Calculator size={20} />
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Hesaplama Özeti</span>
                </div>
                
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4 }}>Hesaplanan Saat Ücreti</div>
                  <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'Playfair Display, serif' }}>₺{sUcret}</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8 }}>
                    <span style={{ opacity: 0.8 }}>Bölen Katsayısı</span>
                    <span className="fw-600">{form.yemek ? '3 (Yemekli)' : '4 (Yemeksiz)'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8 }}>
                    <span style={{ opacity: 0.8 }}>Günlük Çalışma</span>
                    <span className="fw-600">{form.gunluk_saat} Saat</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ opacity: 0.8 }}>Asgari Brüt</span>
                    <span className="fw-600">₺{form.asgari_ucret?.toLocaleString('tr-TR')}</span>
                  </div>
                </div>

                <div style={{ marginTop: 24, padding: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11, lineHeight: 1.5 }}>
                  <Zap size={14} style={{ marginBottom: 6 }} />
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
            else if (conf.type === 'sihirbaz') tatilSihirbazıGercek()
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
