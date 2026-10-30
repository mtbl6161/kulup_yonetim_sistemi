import type React from 'react'

// Fare pencerenin içinde basılıp perdenin (karartılmış arka plan) üstünde bırakılınca tarayıcı
// `click` olayını ikisinin ortak atası olan perdeye gönderir. Arama kutusundaki ismi fareyle seçerken
// ya da bir kutuyu işaretlerken fare biraz kayınca pencere kapanıyor, girilen her şey kayboluyordu.
const perdedeBasildi = new WeakSet<EventTarget>()

/** Pencereyi yalnızca perdeye basılıp yine perdede bırakılınca kapatır. Perdenin özelliklerine yayılır: `<div {...perdeKapat(kapat)}>` */
export function perdeKapat(kapat: () => void) {
  return {
    onMouseDown: (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) perdedeBasildi.add(e.currentTarget)
      else perdedeBasildi.delete(e.currentTarget)
    },
    onClick: (e: React.MouseEvent) => {
      const kapatilsin = e.target === e.currentTarget && perdedeBasildi.has(e.currentTarget)
      perdedeBasildi.delete(e.currentTarget)
      if (kapatilsin) kapat()
    },
  }
}
