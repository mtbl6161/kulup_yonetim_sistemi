import type { Metadata } from 'next'
import { Inter, Inter_Tight, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import ClientLayout from './ClientLayout'

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter', display: 'swap' })
const interTight = Inter_Tight({ subsets: ['latin', 'latin-ext'], variable: '--font-inter-tight', display: 'swap' })
const jetbrains = JetBrains_Mono({ subsets: ['latin', 'latin-ext'], variable: '--font-jetbrains', display: 'swap', preload: false })

export const metadata: Metadata = {
  metadataBase: new URL('https://www.klup360.com'),
  title: 'Klüp360 | MEB Çocuk Kulüpleri Yönetim Sistemi',
  description: "MEB Çocuk Kulüpleri Yönergesi'ne %100 uyumlu, dijital yoklama, otomatik puantaj, bordro ve aidat takibi sunan profesyonel okul yönetim platformu.",
  keywords: [
    'meb çocuk kulübü yönergesi', 
    'çocuk kulübü ek ders hesaplama', 
    'okul aile birliği kulüp muhasebesi', 
    'dijital çocuk kulübü sınıf defteri', 
    'tahakkuk ve dağıtım cetveli otomasyonu', 
    'çocuk kulübü aidat takip yazılımı', 
    'devlet okulu çocuk kulübü yönetim sistemi', 
    'öğretmen kulüp ücreti hesaplama'
  ],
  authors: [{ name: 'Klüp360 Ekibi' }],
  robots: 'index, follow',
  openGraph: {
    title: 'Klüp360 | Dijital Okul Yönetim Platformu',
    description: 'MEB uyumlu en gelişmiş çocuk kulübü yönetim yazılımı. İş yükünüzü azaltın, verimliliği artırın.',
    url: 'https://www.klup360.com/tanitim',
    siteName: 'Klüp360',
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Klüp360 | Çocuk Kulübü Yönetimi',
    description: 'Puantaj, Bordro, Yoklama ve Aidat takibi tek platformda.',
  },
  verification: {
    google: 'ab4aWvn31CkvUn_uzV1H5_rNf9CaFdBflT3l7-ecEN4',
  },
}

export const viewport = {
  themeColor: '#0e1116',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning className={`${inter.variable} ${interTight.variable} ${jetbrains.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              'name': 'Klüp360',
              'operatingSystem': 'Web Based',
              'applicationCategory': 'EducationalApplication, BusinessApplication',
              'offers': {
                '@type': 'Offer',
                'price': '750',
                'priceCurrency': 'TRY'
              },
              'description': 'MEB Çocuk Kulüpleri Yönergesi\'ne uygun okul yönetim sistemi.'
            })
          }}
        />
      </head>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
