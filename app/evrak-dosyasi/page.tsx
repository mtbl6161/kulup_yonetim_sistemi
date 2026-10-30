'use client'
import { useCallback, useRef, useState } from 'react'
import Topbar from '@/components/Topbar'
import ConfirmModal from '@/components/ConfirmModal'
import { useAy } from '@/lib/AyContext'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { AYLAR } from '@/lib/hesaplama'
import {
  DenetimMadde, DenetimBelge, DenetimTeslim, DENETIM_BUCKET, MAKS_DOSYA_BOYUTU, KABUL_EDILEN, TESLIM_DURUM_ETIKET,
  belgeDonemde, donemBelgeleriniGetir, depoYolu, boyutFmt, otomatikBelgeUret, kontrolListesiUret, belgeAc, belgeIndir, blobKaydet, dosyayiZiple,
} from '@/lib/denetimDosyasi'
import { FolderCheck, Upload, Eye, Download, Trash2, Send, FileArchive, ListChecks, AlertTriangle } from 'lucide-react'
import MaddeEtiketleri from '@/components/MaddeEtiketleri'
import { dosyaIkonu } from '@/components/DenetciDenetimDosyasi'
import { useYukleme } from '@/lib/useYukleme'

const DURUM_RENK: Record<string, string> = {
  taslak: 'badge-gray', gonderildi: 'badge-blue', onaylandi: 'badge-green', iade: 'badge-red',
  bekliyor: 'badge-gray',
}

export default function DenetimDosyasiPage() {
  const { ay, yil, setAyYil } = useAy()
  const { okul } = useAuth()
  const [maddeler, setMaddeler] = useState<DenetimMadde[]>([])
  const [belgeler, setBelgeler] = useState<DenetimBelge[]>([])
  const [teslim, setTeslim] = useState<DenetimTeslim | null>(null)
  const [bordroVar, setBordroVar] = useState(true)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [islem, setIslem] = useState<string | null>(null) // devam eden işlem mesajı
  const [msg, setMsg] = useState<{ tip: 'ok' | 'hata'; text: string } | null>(null)
  const [silinecek, setSilinecek] = useState<DenetimBelge | null>(null)
  const [acikMaddeler, setAcikMaddeler] = useState<Set<number>>(new Set()) // uzun belge listesi açılmış maddeler
  const [gonderOnay, setGonderOnay] = useState<string | null>(null)
  const dosyaInput = useRef<HTMLInputElement>(null)
  const hedefMadde = useRef<DenetimMadde | null>(null)

  const okulId = okul?.id
  const acik = !teslim || teslim.durum === 'taslak' || teslim.durum === 'iade'

  const load = useCallback(async () => {
    if (!okulId) return
    setYukleniyor(true)
    try {
      await supabase.rpc('denetim_maddeleri_hazirla')
      const [m, t, b] = await Promise.all([
        supabase.from('denetim_maddeleri').select('*').eq('aktif', true).order('sira_no'),
        supabase.from('denetim_teslimleri').select('*').eq('okul_id', okulId).eq('yil', yil).eq('ay', ay).maybeSingle(),
        donemBelgeleriniGetir(okulId, yil, ay),
      ])
      if (m.error) throw m.error
      setMaddeler((m.data || []) as DenetimMadde[])
      setTeslim((t.data as DenetimTeslim) || null)
      setBelgeler(b)
      const { count } = await supabase.from('bordro').select('id', { count: 'exact', head: true }).eq('okul_id', okulId).eq('yil', yil).eq('ay', ay)
      setBordroVar(!!count)
    } catch (e) {
      setMsg({ tip: 'hata', text: 'Denetim dosyası yüklenemedi: ' + (e as Error).message + ' (Veritabanı kurulumu yapıldı mı? migration_denetim_dosyasi.sql)' })
    } finally {
      setYukleniyor(false)
    }
  }, [okulId, yil, ay])

  useYukleme(load)

  const maddeBelgeleri = (m: DenetimMadde) => belgeler.filter(b => b.madde_id === m.id && belgeDonemde(b, m, yil, ay))

  function hata(e: unknown) {
    setMsg({ tip: 'hata', text: '❌ ' + ((e as Error)?.message || String(e)) })
  }

  // ── Yükleme ───────────────────────────────────────────────────
  function yukleSec(m: DenetimMadde) {
    hedefMadde.current = m
    dosyaInput.current?.click()
  }

  async function dosyalariYukle(files: FileList | null) {
    const m = hedefMadde.current
    if (!files || !m || !okulId) return
    const liste = Array.from(files)
    const buyuk = liste.filter(f => f.size > MAKS_DOSYA_BOYUTU)
    if (buyuk.length) { setMsg({ tip: 'hata', text: `❌ Dosya 10 MB'tan büyük olamaz: ${buyuk.map(f => f.name).join(', ')}` }); return }
    setMsg(null)
    try {
      for (const f of liste) {
        setIslem(`Yükleniyor: ${f.name}`)
        const yol = depoYolu(okulId, yil, ay, m.id, f.name)
        const up = await supabase.storage.from(DENETIM_BUCKET).upload(yol, f, { contentType: f.type || undefined })
        if (up.error) throw up.error
        const ins = await supabase.from('denetim_belgeleri').insert({
          okul_id: okulId, yil, ay, madde_id: m.id, kaynak: 'yukleme', dosya_yolu: yol, dosya_adi: f.name, boyut: f.size, mime: f.type || null,
        })
        if (ins.error) { await supabase.storage.from(DENETIM_BUCKET).remove([yol]); throw ins.error }
      }
      setMsg({ tip: 'ok', text: `✅ ${liste.length} dosya ${m.sira_no}. maddeye eklendi.` })
      await load()
    } catch (e) { hata(e) } finally { setIslem(null); if (dosyaInput.current) dosyaInput.current.value = '' }
  }

  async function sil(b: DenetimBelge) {
    setSilinecek(null)
    try {
      const { error } = await supabase.from('denetim_belgeleri').delete().eq('id', b.id)
      if (error) throw error
      await supabase.storage.from(DENETIM_BUCKET).remove([b.dosya_yolu])
      await load()
    } catch (e) { hata(e) }
  }

  // ── Otomatik belge önizleme ──────────────────────────────────
  async function onizle(m: DenetimMadde) {
    if (!okulId || !m.otomatik_kod) return
    setIslem(`${m.sira_no}. madde hazırlanıyor...`)
    try {
      const { blob, ad } = await otomatikBelgeUret(m.otomatik_kod, okulId, yil, ay)
      const url = URL.createObjectURL(blob)
      if (!window.open(url, '_blank')) blobKaydet(blob, ad)
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (e) { hata(e) } finally { setIslem(null) }
  }

  // ── Gönderim ─────────────────────────────────────────────────
  async function gonderKontrol() {
    if (!okulId) return
    setMsg(null)
    const { count } = await supabase.from('bordro').select('id', { count: 'exact', head: true }).eq('okul_id', okulId).eq('yil', yil).eq('ay', ay)
    if (!count) { setMsg({ tip: 'hata', text: `❌ ${AYLAR[ay]} ${yil} bordrosu hesaplanmamış. Önce Bordro Özeti sayfasından bordroyu hesaplayın.` }); return }
    const eksik = maddeler.filter(m => m.tip === 'yukleme' && m.zorunlu && maddeBelgeleri(m).length === 0)
    const iadeli = belgeler.filter(b => b.durum === 'iade' && b.yil === yil && b.ay === ay)
    const uyarilar: string[] = []
    if (eksik.length) uyarilar.push(`Yüklenmemiş maddeler: ${eksik.map(m => m.sira_no).join(', ')}.`)
    if (iadeli.length) uyarilar.push(`İade edilen ${iadeli.length} belge değiştirilmedi.`)
    setGonderOnay(
      (uyarilar.length ? uyarilar.join(' ') + ' ' : '') +
      'Gönderildiğinde otomatik belgelerin (bordro, puantaj, personel listesi, bilanço) şu anki kopyası alınır ve dosya denetçi karar verene kadar kilitlenir. Gönderilsin mi?'
    )
  }

  async function gonder() {
    setGonderOnay(null)
    if (!okulId) return
    try {
      for (const m of maddeler.filter(x => x.tip === 'otomatik' && x.otomatik_kod)) {
        setIslem(`${m.sira_no}. madde kopyası alınıyor...`)
        const { blob, ad } = await otomatikBelgeUret(m.otomatik_kod!, okulId, yil, ay)
        const eski = belgeler.filter(b => b.madde_id === m.id && b.kaynak === 'otomatik' && b.yil === yil && b.ay === ay)
        const yol = depoYolu(okulId, yil, ay, m.id, ad)
        const up = await supabase.storage.from(DENETIM_BUCKET).upload(yol, blob, { contentType: 'application/pdf' })
        if (up.error) throw up.error
        const rpc = await supabase.rpc('denetim_otomatik_kaydet', { p_yil: yil, p_ay: ay, p_madde_id: m.id, p_yol: yol, p_ad: ad, p_boyut: blob.size, p_mime: 'application/pdf' })
        if (rpc.error) { await supabase.storage.from(DENETIM_BUCKET).remove([yol]); throw rpc.error }
        if (eski.length) await supabase.storage.from(DENETIM_BUCKET).remove(eski.map(b => b.dosya_yolu))
      }
      setIslem('Denetime gönderiliyor...')
      const { error } = await supabase.rpc('denetim_gonder', { p_yil: yil, p_ay: ay })
      if (error) throw error
      setMsg({ tip: 'ok', text: `✅ ${AYLAR[ay]} ${yil} denetim dosyası denetime gönderildi.` })
      await load()
    } catch (e) { hata(e) } finally { setIslem(null) }
  }

  async function kontrolListesiIndir() {
    setIslem('Kontrol listesi hazırlanıyor...')
    try {
      blobKaydet(await kontrolListesiUret(okul?.ad || '', yil, ay, maddeler, belgeler, teslim), `Kontrol_Listesi_${AYLAR[ay]}_${yil}.pdf`)
    } catch (e) { hata(e) } finally { setIslem(null) }
  }

  async function zipIndir() {
    try { await dosyayiZiple(okul?.ad || '', yil, ay, maddeler, belgeler, teslim, setIslem) } catch (e) { hata(e) } finally { setIslem(null) }
  }

  const tamam = maddeler.filter(m => maddeBelgeleri(m).length > 0 || (m.tip === 'otomatik' && acik)).length
  // Denetçi bir belgeyi ancak dosya gönderildikten sonra görür; iade sonrası eklenenler yeniden gönderilene kadar görünmez
  // (migration_denetim_gonderilmeden_gizle.sql ile aynı kural)
  const denetciGorur = (b: DenetimBelge) => !!teslim && (teslim.durum === 'gonderildi' || teslim.durum === 'onaylandi'
    || (teslim.durum === 'iade' && !!teslim.karar_tarihi && new Date(b.created_at) <= new Date(teslim.karar_tarihi)))
  const gonderilmemis = maddeler.flatMap(m => maddeBelgeleri(m)).filter(b => b.kaynak === 'yukleme' && !denetciGorur(b))
  const KISA_LISTE = 4

  return (
    <div>
      <style>{ED_CSS}</style>
      <Topbar
        title="Denetim Dosyası"
        sub={`${AYLAR[ay]} ${yil} – il denetimine gönderilecek evraklar`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={kontrolListesiIndir} disabled={!!islem || yukleniyor} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ListChecks size={15} /> Kontrol Listesi
            </button>
            <button className="btn btn-secondary btn-sm" onClick={zipIndir} disabled={!!islem || yukleniyor || belgeler.length === 0} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <FileArchive size={15} /> Tümünü İndir (ZIP)
            </button>
            {acik && (
              <button className="btn btn-primary btn-sm" onClick={gonderKontrol} disabled={!!islem || yukleniyor || maddeler.length === 0} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Send size={15} /> Denetime Gönder
              </button>
            )}
          </div>
        }
      />
      <div style={{ padding: 28 }}>
        <input ref={dosyaInput} type="file" multiple accept={KABUL_EDILEN} style={{ display: 'none' }} onChange={e => dosyalariYukle(e.target.files)} />

        {/* Durum bandı */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <FolderCheck size={28} color="var(--accent)" />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {AYLAR[ay]} {yil} dosyası: <span className={`badge ${DURUM_RENK[teslim?.durum || 'taslak']}`}>{TESLIM_DURUM_ETIKET[teslim?.durum || 'taslak']}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
              {maddeler.length > 0 && `${tamam}/${maddeler.length} madde hazır`}
              {teslim?.gonderim_tarihi && ` · Gönderim: ${new Date(teslim.gonderim_tarihi).toLocaleString('tr-TR')}`}
              {teslim?.karar_tarihi && ` · Karar: ${new Date(teslim.karar_tarihi).toLocaleString('tr-TR')}`}
            </div>
          </div>
          {!acik && <div style={{ fontSize: 12, color: 'var(--text2)' }}>Dosya kilitli. Denetçi iade ederse yeniden düzenleyebilirsiniz.</div>}
          {acik && (!teslim || teslim.durum === 'taslak') && <div style={{ fontSize: 12, color: 'var(--text2)', maxWidth: 320 }}>Denetçi belgeleri, dosyayı “Denetime Gönder” ile gönderdiğinizde görür.</div>}
        </div>

        {!yukleniyor && !bordroVar && (!teslim || teslim.durum === 'taslak') && (
          <div className="alert alert-info" style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ flex: 1, minWidth: 240 }}>
              <b>{AYLAR[ay]} {yil} için bordro henüz hesaplanmamış</b>; bordro, puantaj ve bilanço belgeleri boş çıkar.
              Denetim dosyası genellikle bir önceki ay için hazırlanır.
            </span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => ay === 1 ? setAyYil(12, yil - 1) : setAyYil(ay - 1, yil)}>
              {AYLAR[ay === 1 ? 12 : ay - 1]} {ay === 1 ? yil - 1 : yil} dosyasına geç
            </button>
          </div>
        )}
        {teslim?.durum === 'iade' && (
          <div className="alert alert-danger" style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <div><b>Denetçi dosyayı iade etti.</b> {teslim.denetci_notu || ''} Düzeltmeleri yapıp yeniden gönderin.</div>
          </div>
        )}
        {teslim?.durum === 'iade' && gonderilmemis.length > 0 && (
          <div className="alert alert-info" style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ flex: 1, minWidth: 240 }}>
              İadeden sonra <b>{gonderilmemis.length} yeni belge</b> eklediniz. Denetçi bu belgeleri dosyayı yeniden gönderdiğinizde görür.
            </span>
            <button type="button" className="btn btn-primary btn-sm" onClick={gonderKontrol} disabled={!!islem}><Send size={14} /> Yeniden gönder</button>
          </div>
        )}
        {msg && <div className={`alert ${msg.tip === 'ok' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: 16 }}>{msg.text}</div>}
        {islem && <div className="alert alert-info" style={{ marginBottom: 16 }}>⏳ {islem}</div>}

        {yukleniyor ? (
          <div className="alert alert-info">⏳ Yükleniyor...</div>
        ) : !okul?.il_id ? (
          <div className="alert alert-danger">Okulunuzun ili tanımlı değil; denetim evrak listesi gösterilemiyor. Sistem yöneticisiyle iletişime geçin.</div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {maddeler.map(m => {
              const mb = maddeBelgeleri(m)
              const otomatikKopya = mb.filter(b => b.kaynak === 'otomatik')
              return (
                <div key={m.id} style={{ display: 'flex', gap: 14, padding: '14px 18px', borderBottom: '1px solid var(--border-light)', alignItems: 'flex-start' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13,
                    background: mb.length ? 'var(--success-light)' : 'var(--surface2)', color: mb.length ? '#1a7a3a' : 'var(--text3)' }}>
                    {m.sira_no}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 8px', fontWeight: 600, fontSize: 13.5 }}>
                      <span>{m.baslik}</span>
                      <MaddeEtiketleri madde={m} />
                      {mb.length > 1 && <span className="badge badge-gray" style={{ fontWeight: 600 }}>{mb.length} belge</span>}
                    </div>
                    {m.aciklama && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{m.aciklama}</div>}
                    {m.tip === 'otomatik' && otomatikKopya.length === 0 && (
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Gönderimde sistem verisinden PDF olarak eklenecek.</div>
                    )}
                    {mb.length > 0 && (
                      <ul className="ed-liste">
                        {(mb.length > KISA_LISTE + 1 && !acikMaddeler.has(m.id) ? mb.slice(0, KISA_LISTE) : mb).map(b => {
                          const { I, renk } = dosyaIkonu(b.dosya_adi, b.mime)
                          const gitmedi = b.kaynak === 'yukleme' && teslim?.durum === 'iade' && !denetciGorur(b)
                          return (
                            <li key={b.id} className="ed-satir">
                              <I size={16} aria-hidden="true" style={{ color: renk, flexShrink: 0 }} />
                              <div style={{ minWidth: 0 }}>
                                <div className="ed-ad" title={b.dosya_adi}>{b.dosya_adi}</div>
                                <div className="ed-meta">
                                  {boyutFmt(b.boyut)}{b.kaynak === 'otomatik' ? ' · gönderim kopyası' : ''}{m.yillik && (b.yil !== yil || b.ay !== ay) ? ` · ${AYLAR[b.ay]} ${b.yil}'de yüklendi` : ''}
                                  {b.denetci_notu && <span style={{ color: 'var(--danger)' }}> · Denetçi notu: “{b.denetci_notu}”</span>}
                                </div>
                              </div>
                              <div className="ed-rozetler">
                                {gitmedi && <span className="badge badge-orange" title="Dosyayı yeniden gönderdiğinizde denetçi görür">Yeni · gönderilmedi</span>}
                                {b.durum !== 'bekliyor' && <span className={`badge ${DURUM_RENK[b.durum]}`}>{b.durum === 'onaylandi' ? 'Onaylandı' : 'İade'}</span>}
                              </div>
                              <div className="ed-aksiyon">
                                <button type="button" className="ed-ikon" aria-label={`${b.dosya_adi} dosyasını aç`} title="Aç" onClick={() => belgeAc(b).catch(hata)}><Eye size={15} /></button>
                                <button type="button" className="ed-ikon" aria-label={`${b.dosya_adi} dosyasını indir`} title="İndir" onClick={() => belgeIndir(b).catch(hata)}><Download size={15} /></button>
                                {acik && b.kaynak === 'yukleme' && b.durum !== 'onaylandi'
                                  ? <button type="button" className="ed-ikon sil" aria-label={`${b.dosya_adi} dosyasını sil`} title="Sil" onClick={() => setSilinecek(b)}><Trash2 size={15} /></button>
                                  : <span className="ed-ikon-bos" aria-hidden="true" />}
                              </div>
                            </li>
                          )
                        })}
                        {mb.length > KISA_LISTE + 1 && (
                          <li>
                            <button type="button" className="ed-daha" onClick={() => setAcikMaddeler(s => { const n = new Set(s); if (n.has(m.id)) n.delete(m.id); else n.add(m.id); return n })}>
                              {acikMaddeler.has(m.id) ? 'Daha az göster' : `+${mb.length - KISA_LISTE} belge daha göster`}
                            </button>
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                  <div style={{ flexShrink: 0, display: 'flex', gap: 6 }}>
                    {m.tip === 'otomatik' ? (
                      <button className="btn btn-secondary btn-sm" onClick={() => onizle(m)} disabled={!!islem} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Eye size={13} /> Önizle
                      </button>
                    ) : acik && (
                      <button className="btn btn-primary btn-sm" onClick={() => yukleSec(m)} disabled={!!islem} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Upload size={13} /> Yükle
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            {maddeler.length === 0 && <div style={{ padding: 24, color: 'var(--text3)' }}>İl denetim evrak listesi henüz tanımlanmamış.</div>}
          </div>
        )}
        <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 12 }}>
          PDF, Excel, Word, fotoğraf veya ZIP yükleyebilirsiniz (dosya başına en fazla 10 MB). Bir maddeye birden fazla dosya eklenebilir.
        </p>
      </div>

      {silinecek && (
        <ConfirmModal mesaj={`"${silinecek.dosya_adi}" silinsin mi?`} onOnayla={() => sil(silinecek)} onIptal={() => setSilinecek(null)} />
      )}
      {gonderOnay && (
        <ConfirmModal baslik="Denetime Gönder" mesaj={gonderOnay} onayMetni="Evet, Gönder" iptalMetni="Vazgeç" tehlikeli={false} onOnayla={gonder} onIptal={() => setGonderOnay(null)} />
      )}
    </div>
  )
}

// Belge satırları: dosya adı ne uzunlukta olursa olsun düğmeler sağda aynı hizada; silme düğmesi sakin, üzerine gelince kırmızı
const ED_CSS = `
.ed-liste { list-style: none; margin: 8px 0 0; padding: 0; border: 1px solid var(--border-light); border-radius: 10px; overflow: hidden; }
.ed-satir { display: grid; grid-template-columns: 16px minmax(0, 1fr) auto auto; align-items: center; gap: 10px; padding: 7px 10px; border-top: 1px solid var(--border-light); }
.ed-satir:first-child { border-top: none; }
.ed-satir:hover { background: var(--surface2); }
.ed-ad { font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ed-meta { font-size: 11.5px; color: var(--text3); margin-top: 1px; }
.ed-rozetler { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.ed-aksiyon { display: flex; gap: 2px; }
.ed-ikon, .ed-ikon-bos { width: 32px; height: 32px; border-radius: 8px; border: none; background: transparent; color: var(--text2);
  display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: background .12s, color .12s; }
.ed-ikon:hover { background: var(--accent-lighter); color: var(--accent); }
.ed-ikon.sil:hover { background: var(--danger-light); color: var(--danger); }
.ed-ikon-bos { cursor: default; }
.ed-daha { width: 100%; padding: 8px 10px; border: none; border-top: 1px solid var(--border-light); background: var(--surface2);
  font: inherit; font-size: 12.5px; font-weight: 600; color: var(--accent); cursor: pointer; text-align: left; }
.ed-daha:hover { background: var(--accent-lighter); }
@media (max-width: 640px) {
  .ed-satir { grid-template-columns: 16px minmax(0, 1fr) auto; }
  .ed-rozetler { grid-column: 2 / -1; justify-content: flex-start; }
}
`
