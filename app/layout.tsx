import type { Metadata } from 'next'
import './globals.css'
import ClientLayout from './ClientLayout'

export const metadata: Metadata = {
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
    url: 'https://klup360.com',
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
  themeColor: '#2d5a3d',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
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
