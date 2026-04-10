import type { Metadata } from 'next'
import './globals.css'
import ClientLayout from './ClientLayout'

export const metadata: Metadata = {
  title: 'Çocuk Kulübü Yönetim Sistemi',
  description: "MEB Çocuk Kulüpleri Yönergesi'ne uygun yönetim sistemi",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
