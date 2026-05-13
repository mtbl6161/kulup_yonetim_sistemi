'use client'
import { AuthProvider, useAuth } from '@/lib/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { ShieldCheck, LogOut, LayoutDashboard, Users, ClipboardList } from 'lucide-react'
import Link from 'next/link'

function YonetimLayoutInner({ children }: { children: React.ReactNode }) {
  const { profil, user, loading, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && (!profil || profil.rol !== 'super_admin')) {
      router.replace('/')
    }
  }, [profil, loading, router])

  if (loading || !profil || profil.rol !== 'super_admin') {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #22c55e', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
      <main>
        {children}
      </main>
    </div>
  )
}

export default function YonetimLayout({ children }: { children: React.ReactNode }) {
  return (
    <InnerLayoutWrapper>{children}</InnerLayoutWrapper>
  )
}

// ClientLayout zaten AuthProvider sağlıyor ama bu panel bağımsız olacağı için 
// bazen direkt URL girişlerinde gerekebilir. 
// Root layout ClientLayout ile sarmalanmış.
function InnerLayoutWrapper({ children }: { children: React.ReactNode }) {
  return <YonetimLayoutInner>{children}</YonetimLayoutInner>
}
