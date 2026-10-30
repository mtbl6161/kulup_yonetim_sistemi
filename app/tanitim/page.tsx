'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import {
  Users, Calendar, Clock, BarChart3, Landmark, TrendingUp, FileText, School, CheckCircle, Shield, ArrowRight, ArrowUpRight,
  Building2, Eye, MapPin, Activity, BarChart2, UserCheck, Bell, PlayCircle, HeartHandshake, Receipt, CalendarRange, GraduationCap, Menu, X,
} from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { Film, MiniFilm, Sinema, FILM_CSS, KULUP_SETI, kaydiriciBul, type FilmSeti } from './Film'
import { BOLUMLER } from './sahneler'
import { DENETCI_SETI, DENETCI_CSS } from './denetciSahneleri'

/* ----------------------------------------------------------------- data */

// Filmde gösterilmeyen ama sistemde bulunan modüller
const dahasi = [
  { icon: Calendar, title: 'Ders programı', desc: 'Sınıf ve öğretmen bazlı haftalık program; sınıf defterine tek tıkla aktarılır.' },
  { icon: GraduationCap, title: 'Personel', desc: 'Görev, SGK durumu, IBAN ve iletişim bilgileri tek kartta.' },
  { icon: School, title: 'Sınıflar ve kontenjan', desc: 'Sınıf, yaş grubu ve kapasite tanımları; doluluk oranı panelde izlenir.' },
  { icon: Receipt, title: 'Tahsilat takip', desc: 'Kırtasiye, gezi, etkinlik gibi aidat dışı ödemeler ve taksit planları.' },
  { icon: BarChart3, title: 'Gelir / gider ve bilanço', desc: 'Aylık kâr-zarar, ücret dağıtım bilançosu ve hesap hareketleri.' },
  { icon: Landmark, title: 'Muhtasar ve SGK', desc: 'Muhtasar beyanname dosyası ve eksik gün nedenleriyle SGK bildirimi.' },
  { icon: HeartHandshake, title: 'Okul Aile Birliği', desc: 'Birliğin bağış, aidat tahsilatı ve kendi işletme defteri.' },
  { icon: CalendarRange, title: 'Akıllı takip', desc: 'Geciken ödeme, eksik puantaj, yaklaşan beyanname son günü uyarıları.' },
]

const steps = [
  { num: '01', title: 'Kurumunuzu kaydedin', desc: 'Birkaç dakikada okul bilgilerinizi ve SGK / vergi parametrelerinizi tanımlayın.' },
  { num: '02', title: 'Personel ve öğrencileri girin', desc: 'Mevcut verilerinizi içe aktarın ya da sıfırdan kayıt oluşturun.' },
  { num: '03', title: 'Ayı tek akışta yönetin', desc: 'Yoklama, tahsilat, bordro, işletme defteri ve denetim dosyası aynı sistemde birbirine bağlı.' },
]

const audit = [
  { icon: MapPin, title: 'İl geneli özet', desc: 'İldeki kulüplerin öğrenci, personel ve dosya durumlarını tek ekranda görün; ilçeye göre süzün.' },
  { icon: Building2, title: 'Okul bazlı izleme', desc: 'Bağlı her kulübün dosyasına inin; mevcut öğrenci ve kapasite kontrolleri anlık hesaplanır.' },
  { icon: FileText, title: 'Aylık denetim dosyası', desc: 'Kulüplerin gönderdiği evrakı madde madde inceleyin, onaylayın ya da notla iade edin.' },
  { icon: BarChart2, title: 'Bordro kontrolü', desc: 'Beyan edilen bordroları inceleyin; hesap hataları ve eksikler madde madde listelenir.' },
  { icon: Calendar, title: 'Sınıf defteri ve yoklama', desc: 'Hangi öğretmenin hangi sınıfta derste olduğunu fiili devam defterinden inceleyin.' },
  { icon: UserCheck, title: 'Salt okunur erişim', desc: 'Denetim yetkilisi veriyi değiştiremez veya silemez; kayıtlar olduğu gibi yansır.' },
]

const trust = [
  { icon: Shield, title: 'Şifreli altyapı', desc: 'Tüm verileriniz şifrelenmiş olarak bulutta saklanır; izniniz olmadan kimse erişemez.' },
  { icon: CheckCircle, title: 'MEB ve SGK uyumu', desc: 'Bordro hesabı MEB katsayıları ve güncel SGK / vergi parametreleriyle yapılır.' },
  { icon: Building2, title: 'Kurumlar birbirinden ayrı', desc: 'Her kurumun verisi ayrı tutulur; bir okul başka bir okulun kaydını göremez.' },
  { icon: Activity, title: 'Kurulum gerektirmez', desc: 'Tarayıcıdan çalışır; program yüklemeden bilgisayardan da telefondan da açılır.' },
  { icon: Bell, title: 'Proaktif uyarılar', desc: 'Geciken ödemeler, eksik belgeler ve yaklaşan son günler panelde sizi bekler.' },
  { icon: TrendingUp, title: 'Hazır raporlar', desc: 'Aylık özet, işletme defteri ve bilançoyu PDF olarak saniyeler içinde alın.' },
]

/* ----------------------------------------------------------------- page */

export default function TanitimPage() {
  const { user, profil } = useAuth()
  const rootRef = useRef<HTMLDivElement>(null)

  // Uygulama iç içe bir overflow:auto kabında kaydığı için (html/body overflow:hidden) gözlemci o kaba bağlanır
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    root.classList.add('tz-js')
    const els = Array.from(root.querySelectorAll<HTMLElement>('.tz-reveal'))
    const revealAll = () => els.forEach(el => el.classList.add('tz-in'))

    if (!('IntersectionObserver' in window)) { revealAll(); return }

    let scroller: HTMLElement | null = root.parentElement
    while (scroller) {
      const oy = getComputedStyle(scroller).overflowY
      if ((oy === 'auto' || oy === 'scroll') && scroller.scrollHeight > scroller.clientHeight + 4) break
      scroller = scroller.parentElement
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('tz-in')
          io.unobserve(e.target)
        }
      })
    }, { root: scroller, threshold: 0.1, rootMargin: '0px 0px -8% 0px' })

    els.forEach(el => io.observe(el))
    const failsafe = window.setTimeout(revealAll, 2500)
    return () => { io.disconnect(); window.clearTimeout(failsafe) }
  }, [])

  const panelUrl = profil?.rol === 'super_admin' ? '/yonetim' : (profil?.rol === 'denetim_yetkilisi' ? '/denetim' : '/')
  // Filmler sayfadan ayrılmadan tam ekran izleme katmanında açılır
  const [sinema, setSinema] = useState<{ set: FilmSeti; bolum: number; donus?: HTMLElement | null } | null>(null)
  const sinemayiKapat = useCallback(() => setSinema(null), [])
  const [menuAcik, setMenuAcik] = useState(false)

  // Sayfa içi bağlantılar: iç kaydırma kabını yumuşakça kaydır, sabit üst menünün altında kalmasın
  const bolumeGit = (e: MouseEvent, id: string) => {
    const el = document.getElementById(id), s = kaydiriciBul(el)
    if (!el || !s) return
    e.preventDefault()
    setMenuAcik(false)
    const hareketAz = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    s.scrollTo({ top: el.getBoundingClientRect().top - s.getBoundingClientRect().top + s.scrollTop - 68, behavior: hareketAz ? 'auto' : 'smooth' })
    history.replaceState(null, '', `#${id}`)
  }

  return (
    <div ref={rootRef} className="tz">
      <style>{CSS + FILM_CSS + DENETCI_CSS}</style>

      {/* ---------------------------------------------------------- NAV */}
      <nav className="tz-nav">
        <div className="tz-nav-inner">
          <Link href="/tanitim" className="tz-brand">
            <Image src="/logo.png" alt="Klüp360" width={64} height={64} className="tz-brand-mark" />
            <span className="tz-brand-name">Klüp<span className="tz-brand-360">360</span></span>
          </Link>

          <div className="tz-nav-links">
            <a href="#film" onClick={e => bolumeGit(e, 'film')}>Nasıl çalışır</a>
            <Link href="/rehber" className="tz-nav-tool">Rehber ve Araçlar</Link>
            <Link href="/fiyatlandirma">Fiyatlandırma</Link>
            <Link href="/tanitim/iletisim">İletişim</Link>
          </div>

          <div className="tz-nav-cta">
            {user ? (
              <Link href={panelUrl} className="tz-userpill">
                <span className="tz-avatar">{user.email?.[0]?.toUpperCase()}</span>
                <span>Panele Dön</span>
              </Link>
            ) : (
              <>
                <Link href="/login" className="tz-nav-login">Giriş Yap</Link>
                <Link href="/signup" className="tz-btn tz-btn-primary">Ücretsiz Başla <ArrowRight size={16} /></Link>
              </>
            )}
            <button type="button" className="tz-menu-btn" onClick={() => setMenuAcik(v => !v)} aria-expanded={menuAcik} aria-controls="tz-mobil-menu" aria-label={menuAcik ? 'Menüyü kapat' : 'Menüyü aç'}>
              {menuAcik ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {menuAcik && (
          <div id="tz-mobil-menu" className="tz-mobil-menu" onKeyDown={e => { if (e.key === 'Escape') setMenuAcik(false) }}>
            <a href="#film" onClick={e => bolumeGit(e, 'film')}>Nasıl çalışır</a>
            <Link href="/rehber" onClick={() => setMenuAcik(false)}>Rehber ve Araçlar</Link>
            <Link href="/fiyatlandirma" onClick={() => setMenuAcik(false)}>Fiyatlandırma</Link>
            <Link href="/tanitim/iletisim" onClick={() => setMenuAcik(false)}>İletişim</Link>
            {!user && <Link href="/login" onClick={() => setMenuAcik(false)} className="tz-mobil-giris">Giriş Yap</Link>}
          </div>
        )}
      </nav>

      {/* ---------------------------------------------------------- HERO + FİLM */}
      <header className="tz-hero" id="film">
        <div className="tz-hero-glow" aria-hidden />
        <div className="tz-container tz-hero-inner">
          <span className="tz-badge">
            <span className="tz-badge-dot" />
            MEB Çocuk Kulüpleri Yönergesi’ne uygun
          </span>

          <h1 className="tz-h1">
            Bir çocuk kulübünün ayı, <span className="tz-grad">bir dakikada.</span>
          </h1>

          <p className="tz-hero-lead">
            Kayıttan denetim dosyasına kadar bir ayın tamamını Klüp360’ta nasıl yönettiğinizi izleyin.
            Ekranlar sistemin birebir canlandırması, veriler örnektir.
          </p>

          <div className="tz-film">
            <Film onBuyut={b => setSinema({ set: KULUP_SETI, bolum: b })} />
          </div>

          <div className="tz-hero-actions">
            <Link href="/signup" className="tz-btn tz-btn-primary tz-btn-lg">
              Ücretsiz Başlayın <ArrowRight size={18} />
            </Link>
            <a href="#ay" onClick={e => bolumeGit(e, 'ay')} className="tz-btn tz-btn-ghost tz-btn-lg">
              Adım adım inceleyin
            </a>
          </div>
          <div className="tz-hero-note">
            <CheckCircle size={15} /> Kredi kartı gerekmez · Kurulum dakikalar sürer
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------- BİR AY, ADIM ADIM */}
      <section className="tz-section" id="ay">
        <div className="tz-container">
          <div className="tz-head tz-reveal">
            <span className="tz-eyebrow"><PlayCircle size={15} /> Bir ay, adım adım</span>
            <h2 className="tz-h2">Bir kez girilen bilgi, sonraki işe aktarılır</h2>
            <p className="tz-lead tz-lead-center">
              Öğrencinin aidatı kayıtla birlikte hesaplanır; sınıf defterindeki dersler puantaja, puantaj
              bordroya geçer. Tahsilatlar işletme defterine, bordro ve puantaj denetim dosyasına kendiliğinden yansır.
            </p>
          </div>

          <ol className="tz-akis">
            {BOLUMLER.map((b, i) => (
              <li key={b.id} className={`tz-adim ${i % 2 ? 'ters' : ''}`}>
                <div className="tz-adim-metin tz-reveal">
                  <div className="tz-adim-ust">
                    <span className="tz-adim-no">{String(i + 1).padStart(2, '0')}</span>
                    <span className="tz-adim-gun">{b.gun}</span>
                  </div>
                  <h3>{b.baslik}</h3>
                  <p>{b.anlatim}</p>
                  <ul className="tz-adim-maddeler">
                    {b.maddeler.map(m => <li key={m}><CheckCircle size={15} />{m}</li>)}
                  </ul>
                  <button type="button" className="tz-adim-izle" onClick={e => setSinema({ set: KULUP_SETI, bolum: i, donus: e.currentTarget })}>
                    <PlayCircle size={16} /> Anlatımlı izle
                  </button>
                </div>
                <div className="tz-adim-film tz-reveal">
                  <MiniFilm bolum={i} />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------- DAHASI */}
      <section className="tz-section tz-section-alt">
        <div className="tz-container">
          <div className="tz-head tz-reveal">
            <span className="tz-eyebrow"><Users size={15} /> Ve dahası</span>
            <h2 className="tz-h2">Kulübün diğer işleri de burada</h2>
            <p className="tz-lead tz-lead-center">
              Ders programından Okul Aile Birliği’ne kadar, kulübünüzün geri kalan işleri de
              aynı sistemde ve aynı verilerle yürür.
            </p>
          </div>
          <div className="tz-dahasi">
            {dahasi.map((d, i) => (
              <div key={d.title} className="tz-dcard tz-reveal" style={{ transitionDelay: `${(i % 4) * 60}ms` }}>
                <span className="tz-ficon"><d.icon size={19} /></span>
                <h3>{d.title}</h3>
                <p>{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- AUDIT (dark) */}
      <section className="tz-audit">
        <div className="tz-audit-glow" aria-hidden />
        <div className="tz-container tz-audit-inner">
          <div className="tz-head tz-reveal">
            <span className="tz-eyebrow tz-eyebrow-light"><Eye size={15} /> İl millî eğitim denetçileri için</span>
            <h2 className="tz-h2 tz-h2-light">Denetçinin gördüğü ekran</h2>
            <p className="tz-lead tz-lead-center tz-lead-light">
              İlinizdeki kulüplerin aylık dosyaları tek bir kuyrukta toplanır. Belgeleri açar, bordroyu sistemin
              yeniden hesaplamasıyla kontrol eder, onaylar ya da notla iade edersiniz. Aşağıda bir dosyanın yolculuğunu izleyin.
            </p>
          </div>

          <div className="tz-film tz-film-denetci tz-reveal">
            <Film set={DENETCI_SETI} onBuyut={b => setSinema({ set: DENETCI_SETI, bolum: b })} />
          </div>

          <div className="tz-audit-grid">
            {audit.map((a, i) => (
              <div key={a.title} className="tz-acard tz-reveal" style={{ transitionDelay: `${(i % 3) * 60}ms` }}>
                <span className="tz-acard-ic"><a.icon size={22} /></span>
                <h3>{a.title}</h3>
                <p>{a.desc}</p>
              </div>
            ))}
          </div>

          <div className="tz-audit-cta tz-reveal">
            <Link href="/login?type=denetim" className="tz-btn tz-btn-white tz-btn-lg">
              Denetçi Girişi Yapın <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- STEPS */}
      <section className="tz-section">
        <div className="tz-container">
          <div className="tz-head tz-reveal">
            <span className="tz-eyebrow"><Clock size={15} /> Dakikalar içinde kurulum</span>
            <h2 className="tz-h2">3 adımda sisteme geçin</h2>
            <p className="tz-lead tz-lead-center">
              Karmaşık entegrasyonlar yok. Öğle aranızda bile sistemi kurup kullanmaya başlayabilirsiniz.
            </p>
          </div>

          <div className="tz-steps">
            {steps.map((s, i) => (
              <div key={s.num} className="tz-step tz-reveal" style={{ transitionDelay: `${i * 80}ms` }}>
                <span className="tz-step-num">{s.num}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- TRUST */}
      <section className="tz-section tz-section-alt">
        <div className="tz-container">
          <div className="tz-head tz-reveal">
            <span className="tz-eyebrow"><Shield size={15} /> Kurumsal güven</span>
            <h2 className="tz-h2">Güvenli ve uyumlu</h2>
            <p className="tz-lead tz-lead-center">
              Verileriniz şifrelenerek saklanır, hesaplamalar MEB mevzuatına göre yapılır.
            </p>
          </div>

          <div className="tz-trust">
            {trust.map((t, i) => (
              <div key={t.title} className="tz-tcard tz-reveal" style={{ transitionDelay: `${(i % 3) * 60}ms` }}>
                <span className="tz-tcard-ic"><t.icon size={20} /></span>
                <div>
                  <h3>{t.title}</h3>
                  <p>{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- CTA */}
      <section className="tz-ctawrap">
        <div className="tz-container">
          <div className="tz-cta tz-reveal">
            <div className="tz-cta-glow" aria-hidden />
            <div className="tz-cta-inner">
              <h2>Gelecek ayı Klüp360’ta yönetin</h2>
              <p>
                İzlediğiniz akışı kendi kulübünüzün verileriyle deneyin. Kurulum dakikalar sürer,
                kredi kartı gerekmez.
              </p>
              <div className="tz-hero-actions tz-cta-actions">
                <Link href="/signup" className="tz-btn tz-btn-white tz-btn-lg">
                  Ücretsiz Başlayın <ArrowUpRight size={18} />
                </Link>
                <Link href="/fiyatlandirma" className="tz-btn tz-btn-outline-light tz-btn-lg">
                  Fiyatları İnceleyin
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- FOOTER */}
      <footer className="tz-footer">
        <div className="tz-container tz-footer-inner">
          <div className="tz-footer-brand">
            <Image src="/logo.png" alt="Klüp360" width={64} height={64} />
            <div>
              <div className="tz-footer-name">Klüp360</div>
              <div className="tz-footer-tag">MEB Çocuk Kulüpleri Yönetim Sistemi</div>
            </div>
          </div>
          <div className="tz-footer-links">
            <Link href="/rehber">Rehber ve Araçlar</Link>
            <Link href="/fiyatlandirma">Fiyatlandırma</Link>
            <Link href="/tanitim/kullanim-kosullari">Kullanım Koşulları</Link>
            <Link href="/tanitim/gizlilik-politikasi">Gizlilik</Link>
            <Link href="/tanitim/kvkk-aydinlatma-metni">KVKK</Link>
            <Link href="/tanitim/iade-politikasi">İade</Link>
            <Link href="/tanitim/iletisim">İletişim</Link>
            <Link href="/login">Giriş</Link>
          </div>
        </div>
        <div className="tz-container tz-footer-copy">
          © {new Date().getFullYear()} Klüp360 — Tüm hakları saklıdır.
        </div>
      </footer>

      {sinema && <Sinema set={sinema.set} bolum={sinema.bolum} donus={sinema.donus} onKapat={sinemayiKapat} />}
    </div>
  )
}

/* ----------------------------------------------------------------- styles */

const CSS = `
.tz {
  --g: #2347D9; --g-d: #1B38B8; --g-dd: #0E1116;
  --gold:#8EA3EE; --gold-d:#5D78E8;
  --bg: #F5F6F8; --surf: #FFFFFF; --line: #E3E6EB; --line-2: #E3E6EB;
  --tx: #0E1116; --tx2: #3F4753; --tx3: #5F6876;
  font-family: var(--font-sans);
  color: var(--tx); background: var(--bg);
  -webkit-font-smoothing: antialiased;
}
.tz *, .tz *::before, .tz *::after { box-sizing: border-box; }
.tz :where(a) { text-decoration: none; color: inherit; }
.tz img { max-width: 100%; display: block; }
.tz-container { width: 100%; max-width: 1180px; margin: 0 auto; padding: 0 clamp(20px, 5vw, 48px); }

/* reveal (only active once JS confirmed) */
.tz-js .tz-reveal { opacity: 0; transform: translateY(22px); transition: opacity .7s ease, transform .7s cubic-bezier(.16,1,.3,1); }
.tz-js .tz-reveal.tz-in { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  .tz-js .tz-reveal { opacity: 1 !important; transform: none !important; transition: none; }
  .tz * { animation: none !important; }
}

/* buttons */
.tz-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  font-family: inherit; font-weight: 600; font-size: 14px; border-radius: 12px;
  padding: 10px 18px; cursor: pointer; border: 1px solid transparent; white-space: nowrap;
  transition: transform .2s ease, box-shadow .2s ease, background .2s ease, border-color .2s ease; }
.tz-btn-lg { font-size: 16px; padding: 15px 30px; border-radius: 14px; }
.tz-btn-primary { background: var(--g); color: #fff; box-shadow: 0 8px 22px rgba(35,71,217,.22); }
.tz-btn-primary:hover { background: var(--g-d); transform: translateY(-2px); box-shadow: 0 14px 30px rgba(35,71,217,.28); }
.tz-btn-ghost { background: var(--surf); color: var(--tx); border-color: var(--line-2); }
.tz-btn-ghost:hover { border-color: var(--g); color: var(--g); transform: translateY(-2px); }
.tz-btn-white { background: #fff; color: var(--g-dd); box-shadow: 0 10px 26px rgba(0,0,0,.14); }
.tz-btn-white:hover { transform: translateY(-2px); box-shadow: 0 16px 34px rgba(0,0,0,.2); }
.tz-btn-outline-light { background: rgba(255,255,255,.06); color: #fff; border-color: rgba(255,255,255,.28); backdrop-filter: blur(6px); }
.tz-btn-outline-light:hover { background: rgba(255,255,255,.14); border-color: rgba(255,255,255,.5); transform: translateY(-2px); }

/* nav */
.tz-nav { position: sticky; top: 0; z-index: 100; background: rgba(245,246,248,.84);
  backdrop-filter: saturate(160%) blur(14px); border-bottom: 1px solid var(--line); }
.tz-nav-inner { max-width: 1180px; margin: 0 auto; height: 68px; padding: 0 clamp(20px,5vw,48px);
  display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.tz-brand { display: flex; align-items: center; gap: 10px; }
.tz-brand-mark { width: 38px; height: 38px; }
.tz-brand-name { font-family: var(--font-display); font-weight: 800; font-size: 22px; color: var(--g-d); letter-spacing: -.01em; }
.tz-brand-360 { color: var(--gold); }
.tz-nav-links { display: flex; align-items: center; gap: 28px; }
.tz-nav-links a { font-size: 14.5px; font-weight: 500; color: var(--tx2); transition: color .15s; }
.tz-nav-links a:hover { color: var(--g); }
.tz-nav-tool { display: inline-flex; align-items: center; gap: 6px; font-weight: 600 !important; color: var(--g-d) !important; }
.tz-nav-tool::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--gold); }
.tz-nav-tool:hover { color: var(--gold) !important; }
.tz-nav-cta { display: flex; align-items: center; gap: 14px; }
.tz-nav-login { font-size: 14.5px; font-weight: 600; color: var(--tx); }
.tz-nav-login:hover { color: var(--g); }
.tz-userpill { display: flex; align-items: center; gap: 10px; padding: 6px 16px 6px 6px; border-radius: 999px;
  background: var(--surf); border: 1px solid var(--line-2); box-shadow: 0 2px 8px rgba(0,0,0,.05);
  font-size: 14px; font-weight: 600; transition: transform .2s, border-color .2s; }
.tz-userpill:hover { border-color: var(--g); transform: translateY(-1px); }
.tz-avatar { width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg,var(--g),var(--g-d));
  color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; }

/* hero */
.tz-hero { position: relative; overflow: hidden; padding: clamp(64px,9vw,120px) 0 0;
  background: radial-gradient(120% 70% at 50% -10%, #EEF2FE 0%, var(--bg) 60%); text-align: center; }
.tz-hero-glow { position: absolute; top: -140px; left: 50%; transform: translateX(-50%);
  width: min(760px,90vw); height: 460px; background: radial-gradient(closest-side, rgba(35,71,217,.16), transparent);
  filter: blur(30px); pointer-events: none; }
.tz-hero-inner { position: relative; z-index: 2; }
.tz-badge { display: inline-flex; align-items: center; gap: 9px; background: var(--surf);
  border: 1px solid var(--line-2); border-radius: 999px; padding: 8px 18px; font-size: 13px; font-weight: 600;
  color: var(--g-d); box-shadow: 0 4px 16px rgba(35,71,217,.06); }
.tz-badge-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--gold);
  box-shadow: 0 0 0 4px rgba(142,163,238,.25); }
.tz-h1 { font-family: var(--font-display); font-weight: 800; letter-spacing: -.02em;
  font-size: clamp(36px, 6.2vw, 74px); line-height: 1.08; margin: 28px auto 22px; max-width: 15ch; }
.tz-grad { background: linear-gradient(100deg, var(--g) 0%, var(--gold) 100%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.tz-hero-lead { font-size: clamp(16px,2vw,20px); color: var(--tx2); line-height: 1.65; max-width: 620px; margin: 0 auto 36px; }
.tz-hero-actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
.tz-hero-note { display: inline-flex; align-items: center; gap: 8px; margin-top: 22px; font-size: 13.5px; color: var(--tx3); font-weight: 500; }
.tz-hero-note svg { color: var(--g); }

/* generic section */
.tz-section { padding: clamp(72px,10vw,120px) 0; }
.tz-section-alt { background: linear-gradient(180deg,var(--surf),var(--bg)); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.tz-head { text-align: center; max-width: 660px; margin: 0 auto clamp(48px,6vw,72px); }
.tz-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .08em; color: var(--g); margin-bottom: 16px; }
.tz-eyebrow svg { color: var(--gold); }
.tz-eyebrow-light { color: rgba(255,255,255,.9); }
.tz-eyebrow-light svg { color: var(--gold); }
.tz-h2 { font-family: var(--font-display); font-weight: 800; letter-spacing: -.015em;
  font-size: clamp(28px,4vw,46px); line-height: 1.15; margin: 0 0 18px; }
.tz-h2-light { color: #fff; }
.tz-lead { font-size: clamp(15px,1.6vw,18px); color: var(--tx2); line-height: 1.65; margin: 0; }
.tz-lead-center { margin-left: auto; margin-right: auto; }
.tz-lead-light { color: rgba(255,255,255,.72); }

/* audit (dark) */
.tz-audit { position: relative; overflow: hidden; padding: clamp(72px,10vw,120px) 0;
  background: linear-gradient(160deg,var(--g-dd) 0%,#16245E 100%); }
.tz-audit-glow { position: absolute; bottom: -20%; right: -5%; width: 620px; height: 620px; border-radius: 50%;
  background: radial-gradient(closest-side, rgba(142,163,238,.18), transparent); filter: blur(20px); pointer-events: none; }
.tz-audit-inner { position: relative; z-index: 2; }
.tz-audit .tz-head .tz-btn { margin-top: 30px; }
.tz-audit-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 18px; }
.tz-acard { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1); border-radius: 18px;
  padding: 28px; transition: transform .3s, background .3s, border-color .3s; }
.tz-acard:hover { transform: translateY(-4px); background: rgba(255,255,255,.07); border-color: rgba(142,163,238,.55); }
.tz-acard-ic { display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 14px;
  background: rgba(255,255,255,.09); border: 1px solid rgba(255,255,255,.14); color: #fff; margin-bottom: 18px; }
.tz-acard:hover .tz-acard-ic { color: var(--gold); border-color: rgba(142,163,238,.5); }
.tz-acard h3 { font-size: 16px; font-weight: 700; color: #fff; margin: 0 0 10px; }
.tz-acard p { font-size: 14px; color: rgba(255,255,255,.62); line-height: 1.6; margin: 0; }

/* steps */
.tz-steps { display: grid; grid-template-columns: repeat(3,1fr); gap: 22px; position: relative; }
.tz-steps::before { content: ''; position: absolute; top: 46px; left: 12%; right: 12%; height: 2px;
  background: linear-gradient(90deg, transparent, var(--line-2) 15%, var(--line-2) 85%, transparent); }
.tz-step { position: relative; text-align: center; background: var(--surf); border: 1px solid var(--line);
  border-radius: 20px; padding: 40px 28px 32px; transition: transform .3s cubic-bezier(.16,1,.3,1), box-shadow .3s, border-color .3s; }
.tz-step:hover { transform: translateY(-6px); border-color: #C9D4FA; box-shadow: 0 24px 44px -24px rgba(35,71,217,.4); }
.tz-step-num { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 50%;
  background: var(--surf); border: 1px solid var(--line-2); box-shadow: 0 6px 18px rgba(35,71,217,.1);
  font-family: var(--font-display); font-size: 24px; font-weight: 800; color: var(--g);
  margin: -72px auto 20px; position: relative; }
.tz-step h3 { font-size: 17px; font-weight: 700; margin: 0 0 10px; }
.tz-step p { font-size: 14px; color: var(--tx2); line-height: 1.6; margin: 0; }

/* trust */
.tz-trust { display: grid; grid-template-columns: repeat(3,1fr); gap: 18px; }
.tz-tcard { display: flex; gap: 16px; background: var(--surf); border: 1px solid var(--line); border-radius: 18px;
  padding: 26px 24px; transition: transform .3s, box-shadow .3s, border-color .3s; }
.tz-tcard:hover { transform: translateY(-4px); border-color: #C9D4FA; box-shadow: 0 20px 38px -22px rgba(35,71,217,.35); }
.tz-tcard-ic { display: flex; align-items: center; justify-content: center; width: 46px; height: 46px; border-radius: 13px; flex-shrink: 0;
  background: linear-gradient(135deg,var(--bg),var(--surf)); border: 1px solid var(--line-2); color: var(--g); }
.tz-tcard h3 { font-size: 15.5px; font-weight: 700; margin: 2px 0 7px; }
.tz-tcard p { font-size: 13.5px; color: var(--tx2); line-height: 1.6; margin: 0; }

/* CTA */
.tz-ctawrap { padding: clamp(56px,8vw,96px) 0; background: var(--surf); border-top: 1px solid var(--line); }
.tz-cta { position: relative; overflow: hidden; border-radius: clamp(24px,4vw,36px);
  background: linear-gradient(135deg,var(--g-d) 0%,var(--g-dd) 100%); padding: clamp(48px,7vw,84px) clamp(24px,5vw,48px); text-align: center; }
.tz-cta-glow { position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(60% 120% at 85% -10%, rgba(142,163,238,.3), transparent 60%),
              radial-gradient(50% 120% at 10% 120%, rgba(35,71,217,.5), transparent 60%); }
.tz-cta-inner { position: relative; z-index: 2; }
.tz-cta h2 { font-family: var(--font-display); font-weight: 800; letter-spacing: -.015em;
  font-size: clamp(28px,4.5vw,52px); line-height: 1.15; color: #fff; margin: 0 0 18px; }
.tz-cta p { font-size: clamp(15px,1.8vw,18px); color: rgba(255,255,255,.78); line-height: 1.6; max-width: 540px; margin: 0 auto 36px; }
.tz-cta-actions { margin-top: 0; }

/* footer */
.tz-footer { background: var(--g-dd); color: #fff; padding: 48px 0 28px; }
.tz-footer-inner { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; padding-bottom: 26px;
  border-bottom: 1px solid rgba(255,255,255,.1); }
.tz-footer-brand { display: flex; align-items: center; gap: 12px; }
.tz-footer-brand img { width: 40px; height: 40px; }
.tz-footer-name { font-family: var(--font-display); font-weight: 700; font-size: 18px; }
.tz-footer-tag { font-size: 12.5px; color: rgba(255,255,255,.5); margin-top: 2px; }
.tz-footer-links { display: flex; gap: 22px; flex-wrap: wrap; }
.tz-footer-links a { font-size: 13.5px; color: rgba(255,255,255,.65); transition: color .15s; }
.tz-footer-links a:hover { color: #fff; }
.tz-footer-copy { font-size: 12.5px; color: rgba(255,255,255,.62); padding-top: 22px; }

/* film */
.tz-hero { padding-top: clamp(40px,6vw,80px); }
.tz-hero .tz-h1 { max-width: 19ch; font-size: clamp(34px,5.4vw,64px); margin: 22px auto 18px; }
.tz-hero .tz-hero-lead { margin-bottom: 0; }
.tz-film.tz-film-denetci { margin-top: 0; margin-bottom: clamp(44px,6vw,64px); }
.tz-audit-cta { text-align: center; margin-top: clamp(36px,5vw,52px); }
.tz-film { max-width: 1040px; margin: clamp(36px,5vw,56px) auto clamp(36px,5vw,48px); }

/* bir ay, adım adım */
.tz-akis { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: clamp(56px,8vw,104px); position: relative; }
.tz-adim { display: grid; grid-template-columns: .85fr 1.15fr; gap: clamp(32px,5vw,64px); align-items: center; }
.tz-adim.ters .tz-adim-metin { order: 2; }
.tz-adim-ust { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.tz-adim-no { font-family: var(--font-display); font-size: 15px; font-weight: 800; color: #fff; background: var(--g);
  width: 38px; height: 38px; border-radius: 11px; display: flex; align-items: center; justify-content: center; }
.tz-adim-gun { font-size: 12.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--g-d);
  background: #E8EDFD; padding: 5px 11px; border-radius: 999px; }
.tz-adim h3 { font-family: var(--font-display); font-size: clamp(22px,2.6vw,30px); font-weight: 800; letter-spacing: -.015em; line-height: 1.2; margin: 0 0 14px; }
.tz-adim p { font-size: 15.5px; color: var(--tx2); line-height: 1.7; margin: 0 0 18px; }
.tz-adim-maddeler { list-style: none; margin: 0 0 22px; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 9px 16px; }
.tz-adim-maddeler li { display: flex; align-items: flex-start; gap: 8px; font-size: 14px; font-weight: 600; color: var(--tx); }
.tz-adim-maddeler svg { color: var(--g); flex-shrink: 0; margin-top: 2px; }
.tz-adim-izle { display: inline-flex; align-items: center; gap: 7px; min-height: 44px; font-family: inherit; font-size: 14px; font-weight: 700; color: var(--g);
  background: #fff; border: 1px solid var(--line); border-radius: 11px; padding: 0 16px; cursor: pointer; transition: border-color .15s, background .15s; }
.tz-adim-izle:hover { border-color: var(--g); background: #F3F5FE; }

/* telefon / tablet menüsü */
.tz-menu-btn { display: none; width: 44px; height: 44px; border-radius: 11px; border: 1px solid var(--line); background: var(--surf); color: var(--tx); align-items: center; justify-content: center; cursor: pointer; }
.tz-mobil-menu { display: none; }

/* dahası */
.tz-dahasi { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; }
.tz-dcard { background: var(--surf); border: 1px solid var(--line); border-radius: 16px; padding: 22px 20px; transition: transform .3s cubic-bezier(.16,1,.3,1), box-shadow .3s, border-color .3s; }
.tz-dcard:hover { transform: translateY(-4px); border-color: #C9D4FA; box-shadow: 0 22px 40px -22px rgba(35,71,217,.4); }
.tz-ficon { display: flex; align-items: center; justify-content: center; width: 42px; height: 42px; border-radius: 12px;
  background: linear-gradient(135deg,#EEF2FE,#DCE3FB); color: var(--g); margin-bottom: 16px; }
.tz-dcard h3 { font-size: 15.5px; font-weight: 700; margin: 0 0 7px; }
.tz-dcard p { font-size: 13.5px; color: var(--tx2); line-height: 1.6; margin: 0; }

/* ---------------- responsive ---------------- */
@media (max-width: 980px) {
  .tz-adim, .tz-adim.ters { grid-template-columns: 1fr; }
  .tz-adim.ters .tz-adim-metin { order: 0; }
  .tz-dahasi { grid-template-columns: repeat(2,1fr); }
  .tz-audit-grid, .tz-trust { grid-template-columns: repeat(2,1fr); }
}
@media (max-width: 860px) {
  .tz-nav-links { display: none; }
  .tz-menu-btn { display: inline-flex; }
  .tz-mobil-menu { display: flex; flex-direction: column; padding: 8px clamp(20px,5vw,48px) 16px; border-top: 1px solid var(--line); background: var(--surf); }
  .tz-mobil-menu a { display: flex; align-items: center; min-height: 48px; font-size: 15.5px; font-weight: 600; color: var(--tx); border-bottom: 1px solid var(--line); }
  .tz-mobil-menu a:last-child { border-bottom: none; }
  .tz-mobil-menu .tz-mobil-giris { color: var(--g); }
  .tz-steps { grid-template-columns: 1fr; gap: 44px; }
  .tz-steps::before { display: none; }
  .tz-step-num { margin-top: 0; }
}
@media (max-width: 620px) {
  /* Telefonda küçük filmler okunmayacak kadar küçülüyor ve sayfayı uzatıyor; "Anlatımlı izle" tam ekranda açar */
  .tz-adim-film { display: none; }
  .tz-akis { gap: 40px; }
  .tz-nav-cta .tz-btn-primary { padding: 10px 14px; }
  .tz-dahasi, .tz-audit-grid, .tz-trust { grid-template-columns: 1fr; }
  .tz-adim-maddeler { grid-template-columns: 1fr; }
  .tz-nav-login { display: none; }
  .tz-tcard { padding: 20px; }
}
`
