'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { BrandMark, Wordmark } from '@/components/brand/Logo'
import { DENEME_GUN } from '@/lib/abonelikPlanlari'

const BOLUMLER: [string, string][] = [
  ['ozellikler', 'Nasıl çalışır'],
  ['denetci', 'Denetçiler için'],
  ['fiyat', 'Fiyatlandırma'],
  ['sorular', 'Sorular'],
]

/** Sayfa kendi kabında kayar (ClientLayout: 100vh + overflow:auto); kaydırma olayı o kaptan dinlenir. */
function kaydiriciBul(el: HTMLElement | null): HTMLElement | Window {
  let s = el?.parentElement ?? null
  while (s) {
    const oy = getComputedStyle(s).overflowY
    if (oy === 'auto' || oy === 'scroll') return s
    s = s.parentElement
  }
  return window
}

export function TanitimNav() {
  const { user, profil } = useAuth()
  const panelUrl = profil?.rol === 'super_admin' ? '/yonetim' : profil?.rol === 'denetim_yetkilisi' ? '/denetim' : '/'
  const [acik, setAcik] = useState(false)
  const [golge, setGolge] = useState(false)
  const nav = useRef<HTMLElement>(null)
  const dugme = useRef<HTMLButtonElement>(null)

  // Kaydırınca alt çizgi
  useEffect(() => {
    const kap = kaydiriciBul(nav.current)
    const oku = () => setGolge((kap instanceof Window ? kap.scrollY : kap.scrollTop) > 8)
    oku()
    kap.addEventListener('scroll', oku, { passive: true })
    return () => kap.removeEventListener('scroll', oku)
  }, [])

  // Mobil menü: Escape ve dışarı tıklama kapatır
  useEffect(() => {
    if (!acik) return
    const tus = (e: KeyboardEvent) => { if (e.key === 'Escape') { setAcik(false); dugme.current?.focus() } }
    const tik = (e: MouseEvent) => { if (nav.current && !nav.current.contains(e.target as Node)) setAcik(false) }
    document.addEventListener('keydown', tus)
    document.addEventListener('click', tik)
    return () => { document.removeEventListener('keydown', tus); document.removeEventListener('click', tik) }
  }, [acik])

  const kapat = () => setAcik(false)

  return (
    <nav
      id="nav"
      ref={nav}
      aria-label="Ana menü"
      className={[golge && 'golge', acik && 'acik'].filter(Boolean).join(' ') || undefined}
      onBlur={e => { if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) kapat() }}
    >
      <div className="kap nav-ic">
        <Link href="/tanitim" className="marka" aria-label="Klüp360 ana sayfa">
          <BrandMark size={32} title="" />
          <Wordmark height={24} title="" />
        </Link>
        <div className="baglantilar">
          {BOLUMLER.map(([id, ad]) => <a key={id} href={`#${id}`}>{ad}</a>)}
        </div>
        <div className="nav-sag">
          {user ? (
            <Link href={panelUrl} className="btn btn-ana btn-kucuk">Panele dön</Link>
          ) : (
            <>
              <Link href="/login" className="giris">Giriş yap</Link>
              <Link href="/signup" className="btn btn-ana btn-kucuk"><span className="uzun">Ücretsiz deneyin</span><span className="kisa">Deneyin</span></Link>
            </>
          )}
          <button
            ref={dugme}
            type="button"
            className="menu-dugme"
            aria-expanded={acik}
            aria-controls="mobilMenu"
            aria-label={acik ? 'Menüyü kapat' : 'Menüyü aç'}
            onClick={() => setAcik(a => !a)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {acik ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>
      <div className="mobil-menu" id="mobilMenu">
        {BOLUMLER.map(([id, ad]) => <a key={id} href={`#${id}`} onClick={kapat}>{ad}</a>)}
        {user ? (
          <Link href={panelUrl} onClick={kapat}>Panele dön</Link>
        ) : (
          <>
            <Link href="/login" onClick={kapat}>Giriş yap</Link>
            <Link href="/signup" onClick={kapat}>{DENEME_GUN} gün ücretsiz deneyin</Link>
          </>
        )}
      </div>
    </nav>
  )
}
