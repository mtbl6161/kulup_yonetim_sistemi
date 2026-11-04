import type { Metadata } from 'next'
import { IBM_Plex_Sans, Quicksand } from 'next/font/google'

// Tanıtım sayfasının yazı karakterleri (uygulamanın geri kalanı Inter kullanır):
// başlıklar Quicksand — yuvarlak uçlu çizgileriyle logo yazısının dilini taşır;
// gövde IBM Plex Sans — resmî belge ciddiyetinde, rakamları hizalı.
const quicksand = Quicksand({ subsets: ['latin', 'latin-ext'], weight: ['600', '700'], variable: '--font-tz-baslik', display: 'swap' })
const plex = IBM_Plex_Sans({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600'], variable: '--font-tz-govde', display: 'swap' })

export const metadata: Metadata = {
  title: 'Klüp360 | Okul Yönetimi ve Çocuk Kulübü Yazılımı',
  description: 'Çocuk kulübünün kayıt, yoklama, puantaj, bordro, aidat, muhtasar beyannamesi ve aylık denetim dosyası tek sistemde. MEB Çocuk Kulüpleri Yönergesi\'ne uygun.',
  alternates: {
    canonical: 'https://www.klup360.com/tanitim',
  },
}

export default function TanitimLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className={`${quicksand.variable} ${plex.variable}`}>{children}</div>
}
