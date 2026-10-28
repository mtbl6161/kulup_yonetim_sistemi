'use client'
import { useEffect } from 'react'

/**
 * Sayfa verisini yükler; `yukle` (useCallback) — ya da verilirse `bagimliliklar` — değiştikçe yeniden çalışır.
 * Yükleme effect'in hemen ardından başlar (effect içinde eşzamanlı setState yapılmaz) ve
 * effect temizlenirse iptal edilir — React'in geliştirmede effect'i iki kez çalıştırmasında
 * ya da bağımlılık hızlı değiştiğinde aynı sorgu boşuna iki kez atılmaz.
 */
export function useYukleme(yukle: () => unknown, bagimliliklar?: readonly unknown[]) {
  useEffect(() => {
    let iptal = false
    queueMicrotask(() => { if (!iptal) void yukle() })
    return () => { iptal = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bağımlılıklar çağıran tarafından verilir
  }, bagimliliklar ?? [yukle])
}
