'use client'
// Denetim paneli: "İş Kuyruğu" ana sayfası ve ortak dönem/durum yardımcıları.
// Kabuk, Okullar sayfası ve okul inceleme başlığı DenetimDuzen.tsx'tedir.
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AYLAR } from '@/lib/hesaplama'
import { DenetimTeslim, TeslimDurum, egitimYiliBaslangic, belgeDonemde, DenetimMadde } from '@/lib/denetimDosyasi'
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react'
import { Filtre as SegmentFiltre } from '@/components/yonetim/ortak'


/** Son 12 ay, en yeni önce: "2026-9" biçiminde anahtarlar */
export function donemSecenekleri(): { key: string; ad: string }[] {
  const d = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const t = new Date(d.getFullYear(), d.getMonth() - i, 1)
    return { key: `${t.getFullYear()}-${t.getMonth() + 1}`, ad: `${AYLAR[t.getMonth() + 1]} ${t.getFullYear()}` }
  })
}

/** Denetim genelde bir önceki ayın dosyası için yapılır */
export function varsayilanDonem(): string {
  const d = new Date()
  const t = new Date(d.getFullYear(), d.getMonth() - 1, 1)
  return `${t.getFullYear()}-${t.getMonth() + 1}`
}

const DURUM: Record<TeslimDurum | 'yok', { ad: string; rozet: string }> = {
  yok: { ad: 'Göndermedi', rozet: 'badge-gray' },
  taslak: { ad: 'Göndermedi', rozet: 'badge-gray' },
  gonderildi: { ad: 'Denetimde', rozet: 'badge-blue' },
  iade: { ad: 'İade edildi', rozet: 'badge-orange' },
  onaylandi: { ad: 'Onaylandı', rozet: 'badge-green' },
}

export function DurumRozeti({ durum }: { durum?: TeslimDurum | null }) {
  const d = DURUM[durum || 'yok']
  return <span className={`badge ${d.rozet}`} style={{ whiteSpace: 'nowrap' }}>{d.ad}</span>
}

/** Evrak doluluğu: ince çubuk + "dolu/toplam" */
export function EvrakIlerleme({ dolu, toplam, oran }: { dolu: number; toplam: number; oran: number }) {
  return (
    <span className="dn-ilerleme">
      <span aria-hidden="true"><span style={{ width: `${oran * 100}%`, background: oran >= 1 ? 'var(--success)' : 'var(--warn)' }} /></span>
      <span>{dolu}/{toplam}</span>
    </span>
  )
}

// ============================================================
// Dönem verisi: okul başına teslim durumu, dolu madde sayısı, bordro değişikliği
// ============================================================
export interface OkulDonemDurumu {
  teslim: DenetimTeslim | null
  doluMadde: number
  bordroSonGuncelleme: string | null
}

export function useDonemDurumlari(okulIdleri: number[], yil: number, ay: number, yenile: number) {
  const [durumlar, setDurumlar] = useState<Map<number, OkulDonemDurumu>>(new Map())
  const [toplamMadde, setToplamMadde] = useState(0)
  const [yukleniyor, setYukleniyor] = useState(false)
  const anahtar = okulIdleri.join(',')

  useEffect(() => {
    const ids = anahtar ? anahtar.split(',').map(Number) : []
    let iptal = false
    ;(async () => {
      if (ids.length === 0 || !yil || !ay) { setDurumlar(new Map()); return }
      setYukleniyor(true)
      const bas = egitimYiliBaslangic(yil, ay)
      await supabase.rpc('denetim_maddeleri_hazirla')
      const [m, t, b, br] = await Promise.all([
        supabase.from('denetim_maddeleri').select('*').eq('aktif', true),
        supabase.from('denetim_teslimleri').select('*').in('okul_id', ids).eq('yil', yil).eq('ay', ay),
        supabase.from('denetim_belgeleri').select('okul_id, madde_id, yil, ay').in('okul_id', ids).in('yil', [bas, bas + 1]),
        supabase.from('bordro').select('okul_id, created_at').in('okul_id', ids).eq('yil', yil).eq('ay', ay),
      ])
      if (iptal) return
      const maddeler = (m.data || []) as DenetimMadde[]
      const mMap = new Map(maddeler.map(x => [x.id, x]))
      const yeni = new Map<number, OkulDonemDurumu>()
      for (const id of ids) {
        const dolu = new Set<number>()
        for (const x of b.data || []) {
          const md = mMap.get(x.madde_id)
          if (x.okul_id === id && md && belgeDonemde(x, md, yil, ay)) dolu.add(x.madde_id)
        }
        const brSon = (br.data || []).filter(x => x.okul_id === id).map(x => x.created_at as string).sort().pop() || null
        yeni.set(id, { teslim: ((t.data || []) as DenetimTeslim[]).find(x => x.okul_id === id) || null, doluMadde: dolu.size, bordroSonGuncelleme: brSon })
      }
      setToplamMadde(maddeler.length)
      setDurumlar(yeni)
      setYukleniyor(false)
    })()
    return () => { iptal = true }
  }, [anahtar, yil, ay, yenile])

  return { durumlar, toplamMadde, yukleniyor }
}

function gunFarki(iso?: string | null): number {
  if (!iso) return 0
  // Takvim günü farkı (yerel saat): dün 23:00 → 1, bugün 08:00 → 0
  const gun = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.round((gun(new Date()) - gun(new Date(iso))) / 86400000)
}
function beklemeMetni(iso?: string | null) {
  const g = gunFarki(iso)
  return g <= 0 ? 'bugün' : g === 1 ? 'dün' : `${g} gün`
}

// ============================================================
// İş Kuyruğu (ana sayfa)
// ============================================================
type Filtre = 'gonderildi' | 'iade' | 'yok' | 'onaylandi'

export function DenetimIsKuyrugu({ okullar, ay, durumlar, toplamMadde, yukleniyor, sonHareketler, ilceler, filtreIlceId, onIlce, onIncele, onTumKayitlar, onYenile }: {
  okullar: { id: number; ad: string }[]
  ay: number
  durumlar: Map<number, OkulDonemDurumu>; toplamMadde: number; yukleniyor: boolean
  sonHareketler: { id: number; created_at: string; aciklama?: string; okullar?: { ad?: string } }[]
  ilceler: { id: number; ad: string }[]; filtreIlceId: number | null; onIlce: (id: number | null) => void
  onIncele: (okulId: number, liste?: number[]) => void; onTumKayitlar: () => void; onYenile: () => void
}) {
  const [filtre, setFiltre] = useState<Filtre>('gonderildi')

  const satirlar = useMemo(() => okullar.map(o => {
    const d = durumlar.get(o.id)
    const durum = d?.teslim?.durum
    const grup: Filtre = durum === 'gonderildi' ? 'gonderildi' : durum === 'iade' ? 'iade' : durum === 'onaylandi' ? 'onaylandi' : 'yok'
    const bordroDegisti = !!(d?.teslim?.gonderim_tarihi && d.bordroSonGuncelleme && (durum === 'gonderildi' || durum === 'onaylandi') && d.bordroSonGuncelleme > d.teslim.gonderim_tarihi)
    return { ...o, d, grup, bordroDegisti }
  }), [okullar, durumlar])

  const say = (g: Filtre) => satirlar.filter(s => s.grup === g).length
  const liste = satirlar.filter(s => s.grup === filtre).sort((a, b) =>
    filtre === 'gonderildi'
      ? (a.d?.teslim?.gonderim_tarihi || '').localeCompare(b.d?.teslim?.gonderim_tarihi || '')
      : a.ad.localeCompare(b.ad, 'tr'))
  const enEski = satirlar.filter(s => s.grup === 'gonderildi').map(s => gunFarki(s.d?.teslim?.gonderim_tarihi)).sort((a, b) => b - a)[0]
  const dikkat = [
    ...satirlar.filter(s => s.bordroDegisti).map(s => ({ id: s.id, metin: `${s.ad}: bordro gönderimden sonra yeniden hesaplandı` })),
    ...satirlar.filter(s => s.grup === 'yok').map(s => ({ id: s.id, metin: `${s.ad}: ${AYLAR[ay]} dosyasını göndermedi` })),
  ]

  const kart = (baslik: string, deger: number, alt: string, renk: string, f: Filtre) => (
    <button type="button" onClick={() => setFiltre(f)} aria-pressed={filtre === f} className={filtre === f ? 'on' : ''}>
      <div className="ad">{baslik}</div>
      <div className="deger" style={{ color: renk }}>{deger}</div>
      <div className="alt">{alt}</div>
    </button>
  )

  return (
    <div className="dn-sayfa">
      <div className="yk-arac">
        <h2 style={{ margin: 0, flex: '1 1 260px', fontSize: 18, fontWeight: 700 }}>
          {say('gonderildi') > 0 ? `${say('gonderildi')} dosya incelemenizi bekliyor` : 'İnceleme bekleyen dosya yok'}
        </h2>
        <select aria-label="İlçe" className="form-select dn-secim" value={filtreIlceId || ''} onChange={e => onIlce(e.target.value ? Number(e.target.value) : null)}>
          <option value="">Tüm ilçeler</option>
          {ilceler.map(i => <option key={i.id} value={i.id}>{i.ad}</option>)}
        </select>
        <button type="button" className="btn btn-secondary btn-icon" onClick={onYenile} aria-label="Yenile" title="Yenile">
          <RefreshCw size={15} className={yukleniyor ? 'animate-spin' : ''} />
        </button>
      </div>

      <section aria-label="Özet" className="yk-kpi">
        {kart('İnceleme bekleyen', say('gonderildi'), enEski !== undefined ? `en eskisi ${enEski <= 0 ? 'bugün' : `${enEski} gündür`} bekliyor` : 'kuyruk boş', 'var(--accent)', 'gonderildi')}
        {kart('Göndermeyen okul', say('yok'), `${okullar.length} okuldan`, 'var(--warn)', 'yok')}
        {kart('İade edilen', say('iade'), 'okul düzeltmesi bekleniyor', '#8a5200', 'iade')}
        {kart('Onaylanan', say('onaylandi'), 'bu dönem', 'var(--success)', 'onaylandi')}
      </section>

      <div className="yk-iki">
        <section aria-labelledby="kuyrukBaslik" className="yk-kart genis">
          <div className="yk-kart-bas">
            <h2 id="kuyrukBaslik">
              {filtre === 'gonderildi' ? 'İnceleme kuyruğu' : filtre === 'iade' ? 'İade edilen dosyalar' : filtre === 'yok' ? 'Göndermeyen okullar' : 'Onaylanan dosyalar'}
            </h2>
            <div className="yk-kart-sag">
              <SegmentFiltre<Filtre> etiket="Filtre" deger={filtre} onDegis={setFiltre}
                secenekler={([['gonderildi', 'Bekleyen'], ['iade', 'İade'], ['yok', 'Göndermedi'], ['onaylandi', 'Onaylanan']] as [Filtre, string][]).map(([id, ad]) => ({ id, ad, sayi: say(id) }))} />
            </div>
          </div>
          <div className="yk-tablo">
            <table className="data-table" style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  <th scope="col">Okul</th>
                  <th scope="col">Evrak</th>
                  <th scope="col">{filtre === 'gonderildi' ? 'Bekleme' : 'Durum'}</th>
                  <th scope="col" style={{ textAlign: 'right' }}><span className="sr-only">İşlem</span></th>
                </tr>
              </thead>
              <tbody>
                {liste.map(s => {
                  const oran = toplamMadde ? Math.min(1, (s.d?.doluMadde || 0) / toplamMadde) : 0
                  const bekleme = gunFarki(s.d?.teslim?.gonderim_tarihi)
                  return (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{s.ad}</div>
                        {s.bordroDegisti && <div style={{ fontSize: 12, color: '#8a5200', marginTop: 2 }}>Bordro gönderimden sonra değişti</div>}
                        {s.grup === 'iade' && s.d?.teslim?.denetci_notu && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Not: {s.d.teslim.denetci_notu}</div>}
                      </td>
                      <td><EvrakIlerleme dolu={s.d?.doluMadde || 0} toplam={toplamMadde} oran={oran} /></td>
                      <td>
                        {filtre === 'gonderildi'
                          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: bekleme >= 3 ? '#8a5200' : 'var(--text)', fontWeight: bekleme >= 3 ? 600 : 400 }}><Clock size={13} aria-hidden="true" />{beklemeMetni(s.d?.teslim?.gonderim_tarihi)}</span>
                          : <DurumRozeti durum={s.d?.teslim?.durum} />}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button type="button" className={`btn btn-sm ${filtre === 'gonderildi' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => onIncele(s.id, liste.map(x => x.id))}>
                          {filtre === 'gonderildi' ? 'İncele' : 'Aç'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {liste.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>
                    {yukleniyor ? 'Yükleniyor...' : filtre === 'gonderildi' ? 'İnceleme bekleyen dosya yok.' : 'Bu grupta okul yok.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside aria-label="Uyarılar ve hareketler" className="dar">
          <section className="yk-kart" style={{ background: 'var(--warn-light)', borderColor: 'var(--warn-border)' }}>
            <div className="yk-kart-bas">
              <h2 style={{ color: '#8a5200', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={16} aria-hidden="true" /> Dikkat gerektirenler
              </h2>
            </div>
            <div style={{ padding: '0 18px 16px' }}>
              {dikkat.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>Şu an dikkat gerektiren bir durum yok.</div>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {dikkat.slice(0, 8).map((x, i) => (
                    <li key={i}>
                      <button type="button" onClick={() => onIncele(x.id)}
                        style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', color: 'var(--text)', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit', textDecoration: 'underline', textDecorationColor: 'var(--warn-border)' }}>
                        {x.metin}
                      </button>
                    </li>
                  ))}
                  {dikkat.length > 8 && <li style={{ fontSize: 12, color: 'var(--text3)' }}>+{dikkat.length - 8} uyarı daha</li>}
                </ul>
              )}
            </div>
          </section>
          <section className="yk-kart">
            <div className="yk-kart-bas"><h2>Son hareketler</h2></div>
            <div style={{ display: 'flex', flexDirection: 'column', fontSize: 13 }}>
              {sonHareketler.length === 0 && <div style={{ color: 'var(--text3)', padding: '0 18px 12px' }}>Kayıt yok.</div>}
              {sonHareketler.slice(0, 6).map(l => (
                <div key={l.id} style={{ padding: '10px 18px', borderTop: '1px solid var(--border-light)' }}>
                  <div style={{ fontWeight: 600 }}>{l.okullar?.ad}</div>
                  <div style={{ color: 'var(--text2)' }}>{l.aciklama} · <span style={{ color: 'var(--text3)' }}>{new Date(l.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span></div>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 18px 14px', borderTop: '1px solid var(--border-light)' }}>
              <button type="button" onClick={onTumKayitlar} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                Tüm kayıtlar →
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
