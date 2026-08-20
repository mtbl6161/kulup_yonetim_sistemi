import type { Metadata } from 'next'
import Link from 'next/link'
import PublicShell from '@/components/public/PublicShell'
import ButceContent from './ButceContent'

export const metadata: Metadata = {
  title: 'Çocuk Kulübü Örnek Bütçe Tablosu 2026 (Tahakkuk Dağıtımı) | Klüp360',
  description:
    'MEB çocuk kulübü gelirinin öğretmen havuzu, temel gider ve görevlilere yönergeye göre dağıtımını ücretsiz hesaplayın. Oranları düzenlenebilir örnek bütçe / tahakkuk tablosu.',
  keywords: [
    'çocuk kulübü örnek bütçe tablosu',
    'çocuk kulübü bütçe hesaplama',
    'tahakkuk ve dağıtım cetveli',
    'çocuk kulübü gelir dağıtımı',
  ],
  alternates: { canonical: 'https://www.klup360.com/cocuk-kulubu-butce-tablosu' },
  openGraph: {
    title: 'Çocuk Kulübü Örnek Bütçe Tablosu — Tahakkuk Dağıtımı',
    description: 'Toplam geliri yönerge oranlarına göre otomatik paylaştırın.',
    url: 'https://www.klup360.com/cocuk-kulubu-butce-tablosu',
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
      name: 'Çocuk kulübü bütçesi nasıl dağıtılır?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Toplam kulüp geliri; öğretmen havuzu, temel gider ve başkan, başkan yardımcısı, muhasebe, temizlik ve denetim görevlilerine yönergedeki oranlar üzerinden paylaştırılır. Oranların toplamı %100 olmalıdır.',
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
            <span className="pub-badge"><span className="pub-badge-dot" /> Yönergeye uygun dağıtım</span>
            <h1 className="pub-h1">Çocuk Kulübü <span className="pub-grad">Örnek Bütçe Tablosu</span></h1>
            <p className="pub-lead">
              Toplam kulüp gelirinin öğretmen havuzu, temel gider ve görevlilere dağıtımını (tahakkuk
              cetveli) anında hesaplayın. Oranları kendi kulübünüze göre düzenleyin.
            </p>
          </div>
        </section>

        <section className="pub-section" style={{ paddingTop: 8 }}>
          <div className="pub-container">
            <ButceContent />
          </div>
        </section>

        <section className="pub-section" style={{ paddingTop: 0 }}>
          <div className="pub-container">
            <div className="pub-prose">
              <h2>Bütçe / tahakkuk dağıtımı nasıl yapılır?</h2>
              <p>
                Çocuk kulübü geliri, MEB yönergesindeki oranlara göre kalemlere paylaştırılır: en büyük
                pay <strong>öğretmen havuzuna</strong>, ardından <strong>temel gider</strong> ve
                başkan, başkan yardımcısı, muhasebe, temizlik ile denetim görevlilerine ayrılır.
                Oranların toplamı <strong>%100</strong> olmalıdır. Yukarıdaki tabloda oranları kendi
                kulübünüzün durumuna göre değiştirebilirsiniz.
              </p>
              <h2>İlgili araçlar</h2>
              <p>
                Personel ödemeleri için <Link href="/cocuk-kulubu-bordro-hesaplama">bordro hesaplama</Link>,
                veliden alınacak ücret için <Link href="/cocuk-kulubu-aidat-hesaplama">aidat hesaplama</Link>
                araçlarını kullanabilirsiniz.
              </p>
              <h2>Tahakkuk cetvelini otomatik üretin</h2>
              <p>
                Klüp360, aylık geliri ve tahakkuk dağıtımını otomatik hesaplayıp cetveli hazır belge
                olarak üretir. <Link href="/signup">Ücretsiz deneyin</Link>.
              </p>
            </div>
          </div>
        </section>
      </PublicShell>
    </>
  )
}
