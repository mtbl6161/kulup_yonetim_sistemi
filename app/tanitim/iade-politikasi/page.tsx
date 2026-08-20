import type { Metadata } from 'next'
import PublicShell from '@/components/public/PublicShell'

export const metadata: Metadata = {
  title: 'İade Politikası | Klüp360',
  description: 'Klüp360 iade ve iptal politikası: 14 gün cayma hakkı, iade süreci ve hesap askıya alınması koşulları.',
  alternates: { canonical: 'https://www.klup360.com/tanitim/iade-politikasi' },
}

export default function IadePolitikasiPage() {
  return (
    <PublicShell>
      <section className="pub-hero">
        <div className="pub-container">
          <span className="pub-badge"><span className="pub-badge-dot" /> Yasal</span>
          <h1 className="pub-h1">İade <span className="pub-grad">Politikası</span></h1>
          <p className="pub-lead">Abonelik iptali, cayma hakkı ve iade süreçlerine dair koşullar.</p>
        </div>
      </section>

      <section className="pub-section">
        <div className="pub-container">
          <div className="pub-prose">
            <h2>1. İptal ve İade Kapsamı</h2>
            <p>
              Klüp360, kullanıcılara ücretli abonelik planları sunmaktadır. Kullanıcılar, satın aldıkları
              abonelik planını herhangi bir gerekçe göstermeksizin ilk 14 (on dört) gün içerisinde iptal etme ve
              tam iade talep etme hakkına sahiptir.
            </p>

            <h2>2. 14 Gün Sonrası İptaller</h2>
            <p>
              14 günlük cayma süresinin bitiminden sonra yapılan iptal başvurularında para iadesi yapılmaz. Ancak
              kullanıcı, aboneliğini dilediği zaman iptal edebilir ve ödenmiş dönemin sonuna kadar platformu
              kullanmaya devam edebilir.
            </p>

            <h2>3. İade Süreci</h2>
            <p>
              İade talepleri iletişim formu üzerinden veya destek e-posta adresimiz aracılığıyla iletilmelidir.
              Onaylanan iadeler, ödemenin yapıldığı kredi kartına veya banka hesabına 3-7 iş günü içerisinde
              yansıtılacaktır. Bankaların işlem süreleri nedeniyle bu süre değişiklik gösterebilir.
            </p>

            <h2>4. Hesap Askıya Alınması</h2>
            <p>
              Kullanım koşullarının ihlali nedeniyle hesapların Klüp360 tarafından askıya alınması veya
              kapatılması durumunda, kullanılmayan sürelerin ücret iadesi yapılmaz.
            </p>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
