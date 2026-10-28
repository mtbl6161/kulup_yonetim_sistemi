'use client'
import type React from 'react'
import { fmtTL, tarihFmt } from '@/lib/hesaplama'
import { IsletmeHareket, IsletmeTur } from '@/lib/types'

export const bugunISO = () => new Date().toISOString().split('T')[0]

export type OdemeTipi = 'kulup' | 'kirtasiye'
export interface ParsedRow {
  tarih: string; tutar: number; tur: IsletmeTur; aciklama: string; belge: string; gecerli: boolean
  odemeTipi: OdemeTipi | null
  ogrenciId: number | null
  ayIpucu: number | null
  isaretle: boolean
}

// Türk formatındaki tutarı sayıya çevir ("1.234,56" -> 1234.56). İşaret ayrı ele alınır.
export function parseTutar(s: string): number {
  if (!s) return NaN
  const t = s.replace(/[^\d.,-]/g, '').trim()
  if (!t || t === '-') return NaN
  const neg = t.startsWith('-')
  const dec = Math.max(t.lastIndexOf(','), t.lastIndexOf('.'))
  if (dec === -1) { const n = parseFloat(t.replace(/[^\d]/g, '')); return neg ? -n : n }
  const intp = t.slice(0, dec).replace(/[^\d]/g, '')
  const frac = t.slice(dec + 1).replace(/[^\d]/g, '')
  const v = parseFloat(`${intp || '0'}.${frac || '0'}`)
  return neg ? -v : v
}

// Tarihi ISO'ya çevir (dd.mm.yyyy / yyyy-mm-dd destekli)
export function parseTarih(s: string): string {
  if (!s) return ''
  const t = s.trim()
  let m = t.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  m = t.match(/(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  return ''
}

// Excel hücresini düz metne çevir (tarih -> dd.mm.yyyy, sayı -> ondalık)
export function cellStr(v: unknown): string {
  if (v == null) return ''
  if (v instanceof Date) return `${String(v.getDate()).padStart(2, '0')}.${String(v.getMonth() + 1).padStart(2, '0')}.${v.getFullYear()}`
  return String(v).trim()
}

// Ekstredeki gerçek tablo başlığını bul: "tarih" ve "tutar/miktar" kelimelerini aynı satırda
// içeren ilk satır. Banka ekstrelerinde tablo öncesinde hesap bilgisi bloğu (Şube, IBAN,
// Bakiye vb.) yer alabilir; bu blok tabloya dahil edilmeden atlanır. Böyle bir başlık
// bulunamazsa (ör. dosya zaten ilk satırdan tablo) hiçbir şey değişmez.
export function ekstreBasligiBul(rows: string[][]): number {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i].map(c => (c || '').toLocaleLowerCase('tr'))
    if (r.some(c => c.includes('tarih')) && r.some(c => c.includes('tutar') || c.includes('miktar'))) return i
  }
  return -1
}

export interface ColMap { tarih: number; tutar: number; yon: number; aciklama: number; belge: number }

// Excel/CSV sütunlarını otomatik tanı (banka bağımsız: başlık adı + içerik desenine göre)
export function autoDetect(rows: string[][], hasHeader: boolean): ColMap {
  const n = rows.reduce((m, r) => Math.max(m, r.length), 0)
  const header = hasHeader && rows[0] ? rows[0].map(h => (h || '').toLocaleLowerCase('tr')) : []
  const data = hasHeader ? rows.slice(1) : rows
  const findHead = (kw: string[]) => header.findIndex(h => kw.some(k => h.includes(k)))
  const colScore = (test: (s: string) => boolean, skip: number[] = []) => {
    let best = -1, bestOk = 0
    for (let c = 0; c < n; c++) {
      if (skip.includes(c)) continue
      let ok = 0, tot = 0
      for (const r of data.slice(0, 25)) { const v = r[c]; if (v && v.trim()) { tot++; if (test(v)) ok++ } }
      if (tot && ok / tot > 0.6 && ok > bestOk) { bestOk = ok; best = c }
    }
    return best
  }
  let tarih = findHead(['tarih']); if (tarih < 0) tarih = colScore(s => !!parseTarih(s))
  if (tarih < 0) tarih = 0
  let tutar = findHead(['işlem tutar', 'islem tutar', 'tutar', 'miktar', 'tutarı'])
  if (tutar < 0) tutar = colScore(s => { const x = parseTutar(s); return !isNaN(x) && x !== 0 }, [tarih])
  if (tutar < 0) tutar = Math.min(2, n - 1)
  const yon = findHead(['(+/-)', '+/-', 'borç/alacak', 'g/ç', 'işlem türü', 'islem türü'])
  const aciklama = findHead(['açıklama', 'aciklama', 'detay', 'ad soyad', 'gönderen', 'gonderen'])
  const belge = findHead(['dekont', 'belge', 'referans', 'fiş', 'fis', 'işlem no', 'islem no'])
  return { tarih, tutar, yon, aciklama, belge }
}

export interface FormState {
  tarih: string
  tur: IsletmeTur
  tutar: string
  belge_no: string
  aciklama: string
}
export const bosForm = (tarih: string): FormState => ({ tarih, tur: 'gelir', tutar: '', belge_no: '', aciklama: '' })


export function DefterTablo({ title, rows, nakli, toplam, sira0 }: { title: 'GİDER' | 'GELİR'; rows: IsletmeHareket[]; nakli: number; toplam: number; sira0: number }) {
  const gelir = title === 'GELİR'
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 0 }}>
      <div style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 800, letterSpacing: 1.5, fontSize: 14, borderBottom: '1px solid var(--border)', background: gelir ? 'var(--accent-lighter)' : 'var(--danger-light)', color: gelir ? 'var(--accent)' : 'var(--danger)' }}>
        {title}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ width: 64, textAlign: 'center', verticalAlign: 'middle' }}>Sıra No</th>
              <th colSpan={2} style={{ textAlign: 'center' }}>{gelir ? 'Alındı Belgesi veya Banka Dekontunun' : 'Alınan Fatura veya Belgenin'}</th>
              <th rowSpan={2} style={{ verticalAlign: 'middle' }}>Açıklama</th>
              <th rowSpan={2} className="td-num" style={{ width: 150, verticalAlign: 'middle' }}>Miktarı / Tutarı (₺)</th>
            </tr>
            <tr>
              <th style={{ width: 100, textAlign: 'center' }}>Tarihi</th>
              <th style={{ width: 100, textAlign: 'center' }}>{gelir ? 'Sıra No' : "No'su"}</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: 'var(--surface2)' }}>
              <td colSpan={4} style={{ textAlign: 'center', fontWeight: 700 }}>Nakli Toplam</td>
              <td className="td-num" style={{ fontWeight: 600 }}>{fmtTL(nakli)}</td>
            </tr>
            {rows.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text3)', padding: 22 }}>Bu ay {gelir ? 'gelir' : 'gider'} kaydı yok.</td></tr>
            ) : rows.map((r, idx) => (
              <tr key={r.id}>
                <td style={{ textAlign: 'center' }}>{sira0 + idx + 1}</td>
                <td style={{ textAlign: 'center' }}>{tarihFmt(r.tarih)}</td>
                <td style={{ textAlign: 'center', fontSize: 12 }}>{r.belge_no || '-'}</td>
                <td>{r.aciklama || <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                <td className="td-num">{fmtTL(Number(r.tutar))}</td>
              </tr>
            ))}
            <tr className="sum-row">
              <td colSpan={4} style={{ textAlign: 'center', fontWeight: 700 }}>Toplam</td>
              <td className="td-num" style={{ fontWeight: 700 }}>{fmtTL(toplam)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function StatPil({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '6px 12px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', minWidth: 64 }}>
      <span style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text3)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: color || 'var(--text)' }}>{value}</span>
    </div>
  )
}

export function turBtn(active: boolean, tur: IsletmeTur): React.CSSProperties {
  const renk = tur === 'gelir' ? 'var(--success)' : 'var(--danger)'
  return {
    flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    padding: '10px 12px', borderRadius: 9, fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
    border: `1.5px solid ${active ? renk : 'var(--border)'}`,
    background: active ? renk : 'var(--surface)',
    color: active ? '#fff' : 'var(--text2)',
    boxShadow: active ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
    transition: 'all 0.15s',
  }
}
