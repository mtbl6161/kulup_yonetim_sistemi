'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { BrandMark, Wordmark } from '@/components/brand/Logo'

// Tanıtım sayfasıyla aynı menü (app/tanitim/page.tsx)
const LINKS = [
  { href: '/tanitim#ay', label: 'Nasıl çalışır' },
  { href: '/tanitim#muhtasar', label: 'Muhtasar' },
  { href: '/fiyatlandirma', label: 'Fiyatlandırma' },
  { href: '/rehber', label: 'Rehber ve araçlar' },
  { href: '/tanitim/iletisim', label: 'İletişim' },
]

export default function PublicNav() {
  const { user, profil } = useAuth()
  const pathname = usePathname()
  const [acik, setAcik] = useState(false)
  const panelUrl = profil?.rol === 'super_admin' ? '/yonetim' : (profil?.rol === 'denetim_yetkilisi' ? '/denetim' : '/')
  // Rehber altındaki makaleler ve araç sayfaları "Rehber ve araçlar" altında sayılır
  const etkin = (href: string) => pathname === href || (href === '/rehber' && pathname.startsWith('/rehber/'))

  return (
    <nav className="pub-nav">
      <div className="pub-nav-inner">
        <Link href="/tanitim" className="pub-brand" aria-label="Klüp360 ana sayfa">
          <BrandMark size={36} title="" />
          <Wordmark height={28} />
        </Link>

        <div className="pub-nav-links">
          {LINKS.map(l => (
            <Link key={l.href} href={l.href} className={etkin(l.href) ? 'active' : undefined} aria-current={etkin(l.href) ? 'page' : undefined}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="pub-nav-cta">
          {user ? (
            <Link href={panelUrl} className="pub-btn pub-btn-ghost">Panele dön</Link>
          ) : (
            <>
              <Link href="/login" className="pub-nav-login">Giriş yap</Link>
              <Link href="/signup" className="pub-btn pub-btn-primary">Ücretsiz deneyin</Link>
            </>
          )}
          <button type="button" className="pub-menu-btn" onClick={() => setAcik(v => !v)} aria-expanded={acik} aria-controls="pub-mobil-menu" aria-label={acik ? 'Menüyü kapat' : 'Menüyü aç'}>
            {acik ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {acik && (
        <div id="pub-mobil-menu" className="pub-mobil-menu" onKeyDown={e => { if (e.key === 'Escape') setAcik(false) }}>
          {LINKS.map(l => <Link key={l.href} href={l.href} onClick={() => setAcik(false)}>{l.label}</Link>)}
          {!user && <Link href="/login" onClick={() => setAcik(false)} className="pub-mobil-giris">Giriş yap</Link>}
        </div>
      )}
    </nav>
  )
}
