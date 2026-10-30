'use client'
import { useState } from 'react'
import { FileSignature, Printer, Save, CheckCircle2, PackageCheck, Plus, X, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { DenetimRaporu as Rapor, DenetimRaporDurum } from '@/lib/types'
import type { HesapKontrolVeri } from '@/components/DenetciHesapKontrol'
import { UST_BILGILER, EVET_HAYIR, ACIK_UCLU, KAYNAK_ETIKET, ek6OnDoldur, ek6Pdf, bosEvetHayir, type Cevaplar, type Soru } from '@/lib/ek6'
import { useYukleme } from '@/lib/useYukleme'
import { onayla } from '@/lib/diyalog'
import { hataMesaji } from '@/lib/hata'
import { AYLAR } from '@/lib/hesaplama'

type Form = Pick<Rapor, 'denetim_tarihi' | 'denetciler' | 'baskan_ad' | 'cevaplar'>
const bugun = () => new Date().toISOString().slice(0, 10)
const DURUM: Record<DenetimRaporDurum, { ad: string; sinif: string }> = {
  taslak: { ad: 'Taslak', sinif: 'badge-gray' },
  imzalandi: { ad: 'İmzalandı · okula bildirildi', sinif: 'badge-blue' },
  teslim_edildi: { ad: 'Okula teslim edildi', sinif: 'badge-green' },
}

function EvetHayir({ deger, onDegis, kilitli, etiket }: { deger: unknown; onDegis: (v: boolean) => void; kilitli: boolean; etiket: string }) {
  return (
    <div role="radiogroup" aria-label={etiket} style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
      {([true, false] as const).map(v => (
        <button key={String(v)} type="button" role="radio" aria-checked={deger === v} disabled={kilitli} onClick={() => onDegis(v)}
          className={`btn btn-sm ${deger === v ? (v ? 'btn-primary' : 'btn-danger') : 'btn-secondary'}`} style={{ minWidth: 62 }}>
          {v ? 'Evet' : 'Hayır'}
        </button>
      ))}
    </div>
  )
}

export default function DenetimRaporu({ okulId, yil, ay, hesap, denetciAd }: { okulId: number; yil: number; ay: number; hesap: HesapKontrolVeri; denetciAd: string }) {
  const [rapor, setRapor] = useState<Rapor | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [islem, setIslem] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ tip: 'ok' | 'hata' | 'bilgi'; text: string } | null>(null)

  // Hesap kontrolü bitince yükle: yeni raporda ödeme/vergi/SGK sorularının önerisi ondan gelir
  const yukle = async () => {
    if (hesap.yukleniyor) return
    setMsg(null)
    const { data, error } = await supabase.from('denetim_raporlari').select('*').eq('okul_id', okulId).eq('yil', yil).eq('ay', ay).maybeSingle()
    if (error) { setMsg({ tip: 'hata', text: 'Rapor yüklenemedi: ' + error.message + ' (Veritabanı güncellemesi yapıldı mı? migration_denetim_raporu.sql)' }); return }
    if (data) {
      setRapor(data as Rapor)
      setForm({ denetim_tarihi: data.denetim_tarihi, denetciler: data.denetciler, baskan_ad: data.baskan_ad, cevaplar: data.cevaplar })
      return
    }
    setRapor(null)
    try {
      const { cevaplar, baskanAd } = await ek6OnDoldur(okulId, yil, ay, hesap.sonuc)
      setForm({ denetim_tarihi: bugun(), denetciler: [{ ad: denetciAd, unvan: '' }], baskan_ad: baskanAd, cevaplar })
      setMsg({ tip: 'bilgi', text: 'Form sistem verisi, okulun kulüp bilgileri ve önceki raporla dolduruldu. Kontrol edip kalan soruları cevaplayın; henüz kaydedilmedi.' })
    } catch (e) {
      setMsg({ tip: 'hata', text: 'Form doldurulamadı: ' + hataMesaji(e) })
    }
  }
  useYukleme(yukle, [okulId, yil, ay, hesap.yukleniyor])

  if (!form) return <div className="dn-sayfa"><section className="yk-kart" style={{ padding: 24, color: 'var(--text3)' }}>{msg?.text || 'Rapor hazırlanıyor…'}</section></div>

  const kilitli = !!rapor && rapor.durum !== 'taslak'
  const cevapDegis = (k: string, v: Cevaplar[string]) => setForm(f => f && { ...f, cevaplar: { ...f.cevaplar, [k]: v } })
  const denetciDegis = (i: number, alan: 'ad' | 'unvan', v: string) =>
    setForm(f => f && { ...f, denetciler: f.denetciler.map((d, j) => (j === i ? { ...d, [alan]: v } : d)) })

  async function kaydet(): Promise<Rapor | null> {
    if (!form) return null
    const denetciler = form.denetciler.map(d => ({ ad: d.ad.trim(), unvan: d.unvan.trim() })).filter(d => d.ad || d.unvan)
    if (!denetciler.some(d => d.ad)) { setMsg({ tip: 'hata', text: 'Denetim yetkilisinin adını soyadını yazın.' }); return null }
    const { data, error } = await supabase.from('denetim_raporlari').upsert({
      okul_id: okulId, yil, ay, denetim_tarihi: form.denetim_tarihi, denetciler, baskan_ad: form.baskan_ad?.trim() || null,
      cevaplar: form.cevaplar, updated_at: new Date().toISOString(),
    }, { onConflict: 'okul_id,yil,ay' }).select().single()
    if (error) { setMsg({ tip: 'hata', text: 'Kaydedilemedi: ' + error.message }); return null }
    setRapor(data as Rapor)
    setForm(f => f && { ...f, denetciler })
    return data as Rapor
  }

  async function taslakKaydet() {
    setIslem('Kaydediliyor…')
    if (await kaydet()) setMsg({ tip: 'ok', text: 'Rapor taslağı kaydedildi.' })
    setIslem(null)
  }

  async function raporOlustur() {
    if (!form) return
    const bos = bosEvetHayir(form.cevaplar)
    if (bos.length && !(await onayla(`${bos.length} evet/hayır sorusu cevapsız; formda bu kutular boş basılır.\n\n${bos.slice(0, 4).map(s => `• ${s.etiket}`).join('\n')}${bos.length > 4 ? '\n…' : ''}\n\nYine de rapor oluşturulsun mu?`, { baslik: 'Cevapsız sorular var', onayMetni: 'Rapor oluştur', iptalMetni: 'Geri dön' }))) return
    setIslem('Rapor hazırlanıyor…')
    try {
      const r = kilitli ? rapor : await kaydet()
      if (r) await ek6Pdf(r)
    } catch (e) {
      setMsg({ tip: 'hata', text: 'Rapor oluşturulamadı: ' + hataMesaji(e) })
    } finally { setIslem(null) }
  }

  async function imzalandi() {
    if (!(await onayla('Rapor imzalandı olarak işaretlensin mi?\n\nOkulun paneline “Denetiminiz tamamlandı, denetim raporunuzu İl Millî Eğitim Müdürlüğünden alabilirsiniz” bildirimi gider ve rapor artık değiştirilemez.', { baslik: 'Rapor imzalandı', onayMetni: 'İmzalandı, okula bildir', iptalMetni: 'Vazgeç' }))) return
    setIslem('İşaretleniyor…')
    const r = await kaydet()
    if (r) {
      const { error } = await supabase.rpc('denetim_raporu_imzalandi', { p_rapor_id: r.id })
      if (error) setMsg({ tip: 'hata', text: 'İşaretlenemedi: ' + error.message })
      else { setMsg({ tip: 'ok', text: 'Rapor imzalandı olarak işaretlendi; okula bildirim gönderildi.' }); await yukle() }
    }
    setIslem(null)
  }

  async function teslimEdildi() {
    if (!rapor || !(await onayla('Raporun okula teslim edildiği işaretlensin mi?', { baslik: 'Okula teslim edildi', onayMetni: 'Teslim edildi', iptalMetni: 'Vazgeç' }))) return
    const { error } = await supabase.rpc('denetim_raporu_teslim', { p_rapor_id: rapor.id })
    if (error) setMsg({ tip: 'hata', text: 'İşaretlenemedi: ' + error.message })
    else { setMsg({ tip: 'ok', text: 'Rapor okula teslim edildi olarak işaretlendi.' }); await yukle() }
  }

  const kaynakIpucu = (s: Soru) => s.kaynak && !kilitli ? <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}> · {KAYNAK_ETIKET[s.kaynak]}</span> : null
  const alan = (s: Soru) => {
    const v = form.cevaplar[s.anahtar]
    if (s.tur === 'evethayir') return <EvetHayir etiket={s.etiket} deger={v} kilitli={kilitli} onDegis={x => cevapDegis(s.anahtar, x)} />
    if (s.tur === 'uzun') return <textarea className="form-input" rows={3} disabled={kilitli} value={String(v ?? '')} onChange={e => cevapDegis(s.anahtar, e.target.value)} aria-label={s.etiket} />
    return <input className="form-input" disabled={kilitli} value={String(v ?? '')} onChange={e => cevapDegis(s.anahtar, e.target.value)} aria-label={s.etiket} />
  }
  const durum = rapor ? DURUM[rapor.durum] : null

  return (
    <div className="dn-sayfa">
      <section className="yk-kart">
        <div className="yk-kart-bas" style={{ flexWrap: 'wrap', gap: 10 }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileSignature size={18} /> EK-6 Çocuk Kulübü Denetim Formu · {AYLAR[ay]} {yil}</h2>
          <div className="yk-kart-sag" style={{ flexWrap: 'wrap' }}>
            {durum ? <span className={`badge ${durum.sinif}`}>{durum.ad}</span> : <span className="badge badge-gray">Kaydedilmedi</span>}
            {!kilitli && <button type="button" className="btn btn-secondary btn-sm" onClick={taslakKaydet} disabled={!!islem}><Save size={14} /> Taslağı kaydet</button>}
            <button type="button" className="btn btn-primary btn-sm" onClick={raporOlustur} disabled={!!islem}><Printer size={14} /> Rapor oluştur (PDF)</button>
            {rapor?.durum === 'taslak' && <button type="button" className="btn btn-secondary btn-sm" onClick={imzalandi} disabled={!!islem}><CheckCircle2 size={14} /> İmzalandı</button>}
            {rapor?.durum === 'imzalandi' && <button type="button" className="btn btn-secondary btn-sm" onClick={teslimEdildi} disabled={!!islem}><PackageCheck size={14} /> Okula teslim edildi</button>}
            {!rapor && <button type="button" className="btn btn-secondary btn-icon" onClick={yukle} disabled={!!islem} aria-label="Sistemden yeniden doldur" title="Sistemden yeniden doldur"><RefreshCw size={14} /></button>}
          </div>
        </div>
        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {islem && <div className="alert alert-info">{islem}</div>}
          {msg && <div className={`alert ${msg.tip === 'ok' ? 'alert-success' : msg.tip === 'hata' ? 'alert-danger' : 'alert-info'}`}>{msg.text}</div>}
          {kilitli && rapor && (
            <div className="alert alert-info">
              Rapor {rapor.imzalandi_at ? new Date(rapor.imzalandi_at).toLocaleString('tr-TR') : ''} tarihinde imzalandı olarak işaretlendi
              {rapor.teslim_at ? `, ${new Date(rapor.teslim_at).toLocaleString('tr-TR')} tarihinde okula teslim edildi` : ''}. Değiştirilemez; yeniden yazdırabilirsiniz.
            </div>
          )}

          {/* Denetim bilgileri ve imza sahipleri (çıktıda imza satırlarının üstüne yazılır) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div>
              <label className="form-label" htmlFor="dr-tarih">Denetim tarihi</label>
              <input id="dr-tarih" type="date" className="form-input" disabled={kilitli} value={form.denetim_tarihi} onChange={e => setForm(f => f && { ...f, denetim_tarihi: e.target.value })} />
            </div>
            <div>
              <label className="form-label" htmlFor="dr-baskan">Kulüp Yönetim Kurulu Başkanı</label>
              <input id="dr-baskan" className="form-input" disabled={kilitli} value={form.baskan_ad || ''} onChange={e => setForm(f => f && { ...f, baskan_ad: e.target.value })} placeholder="Okul müdürü" />
            </div>
          </div>
          {form.denetciler.map((d, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) minmax(180px, 1fr) auto', gap: 12, alignItems: 'end' }}>
              <div>
                <label className="form-label" htmlFor={`dr-d${i}`}>Denetim yetkilisi {form.denetciler.length > 1 ? i + 1 : ''} · ad soyad</label>
                <input id={`dr-d${i}`} className="form-input" disabled={kilitli} value={d.ad} onChange={e => denetciDegis(i, 'ad', e.target.value)} />
              </div>
              <div>
                <label className="form-label" htmlFor={`dr-u${i}`}>Unvan</label>
                <input id={`dr-u${i}`} className="form-input" disabled={kilitli} value={d.unvan} onChange={e => denetciDegis(i, 'unvan', e.target.value)} placeholder="ör. Şube Müdürü" />
              </div>
              {!kilitli && (i === 0
                ? (form.denetciler.length < 2
                  ? <button type="button" className="btn btn-secondary btn-sm" onClick={() => setForm(f => f && { ...f, denetciler: [...f.denetciler, { ad: '', unvan: '' }] })}><Plus size={14} /> İkinci denetçi</button>
                  : <span />)
                : <button type="button" className="btn btn-secondary btn-icon" aria-label="İkinci denetçiyi kaldır" onClick={() => setForm(f => f && { ...f, denetciler: f.denetciler.slice(0, 1) })}><X size={14} /></button>)}
            </div>
          ))}
        </div>
      </section>

      {[{ baslik: 'Kurum ve kulüp bilgileri', sorular: UST_BILGILER }, { baslik: 'Denetim soruları', sorular: EVET_HAYIR }, { baslik: 'Görüşler', sorular: ACIK_UCLU }].map(b => (
        <section key={b.baslik} className="yk-kart">
          <div className="yk-kart-bas"><h2>{b.baslik}</h2></div>
          <div style={{ padding: '4px 18px 12px' }}>
            {b.sorular.map(s => (
              <div key={s.anahtar} style={s.tur === 'evethayir'
                ? { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '10px 0', borderTop: '1px solid var(--border-light)' }
                : { padding: '10px 0', borderTop: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: s.tur === 'evethayir' ? 0 : 6 }}>{s.etiket}{kaynakIpucu(s)}</div>
                {alan(s)}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
