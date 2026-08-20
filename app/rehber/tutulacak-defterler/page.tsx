import type { Metadata } from 'next'
import Link from 'next/link'
import PublicShell from '@/components/public/PublicShell'

export const metadata: Metadata = {
  title: 'Çocuk Kulübünde Tutulacak Defterler ve Belgeler 2026 | Klüp360',
  description:
    'Çocuk kulübünde tutulması gereken defter ve belgeler: karar defteri, gelir-gider kaydı, öğrenci kayıt, puantaj, bordro ve tahakkuk cetveli rehberi.',
  alternates: { canonical: 'https://www.klup360.com/rehber/tutulacak-defterler' },
  openGraph: {
    title: 'Çocuk Kulübünde Tutulacak Defterler ve Belgeler',
    description: 'Karar defteri, gelir-gider, puantaj, bordro ve tahakkuk kayıtları.',
    url: 'https://www.klup360.com/rehber/tutulacak-defterler',
    siteName: 'Klüp360', locale: 'tr_TR', type: 'article',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'Klüp360' }],
  },
}

export default function Page() {
  return (
    <PublicShell>
      <section className="pub-hero">
        <div className="pub-container">
          <span className="pub-badge"><span className="pub-badge-dot" /> Rehber</span>
          <h1 className="pub-h1">Tutulacak <span className="pub-grad">Defterler ve Belgeler</span></h1>
          <p className="pub-lead">
            Çocuk kulübünün düzenli ve denetime hazır işlemesi için tutulması gereken temel defter ve
            belgeler.
          </p>
        </div>
      </section>

      <section className="pub-section" style={{ paddingTop: 8 }}>
        <div className="pub-container">
          <div className="pub-prose">
            <p className="pub-prose-meta">Bilgilendirme amaçlıdır. Zorunlu belgeler için güncel yönerge ve mevzuat esas alınmalıdır.</p>

            <h2>Karar defteri</h2>
            <p>
              Yönetim kurulunun aldığı tüm kararlar tarih ve sıra numarasıyla karar defterine işlenir.
              Açılış, görevlendirme, ücret ve bütçe kararları burada kayıt altına alınır.
            </p>

            <h2>Gelir-gider kayıtları</h2>
            <p>
              Aidat tahsilatları (gelir) ve personel ödemeleri, malzeme, temizlik gibi giderler düzenli
              olarak kaydedilir. Ay sonunda gelir-gider dengesi ve tahakkuk dağıtımı çıkarılır.
            </p>

            <h2>Öğrenci kayıt ve sözleşme dosyası</h2>
            <p>
              Öğrenci kayıt formları, veli sözleşmeleri ve iletişim bilgileri dosyalanır. Aidat tutarları
              ve tahsilat durumu öğrenci bazında takip edilir.
            </p>

            <h2>Puantaj ve devam çizelgeleri</h2>
            <p>
              Öğretmen ve personelin çalışma saatleri (puantaj) ile öğrenci devam kayıtları tutulur.
              Puantaj, ücret ve bordronun temelini oluşturur.
            </p>

            <h2>Bordro ve tahakkuk cetveli</h2>
            <p>
              Her dönem için personel bordrosu (brüt, kesintiler, net) ve gelir dağıtımını gösteren
              tahakkuk cetveli hazırlanır. Bunları
              <Link href="/cocuk-kulubu-bordro-hesaplama"> bordro hesaplama</Link> ve
              <Link href="/cocuk-kulubu-butce-tablosu"> bütçe tablosu</Link> araçlarıyla ön hesaplayabilir,
              tamamını <Link href="/signup">Klüp360 ile otomatik</Link> üretebilirsiniz.
            </p>

            <h2>Neden dijital tutmalı?</h2>
            <p>
              Kâğıt defterler kaybolma, hesap hatası ve denetimde zaman kaybı riski taşır. Klüp360 tüm
              kayıtları tek panelde tutar, bordro ve tahakkuku otomatik üretir, denetime hazır raporlar
              sunar.
            </p>

            <h2>İlgili sayfalar</h2>
            <p>
              <Link href="/rehber/cocuk-kulubu-yonetmeligi">Yönerge rehberi</Link> ·{' '}
              <Link href="/rehber/cocuk-kulubu-acilis-sureci">Açılış süreci</Link> ·{' '}
              <Link href="/rehber/sikca-sorulan-sorular">Sıkça sorulan sorular</Link>
            </p>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
