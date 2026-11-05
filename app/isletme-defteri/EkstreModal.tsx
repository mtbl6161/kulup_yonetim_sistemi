'use client'
import { useState } from 'react'
import type React from 'react'
import type { Ogrenci } from '@/lib/types'
import { perdeKapat } from '@/lib/perdeKapat'
import type { ColMap, ImportSonuc, ParsedRow } from './yardimcilar'
import { AYLAR, fmtTL, tarihFmt } from '@/lib/hesaplama'
import { Save, X, FileSpreadsheet, CheckCircle2, AlertTriangle, UserCheck, ChevronDown, ChevronUp, Circle, ListChecks } from 'lucide-react'
import { StatPil } from './yardimcilar'

/** Öğrenci ödemesi olup Tahsilat Takip'e otomatik işlenmeyecek gelir satırı */
const elleGerekir = (r: ParsedRow) => r.gecerli && r.tur === 'gelir' && !r.odemeDegil && !r.isaretle

// Banka ekstresi içe aktarma penceresi: dosya seçimi, sütun eşleme, önizleme ve aktarım sonucu
export default function EkstreModal({ defterden, setImportOpen, importFileName, importReading, dosyaSec, importRows, colCount, gelismisAcik, setGelismisAcik, colMap, setColMap, sutunSecenekleri, basSatirAtla, setBasSatirAtla, onizleme, setOnizleme, setEslesmePop, ogrencilerSirali, ogrenciAdMap, importSaving, importKaydet, importSonuc, importKapat, hedefAdi }: {
  /** Satırlar dosyadan değil deftere önceden aktarılmış banka gelirlerinden geldi */
  defterden: boolean
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
  importSonuc: ImportSonuc | null
  importKapat: () => void
  hedefAdi: (anahtar: string | null) => string | null
}) {
  const [yalnizElle, setYalnizElle] = useState(false)
  const kapat = () => (importSonuc ? importKapat() : setImportOpen(false))

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(26,26,20,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }} {...perdeKapat(() => !importSaving && kapat())}>
      <div className="card" style={{ width: '100%', maxWidth: 1020, maxHeight: '92vh', overflowY: 'auto', padding: '22px 24px', marginBottom: 0 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            {defterden
              ? <><ListChecks size={20} style={{ color: 'var(--accent)' }} /> Banka Gelirlerini Tahsilatla Eşleştir</>
              : <><FileSpreadsheet size={20} style={{ color: 'var(--accent)' }} /> Banka Ekstresi Aktar</>}
          </h2>
          <button onClick={kapat} aria-label="Kapat" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text3)' }}><X size={20} /></button>
        </div>

        {importSonuc ? <SonucGorunumu sonuc={importSonuc} kapat={importKapat} /> : <>
        <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--text3)', lineHeight: 1.5 }}>
          {defterden
            ? <>Deftere daha önce bankadan aktarılmış gelir satırları açıklamalarından yeniden eşleştirilir. Deftere yeni satır eklenmez; öğrenci ödemeleri Tahsilat Takip&rsquo;e defterdeki tarihle &ldquo;ödendi&rdquo; olarak işlenir, elle işaretlenmiş ödemelerin tarihi düzeltilir.</>
            : <>Bankadan indirdiğiniz ekstre dosyasını (.xlsx / .xls / .csv) yükleyin — sütunlar otomatik tanınır. Öğrenci ödemeleri Tahsilat Takip&rsquo;e ekstredeki tarihle &ldquo;ödendi&rdquo; olarak işlenir.</>}
        </p>

        {/* Dosya seçimi (defterden eşleştirmede yalnız kaynak gösterilir) */}
        {defterden ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg)', fontSize: 12.5 }}>
            <ListChecks size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{importReading ? 'Defter okunuyor…' : <><strong>{importFileName}</strong> — {Math.max(0, importRows.length - 1)} satır</>}</span>
          </div>
        ) : !importFileName && !importReading ? (
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
        {colCount > 0 && !defterden && (
          <div style={{ marginTop: 12 }}>
            <button type="button" onClick={() => setGelismisAcik(v => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 12.5, fontWeight: 600, padding: '4px 0' }}>
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
                <div style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 8 }}>
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
          const isaretliSayisi = onizleme.filter(r => r.gecerli && r.tur === 'gelir' && r.isaretle).length
          const elleSayisi = onizleme.filter(elleGerekir).length
          const satirlar = onizleme.map((r, idx) => ({ r, idx })).filter(x => !yalnizElle || elleGerekir(x.r))
          return (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <StatPil label="Satır" value={`${gecerli.length}/${onizleme.length}`} />
                <StatPil label="Gelir" value={fmtTL(gImp)} color="var(--success)" />
                <StatPil label="Gider" value={fmtTL(gdImp)} color="var(--danger)" />
                {atlanacak > 0 && <StatPil label="Atlanacak" value={String(atlanacak)} color="var(--warn)" />}
                {isaretliSayisi > 0 && <StatPil label="Ödendi işaretlenecek" value={String(isaretliSayisi)} color="var(--accent)" />}
                {elleSayisi > 0 && <StatPil label="Elle işaretlenecek" value={String(elleSayisi)} color="var(--warn)" />}
              </div>
              {ogrencilerSirali.length > 0 && elleSayisi > 0 && (
                <div className="alert alert-warn" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, fontSize: 12.5 }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ flex: 1 }}>
                    <strong>{elleSayisi} gelir satırı ekstreden okunamadı.</strong> Öğrenci ya da ödeme türü kesin anlaşılamadı (kardeş ödemesi, birleşik ödeme, açıklamasız havale…).
                    Sarı satırlardaki rozete tıklayıp öğrenciyi ve ödeme türünü seçin; seçmezseniz aktarımdan sonra bu satırları Tahsilat Takip&rsquo;ten <strong>elle işaretlemeniz</strong> gerekir.
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', cursor: 'pointer' }}>
                    <input type="checkbox" checked={yalnizElle} onChange={e => setYalnizElle(e.target.checked)} /> Yalnız bunları göster
                  </label>
                </div>
              )}
              {ogrencilerSirali.length > 0 && (
                <div style={{ fontSize: 12.5, color: 'var(--text3)', marginBottom: 10, lineHeight: 1.5 }}>
                  Açıklamadan tahmin edilen öğrenci ve ödeme türü sağdaki rozette görünür — tıklayıp düzeltebilir veya kaldırabilirsiniz. Yalnız ✓ işaretli satırlar Tahsilat Takip&rsquo;e işlenir; ödeme tarihi ekstredeki tarihtir.
                </div>
              )}
              <div style={{ maxHeight: 360, overflowY: 'auto', overflowX: 'hidden', border: '1px solid var(--border)', borderRadius: 8 }}>
                <table className="data-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: 30 }} />
                    <col style={{ width: 78 }} />
                    <col style={{ width: 60 }} />
                    <col />
                    <col style={{ width: 88 }} />
                    <col style={{ width: 200 }} />
                    <col style={{ width: 30 }} />
                  </colgroup>
                  <thead><tr>
                    <th style={{ padding: '9px 4px' }}></th>
                    <th style={{ padding: '9px 6px' }}>Tarih</th>
                    <th style={{ textAlign: 'center', padding: '9px 4px' }}>Tür</th>
                    <th>Açıklama</th>
                    <th className="td-num" style={{ padding: '9px 6px' }}>Tutar (₺)</th>
                    <th style={{ padding: '9px 6px' }}>Tahsilat Takip</th>
                    <th style={{ padding: '9px 4px' }}></th>
                  </tr></thead>
                  <tbody>
                    {satirlar.map(({ r, idx }) => {
                      const elle = elleGerekir(r) && ogrencilerSirali.length > 0
                      const ilk = r.parcalar[0]
                      const cok = r.parcalar.length > 1
                      return (
                        <tr key={idx} style={!r.gecerli || elle ? { background: 'var(--warn-light)' } : undefined}>
                          <td style={{ textAlign: 'center', padding: '9px 4px' }}>{r.gecerli ? <CheckCircle2 size={15} color="var(--success)" /> : <AlertTriangle size={15} color="var(--warn)" />}</td>
                          <td style={{ fontSize: 12, padding: '9px 6px' }}>{r.tarih ? tarihFmt(r.tarih) : <span style={{ color: 'var(--danger)', fontSize: 12 }}>geçersiz</span>}</td>
                          <td style={{ textAlign: 'center', padding: '9px 4px' }}>
                            <button
                              onClick={() => setOnizleme(o => o ? o.map((x, i) => i === idx ? { ...x, tur: x.tur === 'gelir' ? 'gider' : 'gelir' } : x) : o)}
                              className={`badge ${r.tur === 'gelir' ? 'badge-green' : 'badge-red'}`}
                              style={{ border: 'none', cursor: 'pointer', padding: '2px 6px', fontSize: 11.5 }}
                              title="Gelir/Gider değiştir"
                            >{r.tur === 'gelir' ? 'Gelir' : 'Gider'}</button>
                          </td>
                          <td style={{ fontSize: 12, whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word', padding: '8px 6px' }}>
                            <div>{r.aciklama || '—'}</div>
                            {r.belge && <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 2 }}>Belge: {r.belge}</div>}
                            {elle && <div style={{ fontSize: 11.5, color: 'var(--warn-dark)', marginTop: 3, fontWeight: 600 }}>⚠ {r.uyari || 'Eşleştirilmedi'} — elle işaretleyin</div>}
                          </td>
                          <td className="td-num" style={{ fontSize: 12, padding: '9px 6px' }}>{isNaN(r.tutar) ? '—' : fmtTL(r.tutar)}</td>
                          <td style={{ padding: '6px', textAlign: 'center' }}>
                            {r.tur !== 'gelir' ? (
                              <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>
                            ) : r.odemeDegil && !ilk?.ogrenciId ? (
                              <button onClick={e => setEslesmePop({ idx, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() })}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 11.5 }} title="Öğrenci ödemesi değil (iade/devir) — yine de eşleştirmek için tıklayın">öğrenci ödemesi değil</button>
                            ) : (
                              <button
                                onClick={e => setEslesmePop({ idx, rect: (e.currentTarget as HTMLElement).getBoundingClientRect() })}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 5, maxWidth: '100%', textAlign: 'left',
                                  padding: '4px 9px', borderRadius: 12, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                                  border: `1px solid ${r.isaretle ? 'var(--success-border)' : elle ? '#e0b45c' : 'var(--border)'}`,
                                  background: r.isaretle ? 'var(--success-light)' : 'var(--surface)',
                                  color: r.isaretle ? '#1a7a3a' : elle ? 'var(--warn-dark)' : 'var(--text3)',
                                }}
                                title={r.uyari ? `${r.uyari} — düzenlemek için tıklayın` : 'Öğrenci eşleştirmesini düzenle'}
                              >
                                {r.isaretle ? <CheckCircle2 size={12} style={{ flexShrink: 0 }} /> : ilk?.ogrenciId ? <Circle size={12} style={{ flexShrink: 0 }} /> : <UserCheck size={12} style={{ flexShrink: 0 }} />}
                                <span style={{ overflow: 'hidden', minWidth: 0 }}>
                                  {!ilk?.ogrenciId && !cok
                                    ? <span style={{ display: 'block' }}>Elle eşleştir</span>
                                    : r.parcalar.map((p, j) => (
                                      <span key={j} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: j ? 3 : 0 }}>
                                        {(j === 0 || p.ogrenciId !== r.parcalar[j - 1].ogrenciId) && <span style={{ display: 'block' }}>{p.ogrenciId ? (ogrenciAdMap.get(p.ogrenciId) || '—') : 'öğrenci seçilmedi'}</span>}
                                        <span style={{ fontWeight: 500, opacity: 0.85 }}>{hedefAdi(p.hedef) || 'tür seçilmedi'}{p.ay ? ` · ${AYLAR[p.ay]}` : ''}{cok ? ` · ${fmtTL(p.tutar)}` : ''}</span>
                                      </span>
                                    ))}
                                  {r.tutaraGore && <span style={{ display: 'block', fontWeight: 500, opacity: 0.7 }}>(tutara göre)</span>}
                                </span>
                              </button>
                            )}
                          </td>
                          <td style={{ textAlign: 'center', padding: '9px 4px' }}>
                            <button onClick={() => { setOnizleme(o => o ? o.filter((_, i) => i !== idx) : o); setEslesmePop(null) }} title="Satırı çıkar" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text3)' }}><X size={14} /></button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })()}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={() => setImportOpen(false)} disabled={importSaving}>İptal</button>
          <button className="btn btn-primary" onClick={importKaydet} disabled={importSaving || !onizleme || !onizleme.some(r => r.gecerli)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Save size={15} /> {importSaving ? 'Kaydediliyor...' : defterden ? 'Tahsilat Takip’e İşle' : 'İçe Aktar'}
          </button>
        </div>
        </>}
      </div>
    </div>
  )
}

function SonucGorunumu({ sonuc, kapat }: { sonuc: ImportSonuc; kapat: () => void }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {!sonuc.defterden && <StatPil label="Deftere eklenen" value={String(sonuc.hareket)} color="var(--success)" />}
        {sonuc.mukerrer > 0 && <StatPil label="Defterde zaten vardı" value={String(sonuc.mukerrer)} />}
        <StatPil label="Ödendi işaretlenen" value={String(sonuc.isaretlenen)} color="var(--accent)" />
        {sonuc.tarihiGuncellenen > 0 && <StatPil label="Tarihi ekstreden düzeltilen" value={String(sonuc.tarihiGuncellenen)} color="var(--accent)" />}
        {sonuc.zatenVardi > 0 && <StatPil label="Zaten işaretliydi" value={String(sonuc.zatenVardi)} />}
        {sonuc.taksitAcilan > 0 && <StatPil label="Kısmi ödemeye taksit açıldı" value={String(sonuc.taksitAcilan)} color="var(--accent)" />}
        {sonuc.hata > 0 && <StatPil label="Hata" value={String(sonuc.hata)} color="var(--danger)" />}
      </div>
      {sonuc.elle.length > 0 ? (
        <>
          <div className="alert alert-warn" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12.5, marginBottom: 10 }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <div><strong>{sonuc.elle.length} ödeme Tahsilat Takip&rsquo;e işlenemedi — elle işaretleyin.</strong> Bu satırlar işletme defterinde; daha önce elle işaretlemediyseniz öğrencinin ödemesini Tahsilat Takip ekranından aşağıdaki tarih ve tutarla işaretleyin.</div>
          </div>
          <div style={{ maxHeight: 340, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead><tr><th style={{ width: 84 }}>Tarih</th><th>Açıklama</th><th className="td-num" style={{ width: 96 }}>Tutar (₺)</th><th style={{ width: 220 }}>Neden</th></tr></thead>
              <tbody>
                {sonuc.elle.map((e, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 12 }}>{tarihFmt(e.tarih)}</td>
                    <td style={{ fontSize: 12, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{e.aciklama || '—'}</td>
                    <td className="td-num" style={{ fontSize: 12 }}>{fmtTL(e.tutar)}</td>
                    <td style={{ fontSize: 12.5, color: 'var(--warn-dark)' }}>{e.neden}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="alert alert-success" style={{ fontSize: 12.5 }}>Tüm öğrenci ödemeleri Tahsilat Takip&rsquo;e işlendi.</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
        <button className="btn btn-primary" onClick={kapat}>Tamam</button>
      </div>
    </div>
  )
}
