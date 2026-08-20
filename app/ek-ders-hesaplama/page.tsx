import type { Metadata } from 'next'
import Link from 'next/link'
import PublicShell from '@/components/public/PublicShell'
import SaatUcretiContent from './SaatUcretiContent'

export const metadata: Metadata = {
  title: 'Çocuk Kulübü Ek Ders / Saat Ücreti Hesaplama 2026 | Klüp360',
  description:
    'MEB çocuk kulüpleri için öğretmen saat ücretini (ek ders) gösterge ve memur maaş katsayısına göre ücretsiz hesaplayın. Azami, asgari ve yemekli bölen seçenekleriyle.',
  keywords: [
    'çocuk kulübü ek ders hesaplama',
    'çocuk kulübü saat ücreti hesaplama',
    'öğretmen saat ücreti hesaplama',
    'ek ders ücreti hesaplama 2026',
  ],
  alternates: { canonical: 'https://www.klup360.com/ek-ders-hesaplama' },
  openGraph: {
    title: 'Çocuk Kulübü Ek Ders / Saat Ücreti Hesaplama',
    description: 'Gösterge ve memur maaş katsayısına göre saat ücretini anında hesaplayın.',
    url: 'https://www.klup360.com/ek-ders-hesaplama',
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
      name: 'Çocuk kulübü saat ücreti nasıl hesaplanır?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Saat ücreti, 140 gösterge rakamının memur aylık maaş katsayısı ile çarpılıp bir bölene ayrılmasıyla bulunur. Azami ücrette bölen 4, asgari ücrette 6, yemek ikramı verilen kulüplerde 3\'tür.',
      },
    },
    {
      '@type': 'Question',
      name: 'Azami ve asgari saat ücreti farkı nedir?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Azami saat ücretinde gösterge × katsayı değeri 4\'e, asgari saat ücretinde 6\'ya bölünür. Yemek ikramı sağlanan kulüplerde bölen 3 olur.',
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
            <h1 className="pub-h1">Ek Ders / <span className="pub-grad">Saat Ücreti Hesaplama</span></h1>
            <p className="pub-lead">
              Çocuk kulübü öğretmen saat ücretini gösterge ve memur maaş katsayısına göre saniyeler
              içinde hesaplayın. Azami, asgari ve yemekli bölen seçenekleriyle.
            </p>
          </div>
        </section>

        <section className="pub-section" style={{ paddingTop: 8 }}>
          <div className="pub-container">
            <SaatUcretiContent />
          </div>
        </section>

        <section className="pub-section" style={{ paddingTop: 0 }}>
          <div className="pub-container">
            <div className="pub-prose">
              <h2>Saat ücreti nasıl hesaplanır?</h2>
              <p>
                MEB Çocuk Kulüpleri Yönergesi'ne göre saat ücreti, <strong>140 gösterge rakamının
                memur aylık maaş katsayısı ile çarpılıp bir bölene ayrılmasıyla</strong> bulunur.
                Azami ücrette bölen <strong>4</strong>, asgari ücrette <strong>6</strong>, yemek ikramı
                verilen kulüplerde <strong>3</strong>'tür. Katsayı her bütçe döneminde güncellendiği için
                saat ücreti de dönemsel olarak değişir.
              </p>
              <h2>Diğer hesaplama araçları</h2>
              <p>
                Öğrenciden alınacak ücret için <Link href="/cocuk-kulubu-aidat-hesaplama">aidat hesaplama</Link>,
                personel net maaşı için <Link href="/cocuk-kulubu-bordro-hesaplama">bordro hesaplama</Link>,
                gelirin paylaştırılması için <Link href="/cocuk-kulubu-butce-tablosu">örnek bütçe tablosu</Link>
                araçlarını kullanabilirsiniz. Tümü <Link href="/rehber">Rehber ve Araçlar</Link> sayfasında.
              </p>
              <h2>Puantajı otomatik ücrete çevirin</h2>
              <p>
                Klüp360, öğretmenlerin puantajını girip saat ücretiyle çarparak bordroyu otomatik üretir.
                <Link href="/signup"> Ücretsiz deneyin</Link>.
              </p>
            </div>
          </div>
        </section>
      </PublicShell>
    </>
  )
}
