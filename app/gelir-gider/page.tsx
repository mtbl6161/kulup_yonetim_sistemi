'use client'
import { useEffect, useState } from 'react'
import Topbar from '@/components/Topbar'
import { supabase } from '@/lib/supabase'
import { fmtTL, AYLAR, tarihFmt, tahakkukDagitimHesapla } from '@/lib/hesaplama'
import { HesapHareketi, Ayarlar } from '@/lib/types'
import StatCard from '@/components/StatCard'

interface AylikOzet { ay: number; yil: number; gelir: number; gider: number; net: number }

export default function GelirGiderPage() {
  const [hareketler, setHareketler] = useState<HesapHareketi[]>([])
  const [ayarlar, setAyarlar] = useState<Ayarlar | null>(null)
  const [aktifTab, setAktifTab] = useState<'aylik' | 'gelirler' | 'giderler' | 'tahakkuk'>('aylik')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('hesap_hareketleri').select('*').order('tarih', { ascending: false }),
      supabase.from('ayarlar').select('*').single(),
    ]).then(([{ data: hh }, { data: ayr }]) => {
      setHareketler(hh || [])
      setAyarlar(ayr)
      setLoading(false)
    })
  }, [])

  const toplamGelir = hareketler.filter(h => h.tur === 'gelir').reduce((s, h) => s + Number(h.tutar), 0)
  const toplamGider = hareketler.filter(h => h.tur === 'gider').reduce((s, h) => s + Number(h.tutar), 0)

  // Aylık özet
  const aylikMap: Record<string, AylikOzet> = {}
  for (const h of hareketler) {
    const d = new Date(h.tarih)
    const a = d.getMonth() + 1
    const y = d.getFullYear()
    const k = `${y}-${a}`
    if (!aylikMap[k]) aylikMap[k] = { ay: a, yil: y, gelir: 0, gider: 0, net: 0 }
    if (h.tur === 'gelir') aylikMap[k].gelir += Number(h.tutar)
    else aylikMap[k].gider += Number(h.tutar)
    aylikMap[k].net = aylikMap[k].gelir - aylikMap[k].gider
  }
  const aylikOzetler = Object.values(aylikMap).sort((a, b) =>
    b.yil !== a.yil ? b.yil - a.yil : b.ay - a.ay
  )

  const gelirler = hareketler.filter(h => h.tur === 'gelir')
  const giderler = hareketler.filter(h => h.tur === 'gider')

  // Tahakkuk dağılımı (toplam gelir üzerinden)
  const tahakkuk = ayarlar ? tahakkukDagitimHesapla(toplamGelir, ayarlar) : null

  return (
    <div>
      <Topbar
        title="Gelir / Gider Özet"
        sub="Mali özet ve tahakkuk dağılımı"
        actions={
          <button className="btn btn-secondary btn-sm no-print" onClick={() => window.print()}>🖨️ Yazdır</button>
        }
      />
      <div style={{ padding: 28 }}>
        {/* Genel özetle */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
          <StatCard label="Toplam Gelir" value={fmtTL(toplamGelir)} sub="Tüm zamanlar" />
          <StatCard label="Toplam Gider" value={fmtTL(toplamGider)} sub="Tüm zamanlar" variant="red" />
          <StatCard label="Net Bakiye" value={fmtTL(toplamGelir - toplamGider)} sub="Anlık bakiye" variant={toplamGelir >= toplamGider ? 'teal' : 'red'} />
        </div>

        <div className="card">
          {/* Tabs */}
          <div className="tab-bar">
            {[
              { key: 'aylik', label: '📅 Aylık Özet' },
              { key: 'gelirler', label: '↑ Gelirler' },
              { key: 'giderler', label: '↓ Giderler' },
              { key: 'tahakkuk', label: '📊 Tahakkuk Dağılımı' },
            ].map(t => (
              <div
                key={t.key}
                className={`tab-item ${aktifTab === t.key ? 'active' : ''}`}
                onClick={() => setAktifTab(t.key as typeof aktifTab)}
              >
                {t.label}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="alert alert-info">⏳ Yükleniyor...</div>
          ) : (
            <>
              {/* Aylık Özet */}
              {aktifTab === 'aylik' && (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Dönem</th>
                        <th className="td-num">Gelir (₺)</th>
                        <th className="td-num">Gider (₺)</th>
                        <th className="td-num">Net (₺)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aylikOzetler.length === 0 ? (
                        <tr><td colSpan={4}><div className="empty-state"><div className="empty-icon">📊</div><p>Veri yok</p></div></td></tr>
                      ) : aylikOzetler.map(o => (
                        <tr key={`${o.yil}-${o.ay}`}>
                          <td><strong>{AYLAR[o.ay]} {o.yil}</strong></td>
                          <td className="td-num" style={{ color: 'var(--success)', fontWeight: 600 }}>{fmtTL(o.gelir)}</td>
                          <td className="td-num" style={{ color: 'var(--danger)' }}>{fmtTL(o.gider)}</td>
                          <td className="td-num fw-600" style={{ color: o.net >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
                            {o.net >= 0 ? '+' : ''}{fmtTL(o.net)}
                          </td>
                        </tr>
                      ))}
                      <tr className="sum-row">
                        <td>GENEL TOPLAM</td>
                        <td className="td-num">{fmtTL(toplamGelir)}</td>
                        <td className="td-num">{fmtTL(toplamGider)}</td>
                        <td className="td-num">{fmtTL(toplamGelir - toplamGider)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Gelirler */}
              {aktifTab === 'gelirler' && (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr><th>Tarih</th><th>Açıklama</th><th>Kaynak</th><th className="td-num">Tutar (₺)</th></tr>
                    </thead>
                    <tbody>
                      {gelirler.length === 0 ? (
                        <tr><td colSpan={4}><div className="empty-state"><div className="empty-icon">↑</div><p>Gelir kaydı yok</p></div></td></tr>
                      ) : gelirler.map(h => (
                        <tr key={h.id}>
                          <td>{tarihFmt(h.tarih)}</td>
                          <td>{h.aciklama || '-'}</td>
                          <td><span className="badge badge-gray" style={{ fontSize: 10 }}>{h.kaynak || 'manuel'}</span></td>
                          <td className="td-num" style={{ color: 'var(--success)', fontWeight: 600 }}>{fmtTL(Number(h.tutar))}</td>
                        </tr>
                      ))}
                      <tr className="sum-row">
                        <td colSpan={3}>TOPLAM</td>
                        <td className="td-num">{fmtTL(toplamGelir)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Giderler */}
              {aktifTab === 'giderler' && (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr><th>Tarih</th><th>Açıklama</th><th>Kaynak</th><th className="td-num">Tutar (₺)</th></tr>
                    </thead>
                    <tbody>
                      {giderler.length === 0 ? (
                        <tr><td colSpan={4}><div className="empty-state"><div className="empty-icon">↓</div><p>Gider kaydı yok</p></div></td></tr>
                      ) : giderler.map(h => (
                        <tr key={h.id}>
                          <td>{tarihFmt(h.tarih)}</td>
                          <td>{h.aciklama || '-'}</td>
                          <td><span className="badge badge-gray" style={{ fontSize: 10 }}>{h.kaynak || 'manuel'}</span></td>
                          <td className="td-num" style={{ color: 'var(--danger)' }}>{fmtTL(Number(h.tutar))}</td>
                        </tr>
                      ))}
                      <tr className="sum-row">
                        <td colSpan={3}>TOPLAM</td>
                        <td className="td-num">{fmtTL(toplamGider)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tahakkuk Dağılımı */}
              {aktifTab === 'tahakkuk' && tahakkuk && (
                <div>
                  <div className="alert alert-info">
                    ℹ️ MEB Yönergesi dağılımı — Toplam tahakkuk: <strong>{fmtTL(tahakkuk.toplam)}</strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
                    {[
                      { label: 'Temel Gider (%26)', val: tahakkuk.temel_gider },
                      { label: 'Öğretmen Havuzu (%55)', val: tahakkuk.ogretmen_havuzu },
                      { label: 'Başkan (%7)', val: tahakkuk.baskan },
                      { label: 'Başkan Yrd. (%5)', val: tahakkuk.baskan_yrd },
                      { label: 'Muhasebe (%2)', val: tahakkuk.muhasebe },
                      { label: 'Temizlik (%4)', val: tahakkuk.temizlik },
                      { label: 'Denetim (%1)', val: tahakkuk.denetim },
                    ].map(({ label, val }) => (
                      <div key={label} className="stat-card" style={{ padding: '14px 16px' }}>
                        <div className="stat-label" style={{ fontSize: 10 }}>{label}</div>
                        <div className="stat-value" style={{ fontSize: 20 }}>{fmtTL(val)}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr><th>Kategori</th><th className="td-num">Oran</th><th className="td-num">Tutar (₺)</th></tr>
                      </thead>
                      <tbody>
                        {[
                          { k: 'Temel Gider', o: '%26', v: tahakkuk.temel_gider },
                          { k: 'Öğretmen Havuzu', o: '%55', v: tahakkuk.ogretmen_havuzu },
                          { k: 'Başkan', o: '%7', v: tahakkuk.baskan },
                          { k: 'Başkan Yrd.', o: '%5', v: tahakkuk.baskan_yrd },
                          { k: 'Muhasebe', o: '%2', v: tahakkuk.muhasebe },
                          { k: 'Temizlik', o: '%4', v: tahakkuk.temizlik },
                          { k: 'Denetim', o: '%1', v: tahakkuk.denetim },
                        ].map(({ k, o, v }) => (
                          <tr key={k}>
                            <td><strong>{k}</strong></td>
                            <td className="td-num">{o}</td>
                            <td className="td-num fw-600">{fmtTL(v)}</td>
                          </tr>
                        ))}
                        <tr className="sum-row">
                          <td>TOPLAM</td>
                          <td className="td-num">%100</td>
                          <td className="td-num">{fmtTL(tahakkuk.toplam)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
