'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AYLAR } from '@/lib/hesaplama'

const NAV = [
  {
    baslik: 'Genel',
    items: [
      { href: '/', label: 'Ana Sayfa', icon: '🏠' },
      { href: '/ayarlar', label: 'Kurum Ayarları', icon: '⚙️' },
    ],
  },
  {
    baslik: 'Öğrenciler',
    items: [
      { href: '/ogrenciler', label: 'Öğrenci Listesi', icon: '👨‍🎓' },
      { href: '/odeme', label: 'Ödeme Takibi', icon: '💰' },
      { href: '/sinif-defteri', label: 'Sınıf Defteri', icon: '📒' },
    ],
  },
  {
    baslik: 'Personel',
    items: [
      { href: '/personel', label: 'Personel Listesi', icon: '👩‍🏫' },
      { href: '/siniflar', label: 'Sınıflar', icon: '🏫' },
      { href: '/ders-programi', label: 'Ders Programı', icon: '📅' },
      { href: '/puantaj', label: 'Puantaj', icon: '🕐' },
      { href: '/bordro', label: 'Bordro Özeti', icon: '📊' },
    ],
  },
  {
    baslik: 'Muhasebe',
    items: [
      { href: '/hesap-hareketleri', label: 'Hesap Hareketleri', icon: '🏦' },
      { href: '/gelir-gider', label: 'Gelir / Gider Özet', icon: '📈' },
      { href: '/bilanco', label: 'Bilanço', icon: '📋' },
    ],
  },
]

interface Props {
  ay: number
  yil: number
  onAyChange: (ay: number, yil: number) => void
  collapsed: boolean
  setCollapsed: (v: boolean) => void
}

export default function Sidebar({ ay, yil, onAyChange, collapsed, setCollapsed }: Props) {
  const pathname = usePathname()

  const YILLAR = [2024, 2025, 2026, 2027]
  const AYLAR_LIST = [9,10,11,12,1,2,3,4,5,6]

  return (
    <aside
      className="fixed top-0 left-0 bottom-0 z-30 flex flex-col transition-all duration-300 overflow-visible"
      style={{
        width: collapsed ? 64 : 260,
        minWidth: collapsed ? 64 : 260,
        background: '#2d5a3d',
        color: '#e8f0eb',
        overflow: 'visible !important'
      }}
    >
      <div style={{ 
        padding: collapsed ? '16px 0' : '20px 16px', 
        borderBottom: '1px solid rgba(255,255,255,0.12)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        height: 80,
        flexShrink: 0
      }}>
        {collapsed ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
            <span style={{ fontSize: 24 }}>🏫</span>
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{
                width: 24, height: 24,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '4px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 14,
              }}
            >
              {collapsed ? '›' : '‹'}
            </button>
          </div>
        ) : (
          <>
            <div>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                Çocuk Kulübü<br />Yönetim Sistemi
              </div>
            </div>
            <button
              onClick={() => setCollapsed(!collapsed)}
              title="Menüyü Daralt"
              style={{
                width: 28, height: 28,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 16,
                marginLeft: 10
              }}
            >
              ‹
            </button>
          </>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">

      {/* Ay / Yıl Seçici */}
      {!collapsed && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.12)', display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 13 }}>📅</span>
          <select
            value={ay}
            onChange={e => onAyChange(parseInt(e.target.value), yil)}
            style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 5, padding: '4px 6px', fontSize: 12, cursor: 'pointer' }}
          >
            {AYLAR_LIST.map(m => (
              <option key={m} value={m} style={{ color: '#1a1a14', background: '#fff' }}>
                {AYLAR[m]}
              </option>
            ))}
          </select>
          <select
            value={yil}
            onChange={e => onAyChange(ay, parseInt(e.target.value))}
            style={{ width: 62, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 5, padding: '4px 4px', fontSize: 12, cursor: 'pointer' }}
          >
            {YILLAR.map(y => (
              <option key={y} value={y} style={{ color: '#1a1a14', background: '#fff' }}>
                {y}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Navigation */}
      <nav style={{ flex: 1 }}>
        {NAV.map(section => (
          <div key={section.baslik} style={{ paddingTop: 16, paddingBottom: 8 }}>
            {!collapsed && (
              <div style={{ padding: '0 20px 6px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
                {section.baslik}
              </div>
            )}
            {section.items.map(item => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: collapsed ? '10px 0' : '9px 20px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    fontSize: 13, color: isActive ? '#fff' : 'rgba(255,255,255,0.75)',
                    background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                    borderLeft: isActive ? '3px solid #7dbd8f' : '3px solid transparent',
                    fontWeight: isActive ? 500 : 400,
                    textDecoration: 'none', whiteSpace: 'nowrap',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* MEB Footer */}
      {!collapsed && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.12)', fontSize: 10, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
          MEB Çocuk Kulüpleri Yönergesi
        </div>
      )}
      </div>
    </aside>
  )
}
