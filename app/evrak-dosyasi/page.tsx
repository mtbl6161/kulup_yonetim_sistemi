'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
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

  useEffect(() => { load() }, [load])

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

  return (
    <div>
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
                    </div>
                    {m.aciklama && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{m.aciklama}</div>}
                    {m.tip === 'otomatik' && otomatikKopya.length === 0 && (
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Gönderimde sistem verisinden PDF olarak eklenecek.</div>
                    )}
                    {mb.map(b => (
                      <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 12.5, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 500, wordBreak: 'break-all' }}>{b.dosya_adi}</span>
                        <span style={{ color: 'var(--text3)' }}>{boyutFmt(b.boyut)}{b.kaynak === 'otomatik' ? ' · gönderim kopyası' : ''}{m.yillik && (b.yil !== yil || b.ay !== ay) ? ` · ${AYLAR[b.ay]} ${b.yil}'de yüklendi` : ''}</span>
                        {b.durum !== 'bekliyor' && <span className={`badge ${DURUM_RENK[b.durum]}`}>{b.durum === 'onaylandi' ? 'Onaylandı' : 'İade'}</span>}
                        {b.denetci_notu && <span style={{ color: 'var(--danger)' }}>“{b.denetci_notu}”</span>}
                        <button className="btn btn-secondary btn-sm" title="Aç" onClick={() => belgeAc(b).catch(hata)}><Eye size={13} /></button>
                        <button className="btn btn-secondary btn-sm" title="İndir" onClick={() => belgeIndir(b).catch(hata)}><Download size={13} /></button>
                        {acik && b.kaynak === 'yukleme' && b.durum !== 'onaylandi' && (
                          <button className="btn btn-danger btn-sm" title="Sil" onClick={() => setSilinecek(b)}><Trash2 size={13} /></button>
                        )}
                      </div>
                    ))}
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
