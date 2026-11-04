// Klüp360 marka işareti (gülümseyen ü) ve logo yazısı.
// Geometri tek kaynaktan: components/brand/geometri.ts (statik dosyalar: npx tsx scripts/marka-uret.ts)
import { ISARET, YAZI, isaretRenkleri, yaziRenkleri, type Ton } from './geometri'

type MarkProps = { size?: number; tone?: 'dark' | 'light' | 'blue' | 'mono'; title?: string }

const TON: Record<NonNullable<MarkProps['tone']>, Ton> = { dark: 'koyu', light: 'acik', blue: 'mavi', mono: 'tek' }

/** Kare uygulama işareti (title="" verilirse yanında yazı olduğu için ekran okuyucudan gizlenir). dark: lacivert zemin, light: beyaz zemin (koyu sayfalarda), blue: mavi zemin, mono: zeminsiz tek renk */
export function BrandMark({ size = 32, tone = 'dark', title = 'Klüp360' }: MarkProps) {
  const r = isaretRenkleri(TON[tone])
  const { noktaSol: a, noktaSag: b } = ISARET
  return (
    <svg width={size} height={size} viewBox={ISARET.viewBox} style={{ flexShrink: 0, display: 'block' }}
      {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true })}>
      {r.zemin && <rect width="64" height="64" rx={ISARET.koseYaricap} fill={r.zemin} />}
      <path d={ISARET.yay} fill="none" stroke={r.cizgi} strokeWidth={ISARET.yayKalinlik} strokeLinecap="round" />
      <circle cx={a.cx} cy={a.cy} r={a.r} fill={r.sol} />
      <circle cx={b.cx} cy={b.cy} r={b.r} fill={r.sag} />
    </svg>
  )
}

/** Özel çizilmiş "Klüp360" yazısı. height: SVG yüksekliği (harf yüksekliği bunun ~%60'ı) */
export function Wordmark({ height = 24, onDark = false, title = 'Klüp360' }: { height?: number; onDark?: boolean; title?: string }) {
  const r = yaziRenkleri(onDark)
  const k = YAZI.kalinlik
  const cizgi = { fill: 'none', strokeWidth: k, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  const s = YAZI.sifir
  return (
    <svg height={height} width={height * YAZI.oran} viewBox={YAZI.viewBox} role="img" aria-label={title} style={{ flexShrink: 0, display: 'block' }}>
      {YAZI.harfler.map(d => <path key={d} d={d} stroke={r.harf} {...cizgi} />)}
      <circle {...YAZI.pHalka} stroke={r.harf} fill="none" strokeWidth={k} />
      <circle {...YAZI.noktaSol} fill={r.sol} />
      <circle {...YAZI.noktaSag} fill={r.sag} />
      {YAZI.rakamlar.map(d => <path key={d} d={d} stroke={r.rakam} {...cizgi} />)}
      <circle {...YAZI.altiHalka} stroke={r.rakam} fill="none" strokeWidth={k} />
      <rect x={s.x} y={s.y} width={s.width} height={s.height} rx={s.rx} stroke={r.rakam} fill="none" strokeWidth={k} />
    </svg>
  )
}

type LogoProps = { size?: number; tone?: 'onLight' | 'onDark'; showTagline?: boolean }

/** İşaret + yazı. size: işaretin kenar uzunluğu */
export default function Logo({ size = 28, tone = 'onLight', showTagline = false }: LogoProps) {
  const onDark = tone === 'onDark'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.34, textDecoration: 'none' }}>
      <BrandMark size={size} tone={onDark ? 'blue' : 'dark'} title="" />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Wordmark height={size * 0.8} onDark={onDark} />
        {showTagline && (
          <span style={{ fontSize: size * 0.34, color: onDark ? 'rgba(255,255,255,.6)' : 'var(--text3)' }}>
            Okul Yönetim Platformu
          </span>
        )}
      </span>
    </span>
  )
}
