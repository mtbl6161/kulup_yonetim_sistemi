import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/tanitim/', '/rehber', '/ek-ders-hesaplama', '/cocuk-kulubu-bordro-hesaplama', '/cocuk-kulubu-aidat-hesaplama', '/cocuk-kulubu-butce-tablosu', '/gelir-vergisi-dilimleri-2026', '/fiyatlandirma', '/signup', '/login'],
      disallow: [
        '/api/',
        '/yonetim/',
        '/personel/',
        '/bordro/',
        '/muhasebe/',
        '/ogrenciler/',
        '/siniflar/',
        '/sinif-defteri/',
        '/puantaj/',
        '/bilanco/',
        '/gelir-gider/',
        '/odeme/',
        '/abonelik-yenile/'
      ],
    },
    sitemap: 'https://www.klup360.com/sitemap.xml',
  }
}
