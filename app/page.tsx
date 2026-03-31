'use client'
import { useEffect, useState, useCallback } from 'react'
import Topbar from '@/components/Topbar'
import StatCard from '@/components/StatCard'
import { useAy } from '@/lib/AyContext'
import { supabase } from '@/lib/supabase'
import { fmtTL, ayLabel, isGunuSayisi, tarihFmt } from '@/lib/hesaplama'
import { Ogrenci, Tahsilat, HesapHareketi, Ayarlar } from '@/lib/types'
import Link from 'next/link'

export default function DashboardPage() {
  const { ay, yil } = useAy()
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>([])
  const [tahsilatlar, setTahsilatlar] = useState<Tahsilat[]>([])
  const [hareketler, setHareketler] = useState<HesapHareketi[]>([])
  const [ayarlar, setAyarlar] = useState<Ayarlar | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: ogr }, { data: tah }, { data: hh }, { data: ayr }] = await Promise.all([
      supabase.from('ogrenciler').select('*'),
      supabase.from('tahsilat').select('*').eq('ay', ay).eq('yil', yil),
      supabase.from('hesap_hareketleri').select('*').order('tarih', { ascending: false }),
      supabase.from('ayarlar').select('*').single(),
    ])
    setOgrenciler(ogr || [])
    setTahsilatlar(tah || [])
    setHareketler(hh || [])
    setAyarlar(ayr)
    setLoading(false)
  }, [ay, yil])

  useEffect(() => { loadData() }, [loadData])

  const isGunu = isGunuSayisi(yil, ay)
  const saatUcreti = ayarlar?.saat_ucreti || 0
  const gunlukSaat = ayarlar?.gunluk_saat || 6

  function odened(o: Ogrenci) {
    return tahsilatlar.filter(t => t.ogrenci_id === o.id).reduce((s, t) => s + Number(t.tutar), 0)
  }

  const toplamTahsilat = tahsilatlar.reduce((s, t) => s + Number(t.tutar), 0)

  let toplamBor = 0
  for (const o of ogrenciler) {
    if (o.ucretsiz_mi) continue
    let gereken = isGunu * gunlukSaat * saatUcreti
    if (o.kardes_indirimi) gereken *= 0.5
    gereken = Math.round(gereken * 100) / 100
    const kalan = gereken - odened(o)
    if (kalan > 0) toplamBor += kalan
  }

  const netBakiye = hareketler.reduce(
    (s, h) => (h.tur === 'gelir' ? s + Number(h.tutar) : s - Number(h.tutar)), 0
  )
  const toplamGelir = hareketler.filter(h => h.tur === 'gelir').reduce((s, h) => s + Number(h.tutar), 0)
  const toplamGider = hareketler.filter(h => h.tur === 'gider').reduce((s, h) => s + Number(h.tutar), 0)
  const mx = Math.max(toplamGelir, toplamGider, 1)

  const borcluOgrenciler = ogrenciler.filter(o => {
    if (o.ucretsiz_mi) return false
    let gereken = isGunu * gunlukSaat * saatUcreti
    if (o.kardes_indirimi) gereken *= 0.5
    return (gereken - odened(o)) > 0
  })

  return (
    <div>
      <Topbar
        title="Ana Sayfa"
        sub={`${ayLabel(ay, yil)} — Genel bakış`}
        actions={
          <button className="btn btn-secondary btn-sm no-print" onClick={() => window.print()}>
            🖨️ Yazdır
          </button>
        }
      />
      <div style={{ padding: 28 }}>
        {loading && <div className="alert alert-info">⏳ Veriler yükleniyor...</div>}

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
          <StatCard label="Toplam Öğrenci" value={ogrenciler.length} sub="Aktif kayıtlı" />
          <StatCard label="Bu Ay Tahsilat" value={fmtTL(toplamTahsilat)} sub={ayLabel(ay, yil)} variant="orange" />
          <StatCard label="Kalan Borç" value={fmtTL(toplamBor)} sub="Tahsil edilemeyen" variant="red" />
          <StatCard label="Net Bakiye" value={fmtTL(netBakiye)} sub="Hesap bakiyesi" variant="teal" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {/* Gelir / Gider */}
          <div className="card">
            <div className="card-title">📊 Hesap Özeti</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>Toplam Gelir</span>
              <span className="fw-600" style={{ color: 'var(--success)' }}>{fmtTL(toplamGelir)}</span>
            </div>
            <div className="prog-bar"><div className="prog-fill" style={{ width: `${Math.round(toplamGelir / mx * 100)}%` }} /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, marginTop: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>Toplam Gider</span>
              <span className="fw-600" style={{ color: 'var(--danger)' }}>{fmtTL(toplamGider)}</span>
            </div>
            <div className="prog-bar"><div className="prog-fill red" style={{ width: `${Math.round(toplamGider / mx * 100)}%` }} /></div>
            <div className="sep" />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Net</span>
              <span className="fw-600" style={{ fontSize: 15, color: netBakiye >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {fmtTL(netBakiye)}
              </span>
            </div>
          </div>

          {/* Son İşlemler */}
          <div className="card">
            <div className="card-title">🏆 Son Hesap İşlemleri</div>
            {hareketler.length === 0 ? (
              <div className="empty-state" style={{ padding: 20 }}>
                <div className="empty-icon">📋</div>
                <p>Henüz işlem yok</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead><tr><th>Tarih</th><th>Açıklama</th><th>Tür</th><th className="td-num">Tutar</th></tr></thead>
                  <tbody>
                    {hareketler.slice(0, 6).map(h => (
                      <tr key={h.id}>
                        <td style={{ fontSize: 12 }}>{tarihFmt(h.tarih)}</td>
                        <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.aciklama || '-'}</td>
                        <td><span className={`badge badge-${h.tur === 'gelir' ? 'green' : 'red'}`}>{h.tur === 'gelir' ? 'Gelir' : 'Gider'}</span></td>
                        <td className="td-num">{fmtTL(Number(h.tutar))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Ödeme bekleyen */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>
              ⚠️ Ödeme Bekleyen Öğrenciler — {ayLabel(ay, yil)}
            </div>
            <Link href="/odeme" className="btn btn-secondary btn-sm no-print">Tümünü Gör →</Link>
          </div>
          {borcluOgrenciler.length === 0 ? (
            <div className="empty-state" style={{ padding: 16 }}>
              <div className="empty-icon">✅</div>
              <p>Tüm ödemeler güncel</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Öğrenci</th><th>Sınıf</th>
                    <th className="td-num">Gereken (₺)</th>
                    <th className="td-num">Ödenen (₺)</th>
                    <th className="td-num">Kalan (₺)</th>
                  </tr>
                </thead>
                <tbody>
                  {borcluOgrenciler.slice(0, 10).map(o => {
                    let gereken = isGunu * gunlukSaat * saatUcreti
                    if (o.kardes_indirimi) gereken *= 0.5
                    const od = odened(o)
                    return (
                      <tr key={o.id}>
                        <td><strong>{o.ad} {o.soyad}</strong></td>
                        <td>{o.sinif || '-'}</td>
                        <td className="td-num">{fmtTL(gereken)}</td>
                        <td className="td-num">{fmtTL(od)}</td>
                        <td className="td-num fw-600" style={{ color: 'var(--danger)' }}>{fmtTL(gereken - od)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {ayarlar && (
          <div className="alert alert-info">
            ℹ️ <strong>{ayLabel(ay, yil)}</strong> — {isGunu} iş günü |
            Günlük {gunlukSaat} saat × {fmtTL(saatUcreti)} saat ücreti |
            Öğrenci başı: <strong>{fmtTL(isGunu * gunlukSaat * saatUcreti)}</strong>
          </div>
        )}
      </div>
    </div>
  )
}
