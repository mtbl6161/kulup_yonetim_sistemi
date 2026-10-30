'use client'
import { useMemo, useState } from 'react'
import { Megaphone, Send, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { OkulBildirimi } from '@/lib/types'
import { useYukleme } from '@/lib/useYukleme'
import { onayla } from '@/lib/diyalog'
import { hataMesaji } from '@/lib/hata'
import { AYLAR } from '@/lib/hesaplama'

// Denetçi › Duyurular: ilindeki okullara uyarı/duyuru gönderir. Mesaj okulun Genel Bakış sayfasında,
// son tarih geçene ya da okul “Tamam” diyene kadar görünür.
type Okul = { id: number; ad: string; ilce_id: number | null; odeme_durumu?: string; lisans_bitis?: string | null }
type Alici = 'tum' | 'ilce' | 'teslim_almayan'

const tarihSaat = (iso: string) => new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function DenetciDuyurulari({ ilId, ilceler, yil, ay }: { ilId: number; ilceler: { id: number; ad: string }[]; yil: number; ay: number }) {
  const [okullar, setOkullar] = useState<Okul[]>([])
  const [teslimAlmayan, setTeslimAlmayan] = useState<Set<number>>(new Set())
  const [gonderilenler, setGonderilenler] = useState<OkulBildirimi[]>([])
  const [alici, setAlici] = useState<Alici>('tum')
  const [ilceId, setIlceId] = useState<number | null>(null)
  const [haric, setHaric] = useState<Set<number>>(new Set())
  const [baslik, setBaslik] = useState('')
  const [icerik, setIcerik] = useState('')
  const [sonTarih, setSonTarih] = useState('')
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const [msg, setMsg] = useState<{ tip: 'ok' | 'hata'; text: string } | null>(null)

  const yukle = async () => {
    const simdi = new Date()
    const [{ data: ok }, { data: rap }, { data: bil, error }] = await Promise.all([
      supabase.from('okullar').select('id, ad, ilce_id, odeme_durumu, lisans_bitis').eq('il_id', ilId).in('odeme_durumu', ['aktif', 'deneme']).order('ad'),
      supabase.from('denetim_raporlari').select('okul_id').eq('durum', 'imzalandi'),
      supabase.from('okul_bildirimleri').select('*').eq('kaynak', 'duyuru').order('created_at', { ascending: false }).limit(500),
    ])
    if (error) setMsg({ tip: 'hata', text: 'Duyurular yüklenemedi: ' + error.message + ' (Veritabanı güncellemesi yapıldı mı? migration_denetim_raporu.sql)' })
    // Denetim panelindeki okul listesiyle aynı kural: kullanımı geçerli okullar
    setOkullar(((ok || []) as Okul[]).filter(o => {
      const bitis = o.lisans_bitis ? new Date(o.lisans_bitis) : null
      return o.odeme_durumu === 'aktif' ? !bitis || bitis > simdi : !!bitis && bitis > simdi
    }))
    setTeslimAlmayan(new Set((rap || []).map(r => r.okul_id)))
    setGonderilenler(bil || [])
  }
  useYukleme(yukle, [ilId])

  const adaylar = useMemo(() => okullar.filter(o =>
    alici === 'tum' ? true : alici === 'ilce' ? o.ilce_id === ilceId : teslimAlmayan.has(o.id)
  ), [okullar, alici, ilceId, teslimAlmayan])
  const secili = adaylar.filter(o => !haric.has(o.id))

  // Gönderilen duyurular: aynı duyurunun okullara giden kopyaları tek satırda
  const gruplar = useMemo(() => {
    const m = new Map<string, { ornek: OkulBildirimi; sayi: number; okunan: number }>()
    for (const b of gonderilenler) {
      const k = b.grup || String(b.id)
      const g = m.get(k)
      if (g) { g.sayi++; if (b.okundu) g.okunan++ } else m.set(k, { ornek: b, sayi: 1, okunan: b.okundu ? 1 : 0 })
    }
    return [...m.values()]
  }, [gonderilenler])

  function sablon() {
    const son = sonTarih ? tarihSaat(sonTarih) : '…/…/…… ……:……'
    setBaslik('Denetim raporu teslimi')
    setIcerik(`${AYLAR[ay]} ${yil} çocuk kulübü denetim raporunu (EK-6) henüz teslim almayan okullar bulunmaktadır. Raporunuzu en geç ${son} tarihine kadar İl Millî Eğitim Müdürlüğü destek biriminden teslim alınız.`)
    setAlici('teslim_almayan')
    setHaric(new Set())
  }

  async function gonder() {
    if (!baslik.trim() || !icerik.trim()) { setMsg({ tip: 'hata', text: 'Başlık ve mesaj zorunlu.' }); return }
    if (!secili.length) { setMsg({ tip: 'hata', text: 'Alıcı okul seçilmedi.' }); return }
    if (!(await onayla(`Duyuru ${secili.length} okula gönderilsin mi?${sonTarih ? `\n\nSon tarih: ${tarihSaat(sonTarih)}` : ''}`, { baslik: 'Duyuru gönder', onayMetni: 'Gönder', iptalMetni: 'Vazgeç' }))) return
    setGonderiliyor(true)
    setMsg(null)
    try {
      const { data, error } = await supabase.rpc('denetci_duyuru_gonder', {
        p_okul_ids: secili.map(o => o.id), p_baslik: baslik, p_icerik: icerik, p_son_tarih: sonTarih ? new Date(sonTarih).toISOString() : null,
      })
      if (error) throw error
      setMsg({ tip: 'ok', text: `Duyuru ${data} okula gönderildi.` })
      setBaslik(''); setIcerik(''); setSonTarih('')
      await yukle()
    } catch (e) {
      setMsg({ tip: 'hata', text: 'Gönderilemedi: ' + hataMesaji(e) })
    } finally { setGonderiliyor(false) }
  }

  return (
    <div className="dn-sayfa">
      <section className="yk-kart">
        <div className="yk-kart-bas">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Megaphone size={18} /> Okullara duyuru gönder</h2>
          <div className="yk-kart-sag"><button type="button" className="btn btn-secondary btn-sm" onClick={sablon}>Rapor teslimi şablonu</button></div>
        </div>
        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {msg && <div className={`alert ${msg.tip === 'ok' ? 'alert-success' : 'alert-danger'}`}>{msg.text}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div>
              <label className="form-label" htmlFor="dd-alici">Alıcılar</label>
              <select id="dd-alici" className="form-select" value={alici} onChange={e => { setAlici(e.target.value as Alici); setHaric(new Set()) }}>
                <option value="tum">İldeki tüm okullar</option>
                <option value="ilce">Bir ilçedeki okullar</option>
                <option value="teslim_almayan">Denetim raporunu teslim almayanlar</option>
              </select>
            </div>
            {alici === 'ilce' && (
              <div>
                <label className="form-label" htmlFor="dd-ilce">İlçe</label>
                <select id="dd-ilce" className="form-select" value={ilceId ?? ''} onChange={e => { setIlceId(e.target.value ? Number(e.target.value) : null); setHaric(new Set()) }}>
                  <option value="">Seçin</option>
                  {ilceler.map(i => <option key={i.id} value={i.id}>{i.ad}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="form-label" htmlFor="dd-son">Son tarih ve saat (isteğe bağlı)</label>
              <input id="dd-son" type="datetime-local" className="form-input" value={sonTarih} onChange={e => setSonTarih(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="form-label" htmlFor="dd-baslik">Başlık</label>
            <input id="dd-baslik" className="form-input" value={baslik} onChange={e => setBaslik(e.target.value)} maxLength={120} />
          </div>
          <div>
            <label className="form-label" htmlFor="dd-icerik">Mesaj</label>
            <textarea id="dd-icerik" className="form-input" rows={4} value={icerik} onChange={e => setIcerik(e.target.value)} />
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Okulların Genel Bakış sayfasında, son tarih geçene ya da okul “Tamam” diyene kadar görünür.</div>
          </div>

          <div>
            <div className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Gönderilecek okullar ({secili.length}/{adaylar.length})</span>
              {adaylar.length > 0 && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setHaric(haric.size ? new Set() : new Set(adaylar.map(o => o.id)))}>{haric.size ? 'Tümünü seç' : 'Hiçbirini seçme'}</button>}
            </div>
            <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 10, padding: '4px 0' }}>
              {adaylar.length === 0 ? (
                <div style={{ padding: 14, fontSize: 13, color: 'var(--text3)' }}>{alici === 'teslim_almayan' ? 'Raporu imzalanıp henüz teslim edilmemiş okul yok.' : alici === 'ilce' && !ilceId ? 'İlçe seçin.' : 'Okul yok.'}</div>
              ) : adaylar.map(o => (
                <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!haric.has(o.id)} onChange={() => setHaric(h => { const n = new Set(h); if (n.has(o.id)) n.delete(o.id); else n.add(o.id); return n })} />
                  {o.ad}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-primary" onClick={gonder} disabled={gonderiliyor || !secili.length}><Send size={15} /> {gonderiliyor ? 'Gönderiliyor…' : `${secili.length} okula gönder`}</button>
          </div>
        </div>
      </section>

      <section className="yk-kart">
        <div className="yk-kart-bas">
          <h2>Gönderilen duyurular</h2>
          <div className="yk-kart-sag"><button type="button" className="btn btn-secondary btn-icon" onClick={yukle} aria-label="Yenile" title="Yenile"><RefreshCw size={14} /></button></div>
        </div>
        <div className="yk-tablo">
          <table className="data-table" style={{ minWidth: 640 }}>
            <thead><tr><th scope="col" style={{ width: 150 }}>Gönderim</th><th scope="col">Duyuru</th><th scope="col" style={{ width: 150 }}>Son tarih</th><th scope="col" style={{ width: 130 }}>Okundu</th></tr></thead>
            <tbody>
              {gruplar.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>Henüz duyuru gönderilmedi.</td></tr>
              ) : gruplar.map(g => (
                <tr key={g.ornek.grup || g.ornek.id}>
                  <td style={{ color: 'var(--text3)', whiteSpace: 'nowrap' }}>{tarihSaat(g.ornek.created_at)}</td>
                  <td><div style={{ fontWeight: 600 }}>{g.ornek.baslik}</div><div style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.45 }}>{g.ornek.icerik}</div></td>
                  <td style={{ whiteSpace: 'nowrap' }}>{g.ornek.son_tarih ? tarihSaat(g.ornek.son_tarih) : '—'}</td>
                  <td>{g.okunan}/{g.sayi} okul</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
