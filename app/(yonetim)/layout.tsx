'use client'
import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Yönetim konsolu yalnızca sistem yöneticisine açıktır; diğer roller ana sayfaya yönlenir.
export default function YonetimLayout({ children }: { children: React.ReactNode }) {
  const { profil, loading } = useAuth()
  const router = useRouter()
  const yetkili = !loading && profil?.rol === 'super_admin'

  useEffect(() => {
    if (!loading && profil?.rol !== 'super_admin') router.replace('/')
  }, [profil, loading, router])

  if (!yetkili) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div role="status" aria-label="Yükleniyor" style={{ width: 36, height: 36, border: '3px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }
  return <>{children}</>
}
