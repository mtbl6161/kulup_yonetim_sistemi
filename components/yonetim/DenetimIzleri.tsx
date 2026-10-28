'use client'
import { useCallback, useState } from 'react'
import { Search, RefreshCw } from 'lucide-react'
import { useYukleme } from '@/lib/useYukleme'
import type { Ortak } from './YonetimKonsolu'
import { BOLUM_ETIKET, Bos, ISLEM_ETIKET, Sayfalama } from './ortak'
import type { LogSatir } from './ortak'

const BOYUT = 50

export default function DenetimIzleri({ api, bildir, kurumlar }: Ortak) {
  const [loglar, setLoglar] = useState<LogSatir[] | null>(null)
  const [toplam, setToplam] = useState(0)
  const [sayfa, setSayfa] = useState(1)
  const [okul, setOkul] = useState('')
  const [islem, setIslem] = useState('')
  const [tablo, setTablo] = useState('')
  const [ara, setAra] = useState('')
  const [aranan, setAranan] = useState('')   // yalnızca Enter / Ara ile sorgulanır

  const yukle = useCallback(async () => {
    const p = new URLSearchParams({ limit: String(BOYUT), sayfa: String(sayfa) })
    if (okul) p.set('okul_id', okul)
    if (islem) p.set('islem', islem)
    if (tablo) p.set('tablo', tablo)
    if (aranan) p.set('q', aranan)
    setLoglar(null)
    const r = await api<{ loglar: LogSatir[]; toplam: number }>(`/api/admin/audit?${p}`)
    if (!r.ok) { bildir({ tur: 'hata', metin: 'Kayıtlar yüklenemedi: ' + r.hata }); setLoglar([]); return }
    setLoglar(r.veri?.loglar || []); setToplam(r.veri?.toplam || 0)
  }, [api, bildir, sayfa, okul, islem, tablo, aranan])
  useYukleme(yukle)

  const degis = (fn: (v: string) => void) => (v: string) => { fn(v); setSayfa(1) }
  const zaman = (s: string) => new Date(s).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

  return (
    <section className="yk-kart" style={{ overflow: 'hidden' }}>
      <div className="yk-kart-bas">
        <form className="yk-arac" style={{ flex: 1 }} onSubmit={e => { e.preventDefault(); setAranan(ara.trim()); setSayfa(1) }}>
          <label className="yk-ara"><Search size={15} aria-hidden="true" color="var(--text3)" /><input type="search" placeholder="Açıklamada ara, Enter" aria-label="Açıklamada ara" value={ara} onChange={e => { setAra(e.target.value); if (!e.target.value) { setAranan(''); setSayfa(1) } }} /></label>
          <select className="form-select" aria-label="Kurum" style={{ width: 200, minHeight: 34 }} value={okul} onChange={e => degis(setOkul)(e.target.value)}>
            <option value="">Tüm kurumlar</option>{kurumlar.map(k => <option key={k.id} value={k.id}>{k.ad}</option>)}
          </select>
          <select className="form-select" aria-label="İşlem" style={{ width: 150, minHeight: 34 }} value={islem} onChange={e => degis(setIslem)(e.target.value)}>
            <option value="">Tüm işlemler</option>{Object.entries(ISLEM_ETIKET).map(([k, v]) => <option key={k} value={k}>{v.etiket}</option>)}
          </select>
          <select className="form-select" aria-label="Bölüm" style={{ width: 160, minHeight: 34 }} value={tablo} onChange={e => degis(setTablo)(e.target.value)}>
            <option value="">Tüm bölümler</option>{Object.entries(BOLUM_ETIKET).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button type="button" className="btn btn-secondary btn-sm btn-icon" onClick={yukle} aria-label="Yenile" title="Yenile"><RefreshCw size={14} /></button>
        </form>
      </div>
      {loglar === null ? <Bos>Yükleniyor…</Bos> : loglar.length === 0 ? <Bos>Bu filtreyle kayıt yok.</Bos> : (
        <div className="yk-tablo">
          <table className="data-table" style={{ minWidth: 760 }}>
            <thead><tr><th>Zaman</th><th>İşlem</th><th>Bölüm</th><th>Kurum</th><th>Açıklama</th></tr></thead>
            <tbody>
              {loglar.map(l => {
                const i = ISLEM_ETIKET[l.islem] || { etiket: l.islem, rozet: 'badge-gray' }
                return (
                  <tr key={l.id}>
                    <td className="font-mono" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{zaman(l.created_at)}</td>
                    <td><span className={`badge ${i.rozet}`}>{i.etiket}</span></td>
                    <td>{BOLUM_ETIKET[l.tablo] || l.tablo}</td>
                    <td style={{ fontWeight: 600 }}>{l.okullar?.ad || 'Sistem'}</td>
                    <td style={{ color: 'var(--text2)' }}>{l.aciklama}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {toplam > BOYUT && <Sayfalama sayfa={sayfa} toplam={toplam} boyut={BOYUT} onSayfa={setSayfa} />}
    </section>
  )
}
