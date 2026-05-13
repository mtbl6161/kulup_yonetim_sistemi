/**
 * Lemon Squeezy Ödeme Yardımcıları
 */

const API_BASE = 'https://api.lemonsqueezy.com/v1'

export async function createCheckoutLink(ogrenciId: number, okulId: number, variantId: string, interval?: string) {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY
  const storeId = process.env.LEMONSQUEEZY_STORE_ID

  if (!apiKey || !storeId) {
    throw new Error('Lemon Squeezy API anahtarı veya Store ID eksik (.env.local)')
  }

  const response = await fetch(`${API_BASE}/checkouts`, {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          product_options: {
            redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.klup360.com'}/ayarlar`
          },
          checkout_data: {
            custom: {
              okul_id: String(okulId),
              ogrenci_id: String(ogrenciId),
              interval: interval || 'year'
            }
          }
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: String(storeId)
            }
          },
          variant: {
            data: {
              type: 'variants',
              id: String(variantId)
            }
          }
        }
      }
    })
  })

  const result = await response.json()
  
  if (!response.ok) {
    console.error('❌ Lemon Squeezy API Hatası:', JSON.stringify(result, null, 2))
    throw new Error(result.errors?.[0]?.detail || 'Lemon Squeezy API hatası')
  }

  return result.data?.attributes?.url
}
