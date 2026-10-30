'use client'
// Denetçi filmi: il millî eğitim denetçisinin paneli. Sahne kuralları sahneler.tsx ile aynıdır
// (0–1 zamanın saf fonksiyonu, 800×460 alan, örnek veri).
import { Inbox, Building2, ScrollText, Settings, Filter, FolderOpen, ShieldCheck, Database, Check, X, AlertTriangle, Loader2, Undo2, FileText } from 'lucide-react'
import { ara, yaz, belir, Ust, Bildirim, type Bolum } from './sahneler'
import type { FilmSeti } from './Film'

type Okul = [ad: string, ilce: string, evrak: string, hesap: 'tamam' | 'hata' | 'uyari', hesapMetin: string, gonderim: string]
const OKULLAR: Okul[] = [
  ['Atatürk İlkokulu Çocuk Kulübü', 'Merkez', '13/13', 'hata', '2 bulgu', 'Bugün'],
  ['Gazi Anaokulu Çocuk Kulübü', 'Kuzey', '13/13', 'tamam', 'Sorun yok', 'Dün'],
  ['Cumhuriyet Ortaokulu Çocuk Kulübü', 'Merkez', '12/13', 'uyari', '1 uyarı', '2 gün önce'],
  ['Yavuz Selim İlkokulu Çocuk Kulübü', 'Güney', '13/13', 'tamam', 'Sorun yok', '3 gün önce'],
]
const ILCELER = ['Tüm ilçeler', 'Merkez', 'Kuzey', 'Güney']
const ton = (h: Okul[3]) => (h === 'tamam' ? 'yesil' : h === 'hata' ? 'kirmizi' : 'sari')

/** Kuyruk listesi; iade sahnesinin sonunda güncellenmiş hâliyle yeniden kullanılır */
function KuyrukListesi({ gizle, vurgu, iade }: { gizle: number; vurgu: number; iade?: boolean }) {
  return (
    <>
      <div className="fd-ozet">
        {[['Bekleyen dosya', iade ? 3 : 4, ''], ['Onaylanan', 21, 'yesil'], ['İade edildi', iade ? 3 : 2, 'kirmizi'], ['Göndermedi', 6, 'soluk']].map(([l, v, c]) => (
          <div key={l as string} className="fd-ozet-k"><span>{l}</span><b className={c as string}>{v}</b></div>
        ))}
      </div>
      <div className="fs-kart fs-liste" style={{ top: 140 }}>
        <div className="fs-satir fs-satir-bas fd-kuyruk"><span>Okul</span><span>İlçe</span><span>Evrak</span><span>Kontrol</span><span className="sag">Gönderildi</span></div>
        {OKULLAR.map((o, i) => {
          const sakla = o[1] !== 'Merkez' ? gizle : 0
          const iadeEdildi = iade && i === 0
          return (
            <div key={o[0]} style={{ height: 36 * (1 - sakla), opacity: 1 - sakla, overflow: 'hidden' }}>
              <div className="fs-satir fd-kuyruk" style={{ background: i === 0 ? `rgba(35,71,217,${0.08 * vurgu})` : undefined }}>
                <span className="kalin">{o[0]}</span><span className="soluk">{o[1]}</span><span>{o[2]}</span>
                <span>{iadeEdildi ? <b className="fs-rozet kirmizi">İade edildi</b> : <b className={`fs-rozet ${ton(o[3])}`}>{o[4]}</b>}</span>
                <span className="sag soluk">{o[5]}</span>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ── 1. İş kuyruğu ────────────────────────────────────────────
function KuyrukSahnesi({ t }: { t: number }) {
  const menu = ara(t, 0.34, 0.38) * (1 - ara(t, 0.46, 0.49))
  const secili = t > 0.45 ? 'Merkez' : 'Tüm ilçeler'
  return (
    <>
      <Ust baslik="İş kuyruğu" alt="Örnek İl Millî Eğitim Müdürlüğü · Ekim 2026" dugme={secili} ikon={<Filter size={12} />} basili={t > 0.32 && t < 0.35} />
      <div style={belir(ara(t, 0.03, 0.12))}><KuyrukListesi gizle={ara(t, 0.48, 0.54)} vurgu={ara(t, 0.68, 0.72)} /></div>
      {menu > 0 && (
        <div className="fd-acilir" style={{ opacity: menu }}>
          {ILCELER.map(i => <div key={i} className={i === 'Merkez' && t > 0.42 ? 'secili' : ''}>{i}</div>)}
        </div>
      )}
    </>
  )
}

// ── 2. Evrak incelemesi ──────────────────────────────────────
const EVRAK: [number, string, string, boolean][] = [
  [1, 'Kulüp açılış onayı', 'acilis_onayi.pdf', false], [2, 'Görevli personel listesi', 'Gönderim anındaki sistem kopyası', true],
  [3, 'Banka hesap hareketleri', 'ekim_hesap_hareketleri.xlsx', false], [4, 'Sigortalı personel puantajı', 'Gönderim anındaki sistem kopyası', true],
  [6, 'Sigortalı personel bordrosu', 'Gönderim anındaki sistem kopyası', true], [8, '4/A hizmet listesi', 'hizmet_listesi_ekim.pdf', false],
]
const ONAY_ANI = [0.52, 0.57, 0.62, 0.67, 0.72, 0.77]

function OkulBasligi({ sekme, hesapP = 1 }: { sekme: 0 | 1; hesapP?: number }) {
  return (
    <>
      <Ust baslik="Atatürk İlkokulu Çocuk Kulübü" alt="Ekim 2026 dosyası · bugün gönderildi" />
      <div className="fd-sekmeler">
        <span className={sekme === 0 ? 'on' : ''}><FolderOpen size={12} /> Evrak <em className="yesil">13/13</em></span>
        <span className={sekme === 1 ? 'on' : ''}><ShieldCheck size={12} /> Hesap kontrolü {hesapP >= 1 ? <em className="kirmizi">2</em> : <em>…</em>}</span>
        <span><Database size={12} /> Okul verileri</span>
      </div>
    </>
  )
}

function EvrakSahnesi({ t }: { t: number }) {
  const onizleme = ara(t, 0.13, 0.2) * (1 - ara(t, 0.44, 0.48))
  return (
    <>
      <OkulBasligi sekme={0} />
      <div className="fs-kart fs-liste" style={{ top: 94 }}>
        <div className="fs-satir fs-satir-bas fd-evrak"><span>Madde</span><span>Belge</span><span /><span className="sag">Karar</span></div>
        {EVRAK.map(([sira, ad, dosya, oto], i) => {
          const onay = t >= ONAY_ANI[i] + 0.01
          return (
            <div key={sira} className="fs-satir fd-evrak">
              <span className="kalin">{sira}. {ad}</span>
              <span className="soluk fd-dosya">{oto ? <ShieldCheck size={11} /> : <FileText size={11} />}{dosya}</span>
              <span className="fd-ac">Aç</span>
              <span className="sag"><span className={`fd-onay ${onay ? 'tamam' : ''}`}>{onay ? <><Check size={11} strokeWidth={3} /> Onaylandı</> : 'Onayla'}</span></span>
            </div>
          )
        })}
      </div>
      {onizleme > 0 && (
        <div className="fd-onizleme" style={{ opacity: onizleme, transform: `translateX(${(1 - onizleme) * 40}px)` }}>
          <div className="fd-onizleme-ust"><FileText size={13} /> Bordro – sigortalı personel · Ekim 2026<X size={14} className="fd-kapat" /></div>
          <div className="fd-sayfa">
            <div className="fd-sayfa-b">ÖRNEK ANAOKULU ÇOCUK KULÜBÜ<br />ÜCRET BORDROSU · EKİM 2026</div>
            {Array.from({ length: 9 }, (_, i) => <div key={i} className="fd-sayfa-satir"><span style={{ width: `${30 + (i * 17) % 40}%` }} /><span /><span /><span /></div>)}
          </div>
        </div>
      )}
    </>
  )
}

// ── 3. Hesap kontrolü ────────────────────────────────────────
const KISILER: [string, 'tamam' | 'hata' | 'uyari', string][] = [
  ['Zeynep Kaya', 'tamam', 'Sorun yok'], ['Murat Tekin', 'hata', 'Net ödenen tutmuyor'], ['Elif Sarı', 'tamam', 'Sorun yok'],
  ['Ayşe Doğan', 'uyari', 'Damga vergisi hatalı'], ['Hasan Öz', 'tamam', 'Sorun yok'],
]

function HesapSahnesi({ t }: { t: number }) {
  const kontrol = ara(t, 0.04, 0.18)
  const detay = ara(t, 0.56, 0.62)
  return (
    <>
      <OkulBasligi sekme={1} hesapP={kontrol} />
      {kontrol < 1 ? (
        <div className="fd-kontrol"><Loader2 size={15} className="fs-don" /> Bordro, puantaj, vergi ve dağıtım oranları kontrol ediliyor…</div>
      ) : (
        <div className="fd-kontrol bitti"><AlertTriangle size={14} /> 5 personel incelendi · 1 hata · 1 uyarı</div>
      )}
      <div className="fs-kart fs-liste" style={{ top: 132 }}>
        {KISILER.map(([ad, durum, metin], i) => {
          const p = ara(t, 0.2 + i * 0.05, 0.24 + i * 0.05)
          const acik = i === 1 ? detay : 0
          return (
            <div key={ad} style={belir(p)}>
              <div className={`fs-satir fd-kisi ${i === 1 && t > 0.55 ? 'secili' : ''}`}>
                <span className="kalin">{ad}</span>
                <span><b className={`fs-rozet ${ton(durum)}`}>{durum === 'tamam' ? <Check size={10} strokeWidth={3} /> : durum === 'hata' ? <X size={10} strokeWidth={3} /> : <AlertTriangle size={10} />} {metin}</b></span>
                <span className="sag soluk">{durum === 'tamam' ? '14 kural geçti' : durum === 'hata' ? '₺500 fazla ödeme' : '₺39 fark'}</span>
              </div>
              {acik > 0 && (
                <div className="fd-detay" style={{ height: 96 * acik, opacity: acik }}>
                  <p>Net ödenen <b>₺12.910</b>; brüt ₺15.322 − kesintiler ₺2.911 = <b>₺12.410</b> olmalı. Personele ₺500 fazla ödenmiş görünüyor.</p>
                  <p className="soluk">Kural: Net ödenen = brüt ücret − (SGK + işsizlik + gelir vergisi + damga vergisi).</p>
                  <p className="fd-oneri">Yapılması gereken: Fazla ödenen tutar personelden geri alınmalı.</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

// ── 4. Karar: iade ───────────────────────────────────────────
const IADE_NOTU = '- Murat Tekin — Net ödenen tutmuyor: ₺500 fazla ödenmiş görünüyor. Yapılması gereken: Fazla ödenen tutar personelden geri alınmalı.\n- Ayşe Doğan — Damga vergisi hatalı: kesilen tutar ₺39 eksik. Yapılması gereken: Bordro düzeltilip yeniden gönderilmeli.'

function KararSahnesi({ t }: { t: number }) {
  const panel = ara(t, 0.12, 0.17)
  const kuyruk = ara(t, 0.64, 0.7)
  if (kuyruk >= 1) {
    return (
      <>
        <Ust baslik="İş kuyruğu" alt="Örnek İl Millî Eğitim Müdürlüğü · Ekim 2026" dugme="Merkez" ikon={<Filter size={12} />} />
        <KuyrukListesi gizle={1} vurgu={0} iade />
        <Bildirim p={ara(t, 0.72, 0.76)}>İade notu okula iletildi; okul düzeltip dosyayı yeniden gönderecek</Bildirim>
      </>
    )
  }
  return (
    <div style={{ opacity: 1 - kuyruk }}>
      <OkulBasligi sekme={1} />
      <div className="fs-btn fd-onayla"><Check size={13} /> Dosyayı onayla</div>
      <div className={`fs-btn fd-iade ${t > 0.09 && t < 0.12 ? 'basili' : ''}`}><Undo2 size={13} /> İade et</div>
      {panel > 0 && (
        <div className="fs-kart fd-not" style={belir(panel)}>
          <label>Okula iade notu (okulun ekranında görünür)</label>
          <div className="fd-not-alan">{yaz(IADE_NOTU, ara(t, 0.18, 0.5))}<span className="fs-imlec-cubuk" /></div>
          <div className="fd-not-etiket" style={belir(ara(t, 0.18, 0.24))}><ShieldCheck size={12} /> Hesap kontrolü bulgularından otomatik dolduruldu</div>
          <div className={`fs-btn fd-gonder ${t > 0.57 && t < 0.6 ? 'basili' : ''}`}>İadeyi gönder</div>
        </div>
      )}
    </div>
  )
}

export const DENETCI_BOLUMLERI: Bolum[] = [
  {
    id: 'kuyruk', kisa: 'İş kuyruğu', gun: '', menu: 0, sure: 9, adres: 'klup360.com / denetim',
    baslik: '', anlatim: '', maddeler: [],
    altyazi: [[0, 'Denetçi paneli açıldığında ilk gördüğünüz: incelemenizi bekleyen dosyalar.'], [0.3, 'Kuyruğu ilçeye göre süzüyoruz…'], [0.55, 'Evrak doluluğu ve hesap kontrolü sonucu daha dosyayı açmadan görünüyor.'], [0.68, 'Bugün gelen dosyayı açalım.']],
    imlec: [[0, 500, 300], [0.28, 716, 27], [0.33, 716, 27, true], [0.42, 716, 92], [0.45, 716, 92, true], [0.62, 360, 185], [0.68, 360, 185, true], [1, 360, 185]],
    Sahne: KuyrukSahnesi,
  },
  {
    id: 'evrak', kisa: 'Evrak', gun: '', menu: 0, sure: 11, adres: 'klup360.com / denetim',
    baslik: '', anlatim: '', maddeler: [],
    altyazi: [[0, 'Okulun ay dosyası: il listenizdeki her madde ve yüklenen belge.'], [0.12, 'Belgeyi panelden çıkmadan açıp okuyoruz.'], [0.5, 'Uygun bulduğumuz belgeleri tek tek onaylıyoruz.']],
    imlec: [[0, 500, 300], [0.1, 620, 302], [0.12, 620, 302, true], [0.4, 600, 200], [0.44, 769, 108], [0.46, 769, 108, true],
      ...ONAY_ANI.flatMap((z, i): [number, number, number, boolean?][] => [[z - 0.03, 742, 142 + i * 40], [z, 742, 142 + i * 40, true]]), [1, 742, 342]],
    Sahne: EvrakSahnesi,
  },
  {
    id: 'hesap', kisa: 'Hesap kontrolü', gun: '', menu: 0, sure: 10, adres: 'klup360.com / denetim',
    baslik: '', anlatim: '', maddeler: [],
    altyazi: [[0, 'Hesap kontrolü bordroyu, kesintileri ve dağıtım oranlarını sizin yerinize yeniden hesaplar.'], [0.2, 'Beş personelden ikisinde fark çıktı.'], [0.55, 'Bulgu, hangi kuralın tutmadığını ve okulun ne yapması gerektiğini söylüyor.']],
    imlec: [[0, 500, 330], [0.45, 420, 260], [0.53, 330, 194], [0.56, 330, 194, true], [1, 380, 320]],
    Sahne: HesapSahnesi,
  },
  {
    id: 'karar', kisa: 'Karar', gun: '', menu: 0, sure: 10, adres: 'klup360.com / denetim',
    baslik: '', anlatim: '', maddeler: [],
    altyazi: [[0, 'Karar zamanı: onaylamak ya da düzeltilmek üzere iade etmek.'], [0.17, 'İade notu, hesap kontrolünün bulgularıyla kendiliğinden doluyor.'], [0.58, 'Gönderiyoruz.'], [0.7, 'Okul notu kendi ekranında görür; dosya düzeltilip size geri gelir.']],
    imlec: [[0, 500, 300], [0.07, 734, 27], [0.1, 734, 27, true], [0.5, 650, 250], [0.55, 708, 285], [0.58, 708, 285, true], [1, 600, 360]],
    Sahne: KararSahnesi,
  },
]

export const DENETCI_SETI: FilmSeti = {
  bolumler: DENETCI_BOLUMLERI,
  menu: [['İş kuyruğu', Inbox], ['Okullar', Building2], ['Kayıtlar', ScrollText], ['Ayarlar', Settings]],
  grup: 'Örnek İl MEM',
  koyu: true,
}

export const DENETCI_CSS = `
.fd-ozet { position: absolute; left: 18px; top: 62px; width: 614px; display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
.fd-ozet-k { background: #fff; border: 1px solid #E3E6EB; border-radius: 12px; padding: 10px 12px; height: 64px; display: flex; flex-direction: column; justify-content: space-between; }
.fd-ozet-k span { font-size: 10.5px; color: #5F6876; font-weight: 600; }
.fd-ozet-k b { font-family: var(--font-display); font-size: 22px; font-weight: 800; }
.fd-ozet-k b.yesil { color: #0B6B42; } .fd-ozet-k b.kirmizi { color: #B42318; } .fd-ozet-k b.soluk { color: #5F6876; }
.fd-kuyruk { grid-template-columns: 2.4fr .8fr .6fr 1fr .9fr; height: 36px; }
.fs-rozet.sari { background: #FEF3DC; color: #8A5200; }
.fs-rozet svg { vertical-align: -1px; }
.fd-acilir { position: absolute; right: 18px; top: 46px; width: 132px; background: #fff; border: 1px solid #DDE1E8; border-radius: 9px; padding: 6px 0;
  box-shadow: 0 16px 32px -12px rgba(0,0,0,.3); z-index: 5; }
.fd-acilir div { height: 28px; padding: 0 12px; display: flex; align-items: center; font-size: 11.5px; }
.fd-acilir div.secili { background: #E8EDFD; color: #1B38B8; font-weight: 600; }
.fd-sekmeler { position: absolute; left: 18px; top: 58px; display: flex; gap: 6px; }
.fd-sekmeler span { display: flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px; border-radius: 7px; font-size: 11px; font-weight: 600; color: #3F4753; background: #fff; border: 1px solid #E3E6EB; }
.fd-sekmeler span.on { background: #0E1116; color: #fff; border-color: #0E1116; }
.fd-sekmeler em { font-style: normal; font-size: 10px; padding: 1px 6px; border-radius: 5px; background: #EEF0F4; color: #3F4753; }
.fd-sekmeler em.yesil { background: #E3F6EC; color: #0B6B42; } .fd-sekmeler em.kirmizi { background: #FDECEB; color: #B42318; }
.fd-evrak { grid-template-columns: 1.6fr 1.7fr .3fr .9fr; height: 40px; }
.fd-dosya { display: flex; align-items: center; gap: 5px; font-size: 10.5px; white-space: nowrap; overflow: hidden; }
.fd-ac { font-size: 11px; font-weight: 700; color: #2347D9; }
.fd-onay { display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 9px; border-radius: 6px; border: 1px solid #DDE1E8; font-size: 10.5px; font-weight: 600; color: #3F4753; }
.fd-onay.tamam { background: #E3F6EC; border-color: #BFE8D3; color: #0B6B42; }
.fd-onizleme { position: absolute; left: 300px; top: 94px; width: 332px; height: 350px; background: #fff; border-radius: 12px; border: 1px solid #DDE1E8; box-shadow: 0 24px 48px -16px rgba(0,0,0,.35); overflow: hidden; }
.fd-onizleme-ust { display: flex; align-items: center; gap: 6px; height: 36px; padding: 0 12px; background: #F8F9FB; border-bottom: 1px solid #E3E6EB; font-size: 11px; font-weight: 600; }
.fd-kapat { margin-left: auto; color: #5F6876; }
.fd-sayfa { margin: 14px auto; width: 250px; height: 280px; border: 1px solid #E3E6EB; padding: 14px; box-shadow: 0 6px 16px -8px rgba(0,0,0,.2); }
.fd-sayfa-b { text-align: center; font-size: 8px; font-weight: 800; line-height: 1.5; margin-bottom: 12px; }
.fd-sayfa-satir { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 6px; height: 20px; align-items: center; border-top: 1px solid #EEF0F4; }
.fd-sayfa-satir span { height: 5px; border-radius: 3px; background: #E3E6EB; }
.fd-sayfa-satir span:not(:first-child) { width: 70%; justify-self: end; }
.fd-kontrol { position: absolute; left: 18px; top: 98px; display: flex; align-items: center; gap: 8px; font-size: 11.5px; font-weight: 600; color: #3F4753; }
.fd-kontrol.bitti { color: #8A5200; }
.fd-kisi { grid-template-columns: 1.2fr 1.6fr 1fr; height: 40px; }
.fd-kisi.secili { background: #FDF3F2; }
.fd-detay { overflow: hidden; padding: 0 14px; background: #FFF8F7; border-top: 1px solid #F5C2BE; font-size: 11px; line-height: 1.45; }
.fd-detay p { margin: 7px 0 0; }
.fd-oneri { font-weight: 700; color: #B42318; }
.fd-onayla { top: 12px; right: 122px; width: 120px; background: #fff; color: #0B6B42; border: 1px solid #BFE8D3; }
.fd-iade { top: 12px; right: 18px; width: 96px; background: #B42318; }
.fd-iade.basili { background: #8F1B12; }
.fd-not { left: 18px; top: 100px; width: 614px; height: 212px; padding: 14px; }
.fd-not label { display: block; font-size: 11px; font-weight: 700; color: #8A5200; margin-bottom: 8px; }
.fd-not-alan { height: 104px; border: 1px solid #2347D9; box-shadow: 0 0 0 3px rgba(35,71,217,.12); border-radius: 8px; padding: 9px 11px; font-size: 11px; line-height: 1.5; white-space: pre-wrap; overflow: hidden; }
.fd-not-etiket { display: inline-flex; align-items: center; gap: 5px; margin-top: 8px; font-size: 10.5px; font-weight: 600; color: #1B38B8; }
.fd-gonder { right: 14px; bottom: 12px; width: 120px; background: #B42318; }
`
