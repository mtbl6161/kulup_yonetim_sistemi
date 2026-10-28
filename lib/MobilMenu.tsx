'use client'
import { createContext, useContext, useEffect, useState } from 'react'

/** Dar ekranda (tablet / telefon) yan menü kaydırmalı çekmeceye dönüşür. */
export const DAR_EKRAN = '(max-width: 900px)'

export function useDarEkran() {
  const [dar, setDar] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(DAR_EKRAN)
    const guncelle = () => setDar(mq.matches)
    guncelle()
    mq.addEventListener('change', guncelle)
    return () => mq.removeEventListener('change', guncelle)
  }, [])
  return dar
}

const MobilMenuContext = createContext<{ ac: () => void } | null>(null)

export const MobilMenuProvider = MobilMenuContext.Provider

/** Topbar'daki menü düğmesi için; panel dışında (tanıtım vb.) null döner. */
export function useMobilMenu() {
  return useContext(MobilMenuContext)
}
