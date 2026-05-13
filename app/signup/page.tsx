'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import {
  Eye, EyeOff, CheckCircle, Loader2,
  School, User, Phone, MapPin, Clock, DollarSign, ChevronRight, ChevronLeft,
  Navigation2
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
      console.log('İller çekiliyor...')
      const { data, error } = await sb.from('iller').select('id, ad').order('ad')
      if (error) {
        console.error('İller çekilirken hata oluştu:', error)
      } else if (data) {
        console.log('İller yüklendi:', data.length)
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
      console.log('İlçeler çekiliyor...', ilId)
      const { data, error } = await sb.from('ilceler').select('id, ad').eq('il_id', ilId).order('ad')
      if (error) {
        console.error('İlçeler çekilirken hata oluştu:', error)
      } else if (data) {
        console.log('İlçeler yüklendi:', data.length)
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

      // Supabase bazı durumlarda hata yerine null user döndürür (zaten kayıtlı)
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
          // Kurum profili
          mudurAdi,
          tel,
          adres,
          ilId,
          ilceId,
          // Ücretlendirme
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

  if (onaylaBekle) {
    return (
      <div style={wrapStyle}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, background: '#dcfce7', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckCircle size={38} color="#16a34a" />
          </div>
          <h1 style={h1Style}>E-postanızı Onaylayın</h1>
          <p style={{ fontSize: 14, color: '#5a5748', lineHeight: 1.7, margin: '0 0 24px' }}>
            <strong>{email}</strong> adresine bir onay bağlantısı gönderdik.
            Bağlantıya tıkladıktan sonra giriş yapabilirsiniz.
          </p>
          <Link href="/login" style={btnStyle}>Giriş Sayfasına Git</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        {/* Logo & Başlık */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg,#2d5a3d,#1e4229)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <span style={{ color: 'white', fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 18 }}>K</span>
          </div>
          <h1 style={h1Style}>Hesap Oluştur</h1>
          <p style={{ fontSize: 13, color: '#8a8070', margin: 0 }}>14 gün ücretsiz deneme · Kredi kartı gerekmez</p>
        </div>

        {/* Adım Göstergesi */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
          {ADIMLAR.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  background: i < adim ? '#2d5a3d' : i === adim ? '#2d5a3d' : '#e8e4dc',
                  color: i <= adim ? '#fff' : '#8a8070',
                  transition: 'all 0.3s'
                }}>
                  {i < adim ? <CheckCircle size={14} /> : i + 1}
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: i === adim ? '#2d5a3d' : '#8a8070', whiteSpace: 'nowrap' }}>{a}</span>
              </div>
              {i < ADIMLAR.length - 1 && (
                <div style={{ height: 1, flex: 1, background: i < adim ? '#2d5a3d' : '#e8e4dc', marginBottom: 16, transition: 'all 0.3s' }} />
              )}
            </div>
          ))}
        </div>

        {/* ── ADIM 0: Hesap ── */}
        {adim === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field icon={<School size={15} />} label="Kurum / Okul Adı">
              <input value={okulAdi} onChange={e => setOkulAdi(e.target.value)}
                placeholder="Örn: Ankara Yaz Kulübü" required style={inputStyle} />
            </Field>
            <Field icon={<User size={15} />} label="E-posta Adresi">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="yetkili@okul.k12.tr" required style={inputStyle} />
            </Field>
            <Field icon={null} label="Şifre">
              <div style={inputWrapStyle}>
                <input type={goster ? 'text' : 'password'} value={sifre} onChange={e => setSifre(e.target.value)}
                  placeholder="En az 6 karakter" required style={{ ...inputStyle, border: 'none', padding: 0, flex: 1 }} />
                <button type="button" onClick={() => setGoster(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#8a8070' }}>
                  {goster ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            <Field icon={null} label="Şifre Tekrar">
              <input type="password" value={sifreTekrar} onChange={e => setSifreTekrar(e.target.value)}
                placeholder="Şifrenizi tekrar girin" required style={inputStyle} />
            </Field>
          </div>
        )}

        {/* ── ADIM 1: Kurum Profili ── */}
        {adim === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 13, color: '#5a5748', marginBottom: 4 }}>
              Bu bilgiler bordro ve resmi belgelerinizde otomatik kullanılacaktır.
            </div>
            <Field icon={<User size={15} />} label="Müdür / Yetkili Adı Soyadı">
              <input value={mudurAdi} onChange={e => setMudurAdi(e.target.value)}
                placeholder="Ahmet Yılmaz" required style={inputStyle} />
            </Field>
            <Field icon={<Phone size={15} />} label="Kurum Telefonu">
              <input type="tel" value={tel} onChange={e => setTel(e.target.value)}
                placeholder="0312 000 00 00" style={inputStyle} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field icon={<MapPin size={15} />} label="İl">
                <select value={ilId} onChange={e => setIlId(e.target.value)} style={inputStyle}>
                  <option value="">İl Seçin...</option>
                  {iller.map(il => <option key={il.id} value={il.id}>{il.ad}</option>)}
                </select>
              </Field>
              <Field icon={<Navigation2 size={15} />} label="İlçe">
                <select value={ilceId} onChange={e => setIlceId(e.target.value)} style={inputStyle} disabled={!ilId}>
                  <option value="">İlçe Seçin...</option>
                  {ilceler.map(ilce => <option key={ilce.id} value={ilce.id}>{ilce.ad}</option>)}
                </select>
              </Field>
            </div>
            <Field icon={<MapPin size={15} />} label="Kurum Açık Adresi">
              <textarea value={adres} onChange={e => setAdres(e.target.value)}
                placeholder="Mahalle, Cadde, No..." rows={2}
                style={{ ...inputStyle, resize: 'none', fontFamily: 'DM Sans, sans-serif' }} />
            </Field>
          </div>
        )}

        {/* ── ADIM 2: Ücretlendirme ── */}
        {adim === 2 && (
          <form onSubmit={handleKayit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#f0ede4', borderRadius: 12, padding: '12px 16px', fontSize: 12, color: '#5a5748', lineHeight: 1.5 }}>
                💡 Bu bilgiler puantaj ve bordro hesaplamalarında kullanılır. Sonradan Ayarlar sayfasından güncellenebilir.
              </div>
              <Field icon={<Clock size={15} />} label="Günlük Ders Saati (Varsayılan)">
                <div style={{ display: 'flex', gap: 8 }}>
                  {[4, 5, 6, 7, 8].map(s => (
                    <button key={s} type="button"
                      onClick={() => setGunlukSaat(String(s))}
                      style={{
                        flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                        borderColor: gunlukSaat === String(s) ? '#2d5a3d' : '#d8d0be',
                        background: gunlukSaat === String(s) ? '#2d5a3d' : 'white',
                        color: gunlukSaat === String(s) ? 'white' : '#5a5748',
                      }}>
                      {s}
                    </button>
                  ))}
                </div>
              </Field>
              <Field icon={<DollarSign size={15} />} label="Saatlik Ücret (₺)">
                <input type="number" value={saatUcreti} onChange={e => setSaatUcreti(e.target.value)}
                  placeholder="Örn: 64.75" min="0.01" step="0.01" required style={inputStyle} />
              </Field>
            </div>
            {hata && <div style={hataStyle}>{hata}</div>}
            <button type="submit" disabled={yukleniyor} style={{ ...btnStyle, marginTop: 24 }}>
              {yukleniyor
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Oluşturuluyor...</>
                : <><CheckCircle size={16} /> Hesabı Oluştur</>
              }
            </button>
          </form>
        )}

        {/* Hata Mesajı */}
        {hata && adim < 2 && <div style={hataStyle}>{hata}</div>}

        {/* Adım Butonları */}
        {adim < 2 && (
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            {adim > 0 && (
              <button type="button" onClick={() => { setHata(null); setAdim(a => a - 1) }} style={geriStyle}>
                <ChevronLeft size={16} /> Geri
              </button>
            )}
            <button type="button" onClick={ileriGit} style={{ ...btnStyle, flex: 1 }}>
              {adim === 1 ? 'Ücretlendirme →' : 'Devam Et'} <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Giriş linki */}
        {adim === 0 && (
          <p style={{ textAlign: 'center', fontSize: 13, color: '#8a8070', marginTop: 20, marginBottom: 0 }}>
            Zaten hesabınız var mı?{' '}
            <Link href="/login" style={{ color: '#2d5a3d', fontWeight: 600, textDecoration: 'none' }}>Giriş Yapın</Link>
          </p>
        )}
      </div>
    </div>
  )
}

// ── Küçük yardımcı bileşen ────────────────────────────────
function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>
        {icon && <span style={{ color: '#2d5a3d', display: 'inline-flex', verticalAlign: 'middle', marginRight: 4 }}>{icon}</span>}
        {label}
      </label>
      {children}
    </div>
  )
}

// ── Stiller ────────────────────────────────────────────────
const wrapStyle: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'linear-gradient(135deg,#1e4229 0%,#2d5a3d 50%,#3a7a52 100%)',
  padding: 24, fontFamily: 'DM Sans, sans-serif',
}
const cardStyle: React.CSSProperties = {
  width: '100%', maxWidth: 460, background: '#fffef9',
  borderRadius: 24, padding: '36px 32px',
  boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
}
const h1Style: React.CSSProperties = {
  fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 700,
  color: '#1a1a14', margin: '0 0 6px',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#5a5748', marginBottom: 6,
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 10,
  border: '1px solid #d8d0be', fontSize: 14, fontFamily: 'DM Sans, sans-serif',
  outline: 'none', boxSizing: 'border-box', background: 'white', color: '#1a1a14',
}
const inputWrapStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '11px 14px', borderRadius: 10, border: '1px solid #d8d0be', background: 'white',
}
const btnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  width: '100%', padding: '13px 0', borderRadius: 12,
  background: 'linear-gradient(135deg,#2d5a3d,#1e4229)',
  color: 'white', fontWeight: 700, fontSize: 15,
  border: 'none', cursor: 'pointer', textDecoration: 'none',
  boxShadow: '0 4px 16px rgba(45,90,61,0.3)',
}
const geriStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '13px 20px', borderRadius: 12, border: '1px solid #d8d0be',
  background: 'white', color: '#5a5748', fontWeight: 600, fontSize: 14, cursor: 'pointer',
}
const hataStyle: React.CSSProperties = {
  background: '#fee2e2', borderRadius: 10, padding: '12px 14px',
  fontSize: 13, color: '#dc2626', marginTop: 12,
}
