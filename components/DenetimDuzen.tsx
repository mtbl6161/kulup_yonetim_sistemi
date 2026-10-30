'use client'
// Denetim paneli düzeni: kabuk (yan menü + üst başlık), Okullar sayfası ve okul inceleme başlığı (karar + özet + sekmeler).
// Okul açıkken ekranda tek sütun vardır; dosya kararı her sekmede başlıkta durur, tablolar başlığın hemen altından başlar.
import { useMemo, useState } from 'react'
import { BrandMark } from '@/components/brand/Logo'
import { KABUK_STIL } from '@/components/yonetim/kabukStil'
import { Filtre } from '@/components/yonetim/ortak'
import { useDegisince } from '@/lib/useDegisince'
import { supabase } from '@/lib/supabase'
import { DenetimTeslim } from '@/lib/denetimDosyasi'
import { HesapKontrolSonuc } from '@/lib/hesapKontrol'
import { HesapKontrolVeri } from '@/components/DenetciHesapKontrol'
import { DurumRozeti, EvrakIlerleme, OkulDonemDurumu, donemSecenekleri } from '@/components/DenetimPanel'
import {
  Inbox, Building2, ScrollText, Settings, LogOut, Search, RefreshCw, ArrowLeft, ChevronLeft, ChevronRight,
  CheckCircle2, Undo2, FolderOpen, ShieldCheck, Database, ArrowRight, Clock, Menu, X,
} from 'lucide-react'

export type Bolum = 'kuyruk' | 'okullar' | 'kayitlar' | 'ayarlar'
export type OkulSekme = 'evrak' | 'hesap' | 'veri'

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
// Kabuk: yönetim konsoluyla aynı koyu yan menü, üst başlık (dönem seçimi) ve dar ekran çekmecesi
// ============================================================
const MENU: { id: Bolum; ad: string; icon: typeof Inbox }[] = [
  { id: 'kuyruk', ad: 'İş kuyruğu', icon: Inbox },
  { id: 'okullar', ad: 'Okullar', icon: Building2 },
  { id: 'kayitlar', ad: 'Kayıtlar', icon: ScrollText },
  { id: 'ayarlar', ad: 'Ayarlar', icon: Settings },
]

export function DenetimKabuk({ bolum, onBolum, donem, onDonem, bekleyen, ilAd, kullaniciAd, onCikis, baslik, alt, children }: {
  bolum: Bolum; onBolum: (b: Bolum) => void
  donem: string; onDonem: (k: string) => void
  bekleyen: number; ilAd?: string; kullaniciAd?: string; onCikis: () => void
  baslik: string; alt?: string
  children: React.ReactNode
}) {
  const [acik, setAcik] = useState(false)
  useDegisince(bolum, () => setAcik(false))
  const ad = kullaniciAd || 'Denetim yetkilisi'
  const basHarf = ad.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toLocaleUpperCase('tr-TR')

  return (
    <div className="yk yk-sabit">
      <style>{KABUK_STIL + DENETIM_STIL}</style>
      <aside className={`yk-menu${acik ? ' acik' : ''}`} aria-label="Denetim menüsü">
        <div className="yk-marka">
          <BrandMark size={30} />
          <div><strong>Klüp360</strong><span>Denetim paneli</span></div>
          <button type="button" className="yk-kapat" onClick={() => setAcik(false)} aria-label="Menüyü kapat"><X size={18} /></button>
        </div>
        <nav>
          <div className="yk-grup">{ilAd ? `${ilAd} İl MEM` : 'Denetim'}</div>
          {MENU.map(o => (
            <button key={o.id} type="button" className={`yk-oge${bolum === o.id ? ' on' : ''}`} aria-current={bolum === o.id ? 'page' : undefined} onClick={() => onBolum(o.id)}>
              <o.icon size={16} aria-hidden="true" />
              <span>{o.ad}</span>
              {o.id === 'kuyruk' && bekleyen > 0 && <em className="vurgu">{bekleyen}</em>}
            </button>
          ))}
        </nav>
        <div className="yk-kisi">
          <div className="yk-avatar" aria-hidden="true">{basHarf || 'DY'}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong title={ad}>{ad}</strong>
            <span>{ilAd ? `${ilAd} İl MEM denetçisi` : 'Denetim yetkilisi'}</span>
          </div>
          <button type="button" onClick={onCikis} aria-label="Çıkış yap" title="Çıkış yap"><LogOut size={16} /></button>
        </div>
      </aside>
      {acik && <div className="yk-perde" onClick={() => setAcik(false)} aria-hidden="true" />}

      <main className="yk-ana">
        <header className="yk-ust">
          <button type="button" className="yk-menu-ac" onClick={() => setAcik(true)} aria-label="Menüyü aç"><Menu size={20} /></button>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1>{baslik}</h1>
            {alt && <p>{alt}</p>}
          </div>
          <div className="yk-ust-eylem">
            <label className="dn-donem">
              <span>Dönem</span>
              <select className="form-select" value={donem} onChange={e => onDonem(e.target.value)}>
                {donemSecenekleri().map(d => <option key={d.key} value={d.key}>{d.ad}</option>)}
              </select>
            </label>
          </div>
        </header>
        <div className="dn-govde">{children}</div>
      </main>
    </div>
  )
}

// Denetim ekranları kendi içinde kayar (tablolar, belge önizlemesi); kabuk ekran yüksekliğinde sabit kalır.
const DENETIM_STIL = `
.yk-sabit { height: 100vh; height: 100dvh; overflow: hidden; }
.yk-sabit .yk-menu { height: 100vh; height: 100dvh; }
.yk-sabit .yk-ana { height: 100%; overflow: hidden; }
/* Açık yan menü: uygulamanın ana menüsüyle aynı (beyaz zemin, seçili öğede açık mavi zemin + sol şerit) */
.yk-sabit .yk-menu { background: var(--surface); color: var(--text2); border-right: 1px solid var(--border); }
.yk-sabit .yk-marka strong { color: var(--text); }
.yk-sabit .yk-marka span, .yk-sabit .yk-grup { color: var(--text3); }
.yk-sabit .yk-kapat { color: var(--text2); }
.yk-sabit .yk-oge { color: var(--text2); position: relative; }
.yk-sabit .yk-oge svg { color: var(--text3); }
.yk-sabit .yk-oge:hover { background: #f1f3f6; color: var(--text); }
.yk-sabit .yk-oge.on { background: #f0f3fe; color: var(--accent-dark); box-shadow: inset 3px 0 0 var(--accent); }
.yk-sabit .yk-oge.on svg { color: var(--accent); }
.yk-sabit .yk-oge:focus-visible, .yk-sabit .yk-kisi button:focus-visible { outline-color: var(--accent); }
.yk-sabit .yk-oge em.vurgu { background: var(--warn-light); color: #8a5200; border: 1px solid var(--warn-border); }
.yk-sabit .yk-kisi { border-top-color: var(--border); }
.yk-sabit .yk-kisi strong { color: var(--text); }
.yk-sabit .yk-kisi span { color: var(--text3); }
.yk-sabit .yk-kisi button { color: var(--danger); border: 1px solid var(--danger-border); }
.yk-sabit .yk-kisi button:hover { color: var(--danger); background: var(--danger-light); }
.yk-sabit .yk-avatar { background: var(--text); }
.yk-sabit .yk-ust { position: static; flex-shrink: 0; }
.dn-govde { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.dn-kaydir { flex: 1; min-height: 0; overflow-y: auto; padding: 22px 28px 40px; }
.dn-sayfa { flex: 1; min-height: 0; overflow-y: auto; padding: 22px 28px 40px; display: flex; flex-direction: column; gap: 18px; }
.dn-donem { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: var(--text3); }
.dn-donem .form-select { width: auto; min-width: 150px; font-size: 13px; font-weight: 600; }
.dn-secim { width: auto; min-width: 150px; font-size: 13px; }
.yk-kpi > button { text-align: left; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 15px 17px; cursor: pointer; font: inherit; color: inherit; }
.yk-kpi > button:hover { border-color: var(--border-strong); }
.yk-kpi > button.on { border-color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
.dn-ilerleme { display: flex; align-items: center; gap: 8px; font-size: 12px; font-variant-numeric: tabular-nums; }
.dn-ilerleme > span:first-child { width: 80px; height: 6px; border-radius: 6px; background: var(--surface2); overflow: hidden; flex-shrink: 0; }
.dn-ilerleme > span:first-child > span { display: block; height: 100%; border-radius: 6px; }
.dn-baslik { flex-shrink: 0; background: var(--surface); border-bottom: 1px solid var(--border); padding: 14px 28px 0; display: flex; flex-direction: column; gap: 12px; }
.dn-sekmeler { display: flex; gap: 2px; overflow-x: auto; scrollbar-width: none; }
.dn-sekmeler button { display: inline-flex; align-items: center; gap: 6px; padding: 10px 14px; border: 0; border-bottom: 2px solid transparent; background: transparent; font: inherit; font-size: 13.5px; font-weight: 500; color: var(--text2); cursor: pointer; white-space: nowrap; }
.dn-sekmeler button.on { color: var(--accent); border-bottom-color: var(--accent); font-weight: 600; }
.dn-sekmeler em { font-style: normal; background: var(--danger); color: #fff; border-radius: 10px; padding: 0 7px; font-size: 11px; font-weight: 700; }
.dn-iade { color: #8a5200; border-color: var(--warn-border); }
.dn-iade:hover { background: var(--warn-light); border-color: #e0bf7a; }
.dn-alt-arac { flex-shrink: 0; padding: 12px 28px; border-bottom: 1px solid var(--border-light); background: var(--surface); }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
.dn-sekme-satir { display: flex; align-items: center; gap: 4px 12px; flex-wrap: wrap; }
.dn-sekme-satir .dn-sekmeler { flex: 1 0 auto; }
.dn-sekme-satir > .dn-sekme-sag { flex-shrink: 0; padding-bottom: 6px; }
.dn-sekmeler em.ok { background: var(--success-light); color: var(--success); }
.dn-sekmeler em.uyari { background: var(--warn-light); color: #8a5200; }
.dn-sekmeler em.notr { background: var(--surface2); color: var(--text2); }

/* Aylık ızgara (ders programı / sınıf defteri): ekranın kalan yüksekliğine sığar, kendi içinde kayar */
.dn-izgara { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 10px; padding: 14px 28px 18px; }
.dn-izgara-arac { display: flex; align-items: center; gap: 10px 16px; flex-wrap: wrap; }
.dn-izgara-ozet { display: flex; align-items: center; gap: 6px 14px; flex-wrap: wrap; font-size: 12.5px; color: var(--text2); }
.dn-lejant { display: inline-flex; align-items: center; gap: 6px; }
.dn-lejant i { width: 12px; height: 12px; border-radius: 3px; border: 1px solid var(--border-strong); }
.dn-lejant i.geldi { background: var(--success-light); border-color: var(--success-border); }
.dn-lejant i.gelmedi { background: var(--danger-light); border-color: var(--danger-border); }
.dn-lejant i.plan { background: var(--accent-lighter); border-color: var(--accent-light); }
.dn-lejant i.kapali { background: var(--th-off-bg); }
.dn-sayac-hata { font-style: normal; background: var(--danger); color: #fff; border-radius: 10px; padding: 0 6px; font-size: 11px; font-weight: 700; }
.dn-izgara-bos { padding: 40px 20px; text-align: center; color: var(--text2); background: var(--surface); border: 1px dashed var(--border-strong); border-radius: 12px; }
.dn-izgara-kutu { flex: 0 1 auto; min-height: 0; overflow: auto; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; }
.dn-izgara-tablo { border-collapse: separate; border-spacing: 0; font-size: 11px; width: 100%; }
.dn-izgara-tablo th, .dn-izgara-tablo td { border-right: 1px solid var(--border-light); border-bottom: 1px solid var(--border-light); }
.dn-izgara-tablo thead th { position: sticky; top: 0; z-index: 2; background: var(--th-bg); color: var(--th-fg); border-bottom-color: var(--th-border); font-size: 10.5px; font-weight: 600; line-height: 1.2; padding: 6px 2px; text-align: center; min-width: 54px; }
.dn-izgara-tablo thead th b { display: block; font-size: 13px; font-weight: 700; }
.dn-izgara-tablo thead th.kapali { background: var(--th-off-bg); color: var(--th-off-fg); min-width: 24px; width: 24px; font-weight: 500; }
.dn-izgara-tablo .sol { position: sticky; left: 0; z-index: 1; background: var(--surface); color: var(--text); text-align: left; padding: 0 12px; min-width: 76px; font-weight: 600; white-space: nowrap; box-shadow: inset -1px 0 0 var(--border); }
.dn-izgara-tablo .sol.koord { color: var(--info); }
.dn-izgara-tablo thead th.sol { z-index: 3; background: var(--th-bg); color: var(--th-fg); }
.dn-izgara-tablo td { height: 32px; padding: 2px 3px; text-align: center; white-space: nowrap; color: var(--text); font-weight: 500; }
.dn-izgara-tablo td.kapali { background: var(--th-off-bg); }
.dn-izgara-tablo td.geldi { background: var(--success-light); }
.dn-izgara-tablo td.gelmedi { background: var(--danger-light); color: var(--danger); font-weight: 700; }
.dn-izgara-tablo td.plan { background: var(--accent-lighter); color: var(--accent); font-weight: 600; }
.dn-izgara-tablo tbody tr:hover td:not(.kapali) { box-shadow: inset 0 0 0 999px rgba(14,17,22,.035); }
.dn-izgara-tablo tr.grup th { background: var(--surface2); color: var(--text2); text-align: left; padding: 5px 0; font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }
.dn-izgara-tablo tr.grup.koord th { background: var(--info-light); color: var(--info); }
.dn-izgara-tablo tr.grup th span { position: sticky; left: 12px; }
@media (max-width: 900px) {
  .dn-izgara { padding: 12px 16px 14px; }
  .dn-sekme-satir { flex-wrap: wrap; }
  .dn-sekme-satir > .dn-sekme-sag { width: 100%; overflow-x: auto; }
  .dn-sekme-sag .yk-segment, .dn-izgara-arac .yk-segment { flex-wrap: nowrap; overflow-x: auto; max-width: 100%; scrollbar-width: none; }
  .dn-sekme-sag .yk-segment button, .dn-izgara-arac .yk-segment button { flex-shrink: 0; }
  .dn-sayfa, .dn-kaydir { padding: 16px 16px 32px; }
  .dn-baslik { padding: 12px 16px 0; }
  .dn-alt-arac { padding: 10px 16px; }
  .dn-donem > span { display: none; }
  .yk-sabit .yk-ust h1 { font-size: 18px; }
  .yk-sabit .yk-ust h1, .yk-sabit .yk-ust p { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
}
`

// ============================================================
// Okullar sayfası (ildeki tüm okullar)
// ============================================================
type OkulFiltre = 'tum' | 'gonderildi' | 'iade' | 'yok' | 'onaylandi'

export function DenetimOkullar({ okullar, durumlar, toplamMadde, yukleniyor, ilceler, filtreIlceId, onIlce, onIncele, onYenile }: {
  okullar: { id: number; ad: string; ogrenci_sayisi?: number; personel_sayisi?: number; son_islem?: string }[]
  durumlar: Map<number, OkulDonemDurumu>; toplamMadde: number; yukleniyor: boolean
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
    <div className="dn-sayfa">
      <div className="yk-arac">
        <label className="yk-ara">
          <Search size={14} aria-hidden="true" style={{ color: 'var(--text3)', flexShrink: 0 }} />
          <input type="search" aria-label="Okul ara" value={ara} onChange={e => setAra(e.target.value)} placeholder="Okul ara" />
        </label>
        <select aria-label="İlçe" className="form-select dn-secim" value={filtreIlceId || ''} onChange={e => onIlce(e.target.value ? Number(e.target.value) : null)}>
          <option value="">Tüm ilçeler</option>
          {ilceler.map(i => <option key={i.id} value={i.id}>{i.ad}</option>)}
        </select>
        <button type="button" className="btn btn-secondary btn-icon" onClick={onYenile} aria-label="Yenile" title="Yenile">
          <RefreshCw size={15} className={yukleniyor ? 'animate-spin' : ''} />
        </button>
      </div>

      <section className="yk-kart">
        <div className="yk-kart-bas">
          <h2>İldeki okullar</h2>
          <div className="yk-kart-sag">
            <Filtre<OkulFiltre> etiket="Durum filtresi" deger={filtre} onDegis={setFiltre}
              secenekler={([['tum', 'Tümü'], ['gonderildi', 'Denetimde'], ['iade', 'İade edildi'], ['yok', 'Göndermedi'], ['onaylandi', 'Onaylandı']] as [OkulFiltre, string][]).map(([id, ad]) => ({ id, ad, sayi: say(id) }))} />
          </div>
        </div>
        <div className="yk-tablo">
          <table className="data-table" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th scope="col">Okul</th>
                <th scope="col">Evrak</th>
                <th scope="col">Durum</th>
                <th scope="col">Gönderim</th>
                <th scope="col">Son işlem</th>
                <th scope="col"><span className="sr-only">İşlem</span></th>
              </tr>
            </thead>
            <tbody>
              {liste.map(s => {
                const oran = toplamMadde ? Math.min(1, (s.d?.doluMadde || 0) / toplamMadde) : 0
                return (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.ad}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{s.ogrenci_sayisi ?? 0} öğrenci · {s.personel_sayisi ?? 0} personel</div>
                    </td>
                    <td><EvrakIlerleme dolu={s.d?.doluMadde || 0} toplam={toplamMadde} oran={oran} /></td>
                    <td><DurumRozeti durum={s.d?.teslim?.durum} /></td>
                    <td style={{ color: 'var(--text2)' }}>{s.d?.teslim?.gonderim_tarihi ? goreceTarih(s.d.teslim.gonderim_tarihi) : '—'}</td>
                    <td style={{ color: 'var(--text2)' }}>{goreceTarih(s.son_islem)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className={`btn btn-sm ${s.grup === 'gonderildi' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => onIncele(s.id, idler)}>
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
      </section>
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

export function OkulIncelemeBasligi({ okulId, yil, ay, durum, toplamMadde, hesap, sekme, onSekme, geriAd, onGeri, gezinme, onKararVerildi, sekmeSag }: {
  okulId: number; yil: number; ay: number
  durum?: OkulDonemDurumu; toplamMadde: number
  hesap: HesapKontrolVeri
  sekme: OkulSekme; onSekme: (s: OkulSekme) => void
  geriAd: string; onGeri: () => void
  gezinme: { sira: number; toplam: number; onOnceki?: () => void; onSonraki?: () => void }
  onKararVerildi: () => void
  sekmeSag?: React.ReactNode   // sekme satırının sağı (ör. okul verileri alt seçimi)
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

  // Evrak doluluğu ve hesap kontrolü sonucu sekme rozetlerinde durur (ayrı özet satırı ekranda yer kaplıyordu)
  const evrakTam = toplamMadde > 0 && dolu >= toplamMadde
  const hesapRozet: { metin: string; ton: string; ipucu: string } | undefined =
    hesap.yukleniyor ? { metin: '…', ton: 'notr', ipucu: 'Kontrol ediliyor' }
    : !s ? undefined
    : hata ? { metin: String(hata), ton: '', ipucu: `${hata} hata${uyari ? `, ${uyari} uyarı` : ''}` }
    : uyari ? { metin: String(uyari), ton: 'uyari', ipucu: `${uyari} uyarı` }
    : { metin: '✓', ton: 'ok', ipucu: 'Sorun yok' }
  const sekmeler: { id: OkulSekme; ad: string; icon: typeof Inbox; rozet?: { metin: string; ton: string; ipucu: string } }[] = [
    { id: 'evrak', ad: 'Evrak', icon: FolderOpen, rozet: toplamMadde ? { metin: `${dolu}/${toplamMadde}`, ton: evrakTam ? 'ok' : 'notr', ipucu: evrakTam ? 'Tüm maddeler dolu' : `${toplamMadde - dolu} madde boş` } : undefined },
    { id: 'hesap', ad: 'Hesap kontrolü', icon: ShieldCheck, rozet: hesapRozet },
    { id: 'veri', ad: 'Okul verileri', icon: Database },
  ]

  return (
    <div className="dn-baslik">
      {/* Satır 1: geri · durum · gezinme | karar (okul adı kabuğun başlığında) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onGeri}>
          <ArrowLeft size={14} aria-hidden="true" /> {geriAd}
        </button>
        <DurumRozeti durum={t} />
        {t === 'gonderildi' && teslim?.gonderim_tarihi && (
          <span title={new Date(teslim.gonderim_tarihi).toLocaleString('tr-TR')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 6, fontSize: 12.5,
              background: bekleme >= 3 ? 'var(--warn-light)' : 'var(--surface2)', color: bekleme >= 3 ? '#8a5200' : 'var(--text)' }}>
            <Clock size={14} aria-hidden="true" />
            <span>
              <b>{bekleme <= 0 ? 'Bugün' : bekleme === 1 ? 'Dün' : `${bekleme} gün önce`}</b> gönderildi
              {bekleme >= 3 && <b> · incelenmeyi bekliyor</b>}
            </span>
          </span>
        )}
        {gezinme.toplam > 1 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: 'var(--text2)', fontVariantNumeric: 'tabular-nums' }}>
            <button type="button" className="btn btn-secondary btn-icon" aria-label="Önceki okul" disabled={!gezinme.onOnceki} onClick={gezinme.onOnceki}><ChevronLeft size={16} /></button>
            {gezinme.sira} / {gezinme.toplam}
            <button type="button" className="btn btn-secondary btn-icon" aria-label="Sonraki okul" disabled={!gezinme.onSonraki} onClick={gezinme.onSonraki}><ChevronRight size={16} /></button>
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {(t === 'gonderildi' || t === 'onaylandi') ? (
            <>
              <button type="button" className="btn btn-secondary dn-iade" disabled={!!islem} onClick={() => setIadeNot(n => n === null ? (teslim?.denetci_notu || '') : null)} aria-expanded={iadeNot !== null}>
                <Undo2 size={14} aria-hidden="true" /> {t === 'onaylandi' ? 'Onayı geri al, iade et' : 'İade et'}
              </button>
              {t === 'gonderildi' && (
                <button type="button" className="btn btn-success" disabled={!!islem} onClick={() => karar('onaylandi')}>
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
        <div style={{ padding: 14, borderRadius: 10, border: '1px solid var(--warn-border)', background: 'var(--warn-light)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label htmlFor="dosyaIadeNot" className="form-label" style={{ margin: 0, fontWeight: 600, color: '#8a5200' }}>Okula iade notu (okulun ekranında görünür)</label>
          <textarea id="dosyaIadeNot" className="form-input" autoFocus value={iadeNot} onChange={e => setIadeNot(e.target.value)} rows={4} style={{ resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {s && (hata > 0 || uyari > 0) && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIadeNot(n => [n?.trim(), 'Hesap kontrolü bulguları:', bulgulardanNot(s)].filter(Boolean).join('\n'))}>
                <ShieldCheck size={14} aria-hidden="true" /> Hesap kontrolü bulgularını ekle
              </button>
            )}
            <span style={{ flex: 1 }} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIadeNot(null)}>Vazgeç</button>
            <button type="button" className="btn btn-warn btn-sm" disabled={!!islem} onClick={() => karar('iade', iadeNot)}>
              <Undo2 size={14} aria-hidden="true" /> İade et
            </button>
          </div>
        </div>
      )}

      {(msg || islem) && (
        <div role="status" style={{ padding: '10px 12px', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          background: islem ? 'var(--info-light)' : msg?.tip === 'ok' ? 'var(--success-light)' : 'var(--danger-light)', color: islem ? 'var(--info)' : msg?.tip === 'ok' ? 'var(--success)' : 'var(--danger)' }}>
          <span style={{ flex: 1 }}>{islem || msg?.text}</span>
          {!islem && msg?.tip === 'ok' && gezinme.onSonraki && (
            <button type="button" className="btn btn-success btn-sm" onClick={gezinme.onSonraki}>Sıradaki okul <ArrowRight size={14} aria-hidden="true" /></button>
          )}
        </div>
      )}

      {/* Satır 2: sekmeler (rozetlerde evrak ve hesap özeti) · sağda sekmeye özel seçim */}
      <div className="dn-sekme-satir">
        <nav aria-label="İnceleme sekmeleri" className="dn-sekmeler">
          {sekmeler.map(x => (
            <button key={x.id} type="button" className={sekme === x.id ? 'on' : ''} onClick={() => onSekme(x.id)} aria-current={sekme === x.id ? 'page' : undefined}>
              <x.icon size={14} aria-hidden="true" /> {x.ad}
              {x.rozet ? <em className={x.rozet.ton || undefined} title={x.rozet.ipucu}>{x.rozet.metin}<span className="sr-only"> · {x.rozet.ipucu}</span></em> : null}
            </button>
          ))}
        </nav>
        {sekmeSag && <div className="dn-sekme-sag">{sekmeSag}</div>}
      </div>
    </div>
  )
}

/** Okul Verileri sekmesindeki alt seçim (ham, salt okunur veriler) */
export type VeriSekme = 'bordro' | 'bilanco' | 'ders-programi' | 'sinif-defteri'
export function VeriSecici({ secili, onSec }: { secili: VeriSekme; onSec: (v: VeriSekme) => void }) {
  return (
    <Filtre<VeriSekme> etiket="Okul verisi" deger={secili} onDegis={onSec}
      secenekler={[{ id: 'bordro', ad: 'Bordro' }, { id: 'bilanco', ad: 'Bilanço' }, { id: 'ders-programi', ad: 'Ders programı' }, { id: 'sinif-defteri', ad: 'Sınıf defteri' }]} />
  )
}
