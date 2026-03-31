'use client'
import { createContext, useContext, useState, ReactNode } from 'react'

interface AyCtx {
  ay: number
  yil: number
  setAy: (ay: number) => void
  setYil: (yil: number) => void
  setAyYil: (ay: number, yil: number) => void
}

const AyContext = createContext<AyCtx>({
  ay: new Date().getMonth() + 1,
  yil: new Date().getFullYear(),
  setAy: () => {},
  setYil: () => {},
  setAyYil: () => {},
})

export function AyProvider({ children }: { children: ReactNode }) {
  const now = new Date()
  const [ay, setAy] = useState(now.getMonth() + 1)
  const [yil, setYil] = useState(now.getFullYear())

  return (
    <AyContext.Provider
      value={{ ay, yil, setAy, setYil, setAyYil: (a, y) => { setAy(a); setYil(y) } }}
    >
      {children}
    </AyContext.Provider>
  )
}

export function useAy() {
  return useContext(AyContext)
}
