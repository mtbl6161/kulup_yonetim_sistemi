'use client'
import { useEffect, useState } from 'react'
import Topbar from '@/components/Topbar'
import Badge from '@/components/Badge'
import { supabase } from '@/lib/supabase'
import { Ogrenci } from '@/lib/types'

const EMPTY: Partial<Ogrenci> = {
  ad: '', soyad: '', tc: '', sinif: '', ogretmen: '',
  kardes_indirimi: false, anne_adi: '', anne_tel: '',
  ucretsiz_mi: false, ucretsiz_nedeni: '', aktif: true,
}

export default function OgrencilerPage() {
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>([])
  const [personel, setPersonel] = useState<any[]>([])
  const [siniflar, setSiniflar] = useState<any[]>([])
  const [form, setForm] = useState<Partial<Ogrenci>>(EMPTY)
  const [editId, setEditId] = useState<number | null>(null)
  const [filtre, setFiltre] = useState('')
  const [sinifFiltre, setSinifFiltre] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function load() {
    setLoading(true)
    const [{ data: ogr }, { data: per }, { data: sin }] = await Promise.all([
      supabase.from('ogrenciler').select('*').order('soyad'),
      supabase.from('personel').select('*').order('ad'),
      supabase.from('siniflar').select('*').eq('aktif', true).order('ad')
    ])
    setOgrenciler(ogr || [])
    setPersonel(per || [])
    setSiniflar(sin || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Hiyerarşik Sıralama ve Filtreleme Mantığı
  const ogretmenListesi = personel
    .filter(p => {
      const g = (p.gorev || '').toLowerCase()
      // Sadece ilgili rolleri al
      return g.includes('başkan') || g.includes('öğretmen') || g.includes('usta') || g.includes('koordinatör')
    })
    .sort((a, b) => {
      const getPriority = (gorev: string = '') => {
        const g = gorev.toLowerCase()
        if (g.includes('başkan') && !g.includes('yardımcısı')) return 1
        if (g.includes('yardımcısı') || g.includes('müdür')) return 2
        if (g.includes('koordinatör')) return 3
        if (g.includes('öğretmen')) return 4
        if (g.includes('usta')) return 5
        return 6
      }
      const p1 = getPriority(a.gorev)
      const p2 = getPriority(b.gorev)
      if (p1 !== p2) return p1 - p2
      return (a.ad || '').localeCompare(b.ad || '', 'tr')
    })

  function setF(key: keyof Ogrenci, val: unknown) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function kaydet() {
    if (!form.ad?.trim() || !form.soyad?.trim()) {
      setMsg('❌ Ad ve soyad zorunlu!')
      return
    }
    setSaving(true)
    setMsg('')
    const data = {
      ...form,
      ad: form.ad!.trim().toUpperCase(),
      soyad: form.soyad!.trim().toUpperCase(),
      ogretmen: form.ogretmen || '',
    }
    let error
    if (editId) {
      ;({ error } = await supabase.from('ogrenciler').update(data).eq('id', editId))
    } else {
      ;({ error } = await supabase.from('ogrenciler').insert(data))
    }
    setSaving(false)
    if (error) { setMsg('❌ Hata: ' + error.message); return }
    setMsg('✅ Kaydedildi!')
    setTimeout(() => setMsg(''), 2000)
    temizle()
    load()
  }

  function duzenle(o: Ogrenci) {
    setEditId(o.id)
    setForm({ ...o })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function sil(id: number) {
    if (!confirm('Öğrenciyi silmek istediğinizden emin misiniz?')) return
    // aktif varsa false yap, yoksa tamamen sil
    const { error: upErr } = await supabase.from('ogrenciler').update({ aktif: false } as Record<string, unknown>).eq('id', id)
    if (upErr) await supabase.from('ogrenciler').delete().eq('id', id)
    load()
  }

  function temizle() {
    setEditId(null)
    setForm(EMPTY)
  }

  const liste = ogrenciler.filter(o => {
    const q = filtre.toLowerCase()
    const matchSearch = !q || (o.ad + ' ' + o.soyad + ' ' + (o.sinif || '')).toLowerCase().includes(q)
    const matchSinif = !sinifFiltre || o.sinif === sinifFiltre
    return matchSearch && matchSinif
  }).sort((a, b) => {
    const nameA = (a.ad + ' ' + a.soyad).toLocaleLowerCase('tr')
    const nameB = (b.ad + ' ' + b.soyad).toLocaleLowerCase('tr')
    return nameA.localeCompare(nameB, 'tr')
  })

  return (
    <div>
      <Topbar title="Öğrenci Listesi" sub="Kayıt ve yönetim" />
      <div style={{ padding: 28 }}>

        {/* Form */}
        <div className="card">
          <div className="card-title">{editId ? '✏️ Öğrenci Düzenle' : '➕ Öğrenci Ekle'}</div>
          {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`}>{msg}</div>}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <div style={{ flex: 2, minWidth: 140 }}>
              <label className="form-label">Ad</label>
              <input className="form-input" placeholder="Öğrenci adı" value={form.ad || ''} onChange={e => setF('ad', e.target.value)} />
            </div>
            <div style={{ flex: 2, minWidth: 140 }}>
              <label className="form-label">Soyad</label>
              <input className="form-input" value={form.soyad || ''} onChange={e => setF('soyad', e.target.value)} />
            </div>
            <div style={{ width: 130 }}>
              <label className="form-label">T.C. Kimlik No</label>
              <input className="form-input" maxLength={11} value={form.tc || ''} onChange={e => setF('tc', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label className="form-label">Sınıf</label>
              <select className="form-select" value={form.sinif || ''} onChange={e => setF('sinif', e.target.value)}>
                <option value="">— Seçilmedi —</option>
                {siniflar.map((s, i) => (
                  <option key={i} value={s.ad}>{s.ad}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 2, minWidth: 160 }}>
              <label className="form-label">Öğretmen</label>
              <select className="form-select" value={form.ogretmen || ''} onChange={e => setF('ogretmen', e.target.value)}>
                <option value="">— Seçilmedi —</option>
                {ogretmenListesi.map((p, i) => (
                  <option key={i} value={p.ad}>{p.ad} ({p.gorev})</option>
                ))}
              </select>
            </div>
            <div style={{ width: 140 }}>
              <label className="form-label">Kardeş İndirimi</label>
              <select className="form-select" value={form.kardes_indirimi ? 'evet' : 'hayir'} onChange={e => setF('kardes_indirimi', e.target.value === 'evet')}>
                <option value="hayir">Hayır</option>
                <option value="evet">Evet (%50)</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label className="form-label">Anne Adı</label>
              <input className="form-input" value={form.anne_adi || ''} onChange={e => setF('anne_adi', e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label className="form-label">Anne Telefon</label>
              <input className="form-input" value={form.anne_tel || ''} onChange={e => setF('anne_tel', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <div style={{ width: 130 }}>
              <label className="form-label">Ücretsiz mi?</label>
              <select className="form-select" value={form.ucretsiz_mi ? 'evet' : 'hayir'} onChange={e => setF('ucretsiz_mi', e.target.value === 'evet')}>
                <option value="hayir">Hayır</option>
                <option value="evet">Evet</option>
              </select>
            </div>
            {form.ucretsiz_mi && (
              <div style={{ flex: 2 }}>
                <label className="form-label">Ücretsiz Nedeni</label>
                <input className="form-input" value={form.ucretsiz_nedeni || ''} onChange={e => setF('ucretsiz_nedeni', e.target.value)} />
              </div>
            )}
          </div>

          <div style={{ textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {editId && (
              <button className="btn btn-secondary btn-sm" onClick={temizle}>✕ Temizle</button>
            )}
            <button className="btn btn-primary" onClick={kaydet} disabled={saving}>
              {saving ? '⏳...' : editId ? '💾 Güncelle' : '➕ Kaydet'}
            </button>
          </div>
        </div>

        {/* Liste */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>
              Öğrenci Listesi ({loading ? '...' : ogrenciler.length})
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <select
                className="form-select"
                style={{ width: 160 }}
                value={sinifFiltre}
                onChange={e => setSinifFiltre(e.target.value)}
              >
                <option value="">Tüm Sınıflar</option>
                {siniflar.map((s, i) => (
                  <option key={i} value={s.ad}>{s.ad}</option>
                ))}
              </select>
              <input
                className="form-input"
                style={{ width: 220 }}
                placeholder="🔍 Ara..."
                value={filtre}
                onChange={e => setFiltre(e.target.value)}
              />
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th><th>Ad Soyad</th><th>T.C.</th><th>Sınıf</th><th>Öğretmen</th>
                  <th>Kardeş</th><th>Ücretsiz</th><th>Anne Adı</th><th>Anne Tel</th><th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {liste.length === 0 ? (
                  <tr><td colSpan={10}>
                    <div className="empty-state">
                      <div className="empty-icon">👨‍🎓</div>
                      <p>{loading ? 'Yükleniyor...' : 'Öğrenci bulunamadı'}</p>
                    </div>
                  </td></tr>
                ) : (
                  liste.map((o, i) => (
                    <tr key={o.id}>
                      <td style={{ color: 'var(--text3)', fontSize: 12 }}>{i + 1}</td>
                      <td><strong>{o.ad} {o.soyad}</strong></td>
                      <td style={{ fontSize: 12, color: 'var(--text3)' }}>{o.tc || '-'}</td>
                      <td>{o.sinif || '-'}</td>
                      <td>{o.ogretmen || '-'}</td>
                      <td>
                        <Badge variant={o.kardes_indirimi ? 'orange' : 'gray'}>
                          {o.kardes_indirimi ? 'Evet' : 'Hayır'}
                        </Badge>
                      </td>
                      <td>
                        {o.ucretsiz_mi ? <Badge variant="blue">Ücretsiz</Badge> : '-'}
                      </td>
                      <td>{o.anne_adi || '-'}</td>
                      <td>{o.anne_tel || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => duzenle(o)}>✏️</button>
                          <button className="btn btn-danger btn-sm" onClick={() => sil(o.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
