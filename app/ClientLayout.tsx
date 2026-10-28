'use client'
import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import SistemBildirimi from '@/components/SistemBildirimi'
import GlobalDiyalog from '@/components/GlobalDiyalog'
import { AyProvider } from '@/lib/AyContext'
import { AuthProvider, useAuth } from '@/lib/AuthContext'
import { usePathname } from 'next/navigation'
import { MobilMenuProvider, useDarEkran } from '@/lib/MobilMenu'
import { useDegisince } from '@/lib/useDegisince'

function InnerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [menuAcik, setMenuAcik] = useState(false)
  const pathname = usePathname()
  const dar = useDarEkran()

  // Sayfa değişince ya da ekran genişleyince çekmeceyi kapat
  useDegisince(`${pathname}|${dar}`, () => setMenuAcik(false))

  const isAuthPage = pathname === '/login' || pathname === '/signup'
  const isFullPage = isAuthPage || pathname.startsWith('/tanitim') || pathname === '/fiyatlandirma' || pathname === '/ek-ders-hesaplama' || pathname === '/cocuk-kulubu-bordro-hesaplama' || pathname === '/cocuk-kulubu-aidat-hesaplama' || pathname === '/cocuk-kulubu-butce-tablosu' || pathname === '/gelir-vergisi-dilimleri-2026' || pathname.startsWith('/rehber') || pathname === '/reset-password' || pathname === '/bakim' || pathname === '/odeme-yap' || pathname === '/abonelik-yenile' || pathname === '/kurulum'
  const isSuperAdminPanel = pathname.startsWith('/yonetim') || pathname.startsWith('/denetim')

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
          <div style={{ width: 40, height: 40, border: '4px solid #2347D9', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 20px', animation: 'spin 1s linear infinite' }} />
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
    <MobilMenuProvider value={{ ac: () => setMenuAcik(true) }}>
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed && !dar} setCollapsed={setCollapsed} mobilAcik={menuAcik} onMobilKapat={dar ? () => setMenuAcik(false) : undefined} />
      {dar && menuAcik && <div className="sidebar-perde" onClick={() => setMenuAcik(false)} aria-hidden="true" />}
      <main
        id="main-content"
        style={{
          marginLeft: dar ? 0 : collapsed ? 72 : 248,
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
    </MobilMenuProvider>
  )
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AyProvider>
        <InnerLayout>{children}</InnerLayout>
        <SistemBildirimi />
        <GlobalDiyalog />
      </AyProvider>
    </AuthProvider>
  )
}
