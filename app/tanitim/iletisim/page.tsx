import type { Metadata } from 'next'
import PublicShell from '@/components/public/PublicShell'
import IletisimForm from './IletisimForm'

export const metadata: Metadata = {
  title: 'İletişim | Klüp360',
  description: 'Klüp360 ile iletişime geçin. Sorularınız, destek talepleriniz veya işbirliği fırsatları için bize yazın.',
  alternates: { canonical: 'https://www.klup360.com/tanitim/iletisim' },
}

export default function IletisimPage() {
  return (
    <PublicShell>
      <section className="pub-hero">
        <div className="pub-container">
          <span className="pub-badge"><span className="pub-badge-dot" /> Size yardımcı olalım</span>
          <h1 className="pub-h1">Bizimle <span className="pub-grad">İletişime Geçin</span></h1>
          <p className="pub-lead">
            Sorularınız, destek talepleriniz veya işbirliği fırsatları için bir mesaj bırakın; en kısa sürede dönüş yapalım.
          </p>
        </div>
      </section>

      <section className="pub-section" style={{ paddingTop: 8 }}>
        <div className="pub-container">
          <IletisimForm />
        </div>
      </section>
    </PublicShell>
  )
}
