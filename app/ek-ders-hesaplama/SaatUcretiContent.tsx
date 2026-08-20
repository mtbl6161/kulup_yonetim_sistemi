'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { saatUcretiHesapla, fmtTL } from '@/lib/hesaplama'

function num(v: string, fallback = 0): number {
  const n = parseFloat(v.replace(',', '.'))
  return Number.isFinite(n) ? n : fallback
}

export default function SaatUcretiContent() {
  const [gosterge, setGosterge] = useState('140')
  const [katsayi, setKatsayi] = useState('0.9')
  const [yemek, setYemek] = useState(false)
  const [tip, setTip] = useState<'max' | 'min'>('max')

  const saat = useMemo(
    () => saatUcretiHesapla(num(gosterge, 140), num(katsayi), yemek, tip),
    [gosterge, katsayi, yemek, tip]
  )

  return (
    <div className="eh">
      <style>{CSS}</style>
      <div className="eh-grid">
        <div className="eh-card">
          <h2 className="eh-h2">Saat Ücreti Bilgileri</h2>
          <div className="eh-row2">
            <label className="eh-field">
              <span>Gösterge</span>
              <input inputMode="decimal" value={gosterge} onChange={e => setGosterge(e.target.value)} />
            </label>
            <label className="eh-field">
              <span>Memur maaş katsayısı</span>
              <input inputMode="decimal" value={katsayi} onChange={e => setKatsayi(e.target.value)} />
            </label>
          </div>
          <label className="eh-field">
            <span>Ücret türü</span>
            <select value={tip} onChange={e => setTip(e.target.value as 'max' | 'min')}>
              <option value="max">Azami (÷4)</option>
              <option value="min">Asgari (÷6)</option>
            </select>
          </label>
          <label className="eh-check">
            <input type="checkbox" checked={yemek} onChange={e => setYemek(e.target.checked)} />
            <span>Yemek ikramı var (÷3)</span>
          </label>
          <p className="eh-note">Güncel resmî memur maaş katsayısını girin. Klüp360 uygulamasında bu değer otomatik güncel tutulur.</p>
        </div>

        <div className="eh-card eh-res">
          <div className="eh-big">
            <span>Saat ücreti</span>
            <strong>{fmtTL(saat)}</strong>
          </div>
          <p className="eh-formula">{num(gosterge, 140)} gösterge × {num(katsayi)} katsayı ÷ {yemek ? 3 : tip === 'min' ? 6 : 4}</p>
          <div className="eh-links">
            <Link href="/cocuk-kulubu-aidat-hesaplama">Aidat hesapla →</Link>
            <Link href="/cocuk-kulubu-bordro-hesaplama">Bordro hesapla →</Link>
          </div>
          <Link href="/signup" className="eh-cta">Puantajı otomatik ücrete çevirin →</Link>
        </div>
      </div>
    </div>
  )
}

const CSS = `
.eh{max-width:1000px;margin:0 auto}
.eh-grid{display:grid;grid-template-columns:1fr 1.05fr;gap:24px;align-items:start}
.eh-card{background:var(--surf);border:1px solid var(--line);border-radius:20px;padding:26px;
  box-shadow:0 20px 44px -30px rgba(30,66,41,.35)}
.eh-h2{font-family:'Playfair Display',serif;font-size:21px;font-weight:800;margin:0 0 20px;color:var(--tx)}
.eh-row2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.eh-field{display:flex;flex-direction:column;gap:6px;margin-bottom:16px}
.eh-field>span{font-size:13.5px;font-weight:600;color:var(--tx2)}
.eh-field input,.eh-field select{font:inherit;font-size:15px;padding:12px 14px;border:1px solid var(--line-2);
  border-radius:11px;background:var(--bg);color:var(--tx);outline:none;transition:border-color .15s,box-shadow .15s}
.eh-field input:focus,.eh-field select:focus{border-color:var(--g);box-shadow:0 0 0 3px rgba(45,90,61,.13);background:#fff}
.eh-check{display:flex;align-items:center;gap:10px;font-size:14.5px;font-weight:600;color:var(--tx);cursor:pointer}
.eh-check input{width:18px;height:18px;accent-color:var(--g)}
.eh-note{margin-top:16px;font-size:11.5px;color:var(--tx3);line-height:1.5;border-top:1px solid var(--line);padding-top:14px}
.eh-res{background:linear-gradient(160deg,var(--surf),#f3f7f3)}
.eh-big{background:linear-gradient(135deg,var(--g),var(--g-d));color:#fff;border-radius:14px;padding:20px 22px;
  display:flex;flex-direction:column;gap:5px}
.eh-big span{font-size:13.5px;color:rgba(255,255,255,.8);font-weight:600}
.eh-big strong{font-family:'Playfair Display',serif;font-size:clamp(30px,4vw,40px);font-weight:800;line-height:1}
.eh-formula{margin:16px 0 0;font-size:13px;color:var(--tx2);font-weight:600}
.eh-links{display:flex;gap:16px;margin-top:16px;flex-wrap:wrap}
.eh-links a{font-size:13.5px;font-weight:700;color:var(--g)}
.eh-links a:hover{color:var(--gold)}
.eh-cta{display:block;text-align:center;margin-top:18px;padding:14px;border-radius:12px;
  background:var(--g);color:#fff!important;font-weight:700;font-size:14.5px;transition:background .2s,transform .2s}
.eh-cta:hover{background:var(--g-d);transform:translateY(-2px)}
@media (max-width:820px){ .eh-grid{grid-template-columns:1fr} }
`
