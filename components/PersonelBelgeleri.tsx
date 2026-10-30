'use client'
import { useRef, useState } from 'react'
import { FileText, Upload, Trash2, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { PersonelBelgesi } from '@/lib/types'
import { guvenliAd, boyutFmt, MAKS_DOSYA_BOYUTU } from '@/lib/denetimDosyasi'
import { useYukleme } from '@/lib/useYukleme'
import { onayla } from '@/lib/diyalog'
import { hataMesaji } from '@/lib/hata'

// Personelin işe başlama evrakları (PDF, serbest yükleme). Dosya yolu: <okul_id>/<personel_id>/<dosya>
const BUCKET = 'personel'

/** Belgeyi yeni sekmede açar (açılır pencere engelleyicisine takılmamak için sekme önce açılır) */
export async function personelBelgesiAc(b: Pick<PersonelBelgesi, 'dosya_yolu'>) {
  const w = window.open('', '_blank')
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(b.dosya_yolu, 300)
  if (error || !data) { w?.close(); throw error || new Error('Bağlantı oluşturulamadı') }
  if (w) w.location.href = data.signedUrl
  else window.location.href = data.signedUrl
}

export default function PersonelBelgeleri({ personelId, okulId, saltOkunur = false }: { personelId: number; okulId: number; saltOkunur?: boolean }) {
  const [belgeler, setBelgeler] = useState<PersonelBelgesi[]>([])
  const [ad, setAd] = useState('')
  const [islem, setIslem] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ tip: 'ok' | 'hata'; text: string } | null>(null)
  const dosyaInput = useRef<HTMLInputElement>(null)

  const yukle = async () => {
    const { data, error } = await supabase.from('personel_belgeleri').select('*').eq('personel_id', personelId).order('created_at')
    if (error) setMsg({ tip: 'hata', text: 'Belgeler yüklenemedi: ' + error.message + ' (Veritabanı güncellemesi yapıldı mı? migration_denetim_raporu.sql)' })
    setBelgeler(data || [])
  }
  useYukleme(yukle, [personelId])

  async function dosyalariYukle(dosyalar: FileList | null) {
    const liste = Array.from(dosyalar || [])
    if (!liste.length) return
    const hatali = liste.find(f => f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf'))
    if (hatali) { setMsg({ tip: 'hata', text: `“${hatali.name}” PDF değil. Yalnızca PDF yüklenebilir.` }); return }
    const buyuk = liste.find(f => f.size > MAKS_DOSYA_BOYUTU)
    if (buyuk) { setMsg({ tip: 'hata', text: `“${buyuk.name}” 10 MB’tan büyük.` }); return }
    setIslem('Yükleniyor…')
    setMsg(null)
    try {
      for (const f of liste) {
        const yol = `${okulId}/${personelId}/${Date.now()}_${guvenliAd(f.name)}`
        const up = await supabase.storage.from(BUCKET).upload(yol, f, { contentType: 'application/pdf' })
        if (up.error) throw up.error
        // Birden fazla dosyada ad alanı ortak ön ek olur; boşsa dosya adı kullanılır
        const belgeAdi = ad.trim() ? (liste.length > 1 ? `${ad.trim()} – ${f.name}` : ad.trim()) : f.name.replace(/\.pdf$/i, '')
        const ins = await supabase.from('personel_belgeleri').insert({ okul_id: okulId, personel_id: personelId, ad: belgeAdi, dosya_yolu: yol, dosya_adi: f.name, boyut: f.size })
        if (ins.error) { await supabase.storage.from(BUCKET).remove([yol]); throw ins.error }
      }
      setAd('')
      setMsg({ tip: 'ok', text: `${liste.length} belge eklendi.` })
      await yukle()
    } catch (e) {
      setMsg({ tip: 'hata', text: 'Yüklenemedi: ' + hataMesaji(e) })
    } finally {
      setIslem(null)
      if (dosyaInput.current) dosyaInput.current.value = ''
    }
  }

  async function sil(b: PersonelBelgesi) {
    if (!(await onayla(`“${b.ad}” belgesi silinsin mi? Bu işlem geri alınamaz.`, { baslik: 'Belgeyi sil', onayMetni: 'Evet, sil', tehlikeli: true }))) return
    const { error } = await supabase.from('personel_belgeleri').delete().eq('id', b.id)
    if (error) { setMsg({ tip: 'hata', text: 'Silinemedi: ' + error.message }); return }
    await supabase.storage.from(BUCKET).remove([b.dosya_yolu])
    setBelgeler(x => x.filter(y => y.id !== b.id))
  }

  async function ac(b: PersonelBelgesi) {
    try { await personelBelgesiAc(b) } catch (e) { setMsg({ tip: 'hata', text: 'Açılamadı: ' + hataMesaji(e) }) }
  }

  return (
    <div>
      {msg && <div className={`alert ${msg.tip === 'ok' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: 10, fontSize: 12.5 }}>{msg.text}</div>}
      {belgeler.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--text3)', padding: '6px 0 10px' }}>Henüz belge yüklenmedi.</div>
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
          {belgeler.map((b, i) => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderTop: i ? '1px solid var(--border-light)' : 'none' }}>
              <FileText size={16} color="var(--danger)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.ad}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>{new Date(b.created_at).toLocaleDateString('tr-TR')}{b.boyut ? ` · ${boyutFmt(b.boyut)}` : ''}</div>
              </div>
              <button type="button" className="btn btn-secondary btn-icon" onClick={() => ac(b)} aria-label={`${b.ad} belgesini aç`} title="Aç"><ExternalLink size={14} /></button>
              {!saltOkunur && <button type="button" className="btn btn-outline-danger btn-icon" onClick={() => sil(b)} aria-label={`${b.ad} belgesini sil`} title="Sil"><Trash2 size={14} /></button>}
            </div>
          ))}
        </div>
      )}
      {!saltOkunur && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="form-input" style={{ flex: 1, minWidth: 200 }} value={ad} onChange={e => setAd(e.target.value)}
            placeholder="Belge adı (ör. SGK işe giriş bildirgesi) — boşsa dosya adı" aria-label="Belge adı" />
          <input ref={dosyaInput} type="file" accept="application/pdf,.pdf" multiple style={{ display: 'none' }} onChange={e => dosyalariYukle(e.target.files)} />
          <button type="button" className="btn btn-secondary" onClick={() => dosyaInput.current?.click()} disabled={!!islem}>
            <Upload size={15} /> {islem || 'PDF yükle'}
          </button>
        </div>
      )}
    </div>
  )
}
