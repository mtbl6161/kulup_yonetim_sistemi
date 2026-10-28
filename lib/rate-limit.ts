import 'server-only'

// ============================================================
// RATE LIMIT
// Tercihen Upstash Redis (paylaşımlı, çok örnekli/serverless için güvenilir);
// Upstash ortam değişkenleri yoksa bellek içi yedeğe düşer.
//
// Upstash'i aktifleştirmek için (ücretsiz plan yeterli) Vercel ortam
// değişkenlerine ekleyin:
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN
// Bunlar yoksa kod bellek içi limitleyiciyle çalışmaya devam eder
// (tek örnek için yeterli, ama örnekler/soğuk başlangıçlar arası paylaşılmaz).
// ============================================================

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Eski kayıtları periyodik temizle (bellek sızıntısını önle)
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key)
  }
}, 60_000)

function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: limit - entry.count }
}

async function upstashRateLimit(
  baseUrl: string,
  token: string,
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const rlKey = `rl:${key}`
  // Tek pipeline: sayacı artır + (yalnızca ilk kez) sabit pencere TTL'i ata
  const res = await fetch(`${baseUrl}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', rlKey],
      ['PEXPIRE', rlKey, windowMs, 'NX'],
    ]),
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`Upstash yanıt kodu ${res.status}`)

  const out = (await res.json()) as Array<{ result?: number; error?: string }>
  const count = Number(out?.[0]?.result ?? 0)
  if (!Number.isFinite(count) || count <= 0) {
    throw new Error('Upstash geçersiz yanıt')
  }

  return { allowed: count <= limit, remaining: Math.max(0, limit - count) }
}

let uyariVerildi = false

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const baseUrl = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (baseUrl && token) {
    try {
      return await upstashRateLimit(baseUrl, token, key, limit, windowMs)
    } catch (err) {
      // Upstash erişilemezse hizmeti kesme; bellek içi yedeğe düş
      console.error('[rate-limit] Upstash hatası, bellek içi yedeğe düşülüyor:', err)
    }
  } else if (process.env.VERCEL_ENV === 'production' && !uyariVerildi) {
    // Canlıda bellek içi sınır örnekler arasında paylaşılmaz; günlüklerde görünür olsun
    uyariVerildi = true
    console.warn('[rate-limit] UPSTASH_REDIS_REST_URL / TOKEN tanımlı değil — istek sınırı canlıda etkisiz.')
  }

  return memoryRateLimit(key, limit, windowMs)
}

export function getIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return (forwarded ? forwarded.split(',')[0].trim() : 'unknown')
}
