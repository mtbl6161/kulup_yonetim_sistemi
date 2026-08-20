'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { isGunuSayisi, fmtTL, AYLAR } from '@/lib/hesaplama'

const now = new Date()

function num(v: string, fallback = 0): number {
  const n = parseFloat(v.replace(',', '.'))
  return Number.isFinite(n) ? n : fallback
}

export default function AidatContent() {
  const [yil, setYil] = useState(String(now.getFullYear()))
  const [ay, setAy] = useState(String(now.getMonth() + 1))
  // İş günü elle düzenlenebilir; ay/yıl değişince resmî tatillere göre otomatik dolar.
  const [isGunu, setIsGunu] = useState(String(isGunuSayisi(now.getFullYear(), now.getMonth() + 1)))
  const [gunlukSaat, setGunlukSaat] = useState('2')
  const [saatUcreti, setSaatUcreti] = useState('35')
  const [kardes, setKardes] = useState(false)

  // Ay/yıl değiştiğinde iş gününü o ayın resmî iş günü sayısıyla güncelle
  const setAyDolu = (y: string, a: string) => setIsGunu(String(isGunuSayisi(num(y, now.getFullYear()), num(a, 1))))

  const aylik = useMemo(() => {
    let u = num(isGunu, 0) * num(gunlukSaat, 0) * num(saatUcreti, 0)
    if (kardes) u *= 0.75
    return u
  }, [isGunu, gunlukSaat, saatUcreti, kardes])

  return (
    <div className="ad">
      <style>{CSS}</style>
      <div className="ad-grid">
        <div className="ad-card">
          <h2 className="ad-h2">Aidat Bilgileri</h2>
          <div className="ad-row2">
            <label className="ad-field">
              <span>Yıl</span>
              <input inputMode="numeric" value={yil} onChange={e => { setYil(e.target.value); setAyDolu(e.target.value, ay) }} />
            </label>
            <label className="ad-field">
              <span>Ay</span>
              <select value={ay} onChange={e => { setAy(e.target.value); setAyDolu(yil, e.target.value) }}>
                {AYLAR.slice(1).map((a, i) => <option key={i + 1} value={i + 1}>{a}</option>)}
              </select>
            </label>
          </div>
          <label className="ad-field">
            <span>Ayın iş günü sayısı</span>
            <input inputMode="numeric" value={isGunu} onChange={e => setIsGunu(e.target.value)} />
            <small>Ay/yıl seçilince resmî tatillere göre otomatik dolar. <strong>Okula özel tatil varsa elle düzeltin.</strong></small>
          </label>
          <label className="ad-field">
            <span>Günlük ders saati</span>
            <input inputMode="decimal" value={gunlukSaat} onChange={e => setGunlukSaat(e.target.value)} />
          </label>
          <label className="ad-field">
            <span>Saat ücreti (₺)</span>
            <input inputMode="decimal" value={saatUcreti} onChange={e => setSaatUcreti(e.target.value)} />
            <small>Saat ücretini bilmiyorsanız <a href="/ek-ders-hesaplama">buradan hesaplayın</a>.</small>
          </label>
          <label className="ad-check">
            <input type="checkbox" checked={kardes} onChange={e => setKardes(e.target.checked)} />
            <span>Kardeş indirimi uygula (%25)</span>
          </label>
        </div>

        <div className="ad-card ad-res">
          <div className="ad-big">
            <span>Öğrenci aylık aidatı</span>
            <strong>{fmtTL(aylik)}</strong>
          </div>
          <p className="ad-formula">{num(isGunu, 0)} iş günü × {num(gunlukSaat, 0)} saat × {fmtTL(num(saatUcreti, 0))}{kardes ? ' × 0,75 (kardeş indirimi)' : ''}</p>
          <p className="ad-note">İş günü sayısını okulunuzun tatil takvimine göre düzenleyebilirsiniz.</p>
          <Link href="/signup" className="ad-cta">Tüm öğrencilerin aidatını otomatik takip edin →</Link>
        </div>
      </div>
    </div>
  )
}

const CSS = `
.ad{max-width:1000px;margin:0 auto}
.ad-grid{display:grid;grid-template-columns:1fr 1.05fr;gap:24px;align-items:start}
.ad-card{background:var(--surf);border:1px solid var(--line);border-radius:20px;padding:26px;
  box-shadow:0 20px 44px -30px rgba(30,66,41,.35)}
.ad-h2{font-family:'Playfair Display',serif;font-size:21px;font-weight:800;margin:0 0 20px;color:var(--tx)}
.ad-row2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.ad-field{display:flex;flex-direction:column;gap:6px;margin-bottom:16px}
.ad-field>span{font-size:13.5px;font-weight:600;color:var(--tx2)}
.ad-field input,.ad-field select{font:inherit;font-size:15px;padding:12px 14px;border:1px solid var(--line-2);
  border-radius:11px;background:var(--bg);color:var(--tx);outline:none;transition:border-color .15s,box-shadow .15s}
.ad-field input:focus,.ad-field select:focus{border-color:var(--g);box-shadow:0 0 0 3px rgba(45,90,61,.13);background:#fff}
.ad-field small{font-size:11.5px;color:var(--tx3)}
.ad-field small a{color:var(--g);font-weight:600}
.ad-check{display:flex;align-items:center;gap:10px;font-size:14.5px;font-weight:600;color:var(--tx);cursor:pointer}
.ad-check input{width:18px;height:18px;accent-color:var(--g)}
.ad-res{background:linear-gradient(160deg,var(--surf),#f3f7f3)}
.ad-mini{display:flex;justify-content:space-between;align-items:center;background:var(--bg);border:1px solid var(--line);
  border-radius:12px;padding:12px 16px;margin-bottom:14px}
.ad-mini span{font-size:14px;color:var(--tx2);font-weight:600}
.ad-mini strong{font-size:18px;color:var(--g)}
.ad-big{background:linear-gradient(135deg,var(--g),var(--g-d));color:#fff;border-radius:14px;padding:20px 22px;
  display:flex;flex-direction:column;gap:5px}
.ad-big span{font-size:13.5px;color:rgba(255,255,255,.8);font-weight:600}
.ad-big strong{font-family:'Playfair Display',serif;font-size:clamp(30px,4vw,40px);font-weight:800;line-height:1}
.ad-formula{margin:16px 0 0;font-size:13px;color:var(--tx2);font-weight:600}
.ad-note{margin:8px 0 0;font-size:12px;color:var(--tx3)}
.ad-cta{display:block;text-align:center;margin-top:18px;padding:14px;border-radius:12px;
  background:var(--g);color:#fff!important;font-weight:700;font-size:14.5px;transition:background .2s,transform .2s}
.ad-cta:hover{background:var(--g-d);transform:translateY(-2px)}
@media (max-width:820px){ .ad-grid{grid-template-columns:1fr} }
`
