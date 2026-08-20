import type { Metadata } from 'next'
import Link from 'next/link'
import PublicShell from '@/components/public/PublicShell'

export const metadata: Metadata = {
  title: 'Çocuk Kulübü Yönetmeliği / Yönergesi Rehberi 2026 | Klüp360',
  description:
    'MEB Okul Öncesi Eğitim ve İlköğretim Kurumları Çocuk Kulüpleri Yönergesi\'nin temel maddeleri: kuruluş, personel, ücretlendirme, bütçe dağıtımı ve denetim özet rehberi.',
  alternates: { canonical: 'https://www.klup360.com/rehber/cocuk-kulubu-yonetmeligi' },
  openGraph: {
    title: 'Çocuk Kulübü Yönetmeliği / Yönergesi Rehberi',
    description: 'Kuruluştan ücretlendirmeye çocuk kulübü yönergesinin temel maddeleri.',
    url: 'https://www.klup360.com/rehber/cocuk-kulubu-yonetmeligi',
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
          <h1 className="pub-h1">Çocuk Kulübü <span className="pub-grad">Yönergesi Rehberi</span></h1>
          <p className="pub-lead">
            MEB Okul Öncesi Eğitim ve İlköğretim Kurumları Çocuk Kulüpleri Yönergesi'nin işletmeyi
            ilgilendiren temel maddelerinin sade bir özeti.
          </p>
        </div>
      </section>

      <section className="pub-section" style={{ paddingTop: 8 }}>
        <div className="pub-container">
          <div className="pub-prose">
            <p className="pub-prose-meta">Bu sayfa bilgilendirme amaçlıdır. Bağlayıcı hükümler için MEB'in yayımladığı güncel yönerge metnini esas alın.</p>

            <h2>Çocuk kulübü nedir?</h2>
            <p>
              Çocuk kulüpleri; resmî okul öncesi eğitim kurumları ve ilköğretim okullarında, öğrencilerin
              ders saatleri dışında sosyal, kültürel, sanatsal, sportif ve akademik gelişimlerini desteklemek
              amacıyla açılan birimlerdir. Kuruluş ve işleyiş, MEB Çocuk Kulüpleri Yönergesi ile düzenlenir.
            </p>

            <h2>Kuruluş ve yönetim</h2>
            <p>
              Kulüp, okul müdürünün başkanlığında oluşturulan bir <strong>yönetim kurulu</strong> tarafından
              yürütülür. Kurulda başkan (okul müdürü), başkan yardımcısı, muhasebe/yazışma görevlisi gibi
              roller bulunur. Kararlar karar defterine işlenir; gelir ve giderler kayıt altına alınır.
            </p>

            <h2>Personel ve ücretlendirme</h2>
            <p>
              Kulüpte görev alan öğretmen ve görevlilerin ücretleri, gösterge ve memur maaş katsayısına
              dayalı <strong>saat ücreti</strong> üzerinden hesaplanır. Saat ücreti; gösterge (140) × katsayı
              ile bulunur ve azami/asgari/yemekli duruma göre 4, 6 veya 3'e bölünür.
              Güncel tutarı <Link href="/ek-ders-hesaplama">ek ders / saat ücreti hesaplama</Link> aracıyla
              bulabilirsiniz. Personel net maaşı için <Link href="/cocuk-kulubu-bordro-hesaplama">bordro
              hesaplama</Link> aracını kullanın.
            </p>

            <h2>Öğrenci aidatı</h2>
            <p>
              Veliden alınacak aylık ücret, ayın iş günü sayısı × günlük ders saati × saat ücreti ile
              belirlenir; kardeş indirimi uygulanabilir.
              <Link href="/cocuk-kulubu-aidat-hesaplama"> Aidat hesaplama</Link> aracıyla anında hesaplayın.
            </p>

            <h2>Bütçe ve tahakkuk dağıtımı</h2>
            <p>
              Kulüp geliri; öğretmen havuzu, temel gider ve görevlilere yönergedeki oranlarla paylaştırılır.
              Örnek dağıtımı <Link href="/cocuk-kulubu-butce-tablosu">bütçe tablosu</Link> aracında
              düzenleyerek görebilirsiniz.
            </p>

            <h2>Denetim</h2>
            <p>
              Kulübün gelir-gider ve işlemleri, yetkili denetim görevlileri tarafından denetlenir.
              Şeffaf kayıt tutulması ve belgelerin düzenli arşivlenmesi esastır.
            </p>

            <h2>İlgili sayfalar</h2>
            <p>
              <Link href="/rehber/cocuk-kulubu-acilis-sureci">Açılış süreci ve gerekli evraklar</Link> ·{' '}
              <Link href="/rehber/tutulacak-defterler">Tutulacak defterler</Link> ·{' '}
              <Link href="/rehber/sikca-sorulan-sorular">Sıkça sorulan sorular</Link>
            </p>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
