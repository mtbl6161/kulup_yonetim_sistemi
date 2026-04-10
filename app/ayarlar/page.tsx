'use client'
import { useEffect, useState } from 'react'
import Topbar from '@/components/Topbar'
import { supabase } from '@/lib/supabase'
import { Ayarlar, VergiDilimi, Tatil } from '@/lib/types'

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
  tavan_katsayi: 13184.78,
  gv_istisna_sabiti: 0,
  dv_istisna_sabiti: 0,
}

export default function AyarlarPage() {
  const [form, setForm] = useState<Partial<Ayarlar>>(DEFAULT_AYARLAR)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Tatil Yönetimi Durumu
  const [tatiller, setTatiller] = useState<Tatil[]>([])
  const [tatilForm, setTatilForm] = useState({ ad: '', bas: '', bit: '', tip: 'ozel' })
  const [tatilSaving, setTatilSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('ayarlar').select('*').single(),
      supabase.from('tatiller').select('*').order('baslangic_tarihi', { ascending: true })
    ]).then(([{ data: ayar }, { data: tat }]) => {
      if (ayar) setForm(ayar)
      if (tat) setTatiller(tat)
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

  // ============================================================
  // Tatil İşlemleri
  // ============================================================
  async function tatilEkle() {
    if (!tatilForm.ad || !tatilForm.bas || !tatilForm.bit) {
      alert('Lütfen tüm alanları doldurun')
      return
    }
    setTatilSaving(true)
    const { data, error } = await supabase.from('tatiller').insert({
      ad: tatilForm.ad,
      baslangic_tarihi: tatilForm.bas,
      bitis_tarihi: tatilForm.bit,
      tip: tatilForm.tip
    }).select().single()

    if (error) alert('Hata: ' + error.message)
    else {
      setTatiller(t => [...t, data].sort((a, b) => a.baslangic_tarihi.localeCompare(b.baslangic_tarihi)))
      setTatilForm({ ad: '', bas: '', bit: '', tip: 'ozel' })
    }
    setTatilSaving(false)
  }

  async function tatilSil(id: number) {
    if (!confirm('Bu tatili silmek istediğinize emin misiniz?')) return
    const { error } = await supabase.from('tatiller').delete().eq('id', id)
    if (!error) setTatiller(t => t.filter(x => x.id !== id))
  }

  async function tatilSihirbazı2026() {
    if (!confirm('2026 yılı resmi tatilleri otomatik olarak eklenecek. Devam edilsin mi?')) return
    setTatilSaving(true)
    const resmiTatiller = [
      { ad: 'Yılbaşı', bas: '2026-01-01', bit: '2026-01-01', tip: 'resmi' },
      { ad: '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı', bas: '2026-04-23', bit: '2026-04-23', tip: 'resmi' },
      { ad: '1 Mayıs Emek ve Dayanışma Günü', bas: '2026-05-01', bit: '2026-05-01', tip: 'resmi' },
      { ad: '19 Mayıs Atatürk\'ü Anma, Gençlik ve Spor Bayramı', bas: '2026-05-19', bit: '2026-05-19', tip: 'resmi' },
      { ad: '15 Temmuz Demokrasi ve Milli Birlik Günü', bas: '2026-07-15', bit: '2026-07-15', tip: 'resmi' },
      { ad: '30 Ağustos Zafer Bayramı', bas: '2026-08-30', bit: '2026-08-30', tip: 'resmi' },
      { ad: '29 Ekim Cumhuriyet Bayramı', bas: '2026-10-29', bit: '2026-10-29', tip: 'resmi' },
      // Dini Bayramlar (Tahmini 2026)
      { ad: 'Ramazan Bayramı 1. Gün', bas: '2026-03-20', bit: '2026-03-20', tip: 'resmi' },
      { ad: 'Ramazan Bayramı 2. Gün', bas: '2026-03-21', bit: '2026-03-21', tip: 'resmi' },
      { ad: 'Ramazan Bayramı 3. Gün', bas: '2026-03-22', bit: '2026-03-22', tip: 'resmi' },
      { ad: 'Kurban Bayramı 1. Gün', bas: '2026-05-27', bit: '2026-05-27', tip: 'resmi' },
      { ad: 'Kurban Bayramı 2. Gün', bas: '2026-05-28', bit: '2026-05-28', tip: 'resmi' },
      { ad: 'Kurban Bayramı 3. Gün', bas: '2026-05-29', bit: '2026-05-29', tip: 'resmi' },
      { ad: 'Kurban Bayramı 4. Gün', bas: '2026-05-30', bit: '2026-05-30', tip: 'resmi' },
    ]

    const upserts = resmiTatiller.map(t => ({
      ad: t.ad,
      baslangic_tarihi: t.bas,
      bitis_tarihi: t.bit,
      tip: t.tip
    }))

    const { error } = await supabase.from('tatiller').upsert(upserts, { onConflict: 'ad,baslangic_tarihi' })
    if (error) alert('Sihirbaz hatası: ' + error.message)
    else {
      const { data } = await supabase.from('tatiller').select('*').order('baslangic_tarihi')
      setTatiller(data || [])
      alert('Sihirbaz: 2026 Resmi tatilleri başarıyla eklendi!')
    }
    setTatilSaving(false)
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
                <label className="form-label">Müdür Adı / Onaylayan</label>
                <input className="form-input" value={form.mudur_adi || ''} onChange={e => setF('mudur_adi', e.target.value)} placeholder="Örn: Ahmet Yılmaz" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="form-label">Hazırlayan / Düzenleyen</label>
                  <input className="form-input" value={form.duzenleyen_adi || ''} onChange={e => setF('duzenleyen_adi', e.target.value)} placeholder="Örn: Ayşe Demir" />
                </div>
                <div>
                  <label className="form-label">Düzenleyen Unvanı</label>
                  <input className="form-input" value={form.duzenleyen_unvani || ''} onChange={e => setF('duzenleyen_unvani', e.target.value)} placeholder="Örn: Muhasebe Sorumlusu" />
                </div>
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
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                <div>
                  <label className="form-label">SGK Sicil No</label>
                  <input className="form-input" value={form.sgk_no || ''} onChange={e => setF('sgk_no', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">SSK Şube</label>
                  <input className="form-input" value={form.ssk_sube || ''} onChange={e => setF('ssk_sube', e.target.value)} placeholder="Örn: Manisa" />
                </div>
              </div>
              <div>
                <label className="form-label">Dijital İmza / Kaşe Görsel URL</label>
                <input className="form-input" value={form.imza_url || ''} onChange={e => setF('imza_url', e.target.value)} placeholder="https://.../imza.png" />
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Bordro zarflarında otomatik görünür.</div>
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
                <label className="form-label">E.Y.D.M. Brüt Aylığı (₺)</label>
                <input className="form-input" type="number" step="0.01" value={form.tavan_katsayi || ''} onChange={e => setF('tavan_katsayi', parseFloat(e.target.value))} />
              </div>
              <div>
                <label className="form-label">GV İstisna Tutarı (Sabit ₺)</label>
                <input className="form-input" type="number" step="0.01" value={form.gv_istisna_sabiti || ''} onChange={e => setF('gv_istisna_sabiti', parseFloat(e.target.value))} />
              </div>
              <div>
                <label className="form-label">DV İstisna Tutarı (Sabit ₺)</label>
                <input className="form-input" type="number" step="0.01" value={form.dv_istisna_sabiti || ''} onChange={e => setF('dv_istisna_sabiti', parseFloat(e.target.value))} />
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

        {/* Dinamik Tatil Yönetimi */}
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>📅 Tatil Yönetimi & Takvimi</div>
            <button className="btn btn-secondary btn-sm" onClick={tatilSihirbazı2026} disabled={tatilSaving}>
              ⚡ 2026 Resmi Tatilleri Yükle
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: 24 }}>
            {/* Yeni Tatil Ekleme Formu */}
            <div style={{ background: 'var(--surface2)', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>Yeni Tatil Ekle</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label className="form-label">Tatil Adı</label>
                  <input className="form-input form-input-sm" placeholder="Örn: Ara Tatil" value={tatilForm.ad} onChange={e => setTatilForm({ ...tatilForm, ad: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label className="form-label">Başlangıç</label>
                    <input className="form-input form-input-sm" type="date" value={tatilForm.bas} onChange={e => setTatilForm({ ...tatilForm, bas: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label">Bitiş</label>
                    <input className="form-input form-input-sm" type="date" value={tatilForm.bit} onChange={e => setTatilForm({ ...tatilForm, bit: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Tür</label>
                  <select className="form-select form-input-sm" value={tatilForm.tip} onChange={e => setTatilForm({ ...tatilForm, tip: e.target.value })}>
                    <option value="resmi">Resmi Tatil</option>
                    <option value="idari">İdari İzin</option>
                    <option value="ozel">Özel Tatil / Ara Tatil</option>
                  </select>
                </div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={tatilEkle} disabled={tatilSaving}>
                  {tatilSaving ? '⏳...' : '➕ Tatil Kaydet'}
                </button>
              </div>
            </div>

            {/* Tatil Listesi */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Kayıtlı Tatil Günleri</div>
              {tatiller.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: 'var(--text3)', border: '1px dashed var(--border)', borderRadius: 8 }}>
                  Henüz kayıtlı tatil bulunmuyor.
                </div>
              ) : (
                <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <table className="data-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Tatil Adı</th><th>Başlangıç</th><th>Bitiş</th><th>Tür</th><th>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tatiller.map(t => (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 600, fontSize: 12 }}>{t.ad}</td>
                          <td style={{ fontSize: 11 }}>{new Date(t.baslangic_tarihi).toLocaleDateString('tr-TR')}</td>
                          <td style={{ fontSize: 11 }}>{new Date(t.bitis_tarihi).toLocaleDateString('tr-TR')}</td>
                          <td>
                            <span className={`badge ${t.tip === 'resmi' ? 'badge-blue' : t.tip === 'idari' ? 'badge-yellow' : 'badge-purple'}`} style={{ fontSize: 10 }}>
                              {t.tip}
                            </span>
                          </td>
                          <td>
                            <button className="btn btn-danger btn-sm" style={{ padding: '2px 6px' }} onClick={() => tatilSil(t.id)}>🗑️</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
