'use client'
import type { BilancoVerisi } from './BilancoIcerik'
import { loadingOverlay, emptyView, thSub } from './stiller'
import { FileText, RefreshCw } from 'lucide-react'
import { fmt, thGrup, td } from '@/components/denetim/BilancoIcerik'

export interface BordroSatir {
  id: number; personel_id: number; ay: number; yil: number; saat_ucreti?: number;
  toplam_saat: number; brut: number; gv_matrah: number; gv_oran: number
  gv_hesaplanan: number; gv_istisna_tutari: number; gv_tutar: number
  dv_hesaplanan: number; dv_istisna_tutari: number; damga_tutar: number
  sgk_kisi: number; sgk_issizlik_kisi: number; sgk_isveren: number
  toplam_kesinti: number; net: number; odendi: boolean
  personel?: { ad: string; gorev: string; tc?: string; sgk_li: boolean }
}

export function sum(rows: BordroSatir[], key: keyof BordroSatir) {
  return rows.reduce((s, b) => s + Number(b[key] ?? 0), 0)
}

// Denetçi › okul incelemesi › bordro: kişi bazında ücret ve kesinti tablosu
export default function BordroInceleme({ satirlar, yukleniyor, bilVeri }: {
  satirlar: BordroSatir[]
  yukleniyor: boolean
  bilVeri: BilancoVerisi | null
}) {
  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Toplamlar */}
      {satirlar.length > 0 && <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
         {satirlar.length > 0 && (
           <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
              {[
                { l: 'Brüt', v: sum(satirlar, 'brut'), c: 'var(--text)' },
                { l: 'Kesinti', v: sum(satirlar, 'toplam_kesinti'), c: 'var(--danger)' },
                { l: 'Net', v: sum(satirlar, 'net'), c: 'var(--accent)' }
              ].map(s => (
                <div key={s.l} style={{ textAlign: 'right', padding: '0 16px', borderRight: s.l !== 'Net' ? '1px solid var(--border-light)' : 'none' }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.l}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: s.c }}>{fmt(s.v)} ₺</div>
                </div>
              ))}
           </div>
         )}
      </div>}

      {/* Tablo kendi kutusunda kayar: başlık satırı ve ad sütunları yerinde kalır, sayfa kaymaz */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '14px 28px 18px' }}>
        {yukleniyor ? (
          <div style={loadingOverlay}><RefreshCw size={24} className="animate-spin" color="var(--accent)" /></div>
        ) : satirlar.length === 0 ? (
          <div style={emptyView}>
             <FileText size={48} color="var(--border)" />
             <p style={{ marginTop: 16, color: 'var(--text3)', fontWeight: 600 }}>Bu dönem için bordro kaydı bulunamadı.</p>
          </div>
        ) : (
          <div style={{ flex: '0 1 auto', minHeight: 0, overflow: 'auto', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', tableLayout: 'auto' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr style={{ background: 'var(--surface2)' }}>
                  <th colSpan={4} style={thGrup}>PERSONEL BİLGİLERİ</th>
                  <th colSpan={3} style={thGrup}>PUANTAJ & BRÜT</th>
                  <th colSpan={5} style={{ ...thGrup, borderBottom: '1px solid var(--border)' }}>GELİR VERGİSİ</th>
                  <th colSpan={3} style={{ ...thGrup, borderBottom: '1px solid var(--border)' }}>DAMGA VERGİSİ</th>
                  <th colSpan={3} style={{ ...thGrup, borderBottom: '1px solid var(--border)' }}>SGK KESİNTİLERİ</th>
                  <th style={{ ...thGrup, borderBottom: '1px solid var(--border)' }}>TOPLAM</th>
                  <th colSpan={5} style={{ ...thGrup, borderBottom: '1px solid var(--border)', borderRight: 'none' }}>İŞVEREN SGK DETAYLARI</th>
                </tr>
                <tr>
                  {[
                    { l: 'S.N.', a: 'center', w: 30, sticky: 0 },
                    { l: 'GÖREVİ', a: 'left', w: 100, sticky: 30 },
                    { l: 'ADI SOYADI', a: 'left', w: 140, sticky: 130 },
                    { l: 'TC KİMLİK', a: 'center', w: 95 },
                    { l: 'Ders\nSaati', a: 'center', w: 40 },
                    { l: 'Saat\nÜcreti', a: 'center', w: 50 },
                    { l: 'Brüt', a: 'center', w: 50, bold: true },
                    { l: 'GV\nMat.', a: 'center', w: 45 },
                    { l: '%', a: 'center', w: 25 },
                    { l: 'Hes.\nGV', a: 'center', w: 40, muted: true },
                    { l: 'GV\nİst.', a: 'center', w: 40 },
                    { l: 'GV\nKes.', a: 'center', w: 45, bold: true },
                    { l: 'Hes.\nDV', a: 'center', w: 40, muted: true },
                    { l: 'DV\nİst.', a: 'center', w: 40 },
                    { l: 'DV\nKes.', a: 'center', w: 45, bold: true },
                    { l: 'SGK\n%14', a: 'center', w: 40 },
                    { l: 'İşs.\n%1', a: 'center', w: 40 },
                    { l: 'Kes.\nTop.', a: 'center', w: 50, bold: true },
                    { l: 'NET\nÖDENECEK', a: 'center', w: 65, bold: true, success: true },
                    { l: 'Kısa V.\n%2,25', a: 'center', w: 44 },
                    { l: 'Em.\n%20', a: 'center', w: 35 },
                    { l: 'Sağlık\n%12,5', a: 'center', w: 44 },
                    { l: 'İşs.\n%3', a: 'center', w: 35 },
                    { l: 'İşv.\nTop.', a: 'center', w: 55, bold: true },
                  ].map((h, i) => (
                    <th key={i} style={{ 
                      ...thSub, 
                      textAlign: h.a as React.CSSProperties['textAlign'], 
                      minWidth: h.w, 
                      color: h.success ? 'var(--accent)' : 'var(--text2)', 
                      fontWeight: h.bold ? 800 : 700,
                      position: 'sticky', top: 37,
                      left: h.sticky,
                      zIndex: h.sticky !== undefined ? 20 : 11,
                      borderBottom: '2px solid var(--accent)'
                    }}>{h.l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Kurumsal birim saat ücretini listedeki "Öğretmen" veya "Usta Öğretici"den koklayarak bulalım
                  // Çünkü onların brüt ücretinde ek tazminat (koordinatörlük vb.) genelde yoktur.
                  const referansSatir = satirlar.find(s => (s.personel?.gorev === 'Öğretmen' || s.personel?.gorev === 'Usta Öğretici') && s.toplam_saat > 0)
                  const hesaplananRefUcret = referansSatir ? (referansSatir.brut / referansSatir.toplam_saat) : 0
                  const standartSaatUcreti = bilVeri?.ayarlar?.saat_ucreti || hesaplananRefUcret

                  return satirlar.map((b, i) => (
                    <tr key={b.id} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg)', borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ ...td, textAlign: 'center', fontWeight: 800, color: 'var(--text)', position: 'sticky', left: 0, zIndex: 10, background: 'inherit' }}>{i + 1}</td>
                      <td style={{ ...td, textAlign: 'left', fontWeight: 700, color: 'var(--text2)', position: 'sticky', left: 30, zIndex: 10, background: 'inherit', fontSize: 10 }}>{b.personel?.gorev ?? '—'}</td>
                      <td style={{ ...td, textAlign: 'left', fontWeight: 900, color: 'var(--text)', position: 'sticky', left: 130, zIndex: 10, background: 'inherit', fontSize: 13 }}>{b.personel?.ad ?? `#${b.personel_id}`}</td>
                      <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: 'var(--text3)', fontFamily: 'monospace', fontSize: 10 }}>{b.personel?.tc ?? '—'}</td>
                      <td style={{ ...td, fontWeight: 700, color: 'var(--text)' }}>{b.toplam_saat}</td>
                      <td style={{ ...td, fontWeight: 700, color: 'var(--text)' }}>{fmt(standartSaatUcreti > 0 ? standartSaatUcreti : (b.saat_ucreti || (b.toplam_saat > 0 ? (b.brut / b.toplam_saat) : 0)))}</td>
                      <td style={{ ...td, fontWeight: 700, color: 'var(--text)' }}>{fmt(b.brut)}</td>
                      <td style={{ ...td, color: 'var(--text)' }}>{fmt(b.gv_matrah)}</td>
                      <td style={{ ...td, color: 'var(--text)' }}>{fmt(b.gv_oran * 100)}%</td>
                      <td style={{ ...td, color: 'var(--text)', opacity: 0.8 }}>{fmt(b.gv_hesaplanan)}</td>
                      <td style={{ ...td, color: 'var(--text)' }}>{fmt(b.gv_istisna_tutari)}</td>
                      <td style={{ ...td, fontWeight: 700, color: 'var(--text)' }}>{fmt(b.gv_tutar)}</td>
                      <td style={{ ...td, color: 'var(--text)', opacity: 0.8 }}>{fmt(b.dv_hesaplanan)}</td>
                      <td style={{ ...td, color: 'var(--text)' }}>{fmt(b.dv_istisna_tutari || 0)}</td>
                      <td style={{ ...td, fontWeight: 700, color: 'var(--text)' }}>{fmt(b.damga_tutar)}</td>
                      <td style={{ ...td, color: 'var(--text)' }}>{b.personel?.sgk_li ? fmt(b.sgk_kisi) : '—'}</td>
                      <td style={{ ...td, color: 'var(--text)' }}>{b.personel?.sgk_li ? fmt(b.sgk_issizlik_kisi) : '—'}</td>
                      <td style={{ ...td, fontWeight: 800, color: 'var(--text)' }}>{fmt(b.toplam_kesinti)}</td>
                      <td style={{ ...td, fontWeight: 900, color: 'var(--text)', background: 'var(--surface2)', borderLeft: '2px solid var(--accent)' }}>{fmt(b.net)}</td>
                      {/* İşveren SGK Detayları */}
                      <td style={{ ...td, color: 'var(--text)', fontSize: 11 }}>{b.personel?.sgk_li ? fmt(b.brut * 0.0225) : '—'}</td>
                      <td style={{ ...td, color: 'var(--text)', fontSize: 11 }}>{b.personel?.sgk_li ? fmt(b.brut * 0.20) : '—'}</td>
                      <td style={{ ...td, color: 'var(--text)', fontSize: 11 }}>{b.personel?.sgk_li ? fmt(b.brut * 0.125) : '—'}</td>
                      <td style={{ ...td, color: 'var(--text)', fontSize: 11 }}>{b.personel?.sgk_li ? fmt(b.brut * 0.03) : '—'}</td>
                      <td style={{ ...td, fontWeight: 800, color: 'var(--text)', borderRight: 'none', fontSize: 12 }}>{b.personel?.sgk_li ? fmt(b.sgk_isveren) : '—'}</td>
                    </tr>
                  ))
                })()}
                {/* GENEL TOPLAM SATIRI */}
                <tr style={{ background: 'var(--accent-lighter)', borderTop: '3px solid var(--accent)', borderBottom: '2px solid var(--border)', position: 'sticky', bottom: 0, zIndex: 30, boxShadow: '0 -4px 10px rgba(0,0,0,0.05)' }}>
                  <td colSpan={4} style={{ ...td, textAlign: 'right', fontWeight: 800, color: 'var(--accent)', background: 'inherit', fontSize: 10, position: 'sticky', left: 0, zIndex: 30 }}>GENEL TOPLAM</td>
                  <td style={{ ...td, fontWeight: 800, color: 'var(--text)', background: 'inherit', fontSize: 12 }}>{sum(satirlar, 'toplam_saat')}</td>
                  <td style={{ ...td, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 12 }}>—</td>
                  <td style={{ ...td, fontWeight: 800, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 12 }}>{fmt(sum(satirlar, 'brut'))}</td>
                  <td style={{ ...td, fontWeight: 900, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 12 }}>{fmt(sum(satirlar, 'gv_matrah'))}</td>
                  <td style={{ ...td, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 12 }}>—</td>
                  <td style={{ ...td, fontWeight: 800, color: 'var(--text)', opacity: 0.8, background: 'var(--accent-lighter)', fontSize: 11 }}>{fmt(sum(satirlar, 'gv_hesaplanan'))}</td>
                  <td style={{ ...td, fontWeight: 800, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 12 }}>{fmt(sum(satirlar, 'gv_istisna_tutari'))}</td>
                  <td style={{ ...td, fontWeight: 800, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 12 }}>{fmt(sum(satirlar, 'gv_tutar'))}</td>
                  <td style={{ ...td, fontWeight: 900, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 12 }}>{fmt(sum(satirlar, 'dv_hesaplanan'))}</td>
                  <td style={{ ...td, fontWeight: 800, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 12 }}>{fmt(sum(satirlar, 'dv_istisna_tutari'))}</td>
                  <td style={{ ...td, fontWeight: 800, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 12 }}>{fmt(sum(satirlar, 'damga_tutar'))}</td>
                  <td style={{ ...td, fontWeight: 800, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 12 }}>{fmt(sum(satirlar, 'sgk_kisi'))}</td>
                  <td style={{ ...td, fontWeight: 800, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 12 }}>{fmt(sum(satirlar, 'sgk_issizlik_kisi'))}</td>
                  <td style={{ ...td, fontWeight: 800, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 12 }}>{fmt(sum(satirlar, 'toplam_kesinti'))}</td>
                  <td style={{ ...td, fontWeight: 900, color: 'var(--accent)', background: 'var(--accent-lighter)', fontSize: 16 }}>{fmt(sum(satirlar, 'net'))}</td>
                  {/* İşveren Toplamları */}
                  <td style={{ ...td, fontWeight: 800, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 13 }}>{fmt(satirlar.reduce((s, b) => s + (b.personel?.sgk_li ? b.brut * 0.0225 : 0), 0))}</td>
                  <td style={{ ...td, fontWeight: 800, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 13 }}>{fmt(satirlar.reduce((s, b) => s + (b.personel?.sgk_li ? b.brut * 0.20 : 0), 0))}</td>
                  <td style={{ ...td, fontWeight: 800, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 13 }}>{fmt(satirlar.reduce((s, b) => s + (b.personel?.sgk_li ? b.brut * 0.125 : 0), 0))}</td>
                  <td style={{ ...td, fontWeight: 800, color: 'var(--text)', background: 'var(--accent-lighter)', fontSize: 13 }}>{fmt(satirlar.reduce((s, b) => s + (b.personel?.sgk_li ? b.brut * 0.03 : 0), 0))}</td>
                  <td style={{ ...td, fontWeight: 900, color: 'var(--text)', borderRight: 'none', background: 'var(--accent-lighter)', fontSize: 14 }}>{fmt(sum(satirlar, 'sgk_isveren'))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
