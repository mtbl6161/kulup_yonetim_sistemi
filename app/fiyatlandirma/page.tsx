import type { Metadata } from 'next'
import PublicShell from '@/components/public/PublicShell'
import FiyatlandirmaContent from './FiyatlandirmaContent'

export const metadata: Metadata = {
  title: 'Fiyatlandırma | Klüp360 — Tek Plan, Tüm Özellikler',
  description: 'Klüp360 fiyatlandırması: tek plan, tüm modüller. Sınırsız öğretmen ve öğrenci, gizli ücret yok. Aylık ₺750, yıllıkta %20 indirim. 7 gün ücretsiz deneyin.',
  alternates: { canonical: 'https://www.klup360.com/fiyatlandirma' },
  openGraph: {
    title: 'Klüp360 Fiyatlandırma — Tek Plan, Tüm Özellikler',
    description: 'Sınırsız öğretmen ve öğrenci, gizli ücret yok. 7 gün ücretsiz deneyin.',
    url: 'https://www.klup360.com/fiyatlandirma',
    siteName: 'Klüp360',
    locale: 'tr_TR',
    type: 'website',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'Klüp360' }],
  },
}

export default function FiyatlandirmaPage() {
  return (
    <PublicShell>
      <section className="pub-hero">
        <div className="pub-container">
          <span className="pub-badge"><span className="pub-badge-dot" /> Limit yok, sürpriz yok</span>
          <h1 className="pub-h1">Sade fiyat, <span className="pub-grad">tam özellik</span></h1>
          <p className="pub-lead">
            Tek plan, tüm modüller. Sınırsız öğretmen, sınırsız öğrenci. Kurumunuz kadar ödeyin,
            gizli ücretlerle asla karşılaşmayın.
          </p>
        </div>
      </section>

      <section className="pub-section" style={{ paddingTop: 8 }}>
        <div className="pub-container">
          <FiyatlandirmaContent />
        </div>
      </section>
    </PublicShell>
  )
}
