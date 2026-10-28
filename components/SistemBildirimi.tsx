'use client'
import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { SISTEM_HATA_OLAYI } from '@/lib/supabase'

/** lib/supabase.ts'in bildirdiği veritabanı hatalarını ekranın altında gösterir. */
export default function SistemBildirimi() {
  const [mesaj, setMesaj] = useState<string | null>(null)
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const dinle = (e: Event) => {
      const yeni = (e as CustomEvent<string>).detail
      setMesaj(yeni)
      if (zamanlayici.current) clearTimeout(zamanlayici.current)
      zamanlayici.current = setTimeout(() => setMesaj(null), 8000)
    }
    window.addEventListener(SISTEM_HATA_OLAYI, dinle)
    return () => { window.removeEventListener(SISTEM_HATA_OLAYI, dinle); if (zamanlayici.current) clearTimeout(zamanlayici.current) }
  }, [])

  if (!mesaj) return null
  return (
    <div role="alert" aria-live="assertive" className="no-print" style={{
      position: 'fixed', left: '50%', bottom: 20, transform: 'translateX(-50%)', zIndex: 1000,
      width: 'min(520px, calc(100vw - 24px))', display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '12px 14px', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)',
      border: '1px solid var(--danger-border, #f1c4c7)', borderLeft: '4px solid var(--danger, #c0262d)', boxShadow: 'var(--shadow-float)',
      fontSize: 13.5, lineHeight: 1.5,
    }}>
      <AlertTriangle size={18} style={{ color: 'var(--danger, #c0262d)', flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>{mesaj}</div>
      <button type="button" onClick={() => setMesaj(null)} aria-label="Kapat" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 0, display: 'inline-flex' }}>
        <X size={16} />
      </button>
    </div>
  )
}
