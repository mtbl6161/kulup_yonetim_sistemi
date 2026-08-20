'use client'
import { useEffect, useState } from 'react'
import Topbar from '@/components/Topbar'
import { supabase } from '@/lib/supabase'
import {
  fmtTL, AYLAR, tarihFmt, tahakkukDagitimHesapla,
  isBaskan, isBaskanYrd, isMuhasebe, isTemizlik, isDenetim
} from '@/lib/hesaplama'
import { HesapHareketi, Ayarlar } from '@/lib/types'
import StatCard from '@/components/StatCard'
import { Printer, Calendar, ArrowUpRight, ArrowDownRight, Percent } from 'lucide-react'

interface AylikOzet { ay: number; yil: number; gelir: number; gider: number; net: number }

export default function GelirGiderPage() {
  const [hareketler, setHareketler] = useState<HesapHareketi[]>([])
  const [ayarlar, setAyarlar] = useState<Ayarlar | null>(null)
  const [personel, setPersonel] = useState<any[]>([])
  const [aktifTab, setAktifTab] = useState<'aylik' | 'gelirler' | 'giderler' | 'tahakkuk'>('aylik')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('hesap_hareketleri').select('*').order('tarih', { ascending: false }),
      supabase.from('ayarlar').select('*').single(),
      supabase.from('personel').select('*'),
    ]).then(([{ data: hh }, { data: ayr }, { data: per }]) => {
      setHareketler(hh || [])
      setAyarlar(ayr)
      setPersonel(per || [])
      setLoading(false)
    })
  }, [])

  const toplamGelir = Math.round(hareketler.filter(h => h.tur === 'gelir').reduce((s, h) => s + Number(h.tutar), 0) * 100) / 100
  const toplamGider = Math.round(hareketler.filter(h => h.tur === 'gider').reduce((s, h) => s + Number(h.tutar), 0) * 100) / 100

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
  const activeCategories = {
    baskan: (personel || []).some(p => isBaskan(p.gorev) && p.aktif !== false),
    baskan_yrd: (personel || []).some(p => isBaskanYrd(p.gorev) && p.aktif !== false),
    muhasebe: (personel || []).some(p => isMuhasebe(p.gorev) && p.aktif !== false),
    temizlik: (personel || []).some(p => isTemizlik(p.gorev) && p.aktif !== false),
    denetim: (personel || []).some(p => isDenetim(p.gorev) && p.aktif !== false),
  }
  const tahakkuk = ayarlar ? tahakkukDagitimHesapla(toplamGelir, ayarlar, activeCategories) : null

  return (
    <div>
      <Topbar
        title="Gelir / Gider Özet"
        sub="Mali özet ve tahakkuk dağılımı"
        actions={
          <button 
            className="btn btn-secondary btn-sm no-print" 
            onClick={() => window.print()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Printer size={16} />
            <span>Yazdır</span>
          </button>
        }
      />
      <div style={{ padding: 28 }}>
        {/* Genel özetle */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
          <StatCard title="Toplam Gelir" value={fmtTL(toplamGelir)} trend="Tüm zamanlar" />
          <StatCard title="Toplam Gider" value={fmtTL(toplamGider)} trend="Tüm zamanlar" variant="red" />
          <StatCard title="Net Bakiye" value={fmtTL(toplamGelir - toplamGider)} trend="Anlık bakiye" variant={toplamGelir >= toplamGider ? 'teal' : 'red'} />
        </div>

        <div className="card">
          {/* Tabs */}
          <div className="tab-bar">
            {[
              { key: 'aylik', label: 'Aylık Özet', icon: <Calendar size={15} /> },
              { key: 'gelirler', label: 'Gelirler', icon: <ArrowUpRight size={15} /> },
              { key: 'giderler', label: 'Giderler', icon: <ArrowDownRight size={15} /> },
              { key: 'tahakkuk', label: 'Tahakkuk Dağılımı', icon: <Percent size={15} /> },
            ].map(t => (
              <div
                key={t.key}
                className={`tab-item ${aktifTab === t.key ? 'active' : ''}`}
                onClick={() => setAktifTab(t.key as typeof aktifTab)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {t.icon}
                <span>{t.label}</span>
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
                        <tr><td colSpan={4}><div className="empty-state"><div className="empty-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}><Percent size={48} /></div><p>Veri yok</p></div></td></tr>
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
                        <tr><td colSpan={4}><div className="empty-state"><div className="empty-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}><ArrowUpRight size={48} /></div><p>Gelir kaydı yok</p></div></td></tr>
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
                        <tr><td colSpan={4}><div className="empty-state"><div className="empty-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}><ArrowDownRight size={48} /></div><p>Gider kaydı yok</p></div></td></tr>
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
                      { label: `Temel Gider (%${tahakkuk.pct_temel_gider})`, val: tahakkuk.temel_gider },
                      { label: `Öğretmen Havuzu (%${tahakkuk.pct_ogretmen})`, val: tahakkuk.ogretmen_havuzu },
                      { label: `Başkan (%${tahakkuk.pct_baskan})`, val: tahakkuk.baskan },
                      { label: `Başkan Yrd. (%${tahakkuk.pct_baskan_yrd})`, val: tahakkuk.baskan_yrd },
                      { label: `Muhasebe (%${tahakkuk.pct_muhasebe})`, val: tahakkuk.muhasebe },
                      { label: `Temizlik (%${tahakkuk.pct_temizlik})`, val: tahakkuk.temizlik },
                      { label: `Denetim (%${tahakkuk.pct_denetim})`, val: tahakkuk.denetim },
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
                          { k: 'Temel Gider', o: `%${tahakkuk.pct_temel_gider}`, v: tahakkuk.temel_gider },
                          { k: 'Öğretmen Havuzu', o: `%${tahakkuk.pct_ogretmen}`, v: tahakkuk.ogretmen_havuzu },
                          { k: 'Başkan', o: `%${tahakkuk.pct_baskan}`, v: tahakkuk.baskan },
                          { k: 'Başkan Yrd.', o: `%${tahakkuk.pct_baskan_yrd}`, v: tahakkuk.baskan_yrd },
                          { k: 'Muhasebe', o: `%${tahakkuk.pct_muhasebe}`, v: tahakkuk.muhasebe },
                          { k: 'Temizlik', o: `%${tahakkuk.pct_temizlik}`, v: tahakkuk.temizlik },
                          { k: 'Denetim', o: `%${tahakkuk.pct_denetim}`, v: tahakkuk.denetim },
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
