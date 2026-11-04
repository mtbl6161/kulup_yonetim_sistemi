'use client'
import {
  DONEM_ADI, YILLIK_AYLIK_KARSILIGI, YILLIK_INDIRIM_ETIKETI, YILLIK_LISTE_UCRETI, YILLIK_TASARRUF,
  planUcreti, tl, type AbonelikDonemi,
} from '@/lib/abonelikPlanlari'

// Abonelik plan seçimi (radyo kartları) ve sipariş özeti. Ödeme ekranları ile Ayarlar › Abonelik ortak kullanır.

const SIRA: AbonelikDonemi[] = ['year', 'month']

export function PlanSecici({ donem, setDonem }: { donem: AbonelikDonemi; setDonem: (d: AbonelikDonemi) => void }) {
  return (
    <div className="ab-plans" role="radiogroup" aria-label="Abonelik planı">
      <style>{PLAN_CSS}</style>
      {SIRA.map(d => (
        <button
          key={d} type="button" role="radio" aria-checked={donem === d}
          className={`ab-plan${donem === d ? ' on' : ''}`} onClick={() => setDonem(d)}
        >
          <span className="ab-radio" aria-hidden />
          <span className="ab-plan-txt">
            <span className="ab-plan-t">
              {DONEM_ADI[d]}
              {d === 'year' && YILLIK_INDIRIM_ETIKETI && <span className="ab-pill">{YILLIK_INDIRIM_ETIKETI}</span>}
            </span>
            <span className="ab-plan-s">
              {d === 'year' ? `Ayda ₺${tl(YILLIK_AYLIK_KARSILIGI)}'ye denk gelir` : 'Her ay yenilenir, istediğiniz an iptal'}
            </span>
          </span>
          <span className="ab-plan-p">
            <strong>₺{tl(planUcreti(d))}</strong>
            <small>/ {d === 'year' ? 'yıl' : 'ay'}</small>
          </span>
        </button>
      ))}
    </div>
  )
}

export function SiparisOzeti({ donem }: { donem: AbonelikDonemi }) {
  const yillik = donem === 'year'
  const indirimVar = yillik && YILLIK_TASARRUF > 0
  return (
    <div className="ab-order">
      <div><span>Klüp360 · {DONEM_ADI[donem]} abonelik</span><span>₺{tl(indirimVar ? YILLIK_LISTE_UCRETI : planUcreti(donem))}</span></div>
      {indirimVar && <div className="ab-order-ind"><span>Yıllık plan indirimi</span><span>−₺{tl(YILLIK_TASARRUF)}</span></div>}
      <div className="ab-order-tot"><span>Bugün ödenecek</span><span>₺{tl(planUcreti(donem))}</span></div>
    </div>
  )
}

const PLAN_CSS = `
.ab-plans{display:grid;gap:10px}
.ab-plan{display:flex;align-items:center;gap:14px;width:100%;text-align:left;font:inherit;color:var(--text);cursor:pointer;
  background:var(--surface);border:1.5px solid var(--border);border-radius:14px;padding:15px 18px;transition:border-color .15s,box-shadow .15s}
.ab-plan:hover{border-color:var(--border-strong)}
.ab-plan:focus-visible{outline:none;box-shadow:var(--ring)}
.ab-plan.on{border-color:var(--accent);box-shadow:0 0 0 4px rgba(35,71,217,.12)}
.ab-radio{width:20px;height:20px;border-radius:50%;border:2px solid var(--border-strong);flex-shrink:0;position:relative}
.ab-plan.on .ab-radio{border-color:var(--accent)}
.ab-plan.on .ab-radio::after{content:"";position:absolute;inset:3px;border-radius:50%;background:var(--accent)}
.ab-plan-txt{display:flex;flex-direction:column;gap:2px;min-width:0}
.ab-plan-t{font-weight:700;font-size:15px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ab-plan-s{font-size:13px;color:var(--text3)}
.ab-pill{font-size:12px;font-weight:700;border-radius:999px;padding:3px 9px;background:var(--accent-lighter);color:var(--accent-dark)}
.ab-plan-p{font-variant-numeric:tabular-nums;margin-left:auto;text-align:right;flex-shrink:0}
.ab-plan-p strong{font-family:var(--font-display);font-size:20px;font-weight:800;display:block;line-height:1.1}
.ab-plan-p small{font-size:12px;color:var(--text3)}
.ab-order{font-variant-numeric:tabular-nums;border:1px solid var(--border);border-radius:14px;background:var(--surface);overflow:hidden}
.ab-order>div{display:flex;justify-content:space-between;gap:12px;padding:12px 18px;font-size:14px;border-bottom:1px solid var(--border)}
.ab-order>div:last-child{border-bottom:0}
.ab-order-ind{color:var(--success)}
.ab-order .ab-order-tot{font-weight:800;font-size:16px;background:var(--surface2)}
`
