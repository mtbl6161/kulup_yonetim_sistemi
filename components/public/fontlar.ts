import { IBM_Plex_Sans, Quicksand } from 'next/font/google'

// Herkese açık sayfaların (tanıtım, fiyatlandırma, rehber, araçlar, yasal metinler) yazı karakterleri.
// Uygulamanın kendisi Inter kullanır; bunlar yalnızca bu sayfalarda yüklenir.
// Başlık: Quicksand — yuvarlak uçlu çizgileriyle logo yazısının dilini taşır.
// Gövde: IBM Plex Sans — resmî belge ciddiyetinde, rakamları hizalı.
const quicksand = Quicksand({ subsets: ['latin', 'latin-ext'], weight: ['600', '700'], variable: '--font-tz-baslik', display: 'swap' })
const plex = IBM_Plex_Sans({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600'], variable: '--font-tz-govde', display: 'swap' })

/** Kapsayıcıya verilecek sınıf: --font-tz-baslik ve --font-tz-govde değişkenlerini tanımlar */
export const PUBLIC_FONT_SINIFI = `${quicksand.variable} ${plex.variable}`
