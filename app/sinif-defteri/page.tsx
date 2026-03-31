'use client'
import { useEffect, useState, useCallback } from 'react'
import Topbar from '@/components/Topbar'
import { useAy } from '@/lib/AyContext'
import { supabase } from '@/lib/supabase'
import { ayLabel, AYLAR, gunSayisi, haftaIciMi, tatilMi } from '@/lib/hesaplama'
import { Ogrenci, Yoklama } from '@/lib/types'

type Durum = 'geldi' | 'gelmedi' | 'izinli' | 'belirsiz'

const DURUM_RENK: Record<Durum, string> = {
  geldi: 'present',
  gelmedi: 'absent',
  izinli: 'excused',
  belirsiz: '',
}

export default function SinifDefteriPage() {
  const { ay, yil } = useAy()
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>([])
  const [yoklama, setYoklama] = useState<Yoklama[]>([])
  const [sinifFiltre, setSinifFiltre] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: ogr }, { data: yok }] = await Promise.all([
      supabase.from('ogrenciler').select('*').order('soyad'),
      supabase.from('yoklama').select('*')
        .gte('tarih', `${yil}-${String(ay).padStart(2,'0')}-01`)
        .lte('tarih', `${yil}-${String(ay).padStart(2,'0')}-31`),
    ])
    setOgrenciler(ogr || [])
    setYoklama(yok || [])
    setLoading(false)
  }, [ay, yil])

  useEffect(() => { load() }, [load])

  const topGun = gunSayisi(yil, ay)
  const gunler: number[] = Array.from({ length: topGun }, (_, i) => i + 1)
  const siniflar = [...new Set(ogrenciler.map(o => o.sinif).filter(Boolean))].sort() as string[]
  const liste = sinifFiltre ? ogrenciler.filter(o => o.sinif === sinifFiltre) : ogrenciler

  function getDurum(ogrenciId: number, gun: number): Durum {
    const tarih = `${yil}-${String(ay).padStart(2, '0')}-${String(gun).padStart(2, '0')}`
    const y = yoklama.find(y => y.ogrenci_id === ogrenciId && y.tarih === tarih)
    return (y?.durum as Durum) || 'belirsiz'
  }

  async function toggleDurum(ogrenciId: number, gun: number) {
    if (!haftaIciMi(yil, ay, gun) || tatilMi(ay, gun)) return
    const tarih = `${yil}-${String(ay).padStart(2, '0')}-${String(gun).padStart(2, '0')}`
    const mevcut = getDurum(ogrenciId, gun)
    const siradaki: Durum = mevcut === 'belirsiz' ? 'geldi' : mevcut === 'geldi' ? 'gelmedi' : mevcut === 'gelmedi' ? 'izinli' : 'belirsiz'

    setSaving(true)
    if (siradaki === 'belirsiz') {
      await supabase.from('yoklama').delete().eq('ogrenci_id', ogrenciId).eq('tarih', tarih)
      setYoklama(y => y.filter(x => !(x.ogrenci_id === ogrenciId && x.tarih === tarih)))
    } else {
      const { data } = await supabase.from('yoklama').upsert({
        ogrenci_id: ogrenciId, tarih, durum: siradaki, ay, yil,
      }, { onConflict: 'ogrenci_id,tarih' }).select().single()
      if (data) {
        setYoklama(y => {
          const filtered = y.filter(x => !(x.ogrenci_id === ogrenciId && x.tarih === tarih))
          return [...filtered, data]
        })
      }
    }
    setSaving(false)
  }

  async function tumSinifaIsaretle(durum: Durum) {
    if (!confirm(`Tüm öğrencileri "${durum}" olarak işaretlemek istediğinizden emin misiniz?`)) return
    setSaving(true)
    const bugun = new Date()
    const gun = bugun.getDate()
    if (bugun.getMonth() + 1 !== ay || bugun.getFullYear() !== yil) {
      alert('Toplu işaret sadece günün tarihi için yapılabilir.')
      setSaving(false)
      return
    }
    const tarih = bugun.toISOString().split('T')[0]
    const upserts = liste.map(o => ({ ogrenci_id: o.id, tarih, durum, ay, yil }))
    await supabase.from('yoklama').upsert(upserts, { onConflict: 'ogrenci_id,tarih' })
    setSaving(false)
    load()
  }

  // Devam özeti
  const devamOzet = liste.map(o => {
    const oYoklama = yoklama.filter(y => y.ogrenci_id === o.id)
    const geldi = oYoklama.filter(y => y.durum === 'geldi').length
    const gelmedi = oYoklama.filter(y => y.durum === 'gelmedi').length
    const izinli = oYoklama.filter(y => y.durum === 'izinli').length
    const isGunleri = gunler.filter(g => haftaIciMi(yil, ay, g) && !tatilMi(ay, g)).length
    return { ogrenci: o, geldi, gelmedi, izinli, isGunleri, oran: isGunleri ? Math.round(geldi / isGunleri * 100) : 0 }
  })

  return (
    <div>
      <Topbar
        title="Sınıf Defteri"
        sub={`${ayLabel(ay, yil)} — Yoklama takibi`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm no-print" onClick={() => tumSinifaIsaretle('geldi')} disabled={saving}>✅ Bugün Hepsi Geldi</button>
            <button className="btn btn-secondary btn-sm no-print" onClick={() => window.print()}>🖨️ Yazdır</button>
          </div>
        }
      />
      <div style={{ padding: 28 }}>
        <div className="alert alert-info">
          ℹ️ Bir güne tıklayarak durumu değiştirin: <strong>Boş → Geldi → Gelmedi → İzinli → Boş</strong>
          {saving && ' — Kaydediliyor...'}
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>
              📒 {AYLAR[ay]} {yil} — Yoklama Tablosu
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                <span><span className="att-day present" style={{ display: 'inline-flex', cursor: 'default' }}>✓</span> Geldi</span>
                <span><span className="att-day absent" style={{ display: 'inline-flex', cursor: 'default' }}>✗</span> Gelmedi</span>
                <span><span className="att-day excused" style={{ display: 'inline-flex', cursor: 'default' }}>İ</span> İzinli</span>
              </div>
              <select className="form-select" style={{ width: 130 }} value={sinifFiltre} onChange={e => setSinifFiltre(e.target.value)}>
                <option value="">Tüm Sınıflar</option>
                {siniflar.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 160, position: 'sticky', left: 0, background: '#f0ede4' }}>Öğrenci</th>
                  {gunler.map(g => {
                    const haftatati = !haftaIciMi(yil, ay, g)
                    const resmiTatil = tatilMi(ay, g)
                    return (
                      <th key={g} style={{
                        textAlign: 'center', padding: '6px 2px', minWidth: 30,
                        background: haftatati ? '#e8e4d9' : resmiTatil ? '#fef9e7' : '#f0ede4',
                        fontSize: 10, color: haftatati || resmiTatil ? '#a06820' : undefined,
                      }}>
                        {g}
                      </th>
                    )
                  })}
                  <th className="td-num" style={{ minWidth: 60 }}>Geldi</th>
                  <th className="td-num" style={{ minWidth: 60 }}>Gelmedi</th>
                  <th className="td-num" style={{ minWidth: 60 }}>%</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={topGun + 4} style={{ textAlign: 'center', padding: 24, color: 'var(--text3)' }}>Yükleniyor...</td></tr>
                ) : liste.length === 0 ? (
                  <tr><td colSpan={topGun + 4}>
                    <div className="empty-state"><div className="empty-icon">👨‍🎓</div><p>Öğrenci bulunamadı</p></div>
                  </td></tr>
                ) : liste.map(o => {
                  const oz = devamOzet.find(d => d.ogrenci.id === o.id)!
                  return (
                    <tr key={o.id}>
                      <td style={{ position: 'sticky', left: 0, background: 'var(--surface)', fontWeight: 500 }}>
                        {o.ad} {o.soyad}
                        {o.sinif && <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>({o.sinif})</span>}
                      </td>
                      {gunler.map(g => {
                        const haftatati = !haftaIciMi(yil, ay, g)
                        const resmiTatil = tatilMi(ay, g)
                        const durum = getDurum(o.id, g)
                        const cls = haftatati ? 'att-day weekend' : resmiTatil ? 'att-day holiday' : `att-day ${DURUM_RENK[durum]}`
                        return (
                          <td key={g} style={{ textAlign: 'center', padding: 2 }}>
                            <div
                              className={cls}
                              style={{ margin: '0 auto' }}
                              onClick={() => toggleDurum(o.id, g)}
                            >
                              {haftatati || resmiTatil ? '' : durum === 'geldi' ? '✓' : durum === 'gelmedi' ? '✗' : durum === 'izinli' ? 'İ' : ''}
                            </div>
                          </td>
                        )
                      })}
                      <td className="td-num" style={{ color: 'var(--success)', fontWeight: 600 }}>{oz.geldi}</td>
                      <td className="td-num" style={{ color: 'var(--danger)', fontWeight: 600 }}>{oz.gelmedi}</td>
                      <td className="td-num" style={{ fontWeight: 600 }}>{oz.oran}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Devam Özeti */}
        <div className="card">
          <div className="card-title">📊 Devam Özeti</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>Öğrenci</th><th>Sınıf</th><th className="td-num">İş Günü</th><th className="td-num">Geldi</th><th className="td-num">Gelmedi</th><th className="td-num">İzinli</th><th className="td-num">Devam %</th></tr>
              </thead>
              <tbody>
                {devamOzet.map(d => (
                  <tr key={d.ogrenci.id}>
                    <td><strong>{d.ogrenci.ad} {d.ogrenci.soyad}</strong></td>
                    <td>{d.ogrenci.sinif || '-'}</td>
                    <td className="td-num">{d.isGunleri}</td>
                    <td className="td-num" style={{ color: 'var(--success)', fontWeight: 600 }}>{d.geldi}</td>
                    <td className="td-num" style={{ color: 'var(--danger)' }}>{d.gelmedi}</td>
                    <td className="td-num" style={{ color: 'var(--warn)' }}>{d.izinli}</td>
                    <td className="td-num">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                        <span style={{ fontWeight: 600, color: d.oran >= 80 ? 'var(--success)' : d.oran >= 60 ? 'var(--warn)' : 'var(--danger)' }}>
                          %{d.oran}
                        </span>
                      </div>
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
