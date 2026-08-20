import type { Metadata } from 'next'
import PublicShell from '@/components/public/PublicShell'

export const metadata: Metadata = {
  title: 'Kullanım Koşulları | Klüp360',
  description: 'Klüp360 platformunun kullanım koşulları: taraflar, hizmet kapsamı, kullanıcı yükümlülükleri ve değişiklikler.',
  alternates: { canonical: 'https://www.klup360.com/tanitim/kullanim-kosullari' },
}

export default function KullanimKosullariPage() {
  return (
    <PublicShell>
      <section className="pub-hero">
        <div className="pub-container">
          <span className="pub-badge"><span className="pub-badge-dot" /> Yasal</span>
          <h1 className="pub-h1">Kullanım <span className="pub-grad">Koşulları</span></h1>
          <p className="pub-lead">Klüp360 platformunu kullanırken geçerli olan temel kurallar ve karşılıklı yükümlülükler.</p>
        </div>
      </section>

      <section className="pub-section">
        <div className="pub-container">
          <div className="pub-prose">
            <h2>1. Taraflar ve Konu</h2>
            <p>
              İşbu Kullanım Koşulları, Klüp360 platformunu (Bundan böyle "Platform" olarak anılacaktır) kullanan
              tüm kurumlar, yöneticiler, eğitmenler ve veliler (Bundan böyle "Kullanıcı" olarak anılacaktır) için
              geçerlidir. Platformu kullanmaya başlamanız, bu koşulları kabul ettiğiniz anlamına gelir.
            </p>

            <h2>2. Hizmetin Kapsamı</h2>
            <p>
              Klüp360, çocuk kulüpleri, etüt merkezleri ve anaokulları için öğrenci takibi, personel yönetimi,
              bordro hesaplama ve finansal süreçlerin dijital ortamda yönetilmesini sağlayan bulut tabanlı bir
              yazılım hizmetidir. Platform üzerinde yer alan özellikler, MEB mevzuatlarına uygun olarak
              tasarlanmıştır.
            </p>

            <h2>3. Kullanıcı Yükümlülükleri</h2>
            <ul>
              <li>Kullanıcı, platforma kaydettiği bilgilerin doğruluğundan sorumludur.</li>
              <li>Hesap güvenliği ve şifrelerin korunması kullanıcının sorumluluğundadır.</li>
              <li>Platform üzerinden yasalara ve genel ahlaka aykırı içerik paylaşılamaz veya veri girişi yapılamaz.</li>
            </ul>

            <h2>4. Kesintiler ve Bakım</h2>
            <p>
              Klüp360, sistemin kesintisiz çalışması için gerekli tüm önlemleri alır. Ancak teknik arızalar,
              planlı bakımlar veya mücbir sebeplerden dolayı yaşanabilecek geçici kesintilerden Klüp360 sorumlu
              tutulamaz.
            </p>

            <h2>5. Değişiklikler</h2>
            <p>
              Klüp360, işbu kullanım koşullarında önceden haber vermeksizin değişiklik yapma hakkını saklı tutar.
              Değişiklikler, platformda yayınlandığı tarihte yürürlüğe girer.
            </p>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
