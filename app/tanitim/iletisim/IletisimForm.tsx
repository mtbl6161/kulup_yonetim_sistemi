'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { uyari } from '@/lib/diyalog'

export default function IletisimForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [formData, setFormData] = useState({ name: '', email: '', institution: '', message: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.email || !formData.message) return
    setStatus('loading')
    try {
      const response = await fetch('/api/iletisim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        setStatus('success')
        setFormData({ name: '', email: '', institution: '', message: '' })
      } else {
        const errorData = await response.json().catch(() => ({}))
        uyari(errorData.error || 'Bir hata oluştu. Lütfen tekrar deneyin.')
        setStatus('error')
      }
    } catch (err) {
      console.error('Submission error:', err)
      uyari('Bağlantı hatası oluştu.')
      setStatus('error')
    }
  }

  return (
    <div className="ic-grid">
      <style>{CSS}</style>

      {/* Sol: iletişim bilgileri */}
      <dl className="ic-info">
        <div>
          <dt>Destek</dt>
          <dd><a href="mailto:destek@klup360.com">destek@klup360.com</a></dd>
        </div>
        <div>
          <dt>Genel bilgi</dt>
          <dd><a href="mailto:bilgi@klup360.com">bilgi@klup360.com</a></dd>
        </div>
        <div>
          <dt>Adres</dt>
          <dd>Teknokent Bilişim Vadisi, Ofis No: 42<br />Gebze / Kocaeli, Türkiye</dd>
        </div>
      </dl>

      {/* Sağ: form */}
      <div className="ic-formwrap">
        {status === 'success' ? (
          <div className="ic-success">
            <div className="ic-success-ico"><CheckCircle2 size={32} /></div>
            <h3>Mesajınız gönderildi</h3>
            <p>Yanıtımız yazdığınız e-posta adresine gelecek.</p>
            <button type="button" className="ic-again" onClick={() => setStatus('idle')}>Yeni mesaj yazın</button>
          </div>
        ) : (
          <>
            <h3 className="ic-form-title">Bize yazın</h3>
            <form onSubmit={handleSubmit} className="ic-form">
              <label className="ic-field">
                <span>Adınız ve soyadınız <b>*</b></span>
                <input required type="text" autoComplete="name"
                  value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </label>
              <label className="ic-field">
                <span>Kurum adı (isteğe bağlı)</span>
                <input type="text" autoComplete="organization"
                  value={formData.institution} onChange={e => setFormData({ ...formData, institution: e.target.value })} />
              </label>
              <label className="ic-field">
                <span>E-posta adresiniz <b>*</b></span>
                <input required type="email" autoComplete="email"
                  value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </label>
              <label className="ic-field">
                <span>Mesajınız <b>*</b></span>
                <textarea required rows={4} placeholder="Sorunuzu ya da isteğinizi yazın"
                  value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} />
              </label>
              <button type="submit" disabled={status === 'loading'} className="ic-submit">
                {status === 'loading' ? 'Gönderiliyor…' : 'Mesajı gönder'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

const CSS = `
.ic-grid{display:grid;grid-template-columns:1fr 1.3fr;gap:clamp(28px,5vw,64px);align-items:start;max-width:1120px}
.ic-info{margin:0;border-top:2px solid var(--tx)}
.ic-info>div{padding:16px 0;border-bottom:1px solid var(--cizgi)}
.ic-info dt{font-weight:600;color:var(--tx)}
.ic-info dd{margin:4px 0 0;color:var(--tx2);line-height:1.6}
.ic-info a{color:var(--g);text-decoration:underline;text-underline-offset:4px}
.ic-formwrap{background:var(--surf);border:1px solid var(--line);border-radius:12px;padding:clamp(24px,3vw,36px)}
.ic-form-title{font-family:var(--font-display);font-size:24px;font-weight:700;margin:0 0 22px;color:var(--tx)}
.ic-form{display:flex;flex-direction:column;gap:16px}
.ic-field{display:flex;flex-direction:column;gap:7px}
.ic-field>span{font-size:13.5px;font-weight:600;color:var(--tx2)}
.ic-field b{color:#c0392b;font-weight:600}
.ic-field input,.ic-field textarea{font:inherit;font-size:15px;padding:13px 15px;border:1px solid var(--line-2);
  border-radius:12px;background:#fcfcfa;color:var(--tx);outline:none;width:100%;resize:vertical;
  transition:border-color .15s,box-shadow .15s}
.ic-field input:focus,.ic-field textarea:focus{border-color:var(--g);box-shadow:0 0 0 3px rgba(35,71,217,.13);background:#fff}
.ic-submit{margin-top:6px;padding:15px 24px;border:none;border-radius:12px;cursor:pointer;
  background:var(--g);color:#fff;font-size:16px;font-weight:700;transition:background .15s,opacity .2s}
.ic-submit:hover{background:var(--g-d)}
.ic-submit:disabled{opacity:.7;cursor:default;transform:none}
.ic-success{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px;padding:36px 0}
.ic-success-ico{width:64px;height:64px;border-radius:50%;background:#EEF2FE;color:var(--g);display:flex;align-items:center;justify-content:center}
.ic-success h3{font-size:22px;font-weight:700;color:var(--tx);margin:6px 0 0}
.ic-success p{color:var(--tx2);font-size:15.5px;margin:0}
.ic-again{background:none;border:none;color:var(--g);font-weight:700;cursor:pointer;font-size:14px;margin-top:8px}
@media (max-width:820px){ .ic-grid{grid-template-columns:1fr} }
`
