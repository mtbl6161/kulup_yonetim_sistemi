'use client'
import type React from 'react'
import { AYLAR } from '@/lib/hesaplama'
import { TahsilatKategori, TahsilatKategoriTip, TahsilatVeriKaynagi, TahsilatKapsam, TahsilatKaydi, TahsilatTaksitPlani, Ogrenci, kulupOgrencisi } from '@/lib/types'
import { taksitKey } from '@/lib/taksit'
import { CalendarRange, CalendarDays, Ticket, Search, X } from 'lucide-react'

export const TIP_LABELS: Record<TahsilatKategoriTip, string> = {
  aylik: 'Aylık', donemlik: 'Dönemlik', tek_seferlik: 'Tek Seferlik',
}
export const TIP_ICON: Record<TahsilatKategoriTip, React.ReactNode> = {
  aylik: <CalendarDays size={13} />, donemlik: <CalendarRange size={13} />, tek_seferlik: <Ticket size={13} />,
}

export interface FormState {
  ad: string
  tip: TahsilatKategoriTip
  veri_kaynagi: TahsilatVeriKaynagi
  kapsam: TahsilatKapsam
  varsayilan_tutar: string       // kulüp öğrencisi ücreti
  varsayilan_tutar_okul: string  // okul öğrencisi ücreti
}
export const BOS_FORM: FormState = { ad: '', tip: 'aylik', veri_kaynagi: 'manuel', kapsam: 'tumu', varsayilan_tutar: '', varsayilan_tutar_okul: '' }

/** Taksit planı formu (öğrenci × dönem) */
export interface PlanForm {
  o: Ogrenci
  d: Donem
  planId: number | null
  odenenNo: number[]     // ödenmiş taksit numaraları (düzenlemede korunur)
  toplam: string
  adet: number
  ilkVade: string
  vadeler: string[]
  tutarlar: string[]
  aciklama: string
}

export type TurFiltre = 'hepsi' | 'kulup' | 'okul'

/** Öğrencinin türüne göre kategorinin varsayılan ücreti (okul ücreti boşsa kulüp ücreti kullanılır) */
export function ucretBul(k: TahsilatKategori, o: Ogrenci): number | null {
  const v = kulupOgrencisi(o) ? k.varsayilan_tutar : (k.varsayilan_tutar_okul ?? k.varsayilan_tutar)
  return v != null ? Number(v) : null
}

/** Kategoriye dahil öğrenciler — otomatik (kulüp aidatı) kategorisi yalnız kulüp öğrencilerini kapsar */
export function kapsamOgrencileri(k: TahsilatKategori, ogrenciler: Ogrenci[], uyelikler: { kategori_id: number; ogrenci_id: number }[]): Ogrenci[] {
  if (k.veri_kaynagi === 'otomatik_kulup') return ogrenciler.filter(kulupOgrencisi)
  if (k.kapsam === 'tumu') return ogrenciler
  const set = new Set(uyelikler.filter(u => u.kategori_id === k.id).map(u => u.ogrenci_id))
  return ogrenciler.filter(o => set.has(o.id))
}

/** Taksit planının durumu — bul: dönem anahtarına ('-/T2') göre öğrencinin kaydını döndürür */
export function planDurumu(p: TahsilatTaksitPlani, bul: (donemKey: string) => TahsilatKaydi | undefined, bugun: string) {
  const taksitler = p.vadeler.map((vade, i) => {
    const kayit = bul(taksitKey(p.donem, i + 1))
    return { no: i + 1, vade, tutar: Number(p.tutarlar[i]) || 0, kayit, gecikti: !kayit && vade < bugun }
  })
  const odenen = taksitler.filter(t => t.kayit)
  return {
    taksitler,
    adet: taksitler.length,
    odenenAdet: odenen.length,
    odenenTutar: odenen.reduce((s, t) => s + (t.kayit!.tutar != null ? Number(t.kayit!.tutar) : t.tutar), 0),
    toplam: taksitler.reduce((s, t) => s + t.tutar, 0),
    geciken: taksitler.filter(t => t.gecikti).length,
    sonrakiVade: taksitler.find(t => !t.kayit)?.vade || null,
  }
}

export function turUygun(o: Ogrenci, f: TurFiltre) {
  return f === 'hepsi' || (f === 'kulup') === kulupOgrencisi(o)
}

/** Ad, soyad (her iki sırada), sınıf veya kimlik no içinde arar — Türkçe büyük/küçük harf duyarsız */
export function aramaUygun(o: Ogrenci, arama: string) {
  const q = arama.toLocaleLowerCase('tr').trim()
  if (!q) return true
  return [`${o.ad} ${o.soyad}`, `${o.soyad} ${o.ad}`, o.sinif || '', o.tc || '']
    .some(s => s.toLocaleLowerCase('tr').includes(q))
}

/** Arama kutusu — harf girildikçe liste süzülür */
export function AramaKutusu({ value, onChange, sonuc }: { value: string; onChange: (v: string) => void; sonuc?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
        <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
        <input className="form-input" value={value} onChange={e => onChange(e.target.value)} placeholder="Öğrenci ara (ad, soyad, sınıf, kimlik no)..." style={{ paddingLeft: 34, paddingRight: value ? 32 : undefined, width: '100%' }} />
        {value && (
          <button type="button" onClick={() => onChange('')} title="Aramayı temizle" style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', padding: 4 }}>
            <X size={14} />
          </button>
        )}
      </div>
      {value && sonuc && <span style={{ fontSize: 12, color: 'var(--text3)' }}>{sonuc}</span>}
    </div>
  )
}

export interface Donem { key: string; label: string; kisa: string }

/** Dönem bugüne kadar başladı mı? Aylık: o ayın 1'i · 1. dönem: 1 Eylül · 2. dönem: 1 Şubat · tek seferlik: her zaman */
export function donemGeldi(key: string, bugun: string): boolean {
  if (key === '-') return true
  const [y, p] = key.split('-')
  const baslangic = p === 'D1' ? `${y}-09-01` : p === 'D2' ? `${Number(y) + 1}-02-01` : `${y}-${p}-01`
  return baslangic <= bugun
}

export const bugunISO = () => new Date().toISOString().split('T')[0]
/** Sayıyı kutuya Türkçe yazımla koyar (1500.5 → "1500,5") — sayiCoz ile geri okunur */
export const sayiYaz = (n: number | string | null | undefined) => n == null || n === '' ? '' : String(n).replace('.', ',')

export function hesaplaDonemler(kat: TahsilatKategori | null, ey: number): Donem[] {
  if (!kat) return []
  if (kat.tip === 'tek_seferlik') return [{ key: '-', label: 'Tahsilat', kisa: 'Tahsilat' }]
  if (kat.tip === 'donemlik') return [
    { key: `${ey}-D1`, label: '1. Dönem', kisa: '1. Dönem' },
    { key: `${ey}-D2`, label: '2. Dönem', kisa: '2. Dönem' },
  ]
  const order = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8]
  return order.map(m => {
    const y = m >= 9 ? ey : ey + 1
    return { key: `${y}-${String(m).padStart(2, '0')}`, label: `${AYLAR[m]} ${y}`, kisa: AYLAR[m].substring(0, 3) }
  })
}

export const badge: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', letterSpacing: 0.2 }
// Hücreye bağlı popover konumu: altta yer yoksa hücrenin üstünde açılır, ekrana sığmazsa kaydırılır
export function popKonum(rect: DOMRect, genislik: number, tahminiYukseklik: number): React.CSSProperties {
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1000
  const left = Math.max(8, Math.min(rect.left, vw - genislik - 12))
  const altBosluk = vh - rect.bottom - 14
  const ustBosluk = rect.top - 14
  if (altBosluk >= tahminiYukseklik || altBosluk >= ustBosluk) {
    return { position: 'absolute', top: rect.bottom + 6, left, maxHeight: altBosluk, overflowY: 'auto' }
  }
  return { position: 'absolute', bottom: vh - rect.top + 6, left, maxHeight: ustBosluk, overflowY: 'auto' }
}

export const overlay: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(26,26,20,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }
export const modalCard: React.CSSProperties = { width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: '24px 26px', marginBottom: 0, boxShadow: '0 24px 60px rgba(0,0,0,0.28)' }
export const emptyBox: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', textAlign: 'center', background: 'var(--surface)', borderRadius: 14, border: '1.5px dashed var(--border)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }
export const thStyle: React.CSSProperties = { background: 'var(--th-bg)', color: 'var(--th-fg)', border: '1px solid var(--th-border)', fontSize: 10.5, fontWeight: 600, padding: '11px 6px', textAlign: 'center', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: 0.4 }
export const tdStyle: React.CSSProperties = { padding: '6px', textAlign: 'center', borderRight: '1px solid var(--border-light)' }
export const statBox: React.CSSProperties = { padding: '16px 18px', position: 'relative', overflow: 'hidden' }
export const statLabel: React.CSSProperties = { fontSize: 10.5, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 }
export const statVal: React.CSSProperties = { fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }

export const statAlt: React.CSSProperties = { marginTop: 8, fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }

/** Öğrenci türü rozeti: K = kulüp, O = okul */
export function TurRozet({ okul, uzun }: { okul: boolean; uzun?: boolean }) {
  return (
    <span
      title={okul ? 'Okul öğrencisi' : 'Kulüp öğrencisi'}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 18, height: 18, padding: uzun ? '0 8px' : '0 4px', borderRadius: 5,
        fontSize: 10, fontWeight: 700, letterSpacing: 0.3, verticalAlign: 1,
        background: okul ? 'var(--info-light)' : 'var(--accent-lighter)',
        color: okul ? '#1a5b8a' : 'var(--accent)',
        border: `1px solid ${okul ? 'var(--info-border)' : 'var(--accent-light)'}`,
      }}
    >
      {uzun ? (okul ? 'Okul' : 'Kulüp') : (okul ? 'O' : 'K')}
    </span>
  )
}

export function secBtn(active: boolean): React.CSSProperties {
  return { flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 10px', borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`, background: active ? 'var(--accent)' : 'var(--surface)', color: active ? '#fff' : 'var(--text2)', boxShadow: active ? '0 2px 8px rgba(35,71,217,0.25)' : 'none', transition: 'all 0.15s' }
}
