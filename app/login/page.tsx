'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { logLoginAttempt } from '@/app/actions/logLogin'
import { Mail, Lock, AlertTriangle, CheckCircle, ArrowLeft, UserPlus, ShieldCheck, Zap, BarChart3, Home } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mod, setMod] = useState<'giris' | 'sifre-sifirla'>('giris')
  const [sifirlaEmail, setSifirlaEmail] = useState('')
  const [sifirlaBasarili, setSifirlaBasarili] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.SyntheticEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('E-posta veya şifre hatalı. Henüz kayıt olmadıysanız lütfen önce "Kayıt Ol" kısmından okulunuzu oluşturun.')
        } else {
          setError('Giriş Hatası: ' + error.message)
        }
        logLoginAttempt({ email, basarili: false }).catch(err => console.error('Login Audit Error:', err))
        setLoading(false)
        return
      }
      if (data?.user) {
        logLoginAttempt({ email, basarili: true, userId: data.user.id })
        router.push('/')
        setTimeout(() => {
          if (window.location.pathname === '/login') {
            window.location.href = '/'
          }
        }, 1000)
      }
    } catch (err: any) {
      setError('Sistem Hatası: ' + err.message)
      setLoading(false)
    }
  }

  async function handleSifreSifirla(e: React.SyntheticEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const redirectTo = `${window.location.origin}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(sifirlaEmail, { redirectTo })
    if (error) {
      setError('Hata: ' + error.message)
    } else {
      setSifirlaBasarili(true)
    }
    setLoading(false)
  }

  return (
    <div className="au">
      <style>{CSS}</style>

      {/* Sol: marka paneli */}
      <aside className="au-brand">
        <div className="au-brand-inner">
          <Link href="/tanitim" className="au-logo">
            <img src="/logo.png" alt="Klüp360" />
            <span>Klüp<i>360</i></span>
          </Link>
          <div className="au-brand-mid">
            <h2>Kulübünüzün tüm yönetimi, tek panelde.</h2>
            <ul>
              <li><span className="au-bico"><Zap size={15} /></span> Otomatik bordro ve puantaj</li>
              <li><span className="au-bico"><BarChart3 size={15} /></span> Anlık tahsilat ve raporlar</li>
              <li><span className="au-bico"><ShieldCheck size={15} /></span> MEB yönergesine %100 uyum</li>
            </ul>
          </div>
          <p className="au-brand-foot">© {new Date().getFullYear()} Klüp360</p>
        </div>
      </aside>

      {/* Sağ: form */}
      <main className="au-main">
        <div className="au-card">
          {mod === 'sifre-sifirla' ? (
            <>
              <button type="button" className="au-back" onClick={() => { setMod('giris'); setSifirlaBasarili(false); setError(null) }}>
                <ArrowLeft size={16} /> Giriş sayfasına dön
              </button>
              <div className="au-head">
                <div className="au-head-ico"><Mail size={26} /></div>
                <h1>Şifre Sıfırlama</h1>
                <p>E-posta adresinize sıfırlama bağlantısı göndereceğiz.</p>
              </div>

              {error && <div className="au-alert"><AlertTriangle size={18} />{error}</div>}

              {sifirlaBasarili ? (
                <div className="au-ok">
                  <CheckCircle size={20} />
                  <div>
                    <strong>Bağlantı gönderildi!</strong>
                    <p><strong>{sifirlaEmail}</strong> adresine şifre sıfırlama bağlantısı gönderildi. Lütfen e-postanızı kontrol edin (spam klasörünü de unutmayın).</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSifreSifirla} className="au-form">
                  <label className="au-field">
                    <span>Kayıtlı E-posta Adresiniz</span>
                    <div className="au-input-wrap">
                      <Mail size={18} />
                      <input type="email" required placeholder="ornek@okul.com" value={sifirlaEmail} onChange={e => setSifirlaEmail(e.target.value)} />
                    </div>
                  </label>
                  <button type="submit" disabled={loading} className="au-submit">
                    {loading ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
                  </button>
                </form>
              )}
            </>
          ) : (
            <>
              <Link href="/tanitim" className="au-home"><Home size={15} /> Ana Sayfa</Link>
              <div className="au-head">
                <img src="/logo.png" alt="Klüp360" className="au-card-logo" />
                <h1>Tekrar Hoş Geldiniz</h1>
                <p>Klüp360 Yönetim Paneli</p>
              </div>

              {error && <div className="au-alert"><AlertTriangle size={18} />{error}</div>}

              <form onSubmit={handleLogin} className="au-form">
                <label className="au-field">
                  <span>E-posta Adresi</span>
                  <div className="au-input-wrap">
                    <Mail size={18} />
                    <input id="login-email" type="email" required placeholder="ornek@okul.com" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                </label>

                <label className="au-field">
                  <span className="au-field-row">
                    Şifre
                    <button type="button" className="au-link" onClick={() => { setMod('sifre-sifirla'); setSifirlaEmail(email); setError(null) }}>Şifremi unuttum</button>
                  </span>
                  <div className="au-input-wrap">
                    <Lock size={18} />
                    <input id="login-password" type="password" required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                  </div>
                </label>

                <button type="submit" disabled={loading} className="au-submit">
                  {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                </button>
              </form>

              <div className="au-foot">
                <p>Henüz bir hesabınız yok mu?</p>
                <Link href="/signup" className="au-alt-btn"><UserPlus size={18} /> Yeni Okul Kaydı Oluştur</Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

const CSS = `
.au{--g:#2d5a3d;--g-d:#1e4229;--g-dd:#163620;--gold:#c8832a;--bg:#f5f2ec;--surf:#fff;
  --tx:#1a1a14;--tx2:#5a5748;--tx3:#8a8070;--line:#e6dfd0;--line-2:#d8d0be;--danger:#c0392b;
  font-family:'DM Sans',system-ui,sans-serif;color:var(--tx);min-height:100vh;
  display:grid;grid-template-columns:1.05fr 1fr;-webkit-font-smoothing:antialiased}
.au *{box-sizing:border-box}
.au :where(a){text-decoration:none;color:inherit}

/* marka paneli */
.au-brand{position:relative;overflow:hidden;background:linear-gradient(150deg,var(--g),var(--g-dd));color:#fff;padding:48px}
.au-brand::before{content:'';position:absolute;top:-15%;left:-10%;width:80%;height:70%;
  background:radial-gradient(closest-side,rgba(255,255,255,.1),transparent);pointer-events:none}
.au-brand-inner{position:relative;z-index:2;height:100%;display:flex;flex-direction:column}
.au-logo{display:flex;align-items:center;gap:10px}
.au-logo img{width:40px;height:40px;object-fit:contain}
.au-logo span{font-family:'Playfair Display',serif;font-weight:800;font-size:24px}
.au-logo i{color:var(--gold);font-style:normal}
.au-brand-mid{margin-top:auto;margin-bottom:auto;padding:40px 0}
.au-brand-mid h2{font-family:'Playfair Display',serif;font-weight:800;font-size:clamp(26px,3vw,36px);
  line-height:1.2;letter-spacing:-.02em;margin:0 0 28px;max-width:420px}
.au-brand-mid ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:16px}
.au-brand-mid li{display:flex;align-items:center;gap:12px;font-size:15.5px;color:rgba(255,255,255,.9)}
.au-bico{width:30px;height:30px;border-radius:9px;background:rgba(255,255,255,.12);display:flex;
  align-items:center;justify-content:center;color:var(--gold);flex-shrink:0}
.au-brand-foot{font-size:13px;color:rgba(255,255,255,.55);margin:0}

/* form tarafı */
.au-main{background:var(--bg);display:flex;align-items:center;justify-content:center;padding:32px 20px}
.au-card{width:100%;max-width:430px;background:var(--surf);border:1px solid var(--line);border-radius:24px;
  padding:clamp(28px,4vw,44px);box-shadow:0 30px 60px -30px rgba(30,66,41,.35)}
.au-back{background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:6px;color:var(--tx2);
  font-size:13px;margin-bottom:26px;padding:0;font-family:inherit}
.au-back:hover{color:var(--g)}
.au-home{display:inline-flex;align-items:center;gap:6px;color:var(--tx2);font-size:13px;font-weight:600;margin-bottom:22px}
.au-home svg{color:var(--g)}
.au-home:hover{color:var(--g)}
.au-head{text-align:center;margin-bottom:28px}
.au-card-logo{width:60px;height:60px;object-fit:contain;margin:0 auto 18px;display:block}
.au-head-ico{width:60px;height:60px;border-radius:16px;background:#eafaf1;color:var(--g);display:flex;
  align-items:center;justify-content:center;margin:0 auto 18px}
.au-head h1{font-family:'Playfair Display',serif;font-size:27px;font-weight:800;color:var(--tx);margin:0 0 6px}
.au-head p{color:var(--tx2);font-size:14.5px;margin:0}
.au-form{display:flex;flex-direction:column;gap:18px}
.au-field{display:flex;flex-direction:column;gap:7px}
.au-field>span{font-size:13px;font-weight:600;color:var(--tx)}
.au-field-row{display:flex;align-items:center;justify-content:space-between}
.au-link{background:none;border:none;cursor:pointer;font-size:12.5px;color:var(--g);font-weight:600;padding:0;font-family:inherit}
.au-link:hover{color:var(--gold)}
.au-input-wrap{position:relative;display:flex;align-items:center}
.au-input-wrap svg{position:absolute;left:14px;color:var(--tx3);pointer-events:none}
.au-input-wrap input{width:100%;height:50px;padding:0 14px 0 44px;border:1px solid var(--line-2);border-radius:12px;
  background:#fcfcfa;font:inherit;font-size:15px;color:var(--tx);outline:none;transition:border-color .15s,box-shadow .15s}
.au-input-wrap input:focus{border-color:var(--g);box-shadow:0 0 0 3px rgba(45,90,61,.13);background:#fff}
.au-submit{margin-top:6px;height:50px;border:none;border-radius:12px;cursor:pointer;
  background:var(--g);color:#fff;font:inherit;font-size:15.5px;font-weight:700;
  box-shadow:0 10px 24px -10px rgba(45,90,61,.6);transition:transform .2s,background .2s}
.au-submit:hover{background:var(--g-d);transform:translateY(-2px)}
.au-submit:disabled{opacity:.7;cursor:default;transform:none}
.au-alert{background:#fdf0ee;border:1px solid #f3c4bd;color:var(--danger);padding:12px 15px;border-radius:12px;
  margin-bottom:22px;font-size:13px;display:flex;align-items:center;gap:10px;line-height:1.5}
.au-alert svg{flex-shrink:0}
.au-ok{background:#f0fdf4;border:1px solid #86efac;color:#166534;padding:16px;border-radius:12px;
  font-size:14px;display:flex;align-items:flex-start;gap:12px}
.au-ok svg{flex-shrink:0;margin-top:1px}
.au-ok p{margin:4px 0 0;color:#15803d;line-height:1.5}
.au-foot{margin-top:24px;padding-top:22px;border-top:1px solid var(--line);text-align:center}
.au-foot p{color:var(--tx2);font-size:13px;margin:0 0 12px}
.au-alt-btn{display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 16px;border-radius:12px;
  border:1px solid var(--g);color:var(--g);font-size:14px;font-weight:600;transition:background .15s,color .15s}
.au-alt-btn:hover{background:var(--g);color:#fff}

@media (max-width:860px){
  .au{grid-template-columns:1fr}
  .au-brand{display:none}
}
`
