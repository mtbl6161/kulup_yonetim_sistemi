// Demo modunda panelin kullandığı Supabase istemcisi ve ağ koruması.
// İstemcinin adresi https://demo.invalid'dir ve bütün istekleri tarayıcı belleğindeki demo sunucusuna gider.
import { createClient } from '@supabase/supabase-js'
import { DEMO_SUPABASE_URL } from './mod'
import { demoOturumu } from './kimlik'
import type { DemoSunucu } from './taklit/sunucu'

const DEPO_ANAHTARI = 'klup360-demo-auth'

let sunucuSozu: Promise<DemoSunucu> | null = null

/** Demo sunucusu (veri üreteci ve taklit motoru) ilk istekte yüklenir; demo kullanmayanların indirdiği koda yük eklemez. */
export function demoSunucusu(): Promise<DemoSunucu> {
  return (sunucuSozu ||= import('./taklit/sunucu').then(m => new m.DemoSunucu()))
}

export const demoFetch: typeof fetch = async (girdi, init) => (await demoSunucusu()).isle(girdi, init)

export function demoIstemcisiOlustur(icFetch: typeof fetch = demoFetch) {
  // Kurgusal oturum yalnızca bu bellek deposunda durur; localStorage'a ya da çereze yazılmaz
  const bellek = new Map<string, string>([[DEPO_ANAHTARI, JSON.stringify(demoOturumu())]])
  return createClient(DEMO_SUPABASE_URL, 'demo-anahtar', {
    global: { fetch: icFetch },
    auth: {
      storageKey: DEPO_ANAHTARI,
      storage: {
        getItem: (k: string) => bellek.get(k) ?? null,
        setItem: (k: string, v: string) => { bellek.set(k, v) },
        removeItem: (k: string) => { bellek.delete(k) },
      },
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

/** Demoda tarayıcıdan gerçek sunucuya veri gidebilecek istekler (Klüp360 API'si ve Supabase) ağa çıkmadan yanıtlanır. */
export function demoApiYaniti(yol: string, yontem: string): Response {
  const json = (govde: unknown, durum = 200) => new Response(JSON.stringify(govde), { status: durum, headers: { 'Content-Type': 'application/json' } })
  if (yontem === 'GET' && yol === '/api/duyurular') return json({ duyuru: null })
  if (yontem === 'GET' && yol === '/api/denetci/durum') return json({ status: 'aktif' })
  return json({ error: 'Demoda bu işlem yapılamaz. Ücretsiz deneme hesabıyla kullanabilirsiniz.' }, 403)
}

export function engellenecekMi(adres: URL, kendiKokeni: string): 'api' | 'dis' | null {
  if (adres.origin === kendiKokeni && adres.pathname.startsWith('/api/')) return 'api'
  if (/(^|\.)supabase\.(co|in|com)$/i.test(adres.hostname)) return 'dis'
  const gercek = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (gercek && adres.origin === new URL(gercek).origin) return 'dis'
  return null
}

declare global { interface Window { __klup360DemoAgKorumasi?: boolean } }

export function demoAgKorumasiKur() {
  if (typeof window === 'undefined' || window.__klup360DemoAgKorumasi) return
  window.__klup360DemoAgKorumasi = true
  const asil = window.fetch.bind(window)
  window.fetch = async (girdi: RequestInfo | URL, init?: RequestInit) => {
    const ham = typeof girdi === 'string' ? girdi : girdi instanceof URL ? girdi.href : girdi.url
    const adres = new URL(ham, window.location.href)
    const engel = engellenecekMi(adres, window.location.origin)
    if (engel === 'api') return demoApiYaniti(adres.pathname, (init?.method || (girdi instanceof Request ? girdi.method : 'GET')).toUpperCase())
    if (engel === 'dis') return new Response(JSON.stringify({ message: 'Demoda gerçek sunucuya bağlanılmaz.' }), { status: 403 })
    return asil(girdi, init)
  }
}

/** Demo imzalı belge adresini bu sekmede açılabilen blob: adresine çevirir; demo dışı adresi aynen döner. */
export async function belgeAdresiCoz(adres: string): Promise<string> {
  if (!adres.startsWith(DEMO_SUPABASE_URL)) return adres
  return (await demoSunucusu()).imzaliAdresCoz(adres) || adres
}
