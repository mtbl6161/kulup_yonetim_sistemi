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
  description: 'MEB çocuk kulüpleri için aidat, puantaj, bordro, muhtasar XML ve denetim dosyası tek programda. 15 gün ücretsiz deneyin.',
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
    title: 'Klüp360 | MEB Çocuk Kulüpleri Yönetim Sistemi',
    description: 'MEB çocuk kulüpleri için aidat, puantaj, bordro, muhtasar XML ve denetim dosyası tek programda.',
    siteName: 'Klüp360',
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Klüp360 | MEB Çocuk Kulüpleri Yönetim Sistemi',
    description: 'MEB çocuk kulüpleri için aidat, puantaj, bordro, muhtasar XML ve denetim dosyası tek programda.',
  },
  verification: {
    google: 'ab4aWvn31CkvUn_uzV1H5_rNf9CaFdBflT3l7-ecEN4',
  },
}

export const viewport = {
  themeColor: '#0e1116',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning className={`${inter.variable} ${interTight.variable} ${jetbrains.variable}`}>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
