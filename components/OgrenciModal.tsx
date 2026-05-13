'use client'
import { useState, useEffect } from 'react'
import { X, Save, UserPlus, GraduationCap } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logIslem } from '@/lib/audit'
import { Ogrenci, Ayarlar, Personel } from '@/lib/types'

interface Props {
  editItem: Ogrenci | null
  ayarlar: Ayarlar | null
  profilOkulId?: number
  siniflar: any[]
  ogretmenListesi: any[]
  onClose: () => void
  onSaved: () => void
}

const EMPTY: Partial<Ogrenci> = {
  ad: '', soyad: '', tc: '', sinif: '', ogretmen: '',
  kardes_indirimi: false, anne_adi: '', anne_tel: '',
  ucretsiz_mi: false, ucretsiz_nedeni: '', aktif: true,
  gunluk_saat: undefined
}

export default function OgrenciModal({ editItem, ayarlar, profilOkulId, siniflar, ogretmenListesi, onClose, onSaved }: Props) {
  const [form, setForm] = useState<Partial<Ogrenci>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (editItem) {
      setForm({ ...editItem })
    } else {
      setForm(EMPTY)
    }
  }, [editItem])

  function setF(key: keyof Ogrenci, val: unknown) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function kaydet() {
    if (!form.ad?.trim() || !form.soyad?.trim()) { setMsg('❌ Ad ve soyad zorunlu!'); return }

    const okulId = profilOkulId ?? ayarlar?.okul_id
    if (!okulId) { setMsg('❌ Okul bilgisi bulunamadı.'); return }

    setSaving(true)
    setMsg('')

    const data = {
      ...form,
      ad: form.ad!.trim().toUpperCase(),
      soyad: form.soyad!.trim().toUpperCase(),
      ogretmen: form.ogretmen || '',
      okul_id: okulId
    }

    let error
    if (editItem) {
      ;({ error } = await supabase.from('ogrenciler').update(data).eq('id', editItem.id))
    } else {
      ;({ error } = await supabase.from('ogrenciler').insert(data))
    }

    setSaving(false)
    if (error) {
      setMsg('❌ Hata: ' + error.message)
      return
    }

    const adSoyad = `${data.ad} ${data.soyad}`
    logIslem({ 
      islem: editItem ? 'guncelle' : 'ekle', 
      tablo: 'ogrenciler', 
      aciklama: editItem ? `${adSoyad} güncellendi` : `${adSoyad} eklendi` 
    })
    
    onSaved()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="personel-modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          background: 'white', 
          borderRadius: 20, 
          width: '100%', 
          maxWidth: 650, 
          maxHeight: '90vh', 
          display: 'flex', 
          flexDirection: 'column', 
          boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-lighter)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {editItem ? <GraduationCap size={24} /> : <UserPlus size={24} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                {editItem ? 'Öğrenci Düzenle' : 'Yeni Öğrenci Ekle'}
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text3)' }}>
                {editItem ? 'Mevcut öğrenci bilgilerini güncelleyin' : 'Sisteme yeni bir öğrenci kaydedin'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={20} /></button>
        </div>

        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: 20 }}>{msg}</div>}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Ad</label>
              <input className="form-input" style={{ width: '100%' }} required value={form.ad || ''} onChange={e => setF('ad', e.target.value)} placeholder="Öğrenci Adı" />
            </div>
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Soyad</label>
              <input className="form-input" style={{ width: '100%' }} required value={form.soyad || ''} onChange={e => setF('soyad', e.target.value)} placeholder="Öğrenci Soyadı" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>T.C. Kimlik No</label>
              <input className="form-input" style={{ width: '100%' }} maxLength={11} value={form.tc || ''} onChange={e => setF('tc', e.target.value)} placeholder="11 hane" />
            </div>
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Sınıf</label>
              <select className="form-select" style={{ width: '100%' }} value={form.sinif || ''} onChange={e => setF('sinif', e.target.value)}>
                <option value="">— Seçilmedi —</option>
                {siniflar.map((s, i) => <option key={i} value={s.ad}>{s.ad}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Öğretmen</label>
              <select className="form-select" style={{ width: '100%' }} value={form.ogretmen || ''} onChange={e => setF('ogretmen', e.target.value)}>
                <option value="">— Seçilmedi —</option>
                {ogretmenListesi.map((p, i) => <option key={i} value={p.ad}>{p.ad} ({p.gorev})</option>)}
              </select>
            </div>
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Kardeş İndirimi</label>
              <select className="form-select" style={{ width: '100%' }} value={form.kardes_indirimi ? 'evet' : 'hayir'} onChange={e => setF('kardes_indirimi', e.target.value === 'evet')}>
                <option value="hayir">Hayır</option>
                <option value="evet">Evet (%25)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Anne Adı</label>
              <input className="form-input" style={{ width: '100%' }} value={form.anne_adi || ''} onChange={e => setF('anne_adi', e.target.value)} />
            </div>
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Anne Telefon</label>
              <input className="form-input" style={{ width: '100%' }} value={form.anne_tel || ''} onChange={e => setF('anne_tel', e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Ücretsiz mi?</label>
              <select className="form-select" style={{ width: '100%' }} value={form.ucretsiz_mi ? 'evet' : 'hayir'} onChange={e => setF('ucretsiz_mi', e.target.value === 'evet')}>
                <option value="hayir">Hayır</option>
                <option value="evet">Evet</option>
              </select>
            </div>
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Aylık Toplam Ders Saati</label>
              <input className="form-input" style={{ width: '100%' }} type="number" step="0.5" min="0" value={form.gunluk_saat || ''} onChange={e => setF('gunluk_saat', e.target.value ? parseFloat(e.target.value) : null)} />
            </div>
          </div>

          {form.ucretsiz_mi && (
            <div style={{ marginBottom: 10 }}>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Ücretsiz Nedeni</label>
              <input className="form-input" style={{ width: '100%' }} value={form.ucretsiz_nedeni || ''} onChange={e => setF('ucretsiz_nedeni', e.target.value)} />
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', background: '#f9fafb', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: 12, flexShrink: 0 }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving} style={{ padding: '10px 20px', minWidth: 100 }}>Vazgeç</button>
          <button className="btn btn-primary" onClick={kaydet} disabled={saving} style={{ padding: '10px 20px', minWidth: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {saving ? '⏳...' : (
              <>
                <Save size={18} />
                {editItem ? 'Güncelle' : 'Öğrenciyi Kaydet'}
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.6);
          display: flex; align-items: center; justify-content: center;
          z-index: 2000; padding: 20px;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .personel-modal-content { animation: slideUp 0.3s ease; }
      `}</style>
    </div>
  )
}
