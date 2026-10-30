'use client'
import type React from 'react'
import type { Ogrenci } from '@/lib/types'
import { perdeKapat } from '@/lib/perdeKapat'
import type { ColMap, ParsedRow } from './yardimcilar'
import { fmtTL, tarihFmt } from '@/lib/hesaplama'
import { Save, X, FileSpreadsheet, CheckCircle2, AlertTriangle, UserCheck, ChevronDown, ChevronUp, Circle } from 'lucide-react'
import { StatPil } from './yardimcilar'

// Banka ekstresi içe aktarma penceresi: dosya seçimi, sütun eşleme ve önizleme
export default function EkstreModal({ setImportOpen, importFileName, importReading, dosyaSec, importRows, colCount, gelismisAcik, setGelismisAcik, colMap, setColMap, sutunSecenekleri, basSatirAtla, setBasSatirAtla, onizleme, setOnizleme, setEslesmePop, ogrencilerSirali, ogrenciAdMap, importSaving, importKaydet }: {
  setImportOpen: (acik: boolean) => void
  importFileName: string
  importReading: boolean
  dosyaSec: (e: React.ChangeEvent<HTMLInputElement>) => void
  importRows: string[][]
  colCount: number
  gelismisAcik: boolean
  setGelismisAcik: React.Dispatch<React.SetStateAction<boolean>>
  colMap: ColMap
  setColMap: React.Dispatch<React.SetStateAction<ColMap>>
  sutunSecenekleri: number[]
  basSatirAtla: boolean
  setBasSatirAtla: (v: boolean) => void
  onizleme: ParsedRow[] | null
  setOnizleme: React.Dispatch<React.SetStateAction<ParsedRow[] | null>>
  setEslesmePop: (p: { idx: number; rect: DOMRect } | null) => void
  ogrencilerSirali: Ogrenci[]
  ogrenciAdMap: Map<number, string>
  importSaving: boolean
  importKaydet: () => void
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(26,26,20,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }} {...perdeKapat(() => !importSaving && setImportOpen(false))}>
      <div className="card" style={{ width: '100%', maxWidth: 960, maxHeight: '92vh', overflowY: 'auto', padding: '22px 24px', marginBottom: 0 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileSpreadsheet size={20} style={{ color: 'var(--accent)' }} /> Banka Ekstresi Aktar
          </h2>
          <button onClick={() => setImportOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text3)' }}><X size={20} /></button>
        </div>
        <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--text3)', lineHeight: 1.5 }}>
          Bankadan indirdiğiniz ekstre dosyasını (.xlsx / .xls / .csv) yükleyin — sütunlar otomatik tanınır.
        </p>

        {/* Dosya seçimi */}
        {!importFileName && !importReading ? (
          <div style={{ border: '1.5px dashed var(--border)', borderRadius: 10, padding: '18px', textAlign: 'center', background: 'var(--bg)' }}>
            <label className="btn btn-primary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <FileSpreadsheet size={15} /> Dosya Seç
              <input type="file" accept=".xlsx,.xls,.csv" onChange={dosyaSec} style={{ display: 'none' }} />
            </label>
            <div style={{ marginTop: 9, fontSize: 12.5, color: 'var(--text3)' }}>Excel / CSV dosyası (.xlsx, .xls, .csv)</div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg)', fontSize: 12.5 }}>
            <FileSpreadsheet size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {importReading ? 'Dosya okunuyor…' : <><strong>{importFileName}</strong> — {importRows.length} satır</>}
            </span>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', flexShrink: 0 }}>
              Değiştir
              <input type="file" accept=".xlsx,.xls,.csv" onChange={dosyaSec} style={{ display: 'none' }} />
            </label>
          </div>
        )}

        {/* Gelişmiş: sütun eşleştirme (varsayılan kapalı — otomatik tanıma genelde yeterli) */}
        {colCount > 0 && (
          <div style={{ marginTop: 12 }}>
            <button type="button" onClick={() => setGelismisAcik(v => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 11.5, fontWeight: 600, padding: '4px 0' }}>
              {gelismisAcik ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Sütun eşleştirmeyi göster
            </button>
            {gelismisAcik && (
              <div style={{ marginTop: 8, padding: 12, background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  {([['tarih', 'Tarih *'], ['tutar', 'Tutar *'], ['yon', 'Yön / Borç-Alacak'], ['aciklama', 'Açıklama'], ['belge', 'Belge No']] as const).map(([key, label]) => (
                    <div key={key} style={{ width: 150 }}>
                      <label className="form-label">{label}</label>
                      <select className="form-select" value={colMap[key as keyof ColMap]} onChange={e => setColMap(m => ({ ...m, [key]: Number(e.target.value) }))}>
                        {(key === 'yon' || key === 'aciklama' || key === 'belge') && <option value={-1}>Yok</option>}
                        {sutunSecenekleri.map(i => {
                          const baslik = basSatirAtla && importRows[0] ? importRows[0][i] : ''
                          return <option key={i} value={i}>{baslik ? `${i + 1}. ${baslik}` : `Sütun ${i + 1}`}</option>
                        })}
                      </select>
                    </div>
                  ))}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text2)', paddingBottom: 8 }}>
                    <input type="checkbox" checked={basSatirAtla} onChange={e => setBasSatirAtla(e.target.checked)} /> İlk satır başlık
                  </label>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 8 }}>
                  Gelir/gider &ldquo;Yön&rdquo; sütunundan (+/−, Borç/Alacak) belirlenir; yoksa tutarın işaretine göre.
                </div>
              </div>
            )}
          </div>
        )}

        {onizleme && (() => {
          const gecerli = onizleme.filter(r => r.gecerli)
          const gImp = gecerli.filter(r => r.tur === 'gelir').reduce((s, r) => s + r.tutar, 0)
          const gdImp = gecerli.filter(r => r.tur === 'gider').reduce((s, r) => s + r.tutar, 0)
          const atlanacak = onizleme.length - gecerli.length
          const isaretliSayisi = onizleme.filter(r => r.isaretle).length
          return (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <StatPil label="Satır" value={`${gecerli.length}/${onizleme.length}`} />
                <StatPil label="Gelir" value={fmtTL(gImp)} color="var(--success)" />
                <StatPil label="Gider" value={fmtTL(gdImp)} color="var(--danger)" />
                {atlanacak > 0 && <StatPil label="Atlanacak" value={String(atlanacak)} color="var(--warn)" />}
                {isaretliSayisi > 0 && <StatPil label="Ödeme Takip" value={String(isaretliSayisi)} color="var(--accent)" />}
              </div>
              {ogrencilerSirali.length > 0 && (
                <div style={{ fontSize: 11.5, color: 'var(--text3)', marginBottom: 10, lineHeight: 1.5 }}>
                  Açıklamadan tahmin edilen öğrenci ödemeleri sağdaki rozette görünür — tıklayıp düzeltebilir veya kaldırabilirsiniz. Sadece işaretli satırlar Ödeme Takip&rsquo;e yazılır.
                </div>
              )}
              <div style={{ maxHeight: 340, overflowY: 'auto', overflowX: 'hidden', border: '1px solid var(--border)', borderRadius: 8 }}>
                <table className="data-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: 30 }} />
                    <col style={{ width: 78 }} />
                    <col style={{ width: 60 }} />
                    <col />
                    <col style={{ width: 88 }} />
                    <col style={{ width: 150 }} />
                    <col style={{ width: 30 }} />
                  </colgroup>
                  <thead><tr>
                    <th style={{ padding: '9px 4px' }}></th>
                    <th style={{ padding: '9px 6px' }}>Tarih</th>
                    <th style={{ textAlign: 'center', padding: '9px 4px' }}>Tür</th>
                    <th>Açıklama</th>
                    <th className="td-num" style={{ padding: '9px 6px' }}>Tutar (₺)</th>
                    <th style={{ padding: '9px 6px' }}>Ödeme Takip</th>
                    <th style={{ padding: '9px 4px' }}></th>
                  </tr></thead>
                  <tbody>
                    {onizleme.map((r, idx) => (
                      <tr key={idx} style={r.gecerli ? undefined : { background: 'var(--warn-light)' }}>
                        <td style={{ textAlign: 'center', padding: '9px 4px' }}>{r.gecerli ? <CheckCircle2 size={15} color="var(--success)" /> : <AlertTriangle size={15} color="var(--warn)" />}</td>
                        <td style={{ fontSize: 12, padding: '9px 6px' }}>{r.tarih ? tarihFmt(r.tarih) : <span style={{ color: 'var(--danger)', fontSize: 11 }}>geçersiz</span>}</td>
                        <td style={{ textAlign: 'center', padding: '9px 4px' }}>
                          <button
                            onClick={() => setOnizleme(o => o ? o.map((x, i) => i === idx ? { ...x, tur: x.tur === 'gelir' ? 'gider' : 'gelir' } : x) : o)}
                            className={`badge ${r.tur === 'gelir' ? 'badge-green' : 'badge-red'}`}
                            style={{ border: 'none', cursor: 'pointer', padding: '2px 6px', fontSize: 10.5 }}
                            title="Gelir/Gider değiştir"
                          >{r.tur === 'gelir' ? 'Gelir' : 'Gider'}</button>
                        </td>
                        <td style={{ fontSize: 12, whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word', padding: '8px 6px' }}>
                          <div>{r.aciklama || '—'}</div>
                          {r.belge && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>Belge: {r.belge}</div>}
                        </td>
                        <td className="td-num" style={{ fontSize: 12, padding: '9px 6px' }}>{isNaN(r.tutar) ? '—' : fmtTL(r.tutar)}</td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>
                          {r.tur !== 'gelir' ? (
                            <span style={{ color: 'var(--text3)', fontSize: 11 }}>—</span>
                          ) : (
                            <button
                              onClick={e => setEslesmePop({ idx, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() })}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5, maxWidth: '100%',
                                padding: '4px 9px', borderRadius: 20, fontSize: 10.5, fontWeight: 600, cursor: 'pointer',
                                border: `1px solid ${r.ogrenciId ? (r.isaretle ? 'var(--success-border)' : 'var(--border)') : 'var(--border)'}`,
                                background: r.ogrenciId ? (r.isaretle ? 'var(--success-light)' : 'var(--surface2)') : 'var(--surface)',
                                color: r.ogrenciId ? (r.isaretle ? '#1a7a3a' : 'var(--text2)') : 'var(--text3)',
                              }}
                              title="Öğrenci eşleştirmesini düzenle"
                            >
                              {r.ogrenciId ? (r.isaretle ? <CheckCircle2 size={12} /> : <Circle size={12} />) : <UserCheck size={12} />}
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 118 }}>
                                {r.ogrenciId ? (ogrenciAdMap.get(r.ogrenciId) || '—') : 'Eşleştir'}
                              </span>
                            </button>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', padding: '9px 4px' }}>
                          <button onClick={() => { setOnizleme(o => o ? o.filter((_, i) => i !== idx) : o); setEslesmePop(null) }} title="Satırı çıkar" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text3)' }}><X size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })()}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={() => setImportOpen(false)} disabled={importSaving}>İptal</button>
          <button className="btn btn-primary" onClick={importKaydet} disabled={importSaving || !onizleme || !onizleme.some(r => r.gecerli)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Save size={15} /> {importSaving ? 'Kaydediliyor...' : 'İçe Aktar'}
          </button>
        </div>
      </div>
    </div>
  )
}
