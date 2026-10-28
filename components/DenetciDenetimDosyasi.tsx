'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AYLAR } from '@/lib/hesaplama'
import {
  DenetimMadde, DenetimBelge, DenetimTeslim, TESLIM_DURUM_ETIKET, DENETIM_BUCKET,
  belgeDonemde, donemBelgeleriniGetir, boyutFmt, belgeIndir, blobKaydet, kontrolListesiUret, dosyayiZiple, otomatikBelgeUret,
} from '@/lib/denetimDosyasi'
import { Download, FileArchive, ListChecks, CheckCircle2, Undo2, X, ExternalLink, FileSearch, FileText, FileSpreadsheet, FileImage, File, Eye, ChevronRight } from 'lucide-react'
import MaddeEtiketleri from '@/components/MaddeEtiketleri'
import { useYukleme } from '@/lib/useYukleme'

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
const ozetCip: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: 'var(--surface2)', color: 'var(--text)', fontSize: 12.5, whiteSpace: 'nowrap' }
const btnOnay: React.CSSProperties = { ...btn, background: '#2d6a3e', color: '#ffffff', border: 'none' }
const btnIade: React.CSSProperties = { ...btn, color: '#9a3412', borderColor: '#e8b48f' }

/** Önizlemede gösterilen öğe: yüklenmiş/kopyalanmış bir belge ya da güncel veriden üretilmiş sistem belgesi */
type Onizleme =
  | { tur: 'belge'; belge: DenetimBelge; madde: DenetimMadde; url: string | null }
  | { tur: 'guncel'; madde: DenetimMadde; url: string; ad: string; blob: Blob; kopya: { belge: DenetimBelge; url: string } | null }

interface Props {
  okulId: number; okulAd: string; yil: number; ay: number
  onDegisti?: () => void       // belge kararı verildiğinde (kuyruk/rozetler yenilensin)
}

/** Dosya türüne göre ikon ve renk (liste satırında hangi belge olduğu bir bakışta anlaşılsın) */
function dosyaIkonu(ad: string, mime?: string | null) {
  if (/\.pdf$/i.test(ad) || mime === 'application/pdf') return { I: FileText, renk: '#c0392b' }
  if (/\.(xlsx?|xlsm|csv)$/i.test(ad)) return { I: FileSpreadsheet, renk: '#1d7a45' }
  if (/\.(png|jpe?g|gif|webp)$/i.test(ad) || (mime || '').startsWith('image/')) return { I: FileImage, renk: '#7a4fb5' }
  return { I: File, renk: 'var(--text2)' }
}

/* Satırların tıklanabilir olduğu hover/odak ile belli olsun (inline style :hover desteklemiyor) */
const LISTE_CSS = `
.dd-belge { transition: background .12s, border-color .12s, box-shadow .12s; }
.dd-belge:hover { background: var(--surface) !important; border-color: var(--accent) !important; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
.dd-belge:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.dd-belge .dd-ac { opacity: .75; transition: opacity .12s, transform .12s; }
.dd-belge:hover .dd-ac, .dd-belge[aria-pressed="true"] .dd-ac { opacity: 1; transform: translateX(2px); }
.dd-belge:hover .dd-ad { text-decoration: underline; }
.dd-guncel:hover { background: #eef3f7 !important; }
`

const tarayicidaAcilir = (mime?: string | null, ad?: string) =>
  !!(mime && (mime === 'application/pdf' || mime.startsWith('image/'))) || /\.(pdf|png|jpe?g|gif|webp)$/i.test(ad || '')

/** Denetçi: bir okulun aylık denetim dosyası — liste + önizleme, belge bazında onay–iade.
 *  Dosyanın tamamına karar (onay / iade) inceleme başlığındaki DosyaKararCubugu'ndan verilir. */
export default function DenetciDenetimDosyasi({ okulId, okulAd, yil, ay, onDegisti }: Props) {
  const [maddeler, setMaddeler] = useState<DenetimMadde[]>([])
  const [belgeler, setBelgeler] = useState<DenetimBelge[]>([])
  const [teslim, setTeslim] = useState<DenetimTeslim | null>(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [islem, setIslem] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ tip: 'ok' | 'hata'; text: string } | null>(null)
  const [onizleme, setOnizleme] = useState<Onizleme | null>(null)
  const [belgeNot, setBelgeNot] = useState('')
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

  useYukleme(load)
  useEffect(() => () => { if (blobUrl.current) URL.revokeObjectURL(blobUrl.current) }, [])

  const hata = (e: unknown) => setMsg({ tip: 'hata', text: '❌ ' + ((e as Error)?.message || String(e)) })
  const maddeBelgeleri = (m: DenetimMadde, liste = belgeler) => liste.filter(b => b.madde_id === m.id && belgeDonemde(b, m, yil, ay))

  function onizlemeKapat() { blobTemizle(); setOnizleme(null) }

  // Önizleme penceresi: Esc ile kapanır, açıkken arka sayfa kaymaz
  useEffect(() => {
    if (!onizleme) return
    const tus = (e: KeyboardEvent) => { if (e.key === 'Escape') onizlemeKapat() }
    window.addEventListener('keydown', tus)
    const eski = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', tus); document.body.style.overflow = eski }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!onizleme])

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
      // Karşılaştırma için gönderim anındaki kopya (varsa) yanına açılır
      const kopyaBelge = maddeBelgeleri(m).find(b => b.kaynak === 'otomatik') || null
      const [{ blob, ad }, imza] = await Promise.all([
        otomatikBelgeUret(m.otomatik_kod, okulId, yil, ay),
        kopyaBelge ? supabase.storage.from(DENETIM_BUCKET).createSignedUrl(kopyaBelge.dosya_yolu, 600) : Promise.resolve(null),
      ])
      if (imza?.error) throw imza.error
      blobTemizle()
      blobUrl.current = URL.createObjectURL(blob)
      setOnizleme({ tur: 'guncel', madde: m, url: blobUrl.current, ad, blob,
        kopya: kopyaBelge && imza?.data ? { belge: kopyaBelge, url: imza.data.signedUrl } : null })
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
      setMsg({ tip: 'ok', text: 'Karar bekleyen belge kalmadı. Dosya kararını üstteki düğmelerden verebilirsiniz.' })
    }
    if (guncel && onizleme?.tur === 'belge') setOnizleme({ ...onizleme, belge: guncel })
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
          <div style={{ flex: 1, minWidth: 220, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13 }}>
            {rozet(durum, TESLIM_DURUM_ETIKET[durum])}
            <span style={ozetCip}>
              <span style={{ color: 'var(--text2)' }}>Madde</span>
              <b>{doluMadde} / {maddeler.length}</b>
              <span aria-hidden="true" style={{ width: 54, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                <span style={{ display: 'block', height: '100%', width: `${maddeler.length ? Math.round(doluMadde / maddeler.length * 100) : 0}%`, background: doluMadde >= maddeler.length ? '#2d6a3e' : 'var(--accent)' }} />
              </span>
            </span>
            {kararVerilebilir && (
              bekleyenBelge > 0
                ? <span style={{ ...ozetCip, background: 'var(--warn-light)', color: '#8a5a00' }}><b>{bekleyenBelge}</b> belge karar bekliyor</span>
                : <span style={{ ...ozetCip, background: 'var(--success-light)', color: '#1a6b34' }}><CheckCircle2 size={13} aria-hidden="true" /> Tüm belgelere karar verildi</span>
            )}
            {teslim?.gonderim_tarihi && (
              <span style={ozetCip} title={new Date(teslim.gonderim_tarihi).toLocaleString('tr-TR')}>
                <span style={{ color: 'var(--text2)' }}>Gönderim</span>
                <b>{new Date(teslim.gonderim_tarihi).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</b>
              </span>
            )}
          </div>
          <button type="button" style={btn} disabled={!!islem} onClick={async () => {
            try { blobKaydet(await kontrolListesiUret(okulAd, yil, ay, maddeler, belgeler, teslim), `Kontrol_Listesi_${AYLAR[ay]}_${yil}.pdf`) } catch (e) { hata(e) }
          }}><ListChecks size={14} aria-hidden="true" /> Kontrol listesi</button>
          <button type="button" style={btn} disabled={!!islem || belgeler.length === 0}
            onClick={async () => { try { await dosyayiZiple(okulAd, yil, ay, maddeler, belgeler, teslim, setIslem) } catch (e) { hata(e) } finally { setIslem(null) } }}>
            <FileArchive size={14} aria-hidden="true" /> ZIP indir
          </button>
        </div>

        {durum === 'taslak' && (
          <div style={{ padding: 12, borderRadius: 10, background: 'var(--surface2)', fontSize: 13 }}>
            Okul bu dosyayı henüz denetime göndermedi. Yüklenen belgeleri ve sistem belgelerinin güncel hâlini görebilirsiniz; karar gönderimden sonra verilir.
          </div>
        )}
        {msg && <div role="status" style={{ padding: 12, borderRadius: 10, fontSize: 13, background: msg.tip === 'ok' ? 'var(--success-light)' : 'var(--danger-light)', color: msg.tip === 'ok' ? '#1a6b34' : 'var(--danger)' }}>{msg.text}</div>}
        {islem && <div role="status" style={{ padding: 12, borderRadius: 10, fontSize: 13, background: 'var(--info-light)' }}>⏳ {islem}</div>}

        <style>{LISTE_CSS}</style>
        {!onizleme && belgeler.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text2)' }}>
            <Eye size={14} aria-hidden="true" /> Bir belgeyi açmak, incelemek ve onaylamak için üzerine tıklayın; belge büyük pencerede açılır.
          </div>
        )}
        {/* flexShrink: 0 — overflow:hidden bir flex öğesi küçülüp içeriği kesiyor, kaydırma çıkmıyordu */}
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', flexShrink: 0 }}>
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
                  {mb.map(b => {
                    const secili = seciliId === b.id
                    const { I, renk } = dosyaIkonu(b.dosya_adi, b.mime)
                    return (
                      <button key={b.id} type="button" className="dd-belge" onClick={() => belgeGoster(b, m)} aria-pressed={secili}
                        title={`${b.dosya_adi} — görüntülemek için tıklayın`}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', marginTop: 6, padding: '8px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', fontSize: 13, color: 'var(--text)',
                          background: secili ? 'var(--accent-lighter)' : 'var(--surface2)', border: secili ? '1px solid var(--accent)' : '1px solid var(--border-light)' }}>
                        <I size={18} aria-hidden="true" style={{ color: renk, flexShrink: 0 }} />
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span className="dd-ad" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--accent)' }}>{b.dosya_adi}</span>
                          <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text3)', marginTop: 1 }}>
                            {b.kaynak === 'otomatik' ? 'Gönderim anındaki kopya · ' : 'Okulun yüklediği belge · '}{boyutFmt(b.boyut)}{m.yillik && (b.yil !== yil || b.ay !== ay) ? ` · ${AYLAR[b.ay]} ${b.yil}` : ''}
                          </span>
                        </span>
                        {rozet(b.durum, b.durum === 'bekliyor' ? 'Karar bekliyor' : b.durum === 'onaylandi' ? 'Onaylandı' : 'İade edildi')}
                        <span className="dd-ac" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                          {secili ? 'Açık' : 'Görüntüle'} <ChevronRight size={15} aria-hidden="true" />
                        </span>
                      </button>
                    )
                  })}
                  {m.tip === 'otomatik' && (
                    <button type="button" className="dd-guncel" onClick={() => guncelGoster(m)} disabled={!!islem} aria-pressed={guncelSecili}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: '#35566f',
                        background: guncelSecili ? '#eef3f7' : 'transparent', border: '1px dashed #9fb6c9' }}>
                      <FileSearch size={14} aria-hidden="true" />
                      {mb.some(b => b.kaynak === 'otomatik') ? 'Gönderilen hâli okulun şu anki verisiyle yan yana karşılaştır' : 'Gönderim kopyası yok — okulun şu anki verisinden görüntüle'}
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
        <div role="presentation" onClick={onizlemeKapat}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 20, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(8px, 3vh, 32px) clamp(8px, 3vw, 40px)' }}>
        <aside role="dialog" aria-modal="true" aria-label="Belge önizleme" onClick={e => e.stopPropagation()}
          style={{ width: 'min(1200px, 100%)', height: '100%', background: 'var(--surface)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.3)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                Madde {onizleme.madde.sira_no} · {onizleme.tur === 'guncel' ? (onizleme.kopya ? 'gönderim kopyası ↔ okulun güncel verisi' : 'okulun güncel verisi') : onizleme.belge.kaynak === 'otomatik' ? 'gönderim kopyası' : 'okulun yüklediği belge'}
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2, wordBreak: 'break-all' }}>{onizleme.tur === 'guncel' ? (onizleme.kopya ? onizleme.madde.baslik : onizleme.ad) : onizleme.belge.dosya_adi}</div>
              {onizleme.tur === 'guncel' && (
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
                  {onizleme.kopya
                    ? 'Solda okulun gönderdiği hâl, sağda okulun sistemdeki şu anki verisinden yeniden üretilen hâl var. Okul gönderimden sonra veride değişiklik yaptıysa iki belge farklı olur.'
                    : 'Bu madde için gönderim kopyası yok; belge okulun sistemdeki şu anki verisinden üretildi.'}
                </div>
              )}
            </div>
            {onizleme.url && (
              <a href={onizleme.url} target="_blank" rel="noopener noreferrer" aria-label="Yeni sekmede aç" title="Yeni sekmede aç"
                style={{ ...btn, padding: 8 }}><ExternalLink size={15} /></a>
            )}
            <button type="button" aria-label="İndir" title="İndir" style={{ ...btn, padding: 8 }}
              onClick={() => onizleme.tur === 'guncel' ? blobKaydet(onizleme.blob, onizleme.ad) : belgeIndir(onizleme.belge).catch(hata)}>
              <Download size={15} />
            </button>
            <button type="button" aria-label="Önizlemeyi kapat" title="Kapat" style={{ ...btn, padding: 8 }} onClick={onizlemeKapat}><X size={15} /></button>
          </div>

          <div style={{ flex: 1, minHeight: 0, background: '#e9ebee', display: 'flex' }}>
            {onizleme.tur === 'guncel' && onizleme.kopya ? (
              <div style={{ flex: 1, display: 'flex', gap: 2, minWidth: 0 }}>
                {([
                  ['Gönderim anındaki kopya', teslim?.gonderim_tarihi ? new Date(teslim.gonderim_tarihi).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : onizleme.kopya.belge.dosya_adi, onizleme.kopya.url, 'var(--info-light)', '#1a5b8a'],
                  ['Okulun şu anki verisi', 'şimdi üretildi', onizleme.url, 'var(--success-light)', '#1a6b34'],
                ] as const).map(([baslik, alt, url, bg, fg]) => (
                  <div key={baslik} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '6px 12px', background: bg, color: fg, fontSize: 12.5, fontWeight: 700, display: 'flex', gap: 8, alignItems: 'baseline' }}>
                      {baslik}<span style={{ fontWeight: 500, fontSize: 11.5 }}>{alt}</span>
                    </div>
                    <iframe src={url} title={baslik} style={{ flex: 1, border: 'none', width: '100%' }} />
                  </div>
                ))}
              </div>
            ) : !onizleme.url ? (
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
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'stretch' }}>
              <textarea id="belgeNot" rows={2} value={belgeNot} onChange={e => setBelgeNot(e.target.value)} placeholder="Örn. belgenin tarihi okunmuyor"
                style={{ flex: '1 1 320px', padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 8, flex: '0 1 340px', alignItems: 'stretch' }}>
                <button type="button" style={{ ...btnIade, flex: 1, justifyContent: 'center' }} onClick={() => belgeKarar(onizleme.belge, 'iade', true)}><Undo2 size={14} aria-hidden="true" /> İade</button>
                <button type="button" style={{ ...btnOnay, flex: 1, justifyContent: 'center' }} onClick={() => belgeKarar(onizleme.belge, 'onaylandi', true)}><CheckCircle2 size={14} aria-hidden="true" /> Onayla ve sonraki</button>
              </div>
              </div>
            </div>
          )}
        </aside>
        </div>
      )}
    </div>
  )
}
