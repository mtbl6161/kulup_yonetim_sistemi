'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AYLAR } from '@/lib/hesaplama'
import { useAy } from '@/lib/AyContext'
import { useAuth } from '@/lib/AuthContext'
import { LogOut, User, LayoutDashboard, Users, Calendar, BookOpen, Clock, BarChart3, Wallet, Landmark, TrendingUp, FileText, Settings, GraduationCap, School, ChevronDown, ClipboardList, Activity, Calculator, Globe } from 'lucide-react'

const NAV = [
  {
    baslik: 'Kurumsal Kayıtlar',
    id: 'kurumsal',
    adminOnly: true,
    items: [
      { href: '/ogrenciler', label: 'Öğrenci Listesi', sub: 'Kayıt, tahsilat ve sınıf atamaları', tags: 'yeni, ekle, kayıt, para', icon: <GraduationCap size={18} /> },
      { href: '/personel', label: 'Personel Listesi', sub: 'Maaş, görev ve iletişim bilgileri', tags: 'yeni, ekle, hoca, çalışan', icon: <Users size={18} /> },
      { href: '/siniflar', label: 'Sınıf Tanımları', sub: 'Şubeleri ve kontenjanları yönetin', tags: 'yeni, ekle, sınıf', icon: <School size={18} /> },
    ],
  },
  {
    baslik: 'Eğitim ve Planlama',
    id: 'egitim',
    adminOnly: true,
    items: [
      { href: '/ders-programi', label: 'Ders Programı', sub: 'Haftalık plan ve öğretmen atama', tags: 'takvim, plan, hoca', icon: <Calendar size={18} /> },
      { href: '/sinif-defteri', label: 'Sınıf Defteri', sub: 'Günlük işlenen dersler ve yoklama', tags: 'geldi, imza, defter', icon: <BookOpen size={18} /> },
    ],
  },
  {
    baslik: 'Maaş ve Ödeme',
    id: 'maas',
    adminOnly: true,
    items: [
      { href: '/puantaj', label: 'Puantaj Girişi', sub: 'Çalışma saati ve hoca onayı', tags: 'saat, hesapla, onay', icon: <Clock size={18} /> },
      { href: '/bordro', label: 'Bordro Özeti', sub: 'Maaş hesaplama ve ödeme fişleri', tags: 'maaş, banka, para, fiş', icon: <BarChart3 size={18} /> },
      { href: '/odeme', label: 'Ödeme Takibi', sub: 'Aidat gecikmeleri ve tahsilat', tags: 'borç, ödeme, gecikme', icon: <Wallet size={18} /> },
    ],
  },
  {
    baslik: 'Muhasebe',
    id: 'muhasebe',
    adminOnly: true,
    items: [
      { href: '/muhasebe', label: 'Muhasebe Yönetimi', sub: 'Hesap planı ve mali kayıtlar', tags: 'muhasebe, kayıt, defter', icon: <Calculator size={18} /> },
    ],
  },
  {
    baslik: 'Finansal Raporlar',
    id: 'finans',
    adminOnly: true,
    items: [
      { href: '/hesap-hareketleri', label: 'Hesap Hareketleri', sub: 'Tüm para akışını inceleyin', tags: 'para, banka, giriş, çıkış', icon: <Landmark size={18} /> },
      { href: '/gelir-gider', label: 'Gelir / Gider Özet', sub: 'Kar / Zarar analizi yapın', tags: 'fatura, harcama, kar', icon: <TrendingUp size={18} /> },
      { href: '/bilanco', label: 'Bilanço', sub: 'Genel finansal durum tablosu', tags: 'rapor, nakit, varlık', icon: <FileText size={18} /> },
    ],
  },
  {
    baslik: 'Sistem',
    id: 'sistem',
    adminOnly: true,
    items: [
      { href: '/ayarlar', label: 'Okul Ayarları', sub: 'Kurum bilgileri ve vergi ayarları', tags: 'bilgi, katsayı, imza', icon: <Settings size={18} /> },
    ],
  },
  {
     baslik: 'SaaS Yönetimi',
     id: 'yonetim',
     superAdminOnly: true,
     items: [
       { href: '/yonetim', label: 'Yönetim Konsolu', sub: 'Okul ve lisans yönetimi', tags: 'admin, lisans, okul', icon: <Activity size={18} /> },
       { href: '/kullanici-yonetimi', label: 'Profiller', sub: 'Kullanıcı yetki ve girişleri', tags: 'şifre, yetki, profil', icon: <User size={18} /> },
     ]
  }
]

export default function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean, setCollapsed: (val: boolean) => void }) {
  const pathname = usePathname()
  const { okul, user, profil, signOut } = useAuth()
  const { ay, yil, setAy, setYil } = useAy()
  const [openSection, setOpenSection] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  
  const currentYear = new Date().getFullYear()
  const isSuperAdmin = profil?.rol === 'super_admin'

  useEffect(() => {
    const currentSection = NAV.find(s => s.items.some(i => i.href === pathname))
    if (currentSection) setOpenSection(currentSection.id)
  }, [pathname])

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? null : id)
  }

  return (
    <aside
      className="main-sidebar"
      style={{
        width: collapsed ? 80 : 280,
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        background: 'linear-gradient(180deg, var(--accent) 0%, var(--accent-dark) 100%)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
        color: '#f8fafc',
        boxShadow: '10px 0 40px rgba(0,0,0,0.15)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div style={{ 
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(circle at top left, var(--accent-light), transparent 40%)',
        opacity: 0.15,
        pointerEvents: 'none',
        zIndex: -1
      }} />
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
              ›
            </button>
          </div>
        ) : (
          <>
            <div style={{ minWidth: 0, flex: 1, paddingRight: 8 }}>
              <div style={{ 
                fontFamily: 'Playfair Display, serif', 
                fontSize: 14, 
                fontWeight: 700, 
                color: '#fff', 
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {okul?.ad || 'Klup360'}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Yönetim Paneli</div>
            </div>
            <button
              onClick={() => setCollapsed(!collapsed)}
              title="Menüyü Daralt"
              style={{
                width: 28, height: 28,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 16,
                flexShrink: 0,
                transition: 'all 0.2s',
                marginLeft: 4
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'scale(1.05)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'scale(1)' }}
            >
              {collapsed ? '›' : '‹'}
            </button>
          </>
        )}
      </div>

      {!collapsed && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.12)', display: 'flex', gap: 8 }}>
          <select
            value={ay}
            onChange={(e) => setAy(parseInt(e.target.value))}
            style={{
              flex: 1.2,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: 12,
              padding: '4px 8px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {AYLAR.map((name, index) => index > 0 && (
              <option key={index} value={index} style={{ color: 'var(--text)', background: '#fff' }}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={yil}
            onChange={(e) => setYil(parseInt(e.target.value))}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: '#fff',
              fontSize: 13,
              padding: '6px 10px',
              outline: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              backdropFilter: 'blur(10px)'
            }}
          >
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <option key={y} value={y} style={{ color: 'var(--text)', background: '#fff' }}>
                {y}
              </option>
            ))}
          </select>
        </div>
      )}

      {!collapsed && (
        <div style={{ padding: '4px 16px 12px' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Ne yapmak istiyorsunuz?"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 32px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px',
                color: '#fff',
                fontSize: 12,
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => (e.target.style.background = 'rgba(255,255,255,0.12)')}
              onBlur={(e) => (e.target.style.background = 'rgba(255,255,255,0.08)')}
            />
            <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
              <Activity size={14} />
            </div>
          </div>
        </div>
      )}


      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        {/* Web Sitesi Linki (En Üstte) */}
        {!search && (
          <div style={{ marginBottom: 12 }}>
            <Link
              href="/tanitim"
              className="sidebar-link"
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: collapsed ? '12px 0' : '12px 24px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                fontSize: 15, color: pathname === '/tanitim' ? '#fff' : 'rgba(255,255,255,0.75)',
                background: pathname === '/tanitim' ? 'rgba(255,255,255,0.12)' : 'transparent',
                borderLeft: pathname === '/tanitim' ? '3px solid var(--accent-light)' : '3px solid transparent',
                fontWeight: pathname === '/tanitim' ? 600 : 400,
                textDecoration: 'none', whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              <Globe size={18} style={{ color: pathname === '/tanitim' ? 'var(--accent-light)' : 'inherit' }} />
              {!collapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span>Web Sitesi</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>Tanıtım sayfasına git</span>
                </div>
              )}
            </Link>
            {!collapsed && <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '8px 24px 16px' }} />}
          </div>
        )}

        {/* Ana Sayfa / Genel Bakış Linki */}
        {!isSuperAdmin && !search && (
          <div style={{ marginBottom: 12 }}>
            <Link
              href="/"
              className="sidebar-link"
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: collapsed ? '12px 0' : '12px 24px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                fontSize: 15, color: pathname === '/' ? '#fff' : 'rgba(255,255,255,0.75)',
                background: pathname === '/' ? 'rgba(255,255,255,0.12)' : 'transparent',
                borderLeft: pathname === '/' ? '3px solid var(--accent-light)' : '3px solid transparent',
                fontWeight: pathname === '/' ? 600 : 400,
                textDecoration: 'none', whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              <LayoutDashboard size={18} style={{ color: pathname === '/' ? 'var(--accent-light)' : 'inherit' }} />
              {!collapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span>Genel Bakış</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>Dashboard ve istatistikler</span>
                </div>
              )}
            </Link>
            {!collapsed && <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '8px 24px 16px' }} />}
          </div>
        )}
        {NAV.map((section: any) => {
          if (section.superAdminOnly && !isSuperAdmin) return null
          if (section.adminOnly && isSuperAdmin) return null

          const q = search.toLowerCase().trim()
          const filteredItems = section.items.filter((item: any) => {
            if (item.superAdminOnly && !isSuperAdmin) return false
            if (item.adminOnly && isSuperAdmin) return false
            if (q) {
              const matchText = (item.label + item.sub + (item.tags || '')).toLowerCase()
              return matchText.includes(q)
            }
            return true
          })

          if (filteredItems.length === 0) return null
          
          const isOpen = q ? true : (openSection === section.id || collapsed)

          return (
            <div key={section.id} style={{ marginBottom: 4 }}>
              {!collapsed && (
                <button
                  onClick={() => toggleSection(section.id)}
                  style={{
                    width: '100%',
                    padding: '10px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.45)',
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  {section.baslik}
                  <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
                </button>
              )}
              
              {isOpen && filteredItems.map((item: any) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="sidebar-link"
                    title={collapsed ? item.label : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: collapsed ? '12px 0' : '15px 24px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
                      background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                      borderRadius: collapsed ? 0 : '0 24px 24px 0',
                      marginRight: collapsed ? 0 : 16,
                      fontWeight: isActive ? 700 : 500,
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      position: 'relative',
                      borderLeft: '4px solid',
                      borderColor: isActive ? 'var(--accent-light)' : 'transparent',
                      boxShadow: isActive ? '0 4px 15px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    <span style={{ 
                      color: isActive ? 'var(--accent-light)' : 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      filter: isActive ? 'drop-shadow(0 0 8px var(--accent-light))' : 'none',
                      transform: isActive ? 'scale(1.1)' : 'scale(1)',
                      transition: 'all 0.3s'
                    }}>
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 15, letterSpacing: '0.01em' }}>{item.label}</span>
                        {item.sub && (
                          <span style={{ fontSize: 11, color: isActive ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)', fontWeight: 400 }}>{item.sub}</span>
                        )}
                      </div>
                    )}
                    {isActive && !collapsed && (
                      <div style={{
                        position: 'absolute',
                        right: 12,
                        width: 8,
                        height: 8,
                        background: 'var(--accent-light)',
                        borderRadius: '50%',
                        boxShadow: '0 0 10px var(--accent-light)'
                      }} />
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>


      <div style={{ 
        padding: '16px', 
        borderTop: '1px solid rgba(255,255,255,0.12)', 
        background: 'rgba(0,0,0,0.1)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, minWidth: 0 }}>
          <div style={{ 
            width: 36, height: 36, 
            borderRadius: '10px', 
            background: 'var(--accent-light)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent)',
            fontWeight: 700,
            fontSize: 14,
            flexShrink: 0
          }}>
            {user?.email?.[0].toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email?.split('@')[0]}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'capitalize' }}>
                {profil?.rol || 'Kullanıcı'}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => signOut()}
          style={{
            width: '100%',
            padding: '10px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '8px',
            color: '#f87171',
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 12,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)'
          }}
        >
          <LogOut size={18} />
          {!collapsed && <span>Güvenli Çıkış</span>}
        </button>
      </div>
    </aside>
  )
}

function ShieldCheck({ size }: { size: number }) {
  return (
    <Activity size={size} />
  )
}
