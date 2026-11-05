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
          <h1 className="pub-h1">Bize ulaşın</h1>
          <p className="pub-lead">
            Kurulum, bordro hesabı ya da abonelikle ilgili sorularınız için yazın.
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
