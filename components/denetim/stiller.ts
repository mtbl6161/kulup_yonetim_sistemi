// Denetçi panelinin ortak tablo ve durum stilleri
import type React from 'react'

export const loadingOverlay: React.CSSProperties = { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(245,242,236,0.5)', backdropFilter: 'blur(2px)' }
export const emptyView: React.CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }

export const thSub: React.CSSProperties = {
  padding: '10px 1px', fontSize: 9, letterSpacing: 0, textTransform: 'uppercase',
  whiteSpace: 'pre-line', lineHeight: 1.2, borderRight: '1px solid var(--border-light)',
  background: 'var(--surface2)', color: 'var(--text2)', fontWeight: 700
}

export function dpTh(w: number): React.CSSProperties {
  return {
    padding: '6px 2px', color: 'var(--th-fg)', fontWeight: 700, fontSize: 9,
    border: '1px solid var(--th-border)', textAlign: 'center',
    width: w, minWidth: w, boxSizing: 'border-box', verticalAlign: 'middle', lineHeight: 1.2,
  }
}
export const dpTd: React.CSSProperties = {
  padding: '4px 2px', border: '1px solid var(--border-light)',
  fontSize: 9, verticalAlign: 'middle', minWidth: 52, height: 40,
}

