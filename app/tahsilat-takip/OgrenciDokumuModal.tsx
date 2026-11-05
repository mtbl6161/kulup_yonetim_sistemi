'use client'
import { useMemo, useState } from 'react'
import { pdfHazirla, pdfAc } from '@/lib/pdf'
import { useYukleme } from '@/lib/useYukleme'
import { hataMesaji } from '@/lib/hata'
import { fmtTL, tarihFmt } from '@/lib/hesaplama'
import { fmtVade } from '@/lib/taksit'
import { birimKurumAdi, type Ayarlar, type Ogrenci } from '@/lib/types'
import { perdeKapat } from '@/lib/perdeKapat'
import { useAuth } from '@/lib/AuthContext'
import { Download, X, FileText, Mail, Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { overlay, bugunISO } from './yardimcilar'
import { ogrenciDokumu, type Dokum } from './ogrenciDokumu'
import { dokumBilgileri, dokumSayfasi, dokumVerisiYukle, type DokumVerisi } from './dokumPdf'

export const varsayilanEgitimYili = () => new Date().getMonth() + 1 >= 9 ? new Date().getFullYear() : new Date().getFullYear() - 1

/** Tek öğrencinin bir eğitim yılındaki tüm ödemeleri ve ödenmemiş kalemleri; tek tıkla yazdırılır */
export default function OgrenciDokumuModal({ ogrenci: o, kapat }: { ogrenci: Ogrenci; kapat: () => void }) {
  const { okul } = useAuth()
  const [egitimYili, setEgitimYili] = useState(varsayilanEgitimYili)
  const [ayarlar, setAyarlar] = useState<Ayarlar | null>(null)
  const kurumAdi = birimKurumAdi('okul', ayarlar, okul?.ad)
  const [veri, setVeri] = useState<DokumVerisi | null>(null)
  const [hata, setHata] = useState('')
  const [bugun] = useState(bugunISO)
  // Veliye e-posta: adres öğrenci kaydından gelir (veli_eposta sütunu varsa), gönderimde kayda yazılır
  const [mailAcik, setMailAcik] = useState(false)
  const [mailAdres, setMailAdres] = useState(o.veli_eposta || '')
  const [kayitliAdres, setKayitliAdres] = useState(o.veli_eposta || '')
  const [mailNot, setMailNot] = useState('')
  const [mailDurum, setMailDurum] = useState<{ tip: 'bilgi' | 'ok' | 'hata'; text: string } | null>(null)

  useYukleme(async () => {
    try {
      setVeri(null); setHata('')
      const v = await dokumVerisiYukle(egitimYili, okul?.id, o.id)
      setAyarlar(v.ayarlar)
      setVeri(v)
    } catch (err) { setHata(hataMesaji(err, 'Döküm yüklenemedi')) }
  }, [o.id, egitimYili])

  const dokum = useMemo<Dokum | null>(() => veri ? ogrenciDokumu({ ogrenci: o, ...veri, egitimYili, bugun }) : null, [veri, o, egitimYili, bugun])
  const adSoyad = `${o.ad} ${o.soyad}`
  const bilgiler = dokumBilgileri(o, egitimYili)

  async function pdfUret() {
    const { pdf, autoTable } = await pdfHazirla('portrait')
    dokumSayfasi(pdf, autoTable, { kurumAdi, ayarlar, ogrenci: o, dokum: dokum!, egitimYili, bugun })
    return pdf
  }

  async function yazdir() {
    if (!dokum) return
    pdfAc(await pdfUret(), `${adSoyad} ödeme dökümü`)
  }

  async function mailGonder() {
    const adres = mailAdres.trim()
    if (!dokum) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adres)) { setMailDurum({ tip: 'hata', text: 'Geçerli bir e-posta adresi yazın.' }); return }
    setMailDurum({ tip: 'bilgi', text: 'Gönderiliyor…' })
    try {
      const pdf = await pdfUret()
      const pdfBase64 = pdf.output('datauristring').split(',')[1]
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/ogrenci/dokum-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ email: adres, ogrenciAd: adSoyad, egitimYili: `${egitimYili}-${egitimYili + 1}`, toplamOdenen: dokum.toplamOdenen, toplamBekleyen: dokum.toplamBekleyen, not: mailNot, pdfBase64 }),
      })
      const sonuc = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(sonuc.error || 'E-posta gönderilemedi')
      // Yeni ya da değişen adres öğrenci kaydına yazılır
      let kayitNotu = ''
      if (adres !== kayitliAdres) {
        const { error } = await supabase.from('ogrenciler').update({ veli_eposta: adres }).eq('id', o.id)
        kayitNotu = error ? ' Adres öğrenci kaydına yazılamadı.' : ' Adres öğrenci kaydına da yazıldı.'
        if (!error) setKayitliAdres(adres)
      }
      setMailDurum({ tip: 'ok', text: `✅ Döküm ${adres} adresine gönderildi.${kayitNotu}` })
      setMailNot('')
    } catch (err) {
      setMailDurum({ tip: 'hata', text: '❌ ' + hataMesaji(err, 'E-posta gönderilemedi') })
    }
  }

  return (
    <div style={{ ...overlay, zIndex: 1100 }} {...perdeKapat(kapat)}>
      <div className="card" style={{ width: '100%', maxWidth: 920, maxHeight: '92vh', overflowY: 'auto', padding: '20px 22px', marginBottom: 0 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <FileText size={20} color="var(--accent)" />
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, flex: 1 }}>{adSoyad} — Ödeme Dökümü</h2>
          <select className="form-select" aria-label="Eğitim yılı" value={egitimYili} onChange={e => setEgitimYili(Number(e.target.value))} style={{ width: 'auto', minHeight: 32 }}>
            {[varsayilanEgitimYili() - 1, varsayilanEgitimYili(), varsayilanEgitimYili() + 1].map(y => <option key={y} value={y}>{y}-{y + 1}</option>)}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={() => { setMailAcik(v => !v); setMailDurum(null) }} disabled={!dokum} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Mail size={14} /> Veliye gönder</button>
          <button className="btn btn-pdf btn-sm" onClick={yazdir} disabled={!dokum} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Download size={14} /> Yazdır (PDF)</button>
          <button onClick={kapat} aria-label="Kapat" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text3)' }}><X size={20} /></button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', fontSize: 12.5, marginBottom: 14, color: 'var(--text2)' }}>
          {bilgiler.slice(1).map(([a, b]) => <span key={a}><span style={{ color: 'var(--text3)' }}>{a}:</span> <strong style={{ color: 'var(--text)' }}>{b}</strong></span>)}
        </div>
        {mailAcik && dokum && (
          <div style={{ border: '1px solid var(--border-strong)', borderRadius: 10, padding: 14, marginBottom: 16, background: 'var(--surface2)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={15} /> Dökümü veliye e-postayla gönder</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 8, maxWidth: 560 }}>
              <div>
                <label className="form-label" htmlFor="dk-eposta">Veli e-posta adresi</label>
                <input id="dk-eposta" type="email" className="form-input" placeholder="ornek@gmail.com" value={mailAdres} onChange={e => setMailAdres(e.target.value)} autoComplete="email" />
                <div style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 4 }}>
                  {kayitliAdres ? 'Öğrenci kaydındaki veli e-postası. Değiştirirseniz kayıt da güncellenir.' : 'Öğrenci kaydında veli e-postası yok. Buraya yazdığınız adres gönderimde kayda da eklenir; öğrenci formundaki "Veli E-posta" alanından da girebilirsiniz.'}
                </div>
              </div>
              <div>
                <label className="form-label" htmlFor="dk-not">Not (isteğe bağlı)</label>
                <textarea id="dk-not" className="form-input" rows={2} maxLength={1000} placeholder="Örn. Kasım ayı kulüp ücretinin ödenmesini rica ederiz." value={mailNot} onChange={e => setMailNot(e.target.value)} style={{ resize: 'vertical', minHeight: 56, paddingTop: 8 }} />
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text3)', margin: '8px 0 10px' }}>
              E-postada öğrencinin adı, toplam ödenen ({fmtTL(dokum.toplamOdenen)}) ve bekleyen ({fmtTL(dokum.toplamBekleyen)}) tutar yazar; ayrıntılı döküm PDF olarak eklenir. Veli yanıtlarsa e-posta okulun ayarlardaki adresine gelir.
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={mailGonder} disabled={mailDurum?.tip === 'bilgi'} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Send size={14} /> {mailDurum?.tip === 'bilgi' ? 'Gönderiliyor…' : 'Gönder'}</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setMailAcik(false)}>Vazgeç</button>
              {mailDurum && mailDurum.tip !== 'bilgi' && <span style={{ fontSize: 12.5, color: mailDurum.tip === 'ok' ? 'var(--success)' : 'var(--danger)' }}>{mailDurum.text}</span>}
            </div>
          </div>
        )}
        {hata ? <div className="alert alert-danger">{hata}</div> : !dokum ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Yükleniyor...</div> : (
          <>
            <h3 style={{ fontSize: 13, fontWeight: 800, margin: '4px 0 8px' }}>Yapılan ödemeler ({dokum.odemeler.length})</h3>
            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 18 }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead><tr><th>Ödeme tarihi</th><th>Nereye</th><th>Ödeme kalemi</th><th>Dönem</th><th className="td-num">Tutar</th><th>Açıklama</th></tr></thead>
                <tbody>
                  {dokum.odemeler.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text3)', padding: 18 }}>Bu eğitim yılında kayıtlı ödeme yok.</td></tr>
                    : dokum.odemeler.map((x, i) => (
                      <tr key={i}>
                        <td style={{ whiteSpace: 'nowrap' }}>{x.tarih ? tarihFmt(x.tarih) : '—'}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{x.birim}</td>
                        <td>{x.kalem}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{x.donem}</td>
                        <td className="td-num" style={{ whiteSpace: 'nowrap' }}>{x.tutar != null ? fmtTL(x.tutar) : '—'}</td>
                        <td style={{ fontSize: 12.5, color: 'var(--text2)', whiteSpace: 'normal', overflowWrap: 'anywhere', maxWidth: 260 }}>{x.aciklama || ''}</td>
                      </tr>
                    ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--surface2)' }}>
                    <td colSpan={4} style={{ textAlign: 'right', fontWeight: 800 }}>Toplam ödenen</td>
                    <td className="td-num" style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{fmtTL(dokum.toplamOdenen)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            <h3 style={{ fontSize: 13, fontWeight: 800, margin: '4px 0 8px', color: dokum.bekleyenler.length ? 'var(--danger)' : undefined }}>
              Ödenmemiş / bekleyen kalemler ({dokum.bekleyenler.length})
            </h3>
            <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead><tr><th>Nereye</th><th>Ödeme kalemi</th><th>Dönem</th><th>Vade</th><th className="td-num">Tutar</th></tr></thead>
                <tbody>
                  {dokum.bekleyenler.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text3)', padding: 18 }}>Ödenmemiş kalem yok.</td></tr>
                    : dokum.bekleyenler.map((x, i) => (
                      <tr key={i}>
                        <td style={{ whiteSpace: 'nowrap' }}>{x.birim}</td>
                        <td>{x.kalem}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{x.donem}</td>
                        <td style={{ whiteSpace: 'nowrap', color: x.gecikti ? 'var(--danger)' : undefined }}>{x.vade ? fmtVade(x.vade) : ''}</td>
                        <td className="td-num">{x.tutar != null ? fmtTL(x.tutar) : '—'}</td>
                      </tr>
                    ))}
                </tbody>
                {dokum.toplamBekleyen > 0 && (
                  <tfoot>
                    <tr style={{ background: 'var(--surface2)' }}>
                      <td colSpan={4} style={{ textAlign: 'right', fontWeight: 800 }}>Toplam bekleyen</td>
                      <td className="td-num" style={{ fontWeight: 800, color: 'var(--danger)', whiteSpace: 'nowrap' }}>{fmtTL(dokum.toplamBekleyen)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text3)', margin: '10px 0 0' }}>Okul, okul aile birliği ve kulübe yapılan tüm ödemeler birlikte listelenir. Kulübün aylık ücreti Aidat Takibi&apos;ndeki tutardır; ödenmemiş ayın tutarı Aidat Takibi&apos;ndeki gibi o ayın iş günü × günlük saat × saat ücretiyle hesaplanır.</p>
          </>
        )}
      </div>
    </div>
  )
}
