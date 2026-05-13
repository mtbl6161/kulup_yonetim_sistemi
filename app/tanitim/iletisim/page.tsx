'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ClipboardList, Mail, MapPin, User as UserIcon, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'

export default function IletisimPage() {
  const { user } = useAuth()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    institution: '',
    message: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.email || !formData.message) return
    
    setStatus('loading')
    
    try {
      const response = await fetch('/api/iletisim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setStatus('success')
        setFormData({ name: '', email: '', institution: '', message: '' })
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Bir hata oluştu. Lütfen tekrar deneyin.')
        setStatus('error')
      }
    } catch (err) {
      console.error('Submission error:', err)
      alert('Bağlantı hatası oluştu.')
      setStatus('error')
    }
  }

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', color: '#1a1a14', background: '#f5f2ec', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* NAV */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(245,242,236,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #d8d0be',
        padding: '0 40px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/tanitim" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,#2d5a3d,#1e4229)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ClipboardList size={20} color="white" />
          </div>
          <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 20, color: '#2d5a3d' }}>
            Klüp360
          </span>
        </Link>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/tanitim/kullanim-kosullari" style={{ fontSize: 14, fontWeight: 500, color: '#5a5748', textDecoration: 'none' }}>Koşullar</Link>
          <Link href="/tanitim/gizlilik-politikasi" style={{ fontSize: 14, fontWeight: 500, color: '#5a5748', textDecoration: 'none' }}>Gizlilik</Link>
          <Link href="/tanitim/iade-politikasi" style={{ fontSize: 14, fontWeight: 500, color: '#5a5748', textDecoration: 'none' }}>İade</Link>
          <Link href="/tanitim/iletisim" style={{ fontSize: 14, fontWeight: 500, color: '#5a5748', textDecoration: 'none' }}>İletişim</Link>
          <Link href="/fiyatlandirma" style={{
            padding: '8px 18px', borderRadius: 10, fontSize: 14, fontWeight: 500,
            color: '#5a5748', textDecoration: 'none',
          }}>
            Fiyatlandırma
          </Link>
          
          {user ? (
            <Link href="/" style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '6px 14px', borderRadius: 99,
              background: 'white', border: '1px solid #d8d0be',
              textDecoration: 'none', transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#2d5a3d'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#d8d0be'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #2d5a3d, #1e4229)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700
              }}>
                {user.email?.[0].toUpperCase()}
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a14' }}>Panele Dön</span>
            </Link>
          ) : (
            <>
              <Link href="/signup" style={{
                padding: '8px 18px', borderRadius: 10, fontSize: 14, fontWeight: 500,
                color: '#2d5a3d', border: '1px solid #2d5a3d', textDecoration: 'none',
              }}>
                Kayıt Ol
              </Link>
              <Link href="/login" style={{
                padding: '8px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                background: '#2d5a3d', color: 'white', textDecoration: 'none',
              }}>
                Giriş Yap
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* CONTENT */}
      <main style={{ flex: 1, padding: '80px 40px', maxWidth: 1000, margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 40, fontWeight: 800, color: '#1a1a14', marginBottom: 16 }}>
          İletişim
        </h1>
        <p style={{ fontSize: 18, color: '#5a5748', marginBottom: 40 }}>
          Sorularınız, destek talepleriniz veya işbirliği fırsatları için bizimle iletişime geçebilirsiniz.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
          {/* İletişim Bilgileri */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ background: 'white', borderRadius: 20, padding: 32, border: '1px solid #e0dbd0', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'flex-start', gap: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: '#eafaf1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Mail size={24} color="#2d5a3d" />
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a14', margin: '0 0 8px 0' }}>E-Posta</h3>
                <p style={{ color: '#5a5748', margin: 0, fontSize: 16 }}>destek@klup360.com</p>
                <p style={{ color: '#5a5748', margin: 0, fontSize: 16 }}>bilgi@klup360.com</p>
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: 20, padding: 32, border: '1px solid #e0dbd0', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'flex-start', gap: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: '#fef9e7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MapPin size={24} color="#e67e22" />
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a14', margin: '0 0 8px 0' }}>Adres</h3>
                <p style={{ color: '#5a5748', margin: 0, fontSize: 16, lineHeight: 1.6 }}>
                  Teknokent Bilişim Vadisi, Ofis No: 42<br />
                  Gebze / Kocaeli, Türkiye
                </p>
              </div>
            </div>
          </div>

          {/* İletişim Formu */}
          <div style={{ background: 'white', borderRadius: 24, padding: 40, border: '1px solid #e0dbd0', boxShadow: '0 10px 30px rgba(0,0,0,0.02)', position: 'relative', overflow: 'hidden' }}>
            {status === 'success' ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, textAlign: 'center', padding: '40px 0' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#eafaf1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={32} color="#2d5a3d" />
                </div>
                <div>
                  <h3 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a14', marginBottom: 8 }}>Mesajınız Gönderildi!</h3>
                  <p style={{ color: '#5a5748', fontSize: 16 }}>En kısa sürede size geri dönüş yapacağız.</p>
                </div>
                <button 
                  onClick={() => setStatus('idle')}
                  style={{ background: 'none', border: 'none', color: '#2d5a3d', fontWeight: 600, cursor: 'pointer', fontSize: 14, marginTop: 12 }}
                >
                  Yeni Mesaj Gönder
                </button>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a14', margin: '0 0 24px 0' }}>Mesaj Gönderin</h3>
                
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#5a5748', marginBottom: 8 }}>
                      Adınız Soyadınız <span style={{ color: '#e74c3c' }}>*</span>
                    </label>
                    <input 
                      required
                      type="text" 
                      placeholder="Adınız Soyadınız" 
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid #d8d0be', fontSize: 15, outline: 'none', background: '#fcfcfc' }} 
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#5a5748', marginBottom: 8 }}>Kurum Adı (Opsiyonel)</label>
                    <input 
                      type="text" 
                      placeholder="Kurumunuzun Adı" 
                      value={formData.institution}
                      onChange={e => setFormData({ ...formData, institution: e.target.value })}
                      style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid #d8d0be', fontSize: 15, outline: 'none', background: '#fcfcfc' }} 
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#5a5748', marginBottom: 8 }}>
                      E-Posta Adresiniz <span style={{ color: '#e74c3c' }}>*</span>
                    </label>
                    <input 
                      required
                      type="email" 
                      placeholder="ornek@email.com" 
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid #d8d0be', fontSize: 15, outline: 'none', background: '#fcfcfc' }} 
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#5a5748', marginBottom: 8 }}>
                      Mesajınız <span style={{ color: '#e74c3c' }}>*</span>
                    </label>
                    <textarea 
                      required
                      placeholder="Size nasıl yardımcı olabiliriz?" 
                      rows={4} 
                      value={formData.message}
                      onChange={e => setFormData({ ...formData, message: e.target.value })}
                      style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid #d8d0be', fontSize: 15, outline: 'none', background: '#fcfcfc', resize: 'vertical' }} 
                    />
                  </div>

                  <button 
                    disabled={status === 'loading'}
                    style={{ 
                      padding: '16px 24px', borderRadius: 12, background: 'linear-gradient(135deg, #2d5a3d 0%, #1e4229 100%)', 
                      color: 'white', fontSize: 16, fontWeight: 700, border: 'none', cursor: status === 'loading' ? 'default' : 'pointer',
                      boxShadow: '0 4px 12px rgba(45,90,61,0.2)', marginTop: 8,
                      opacity: status === 'loading' ? 0.8 : 1,
                      transition: 'all 0.2s'
                    }}>
                    {status === 'loading' ? 'Gönderiliyor...' : 'Şimdi Gönder'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer style={{
        background: '#1e4229', padding: '40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ClipboardList size={16} color="white" />
          </div>
          <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 16, color: 'white' }}>
            Klüp360
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          © {new Date().getFullYear()} Klüp360 — MEB Çocuk Kulüpleri Yönetim Sistemi
        </p>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link href="/tanitim/kullanim-kosullari" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Kullanım Koşulları</Link>
          <Link href="/tanitim/gizlilik-politikasi" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Gizlilik Politikası</Link>
          <Link href="/tanitim/iade-politikasi" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>İade Politikası</Link>
          <Link href="/tanitim/iletisim" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>İletişim</Link>
        </div>
      </footer>
    </div>
  )
}

