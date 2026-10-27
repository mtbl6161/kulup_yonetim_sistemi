// Klüp360 marka işareti: halka (360°) + yörüngedeki nokta.
// Tek kaynak: public/brand/logo-mark.svg ve app/icon.svg ile aynı geometri.

type MarkProps = { size?: number; tone?: 'dark' | 'light' | 'mono'; title?: string }

export function BrandMark({ size = 32, tone = 'dark', title = 'Klüp360' }: MarkProps) {
  const bg = tone === 'dark' ? '#0E1116' : tone === 'light' ? '#FFFFFF' : 'none'
  const ring = tone === 'light' ? '#0E1116' : tone === 'mono' ? 'currentColor' : '#FFFFFF'
  const dot = tone === 'light' ? '#2347D9' : '#2347D9'
  const cut = tone === 'dark' ? '#0E1116' : tone === 'light' ? '#FFFFFF' : 'var(--surface)'
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={title} style={{ flexShrink: 0, display: 'block' }}>
      {bg !== 'none' && <rect width="64" height="64" rx="14" fill={bg} />}
      <circle cx="31" cy="31" r="15" fill="none" stroke={ring} strokeWidth="5" />
      <circle cx="46" cy="46" r="6.5" fill={dot} stroke={cut} strokeWidth="3" />
    </svg>
  )
}

type LogoProps = { size?: number; tone?: 'onLight' | 'onDark'; showTagline?: boolean }

export default function Logo({ size = 28, tone = 'onLight', showTagline = false }: LogoProps) {
  const onDark = tone === 'onDark'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.36, textDecoration: 'none' }}>
      <BrandMark size={size} tone={onDark ? 'light' : 'dark'} />
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: size * 0.68, letterSpacing: '-0.04em', color: onDark ? '#fff' : 'var(--text)' }}>
          Klüp<span style={{ color: onDark ? '#8EA3EE' : 'var(--accent)' }}>360</span>
        </span>
        {showTagline && (
          <span style={{ fontSize: size * 0.34, color: onDark ? 'rgba(255,255,255,.6)' : 'var(--text3)', marginTop: 2 }}>
            Okul Yönetim Platformu
          </span>
        )}
      </span>
    </span>
  )
}
