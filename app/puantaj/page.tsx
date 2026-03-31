'use client'
import { useEffect, useState, useCallback } from 'react'
import Topbar from '@/components/Topbar'
import { useAy } from '@/lib/AyContext'
import { supabase } from '@/lib/supabase'
import { ayLabel, gunSayisi, haftaIciMi, tatilMi, fmtTL, GUNLER } from '@/lib/hesaplama'
import { Personel, Puantaj, Ayarlar } from '@/lib/types'

export default function PuantajPage() {
  const { ay, yil } = useAy()
  const [personel, setPersonel] = useState<Personel[]>([])
  const [puantaj, setPuantaj] = useState<Puantaj[]>([])
  const [ayarlar, setAyarlar] = useState<Ayarlar | null>(null)
  const [personelFiltre, setPersonelFiltre] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: per }, { data: puan }, { data: ayr }] = await Promise.all([
      supabase.from('personel').select('*').order('ad'),
      // Hem ay/yil ile hem tarih aralığıyla filtrele (migration öncesi/sonrası uyumu)
      supabase.from('puantaj').select('*')
        .gte('tarih', `${yil}-${String(ay).padStart(2,'0')}-01`)
        .lte('tarih', `${yil}-${String(ay).padStart(2,'0')}-31`),
      supabase.from('ayarlar').select('*').single(),
    ])
    setPersonel(per || [])
    setPuantaj(puan || [])
    setAyarlar(ayr)
    setLoading(false)
  }, [ay, yil])

  useEffect(() => { load() }, [load])

  const topGun = gunSayisi(yil, ay)
  const gunler = Array.from({ length: topGun }, (_, i) => i + 1)

  function getSaat(personelId: number, gun: number): number {
    const tarih = `${yil}-${String(ay).padStart(2, '0')}-${String(gun).padStart(2, '0')}`
    const p = puantaj.find(p => p.personel_id === personelId && p.tarih === tarih)
    // DB'de saat kolonu var, migration sonrası etkinlik_saati de eklendi
    return p ? Number(p.etkinlik_saati ?? p.saat) : 0
  }

  async function setSaat(personelId: number, gun: number, saat: number) {
    const tarih = `${yil}-${String(ay).padStart(2, '0')}-${String(gun).padStart(2, '0')}`
    setSaving(true)
    if (saat === 0) {
      await supabase.from('puantaj').delete().eq('personel_id', personelId).eq('tarih', tarih)
      setPuantaj(p => p.filter(x => !(x.personel_id === personelId && x.tarih === tarih)))
    } else {
      const { data } = await supabase.from('puantaj').upsert({
        personel_id: personelId, tarih,
        saat: saat,           // gerçek DB kolonu
        etkinlik_saati: saat, // migration ile eklenen alias
        ay, yil,
      }, { onConflict: 'personel_id,tarih' }).select().single()
      if (data) {
        setPuantaj(p => {
          const filtered = p.filter(x => !(x.personel_id === personelId && x.tarih === tarih))
          return [...filtered, data]
        })
      }
    }
    setSaving(false)
  }

  async function otomatikDoldur() {
    if (!ayarlar) return
    if (!confirm(`${ayLabel(ay, yil)} için tüm iş günlerini ${ayarlar.gunluk_saat} saat ile doldurmak ister misiniz?`)) return
    setSaving(true)
    const upserts: { personel_id: number; tarih: string; saat: number; etkinlik_saati: number; ay: number; yil: number }[] = []
    const aktifPersonel = personelFiltre
      ? personel.filter(p => p.id === parseInt(personelFiltre))
      : personel
    for (const p of aktifPersonel) {
      for (const g of gunler) {
        if (haftaIciMi(yil, ay, g) && !tatilMi(ay, g)) {
          const tarih = `${yil}-${String(ay).padStart(2, '0')}-${String(g).padStart(2, '0')}`
          upserts.push({ personel_id: p.id, tarih, saat: ayarlar.gunluk_saat, etkinlik_saati: ayarlar.gunluk_saat, ay, yil })
        }
      }
    }
    await supabase.from('puantaj').upsert(upserts, { onConflict: 'personel_id,tarih' })
    setSaving(false)
    load()
  }

  const aktifPersonel = personelFiltre ? personel.filter(p => p.id === parseInt(personelFiltre)) : personel

  const ozet = personel.map(p => {
    const pPuan = puantaj.filter(x => x.personel_id === p.id)
    const toplamSaat = pPuan.reduce((s, x) => s + Number(x.etkinlik_saati ?? x.saat), 0)
    const calisildi = pPuan.filter(x => Number(x.etkinlik_saati ?? x.saat) > 0).length
    const brut = toplamSaat * (ayarlar?.saat_ucreti || 0)
    return { p, toplamSaat, calisildi, brut }
  })

  return (
    <div>
      <Topbar
        title="Puantaj"
        sub={`${ayLabel(ay, yil)} — Aylık çalışma saatleri`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm no-print" onClick={otomatikDoldur} disabled={saving}>
              ⚡ Otomatik Doldur
            </button>
            <button className="btn btn-secondary btn-sm no-print" onClick={() => window.print()}>🖨️ Yazdır</button>
          </div>
        }
      />
      <div style={{ padding: 28 }}>
        {saving && <div className="alert alert-info">⏳ Kaydediliyor...</div>}

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>
              🕐 {ayLabel(ay, yil)} Puantaj
            </div>
            <select
              className="form-select"
              style={{ width: 220 }}
              value={personelFiltre}
              onChange={e => setPersonelFiltre(e.target.value)}
            >
              <option value="">Tüm Personel</option>
              {personel.map(p => <option key={p.id} value={p.id}>{p.ad}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="alert alert-info">⏳ Yükleniyor...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: 180, position: 'sticky', left: 0, background: '#f0ede4' }}>Personel</th>
                    {gunler.map(g => {
                      const haftaTatil = !haftaIciMi(yil, ay, g)
                      const resmiTatil = tatilMi(ay, g)
                      const d = new Date(yil, ay - 1, g)
                      const gunAdi = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'][d.getDay() === 0 ? 6 : d.getDay() - 1]
                      return (
                        <th key={g} style={{
                          textAlign: 'center', padding: '4px 1px', minWidth: 36, fontSize: 10,
                          background: haftaTatil ? '#e8e4d9' : resmiTatil ? '#fef9e7' : '#f0ede4',
                          color: haftaTatil || resmiTatil ? '#a06820' : undefined,
                        }}>
                          {g}<br /><span style={{ fontSize: 9, opacity: 0.7 }}>{gunAdi}</span>
                        </th>
                      )
                    })}
                    <th className="td-num" style={{ minWidth: 60 }}>Top. Saat</th>
                    <th className="td-num" style={{ minWidth: 70 }}>Brüt (₺)</th>
                  </tr>
                </thead>
                <tbody>
                  {aktifPersonel.length === 0 ? (
                    <tr><td colSpan={topGun + 3}>
                      <div className="empty-state"><div className="empty-icon">👩‍🏫</div><p>Personel bulunamadı</p></div>
                    </td></tr>
                  ) : aktifPersonel.map(p => {
                    const oz = ozet.find(o => o.p.id === p.id)!
                    return (
                      <tr key={p.id}>
                        <td style={{ position: 'sticky', left: 0, background: 'var(--surface)', fontWeight: 500, fontSize: 12 }}>
                          {p.ad}
                          <span className="badge badge-blue" style={{ marginLeft: 4, fontSize: 10 }}>{(p.gorev_kategorisi || p.gorev || '').substring(0, 3)}</span>
                        </td>
                        {gunler.map(g => {
                          const haftaTatil = !haftaIciMi(yil, ay, g)
                          const resmiTatil = tatilMi(ay, g)
                          const saat = getSaat(p.id, g)
                          return (
                            <td key={g} style={{ padding: '3px 2px', textAlign: 'center', background: haftaTatil || resmiTatil ? '#f5f2e8' : undefined }}>
                              {!haftaTatil && !resmiTatil ? (
                                <input
                                  type="number"
                                  min="0"
                                  max="12"
                                  step="0.5"
                                  value={saat || ''}
                                  placeholder="0"
                                  style={{
                                    width: 34, height: 26, textAlign: 'center', fontSize: 12,
                                    border: '1px solid var(--border)', borderRadius: 4,
                                    background: saat > 0 ? '#d4edda' : 'var(--surface)',
                                    padding: '2px',
                                  }}
                                  onChange={e => setSaat(p.id, g, parseFloat(e.target.value) || 0)}
                                />
                              ) : (
                                <span style={{ fontSize: 10, color: 'var(--text3)' }}>—</span>
                              )}
                            </td>
                          )
                        })}
                        <td className="td-num" style={{ fontWeight: 700, color: 'var(--accent)' }}>{oz.toplamSaat}</td>
                        <td className="td-num" style={{ fontWeight: 600 }}>{fmtTL(oz.brut)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Özet */}
        <div className="card">
          <div className="card-title">📊 Puantaj Özeti</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>Personel</th><th>Görevi</th><th className="td-num">Çalışılan Gün</th><th className="td-num">Toplam Saat</th><th className="td-num">Brüt (₺)</th></tr>
              </thead>
              <tbody>
                {ozet.map(({ p, toplamSaat, calisildi, brut }) => (
                  <tr key={p.id}>
                    <td><strong>{p.ad}</strong></td>
                    <td><span className="badge badge-blue">{p.gorev_kategorisi}</span></td>
                    <td className="td-num">{calisildi}</td>
                    <td className="td-num" style={{ fontWeight: 600, color: 'var(--accent)' }}>{toplamSaat}</td>
                    <td className="td-num" style={{ fontWeight: 600 }}>{fmtTL(brut)}</td>
                  </tr>
                ))}
                <tr className="sum-row">
                  <td colSpan={3}>TOPLAM</td>
                  <td className="td-num">{ozet.reduce((s, o) => s + o.toplamSaat, 0)}</td>
                  <td className="td-num">{fmtTL(ozet.reduce((s, o) => s + o.brut, 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
