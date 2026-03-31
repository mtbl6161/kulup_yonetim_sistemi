'use client'
import { useEffect, useState, useCallback } from 'react'
import Topbar from '@/components/Topbar'
import Badge from '@/components/Badge'
import { useAy } from '@/lib/AyContext'
import { supabase } from '@/lib/supabase'
import { fmtTL, ayLabel, isGunuSayisi, tarihFmt } from '@/lib/hesaplama'
import { Ogrenci, Tahsilat, Ayarlar } from '@/lib/types'

export default function OdemePage() {
  const { ay, yil } = useAy()
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>([])
  const [tahsilatlar, setTahsilatlar] = useState<Tahsilat[]>([])
  const [ayarlar, setAyarlar] = useState<Ayarlar | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState('hepsi')

  // Form
  const [ogrenciId, setOgrenciId] = useState('')
  const [tutar, setTutar] = useState('')
  const [tarih, setTarih] = useState(new Date().toISOString().split('T')[0])
  const [aciklama, setAciklama] = useState('')
  const [dekont, setDekont] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: ogr }, { data: tah }, { data: ayr }] = await Promise.all([
      supabase.from('ogrenciler').select('*').order('soyad'),
      supabase.from('tahsilat').select('*').eq('ay', ay).eq('yil', yil).order('tarih', { ascending: false }),
      supabase.from('ayarlar').select('*').single(),
    ])
    setOgrenciler(ogr || [])
    setTahsilatlar(tah || [])
    setAyarlar(ayr)
    setLoading(false)
  }, [ay, yil])

  useEffect(() => { load() }, [load])

  const isGunu = isGunuSayisi(yil, ay)
  const saatUcreti = ayarlar?.saat_ucreti || 0
  const gunlukSaat = ayarlar?.gunluk_saat || 6

  function gereken(o: Ogrenci): number {
    if (o.ucretsiz_mi) return 0
    let u = isGunu * gunlukSaat * saatUcreti
    if (o.kardes_indirimi) u *= 0.5
    return Math.round(u * 100) / 100
  }

  function odened(oId: number): number {
    return tahsilatlar.filter(t => t.ogrenci_id === oId).reduce((s, t) => s + Number(t.tutar), 0)
  }

  async function odemeKaydet() {
    if (!ogrenciId || !tutar || !tarih) { setMsg('❌ Öğrenci, tutar ve tarih zorunlu!'); return }
    setSaving(true)
    setMsg('')
    const d = new Date(tarih)
    const tahsData = {
      ogrenci_id: parseInt(ogrenciId),
      tutar: parseFloat(tutar),
      tarih, aciklama, dekont_no: dekont,
      ay: d.getMonth() + 1, yil: d.getFullYear(),
    }
    const { data: tahNew, error: e1 } = await supabase.from('tahsilat').insert(tahsData).select().single()
    if (e1) { setMsg('❌ Hata: ' + e1.message); setSaving(false); return }

    // Hesap hareketlerine ekle
    const ogr = ogrenciler.find(o => o.id === parseInt(ogrenciId))
    await supabase.from('hesap_hareketleri').insert({
      tarih, tutar: parseFloat(tutar), tur: 'gelir',
      aciklama: `Öğrenci ödemesi: ${ogr ? ogr.ad + ' ' + ogr.soyad : ''} ${aciklama || ''}`.trim(),
      dekont_no: dekont, kaynak: 'tahsilat', kaynak_id: tahNew?.id,
      ay: d.getMonth() + 1, yil: d.getFullYear(),
    })

    setSaving(false)
    setMsg('✅ Ödeme kaydedildi!')
    setTimeout(() => setMsg(''), 2500)
    setTutar(''); setAciklama(''); setDekont('')
    load()
  }

  async function tahsilatSil(id: number) {
    if (!confirm('Bu ödeme kaydını silmek istediğinizden emin misiniz?')) return
    await supabase.from('tahsilat').delete().eq('id', id)
    load()
  }

  const ozet = ogrenciler.map(o => {
    const g = gereken(o)
    const od = odened(o.id)
    const kalan = g - od
    const durum = kalan <= 0 ? 'tam' : od > 0 ? 'kismi' : 'odenmedi'
    return { ogrenci: o, gereken: g, odenen: od, kalan, durum }
  })

  const filtrelenmis = filtre === 'borclu'
    ? ozet.filter(r => r.kalan > 0)
    : filtre === 'odendi'
    ? ozet.filter(r => r.kalan <= 0 && r.gereken > 0)
    : ozet

  const toplamGereken = ozet.reduce((s, r) => s + r.gereken, 0)
  const toplamOdenen = ozet.reduce((s, r) => s + r.odenen, 0)
  const toplamKalan = ozet.reduce((s, r) => s + Math.max(r.kalan, 0), 0)

  return (
    <div>
      <Topbar
        title="Ödeme Takibi"
        sub={`${ayLabel(ay, yil)} — Aylık tahsilat`}
        actions={
          <button className="btn btn-secondary btn-sm no-print" onClick={() => window.print()}>🖨️ Yazdır</button>
        }
      />
      <div style={{ padding: 28 }}>
        {/* Özet istatistikler */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-label">Toplam Gereken</div>
            <div className="stat-value">{fmtTL(toplamGereken)}</div>
            <div className="stat-sub">{ayLabel(ay, yil)} — {isGunu} iş günü</div>
          </div>
          <div className="stat-card orange">
            <div className="stat-label">Toplam Ödenen</div>
            <div className="stat-value">{fmtTL(toplamOdenen)}</div>
            <div className="stat-sub">{tahsilatlar.length} adet tahsilat</div>
          </div>
          <div className="stat-card red">
            <div className="stat-label">Kalan Borç</div>
            <div className="stat-value">{fmtTL(toplamKalan)}</div>
            <div className="stat-sub">{ozet.filter(r => r.kalan > 0).length} öğrenci borçlu</div>
          </div>
        </div>

        {/* Ödeme kayıt formu */}
        <div className="card">
          <div className="card-title">💰 Ödeme Kaydet</div>
          {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`}>{msg}</div>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <div style={{ flex: 2, minWidth: 200 }}>
              <label className="form-label">Öğrenci</label>
              <select className="form-select" value={ogrenciId} onChange={e => {
                setOgrenciId(e.target.value)
                if (e.target.value) {
                  const o = ogrenciler.find(o => o.id === parseInt(e.target.value))
                  if (o) setTutar(String(gereken(o)))
                }
              }}>
                <option value="">-- Seçin --</option>
                {ogrenciler.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.ad} {o.soyad} ({o.sinif || '?'}) — Gereken: {fmtTL(gereken(o))}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ width: 130 }}>
              <label className="form-label">Tutar (₺)</label>
              <input className="form-input" type="number" step="0.01" min="0" value={tutar} onChange={e => setTutar(e.target.value)} />
            </div>
            <div style={{ width: 150 }}>
              <label className="form-label">Tarih</label>
              <input className="form-input" type="date" value={tarih} onChange={e => setTarih(e.target.value)} />
            </div>
            <div style={{ width: 120 }}>
              <label className="form-label">Dekont No</label>
              <input className="form-input" value={dekont} onChange={e => setDekont(e.target.value)} />
            </div>
            <div style={{ flex: 2, minWidth: 160 }}>
              <label className="form-label">Açıklama</label>
              <input className="form-input" placeholder="Ödeme açıklaması" value={aciklama} onChange={e => setAciklama(e.target.value)} />
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <button className="btn btn-primary" onClick={odemeKaydet} disabled={saving}>
              {saving ? '⏳...' : '💾 Ödemeyi Kaydet'}
            </button>
          </div>
        </div>

        {/* Ödeme durumu tablosu */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Ödeme Durumu</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="form-select" style={{ width: 160 }} value={filtre} onChange={e => setFiltre(e.target.value)}>
                <option value="hepsi">Tümü</option>
                <option value="borclu">Borcu Olanlar</option>
                <option value="odendi">Tam Ödeyenler</option>
              </select>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th><th>Öğrenci</th><th>Sınıf</th>
                  <th className="td-num">Gereken (₺)</th>
                  <th className="td-num">Ödenen (₺)</th>
                  <th className="td-num">Kalan (₺)</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {filtrelenmis.map((r, i) => (
                  <tr key={r.ogrenci.id}>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>{i + 1}</td>
                    <td><strong>{r.ogrenci.ad} {r.ogrenci.soyad}</strong></td>
                    <td>{r.ogrenci.sinif || '-'}</td>
                    <td className="td-num">{fmtTL(r.gereken)}</td>
                    <td className="td-num">{fmtTL(r.odenen)}</td>
                    <td className="td-num fw-600" style={{ color: r.kalan > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {r.kalan > 0 ? fmtTL(r.kalan) : '-'}
                    </td>
                    <td>
                      {r.ogrenci.ucretsiz_mi ? (
                        <Badge variant="blue">Ücretsiz</Badge>
                      ) : r.durum === 'tam' ? (
                        <Badge variant="green">✅ Ödendi</Badge>
                      ) : r.durum === 'kismi' ? (
                        <Badge variant="orange">⏳ Kısmi</Badge>
                      ) : (
                        <Badge variant="red">❌ Ödenmedi</Badge>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="sum-row">
                  <td colSpan={3}>TOPLAM</td>
                  <td className="td-num">{fmtTL(filtrelenmis.reduce((s, r) => s + r.gereken, 0))}</td>
                  <td className="td-num">{fmtTL(filtrelenmis.reduce((s, r) => s + r.odenen, 0))}</td>
                  <td className="td-num">{fmtTL(filtrelenmis.reduce((s, r) => s + Math.max(r.kalan, 0), 0))}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Ödeme geçmişi */}
        <div className="card">
          <div className="card-title">📋 {ayLabel(ay, yil)} Ödeme Geçmişi</div>
          {loading ? <div className="alert alert-info">⏳ Yükleniyor...</div> : tahsilatlar.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">💳</div><p>Bu ay henüz ödeme kaydı yok</p></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Tarih</th><th>Öğrenci</th><th>Açıklama</th><th>Dekont</th><th className="td-num">Tutar (₺)</th><th>İşlem</th></tr>
                </thead>
                <tbody>
                  {tahsilatlar.map(t => {
                    const o = ogrenciler.find(x => x.id === t.ogrenci_id)
                    return (
                      <tr key={t.id}>
                        <td>{tarihFmt(t.tarih)}</td>
                        <td>{o ? o.ad + ' ' + o.soyad : '?'}</td>
                        <td>{t.aciklama || '-'}</td>
                        <td style={{ fontSize: 12 }}>{t.dekont_no || '-'}</td>
                        <td className="td-num fw-600" style={{ color: 'var(--success)' }}>{fmtTL(Number(t.tutar))}</td>
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={() => tahsilatSil(t.id)}>🗑️</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
