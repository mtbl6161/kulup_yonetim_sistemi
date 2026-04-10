'use client'
import { useEffect, useState } from 'react'
import Topbar from '@/components/Topbar'
import Badge from '@/components/Badge'
import { supabase } from '@/lib/supabase'
import { Personel } from '@/lib/types'

const GOREVLER: string[] = [
  'Öğretmen', 'Usta Öğretici', 'Koordinatör Öğretmen',
  'Muhasebe Personeli', 'Temizlik Personeli', 'Başkan', 'Başkan Yrd.', 'Denetim Yetkilisi',
]

const EMPTY: Partial<Personel> = {
  ad: '', tc: '', gorev: 'Öğretmen',
  sgk_li: false, vergi_istisnasi: false, iban: '', yillik_matrah: 0,
  personel_turu: 'kadrolu'
}

export default function PersonelPage() {
  const [personel, setPersonel] = useState<Personel[]>([])
  const [form, setForm] = useState<Partial<Personel>>(EMPTY)
  const [editId, setEditId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function load() {
    setLoading(true)
    // aktif kolonu migration öncesi olmayabilir; tüm personeli getir
    const { data } = await supabase.from('personel').select('*').order('ad')
    setPersonel(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function setF(key: keyof Personel, val: unknown) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function kaydet() {
    if (!form.ad?.trim()) { setMsg('❌ Ad zorunlu!'); return }
    setSaving(true)
    setMsg('')
    // DB'de hem gorev hem gorev_kategorisi tutuyoruz (migration sonrası)
    const data = {
      ...form,
      ad: form.ad!.trim().toUpperCase(),
      gorev: form.gorev || 'Öğretmen',
    }
    let error
    if (editId) {
      ;({ error } = await supabase.from('personel').update(data).eq('id', editId))
    } else {
      ;({ error } = await supabase.from('personel').insert(data))
    }
    setSaving(false)
    if (error) { setMsg('❌ Hata: ' + error.message); return }
    setMsg('✅ Kaydedildi!')
    setTimeout(() => setMsg(''), 2000)
    temizle()
    load()
  }

  function duzenle(p: Personel) {
    setEditId(p.id)
    setForm({ ...p })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function sil(id: number) {
    if (!confirm('Personeli silmek istediğinizden emin misiniz?')) return
    await supabase.from('personel').update({ aktif: false }).eq('id', id)
    load()
  }

  function temizle() {
    setEditId(null)
    setForm(EMPTY)
  }

  return (
    <div>
      <Topbar title="Personel Listesi" sub="Çalışan yönetimi" />
      <div style={{ padding: 28 }}>

        <div className="card">
          <div className="card-title">{editId ? '✏️ Personel Düzenle' : '➕ Personel Ekle'}</div>
          {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`}>{msg}</div>}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <div style={{ flex: 3, minWidth: 200 }}>
              <label className="form-label">Adı Soyadı</label>
              <input className="form-input" value={form.ad || ''} onChange={e => setF('ad', e.target.value)} />
            </div>
            <div style={{ width: 140 }}>
              <label className="form-label">T.C. Kimlik No</label>
              <input className="form-input" maxLength={11} value={form.tc || ''} onChange={e => setF('tc', e.target.value)} />
            </div>
            <div style={{ flex: 2, minWidth: 180 }}>
              <label className="form-label">Görevi</label>
              <select className="form-select" value={form.gorev || 'Öğretmen'} onChange={e => { setF('gorev', e.target.value) }}>
                {GOREVLER.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div style={{ width: 150 }}>
              <label className="form-label">Personel SGK No</label>
              <input className="form-input" value={form.sgk_no || ''} onChange={e => setF('sgk_no', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <div style={{ flex: 3, minWidth: 240 }}>
              <label className="form-label">IBAN Numarası</label>
              <input className="form-input" placeholder="TR..." value={form.iban || ''} onChange={e => setF('iban', e.target.value)} />
            </div>
            <div style={{ width: 110 }}>
              <label className="form-label">SGK'lı mı?</label>
              <select className="form-select" value={form.sgk_li ? 'evet' : 'hayir'} onChange={e => setF('sgk_li', e.target.value === 'evet')}>
                <option value="hayir">Hayır</option>
                <option value="evet">Evet</option>
              </select>
            </div>
            <div style={{ width: 130 }}>
              <label className="form-label">Vergi İstisnası</label>
              <select className="form-select" value={form.vergi_istisnasi ? 'evet' : 'hayir'} onChange={e => setF('vergi_istisnasi', e.target.value === 'evet')}>
                <option value="hayir">Hayır</option>
                <option value="evet">Evet</option>
              </select>
            </div>
            <div style={{ width: 130 }}>
              <label className="form-label">Personel Türü</label>
              <select className="form-select" value={form.personel_turu || 'kadrolu'} onChange={e => setF('personel_turu', e.target.value)}>
                <option value="kadrolu">Kadrolu</option>
                <option value="sgk">SGK'lı</option>
              </select>
            </div>
            <div style={{ width: 180 }}>
              <label className="form-label">Yıllık Vergi Matrahı (₺)</label>
              <input className="form-input" type="number" step="0.01" value={form.yillik_matrah || 0} onChange={e => setF('yillik_matrah', parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <div style={{ textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {editId && <button className="btn btn-secondary btn-sm" onClick={temizle}>✕ Temizle</button>}
            <button className="btn btn-primary" onClick={kaydet} disabled={saving}>
              {saving ? '⏳...' : editId ? '💾 Güncelle' : '➕ Kaydet'}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            Personel Listesi ({loading ? '...' : personel.length})
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th><th>Ad Soyad</th><th>T.C.</th><th>Görevi</th>
                  <th>Tür</th><th>SGK</th><th>Vergi İstisnası</th><th>IBAN</th>
                  <th className="td-num">Yıllık Matrah (₺)</th><th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const getPriority = (gorev: string = '') => {
                    const g = gorev.toLowerCase();
                    if (g.includes('başkan') && !g.includes('yardımcısı')) return 1;
                    if (g.includes('yardımcısı') || g.includes('müdür')) return 2;
                    if (g.includes('denetim')) return 3;
                    if (g.includes('koordinatör')) return 4;
                    if (g.includes('öğretmen')) return 5;
                    if (g.includes('usta')) return 6;
                    if (g.includes('muhasebe') || g.includes('memur')) return 7;
                    if (g.includes('temizlik') || g.includes('hizmet')) return 8;
                    return 9;
                  };

                  const sorted = [...personel].sort((a, b) => {
                    const p1 = getPriority(a.gorev);
                    const p2 = getPriority(b.gorev);
                    if (p1 !== p2) return p1 - p2;
                    return (a.ad || '').localeCompare(b.ad || '', 'tr');
                  });

                  return sorted.length === 0 ? (
                    <tr><td colSpan={10}>
                      <div className="empty-state">
                        <div className="empty-icon">👩‍🏫</div>
                        <p>{loading ? 'Yükleniyor...' : 'Personel bulunamadı'}</p>
                      </div>
                    </td></tr>
                  ) : (
                    sorted.map((p, i) => (
                      <tr key={p.id}>
                        <td style={{ fontSize: 12, color: 'var(--text3)' }}>{i + 1}</td>
                        <td><strong>{p.ad}</strong></td>
                        <td style={{ fontSize: 12, color: 'var(--text3)' }}>{p.tc || '-'}</td>
                        <td><span className="badge badge-blue">{p.gorev}</span></td>
                        <td><Badge variant={p.personel_turu === 'kadrolu' ? 'blue' : 'orange'}>{p.personel_turu === 'kadrolu' ? 'Kadrolu' : 'SGK'}</Badge></td>
                        <td><Badge variant={p.sgk_li ? 'green' : 'gray'}>{p.sgk_li ? 'Evet' : 'Hayır'}</Badge></td>
                        <td><Badge variant={p.vergi_istisnasi ? 'orange' : 'gray'}>{p.vergi_istisnasi ? 'Evet' : 'Hayır'}</Badge></td>
                        <td style={{ fontSize: 11, color: 'var(--text3)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.iban || '-'}
                        </td>
                        <td className="td-num">{p.yillik_matrah ? Number(p.yillik_matrah).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) : '-'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => duzenle(p)}>✏️</button>
                            <button className="btn btn-danger btn-sm" onClick={() => sil(p.id)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
