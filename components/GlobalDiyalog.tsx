'use client'
import { useEffect, useState } from 'react'
import ConfirmModal from '@/components/ConfirmModal'
import { DIYALOG_OLAYI, type DiyalogIstegi } from '@/lib/diyalog'

/** lib/diyalog.ts'teki uyari() / onayla() çağrılarını sırayla gösterir. */
export default function GlobalDiyalog() {
  const [kuyruk, setKuyruk] = useState<DiyalogIstegi[]>([])

  useEffect(() => {
    const dinle = (e: Event) => setKuyruk(k => [...k, (e as CustomEvent<DiyalogIstegi>).detail])
    window.addEventListener(DIYALOG_OLAYI, dinle)
    return () => window.removeEventListener(DIYALOG_OLAYI, dinle)
  }, [])

  const aktif = kuyruk[0]
  if (!aktif) return null
  const kapat = (evet: boolean) => { aktif.sonuc(evet); setKuyruk(k => k.slice(1)) }

  return (
    <ConfirmModal
      baslik={aktif.baslik}
      mesaj={aktif.mesaj}
      onayMetni={aktif.tur === 'uyari' ? 'Tamam' : aktif.onayMetni}
      iptalMetni={aktif.tur === 'uyari' ? '' : 'Vazgeç'}
      tehlikeli={aktif.tur === 'onay' && !!aktif.tehlikeli}
      onOnayla={() => kapat(true)}
      onIptal={() => kapat(false)}
    />
  )
}
