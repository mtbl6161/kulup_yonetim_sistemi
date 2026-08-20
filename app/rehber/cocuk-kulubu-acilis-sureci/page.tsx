import type { Metadata } from 'next'
import Link from 'next/link'
import PublicShell from '@/components/public/PublicShell'

export const metadata: Metadata = {
  title: 'Çocuk Kulübü Açılış Süreci ve Gerekli Evraklar 2026 | Klüp360',
  description:
    'Çocuk kulübü nasıl açılır? Açılış oluru, yönetim kurulu kararı, görev dilekçeleri ve öğrenci sözleşmesi dahil adım adım açılış süreci ve gerekli belgeler rehberi.',
  alternates: { canonical: 'https://www.klup360.com/rehber/cocuk-kulubu-acilis-sureci' },
  openGraph: {
    title: 'Çocuk Kulübü Açılış Süreci ve Gerekli Evraklar',
    description: 'Adım adım açılış süreci ve gerekli belgeler.',
    url: 'https://www.klup360.com/rehber/cocuk-kulubu-acilis-sureci',
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
          <h1 className="pub-h1">Çocuk Kulübü <span className="pub-grad">Açılış Süreci</span></h1>
          <p className="pub-lead">
            Çocuk kulübü açmak için izlenecek adımlar ve hazırlanması gereken temel evrakların
            pratik rehberi.
          </p>
        </div>
      </section>

      <section className="pub-section" style={{ paddingTop: 8 }}>
        <div className="pub-container">
          <div className="pub-prose">
            <p className="pub-prose-meta">Bilgilendirme amaçlıdır. Güncel ve bağlayıcı adımlar için il/ilçe millî eğitim müdürlüğü ve yönerge esas alınmalıdır.</p>

            <h2>1. İhtiyaç ve talebin belirlenmesi</h2>
            <p>
              Okul yönetimi, veli talebi ve fiziki imkânları değerlendirerek kulüp açma kararı alır.
              Açılacak kulübün türü, çalışma saatleri ve kapasitesi belirlenir.
            </p>

            <h2>2. Yönetim kurulu ve karar</h2>
            <p>
              Okul müdürünün başkanlığında <strong>yönetim kurulu</strong> oluşturulur ve kulübün açılışına
              ilişkin <strong>kurul kararı</strong> alınarak karar defterine işlenir.
            </p>

            <h2>3. Açılış oluru</h2>
            <p>
              Kulübün açılması için yetkili makamdan <strong>açılış oluru (onayı)</strong> alınır. Olur,
              kulübün resmî olarak faaliyete geçmesini sağlar.
            </p>

            <h2>4. Görevlendirme dilekçeleri</h2>
            <p>
              Kulüpte görev alacak öğretmen ve personelin <strong>görev alma dilekçeleri</strong> ve
              görevlendirme yazıları hazırlanır. Görevler ve ücret esasları netleştirilir.
            </p>

            <h2>5. Öğrenci kayıtları ve sözleşme</h2>
            <p>
              Öğrenci kayıtları alınır ve velilerle <strong>öğrenci sözleşmesi</strong> imzalanır.
              Aylık aidat tutarı belirlenir — <Link href="/cocuk-kulubu-aidat-hesaplama">aidat hesaplama</Link>
              aracıyla hesaplayabilirsiniz.
            </p>

            <h2>6. Mali kayıt düzeninin kurulması</h2>
            <p>
              Gelir-gider takibi, bordro, puantaj ve tahakkuk için kayıt düzeni kurulur. Tutulması gereken
              belgeler için <Link href="/rehber/tutulacak-defterler">tutulacak defterler</Link> sayfasına
              bakın. Bordro ve tahakkuku otomatik yönetmek için
              <Link href="/signup"> Klüp360'ı ücretsiz deneyebilirsiniz</Link>.
            </p>

            <h2>Gerekli temel evraklar</h2>
            <ul>
              <li>Yönetim kurulu kararı (karar defteri)</li>
              <li>Açılış oluru / onay yazısı</li>
              <li>Görev alma dilekçeleri ve görevlendirme yazıları</li>
              <li>Öğrenci kayıt formları ve veli sözleşmeleri</li>
              <li>Gelir-gider ve tahakkuk kayıtları</li>
            </ul>

            <h2>İlgili sayfalar</h2>
            <p>
              <Link href="/rehber/cocuk-kulubu-yonetmeligi">Yönerge rehberi</Link> ·{' '}
              <Link href="/rehber/tutulacak-defterler">Tutulacak defterler</Link> ·{' '}
              <Link href="/rehber/sikca-sorulan-sorular">Sıkça sorulan sorular</Link>
            </p>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
