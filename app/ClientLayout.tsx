'use client'
import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import { AyProvider } from '@/lib/AyContext'
import { AuthProvider, useAuth } from '@/lib/AuthContext'
import { usePathname } from 'next/navigation'

function InnerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const pathname = usePathname()

  const isAuthPage = pathname === '/login' || pathname === '/signup'
  const isFullPage = isAuthPage || pathname.startsWith('/tanitim') || pathname === '/fiyatlandirma' || pathname === '/ek-ders-hesaplama' || pathname === '/cocuk-kulubu-bordro-hesaplama' || pathname === '/cocuk-kulubu-aidat-hesaplama' || pathname === '/cocuk-kulubu-butce-tablosu' || pathname === '/gelir-vergisi-dilimleri-2026' || pathname.startsWith('/rehber') || pathname === '/reset-password' || pathname === '/bakim' || pathname === '/odeme-yap' || pathname === '/abonelik-yenile'
  const isSuperAdminPanel = pathname.startsWith('/yonetim') || pathname.startsWith('/admin-panel') || pathname.startsWith('/kullanici-yonetimi') || pathname.startsWith('/sistem-logu') || pathname.startsWith('/denetim')

  // Yükleme durumu için 3 saniyelik bir emniyet kilidi
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  // Giriş sayfalarında veya süper admin panelinde sidebar yok
  if (isFullPage || isSuperAdminPanel) return <div style={{ height: '100vh', overflowY: 'auto' }}>{children}</div>

  if (authLoading && !timedOut) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '4px solid #2d5a3d', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 20px', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontFamily: 'sans-serif', color: 'var(--text2)', fontSize: 13 }}>Sistem Hazırlanıyor...</p>
        </div>
      </div>
    )
  }

  // Giriş yapılmamışsa ve giriş sayfasında değilse
  if (!user && !isAuthPage) {
    if (timedOut) return <>{children}</> // Fallback
    return null
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <main
        id="main-content"
        style={{
          marginLeft: collapsed ? 80 : 280,
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflowY: 'auto',
          transition: 'margin-left 0.3s ease',
        }}
      >
        {children}
      </main>
    </div>
  )
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AyProvider>
        <InnerLayout>{children}</InnerLayout>
      </AyProvider>
    </AuthProvider>
  )
}
