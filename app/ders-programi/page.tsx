'use client'
import { useEffect, useState } from 'react'
import Topbar from '@/components/Topbar'
import { supabase } from '@/lib/supabase'
import { DersProgrami, Personel } from '@/lib/types'
import { GUNLER } from '@/lib/hesaplama'

const EMPTY = {
  kulup_adi: '', ogretmen_id: '', gun: '1', seans: 'sabah', saat: '', etkinlik_saati: '1',
}

export default function DersProgramiPage() {
  const [program, setProgram] = useState<DersProgrami[]>([])
  const [personel, setPersonel] = useState<Personel[]>([])
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function load() {
    const [{ data: pr }, { data: per }] = await Promise.all([
      supabase.from('ders_programi').select('*, ogretmen:personel(id,ad,gorev_kategorisi)').order('gun').order('seans'),
      supabase.from('personel').select('*').order('ad'),
    ])
    setProgram(pr || [])
    setPersonel(per || [])
  }

  useEffect(() => { load() }, [])

  async function kaydet() {
    if (!form.kulup_adi.trim()) { setMsg('❌ Kulüp adı zorunlu!'); return }
    setSaving(true)
    setMsg('')
    const { error } = await supabase.from('ders_programi').insert({
      kulup_adi: form.kulup_adi.trim(),
      ogretmen_id: form.ogretmen_id ? parseInt(form.ogretmen_id) : null,
      gun: parseInt(form.gun),
      seans: form.seans,
      saat: form.saat,
      etkinlik_saati: parseFloat(form.etkinlik_saati) || 1,
    })
    setSaving(false)
    if (error) { setMsg('❌ Hata: ' + error.message); return }
    setMsg('✅ Eklendi!')
    setTimeout(() => setMsg(''), 2000)
    setForm(EMPTY)
    load()
  }

  async function sil(id: number) {
    if (!confirm('Silmek istediğinizden emin misiniz?')) return
    await supabase.from('ders_programi').delete().eq('id', id)
    load()
  }

  const gruplu = GUNLER.reduce((acc, gun, i) => {
    acc[i + 1] = program.filter(p => p.gun === i + 1)
    return acc
  }, {} as Record<number, DersProgrami[]>)

  return (
    <div>
      <Topbar title="Ders Programı" sub="Haftalık program" />
      <div style={{ padding: 28 }}>
        <div className="card">
          <div className="card-title">📅 Ders/Etkinlik Ekle</div>
          {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`}>{msg}</div>}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <div style={{ flex: 2, minWidth: 160 }}>
              <label className="form-label">Kulüp / Etkinlik Adı</label>
              <input className="form-input" placeholder="Güzel Sanatlar, Satranç..." value={form.kulup_adi} onChange={e => setForm(f => ({ ...f, kulup_adi: e.target.value }))} />
            </div>
            <div style={{ flex: 2, minWidth: 160 }}>
              <label className="form-label">Öğretmen</label>
              <select className="form-select" value={form.ogretmen_id} onChange={e => setForm(f => ({ ...f, ogretmen_id: e.target.value }))}>
                <option value="">-- Seçin --</option>
                {personel.map(p => <option key={p.id} value={p.id}>{p.ad}</option>)}
              </select>
            </div>
            <div style={{ width: 130 }}>
              <label className="form-label">Gün</label>
              <select className="form-select" value={form.gun} onChange={e => setForm(f => ({ ...f, gun: e.target.value }))}>
                {GUNLER.map((g, i) => <option key={i + 1} value={i + 1}>{g}</option>)}
              </select>
            </div>
            <div style={{ width: 110 }}>
              <label className="form-label">Seans</label>
              <select className="form-select" value={form.seans} onChange={e => setForm(f => ({ ...f, seans: e.target.value }))}>
                <option value="sabah">Sabah</option>
                <option value="ogle">Öğle</option>
              </select>
            </div>
            <div style={{ width: 90 }}>
              <label className="form-label">Saat</label>
              <input className="form-input" placeholder="09:00" value={form.saat} onChange={e => setForm(f => ({ ...f, saat: e.target.value }))} />
            </div>
            <div style={{ width: 110 }}>
              <label className="form-label">Etkinlik Saati</label>
              <input className="form-input" type="number" step="0.5" min="0.5" value={form.etkinlik_saati} onChange={e => setForm(f => ({ ...f, etkinlik_saati: e.target.value }))} />
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <button className="btn btn-primary" onClick={kaydet} disabled={saving}>
              {saving ? '⏳...' : '➕ Ekle'}
            </button>
          </div>
        </div>

        {/* Haftalık görünüm */}
        <div className="card">
          <div className="card-title">📅 Haftalık Ders Programı</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
            {GUNLER.map((gun, i) => (
              <div key={i} style={{ background: 'var(--surface2)', borderRadius: 8, padding: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: 'var(--accent)', borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                  {gun}
                </div>
                {(gruplu[i + 1] || []).length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic', padding: '8px 0' }}>Boş</div>
                ) : (
                  (gruplu[i + 1] || []).map(p => (
                    <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', marginBottom: 6, fontSize: 12 }}>
                      <div style={{ fontWeight: 600 }}>{p.kulup_adi}</div>
                      {p.saat && <div style={{ color: 'var(--text3)' }}>🕐 {p.saat} — {p.seans}</div>}
                      {(p.ogretmen as unknown as Personel)?.ad && (
                        <div style={{ color: 'var(--text2)' }}>👩‍🏫 {(p.ogretmen as unknown as Personel).ad}</div>
                      )}
                      <div style={{ color: 'var(--accent2)', fontSize: 11 }}>{p.etkinlik_saati} saat</div>
                      <button className="btn btn-danger btn-sm" style={{ marginTop: 4, padding: '2px 6px', fontSize: 11 }} onClick={() => sil(p.id)}>🗑️</button>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Liste görünümü */}
        <div className="card">
          <div className="card-title">📋 Tüm Dersler</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>Gün</th><th>Seans</th><th>Saat</th><th>Kulüp / Etkinlik</th><th>Öğretmen</th><th className="td-num">Saat</th><th>İşlem</th></tr>
              </thead>
              <tbody>
                {program.length === 0 ? (
                  <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">📅</div><p>Ders programı boş</p></div></td></tr>
                ) : program.map(p => (
                  <tr key={p.id}>
                    <td>{GUNLER[(p.gun || 1) - 1]}</td>
                    <td><span className="badge badge-blue">{p.seans === 'sabah' ? 'Sabah' : 'Öğle'}</span></td>
                    <td>{p.saat || '-'}</td>
                    <td><strong>{p.kulup_adi}</strong></td>
                    <td>{(p.ogretmen as unknown as Personel)?.ad || '-'}</td>
                    <td className="td-num">{p.etkinlik_saati}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => sil(p.id)}>🗑️</button></td>
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
