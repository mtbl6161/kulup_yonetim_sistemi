import type { Metadata } from 'next'
import Link from 'next/link'
import PublicShell from '@/components/public/PublicShell'
import BordroContent from './BordroContent'

export const metadata: Metadata = {
  title: 'Çocuk Kulübü Bordro Hesaplama 2026 (Net/Brüt) | Klüp360',
  description:
    'MEB çocuk kulüpleri için brütten net maaş, SGK, gelir ve damga vergisi kesintilerini ücretsiz ve anında hesaplayın. 2026 vergi dilimlerine göre interaktif bordro aracı.',
  keywords: [
    'çocuk kulübü bordro',
    'çocuk kulübü bordro hesaplama',
    'çocuk kulübü net maaş hesaplama',
    'çocuk kulübü sgk kesintisi',
    'bordro net brüt hesaplama 2026',
  ],
  alternates: { canonical: 'https://www.klup360.com/cocuk-kulubu-bordro-hesaplama' },
  openGraph: {
    title: 'Çocuk Kulübü Bordro Hesaplama (Net/Brüt) — Ücretsiz',
    description: 'SGK, gelir ve damga vergisi kesintileriyle net maaşı anında hesaplayın. 2026 güncel.',
    url: 'https://www.klup360.com/cocuk-kulubu-bordro-hesaplama',
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
      name: 'Çocuk kulübü bordrosu nasıl hesaplanır?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Brüt ücretten SGK işçi payı (%14) ve işsizlik payı (%1) düşülerek gelir vergisi matrahı bulunur. Matrah üzerinden kümülatif gelir vergisi ve brüt üzerinden damga vergisi (binde 7,59) hesaplanır; asgari ücret istisnası düşülerek net ücret elde edilir.',
      },
    },
    {
      '@type': 'Question',
      name: 'Bordroda hangi kesintiler yapılır?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'SGK işçi payı, işsizlik sigortası işçi payı, gelir vergisi ve damga vergisi. Asgari ücret gelir ve damga vergisi istisnası uygulandığında bu vergilerden indirim yapılır.',
      },
    },
    {
      '@type': 'Question',
      name: 'Bu bordro hesaplama aracı ücretsiz mi?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Evet, tamamen ücretsizdir ve kayıt gerektirmez. Tüm personelin bordrosunu, tahakkuk cetvelini ve puantajını otomatik üretmek için Klüp360 ücretsiz denenebilir.',
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
            <span className="pub-badge"><span className="pub-badge-dot" /> 2026 vergi dilimlerine göre güncel</span>
            <h1 className="pub-h1">Çocuk Kulübü <span className="pub-grad">Bordro Hesaplama</span></h1>
            <p className="pub-lead">
              Brüt ücretten SGK, gelir ve damga vergisi kesintilerini düşerek net maaşı saniyeler içinde,
              yönergeye uygun hesaplayın. Kayıt gerekmez.
            </p>
          </div>
        </section>

        <section className="pub-section" style={{ paddingTop: 8 }}>
          <div className="pub-container">
            <BordroContent />
          </div>
        </section>

        {/* SEO içerik */}
        <section className="pub-section" style={{ paddingTop: 0 }}>
          <div className="pub-container">
            <div className="pub-prose">
              <h2>Çocuk kulübü bordrosu nasıl hesaplanır?</h2>
              <p>
                MEB çocuk kulüplerinde personel bordrosu, brüt ücret üzerinden yasal kesintiler
                düşülerek hesaplanır. Sırasıyla <strong>SGK işçi payı (%14)</strong> ve
                <strong> işsizlik sigortası işçi payı (%1)</strong> düşülür; kalan tutar gelir
                vergisi matrahını oluşturur. Matrah, yıl içi kümülatif tutara göre ilgili vergi
                diliminden vergilendirilir. Ayrıca brüt üzerinden <strong>damga vergisi (binde 7,59)</strong>
                alınır. Asgari ücret gelir ve damga vergisi istisnası uygulandığında bu vergilerden
                indirim yapılır ve <strong>net ücret</strong> bulunur.
              </p>
              <h2>Öğretmen ve diğer görevlilerin ücretleri</h2>
              <p>
                Bordro, öğretmen havuzundan veya görev bazlı dağıtımdan gelen brüt hak edişe göre
                hesaplanır. Görevlere göre tavan ücret uygulaması da yönergede tanımlıdır. Saat ücreti
                ve aidat için <Link href="/ek-ders-hesaplama">ek ders ücreti hesaplama</Link> aracını
                kullanabilirsiniz.
              </p>
              <h2>Tüm personeli tek tıkla</h2>
              <p>
                Bu araç tek bir personelin net ücretini gösterir. Klüp360 ise tüm personelin bordrosunu,
                tahakkuk ve dağıtım cetvelini, puantajı ve e-posta gönderimini otomatik yapar.
                <Link href="/signup"> Ücretsiz deneyin</Link>.
              </p>
            </div>
          </div>
        </section>
      </PublicShell>
    </>
  )
}
