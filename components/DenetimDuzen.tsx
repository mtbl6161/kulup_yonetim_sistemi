'use client'
// Denetim paneli düzeni: üst bar, Okullar sayfası ve okul inceleme başlığı (karar + özet + sekmeler).
// Okul açıkken ekranda tek sütun vardır; dosya kararı her sekmede başlıkta durur.
import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AYLAR } from '@/lib/hesaplama'
import { DenetimTeslim } from '@/lib/denetimDosyasi'
import { HesapKontrolSonuc } from '@/lib/hesapKontrol'
import { HesapKontrolVeri } from '@/components/DenetciHesapKontrol'
import { DurumRozeti, OkulDonemDurumu, donemSecenekleri } from '@/components/DenetimPanel'
import {
  Inbox, Building2, ScrollText, Settings, LogOut, Search, RefreshCw, ArrowLeft, ChevronLeft, ChevronRight,
  CheckCircle2, Undo2, FolderOpen, ShieldCheck, Database, ArrowRight, Clock,
} from 'lucide-react'

export type Bolum = 'kuyruk' | 'okullar' | 'kayitlar' | 'ayarlar'
export type OkulSekme = 'evrak' | 'hesap' | 'veri'

const btn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
const btnOnay: React.CSSProperties = { ...btn, background: '#2d6a3e', color: '#ffffff', border: 'none' }
const btnIade: React.CSSProperties = { ...btn, color: '#9a3412', borderColor: '#e8b48f' }

function gunFarki(iso?: string | null): number {
  if (!iso) return 0
  // Takvim günü farkı (yerel saat): dün 23:00 → 1, bugün 08:00 → 0
  const gun = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.round((gun(new Date()) - gun(new Date(iso))) / 86400000)
}
function goreceTarih(iso?: string | null) {
  if (!iso) return '—'
  const g = gunFarki(iso)
  return g <= 0 ? 'bugün' : g === 1 ? 'dün' : `${g} gün önce`
}

// ============================================================
// Üst bar
// ============================================================
export function DenetimUstBar({ bolum, onBolum, donem, onDonem, bekleyen, ilAd, kullaniciAd, onCikis }: {
  bolum: Bolum; onBolum: (b: Bolum) => void
  donem: string; onDonem: (k: string) => void
  bekleyen: number; ilAd?: string; kullaniciAd?: string; onCikis: () => void
}) {
  const ogeler: { id: Bolum; ad: string; icon: typeof Inbox }[] = [
    { id: 'kuyruk', ad: 'İş Kuyruğu', icon: Inbox },
    { id: 'okullar', ad: 'Okullar', icon: Building2 },
    { id: 'kayitlar', ad: 'Kayıtlar', icon: ScrollText },
    { id: 'ayarlar', ad: 'Ayarlar', icon: Settings },
  ]
  return (
    <header style={{ flexShrink: 0, background: '#1f3a2a', color: '#e8efe9', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px 18px', padding: '10px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div aria-hidden="true" style={{ width: 30, height: 30, borderRadius: 8, background: '#e9b44c', color: '#1f3a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>K</div>
        <div style={{ lineHeight: 1.15 }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Kulüp360</div>
          <div style={{ fontSize: 10, color: '#b7cbbd', letterSpacing: 1.1, fontWeight: 700 }}>DENETİM</div>
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#b7cbbd', fontWeight: 700 }}>
        <span style={{ letterSpacing: 0.5 }}>DÖNEM</span>
        <select value={donem} onChange={e => onDonem(e.target.value)}
          style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #3d6650', background: '#2a4a37', color: '#ffffff', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
          {donemSecenekleri().map(d => <option key={d.key} value={d.key}>{d.ad}</option>)}
        </select>
      </label>

      <nav aria-label="Denetim menüsü" style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {ogeler.map(o => {
          const aktif = bolum === o.id
          return (
            <button key={o.id} type="button" onClick={() => onBolum(o.id)} aria-current={aktif ? 'page' : undefined}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', borderRadius: 9, border: 'none', cursor: 'pointer',
                background: aktif ? '#2f5440' : 'transparent', color: aktif ? '#ffffff' : '#d4e2d8', fontWeight: aktif ? 700 : 500, fontSize: 13.5, fontFamily: 'inherit' }}>
              <o.icon size={15} aria-hidden="true" />
              {o.ad}
              {o.id === 'kuyruk' && bekleyen > 0 && (
                <span style={{ background: '#e9b44c', color: '#1f3a2a', borderRadius: 20, padding: '0 7px', fontSize: 11.5, fontWeight: 800 }}>{bekleyen}</span>
              )}
            </button>
          )
        })}
      </nav>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ textAlign: 'right', lineHeight: 1.2, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{kullaniciAd || 'Denetim yetkilisi'}</div>
          {ilAd && <div style={{ fontSize: 11, color: '#b7cbbd' }}>{ilAd} İl MEM</div>}
        </div>
        <button type="button" onClick={onCikis} aria-label="Çıkış yap" title="Çıkış"
          style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid #3d6650', background: 'transparent', color: '#f3c9c3', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <LogOut size={15} />
        </button>
      </div>
    </header>
  )
}

// ============================================================
// Okullar sayfası (ildeki tüm okullar)
// ============================================================
type OkulFiltre = 'tum' | 'gonderildi' | 'iade' | 'yok' | 'onaylandi'

export function DenetimOkullar({ okullar, durumlar, toplamMadde, yukleniyor, yil, ay, ilceler, filtreIlceId, onIlce, onIncele, onYenile }: {
  okullar: { id: number; ad: string; ogrenci_sayisi?: number; personel_sayisi?: number; son_islem?: string }[]
  durumlar: Map<number, OkulDonemDurumu>; toplamMadde: number; yukleniyor: boolean
  yil: number; ay: number
  ilceler: { id: number; ad: string }[]; filtreIlceId: number | null; onIlce: (id: number | null) => void
  onIncele: (okulId: number, liste: number[]) => void; onYenile: () => void
}) {
  const [ara, setAra] = useState('')
  const [filtre, setFiltre] = useState<OkulFiltre>('tum')

  const satirlar = useMemo(() => okullar.map(o => {
    const d = durumlar.get(o.id)
    const t = d?.teslim?.durum
    const grup: Exclude<OkulFiltre, 'tum'> = t === 'gonderildi' ? 'gonderildi' : t === 'iade' ? 'iade' : t === 'onaylandi' ? 'onaylandi' : 'yok'
    return { ...o, d, grup }
  }), [okullar, durumlar])

  const say = (f: OkulFiltre) => f === 'tum' ? satirlar.length : satirlar.filter(s => s.grup === f).length
  const q = ara.trim().toLocaleLowerCase('tr-TR')
  const liste = satirlar
    .filter(s => (filtre === 'tum' || s.grup === filtre) && (!q || s.ad.toLocaleLowerCase('tr-TR').includes(q)))
    .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'))
  const idler = liste.map(s => s.id)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>{AYLAR[ay]} {yil}</div>
          <h1 style={{ margin: '2px 0 0', fontSize: 24, fontWeight: 800 }}>Okullar</h1>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={14} aria-hidden="true" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input type="search" aria-label="Okul ara" value={ara} onChange={e => setAra(e.target.value)} placeholder="Okul ara"
            style={{ width: 220, padding: '9px 12px 9px 30px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 14, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)' }} />
        </div>
        <select aria-label="İlçe" value={filtreIlceId || ''} onChange={e => onIlce(e.target.value ? Number(e.target.value) : null)}
          style={{ padding: '9px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 14, fontFamily: 'inherit', color: 'var(--text)' }}>
          <option value="">Tüm ilçeler</option>
          {ilceler.map(i => <option key={i.id} value={i.id}>{i.ad}</option>)}
        </select>
        <button type="button" onClick={onYenile} aria-label="Yenile" title="Yenile" style={{ ...btn, padding: 10 }}>
          <RefreshCw size={15} className={yukleniyor ? 'animate-spin' : ''} />
        </button>
      </header>

      <div role="group" aria-label="Durum filtresi" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {([['tum', 'Tümü'], ['gonderildi', 'Denetimde'], ['iade', 'İade edildi'], ['yok', 'Göndermedi'], ['onaylandi', 'Onaylandı']] as [OkulFiltre, string][]).map(([f, ad]) => (
          <button key={f} type="button" onClick={() => setFiltre(f)} aria-pressed={filtre === f}
            style={{ padding: '6px 12px', borderRadius: 20, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', fontWeight: filtre === f ? 700 : 500,
              border: filtre === f ? 'none' : '1px solid var(--border)', background: filtre === f ? '#1f3a2a' : 'var(--surface)', color: filtre === f ? '#ffffff' : 'var(--text2)' }}>
            {ad} ({say(f)})
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 720 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text2)', fontSize: 12 }}>
              <th scope="col" style={{ padding: '10px 18px', fontWeight: 600 }}>Okul</th>
              <th scope="col" style={{ padding: '10px 8px', fontWeight: 600 }}>Evrak</th>
              <th scope="col" style={{ padding: '10px 8px', fontWeight: 600 }}>Durum</th>
              <th scope="col" style={{ padding: '10px 8px', fontWeight: 600 }}>Gönderim</th>
              <th scope="col" style={{ padding: '10px 8px', fontWeight: 600 }}>Son işlem</th>
              <th scope="col" style={{ padding: '10px 18px' }}><span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>İşlem</span></th>
            </tr>
          </thead>
          <tbody>
            {liste.map(s => {
              const oran = toplamMadde ? Math.min(1, (s.d?.doluMadde || 0) / toplamMadde) : 0
              return (
                <tr key={s.id} style={{ borderTop: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '12px 18px' }}>
                    <div style={{ fontWeight: 600 }}>{s.ad}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{s.ogrenci_sayisi ?? 0} öğrenci · {s.personel_sayisi ?? 0} personel</div>
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 80, height: 6, borderRadius: 6, background: 'var(--surface2)' }} aria-hidden="true">
                        <div style={{ width: `${oran * 100}%`, height: 6, borderRadius: 6, background: oran >= 1 ? '#2347D9' : '#c98a2e' }} />
                      </div>
                      <span style={{ fontSize: 12 }}>{s.d?.doluMadde || 0}/{toplamMadde}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 8px' }}><DurumRozeti durum={s.d?.teslim?.durum} /></td>
                  <td style={{ padding: '12px 8px', fontSize: 13, color: 'var(--text2)' }}>{s.d?.teslim?.gonderim_tarihi ? goreceTarih(s.d.teslim.gonderim_tarihi) : '—'}</td>
                  <td style={{ padding: '12px 8px', fontSize: 13, color: 'var(--text2)' }}>{goreceTarih(s.son_islem)}</td>
                  <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                    <button type="button" onClick={() => onIncele(s.id, idler)} style={{ ...btn, padding: '7px 14px', background: s.grup === 'gonderildi' ? 'var(--accent)' : 'var(--surface2)', color: s.grup === 'gonderildi' ? '#ffffff' : 'var(--text)', border: 'none' }}>
                      {s.grup === 'gonderildi' ? 'İncele' : 'Aç'}
                    </button>
                  </td>
                </tr>
              )
            })}
            {liste.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>{yukleniyor ? 'Yükleniyor...' : 'Okul bulunamadı.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================
// Okul inceleme başlığı: geri, gezinme, dosya kararı, özet şeridi, sekmeler
// ============================================================

/** Hesap kontrolü bulgularını okula gidecek iade notu metnine çevirir */
export function bulgulardanNot(s: HesapKontrolSonuc): string {
  // Okul notu okurken neyin yanlış olduğunu ve ne yapacağını görsün: bulgu + yapılması gereken
  const satir = (b: { baslik: string; aciklama?: string; oneri?: string }, kisi?: string) =>
    `- ${kisi ? kisi + ' — ' : ''}${b.baslik}: ${b.aciklama || ''}${b.oneri ? ` Yapılması gereken: ${b.oneri}` : ''}`
  const sorunlu = (d: string) => d === 'hata' || d === 'uyari'
  const genel = s.genel.filter(b => sorunlu(b.durum)).map(b => satir(b))
  const kisi = s.kisiler.flatMap(k => k.bulgular.filter(b => sorunlu(b.durum)).map(b => satir(b, k.ad)))
  return [...genel, ...kisi].join('\n')
}

export function OkulIncelemeBasligi({ okulId, okulAd, yil, ay, durum, toplamMadde, hesap, sekme, onSekme, geriAd, onGeri, gezinme, onKararVerildi }: {
  okulId: number; okulAd: string; yil: number; ay: number
  durum?: OkulDonemDurumu; toplamMadde: number
  hesap: HesapKontrolVeri
  sekme: OkulSekme; onSekme: (s: OkulSekme) => void
  geriAd: string; onGeri: () => void
  gezinme: { sira: number; toplam: number; onOnceki?: () => void; onSonraki?: () => void }
  onKararVerildi: () => void
}) {
  const teslim: DenetimTeslim | null = durum?.teslim || null
  const t = teslim?.durum
  const [iadeNot, setIadeNot] = useState<string | null>(null) // açıkken: dosya iade notu
  const [islem, setIslem] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ tip: 'ok' | 'hata'; text: string } | null>(null)

  async function karar(yeni: 'onaylandi' | 'iade', not = '') {
    if (!teslim) return
    if (yeni === 'iade' && !not.trim()) { setMsg({ tip: 'hata', text: 'İade için okula bir açıklama yazın.' }); return }
    setIslem(yeni === 'onaylandi' ? 'Onaylanıyor...' : 'İade ediliyor...')
    setMsg(null)
    try {
      if (yeni === 'onaylandi') {
        // Karar bekleyen bu dönem belgeleri dosyayla birlikte onaylanır
        const { error } = await supabase.from('denetim_belgeleri').update({ durum: 'onaylandi' })
          .eq('okul_id', okulId).eq('yil', yil).eq('ay', ay).eq('durum', 'bekliyor')
        if (error) throw error
      }
      const { error } = await supabase.rpc('denetim_karar', { p_teslim_id: teslim.id, p_durum: yeni, p_not: not })
      if (error) throw error
      setIadeNot(null)
      setMsg({ tip: 'ok', text: yeni === 'onaylandi' ? 'Dosya onaylandı.' : 'Dosya okula iade edildi.' })
      onKararVerildi()
    } catch (e) {
      setMsg({ tip: 'hata', text: (e as Error)?.message || String(e) })
    } finally { setIslem(null) }
  }

  const s = hesap.sonuc
  const hata = s?.ozet.hata ?? 0
  const uyari = s?.ozet.uyari ?? 0
  const dolu = durum?.doluMadde ?? 0
  const bekleme = gunFarki(teslim?.gonderim_tarihi)

  const ozetKart = (hedef: OkulSekme, baslik: string, deger: string, alt: string, ton: 'notr' | 'ok' | 'uyari' | 'hata') => {
    const renk = { notr: ['var(--surface2)', 'var(--text)', 'var(--text2)'], ok: ['var(--success-light)', '#1a6b34', '#1a6b34'], uyari: ['var(--warn-light)', '#8a5a00', '#8a5a00'], hata: ['var(--danger-light)', 'var(--danger)', 'var(--danger)'] }[ton]
    return (
      <button type="button" onClick={() => onSekme(hedef)}
        style={{ flex: '1 1 170px', textAlign: 'left', background: renk[0], border: '1px solid transparent', borderRadius: 10, padding: '7px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
        <div style={{ fontSize: 11.5, color: renk[2], fontWeight: 600 }}>{baslik}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: renk[1] }}>{deger}</span>
          <span style={{ fontSize: 12, color: renk[2] }}>{alt}</span>
        </div>
      </button>
    )
  }

  const sekmeler: { id: OkulSekme; ad: string; icon: typeof Inbox; rozet?: number }[] = [
    { id: 'evrak', ad: 'Evrak', icon: FolderOpen },
    { id: 'hesap', ad: 'Hesap Kontrolü', icon: ShieldCheck, rozet: hata || undefined },
    { id: 'veri', ad: 'Okul Verileri', icon: Database },
  ]

  return (
    <div style={{ flexShrink: 0, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 24px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Satır 1: geri · okul · durum · gezinme | karar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button type="button" onClick={onGeri} style={{ ...btn, padding: '7px 10px', background: 'var(--surface2)', border: 'none' }}>
          <ArrowLeft size={14} aria-hidden="true" /> {geriAd}
        </button>
        <h1 style={{ margin: 0, fontSize: 21, fontWeight: 800 }}>{okulAd}</h1>
        <DurumRozeti durum={t} />
        {t === 'gonderildi' && teslim?.gonderim_tarihi && (
          <span title={new Date(teslim.gonderim_tarihi).toLocaleString('tr-TR')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, fontSize: 13,
              background: bekleme >= 3 ? 'var(--warn-light)' : 'var(--surface2)', color: bekleme >= 3 ? '#8a5a00' : 'var(--text)' }}>
            <Clock size={14} aria-hidden="true" />
            <span>
              <b>{bekleme <= 0 ? 'Bugün' : bekleme === 1 ? 'Dün' : `${bekleme} gün önce`}</b> gönderildi
              <span style={{ color: bekleme >= 3 ? '#8a5a00' : 'var(--text2)' }}> · {new Date(teslim.gonderim_tarihi).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
              {bekleme >= 3 && <b> · incelenmeyi bekliyor</b>}
            </span>
          </span>
        )}
        {gezinme.toplam > 1 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12.5, color: 'var(--text2)' }}>
            <button type="button" aria-label="Önceki okul" disabled={!gezinme.onOnceki} onClick={gezinme.onOnceki}
              style={{ ...btn, padding: 5, border: 'none', background: 'transparent', opacity: gezinme.onOnceki ? 1 : 0.35 }}><ChevronLeft size={16} /></button>
            {gezinme.sira} / {gezinme.toplam}
            <button type="button" aria-label="Sonraki okul" disabled={!gezinme.onSonraki} onClick={gezinme.onSonraki}
              style={{ ...btn, padding: 5, border: 'none', background: 'transparent', opacity: gezinme.onSonraki ? 1 : 0.35 }}><ChevronRight size={16} /></button>
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {(t === 'gonderildi' || t === 'onaylandi') ? (
            <>
              <button type="button" style={btnIade} disabled={!!islem} onClick={() => setIadeNot(n => n === null ? (teslim?.denetci_notu || '') : null)} aria-expanded={iadeNot !== null}>
                <Undo2 size={14} aria-hidden="true" /> {t === 'onaylandi' ? 'Onayı geri al, iade et' : 'İade et'}
              </button>
              {t === 'gonderildi' && (
                <button type="button" style={btnOnay} disabled={!!islem} onClick={() => karar('onaylandi')}>
                  <CheckCircle2 size={14} aria-hidden="true" /> Dosyayı onayla
                </button>
              )}
            </>
          ) : (
            <span style={{ fontSize: 12.5, color: 'var(--text3)' }}>
              {t === 'iade' ? 'Okulun düzeltip yeniden göndermesi bekleniyor' : 'Okul bu dosyayı henüz göndermedi'}
            </span>
          )}
        </div>
      </div>

      {iadeNot !== null && (
        <div style={{ padding: 14, borderRadius: 12, border: '1px solid #e8b48f', background: '#fff8f1', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label htmlFor="dosyaIadeNot" style={{ fontSize: 13, fontWeight: 700, color: '#7a3a12' }}>Okula iade notu (okulun ekranında görünür)</label>
          <textarea id="dosyaIadeNot" autoFocus value={iadeNot} onChange={e => setIadeNot(e.target.value)} rows={4}
            style={{ padding: 10, borderRadius: 10, border: '1px solid var(--border)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {s && (hata > 0 || uyari > 0) && (
              <button type="button" style={btn} onClick={() => setIadeNot(n => [n?.trim(), 'Hesap kontrolü bulguları:', bulgulardanNot(s)].filter(Boolean).join('\n'))}>
                <ShieldCheck size={14} aria-hidden="true" /> Hesap kontrolü bulgularını ekle
              </button>
            )}
            <span style={{ flex: 1 }} />
            <button type="button" style={btn} onClick={() => setIadeNot(null)}>Vazgeç</button>
            <button type="button" style={{ ...btnIade, background: '#9a3412', color: '#ffffff', border: 'none' }} disabled={!!islem} onClick={() => karar('iade', iadeNot)}>
              <Undo2 size={14} aria-hidden="true" /> İade et
            </button>
          </div>
        </div>
      )}

      {(msg || islem) && (
        <div role="status" style={{ padding: '10px 12px', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10,
          background: islem ? 'var(--info-light)' : msg?.tip === 'ok' ? 'var(--success-light)' : 'var(--danger-light)', color: islem ? '#1a5b8a' : msg?.tip === 'ok' ? '#1a6b34' : 'var(--danger)' }}>
          <span style={{ flex: 1 }}>{islem || msg?.text}</span>
          {!islem && msg?.tip === 'ok' && gezinme.onSonraki && (
            <button type="button" style={btnOnay} onClick={gezinme.onSonraki}>Sıradaki okul <ArrowRight size={14} aria-hidden="true" /></button>
          )}
        </div>
      )}

      {/* Satır 2: özet şeridi */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {ozetKart('evrak', 'Evrak', `${dolu} / ${toplamMadde}`, dolu >= toplamMadde ? 'tüm maddeler dolu' : `${toplamMadde - dolu} madde boş`, dolu >= toplamMadde && toplamMadde > 0 ? 'ok' : 'notr')}
        {ozetKart('hesap', 'Hesap kontrolü',
          hesap.yukleniyor ? '…' : !s ? '—' : hata ? `${hata} hata` : uyari ? `${uyari} uyarı` : 'Sorun yok',
          hesap.yukleniyor ? 'kontrol ediliyor' : !s ? (hesap.hataMsg ? 'kontrol yapılamadı' : '') : hata && uyari ? `${uyari} uyarı` : `${s.kisiler.length} personel`,
          !s ? 'notr' : hata ? 'hata' : uyari ? 'uyari' : 'ok')}
      </div>

      {/* Satır 3: sekmeler */}
      <nav aria-label="İnceleme sekmeleri" style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {sekmeler.map(x => (
          <button key={x.id} type="button" onClick={() => onSekme(x.id)} aria-current={sekme === x.id ? 'page' : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 14, fontWeight: sekme === x.id ? 700 : 500, fontFamily: 'inherit',
              color: sekme === x.id ? 'var(--accent)' : 'var(--text2)', borderBottom: sekme === x.id ? '2px solid var(--accent)' : '2px solid transparent' }}>
            <x.icon size={14} aria-hidden="true" /> {x.ad}
            {x.rozet ? <span style={{ background: 'var(--danger)', color: '#ffffff', borderRadius: 20, padding: '0 7px', fontSize: 11, fontWeight: 800 }}>{x.rozet}</span> : null}
          </button>
        ))}
      </nav>
    </div>
  )
}

/** Okul Verileri sekmesindeki alt seçim (ham, salt okunur veriler) */
export type VeriSekme = 'bordro' | 'bilanco' | 'ders-programi' | 'sinif-defteri'
export function VeriSecici({ secili, onSec }: { secili: VeriSekme; onSec: (v: VeriSekme) => void }) {
  const ogeler: [VeriSekme, string][] = [['bordro', 'Bordro'], ['bilanco', 'Bilanço'], ['ders-programi', 'Ders Programı'], ['sinif-defteri', 'Sınıf Defteri']]
  return (
    <div role="group" aria-label="Okul verisi" style={{ display: 'inline-flex', gap: 2, padding: 3, borderRadius: 10, background: 'var(--surface2)' }}>
      {ogeler.map(([id, ad]) => (
        <button key={id} type="button" onClick={() => onSec(id)} aria-pressed={secili === id}
          style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: secili === id ? 700 : 500,
            background: secili === id ? 'var(--surface)' : 'transparent', color: secili === id ? 'var(--text)' : 'var(--text2)', boxShadow: secili === id ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}>
          {ad}
        </button>
      ))}
    </div>
  )
}
