'use client'
// Tanıtım filminin sahneleri. Her sahne 0–1 arası zamanın (t) saf fonksiyonudur: aynı t her zaman aynı kareyi
// çizer; böylece oynat/duraklat/başa sar ve hareketi azaltma tercihi ek durum tutmadan çalışır.
// Sahne alanı 800×460 px sabittir (Film bileşeni ekrana sığacak şekilde ölçekler); imleç koordinatları bu alana göredir.
// Gösterilen kişi, kurum ve tutarlar örnek veridir.
import type { CSSProperties, ReactNode } from 'react'
import { Check, X, FileSpreadsheet, FileText, Send, Loader2, ShieldCheck, Plus, Download, Mail } from 'lucide-react'

export const ara = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)))
export const yumusak = (p: number) => 1 - Math.pow(1 - p, 3)
export const yaz = (s: string, p: number) => s.slice(0, Math.round(s.length * p))
export const tl = (n: number) => '₺' + Math.round(n).toLocaleString('tr-TR')
export const belir = (p: number, dy = 8): CSSProperties => ({ opacity: p, transform: `translateY(${(1 - p) * dy}px)` })

/** [zaman, x, y, tıklama?] — sahne alanı koordinatları */
export type Imlec = [number, number, number, boolean?]

export interface Bolum {
  id: string
  kisa: string
  gun: string
  baslik: string
  anlatim: string
  maddeler: string[]
  sure: number
  menu: number
  adres: string
  altyazi: [number, string][]
  imlec: Imlec[]
  Sahne: (p: { t: number }) => ReactNode
  /** Menü dahil tüm sahnenin üstüne çizilen katman (ör. başka kullanıcının ekranı) */
  Kaplama?: (p: { t: number }) => ReactNode
}

export const MENU = ['Genel Bakış', 'Öğrenciler', 'Sınıf Defteri', 'Bordro', 'Ödeme Takibi', 'İşletme Defteri', 'Denetim Dosyası']

export function Ust({ baslik, alt, dugme, basili, ikon }: { baslik: string; alt: string; dugme?: string; basili?: boolean; ikon?: ReactNode }) {
  return (
    <>
      <div className="fs-ust">
        <div className="fs-ust-b">{baslik}</div>
        <div className="fs-ust-a">{alt}</div>
      </div>
      {dugme && <div className={`fs-btn fs-btn-ust ${basili ? 'basili' : ''}`}>{ikon}{dugme}</div>}
    </>
  )
}

export function Bildirim({ p, children }: { p: number; children: ReactNode }) {
  if (p <= 0) return null
  return <div className="fs-toast" style={belir(p, 14)}><span className="fs-toast-ic"><Check size={13} strokeWidth={3} /></span>{children}</div>
}

// ── 1. Öğrenci kaydı ─────────────────────────────────────────
const OGRENCILER = [['Ali Demir', 'Papatyalar', '₺4.536'], ['Defne Arslan', 'Gelincikler', '₺4.536'], ['Kerem Şahin', 'Papatyalar', '₺3.402'], ['Nehir Koç', 'Laleler', '₺4.536'], ['Mert Aydın', 'Gelincikler', '₺4.536']]

function KayitSahnesi({ t }: { t: number }) {
  const modal = ara(t, 0.09, 0.14) * (1 - ara(t, 0.67, 0.71))
  const yeni = ara(t, 0.7, 0.78)
  const vurgu = 1 - ara(t, 0.82, 1)
  return (
    <>
      <Ust baslik="Öğrenciler" alt={`Ekim 2026 · ${yeni > 0 ? 43 : 42} aktif öğrenci`} dugme="Yeni öğrenci" ikon={<Plus size={13} />} basili={t > 0.08 && t < 0.11} />
      <div className="fs-kart fs-liste" style={{ top: 62 }}>
        <div className="fs-satir fs-satir-bas"><span>Öğrenci</span><span>Sınıf</span><span>Durum</span><span className="sag">Aylık aidat</span></div>
        <div style={{ height: yeni * 34, overflow: 'hidden' }}>
          <div className="fs-satir" style={{ background: `rgba(35,71,217,${0.09 * vurgu})` }}>
            <span className="fs-kisi"><i>EY</i>Elif Yıldız</span><span>Papatyalar</span><span><b className="fs-rozet yesil">Yeni kayıt</b></span><span className="sag">₺4.536</span>
          </div>
        </div>
        {OGRENCILER.map(([ad, sinif, aidat]) => (
          <div key={ad} className="fs-satir">
            <span className="fs-kisi"><i>{ad.split(' ').map(w => w[0]).join('')}</i>{ad}</span><span>{sinif}</span><span><b className="fs-rozet">Kulüp öğrencisi</b></span><span className="sag">{aidat}</span>
          </div>
        ))}
      </div>
      {modal > 0 && (
        <div className="fs-perde" style={{ opacity: modal }}>
          <div className="fs-modal" style={{ transform: `scale(${0.96 + modal * 0.04})` }}>
            <div className="fs-modal-b">Yeni öğrenci</div>
            {[
              ['Ad soyad', yaz('Elif Yıldız', ara(t, 0.16, 0.28)), t > 0.14 && t < 0.31],
              ['Sınıf', t > 0.33 ? 'Papatyalar · 4 yaş grubu' : '', t > 0.31 && t < 0.4],
              ['Veli telefonu', yaz('0532 418 •• ••', ara(t, 0.42, 0.52)), t > 0.4 && t < 0.55],
            ].map(([etiket, deger, odak], i) => (
              <div key={i} className="fs-alan" style={{ top: 48 + i * 58 }}>
                <label>{etiket}</label>
                <div className={`fs-girdi ${odak ? 'odak' : ''}`}>{deger}{odak && <span className="fs-imlec-cubuk" />}</div>
              </div>
            ))}
            <div className="fs-aidat" style={belir(ara(t, 0.54, 0.6))}>
              <span>Aylık aidat otomatik hesaplandı</span><b>21 iş günü × 6 saat → ₺4.536</b>
            </div>
            <div className={`fs-btn fs-btn-kaydet ${t > 0.65 && t < 0.68 ? 'basili' : ''}`}>Kaydet</div>
          </div>
        </div>
      )}
      <Bildirim p={ara(t, 0.72, 0.76) * (1 - ara(t, 0.94, 1))}>Elif Yıldız kaydedildi, Papatyalar sınıfına eklendi</Bildirim>
    </>
  )
}

// ── 2. Sınıf defteri → puantaj ───────────────────────────────
const GUNLER = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum']
const OGRETMEN = ['Zeynep K.', 'Murat T.', 'Elif S.', 'Ayşe D.']
const hucreOgretmen = (g: number, d: number) => OGRETMEN[(g + d * 2) % 4]
const GELMEDI = { g: 2, d: 3 }

function DefterSahnesi({ t }: { t: number }) {
  const gelmediP = ara(t, 0.5, 0.53)
  const puantaj = OGRETMEN.map(o => {
    let saat = 0
    for (let g = 0; g < 5; g++) for (let d = 0; d < 6; d++) {
      if (hucreOgretmen(g, d) !== o) continue
      if (ara(t, 0.12 + g * 0.06, 0.18 + g * 0.06) < 1) continue
      if (g === GELMEDI.g && d === GELMEDI.d && gelmediP >= 1) continue
      saat++
    }
    return { o, saat }
  })
  return (
    <>
      <Ust baslik="Sınıf Defteri · Papatyalar" alt="13–17 Ekim haftası · öğretmen ders yoklaması" dugme="Programdan aktar" ikon={<Download size={13} />} basili={t > 0.07 && t < 0.1} />
      <div className="fs-kart" style={{ left: 18, top: 62, width: 448, height: 380, padding: '10px 12px' }}>
        <div className="fs-izgara">
          <span />
          {GUNLER.map(g => <span key={g} className="fs-izgara-gun">{g}</span>)}
          {Array.from({ length: 6 }, (_, d) => (
            <div key={d} style={{ display: 'contents' }}>
              <span className="fs-izgara-saat">{d + 1}. ders</span>
              {GUNLER.map((_, g) => {
                const p = ara(t, 0.12 + g * 0.06 + d * 0.008, 0.16 + g * 0.06 + d * 0.008)
                const gelmedi = g === GELMEDI.g && d === GELMEDI.d && gelmediP >= 1
                return (
                  <span key={g} className={`fs-hucre ${p >= 1 ? (gelmedi ? 'gelmedi' : 'geldi') : ''}`} style={{ opacity: 0.25 + p * 0.75 }}>
                    {p > 0 && <>{gelmedi ? <X size={10} strokeWidth={3} /> : <Check size={10} strokeWidth={3} />}{hucreOgretmen(g, d)}</>}
                  </span>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="fs-kart" style={{ left: 478, top: 62, width: 154, height: 380, padding: 12 }}>
        <div className="fs-kucuk-b">Ekim puantajı</div>
        <div className="fs-kucuk-a">Sınıf defterinden otomatik</div>
        {puantaj.map(p => (
          <div key={p.o} className="fs-puantaj">
            <span>{p.o}</span>
            <b className={p.o === hucreOgretmen(GELMEDI.g, GELMEDI.d) && gelmediP >= 1 ? 'dustu' : ''}>{p.saat} sa</b>
          </div>
        ))}
        <div className="fs-not" style={belir(ara(t, 0.56, 0.62))}>Gelmedi işaretlenen ders puantajdan düşüldü, bordroya bu saatler gider.</div>
      </div>
    </>
  )
}

// ── 3. Bordro ────────────────────────────────────────────────
const PERSONEL: [string, string, number][] = [['Zeynep Kaya', 'Öğretmen', 96], ['Murat Tekin', 'Öğretmen', 84], ['Elif Sarı', 'Öğretmen', 120], ['Ayşe Doğan', 'Usta öğretici', 72], ['Hasan Öz', 'Temizlik', 60]]
const SAAT_UCRETI = 182.4

function BordroSahnesi({ t }: { t: number }) {
  const hesap = ara(t, 0.17, 0.25)
  const toplamNet = PERSONEL.reduce((s, [, , saat], i) => s + saat * SAAT_UCRETI * 0.81 * yumusak(ara(t, 0.27 + i * 0.05, 0.37 + i * 0.05)), 0)
  return (
    <>
      <Ust baslik="Bordro · Ekim 2026" alt="Puantajdan 5 personel · MEB katsayıları 2026" dugme={hesap > 0 && hesap < 1 ? 'Hesaplanıyor' : 'Bordroyu hesapla'} ikon={hesap > 0 && hesap < 1 ? <Loader2 size={13} className="fs-don" /> : undefined} basili={t > 0.15 && t < 0.18} />
      <div className="fs-kart fs-liste" style={{ top: 62 }}>
        <div className="fs-satir fs-satir-bas fs-bordro"><span>Personel</span><span className="sag">Saat</span><span className="sag">Brüt</span><span className="sag">Kesinti</span><span className="sag">Net</span></div>
        {PERSONEL.map(([ad, gorev, saat], i) => {
          const p = yumusak(ara(t, 0.27 + i * 0.05, 0.37 + i * 0.05))
          const brut = saat * SAAT_UCRETI
          return (
            <div key={ad} className="fs-satir fs-bordro">
              <span className="fs-kisi"><i>{ad.split(' ').map(w => w[0]).join('')}</i><span>{ad}<em>{gorev}</em></span></span>
              <span className="sag">{saat}</span>
              <span className="sag">{p > 0 ? tl(brut * p) : '—'}</span>
              <span className="sag soluk">{p > 0 ? tl(brut * 0.19 * p) : '—'}</span>
              <span className="sag kalin">{p > 0 ? tl(brut * 0.81 * p) : '—'}</span>
            </div>
          )
        })}
        <div className="fs-satir fs-bordro fs-satir-top"><span>Toplam ödenecek</span><span /><span /><span /><span className="sag kalin">{toplamNet > 0 ? tl(toplamNet) : '—'}</span></div>
      </div>
      <div className="fs-rozet-buyuk" style={{ top: 352, ...belir(ara(t, 0.6, 0.66)) }}><ShieldCheck size={14} /> SGK, gelir vergisi ve damga vergisi hesaplandı</div>
      <div className="fs-btn fs-btn-ikincil" style={{ left: 18, top: 392, ...belir(ara(t, 0.64, 0.7)) }}><FileText size={13} /> Ücret zarfları (PDF)</div>
      <div className={`fs-btn ${t > 0.79 && t < 0.82 ? 'basili' : ''}`} style={{ left: 200, top: 392, width: 170, ...belir(ara(t, 0.66, 0.72)) }}><Mail size={13} /> E-posta ile gönder</div>
      <Bildirim p={ara(t, 0.83, 0.87) * (1 - ara(t, 0.96, 1))}>5 personele ücret zarfı e-postayla gönderildi</Bildirim>
    </>
  )
}

// ── 4. Tahsilat ──────────────────────────────────────────────
const EKSTRE: [string, string, string, number][] = [
  ['03.10', 'ELIF YILDIZ EKIM AIDAT', 'Elif Yıldız', 4536], ['03.10', 'A DEMIR KULUP UCRETI', 'Ali Demir', 4536], ['06.10', 'DEFNE ARSLAN EKIM', 'Defne Arslan', 4536],
  ['07.10', 'K SAHIN AIDAT KARDES', 'Kerem Şahin', 3402], ['09.10', 'NEHIR KOC CK AIDAT', 'Nehir Koç', 4536], ['10.10', 'MERT AYDIN EKIM AY', 'Mert Aydın', 4536],
]

function TahsilatSahnesi({ t }: { t: number }) {
  const oran = 61 + 33 * yumusak(ara(t, 0.36, 0.76))
  const geciken = Math.round(9 - 7 * ara(t, 0.36, 0.76))
  const dosya = ara(t, 0.09, 0.17)
  return (
    <>
      <Ust baslik="İşletme Defteri · Ekstre aktarımı" alt="Eşleşen ödemeler Ödeme Takibi’ne de işlenir" dugme="Ekstre aktar" ikon={<FileSpreadsheet size={13} />} basili={t > 0.05 && t < 0.08} />
      <div className="fs-kart" style={{ left: 18, top: 62, width: 400, height: 380, padding: 12 }}>
        <div className="fs-dosya" style={belir(dosya, 20)}><FileSpreadsheet size={16} /> ziraat_ekim_ekstre.xlsx<em>6 hareket bulundu</em></div>
        {EKSTRE.map(([tarih, aciklama, ogr, tutar], i) => {
          const gir = ara(t, 0.18 + i * 0.02, 0.24 + i * 0.02)
          const es = ara(t, 0.32 + i * 0.06, 0.36 + i * 0.06)
          return (
            <div key={i} className="fs-ekstre" style={belir(gir)}>
              <span className="soluk">{tarih}</span>
              <span className="fs-ekstre-ac">{aciklama}<em style={{ opacity: es }}>→ {ogr} · Ekim aidatı</em></span>
              <span className="sag kalin">{tl(tutar)}</span>
              <span className={`fs-es ${es >= 1 ? 'tamam' : ''}`}>{es >= 1 && <Check size={11} strokeWidth={3} />}</span>
            </div>
          )
        })}
      </div>
      <div className="fs-kart" style={{ left: 430, top: 62, width: 202, height: 180, padding: 14 }}>
        <div className="fs-kucuk-b">Ekim tahsilat oranı</div>
        <div className="fs-buyuk-sayi">%{Math.round(oran)}</div>
        <div className="fs-cubuk"><span style={{ width: `${oran}%` }} /></div>
        <div className="fs-kucuk-a" style={{ marginTop: 8 }}>{tl(198400 * oran / 100)} / {tl(198400)}</div>
      </div>
      <div className="fs-kart" style={{ left: 430, top: 254, width: 202, height: 188, padding: 14 }}>
        <div className="fs-kucuk-b">Ödemesi geciken</div>
        <div className="fs-buyuk-sayi kirmizi">{geciken}</div>
        <div className="fs-kucuk-a">öğrenci kaldı</div>
        <div className="fs-not" style={{ ...belir(ara(t, 0.8, 0.86)), marginTop: 14 }}>Kalanlara velilerle paylaşılacak borç listesi hazır.</div>
      </div>
      <Bildirim p={ara(t, 0.78, 0.82) * (1 - ara(t, 0.96, 1))}>6 ödeme öğrencilere işlendi ve işletme defterine yazıldı</Bildirim>
    </>
  )
}

// ── 5. İşletme defteri + kapak ───────────────────────────────
const DEFTER: [string, string, number, boolean][] = [
  ['Gelir', 'Ödeme Takibi · 6 aidat', 27216, true], ['Gider', 'Ekim bordrosu · net ödeme', 63400, true], ['Gelir', 'Tahsilat Takip · kırtasiye', 8400, true],
  ['Gider', 'SGK ve vergi ödemesi', 14870, true], ['Gider', 'Kırtasiye malzemesi', 3260, false], ['Gelir', 'Ödeme Takibi · 18 aidat', 81648, true],
]
const KAPAK_AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim']

function IsletmeSahnesi({ t }: { t: number }) {
  const kagit = yumusak(ara(t, 0.5, 0.6))
  let gelir = 0, gider = 0
  DEFTER.forEach(([tur, , tutar], i) => { if (ara(t, 0.06 + i * 0.06, 0.1 + i * 0.06) >= 1) { if (tur === 'Gelir') gelir += tutar; else gider += tutar } })
  return (
    <>
      <Ust baslik="İşletme Defteri · Kulüp" alt="Ekim 2026 · hareketler kendiliğinden yazılır" dugme="Kapak PDF" ikon={<FileText size={13} />} basili={t > 0.46 && t < 0.49} />
      <div className="fs-kart fs-liste" style={{ top: 62 }}>
        <div className="fs-satir fs-satir-bas fs-defter"><span>Tür</span><span>Açıklama</span><span>Kaynak</span><span className="sag">Tutar</span></div>
        {DEFTER.map(([tur, aciklama, tutar, oto], i) => (
          <div key={i} className="fs-satir fs-defter" style={belir(ara(t, 0.06 + i * 0.06, 0.1 + i * 0.06))}>
            <span><b className={`fs-rozet ${tur === 'Gelir' ? 'yesil' : 'kirmizi'}`}>{tur}</b></span>
            <span>{aciklama}</span>
            <span className="soluk">{oto ? 'Otomatik' : 'Elle girildi'}</span>
            <span className={`sag kalin ${tur === 'Gelir' ? 'yesil-yazi' : 'kirmizi-yazi'}`}>{tur === 'Gelir' ? '+' : '−'}{tl(tutar)}</span>
          </div>
        ))}
        <div className="fs-satir fs-defter fs-satir-top"><span>Ekim</span><span>Gelir {tl(gelir)} · Gider {tl(gider)}</span><span /><span className="sag kalin">{gelir - gider >= 0 ? '+' : '−'}{tl(Math.abs(gelir - gider))}</span></div>
      </div>
      {kagit > 0 && (
        <div className="fs-kagit" style={{ transform: `translateY(${(1 - kagit) * 420}px) rotate(${(1 - kagit) * 4}deg)` }}>
          <div className="fs-kagit-ust">T.C.<br />ÖRNEK KAYMAKAMLIĞI<br />İlçe Millî Eğitim Müdürlüğü<br />Örnek Anaokulu</div>
          <div className="fs-kagit-bant">Çocuk Kulübü Hesabı</div>
          <div className="fs-kagit-b">2026 Yılı İşletme Hesabı Defteri</div>
          <div className="fs-kagit-tablo">
            <div className="bas"><span>Ay</span><span>Gelir</span><span>Gider</span><span>Bankada kalan</span></div>
            {KAPAK_AYLAR.map((a, i) => {
              const p = ara(t, 0.6 + i * 0.024, 0.62 + i * 0.024)
              const bakiye = 176735 + (i + 1) * 12442
              return (
                <div key={a} className={i === 9 && t > 0.86 ? 'vurgu' : ''}>
                  <span>{a}</span><span>{p >= 1 ? tl(150000 + i * 9300) : ''}</span><span>{p >= 1 ? tl(137558 + i * 9300) : ''}</span><span>{p >= 1 ? tl(bakiye) : ''}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}

// ── 6. Denetim dosyası ───────────────────────────────────────
// Varsayılan il evrak listesinden (migration_denetim_dosyasi.sql) seçilmiş maddeler: [sıra no, başlık, otomatik mi]
const MADDELER: [number, string, boolean][] = [
  [1, 'Kulüp açılış onayı', false], [2, 'Görevli personel listesi ve görevleri', true], [3, 'Banka hesap hareketleri (Excel)', false],
  [4, 'Sigortalı personel aylık puantajı', true], [6, 'Sigortalı personel aylık bordrosu', true], [8, 'Sigortalı personel 4/A hizmet listesi', false],
  [12, 'Ücret dağıtımını gösteren bilanço', true],
]
const OKULLAR: [string, string][] = [['Atatürk İlkokulu Çocuk Kulübü', 'Onaylandı'], ['Gazi Anaokulu Çocuk Kulübü', 'Hazırlanıyor'], ['Cumhuriyet Ortaokulu Çocuk Kulübü', 'Onaylandı']]

function DenetimSahnesi({ t }: { t: number }) {
  const hazir = Math.round(9 + 4 * ara(t, 0.06, 0.38))
  const gonderildi = t > 0.46
  return (
    <>
      <Ust baslik="Denetim Dosyası · Ekim 2026" alt={`${hazir}/13 madde hazır`} dugme={gonderildi ? 'Gönderildi' : 'Denetime gönder'} ikon={<Send size={13} />} basili={t > 0.43 && t < 0.46} />
      <div className="fs-kart fs-liste" style={{ top: 62 }}>
        {MADDELER.map(([sira, ad, oto], i) => {
          const p = oto ? 1 : ara(t, 0.08 + i * 0.045, 0.12 + i * 0.045)
          return (
            <div key={ad} className="fs-satir fs-madde">
              <span className={`fs-es ${p >= 1 ? 'tamam' : ''}`}>{p >= 1 && <Check size={11} strokeWidth={3} />}</span>
              <span>{sira}. {ad}</span>
              <span className="soluk">{oto ? 'Sistemden otomatik üretilir' : p >= 1 ? 'Yüklendi · PDF' : 'Bekliyor'}</span>
            </div>
          )
        })}
        <div className="fs-satir fs-madde soluk"><span /><span>… ve 6 madde daha</span><span /></div>
      </div>
      {gonderildi && <div className="fs-rozet-buyuk mavi" style={belir(ara(t, 0.46, 0.5))}><Send size={13} /> Dosya İl Millî Eğitim denetçisine gönderildi</div>}
      <Bildirim p={ara(t, 0.9, 0.93)}>Ekim denetim dosyanız il denetçisi tarafından onaylandı</Bildirim>
    </>
  )
}


/** Denetçinin ekranı: kulübün menüsü görünmesin diye tüm sahneyi kaplar */
function DenetciKaplamasi({ t }: { t: number }) {
  const denetci = ara(t, 0.55, 0.62)
  const onay = ara(t, 0.74, 0.78)
  // Onaydan sonra kulübün ekranına dönülür; bildirim orada görünür
  const gor = denetci * (1 - ara(t, 0.86, 0.9))
  if (gor <= 0) return null
  return (
    <div className="fs-denetci" style={{ opacity: gor }}>
      <div className="fs-denetci-ust"><ShieldCheck size={16} /> İl Millî Eğitim Müdürlüğü · Denetim paneli<em>Ekim 2026</em></div>
      <div className="fs-denetci-liste">
        <div className="fs-satir fs-okul vurgulu">
          <span>Örnek Anaokulu Çocuk Kulübü</span><span className="soluk">13/13 madde</span>
          <span><b className={`fs-rozet ${onay >= 1 ? 'yesil' : 'mavi'}`}>{onay >= 1 ? 'Onaylandı' : 'İnceleniyor'}</b></span>
        </div>
        {OKULLAR.map(([ad, durum]) => (
          <div key={ad} className="fs-satir fs-okul"><span>{ad}</span><span className="soluk">{durum === 'Onaylandı' ? '13/13 madde' : '8/13 madde'}</span><span><b className={`fs-rozet ${durum === 'Onaylandı' ? 'yesil' : ''}`}>{durum}</b></span></div>
        ))}
      </div>
      {onay > 0 && <div className="fs-muhur" style={{ opacity: onay, transform: `rotate(-8deg) scale(${1.6 - onay * 0.6})` }}>ONAYLANDI</div>}
    </div>
  )
}

// ── Bölümler ─────────────────────────────────────────────────
// Izgara hücresinin sahne koordinatı (CSS: kart left 18 + iç boşluk 12, saat sütunu 46 + 4 boşluk, 5 eşit sütun; satır 52 + 4)
const izgaraHucre = (g: number, d: number): [number, number] => [150 + 18 + 12 + 50 + g * 75.6 + 35.8, 62 + 10 + 24 + d * 56 + 26]
const [gx, gy] = izgaraHucre(GELMEDI.g, GELMEDI.d)

export const BOLUMLER: Bolum[] = [
  {
    id: 'kayit', kisa: 'Kayıt', gun: 'Ayın 1’i', menu: 1, sure: 10, adres: 'klup360.com / ogrenciler',
    baslik: 'Öğrenciyi kaydedin, aidatı kendiliğinden hesaplansın',
    anlatim: 'Yeni gelen çocuğun adını, sınıfını ve velisini girersiniz. Aylık aidatı tatiller ve iş günleri hesaba katılarak o anda hesaplanır; kardeş indirimi ve ücretsiz öğrenci gibi durumlar tek tıkla işaretlenir.',
    maddeler: ['Sınıf ve kontenjan takibi', 'İş gününe göre otomatik aidat', 'Kardeş indirimi, ücretsiz öğrenci', 'Veli iletişim bilgileri'],
    altyazi: [[0, 'Ayın ilk günü kulübe yeni bir öğrenci geliyor.'], [0.15, 'Adını, sınıfını ve velisinin telefonunu yazıyoruz…'], [0.53, 'Aylık aidatı, o ayın iş günlerine göre sistem kendisi hesaplıyor.'], [0.7, 'Kaydet — Elif artık listede ve aidat takibi başladı.']],
    imlec: [[0, 620, 300], [0.07, 716, 27], [0.09, 716, 27, true], [0.15, 470, 140, true], [0.29, 470, 140], [0.32, 470, 198, true], [0.41, 470, 256, true], [0.6, 637, 349], [0.66, 637, 349, true], [0.8, 560, 160], [1, 560, 160]],
    Sahne: KayitSahnesi,
  },
  {
    id: 'defter', kisa: 'Sınıf defteri', gun: 'Her gün', menu: 2, sure: 9, adres: 'klup360.com / sinif-defteri',
    baslik: 'Öğretmen yoklaması alınır, ders saatleri puantaja geçer',
    anlatim: 'Ders programını sınıf defterine aktarırsınız; her dersin öğretmeni hazır gelir. Gelmeyen öğretmeni işaretlemeniz yeterli: o saat puantajdan düşer ve bordroya doğru saat gider.',
    maddeler: ['Haftalık ders programı', 'Öğretmen geldi / gelmedi yoklaması', 'Tatil günleri otomatik kapanır', 'Puantaja otomatik aktarım'],
    altyazi: [[0, 'Hafta başında ders programını sınıf defterine aktarıyoruz.'], [0.12, 'Her dersin öğretmeni kendiliğinden yerleşiyor.'], [0.47, 'Çarşamba 4. derse öğretmen gelmedi; tek tıkla işaretliyoruz.'], [0.56, 'O saat puantajdan düştü. Bordroya yalnızca girilen dersler gidecek.']],
    imlec: [[0, 500, 300], [0.06, 716, 27], [0.08, 716, 27, true], [0.4, 520, 260], [0.48, gx, gy], [0.5, gx, gy, true], [0.62, 705, 160], [1, 705, 160]],
    Sahne: DefterSahnesi,
  },
  {
    id: 'tahsilat', kisa: 'Tahsilat', gun: 'Ayın 10’u', menu: 5, sure: 10, adres: 'klup360.com / isletme-defteri',
    baslik: 'Banka ekstresini yükleyin, ödemeler öğrencilerle eşleşsin',
    anlatim: 'Bankadan indirdiğiniz Excel ekstresini işletme defterine aktarırsınız. Açıklamadaki isimden hangi öğrencinin hangi ayı ödediği bulunur; ödeme Ödeme Takibi’ne işlenir, tahsilat oranı ve geciken öğrenci listesi güncellenir.',
    maddeler: ['Excel / CSV ekstre aktarımı', 'Öğrenci ve ay eşleştirme', 'Geciken ödeme listesi', 'Kırtasiye, gezi gibi ek tahsilatlar'],
    altyazi: [[0, 'Velilerin ödemeleri bankaya düştü.'], [0.06, 'Bankanın Excel ekstresini sisteme bırakıyoruz.'], [0.3, 'Her hareket açıklamadaki isimden doğru öğrenciyle eşleşiyor.'], [0.78, 'Tahsilat oranı %94’e çıktı; geriye 2 geciken öğrenci kaldı.']],
    imlec: [[0, 400, 300], [0.04, 716, 27], [0.06, 716, 27, true], [0.2, 300, 200], [0.6, 320, 330], [0.8, 530, 140], [1, 530, 140]],
    Sahne: TahsilatSahnesi,
  },
  {
    id: 'bordro', kisa: 'Bordro', gun: 'Ayın 20’si', menu: 3, sure: 10, adres: 'klup360.com / bordro',
    baslik: 'Tek tıkla bordro, ücret zarfı ve e-posta',
    anlatim: 'Puantajdaki saatlerden brüt ücret, SGK primi, gelir ve damga vergisi güncel MEB katsayılarıyla hesaplanır. Ücret zarflarını PDF olarak alır ya da her personele e-postayla gönderirsiniz.',
    maddeler: ['MEB katsayısı ve vergi dilimleri', 'SGK ve eksik gün bildirimi', 'Ücret zarfı PDF', 'Personele e-posta ile gönderim'],
    altyazi: [[0, 'Ay sonu yaklaştı; bordro zamanı.'], [0.15, '“Bordroyu hesapla” dediğimiz anda puantaj saatleri ücrete dönüşüyor.'], [0.6, 'SGK, gelir vergisi ve damga vergisi kesintileri hazır.'], [0.74, 'Ücret zarflarını tek tıkla her personelin e-postasına gönderiyoruz.']],
    imlec: [[0, 500, 300], [0.13, 716, 27], [0.16, 716, 27, true], [0.5, 640, 250], [0.74, 435, 407], [0.8, 435, 407, true], [1, 435, 407]],
    Sahne: BordroSahnesi,
  },
  {
    id: 'isletme', kisa: 'İşletme defteri', gun: 'Ay sonu', menu: 5, sure: 10, adres: 'klup360.com / kulup / isletme-defteri',
    baslik: 'İşletme defteri kendini yazar, kapağı tek tıkla çıkar',
    anlatim: 'Aidatlar, bordro ödemeleri ve diğer tahsilatlar işletme defterine kendiliğinden işlenir. Yıl sonunda resmî kapak sayfasını ay ay gelir, gider ve bankada kalan tutarla PDF olarak alırsınız.',
    maddeler: ['Gelir / gider defteri', 'Nakli toplamlı resmî PDF', 'Aylık özet ve devreden tutar', 'Resmî kapak sayfası'],
    altyazi: [[0, 'Bu ayın bütün para hareketleri deftere kendiliğinden yazıldı.'], [0.4, 'Elle girilmesi gereken tek satır: kırtasiye alışverişi.'], [0.47, 'Kapak PDF’i istiyoruz…'], [0.62, '…ve ay ay gelir, gider, bankada kalan tutarıyla resmî kapak hazır.']],
    imlec: [[0, 500, 320], [0.42, 600, 200], [0.46, 716, 27], [0.48, 716, 27, true], [0.7, 760, 120], [1, 760, 120]],
    Sahne: IsletmeSahnesi,
  },
  {
    id: 'denetim', kisa: 'Denetim', gun: 'Denetim günü', menu: 6, sure: 10, adres: 'klup360.com / evrak-dosyasi',
    baslik: 'Aylık denetim dosyası tek tıkla il denetçisine',
    anlatim: 'İlinizin istediği evrak listesi hazır gelir. Bordro, puantaj, personel listesi ve bilanço sistemden kendiliğinden üretilir; siz yalnızca imzalı belgeleri yüklersiniz. Dosya il denetçisinin paneline düşer; onay ya da iade notu size geri döner.',
    maddeler: ['İl bazlı evrak listesi', 'Otomatik üretilen belgeler', 'Denetçi onayı ve iade notu', 'Salt okunur denetçi paneli'],
    altyazi: [[0, 'Ayın denetim dosyası: 13 madde.'], [0.06, 'Bordro, puantaj ve bilanço sistemden kendiliğinden geliyor; kalanları yüklüyoruz.'], [0.44, 'Hepsi tamam. Denetime gönderiyoruz.'], [0.6, 'Dosya, İl Millî Eğitim denetçisinin paneline düştü…'], [0.76, '…ve onaylandı. Bir ay daha tamam.']],
    imlec: [[0, 500, 300], [0.4, 600, 120], [0.43, 716, 27], [0.45, 716, 27, true], [0.62, 620, 160], [0.72, 625, 96], [1, 625, 96]],
    Sahne: DenetimSahnesi,
    Kaplama: DenetciKaplamasi,
  },
]
