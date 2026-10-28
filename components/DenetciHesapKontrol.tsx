'use client'
// Denetçi: bir okulun aylık bordrosunu otomatik denetleyen kontrol ekranı
// ("Kulüp Denetim Programı" Excel'indeki KONTROL EKRANI'nın sistem verisiyle çalışan karşılığı)
import { Fragment, useCallback, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fmt } from '@/lib/hesaplama'
import { hesapKontrolEt, BANKA_TARIH_TOLERANSI, HesapKontrolSonuc, KontrolBulgu, KontrolDurum, KontrolBordro, KisiKontrol } from '@/lib/hesapKontrol'
import { Ayarlar, Personel } from '@/lib/types'
import { AlertTriangle, CheckCircle2, XCircle, Info, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import { useYukleme } from '@/lib/useYukleme'

const RENK: Record<KontrolDurum, { bg: string; fg: string; border: string; ad: string }> = {
  ok: { bg: 'var(--success-light)', fg: '#1a6b34', border: 'var(--success-border)', ad: 'Uygun' },
  uyari: { bg: 'var(--warn-light)', fg: '#8a5a00', border: 'var(--warn-border)', ad: 'Uyarı' },
  hata: { bg: 'var(--danger-light)', fg: 'var(--danger)', border: 'var(--danger-border)', ad: 'Hata' },
  bilgi: { bg: 'var(--info-light)', fg: '#1a5b8a', border: 'var(--info-border)', ad: 'Bilgi' },
}
const IKON: Record<KontrolDurum, typeof Info> = { ok: CheckCircle2, uyari: AlertTriangle, hata: XCircle, bilgi: Info }

function Rozet({ d }: { d: KontrolDurum }) {
  const r = RENK[d]
  const I = IKON[d]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: r.bg, color: r.fg, whiteSpace: 'nowrap' }}>
      <I size={12} aria-hidden="true" /> {r.ad}
    </span>
  )
}

function BulguSatiri({ b }: { b: KontrolBulgu }) {
  const fark = b.beklenen != null && b.bulunan != null ? b.bulunan - b.beklenen : null
  return (
    <li style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13, lineHeight: 1.5 }}>
      <Rozet d={b.durum} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ fontWeight: 700 }}>{b.baslik}</div>
        {b.aciklama && <div style={{ color: 'var(--text)' }}>{b.aciklama}</div>}
        {fark != null && b.beklenen != null && b.bulunan != null && (
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>
            Olması gereken <b>{fmt(b.beklenen)}</b> · Bordroda <b>{fmt(b.bulunan)}</b> · Fark <b style={{ color: Math.abs(fark) > 0.05 ? 'var(--danger)' : undefined }}>{fark > 0 ? '+' : ''}{fmt(fark)}</b>
          </div>
        )}
        {b.kural && <div style={{ fontSize: 12, color: 'var(--text2)' }}><span style={{ fontWeight: 700 }}>Kural:</span> {b.kural}</div>}
        {b.oneri && b.durum !== 'ok' && <div style={{ fontSize: 12, color: RENK[b.durum].fg }}><span style={{ fontWeight: 700 }}>Yapılması gereken:</span> {b.oneri}</div>}
      </div>
    </li>
  )
}

const kart: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }
const baslik: React.CSSProperties = { margin: '0 0 10px', fontSize: 15, fontWeight: 800 }
const th: React.CSSProperties = { fontSize: 10.5, padding: '8px 10px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', textAlign: 'right', whiteSpace: 'nowrap', position: 'sticky', top: 0 }
const thL: React.CSSProperties = { ...th, textAlign: 'left' }
const td: React.CSSProperties = { fontSize: 13, padding: '8px 10px', borderBottom: '1px solid var(--border-light)', textAlign: 'right', whiteSpace: 'nowrap' }
const tdL: React.CSSProperties = { ...td, textAlign: 'left' }
const thAlt: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'none' }
const altSatir: React.CSSProperties = { fontSize: 11.5, fontWeight: 500, color: 'var(--text3)', marginTop: 2 }

/** Bir hücrenin bu alana ait bulgusu varsa renklendir */
function hucre(k: KisiKontrol, basliklar: string[]): React.CSSProperties {
  const b = k.bulgular.filter(x => basliklar.includes(x.baslik))
  if (b.some(x => x.durum === 'hata')) return { ...td, background: 'var(--danger-light)', color: 'var(--danger)', fontWeight: 700 }
  if (b.some(x => x.durum === 'uyari')) return { ...td, background: 'var(--warn-light)', color: '#8a5a00', fontWeight: 700 }
  return td
}

export interface HesapKontrolVeri {
  sonuc: HesapKontrolSonuc | null
  hataMsg: string | null
  yukleniyor: boolean
  yukle: () => void
}

/** Okulun dönem verisini çekip hesap kontrolünü çalıştırır (inceleme başlığındaki özet de bunu kullanır) */
export function useHesapKontrol(okulId: number, yil: number, ay: number): HesapKontrolVeri {
  const [sonuc, setSonuc] = useState<HesapKontrolSonuc | null>(null)
  const [hataMsg, setHataMsg] = useState<string | null>(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const istek = useRef(0) // okul hızlı değiştirilirse eski yanıt yenisinin üstüne yazmasın

  const yukle = useCallback(async () => {
    const no = ++istek.current
    setHataMsg(null)
    setSonuc(null)
    if (!okulId) { setYukleniyor(false); return } // okul seçilmemiş
    setYukleniyor(true)
    try {
      const bas = `${yil}-${String(ay).padStart(2, '0')}-01`
      const sonraki = ay === 12 ? `${yil + 1}-01-01` : `${yil}-${String(ay + 1).padStart(2, '0')}-01`
      // Ayın ilk günü (ya da sonraki ayın ilk günü) ± gün; ay sınırındaki ödemeler komşu ayda bankaya geçebilir
      const ilkGun = (gun: number, sonrakiAy = false) => {
        const d = new Date(Date.UTC(yil, ay - 1 + (sonrakiAy ? 1 : 0), 1 + gun))
        return d.toISOString().slice(0, 10)
      }
      const [ayr, tahs, brd, per, defter] = await Promise.all([
        supabase.from('ayarlar').select('*').eq('okul_id', okulId).maybeSingle(),
        // Kulüp aidatı: bu aya ait olanlar + bu ay yatan başka ay aidatları (bankayla eşleştirme için)
        supabase.from('tahsilat').select('id, ogrenci_id, tutar, tarih, ay, yil').eq('okul_id', okulId)
          .or(`and(ay.eq.${ay},yil.eq.${yil}),and(tarih.gte.${bas},tarih.lt.${sonraki})`),
        supabase.from('bordro').select('*, personel(*)').eq('okul_id', okulId).eq('ay', ay).eq('yil', yil),
        supabase.from('personel').select('*').eq('okul_id', okulId),
        // Banka gelir hareketleri (kırtasiye vb. de bu hesaba girebilir; yalnızca kulüp aidatıyla eşleştirilir)
        supabase.from('isletme_defteri').select('tutar, tarih').eq('okul_id', okulId).eq('birim', 'okul').eq('tur', 'gelir')
          .gte('tarih', ilkGun(-BANKA_TARIH_TOLERANSI)).lt('tarih', ilkGun(BANKA_TARIH_TOLERANSI, true)),
      ])
      const err = ayr.error || tahs.error || brd.error || per.error
      if (err) throw new Error(err.message)
      if (no !== istek.current) return
      if (!ayr.data) { setHataMsg('Okulun ayarları bulunamadı; kontrol yapılamıyor.'); return }

      const tahsilatlar = (tahs.data || []) as { id: number; ogrenci_id: number | null; tutar: number; tarih: string | null; ay: number; yil: number }[]
      const buAy = tahsilatlar.filter(t => t.ay === ay && t.yil === yil)
      const bordroSatirlari = (brd.data || []) as KontrolBordro[]

      // Hesap hareketlerine işlenmiş tahsilatlar ve il içinde aynı T.C. ile başka kulüpte kaydı olan personel
      const tcler = Array.from(new Set(bordroSatirlari.map(b => (b.personel?.tc || '').trim()).filter(Boolean)))
      const ogrIdleri = Array.from(new Set(tahsilatlar.map(t => t.ogrenci_id).filter((x): x is number => x != null)))
      const [har, digerPer, ogr] = await Promise.all([
        buAy.length
          ? supabase.from('hesap_hareketleri').select('kaynak_id').eq('okul_id', okulId).eq('kaynak', 'tahsilat').in('kaynak_id', buAy.map(t => t.id))
          : Promise.resolve({ data: [] as { kaynak_id: number }[], error: null }),
        tcler.length
          ? supabase.from('personel').select('tc, okul_id').in('tc', tcler).neq('okul_id', okulId)
          : Promise.resolve({ data: [] as { tc: string; okul_id: number }[], error: null }),
        ogrIdleri.length
          ? supabase.from('ogrenciler').select('id, ad, soyad').in('id', ogrIdleri)
          : Promise.resolve({ data: [] as { id: number; ad: string; soyad: string }[], error: null }),
      ])
      const ogrAdi = new Map((ogr.data || []).map(o => [o.id, [o.ad, o.soyad].filter(Boolean).join(' ')]))
      const digerOkulIdleri = Array.from(new Set((digerPer.data || []).map(x => x.okul_id)))
      const { data: digerOkullar } = digerOkulIdleri.length
        ? await supabase.from('okullar').select('id, ad').in('id', digerOkulIdleri)
        : { data: [] as { id: number; ad: string }[] }
      const okulAdi = new Map((digerOkullar || []).map(o => [o.id, o.ad]))
      const tcOkullar = new Map<string, string[]>()
      for (const x of digerPer.data || []) {
        const ad = okulAdi.get(x.okul_id) || `Okul #${x.okul_id}`
        const l = tcOkullar.get(x.tc) || []
        if (!l.includes(ad)) l.push(ad)
        tcOkullar.set(x.tc, l)
      }
      const digerOkulKayitlari = new Map<number, string[]>()
      bordroSatirlari.forEach(b => { const l = tcOkullar.get((b.personel?.tc || '').trim()); if (l) digerOkulKayitlari.set(b.personel_id, l) })

      if (no !== istek.current) return
      setSonuc(hesapKontrolEt({
        ayarlar: ayr.data as Ayarlar,
        ay, yil,
        toplamGelir: buAy.reduce((s, t) => s + Number(t.tutar || 0), 0),
        bordro: bordroSatirlari,
        personel: (per.data || []) as Personel[],
        banka: {
          defterGelir: defter.data || [],
          tahsilatlar: tahsilatlar.map(t => ({ ...t, ad: t.ogrenci_id != null ? ogrAdi.get(t.ogrenci_id) : undefined })),
          hareketliTahsilatIdleri: new Set((har.data || []).map(h => Number(h.kaynak_id))),
        },
        digerOkulKayitlari,
      }))
    } catch (e) {
      if (no === istek.current) setHataMsg('Veriler alınamadı: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      if (no === istek.current) setYukleniyor(false)
    }
  }, [okulId, yil, ay])

  useYukleme(yukle)

  return { sonuc, hataMsg, yukleniyor, yukle }
}

export default function DenetciHesapKontrol({ veri }: { veri: HesapKontrolVeri }) {
  const { sonuc, hataMsg, yukleniyor, yukle } = veri
  // Hata/uyarı içeren satırlar varsayılan açık; kullanıcının değiştirdikleri bu kümede tutulur
  const [degisen, setDegisen] = useState<Set<number>>(new Set())
  const [sadeceSorunlu, setSadeceSorunlu] = useState(false)

  if (yukleniyor) return <div style={{ padding: 40, color: 'var(--text3)' }}>⏳ Kontroller yapılıyor...</div>
  if (hataMsg || !sonuc) return <div style={{ padding: 24 }}><div style={{ ...kart, background: 'var(--danger-light)', color: 'var(--danger)' }}>{hataMsg}</div></div>

  const { ozet, genel, dagitim, birimSaat, kisiler, muhtasar } = sonuc
  const gorunenKisiler = sadeceSorunlu ? kisiler.filter(k => k.durum === 'hata' || k.durum === 'uyari') : kisiler
  const toggle = (id: number) => setDegisen(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const acikMi = (k: KisiKontrol) => (k.durum === 'hata' || k.durum === 'uyari') !== degisen.has(k.satir.id)

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--bg)' }}>
      {/* Özet başlıkta; burada yalnızca kapsam ve yenileme */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--text2)' }}>
          Kaydedilmiş bordroya göre · <b style={{ color: 'var(--text)' }}>{ozet.ok} / {kisiler.length}</b> personel sorunsuz
          {(ozet.hata > 0 || ozet.uyari > 0) && <> · {ozet.hata} hata, {ozet.uyari} uyarı (sorunlu personelin ayrıntısı açık)</>}
        </span>
        <button type="button" onClick={yukle} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text)' }}>
          <RefreshCw size={14} aria-hidden="true" /> Yeniden kontrol et
        </button>
      </div>

      {/* Genel kontroller */}
      <section style={kart} aria-labelledby="hk-genel">
        <h2 id="hk-genel" style={baslik}>Genel kontroller</h2>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{genel.map((b, i) => <BulguSatiri key={i} b={b} />)}</ul>
      </section>

      {/* Dağıtım */}
      <section style={kart} aria-labelledby="hk-dagitim">
        <h2 id="hk-dagitim" style={baslik}>Gider kalemleri dağıtımı</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={thL}>Kalem</th><th style={th}>Oran</th><th style={th}>Havuz (olması gereken)</th>
              <th style={th}>Bordroda dağıtılan</th><th style={th}>Kalan</th><th style={th}>Kişi</th><th style={thL}>Durum</th>
            </tr></thead>
            <tbody>
              {dagitim.map(x => (
                <tr key={x.kategori}>
                  <td style={tdL}>{x.ad}</td>
                  <td style={td}>%{x.oran}</td>
                  <td style={td}>{fmt(x.havuz)}</td>
                  <td style={td}>{x.kategori === 'temel_gider' ? '—' : fmt(x.dagitilan)}</td>
                  <td style={{ ...td, color: x.kategori !== 'temel_gider' && x.havuz - x.dagitilan < -1 ? 'var(--danger)' : undefined }}>
                    {x.kategori === 'temel_gider' ? '—' : fmt(x.havuz - x.dagitilan)}
                  </td>
                  <td style={td}>{x.kategori === 'temel_gider' ? '—' : x.kisi}</td>
                  <td style={tdL}>{x.kategori === 'temel_gider' ? <span style={{ fontSize: 12, color: 'var(--text2)' }}>Okulda kalan: <b>{fmt(x.dagitilan)} TL</b> (temel gider + dağıtılamayan paylar)</span> : <Rozet d={x.durum} />}</td>
                </tr>
              ))}
              <tr>
                <td style={{ ...tdL, fontWeight: 800 }}>Toplam tahsilat</td><td style={td} />
                <td style={{ ...td, fontWeight: 800 }}>{fmt(sonuc.toplamGelir)}</td><td colSpan={4} style={td} />
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text2)', display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <span>Öğretmen birim saat ücreti: <b style={{ color: 'var(--text)' }}>{fmt(birimSaat.beklenen)} TL</b>
            {birimSaat.manuel ? ' (ayarlarda elle girilmiş)' : ` (= ${fmt(birimSaat.havuz)} ÷ ${birimSaat.toplamSaat} saat, küsurat atılır)`}</span>
          <span>Tavan esası (en yüksek devlet memuru brüt aylığı): <b style={{ color: 'var(--text)' }}>{fmt(sonuc.tavanKatsayi)} TL</b></span>
        </div>
      </section>

      {/* Personel */}
      <section style={kart} aria-labelledby="hk-personel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
          <h2 id="hk-personel" style={{ ...baslik, margin: 0 }}>Personel kontrolü</h2>
          <label style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={sadeceSorunlu} onChange={e => setSadeceSorunlu(e.target.checked)} /> Yalnızca sorunlu satırlar
          </label>
        </div>
        {kisiler.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text3)' }}>Bordro kaydı yok.</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={thL} aria-label="Ayrıntı" /><th style={thL}>Personel</th>
                <th style={th}>Bordro brüt<div style={thAlt}>gereken · tavan</div></th>
                <th style={th}>SGK + işsizlik</th>
                <th style={th}>GV matrahı<div style={thAlt}>GV oranı</div></th>
                <th style={th}>İstisna / sınır<div style={thAlt}>GV · DV</div></th>
                <th style={th}>Net</th><th style={thL}>Durum</th>
              </tr></thead>
              <tbody>
                {gorunenKisiler.map(k => {
                  const b = k.satir
                  const ac = acikMi(k)
                  const sorunlu = k.bulgular.some(x => x.durum !== 'ok')
                  const denetim = k.kategori === 'denetim'
                  return (
                    <Fragment key={b.id}>
                      <tr style={{ cursor: sorunlu ? 'pointer' : undefined }} onClick={() => sorunlu && toggle(b.id)}>
                        <td style={{ ...tdL, width: 24, paddingRight: 0 }}>
                          {sorunlu && <button type="button" aria-expanded={ac} aria-label={`${k.ad} bulguları`} onClick={e => { e.stopPropagation(); toggle(b.id) }}
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, color: 'var(--text2)', display: 'flex' }}>
                            {ac ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          </button>}
                        </td>
                        <td style={{ ...tdL, whiteSpace: 'normal', minWidth: 160 }}>
                          <div style={{ fontWeight: 700 }}>
                            {k.ad}
                            {k.baskaKurum.length > 0 && (
                              <span title={k.baskaKurum.join(' · ')} style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: 'var(--info-light)', color: '#1a5b8a', whiteSpace: 'nowrap' }}>
                                Başka kurum?
                              </span>
                            )}
                          </div>
                          <div style={altSatir}>
                            {k.gorev}{k.kategori === 'ogretmen' ? ` · ${b.toplam_saat} saat` : ''}{b.personel?.sgk_li ? " · SGK'lı" : ''}
                          </div>
                        </td>
                        <td style={hucre(k, ['Tavan aşılmış', 'Olması gerekenden fazla ödeme', 'Olması gerekenden az ödeme', 'Aynı kişiye birden fazla görevden ödeme'])}>
                          {fmt(b.brut)}
                          <div style={altSatir}>{k.kategori === 'diger' ? '—' : fmt(k.beklenenBrut)} · {fmt(k.tavan)}</div>
                        </td>
                        <td style={hucre(k, ['SGK işçi payı hatalı', 'İşsizlik sigortası işçi payı hatalı', 'Kadrolu personelden SGK kesintisi'])}>{fmt(k.sgkToplam)}</td>
                        <td style={hucre(k, ['Gelir vergisi matrahı hatalı', 'Gelir vergisi oranı dilim dışında', 'Gelir vergisi hesaplanmamış', 'Bordrodaki vergi oranı geçersiz'])}>
                          {denetim ? '—' : fmt(b.gv_matrah)}
                          <div style={altSatir}>{k.efektifGvOrani == null ? '—' : `%${(k.efektifGvOrani * 100).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}</div>
                        </td>
                        <td style={hucre(k, ['Gelir vergisi istisnası fazla uygulanmış', 'Damga vergisi istisnası fazla uygulanmış', 'Damga vergisi hatalı'])}>
                          {denetim ? '—' : <>
                            <div>GV {fmt(b.gv_istisna_tutari)} / {fmt(k.gvIstisnaSiniri)}</div>
                            <div>DV {fmt(b.dv_istisna_tutari)} / {fmt(k.dvIstisnaSiniri)}</div>
                          </>}
                        </td>
                        <td style={{ ...hucre(k, ['Net ödenen tutmuyor', 'Toplam kesinti tutmuyor', 'Kesilen gelir vergisi tutmuyor', 'Kesilen damga vergisi tutmuyor', 'Denetim yetkilisinden kesinti yapılmış']), fontWeight: 700 }}>{fmt(b.net)}</td>
                        <td style={tdL}><Rozet d={k.durum} /></td>
                      </tr>
                      {ac && (
                        <tr>
                          <td colSpan={8} style={{ padding: '4px 16px 10px 40px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{k.bulgular.map((x, i) => <BulguSatiri key={i} b={x} />)}</ul>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--text3)' }}>
          GV oranı, hesaplanan gelir vergisinin matraha oranıdır; kümülatif matraha göre vergi dilimleri aralığında olmalıdır.
          İstisna sınırı asgari ücrete isabet eden aylık tutardır (personele özel tutar tanımlıysa o tutar).
        </p>
      </section>

      {/* Muhtasar */}
      <section style={kart} aria-labelledby="hk-muhtasar">
        <h2 id="hk-muhtasar" style={baslik}>Muhtasar beyanname özeti</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
          {([
            ['Toplam brüt', muhtasar.brut], ['GV matrahı', muhtasar.gvMatrah], ['Hesaplanan GV', muhtasar.gvHesaplanan],
            ['GV istisnası', muhtasar.gvIstisna], ['Ödenecek GV', muhtasar.gv], ['Hesaplanan DV', muhtasar.dvHesaplanan],
            ['DV istisnası', muhtasar.dvIstisna], ['Ödenecek DV', muhtasar.dv], ['SGK işçi payı', muhtasar.sgkKisi],
            ['İşsizlik işçi payı', muhtasar.sgkIssizlik], ['SGK işveren payı', muhtasar.sgkIsveren], ['Toplam net', muhtasar.net],
          ] as [string, number][]).map(([ad, v]) => (
            <div key={ad} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--surface2)' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase' }}>{ad}</div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{fmt(v)} ₺</div>
            </div>
          ))}
          <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--surface2)' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase' }}>Çalışan sayısı</div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{muhtasar.sgkliSayisi} SGK&apos;lı · {muhtasar.kadroluSayisi} kadrolu</div>
          </div>
        </div>
      </section>
    </div>
  )
}
