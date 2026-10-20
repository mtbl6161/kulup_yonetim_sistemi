'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Save, UserPlus, UserCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logIslem } from '@/lib/audit'
import { Personel, Ayarlar } from '@/lib/types'
import ConfirmModal from '@/components/ConfirmModal'
import SayiInput from '@/components/SayiInput'

interface Props {
  editItem: Personel | null
  ayarlar: Ayarlar | null
  profilOkulId?: number
  onClose: () => void
  onSaved: () => void
}

const GOREVLER: string[] = [
  'Öğretmen', 'Usta Öğretici', 'Koordinatör Öğretmen',
  'Muhasebe Personeli', 'Temizlik Personeli', 'Başkan', 'Başkan Yrd.', 'Denetim Yetkilisi',
]

const EMPTY: Partial<Personel> = {
  ad: '', tc: '', gorev: 'Öğretmen', email: '',
  sgk_li: false, is_retired: false, vergi_istisnasi: false, vergi_istisna_tipi: 'tam',
  istisna_gv_tutari: 0, istisna_dv_tutari: 0, iban: '', yillik_matrah: 0,
  personel_turu: 'kadrolu', koordinator_id: null, meslek_kodu: ''
}

export default function PersonelModal({ editItem, ayarlar, profilOkulId, onClose, onSaved }: Props) {
  const [form, setForm] = useState<Partial<Personel>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [koordinatorler, setKoordinatorler] = useState<{ id: number; ad: string }[]>([])
  const [matrahConfirmData, setMatrahConfirmData] = useState<{ val: number, msg: string } | null>(null)
  const [lastAskedMatrah, setLastAskedMatrah] = useState<number | null>(null)
  const overlayDown = useRef(false)

  useEffect(() => {
    if (editItem) {
      setForm({ ...editItem })
    } else {
      setForm(EMPTY)
    }
    loadKoordinatorler()
  }, [editItem])

  async function loadKoordinatorler() {
    const { data } = await supabase
      .from('personel')
      .select('id, ad')
      .eq('gorev', 'Koordinatör Öğretmen')
      .eq('aktif', true)
    setKoordinatorler(data || [])
  }

  function setF(key: keyof Personel, val: unknown) {
    setForm(f => ({ ...f, [key]: val }))
  }

  // Matrah sorusunun cevabı gelince kaydı o değerle sürdür
  function applyMatrahDeduction() {
    if (!matrahConfirmData) return
    const { val } = matrahConfirmData
    const kisiPay = ayarlar?.sgk_kisi_pay || 0.14
    const issizlikPay = ayarlar?.sgk_issizlik_kisi || 0.01

    const yeniMatrah = Math.round(val * (1 - (kisiPay + issizlikPay)) * 100) / 100
    setF('yillik_matrah', yeniMatrah)
    setLastAskedMatrah(yeniMatrah)
    setMatrahConfirmData(null)
    kaydet(yeniMatrah)
  }

  function matrahOlduguGibi() {
    if (!matrahConfirmData) return
    const { val } = matrahConfirmData
    setLastAskedMatrah(val)
    setMatrahConfirmData(null)
    kaydet(val)
  }

  async function kaydet(onayliMatrah?: number) {
    if (!form.ad?.trim()) { setMsg('❌ Adı Soyadı zorunlu!'); return }

    const tcTemiz = (form.tc || '').trim()
    if (!tcTemiz) { setMsg('❌ T.C. Kimlik No zorunlu!'); return }
    if (!/^\d{11}$/.test(tcTemiz)) { setMsg('❌ T.C. Kimlik No 11 haneli rakam olmalıdır!'); return }

    if (!form.meslek_kodu?.trim()) { setMsg('❌ Meslek Kodu zorunlu!'); return }
    if (!form.email?.trim()) { setMsg('❌ E-posta Adresi zorunlu!'); return }

    const ibanTemiz = (form.iban || '').trim().replace(/\s/g, '').toUpperCase()
    if (!ibanTemiz) { setMsg('❌ IBAN Numarası zorunlu!'); return }
    if (!ibanTemiz.startsWith('TR')) { setMsg('❌ IBAN numarası "TR" ile başlamalıdır!'); return }

    if (!form.personel_turu) { setMsg('❌ Personel Türü zorunlu!'); return }
    if (form.sgk_li === undefined || form.sgk_li === null) { setMsg('❌ SGK\'lı mı? seçimi zorunlu!'); return }
    if (form.is_retired === undefined || form.is_retired === null) { setMsg('❌ Emekli mi? seçimi zorunlu!'); return }
    if (form.vergi_istisnasi === undefined || form.vergi_istisnasi === null) { setMsg('❌ Vergi İstisnası seçimi zorunlu!'); return }
    if (form.vergi_istisnasi && form.vergi_istisna_tipi === 'tutar' && !(Number(form.istisna_gv_tutari || 0) > 0) && !(Number(form.istisna_dv_tutari || 0) > 0)) {
      setMsg('❌ Belirli tutar seçildiğinde en az bir istisna tutarı girilmelidir!'); return
    }

    const okulId = profilOkulId ?? ayarlar?.okul_id
    if (!okulId) { setMsg('❌ Okul bilgisi bulunamadı.'); return }

    // Devreden matrah değiştiyse SGK payları düşülsün mü diye sor; kayıt cevaptan sonra sürer
    const matrah = onayliMatrah ?? (Number(form.yillik_matrah) || 0)
    if (onayliMatrah === undefined && form.sgk_li && matrah > 0
        && matrah !== Number(editItem?.yillik_matrah || 0) && matrah !== lastAskedMatrah) {
      const kisiPay = ayarlar?.sgk_kisi_pay || 0.14
      const issizlikPay = ayarlar?.sgk_issizlik_kisi || 0.01
      setMatrahConfirmData({
        val: matrah,
        msg: `Girdiğiniz ₺${matrah.toLocaleString('tr-TR')} tutarından SGK Kişi Payı (%${kisiPay * 100}) ve İşsizlik Payı (%${issizlikPay * 100}) düşülsün mü?`,
      })
      return
    }

    setSaving(true)
    setMsg('')

    // TC tekrar kontrolü — aynı kişi farklı görevle ikinci kez eklenebilir
    // (örn. Koordinatör Öğretmen + Başkan Yrd.; bordroda yalnızca yüksek ücretli görev ödenir)
    let tcQuery = supabase
      .from('personel')
      .select('id, ad')
      .eq('tc', tcTemiz)
      .eq('okul_id', okulId)
      .eq('gorev', form.gorev || 'Öğretmen')
    if (editItem) tcQuery = tcQuery.neq('id', editItem.id)
    const { data: mevcut } = await tcQuery
    if (mevcut && mevcut.length > 0) {
      setMsg(`❌ Bu T.C. Kimlik No bu görevle zaten kayıtlı: ${mevcut[0].ad}`)
      setSaving(false)
      return
    }

    const data = {
      ...form,
      ad: form.ad!.trim().toUpperCase(),
      tc: tcTemiz,
      iban: ibanTemiz,
      gorev: form.gorev || 'Öğretmen',
      koordinator_id: form.koordinator_id || null,
      yillik_matrah: matrah,
      okul_id: okulId
    }

    let error
    if (editItem) {
      ;({ error } = await supabase.from('personel').update(data).eq('id', editItem.id))
    } else {
      ;({ error } = await supabase.from('personel').insert(data))
    }

    setSaving(false)
    if (error) {
      setMsg(error.code === '23505' && error.message.includes('tc')
        ? '❌ Bu T.C. Kimlik No zaten kayıtlı. Aynı kişiyi ikinci görevle eklemek için veritabanı güncellemesi (migration_personel_tc_gorev_unique.sql) gerekli.'
        : '❌ Hata: ' + error.message)
      return
    }

    logIslem({ 
      islem: editItem ? 'guncelle' : 'ekle', 
      tablo: 'personel', 
      aciklama: editItem ? `${data.ad} güncellendi` : `${data.ad} eklendi` 
    })
    
    onSaved()
  }

  return (
    <div
      className="modal-overlay"
      // Yalnızca karartılmış alana basılıp orada bırakılırsa kapat.
      // (Inputta metin seçerken fare dışarıda bırakılınca ya da onay penceresinin
      //  arka planına tıklanınca form istemeden kapanıyordu.)
      onMouseDown={e => { overlayDown.current = e.target === e.currentTarget }}
      onClick={e => { if (overlayDown.current && e.target === e.currentTarget) onClose(); overlayDown.current = false }}
    >
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
        {/* Başlık */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent-lighter)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {editItem ? <UserCircle size={24} /> : <UserPlus size={24} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                {editItem ? 'Personel Düzenle' : 'Yeni Personel Ekle'}
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text3)' }}>
                {editItem ? 'Mevcut personel bilgilerini güncelleyin' : 'Sisteme yeni bir çalışan kaydedin'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}><X size={20} /></button>
        </div>

        {/* İçerik - Scroll edilebilir alan */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: 20 }}>{msg}</div>}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Adı Soyadı <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input className="form-input" style={{ width: '100%' }} required value={form.ad || ''} onChange={e => setF('ad', e.target.value)} placeholder="Örn: AHMET YILMAZ" />
            </div>
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                T.C. Kimlik No <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input className="form-input" style={{ width: '100%' }} maxLength={11} value={form.tc || ''} onChange={e => setF('tc', e.target.value)} placeholder="11 hane" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Görevi <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select className="form-select" style={{ width: '100%' }} value={form.gorev || 'Öğretmen'} onChange={e => setF('gorev', e.target.value)}>
                {GOREVLER.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Meslek Kodu <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input className="form-input" style={{ width: '100%' }} value={form.meslek_kodu || ''} onChange={e => setF('meslek_kodu', e.target.value)} placeholder="SGK Meslek Kodu" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                E-posta Adresi <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input className="form-input" style={{ width: '100%' }} type="email" value={form.email || ''} onChange={e => setF('email', e.target.value)} placeholder="ornek@mail.com" />
            </div>
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                IBAN Numarası <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input className="form-input" style={{ width: '100%' }} value={form.iban || ''} onChange={e => setF('iban', e.target.value)} placeholder="TR..." />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Personel Türü <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select className="form-select" style={{ width: '100%' }} value={form.personel_turu || 'kadrolu'} onChange={e => setF('personel_turu', e.target.value)}>
                <option value="kadrolu">Kadrolu</option>
                <option value="sgk">SGK'lı</option>
              </select>
            </div>
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                SGK'lı mı? <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select className="form-select" style={{ width: '100%' }} value={form.sgk_li ? 'evet' : 'hayir'} onChange={e => setF('sgk_li', e.target.value === 'evet')}>
                <option value="hayir">Hayır</option>
                <option value="evet">Evet</option>
              </select>
            </div>
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Emekli mi? <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select className="form-select" style={{ width: '100%' }} value={form.is_retired ? 'evet' : 'hayir'} onChange={e => setF('is_retired', e.target.value === 'evet')}>
                <option value="hayir">Hayır</option>
                <option value="evet">Evet</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Vergi İstisnası <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select className="form-select" style={{ width: '100%' }} value={form.vergi_istisnasi ? 'evet' : 'hayir'} onChange={e => setF('vergi_istisnasi', e.target.value === 'evet')}>
                <option value="hayir">Hayır</option>
                <option value="evet">Evet</option>
              </select>
              {form.vergi_istisnasi && (
                <div style={{ marginTop: 10, padding: 12, background: '#fff8ec', border: '1px solid #f5deb3', borderRadius: 10 }}>
                  <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6, fontSize: 12 }}>İstisna Türü</label>
                  <select className="form-select" style={{ width: '100%' }} value={form.vergi_istisna_tipi || 'tam'} onChange={e => setF('vergi_istisna_tipi', e.target.value)}>
                    <option value="tam">Tam İstisna (asgari ücret)</option>
                    <option value="tutar">Belirli Tutar</option>
                  </select>
                  {form.vergi_istisna_tipi === 'tutar' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Gelir V. (₺/ay)</label>
                        <SayiInput className="form-input" style={{ width: '100%' }}
                          value={form.istisna_gv_tutari || null} onChange={v => setF('istisna_gv_tutari', v ?? 0)} placeholder="Örn: 400" />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Damga V. (₺/ay)</label>
                        <SayiInput className="form-input" style={{ width: '100%' }}
                          value={form.istisna_dv_tutari || null} onChange={v => setF('istisna_dv_tutari', v ?? 0)} placeholder="0" />
                      </div>
                      <div style={{ gridColumn: '1 / -1', fontSize: 10, color: '#666', fontStyle: 'italic', lineHeight: 1.3 }}>
                        * Girilen tutar her ay bordroda hesaplanan vergiden düşülür (hesaplanan vergiyi aşamaz).
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>Devreden Vergi Matrahı (₺)</label>
              <div style={{ fontSize: 10, color: '#666', marginBottom: 4, fontStyle: 'italic', lineHeight: 1.2 }}>
                * İçinde bulunulan ay <b>hariç</b>, yıl başından beri biriken toplamı giriniz.
              </div>
              {/* Türkçe yazım: 290.660 → 290660, 133.633,97 → 133633.97 */}
              <SayiInput
                className="form-input"
                style={{ width: '100%' }}
                placeholder="Örn: 133.633,97"
                value={Number(form.yillik_matrah) || null}
                onChange={v => setF('yillik_matrah', v ?? 0)}
              />
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Bağlı Olduğu Koordinatör</label>
            <select className="form-select" style={{ width: '100%' }} value={form.koordinator_id || ''} onChange={e => setF('koordinator_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">(Yok)</option>
              {koordinatorler.filter(p => p.id !== editItem?.id).map(p => <option key={p.id} value={p.id}>{p.ad}</option>)}
            </select>
          </div>
        </div>

        {/* Butonlar */}
        <div style={{ padding: '16px 24px', background: '#f9fafb', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: 12, flexShrink: 0 }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving} style={{ padding: '10px 20px', minWidth: 100 }}>Vazgeç</button>
          <button className="btn btn-primary" onClick={() => kaydet()} disabled={saving} style={{ padding: '10px 20px', minWidth: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {saving ? '⏳...' : (
              <>
                <Save size={18} />
                {editItem ? 'Güncelle' : 'Personeli Kaydet'}
              </>
            )}
          </button>
        </div>
      </div>

      {matrahConfirmData && (
        <ConfirmModal
          baslik="Matrah Hesaplama"
          mesaj={matrahConfirmData.msg}
          onayMetni="Evet, Payları Düş"
          iptalMetni="Olduğu Gibi Kalsın"
          tehlikeli={false}
          onOnayla={applyMatrahDeduction}
          onIptal={matrahOlduguGibi}
          onKapat={() => setMatrahConfirmData(null)}
        />
      )}

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
