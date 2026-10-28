'use client'
import { useState } from 'react'

type Anahtar = string | number | boolean | null | undefined | readonly unknown[]

const ayni = (a: Anahtar, b: Anahtar) =>
  Array.isArray(a) && Array.isArray(b)
    ? a.length === b.length && a.every((x, i) => Object.is(x, b[i]))
    : Object.is(a, b)

/**
 * `anahtar` (tek değer ya da değer listesi) değiştiği çizimde `sifirla`yı çalıştırır
 * (ör. ay değişince seçili haftayı temizle). React'in önerdiği "önceki değeri state'te tut,
 * çizim sırasında karşılaştır" kalıbı: effect + setState zincirinin yol açtığı fazladan çizimi önler.
 * `sifirla` yalnızca bu bileşenin state'ini değiştirmeli.
 */
export function useDegisince(anahtar: Anahtar, sifirla: () => void) {
  const [onceki, setOnceki] = useState<Anahtar>(anahtar)
  if (!ayni(onceki, anahtar)) {
    setOnceki(anahtar)
    sifirla()
  }
}
