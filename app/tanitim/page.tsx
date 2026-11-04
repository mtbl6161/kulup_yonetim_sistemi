'use client'
import Link from 'next/link'
import { useCallback, useRef, useState, type MouseEvent } from 'react'
import { Check, Menu, PlayCircle, X } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { Film, Sinema, FILM_CSS, KULUP_SETI, kaydiriciBul, type FilmSeti } from './Film'
import { BOLUMLER } from './sahneler'
import { DENETCI_SETI, DENETCI_CSS } from './denetciSahneleri'
import { AySeridi, AY_CSS, type AyOlayi, type AySeridiTutamak } from './AySeridi'
import { BrandMark, Wordmark } from '@/components/brand/Logo'
import { AYLIK_UCRET, DENEME_GUN, YILLIK_UCRET, tl } from '@/lib/abonelikPlanlari'

/* ----------------------------------------------------------------- içerik */

// Ay şeridindeki olaylar. bolum: filmdeki karşılığı; hedef: sayfadaki bölüm
const AY_OLAYLARI: AyOlayi[] = [
  { gun: 1, ad: 'Kayıt', bolum: 0 },
  { gun: 2, ad: 'Her gün yoklama', bolum: 1, satir: 2 },
  { gun: 10, ad: 'Tahsilat', bolum: 2 },
  { gun: 20, ad: 'Bordro', bolum: 3 },
  { gun: 26, ad: 'Muhtasar', hedef: 'muhtasar' },
  { gun: 30, ad: 'Ay sonu', bolum: 4, satir: 2, hizala: 'son' },
  { gun: 31, ad: 'Denetim', bolum: 5, hizala: 'son' },
]

// Filmde gösterilmeyen ama sistemde bulunan modüller (fihrist)
const FIHRIST = [
  ['Ders programı', 'Sınıf ve öğretmen bazlı haftalık program; sınıf defterine aktarılır'],
  ['Personel', 'Görev, SGK durumu, IBAN ve iletişim bilgileri tek kayıtta'],
  ['Sınıflar ve kontenjan', 'Yaş grubu ve kapasite; doluluk panelde izlenir'],
  ['Tahsilat takip', 'Kırtasiye, gezi, etkinlik ödemeleri ve taksit planları'],
  ['Gelir, gider ve bilanço', 'Aylık kâr-zarar, ücret dağıtım bilançosu, hesap hareketleri'],
  ['Okul Aile Birliği', 'Bağış ve aidat tahsilatı, birliğin kendi işletme defteri'],
  ['Hatırlatmalar', 'Geciken ödeme, eksik puantaj ve yaklaşan beyanname günü'],
  ['Raporlar', 'Aylık özet, işletme defteri ve bilanço PDF olarak'],
]

const DENETIM_MADDELERI = [
  ['İl geneli özet', 'İldeki kulüplerin öğrenci, personel ve dosya durumu tek ekranda; ilçeye göre süzülür.'],
  ['Okul okul dosya', 'Her kulübün dosyasına inilir; öğrenci ve kapasite kontrolleri o anda hesaplanır.'],
  ['Madde madde evrak', 'Gönderilen belgeler tek tek incelenir, onaylanır ya da notla iade edilir.'],
  ['Bordro kontrolü', 'Beyan edilen bordro sistemin yeniden hesaplamasıyla karşılaştırılır; farklar listelenir.'],
  ['Fiilî devam', 'Hangi öğretmenin hangi sınıfta derste olduğu sınıf defterinden görülür.'],
  ['Yalnızca okuma', 'Denetim yetkilisi kayıtları değiştiremez ve silemez.'],
]

const SORULAR = [
  ['Denetçi verilerimizi değiştirebilir mi?', 'Hayır. Denetim yetkilisi kayıtları yalnızca görüntüler; değiştiremez, silemez. Gönderdiğiniz dosyayı onaylar ya da notla size iade eder.'],
  ['Başka bir okul bizim kayıtlarımızı görebilir mi?', 'Hayır. Her kurumun verisi ayrı tutulur ve yalnızca o kurumun kullanıcılarına açılır. Veriler şifrelenmiş olarak bulutta saklanır.'],
  ['Bordro neye göre hesaplanıyor?', 'Puantajdaki ders saatlerinden; MEB katsayıları, güncel SGK oranları ve gelir vergisi dilimleriyle. Vergi dilimlerini ayarlardan kendiniz de güncelleyebilirsiniz.'],
  ['Bilgisayara program kurmam gerekiyor mu?', 'Hayır. Klüp360 tarayıcıda çalışır; okuldaki bilgisayardan da telefonunuzdan da açılır.'],
  ['Deneme bitince ne olur?', `${DENEME_GUN} günlük deneme bitince aylık ₺${tl(AYLIK_UCRET)} ya da yıllık ₺${tl(YILLIK_UCRET)} ile devam edersiniz. Abone olmazsanız girdiğiniz kayıtlar silinmez; abone olduğunuzda kaldığınız yerden sürer.`],
]

/* ----------------------------------------------------------------- sayfa */

export default function TanitimPage() {
  const { user, profil } = useAuth()
  const panelUrl = profil?.rol === 'super_admin' ? '/yonetim' : (profil?.rol === 'denetim_yetkilisi' ? '/denetim' : '/')

  // Filmler sayfadan ayrılmadan tam ekran izleme katmanında açılır
  const [sinema, setSinema] = useState<{ set: FilmSeti; bolum: number; donus?: HTMLElement | null } | null>(null)
  const sinemayiKapat = useCallback(() => setSinema(null), [])
  const [menuAcik, setMenuAcik] = useState(false)

  // Ay şeridi ↔ film: film her karede şeridi günceller (yalnızca şerit yeniden çizilir), şerit filmi bölüme atlatır
  const serit = useRef<AySeridiTutamak>(null)
  const kareBildir = useCallback((bolum: number, t: number) => serit.current?.guncelle(bolum, t), [])
  const [atla, setAtla] = useState<{ bolum: number; n: number } | undefined>(undefined)
  const bolumeAtla = useCallback((bolum: number) => setAtla(a => ({ bolum, n: (a?.n ?? 0) + 1 })), [])

  // Sayfa içi bağlantılar: iç kaydırma kabını kaydır, sabit üst menünün altında kalmasın
  const git = useCallback((id: string, e?: MouseEvent) => {
    const el = document.getElementById(id), s = kaydiriciBul(el)
    if (!el || !s) return
    e?.preventDefault()
    setMenuAcik(false)
    const hareketAz = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    s.scrollTo({ top: el.getBoundingClientRect().top - s.getBoundingClientRect().top + s.scrollTop - 72, behavior: hareketAz ? 'auto' : 'smooth' })
    history.replaceState(null, '', `#${id}`)
  }, [])

  return (
    <div className="tz">
      <style>{CSS + AY_CSS + FILM_CSS + DENETCI_CSS}</style>

      {/* ---------------------------------------------------------- MENÜ */}
      <nav className="tz-nav">
        <div className="tz-nav-ic">
          <Link href="/tanitim" className="tz-marka" aria-label="Klüp360 ana sayfa">
            <BrandMark size={36} title="" />
            <Wordmark height={28} />
          </Link>

          <div className="tz-nav-baglantilar">
            <a href="#ay" onClick={e => git('ay', e)}>Nasıl çalışır</a>
            <a href="#muhtasar" onClick={e => git('muhtasar', e)}>Muhtasar</a>
            <Link href="/fiyatlandirma">Fiyatlandırma</Link>
            <Link href="/rehber">Rehber ve araçlar</Link>
            <Link href="/tanitim/iletisim">İletişim</Link>
          </div>

          <div className="tz-nav-eylem">
            {user ? (
              <Link href={panelUrl} className="tz-dugme tz-dugme-ikincil">Panele dön</Link>
            ) : (
              <>
                <Link href="/login" className="tz-nav-giris">Giriş yap</Link>
                <Link href="/signup" className="tz-dugme tz-dugme-ana">Ücretsiz deneyin</Link>
              </>
            )}
            <button type="button" className="tz-menu-dugme" onClick={() => setMenuAcik(v => !v)} aria-expanded={menuAcik} aria-controls="tz-mobil-menu" aria-label={menuAcik ? 'Menüyü kapat' : 'Menüyü aç'}>
              {menuAcik ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {menuAcik && (
          <div id="tz-mobil-menu" className="tz-mobil-menu" onKeyDown={e => { if (e.key === 'Escape') setMenuAcik(false) }}>
            <a href="#ay" onClick={e => git('ay', e)}>Nasıl çalışır</a>
            <a href="#muhtasar" onClick={e => git('muhtasar', e)}>Muhtasar</a>
            <Link href="/fiyatlandirma" onClick={() => setMenuAcik(false)}>Fiyatlandırma</Link>
            <Link href="/rehber" onClick={() => setMenuAcik(false)}>Rehber ve araçlar</Link>
            <Link href="/tanitim/iletisim" onClick={() => setMenuAcik(false)}>İletişim</Link>
            {!user && <Link href="/login" onClick={() => setMenuAcik(false)} className="tz-mobil-giris">Giriş yap</Link>}
          </div>
        )}
      </nav>

      {/* ---------------------------------------------------------- GİRİŞ: başlık, ay şeridi, film */}
      <header className="tz-giris" id="film">
        <div className="tz-kap">
          <div className="tz-giris-metin">
            <h1 className="tz-h1">Kulübün bir ayı, kayıttan denetime.</h1>
            <p className="tz-giris-ozet">
              Yoklama, bordro, aidat, muhtasar beyannamesi ve aylık denetim dosyası aynı sistemde birbirine bağlı.
              Aşağıda bir ayın tamamını izleyin; ekranlar sistemin kendisi, veriler örnek.
            </p>
            <div className="tz-eylemler">
              <Link href="/signup" className="tz-dugme tz-dugme-ana tz-dugme-buyuk">{DENEME_GUN} gün ücretsiz deneyin</Link>
              <span className="tz-not">Kredi kartı istenmez. Hesaplar MEB Çocuk Kulüpleri Yönergesi’ne göre yapılır.</span>
            </div>
          </div>

          <div className="tz-ay">
            <AySeridi ref={serit} olaylar={AY_OLAYLARI} onBolum={bolumeAtla} onHedef={id => git(id)} />
          </div>
          <div className="tz-film">
            <Film onKare={kareBildir} atla={atla} esik={0.12} onBuyut={b => setSinema({ set: KULUP_SETI, bolum: b })} />
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------- AYIN AKIŞI */}
      <section className="tz-bolum" id="ay">
        <div className="tz-kap">
          <div className="tz-bas">
            <h2 className="tz-h2">Bir kez girdiğiniz bilgi ayın sonuna kadar taşınır</h2>
            <p className="tz-ozet">
              Öğrencinin aidatı kayıtla birlikte hesaplanır. Sınıf defterindeki dersler puantaja, puantaj bordroya geçer.
              Tahsilatlar işletme defterine, bordro ve puantaj denetim dosyasına kendiliğinden yansır.
            </p>
          </div>

          <ol className="tz-akis">
            {BOLUMLER.flatMap((b, i) => {
              const satir = (
                <AkisSatiri key={b.id} gun={b.gun} baslik={b.baslik}
                  eylem={<button type="button" className="tz-metin-dugme" onClick={e => setSinema({ set: KULUP_SETI, bolum: i, donus: e.currentTarget })}><PlayCircle size={16} /> Bu adımı izleyin</button>}>
                  <p>{b.anlatim}</p>
                  <ul className="tz-maddeler">{b.maddeler.map(m => <li key={m}>{m}</li>)}</ul>
                </AkisSatiri>
              )
              if (b.id !== 'bordro') return [satir]
              return [satir, (
                <AkisSatiri key="muhtasar" gun="Ayın 26’sı" baslik="Muhtasar ve prim hizmet beyannamesi hazır" vurgu
                  eylem={<a href="#muhtasar" className="tz-metin-dugme" onClick={e => git('muhtasar', e)}>Dosyaya bakın</a>}>
                  <p>Bordrodaki tutarlar ve puantajdaki günler, e-Beyanname’ye yüklenecek XML dosyasına dönüşür. Muhasebeciye ayrıca bordro göndermeniz gerekmez.</p>
                </AkisSatiri>
              )]
            })}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------- MUHTASAR */}
      <section className="tz-bolum tz-muhtasar" id="muhtasar">
        <div className="tz-kap tz-muh">
          <div>
            <h2 className="tz-h2">Muhtasar beyannamesini yeniden yazmayın.</h2>
            <p className="tz-ozet">
              Bordro bittiğinde muhtasar ve prim hizmet beyannamesinin XML dosyası da hazırdır. Dosyayı indirip e-Beyanname’ye
              yüklemeniz yeterli; personel bilgileri, prim günleri ve kazançlar yeniden girilmez.
            </p>
            <ul className="tz-tikler">
              <li>GİB’in Ekim 2026 döneminden itibaren istediği 22. sürüm</li>
              <li>Muhtasar matrahları ve SGK prim hizmet bildirimi tek dosyada</li>
              <li>Eksik gün sayısı ve nedeni puantajdan gelir</li>
              <li>Vergi dairesi kodu gibi eksik bir bilgi varsa dosya üretilmeden önce uyarır</li>
            </ul>
          </div>
          <figure className="tz-dosya">
            <figcaption className="tz-dosya-ust">
              <span>MUHSGK_22_2026-10.xml</span>
              <span className="tz-dosya-etiket">Örnek dosya</span>
            </figcaption>
            <pre aria-label="Muhtasar beyannamesi XML dosyasından kısaltılmış satırlar">{XML_ORNEK}</pre>
            <div className="tz-dosya-alt">
              <p><b>Önce:</b> bordrolar muhasebeciye gider, her personel e-Beyanname’de tek tek yeniden girilir.</p>
              <p><b>Şimdi:</b> dosyayı indirin, yükleyin.</p>
            </div>
          </figure>
        </div>
      </section>

      {/* ---------------------------------------------------------- FİHRİST */}
      <section className="tz-bolum tz-bolum-ince">
        <div className="tz-kap">
          <div className="tz-bas">
            <h2 className="tz-h2">Kulübün diğer işleri de aynı sistemde</h2>
          </div>
          <dl className="tz-fihrist">
            {FIHRIST.map(([ad, ne]) => (
              <div key={ad}><dt>{ad}</dt><dd>{ne}</dd></div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---------------------------------------------------------- DENETÇİ */}
      <section className="tz-denetci">
        <div className="tz-kap">
          <div className="tz-bas">
            <h2 className="tz-h2">Denetçinin gördüğü ekran</h2>
            <p className="tz-ozet">
              İl millî eğitim denetçileri için: ildeki kulüplerin aylık dosyaları tek kuyrukta toplanır. Belgeleri açar,
              bordroyu sistemin yeniden hesaplamasıyla kontrol eder, onaylar ya da notla iade edersiniz.
            </p>
          </div>
          <div className="tz-film">
            <Film set={DENETCI_SETI} onBuyut={b => setSinema({ set: DENETCI_SETI, bolum: b })} />
          </div>
          <div className="tz-tutanak">
            <ul>
              {DENETIM_MADDELERI.map(([ad, ne]) => (
                <li key={ad}><Check size={18} strokeWidth={3} aria-hidden /><span><b>{ad}.</b> {ne}</span></li>
              ))}
            </ul>
            <Link href="/login?type=denetim" className="tz-dugme tz-dugme-acik">Denetçi olarak giriş yapın</Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- SORULAR */}
      <section className="tz-bolum">
        <div className="tz-kap">
          <div className="tz-bas">
            <h2 className="tz-h2">Okulların ilk sorduğu sorular</h2>
          </div>
          <dl className="tz-sorular">
            {SORULAR.map(([s, c]) => (
              <div key={s}><dt>{s}</dt><dd>{c}</dd></div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---------------------------------------------------------- KAPANIŞ */}
      <section className="tz-kapanis">
        <div className="tz-kap">
          <h2 className="tz-h2">Bu ayı Klüp360’ta kapatın.</h2>
          <ol className="tz-adimlar">
            <li>Kurumunuzu kaydedin; okul, SGK ve vergi bilgilerini girin.</li>
            <li>Personel ve öğrencileri ekleyin ya da Excel’den aktarın.</li>
            <li>Ayı yönetin: yoklama, tahsilat, bordro, muhtasar ve denetim dosyası.</li>
          </ol>
          <div className="tz-eylemler">
            <Link href="/signup" className="tz-dugme tz-dugme-ana tz-dugme-buyuk">{DENEME_GUN} gün ücretsiz deneyin</Link>
            <Link href="/fiyatlandirma" className="tz-metin-dugme">Fiyatları görün</Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- ALTBİLGİ */}
      <footer className="tz-alt">
        <div className="tz-kap tz-alt-ic">
          <div className="tz-alt-marka">
            <BrandMark size={40} tone="blue" title="" />
            <div>
              <Wordmark height={26} onDark />
              <div className="tz-alt-etiket">MEB çocuk kulüpleri yönetim sistemi</div>
            </div>
          </div>
          <div className="tz-alt-baglantilar">
            <Link href="/rehber">Rehber ve araçlar</Link>
            <Link href="/fiyatlandirma">Fiyatlandırma</Link>
            <Link href="/tanitim/kullanim-kosullari">Kullanım koşulları</Link>
            <Link href="/tanitim/gizlilik-politikasi">Gizlilik</Link>
            <Link href="/tanitim/kvkk-aydinlatma-metni">KVKK</Link>
            <Link href="/tanitim/iade-politikasi">İade</Link>
            <Link href="/tanitim/iletisim">İletişim</Link>
            <Link href="/login">Giriş</Link>
          </div>
        </div>
        <div className="tz-kap tz-alt-telif">© {new Date().getFullYear()} Klüp360. Tüm hakları saklıdır.</div>
      </footer>

      {sinema && <Sinema set={sinema.set} bolum={sinema.bolum} donus={sinema.donus} onKapat={sinemayiKapat} />}
    </div>
  )
}

function AkisSatiri({ gun, baslik, eylem, vurgu, children }: { gun: string; baslik: string; eylem: React.ReactNode; vurgu?: boolean; children: React.ReactNode }) {
  return (
    <li className={`tz-akis-satir${vurgu ? ' vurgu' : ''}`}>
      <div className="tz-akis-gun">{gun}</div>
      <div className="tz-akis-icerik">
        <h3>{baslik}</h3>
        {children}
        {eylem}
      </div>
    </li>
  )
}

// Sistemin ürettiği dosyanın kısaltılmış satırları; etiket adları lib/muhsgk.ts ile aynı
const XML_ORNEK = `<?xml version="1.0" encoding="ISO-8859-9"?>
<beyanname kodVer="MUHSGK_22" …>
  <genel>
    <idari>
      <vdKodu>…</vdKodu>
      <donem>
        <tip>aylik</tip><yil>2026</yil><ay>10</ay>
      </donem>
    </idari> …
  </genel>
  <ozel>
    <matrahBildirimleri>
      <matrahBildirimi>
        <turKodu>…</turKodu>
        <gayrisafiTutar>…</gayrisafiTutar> …
  </ozel>
  <ekler> … <calisanBilgisi>
    <eksikGunSayisi>…</eksikGunSayisi>
    <eksikGunNedeni>…</eksikGunNedeni> …
  </ekler>
</beyanname>`

/* ----------------------------------------------------------------- stiller */

const CSS = `
.tz{
  --tz-kagit:#FFFFFF; --tz-zemin:#F6F8FC; --tz-cizgi:#DCE3F3; --tz-murekkep:#1A2233;
  --tz-mavi:#2347D9; --tz-mavi-koyu:#1B38B8; --tz-acik:#8EA3EE; --tz-kalem:#C8322B;
  --tz-mavi-soluk:#E6ECFC; --tz-mavi-soluk-cizgi:#C9D4FA;
  --tz-tx2:#465066; --tz-tx3:#66708A; --tz-gece:#141C2E;
  --tz-baslik:var(--font-tz-baslik), var(--font-display), system-ui, sans-serif;
  --tz-govde:var(--font-tz-govde), var(--font-sans), system-ui, sans-serif;
  font-family:var(--tz-govde); font-size:17px; line-height:1.6; color:var(--tz-murekkep); background:var(--tz-kagit);
  -webkit-font-smoothing:antialiased;
}
.tz *,.tz *::before,.tz *::after{box-sizing:border-box}
.tz :where(a){color:inherit;text-decoration:none}
.tz :where(h1,h2,h3,p,ul,ol,dl,dd,figure){margin:0}
.tz-kap{width:100%;max-width:1120px;margin:0 auto;padding:0 clamp(16px,4vw,40px)}

/* yazı ölçeği: 14 · 17 · 21 · 28 · 40 · 60 */
.tz-h1,.tz-h2,.tz h3,.tz-akis-gun{font-family:var(--tz-baslik);font-weight:700;letter-spacing:-.012em}
.tz-h1{font-size:clamp(38px,5.4vw,60px);line-height:1.04;max-width:17ch;text-wrap:balance}
.tz-h2{font-size:clamp(28px,3.6vw,40px);line-height:1.12;max-width:22ch}
.tz h3{font-size:21px;line-height:1.25}
.tz-ozet{color:var(--tz-tx2);max-width:62ch;margin-top:14px}

/* düğmeler */
.tz-dugme{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 18px;border-radius:10px;
  font:600 15px/1 var(--tz-govde);border:1px solid transparent;cursor:pointer;white-space:nowrap}
.tz-dugme-buyuk{min-height:52px;padding:0 24px;font-size:16.5px}
.tz-dugme-ana{background:var(--tz-mavi);color:#fff}
.tz-dugme-ana:hover{background:var(--tz-mavi-koyu)}
.tz-dugme-ikincil{background:var(--tz-kagit);color:var(--tz-murekkep);border-color:var(--tz-cizgi)}
.tz-dugme-ikincil:hover{border-color:var(--tz-mavi)}
.tz-dugme-acik{background:#fff;color:var(--tz-gece)}
.tz-dugme-acik:hover{background:var(--tz-mavi-soluk)}
.tz-metin-dugme{display:inline-flex;align-items:center;gap:7px;min-height:44px;padding:0;border:0;background:none;cursor:pointer;
  font:600 15px/1 var(--tz-govde);color:var(--tz-mavi);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:5px}
.tz-metin-dugme:hover{text-decoration-thickness:2px}
.tz a:focus-visible,.tz button:focus-visible{outline:3px solid var(--tz-mavi);outline-offset:3px;border-radius:6px}
.tz-eylemler{display:flex;flex-wrap:wrap;align-items:center;gap:12px 22px;margin-top:28px}
.tz-not{font-size:14px;color:var(--tz-tx3);max-width:40ch;line-height:1.45}

/* menü */
.tz-nav{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.94);border-bottom:1px solid var(--tz-cizgi)}
.tz-nav-ic{max-width:1120px;margin:0 auto;height:68px;padding:0 clamp(16px,4vw,40px);display:flex;align-items:center;gap:28px}
.tz-marka{display:flex;align-items:center;gap:10px;flex-shrink:0}
.tz-nav-baglantilar{display:flex;gap:24px;margin-right:auto}
.tz-nav-baglantilar a{font-size:15px;color:var(--tz-tx2)}
.tz-nav-baglantilar a:hover{color:var(--tz-murekkep);text-decoration:underline;text-underline-offset:5px}
.tz-nav-eylem{display:flex;align-items:center;gap:16px;margin-left:auto}
.tz-nav-giris{font-size:15px;font-weight:600}
.tz-menu-dugme{display:none;width:44px;height:44px;border-radius:10px;border:1px solid var(--tz-cizgi);background:var(--tz-kagit);color:var(--tz-murekkep);align-items:center;justify-content:center;cursor:pointer}
.tz-mobil-menu{display:none}

/* giriş */
.tz-giris{padding:clamp(40px,6vw,72px) 0 clamp(48px,6vw,72px);border-bottom:1px solid var(--tz-cizgi)}
.tz-giris-metin{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:22px 56px;align-items:end}
.tz-giris-metin .tz-h1{grid-column:1/-1;max-width:none}
.tz-giris-ozet{font-size:clamp(17px,1.6vw,19px);color:var(--tz-tx2);max-width:56ch}
.tz-giris-metin .tz-eylemler{margin-top:0;flex-direction:column;align-items:flex-start;gap:10px}
.tz-giris-metin .tz-not{max-width:34ch}
.tz-ay{margin-top:clamp(36px,4.5vw,52px)}
.tz-film{margin-top:16px}

/* bölümler */
.tz-bolum{padding:clamp(64px,8vw,104px) 0;border-bottom:1px solid var(--tz-cizgi)}
.tz-bolum-ince{padding:clamp(56px,6vw,80px) 0}
.tz-bas{margin-bottom:clamp(32px,4vw,48px)}

/* ayın akışı: sol sütun gün, sağ sütun anlatım */
.tz-akis{list-style:none;padding:0;border-top:2px solid var(--tz-murekkep)}
.tz-akis-satir{display:grid;grid-template-columns:200px minmax(0,1fr);gap:24px;padding:28px 0;border-bottom:1px solid var(--tz-cizgi)}
.tz-akis-gun{font-size:21px;color:var(--tz-mavi);padding-top:1px}
.tz-akis-icerik{max-width:68ch}
.tz-akis-icerik p{color:var(--tz-tx2);margin-top:10px}
.tz-akis-icerik .tz-metin-dugme{margin-top:8px}
.tz-akis-satir.vurgu .tz-akis-gun{color:var(--tz-murekkep)}
.tz-akis-satir.vurgu .tz-akis-gun::after{content:"";display:block;width:32px;height:4px;border-radius:2px;background:var(--tz-mavi);margin-top:10px}
.tz-maddeler{list-style:none;padding:0;margin-top:12px;display:flex;flex-wrap:wrap;gap:6px 8px}
.tz-maddeler li{font-size:14px;color:var(--tz-murekkep);background:var(--tz-zemin);border:1px solid var(--tz-cizgi);border-radius:6px;padding:3px 9px}

/* muhtasar */
.tz-muhtasar{background:var(--tz-zemin)}
.tz-muh{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(32px,5vw,64px);align-items:start}
.tz-tikler{list-style:none;padding:0;margin-top:24px;display:grid;gap:10px}
.tz-tikler li{position:relative;padding-left:28px}
.tz-tikler li::before{content:"";position:absolute;left:2px;top:7px;width:14px;height:8px;border-left:3px solid var(--tz-mavi);border-bottom:3px solid var(--tz-mavi);transform:rotate(-45deg)}
.tz-dosya{background:var(--tz-kagit);border:1px solid var(--tz-cizgi);border-radius:12px;overflow:hidden}
.tz-dosya-ust{display:flex;justify-content:space-between;align-items:center;gap:12px;background:var(--tz-gece);color:#fff;padding:10px 14px;font:600 14.5px/1.3 var(--tz-govde)}
.tz-dosya-etiket{font-weight:500;font-size:13px;color:rgba(255,255,255,.66)}
.tz-dosya pre{margin:0;padding:16px 18px;font:12.5px/1.6 ui-monospace,'SF Mono',Consolas,monospace;color:#2A3550;white-space:pre-wrap;word-break:break-word;border-bottom:1px solid var(--tz-cizgi)}
.tz-dosya-alt{padding:14px 18px;font-size:15px;display:grid;gap:4px}

/* fihrist: noktalı kılavuz çizgisiyle iki sütun */
.tz-fihrist{display:grid;grid-template-columns:1fr 1fr;gap:0 56px;border-top:2px solid var(--tz-murekkep)}
.tz-fihrist>div{display:grid;grid-template-columns:minmax(0,max-content) 1fr;align-items:baseline;gap:0 10px;padding:16px 0;border-bottom:1px solid var(--tz-cizgi)}
.tz-fihrist dt{font-weight:600;display:flex;align-items:baseline;gap:10px;white-space:nowrap}
.tz-fihrist dt::after{content:"";flex:1;min-width:24px;border-bottom:2px dotted var(--tz-cizgi);transform:translateY(-4px)}
.tz-fihrist dd{color:var(--tz-tx2);font-size:15.5px}

/* denetçi (koyu) */
.tz-denetci{background:var(--tz-gece);color:#fff;padding:clamp(64px,8vw,104px) 0}
.tz-denetci .tz-ozet{color:rgba(255,255,255,.74)}
.tz-tutanak{margin-top:clamp(32px,4vw,48px);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px 48px;align-items:end}
.tz-tutanak ul{list-style:none;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:14px 40px}
.tz-tutanak li{display:flex;gap:12px;align-items:flex-start;color:rgba(255,255,255,.78);font-size:15.5px}
.tz-tutanak li svg{color:#F06A5F;flex-shrink:0;margin-top:3px}
.tz-tutanak b{color:#fff;font-weight:600}

/* sorular */
.tz-sorular{display:grid;grid-template-columns:1fr 1fr;gap:32px 56px}
.tz-sorular dt{font-family:var(--tz-baslik);font-weight:700;font-size:19px;line-height:1.3}
.tz-sorular dd{color:var(--tz-tx2);margin-top:8px;max-width:58ch}

/* kapanış */
.tz-kapanis{padding:clamp(64px,8vw,104px) 0}
.tz-adimlar{list-style:decimal;margin-top:24px;padding-left:24px;display:grid;gap:8px;max-width:62ch;color:var(--tz-tx2)}
.tz-adimlar li::marker{font-family:var(--tz-baslik);font-weight:700;color:var(--tz-mavi)}

/* altbilgi */
.tz-alt{background:var(--tz-gece);color:#fff;padding:44px 0 26px}
.tz-alt-ic{display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap;padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,.12)}
.tz-alt-marka{display:flex;align-items:center;gap:12px}
.tz-alt-etiket{font-size:13px;color:rgba(255,255,255,.6);margin-top:4px}
.tz-alt-baglantilar{display:flex;flex-wrap:wrap;gap:8px 22px}
.tz-alt-baglantilar a{font-size:14px;color:rgba(255,255,255,.72)}
.tz-alt-baglantilar a:hover{color:#fff;text-decoration:underline;text-underline-offset:4px}
.tz-alt-telif{font-size:13px;color:rgba(255,255,255,.62);padding-top:20px}

@media (max-width:960px){
  .tz-nav-baglantilar{display:none}
  .tz-menu-dugme{display:inline-flex}
  .tz-mobil-menu{display:flex;flex-direction:column;padding:4px clamp(16px,4vw,40px) 12px;border-top:1px solid var(--tz-cizgi);background:var(--tz-kagit)}
  .tz-mobil-menu a{display:flex;align-items:center;min-height:48px;font-weight:600;border-bottom:1px solid var(--tz-cizgi)}
  .tz-mobil-menu a:last-child{border-bottom:0}
  .tz-mobil-menu .tz-mobil-giris{color:var(--tz-mavi)}
  .tz-muh{grid-template-columns:1fr}
  .tz-tutanak{grid-template-columns:1fr}
  .tz-giris-metin{grid-template-columns:1fr}
}
@media (max-width:760px){
  .tz-akis-satir{grid-template-columns:1fr;gap:6px;padding:24px 0}
  .tz-fihrist,.tz-sorular,.tz-tutanak ul{grid-template-columns:1fr}
  .tz-fihrist>div{grid-template-columns:1fr}
  .tz-fihrist dt::after{display:none}
  .tz-fihrist dd{margin-top:2px}
}
@media (max-width:520px){
  .tz-nav-giris{display:none}
  .tz-nav-eylem .tz-dugme-ana{padding:0 14px}
  .tz-marka svg:last-child{display:none !important}
}
`
