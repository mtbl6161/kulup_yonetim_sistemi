'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { BrandMark, Wordmark } from '@/components/brand/Logo'

const LINKS = [
  { href: '/rehber', label: 'Rehber ve Araçlar', tool: true },
  { href: '/fiyatlandirma', label: 'Fiyatlandırma' },
  { href: '/tanitim/kullanim-kosullari', label: 'Koşullar' },
  { href: '/tanitim/iletisim', label: 'İletişim' },
]

export default function PublicNav() {
  const { user } = useAuth()
  const pathname = usePathname()

  return (
    <nav className="pub-nav">
      <div className="pub-nav-inner">
        <Link href="/tanitim" className="pub-brand">
          <BrandMark size={38} title="" />
          <Wordmark height={30} />
        </Link>

        <div className="pub-nav-links">
          <Link href="/tanitim" className="pub-nav-home"><Home size={15} /> Ana Sayfa</Link>
          {LINKS.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`${l.tool ? 'pub-nav-tool' : ''} ${pathname === l.href ? 'active' : ''}`.trim()}
              aria-current={pathname === l.href ? 'page' : undefined}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="pub-nav-cta">
          {user ? (
            <Link href="/" className="pub-userpill">
              <span className="pub-avatar">{user.email?.[0]?.toUpperCase()}</span>
              <span>Panele Dön</span>
            </Link>
          ) : (
            <>
              <Link href="/login" className="pub-nav-login">Giriş Yap</Link>
              <Link href="/signup" className="pub-btn pub-btn-primary">Ücretsiz Başla</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
