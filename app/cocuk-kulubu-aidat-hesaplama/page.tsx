import type { Metadata } from 'next'
import Link from 'next/link'
import PublicShell from '@/components/public/PublicShell'
import AidatContent from './AidatContent'

export const metadata: Metadata = {
  title: 'Çocuk Kulübü Aidat Hesaplama 2026 (Veliden Toplanacak Ücret) | Klüp360',
  description:
    'MEB çocuk kulüpleri için veliden toplanacak aylık aidatı ücretsiz hesaplayın. Ayın iş günü, günlük saat ve saat ücretine göre; kardeş indirimi dahil. Kayıt gerekmez.',
  keywords: [
    'çocuk kulübü aidat hesaplama',
    'veliden toplanacak ücret',
    'çocuk kulübü aylık ücret',
    'çocuk kulübü öğrenci ücreti hesaplama',
  ],
  alternates: { canonical: 'https://www.klup360.com/cocuk-kulubu-aidat-hesaplama' },
  openGraph: {
    title: 'Çocuk Kulübü Aidat Hesaplama — Veliden Toplanacak Ücret',
    description: 'İş günü × günlük saat × saat ücreti ile aylık aidatı anında hesaplayın.',
    url: 'https://www.klup360.com/cocuk-kulubu-aidat-hesaplama',
    siteName: 'Klüp360',
    locale: 'tr_TR',
    type: 'website',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'Klüp360' }],
  },
}

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Çocuk kulübünde veliden toplanacak aidat nasıl hesaplanır?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Aylık aidat, ayın iş günü sayısı × günlük ders saati × saat ücreti formülüyle hesaplanır. Resmî tatiller ve hafta sonları iş gününden düşülür.',
      },
    },
    {
      '@type': 'Question',
      name: 'Kardeş indirimi nasıl uygulanır?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Aynı aileden birden fazla öğrenci varsa aidata %25 kardeş indirimi uygulanabilir; tutar 0,75 ile çarpılır.',
      },
    },
  ],
}

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <PublicShell>
        <section className="pub-hero">
          <div className="pub-container">
            <span className="pub-badge"><span className="pub-badge-dot" /> Ücretsiz · kayıt gerekmez</span>
            <h1 className="pub-h1">Çocuk Kulübü <span className="pub-grad">Aidat Hesaplama</span></h1>
            <p className="pub-lead">
              Veliden toplanacak aylık ücreti; ayın iş günü, günlük ders saati ve saat ücretine göre
              saniyeler içinde hesaplayın. Kardeş indirimi dahil.
            </p>
          </div>
        </section>

        <section className="pub-section" style={{ paddingTop: 8 }}>
          <div className="pub-container">
            <AidatContent />
          </div>
        </section>

        <section className="pub-section" style={{ paddingTop: 0 }}>
          <div className="pub-container">
            <div className="pub-prose">
              <h2>Veliden toplanacak aidat nasıl hesaplanır?</h2>
              <p>
                Çocuk kulüplerinde öğrenciden alınacak aylık ücret; <strong>ayın iş günü sayısı ×
                günlük ders saati × saat ücreti</strong> ile bulunur. Hafta sonları ve resmî tatiller
                iş gününden düşülür, böylece her ay gün sayısına göre adil bir tutar çıkar. Aynı aileden
                birden fazla öğrenci varsa <strong>%25 kardeş indirimi</strong> uygulanabilir.
              </p>
              <h2>Saat ücretini nasıl belirlerim?</h2>
              <p>
                Saat ücreti, gösterge ve memur maaş katsayısına göre belirlenir.
                <Link href="/ek-ders-hesaplama"> Ek ders / saat ücreti hesaplama</Link> aracıyla güncel
                saat ücretini bulup buraya girebilirsiniz. Personel bordrosu için ise
                <Link href="/cocuk-kulubu-bordro-hesaplama"> bordro hesaplama</Link> aracını kullanın.
              </p>
              <h2>Tahsilatı otomatik takip edin</h2>
              <p>
                Klüp360, her öğrencinin aylık aidatını otomatik hesaplar, tahsilat durumunu takip eder ve
                velilere bildirim gönderir. <Link href="/signup">Ücretsiz deneyin</Link>.
              </p>
            </div>
          </div>
        </section>
      </PublicShell>
    </>
  )
}
