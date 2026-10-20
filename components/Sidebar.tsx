'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AYLAR } from '@/lib/hesaplama'
import { useAy } from '@/lib/AyContext'
import { useAuth } from '@/lib/AuthContext'
import { LogOut, User, LayoutDashboard, Users, Calendar, BookOpen, Clock, BarChart3, Wallet, Landmark, TrendingUp, FileText, Settings, GraduationCap, School, ChevronDown, ClipboardList, Activity, Calculator, Globe, BookText, FolderCheck } from 'lucide-react'

type Alan = 'kulup' | 'okul'

// alan: 'kulup' | 'okul' → yalnızca o sekmede görünür; alan yoksa her iki sekmede de görünür
const NAV: { baslik: string; id: string; alan?: Alan; adminOnly?: boolean; superAdminOnly?: boolean; items: any[] }[] = [
  {
    baslik: 'Kurumsal Kayıtlar',
    id: 'kurumsal',
    alan: 'kulup',
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
    alan: 'kulup',
    adminOnly: true,
    items: [
      { href: '/ders-programi', label: 'Ders Programı', sub: 'Haftalık plan ve öğretmen atama', tags: 'takvim, plan, hoca', icon: <Calendar size={18} /> },
      { href: '/sinif-defteri', label: 'Sınıf Defteri', sub: 'Günlük işlenen dersler ve yoklama', tags: 'geldi, imza, defter', icon: <BookOpen size={18} /> },
    ],
  },
  {
    baslik: 'Tahsilat',
    id: 'tahsilat',
    alan: 'kulup',
    adminOnly: true,
    items: [
      { href: '/odeme', label: 'Ödeme Takibi', sub: 'Aidat gecikmeleri ve tahsilat', tags: 'borç, ödeme, gecikme, aidat', icon: <Wallet size={18} /> },
    ],
  },
  {
    baslik: 'Bordro ve Maaş',
    id: 'maas',
    alan: 'kulup',
    adminOnly: true,
    items: [
      { href: '/puantaj', label: 'Puantaj Girişi', sub: 'Çalışma saati ve hoca onayı', tags: 'saat, hesapla, onay', icon: <Clock size={18} /> },
      { href: '/bordro', label: 'Bordro Özeti', sub: 'Maaş hesaplama ve ödeme fişleri', tags: 'maaş, banka, para, fiş', icon: <BarChart3 size={18} /> },
    ],
  },
  {
    baslik: 'Muhasebe',
    id: 'muhasebe',
    alan: 'kulup',
    adminOnly: true,
    items: [
      { href: '/muhasebe', label: 'Muhasebe Yönetimi', sub: 'Hesap planı ve mali kayıtlar', tags: 'muhasebe, kayıt, defter', icon: <Calculator size={18} /> },
      { href: '/evrak-dosyasi', label: 'Denetim Dosyası', sub: 'Aylık denetim evraklarını yükle ve gönder', tags: 'denetim, evrak, belge, yükle, gönder, il, mem, dosya', icon: <FolderCheck size={18} /> },
    ],
  },
  {
    baslik: 'Finansal Raporlar',
    id: 'finans',
    alan: 'kulup',
    adminOnly: true,
    items: [
      { href: '/hesap-hareketleri', label: 'Hesap Hareketleri', sub: 'Tüm para akışını inceleyin', tags: 'para, banka, giriş, çıkış', icon: <Landmark size={18} /> },
      { href: '/gelir-gider', label: 'Gelir / Gider Özet', sub: 'Kar / Zarar analizi yapın', tags: 'fatura, harcama, kar', icon: <TrendingUp size={18} /> },
      { href: '/bilanco', label: 'Bilanço', sub: 'Genel finansal durum tablosu', tags: 'rapor, nakit, varlık', icon: <FileText size={18} /> },
    ],
  },
  {
    baslik: 'Okul Kayıtları',
    id: 'okul-kayit',
    alan: 'okul',
    adminOnly: true,
    items: [
      { href: '/okul-ogrenciler', label: 'Okul Öğrencileri', sub: 'Kulübe kayıtlı olmayan okul öğrencileri', tags: 'okul, öğrenci, kayıt, ekle, liste, sınıf', icon: <GraduationCap size={18} /> },
    ],
  },
  {
    baslik: 'Okul Tahsilatları',
    id: 'okul-tahsilat',
    alan: 'okul',
    adminOnly: true,
    items: [
      { href: '/tahsilat-takip', label: 'Tahsilat Takip', sub: 'Okul, kulüp, kırtasiye ve etkinlik tahsilatları', tags: 'tahsilat, kategori, kırtasiye, etkinlik, okul, kulüp, borç, ödedi', icon: <ClipboardList size={18} /> },
    ],
  },
  {
    baslik: 'Okul Muhasebesi',
    id: 'okul-muhasebe',
    alan: 'okul',
    adminOnly: true,
    items: [
      { href: '/isletme-defteri', label: 'İşletme Defteri', sub: 'Yasal gelir-gider defteri ve banka hareketleri', tags: 'işletme, defter, gelir, gider, kapak, banka, ekstre, resmi, devir', icon: <BookText size={18} /> },
    ],
  },
  {
    baslik: 'Sistem',
    id: 'sistem',
    adminOnly: true,
    items: [
      { href: '/ayarlar', label: 'Okul Ayarları', sub: 'Kurum bilgileri ve vergi ayarları', tags: 'bilgi, katsayı, imza', icon: <Settings size={18} /> },
      { href: '/egitim', label: 'Eğitim Kılavuzu', sub: 'İnteraktif kullanım ve ayar rehberi', tags: 'eğitim, kılavuz, yardım, simülatör', icon: <BookOpen size={18} /> },
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
  const [alan, setAlan] = useState<Alan>('kulup')

  
  const currentYear = new Date().getFullYear()
  const isSuperAdmin = profil?.rol === 'super_admin'

  // Kaydedilmiş alan tercihini yükle
  useEffect(() => {
    try {
      const kayitli = localStorage.getItem('sidebar_alan')
      if (kayitli === 'kulup' || kayitli === 'okul') setAlan(kayitli)
    } catch {}
  }, [])

  useEffect(() => {
    const currentSection = NAV.find(s => s.items.some(i => i.href === pathname))
    if (currentSection) {
      setOpenSection(currentSection.id)
      // Açılan sayfa başka alana aitse o alana geç
      if (currentSection.alan === 'kulup' || currentSection.alan === 'okul') setAlan(currentSection.alan)
    }
  }, [pathname])

  const alanSec = (a: Alan) => {
    setAlan(a)
    try { localStorage.setItem('sidebar_alan', a) } catch {}
  }

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
            <School size={24} />
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


      {!isSuperAdmin && (
        <div style={{ padding: collapsed ? '10px 12px' : '4px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div
            role="tablist"
            style={{
              display: 'flex',
              flexDirection: collapsed ? 'column' : 'row',
              gap: 4,
              padding: 4,
              background: 'rgba(0,0,0,0.18)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
            }}
          >
            {([
              { id: 'kulup', label: 'Kulüp', icon: <Users size={15} /> },
              { id: 'okul', label: 'Okul', icon: <School size={15} /> },
            ] as { id: Alan; label: string; icon: React.ReactNode }[]).map(t => {
              const aktif = alan === t.id
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={aktif}
                  onClick={() => alanSec(t.id)}
                  title={t.label}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    padding: collapsed ? '8px 0' : '8px 10px',
                    border: 'none',
                    borderRadius: 9,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: aktif ? 700 : 500,
                    color: aktif ? 'var(--accent)' : 'rgba(255,255,255,0.7)',
                    background: aktif ? '#fff' : 'transparent',
                    boxShadow: aktif ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  {t.icon}
                  {!collapsed && <span>{t.label}</span>}
                </button>
              )
            })}
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
                display: 'flex', alignItems: 'center', gap: 13,
                padding: collapsed ? '11px 0' : '10px 22px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                fontSize: 14, color: pathname === '/tanitim' ? '#fff' : 'rgba(255,255,255,0.75)',
                background: pathname === '/tanitim' ? 'rgba(255,255,255,0.10)' : 'transparent',
                borderLeft: pathname === '/tanitim' ? '3px solid var(--accent-light)' : '3px solid transparent',
                fontWeight: pathname === '/tanitim' ? 600 : 400,
                textDecoration: 'none', whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              <Globe size={18} style={{ color: pathname === '/tanitim' ? 'var(--accent-light)' : 'inherit' }} />
              {!collapsed && <span>Web Sitesi</span>}
            </Link>
            {!collapsed && <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '8px 24px 12px' }} />}
          </div>
        )}

        {/* Ana Sayfa / Genel Bakış Linki */}
        {!isSuperAdmin && !search && (
          <div style={{ marginBottom: 12 }}>
            <Link
              href="/"
              className="sidebar-link"
              style={{
                display: 'flex', alignItems: 'center', gap: 13,
                padding: collapsed ? '11px 0' : '10px 22px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                fontSize: 14, color: pathname === '/' ? '#fff' : 'rgba(255,255,255,0.75)',
                background: pathname === '/' ? 'rgba(255,255,255,0.10)' : 'transparent',
                borderLeft: pathname === '/' ? '3px solid var(--accent-light)' : '3px solid transparent',
                fontWeight: pathname === '/' ? 600 : 400,
                textDecoration: 'none', whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              <LayoutDashboard size={18} style={{ color: pathname === '/' ? 'var(--accent-light)' : 'inherit' }} />
              {!collapsed && <span>Genel Bakış</span>}
            </Link>
            {!collapsed && <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '8px 24px 12px' }} />}
          </div>
        )}
        {NAV.map((section: any) => {
          if (section.superAdminOnly && !isSuperAdmin) return null
          if (section.adminOnly && isSuperAdmin) return null

          const q = search.toLowerCase().trim()
          // Arama yapılırken tüm alanlarda ara; aksi halde sadece seçili sekmenin bölümleri
          if (!q && section.alan && section.alan !== alan) return null
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
                    padding: '14px 22px 6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(255,255,255,0.38)',
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: '0.09em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  {section.baslik}
                  <ChevronDown size={13} style={{ opacity: 0.55, transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                </button>
              )}
              
              {isOpen && filteredItems.map((item: any) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="sidebar-link"
                    title={collapsed ? item.label : (item.sub || item.label)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 13,
                      padding: collapsed ? '11px 0' : '9px 22px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.72)',
                      background: isActive ? 'rgba(255,255,255,0.10)' : 'transparent',
                      fontWeight: isActive ? 600 : 400,
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s',
                      borderLeft: '3px solid',
                      borderColor: isActive ? 'var(--accent-light)' : 'transparent',
                    }}
                  >
                    <span style={{
                      color: isActive ? 'var(--accent-light)' : 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {item.icon}
                    </span>
                    {!collapsed && <span style={{ fontSize: 14 }}>{item.label}</span>}
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
