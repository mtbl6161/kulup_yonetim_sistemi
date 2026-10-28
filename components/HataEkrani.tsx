import Link from 'next/link'
import type { ReactNode } from 'react'

/** Hata ve 404 sayfalarının ortak görünümü (Atlas tokenlarıyla). */
export default function HataEkrani({ kod, baslik, aciklama, eylem }: { kod: string; baslik: string; aciklama: string; eylem?: ReactNode }) {
  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg)' }}>
      <div style={{ maxWidth: 460, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: 10 }}>{kod}</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 650, letterSpacing: '-0.02em', color: 'var(--text)', margin: '0 0 10px' }}>{baslik}</h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--text2)', margin: '0 0 22px' }}>{aciklama}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {eylem}
          <Link href="/" className="btn btn-secondary">Genel bakışa dön</Link>
        </div>
      </div>
    </div>
  )
}
