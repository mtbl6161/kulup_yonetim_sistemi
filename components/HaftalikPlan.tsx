'use client'
// Ders Programı ve Sınıf Defteri'nin ortak haftalık plan parçaları:
// ayın iş günlerini haftalara bölme, öğretmen renkleri, hafta seçici, gün başlığı ve tatil bloğu.
import { ChevronLeft, ChevronRight, Flag } from 'lucide-react'
import { RESMI_TATILLER, tatilMi } from '@/lib/hesaplama'

export interface HaftaGunu { day: number; month: number; year: number; dow: number }

export const GUN_KISA = ['PAZ', 'PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT']
export const GUN_UZUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
const AY_KISA = ['', 'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

const RESMI_TATIL_ADI: Record<string, string> = {
  '01-01': 'Yılbaşı',
  '04-23': 'Ulusal Egemenlik ve Çocuk Bayramı',
  '05-01': 'Emek ve Dayanışma Günü',
  '05-19': 'Gençlik ve Spor Bayramı',
  '07-15': 'Demokrasi ve Millî Birlik Günü',
  '08-30': 'Zafer Bayramı',
  '10-29': 'Cumhuriyet Bayramı',
}

/** Ayın hafta içi günlerini Pazartesi–Cuma haftalarına böler. */
export function ayHaftalari(yil: number, ay: number): HaftaGunu[][] {
  const haftalar: HaftaGunu[][] = []
  const son = new Date(yil, ay, 0).getDate()
  let hafta: HaftaGunu[] = []
  for (let d = 1; d <= son; d++) {
    const dow = new Date(yil, ay - 1, d, 12).getDay()
    if (dow === 0 || dow === 6) continue
    if (dow === 1 && hafta.length) { haftalar.push(hafta); hafta = [] }
    hafta.push({ day: d, month: ay, year: yil, dow })
  }
  if (hafta.length) haftalar.push(hafta)
  return haftalar
}

export function bugunMu(g: HaftaGunu) {
  const b = new Date()
  return g.day === b.getDate() && g.month === b.getMonth() + 1 && g.year === b.getFullYear()
}

/** Bu ay görüntüleniyorsa bugünün haftası, değilse ilk hafta. */
export function varsayilanHafta(haftalar: HaftaGunu[][]) {
  const i = haftalar.findIndex(h => h.some(bugunMu))
  return i >= 0 ? i : 0
}

/** Gün geçmişte mi (bugün hariç)? */
export function gecmisMi(g: HaftaGunu) {
  const b = new Date(); b.setHours(0, 0, 0, 0)
  return new Date(g.year, g.month - 1, g.day) < b
}

export function tatilAdi(g: HaftaGunu, tatiller: any[]): string | null {
  if (!tatilMi(g.month, g.day, g.year, tatiller)) return null
  const anahtar = `${String(g.month).padStart(2, '0')}-${String(g.day).padStart(2, '0')}`
  if (RESMI_TATILLER.includes(anahtar)) return RESMI_TATIL_ADI[anahtar] || 'Resmî tatil'
  const t = tatiller.find(t => {
    const bas = String(t.baslangic_tarihi).split('T')[0], bit = String(t.bitis_tarihi).split('T')[0]
    const bu = `${g.year}-${String(g.month).padStart(2, '0')}-${String(g.day).padStart(2, '0')}`
    return bu >= bas && bu <= bit
  })
  return t?.ad || 'Tatil'
}

// Öğretmenlere renk verilmez (çok öğretmende renkler tekrar eder ve karışır).
// Rozet nötrdür; renk yalnızca durum için kullanılır (bugün, boş, gelmedi, tatil, vurgu).
export const ROZET = { renk: 'var(--text2)', tint: '#EEF0F4' }
export const ROZET_VURGU = { renk: '#fff', tint: 'var(--accent)' }

export function basHarf(ad?: string | null) {
  return String(ad || '?').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toLocaleUpperCase('tr-TR')
}

export function haftaEtiketi(h: HaftaGunu[]) {
  if (!h.length) return ''
  const a = h[0], b = h[h.length - 1]
  return a.day === b.day ? `${a.day} ${AY_KISA[a.month]}` : `${a.day}–${b.day} ${AY_KISA[b.month]}`
}

const kucukDugme: React.CSSProperties = { width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text2)' }

/** Önceki/sonraki ok + hafta hapları (doluluk çubuğuyla). */
export function HaftaSecici({ haftalar, secili, onSec, doluluk }: { haftalar: HaftaGunu[][]; secili: number; onSec: (i: number) => void; doluluk?: (number | null)[] }) {
  const h = haftalar[secili] || []
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button style={{ ...kucukDugme, opacity: secili === 0 ? 0.4 : 1 }} disabled={secili === 0} onClick={() => onSec(secili - 1)} aria-label="Önceki hafta"><ChevronLeft size={15} /></button>
        <div style={{ minWidth: 118, textAlign: 'center', lineHeight: 1.25 }}>
          <div style={{ fontWeight: 600 }}>{haftaEtiketi(h)}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>{secili + 1}. hafta</div>
        </div>
        <button style={{ ...kucukDugme, opacity: secili === haftalar.length - 1 ? 0.4 : 1 }} disabled={secili === haftalar.length - 1} onClick={() => onSec(secili + 1)} aria-label="Sonraki hafta"><ChevronRight size={15} /></button>
      </div>
      <div role="tablist" aria-label="Haftalar" style={{ display: 'flex', gap: 6 }}>
        {haftalar.map((hf, i) => {
          const aktif = i === secili
          const d = doluluk?.[i]
          return (
            <button
              key={i}
              role="tab"
              aria-selected={aktif}
              title={`${i + 1}. hafta · ${haftaEtiketi(hf)}`}
              onClick={() => onSec(i)}
              style={{ width: 60, padding: '5px 0 6px', borderRadius: 8, border: `1px solid ${aktif ? '#C9D4FA' : 'var(--border)'}`, background: aktif ? '#F0F3FE' : 'var(--surface)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
            >
              <span style={{ fontSize: 11.5, fontWeight: aktif ? 600 : 500, color: aktif ? 'var(--accent-dark)' : 'var(--text2)' }}>{haftaEtiketi(hf).replace(/ [A-Za-zÇĞİÖŞÜçğıöşü]+$/, '')}</span>
              {d !== undefined && d !== null && (
                <span style={{ width: 38, height: 3, borderRadius: 2, background: 'var(--border)', overflow: 'hidden', display: 'block' }}>
                  <span style={{ display: 'block', height: '100%', width: `${d}%`, background: d >= 100 ? 'var(--success)' : 'var(--warn)' }} />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Gün sütununun üst başlığı. Bugün mavi daireyle işaretlenir. */
export function GunBasligi({ g, tatil, ozet, ozetRenk, yukseklik = 62 }: { g: HaftaGunu; tatil: boolean; ozet?: string; ozetRenk?: string; yukseklik?: number }) {
  const bugun = bugunMu(g)
  return (
    <div style={{ height: yukseklik, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, borderBottom: '1px solid var(--border-light)' }}>
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: bugun ? 'var(--accent-dark)' : 'var(--text3)' }}>{GUN_KISA[g.dow]}{bugun ? ' · BUGÜN' : ''}</span>
      <span style={{ minWidth: 30, height: 30, padding: '0 6px', borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600, background: bugun ? 'var(--accent)' : 'transparent', color: bugun ? '#fff' : tatil ? 'var(--danger)' : 'var(--text)' }}>{g.day}</span>
      {ozet && <span style={{ fontSize: 11, fontWeight: 600, color: ozetRenk || 'var(--text3)' }}>{ozet}</span>}
    </div>
  )
}

/** Tatil günü: sütunun tamamını kaplayan taralı blok. */
export function TatilBlogu({ ad, alt, yukseklik }: { ad: string; alt: string; yukseklik: number }) {
  return (
    <div style={{ height: yukseklik, borderRadius: 9, border: '1px dashed #E7C2C4', background: 'repeating-linear-gradient(135deg,#FDF4F4 0 10px,#FBEDEE 10px 20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, textAlign: 'center', padding: 12 }}>
      <Flag size={18} color="var(--danger-hover)" aria-hidden />
      <span style={{ fontWeight: 600, color: 'var(--danger-hover)' }}>{ad}</span>
      <span style={{ fontSize: 12, color: '#7A3B3E' }}>{alt}</span>
    </div>
  )
}
