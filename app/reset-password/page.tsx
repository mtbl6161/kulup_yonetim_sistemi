'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Lock, CheckCircle, AlertTriangle, KeyRound } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [passwordTekrar, setPasswordTekrar] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [basarili, setBasarili] = useState(false)
  const [oturumHazir, setOturumHazir] = useState(false)
  const router = useRouter()

  // Supabase, şifre sıfırlama e-postasındaki bağlantıya tıklanınca
  // URL hash'e access_token ekler ve bir PASSWORD_RECOVERY eventi tetikler.
  useEffect(() => {
    // 1. Session kontrolü (Eğer URL'den token ile geldiyse oturum arka planda açılmıştır)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setOturumHazir(true)
    })

    // 2. Event listener (PASSWORD_RECOVERY bayrağını takip et)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && window.location.hash.includes('type=recovery'))) {
        setOturumHazir(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.')
      return
    }
    if (password !== passwordTekrar) {
      setError('Şifreler eşleşmiyor.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('Şifre güncellenemedi: ' + error.message)
    } else {
      setBasarili(true)
      setTimeout(() => router.replace('/'), 2500)
    }
    setLoading(false)
  }

  const wrapStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #2d5a3d 0%, #1e4229 100%)',
    padding: 20
  }

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 420,
    background: 'white',
    borderRadius: 24,
    padding: '48px 40px',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
  }

  if (basarili) {
    return (
      <div style={wrapStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, background: '#f0fdf4', borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', color: '#16a34a'
            }}>
              <CheckCircle size={32} />
            </div>
            <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
              Şifre Güncellendi
            </h1>
            <p style={{ color: '#666', fontSize: 14 }}>
              Yeni şifreniz kaydedildi. Ana sayfaya yönlendiriliyorsunuz...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!oturumHazir) {
    return (
      <div style={wrapStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', color: '#666' }}>
            <div style={{
              width: 64, height: 64, background: 'var(--accent-lighter)', borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', color: 'var(--success)'
            }}>
              <KeyRound size={32} />
            </div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
              Bağlantı Doğrulanıyor...
            </h2>
            <p style={{ fontSize: 14 }}>
              E-postanızdaki bağlantıya tıklayarak buraya gelmeniz gerekiyor.
              Doğrudan erişirseniz bu sayfa çalışmaz.
            </p>
            <button
              onClick={() => router.replace('/login')}
              style={{
                marginTop: 24, height: 44, background: 'var(--accent)', color: 'white',
                border: 'none', borderRadius: 12, fontWeight: 600, fontSize: 14,
                cursor: 'pointer', padding: '0 24px'
              }}
            >
              Giriş Sayfasına Dön
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 64, height: 64, background: 'var(--accent-lighter)', borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', color: 'var(--success)'
          }}>
            <KeyRound size={32} />
          </div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            Yeni Şifre Belirle
          </h1>
          <p style={{ color: '#666', fontSize: 14 }}>Hesabınız için yeni bir şifre girin.</p>
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 6 }}>
              Yeni Şifre
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 14, top: 14, color: '#999' }} />
              <input
                type="password"
                required
                minLength={6}
                className="form-input"
                style={{ paddingLeft: 44, height: 48, borderRadius: 12 }}
                placeholder="En az 6 karakter"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 6 }}>
              Yeni Şifre (Tekrar)
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 14, top: 14, color: '#999' }} />
              <input
                type="password"
                required
                className="form-input"
                style={{ paddingLeft: 44, height: 48, borderRadius: 12 }}
                placeholder="Şifreyi tekrar girin"
                value={passwordTekrar}
                onChange={e => setPasswordTekrar(e.target.value)}
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
              cursor: 'pointer'
            }}
          >
            {loading ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
          </button>
        </form>
      </div>
    </div>
  )
}
