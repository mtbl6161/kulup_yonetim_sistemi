'use client'
import type React from 'react'
import { ShieldCheck, Info, Lock } from 'lucide-react'

// Okul Ayarları › Güvenlik: şifre değiştirme
export default function GuvenlikSekmesi({ passForm, setPassForm, passSaving, sifreGuncelle }: {
  passForm: { newP: string; confirmP: string }
  setPassForm: React.Dispatch<React.SetStateAction<{ newP: string; confirmP: string }>>
  passSaving: boolean
  sifreGuncelle: (e: React.FormEvent) => void
}) {
  return (
    <div className="card" style={{ margin: 0, maxWidth: 500 }}>
      <div className="card-title"><ShieldCheck size={20} color="var(--accent)" /> Güvenlik Ayarları</div>
      <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>Hesap güvenliğiniz için şifrenizi buradan güncelleyebilirsiniz.</p>

      <form onSubmit={sifreGuncelle} className="flex flex-col gap-5">
        <div>
          <label htmlFor="new-p" className="form-label">Yeni Şifre</label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#999' }} />
            <input 
              id="new-p"
              type="password" 
              required 
              minLength={6}
              className="form-input" 
              style={{ paddingLeft: 38 }}
              placeholder="Minimum 6 karakter"
              value={passForm.newP}
              onChange={e => setPassForm({ ...passForm, newP: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label htmlFor="confirm-p" className="form-label">Yeni Şifre (Tekrar)</label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#999' }} />
            <input 
              id="confirm-p"
              type="password" 
              required 
              minLength={6}
              className="form-input" 
              style={{ paddingLeft: 38 }}
              placeholder="Şifreyi onaylayın"
              value={passForm.confirmP}
              onChange={e => setPassForm({ ...passForm, confirmP: e.target.value })}
            />
          </div>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary" 
          style={{ marginTop: 8, height: 46 }}
          disabled={passSaving}
        >
          {passSaving ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
        </button>
      </form>

      <div style={{ marginTop: 24, padding: 16, background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 12, display: 'flex', gap: 12 }}>
        <Info size={18} color="#d97706" style={{ flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: '#92400e', margin: 0 }}>
          <b>Dikkat:</b> Şifrenizi değiştirdikten sonra tüm cihazlarınızda oturumunuz açık kalmaya devam edebilir ancak bir sonraki girişte yeni şifreniz istenecektir.
        </p>
      </div>
    </div>
  )
}
