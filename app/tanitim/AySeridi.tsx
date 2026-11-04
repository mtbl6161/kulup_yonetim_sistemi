'use client'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

// Puantaj cetveli biçiminde ay şeridi: 1'den 31'e gün kutuları.
// Film oynarken ay dolar (onKare → guncelle); olay günlerine tıklayınca film o bölüme atlar.

export interface AyOlayi {
  gun: number
  ad: string
  /** Filmde karşılık gelen bölüm; yoksa hedef bölüme kaydırılır */
  bolum?: number
  hedef?: string
  /** Etiketin satırı ve günün hangi yanına yaslanacağı (çakışmasın diye) */
  satir?: 1 | 2
  hizala?: 'bas' | 'son'
}

export interface AySeridiTutamak { guncelle: (bolum: number, t: number) => void }

/** Film bölümlerinin ay içindeki aralıkları: [başlangıç günü, bitiş günü] (bölüm sırasıyla) */
const ARALIK: [number, number][] = [[1, 1], [2, 9], [10, 19], [20, 26], [27, 30], [31, 31]]

export const AySeridi = forwardRef<AySeridiTutamak, {
  olaylar: AyOlayi[]
  onBolum: (bolum: number) => void
  onHedef: (id: string) => void
}>(function AySeridi({ olaylar, onBolum, onHedef }, ref) {
  const [konum, setKonum] = useState({ bolum: 0, t: 0 })
  useImperativeHandle(ref, () => ({
    guncelle: (bolum, t) => setKonum(k => (k.bolum === bolum && Math.abs(k.t - t) < 0.02 ? k : { bolum, t })),
  }), [])

  const [bas, son] = ARALIK[konum.bolum] ?? [1, 1]
  const ilerleme = bas + (son - bas + 1) * konum.t // bu güne kadar işlenmiş sayılır
  const olayGunu = new Map(olaylar.map(o => [o.gun, o]))
  // Telefonda olaylar yatay kaydırılan bir satır: etkin olay görünür alanda kalsın (sayfa kaydırılmaz)
  const satir = useRef<HTMLUListElement>(null)
  useEffect(() => {
    const ul = satir.current, li = ul?.querySelector<HTMLElement>('li.aktif')
    if (!ul || !li || ul.scrollWidth <= ul.clientWidth) return
    const hedef = li.offsetLeft - (ul.clientWidth - li.offsetWidth) / 2
    ul.scrollLeft = Math.max(0, hedef) // anlık: yumuşak kaydırma film yeniden çizilirken yarıda kesilebiliyor
  }, [konum.bolum])

  const sec = (o: AyOlayi) => (o.bolum !== undefined ? onBolum(o.bolum) : o.hedef && onHedef(o.hedef))

  return (
    <div className="ay" role="group" aria-label="Bir ayın akışı">
      <ol className="ay-gunler">
        {Array.from({ length: 31 }, (_, i) => {
          const gun = i + 1
          const o = olayGunu.get(gun)
          const islendi = gun < ilerleme
          const aktif = o !== undefined && o.bolum === konum.bolum
          const sinif = ['ay-gun', o ? 'olay' : '', o?.hedef ? 'ayri' : '', islendi ? 'islendi' : '', aktif ? 'aktif' : ''].filter(Boolean).join(' ')
          return (
            <li key={gun} className={sinif}>
              {o ? (
                <button type="button" onClick={() => sec(o)} aria-label={`Ayın ${gun}. günü: ${o.ad}`} aria-current={aktif ? 'step' : undefined}>
                  {gun}
                </button>
              ) : <span aria-hidden>{gun}</span>}
            </li>
          )
        })}
      </ol>
      <ul className="ay-olaylar" ref={satir}>
        {olaylar.map(o => (
          <li key={o.gun} className={[o.bolum === konum.bolum ? 'aktif' : '', o.hizala === 'son' ? 'son' : ''].filter(Boolean).join(' ') || undefined}
            style={{ gridRow: o.satir ?? 1, gridColumn: o.hizala === 'son' ? `${Math.max(1, o.gun - 7)} / ${o.gun + 1}` : `${o.gun} / span 8` }}>
            <button type="button" onClick={() => sec(o)}>{o.ad}</button>
          </li>
        ))}
      </ul>
    </div>
  )
})

export const AY_CSS = `
.ay{--hucre:#fff;--cizgi:var(--tz-cizgi);margin:0}
.ay-gunler{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(31,minmax(0,1fr));gap:3px}
.ay-gun{min-width:0}
.ay-gun>span,.ay-gun>button{display:flex;align-items:flex-end;justify-content:center;width:100%;aspect-ratio:1/1.3;padding:0 0 3px;
  border:1px solid var(--cizgi);border-radius:4px;background:var(--hucre);font:500 11px/1 var(--tz-govde);color:var(--tz-tx3);font-variant-numeric:tabular-nums}
.ay-gun.islendi>span{background:var(--tz-mavi-soluk);border-color:var(--tz-mavi-soluk-cizgi);color:var(--tz-mavi-koyu)}
.ay-gun.olay>button{cursor:pointer;background:var(--tz-mavi);border-color:var(--tz-mavi);color:#fff;font-weight:600}
.ay-gun.olay.ayri>button{background:#fff;border:2px solid var(--tz-mavi);color:var(--tz-mavi)}
.ay-gun.aktif>span,.ay-gun.aktif>button{outline:2px solid var(--tz-murekkep);outline-offset:1px}
.ay-gun>button:focus-visible,.ay-olaylar button:focus-visible{outline:3px solid var(--tz-mavi);outline-offset:2px}
.ay-olaylar{list-style:none;margin:8px 0 0;padding:0;display:grid;grid-template-columns:repeat(31,minmax(0,1fr));gap:3px}
.ay-olaylar li{min-width:0}
.ay-olaylar li.son{justify-self:end}
.ay-olaylar button{border:0;background:none;padding:2px 0;cursor:pointer;font:500 13px/1.3 var(--tz-govde);color:var(--tz-tx2);white-space:nowrap}
.ay-olaylar li.aktif button{color:var(--tz-murekkep);font-weight:600;text-decoration:underline;text-underline-offset:4px;text-decoration-thickness:2px}
/* Telefonda takvim ızgarası yerine ince ilerleme çubuğu: 31 gün tek satırda, numarasız; olaylar altında kaydırılabilir satır */
@media (max-width:760px){
  .ay-gunler{gap:2px}
  .ay-gun>span,.ay-gun>button{aspect-ratio:auto;height:10px;padding:0;border-radius:2px;font-size:0;color:transparent}
  .ay-gun.olay>button{height:10px}
  .ay-gun.olay.ayri>button{border-width:2px}
  .ay-gun.aktif>span,.ay-gun.aktif>button{outline-offset:1px}
  .ay-olaylar{position:relative;display:flex;gap:8px;margin:12px -16px 0;padding:0 16px 4px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
  .ay-olaylar::-webkit-scrollbar{display:none}
  .ay-olaylar li{grid-column:auto !important;grid-row:auto !important;justify-self:auto;flex-shrink:0}
  .ay-olaylar button{min-height:36px;padding:0 12px;border:1px solid var(--tz-cizgi);border-radius:999px;background:#fff;font-size:14px}
  .ay-olaylar li.aktif button{background:var(--tz-murekkep);border-color:var(--tz-murekkep);color:#fff;text-decoration:none}
}
@media (prefers-reduced-motion: reduce){.ay *{transition:none !important}}
`
