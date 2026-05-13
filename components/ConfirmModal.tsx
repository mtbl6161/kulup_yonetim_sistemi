'use client'

interface Props {
  baslik?: string
  mesaj: string
  onayMetni?: string
  iptalMetni?: string
  tehlikeli?: boolean
  basari?: boolean
  onOnayla: () => void
  onIptal: () => void
}

export default function ConfirmModal({
  baslik = 'Emin misiniz?',
  mesaj,
  onayMetni = 'Evet, Sil',
  iptalMetni = 'Vazgeç',
  tehlikeli = true,
  basari = false,
  onOnayla,
  onIptal,
}: Props) {
  return (
    <div
      onClick={onIptal}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000,
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card-bg, #fff)',
          borderRadius: 16,
          width: '90%',
          maxWidth: 400,
          padding: '28px 28px 24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          animation: 'slideUp 0.2s ease',
        }}
      >
        {/* İkon */}
        <div style={{
          width: 52, height: 52,
          borderRadius: 14,
          background: basari ? '#f0fdf4' : tehlikeli ? '#fff1f2' : '#fff9e6',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, marginBottom: 16,
        }}>
          {basari ? '✅' : tehlikeli ? '🗑️' : '⚠️'}
        </div>

        {/* Başlık */}
        <h3 style={{
          margin: '0 0 8px',
          fontSize: 17,
          fontWeight: 700,
          color: 'var(--text1, #111)',
        }}>
          {baslik}
        </h3>

        {/* Mesaj */}
        <p style={{
          margin: '0 0 24px',
          fontSize: 14,
          color: 'var(--text2, #555)',
          lineHeight: 1.55,
        }}>
          {mesaj}
        </p>

        {/* Butonlar */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          {iptalMetni && (
            <button
              onClick={onIptal}
              className="btn btn-secondary"
              style={{ minWidth: 90 }}
            >
              {iptalMetni}
            </button>
          )}
          <button
            onClick={onOnayla}
            className={`btn ${tehlikeli ? 'btn-danger' : 'btn-primary'}`}
            style={{ minWidth: 110 }}
          >
            {onayMetni}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  )
}
