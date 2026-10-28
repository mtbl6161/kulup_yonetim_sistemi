'use client'
import { useCallback, useState } from 'react'
import { Plus } from 'lucide-react'
import { onayla } from '@/lib/diyalog'
import { useYukleme } from '@/lib/useYukleme'
import type { Ortak } from './YonetimKonsolu'
import { Bos, Filtre, Pencere, goreceZaman, tarih } from './ortak'
import type { TalepSatir } from './ortak'
import { SifreSifirla } from './Kurumlar'

interface Denetci { id: string; il_id: number | null; created_at: string; email?: string; son_giris?: string | null; iller?: { id: number; ad: string } | null }
type Gorunum = 'beklemede' | 'onaylandi' | 'reddedildi' | 'hesaplar'

export default function Denetciler({ api, bildir, iller, talepler, yenile }: Ortak & { talepler: TalepSatir[]; yenile: () => Promise<void> }) {
  const [simdi] = useState(() => Date.now())
  const [gorunum, setGorunum] = useState<Gorunum>('beklemede')
  const [denetciler, setDenetciler] = useState<Denetci[] | null>(null)
  const [isleniyor, setIsleniyor] = useState<number | null>(null)
  const [ekleAcik, setEkleAcik] = useState(false)
  const [sifreKisi, setSifreKisi] = useState<Denetci | null>(null)
  // E-posta gönderilemezse geçici şifre bir kez gösterilir
  const [elden, setElden] = useState<{ email: string; password: string } | null>(null)

  const denetcileriYukle = useCallback(async () => {
    const r = await api<{ kullanicilar: Denetci[] }>('/api/admin/denetim-kullanici')
    setDenetciler(r.veri?.kullanicilar || [])
  }, [api])
  useYukleme(denetcileriYukle)

  const ilAdi = (t: TalepSatir) => t.iller?.ad || iller.find(i => i.id === t.il_id)?.ad || '—'
  const ildekiDenetci = (ilId: number | null) => (denetciler || []).filter(d => d.il_id === ilId).length
  const sayi = (s: string) => talepler.filter(t => t.status === s).length

  async function karar(t: TalepSatir, onay: boolean) {
    const mesaj = onay
      ? `${t.ad_soyad || t.email} için ${ilAdi(t)} denetçi hesabı açılacak ve giriş bilgileri ${t.email} adresine e-postayla gönderilecek.`
      : `${t.ad_soyad || t.email} başvurusu reddedilecek.`
    if (!(await onayla(mesaj, { baslik: onay ? 'Başvuru onaylansın mı?' : 'Başvuru reddedilsin mi?', onayMetni: onay ? 'Onayla ve hesap aç' : 'Reddet', tehlikeli: !onay }))) return
    setIsleniyor(t.id)
    const r = await api<{ emailSent?: boolean; emailError?: string | null; email?: string; password?: string }>('/api/admin/denetim-talep', { method: 'PATCH', govde: { talepId: t.id, status: onay ? 'onaylandi' : 'reddedildi' } })
    setIsleniyor(null)
    if (!r.ok) { bildir({ tur: 'hata', metin: 'İşlem yapılamadı: ' + r.hata }); return }
    if (onay && r.veri?.emailSent === false && r.veri.password) setElden({ email: r.veri.email || t.email || '', password: r.veri.password })
    else bildir({ tur: 'basari', metin: onay ? 'Hesap açıldı, giriş bilgileri e-postayla gönderildi.' : 'Başvuru reddedildi.' })
    await Promise.all([yenile(), denetcileriYukle()])
  }

  async function denetciSil(d: Denetci) {
    if (!(await onayla(`${d.email || 'Bu denetçi'} hesabı kalıcı olarak silinecek; ${d.iller?.ad || 'ilin'} kurumlarını artık göremeyecek.`, { baslik: 'Denetçi hesabı silinsin mi?', onayMetni: 'Kalıcı olarak sil', tehlikeli: true }))) return
    const r = await api('/api/admin/denetim-kullanici', { method: 'DELETE', govde: { userId: d.id } })
    if (!r.ok) { bildir({ tur: 'hata', metin: 'Silinemedi: ' + r.hata }); return }
    bildir({ tur: 'basari', metin: 'Denetçi hesabı silindi.' })
    await denetcileriYukle()
  }

  const gorunenTalepler = gorunum === 'hesaplar' ? [] : talepler.filter(t => t.status === gorunum)

  return (
    <>
      <div className="yk-arac">
        <Filtre etiket="Görünüm" deger={gorunum} onDegis={setGorunum} secenekler={[
          { id: 'beklemede', ad: 'Bekleyen', sayi: sayi('beklemede') }, { id: 'onaylandi', ad: 'Onaylanan', sayi: sayi('onaylandi') },
          { id: 'reddedildi', ad: 'Reddedilen', sayi: sayi('reddedildi') }, { id: 'hesaplar', ad: 'Denetçi hesapları', sayi: denetciler?.length },
        ]} />
        <button type="button" className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setEkleAcik(true)}><Plus size={14} aria-hidden="true" /> Denetçi ekle</button>
      </div>

      {gorunum === 'hesaplar' ? (
        <section className="yk-kart" style={{ overflow: 'hidden' }}>
          {denetciler === null ? <Bos>Yükleniyor…</Bos> : denetciler.length === 0 ? <Bos>Henüz denetçi hesabı yok.</Bos> : (
            <div className="yk-tablo">
              <table className="data-table">
                <thead><tr><th>E-posta</th><th>İl</th><th>Açılış</th><th>Son giriş</th><th className="td-num">İşlem</th></tr></thead>
                <tbody>{denetciler.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600 }}>{d.email || '—'}</td>
                    <td>{d.iller?.ad || '—'}</td>
                    <td>{tarih(d.created_at)}</td>
                    <td style={{ color: 'var(--text3)' }}>{goreceZaman(d.son_giris, simdi)}</td>
                    <td className="td-num" style={{ whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSifreKisi(d)}>Şifre</button>{' '}
                      <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => denetciSil(d)}>Sil</button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
      ) : gorunenTalepler.length === 0 ? (
        <section className="yk-kart"><Bos>{gorunum === 'beklemede' ? 'Bekleyen başvuru yok.' : 'Bu listede başvuru yok.'}</Bos></section>
      ) : (
        <section aria-label="Başvurular" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {gorunenTalepler.map(t => {
            const gun = Math.round((simdi - new Date(t.created_at).getTime()) / 86400000)
            const mevcut = ildekiDenetci(t.il_id)
            return (
              <article key={t.id} className="yk-kart" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 700 }}>{t.ad_soyad || 'Adı belirtilmemiş'}</h2>
                    <div style={{ fontSize: 12.5, color: 'var(--text3)' }}>{t.okullar?.ad ? `${t.okullar.ad} üzerinden` : 'Doğrudan başvuru'}</div>
                  </div>
                  <span className={`badge ${gorunum === 'beklemede' ? (gun >= 3 ? 'badge-orange' : 'badge-gray') : gorunum === 'onaylandi' ? 'badge-green' : 'badge-red'}`} style={{ whiteSpace: 'nowrap' }}>{gun === 0 ? 'bugün' : `${gun} gün`}</span>
                </div>
                <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 10px', fontSize: 12.5 }}>
                  <dt style={{ color: 'var(--text3)' }}>E-posta</dt><dd style={{ margin: 0, overflowWrap: 'anywhere' }}>{t.email || '—'}</dd>
                  <dt style={{ color: 'var(--text3)' }}>Telefon</dt><dd style={{ margin: 0 }}>{t.telefon || '—'}</dd>
                  <dt style={{ color: 'var(--text3)' }}>İl</dt><dd style={{ margin: 0 }}>{ilAdi(t)}</dd>
                  <dt style={{ color: 'var(--text3)' }}>Bu ilde denetçi</dt><dd style={{ margin: 0, color: mevcut ? '#8a5200' : undefined, fontWeight: mevcut ? 600 : 400 }}>{mevcut ? `${mevcut} kişi var` : 'yok'}</dd>
                </dl>
                {t.notlar && <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text2)', background: 'var(--surface2)', padding: '8px 10px', borderRadius: 8 }}>{t.notlar}</p>}
                {gorunum === 'beklemede' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    <button type="button" className="btn btn-primary" style={{ flex: 1 }} disabled={isleniyor === t.id} onClick={() => karar(t, true)}>{isleniyor === t.id ? 'İşleniyor…' : 'Onayla ve hesap aç'}</button>
                    <button type="button" className="btn btn-secondary" disabled={isleniyor === t.id} onClick={() => karar(t, false)}>Reddet</button>
                  </div>
                )}
              </article>
            )
          })}
        </section>
      )}

      {ekleAcik && <DenetciEkle api={api} bildir={bildir} iller={iller} kapat={() => setEkleAcik(false)} yenile={denetcileriYukle} />}
      {elden && (
        <Pencere baslik="Hesap açıldı, e-posta gönderilemedi" aciklama="Giriş bilgilerini denetçiye güvenli bir yoldan iletin. Bu şifre bir daha gösterilmez." kapat={() => setElden(null)} genislik={440}>
          <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 12px', fontSize: 13.5 }}>
            <dt style={{ color: 'var(--text3)' }}>E-posta</dt><dd style={{ margin: 0, overflowWrap: 'anywhere' }}>{elden.email}</dd>
            <dt style={{ color: 'var(--text3)' }}>Geçici şifre</dt><dd className="font-mono" style={{ margin: 0, fontWeight: 600 }}>{elden.password}</dd>
          </dl>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigator.clipboard?.writeText(`${elden.email}
${elden.password}`)}>Kopyala</button>
            <button type="button" className="btn btn-primary" onClick={() => setElden(null)}>Tamam</button>
          </div>
        </Pencere>
      )}
      {sifreKisi && <SifreSifirla api={api} bildir={bildir} userId={sifreKisi.id} eposta={sifreKisi.email || ''} kapat={() => setSifreKisi(null)} />}
    </>
  )
}

function DenetciEkle({ api, bildir, iller, kapat, yenile }: Pick<Ortak, 'api' | 'bildir' | 'iller'> & { kapat: () => void; yenile: () => Promise<void> }) {
  const [eposta, setEposta] = useState('')
  const [sifre, setSifre] = useState('')
  const [ilId, setIlId] = useState(0)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const gecerli = /\S+@\S+\.\S+/.test(eposta) && sifre.length >= 8 && ilId > 0
  async function kaydet(e: React.FormEvent) {
    e.preventDefault()
    if (!gecerli) return
    setKaydediliyor(true)
    const r = await api('/api/admin/denetim-kullanici', { method: 'POST', govde: { email: eposta.trim(), password: sifre, il_id: ilId } })
    setKaydediliyor(false)
    if (!r.ok) { bildir({ tur: 'hata', metin: 'Hesap açılamadı: ' + r.hata }); return }
    bildir({ tur: 'basari', metin: 'Denetçi hesabı açıldı.' })
    kapat(); await yenile()
  }
  return (
    <Pencere baslik="Denetçi ekle" aciklama="İl denetim yetkilisi o ildeki kurumların denetim dosyalarını görür." kapat={kapat}>
      <form onSubmit={kaydet} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label><span className="form-label">İl</span>
          <select className="form-select" value={ilId} onChange={e => setIlId(Number(e.target.value))}>
            <option value={0}>Seçin…</option>
            {[...iller].sort((a, b) => a.ad.localeCompare(b.ad, 'tr')).map(il => <option key={il.id} value={il.id}>{il.ad}</option>)}
          </select>
        </label>
        <label><span className="form-label">E-posta</span><input className="form-input" type="email" autoComplete="off" value={eposta} onChange={e => setEposta(e.target.value)} /></label>
        <label><span className="form-label">Geçici şifre</span><input className="form-input" type="password" autoComplete="new-password" value={sifre} onChange={e => setSifre(e.target.value)} />
          <span style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>En az 8 karakter.</span></label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={kapat}>Vazgeç</button>
          <button type="submit" className="btn btn-primary" disabled={!gecerli || kaydediliyor}>{kaydediliyor ? 'Açılıyor…' : 'Hesabı aç'}</button>
        </div>
      </form>
    </Pencere>
  )
}
