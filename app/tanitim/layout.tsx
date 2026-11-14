import type { Metadata } from 'next'
import { PUBLIC_FONT_SINIFI } from '@/components/public/fontlar'

// Alt sayfalar (iletişim, KVKK vb.) kendi başlık ve canonical'larını verir; burada yalnızca
// tanıtım sayfasının değerleri var. openGraph bütün olarak yazılır çünkü kök layout'takini ezer.
const BASLIK = 'Çocuk Kulübü Yönetim Programı: Aidat, Bordro, Muhtasar | Klüp360'
const ACIKLAMA = 'MEB çocuk kulüpleri için aidat, puantaj, bordro, muhtasar XML ve denetim dosyası tek programda. 15 gün ücretsiz deneyin.'

export const metadata: Metadata = {
  title: BASLIK,
  description: ACIKLAMA,
  alternates: {
    canonical: 'https://www.klup360.com/tanitim',
  },
  openGraph: {
    title: BASLIK,
    description: ACIKLAMA,
    siteName: 'Klüp360',
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: BASLIK, description: ACIKLAMA },
}

export default function TanitimLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className={PUBLIC_FONT_SINIFI}>{children}</div>
}
