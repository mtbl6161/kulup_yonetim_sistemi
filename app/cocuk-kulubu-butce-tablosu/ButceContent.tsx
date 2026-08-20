'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { tahakkukDagitimHesapla, fmtTL } from '@/lib/hesaplama'
import type { Ayarlar } from '@/lib/types'

function num(v: string, fallback = 0): number {
  const n = parseFloat(v.replace(',', '.'))
  return Number.isFinite(n) ? n : fallback
}

export default function ButceContent() {
  const [gelir, setGelir] = useState('100000')
  const [pct, setPct] = useState({
    ogretmen: '55', temel: '26', baskan: '7', baskanYrd: '5',
    muhasebe: '2', temizlik: '4', denetim: '1',
  })

  const toplamPct =
    num(pct.ogretmen) + num(pct.temel) + num(pct.baskan) + num(pct.baskanYrd) +
    num(pct.muhasebe) + num(pct.temizlik) + num(pct.denetim)

  const d = useMemo(() => {
    const ayarlar = {
      dagitim_ogretmen: num(pct.ogretmen),
      dagitim_temel_gider: num(pct.temel),
      dagitim_baskan: num(pct.baskan),
      dagitim_baskan_yrd: num(pct.baskanYrd),
      dagitim_muhasebe: num(pct.muhasebe),
      dagitim_temizlik: num(pct.temizlik),
      dagitim_denetim: num(pct.denetim),
    } as Ayarlar
    return tahakkukDagitimHesapla(num(gelir, 0), ayarlar)
  }, [gelir, pct])

  const rows: [string, keyof typeof pct, number][] = [
    ['Öğretmen havuzu', 'ogretmen', d.ogretmen_havuzu],
    ['Temel gider', 'temel', d.temel_gider],
    ['Başkan', 'baskan', d.baskan],
    ['Başkan yardımcısı', 'baskanYrd', d.baskan_yrd],
    ['Muhasebe', 'muhasebe', d.muhasebe],
    ['Temizlik', 'temizlik', d.temizlik],
    ['Denetim', 'denetim', d.denetim],
  ]

  return (
    <div className="bt">
      <style>{CSS}</style>

      <label className="bt-gelir">
        <span>Toplam aylık gelir (₺)</span>
        <input inputMode="decimal" value={gelir} onChange={e => setGelir(e.target.value)} />
      </label>

      <div className="bt-table">
        <div className="bt-head">
          <span>Kalem</span><span>Oran</span><span>Tutar</span>
        </div>
        {rows.map(([label, key, val]) => (
          <div className="bt-row" key={key}>
            <span className="bt-label">{label}</span>
            <span className="bt-pct">
              <input inputMode="decimal" value={pct[key]} onChange={e => setPct(p => ({ ...p, [key]: e.target.value }))} />%
            </span>
            <span className="bt-val">{fmtTL(val)}</span>
          </div>
        ))}
      </div>

      <div className={`bt-sum ${Math.abs(toplamPct - 100) > 0.01 ? 'warn' : ''}`}>
        Oran toplamı: <strong>%{toplamPct.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</strong>
        {Math.abs(toplamPct - 100) > 0.01 ? ' — toplam %100 olmalı' : ' ✓'}
      </div>

      <Link href="/signup" className="bt-cta">Tahakkuk cetvelini otomatik oluşturun →</Link>
    </div>
  )
}

const CSS = `
.bt{max-width:720px;margin:0 auto}
.bt-gelir{display:flex;flex-direction:column;gap:7px;max-width:340px;margin:0 auto 24px}
.bt-gelir>span{font-size:13.5px;font-weight:600;color:var(--tx2)}
.bt-gelir input{font:inherit;font-size:17px;font-weight:700;padding:13px 16px;border:1px solid var(--line-2);
  border-radius:12px;background:var(--surf);color:var(--tx);outline:none;text-align:center}
.bt-gelir input:focus{border-color:var(--g);box-shadow:0 0 0 3px rgba(45,90,61,.13)}
.bt-table{border:1px solid var(--line);border-radius:16px;overflow:hidden;background:var(--surf);
  box-shadow:0 20px 44px -32px rgba(30,66,41,.35)}
.bt-head{display:grid;grid-template-columns:1fr 96px 1fr;gap:12px;padding:12px 18px;background:var(--g);color:#fff;
  font-size:12.5px;font-weight:700;text-transform:uppercase;letter-spacing:.03em}
.bt-head span:last-child{text-align:right}
.bt-row{display:grid;grid-template-columns:1fr 96px 1fr;gap:12px;align-items:center;padding:12px 18px;border-top:1px solid var(--line)}
.bt-row:nth-child(even){background:#faf9f4}
.bt-label{font-size:14.5px;font-weight:600;color:var(--tx)}
.bt-pct{display:flex;align-items:center;gap:4px;font-size:13px;color:var(--tx2);font-weight:600}
.bt-pct input{width:58px;font:inherit;font-size:14px;padding:7px 8px;border:1px solid var(--line-2);border-radius:8px;
  background:var(--bg);text-align:right;outline:none}
.bt-pct input:focus{border-color:var(--g);background:#fff}
.bt-val{text-align:right;font-weight:800;font-size:15px;color:var(--g)}
.bt-sum{text-align:center;margin-top:16px;font-size:13.5px;color:var(--tx2)}
.bt-sum.warn{color:#b4522a;font-weight:600}
.bt-cta{display:block;text-align:center;margin:22px auto 0;max-width:420px;padding:14px;border-radius:12px;
  background:var(--g);color:#fff!important;font-weight:700;font-size:14.5px;transition:background .2s,transform .2s}
.bt-cta:hover{background:var(--g-d);transform:translateY(-2px)}
@media (max-width:560px){
  .bt-head,.bt-row{grid-template-columns:1fr 80px auto;gap:8px;padding:10px 12px}
}
`
