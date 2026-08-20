import type { Metadata } from 'next'
import Link from 'next/link'
import PublicShell from '@/components/public/PublicShell'

export const metadata: Metadata = {
  title: 'Çocuk Kulübü Sıkça Sorulan Sorular (SSS) 2026 | Klüp360',
  description:
    'Çocuk kulübü bordrosu, aidat, saat ücreti, bütçe dağıtımı ve açılış süreci hakkında en çok sorulan soruların yanıtları.',
  alternates: { canonical: 'https://www.klup360.com/rehber/sikca-sorulan-sorular' },
  openGraph: {
    title: 'Çocuk Kulübü Sıkça Sorulan Sorular',
    description: 'Bordro, aidat, saat ücreti ve açılış süreci hakkında yanıtlar.',
    url: 'https://www.klup360.com/rehber/sikca-sorulan-sorular',
    siteName: 'Klüp360', locale: 'tr_TR', type: 'article',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'Klüp360' }],
  },
}

const SORULAR = [
  {
    q: 'Çocuk kulübü saat ücreti nasıl hesaplanır?',
    a: 'Saat ücreti, 140 gösterge rakamının memur aylık maaş katsayısı ile çarpılıp bölene ayrılmasıyla bulunur. Azami ücrette bölen 4, asgari ücrette 6, yemek ikramında 3\'tür.',
  },
  {
    q: 'Veliden alınacak aylık aidat nasıl belirlenir?',
    a: 'Aylık aidat, ayın iş günü sayısı × günlük ders saati × saat ücreti ile hesaplanır. Resmî tatiller iş gününden düşülür; kardeş indirimi (%25) uygulanabilir.',
  },
  {
    q: 'Çocuk kulübü bordrosunda hangi kesintiler yapılır?',
    a: 'Brüt ücretten SGK işçi payı (%14), işsizlik işçi payı (%1), gelir vergisi ve damga vergisi kesilir. Asgari ücret istisnası uygulandığında bu vergilerden indirim yapılır.',
  },
  {
    q: 'Kulüp geliri nasıl paylaştırılır?',
    a: 'Toplam gelir; öğretmen havuzu, temel gider ve başkan, başkan yardımcısı, muhasebe, temizlik ve denetim görevlilerine yönergedeki oranlarla dağıtılır. Toplam %100 olmalıdır.',
  },
  {
    q: 'Çocuk kulübü açmak için hangi belgeler gerekir?',
    a: 'Yönetim kurulu kararı, açılış oluru, görev alma dilekçeleri, öğrenci kayıt formları ve veli sözleşmeleri ile gelir-gider kayıtları temel belgelerdir.',
  },
  {
    q: 'Klüp360 ücretsiz mi?',
    a: 'Hesaplama araçları tamamen ücretsiz ve kayıtsızdır. Tüm personelin bordrosunu, tahsilatı ve tahakkuku otomatik yönetmek için 7 gün ücretsiz deneme sunulur.',
  },
]

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: SORULAR.map(s => ({
    '@type': 'Question',
    name: s.q,
    acceptedAnswer: { '@type': 'Answer', text: s.a },
  })),
}

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <PublicShell>
        <section className="pub-hero">
          <div className="pub-container">
            <span className="pub-badge"><span className="pub-badge-dot" /> Rehber</span>
            <h1 className="pub-h1">Sıkça <span className="pub-grad">Sorulan Sorular</span></h1>
            <p className="pub-lead">
              Çocuk kulübü bordrosu, aidatı, saat ücreti ve açılış süreci hakkında en çok sorulanlar.
            </p>
          </div>
        </section>

        <section className="pub-section" style={{ paddingTop: 8 }}>
          <div className="pub-container">
            <div className="pub-prose">
              {SORULAR.map((s, i) => (
                <div key={i}>
                  <h2>{s.q}</h2>
                  <p>{s.a}</p>
                </div>
              ))}
              <h2>İlgili araçlar ve rehberler</h2>
              <p>
                <Link href="/cocuk-kulubu-bordro-hesaplama">Bordro hesaplama</Link> ·{' '}
                <Link href="/cocuk-kulubu-aidat-hesaplama">Aidat hesaplama</Link> ·{' '}
                <Link href="/cocuk-kulubu-butce-tablosu">Bütçe tablosu</Link> ·{' '}
                <Link href="/rehber">Tüm rehber ve araçlar</Link>
              </p>
            </div>
          </div>
        </section>
      </PublicShell>
    </>
  )
}
