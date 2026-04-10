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

  const [searchTerm, setSearchTerm] = useState('')

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


  async function sil(id: number) {
    if (!confirm('Bu işlemi silmek istediğinizden emin misiniz?')) return
    await supabase.from('hesap_hareketleri').delete().eq('id', id)
    load()
  }

  const filtrelenmis = hareketler.filter(h => {
    const matchType = filtre === 'hepsi' ? true : h.tur === filtre
    const matchSearch = searchTerm === '' 
      ? true 
      : (h.aciklama || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (h.dekont_no || '').toLowerCase().includes(searchTerm.toLowerCase())
    return matchType && matchSearch
  })

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
          <StatCard label="Toplam Gelir" value={fmtTL(toplamGelir)} sub={`${hareketler.filter(h => h.tur === 'gelir').length} işlem`} variant="orange" />
          <StatCard label="Toplam Gider" value={fmtTL(toplamGider)} sub={`${hareketler.filter(h => h.tur === 'gider').length} işlem`} variant="red" />
          <StatCard label="Net Kasa Bakiyesi" value={fmtTL(netBakiye)} sub="Anlık bakiye" variant="teal" />
        </div>


        {/* Tablo */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>📊 Hesap Hareketleri</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="İşlem veya dekont ara..." 
                style={{ width: 240, marginBottom: 0 }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <select className="form-select" style={{ width: 140, marginBottom: 0 }} value={filtre} onChange={e => setFiltre(e.target.value)}>
                <option value="hepsi">Tüm Türler</option>
                <option value="gelir">Sadece Gelir</option>
                <option value="gider">Sadece Gider</option>
              </select>
            </div>
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
                    <td>
                      <span className={`badge badge-${h.kaynak === 'tahsilat' ? 'blue' : h.kaynak === 'bordro' ? 'orange' : 'gray'}`} style={{ fontSize: 10 }}>
                        {h.kaynak === 'tahsilat' ? 'Tahsilat' : h.kaynak === 'bordro' ? 'Maaş' : 'Manuel'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>{h.dekont_no || '-'}</td>
                    <td>
                      <span className={`badge badge-${h.tur === 'gelir' ? 'green' : 'red'}`}>
                        {h.tur === 'gelir' ? '↑ Gelir' : '↓ Gider'}
                      </span>
                    </td>
                    <td className="td-num fw-600" style={{ color: h.tur === 'gelir' ? 'var(--success)' : 'var(--danger)' }}>
                      {h.tur === 'gelir' ? '+' : '-'}{fmtTL(Number(h.tutar))}
                    </td>
                    <td className="td-num" style={{ color: bakiyeMap[h.id] >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
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
