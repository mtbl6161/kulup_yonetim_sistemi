'use client'
// Yönetim konsolunun kabuğu: koyu yan menü (yönetici olduğunuz her an belli olsun diye), üst başlık ve dar ekran çekmecesi.
import { useState } from 'react'
import type { ReactNode } from 'react'
import { LayoutDashboard, School, CreditCard, UserCheck, ClipboardCheck, Megaphone, CalendarDays, Settings, LogOut, Menu, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { BrandMark } from '@/components/brand/Logo'
import { useAuth } from '@/lib/AuthContext'
import { useDegisince } from '@/lib/useDegisince'
import type { Sekme } from './ortak'
import { KABUK_STIL } from './kabukStil'

const MENU: { grup: string; ogeler: { id: Sekme; ad: string; ikon: LucideIcon }[] }[] = [
  { grup: 'Genel', ogeler: [
    { id: 'ozet', ad: 'Genel bakış', ikon: LayoutDashboard },
    { id: 'kurumlar', ad: 'Kurumlar', ikon: School },
    { id: 'tahsilat', ad: 'Tahsilat', ikon: CreditCard },
    { id: 'talepler', ad: 'Denetçiler', ikon: UserCheck },
  ] },
  { grup: 'Sistem', ogeler: [
    { id: 'izler', ad: 'Denetim izleri', ikon: ClipboardCheck },
    { id: 'duyurular', ad: 'Duyurular', ikon: Megaphone },
    { id: 'tatiller', ad: 'Tatil takvimi', ikon: CalendarDays },
    { id: 'ayarlar', ad: 'Sistem ayarları', ikon: Settings },
  ] },
]

export default function Kabuk({ sekme, onSekme, sayilar, baslik, alt, eylem, children }: {
  sekme: Sekme
  onSekme: (s: Sekme) => void
  sayilar: Partial<Record<Sekme, { deger: number; vurgu?: boolean }>>
  baslik: string
  alt?: string
  eylem?: ReactNode
  children: ReactNode
}) {
  const { user, signOut } = useAuth()
  const [acik, setAcik] = useState(false)
  useDegisince(sekme, () => setAcik(false))

  return (
    <div className="yk">
      <style>{KABUK_STIL}</style>
      <aside className={`yk-menu${acik ? ' acik' : ''}`} aria-label="Yönetim menüsü">
        <div className="yk-marka">
          <BrandMark size={30} tone="light" />
          <div><strong>Klüp360</strong><span>Yönetim konsolu</span></div>
          <button type="button" className="yk-kapat" onClick={() => setAcik(false)} aria-label="Menüyü kapat"><X size={18} /></button>
        </div>
        <nav>
          {MENU.map(g => (
            <div key={g.grup}>
              <div className="yk-grup">{g.grup}</div>
              {g.ogeler.map(o => {
                const s = sayilar[o.id]
                return (
                  <button key={o.id} type="button" className={`yk-oge${sekme === o.id ? ' on' : ''}`} aria-current={sekme === o.id ? 'page' : undefined} onClick={() => onSekme(o.id)}>
                    <o.ikon size={16} aria-hidden="true" />
                    <span>{o.ad}</span>
                    {s && s.deger > 0 && <em className={s.vurgu ? 'vurgu' : ''}>{s.deger}</em>}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>
        <div className="yk-kisi">
          <div className="yk-avatar" aria-hidden="true">SY</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong>Sistem yöneticisi</strong>
            <span title={user?.email || ''}>{user?.email}</span>
          </div>
          <button type="button" onClick={signOut} aria-label="Çıkış yap" title="Çıkış yap"><LogOut size={16} /></button>
        </div>
      </aside>
      {acik && <div className="yk-perde" onClick={() => setAcik(false)} aria-hidden="true" />}

      <main className="yk-ana">
        <header className="yk-ust">
          <button type="button" className="yk-menu-ac" onClick={() => setAcik(true)} aria-label="Menüyü aç"><Menu size={20} /></button>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1>{baslik}</h1>
            {alt && <p>{alt}</p>}
          </div>
          {eylem && <div className="yk-ust-eylem">{eylem}</div>}
        </header>
        <div className="yk-icerik">{children}</div>
      </main>
    </div>
  )
}
