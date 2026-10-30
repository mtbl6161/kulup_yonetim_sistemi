// Denetçi panelinin ortak tablo ve durum stilleri
import type React from 'react'

export const loadingOverlay: React.CSSProperties = { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(245,246,248,0.5)', backdropFilter: 'blur(2px)' }
export const emptyView: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }

export const thSub: React.CSSProperties = {
  padding: '8px 3px', fontSize: 10.5, letterSpacing: 0, textTransform: 'uppercase',
  whiteSpace: 'pre-line', lineHeight: 1.2, borderRight: '1px solid var(--border-light)',
  background: 'var(--surface2)', color: 'var(--text2)', fontWeight: 700
}
