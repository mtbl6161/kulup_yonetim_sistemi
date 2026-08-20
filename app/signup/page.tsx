'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import {
  Eye, EyeOff, CheckCircle, Loader2,
  School, User, Phone, MapPin, Clock, DollarSign, ChevronRight, ChevronLeft,
  Navigation2, ShieldCheck, Zap, BarChart3, Home,
} from 'lucide-react'

const sb = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ADIMLAR = ['Hesap', 'Kurum', 'Ücretlendirme']

export default function SignupPage() {
  const router = useRouter()
  const [adim, setAdim] = useState(0)
  const [goster, setGoster] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState<string | null>(null)
  const [onaylaBekle, setOnaylaBekle] = useState(false)

  // Adım 1 - Hesap
  const [okulAdi, setOkulAdi]         = useState('')
  const [email, setEmail]             = useState('')
  const [sifre, setSifre]             = useState('')
  const [sifreTekrar, setSifreTekrar] = useState('')

  // Adım 2 - Kurum Profili
  const [mudurAdi, setMudurAdi]   = useState('')
  const [tel, setTel]             = useState('')
  const [adres, setAdres]         = useState('')
  const [ilId, setIlId]           = useState('')
  const [ilceId, setIlceId]       = useState('')

  // Şehir / İlçe Listeleri
  const [iller, setIller] = useState<{ id: number; ad: string }[]>([])
  const [ilceler, setIlceler] = useState<{ id: number; ad: string }[]>([])

  useEffect(() => {
    async function illeriGetir() {
      const { data, error } = await sb.from('iller').select('id, ad').order('ad')
      if (error) {
        console.error('İller çekilirken hata oluştu:', error)
      } else if (data) {
        setIller(data)
      }
    }
    illeriGetir()
  }, [])

  useEffect(() => {
    if (!ilId) {
      setIlceler([])
      setIlceId('')
      return
    }
    async function ilceleriGetir() {
      const { data, error } = await sb.from('ilceler').select('id, ad').eq('il_id', ilId).order('ad')
      if (error) {
        console.error('İlçeler çekilirken hata oluştu:', error)
      } else if (data) {
        setIlceler(data)
      }
    }
    ilceleriGetir()
  }, [ilId])

  // Adım 3 - Ücretlendirme
  const [gunlukSaat, setGunlukSaat]   = useState('6')
  const [saatUcreti, setSaatUcreti]   = useState('')

  function ileriGit() {
    setHata(null)
    if (adim === 0) {
      if (!okulAdi.trim()) return setHata('Kurum adı zorunludur.')
      if (!email.trim()) return setHata('E-posta zorunludur.')
      if (sifre.length < 6) return setHata('Şifre en az 6 karakter olmalıdır.')
      if (sifre !== sifreTekrar) return setHata('Şifreler eşleşmiyor.')
    }
    if (adim === 1) {
      if (!mudurAdi.trim()) return setHata('Müdür/Yetkili adı zorunludur.')
      if (!ilId) return setHata('Lütfen kurumun bulunduğu ili seçin.')
      if (!ilceId) return setHata('Lütfen kurumun bulunduğu ilçeyi seçin.')
    }
    setAdim(a => a + 1)
  }

  async function handleKayit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!saatUcreti || Number(saatUcreti) <= 0) return setHata('Saatlik ücret zorunludur.')

    setYukleniyor(true)
    setHata(null)
    try {
      const { data, error } = await sb.auth.signUp({ email, password: sifre })

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          setHata('Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin.')
        } else {
          setHata(error.message)
        }
        return
      }

      if (!data.user) {
        setHata('Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin.')
        return
      }

      const userId  = data.user?.id
      const session = data.session
      const token   = session?.access_token

      const res = await fetch('/api/kayit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName: okulAdi,
          userId,
          token,
          mudurAdi,
          tel,
          adres,
          ilId,
          ilceId,
          gunlukSaat: Number(gunlukSaat),
          saatUcreti: Number(saatUcreti),
        }),
      })
      const result = await res.json()

      if (!res.ok) {
        setHata(result.error ?? 'Kayıt sırasında bir hata oluştu.')
        return
      }

      if (session) {
        router.push('/')
      } else {
        setOnaylaBekle(true)
      }
    } catch {
      setHata('Bağlantı hatası. Lütfen tekrar deneyin.')
    } finally {
      setYukleniyor(false)
    }
  }

  // ── Onay bekleme ekranı ──
  if (onaylaBekle) {
    return (
      <div className="su">
        <style>{CSS}</style>
        <AuthBrand />
        <main className="su-main">
          <div className="su-card su-card-center">
            <div className="su-ok-ico"><CheckCircle size={38} /></div>
            <h1 className="su-h1">E-postanızı Onaylayın</h1>
            <p className="su-ok-text">
              <strong>{email}</strong> adresine bir onay bağlantısı gönderdik.
              Bağlantıya tıkladıktan sonra giriş yapabilirsiniz.
            </p>
            <Link href="/login" className="su-btn">Giriş Sayfasına Git</Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="su">
      <style>{CSS}</style>
      <AuthBrand />

      <main className="su-main">
        <div className="su-card">
          <Link href="/tanitim" className="su-home"><Home size={15} /> Ana Sayfa</Link>
          <div className="su-head">
            <img src="/logo.png" alt="Klüp360" className="su-card-logo" />
            <h1 className="su-h1">Hesap Oluştur</h1>
            <p className="su-sub">14 gün ücretsiz deneme · Kredi kartı gerekmez</p>
          </div>

          {/* Adım göstergesi */}
          <div className="su-steps">
            {ADIMLAR.map((a, i) => (
              <div key={i} className="su-step">
                <div className="su-step-col">
                  <div className={`su-dot ${i < adim ? 'done' : i === adim ? 'active' : ''}`}>
                    {i < adim ? <CheckCircle size={14} /> : i + 1}
                  </div>
                  <span className={`su-step-label ${i === adim ? 'active' : ''}`}>{a}</span>
                </div>
                {i < ADIMLAR.length - 1 && <div className={`su-step-line ${i < adim ? 'done' : ''}`} />}
              </div>
            ))}
          </div>

          {/* ── ADIM 0: Hesap ── */}
          {adim === 0 && (
            <div className="su-fields">
              <Field icon={<School size={15} />} label="Kurum / Okul Adı">
                <input className="su-input" value={okulAdi} onChange={e => setOkulAdi(e.target.value)} placeholder="Örn: Ankara Yaz Kulübü" required />
              </Field>
              <Field icon={<User size={15} />} label="E-posta Adresi">
                <input className="su-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="yetkili@okul.k12.tr" required />
              </Field>
              <Field icon={null} label="Şifre">
                <div className="su-input su-input-row">
                  <input type={goster ? 'text' : 'password'} value={sifre} onChange={e => setSifre(e.target.value)} placeholder="En az 6 karakter" required />
                  <button type="button" onClick={() => setGoster(v => !v)} className="su-eye">
                    {goster ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              <Field icon={null} label="Şifre Tekrar">
                <input className="su-input" type="password" value={sifreTekrar} onChange={e => setSifreTekrar(e.target.value)} placeholder="Şifrenizi tekrar girin" required />
              </Field>
            </div>
          )}

          {/* ── ADIM 1: Kurum Profili ── */}
          {adim === 1 && (
            <div className="su-fields">
              <div className="su-hint">Bu bilgiler bordro ve resmi belgelerinizde otomatik kullanılacaktır.</div>
              <Field icon={<User size={15} />} label="Müdür / Yetkili Adı Soyadı">
                <input className="su-input" value={mudurAdi} onChange={e => setMudurAdi(e.target.value)} placeholder="Ahmet Yılmaz" required />
              </Field>
              <Field icon={<Phone size={15} />} label="Kurum Telefonu">
                <input className="su-input" type="tel" value={tel} onChange={e => setTel(e.target.value)} placeholder="0312 000 00 00" />
              </Field>
              <div className="su-2col">
                <Field icon={<MapPin size={15} />} label="İl">
                  <select className="su-input" value={ilId} onChange={e => setIlId(e.target.value)}>
                    <option value="">İl Seçin...</option>
                    {iller.map(il => <option key={il.id} value={il.id}>{il.ad}</option>)}
                  </select>
                </Field>
                <Field icon={<Navigation2 size={15} />} label="İlçe">
                  <select className="su-input" value={ilceId} onChange={e => setIlceId(e.target.value)} disabled={!ilId}>
                    <option value="">İlçe Seçin...</option>
                    {ilceler.map(ilce => <option key={ilce.id} value={ilce.id}>{ilce.ad}</option>)}
                  </select>
                </Field>
              </div>
              <Field icon={<MapPin size={15} />} label="Kurum Açık Adresi">
                <textarea className="su-input" value={adres} onChange={e => setAdres(e.target.value)} placeholder="Mahalle, Cadde, No..." rows={2} style={{ resize: 'none' }} />
              </Field>
            </div>
          )}

          {/* ── ADIM 2: Ücretlendirme ── */}
          {adim === 2 && (
            <form onSubmit={handleKayit}>
              <div className="su-fields">
                <div className="su-tip">💡 Bu bilgiler puantaj ve bordro hesaplamalarında kullanılır. Sonradan Ayarlar sayfasından güncellenebilir.</div>
                <Field icon={<Clock size={15} />} label="Günlük Ders Saati (Varsayılan)">
                  <div className="su-hours">
                    {[4, 5, 6, 7, 8].map(s => (
                      <button key={s} type="button" onClick={() => setGunlukSaat(String(s))}
                        className={`su-hour ${gunlukSaat === String(s) ? 'on' : ''}`}>{s}</button>
                    ))}
                  </div>
                </Field>
                <Field icon={<DollarSign size={15} />} label="Saatlik Ücret (₺)">
                  <input className="su-input" type="number" value={saatUcreti} onChange={e => setSaatUcreti(e.target.value)} placeholder="Örn: 64.75" min="0.01" step="0.01" required />
                </Field>
              </div>
              {hata && <div className="su-error">{hata}</div>}
              <button type="submit" disabled={yukleniyor} className="su-btn" style={{ marginTop: 22 }}>
                {yukleniyor
                  ? <><Loader2 size={16} className="su-spin" /> Oluşturuluyor...</>
                  : <><CheckCircle size={16} /> Hesabı Oluştur</>}
              </button>
            </form>
          )}

          {/* Hata (adım 0-1) */}
          {hata && adim < 2 && <div className="su-error">{hata}</div>}

          {/* Adım butonları */}
          {adim < 2 && (
            <div className="su-nav">
              {adim > 0 && (
                <button type="button" onClick={() => { setHata(null); setAdim(a => a - 1) }} className="su-geri">
                  <ChevronLeft size={16} /> Geri
                </button>
              )}
              <button type="button" onClick={ileriGit} className="su-btn" style={{ flex: 1 }}>
                {adim === 1 ? 'Ücretlendirme' : 'Devam Et'} <ChevronRight size={16} />
              </button>
            </div>
          )}

          {adim === 0 && (
            <p className="su-login">
              Zaten hesabınız var mı? <Link href="/login">Giriş Yapın</Link>
            </p>
          )}
        </div>
      </main>
    </div>
  )
}

// ── Marka paneli (sol) ──
function AuthBrand() {
  return (
    <aside className="su-brand">
      <div className="su-brand-inner">
        <Link href="/tanitim" className="su-logo">
          <img src="/logo.png" alt="Klüp360" />
          <span>Klüp<i>360</i></span>
        </Link>
        <div className="su-brand-mid">
          <h2>Kurumunuzu dakikalar içinde dijitale taşıyın.</h2>
          <ul>
            <li><span className="su-bico"><Zap size={15} /></span> Otomatik bordro ve puantaj</li>
            <li><span className="su-bico"><BarChart3 size={15} /></span> Anlık tahsilat ve raporlar</li>
            <li><span className="su-bico"><ShieldCheck size={15} /></span> MEB yönergesine %100 uyum</li>
          </ul>
        </div>
        <p className="su-brand-foot">© {new Date().getFullYear()} Klüp360</p>
      </div>
    </aside>
  )
}

// ── Alan yardımcı bileşeni ──
function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="su-field">
      <label className="su-label">
        {icon && <span className="su-label-ico">{icon}</span>}
        {label}
      </label>
      {children}
    </div>
  )
}

const CSS = `
.su{--g:#2d5a3d;--g-d:#1e4229;--g-dd:#163620;--gold:#c8832a;--bg:#f5f2ec;--surf:#fffef9;
  --tx:#1a1a14;--tx2:#5a5748;--tx3:#8a8070;--line:#e6dfd0;--line-2:#d8d0be;--danger:#c0392b;
  font-family:'DM Sans',system-ui,sans-serif;color:var(--tx);min-height:100vh;
  display:grid;grid-template-columns:1fr 1.05fr;-webkit-font-smoothing:antialiased}
.su *{box-sizing:border-box}
.su :where(a){text-decoration:none;color:inherit}

/* marka paneli */
.su-brand{position:relative;overflow:hidden;background:linear-gradient(150deg,var(--g),var(--g-dd));color:#fff;padding:48px}
.su-brand::before{content:'';position:absolute;top:-15%;left:-10%;width:80%;height:70%;
  background:radial-gradient(closest-side,rgba(255,255,255,.1),transparent);pointer-events:none}
.su-brand-inner{position:relative;z-index:2;height:100%;display:flex;flex-direction:column}
.su-logo{display:flex;align-items:center;gap:10px}
.su-logo img{width:40px;height:40px;object-fit:contain}
.su-logo span{font-family:'Playfair Display',serif;font-weight:800;font-size:24px}
.su-logo i{color:var(--gold);font-style:normal}
.su-brand-mid{margin:auto 0;padding:40px 0}
.su-brand-mid h2{font-family:'Playfair Display',serif;font-weight:800;font-size:clamp(26px,3vw,36px);
  line-height:1.2;letter-spacing:-.02em;margin:0 0 28px;max-width:420px}
.su-brand-mid ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:16px}
.su-brand-mid li{display:flex;align-items:center;gap:12px;font-size:15.5px;color:rgba(255,255,255,.9)}
.su-bico{width:30px;height:30px;border-radius:9px;background:rgba(255,255,255,.12);display:flex;
  align-items:center;justify-content:center;color:var(--gold);flex-shrink:0}
.su-brand-foot{font-size:13px;color:rgba(255,255,255,.55);margin:0}

/* form tarafı */
.su-main{background:var(--bg);display:flex;align-items:center;justify-content:center;padding:32px 20px}
.su-card{width:100%;max-width:470px;background:var(--surf);border:1px solid var(--line);border-radius:24px;
  padding:clamp(26px,3.5vw,40px);box-shadow:0 30px 60px -30px rgba(30,66,41,.35)}
.su-card-center{text-align:center}
.su-home{display:inline-flex;align-items:center;gap:6px;color:var(--tx2);font-size:13px;font-weight:600;margin-bottom:20px}
.su-home svg{color:var(--g)}
.su-home:hover{color:var(--g)}
.su-head{margin-bottom:24px}
.su-card-logo{width:52px;height:52px;object-fit:contain;margin-bottom:14px}
.su-h1{font-family:'Playfair Display',serif;font-size:26px;font-weight:800;color:var(--tx);margin:0 0 6px}
.su-sub{font-size:13px;color:var(--tx3);margin:0}

/* adım göstergesi */
.su-steps{display:flex;align-items:center;margin-bottom:26px}
.su-step{display:flex;align-items:center;flex:1}
.su-step-col{display:flex;flex-direction:column;align-items:center;gap:5px;flex:1}
.su-dot{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-size:11px;font-weight:700;background:#e8e4dc;color:var(--tx3);transition:all .3s}
.su-dot.active,.su-dot.done{background:var(--g);color:#fff}
.su-step-label{font-size:10.5px;font-weight:600;color:var(--tx3);white-space:nowrap}
.su-step-label.active{color:var(--g)}
.su-step-line{height:2px;flex:1;background:#e8e4dc;margin-bottom:16px;transition:all .3s}
.su-step-line.done{background:var(--g)}

.su-fields{display:flex;flex-direction:column;gap:14px}
.su-2col{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.su-field{display:flex;flex-direction:column}
.su-label{display:flex;align-items:center;gap:5px;font-size:12.5px;font-weight:600;color:var(--tx2);margin-bottom:6px}
.su-label-ico{color:var(--g);display:inline-flex}
.su-input{width:100%;padding:12px 14px;border-radius:11px;border:1px solid var(--line-2);font:inherit;font-size:14.5px;
  outline:none;background:#fff;color:var(--tx);transition:border-color .15s,box-shadow .15s}
.su-input:focus,.su-input:focus-within{border-color:var(--g);box-shadow:0 0 0 3px rgba(45,90,61,.13)}
select.su-input{cursor:pointer}
.su-input-row{display:flex;align-items:center;gap:8px;padding:0 14px}
.su-input-row input{flex:1;border:none;outline:none;padding:12px 0;font:inherit;font-size:14.5px;background:transparent;color:var(--tx)}
.su-eye{background:none;border:none;cursor:pointer;padding:0;display:flex;color:var(--tx3)}
.su-hint{font-size:13px;color:var(--tx2);line-height:1.5}
.su-tip{background:#f0ede4;border-radius:12px;padding:12px 15px;font-size:12.5px;color:var(--tx2);line-height:1.5}

.su-hours{display:flex;gap:8px}
.su-hour{flex:1;padding:11px 0;border-radius:10px;border:1px solid var(--line-2);font:inherit;font-size:14px;font-weight:700;
  cursor:pointer;background:#fff;color:var(--tx2);transition:all .15s}
.su-hour.on{border-color:var(--g);background:var(--g);color:#fff}

.su-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:14px 0;border-radius:12px;
  background:var(--g);color:#fff;font:inherit;font-weight:700;font-size:15px;border:none;cursor:pointer;
  box-shadow:0 10px 24px -10px rgba(45,90,61,.6);transition:transform .2s,background .2s}
.su-btn:hover{background:var(--g-d);transform:translateY(-2px)}
.su-btn:disabled{opacity:.75;cursor:default;transform:none}
.su-nav{display:flex;gap:10px;margin-top:20px}
.su-geri{display:flex;align-items:center;gap:6px;padding:14px 20px;border-radius:12px;border:1px solid var(--line-2);
  background:#fff;color:var(--tx2);font:inherit;font-weight:600;font-size:14px;cursor:pointer}
.su-geri:hover{border-color:var(--g);color:var(--g)}
.su-error{background:#fdf0ee;border:1px solid #f3c4bd;border-radius:11px;padding:12px 14px;font-size:13px;color:var(--danger);margin-top:14px;line-height:1.5}
.su-login{text-align:center;font-size:13px;color:var(--tx3);margin:20px 0 0}
.su-login a{color:var(--g);font-weight:600}
.su-login a:hover{color:var(--gold)}

.su-ok-ico{width:72px;height:72px;background:#dcfce7;color:#16a34a;border-radius:20px;display:flex;
  align-items:center;justify-content:center;margin:0 auto 22px}
.su-ok-text{font-size:14px;color:var(--tx2);line-height:1.7;margin:0 0 24px}
.su-spin{animation:su-spin 1s linear infinite}
@keyframes su-spin{to{transform:rotate(360deg)}}

@media (max-width:860px){
  .su{grid-template-columns:1fr}
  .su-brand{display:none}
}
`
