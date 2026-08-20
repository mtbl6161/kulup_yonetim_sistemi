import type { Metadata } from 'next'
import PublicShell from '@/components/public/PublicShell'

export const metadata: Metadata = {
  title: 'Gizlilik Politikası | Klüp360',
  description: 'Klüp360 gizlilik politikası: veri toplama, işleme, güvenlik, KVKK aydınlatması ve kullanıcı hakları.',
  alternates: { canonical: 'https://www.klup360.com/tanitim/gizlilik-politikasi' },
}

export default function GizlilikPolitikasiPage() {
  return (
    <PublicShell>
      <section className="pub-hero">
        <div className="pub-container">
          <span className="pub-badge"><span className="pub-badge-dot" /> Yasal</span>
          <h1 className="pub-h1">Gizlilik <span className="pub-grad">Politikası</span></h1>
          <p className="pub-lead">Verilerinizi nasıl topladığımız, işlediğimiz ve koruduğumuz hakkında bilmeniz gerekenler.</p>
        </div>
      </section>

      <section className="pub-section">
        <div className="pub-container">
          <div className="pub-prose">
            <h2>1. Veri Toplama</h2>
            <p>
              Klüp360, kullanıcı deneyimini iyileştirmek, hesap oluşturmak ve iletişim kurmak amacıyla kurum
              bilgileri, yetkili iletişim bilgileri, personel ve öğrenci verileri gibi kişisel ve kurumsal
              verileri yasal sınırlar çerçevesinde toplamaktadır.
            </p>

            <h2>2. Veri İşleme ve Kullanım</h2>
            <p>
              Toplanan veriler sadece sistem içerisindeki bordro, puantaj, ödeme takibi ve raporlama
              fonksiyonlarının çalışabilmesi için işlenir. Kullanıcıların girdiği hiçbir veri 3. şahıslarla
              reklam veya pazarlama amacıyla paylaşılmaz.
            </p>

            <h2>3. Veri Güvenliği</h2>
            <p>
              Verileriniz, en güncel şifreleme teknolojileri ile korunmaktadır ve bulut altyapımız üzerinde
              güvenle saklanmaktadır. Ancak internet üzerinden yapılan veri aktarımlarının %100 güvenli olduğu
              garanti edilemez.
            </p>

            <h2>4. KVKK Aydınlatması</h2>
            <p>
              6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca, veri sorumlusu sıfatıyla tarafımızla
              paylaştığınız kişisel verileriniz, işlenme amaçları ile bağlantılı, sınırlı ve ölçülü olarak
              işlenmekte ve saklanmaktadır.
            </p>

            <h2>5. Haklarınız</h2>
            <p>
              Verilerinizin silinmesini, düzeltilmesini veya dışa aktarılmasını talep etme hakkınız bulunmaktadır.
              Bu konudaki taleplerinizi <a href="/tanitim/iletisim">iletişim sayfamızdan</a> bize iletebilirsiniz.
            </p>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
