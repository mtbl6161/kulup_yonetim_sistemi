'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { gelirVergisiHesapla, fmtTL } from '@/lib/hesaplama'
import type { VergiDilimi } from '@/lib/types'

const DILIMLER: VergiDilimi[] = [
  { ust: 220000, oran: 0.15 },
  { ust: 480000, oran: 0.20 },
  { ust: 1800000, oran: 0.27 },
  { ust: 6000000, oran: 0.35 },
  { ust: 99999999, oran: 0.40 },
]

function num(v: string, fallback = 0): number {
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : fallback
}

const fmtInt = (n: number) => n.toLocaleString('tr-TR')

export default function VergiContent() {
  const [matrah, setMatrah] = useState('50000')

  const { tutar, oran } = useMemo(() => gelirVergisiHesapla(num(matrah, 0), DILIMLER), [matrah])
  const efektif = num(matrah) > 0 ? (tutar / num(matrah)) * 100 : 0

  return (
    <div className="vd">
      <style>{CSS}</style>

      {/* Dilim tablosu */}
      <div className="vd-table">
        <div className="vd-head"><span>Gelir dilimi (yıllık matrah)</span><span>Vergi oranı</span></div>
        {DILIMLER.map((d, i) => {
          const alt = i === 0 ? 0 : DILIMLER[i - 1].ust
          const isLast = i === DILIMLER.length - 1
          return (
            <div className="vd-row" key={i}>
              <span>
                {isLast
                  ? `${fmtInt(alt)} ₺ ve üzeri`
                  : `${fmtInt(alt)} ₺ – ${fmtInt(d.ust)} ₺`}
              </span>
              <span className="vd-oran">%{Math.round(d.oran * 100)}</span>
            </div>
          )
        })}
      </div>

      {/* Mini hesaplayıcı */}
      <div className="vd-calc">
        <label className="vd-field">
          <span>Yıllık gelir vergisi matrahı (₺)</span>
          <input inputMode="decimal" value={matrah} onChange={e => setMatrah(e.target.value)} />
        </label>
        <div className="vd-out">
          <div className="vd-out-item">
            <span>Hesaplanan gelir vergisi</span>
            <strong>{fmtTL(tutar)}</strong>
          </div>
          <div className="vd-out-item">
            <span>Ulaşılan dilim / efektif oran</span>
            <strong>%{Math.round(oran * 100)} · %{efektif.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}</strong>
          </div>
        </div>
      </div>

      <Link href="/cocuk-kulubu-bordro-hesaplama" className="vd-cta">Tam bordroyu (SGK + vergi + damga) hesaplayın →</Link>
    </div>
  )
}

const CSS = `
.vd{max-width:760px;margin:0 auto}
.vd-table{border:1px solid var(--line);border-radius:16px;overflow:hidden;background:var(--surf);
  box-shadow:0 20px 44px -32px rgba(30,66,41,.35);margin-bottom:26px}
.vd-head{display:grid;grid-template-columns:1fr auto;gap:16px;padding:13px 20px;background:var(--g);color:#fff;
  font-size:12.5px;font-weight:700;text-transform:uppercase;letter-spacing:.03em}
.vd-row{display:grid;grid-template-columns:1fr auto;gap:16px;align-items:center;padding:13px 20px;border-top:1px solid var(--line);font-size:14.5px;color:var(--tx)}
.vd-row:nth-child(even){background:#faf9f4}
.vd-oran{font-weight:800;color:var(--g);font-size:16px}
.vd-calc{background:var(--surf);border:1px solid var(--line);border-radius:18px;padding:24px;
  box-shadow:0 20px 44px -32px rgba(30,66,41,.35)}
.vd-field{display:flex;flex-direction:column;gap:7px;max-width:360px}
.vd-field>span{font-size:13.5px;font-weight:600;color:var(--tx2)}
.vd-field input{font:inherit;font-size:16px;font-weight:600;padding:12px 15px;border:1px solid var(--line-2);
  border-radius:11px;background:var(--bg);color:var(--tx);outline:none}
.vd-field input:focus{border-color:var(--g);box-shadow:0 0 0 3px rgba(45,90,61,.13);background:#fff}
.vd-out{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:18px}
.vd-out-item{background:linear-gradient(135deg,#f0f7f2,#f7f3e9);border:1px solid #dcebe0;border-radius:12px;padding:14px 16px;
  display:flex;flex-direction:column;gap:4px}
.vd-out-item span{font-size:12.5px;color:var(--tx2);font-weight:600}
.vd-out-item strong{font-family:'Playfair Display',serif;font-size:22px;font-weight:800;color:var(--g);line-height:1.1}
.vd-cta{display:block;text-align:center;margin:24px auto 0;max-width:460px;padding:14px;border-radius:12px;
  background:var(--g);color:#fff!important;font-weight:700;font-size:14.5px;transition:background .2s,transform .2s}
.vd-cta:hover{background:var(--g-d);transform:translateY(-2px)}
@media (max-width:560px){ .vd-out{grid-template-columns:1fr} }
`
