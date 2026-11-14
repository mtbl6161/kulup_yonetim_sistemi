import { MetadataRoute } from 'next'

// Sabit tarih: her derlemede bütün sayfalar "değişti" görünmesin. İçerik değişince güncelleyin.
const GUNCELLEME = new Date('2026-11-12')

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.klup360.com'
  
  return [
    {
      // Asıl açılış (landing) sayfası — kök `/` buraya yönlendiği için
      // sitemap'te 200 dönen kanonik URL'i listeliyoruz.
      url: `${baseUrl}/tanitim`,
      lastModified: GUNCELLEME,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/ek-ders-hesaplama`,
      lastModified: GUNCELLEME,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/cocuk-kulubu-bordro-hesaplama`,
      lastModified: GUNCELLEME,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/cocuk-kulubu-aidat-hesaplama`,
      lastModified: GUNCELLEME,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/cocuk-kulubu-butce-tablosu`,
      lastModified: GUNCELLEME,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/gelir-vergisi-dilimleri-2026`,
      lastModified: GUNCELLEME,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/rehber`,
      lastModified: GUNCELLEME,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/rehber/cocuk-kulubu-yonetmeligi`,
      lastModified: GUNCELLEME,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/rehber/cocuk-kulubu-acilis-sureci`,
      lastModified: GUNCELLEME,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/rehber/tutulacak-defterler`,
      lastModified: GUNCELLEME,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/rehber/sikca-sorulan-sorular`,
      lastModified: GUNCELLEME,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/rehber/belgeler`,
      lastModified: GUNCELLEME,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/fiyatlandirma`,
      lastModified: GUNCELLEME,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tanitim/iletisim`,
      lastModified: GUNCELLEME,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/tanitim/gizlilik-politikasi`,
      lastModified: GUNCELLEME,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/tanitim/kvkk-aydinlatma-metni`,
      lastModified: GUNCELLEME,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/tanitim/kullanim-kosullari`,
      lastModified: GUNCELLEME,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/tanitim/iade-politikasi`,
      lastModified: GUNCELLEME,
      changeFrequency: 'yearly',
      priority: 0.3,
    }
  ]
}
