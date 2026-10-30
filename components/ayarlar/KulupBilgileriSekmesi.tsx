'use client'
import { useState } from 'react'
import { ClipboardCheck, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { KulupBilgileri } from '@/lib/types'
import { useYukleme } from '@/lib/useYukleme'
import { hataMesaji } from '@/lib/hata'

// Okul Ayarları › Kulüp bilgileri: EK-6 Çocuk Kulübü Denetim Formunda sistem verisinden çıkmayan sorular.
// Okul bir kez girer; denetçi raporu oluştururken bu cevaplar forma kendiliğinden gelir.
export const ETKINLIK_ALANLARI = ['Bahçe', 'Sınıf', 'Ortak oyun alanı', 'Spor salonu', 'Çok amaçlı salon', 'Yemekhane']

const bos = (okulId: number): KulupBilgileri => ({ okul_id: okulId, etkinlik_alanlari: [] })

function EvetHayir({ etiket, deger, onDegis }: { etiket: string; deger: boolean | null | undefined; onDegis: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderTop: '1px solid var(--border-light)' }}>
      <span style={{ fontSize: 13.5, color: 'var(--text)' }}>{etiket}</span>
      <div role="radiogroup" aria-label={etiket} style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {([true, false] as const).map(v => (
          <button key={String(v)} type="button" role="radio" aria-checked={deger === v} onClick={() => onDegis(v)}
            className={`btn btn-sm ${deger === v ? 'btn-primary' : 'btn-secondary'}`} style={{ minWidth: 64 }}>
            {v ? 'Evet' : 'Hayır'}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function KulupBilgileriSekmesi({ okulId }: { okulId: number | null | undefined }) {
  const [form, setForm] = useState<KulupBilgileri | null>(null)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [msg, setMsg] = useState<{ tip: 'ok' | 'hata'; text: string } | null>(null)

  useYukleme(async () => {
    if (!okulId) return
    const { data, error } = await supabase.from('kulup_bilgileri').select('*').eq('okul_id', okulId).maybeSingle()
    if (error) setMsg({ tip: 'hata', text: 'Kulüp bilgileri yüklenemedi: ' + error.message + ' (Veritabanı güncellemesi yapıldı mı? migration_denetim_raporu.sql)' })
    setForm(data ? { ...data, etkinlik_alanlari: data.etkinlik_alanlari || [] } : bos(okulId))
  }, [okulId])

  if (!okulId) return <div className="card" style={{ margin: 0 }}>Okul bilgisi bulunamadı, sayfayı yenileyin.</div>
  if (!form) return <div className="card" style={{ margin: 0, color: 'var(--text3)' }}>Yükleniyor…</div>

  const setF = <K extends keyof KulupBilgileri>(k: K, v: KulupBilgileri[K]) => setForm(f => f && { ...f, [k]: v })
  const alanDegis = (a: string) => setF('etkinlik_alanlari', form.etkinlik_alanlari.includes(a) ? form.etkinlik_alanlari.filter(x => x !== a) : [...form.etkinlik_alanlari, a])
  const metin = (v: string) => v.trim() || null

  async function kaydet() {
    if (!form) return
    setKaydediliyor(true)
    setMsg(null)
    const { error } = await supabase.from('kulup_bilgileri').upsert({
      ...form,
      kurum_kodu: metin(form.kurum_kodu || ''), web_adresi: metin(form.web_adresi || ''), ogretim_sekli: metin(form.ogretim_sekli || ''),
      acilis_onay_tarihi: form.acilis_onay_tarihi || null, acilis_onay_sayisi: metin(form.acilis_onay_sayisi || ''),
      faaliyet_turleri: metin(form.faaliyet_turleri || ''), etkinlik_alanlari_diger: metin(form.etkinlik_alanlari_diger || ''),
      guncellendi: new Date().toISOString(),
    }, { onConflict: 'okul_id' })
    setKaydediliyor(false)
    setMsg(error ? { tip: 'hata', text: 'Kaydedilemedi: ' + hataMesaji(error) } : { tip: 'ok', text: 'Kulüp bilgileri kaydedildi.' })
  }

  return (
    <div className="card" style={{ margin: 0 }}>
      <div className="card-title" style={{ marginBottom: 4 }}><ClipboardCheck size={20} color="var(--accent)" /> Kulüp bilgileri</div>
      <p style={{ fontSize: 13, color: 'var(--text3)', margin: '0 0 18px', lineHeight: 1.55 }}>
        EK-6 Çocuk Kulübü Denetim Formunda sistemden hesaplanamayan sorular. Bir kez doldurmanız yeterli; denetim yetkilisi raporu
        oluşturduğunda bu cevaplar forma kendiliğinden gelir. Kurum adı, telefon ve e-posta “Kurum bilgileri” sekmesinden,
        beslenme/yemek hizmeti “Ücret ve kesintiler” sekmesindeki yemek ayarından alınır.
      </p>
      {msg && <div className={`alert ${msg.tip === 'ok' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: 14 }}>{msg.text}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div>
          <label htmlFor="kb-kod" className="form-label">Kurum kodu</label>
          <input id="kb-kod" className="form-input" value={form.kurum_kodu || ''} onChange={e => setF('kurum_kodu', e.target.value)} />
        </div>
        <div>
          <label htmlFor="kb-web" className="form-label">Web adresi</label>
          <input id="kb-web" className="form-input" value={form.web_adresi || ''} onChange={e => setF('web_adresi', e.target.value)} placeholder="ornekanaokulu.meb.k12.tr" />
        </div>
        <div>
          <label htmlFor="kb-ogretim" className="form-label">Öğretim şekli</label>
          <select id="kb-ogretim" className="form-select" value={form.ogretim_sekli || ''} onChange={e => setF('ogretim_sekli', e.target.value)}>
            <option value="">Seçin</option>
            <option>Normal öğretim</option>
            <option>İkili öğretim</option>
          </select>
        </div>
        <div>
          <label htmlFor="kb-onay-tarih" className="form-label">Kulüp açılış onay tarihi</label>
          <input id="kb-onay-tarih" type="date" className="form-input" value={form.acilis_onay_tarihi || ''} onChange={e => setF('acilis_onay_tarihi', e.target.value)} />
        </div>
        <div>
          <label htmlFor="kb-onay-sayi" className="form-label">Açılış onay sayısı</label>
          <input id="kb-onay-sayi" className="form-input" value={form.acilis_onay_sayisi || ''} onChange={e => setF('acilis_onay_sayisi', e.target.value)} placeholder="ör. E-12345678-100-98765432" />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="kb-faaliyet" className="form-label">Kulüpte verilen faaliyet türleri</label>
          <textarea id="kb-faaliyet" className="form-input" rows={2} value={form.faaliyet_turleri || ''} onChange={e => setF('faaliyet_turleri', e.target.value)}
            placeholder="ör. Drama, resim, müzik, oyun ve fiziki etkinlikler, Türkçe dil etkinlikleri" />
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <div className="form-label" style={{ marginBottom: 8 }}>Çocuk kulübü etkinliklerinin yapıldığı alanlar</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ETKINLIK_ALANLARI.map(a => {
            const secili = form.etkinlik_alanlari.includes(a)
            return (
              <button key={a} type="button" aria-pressed={secili} onClick={() => alanDegis(a)}
                className={`btn btn-sm ${secili ? 'btn-primary' : 'btn-secondary'}`}>{a}</button>
            )
          })}
        </div>
        <input className="form-input" style={{ marginTop: 10 }} aria-label="Diğer etkinlik alanları" value={form.etkinlik_alanlari_diger || ''}
          onChange={e => setF('etkinlik_alanlari_diger', e.target.value)} placeholder="Diğer alanlar (virgülle ayırın)" />
      </div>

      <div style={{ marginTop: 20 }}>
        <div className="form-label" style={{ marginBottom: 2 }}>Kayıt formları</div>
        <EvetHayir etiket="EK-2 Çocuk Kulübü Sözleşmesi dolduruluyor mu?" deger={form.ek2_sozlesme} onDegis={v => setF('ek2_sozlesme', v)} />
        <EvetHayir etiket="EK-4 Kayıt Formu dolduruluyor mu?" deger={form.ek4_kayit} onDegis={v => setF('ek4_kayit', v)} />
        <EvetHayir etiket="EK-5 Acil Durumlarda Başvurulacak Kişiler Formu dolduruluyor mu?" deger={form.ek5_acil} onDegis={v => setF('ek5_acil', v)} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <button type="button" className="btn btn-primary" onClick={kaydet} disabled={kaydediliyor}>
          <Save size={15} /> {kaydediliyor ? 'Kaydediliyor…' : 'Kulüp bilgilerini kaydet'}
        </button>
      </div>
    </div>
  )
}
