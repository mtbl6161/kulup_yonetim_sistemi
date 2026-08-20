import type { Metadata } from 'next'
import Link from 'next/link'
import PublicShell from '@/components/public/PublicShell'
import VergiContent from './VergiContent'

export const metadata: Metadata = {
  title: '2026 Gelir Vergisi Dilimleri ve Hesaplama | Klüp360',
  description:
    '2026 yılı gelir vergisi dilimleri (%15, %20, %27, %35, %40) ve yıllık matrahınıza göre gelir vergisini ücretsiz hesaplama aracı. Çocuk kulübü bordroları için güncel tablo.',
  keywords: [
    '2026 gelir vergisi dilimleri',
    'gelir vergisi hesaplama 2026',
    'vergi dilimleri',
    'çocuk kulübü vergi hesaplama',
  ],
  alternates: { canonical: 'https://www.klup360.com/gelir-vergisi-dilimleri-2026' },
  openGraph: {
    title: '2026 Gelir Vergisi Dilimleri ve Hesaplama',
    description: 'Güncel vergi dilimleri tablosu + interaktif gelir vergisi hesaplama.',
    url: 'https://www.klup360.com/gelir-vergisi-dilimleri-2026',
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
      name: '2026 gelir vergisi dilimleri nedir?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '2026 yılı gelir vergisi dilimleri kademeli olarak %15, %20, %27, %35 ve %40 oranlarında uygulanır. Vergi, kümülatif matraha göre ilgili dilimden hesaplanır.',
      },
    },
    {
      '@type': 'Question',
      name: 'Gelir vergisi kümülatif olarak nasıl hesaplanır?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yıl içinde biriken matrah arttıkça üst dilime geçilir; her ayın vergisi, yılbaşından o aya kadarki toplam verginin bir önceki aya göre farkı olarak hesaplanır. Böylece dilim geçişi sadece aşan kısma uygulanır.',
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
            <span className="pub-badge"><span className="pub-badge-dot" /> 2026 güncel</span>
            <h1 className="pub-h1">2026 <span className="pub-grad">Gelir Vergisi Dilimleri</span></h1>
            <p className="pub-lead">
              Güncel gelir vergisi dilimleri ve yıllık matrahınıza göre vergiyi anında hesaplayın.
              Çocuk kulübü bordroları bu dilimlere göre vergilendirilir.
            </p>
          </div>
        </section>

        <section className="pub-section" style={{ paddingTop: 8 }}>
          <div className="pub-container">
            <VergiContent />
          </div>
        </section>

        <section className="pub-section" style={{ paddingTop: 0 }}>
          <div className="pub-container">
            <div className="pub-prose">
              <h2>Gelir vergisi kümülatif nasıl işler?</h2>
              <p>
                Gelir vergisi <strong>kümülatif matrah</strong> üzerinden kademeli hesaplanır. Yıl
                içinde biriken matrah bir dilim sınırını aştığında, yalnızca <strong>aşan kısım</strong>
                üst orandan vergilendirilir. Her ayın vergisi, yılbaşından o aya kadarki toplam verginin
                bir önceki aya göre farkıdır.
              </p>
              <h2>Çocuk kulübü bordrosunda vergi</h2>
              <p>
                Personelin brüt ücretinden SGK payları düşülerek gelir vergisi matrahı bulunur ve bu
                dilimlere göre vergi hesaplanır. Tam net/brüt hesap için
                <Link href="/cocuk-kulubu-bordro-hesaplama"> bordro hesaplama</Link> aracını kullanın.
              </p>
              <p className="pub-prose-meta">
                Not: Oranlar bilgilendirme amaçlıdır; resmî değerler bütçe dönemine göre değişebilir.
                Klüp360 uygulamasında dilimler güncel tutulur.
              </p>
            </div>
          </div>
        </section>
      </PublicShell>
    </>
  )
}
