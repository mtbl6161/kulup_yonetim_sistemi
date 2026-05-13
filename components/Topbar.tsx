'use client'

interface Props {
  title: string
  sub?: string
  actions?: React.ReactNode
}

export default function Topbar({ title, sub, actions }: Props) {
  return (
    <div
      className="no-print"
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid #d8d0be',
        padding: '14px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
      }}
    >
      <div>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 600 }}>
          {title}
        </div>
        {sub && (
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {actions}
        </div>
      )}
    </div>
  )
}
