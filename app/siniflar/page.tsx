'use client'
import { useEffect, useState, useCallback } from 'react'
import Topbar from '@/components/Topbar'
import { supabase } from '@/lib/supabase'
import { Sinif, Personel, Ayarlar } from '@/lib/types'
import { fmtTL } from '@/lib/hesaplama'
import ConfirmModal from '@/components/ConfirmModal'
import { Pencil, Plus, Save, Loader2, Trash2, School } from 'lucide-react'

const BOŞ: Omit<Sinif, 'id' | 'created_at'> = {
  ad: '', ogretmen: '', kapasite: 15, aylik_ucret: 0,
  yas_grubu: '', aciklama: '', aktif: true,
}

export default function SiniflarPage() {
  const [siniflar, setSiniflar] = useState<Sinif[]>([])
  const [personel, setPersonel] = useState<Personel[]>([])
  const [form, setForm] = useState({ ...BOŞ })
  const [duzenle, setDuzenle] = useState<Sinif | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [ayarlar, setAyarlar] = useState<Ayarlar | null>(null)
  const [conf, setConf] = useState<{ open: boolean, id: number } | null>(null)

  const load = useCallback(async () => {
    try {
      const [{ data: sin, error: sinErr }, { data: per, error: perErr }, { data: ayr }] = await Promise.all([
        supabase.from('siniflar').select('*').order('ad'),
        supabase.from('personel').select('*').order('ad'),
        supabase.from('ayarlar').select('*').single()
      ])
      if (sinErr) throw sinErr
      if (perErr) throw perErr
      setSiniflar(sin || [])
      setPersonel(per || [])
      setAyarlar(ayr || null)
    } catch (err: any) {
      setMsg('❌ Veri yükleme hatası: ' + err.message)
    }
  }, [])

  useEffect(() => { load() }, [load])

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

  function formuDoldur(s: Sinif) {
    setDuzenle(s)
    setForm({ ad: s.ad, ogretmen: s.ogretmen || '', kapasite: s.kapasite || 15, aylik_ucret: s.aylik_ucret || 0, yas_grubu: s.yas_grubu || '', aciklama: s.aciklama || '', aktif: s.aktif })
  }

  function iptal() {
    setDuzenle(null)
    setForm({ ...BOŞ })
    setMsg('')
  }

  async function kaydet() {
    if (!form.ad.trim()) { setMsg('❌ Sınıf adı zorunlu!'); return }
    setSaving(true); setMsg('')
    const payload = { 
      ad: form.ad.trim(), 
      ogretmen: form.ogretmen || null, 
      kapasite: form.kapasite, 
      aylik_ucret: form.aylik_ucret, 
      yas_grubu: form.yas_grubu || null, 
      aciklama: form.aciklama || null, 
      aktif: form.aktif,
      okul_id: ayarlar?.okul_id
    }
    const { error } = duzenle
      ? await supabase.from('siniflar').update(payload).eq('id', duzenle.id)
      : await supabase.from('siniflar').insert(payload)
    setSaving(false)
    if (error) { setMsg('❌ ' + error.message); return }
    setMsg(duzenle ? '✅ Güncellendi!' : '✅ Sınıf eklendi!')
    setTimeout(() => setMsg(''), 2000)
    iptal()
    load()
  }

  async function sil(id: number) {
    setConf({ open: true, id })
  }

  async function silGercek(id: number) {
    setConf(null)
    await supabase.from('siniflar').delete().eq('id', id)
    load()
  }

  async function aktifDegistir(s: Sinif) {
    await supabase.from('siniflar').update({ aktif: !s.aktif }).eq('id', s.id)
    load()
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Topbar title="Sınıflar" sub={`${siniflar.filter(s => s.aktif).length} aktif sınıf`} />

      <div style={{ padding: '16px 28px' }}>
        {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: 16 }}>{msg}</div>}

        {/* Form */}
        <div className="card">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {duzenle ? (
              <>
                <Pencil size={18} style={{ color: 'var(--accent)' }} />
                <span>Sınıf Düzenle</span>
              </>
            ) : (
              <>
                <Plus size={18} style={{ color: 'var(--accent)' }} />
                <span>Yeni Sınıf Ekle</span>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 2, minWidth: 180 }}>
              <label htmlFor="sinif-ad" className="form-label">Sınıf / Kulüp Adı *</label>
              <input id="sinif-ad" className="form-input" required placeholder="Güzel Sanatlar..." value={form.ad} onChange={e => setForm(f => ({ ...f, ad: e.target.value }))} />
            </div>
            <div style={{ flex: 2, minWidth: 160 }}>
              <label htmlFor="sinif-ogretmen" className="form-label">Sorumlu Öğretmen</label>
              <select
                id="sinif-ogretmen"
                className="form-input"
                value={form.ogretmen || ''}
                onChange={e => setForm(f => ({ ...f, ogretmen: e.target.value }))}
              >
                <option value="">— Seçilmedi —</option>
                {ogretmenListesi.length === 0 ? (
                  <option disabled>Kayıtlı personel bulunamadı</option>
                ) : (
                  ogretmenListesi.map((p, i) => (
                    <option key={i} value={p.ad}>{p.ad} ({p.gorev})</option>
                  ))
                )}
              </select>
            </div>
            <div style={{ width: 110 }}>
              <label htmlFor="sinif-yas" className="form-label">Yaş Grubu</label>
              <input id="sinif-yas" className="form-input" placeholder="5-6 yaş" value={form.yas_grubu || ''} onChange={e => setForm(f => ({ ...f, yas_grubu: e.target.value }))} />
            </div>
            <div style={{ width: 100 }}>
              <label htmlFor="sinif-kapasite" className="form-label">Kapasite</label>
              <input id="sinif-kapasite" className="form-input" type="number" min="1" value={form.kapasite} onChange={e => setForm(f => ({ ...f, kapasite: parseInt(e.target.value) || 15 }))} />
            </div>
            <div style={{ width: 130 }}>
              <label htmlFor="sinif-ucret" className="form-label">Aylık Ücret (₺)</label>
              <input id="sinif-ucret" className="form-input" type="number" step="0.01" min="0" value={form.aylik_ucret} onChange={e => setForm(f => ({ ...f, aylik_ucret: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div style={{ flex: 3, minWidth: 200 }}>
              <label htmlFor="sinif-aciklama" className="form-label">Açıklama</label>
              <input id="sinif-aciklama" className="form-input" placeholder="Opsiyonel açıklama..." value={form.aciklama || ''} onChange={e => setForm(f => ({ ...f, aciklama: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
            {duzenle && <button className="btn btn-secondary" onClick={iptal}>İptal</button>}
            <button 
              className="btn btn-primary" 
              onClick={kaydet} 
              disabled={saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>İşlem Yapılıyor...</span>
                </>
              ) : duzenle ? (
                <>
                  <Save size={16} />
                  <span>Güncelle</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>Ekle</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Liste */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 600, fontSize: 15 }}>Sınıf Listesi</span>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>{siniflar.length} kayıt</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sınıf / Kulüp Adı</th>
                  <th>Sorumlu Öğretmen</th>
                  <th>Yaş Grubu</th>
                  <th className="td-num">Kapasite</th>
                  <th className="td-num">Aylık Ücret</th>
                  <th>Açıklama</th>
                  <th>Durum</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {siniflar.length === 0 ? (
                  <tr><td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>
                        <School size={48} />
                      </div>
                      <p>Henüz sınıf eklenmedi</p>
                    </div>
                  </td></tr>
                ) : siniflar.map(s => (
                  <tr key={s.id} style={{ opacity: s.aktif ? 1 : 0.55 }}>
                    <td><strong style={{ color: 'var(--accent)' }}>{s.ad}</strong></td>
                    <td>{s.ogretmen || '—'}</td>
                    <td>{s.yas_grubu || '—'}</td>
                    <td className="td-num">{s.kapasite}</td>
                    <td className="td-num">{fmtTL(s.aylik_ucret)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>{s.aciklama || '—'}</td>
                    <td>
                      <button
                        onClick={() => aktifDegistir(s)}
                        className={`badge ${s.aktif ? 'badge-green' : 'badge-gray'}`}
                        style={{ cursor: 'pointer', border: 'none' }}
                      >
                        {s.aktif ? 'Aktif' : 'Pasif'}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => formuDoldur(s)}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, padding: 0 }}
                          title="Düzenle"
                        >
                          <Pencil size={14} />
                        </button>
                        <button 
                          className="btn btn-danger btn-sm" 
                          onClick={() => sil(s.id)}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, padding: 0 }}
                          title="Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
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
          baslik="Sınıfı Sil?"
          mesaj="Bu sınıfı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
          onayMetni="Evet, Sil"
          tehlikeli={true}
          onOnayla={() => silGercek(conf.id)}
          onIptal={() => setConf(null)}
        />
      )}
    </div>
  )
}
