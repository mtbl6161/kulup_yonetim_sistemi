'use client'
import { Hammer } from 'lucide-react'

export default function BakimPage() {
  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: '#0f172a', 
      color: '#f1f5f9',
      fontFamily: 'system-ui, sans-serif',
      padding: 20,
      textAlign: 'center'
    }}>
      <div style={{ 
        width: 80, 
        height: 80, 
        background: 'rgba(59, 130, 246, 0.1)', 
        borderRadius: '50%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        marginBottom: 32,
        animation: 'pulse 2s infinite'
      }}>
        <Hammer size={40} color="#3b82f6" />
      </div>

      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>Saha Bakım Çalışması</h1>
      <p style={{ maxWidth: 500, lineHeight: 1.6, color: '#94a3b8', fontSize: 16 }}>
        Sizlere daha iyi bir deneyim sunabilmek için platformumuzda planlı bir bakım çalışması yapıyoruz. 
        Kısa süre içinde tekrar aranızda olacağız.
      </p>

      <div style={{ marginTop: 40, padding: '12px 24px', background: '#1e293b', borderRadius: 12, border: '1px solid #334155', fontSize: 14, color: '#64748b' }}>
        Tahmini açılış süresi: <strong>~30 dakika</strong>
      </div>

      <button 
        onClick={() => window.location.href = '/'}
        style={{
          marginTop: 24,
          padding: '12px 32px',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: 12,
          fontWeight: 700,
          cursor: 'pointer',
          transition: '0.2s'
        }}
      >
        Sistemi Kontrol Et / Tekrar Dene
      </button>

      <style jsx global>{`
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      `}</style>
    </div>
  )
}
