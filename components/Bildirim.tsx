'use client'
import { CheckCircle2, XCircle, Info, AlertTriangle, Loader2, X } from 'lucide-react'

// Sayfalarda `setMsg('✅ ...')` biçiminde tutulan iletileri sakin bir uyarı kutusuna çevirir.
// Başlangıçtaki işaret türü belirler; kutuda işaret yerine simge gösterilir.
type Tur = 'success' | 'danger' | 'warn' | 'info' | 'loading'

function turBul(msg: string): Tur {
  if (msg.startsWith('✅')) return 'success'
  if (msg.startsWith('❌')) return 'danger'
  if (msg.startsWith('⚠')) return 'warn'
  if (msg.startsWith('ℹ')) return 'info'
  if (msg.startsWith('⌛') || msg.startsWith('🔄')) return 'loading'
  return 'info'
}

const IKON = { success: CheckCircle2, danger: XCircle, warn: AlertTriangle, info: Info, loading: Loader2 }
const SINIF: Record<Tur, string> = { success: 'alert-success', danger: 'alert-danger', warn: 'alert-warn', info: 'alert-info', loading: 'alert-info' }

export default function Bildirim({ msg, onClose, className = '' }: { msg: string; onClose?: () => void; className?: string }) {
  if (!msg) return null
  const tur = turBul(msg)
  const Ikon = IKON[tur]
  const metin = msg.replace(/^(✅|❌|⚠️?|ℹ️?|⌛|🔄)\s*/u, '')
  return (
    <div className={`alert ${SINIF[tur]} ${className}`} role={tur === 'danger' ? 'alert' : 'status'} style={{ alignItems: 'center', marginBottom: 16 }}>
      <Ikon size={16} style={{ flexShrink: 0, animation: tur === 'loading' ? 'spin 1s linear infinite' : undefined }} />
      <span style={{ flex: 1 }}>{metin}</span>
      {onClose && (
        <button onClick={onClose} aria-label="Kapat" style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'flex', opacity: 0.7 }}>
          <X size={16} />
        </button>
      )}
    </div>
  )
}
