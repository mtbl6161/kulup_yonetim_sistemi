'use client'
import { useMemo, useState } from 'react'
import { pdfHazirla, pdfBaslik, pdfTablo, pdfAc } from '@/lib/pdf'
import { useYukleme } from '@/lib/useYukleme'
import { hataMesaji } from '@/lib/hata'
import { fmtTL, tarihFmt } from '@/lib/hesaplama'
import { birimKurumAdi, type Ayarlar, type Ogrenci } from '@/lib/types'
import { perdeKapat } from '@/lib/perdeKapat'
import { useAuth } from '@/lib/AuthContext'
import { Download, X, Files } from 'lucide-react'
import { overlay, bugunISO } from './yardimcilar'
import { ogrenciDokumu, bekleyenAdi, type Dokum } from './ogrenciDokumu'
import { dokumSayfasi, dokumVerisiYukle, ogrenciVerisi, type DokumVerisi } from './dokumPdf'
import OgrenciDokumuModal, { varsayilanEgitimYili } from './OgrenciDokumuModal'

/** Tüm öğrencilerin ya da seçilen sınıfın ödeme dökümü: özet tablo, özet PDF ve öğrenci başına bir sayfa toplu PDF */
export default function TopluDokumModal({ ogrenciler, baslik, kapat }: { ogrenciler: Ogrenci[]; baslik: string; kapat: () => void }) {
  const [sinif, setSinif] = useState('')
  const siniflar = useMemo(() => Array.from(new Set(ogrenciler.map(o => o.sinif || ''))).filter(Boolean).sort((a, b) => a.localeCompare(b, 'tr', { numeric: true })), [ogrenciler])
  const { okul } = useAuth()
  const [egitimYili, setEgitimYili] = useState(varsayilanEgitimYili)
  const [ayarlar, setAyarlar] = useState<Ayarlar | null>(null)
  const [veri, setVeri] = useState<DokumVerisi | null>(null)
  const [hata, setHata] = useState('')
  const [yalnizBorclu, setYalnizBorclu] = useState(false)
  const [secili, setSecili] = useState<Ogrenci | null>(null)
  const [pdfMsg, setPdfMsg] = useState('')
  const [bugun] = useState(bugunISO)
  const kurumAdi = birimKurumAdi('okul', ayarlar, okul?.ad)

  useYukleme(async () => {
    try {
      setVeri(null); setHata('')
      const v = await dokumVerisiYukle(egitimYili, okul?.id)
      setAyarlar(v.ayarlar)
      setVeri(v)
    } catch (err) { setHata(hataMesaji(err, 'Dökümler yüklenemedi')) }
  }, [egitimYili])

  // Sınıf, sonra ad sırasıyla her öğrencinin dökümü
  const satirlar = useMemo<{ o: Ogrenci; d: Dokum }[]>(() => {
    if (!veri) return []
    return ogrenciler.filter(o => !sinif || o.sinif === sinif)
      .sort((a, b) => (a.sinif || '').localeCompare(b.sinif || '', 'tr', { numeric: true }) || `${a.ad} ${a.soyad}`.localeCompare(`${b.ad} ${b.soyad}`, 'tr'))
      .map(o => ({ o, d: ogrenciDokumu({ ogrenci: o, ...ogrenciVerisi(veri, o.id), egitimYili, bugun }) }))
  }, [veri, ogrenciler, sinif, egitimYili, bugun])
  const gorunen = yalnizBorclu ? satirlar.filter(x => x.d.bekleyenler.length > 0) : satirlar
  const toplam = gorunen.reduce((t, x) => ({ odenen: t.odenen + x.d.toplamOdenen, bekleyen: t.bekleyen + x.d.toplamBekleyen }), { odenen: 0, bekleyen: 0 })
  const ey = `${egitimYili}-${egitimYili + 1}`
  const kapsam = sinif ? `${sinif} sınıfı` : baslik

  async function ozetPdf() {
    setPdfMsg('PDF hazırlanıyor…')
    try {
      const { pdf, autoTable } = await pdfHazirla('portrait')
      const y = pdfBaslik(pdf, { kurum: kurumAdi, baslik: `${kapsam} · Öğrenci Ödeme Dökümleri`, alt: `${ey} Eğitim Öğretim Yılı · ${gorunen.length} öğrenci · Düzenlenme: ${tarihFmt(bugun)}` })
      autoTable(pdf, pdfTablo({
        startY: y,
        head: [['Sıra', 'Adı Soyadı', 'Sınıfı', 'Ödenen (₺)', 'Bekleyen kalemler', 'Bekleyen (₺)']],
        body: gorunen.map((x, i) => [String(i + 1), `${x.o.ad} ${x.o.soyad}`, x.o.sinif || '—', fmtTL(x.d.toplamOdenen), x.d.bekleyenler.map(bekleyenAdi).join('\n') || '—', x.d.toplamBekleyen ? fmtTL(x.d.toplamBekleyen) : '']),
        foot: [[{ content: 'TOPLAM', colSpan: 3, styles: { halign: 'right' } }, { content: fmtTL(toplam.odenen), styles: { halign: 'right' } }, '', { content: fmtTL(toplam.bekleyen), styles: { halign: 'right' } }]],
        columnStyles: { 0: { cellWidth: 9, halign: 'center' }, 1: { cellWidth: 40 }, 2: { cellWidth: 14, halign: 'center' }, 3: { cellWidth: 24, halign: 'right' }, 4: { fontSize: 6.8 }, 5: { cellWidth: 24, halign: 'right' } },
      }))
      pdfAc(pdf, 'Öğrenci ödeme dökümleri özeti')
      setPdfMsg('')
    } catch (err) { setPdfMsg('PDF oluşturulamadı: ' + hataMesaji(err, 'Bilinmiyor')) }
  }

  async function tumDokumlerPdf() {
    setPdfMsg(`${gorunen.length} öğrencinin dökümü hazırlanıyor…`)
    try {
      const { pdf, autoTable } = await pdfHazirla('portrait')
      gorunen.forEach((x, i) => {
        if (i > 0) pdf.addPage()
        dokumSayfasi(pdf, autoTable, { kurumAdi, ayarlar, ogrenci: x.o, dokum: x.d, egitimYili, bugun })
      })
      pdfAc(pdf, 'Öğrenci ödeme dökümleri')
      setPdfMsg('')
    } catch (err) { setPdfMsg('PDF oluşturulamadı: ' + hataMesaji(err, 'Bilinmiyor')) }
  }

  return (
    <>
    <div style={{ ...overlay, zIndex: 1050 }} {...perdeKapat(kapat)}>
      <div className="card" style={{ width: '100%', maxWidth: 1000, maxHeight: '92vh', overflowY: 'auto', padding: '20px 22px', marginBottom: 0 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <Files size={20} color="var(--accent)" />
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, flex: 1 }}>Öğrenci Ödeme Dökümleri</h2>
          <select className="form-select" aria-label="Sınıf" value={sinif} onChange={e => setSinif(e.target.value)} style={{ width: 'auto', minHeight: 32 }}>
            <option value="">Tüm öğrenciler ({ogrenciler.length})</option>
            {siniflar.map(s => <option key={s} value={s}>{s} sınıfı ({ogrenciler.filter(o => o.sinif === s).length})</option>)}
          </select>
          <select className="form-select" aria-label="Eğitim yılı" value={egitimYili} onChange={e => setEgitimYili(Number(e.target.value))} style={{ width: 'auto', minHeight: 32 }}>
            {[varsayilanEgitimYili() - 1, varsayilanEgitimYili(), varsayilanEgitimYili() + 1].map(y => <option key={y} value={y}>{y}-{y + 1}</option>)}
          </select>
          <button onClick={kapat} aria-label="Kapat" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text3)' }}><X size={20} /></button>
        </div>

        {hata ? <div className="alert alert-danger">{hata}</div> : !veri ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Dökümler hazırlanıyor...</div> : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <span style={{ fontSize: 12.5, color: 'var(--text2)' }}>
                <strong>{gorunen.length}</strong> öğrenci · Ödenen <strong>{fmtTL(toplam.odenen)}</strong> · Bekleyen <strong style={{ color: toplam.bekleyen ? 'var(--danger)' : undefined }}>{fmtTL(toplam.bekleyen)}</strong>
              </span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text2)', cursor: 'pointer' }}>
                <input type="checkbox" checked={yalnizBorclu} onChange={e => setYalnizBorclu(e.target.checked)} /> Yalnız ödenmemiş kalemi olanlar
              </label>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={ozetPdf} disabled={!gorunen.length} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Download size={14} /> Özet listeyi yazdır</button>
                <button className="btn btn-pdf btn-sm" onClick={tumDokumlerPdf} disabled={!gorunen.length} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Download size={14} /> Tüm dökümleri yazdır</button>
              </div>
            </div>
            {pdfMsg && <div className="alert alert-info" style={{ marginBottom: 10 }}>{pdfMsg}</div>}
            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead><tr><th style={{ width: 40 }}>No</th><th>Adı Soyadı</th><th>Sınıfı</th><th className="td-num">Ödenen</th><th>Bekleyen kalemler</th><th className="td-num">Bekleyen</th></tr></thead>
                <tbody>
                  {gorunen.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text3)', padding: 18 }}>Öğrenci yok.</td></tr>
                    : gorunen.map((x, i) => (
                      <tr key={x.o.id}>
                        <td style={{ color: 'var(--text3)' }}>{i + 1}</td>
                        <td><button type="button" onClick={() => setSecili(x.o)} title="Ödeme dökümünü aç" style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontWeight: 700, fontSize: 'inherit', color: 'var(--accent)', textAlign: 'left' }}>{x.o.ad} {x.o.soyad}</button></td>
                        <td>{x.o.sinif || '—'}</td>
                        <td className="td-num" style={{ whiteSpace: 'nowrap' }}>{fmtTL(x.d.toplamOdenen)}</td>
                        <td style={{ fontSize: 12.5, whiteSpace: 'normal' }}>
                          {x.d.bekleyenler.length
                            ? x.d.bekleyenler.map((b, j) => <div key={j} style={{ color: 'var(--danger)' }}>{bekleyenAdi(b)}{b.tutar != null ? <span style={{ color: 'var(--text3)' }}> · {fmtTL(b.tutar)}</span> : null}</div>)
                            : <span style={{ color: 'var(--text3)' }}>—</span>}
                        </td>
                        <td className="td-num" style={{ color: x.d.toplamBekleyen ? 'var(--danger)' : undefined, whiteSpace: 'nowrap', fontWeight: 700 }}>{x.d.toplamBekleyen ? fmtTL(x.d.toplamBekleyen) : ''}</td>
                      </tr>
                    ))}
                </tbody>
                {gorunen.length > 0 && (
                  <tfoot>
                    <tr style={{ background: 'var(--surface2)' }}>
                      <td colSpan={3} style={{ textAlign: 'right', fontWeight: 800 }}>Toplam</td>
                      <td className="td-num" style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{fmtTL(toplam.odenen)}</td>
                      <td />
                      <td className="td-num" style={{ fontWeight: 800, color: toplam.bekleyen ? 'var(--danger)' : undefined, whiteSpace: 'nowrap' }}>{fmtTL(toplam.bekleyen)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text3)', margin: '10px 0 0' }}>&ldquo;Tüm dökümleri yazdır&rdquo; her öğrenci için ayrı sayfa açar; öğrenciye ya da veliye verilecek sayfa oradan ayrılabilir. Ödenmemiş aylık kulüp ücreti, Aidat Takibi&rsquo;ndeki gibi o ayın iş günü × günlük saat × saat ücretiyle hesaplanır.</p>
          </>
        )}
      </div>
    </div>
    {secili && <OgrenciDokumuModal ogrenci={secili} kapat={() => setSecili(null)} />}
    </>
  )
}
