'use client'
import { useMemo, useState } from 'react'
import { Plus, Search, X, FileSpreadsheet, CalendarPlus } from 'lucide-react'
import { DENEME_GUN } from '@/lib/deneme'
import { onayla } from '@/lib/diyalog'
import { excelIndir, bugunEtiketi } from '@/lib/excel'
import { useYukleme } from '@/lib/useYukleme'
import type { Ortak } from './YonetimKonsolu'
import { Bos, Filtre, Pencere, Sayfalama, goreceZaman, isoGun, kalanGun, lisansBilgisi, tarih, tl } from './ortak'
import type { Kurum, LisansTuru, OdemeSatir, Sekme } from './ortak'

const BOYUT = 25
type DurumFiltre = 'hepsi' | LisansTuru

export default function Kurumlar({ api, bildir, kurumlar, iller, odemeler, yukleniyor, secili, sec, yenile, illeriYenile, git }: Ortak & {
  odemeler: OdemeSatir[]; secili: number | null; sec: (id: number | null) => void
  yenile: () => Promise<void>; illeriYenile: () => Promise<void>; git: (s: Sekme, kurumId?: number | null) => void
}) {
  const [simdi] = useState(() => Date.now())
  const [ara, setAra] = useState('')
  const [durum, setDurum] = useState<DurumFiltre>('hepsi')
  const [ilFiltre, setIlFiltre] = useState<number | 0>(0)
  const [sayfa, setSayfa] = useState(1)
  const [ekleAcik, setEkleAcik] = useState(false)
  const [uzatAcik, setUzatAcik] = useState(false)

  const ilAdi = (id: number | null) => iller.find(i => i.id === id)?.ad || '—'
  const sayilar = useMemo(() => {
    const s: Record<DurumFiltre, number> = { hepsi: kurumlar.length, aktif: 0, deneme: 0, doldu: 0, pasif: 0 }
    kurumlar.forEach(k => { s[lisansBilgisi(k, simdi).tur]++ })
    return s
  }, [kurumlar, simdi])

  const filtreli = useMemo(() => {
    const q = ara.toLocaleLowerCase('tr').trim()
    return kurumlar.filter(k => {
      if (durum !== 'hepsi' && lisansBilgisi(k, simdi).tur !== durum) return false
      if (ilFiltre && k.ilId !== ilFiltre) return false
      if (!q) return true
      return `${k.ad} ${k.yonetici.email || ''} ${ilAdi(k.ilId)}`.toLocaleLowerCase('tr').includes(q)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps -- ilAdi iller'e bağlı
  }, [kurumlar, durum, ilFiltre, ara, simdi, iller])
  const sonSayfa = Math.max(1, Math.ceil(filtreli.length / BOYUT))
  const gorunen = filtreli.slice((Math.min(sayfa, sonSayfa) - 1) * BOYUT, Math.min(sayfa, sonSayfa) * BOYUT)
  const seciliKurum = kurumlar.find(k => k.id === secili) || null

  const excel = () => excelIndir(`Kurumlar_${bugunEtiketi()}`, 'Kurumlar',
    ['Kurum', 'Yönetici e-posta', 'İl', 'Lisans', 'Bitiş', 'Öğrenci', 'Personel', 'Son giriş', 'Kayıt'],
    filtreli.map(k => [k.ad, k.yonetici.email, ilAdi(k.ilId), lisansBilgisi(k, simdi).etiket, tarih(k.lisansBitis), k.ogrenci, k.personel, tarih(k.yonetici.last_login), tarih(k.kayit)]))

  return (
    <>
      <div className="yk-arac">
        <label className="yk-ara">
          <Search size={15} aria-hidden="true" color="var(--text3)" />
          <input type="search" placeholder="Kurum, e-posta veya il" aria-label="Kurum ara" value={ara} onChange={e => { setAra(e.target.value); setSayfa(1) }} />
        </label>
        <Filtre etiket="Lisans durumu" deger={durum} onDegis={v => { setDurum(v); setSayfa(1) }} secenekler={[
          { id: 'hepsi', ad: 'Tümü', sayi: sayilar.hepsi }, { id: 'aktif', ad: 'Aktif', sayi: sayilar.aktif },
          { id: 'deneme', ad: 'Deneme', sayi: sayilar.deneme }, { id: 'doldu', ad: 'Süresi dolmuş', sayi: sayilar.doldu },
          { id: 'pasif', ad: 'Pasif', sayi: sayilar.pasif },
        ]} />
        <label style={{ display: 'flex' }}>
          <select className="form-select" aria-label="İl" style={{ width: 150, minHeight: 34 }} value={ilFiltre} onChange={e => { setIlFiltre(Number(e.target.value)); setSayfa(1) }}>
            <option value={0}>Tüm iller</option>
            {[...iller].sort((a, b) => a.ad.localeCompare(b.ad, 'tr')).map(il => <option key={il.id} value={il.id}>{il.ad}</option>)}
          </select>
        </label>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setUzatAcik(true)}><CalendarPlus size={14} aria-hidden="true" /> Deneme uzat</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={excel} disabled={!filtreli.length}><FileSpreadsheet size={14} aria-hidden="true" /> Excel</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setEkleAcik(true)}><Plus size={14} aria-hidden="true" /> Kurum ekle</button>
        </div>
      </div>

      <div className="yk-iki">
        <section className="yk-kart genis" style={{ overflow: 'hidden' }}>
          {gorunen.length === 0 ? <Bos>{yukleniyor ? 'Yükleniyor…' : 'Bu filtreyle eşleşen kurum yok.'}</Bos> : (
            <div className="yk-tablo">
              <table className="data-table" style={{ minWidth: 720 }}>
                <thead><tr><th>Kurum</th><th>İl</th><th>Lisans</th><th>Bitiş</th><th className="td-num">Öğrenci</th><th>Son giriş</th></tr></thead>
                <tbody>
                  {gorunen.map(k => {
                    const l = lisansBilgisi(k, simdi)
                    return (
                      <tr key={k.id} className={`tikla${k.id === secili ? ' secili' : ''}`} onClick={() => sec(k.id === secili ? null : k.id)}>
                        <td>
                          <button type="button" onClick={e => { e.stopPropagation(); sec(k.id === secili ? null : k.id) }} aria-expanded={k.id === secili} style={{ all: 'unset', cursor: 'pointer', display: 'block' }}>
                            <div style={{ fontWeight: 600 }}>{k.ad}</div>
                            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{k.yonetici.email || '—'}</div>
                          </button>
                        </td>
                        <td>{ilAdi(k.ilId)}</td>
                        <td><span className={`badge ${l.rozet}`}>{l.etiket}</span></td>
                        <td className="font-mono" style={{ fontSize: 12, color: l.tur === 'doldu' ? 'var(--danger)' : undefined }}>{tarih(k.lisansBitis)}</td>
                        <td className="td-num">{k.ogrenci}</td>
                        <td style={{ color: 'var(--text3)', whiteSpace: 'nowrap' }}>{goreceZaman(k.yonetici.last_login, simdi)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {filtreli.length > BOYUT && <Sayfalama sayfa={Math.min(sayfa, sonSayfa)} toplam={filtreli.length} boyut={BOYUT} onSayfa={setSayfa} />}
        </section>

        {seciliKurum && (
          <KurumDetay key={seciliKurum.id} kurum={seciliKurum} api={api} bildir={bildir} iller={iller} simdi={simdi}
            odemeler={odemeler.filter(o => o.okul_id === seciliKurum.id)} kapat={() => sec(null)}
            yenile={async () => { await Promise.all([yenile(), illeriYenile()]) }} odemeGir={() => git('tahsilat', seciliKurum.id)} />
        )}
      </div>

      {ekleAcik && <KurumEkle api={api} bildir={bildir} kapat={() => setEkleAcik(false)} yenile={yenile} />}
      {uzatAcik && <DenemeUzat api={api} bildir={bildir} kapat={() => setUzatAcik(false)} yenile={yenile} />}
    </>
  )
}

// ── Kurum detayı ───────────────────────────────────────────────
function KurumDetay({ kurum, api, bildir, iller, simdi, odemeler, kapat, yenile, odemeGir }: Pick<Ortak, 'api' | 'bildir' | 'iller'> & {
  kurum: Kurum; simdi: number; odemeler: OdemeSatir[]; kapat: () => void; yenile: () => Promise<void>; odemeGir: () => void
}) {
  const l = lisansBilgisi(kurum, simdi)
  const [durum, setDurum] = useState(kurum.odemeDurumu === 'borclu' ? 'borclu' : kurum.odemeDurumu === 'deneme' ? 'deneme' : 'aktif')
  const [bitis, setBitis] = useState((kurum.lisansBitis || '').slice(0, 10))
  const [ilId, setIlId] = useState<number | 0>(kurum.ilId || 0)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [sifreAcik, setSifreAcik] = useState(false)
  const degisti = durum !== (kurum.odemeDurumu || 'aktif') || bitis !== (kurum.lisansBitis || '').slice(0, 10) || ilId !== (kurum.ilId || 0)

  // Uzatma, bugünden ya da (henüz bitmediyse) mevcut bitişten itibaren hesaplanır
  const uzat = (ay: number, gun = 0) => {
    const temel = bitis && new Date(bitis + 'T12:00:00').getTime() > simdi ? new Date(bitis + 'T12:00:00') : new Date(simdi)
    const d = new Date(temel); d.setMonth(d.getMonth() + ay); d.setDate(d.getDate() + gun)
    setBitis(isoGun(d))
    if (gun && !ay) setDurum('deneme'); else setDurum('aktif')
  }

  async function kaydet() {
    setKaydediliyor(true)
    const istekler: Promise<{ ok: boolean; hata: string | null }>[] = []
    if (durum !== (kurum.odemeDurumu || 'aktif') || bitis !== (kurum.lisansBitis || '').slice(0, 10))
      istekler.push(api('/api/admin/kullanici', { method: 'PUT', govde: { okulId: kurum.id, lisansBitis: bitis || undefined, odemeDurumu: durum } }))
    if (ilId !== (kurum.ilId || 0))
      istekler.push(api('/api/admin/iller', { method: 'PATCH', govde: { okul_id: kurum.id, il_id: ilId || null } }))
    const sonuc = await Promise.all(istekler)
    const hata = sonuc.find(r => !r.ok)
    if (hata) bildir({ tur: 'hata', metin: 'Kaydedilemedi: ' + hata.hata })
    else { bildir({ tur: 'basari', metin: `${kurum.ad} güncellendi.` }); await yenile() }
    setKaydediliyor(false)
  }

  async function engelDegistir() {
    const pasif = !kurum.yonetici.banned
    if (pasif && !(await onayla(`${kurum.ad} yöneticisi sisteme giriş yapamayacak. Veriler silinmez.`, { baslik: 'Hesap pasifleştirilsin mi?', onayMetni: 'Pasifleştir', tehlikeli: true }))) return
    const r = await api('/api/admin/kullanici', { method: 'PUT', govde: { userId: kurum.yonetici.id, banned: pasif } })
    if (!r.ok) { bildir({ tur: 'hata', metin: 'İşlem yapılamadı: ' + r.hata }); return }
    bildir({ tur: 'basari', metin: pasif ? 'Hesap pasifleştirildi.' : 'Hesap yeniden etkinleştirildi.' })
    await yenile()
  }

  async function hesabiSil() {
    if (!(await onayla(`${kurum.yonetici.email || 'Yönetici'} giriş hesabı kalıcı olarak silinecek. Kurumun kayıtları (öğrenci, bordro vb.) silinmez; kuruma yeni bir yönetici açmanız gerekir.`, { baslik: 'Yönetici hesabı silinsin mi?', onayMetni: 'Kalıcı olarak sil', tehlikeli: true }))) return
    const r = await api('/api/admin/kullanici', { method: 'DELETE', govde: { userId: kurum.yonetici.id } })
    if (!r.ok) { bildir({ tur: 'hata', metin: 'Silinemedi: ' + r.hata }); return }
    bildir({ tur: 'basari', metin: 'Yönetici hesabı silindi.' })
    kapat(); await yenile()
  }

  return (
    <aside className="yk-detay" aria-label={`${kurum.ad} detayı`}>
      <div style={{ padding: '16px 18px 14px', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <span className={`badge ${l.rozet}`}>{l.etiket}</span>
          <h2 style={{ margin: '8px 0 2px', fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>{kurum.ad}</h2>
          <div style={{ fontSize: 12.5, color: 'var(--text3)', overflowWrap: 'anywhere' }}>{kurum.yonetici.email || '—'} · kayıt {tarih(kurum.kayit)}</div>
          {kurum.kullaniciSayisi > 1 && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{kurum.kullaniciSayisi} kullanıcı hesabı</div>}
        </div>
        <button type="button" className="btn btn-secondary btn-icon" onClick={kapat} aria-label="Detayı kapat"><X size={15} /></button>
      </div>
      <div className="yk-istat">
        <div><span>Öğrenci</span><strong>{kurum.ogrenci}</strong></div>
        <div><span>Personel</span><strong>{kurum.personel}</strong></div>
        <div><span>Bordro</span><strong>{kurum.bordro}</strong></div>
        <div><span>Tahsilat</span><strong>{kurum.tahsilat.toLocaleString('tr-TR')}</strong></div>
      </div>

      <div className="yk-detay-bolum">
        <h3>Lisans</h3>
        <div className="yk-grid2">
          <label><span className="form-label">Durum</span>
            <select className="form-select" value={durum} onChange={e => setDurum(e.target.value)}>
              <option value="aktif">Aktif</option><option value="deneme">Deneme</option><option value="borclu">Ödeme bekleniyor</option>
            </select>
          </label>
          <label><span className="form-label">Bitiş tarihi</span>
            <input className="form-input" type="date" value={bitis} onChange={e => setBitis(e.target.value)} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => uzat(1)}>+1 ay</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => uzat(12)}>+1 yıl</button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => uzat(0, DENEME_GUN)}>+{DENEME_GUN} gün deneme</button>
        </div>
        {bitis && <div style={{ fontSize: 12, color: 'var(--text3)' }}>{(() => { const g = kalanGun(bitis, simdi); return g === null ? '' : g < 0 ? `${-g} gün önce doldu` : `${g} gün kaldı` })()}</div>}
        <label><span className="form-label">İl</span>
          <select className="form-select" value={ilId} onChange={e => setIlId(Number(e.target.value))}>
            <option value={0}>Atanmamış</option>
            {[...iller].sort((a, b) => a.ad.localeCompare(b.ad, 'tr')).map(il => <option key={il.id} value={il.id}>{il.ad}</option>)}
          </select>
        </label>
        <button type="button" className="btn btn-primary" onClick={kaydet} disabled={!degisti || kaydediliyor}>{kaydediliyor ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}</button>
      </div>

      <div className="yk-detay-bolum">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Ödemeler</h3>
          <button type="button" className="btn btn-secondary btn-sm" onClick={odemeGir}><Plus size={13} aria-hidden="true" /> Ödeme gir</button>
        </div>
        {odemeler.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text3)' }}>Kayıtlı ödeme yok.</div> : odemeler.slice(0, 5).map(o => (
          <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 }}>
            <span>{tarih(o.odeme_tarihi)} · {o.odeme_yontemi}</span><strong style={{ fontWeight: 600 }}>{tl(Number(o.tutar))}</strong>
          </div>
        ))}
      </div>

      <div className="yk-detay-bolum">
        <h3>Yönetici hesabı</h3>
        <div style={{ fontSize: 12.5, color: 'var(--text3)' }}>Son giriş: {goreceZaman(kurum.yonetici.last_login, simdi)}</div>
        <button type="button" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={() => setSifreAcik(true)}>Şifreyi sıfırla</button>
        <button type="button" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={engelDegistir}>{kurum.yonetici.banned ? 'Hesabı yeniden etkinleştir' : 'Hesabı pasifleştir'}</button>
        <button type="button" className="btn btn-outline-danger" style={{ justifyContent: 'flex-start' }} onClick={hesabiSil}>Yönetici hesabını sil</button>
      </div>

      {sifreAcik && <SifreSifirla api={api} bildir={bildir} userId={kurum.yonetici.id} eposta={kurum.yonetici.email || ''} kapat={() => setSifreAcik(false)} />}
    </aside>
  )
}

export function SifreSifirla({ api, bildir, userId, eposta, kapat }: Pick<Ortak, 'api' | 'bildir'> & { userId: string; eposta: string; kapat: () => void }) {
  const [sifre, setSifre] = useState('')
  const [tekrar, setTekrar] = useState('')
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const hata = sifre && sifre.length < 8 ? 'En az 8 karakter olmalı.' : tekrar && sifre !== tekrar ? 'Şifreler aynı değil.' : ''
  async function kaydet(e: React.FormEvent) {
    e.preventDefault()
    if (hata || !sifre) return
    setKaydediliyor(true)
    const r = await api('/api/admin/kullanici', { method: 'PATCH', govde: { userId, newPassword: sifre } })
    setKaydediliyor(false)
    if (!r.ok) { bildir({ tur: 'hata', metin: 'Şifre güncellenemedi: ' + r.hata }); return }
    bildir({ tur: 'basari', metin: 'Şifre güncellendi. Yeni şifreyi kullanıcıya güvenli bir yoldan iletin.' })
    kapat()
  }
  return (
    <Pencere baslik="Şifreyi sıfırla" aciklama={eposta} kapat={kapat} genislik={420}>
      <form onSubmit={kaydet} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label><span className="form-label">Yeni şifre</span><input className="form-input" type="password" autoComplete="new-password" value={sifre} onChange={e => setSifre(e.target.value)} autoFocus /></label>
        <label><span className="form-label">Yeni şifre (tekrar)</span><input className="form-input" type="password" autoComplete="new-password" value={tekrar} onChange={e => setTekrar(e.target.value)} /></label>
        {hata && <div style={{ fontSize: 12.5, color: 'var(--danger)' }}>{hata}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={kapat}>Vazgeç</button>
          <button type="submit" className="btn btn-primary" disabled={!!hata || !sifre || sifre !== tekrar || kaydediliyor}>{kaydediliyor ? 'Kaydediliyor…' : 'Şifreyi güncelle'}</button>
        </div>
      </form>
    </Pencere>
  )
}

// ── Yeni kurum ─────────────────────────────────────────────────
function KurumEkle({ api, bildir, kapat, yenile }: Pick<Ortak, 'api' | 'bildir'> & { kapat: () => void; yenile: () => Promise<void> }) {
  const [ad, setAd] = useState('')
  const [eposta, setEposta] = useState('')
  const [sifre, setSifre] = useState('')
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const gecerli = ad.trim().length > 2 && /\S+@\S+\.\S+/.test(eposta) && sifre.length >= 8
  async function kaydet(e: React.FormEvent) {
    e.preventDefault()
    if (!gecerli) return
    setKaydediliyor(true)
    const r = await api('/api/admin/kullanici', { method: 'POST', govde: { email: eposta.trim(), password: sifre, schoolName: ad.trim() } })
    setKaydediliyor(false)
    if (!r.ok) { bildir({ tur: 'hata', metin: 'Kurum oluşturulamadı: ' + r.hata }); return }
    bildir({ tur: 'basari', metin: `${ad.trim()} ${DENEME_GUN} günlük ücretsiz deneme ile oluşturuldu.` })
    kapat(); await yenile()
  }
  return (
    <Pencere baslik="Kurum ekle" aciklama={`Kurum ${DENEME_GUN} günlük ücretsiz denemeyle başlar; ödeme alınınca lisansı kurum detayından uzatın.`} kapat={kapat}>
      <form onSubmit={kaydet} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label><span className="form-label">Kurum adı</span><input className="form-input" value={ad} onChange={e => setAd(e.target.value)} placeholder="Örn. Gazi Ortaokulu Çocuk Kulübü" autoFocus /></label>
        <label><span className="form-label">Yönetici e-postası</span><input className="form-input" type="email" autoComplete="off" value={eposta} onChange={e => setEposta(e.target.value)} /></label>
        <label><span className="form-label">Geçici şifre</span><input className="form-input" type="password" autoComplete="new-password" value={sifre} onChange={e => setSifre(e.target.value)} />
          <span style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>En az 8 karakter. Yöneticiye güvenli bir yoldan iletin.</span></label>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={kapat}>Vazgeç</button>
          <button type="submit" className="btn btn-primary" disabled={!gecerli || kaydediliyor}>{kaydediliyor ? 'Oluşturuluyor…' : 'Kurumu oluştur'}</button>
        </div>
      </form>
    </Pencere>
  )
}

// ── Süresi dolan denemelere ek süre ────────────────────────────
interface Aday { okul_id: number; okul_adi: string; lisans_bitis: string; email: string }
interface UzatmaSonuc { okul_adi: string; email: string; uzatildi: boolean; mail: boolean }

function DenemeUzat({ api, bildir, kapat, yenile }: Pick<Ortak, 'api' | 'bildir'> & { kapat: () => void; yenile: () => Promise<void> }) {
  const [adaylar, setAdaylar] = useState<Aday[] | null>(null)
  const [secili, setSecili] = useState<number[]>([])
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const [sonuc, setSonuc] = useState<UzatmaSonuc[] | null>(null)

  useYukleme(async () => {
    const r = await api<{ adaylar: Aday[] }>('/api/admin/deneme-uzat')
    const l = r.veri?.adaylar || []
    setAdaylar(l); setSecili(l.map(a => a.okul_id))
    if (!r.ok) bildir({ tur: 'hata', metin: 'Adaylar yüklenemedi: ' + r.hata })
  }, [])

  async function gonder() {
    if (!secili.length) return
    if (!(await onayla(`${secili.length} kuruma ${DENEME_GUN} gün ücretsiz deneme tanımlanacak ve yöneticilerine e-posta gönderilecek.`, { onayMetni: 'Tanımla ve gönder' }))) return
    setGonderiliyor(true)
    const r = await api<{ sonuclar: UzatmaSonuc[] }>('/api/admin/deneme-uzat', { method: 'POST', govde: { okulIds: secili } })
    setGonderiliyor(false)
    if (!r.ok) { bildir({ tur: 'hata', metin: r.hata || 'Gönderilemedi' }); return }
    setSonuc(r.veri?.sonuclar || [])
    await yenile()
  }

  return (
    <Pencere baslik="Süresi dolan denemeler" aciklama={`Seçilen kurumlara bir defalık ${DENEME_GUN} gün ücretsiz deneme tanımlanır ve yöneticisine e-posta gider.`} kapat={kapat} genislik={620}>
      {sonuc ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
          {sonuc.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <span>{s.okul_adi}</span>
              <span className={`badge ${s.uzatildi && s.mail ? 'badge-green' : s.uzatildi ? 'badge-orange' : 'badge-red'}`}>{s.uzatildi ? (s.mail ? 'Süre ve e-posta tamam' : 'Süre tamam, e-posta gitmedi') : 'Tanımlanamadı'}</span>
            </div>
          ))}
          <button type="button" className="btn btn-primary" style={{ alignSelf: 'flex-end', marginTop: 8 }} onClick={kapat}>Kapat</button>
        </div>
      ) : adaylar === null ? <Bos>Yükleniyor…</Bos> : adaylar.length === 0 ? <Bos>Uzatmaya uygun (süresi dolmuş ve daha önce uzatılmamış) deneme yok.</Bos> : (
        <>
          <div className="yk-tablo" style={{ maxHeight: 360, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
            <table className="data-table">
              <thead><tr>
                <th style={{ width: 36 }}><input type="checkbox" aria-label="Tümünü seç" checked={secili.length === adaylar.length} onChange={e => setSecili(e.target.checked ? adaylar.map(a => a.okul_id) : [])} /></th>
                <th>Kurum</th><th>Yönetici</th><th>Deneme bitişi</th>
              </tr></thead>
              <tbody>{adaylar.map(a => (
                <tr key={a.okul_id}>
                  <td><input type="checkbox" aria-label={`${a.okul_adi} seç`} checked={secili.includes(a.okul_id)} onChange={e => setSecili(p => e.target.checked ? [...p, a.okul_id] : p.filter(x => x !== a.okul_id))} /></td>
                  <td style={{ fontWeight: 600 }}>{a.okul_adi}</td><td>{a.email}</td><td className="font-mono" style={{ fontSize: 12 }}>{tarih(a.lisans_bitis)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
            <button type="button" className="btn btn-secondary" onClick={kapat}>Vazgeç</button>
            <button type="button" className="btn btn-primary" disabled={!secili.length || gonderiliyor} onClick={gonder}>{gonderiliyor ? 'Gönderiliyor…' : `${secili.length} kuruma ${DENEME_GUN} gün ver`}</button>
          </div>
        </>
      )}
    </Pencere>
  )
}
