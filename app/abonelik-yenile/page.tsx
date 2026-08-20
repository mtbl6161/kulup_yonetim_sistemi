'use client'
import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@/lib/AuthContext'
import {
  RefreshCw, CheckCircle2, ShieldAlert, Zap,
  ArrowRight, Lock, LogOut, Loader2, Calendar, AlertTriangle
} from 'lucide-react'

const AYLIK = 750
const YILLIK = 7500

function AbonelikYenileIc() {
  const { signOut, profil, okul, session } = useAuth()
  const [secDonem, setSecDonem] = useState<'month' | 'year'>('month')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const tutar = secDonem === 'year' ? YILLIK : AYLIK

  const handleOdeme = async () => {
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
    'Anlık WhatsApp ve Bildirim Entegrasyonu'
  ]

  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>

        {/* Uyarı Başlığı */}
        <div style={alertBoxStyle}>
          <AlertTriangle size={18} color="#c8832a" />
          <span style={{ color: '#7a4f10', fontSize: 13, fontWeight: 600 }}>
            Aboneliğinizin süresi doldu
          </span>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={iconBoxStyle}>
            <RefreshCw size={24} color="var(--accent2)" />
          </div>
          <h1 style={h1Style}>Aboneliğinizi Yenileyin</h1>
          <p style={subStyle}>
            Kesintisiz erişim için aboneliğinizi yenileyin ve kurumunuzun tüm verilerine kaldığınız yerden devam edin.
          </p>
        </div>

        {/* Plan Seçici */}
        <div style={pricingSelectorStyle}>
          {(['month', 'year'] as const).map(d => (
            <button key={d} onClick={() => setSecDonem(d)} style={{
              ...toggleBtnStyle,
              background: secDonem === d ? 'var(--accent)' : 'transparent',
              color: secDonem === d ? '#fff' : 'var(--text2)',
              boxShadow: secDonem === d ? '0 4px 10px rgba(45, 90, 61, 0.2)' : 'none',
            }}>
              {d === 'month' ? 'Aylık' : 'Yıllık'}
              {d === 'year' && <span style={badgeStyle}>%20 Tasarruf</span>}
            </button>
          ))}
        </div>

        {/* Fiyat Kartı */}
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
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Ödeme Butonu */}
        <button
          type="button"
          onClick={handleOdeme}
          disabled={loading}
          style={payBtnStyle}
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
          <span style={{ flex: 1, textAlign: 'center' }}>
            {loading ? 'Yönlendiriliyor...' : 'Aboneliği Yenile'}
          </span>
          <ArrowRight size={18} />
        </button>

        <div style={secureInfoStyle}>
          <Lock size={12} /> SSL Korumalı Güvenli İşlem
        </div>

        {error && (
          <div style={{ marginTop: 12, color: 'var(--danger)', fontSize: 12, textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* Alt Bilgi */}
        <div style={footerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text2)', fontSize: 11 }}>
            <Calendar size={12} />
            <span style={{ fontWeight: 700 }}>{okul?.ad || '...'}</span>
          </div>
          <button onClick={signOut} style={logoutBtnStyle}>
            <LogOut size={12} /> Çıkış Yap
          </button>
        </div>

      </div>
    </div>
  )
}

// ── STYLES ────────────────────────────────────────────
const wrapStyle: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--bg)', padding: '20px 16px', fontFamily: '"DM Sans", sans-serif',
  overflowY: 'auto'
}

const cardStyle: React.CSSProperties = {
  width: '100%', maxWidth: 400, background: 'var(--surface)',
  borderRadius: 20, padding: '24px',
  border: '1px solid var(--border)', boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
  display: 'flex', flexDirection: 'column', margin: 'auto'
}

const alertBoxStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  background: '#fef9e7', border: '1px solid #f9d97a', borderRadius: 10,
  padding: '10px 16px', marginBottom: 20
}

const iconBoxStyle: React.CSSProperties = {
  width: 48, height: 48, background: '#fef0d9',
  borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  marginBottom: 12, border: '1px solid #e8c98a'
}

const h1Style: React.CSSProperties = {
  fontFamily: '"Playfair Display", serif',
  fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4, marginTop: 0
}

const subStyle: React.CSSProperties = {
  fontSize: 13, color: 'var(--text2)', lineHeight: 1.5, margin: 0
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
  fontSize: 12, marginBottom: 8
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
  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
}

const logoutBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#c0392b', cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600
}

export default function AbonelikYenilePage() {
  return (
    <Suspense fallback={<div style={wrapStyle}><Loader2 className="animate-spin" color="var(--accent)" /></div>}>
      <AbonelikYenileIc />
    </Suspense>
  )
}
