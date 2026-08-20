'use client'

import { useState } from 'react'
import { Mail, MapPin, CheckCircle2 } from 'lucide-react'

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
        alert(errorData.error || 'Bir hata oluştu. Lütfen tekrar deneyin.')
        setStatus('error')
      }
    } catch (err) {
      console.error('Submission error:', err)
      alert('Bağlantı hatası oluştu.')
      setStatus('error')
    }
  }

  return (
    <div className="ic-grid">
      <style>{CSS}</style>

      {/* Sol: iletişim bilgileri */}
      <div className="ic-info">
        <div className="ic-card">
          <div className="ic-ico ic-ico-green"><Mail size={22} /></div>
          <div>
            <h3>E-Posta</h3>
            <p>destek@klup360.com</p>
            <p>bilgi@klup360.com</p>
          </div>
        </div>
        <div className="ic-card">
          <div className="ic-ico ic-ico-gold"><MapPin size={22} /></div>
          <div>
            <h3>Adres</h3>
            <p>Teknokent Bilişim Vadisi, Ofis No: 42<br />Gebze / Kocaeli, Türkiye</p>
          </div>
        </div>
      </div>

      {/* Sağ: form */}
      <div className="ic-formwrap">
        {status === 'success' ? (
          <div className="ic-success">
            <div className="ic-success-ico"><CheckCircle2 size={32} /></div>
            <h3>Mesajınız Gönderildi!</h3>
            <p>En kısa sürede size geri dönüş yapacağız.</p>
            <button type="button" className="ic-again" onClick={() => setStatus('idle')}>Yeni Mesaj Gönder</button>
          </div>
        ) : (
          <>
            <h3 className="ic-form-title">Mesaj Gönderin</h3>
            <form onSubmit={handleSubmit} className="ic-form">
              <label className="ic-field">
                <span>Adınız Soyadınız <b>*</b></span>
                <input required type="text" placeholder="Adınız Soyadınız"
                  value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </label>
              <label className="ic-field">
                <span>Kurum Adı (Opsiyonel)</span>
                <input type="text" placeholder="Kurumunuzun Adı"
                  value={formData.institution} onChange={e => setFormData({ ...formData, institution: e.target.value })} />
              </label>
              <label className="ic-field">
                <span>E-Posta Adresiniz <b>*</b></span>
                <input required type="email" placeholder="ornek@email.com"
                  value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </label>
              <label className="ic-field">
                <span>Mesajınız <b>*</b></span>
                <textarea required rows={4} placeholder="Size nasıl yardımcı olabiliriz?"
                  value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} />
              </label>
              <button type="submit" disabled={status === 'loading'} className="ic-submit">
                {status === 'loading' ? 'Gönderiliyor...' : 'Şimdi Gönder'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

const CSS = `
.ic-grid{display:grid;grid-template-columns:1fr 1.15fr;gap:28px;align-items:start;max-width:1000px;margin:0 auto}
.ic-info{display:flex;flex-direction:column;gap:20px}
.ic-card{background:var(--surf);border:1px solid var(--line);border-radius:18px;padding:26px;
  display:flex;align-items:flex-start;gap:18px;box-shadow:0 12px 30px -22px rgba(30,66,41,.4)}
.ic-ico{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ic-ico-green{background:#eafaf1;color:var(--g)}
.ic-ico-gold{background:#fdf3e2;color:var(--gold)}
.ic-card h3{font-size:17px;font-weight:700;color:var(--tx);margin:0 0 6px}
.ic-card p{color:var(--tx2);margin:0;font-size:15px;line-height:1.6}
.ic-formwrap{background:var(--surf);border:1px solid var(--line);border-radius:22px;padding:clamp(24px,3vw,36px);
  box-shadow:0 24px 50px -34px rgba(30,66,41,.4)}
.ic-form-title{font-family:'Playfair Display',serif;font-size:24px;font-weight:800;margin:0 0 22px;color:var(--tx)}
.ic-form{display:flex;flex-direction:column;gap:16px}
.ic-field{display:flex;flex-direction:column;gap:7px}
.ic-field>span{font-size:13.5px;font-weight:600;color:var(--tx2)}
.ic-field b{color:#c0392b;font-weight:600}
.ic-field input,.ic-field textarea{font:inherit;font-size:15px;padding:13px 15px;border:1px solid var(--line-2);
  border-radius:12px;background:#fcfcfa;color:var(--tx);outline:none;width:100%;resize:vertical;
  transition:border-color .15s,box-shadow .15s}
.ic-field input:focus,.ic-field textarea:focus{border-color:var(--g);box-shadow:0 0 0 3px rgba(45,90,61,.13);background:#fff}
.ic-submit{margin-top:6px;padding:15px 24px;border:none;border-radius:12px;cursor:pointer;
  background:linear-gradient(135deg,var(--g),var(--g-d));color:#fff;font-size:16px;font-weight:700;
  box-shadow:0 10px 24px -10px rgba(45,90,61,.6);transition:transform .2s,opacity .2s}
.ic-submit:hover{transform:translateY(-2px)}
.ic-submit:disabled{opacity:.7;cursor:default;transform:none}
.ic-success{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px;padding:36px 0}
.ic-success-ico{width:64px;height:64px;border-radius:50%;background:#eafaf1;color:var(--g);display:flex;align-items:center;justify-content:center}
.ic-success h3{font-size:22px;font-weight:800;color:var(--tx);margin:6px 0 0}
.ic-success p{color:var(--tx2);font-size:15.5px;margin:0}
.ic-again{background:none;border:none;color:var(--g);font-weight:700;cursor:pointer;font-size:14px;margin-top:8px}
@media (max-width:820px){ .ic-grid{grid-template-columns:1fr} }
`
