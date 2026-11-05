import type { Metadata } from 'next'
import PublicShell from '@/components/public/PublicShell'
import FiyatlandirmaContent from './FiyatlandirmaContent'

export const metadata: Metadata = {
  title: 'Fiyatlandırma | Klüp360: tek paket, tüm modüller',
  description: 'Klüp360 fiyatlandırması: tek plan, tüm modüller. Sınırsız öğretmen ve öğrenci, gizli ücret yok. Aylık ₺1.250 veya yıllık ₺12.500. 15 gün ücretsiz deneyin.',
  alternates: { canonical: 'https://www.klup360.com/fiyatlandirma' },
  openGraph: {
    title: 'Klüp360 fiyatlandırma: tek paket, tüm modüller',
    description: 'Sınırsız öğretmen ve öğrenci, gizli ücret yok. 15 gün ücretsiz deneyin.',
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
          <h1 className="pub-h1">Tek paket, tüm modüller</h1>
          <p className="pub-lead">
            Kulübünüzün büyüklüğü fiyatı değiştirmez: öğrenci, personel ve sınıf sayısında sınır yoktur.
            Yalnızca ödeme sıklığını seçersiniz.
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
