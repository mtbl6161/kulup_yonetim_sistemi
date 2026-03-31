'use client'
import { useEffect, useState } from 'react'
import Topbar from '@/components/Topbar'
import { supabase } from '@/lib/supabase'
import { Ayarlar, VergiDilimi } from '@/lib/types'

const DEFAULT_AYARLAR: Partial<Ayarlar> = {
  kurum_adi: '',
  mudur_adi: '',
  adres: '',
  tel: '',
  email: '',
  vergi_dairesi: '',
  vergi_no: '',
  sgk_no: '',
  gosterge: 140,
  katsayi: 1.387871,
  saat_ucreti: 64.75,
  gunluk_saat: 6,
  yemek: true,
  asgari_ucret: 33030,
  sgk_kisi_pay: 0.14,
  sgk_issizlik_kisi: 0.01,
  sgk_kisa_vadeli: 0.0225,
  sgk_malulluk: 0.20,
  sgk_saglik: 0.125,
  sgk_issizlik_isveren: 0.03,
  damga_vergi_orani: 0.00759,
  vergi_dilimleri: [
    { ust: 190000, oran: 0.15 },
    { ust: 400000, oran: 0.20 },
    { ust: 1500000, oran: 0.27 },
    { ust: 5300000, oran: 0.35 },
    { ust: 30000000, oran: 0.40 },
  ],
  dagitim_temel_gider: 26,
  dagitim_ogretmen: 55,
  dagitim_baskan: 7,
  dagitim_baskan_yrd: 5,
  dagitim_muhasebe: 2,
  dagitim_temizlik: 4,
  dagitim_denetim: 1,
}

export default function AyarlarPage() {
  const [form, setForm] = useState<Partial<Ayarlar>>(DEFAULT_AYARLAR)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    supabase.from('ayarlar').select('*').single().then(({ data }) => {
      if (data) setForm(data)
    })
  }, [])

  function setF(key: keyof Ayarlar, val: unknown) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function setDilim(i: number, field: keyof VergiDilimi, val: number) {
    setForm(f => {
      const d = [...(f.vergi_dilimleri || [])]
      d[i] = { ...d[i], [field]: val }
      return { ...f, vergi_dilimleri: d }
    })
  }

  async function kaydet() {
    setSaving(true)
    setMsg(null)
    const { error } = await supabase
      .from('ayarlar')
      .upsert({ id: 1, ...form, updated_at: new Date().toISOString() })
    setSaving(false)
    if (error) {
      setMsg({ type: 'error', text: 'Kayıt hatası: ' + error.message })
    } else {
      setMsg({ type: 'success', text: '✅ Ayarlar başarıyla kaydedildi!' })
      setTimeout(() => setMsg(null), 3000)
    }
  }

  const saatUcretiHesapla = () => {
    const g = form.gosterge || 140
    const k = form.katsayi || 1.387871
    const yemek = form.yemek
    return (g * k / (yemek ? 3 : 4)).toFixed(2)
  }

  return (
    <div>
      <Topbar
        title="Kurum Ayarları"
        sub="Parametreler ve oranlar"
        actions={
          <button className="btn btn-primary no-print" onClick={kaydet} disabled={saving}>
            {saving ? '⏳ Kaydediliyor...' : '💾 Ayarları Kaydet'}
          </button>
        }
      />
      <div style={{ padding: 28 }}>
        {msg && (
          <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
            {msg.text}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Kurum Bilgileri */}
          <div className="card">
            <div className="card-title">🏫 Kurum Bilgileri</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="form-label">Kurum Adı</label>
                <input className="form-input" value={form.kurum_adi || ''} onChange={e => setF('kurum_adi', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Müdür Adı</label>
                <input className="form-input" value={form.mudur_adi || ''} onChange={e => setF('mudur_adi', e.target.value)} />
              </div>
              <div>
                <label className="form-label">Adres</label>
                <textarea className="form-input" style={{ resize: 'vertical', minHeight: 60 }} value={form.adres || ''} onChange={e => setF('adres', e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="form-label">Telefon</label>
                  <input className="form-input" value={form.tel || ''} onChange={e => setF('tel', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">E-posta</label>
                  <input className="form-input" value={form.email || ''} onChange={e => setF('email', e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="form-label">Vergi Dairesi</label>
                  <input className="form-input" value={form.vergi_dairesi || ''} onChange={e => setF('vergi_dairesi', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Vergi No</label>
                  <input className="form-input" value={form.vergi_no || ''} onChange={e => setF('vergi_no', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="form-label">SGK Sicil No</label>
                <input className="form-input" value={form.sgk_no || ''} onChange={e => setF('sgk_no', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Ücret Parametreleri */}
          <div className="card">
            <div className="card-title">💰 Ücret & Vergi Parametreleri</div>

            <div className="alert alert-info" style={{ marginBottom: 12 }}>
              ℹ️ MEB formülü: <strong>Gösterge × Katsayı / Bölen</strong><br />
              Bölen: min=6, max=4, yemekli max=3<br />
              Hesaplanan saat ücreti: <strong>₺{saatUcretiHesapla()}</strong>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label className="form-label">Gösterge</label>
                <input className="form-input" type="number" value={form.gosterge || 140} onChange={e => setF('gosterge', parseInt(e.target.value))} />
              </div>
              <div>
                <label className="form-label">Katsayı</label>
                <input className="form-input" type="number" step="0.000001" value={form.katsayi || ''} onChange={e => setF('katsayi', parseFloat(e.target.value))} />
              </div>
              <div>
                <label className="form-label">Saat Ücreti (₺) — Manuel</label>
                <input className="form-input" type="number" step="0.01" value={form.saat_ucreti || ''} onChange={e => setF('saat_ucreti', parseFloat(e.target.value))} />
              </div>
              <div>
                <label className="form-label">Günlük Sabit Saat</label>
                <input className="form-input" type="number" value={form.gunluk_saat || 6} onChange={e => setF('gunluk_saat', parseInt(e.target.value))} />
              </div>
              <div>
                <label className="form-label">Asgari Brüt Ücret (₺)</label>
                <input className="form-input" type="number" value={form.asgari_ucret || ''} onChange={e => setF('asgari_ucret', parseFloat(e.target.value))} />
              </div>
              <div>
                <label className="form-label">Yemek Hizmeti</label>
                <select className="form-select" value={form.yemek ? 'evet' : 'hayir'} onChange={e => setF('yemek', e.target.value === 'evet')}>
                  <option value="evet">Evet</option>
                  <option value="hayir">Hayır</option>
                </select>
              </div>
            </div>

            <div className="sep" />

            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>SGK Oranları (%)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label className="form-label">Kişi SGK Payı (%)</label>
                <input className="form-input" type="number" step="0.001" value={(form.sgk_kisi_pay || 0) * 100} onChange={e => setF('sgk_kisi_pay', parseFloat(e.target.value) / 100)} />
              </div>
              <div>
                <label className="form-label">Kişi İşsizlik (%)</label>
                <input className="form-input" type="number" step="0.001" value={(form.sgk_issizlik_kisi || 0) * 100} onChange={e => setF('sgk_issizlik_kisi', parseFloat(e.target.value) / 100)} />
              </div>
              <div>
                <label className="form-label">Damga Vergisi (%‰)</label>
                <input className="form-input" type="number" step="0.001" value={(form.damga_vergi_orani || 0) * 100} onChange={e => setF('damga_vergi_orani', parseFloat(e.target.value) / 100)} />
              </div>
            </div>

            <div className="sep" />
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>Gelir Vergisi Dilimleri</div>
            <table className="data-table" style={{ fontSize: 12 }}>
              <thead><tr><th>Dilim</th><th>Üst Limit (₺)</th><th>Oran (%)</th></tr></thead>
              <tbody>
                {(form.vergi_dilimleri || []).map((d, i) => (
                  <tr key={i}>
                    <td>{i + 1}. Dilim</td>
                    <td>
                      <input type="number" className="form-input" style={{ padding: '4px 6px', fontSize: 12 }}
                        value={d.ust} onChange={e => setDilim(i, 'ust', parseFloat(e.target.value))} />
                    </td>
                    <td>
                      <input type="number" className="form-input" style={{ padding: '4px 6px', fontSize: 12, width: 80 }}
                        step="0.1" value={d.oran * 100} onChange={e => setDilim(i, 'oran', parseFloat(e.target.value) / 100)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tahakkuk Dağılım Oranları */}
        <div className="card">
          <div className="card-title">📊 Tahakkuk Dağılım Oranları (%)</div>
          <div className="alert alert-warn">
            ⚠️ Toplam oranlar %100 olmalıdır. MEB Yönergesi: Temel Gider %26, Öğretmen %55, Başkan %7, Başkan Yrd. %5, Muhasebe %2, Temizlik %4, Denetim %1
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[
              { key: 'dagitim_temel_gider', label: 'Temel Gider' },
              { key: 'dagitim_ogretmen', label: 'Öğretmen Havuzu' },
              { key: 'dagitim_baskan', label: 'Başkan' },
              { key: 'dagitim_baskan_yrd', label: 'Başkan Yrd.' },
              { key: 'dagitim_muhasebe', label: 'Muhasebe' },
              { key: 'dagitim_temizlik', label: 'Temizlik' },
              { key: 'dagitim_denetim', label: 'Denetim' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="form-label">{label} (%)</label>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  value={(form as Record<string, unknown>)[key] as number || 0}
                  onChange={e => setF(key as keyof Ayarlar, parseFloat(e.target.value))}
                />
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ padding: 8, background: 'var(--surface2)', borderRadius: 6, fontSize: 13, fontWeight: 600 }}>
                Toplam: %{(
                  (form.dagitim_temel_gider || 0) +
                  (form.dagitim_ogretmen || 0) +
                  (form.dagitim_baskan || 0) +
                  (form.dagitim_baskan_yrd || 0) +
                  (form.dagitim_muhasebe || 0) +
                  (form.dagitim_temizlik || 0) +
                  (form.dagitim_denetim || 0)
                ).toFixed(0)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
