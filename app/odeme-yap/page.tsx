'use client'
import { useState, Suspense } from 'react'
import { useAuth } from '@/lib/AuthContext'
import {
  CreditCard, CheckCircle2, ShieldCheck, Zap, 
  ArrowRight, Globe, Lock, LogOut, Loader2
} from 'lucide-react'

const AYLIK = 750
const YILLIK = 7500

function OdemeYapIc() {
  const { signOut, profil, okul, session } = useAuth()
  const [secDonem, setSecDonem] = useState<'month' | 'year'>('month')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const tutar = secDonem === 'year' ? YILLIK : AYLIK

  const handleOnlineOdeme = async () => {
    if (!okul) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/lemonsqueezy/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          okulId: okul.id, 
          variantId: secDonem === 'month' ? "1588063" : "1588065",
          interval: secDonem
        })
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else throw new Error(data.error || 'Bağlantı oluşturulamadı')
    } catch (e: any) {
      setError(e.message || 'Bağlantı hatası oluştu.')
    } finally {
      setLoading(false)
    }
  }

  const ozellikler = [
    'Sınırsız Öğrenci ve Veli Kaydı',
    'Dijital Yoklama ve Bildirim Sistemi',
    'Otomatik Tahsilat ve Gelir Takibi',
    'Detaylı Puantaj ve Bordro Analizi',
    'Anlık WhatsApp & Bildirim Entegrasyonu'
  ]

  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={iconBoxStyle}>
            <ShieldCheck size={24} color="var(--accent)" />
          </div>
          <h1 style={h1Style}>Hesap Aktivasyonu</h1>
          <p style={subStyle}>Kurumunuz için aboneliğinizi başlatın.</p>
        </div>

        {/* Pricing Selector */}
        <div style={pricingSelectorStyle}>
          {(['month', 'year'] as const).map(d => (
            <button key={d} onClick={() => setSecDonem(d)} style={{
              ...toggleBtnStyle,
              background: secDonem === d ? 'var(--accent)' : 'transparent',
              color: secDonem === d ? '#fff' : 'var(--text2)',
              boxShadow: secDonem === d ? '0 4px 10px rgba(45, 90, 61, 0.2)' : 'none',
            }}>
              {d === 'month' ? 'Aylık' : 'Yıllık'}
              {d === 'year' && <span style={badgeStyle}>%20 İndirim</span>}
            </button>
          ))}
        </div>

        {/* Main Price Card */}
        <div style={priceCardStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
            {secDonem === 'year' && (
              <span style={{ fontSize: 13, color: 'var(--text3)', textDecoration: 'line-through', marginBottom: -4 }}>₺9.000</span>
            )}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={priceSymbol}>₺</span>
              <span style={priceBig}>{tutar.toLocaleString('tr-TR')}</span>
              <span style={priceLabel}>/ {secDonem === 'month' ? 'ay' : 'yıl'}</span>
            </div>
          </div>
          <div style={divider} />
          <ul style={featureList}>
            {ozellikler.map((f, i) => (
              <li key={i} style={featureItem}>
                <CheckCircle2 size={14} color="var(--accent)" />
                <span style={{ flex: 1 }}>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Button */}
        <div style={{ position: 'relative' }}>
          {error && <div style={{ color: 'var(--danger)', fontSize: 11, textAlign: 'center', marginBottom: 10 }}>{error}</div>}
          <button 
            type="button"
            onClick={handleOnlineOdeme}
            disabled={loading}
            style={payBtnStyle}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
            <span style={{ flex: 1, textAlign: 'center' }}>{loading ? 'Yönlendiriliyor...' : 'Online Ödeme Yap'}</span>
            <ArrowRight size={18} />
          </button>
          
          <div style={secureInfoStyle}>
            <Lock size={12} /> SSL Korumalı Güvenli İşlem
          </div>
        </div>

        {/* Footer Info */}
        <div style={footerStyle}>
          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 11 }}>{okul?.ad || '...'}</div>
          <button onClick={signOut} style={logoutBtnStyle}>
            <LogOut size={12} /> Çıkış Yap
          </button>
        </div>
      </div>
    </div>
  )
}

// STYLES - COMPACT VERSION
const wrapStyle: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--bg)', padding: '20px 16px', fontFamily: '"DM Sans", sans-serif',
  overflowY: 'auto'
}

const cardStyle: React.CSSProperties = {
  width: '100%', maxWidth: 400, background: 'var(--surface)',
  borderRadius: 20, padding: '24px',
  border: '1px solid var(--border)', boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
  display: 'flex', flexDirection: 'column', margin: 'auto'
}

const iconBoxStyle: React.CSSProperties = {
  width: 48, height: 48, background: 'var(--accent-lighter)',
  borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  marginBottom: 12, border: '1px solid var(--accent-light)'
}

const h1Style: React.CSSProperties = {
  fontFamily: '"Playfair Display", serif',
  fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4, marginTop: 0
}

const subStyle: React.CSSProperties = {
  fontSize: 13, color: 'var(--text2)', lineHeight: 1.4, margin: 0
}

const pricingSelectorStyle: React.CSSProperties = {
  display: 'flex', background: 'var(--surface2)', padding: 4, borderRadius: 12,
  gap: 4, marginBottom: 20, border: '1px solid var(--border-light)'
}

const toggleBtnStyle: React.CSSProperties = {
  flex: 1, padding: '8px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700,
  border: 'none', cursor: 'pointer', transition: 'all 0.2s',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4
}

const badgeStyle: React.CSSProperties = {
  fontSize: 8, background: 'var(--accent2)', color: '#fff', padding: '1px 4px',
  borderRadius: 4, textTransform: 'uppercase'
}

const priceCardStyle: React.CSSProperties = {
  background: 'var(--surface2)', borderRadius: 16, padding: '16px 20px',
  marginBottom: 20, border: '1px solid var(--border-light)'
}

const priceSymbol: React.CSSProperties = { fontSize: 16, fontWeight: 700, color: 'var(--accent)', marginRight: 2 }
const priceBig: React.CSSProperties = { fontSize: 36, fontWeight: 800, color: 'var(--text)', letterSpacing: '-1px' }
const priceLabel: React.CSSProperties = { fontSize: 13, color: 'var(--text2)', fontWeight: 500 }

const divider: React.CSSProperties = { height: 1, background: 'var(--border)', margin: '14px 0', opacity: 0.4 }

const featureList: React.CSSProperties = { listStyle: 'none', padding: 0, margin: 0 }
const featureItem: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text2)',
  fontSize: 12, marginBottom: 8, lineHeight: 1.2
}

const payBtnStyle: React.CSSProperties = {
  width: '100%', minHeight: 52, borderRadius: 14, background: 'var(--accent)',
  color: '#fff', fontSize: 14, fontWeight: 700, border: 'none',
  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
  padding: '0 20px', boxShadow: '0 8px 20px rgba(45, 90, 61, 0.15)'
}

const secureInfoStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  marginTop: 12, color: 'var(--text3)', fontSize: 10, fontWeight: 500
}

const footerStyle: React.CSSProperties = {
  marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)',
  textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
}

const logoutBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#c0392b', cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600
}

export default function OdemeYapPage() {
  return (
    <Suspense fallback={<div style={wrapStyle}><Loader2 className="animate-spin" color="var(--accent)" /></div>}>
      <OdemeYapIc />
    </Suspense>
  )
}
