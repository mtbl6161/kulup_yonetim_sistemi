'use client'
import { useEffect, useState, useCallback } from 'react'
import Topbar from '@/components/Topbar'
import StatCard from '@/components/StatCard'
import { useAy } from '@/lib/AyContext'
import { supabase } from '@/lib/supabase'
import { fmtTL, ayLabel, tarihFmt } from '@/lib/hesaplama'
import { HesapHareketi } from '@/lib/types'

export default function HesapHareketleriPage() {
  const { ay, yil } = useAy()
  const [hareketler, setHareketler] = useState<HesapHareketi[]>([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState('hepsi')

  // Form
  const [tarih, setTarih] = useState(new Date().toISOString().split('T')[0])
  const [aciklama, setAciklama] = useState('')
  const [tutar, setTutar] = useState('')
  const [tur, setTur] = useState<'gelir' | 'gider'>('gelir')
  const [kategori, setKategori] = useState('')
  const [dekont, setDekont] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('hesap_hareketleri')
      .select('*')
      .order('tarih', { ascending: false })
      .order('id', { ascending: false })
    setHareketler(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function kaydet() {
    if (!tutar || !tarih) { setMsg('❌ Tutar ve tarih zorunlu!'); return }
    setSaving(true)
    setMsg('')
    const d = new Date(tarih)
    const { error } = await supabase.from('hesap_hareketleri').insert({
      tarih, tutar: parseFloat(tutar), tur,
      aciklama: aciklama + (kategori ? ` [${kategori}]` : ''),
      dekont_no: dekont, kaynak: 'manuel',
      ay: d.getMonth() + 1, yil: d.getFullYear(),
    })
    setSaving(false)
    if (error) { setMsg('❌ Hata: ' + error.message); return }
    setMsg('✅ Kaydedildi!')
    setTimeout(() => setMsg(''), 2000)
    setTutar(''); setAciklama(''); setDekont(''); setKategori('')
    load()
  }

  async function sil(id: number) {
    if (!confirm('Bu işlemi silmek istediğinizden emin misiniz?')) return
    await supabase.from('hesap_hareketleri').delete().eq('id', id)
    load()
  }

  const filtrelenmis = filtre === 'gelir'
    ? hareketler.filter(h => h.tur === 'gelir')
    : filtre === 'gider'
    ? hareketler.filter(h => h.tur === 'gider')
    : hareketler

  const toplamGelir = hareketler.filter(h => h.tur === 'gelir').reduce((s, h) => s + Number(h.tutar), 0)
  const toplamGider = hareketler.filter(h => h.tur === 'gider').reduce((s, h) => s + Number(h.tutar), 0)
  const netBakiye = toplamGelir - toplamGider

  // Kümülatif bakiye hesapla (en eski → en yeni)
  const sirali = [...hareketler].sort((a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime() || a.id - b.id)
  let bakiye = 0
  const bakiyeMap: Record<number, number> = {}
  for (const h of sirali) {
    bakiye += h.tur === 'gelir' ? Number(h.tutar) : -Number(h.tutar)
    bakiyeMap[h.id] = bakiye
  }

  const GIDER_KATEGORILERI = [
    'Temel Gider', 'Kırtasiye', 'Temizlik Malzemesi', 'Yemek', 'Ulaşım', 'Teknik Donanım', 'Diğer',
  ]

  return (
    <div>
      <Topbar
        title="Hesap Hareketleri"
        sub="Gelir ve gider işlemleri"
        actions={
          <button className="btn btn-secondary btn-sm no-print" onClick={() => window.print()}>🖨️ Yazdır</button>
        }
      />
      <div style={{ padding: 28 }}>
        {/* Özet */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
          <StatCard label="Toplam Gelir" value={fmtTL(toplamGelir)} sub={`${hareketler.filter(h => h.tur === 'gelir').length} işlem`} />
          <StatCard label="Toplam Gider" value={fmtTL(toplamGider)} sub={`${hareketler.filter(h => h.tur === 'gider').length} işlem`} variant="red" />
          <StatCard label="Net Bakiye" value={fmtTL(netBakiye)} sub="Anlık bakiye" variant={netBakiye >= 0 ? 'teal' : 'red'} />
        </div>

        {/* Form */}
        <div className="card">
          <div className="card-title">➕ İşlem Ekle</div>
          {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`}>{msg}</div>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <div style={{ width: 150 }}>
              <label className="form-label">Tarih</label>
              <input className="form-input" type="date" value={tarih} onChange={e => setTarih(e.target.value)} />
            </div>
            <div style={{ width: 110 }}>
              <label className="form-label">Tür</label>
              <select className="form-select" value={tur} onChange={e => setTur(e.target.value as 'gelir' | 'gider')}>
                <option value="gelir">Gelir (+)</option>
                <option value="gider">Gider (-)</option>
              </select>
            </div>
            <div style={{ flex: 2, minWidth: 180 }}>
              <label className="form-label">Açıklama</label>
              <input className="form-input" placeholder="İşlem açıklaması" value={aciklama} onChange={e => setAciklama(e.target.value)} />
            </div>
            {tur === 'gider' && (
              <div style={{ width: 180 }}>
                <label className="form-label">Kategori</label>
                <select className="form-select" value={kategori} onChange={e => setKategori(e.target.value)}>
                  <option value="">Seçin...</option>
                  {GIDER_KATEGORILERI.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            )}
            <div style={{ width: 130 }}>
              <label className="form-label">Tutar (₺)</label>
              <input className="form-input" type="number" step="0.01" value={tutar} onChange={e => setTutar(e.target.value)} />
            </div>
            <div style={{ width: 120 }}>
              <label className="form-label">Dekont No</label>
              <input className="form-input" value={dekont} onChange={e => setDekont(e.target.value)} />
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <button className="btn btn-primary" onClick={kaydet} disabled={saving}>
              {saving ? '⏳...' : '💾 Kaydet'}
            </button>
          </div>
        </div>

        {/* Tablo */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>
              Hesap Hareketleri ({loading ? '...' : hareketler.length})
            </div>
            <select className="form-select" style={{ width: 150 }} value={filtre} onChange={e => setFiltre(e.target.value)}>
              <option value="hepsi">Tümü</option>
              <option value="gelir">Sadece Gelir</option>
              <option value="gider">Sadece Gider</option>
            </select>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th><th>Tarih</th><th>Açıklama</th><th>Kaynak</th><th>Dekont</th>
                  <th>Tür</th><th className="td-num">Tutar (₺)</th><th className="td-num">Bakiye (₺)</th><th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--text3)' }}>Yükleniyor...</td></tr>
                ) : filtrelenmis.length === 0 ? (
                  <tr><td colSpan={9}>
                    <div className="empty-state"><div className="empty-icon">🏦</div><p>İşlem bulunamadı</p></div>
                  </td></tr>
                ) : filtrelenmis.map((h, i) => (
                  <tr key={h.id}>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>{i + 1}</td>
                    <td style={{ fontSize: 12 }}>{tarihFmt(h.tarih)}</td>
                    <td style={{ maxWidth: 240 }}>{h.aciklama || '-'}</td>
                    <td><span className="badge badge-gray" style={{ fontSize: 10 }}>{h.kaynak || 'manuel'}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>{h.dekont_no || '-'}</td>
                    <td>
                      <span className={`badge badge-${h.tur === 'gelir' ? 'green' : 'red'}`}>
                        {h.tur === 'gelir' ? '↑ Gelir' : '↓ Gider'}
                      </span>
                    </td>
                    <td className="td-num fw-600" style={{ color: h.tur === 'gelir' ? 'var(--success)' : 'var(--danger)' }}>
                      {h.tur === 'gelir' ? '+' : '-'}{fmtTL(Number(h.tutar))}
                    </td>
                    <td className="td-num" style={{ color: bakiyeMap[h.id] >= 0 ? 'var(--accent)' : 'var(--danger)', fontWeight: 600 }}>
                      {fmtTL(bakiyeMap[h.id] || 0)}
                    </td>
                    <td>
                      {h.kaynak === 'manuel' && (
                        <button className="btn btn-danger btn-sm" onClick={() => sil(h.id)}>🗑️</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
