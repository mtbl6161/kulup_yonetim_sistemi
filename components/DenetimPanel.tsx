'use client'
// Denetim paneli iskeleti (A + B tasarımı):
// sol menü + "İş Kuyruğu" ana sayfası + okul odaklı ana-detay görünümü için okul listesi.
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AYLAR } from '@/lib/hesaplama'
import { DenetimTeslim, TeslimDurum, egitimYiliBaslangic, belgeDonemde, DenetimMadde } from '@/lib/denetimDosyasi'
import { Inbox, Building2, ScrollText, ListChecks, UserCheck, LogOut, Search, AlertTriangle, Clock, RefreshCw } from 'lucide-react'

export type PanelBolum = 'kuyruk' | 'okullar' | 'loglar' | 'evrak-listesi' | 'profil'

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
// Sol menü
// ============================================================
export function DenetimMenu({ bolum, onBolum, donem, onDonem, bekleyen, ilAd, kullaniciAd, onCikis }: {
  bolum: PanelBolum; onBolum: (b: PanelBolum) => void
  donem: string; onDonem: (k: string) => void
  bekleyen: number; ilAd?: string; kullaniciAd?: string; onCikis: () => void
}) {
  const ogeler: { id: PanelBolum; ad: string; icon: typeof Inbox }[] = [
    { id: 'kuyruk', ad: 'İş Kuyruğu', icon: Inbox },
    { id: 'okullar', ad: 'Okullar', icon: Building2 },
    { id: 'loglar', ad: 'İşlem Kayıtları', icon: ScrollText },
    { id: 'evrak-listesi', ad: 'Evrak Listesi', icon: ListChecks },
    { id: 'profil', ad: 'Profilim', icon: UserCheck },
  ]
  return (
    <nav aria-label="Denetim menüsü" style={{ width: 248, flexShrink: 0, background: '#1f3a2a', color: '#e8efe9', display: 'flex', flexDirection: 'column', padding: '22px 14px', boxSizing: 'border-box', gap: 4, overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px 18px' }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: '#e9b44c', color: '#1f3a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>K</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>Kulüp360</div>
          <div style={{ fontSize: 10.5, color: '#b7cbbd', letterSpacing: 1.2, fontWeight: 700 }}>DENETİM MERKEZİ</div>
        </div>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 8px 16px', fontSize: 11, color: '#b7cbbd', fontWeight: 700, letterSpacing: 0.5 }}>
        DÖNEM
        <select value={donem} onChange={e => onDonem(e.target.value)}
          style={{ padding: '9px 10px', borderRadius: 10, border: '1px solid #3d6650', background: '#2a4a37', color: '#ffffff', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
          {donemSecenekleri().map(d => <option key={d.key} value={d.key}>{d.ad}</option>)}
        </select>
      </label>

      {ogeler.map(o => {
        const aktif = bolum === o.id
        return (
          <button key={o.id} type="button" onClick={() => onBolum(o.id)} aria-current={aktif ? 'page' : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'left',
              background: aktif ? '#2f5440' : 'transparent', color: aktif ? '#ffffff' : '#d4e2d8', fontWeight: aktif ? 700 : 500, fontSize: 14, fontFamily: 'inherit' }}>
            <o.icon size={17} aria-hidden="true" />
            <span style={{ flex: 1 }}>{o.ad}</span>
            {o.id === 'kuyruk' && bekleyen > 0 && (
              <span style={{ background: '#e9b44c', color: '#1f3a2a', borderRadius: 20, padding: '1px 8px', fontSize: 12, fontWeight: 800 }}>{bekleyen}</span>
            )}
          </button>
        )
      })}

      <div style={{ flex: 1 }} />
      <div style={{ borderTop: '1px solid #335a45', padding: '14px 8px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{kullaniciAd || 'Denetim yetkilisi'}</div>
          <div style={{ fontSize: 11, color: '#b7cbbd' }}>{ilAd ? `${ilAd} İl MEM` : ''}</div>
        </div>
        <button type="button" onClick={onCikis} aria-label="Çıkış yap" title="Çıkış"
          style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #3d6650', background: 'transparent', color: '#f3c9c3', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <LogOut size={16} />
        </button>
      </div>
    </nav>
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
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
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
  onIncele: (okulId: number) => void; onTumKayitlar: () => void; onYenile: () => void
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
                        <button type="button" onClick={() => onIncele(s.id)}
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

// ============================================================
// Okul listesi (ana-detay görünümünün sol sütunu)
// ============================================================
export function DenetimOkulListesi({ okullar, secili, onSec, durumlar }: {
  okullar: { id: number; ad: string; ogrenci_sayisi?: number; personel_sayisi?: number }[]
  secili: number | null; onSec: (id: number) => void
  durumlar: Map<number, OkulDonemDurumu>
}) {
  const [ara, setAra] = useState('')
  const [filtre, setFiltre] = useState<'tum' | 'gonderildi' | 'yok'>('tum')
  const liste = okullar.filter(o => {
    const d = durumlar.get(o.id)?.teslim?.durum
    if (filtre === 'gonderildi' && d !== 'gonderildi') return false
    if (filtre === 'yok' && d && d !== 'taslak') return false
    return !ara.trim() || o.ad.toLocaleLowerCase('tr-TR').includes(ara.trim().toLocaleLowerCase('tr-TR'))
  })
  return (
    <section aria-label="Okul listesi" style={{ width: 300, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, borderBottom: '1px solid var(--border-light)' }}>
        <label htmlFor="okulAra" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>Okul ara</label>
        <div style={{ position: 'relative' }}>
          <Search size={14} aria-hidden="true" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input id="okulAra" type="search" value={ara} onChange={e => setAra(e.target.value)} placeholder="Okul adı"
            style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 30px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 14, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)' }} />
        </div>
        <div role="group" aria-label="Durum filtresi" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {([['tum', 'Tümü'], ['gonderildi', 'Denetimde'], ['yok', 'Göndermedi']] as const).map(([f, ad]) => (
            <button key={f} type="button" onClick={() => setFiltre(f)} aria-pressed={filtre === f}
              style={{ padding: '5px 10px', borderRadius: 20, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', fontWeight: filtre === f ? 700 : 500,
                border: filtre === f ? '1px solid var(--accent)' : '1px solid var(--border)', background: filtre === f ? 'var(--accent-lighter)' : 'var(--surface)', color: filtre === f ? 'var(--accent)' : 'var(--text2)' }}>
              {ad}
            </button>
          ))}
        </div>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 8, display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', flex: 1 }}>
        {liste.map(o => {
          const aktif = o.id === secili
          return (
            <li key={o.id}>
              <button type="button" onClick={() => onSec(o.id)} aria-current={aktif ? 'true' : undefined}
                style={{ width: '100%', textAlign: 'left', padding: 12, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text)',
                  background: aktif ? 'var(--accent-lighter)' : 'transparent', border: aktif ? '1px solid var(--accent-light)' : '1px solid transparent' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{o.ad}</span>
                  <DurumRozeti durum={durumlar.get(o.id)?.teslim?.durum} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                  {o.ogrenci_sayisi ?? 0} öğrenci · {o.personel_sayisi ?? 0} personel
                </div>
              </button>
            </li>
          )
        })}
        {liste.length === 0 && <li style={{ padding: 16, fontSize: 13, color: 'var(--text3)' }}>Okul bulunamadı.</li>}
      </ul>
    </section>
  )
}
