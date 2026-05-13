'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { logLoginAttempt } from '@/app/actions/logLogin'
import { Mail, Lock, LogIn, AlertTriangle, CheckCircle, ArrowLeft, UserPlus } from 'lucide-react'
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

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 420,
    background: 'white',
    borderRadius: 24,
    padding: '48px 40px',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
  }

  const wrapStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #2d5a3d 0%, #1e4229 100%)',
    padding: 20
  }

  // --- Şifre Sıfırlama Modu ---
  if (mod === 'sifre-sifirla') {
    return (
      <div style={wrapStyle}>
        <div style={cardStyle}>
          <button
            onClick={() => { setMod('giris'); setSifirlaBasarili(false); setError(null) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#666', fontSize: 13, marginBottom: 32, padding: 0 }}
          >
            <ArrowLeft size={16} /> Giriş sayfasına dön
          </button>

          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 64, height: 64, background: 'var(--accent-lighter)', borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', color: 'var(--success)'
            }}>
              <Mail size={32} />
            </div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
              Şifre Sıfırlama
            </h1>
            <p style={{ color: '#666', fontSize: 14 }}>
              E-posta adresinize sıfırlama bağlantısı göndereceğiz.
            </p>
          </div>

          {error && (
            <div style={{
              background: '#fff5f5', border: '1px solid #feb2b2', color: 'var(--danger)',
              padding: '12px 16px', borderRadius: 12, marginBottom: 24, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 10
            }}>
              <AlertTriangle size={18} />
              {error}
            </div>
          )}

          {sifirlaBasarili ? (
            <div style={{
              background: '#f0fdf4', border: '1px solid #86efac', color: '#166534',
              padding: '16px', borderRadius: 12, fontSize: 14,
              display: 'flex', alignItems: 'flex-start', gap: 12
            }}>
              <CheckCircle size={20} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong>Bağlantı gönderildi!</strong>
                <p style={{ margin: '4px 0 0', color: '#15803d' }}>
                  <strong>{sifirlaEmail}</strong> adresine şifre sıfırlama bağlantısı gönderildi.
                  Lütfen e-postanızı kontrol edin (spam klasörünü de unutmayın).
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSifreSifirla} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 6 }}>
                  Kayıtlı E-posta Adresiniz
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: 14, top: 14, color: '#999' }} />
                  <input
                    type="email"
                    required
                    className="form-input"
                    style={{ paddingLeft: 44, height: 48, borderRadius: 12 }}
                    placeholder="ornek@okul.com"
                    value={sifirlaEmail}
                    onChange={e => setSifirlaEmail(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  height: 48, background: 'var(--accent)', color: 'white',
                  border: 'none', borderRadius: 12, fontWeight: 600, fontSize: 15,
                  cursor: 'pointer'
                }}
              >
                {loading ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  // --- Normal Giriş Modu ---
  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 64, height: 64, background: 'var(--accent-lighter)', borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', color: 'var(--success)'
          }}>
            <LogIn size={32} />
          </div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            Tekrar Hoş Geldiniz
          </h1>
          <p style={{ color: '#666', fontSize: 14 }}>Klüp360 Yönetim Paneli</p>
        </div>

        {error && (
          <div style={{
            background: '#fff5f5', border: '1px solid #feb2b2', color: 'var(--danger)',
            padding: '12px 16px', borderRadius: 12, marginBottom: 24, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label htmlFor="login-email" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 6 }}>E-posta Adresi</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: 14, top: 14, color: '#999' }} />
              <input
                id="login-email"
                type="email"
                required
                className="form-input"
                style={{ paddingLeft: 44, height: 48, borderRadius: 12 }}
                placeholder="ornek@okul.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label htmlFor="login-password" style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>Şifre</label>
              <button
                type="button"
                onClick={() => { setMod('sifre-sifirla'); setSifirlaEmail(email); setError(null) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--accent)', fontWeight: 500, padding: 0 }}
              >
                Şifremi unuttum
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 14, top: 14, color: '#999' }} />
              <input
                id="login-password"
                type="password"
                required
                className="form-input"
                style={{ paddingLeft: 44, height: 48, borderRadius: 12 }}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 10,
              height: 48,
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <div style={{ 
          marginTop: 24, 
          paddingTop: 24, 
          borderTop: '1px solid #f0f0f0', 
          textAlign: 'center' 
        }}>
          <p style={{ color: '#666', fontSize: 13, marginBottom: 12 }}>Henüz bir hesabınız yok mu?</p>
          <Link
            href="/signup"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: 8,
              padding: '10px 16px',
              borderRadius: 12,
              border: '1px solid var(--accent)',
              color: 'var(--accent)',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.2s'
            }}
          >
            <UserPlus size={18} /> Yeni Okul Kaydı Oluştur
          </Link>
        </div>
      </div>
    </div>
  )
}
