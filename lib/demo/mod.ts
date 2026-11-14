// Demo modu: tanıtım sayfasındaki "Demoyu deneyin" düğmesiyle açılan, tamamen tarayıcıda çalışan örnek okul.
// Demoda panelin veri katmanı canlı Supabase'e hiç bağlanmaz; ayrıntı: docs/demo-hesabi.md

/** Sekmenin demo modunda olduğunu söyleyen çerez. Kimlik bilgisi taşımaz. */
export const DEMO_CEREZ = 'klup360_demo'

/** Demo istemcisinin adresi: `.invalid` hiçbir zaman çözülmeyen, ayrılmış bir alan adıdır (RFC 2606).
 *  Taklitte bir açık kalsa bile istek canlı Supabase'e değil, hiçbir yere gider. */
export const DEMO_SUPABASE_URL = 'https://demo.invalid'

export const DEMO_OKUL_ID = 990001
export const DEMO_IL_ID = 990001
export const DEMO_ILCE_ID = 990001
export const DEMO_KULLANICI_ID = '00000000-0000-4000-8000-00000000d3e0'
export const DEMO_OKUL_ADI = 'Papatya Örnek Ortaokulu'
export const DEMO_DOSYA_ONEKI = 'DEMO_'
export const DEMO_PDF_ISARETI = 'ÖRNEK — KURGUSAL VERİ'

/** Çerez dizgesinde demo işareti var mı? (test edilebilir saf fonksiyon) */
export function cerezdeDemoVar(cerez: string | null | undefined): boolean {
  if (!cerez) return false
  return cerez.split(';').some(p => p.trim() === `${DEMO_CEREZ}=1`)
}

/** Tarayıcıda ve demo çereziyle mi çalışıyoruz? Sunucu tarafı işlemede (SSR) her zaman false. */
export function tarayicidaDemoMu(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  return cerezdeDemoVar(document.cookie)
}

/** Demoda indirilen dosyaların adı DEMO_ ile başlar. */
export function demoDosyaAdi(ad: string): string {
  if (!tarayicidaDemoMu() || ad.startsWith(DEMO_DOSYA_ONEKI)) return ad
  return DEMO_DOSYA_ONEKI + ad
}

/** Demodan çıkış adresi; `sonra` yalnızca site içi bir yol olabilir. */
export function demoCikisAdresi(sonra: '/signup' | '/tanitim' = '/tanitim') {
  return `/demo/cikis?sonra=${encodeURIComponent(sonra === '/signup' ? '/signup?kaynak=demo' : sonra)}`
}
