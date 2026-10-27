'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AYLAR } from '@/lib/hesaplama'
import { useAy } from '@/lib/AyContext'
import { useAuth } from '@/lib/AuthContext'
import { LogOut, User, LayoutDashboard, Users, Calendar, BookOpen, Clock, BarChart3, Wallet, Landmark, TrendingUp, FileText, Settings, GraduationCap, School, ChevronDown, ClipboardList, Activity, Calculator, Globe, BookText, FolderCheck, Search, ChevronsLeft, X } from 'lucide-react'
import Logo, { BrandMark } from '@/components/brand/Logo'

type Alan = 'kulup' | 'okul'

// alan: 'kulup' | 'okul' → yalnızca o sekmede görünür; alan yoksa her iki sekmede de görünür
// altMenu: true → ana menüde değil, alt satırdaki simge düğmelerinde görünür
const NAV: { baslik: string; id: string; alan?: Alan; adminOnly?: boolean; superAdminOnly?: boolean; altMenu?: boolean; items: any[] }[] = [
  {
    baslik: 'Kayıtlar',
    id: 'kayit',
    alan: 'kulup',
    adminOnly: true,
    items: [
      { href: '/ogrenciler', label: 'Öğrenci Listesi', sub: 'Kayıt, tahsilat ve sınıf atamaları', tags: 'yeni, ekle, kayıt, para', icon: <GraduationCap size={17} /> },
      { href: '/personel', label: 'Personel Listesi', sub: 'Maaş, görev ve iletişim bilgileri', tags: 'yeni, ekle, hoca, çalışan', icon: <Users size={17} /> },
      { href: '/siniflar', label: 'Sınıf Tanımları', sub: 'Şubeleri ve kontenjanları yönetin', tags: 'yeni, ekle, sınıf', icon: <School size={17} /> },
    ],
  },
  {
    baslik: 'Eğitim',
    id: 'egitim',
    alan: 'kulup',
    adminOnly: true,
    items: [
      { href: '/ders-programi', label: 'Ders Programı', sub: 'Haftalık plan ve öğretmen atama', tags: 'takvim, plan, hoca', icon: <Calendar size={17} /> },
      { href: '/sinif-defteri', label: 'Sınıf Defteri', sub: 'Günlük işlenen dersler ve yoklama', tags: 'geldi, imza, defter', icon: <BookOpen size={17} /> },
    ],
  },
  {
    baslik: 'Tahsilat ve bordro',
    id: 'para',
    alan: 'kulup',
    adminOnly: true,
    items: [
      { href: '/odeme', label: 'Ödeme Takibi', sub: 'Aidat gecikmeleri ve tahsilat', tags: 'borç, ödeme, gecikme, aidat', icon: <Wallet size={17} /> },
      { href: '/puantaj', label: 'Puantaj Girişi', sub: 'Çalışma saati ve hoca onayı', tags: 'saat, hesapla, onay', icon: <Clock size={17} /> },
      { href: '/bordro', label: 'Bordro Özeti', sub: 'Maaş hesaplama ve ödeme fişleri', tags: 'maaş, banka, para, fiş', icon: <BarChart3 size={17} /> },
    ],
  },
  {
    baslik: 'Muhasebe ve raporlar',
    id: 'muhasebe',
    alan: 'kulup',
    adminOnly: true,
    items: [
      { href: '/muhasebe', label: 'Muhasebe Yönetimi', sub: 'Hesap planı ve mali kayıtlar', tags: 'muhasebe, kayıt, defter', icon: <Calculator size={17} /> },
      { href: '/hesap-hareketleri', label: 'Hesap Hareketleri', sub: 'Tüm para akışını inceleyin', tags: 'para, banka, giriş, çıkış', icon: <Landmark size={17} /> },
      { href: '/gelir-gider', label: 'Gelir / Gider Özet', sub: 'Kar / Zarar analizi yapın', tags: 'fatura, harcama, kar', icon: <TrendingUp size={17} /> },
      { href: '/bilanco', label: 'Bilanço', sub: 'Genel finansal durum tablosu', tags: 'rapor, nakit, varlık', icon: <FileText size={17} /> },
      { href: '/evrak-dosyasi', label: 'Denetim Dosyası', sub: 'Aylık denetim evraklarını yükle ve gönder', tags: 'denetim, evrak, belge, yükle, gönder, il, mem, dosya', icon: <FolderCheck size={17} /> },
    ],
  },
  {
    baslik: 'Okul',
    id: 'okul',
    alan: 'okul',
    adminOnly: true,
    items: [
      { href: '/okul-ogrenciler', label: 'Okul Öğrencileri', sub: 'Kulübe kayıtlı olmayan okul öğrencileri', tags: 'okul, öğrenci, kayıt, ekle, liste, sınıf', icon: <GraduationCap size={17} /> },
      { href: '/tahsilat-takip', label: 'Tahsilat Takip', sub: 'Okul, kulüp, kırtasiye ve etkinlik tahsilatları', tags: 'tahsilat, kategori, kırtasiye, etkinlik, okul, kulüp, borç, ödedi', icon: <ClipboardList size={17} /> },
      { href: '/isletme-defteri', label: 'İşletme Defteri', sub: 'Yasal gelir-gider defteri ve banka hareketleri', tags: 'işletme, defter, gelir, gider, kapak, banka, ekstre, resmi, devir', icon: <BookText size={17} /> },
    ],
  },
  {
    baslik: 'Sistem',
    id: 'sistem',
    adminOnly: true,
    altMenu: true,
    items: [
      { href: '/ayarlar', label: 'Okul Ayarları', sub: 'Kurum bilgileri ve vergi ayarları', tags: 'bilgi, katsayı, imza', icon: <Settings size={16} /> },
      { href: '/egitim', label: 'Eğitim Kılavuzu', sub: 'İnteraktif kullanım ve ayar rehberi', tags: 'eğitim, kılavuz, yardım, simülatör', icon: <BookOpen size={16} /> },
    ],
  },
  {
    baslik: 'SaaS yönetimi',
    id: 'yonetim',
    superAdminOnly: true,
    items: [
      { href: '/yonetim', label: 'Yönetim Konsolu', sub: 'Okul ve lisans yönetimi', tags: 'admin, lisans, okul', icon: <Activity size={17} /> },
      { href: '/kullanici-yonetimi', label: 'Profiller', sub: 'Kullanıcı yetki ve girişleri', tags: 'şifre, yetki, profil', icon: <User size={17} /> },
    ],
  },
]

const ROL_ADI: Record<string, string> = { admin: 'Yönetici', super_admin: 'Sistem yöneticisi', denetim_yetkilisi: 'Denetçi', ogretmen: 'Öğretmen' }

export default function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean, setCollapsed: (val: boolean) => void }) {
  const pathname = usePathname()
  const { okul, user, profil, signOut } = useAuth()
  const { ay, yil, setAy, setYil } = useAy()
  const [search, setSearch] = useState('')
  const [aramaAcik, setAramaAcik] = useState(false)
  const [donemAcik, setDonemAcik] = useState(false)
  const [alan, setAlan] = useState<Alan>('kulup')
  const aramaRef = useRef<HTMLInputElement>(null)

  const currentYear = new Date().getFullYear()
  const isSuperAdmin = profil?.rol === 'super_admin'

  // Kaydedilmiş alan tercihini yükle
  useEffect(() => {
    try {
      const kayitli = localStorage.getItem('sidebar_alan')
      if (kayitli === 'kulup' || kayitli === 'okul') setAlan(kayitli)
    } catch {}
  }, [])

  // Açılan sayfa başka alana aitse o alana geç
  useEffect(() => {
    const bolum = NAV.find(s => s.items.some(i => i.href === pathname))
    if (bolum && (bolum.alan === 'kulup' || bolum.alan === 'okul')) setAlan(bolum.alan)
  }, [pathname])

  useEffect(() => { if (aramaAcik) aramaRef.current?.focus() }, [aramaAcik])

  const alanSec = (a: Alan) => {
    setAlan(a)
    try { localStorage.setItem('sidebar_alan', a) } catch {}
  }

  const kapatArama = () => { setSearch(''); setAramaAcik(false) }

  const W = collapsed ? 72 : 248
  const q = search.toLowerCase().trim()
  const kullaniciAdi = user?.email?.split('@')[0] || 'Kullanıcı'

  const simgeDugme: React.CSSProperties = {
    width: 32, height: 32, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)',
    color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, textDecoration: 'none',
  }

  // Tek bir menü satırı: etkin satırda sol çubuk + açık kobalt zemin
  const renderLink = (href: string, label: string, icon: React.ReactNode, title?: string) => {
    const isActive = pathname === href
    return (
      <Link
        key={href}
        href={href}
        className="sidebar-link"
        title={collapsed ? label : (title || label)}
        aria-current={isActive ? 'page' : undefined}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          margin: collapsed ? '2px 14px' : '1px 10px',
          padding: collapsed ? '9px 0' : '7px 10px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: 7,
          color: isActive ? 'var(--accent-dark)' : 'var(--text2)',
          background: isActive ? '#f0f3fe' : 'transparent',
          fontWeight: isActive ? 600 : 500,
          fontSize: 13.5,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <span aria-hidden style={{ position: 'absolute', left: collapsed ? -14 : -10, top: 6, bottom: 6, width: 3, borderRadius: '0 3px 3px 0', background: isActive ? 'var(--accent)' : 'transparent' }} />
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: isActive ? 'var(--accent)' : 'var(--text3)' }}>{icon}</span>
        {!collapsed && <span>{label}</span>}
      </Link>
    )
  }

  // Görünür bölümler: arama varken tüm alanlarda, yoksa seçili sekmede
  const bolumler = NAV.map(section => {
    if (section.superAdminOnly && !isSuperAdmin) return null
    if (section.adminOnly && isSuperAdmin) return null
    if (section.altMenu) return null
    if (!q && section.alan && section.alan !== alan) return null
    const items = section.items.filter((item: any) => {
      if (!q) return true
      return (item.label + item.sub + (item.tags || '')).toLowerCase().includes(q)
    })
    return items.length ? { ...section, items } : null
  }).filter(Boolean) as typeof NAV

  const altItems = NAV.filter(s => s.altMenu && !isSuperAdmin).flatMap(s => s.items)

  return (
    <aside
      className="main-sidebar"
      style={{
        width: W,
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        background: 'var(--surface)',
        color: 'var(--text)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Marka + arama + daralt */}
      <div style={{ height: 60, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', padding: collapsed ? 0 : '0 12px 0 18px' }}>
        {collapsed ? (
          <button onClick={() => setCollapsed(false)} title="Menüyü genişlet" aria-label="Menüyü genişlet" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <BrandMark size={30} />
          </button>
        ) : (
          <>
            <Link href="/" style={{ textDecoration: 'none' }} aria-label="Klüp360 ana sayfa"><Logo size={27} /></Link>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setAramaAcik(a => !a)} title="Menüde ara" aria-label="Menüde ara" aria-pressed={aramaAcik} style={{ ...simgeDugme, border: '1px solid transparent', background: aramaAcik ? 'var(--accent-lighter)' : 'transparent', color: aramaAcik ? 'var(--accent)' : 'var(--text3)' }}>
                <Search size={16} />
              </button>
              <button onClick={() => setCollapsed(true)} title="Menüyü daralt" aria-label="Menüyü daralt" style={{ ...simgeDugme, border: '1px solid transparent', background: 'transparent', color: 'var(--text3)' }}>
                <ChevronsLeft size={16} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Arama (isteğe bağlı) */}
      {!collapsed && aramaAcik && (
        <div style={{ padding: '0 12px 8px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 22, top: 10, color: 'var(--text3)', display: 'flex' }}><Search size={14} /></span>
          <input
            ref={aramaRef}
            type="text"
            placeholder="Sayfa ara…"
            aria-label="Menüde ara"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') kapatArama() }}
            className="form-input"
            style={{ paddingLeft: 32, paddingRight: 32, fontSize: 13, background: '#f8f9fb' }}
          />
          <button onClick={kapatArama} aria-label="Aramayı kapat" style={{ position: 'absolute', right: 20, top: 9, background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', display: 'flex', padding: 0 }}><X size={15} /></button>
        </div>
      )}

      {/* Dönem: tek satır, ayrıntı açılır */}
      {!collapsed && !aramaAcik && (
        <div style={{ padding: '0 12px 8px' }}>
          <button
            onClick={() => setDonemAcik(a => !a)}
            aria-expanded={donemAcik}
            title="Dönemi değiştir"
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border)', background: donemAcik ? '#f8f9fb' : 'var(--surface)', cursor: 'pointer', textAlign: 'left', color: 'var(--text)', fontSize: 13, fontWeight: 600 }}
          >
            <Calendar size={15} color="var(--text3)" />
            <span style={{ flex: 1 }}>{AYLAR[ay]} {yil}</span>
            <ChevronDown size={14} color="var(--text3)" style={{ transform: donemAcik ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
          </button>
          {donemAcik && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <select value={ay} onChange={(e) => setAy(parseInt(e.target.value))} className="form-select" style={{ flex: 1.3, fontSize: 13 }} aria-label="Ay">
                {AYLAR.map((name, index) => index > 0 && <option key={index} value={index}>{name}</option>)}
              </select>
              <select value={yil} onChange={(e) => setYil(parseInt(e.target.value))} className="form-select" style={{ flex: 1, fontSize: 13 }} aria-label="Yıl">
                {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Alan seçici */}
      {!isSuperAdmin && !q && (
        <div style={{ padding: collapsed ? '6px 12px' : '0 12px 6px' }}>
          <div role="tablist" style={{ display: 'flex', flexDirection: collapsed ? 'column' : 'row', gap: 3, padding: 3, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9 }}>
            {([
              { id: 'kulup', label: 'Kulüp', icon: <Users size={14} /> },
              { id: 'okul', label: 'Okul', icon: <School size={14} /> },
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
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    padding: collapsed ? '8px 0' : '5px 10px', border: aktif ? '1px solid var(--border)' : '1px solid transparent', borderRadius: 7, cursor: 'pointer',
                    fontSize: 13, fontWeight: aktif ? 600 : 500,
                    color: aktif ? 'var(--text)' : 'var(--text3)',
                    background: aktif ? '#fff' : 'transparent',
                    boxShadow: aktif ? '0 1px 2px rgba(14,17,22,0.08)' : 'none',
                    transition: 'all 0.15s',
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

      {/* Menü: tüm bölümler açık, başlıklar sadece etiket */}
      <nav style={{ flex: 1, padding: '4px 0 10px', overflowY: 'auto' }}>
        {!q && !isSuperAdmin && renderLink('/', 'Genel Bakış', <LayoutDashboard size={17} />)}
        {bolumler.map((section, i) => (
          <div key={section.id}>
            {collapsed ? (
              <div aria-hidden style={{ height: 1, background: 'var(--border-light)', margin: '8px 18px' }} />
            ) : (
              <div style={{ padding: i === 0 && isSuperAdmin ? '4px 20px 4px' : '14px 20px 4px', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text3)' }}>
                {section.baslik}
              </div>
            )}
            {section.items.map((item: any) => renderLink(item.href, item.label, item.icon, item.sub))}
          </div>
        ))}
        {q && bolumler.length === 0 && (
          <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--text3)', textAlign: 'center' }}>“{search}” için sonuç yok.</div>
        )}
      </nav>

      {/* Alt alan: kullanıcı + simge düğmeleri */}
      <div style={{ padding: collapsed ? '10px 0' : '10px 12px 12px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, alignItems: collapsed ? 'center' : 'stretch' }}>
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, padding: '0 2px' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--text)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12, flexShrink: 0 }}>
              {user?.email?.[0].toUpperCase() || 'U'}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{kullaniciAdi}</div>
              <div title={ROL_ADI[profil?.rol as string] || profil?.rol || 'Kullanıcı'} style={{ fontSize: 11.5, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{okul?.ad || ROL_ADI[profil?.rol as string] || 'Kullanıcı'}</div>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: collapsed ? 'column' : 'row', gap: 6 }}>
          {altItems.map((item: any) => (
            <Link key={item.href} href={item.href} title={item.label} aria-label={item.label} style={{ ...simgeDugme, color: pathname === item.href ? 'var(--accent)' : 'var(--text2)', background: pathname === item.href ? 'var(--accent-lighter)' : 'var(--surface)' }}>
              {item.icon}
            </Link>
          ))}
          <Link href="/tanitim" title="Web sitesi" aria-label="Web sitesi" style={simgeDugme}><Globe size={16} /></Link>
          <div style={{ flex: collapsed ? 0 : 1 }} />
          <button onClick={() => signOut()} title="Güvenli çıkış" aria-label="Güvenli çıkış" style={{ ...simgeDugme, color: 'var(--danger)', borderColor: 'var(--danger-border)' }}>
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
