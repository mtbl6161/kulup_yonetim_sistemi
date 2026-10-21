'use client'
// Denetim paneli: "İş Kuyruğu" ana sayfası ve ortak dönem/durum yardımcıları.
// Üst bar, Okullar sayfası ve okul inceleme başlığı DenetimDuzen.tsx'tedir.
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AYLAR } from '@/lib/hesaplama'
import { DenetimTeslim, TeslimDurum, egitimYiliBaslangic, belgeDonemde, DenetimMadde } from '@/lib/denetimDosyasi'
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react'

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

const DURUM: Record<TeslimDurum | 'yok', { ad: string; bg: string; fg: string }> = {
  yok: { ad: 'Göndermedi', bg: 'var(--surface2)', fg: 'var(--text2)' },
  taslak: { ad: 'Göndermedi', bg: 'var(--surface2)', fg: 'var(--text2)' },
  gonderildi: { ad: 'Denetimde', bg: 'var(--info-light)', fg: '#1a5b8a' },
  iade: { ad: 'İade edildi', bg: '#fdecdc', fg: '#9a4a12' },
  onaylandi: { ad: 'Onaylandı', bg: 'var(--success-light)', fg: '#1a6b34' },
}

export function DurumRozeti({ durum }: { durum?: TeslimDurum | null }) {
  const d = DURUM[durum || 'yok']
  return <span style={{ fontSize: 11, fontWeight: 700, background: d.bg, color: d.fg, borderRadius: 20, padding: '3px 9px', whiteSpace: 'nowrap' }}>{d.ad}</span>
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

export function DenetimIsKuyrugu({ okullar, yil, ay, durumlar, toplamMadde, yukleniyor, sonHareketler, ilAd, ilceler, filtreIlceId, onIlce, onIncele, onTumKayitlar, onYenile }: {
  okullar: { id: number; ad: string }[]
  yil: number; ay: number
  durumlar: Map<number, OkulDonemDurumu>; toplamMadde: number; yukleniyor: boolean
  sonHareketler: { id: number; created_at: string; aciklama?: string; okullar?: { ad?: string } }[]
  ilAd?: string
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
    <button type="button" onClick={() => setFiltre(f)} aria-pressed={filtre === f}
      style={{ textAlign: 'left', background: 'var(--surface)', borderRadius: 14, padding: 18, cursor: 'pointer', fontFamily: 'inherit',
        border: filtre === f ? `2px solid ${renk}` : '1px solid var(--border)' }}>
      <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>{baslik}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: renk, marginTop: 6, lineHeight: 1.1 }}>{deger}</div>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{alt}</div>
    </button>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>{ilAd ? `${ilAd} İl Milli Eğitim Müdürlüğü` : 'İl Milli Eğitim Müdürlüğü'} · {AYLAR[ay]} {yil}</div>
          <h1 style={{ margin: '4px 0 0', fontFamily: '"Playfair Display", Georgia, serif', fontSize: 30, fontWeight: 800, color: 'var(--text)' }}>
            {say('gonderildi') > 0 ? `${say('gonderildi')} dosya incelemenizi bekliyor` : 'İnceleme bekleyen dosya yok'}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: 11, color: 'var(--text2)', gap: 4, fontWeight: 600 }}>İlçe
            <select value={filtreIlceId || ''} onChange={e => onIlce(e.target.value ? Number(e.target.value) : null)}
              style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 14, fontFamily: 'inherit', color: 'var(--text)' }}>
              <option value="">Tüm ilçeler</option>
              {ilceler.map(i => <option key={i.id} value={i.id}>{i.ad}</option>)}
            </select>
          </label>
          <button type="button" onClick={onYenile} aria-label="Yenile" title="Yenile"
            style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <RefreshCw size={16} className={yukleniyor ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <section aria-label="Özet" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {kart('İnceleme bekleyen', say('gonderildi'), enEski !== undefined ? `en eskisi ${enEski <= 0 ? 'bugün' : `${enEski} gündür`} bekliyor` : 'kuyruk boş', '#1f5f8b', 'gonderildi')}
        {kart('Göndermeyen okul', say('yok'), `${okullar.length} okuldan`, '#a3531f', 'yok')}
        {kart('İade edilen', say('iade'), 'okul düzeltmesi bekleniyor', '#7a4a1a', 'iade')}
        {kart('Onaylanan', say('onaylandi'), 'bu dönem', '#2d5a3d', 'onaylandi')}
      </section>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 22, alignItems: 'flex-start' }}>
        <section aria-labelledby="kuyrukBaslik" style={{ flex: '999 1 560px', minWidth: 0, background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '16px 20px', borderBottom: '1px solid var(--border-light)' }}>
            <h2 id="kuyrukBaslik" style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
              {filtre === 'gonderildi' ? 'İnceleme kuyruğu' : filtre === 'iade' ? 'İade edilen dosyalar' : filtre === 'yok' ? 'Göndermeyen okullar' : 'Onaylanan dosyalar'}
            </h2>
            <div role="group" aria-label="Filtre" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {([['gonderildi', 'Bekleyen'], ['iade', 'İade'], ['yok', 'Göndermedi'], ['onaylandi', 'Onaylanan']] as [Filtre, string][]).map(([f, ad]) => (
                <button key={f} type="button" onClick={() => setFiltre(f)} aria-pressed={filtre === f}
                  style={{ padding: '7px 12px', borderRadius: 20, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', fontWeight: filtre === f ? 700 : 500,
                    border: filtre === f ? 'none' : '1px solid var(--border)', background: filtre === f ? '#1f3a2a' : 'var(--surface)', color: filtre === f ? '#ffffff' : 'var(--text2)' }}>
                  {ad} ({say(f)})
                </button>
              ))}
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 600 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text2)', fontSize: 12 }}>
                  <th scope="col" style={{ padding: '10px 20px', fontWeight: 600 }}>Okul</th>
                  <th scope="col" style={{ padding: '10px 8px', fontWeight: 600 }}>Evrak</th>
                  <th scope="col" style={{ padding: '10px 8px', fontWeight: 600 }}>{filtre === 'gonderildi' ? 'Bekleme' : 'Durum'}</th>
                  <th scope="col" style={{ padding: '10px 20px', fontWeight: 600, textAlign: 'right' }}><span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>İşlem</span></th>
                </tr>
              </thead>
              <tbody>
                {liste.map(s => {
                  const oran = toplamMadde ? Math.min(1, (s.d?.doluMadde || 0) / toplamMadde) : 0
                  const bekleme = gunFarki(s.d?.teslim?.gonderim_tarihi)
                  return (
                    <tr key={s.id} style={{ borderTop: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: 600 }}>{s.ad}</div>
                        {s.bordroDegisti && <div style={{ fontSize: 12, color: '#a3531f', marginTop: 2 }}>Bordro gönderimden sonra değişti</div>}
                        {s.grup === 'iade' && s.d?.teslim?.denetci_notu && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Not: {s.d.teslim.denetci_notu}</div>}
                      </td>
                      <td style={{ padding: '14px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 90, height: 6, borderRadius: 6, background: 'var(--surface2)' }} aria-hidden="true">
                            <div style={{ width: `${oran * 100}%`, height: 6, borderRadius: 6, background: oran >= 1 ? '#2d5a3d' : '#c98a2e' }} />
                          </div>
                          <span style={{ fontSize: 12 }}>{s.d?.doluMadde || 0}/{toplamMadde}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 8px' }}>
                        {filtre === 'gonderildi'
                          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: bekleme >= 3 ? '#a3531f' : 'var(--text)', fontWeight: bekleme >= 3 ? 700 : 400 }}><Clock size={13} aria-hidden="true" />{beklemeMetni(s.d?.teslim?.gonderim_tarihi)}</span>
                          : <DurumRozeti durum={s.d?.teslim?.durum} />}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <button type="button" onClick={() => onIncele(s.id, liste.map(x => x.id))}
                          style={{ padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13,
                            background: filtre === 'gonderildi' ? 'var(--accent)' : 'var(--surface2)', color: filtre === 'gonderildi' ? '#ffffff' : 'var(--text)' }}>
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

        <aside aria-label="Uyarılar ve hareketler" style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <section style={{ background: '#fff7e8', border: '1px solid #f0d9ae', borderRadius: 16, padding: 18 }}>
            <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#6b3a12', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} aria-hidden="true" /> Dikkat gerektirenler
            </h2>
            {dikkat.length === 0 ? (
              <div style={{ fontSize: 13, color: '#5a4a3a' }}>Şu an dikkat gerektiren bir durum yok.</div>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dikkat.slice(0, 8).map((x, i) => (
                  <li key={i}>
                    <button type="button" onClick={() => onIncele(x.id)}
                      style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', color: '#4a3a2a', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit', textDecoration: 'underline', textDecorationColor: '#e2c48f' }}>
                      {x.metin}
                    </button>
                  </li>
                ))}
                {dikkat.length > 8 && <li style={{ fontSize: 12, color: '#6b5a4a' }}>+{dikkat.length - 8} uyarı daha</li>}
              </ul>
            )}
          </section>
          <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 18 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>Son hareketler</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              {sonHareketler.length === 0 && <div style={{ color: 'var(--text3)' }}>Kayıt yok.</div>}
              {sonHareketler.slice(0, 6).map(l => (
                <div key={l.id}>
                  <div style={{ fontWeight: 600 }}>{l.okullar?.ad}</div>
                  <div style={{ color: 'var(--text2)' }}>{l.aciklama} · {new Date(l.created_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              ))}
            </div>
            <button type="button" onClick={onTumKayitlar} style={{ marginTop: 12, background: 'none', border: 'none', padding: 0, color: 'var(--accent)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              Tüm kayıtlar →
            </button>
          </section>
        </aside>
      </div>
    </div>
  )
}
