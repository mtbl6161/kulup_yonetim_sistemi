import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Klüp360 | Okul Yönetimi ve Çocuk Kulübü Yazılımı',
  description: 'Türkiye\'nin en modern okul yönetim sistemi. Çocuk kulüpleri için özel tasarlanmış yoklama, aidat, puantaj ve bordro otomasyonu ile tanışın.',
  alternates: {
    canonical: 'https://klup360.com/tanitim',
  },
}

export default function TanitimLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
