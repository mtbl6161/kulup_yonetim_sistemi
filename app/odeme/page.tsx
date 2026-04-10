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
  const [siniflar, setSiniflar] = useState<any[]>([])
  const [ayarlar, setAyarlar] = useState<Ayarlar | null>(null)
  const [tatiller, setTatiller] = useState<any[]>([])
  const [secilenler, setSecilenler] = useState<number[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState('hepsi')
  const [sinifFiltre, setSinifFiltre] = useState('')

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
    const [{ data: ogr }, { data: tah }, { data: ayr }, { data: sin }, { data: tat }] = await Promise.all([
      supabase.from('ogrenciler').select('*').order('soyad'),
      supabase.from('tahsilat').select('*').eq('ay', ay).eq('yil', yil).order('tarih', { ascending: false }),
      supabase.from('ayarlar').select('*').single(),
      supabase.from('siniflar').select('*'),
      supabase.from('tatiller').select('*')
    ])
    setOgrenciler(ogr || [])
    setTahsilatlar(tah || [])
    setAyarlar(ayr)
    setSiniflar(sin || [])
    setTatiller(tat || [])
    setLoading(false)
  }, [ay, yil])

  useEffect(() => { load() }, [load])
  
  // Seçili ay değiştiğinde tarih alanını o aya göre güncelle
  useEffect(() => {
    const today = new Date()
    const isCurrentMonth = today.getMonth() + 1 === ay && today.getFullYear() === yil
    if (isCurrentMonth) {
      setTarih(today.toISOString().split('T')[0])
    } else {
      // Değilse seçili ayın 1. gününe ayarla
      setTarih(`${yil}-${String(ay).padStart(2, '0')}-01`)
    }
  }, [ay, yil])

  const isGunu = isGunuSayisi(yil, ay, tatiller)

  async function tahakkukGuncelle() {
    try {
      // Bu ayın tüm tahsilatlarını topla ve tahakkuk tablosunu güncelle
      const { data: tahs } = await supabase.from('tahsilat').select('tutar').eq('ay', ay).eq('yil', yil)
      const toplam = (tahs || []).reduce((s, t) => s + Number(t.tutar), 0)
      
      await supabase.from('tahakkuk').upsert({
        ay, yil, toplam_gelir: toplam, hesaplandi_mi: true
      }, { onConflict: 'ay,yil' })
    } catch (e) {
      console.error('Tahakkuk guncelleme hatasi:', e)
    }
  }

  function gereken(o: Ogrenci): number {
    if (o.ucretsiz_mi) return 0
    if (!ayarlar) return 0

    const isGunu = isGunuSayisi(yil, ay, tatiller)
    let u = isGunu * (ayarlar.gunluk_saat || 6) * (ayarlar.saat_ucreti || 0)
    
    if (o.kardes_indirimi) u *= 0.75
    return Math.round(u * 100) / 100
  }

  function odened(oId: number): number {
    return tahsilatlar.filter(t => t.ogrenci_id === oId).reduce((s, t) => s + Number(t.tutar), 0)
  }

  async function odemeKaydet() {
    if (!ogrenciId || !tutar || !tarih) { setMsg('❌ Öğrenci, tutar ve tarih zorunlu!'); return }
    setSaving(true)
    setMsg('')
    // Ödemeyi HER ZAMAN üst menüde seçili olan ay/yıla kaydet (Kritik Fix)
    const ayX = ay
    const yilX = yil

    // Mükerrer Ödeme Kontrolü
    const { data: mevcut } = await supabase.from('tahsilat')
      .select('id')
      .eq('ogrenci_id', parseInt(ogrenciId))
      .eq('ay', ayX)
      .eq('yil', yilX)
      .maybeSingle()

    if (mevcut) {
      setMsg(`⚠️ Hata: Bu öğrencinin ${ayLabel(ayX, yilX)} ayı için zaten bir ödeme kaydı bulunmaktadır.`);
      setSaving(false); return
    }

    const tahsData = {
      ogrenci_id: parseInt(ogrenciId),
      tutar: parseFloat(tutar),
      tarih, aciklama, dekont_no: dekont,
      ay: ayX, yil: yilX,
    }
    const { data: tahNew, error: e1 } = await supabase.from('tahsilat').insert(tahsData).select().single()
    if (e1) { setMsg('❌ Hata: ' + e1.message); setSaving(false); return }

    // Hesap hareketlerine ekle
    const ogr = ogrenciler.find(o => o.id === parseInt(ogrenciId))
    await supabase.from('hesap_hareketleri').insert({
      tarih, tutar: parseFloat(tutar), tur: 'gelir',
      aciklama: `Öğrenci ödemesi: ${ogr ? ogr.ad + ' ' + ogr.soyad : ''} ${aciklama || ''}`.trim(),
      dekont_no: dekont, kaynak: 'tahsilat', kaynak_id: tahNew?.id,
      ay: ay, yil: yil,
    })

    setSaving(false)
    setMsg('✅ Ödeme kaydedildi!')
    setTimeout(() => setMsg(''), 2500)
    setTutar(''); setAciklama(''); setDekont('')
    setSecilenler([])
    load()
    tahakkukGuncelle()
  }

  function hizliOdemeDoldur(o: Ogrenci) {
    const k = gereken(o) - odened(o.id)
    if (k <= 0) { setMsg('ℹ️ Bu öğrencinin borcu bulunmamaktadır.'); return }
    setOgrenciId(String(o.id))
    setTutar(String(k))
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setMsg(`💡 ${o.ad} için ödeme formu dolduruldu.`)
  }

  async function topluOdemeKaydet() {
    if (secilenler.length === 0) return
    const onayla = confirm(`${secilenler.length} öğrenci için borç kapama ödemesi oluşturulacak. Emin misiniz?`)
    if (!onayla) return

    setSaving(true)
    setMsg('🔄 Toplu ödemeler işleniyor...')
    
    try {
      // Ödemeyi HER ZAMAN üst menüde seçili olan ay/yıla kaydet (Kritik Fix)
      const ayX = ay
      const yilX = yil

      const seciliOgrenciler = ogrenciler.filter(o => secilenler.includes(o.id))
      
      for (const o of seciliOgrenciler) {
        // Önce ödemesi var mı bak
        const { data: v } = await supabase.from('tahsilat').select('id').eq('ogrenci_id', o.id).eq('ay', ayX).eq('yil', yilX).maybeSingle()
        if (v) continue // Varsa atla

        const k = gereken(o) - odened(o.id)
        if (k <= 0) continue

        const { data: tahNew, error } = await supabase.from('tahsilat').insert({
          ogrenci_id: o.id,
          tutar: k,
          tarih,
          aciklama: `${ayLabel(ayX, yilX)} Toplu Ödeme`,
          ay: ayX,
          yil: yilX
        }).select().single()

        if (!error && tahNew) {
          await supabase.from('hesap_hareketleri').insert({
            tarih, tutar: k, tur: 'gelir',
            aciklama: `Toplu Ödeme: ${o.ad} ${o.soyad}`,
            kaynak: 'tahsilat', kaynak_id: tahNew.id,
            ay: ay, yil: yil
          })
        }
      }
      setMsg(`✅ ${secilenler.length} adet ödeme başarıyla kaydedildi!`)
      setSecilenler([])
      load()
      tahakkukGuncelle()
    } catch (err: any) {
      setMsg('❌ Hata: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function tahsilatSil(id: number) {
    if (!confirm('Bu ödeme kaydını ve bağlı kasa hareketini silmek istediğinizden emin misiniz?')) return
    
    setMsg('🔄 Siliniyor...')
    // 1. Ödeme kaydını sil
    const { error: e1 } = await supabase.from('tahsilat').delete().eq('id', id)
    if (e1) { setMsg('❌ Hata: ' + e1.message); return }

    // 2. Kasa hareketini sil (Mutabakat)
    await supabase.from('hesap_hareketleri').delete().eq('kaynak', 'tahsilat').eq('kaynak_id', id)
    
    setMsg('✅ Ödeme ve kasa hareketi başarıyla silindi.')
    setTimeout(() => setMsg(''), 2500)
    load()
    tahakkukGuncelle()
  }

  const ozet = ogrenciler.map(o => {
    const g = gereken(o)
    const od = odened(o.id)
    const kalan = g - od
    const durum = kalan <= 0 ? 'tam' : od > 0 ? 'kismi' : 'odenmedi'
    // Bu ayki tahsilatı bul (iptal butonu için)
    const sonTahsilat = tahsilatlar.find(t => t.ogrenci_id === o.id)
    return { ogrenci: o, gereken: g, odenen: od, kalan, durum, tahsilatId: sonTahsilat?.id }
  })

  const filtrelenmis = ozet.filter(r => {
    const matchFiltre = filtre === 'borclu'
      ? r.kalan > 0
      : filtre === 'odendi'
      ? r.kalan <= 0 && r.gereken > 0
      : true
    const matchSinif = !sinifFiltre || r.ogrenci.sinif === sinifFiltre
    return matchFiltre && matchSinif
  }).sort((a, b) => {
    const nameA = (a.ogrenci.ad + ' ' + a.ogrenci.soyad).toLocaleLowerCase('tr')
    const nameB = (b.ogrenci.ad + ' ' + b.ogrenci.soyad).toLocaleLowerCase('tr')
    return nameA.localeCompare(nameB, 'tr')
  })

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Ödeme Durumu</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button 
                className="btn btn-secondary btn-sm no-print" 
                onClick={() => setShowHistory(true)}
                style={{ backgroundColor: 'var(--bg2)', border: '1px solid var(--border)' }}
              >
                📋 Ödeme Geçmişi
              </button>
              <select className="form-select" style={{ width: 140 }} value={sinifFiltre} onChange={e => setSinifFiltre(e.target.value)}>
                <option value="">Tüm Sınıflar</option>
                {siniflar.map((s, i) => (
                  <option key={i} value={s.ad}>{s.ad}</option>
                ))}
              </select>
              <select className="form-select" style={{ width: 160 }} value={filtre} onChange={e => setFiltre(e.target.value)}>
                <option value="hepsi">Tüm Ödemeler</option>
                <option value="borclu">Borcu Olanlar</option>
                <option value="odendi">Tam Ödeyenler</option>
              </select>
              {secilenler.length > 0 && (
                <button 
                  className="btn btn-primary" 
                  style={{ background: 'var(--success)', borderColor: 'var(--success)' }}
                  onClick={topluOdemeKaydet}
                  disabled={saving}
                >
                  ✅ Seçilenleri Öde ({secilenler.length})
                </button>
              )}
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input 
                      type="checkbox" 
                      checked={secilenler.length > 0 && secilenler.length === filtrelenmis.length}
                      onChange={e => {
                        if (e.target.checked) setSecilenler(filtrelenmis.map(r => r.ogrenci.id))
                        else setSecilenler([])
                      }}
                    />
                  </th>
                  <th>Öğrenci</th><th style={{ width: 100 }}>Sınıf</th>
                  <th className="td-num" style={{ width: 110 }}>Gereken (₺)</th>
                  <th className="td-num" style={{ width: 110 }}>Ödenen (₺)</th>
                  <th className="td-num" style={{ width: 110 }}>Kalan (₺)</th>
                  <th style={{ textAlign: 'center', width: 125 }}>Durum</th>
                  <th style={{ textAlign: 'center', width: 90 }}>Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {filtrelenmis.map((r, i) => (
                  <tr key={r.ogrenci.id}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={secilenler.includes(r.ogrenci.id)} 
                        onChange={e => {
                          if (e.target.checked) setSecilenler(s => [...s, r.ogrenci.id])
                          else setSecilenler(s => s.filter(id => id !== r.ogrenci.id))
                        }}
                      />
                    </td>
                    <td><strong>{r.ogrenci.ad} {r.ogrenci.soyad}</strong></td>
                    <td>{r.ogrenci.sinif || '-'}</td>
                    <td className="td-num">{fmtTL(r.gereken)}</td>
                    <td className="td-num">{fmtTL(r.odenen)}</td>
                    <td className="td-num fw-600" style={{ color: r.kalan > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {r.kalan > 0 ? fmtTL(r.kalan) : fmtTL(0)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {r.ogrenci.ucretsiz_mi ? (
                          <Badge variant="blue">Ücretsiz</Badge>
                        ) : r.durum === 'tam' ? (
                          <Badge variant="green">✅ Ödendi</Badge>
                        ) : r.durum === 'kismi' ? (
                          <Badge variant="orange">⏳ Kısmi</Badge>
                        ) : (
                          <Badge variant="red">❌ Ödenmedi</Badge>
                        )}
                        {r.tahsilatId && (
                          <button 
                            className="btn btn-danger btn-sm" 
                            style={{ padding: '0 4px', fontSize: 10, borderRadius: 4 }}
                            onClick={() => tahsilatSil(r.tahsilatId!)}
                            title="Ödemeyi İptal Et (Geri Al)"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        title="Ödeme Formunu Doldur"
                        onClick={() => hizliOdemeDoldur(r.ogrenci)}
                        disabled={r.kalan <= 0}
                      >
                        💰 Öde
                      </button>
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

      </div>

      {/* ÖDEME GEÇMİŞİ MODAL */}
      {showHistory && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="card" style={{
            width: '90%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto',
            position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <button 
              onClick={() => setShowHistory(false)}
              style={{ position: 'absolute', top: 15, right: 15, border: 'none', background: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--text3)' }}
            >
              ✕
            </button>
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
                            <button className="btn btn-danger btn-sm" onClick={() => tahsilatSil(t.id)}>🗑️ Sil</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ textAlign: 'right', marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setShowHistory(false)}>Kapat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
