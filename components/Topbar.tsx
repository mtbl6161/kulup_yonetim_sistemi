'use client'
import { Menu } from 'lucide-react'
import { useMobilMenu } from '@/lib/MobilMenu'

interface Props {
  title: string
  sub?: string
  actions?: React.ReactNode
}

export default function Topbar({ title, sub, actions }: Props) {
  const menu = useMobilMenu()
  return (
    <div
      className="no-print topbar"
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0 32px',
        minHeight: 68,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        position: 'sticky', top: 0, zIndex: 100,
      }}
    >
      <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
        {menu && (
          <button type="button" className="mobil-menu-dugme" onClick={menu.ac} aria-label="Menüyü aç" title="Menü">
            <Menu size={20} />
          </button>
        )}
        <div style={{ minWidth: 0 }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text)', lineHeight: 1.2 }}>
          {title}
        </h1>
        {sub && (
          <div style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>
        )}
        </div>
      </div>
      {actions && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {actions}
        </div>
      )}
    </div>
  )
}
