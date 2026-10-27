'use client'
import { useEffect, useState, useCallback } from 'react'
import Topbar from '@/components/Topbar'
import StatCard from '@/components/StatCard'
import { useAuth } from '@/lib/AuthContext'
import { pdfHazirla, pdfBaslik, pdfTablo, pdfAc, PDF_RENK } from '@/lib/pdf'
import { supabase } from '@/lib/supabase'
import { fmtTL, tarihFmt } from '@/lib/hesaplama'
import { HesapHareketi } from '@/lib/types'
import ConfirmModal from '@/components/ConfirmModal'
import { FileDown, TrendingUp, Landmark, Trash2 } from 'lucide-react'
import { EmptyPayments } from '@/components/brand/Illustrations'

export default function HesapHareketleriPage() {
  const { okul } = useAuth()
  const [hareketler, setHareketler] = useState<HesapHareketi[]>([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState('hepsi')
  const [conf, setConf] = useState<{ open: boolean, id: number } | null>(null)

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
    setConf({ open: true, id })
  }

  async function silGercek(id: number) {
    setConf(null)
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

  // Ekrandaki (filtrelenmiş) liste, ortak PDF stilinde
  const handlePdf = async () => {
    const { pdf, autoTable } = await pdfHazirla('portrait')
    const filtreAdi = filtre === 'gelir' ? 'Yalnız gelirler' : filtre === 'gider' ? 'Yalnız giderler' : 'Tüm işlemler'
    const y = pdfBaslik(pdf, {
      kurum: okul?.ad,
      baslik: 'Hesap hareketleri',
      alt: `${filtreAdi}${searchTerm ? ` · "${searchTerm}" araması` : ''} · Gelir ${fmtTL(toplamGelir)} · Gider ${fmtTL(toplamGider)} · Bakiye ${fmtTL(netBakiye)}`,
    })
    const KAYNAK: Record<string, string> = { tahsilat: 'Tahsilat', bordro: 'Maaş' }
    autoTable(pdf, pdfTablo({
      head: [['#', 'Tarih', 'Açıklama', 'Kaynak', 'Dekont', 'Tür', 'Tutar (TL)', 'Bakiye (TL)']],
      body: filtrelenmis.map((h, i) => [
        i + 1, tarihFmt(h.tarih), h.aciklama || '-', KAYNAK[h.kaynak || ''] || 'Manuel', h.dekont_no || '-',
        h.tur === 'gelir' ? 'Gelir' : 'Gider',
        `${h.tur === 'gelir' ? '+' : '-'}${fmtTL(Number(h.tutar))}`,
        fmtTL(bakiyeMap[h.id] || 0),
      ]),
      startY: y,
      styles: { fontSize: 7 },
      columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 18 }, 3: { cellWidth: 17 }, 4: { cellWidth: 20 }, 5: { cellWidth: 13 }, 6: { cellWidth: 26, halign: 'right' }, 7: { cellWidth: 26, halign: 'right' } },
      didParseCell: (d) => {
        if (d.section === 'head' && d.column.index >= 6) d.cell.styles.halign = 'right'
        const h = filtrelenmis[d.row.index]
        if (d.section === 'body' && h && ((d.column.index === 6 && h.tur === 'gider') || (d.column.index === 7 && (bakiyeMap[h.id] || 0) < 0))) d.cell.styles.textColor = PDF_RENK.hata
      },
    }))
    pdfAc(pdf, 'Hesap hareketleri')
  }

  return (
    <div>
      <Topbar
        title="Hesap Hareketleri"
        sub="Gelir ve gider işlemleri"
        actions={
          <button 
            className="btn btn-secondary btn-sm no-print" 
            onClick={handlePdf}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <FileDown size={16} />
            <span>PDF</span>
          </button>
        }
      />
      <div style={{ padding: 28 }}>
        {/* Özet */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
          <StatCard title="Toplam Gelir" value={fmtTL(toplamGelir)} trend={`${hareketler.filter(h => h.tur === 'gelir').length} işlem`} variant="orange" />
          <StatCard title="Toplam Gider" value={fmtTL(toplamGider)} trend={`${hareketler.filter(h => h.tur === 'gider').length} işlem`} variant="red" />
          <StatCard title="Net Kasa Bakiyesi" value={fmtTL(netBakiye)} trend="Anlık bakiye" variant="teal" />
        </div>


        {/* Tablo */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={20} style={{ color: 'var(--accent)' }} />
              <span>Hesap Hareketleri</span>
            </div>
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
                    <div className="empty-state">
                      <EmptyPayments width={200} />
                      <p>İşlem bulunamadı</p>
                    </div>
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
                        <button 
                          className="btn btn-danger btn-sm" 
                          onClick={() => sil(h.id)}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, padding: 0 }}
                          title="Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {conf?.open && (
        <ConfirmModal
          baslik="İşlemi Sil?"
          mesaj="Bu hesap hareketini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
          onayMetni="Evet, Sil"
          tehlikeli={true}
          onOnayla={() => silGercek(conf.id)}
          onIptal={() => setConf(null)}
        />
      )}
    </div>
  )
}
