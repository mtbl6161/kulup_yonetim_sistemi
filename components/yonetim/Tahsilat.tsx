'use client'
import { useMemo, useState } from 'react'
import { Search, FileSpreadsheet } from 'lucide-react'
import { sayiCoz } from '@/components/SayiInput'
import { excelIndir, bugunEtiketi } from '@/lib/excel'
import type { Ortak } from './YonetimKonsolu'
import { Bos, Filtre, isoGun, lisansBilgisi, tarih, tl } from './ortak'
import type { OdemeSatir } from './ortak'

type Donem = 'buay' | 'gecenay' | 'buyil' | 'hepsi'
const YONTEMLER = ['Havale', 'Kredi Kartı', 'Nakit', 'Diğer']

export default function Tahsilat({ api, bildir, kurumlar, odemeler, yukleniyor, secili, yenile }: Ortak & {
  odemeler: OdemeSatir[]; secili: number | null; yenile: () => Promise<void>
}) {
  const [simdi] = useState(() => Date.now())
  const [ara, setAra] = useState('')
  const [donem, setDonem] = useState<Donem>('buay')
  const [yontem, setYontem] = useState('')

  const bugun = new Date(simdi)
  const donemde = (s: string, d: Donem) => {
    const t = new Date(s)
    if (d === 'hepsi') return true
    if (d === 'buyil') return t.getFullYear() === bugun.getFullYear()
    const hedef = new Date(bugun.getFullYear(), bugun.getMonth() - (d === 'gecenay' ? 1 : 0), 1)
    return t.getFullYear() === hedef.getFullYear() && t.getMonth() === hedef.getMonth()
  }
  const toplam = (l: OdemeSatir[]) => l.reduce((s, o) => s + Number(o.tutar || 0), 0)

  const liste = useMemo(() => {
    const q = ara.toLocaleLowerCase('tr').trim()
    return odemeler.filter(o => donemde(o.odeme_tarihi, donem) && (!yontem || o.odeme_yontemi === yontem) &&
      (!q || `${o.okullar?.ad || ''} ${o.aciklama || ''}`.toLocaleLowerCase('tr').includes(q)))
  // eslint-disable-next-line react-hooks/exhaustive-deps -- donemde yalnızca simdi'ye bağlı
  }, [odemeler, ara, donem, yontem, simdi])

  const buAy = odemeler.filter(o => donemde(o.odeme_tarihi, 'buay'))
  const buYil = odemeler.filter(o => donemde(o.odeme_tarihi, 'buyil'))
  const bekleyen = kurumlar.filter(k => lisansBilgisi(k, simdi).tur === 'doldu').length
  const DONEM_AD: Record<Donem, string> = { buay: 'Bu ay', gecenay: 'Geçen ay', buyil: 'Bu yıl', hepsi: 'Tüm zamanlar' }

  const excel = () => excelIndir(`Abonelik_Odemeleri_${bugunEtiketi()}`, 'Ödemeler', ['Tarih', 'Kurum', 'Yöntem', 'Açıklama', 'Tutar (TL)'],
    liste.map(o => [tarih(o.odeme_tarihi), o.okullar?.ad, o.odeme_yontemi, o.aciklama, Number(o.tutar)]))

  return (
    <>
      <section aria-label="Özet" className="yk-kpi" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <div><div className="ad">Bu ay</div><div className="deger">{yukleniyor ? '…' : tl(toplam(buAy))}</div><div className="alt">{buAy.length} ödeme</div></div>
        <div><div className="ad">{bugun.getFullYear()} toplamı</div><div className="deger">{yukleniyor ? '…' : tl(toplam(buYil))}</div><div className="alt">{buYil.length} ödeme</div></div>
        <div><div className="ad">Ödeme bekleyen</div><div className="deger" style={{ color: bekleyen ? 'var(--danger)' : undefined }}>{yukleniyor ? '…' : `${bekleyen} kurum`}</div><div className="alt">lisansı dolmuş</div></div>
      </section>

      <div className="yk-iki">
        <div className="genis">
          <div className="yk-arac">
            <label className="yk-ara"><Search size={15} aria-hidden="true" color="var(--text3)" /><input type="search" placeholder="Kurum veya açıklama" aria-label="Ödeme ara" value={ara} onChange={e => setAra(e.target.value)} /></label>
            <Filtre etiket="Dönem" deger={donem} onDegis={setDonem} secenekler={(['buay', 'gecenay', 'buyil', 'hepsi'] as Donem[]).map(d => ({ id: d, ad: DONEM_AD[d] }))} />
            <select className="form-select" aria-label="Yöntem" style={{ width: 150, minHeight: 34 }} value={yontem} onChange={e => setYontem(e.target.value)}>
              <option value="">Tüm yöntemler</option>{YONTEMLER.map(y => <option key={y}>{y}</option>)}
            </select>
            <button type="button" className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={excel} disabled={!liste.length}><FileSpreadsheet size={14} aria-hidden="true" /> Excel</button>
          </div>
          <section className="yk-kart" style={{ overflow: 'hidden' }}>
            {liste.length === 0 ? <Bos>{yukleniyor ? 'Yükleniyor…' : 'Bu dönemde ödeme yok.'}</Bos> : (
              <div className="yk-tablo">
                <table className="data-table" style={{ minWidth: 620 }}>
                  <thead><tr><th>Tarih</th><th>Kurum</th><th>Yöntem</th><th>Açıklama</th><th className="td-num">Tutar</th></tr></thead>
                  <tbody>
                    {liste.map(o => (
                      <tr key={o.id}>
                        <td className="font-mono" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{tarih(o.odeme_tarihi)}</td>
                        <td style={{ fontWeight: 600 }}>{o.okullar?.ad || '—'}</td>
                        <td>{o.odeme_yontemi}</td>
                        <td style={{ color: 'var(--text3)' }}>{o.aciklama || '—'}</td>
                        <td className="td-num" style={{ fontWeight: 600 }}>{tl(Number(o.tutar))}</td>
                      </tr>
                    ))}
                    <tr className="sum-row"><td colSpan={4}>{DONEM_AD[donem]} · {liste.length} ödeme</td><td className="td-num">{tl(toplam(liste))}</td></tr>
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
        <div className="dar" style={{ maxWidth: 400 }}>
          <OdemeFormu key={secili ?? 0} api={api} bildir={bildir} kurumlar={kurumlar} varsayilan={secili} simdi={simdi} yenile={yenile} />
        </div>
      </div>
    </>
  )
}

function OdemeFormu({ api, bildir, kurumlar, varsayilan, simdi, yenile }: Pick<Ortak, 'api' | 'bildir' | 'kurumlar'> & {
  varsayilan: number | null; simdi: number; yenile: () => Promise<void>
}) {
  const [okulId, setOkulId] = useState<number | 0>(varsayilan || 0)
  const [tutar, setTutar] = useState('')
  const [gun, setGun] = useState(isoGun(new Date(simdi)))
  const [yontem, setYontem] = useState('Havale')
  const [aciklama, setAciklama] = useState('')
  const [uzat, setUzat] = useState<'yok' | 'ay' | 'yil'>('yil')
  const [kaydediliyor, setKaydediliyor] = useState(false)

  // Lisansı dolmuş kurumlar listenin başında
  const sirali = useMemo(() => [...kurumlar].sort((a, b) => {
    const da = lisansBilgisi(a, simdi).tur === 'doldu' ? 0 : 1, db = lisansBilgisi(b, simdi).tur === 'doldu' ? 0 : 1
    return da - db || a.ad.localeCompare(b.ad, 'tr')
  }), [kurumlar, simdi])
  const kurum = kurumlar.find(k => k.id === okulId)
  const tutarSayi = sayiCoz(tutar)

  const yeniBitis = (() => {
    if (!kurum || uzat === 'yok') return null
    const mevcut = kurum.lisansBitis ? new Date(kurum.lisansBitis.slice(0, 10) + 'T12:00:00') : null
    const d = mevcut && mevcut.getTime() > simdi ? mevcut : new Date(simdi)
    const y = new Date(d); y.setMonth(y.getMonth() + (uzat === 'yil' ? 12 : 1))
    return isoGun(y)
  })()

  async function kaydet(e: React.FormEvent) {
    e.preventDefault()
    if (!kurum || !tutarSayi || tutarSayi <= 0) return
    setKaydediliyor(true)
    const r = await api('/api/admin/odemeler', { method: 'POST', govde: { okul_id: kurum.id, tutar: tutarSayi, odeme_tarihi: gun, odeme_yontemi: yontem, aciklama: aciklama.trim() || null } })
    if (!r.ok) { setKaydediliyor(false); bildir({ tur: 'hata', metin: 'Ödeme kaydedilemedi: ' + r.hata }); return }
    let mesaj = `${kurum.ad} için ${tl(tutarSayi)} kaydedildi.`
    if (yeniBitis) {
      const l = await api('/api/admin/kullanici', { method: 'PUT', govde: { okulId: kurum.id, lisansBitis: yeniBitis, odemeDurumu: 'aktif' } })
      mesaj += l.ok ? ` Lisans ${tarih(yeniBitis)} tarihine uzatıldı.` : ` Lisans uzatılamadı (${l.hata}); kurum detayından uzatın.`
    }
    bildir({ tur: 'basari', metin: mesaj })
    setTutar(''); setAciklama('')
    await yenile()
    setKaydediliyor(false)
  }

  return (
    <section className="yk-kart">
      <form onSubmit={kaydet} style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Ödeme kaydet</h2>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text3)' }}>Kayıt sonrası kurum aktif olur ve hesabının engeli kalkar.</p>
        </div>
        <label><span className="form-label">Kurum</span>
          <select className="form-select" value={okulId} onChange={e => setOkulId(Number(e.target.value))} required>
            <option value={0}>Seçin…</option>
            {sirali.map(k => { const l = lisansBilgisi(k, simdi); return <option key={k.id} value={k.id}>{k.ad} — {l.etiket}</option> })}
          </select>
        </label>
        <div className="yk-grid2">
          <label><span className="form-label">Tutar (₺)</span><input className="form-input" inputMode="decimal" placeholder="4.320" value={tutar} onChange={e => setTutar(e.target.value)} required /></label>
          <label><span className="form-label">Tarih</span><input className="form-input" type="date" value={gun} onChange={e => setGun(e.target.value)} required /></label>
        </div>
        {tutar && !tutarSayi && <div style={{ fontSize: 12.5, color: 'var(--danger)' }}>Tutar anlaşılamadı. Örnek: 4320 veya 4.320,50</div>}
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="form-label">Yöntem</legend>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {YONTEMLER.map(y => (
              <label key={y} className={`btn btn-sm ${yontem === y ? 'btn-info' : 'btn-secondary'}`} style={{ cursor: 'pointer' }}>
                <input type="radio" name="yontem" value={y} checked={yontem === y} onChange={() => setYontem(y)} style={{ margin: 0 }} /> {y}
              </label>
            ))}
          </div>
        </fieldset>
        <label><span className="form-label">Açıklama</span><input className="form-input" placeholder="Dekont no, dönem…" value={aciklama} onChange={e => setAciklama(e.target.value)} /></label>
        <label><span className="form-label">Lisans</span>
          <select className="form-select" value={uzat} onChange={e => setUzat(e.target.value as typeof uzat)}>
            <option value="yil">1 yıl uzat</option><option value="ay">1 ay uzat</option><option value="yok">Lisansa dokunma</option>
          </select>
          {yeniBitis && <span style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Yeni bitiş: {tarih(yeniBitis)}</span>}
        </label>
        <button type="submit" className="btn btn-primary" disabled={!kurum || !tutarSayi || kaydediliyor}>{kaydediliyor ? 'Kaydediliyor…' : 'Ödemeyi kaydet'}</button>
      </form>
    </section>
  )
}
