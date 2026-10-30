'use client'
// Tanıtım filmi oynatıcısı: sahneler kodla çizilir, video dosyası yoktur. Görünür olduğunda kendiliğinden oynar,
// hareketi azaltma tercihinde durur ve her sahnenin son karesini gösterir.
import { useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore, type Dispatch, type RefObject } from 'react'
import Image from 'next/image'
import { Play, Pause, Maximize2, X, Smartphone, LayoutDashboard, Users, BookOpen, FileText, Wallet, BookText, FolderCheck, MessageSquareText, type LucideIcon } from 'lucide-react'
import { BOLUMLER, MENU, ara, type Bolum, type Imlec } from './sahneler'

const GEN = 800, YUK = 460
const BEKLE = 1.4 // sahne bitince son karede bekleme (sn)
const MENU_IKON = [LayoutDashboard, Users, BookOpen, FileText, Wallet, BookText, FolderCheck]

/** Bir filmin sahneleri ve sahnelerde görünen uygulamanın sol menüsü */
export interface FilmSeti {
  bolumler: Bolum[]
  menu: [string, LucideIcon][]
  /** Menünün üstündeki küçük grup başlığı (ör. denetçinin ili) */
  grup?: string
  /** Koyu menü: denetçi paneli gibi farklı bir ekran olduğunu belli eder */
  koyu?: boolean
}
export const KULUP_SETI: FilmSeti = { bolumler: BOLUMLER, menu: MENU.map((m, i) => [m, MENU_IKON[i]]) }

/** Uygulama kendi kaydırma kabında döndüğü için görünürlük o kaba göre ölçülür */
export function kaydiriciBul(el: HTMLElement | null): HTMLElement | null {
  let s = el?.parentElement ?? null
  while (s) {
    const oy = getComputedStyle(s).overflowY
    if ((oy === 'auto' || oy === 'scroll') && s.scrollHeight > s.clientHeight + 4) return s
    s = s.parentElement
  }
  return null
}

function useGorunur(ref: RefObject<HTMLElement | null>) {
  const [gorunur, setGorunur] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([e]) => setGorunur(e.isIntersecting), { root: kaydiriciBul(el), threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [ref])
  return gorunur
}

const HAREKET_AZ = '(prefers-reduced-motion: reduce)'
function useHareketAz() {
  return useSyncExternalStore(
    abone => { const mq = window.matchMedia(HAREKET_AZ); mq.addEventListener('change', abone); return () => mq.removeEventListener('change', abone) },
    () => window.matchMedia(HAREKET_AZ).matches,
    () => false,
  )
}

/** Aktifken her karede geçen süreyi sayaca iletir */
function useKare(aktif: boolean, gonder: Dispatch<Eylem>, dongu = false) {
  useEffect(() => {
    if (!aktif) return
    let son = performance.now(), id = 0
    const adim = (an: number) => { gonder({ tip: 'ilerle', dt: Math.min((an - son) / 1000, 0.1), dongu }); son = an; id = requestAnimationFrame(adim) }
    id = requestAnimationFrame(adim)
    return () => cancelAnimationFrame(id)
  }, [aktif, gonder, dongu])
}

function imlecKonum(kf: Imlec[], t: number) {
  let i = 0
  while (i < kf.length - 1 && kf[i + 1][0] <= t) i++
  const a = kf[i], b = kf[Math.min(i + 1, kf.length - 1)]
  const p = b[0] > a[0] ? ara(t, a[0], b[0]) : 1
  const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
  const tik = kf.some(k => k[3] && t >= k[0] && t - k[0] < 0.03)
  return { x: a[1] + (b[1] - a[1]) * e, y: a[2] + (b[2] - a[2]) * e, tik }
}

/** 800×460 sabit sahne; bulunduğu genişliğe ölçeklenir */
export function SahneAlani({ set, bolum, t, onClick }: { set: FilmSeti; bolum: number; t: number; onClick?: () => void }) {
  const dis = useRef<HTMLDivElement>(null)
  const [olcek, setOlcek] = useState(1)
  useEffect(() => {
    const el = dis.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setOlcek(e.contentRect.width / GEN))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const b = set.bolumler[bolum]
  const tg = Math.min(t, 1)
  const im = imlecKonum(b.imlec, tg)
  return (
    <div ref={dis} className="fs-dis" style={{ height: YUK * olcek }} onClick={onClick}>
      <div className="fs-sahne" style={{ transform: `scale(${olcek})` }} aria-hidden>
        <aside className={`fs-yan ${set.koyu ? 'koyu' : ''}`}>
          <div className="fs-yan-logo"><Image src="/logo.png" alt="" width={40} height={40} /><span>Klüp<b>360</b></span></div>
          {set.grup && <div className="fs-yan-grup">{set.grup}</div>}
          {set.menu.map(([m, Ikon], i) => <div key={m} className={`fs-yan-m ${i === b.menu ? 'aktif' : ''}`}><Ikon size={13} />{m}</div>)}
        </aside>
        <main className="fs-ana"><b.Sahne t={tg} /></main>
        {b.Kaplama && <b.Kaplama t={tg} />}
        <div className={`fs-imlec ${im.tik ? 'tik' : ''}`} style={{ transform: `translate(${im.x}px, ${im.y}px)` }}>
          <svg width="20" height="22" viewBox="0 0 20 22"><path d="M2 1.5 L2 17.5 L6.4 13.6 L9.3 20.2 L12.2 18.9 L9.4 12.5 L15.4 12.3 Z" fill="#0E1116" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" /></svg>
        </div>
      </div>
    </div>
  )
}

type Durum = { bolum: number; t: number }
type Eylem = { tip: 'ilerle'; dt: number; dongu?: boolean } | { tip: 'git'; bolum: number }
const sayacYap = (bolumler: Bolum[]) => (d: Durum, a: Eylem): Durum => {
  if (a.tip === 'git') return { bolum: a.bolum, t: 0 }
  const sure = bolumler[d.bolum].sure
  const t = d.t + a.dt / sure
  if (t < 1 + BEKLE / sure) return { ...d, t }
  return a.dongu ? { ...d, t: 0 } : { bolum: (d.bolum + 1) % bolumler.length, t: 0 }
}

const KULUP_SAYAC = sayacYap(BOLUMLER)

function PencereCubugu({ adres }: { adres: string }) {
  return (
    <div className="fl-bar">
      <span className="fl-nokta" style={{ background: '#ff5f56' }} /><span className="fl-nokta" style={{ background: '#ffbd2e' }} /><span className="fl-nokta" style={{ background: '#27c93f' }} />
      <div className="fl-adres">{adres}</div>
      <span className="fl-etiket"><span className="uzun">Örnek verilerle canlandırma</span><span className="kisa">Örnek veriler</span></span>
    </div>
  )
}

function OynatDugmesi({ oynuyor, onClick }: { oynuyor: boolean; onClick: () => void }) {
  return (
    <button type="button" className="fl-oynat" onClick={onClick} aria-label={oynuyor ? 'Duraklat' : 'Oynat'}>
      {oynuyor ? <Pause size={15} /> : <Play size={15} />}
    </button>
  )
}

/**
 * Ana oynatıcı: setin bütün bölümleri sırayla, altyazılı.
 * onBuyut verilirse sağ altta büyütme düğmesi çıkar (tam ekran izleme katmanını açar).
 * hep: görünürlüğe bakmadan oynar (tam ekran katmanında kullanılır).
 */
export function Film({ set = KULUP_SETI, baslangic = 0, onBuyut, hep = false }: { set?: FilmSeti; baslangic?: number; onBuyut?: (bolum: number) => void; hep?: boolean }) {
  const kap = useRef<HTMLDivElement>(null)
  const gorunur = useGorunur(kap) || hep
  const hareketAz = useHareketAz()
  // null: kendiliğinden (hareketi azaltma tercihinde durur), true/false: kullanıcının seçimi
  const [secim, setSecim] = useState<boolean | null>(null)
  const sayac = useMemo(() => sayacYap(set.bolumler), [set])
  const [d, gonder] = useReducer(sayac, { bolum: baslangic, t: 0 })
  const oynuyor = gorunur && (secim ?? !hareketAz)
  useKare(oynuyor, gonder)

  const b = set.bolumler[d.bolum]
  const t = hareketAz && secim === null ? 1 : d.t
  const altyazi = [...b.altyazi].reverse().find(([z]) => Math.min(t, 1) >= z)?.[1] ?? ''

  return (
    <div ref={kap} className="fl">
      <div className="fl-pencere">
        <PencereCubugu adres={b.adres} />
        <div className="fl-sahne">
          <SahneAlani set={set} bolum={d.bolum} t={t} onClick={() => setSecim(!oynuyor)} />
          <div className="fl-dugmeler">
            {onBuyut && (
              <button type="button" className="fl-oynat" onClick={() => onBuyut(d.bolum)} aria-label="Büyüt" title="Büyüt">
                <Maximize2 size={14} />
              </button>
            )}
            <OynatDugmesi oynuyor={oynuyor} onClick={() => setSecim(!oynuyor)} />
          </div>
        </div>
        {/* Video ilerleme çubuğu gibi: her bölüm bir parça, tıklanınca o bölüme gider */}
        <div className="fl-ilerleme">
          {set.bolumler.map((x, i) => {
            const dolu = i < d.bolum ? 1 : i === d.bolum ? Math.min(t, 1) : 0
            return (
              <button key={x.id} type="button" aria-current={i === d.bolum ? 'step' : undefined} aria-label={`${i + 1}. bölüm: ${x.kisa}`} title={x.kisa}
                className="fl-parca" onClick={() => { gonder({ tip: 'git', bolum: i }); setSecim(null) }}>
                <span><span style={{ width: `${dolu * 100}%` }} /></span>
              </button>
            )
          })}
        </div>
        <div className="fl-altyazi">
          <MessageSquareText size={16} />
          <b>{d.bolum + 1}/{set.bolumler.length} · {b.kisa}</b>
          <span key={altyazi}>{altyazi}</span>
        </div>
      </div>
    </div>
  )
}

/** Hikâye bölümlerinde tek sahneyi döngüde oynatan küçük oynatıcı (durdurulabilir) */
export function MiniFilm({ bolum }: { bolum: number }) {
  const kap = useRef<HTMLDivElement>(null)
  const gorunur = useGorunur(kap)
  const hareketAz = useHareketAz()
  const [secim, setSecim] = useState<boolean | null>(null)
  const [d, gonder] = useReducer(KULUP_SAYAC, { bolum, t: 0 })
  const oynuyor = gorunur && (secim ?? !hareketAz)
  useKare(oynuyor, gonder, true)
  return (
    <div ref={kap} className="fl-mini">
      <PencereCubugu adres={BOLUMLER[bolum].adres} />
      <div className="fl-sahne">
        <SahneAlani set={KULUP_SETI} bolum={bolum} t={hareketAz && secim === null ? 1 : d.t} onClick={() => setSecim(!oynuyor)} />
        <div className="fl-dugmeler"><OynatDugmesi oynuyor={oynuyor} onClick={() => setSecim(!oynuyor)} /></div>
      </div>
    </div>
  )
}

/** Tam ekran izleme katmanı: ziyaretçinin sayfadaki yerini kaybettirmeden filmi büyük oynatır */
export function Sinema({ set, bolum, donus, onKapat }: { set: FilmSeti; bolum: number; donus?: HTMLElement | null; onKapat: () => void }) {
  const kapat = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    // Bazı tarayıcılar tıklanan düğmeye odak vermez; kapanınca odak açan düğmeye döner
    const onceki = donus ?? (document.activeElement as HTMLElement | null)
    kapat.current?.focus()
    const tus = (e: KeyboardEvent) => { if (e.key === 'Escape') onKapat() }
    window.addEventListener('keydown', tus)
    return () => { window.removeEventListener('keydown', tus); onceki?.focus({ preventScroll: true }) }
  }, [onKapat, donus])
  return (
    <div className="fl-sinema" role="dialog" aria-modal="true" aria-label="Tanıtım filmi" onClick={e => { if (e.target === e.currentTarget) onKapat() }}>
      <button ref={kapat} type="button" className="fl-sinema-kapat" onClick={onKapat} aria-label="Kapat"><X size={20} /></button>
      <div className="fl-sinema-icerik"><Film set={set} baslangic={bolum} hep /></div>
      <div className="fl-sinema-ipucu"><Smartphone size={15} /> Ekrandaki yazıları okumak için telefonu yan çevirin</div>
    </div>
  )
}

export const FILM_CSS = `
.fl { width: 100%; }
.fl-pencere, .fl-mini { border-radius: 16px; overflow: hidden; background: #fff; border: 1px solid #DDE1E8;
  box-shadow: 0 40px 80px -36px rgba(14,17,22,.45), 0 0 0 6px rgba(255,255,255,.6); text-align: left; }
.fl-mini { border-radius: 14px; box-shadow: 0 30px 60px -34px rgba(14,17,22,.4); }
.fl-bar { height: 38px; display: flex; align-items: center; gap: 7px; padding: 0 14px; background: #F7F8FA; border-bottom: 1px solid #E3E6EB; }
.fl-nokta { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.fl-adres { flex: 1; max-width: 320px; margin-left: 10px; height: 24px; border-radius: 7px; background: #fff; border: 1px solid #E3E6EB;
  display: flex; align-items: center; padding: 0 10px; font-size: 11.5px; color: #5F6876; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fl-etiket { margin-left: auto; font-size: 11px; font-weight: 600; color: #5F6876; white-space: nowrap; }
.fl-etiket .kisa { display: none; }
.fl-altyazi { display: flex; align-items: center; gap: 10px; min-height: 52px; padding: 8px 18px 12px; background: #0E1116; color: #fff;
  font-size: clamp(13px, 1.6vw, 15.5px); font-weight: 500; line-height: 1.4; }
.fl-altyazi svg { color: #8EA3EE; flex-shrink: 0; }
.fl-altyazi span { animation: fl-gir .45s ease both; }
@keyframes fl-gir { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
.fl-sahne { position: relative; }
.fl-dugmeler { position: absolute; right: 12px; bottom: 12px; z-index: 30; display: flex; gap: 8px; }
.fl-oynat { width: 36px; height: 36px; border-radius: 50%; border: none;
  background: rgba(14,17,22,.72); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer;
  opacity: .55; transition: opacity .15s, background .15s; }
.fl-pencere:hover .fl-oynat, .fl-mini:hover .fl-oynat, .fl-oynat:focus-visible { opacity: 1; }
.fl-oynat:hover { background: #2347D9; }
.fl-ilerleme { display: flex; gap: 4px; padding: 0 12px; background: #0E1116; }
/* İnce çizgi, ama dokunma alanı 28px */
.fl-parca { flex: 1; min-height: 28px; padding: 0; border: none; background: none; cursor: pointer; display: flex; align-items: center; }
.fl-parca > span { flex: 1; }
.fl-parca > span { display: block; height: 3px; border-radius: 2px; background: rgba(255,255,255,.22); overflow: hidden; transition: height .15s; }
.fl-parca:hover > span { height: 5px; }
.fl-parca > span > span { display: block; height: 100%; background: #8EA3EE; }
.fl-altyazi b { flex-shrink: 0; font-size: 12px; font-weight: 700; color: #8EA3EE; white-space: nowrap; }
/* tam ekran izleme katmanı; pencere içi yükseklik: çubuk 38 + ilerleme 28 + altyazı ~52 */
.fl-sinema { position: fixed; inset: 0; z-index: 1000; background: rgba(8,10,14,.94); display: flex; flex-direction: column;
  align-items: center; justify-content: center; padding: 16px; animation: fl-gir .25s ease both; }
.fl-sinema-icerik { width: min(1180px, 100%, calc((100dvh - 150px) * 1.739)); }
.fl-sinema .fl-pencere { box-shadow: 0 30px 80px -20px rgba(0,0,0,.6); }
.fl-sinema-kapat { position: absolute; top: 12px; right: 12px; width: 44px; height: 44px; border-radius: 50%; border: none; cursor: pointer;
  background: rgba(255,255,255,.12); color: #fff; display: flex; align-items: center; justify-content: center; }
.fl-sinema-kapat:hover { background: rgba(255,255,255,.22); }
.fl-sinema-ipucu { display: none; align-items: center; gap: 8px; margin-top: 16px; font-size: 13px; color: rgba(255,255,255,.75); text-align: center; }
@media (max-width: 760px) and (orientation: portrait) { .fl-sinema-ipucu { display: flex; } }
/* Yan çevrilmiş telefon: yükseklik dar, sahneye yer açmak için pencere çubuğu gizlenir, altyazı sıkışır */
@media (max-height: 500px) {
  .fl-sinema { padding: 4px 56px 4px 4px; }
  .fl-sinema .fl-bar { display: none; }
  .fl-sinema .fl-altyazi { min-height: 34px; padding: 4px 14px 6px; font-size: 13px; }
  .fl-sinema-icerik { width: min(100%, calc((100dvh - 72px) * 1.739)); }
}
@media (max-width: 760px) {
  .fl-etiket .uzun { display: none; }
  .fl-etiket .kisa { display: inline; }
  .fl-adres { max-width: 180px; }
  .fl-altyazi b { display: none; }
  .fl-oynat { opacity: .85; }
}

/* sahne */
.fs-dis { position: relative; width: 100%; overflow: hidden; cursor: pointer; background: #F5F6F8; }
.fl-mini .fs-dis { cursor: default; }
.fs-sahne { position: absolute; top: 0; left: 0; width: ${GEN}px; height: ${YUK}px; transform-origin: 0 0; background: #F5F6F8;
  font-family: var(--font-sans); color: #0E1116; font-size: 12px; user-select: none; }
.fs-yan { position: absolute; left: 0; top: 0; bottom: 0; width: 150px; background: linear-gradient(180deg,#1B38B8,#0E1116); padding: 14px 10px; }
.fs-yan-logo { display: flex; align-items: center; gap: 7px; padding: 0 4px 16px; color: #fff; font-family: var(--font-display); font-weight: 800; font-size: 15px; }
.fs-yan-logo img { width: 22px; height: 22px; }
.fs-yan-logo b { color: #8EA3EE; }
.fs-yan-m { display: flex; align-items: center; gap: 8px; padding: 8px 9px; border-radius: 8px; margin-bottom: 2px; color: rgba(255,255,255,.6); font-size: 11.5px; font-weight: 500; white-space: nowrap; }
.fs-yan-m svg { flex-shrink: 0; opacity: .8; }
.fs-yan-m.aktif { background: rgba(255,255,255,.14); color: #fff; font-weight: 600; }
.fs-yan-m.aktif svg { color: #8EA3EE; opacity: 1; }
.fs-yan.koyu { background: #0E1116; border-right: 1px solid #1F2430; }
.fs-yan-grup { font-size: 9.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: rgba(255,255,255,.42); padding: 0 9px 8px; }
.fs-ana { position: absolute; left: 150px; top: 0; right: 0; bottom: 0; overflow: hidden; }
.fs-ust { position: absolute; left: 18px; top: 12px; }
.fs-ust-b { font-family: var(--font-display); font-size: 17px; font-weight: 700; letter-spacing: -.01em; }
.fs-ust-a { font-size: 11px; color: #5F6876; margin-top: 1px; }
.fs-btn { position: absolute; height: 30px; padding: 0 12px; border-radius: 8px; background: #2347D9; color: #fff; font-size: 11.5px; font-weight: 600;
  display: flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap; transition: transform .1s, background .1s; }
.fs-btn.basili { transform: scale(.94); background: #1B38B8; }
.fs-btn-ust { top: 12px; right: 18px; width: 132px; }
.fs-btn-ikincil { background: #fff; color: #0E1116; border: 1px solid #DDE1E8; width: 170px; }
.fs-don { animation: fs-don 0.8s linear infinite; }
@keyframes fs-don { to { transform: rotate(360deg); } }
.fs-kart { position: absolute; background: #fff; border: 1px solid #E3E6EB; border-radius: 12px; }
.fs-liste { left: 18px; width: 614px; overflow: hidden; }
.fs-satir { display: grid; grid-template-columns: 2fr 1.2fr 1.3fr 1fr; align-items: center; gap: 10px; height: 34px; padding: 0 14px; border-top: 1px solid #EEF0F4; }
.fs-satir-bas { height: 28px; border-top: none; background: #F8F9FB; font-size: 10px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: #5F6876; }
.fs-satir-top { background: #F8F9FB; font-weight: 700; }
.fs-satir .sag { text-align: right; }
.soluk { color: #5F6876; }
.kalin { font-weight: 700; }
.yesil-yazi { color: #0B6B42; }
.kirmizi-yazi { color: #B42318; }
.fs-kisi { display: flex; align-items: center; gap: 8px; font-weight: 600; min-width: 0; white-space: nowrap; }
.fs-kisi i { font-style: normal; width: 22px; height: 22px; border-radius: 50%; background: #EEF0F4; color: #3F4753; font-size: 9px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.fs-kisi em { display: block; font-style: normal; font-weight: 400; font-size: 10px; color: #5F6876; }
.fs-rozet { display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 5px; background: #EEF0F4; color: #3F4753; }
.fs-rozet.yesil { background: #E3F6EC; color: #0B6B42; }
.fs-rozet.kirmizi { background: #FDECEB; color: #B42318; }
.fs-rozet.mavi { background: #E8EDFD; color: #1B38B8; }
.fs-toast { position: absolute; left: 50%; bottom: 16px; margin-left: -230px; width: 460px; display: flex; align-items: center; gap: 10px;
  background: #0E1116; color: #fff; border-radius: 10px; padding: 11px 14px; font-size: 12px; font-weight: 500; box-shadow: 0 18px 36px -12px rgba(0,0,0,.45); }
.fs-toast-ic { width: 20px; height: 20px; border-radius: 50%; background: #1DB56C; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.fs-perde { position: absolute; inset: 0; background: rgba(14,17,22,.32); }
.fs-modal { position: absolute; left: 95px; top: 58px; width: 460px; height: 320px; background: #fff; border-radius: 14px; box-shadow: 0 30px 60px -20px rgba(0,0,0,.4); }
.fs-modal-b { position: absolute; left: 18px; top: 16px; font-family: var(--font-display); font-size: 15px; font-weight: 700; }
.fs-alan { position: absolute; left: 18px; right: 18px; }
.fs-alan label { display: block; font-size: 10.5px; font-weight: 600; color: #3F4753; height: 18px; }
.fs-girdi { height: 32px; border: 1px solid #DDE1E8; border-radius: 8px; display: flex; align-items: center; padding: 0 10px; font-size: 12.5px; }
.fs-girdi.odak { border-color: #2347D9; box-shadow: 0 0 0 3px rgba(35,71,217,.15); }
.fs-imlec-cubuk { width: 1.5px; height: 15px; background: #0E1116; margin-left: 1px; animation: fs-yanip .9s steps(1) infinite; }
@keyframes fs-yanip { 50% { opacity: 0; } }
.fs-aidat { position: absolute; left: 18px; right: 18px; top: 222px; border-radius: 9px; background: #F3F5FE; border: 1px solid #DCE3FB; padding: 9px 12px;
  display: flex; flex-direction: column; gap: 2px; font-size: 10.5px; color: #3F4753; }
.fs-aidat b { font-size: 13px; color: #1B38B8; }
.fs-btn-kaydet { right: 18px; bottom: 14px; width: 100px; }
.fs-izgara { display: grid; grid-template-columns: 46px repeat(5, 1fr); grid-template-rows: 20px repeat(6, 52px); gap: 4px; }
.fs-izgara-gun { font-size: 10px; font-weight: 700; color: #5F6876; text-align: center; text-transform: uppercase; letter-spacing: .05em; }
.fs-izgara-saat { font-size: 10px; color: #5F6876; display: flex; align-items: center; }
.fs-hucre { border-radius: 7px; border: 1px dashed #DDE1E8; display: flex; align-items: center; justify-content: center; gap: 3px; font-size: 10px; font-weight: 600; color: #3F4753; }
.fs-hucre.geldi { border: 1px solid #BFE8D3; background: #EFFAF4; color: #0B6B42; }
.fs-hucre.gelmedi { border: 1px solid #F5C2BE; background: #FDECEB; color: #B42318; }
.fs-kucuk-b { font-size: 12px; font-weight: 700; }
.fs-kucuk-a { font-size: 10.5px; color: #5F6876; margin-top: 2px; }
.fs-puantaj { display: flex; justify-content: space-between; align-items: center; padding: 9px 0; border-bottom: 1px solid #EEF0F4; font-size: 11.5px; }
.fs-puantaj b { font-size: 13px; transition: color .3s; }
.fs-puantaj b.dustu { color: #B42318; }
.fs-not { margin-top: 12px; font-size: 10.5px; line-height: 1.45; color: #3F4753; background: #F8F9FB; border-radius: 8px; padding: 8px 9px; }
.fs-bordro { grid-template-columns: 2.2fr .6fr 1fr 1fr 1fr; height: 42px; }
.fs-rozet-buyuk { position: absolute; right: 18px; top: 392px; height: 30px; display: flex; align-items: center; gap: 6px; padding: 0 12px; border-radius: 8px;
  background: #E3F6EC; color: #0B6B42; font-size: 11.5px; font-weight: 600; }
.fs-rozet-buyuk.mavi { background: #E8EDFD; color: #1B38B8; }
.fs-dosya { display: flex; align-items: center; gap: 8px; padding: 9px 11px; border-radius: 9px; background: #EFFAF4; border: 1px solid #BFE8D3; color: #0B6B42; font-size: 11.5px; font-weight: 600; margin-bottom: 8px; }
.fs-dosya em { margin-left: auto; font-style: normal; font-weight: 500; color: #3F4753; }
.fs-ekstre { display: grid; grid-template-columns: 34px 1fr 64px 20px; align-items: center; gap: 8px; height: 47px; border-top: 1px solid #EEF0F4; font-size: 11px; }
.fs-ekstre-ac { font-family: ui-monospace, monospace; font-size: 10px; color: #3F4753; min-width: 0; }
.fs-ekstre-ac em { display: block; font-family: var(--font-sans); font-style: normal; font-size: 10.5px; font-weight: 600; color: #1B38B8; margin-top: 2px; }
.fs-es { width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid #DDE1E8; display: flex; align-items: center; justify-content: center; color: #fff; }
.fs-es.tamam { background: #1DB56C; border-color: #1DB56C; }
.fs-buyuk-sayi { font-family: var(--font-display); font-size: 36px; font-weight: 800; letter-spacing: -.02em; margin-top: 8px; }
.fs-buyuk-sayi.kirmizi { color: #B42318; }
.fs-cubuk { height: 6px; border-radius: 3px; background: #EEF0F4; overflow: hidden; margin-top: 6px; }
.fs-cubuk span { display: block; height: 100%; background: #2347D9; border-radius: 3px; }
.fs-defter { grid-template-columns: .8fr 2.4fr 1fr 1fr; height: 40px; }
.fs-kagit { position: absolute; left: 160px; top: 30px; width: 330px; height: 440px; background: #fff; border-radius: 4px; padding: 22px 24px;
  box-shadow: 0 30px 60px -18px rgba(0,0,0,.45), 0 0 0 1px #E3E6EB; font-family: var(--font-sans); }
.fs-kagit-ust { text-align: center; font-size: 10px; font-weight: 700; line-height: 1.5; }
.fs-kagit-bant { margin: 16px 0 8px; border: 1px solid #0E1116; background: #ECEFF4; text-align: center; font-size: 12.5px; font-weight: 700; padding: 6px; }
.fs-kagit-b { text-align: center; font-size: 10.5px; font-weight: 700; margin-bottom: 10px; }
.fs-kagit-tablo { border: 1px solid #0E1116; font-size: 9px; }
.fs-kagit-tablo > div { display: grid; grid-template-columns: .8fr 1fr 1fr 1.1fr; border-top: 1px solid #C9CDD4; height: 19px; align-items: center; }
.fs-kagit-tablo > div > span { padding: 0 4px; text-align: right; }
.fs-kagit-tablo > div > span:first-child { text-align: left; font-weight: 700; }
.fs-kagit-tablo .bas { border-top: none; background: #ECEFF4; font-weight: 700; }
.fs-kagit-tablo .vurgu span:last-child { background: #FFE3EF; font-weight: 800; }
.fs-madde { grid-template-columns: 22px 1.6fr 1.2fr; height: 38px; }
.fs-denetci { position: absolute; inset: 0; z-index: 10; background: #F5F6F8; }
.fs-denetci-ust { display: flex; align-items: center; gap: 8px; height: 50px; padding: 0 18px; background: #0E1116; color: #fff; font-size: 13px; font-weight: 600; }
.fs-denetci-ust svg { color: #8EA3EE; }
.fs-denetci-ust em { margin-left: auto; font-style: normal; font-weight: 500; color: rgba(255,255,255,.6); font-size: 11.5px; }
.fs-denetci-liste { position: absolute; left: 18px; right: 18px; top: 70px; background: #fff; border: 1px solid #E3E6EB; border-radius: 12px; overflow: hidden; }
.fs-okul { grid-template-columns: 2fr 1fr 1fr; height: 46px; }
.fs-okul.vurgulu { background: #F3F5FE; font-weight: 600; }
.fs-muhur { position: absolute; left: 300px; top: 260px; padding: 10px 22px; border: 3px solid #1DB56C; color: #1DB56C; border-radius: 10px;
  font-family: var(--font-display); font-size: 26px; font-weight: 800; letter-spacing: .08em; background: rgba(255,255,255,.85); }
.fs-imlec { position: absolute; left: 0; top: 0; width: 20px; height: 22px; margin: -2px 0 0 -2px; pointer-events: none; z-index: 20; filter: drop-shadow(0 2px 3px rgba(0,0,0,.3)); }
.fs-imlec::after { content: ''; position: absolute; left: -12px; top: -12px; width: 28px; height: 28px; border-radius: 50%; border: 2px solid #2347D9; opacity: 0; transform: scale(.3); }
.fs-imlec.tik::after { animation: fs-tik .35s ease-out; }
.fs-imlec.tik svg { transform: scale(.88); }
@keyframes fs-tik { from { opacity: .8; transform: scale(.3); } to { opacity: 0; transform: scale(1.4); } }
`
