'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { bordroHesapla, fmtTL } from '@/lib/hesaplama'
import type { Ayarlar } from '@/lib/types'

/** Metni güvenli sayıya çevir */
function num(v: string, fallback = 0): number {
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : fallback
}

/**
 * Uygulamanın güncel varsayılanları — hesaplama motoru ondalık beklediği için
 * yüzdeler ondalığa çevrilmiştir. Kullanıcı gerekirse güncelleyebilir.
 */
const VARSAYILAN: Ayarlar = {
  saat_ucreti: 0,
  gunluk_saat: 0,
  asgari_ucret: 26005.50,
  sgk_kisi_pay: 0.14,
  sgk_issizlik_kisi: 0.01,
  sgk_kisa_vadeli: 0.02,
  sgk_malulluk: 0.02,
  sgk_saglik: 0.075,
  sgk_issizlik_isveren: 0.02,
  damga_vergi_orani: 0.00759,
  vergi_dilimleri: [
    { ust: 220000, oran: 0.15 },
    { ust: 480000, oran: 0.20 },
    { ust: 1800000, oran: 0.27 },
    { ust: 6000000, oran: 0.35 },
    { ust: 99999999, oran: 0.40 },
  ],
} as Ayarlar

export default function BordroContent() {
  const [brut, setBrut] = useState('30000')
  const [sgkli, setSgkli] = useState(true)
  const [emekli, setEmekli] = useState(false)
  const [istisna, setIstisna] = useState(true)
  const [matrah, setMatrah] = useState('0')

  const sonuc = useMemo(
    () => bordroHesapla(
      VARSAYILAN,
      0,                    // toplamSaat (havuzBrut verildiği için kullanılmaz)
      num(matrah, 0),       // yıl içi kümülatif GV matrahı
      sgkli,
      emekli,
      undefined,            // görev yok → tavan uygulanmaz
      num(brut, 0),         // havuzBrut = brüt
      istisna,
    ),
    [brut, sgkli, emekli, istisna, matrah]
  )

  const isverenMaliyet = Math.round((sonuc.brut + sonuc.sgk_isveren) * 100) / 100

  return (
    <div className="bd">
      <style>{CSS}</style>

      <div className="bd-grid">
        {/* Girdiler */}
        <div className="bd-card">
          <h2 className="bd-h2">Bordro Bilgileri</h2>
          <label className="bd-field">
            <span>Brüt ücret (₺)</span>
            <input inputMode="decimal" value={brut} onChange={e => setBrut(e.target.value)} />
            <small>Personelin bu aya ait brüt (kesinti öncesi) hak edişi.</small>
          </label>

          <label className="bd-field">
            <span>Yıl içi kümülatif gelir vergisi matrahı (₺)</span>
            <input inputMode="decimal" value={matrah} onChange={e => setMatrah(e.target.value)} />
            <small>Yılbaşından bu aya kadar biriken matrah. Bilinmiyorsa 0 bırakın.</small>
          </label>

          <div className="bd-checks">
            <label className="bd-check">
              <input type="checkbox" checked={sgkli} onChange={e => setSgkli(e.target.checked)} />
              <span>SGK'lı çalışan</span>
            </label>
            <label className="bd-check">
              <input type="checkbox" checked={emekli} onChange={e => setEmekli(e.target.checked)} />
              <span>Emekli (SGDP)</span>
            </label>
            <label className="bd-check">
              <input type="checkbox" checked={istisna} onChange={e => setIstisna(e.target.checked)} />
              <span>Asgari ücret vergi istisnası</span>
            </label>
          </div>

          <p className="bd-disc">
            Oranlar güncel resmî değerlerle (SGK %14 + %1, damga %0,759, 2026 vergi dilimleri) ön tanımlıdır.
            Klüp360 uygulamasında bu değerler otomatik güncel tutulur.
          </p>
        </div>

        {/* Sonuç */}
        <div className="bd-card bd-card-res">
          <h2 className="bd-h2">Bordro Sonucu</h2>

          <div className="bd-net">
            <span>Net ödenecek</span>
            <strong>{fmtTL(sonuc.net)}</strong>
          </div>

          <table className="bd-table">
            <tbody>
              <tr><td>Brüt ücret</td><td>{fmtTL(sonuc.brut)}</td></tr>
              <tr><td>SGK işçi payı (%14)</td><td>−{fmtTL(sonuc.sgk_kisi)}</td></tr>
              <tr><td>İşsizlik işçi payı (%1)</td><td>−{fmtTL(sonuc.sgk_issizlik)}</td></tr>
              <tr><td>Gelir vergisi matrahı</td><td>{fmtTL(sonuc.gv_matrah)}</td></tr>
              <tr><td>Gelir vergisi</td><td>−{fmtTL(sonuc.gv)}</td></tr>
              <tr><td>Damga vergisi</td><td>−{fmtTL(sonuc.dv)}</td></tr>
              {istisna && (sonuc.gv_istisna > 0 || sonuc.dv_istisna > 0) && (
                <tr className="bd-tr-istisna"><td>Vergi istisnası (indirim)</td><td>+{fmtTL(sonuc.gv_istisna + sonuc.dv_istisna)}</td></tr>
              )}
              <tr className="bd-tr-total"><td>Toplam kesinti</td><td>−{fmtTL(sonuc.toplam_kesinti)}</td></tr>
              <tr className="bd-tr-net"><td>Net ücret</td><td>{fmtTL(sonuc.net)}</td></tr>
            </tbody>
          </table>

          <div className="bd-emp">
            <div className="bd-emp-row"><span>SGK işveren payı</span><span>{fmtTL(sonuc.sgk_isveren)}</span></div>
            <div className="bd-emp-row bd-emp-total"><span>Toplam işveren maliyeti</span><span>{fmtTL(isverenMaliyet)}</span></div>
          </div>

          <Link href="/signup" className="bd-cta">Tüm personelin bordrosunu otomatik hesaplayın →</Link>
        </div>
      </div>
    </div>
  )
}

const CSS = `
.bd{max-width:1000px;margin:0 auto}
.bd-grid{display:grid;grid-template-columns:1fr 1.1fr;gap:24px;align-items:start}
.bd-card{background:var(--surf);border:1px solid var(--line);border-radius:20px;padding:26px;
  box-shadow:0 20px 44px -30px rgba(30,66,41,.35)}
.bd-h2{font-family:'Playfair Display',serif;font-size:21px;font-weight:800;margin:0 0 20px;color:var(--tx)}
.bd-field{display:flex;flex-direction:column;gap:6px;margin-bottom:18px}
.bd-field>span{font-size:13.5px;font-weight:600;color:var(--tx2)}
.bd-field input{font:inherit;font-size:15px;padding:12px 14px;border:1px solid var(--line-2);border-radius:11px;
  background:var(--bg);color:var(--tx);outline:none;transition:border-color .15s,box-shadow .15s}
.bd-field input:focus{border-color:var(--g);box-shadow:0 0 0 3px rgba(45,90,61,.13);background:#fff}
.bd-field small{font-size:11.5px;color:var(--tx3)}
.bd-checks{display:flex;flex-direction:column;gap:12px;margin-top:4px}
.bd-check{display:flex;align-items:center;gap:10px;font-size:14.5px;font-weight:600;color:var(--tx);cursor:pointer}
.bd-check input{width:18px;height:18px;accent-color:var(--g)}
.bd-disc{margin-top:18px;font-size:11.5px;color:var(--tx3);line-height:1.5;border-top:1px solid var(--line);padding-top:14px}

.bd-card-res{background:linear-gradient(160deg,var(--surf),#f3f7f3)}
.bd-net{display:flex;flex-direction:column;gap:4px;background:linear-gradient(135deg,var(--g),var(--g-d));
  color:#fff;border-radius:14px;padding:18px 22px;margin-bottom:20px}
.bd-net span{font-size:13.5px;color:rgba(255,255,255,.8);font-weight:600}
.bd-net strong{font-family:'Playfair Display',serif;font-size:clamp(28px,4vw,38px);font-weight:800;line-height:1}
.bd-table{width:100%;border-collapse:collapse;font-size:14px}
.bd-table td{padding:9px 0;border-bottom:1px solid var(--line);color:var(--tx2)}
.bd-table td:last-child{text-align:right;font-weight:600;color:var(--tx);white-space:nowrap}
.bd-tr-istisna td{color:var(--g)!important}
.bd-tr-total td{font-weight:700;color:var(--tx)!important;border-top:1px solid var(--line-2)}
.bd-tr-net td{font-weight:800;color:var(--g)!important;font-size:15.5px;border-bottom:none}
.bd-emp{margin-top:16px;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.bd-emp-row{display:flex;justify-content:space-between;font-size:13.5px;color:var(--tx2);padding:4px 0}
.bd-emp-total{font-weight:700;color:var(--tx);border-top:1px dashed var(--line-2);margin-top:4px;padding-top:8px}
.bd-cta{display:block;text-align:center;margin-top:20px;padding:14px;border-radius:12px;
  background:var(--g);color:#fff!important;font-weight:700;font-size:14.5px;transition:background .2s,transform .2s}
.bd-cta:hover{background:var(--g-d);transform:translateY(-2px)}

@media (max-width:820px){ .bd-grid{grid-template-columns:1fr} }
`
