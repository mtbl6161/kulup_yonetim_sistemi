'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AYLAR } from '@/lib/hesaplama'
import {
  DenetimMadde, DenetimBelge, DenetimTeslim, TESLIM_DURUM_ETIKET, DENETIM_BUCKET,
  belgeDonemde, donemBelgeleriniGetir, boyutFmt, belgeIndir, blobKaydet, kontrolListesiUret, dosyayiZiple, otomatikBelgeUret,
} from '@/lib/denetimDosyasi'
import { Download, FileArchive, ListChecks, CheckCircle2, Undo2, X, ExternalLink, ArrowRight, FileSearch } from 'lucide-react'
import MaddeEtiketleri from '@/components/MaddeEtiketleri'

const RENK: Record<string, { bg: string; fg: string }> = {
  taslak: { bg: 'var(--surface2)', fg: 'var(--text2)' },
  gonderildi: { bg: 'var(--info-light)', fg: '#1a5b8a' },
  onaylandi: { bg: 'var(--success-light)', fg: '#1a6b34' },
  iade: { bg: '#fdecdc', fg: '#9a4a12' },
  bekliyor: { bg: 'var(--surface2)', fg: 'var(--text2)' },
}
const rozet = (d: string, metin: string) => (
  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: RENK[d]?.bg, color: RENK[d]?.fg, whiteSpace: 'nowrap' }}>{metin}</span>
)
const btn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const btnOnay: React.CSSProperties = { ...btn, background: '#2d6a3e', color: '#ffffff', border: 'none' }
const btnIade: React.CSSProperties = { ...btn, color: '#9a3412', borderColor: '#e8b48f' }

/** Önizlemede gösterilen öğe: yüklenmiş/kopyalanmış bir belge ya da güncel veriden üretilmiş sistem belgesi */
type Onizleme =
  | { tur: 'belge'; belge: DenetimBelge; madde: DenetimMadde; url: string | null }
  | { tur: 'guncel'; madde: DenetimMadde; url: string; ad: string; blob: Blob }

interface Props {
  okulId: number; okulAd: string; yil: number; ay: number
  onDegisti?: () => void       // karar verildiğinde (kuyruk/rozetler yenilensin)
  onSonraki?: () => void       // kuyruktaki bir sonraki dosyaya geç
}

const tarayicidaAcilir = (mime?: string | null, ad?: string) =>
  !!(mime && (mime === 'application/pdf' || mime.startsWith('image/'))) || /\.(pdf|png|jpe?g|gif|webp)$/i.test(ad || '')

/** Denetçi: bir okulun aylık denetim dosyası — liste + önizleme, belge/dosya bazında onay–iade */
export default function DenetciDenetimDosyasi({ okulId, okulAd, yil, ay, onDegisti, onSonraki }: Props) {
  const [maddeler, setMaddeler] = useState<DenetimMadde[]>([])
  const [belgeler, setBelgeler] = useState<DenetimBelge[]>([])
  const [teslim, setTeslim] = useState<DenetimTeslim | null>(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [islem, setIslem] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ tip: 'ok' | 'hata'; text: string } | null>(null)
  const [onizleme, setOnizleme] = useState<Onizleme | null>(null)
  const [belgeNot, setBelgeNot] = useState('')
  const [dosyaIade, setDosyaIade] = useState<string | null>(null) // açıkken: dosya iade notu
  const blobUrl = useRef<string | null>(null)

  const load = useCallback(async () => {
    try {
      await supabase.rpc('denetim_maddeleri_hazirla')
      const [m, t, b] = await Promise.all([
        supabase.from('denetim_maddeleri').select('*').eq('aktif', true).order('sira_no'),
        supabase.from('denetim_teslimleri').select('*').eq('okul_id', okulId).eq('yil', yil).eq('ay', ay).maybeSingle(),
        donemBelgeleriniGetir(okulId, yil, ay),
      ])
      if (m.error) throw m.error
      setMaddeler((m.data || []) as DenetimMadde[])
      setTeslim((t.data as DenetimTeslim) || null)
      setBelgeler(b)
      return b
    } catch (e) {
      setMsg({ tip: 'hata', text: 'Yüklenemedi: ' + (e as Error).message })
      return []
    } finally { setYukleniyor(false) }
  }, [okulId, yil, ay])

  useEffect(() => { load() }, [load])
  useEffect(() => () => { if (blobUrl.current) URL.revokeObjectURL(blobUrl.current) }, [])

  const hata = (e: unknown) => setMsg({ tip: 'hata', text: '❌ ' + ((e as Error)?.message || String(e)) })
  const maddeBelgeleri = (m: DenetimMadde, liste = belgeler) => liste.filter(b => b.madde_id === m.id && belgeDonemde(b, m, yil, ay))

  function blobTemizle() {
    if (blobUrl.current) { URL.revokeObjectURL(blobUrl.current); blobUrl.current = null }
  }

  async function belgeGoster(belge: DenetimBelge, madde: DenetimMadde) {
    blobTemizle()
    setBelgeNot(belge.denetci_notu || '')
    setOnizleme({ tur: 'belge', belge, madde, url: null })
    const { data, error } = await supabase.storage.from(DENETIM_BUCKET).createSignedUrl(belge.dosya_yolu, 600)
    if (error) return hata(error)
    setOnizleme(o => (o?.tur === 'belge' && o.belge.id === belge.id ? { ...o, url: data.signedUrl } : o))
  }

  async function guncelGoster(m: DenetimMadde) {
    if (!m.otomatik_kod) return
    setIslem(`${m.sira_no}. madde güncel veriden hazırlanıyor...`)
    try {
      const { blob, ad } = await otomatikBelgeUret(m.otomatik_kod, okulId, yil, ay)
      blobTemizle()
      blobUrl.current = URL.createObjectURL(blob)
      setOnizleme({ tur: 'guncel', madde: m, url: blobUrl.current, ad, blob })
    } catch (e) { hata(e) } finally { setIslem(null) }
  }

  /** Sıradaki karar bekleyen belge (madde sırasına göre) */
  function sonrakiBekleyen(liste: DenetimBelge[], mevcutId?: number): { b: DenetimBelge; m: DenetimMadde } | null {
    const sirali = maddeler.flatMap(m => maddeBelgeleri(m, liste).map(b => ({ b, m })))
    const i = sirali.findIndex(x => x.b.id === mevcutId)
    return [...sirali.slice(i + 1), ...sirali.slice(0, Math.max(0, i))].find(x => x.b.durum === 'bekliyor') || null
  }

  async function belgeKarar(belge: DenetimBelge, durum: 'onaylandi' | 'iade' | 'bekliyor', ilerle = false) {
    if (durum === 'iade' && !belgeNot.trim()) { setMsg({ tip: 'hata', text: 'İade için okula bir not yazın.' }); return }
    const { error } = await supabase.from('denetim_belgeleri')
      .update({ durum, denetci_notu: durum === 'iade' ? belgeNot.trim() : null }).eq('id', belge.id)
    if (error) return hata(error)
    setMsg(null)
    const yeni = await load()
    onDegisti?.()
    const guncel = yeni.find(b => b.id === belge.id)
    if (ilerle) {
      const s = sonrakiBekleyen(yeni, belge.id)
      if (s) { belgeGoster(s.b, s.m); return }
      setMsg({ tip: 'ok', text: 'Karar bekleyen belge kalmadı. Dosya kararını verebilirsiniz.' })
    }
    if (guncel && onizleme?.tur === 'belge') setOnizleme({ ...onizleme, belge: guncel })
  }

  async function dosyaKarar(durum: 'onaylandi' | 'iade', not = '') {
    if (!teslim) return
    if (durum === 'iade' && !not.trim()) { setMsg({ tip: 'hata', text: 'İade için okula bir açıklama yazın.' }); return }
    setIslem(durum === 'onaylandi' ? 'Onaylanıyor...' : 'İade ediliyor...')
    try {
      if (durum === 'onaylandi') {
        const ids = belgeler.filter(b => b.durum === 'bekliyor' && b.yil === yil && b.ay === ay).map(b => b.id)
        if (ids.length) { const { error } = await supabase.from('denetim_belgeleri').update({ durum: 'onaylandi' }).in('id', ids); if (error) throw error }
      }
      const { error } = await supabase.rpc('denetim_karar', { p_teslim_id: teslim.id, p_durum: durum, p_not: not })
      if (error) throw error
      setDosyaIade(null)
      setMsg({ tip: 'ok', text: durum === 'onaylandi' ? '✅ Dosya onaylandı.' : '↩️ Dosya okula iade edildi.' })
      await load()
      onDegisti?.()
    } catch (e) { hata(e) } finally { setIslem(null) }
  }

  if (yukleniyor) return <div style={{ padding: 40, color: 'var(--text3)' }}>⏳ Yükleniyor...</div>

  const durum = teslim?.durum || 'taslak'
  const kararVerilebilir = durum === 'gonderildi' || durum === 'onaylandi'
  const doluMadde = maddeler.filter(m => maddeBelgeleri(m).length > 0).length
  const bekleyenBelge = belgeler.filter(b => b.durum === 'bekliyor' && maddeler.some(m => m.id === b.madde_id && belgeDonemde(b, m, yil, ay))).length
  const seciliId = onizleme?.tur === 'belge' ? onizleme.belge.id : null

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      {/* ── Liste ── */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220, fontSize: 13, color: 'var(--text2)' }}>
            {rozet(durum, TESLIM_DURUM_ETIKET[durum])}
            <span style={{ marginLeft: 8 }}>{doluMadde}/{maddeler.length} madde dolu</span>
            {kararVerilebilir && bekleyenBelge > 0 && <span> · {bekleyenBelge} belge karar bekliyor</span>}
            {teslim?.gonderim_tarihi && <span> · gönderim {new Date(teslim.gonderim_tarihi).toLocaleString('tr-TR')}</span>}
          </div>
          <button type="button" style={btn} disabled={!!islem} onClick={async () => {
            try { blobKaydet(await kontrolListesiUret(okulAd, yil, ay, maddeler, belgeler, teslim), `Kontrol_Listesi_${AYLAR[ay]}_${yil}.pdf`) } catch (e) { hata(e) }
          }}><ListChecks size={14} aria-hidden="true" /> Kontrol listesi</button>
          <button type="button" style={btn} disabled={!!islem || belgeler.length === 0}
            onClick={async () => { try { await dosyayiZiple(okulAd, yil, ay, maddeler, belgeler, teslim, setIslem) } catch (e) { hata(e) } finally { setIslem(null) } }}>
            <FileArchive size={14} aria-hidden="true" /> ZIP indir
          </button>
          {kararVerilebilir && (
            <>
              <button type="button" style={btnIade} disabled={!!islem} onClick={() => setDosyaIade(teslim?.denetci_notu || '')}><Undo2 size={14} aria-hidden="true" /> Okula iade et</button>
              {durum !== 'onaylandi' && <button type="button" style={btnOnay} disabled={!!islem} onClick={() => dosyaKarar('onaylandi')}><CheckCircle2 size={14} aria-hidden="true" /> Dosyayı onayla</button>}
            </>
          )}
        </div>

        {dosyaIade !== null && (
          <div style={{ padding: 14, borderRadius: 12, border: '1px solid #e8b48f', background: '#fff8f1', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label htmlFor="dosyaIadeNot" style={{ fontSize: 13, fontWeight: 700, color: '#7a3a12' }}>Okula iade notu (okulun ekranında görünür)</label>
            <textarea id="dosyaIadeNot" autoFocus value={dosyaIade} onChange={e => setDosyaIade(e.target.value)} rows={2}
              style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" style={btn} onClick={() => setDosyaIade(null)}>Vazgeç</button>
              <button type="button" style={{ ...btnIade, background: '#9a3412', color: '#ffffff', border: 'none' }} disabled={!!islem} onClick={() => dosyaKarar('iade', dosyaIade)}>İade et</button>
            </div>
          </div>
        )}

        {durum === 'taslak' && (
          <div style={{ padding: 12, borderRadius: 10, background: 'var(--surface2)', fontSize: 13 }}>
            Okul bu dosyayı henüz denetime göndermedi. Yüklenen belgeleri ve sistem belgelerinin güncel hâlini görebilirsiniz; karar gönderimden sonra verilir.
          </div>
        )}
        {durum === 'onaylandi' && onSonraki && (
          <div style={{ padding: 12, borderRadius: 10, background: 'var(--success-light)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 1 }}>Bu dosya onaylandı.</span>
            <button type="button" style={btnOnay} onClick={onSonraki}>Kuyruktaki sonraki dosya <ArrowRight size={14} aria-hidden="true" /></button>
          </div>
        )}
        {msg && <div role="status" style={{ padding: 12, borderRadius: 10, fontSize: 13, background: msg.tip === 'ok' ? 'var(--success-light)' : 'var(--danger-light)', color: msg.tip === 'ok' ? '#1a6b34' : 'var(--danger)' }}>{msg.text}</div>}
        {islem && <div role="status" style={{ padding: 12, borderRadius: 10, fontSize: 13, background: 'var(--info-light)' }}>⏳ {islem}</div>}

        <ol style={{ listStyle: 'none', margin: 0, padding: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          {maddeler.map(m => {
            const mb = maddeBelgeleri(m)
            const guncelSecili = onizleme?.tur === 'guncel' && onizleme.madde.id === m.id
            return (
              <li key={m.id} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12,
                  background: mb.length ? 'var(--success-light)' : m.tip === 'otomatik' ? 'var(--info-light)' : 'var(--danger-light)', color: mb.length ? '#1a6b34' : m.tip === 'otomatik' ? '#1a5b8a' : 'var(--danger)' }}>{m.sira_no}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 8px', fontWeight: 600, fontSize: 13.5 }}>
                    <span><span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{m.sira_no}. </span>{m.baslik}</span>
                    <MaddeEtiketleri madde={m} />
                  </div>
                  {mb.length === 0 && m.tip !== 'otomatik' && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>Belge yok{!m.zorunlu ? ' (isteğe bağlı)' : ''}</div>}
                  {mb.map(b => (
                    <button key={b.id} type="button" onClick={() => belgeGoster(b, m)} aria-pressed={seciliId === b.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', marginTop: 6, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', fontSize: 12.5, color: 'var(--text)',
                        background: seciliId === b.id ? 'var(--accent-lighter)' : 'var(--surface2)', border: seciliId === b.id ? '1px solid var(--accent)' : '1px solid transparent' }}>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{b.dosya_adi}</span>
                      <span style={{ color: 'var(--text3)', whiteSpace: 'nowrap' }}>{b.kaynak === 'otomatik' ? 'gönderim kopyası · ' : ''}{boyutFmt(b.boyut)}{m.yillik && (b.yil !== yil || b.ay !== ay) ? ` · ${AYLAR[b.ay]} ${b.yil}` : ''}</span>
                      {rozet(b.durum, b.durum === 'bekliyor' ? 'Bekliyor' : b.durum === 'onaylandi' ? 'Onaylandı' : 'İade')}
                    </button>
                  ))}
                  {m.tip === 'otomatik' && (
                    <button type="button" onClick={() => guncelGoster(m)} disabled={!!islem} aria-pressed={guncelSecili}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', marginTop: 6, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', fontSize: 12.5, color: '#35566f',
                        background: guncelSecili ? '#eef3f7' : 'transparent', border: '1px solid #cbd8e3' }}>
                      <FileSearch size={14} aria-hidden="true" />
                      {mb.length === 0 ? 'Gönderim kopyası yok — okulun güncel verisinden görüntüle' : 'Güncel veriyle karşılaştır'}
                    </button>
                  )}
                  {mb.filter(b => b.denetci_notu).map(b => <div key={`n${b.id}`} style={{ fontSize: 12, color: '#9a3412', marginTop: 4 }}>Not ({b.dosya_adi}): {b.denetci_notu}</div>)}
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      {/* ── Önizleme ── */}
      {onizleme && (
        <aside aria-label="Belge önizleme" style={{ width: 'min(46%, 560px)', flexShrink: 0, background: 'var(--surface)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                Madde {onizleme.madde.sira_no} · {onizleme.tur === 'guncel' ? 'okulun güncel verisi' : onizleme.belge.kaynak === 'otomatik' ? 'gönderim kopyası' : 'okulun yüklediği belge'}
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2, wordBreak: 'break-all' }}>{onizleme.tur === 'guncel' ? onizleme.ad : onizleme.belge.dosya_adi}</div>
            </div>
            {onizleme.url && (
              <a href={onizleme.url} target="_blank" rel="noopener noreferrer" aria-label="Yeni sekmede aç" title="Yeni sekmede aç"
                style={{ ...btn, padding: 8 }}><ExternalLink size={15} /></a>
            )}
            <button type="button" aria-label="İndir" title="İndir" style={{ ...btn, padding: 8 }}
              onClick={() => onizleme.tur === 'guncel' ? blobKaydet(onizleme.blob, onizleme.ad) : belgeIndir(onizleme.belge).catch(hata)}>
              <Download size={15} />
            </button>
            <button type="button" aria-label="Önizlemeyi kapat" title="Kapat" style={{ ...btn, padding: 8 }} onClick={() => { blobTemizle(); setOnizleme(null) }}><X size={15} /></button>
          </div>

          <div style={{ flex: 1, minHeight: 0, background: '#e9ebee', display: 'flex' }}>
            {!onizleme.url ? (
              <div style={{ margin: 'auto', color: 'var(--text3)', fontSize: 13 }}>Hazırlanıyor...</div>
            ) : (onizleme.tur === 'guncel' || tarayicidaAcilir(onizleme.belge.mime, onizleme.belge.dosya_adi)) ? (
              (onizleme.tur === 'belge' && (onizleme.belge.mime || '').startsWith('image/'))
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={onizleme.url} alt={onizleme.belge.dosya_adi} style={{ maxWidth: '100%', maxHeight: '100%', margin: 'auto', objectFit: 'contain' }} />
                : <iframe src={onizleme.url} title="Belge önizleme" style={{ flex: 1, border: 'none', width: '100%' }} />
            ) : (
              <div style={{ margin: 'auto', textAlign: 'center', padding: 24, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>Bu dosya türü (Excel, Word vb.) tarayıcıda önizlenemiyor.</div>
                {onizleme.tur === 'belge' && <button type="button" style={btnOnay} onClick={() => belgeIndir(onizleme.belge).catch(hata)}><Download size={14} aria-hidden="true" /> İndir ve aç</button>}
              </div>
            )}
          </div>

          {onizleme.tur === 'belge' && kararVerilebilir && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text2)', flex: 1 }}>Belge durumu: {rozet(onizleme.belge.durum, onizleme.belge.durum === 'bekliyor' ? 'Bekliyor' : onizleme.belge.durum === 'onaylandi' ? 'Onaylandı' : 'İade')}</span>
                {onizleme.belge.durum !== 'bekliyor' && (
                  <button type="button" style={{ ...btn, padding: '5px 10px', fontSize: 12 }} onClick={() => belgeKarar(onizleme.belge, 'bekliyor')}>Kararı geri al</button>
                )}
              </div>
              <label htmlFor="belgeNot" style={{ fontSize: 12, fontWeight: 700 }}>Okula not <span style={{ fontWeight: 400, color: 'var(--text3)' }}>(iade ederken zorunlu)</span></label>
              <textarea id="belgeNot" rows={2} value={belgeNot} onChange={e => setBelgeNot(e.target.value)} placeholder="Örn. belgenin tarihi okunmuyor"
                style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" style={{ ...btnIade, flex: 1, justifyContent: 'center' }} onClick={() => belgeKarar(onizleme.belge, 'iade', true)}><Undo2 size={14} aria-hidden="true" /> İade</button>
                <button type="button" style={{ ...btnOnay, flex: 1, justifyContent: 'center' }} onClick={() => belgeKarar(onizleme.belge, 'onaylandi', true)}><CheckCircle2 size={14} aria-hidden="true" /> Onayla ve sonraki</button>
              </div>
            </div>
          )}
        </aside>
      )}
    </div>
  )
}
