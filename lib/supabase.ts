import { createBrowserClient } from '@supabase/ssr'

// ── Sessiz hata ağı ──────────────────────────────────────────────
// Sayfaların bir kısmı Supabase'in döndürdüğü `error` alanını okumuyor; kayıt başarısız
// olduğunda kullanıcı hiçbir şey görmüyordu. Tüm veritabanı isteklerini buradan geçirip
// başarısız yazma işlemlerini ve bağlantı/yetki sorunlarını ekranda bildiriyoruz
// (components/SistemBildirimi.tsx dinler). Sayfanın kendi hata mesajı ayrıca çalışmaya devam eder.
export const SISTEM_HATA_OLAYI = 'klup360:sistem-hatasi'

function bildir(mesaj: string) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(SISTEM_HATA_OLAYI, { detail: mesaj }))
}

function anlasilirMesaj(durum: number, govde: { code?: string; message?: string } | null, yazma: boolean): string {
  const kod = govde?.code || ''
  if (durum === 401 || durum === 403 || kod === '42501') return 'Bu işlem için yetkiniz yok ya da oturumunuz sona erdi. Sayfayı yenileyip tekrar giriş yapın.'
  if (kod === '23505') return 'Bu kayıt zaten var; aynı bilgilerle ikinci kez kaydedilemez.'
  if (kod === '23503') return 'Bu kayda bağlı başka kayıtlar olduğu için işlem yapılamadı.'
  if (kod === '23502' || kod === '23514') return 'Zorunlu bir alan boş ya da geçersiz; bilgileri kontrol edin.'
  if (kod === '42703' || kod === 'PGRST204' || kod === 'PGRST205' || kod === '42P01') return 'Veritabanı güncel değil (eksik tablo veya sütun). Lütfen yöneticinize bildirin.'
  if (durum >= 500) return 'Sunucu şu an yanıt vermiyor. Birkaç saniye sonra tekrar deneyin.'
  return yazma ? `İşlem kaydedilemedi${govde?.message ? `: ${govde.message}` : '.'}` : 'Veriler yüklenemedi.'
}

const izliFetch: typeof fetch = async (girdi, init) => {
  const url = typeof girdi === 'string' ? girdi : girdi instanceof URL ? girdi.href : girdi.url
  const yontem = (init?.method || (girdi instanceof Request ? girdi.method : 'GET')).toUpperCase()
  const veriIstegi = url.includes('/rest/v1/')
  let yanit: Response
  try {
    yanit = await fetch(girdi, init)
  } catch (e) {
    if (veriIstegi) bildir('İnternet bağlantısı yok ya da sunucuya ulaşılamıyor. Son işleminiz kaydedilmemiş olabilir.')
    throw e
  }
  if (veriIstegi && !yanit.ok) {
    // RPC'ler de POST'tur; yalnızca tablo yazmaları "yazma" sayılır
    const yazma = yontem !== 'GET' && yontem !== 'HEAD' && !url.includes('/rest/v1/rpc/')
    // .single() boş sonuç (406) ve okuma 404'leri sayfanın olağan akışıdır
    const olagan = !yazma && (yanit.status === 406 || yanit.status === 404)
    if (!olagan && (yazma || yanit.status === 401 || yanit.status === 403 || yanit.status >= 500)) {
      const govde = await yanit.clone().json().catch(() => null)
      bildir(anlasilirMesaj(yanit.status, govde, yazma))
    }
  }
  return yanit
}

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { global: { fetch: izliFetch } }
)
