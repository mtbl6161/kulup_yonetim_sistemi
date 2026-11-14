'use client'
import { FlaskConical } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { demoCikisAdresi } from '@/lib/demo/mod'

/** Demo modunda panelin en üstünde duran, kapatılamayan şerit. Demo bilgisi tarayıcıda oluşan oturumdan
 *  okunduğu için sunucu çıktısıyla uyuşmazlık olmaz (oturum yüklenince görünür). */
export default function DemoSeridi() {
  const { demo } = useAuth()
  if (!demo) return null
  return (
    <div
      role="status"
      style={{
        position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 14px',
        padding: '8px 16px', background: 'var(--accent-lighter)', borderBottom: '1px solid var(--border)',
        fontSize: 13, color: 'var(--text2)',
      }}
    >
      <FlaskConical size={16} color="var(--accent)" aria-hidden="true" style={{ flexShrink: 0 }} />
      <span style={{ flex: '1 1 260px', minWidth: 0 }}>
        <strong style={{ color: 'var(--accent)' }}>Demo modundasınız</strong>
        {' · '}Girdiğiniz bilgiler kaydedilmez, sayfayı yenileyince sıfırlanır.
      </span>
      <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        <a href={demoCikisAdresi('/signup')} className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
          15 gün ücretsiz deneyin
        </a>
        <a href={demoCikisAdresi('/tanitim')} style={{ color: 'var(--text2)', fontSize: 12.5, textDecoration: 'underline' }}>
          Demodan çık
        </a>
      </span>
    </div>
  )
}

/** Demoda kapalı olan bölümlerin (abonelik, şifre) yerine gösterilen kart. */
export function DemoKapaliKart({ baslik, aciklama }: { baslik: string; aciklama: string }) {
  return (
    <div className="card" style={{ padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <FlaskConical size={18} color="var(--accent)" aria-hidden="true" />
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{baslik}</h3>
      </div>
      <p style={{ margin: '0 0 14px', color: 'var(--text2)', fontSize: 14, lineHeight: 1.55 }}>{aciklama}</p>
      <a href={demoCikisAdresi('/signup')} className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
        15 gün ücretsiz deneyin
      </a>
    </div>
  )
}

/** Dosya yükleme alanlarında: demoda dosyalar yalnızca bu sekmenin belleğinde tutulur. */
export function DemoDosyaNotu() {
  const { demo } = useAuth()
  if (!demo) return null
  return (
    <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--text2)' }}>
      Demoda yüklediğiniz dosyalar sunucuya gönderilmez; yalnızca bu tarayıcı sekmesinde tutulur ve sayfayı yenileyince silinir.
    </p>
  )
}
