'use client'
import { useState } from 'react'

/**
 * Türkçe yazımı anlayan sayı kutusu.
 * type="number" kutuları "7." / "7," gibi yarım yazımı boş sayıp değeri 0'a atıyordu;
 * bu kutu metni kendi tutar, yalnızca geçerli sayıyı dışarı bildirir.
 * carpan: gösterim çarpanı (örn. oran 0.00759 → binde için 1000, yüzde için 100)
 */
export function sayiCoz(metin: string): number | null {
  let s = metin.trim().replace(/\s/g, '').replace(/₺|%|‰/g, '')
  if (!s) return null
  if (s.includes(',')) {
    // 133.633,97 → nokta binlik, virgül ondalık
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // 290.660 veya 1.234.567 → yalnızca binlik ayracı
    s = s.replace(/\./g, '')
  }
  if (!/^-?\d*\.?\d*$/.test(s) || s === '.' || s === '-') return null
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function goster(deger: number | null | undefined, carpan: number): string {
  if (deger == null || isNaN(Number(deger))) return ''
  const n = Math.round(Number(deger) * carpan * 1e6) / 1e6
  return String(n).replace('.', ',')
}

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number | null | undefined
  onChange: (deger: number | null) => void
  carpan?: number
}

export default function SayiInput({ value, onChange, carpan = 1, onBlur, onFocus, ...rest }: Props) {
  const [metin, setMetin] = useState(() => goster(value, carpan))
  const [odakta, setOdakta] = useState(false)
  const [sonDeger, setSonDeger] = useState(value)

  // Dışarıdan değer değişince (kayıt yükleme, "2026 dilimlerini yükle" vb.) kutuyu güncelle
  if (value !== sonDeger) {
    setSonDeger(value)
    if (!odakta) setMetin(goster(value, carpan))
  }

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      value={metin}
      onFocus={e => { setOdakta(true); onFocus?.(e) }}
      onChange={e => {
        const v = e.target.value.replace(/[^0-9.,\s-]/g, '')
        setMetin(v)
        const n = sayiCoz(v)
        onChange(n == null ? null : Math.round((n / carpan) * 1e10) / 1e10)
      }}
      onBlur={e => {
        setOdakta(false)
        setMetin(goster(value, carpan))
        onBlur?.(e)
      }}
    />
  )
}
