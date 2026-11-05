import type { Metadata } from 'next'
import { PUBLIC_FONT_SINIFI } from '@/components/public/fontlar'

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
  return <div className={PUBLIC_FONT_SINIFI}>{children}</div>
}
