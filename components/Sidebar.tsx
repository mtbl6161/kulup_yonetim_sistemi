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
      { href: '/ders-programi', label: 'Ders Programı', icon: '📅' },
      { href: '/puantaj', label: 'Puantaj', icon: '🕐' },
      { href: '/bordro', label: 'Bordro', icon: '📊' },
    ],
  },
  {
    baslik: 'Muhasebe',
    items: [
      { href: '/hesap-hareketleri', label: 'Hesap Hareketleri', icon: '🏦' },
      { href: '/gelir-gider', label: 'Gelir / Gider Özet', icon: '📈' },
    ],
  },
]

interface Props {
  ay: number
  yil: number
  onAyChange: (ay: number, yil: number) => void
}

export default function Sidebar({ ay, yil, onAyChange }: Props) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const YILLAR = [2024, 2025, 2026, 2027]
  const AYLAR_LIST = [9,10,11,12,1,2,3,4,5,6]

  return (
    <aside
      className="fixed top-0 left-0 bottom-0 z-30 flex flex-col overflow-y-auto overflow-x-hidden transition-all duration-300"
      style={{
        width: collapsed ? 56 : 240,
        minWidth: collapsed ? 56 : 240,
        background: '#2d5a3d',
        color: '#e8f0eb',
      }}
    >
      {/* Toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        title="Menüyü Daralt / Genişlet"
        style={{
          position: 'absolute', top: 18, right: -13,
          width: 26, height: 26,
          background: '#2d5a3d',
          border: '2px solid rgba(255,255,255,0.25)',
          borderRadius: '50%', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 12, zIndex: 200,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          transform: collapsed ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.25s',
        }}
      >
        ‹
      </button>

      {/* Logo */}
      <div style={{ padding: collapsed ? '16px 0' : '24px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.12)', display: 'flex', justifyContent: collapsed ? 'center' : 'flex-start', alignItems: 'center' }}>
        {collapsed ? (
          <span style={{ fontSize: 20 }}>🏫</span>
        ) : (
          <div>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
              Çocuk Kulübü<br />Yönetim Sistemi
            </div>
          </div>
        )}
      </div>

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
    </aside>
  )
}
