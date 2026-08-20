'use client'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import {
  Users, Calendar, BookOpen, Clock, Wallet, BarChart3,
  Landmark, TrendingUp, FileText, Settings, GraduationCap,
  School, CheckCircle, Shield, Zap, ArrowRight, ArrowUpRight,
  Building2, Eye, MapPin, Activity, BarChart2, UserCheck,
} from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'

/* ----------------------------------------------------------------- data */

const features = [
  { icon: Users, title: 'Öğrenci Yönetimi', desc: 'Kayıt, devam takibi, sınıf atama ve veli bilgileri tek ekranda.' },
  { icon: GraduationCap, title: 'Personel Yönetimi', desc: 'Öğretmen ve personel bilgileri, görev atamaları, iletişim kayıtları.' },
  { icon: Calendar, title: 'Ders Programı', desc: 'Haftalık ders planlaması, sınıf ve öğretmen bazlı program takibi.' },
  { icon: BookOpen, title: 'Sınıf Defteri', desc: 'Günlük devam kaydı, yoklama ve gözlem notları dijital ortamda.' },
  { icon: Clock, title: 'Puantaj', desc: 'Personel çalışma saatlerini otomatik hesapla, aylık puantaj oluştur.' },
  { icon: FileText, title: 'Bordro', desc: 'MEB katsayılarına göre tam otomatik maaş hesaplama ve e-posta gönderimi.' },
  { icon: Wallet, title: 'Ödeme Takibi', desc: 'Öğrenci aidat ve kurs ücretlerini tahsil et, gecikmeleri izle.' },
  { icon: BarChart3, title: 'Gelir / Gider', desc: 'Tüm finansal hareketler, kategori bazlı raporlar ve grafikler.' },
  { icon: Landmark, title: 'Bilanço', desc: 'Yıllık mali durum, aktif/pasif dengesi, kurumsal finansal rapor.' },
  { icon: TrendingUp, title: 'Hesap Hareketleri', desc: 'Kasa ve banka hareketleri, dönem bazlı akış analizi.' },
  { icon: School, title: 'Sınıf Tanımları', desc: 'Sınıf oluştur, öğretmen ata, kapasite ve program ayarla.' },
  { icon: Settings, title: 'Kurumsal Ayarlar', desc: 'SGK, vergi, katsayı ve tüm bordro parametrelerini tek yerden yönet.' },
]

const stats = [
  { value: '12+', label: 'Entegre Modül' },
  { value: '%100', label: 'MEB Uyumlu' },
  { value: '0,3 sn', label: 'Bordro Hesabı' },
  { value: '256-bit', label: 'Şifreli Altyapı' },
]

const contrast = [
  { bad: 'Karışık Excel tabloları', good: 'Tek merkezi sistem', goodDesc: 'Her modülün birbirine bağlı olduğu bütünleşik mimari.' },
  { bad: 'Manuel maaş hesapları', good: 'Saniyeler içinde bordro', goodDesc: 'Güncel MEB katsayılarıyla sıfır hata payı.' },
  { bad: 'Geciken aidat tespiti', good: 'Zamanında tahsilat', goodDesc: 'Vadesi geçen ödemeler için otomatik uyarılar.' },
]

const steps = [
  { num: '01', title: 'Kurumunuzu kaydedin', desc: 'Birkaç dakikada okul bilgilerinizi ve SGK / vergi parametrelerinizi tanımlayın.' },
  { num: '02', title: 'Personel ve öğrencileri girin', desc: 'Mevcut verilerinizi içe aktarın ya da sıfırdan kayıt oluşturun.' },
  { num: '03', title: 'Yönetimi otomatikleştirin', desc: 'Bordro, tahsilat, devam ve raporlar artık tek tıkla hazır.' },
]

const audit = [
  { icon: MapPin, title: 'İl / İlçe geneli özet', desc: 'Bölgedeki toplam öğrenci, personel ve operasyon verilerini kuşbakışı tek ekranda görün.' },
  { icon: Building2, title: 'Okul bazlı izleme', desc: 'Bağlı her kulübün dosyasına inin; mevcut öğrenci ve kapasite kontrolleri anlık hesaplanır.' },
  { icon: FileText, title: 'Resmi bordro görüntüleme', desc: 'Beyan edilen aylık bordroları ve MEB katsayı doğrulamalarını salt-okunur inceleyin.' },
  { icon: BarChart2, title: 'Finansal şeffaflık', desc: 'Gelir-gider tabloları ve aidat tahsilat oranları yasal denetim formatında hazırdır.' },
  { icon: Calendar, title: 'Sınıf defteri & yoklama', desc: 'Hangi öğretmenin hangi sınıfta derste olduğunu fiili devam defterinden inceleyin.' },
  { icon: UserCheck, title: 'Mutlak salt-okunur erişim', desc: 'Denetim yetkilisi veriyi değiştiremez veya silemez. Veri %100 şeffaflıkla yansır.' },
]

const trust = [
  { icon: Shield, title: 'Şifreli altyapı', desc: 'Tüm verileriniz 256-bit şifrelenmiş olarak bulutta saklanır; izniniz olmadan kimse erişemez.' },
  { icon: CheckCircle, title: 'MEB & SGK uyumu', desc: 'Bordro algoritmaları MEB katsayıları ve SGK güncellemelerine endekslidir. Yasal risk sıfır.' },
  { icon: Building2, title: 'Çoklu kurum mimarisi', desc: 'Birden fazla işletmenizi tek hesapta birleştirin; her kurumun verisi mutlak izoledir.' },
  { icon: Activity, title: 'Gerçek zamanlı senkron', desc: 'Bir kayıt girdiğinizde ekiptekilerin ekranına anında düşer. Aynı anda beraber çalışın.' },
  { icon: Zap, title: 'Proaktif bildirimler', desc: 'Geciken ödemeler, kritik eksiklikler ve yaklaşan tahsilatlar size sistemden bildirilir.' },
  { icon: TrendingUp, title: 'Otomatik raporlama', desc: 'Aylık, dönemlik veya anlık mali bilançolarınızı saniyeler içinde çekin.' },
]

/* ----------------------------------------------------------------- page */

export default function TanitimPage() {
  const { user, profil } = useAuth()
  const rootRef = useRef<HTMLDivElement>(null)

  // Robust scroll-reveal. This app scrolls inside a nested overflow:auto
  // container (globals set html/body overflow:hidden), so the observer must be
  // rooted to that container — not the viewport — to fire reliably.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    root.classList.add('tz-js')
    const els = Array.from(root.querySelectorAll<HTMLElement>('.tz-reveal'))
    const revealAll = () => els.forEach(el => el.classList.add('tz-in'))

    if (!('IntersectionObserver' in window)) { revealAll(); return }

    // Find the scrollable ancestor (falls back to viewport root = null).
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
    // Failsafe: never leave content hidden if the observer misbehaves.
    const failsafe = window.setTimeout(revealAll, 2500)
    return () => { io.disconnect(); window.clearTimeout(failsafe) }
  }, [])

  const panelUrl = profil?.rol === 'super_admin' ? '/yonetim' : (profil?.rol === 'denetim_yetkilisi' ? '/denetim' : '/')

  return (
    <div ref={rootRef} className="tz">
      <style>{CSS}</style>

      {/* ---------------------------------------------------------- NAV */}
      <nav className="tz-nav">
        <div className="tz-nav-inner">
          <Link href="/tanitim" className="tz-brand">
            <img src="/logo.png" alt="Klüp360" className="tz-brand-mark" />
            <span className="tz-brand-name">Klüp<span className="tz-brand-360">360</span></span>
          </Link>

          <div className="tz-nav-links">
            <Link href="/rehber" className="tz-nav-tool">Rehber & Araçlar</Link>
            <Link href="/fiyatlandirma">Fiyatlandırma</Link>
            <Link href="/tanitim/kullanim-kosullari">Koşullar</Link>
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
          </div>
        </div>
      </nav>

      {/* ---------------------------------------------------------- HERO */}
      <header className="tz-hero">
        <div className="tz-hero-glow" aria-hidden />
        <div className="tz-container tz-hero-inner">
          <span className="tz-badge">
            <span className="tz-badge-dot" />
            MEB Çocuk Kulüpleri Yönergesi'ne %100 uyumlu
          </span>

          <h1 className="tz-h1">
            Çocuk kulübünüzün tüm yönetimi,<br />
            <span className="tz-grad">tek akıllı platformda.</span>
          </h1>

          <p className="tz-hero-lead">
            Excel dosyalarına ve kağıt yığınlarına veda edin. Bordro, tahsilat, ders programı
            ve yoklama süreçlerinizi <strong>saniyeler içinde</strong> ve hatasız yönetin.
          </p>

          <div className="tz-hero-actions">
            <Link href="/signup" className="tz-btn tz-btn-primary tz-btn-lg">
              Ücretsiz Başlayın <ArrowRight size={18} />
            </Link>
            <Link href="/fiyatlandirma" className="tz-btn tz-btn-ghost tz-btn-lg">
              Fiyatları İnceleyin
            </Link>
          </div>

          <div className="tz-hero-note">
            <CheckCircle size={15} /> Kredi kartı gerekmez · Kurulum dakikalar sürer
          </div>

          {/* Product preview */}
          <div className="tz-preview">
            <div className="tz-chip tz-chip-a">
              <span className="tz-chip-ic tz-chip-ic-green"><CheckCircle size={18} /></span>
              <div>
                <div className="tz-chip-t">Bordro hesaplandı</div>
                <div className="tz-chip-s">Tüm personel eksiksiz</div>
              </div>
            </div>
            <div className="tz-chip tz-chip-b">
              <span className="tz-chip-ic tz-chip-ic-gold"><TrendingUp size={18} /></span>
              <div>
                <div className="tz-chip-t">+₺45.250</div>
                <div className="tz-chip-s">Bu haftaki tahsilat</div>
              </div>
            </div>

            <div className="tz-window">
              <div className="tz-window-bar">
                <span className="tz-dot" style={{ background: '#ff5f56' }} />
                <span className="tz-dot" style={{ background: '#ffbd2e' }} />
                <span className="tz-dot" style={{ background: '#27c93f' }} />
                <div className="tz-window-url">app.klup360.com / kontrol-paneli</div>
              </div>
              <div className="tz-mock">
                <aside className="tz-mock-side">
                  <div className="tz-mock-brand">
                    <img src="/logo.png" alt="" />
                    <span>Klüp360</span>
                  </div>
                  {['Kontrol Paneli', 'Öğrenciler', 'Bordro', 'Tahsilat', 'Ders Programı', 'Raporlar'].map((m, i) => (
                    <div key={m} className={`tz-mock-nav ${i === 0 ? 'is-active' : ''}`}>
                      <span className="tz-mock-nav-ic" />
                      <span className="tz-mock-nav-tx">{m}</span>
                    </div>
                  ))}
                </aside>
                <div className="tz-mock-main">
                  <div className="tz-mock-head">
                    <div>
                      <div className="tz-mock-title">Kontrol Paneli</div>
                      <div className="tz-mock-sub">Ağustos 2026 dönemi</div>
                    </div>
                    <div className="tz-mock-btn">+ Yeni Kayıt</div>
                  </div>
                  <div className="tz-mock-stats">
                    {[
                      { l: 'Aktif Öğrenci', v: '248', c: 'green' },
                      { l: 'Aylık Tahsilat', v: '₺186K', c: 'gold' },
                      { l: 'Personel', v: '19', c: 'blue' },
                    ].map(s => (
                      <div key={s.l} className="tz-mock-stat">
                        <span className={`tz-mock-stat-ic ${s.c}`} />
                        <div className="tz-mock-stat-l">{s.l}</div>
                        <div className="tz-mock-stat-v">{s.v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="tz-mock-panel">
                    <div className="tz-mock-panel-head">
                      <span className="tz-mock-panel-title">Aylık Tahsilat Akışı</span>
                      <span className="tz-mock-legend"><i /> 2026</span>
                    </div>
                    <div className="tz-mock-chart">
                      {[48, 62, 40, 74, 58, 88, 70, 95, 66, 82].map((h, i) => (
                        <span key={i} className="tz-bar" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="tz-preview-fade" aria-hidden />
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------- STATS */}
      <section className="tz-statsband">
        <div className="tz-container tz-stats">
          {stats.map(s => (
            <div key={s.label} className="tz-stat">
              <div className="tz-stat-v">{s.value}</div>
              <div className="tz-stat-l">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- CONTRAST */}
      <section className="tz-section">
        <div className="tz-container tz-split">
          <div className="tz-reveal">
            <span className="tz-eyebrow">Neden Klüp360</span>
            <h2 className="tz-h2">Eski yöntemleri geride bırakın</h2>
            <p className="tz-lead">
              Excel dosyaları, kayıp kağıtlar ve manuel bordro hesaplama yüküyle kurumunuzu yormayın.
              Modern dijital yönetimle hatasız ve hızlı bir düzene geçin.
            </p>
            <ul className="tz-contrast">
              {contrast.map(c => (
                <li key={c.good} className="tz-contrast-row">
                  <span className="tz-contrast-bad">{c.bad}</span>
                  <ArrowRight size={16} className="tz-contrast-arrow" />
                  <div className="tz-contrast-good">
                    <div className="tz-contrast-good-t"><CheckCircle size={16} /> {c.good}</div>
                    <div className="tz-contrast-good-d">{c.goodDesc}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="tz-reveal tz-contrast-visual">
            <div className="tz-xls">
              <div className="tz-xls-bar">Bordro_Hesaplari_Son.xlsx</div>
              <div className="tz-xls-grid">
                {['Ahmet Yılmaz', 'Zeynep A.', 'Ayşe K.', 'Murat T.', 'Elif S.'].map((n, i) => (
                  <div key={n} className="tz-xls-row">
                    <span className="tz-xls-c muted">{i + 1}</span>
                    <span className="tz-xls-c">{n}</span>
                    <span className={`tz-xls-c ${i === 0 ? 'err' : ''}`}>{i === 0 ? 'EKSİK' : 'Tamam'}</span>
                    <span className={`tz-xls-c ${i === 2 ? 'err' : ''}`}>{i === 2 ? '#DEĞER!' : '₺24.500'}</span>
                  </div>
                ))}
              </div>
              <span className="tz-xls-flag">✕ Formül hatası</span>
            </div>

            <div className="tz-clean">
              <div className="tz-clean-head">
                <span className="tz-clean-ic"><CheckCircle size={20} /></span>
                <div>
                  <div className="tz-clean-t">Maaş Bordrosu</div>
                  <div className="tz-clean-s">Tüm kayıtlar doğrulandı</div>
                </div>
                <span className="tz-clean-badge">HATASIZ</span>
              </div>
              <div className="tz-clean-row">
                <span>Toplam ödenecek</span>
                <strong>₺145.500,00</strong>
              </div>
              <div className="tz-clean-track"><span /></div>
              <div className="tz-clean-speed"><Zap size={16} /> 0,3 sn hesaplama süresi</div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- FEATURES */}
      <section className="tz-section tz-section-alt">
        <div className="tz-container">
          <div className="tz-head tz-reveal">
            <span className="tz-eyebrow">Hepsi bir arada</span>
            <h2 className="tz-h2">İhtiyacınız olan her şey</h2>
            <p className="tz-lead tz-lead-center">
              12 modül, tek platform. Başka hiçbir yazılıma ya da Excel dosyasına ihtiyaç
              duymadan kulübünüzü yönetmek için gereken tüm akıllı araçlar burada.
            </p>
          </div>

          <div className="tz-features">
            {features.map((f, i) => (
              <div key={f.title} className="tz-fcard tz-reveal" style={{ transitionDelay: `${(i % 4) * 60}ms` }}>
                <span className="tz-ficon"><f.icon size={20} /></span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <f.icon className="tz-fcard-ghost" size={104} aria-hidden />
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
            <span className="tz-eyebrow tz-eyebrow-light"><Eye size={15} /> Resmi kurumlar / MEB için</span>
            <h2 className="tz-h2 tz-h2-light">Şeffaf ve anlık denetim paneli</h2>
            <p className="tz-lead tz-lead-center tz-lead-light">
              İl ve İlçe Milli Eğitim Müdürlüklerine özel tahsis edilen salt-okunur panel ile
              bölgenizdeki tüm bağlı kurumları saniyeler içinde denetleyin.
            </p>
            <Link href="/login?type=denetim" className="tz-btn tz-btn-white tz-btn-lg">
              Denetçi Girişi Yapın <ArrowRight size={18} />
            </Link>
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
        </div>
      </section>

      {/* ---------------------------------------------------------- STEPS */}
      <section className="tz-section">
        <div className="tz-container">
          <div className="tz-head tz-reveal">
            <span className="tz-eyebrow"><Zap size={15} /> Işık hızında kurulum</span>
            <h2 className="tz-h2">3 adımda sisteme geçin</h2>
            <p className="tz-lead tz-lead-center">
              Karmaşık entegrasyonlar yok. Öğle aranızda bile sistemi kurup canlıya alabilirsiniz.
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
              Verileriniz endüstri standartlarında şifrelenir, altyapımız MEB mevzuatına tam uyumlu çalışır.
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
              <h2>Kulübünüzü dijitale taşıyın</h2>
              <p>
                Kağıt, Excel ve manuel hesaplama dönemine kalıcı son verin. Klüp360 ile
                dakikalar içinde yeni nesil yönetime geçin.
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
            <img src="/logo.png" alt="Klüp360" />
            <div>
              <div className="tz-footer-name">Klüp360</div>
              <div className="tz-footer-tag">MEB Çocuk Kulüpleri Yönetim Sistemi</div>
            </div>
          </div>
          <div className="tz-footer-links">
            <Link href="/rehber">Rehber & Araçlar</Link>
            <Link href="/fiyatlandirma">Fiyatlandırma</Link>
            <Link href="/tanitim/kullanim-kosullari">Kullanım Koşulları</Link>
            <Link href="/tanitim/gizlilik-politikasi">Gizlilik</Link>
            <Link href="/tanitim/iade-politikasi">İade</Link>
            <Link href="/tanitim/iletisim">İletişim</Link>
            <Link href="/login">Giriş</Link>
          </div>
        </div>
        <div className="tz-container tz-footer-copy">
          © {new Date().getFullYear()} Klüp360 — Tüm hakları saklıdır.
        </div>
      </footer>
    </div>
  )
}

/* ----------------------------------------------------------------- styles */

const CSS = `
.tz {
  --g: #2d5a3d; --g-d: #1e4229; --g-dd: #163620;
  --gold: #c8832a; --gold-d: #a06820;
  --bg: #f5f2ec; --surf: #fffef9; --line: #e6dfd0; --line-2: #d8d0be;
  --tx: #1a1a14; --tx2: #5a5748; --tx3: #8a8070;
  font-family: 'DM Sans', sans-serif;
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
.tz-btn-primary { background: var(--g); color: #fff; box-shadow: 0 8px 22px rgba(45,90,61,.22); }
.tz-btn-primary:hover { background: var(--g-d); transform: translateY(-2px); box-shadow: 0 14px 30px rgba(45,90,61,.28); }
.tz-btn-ghost { background: var(--surf); color: var(--tx); border-color: var(--line-2); }
.tz-btn-ghost:hover { border-color: var(--g); color: var(--g); transform: translateY(-2px); }
.tz-btn-white { background: #fff; color: var(--g-dd); box-shadow: 0 10px 26px rgba(0,0,0,.14); }
.tz-btn-white:hover { transform: translateY(-2px); box-shadow: 0 16px 34px rgba(0,0,0,.2); }
.tz-btn-outline-light { background: rgba(255,255,255,.06); color: #fff; border-color: rgba(255,255,255,.28); backdrop-filter: blur(6px); }
.tz-btn-outline-light:hover { background: rgba(255,255,255,.14); border-color: rgba(255,255,255,.5); transform: translateY(-2px); }

/* nav */
.tz-nav { position: sticky; top: 0; z-index: 100; background: rgba(245,242,236,.82);
  backdrop-filter: saturate(160%) blur(14px); border-bottom: 1px solid var(--line); }
.tz-nav-inner { max-width: 1180px; margin: 0 auto; height: 68px; padding: 0 clamp(20px,5vw,48px);
  display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.tz-brand { display: flex; align-items: center; gap: 10px; }
.tz-brand-mark { width: 38px; height: 38px; }
.tz-brand-name { font-family: 'Playfair Display', serif; font-weight: 800; font-size: 22px; color: var(--g-d); letter-spacing: -.01em; }
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
  background: radial-gradient(120% 70% at 50% -10%, #ecf7f0 0%, var(--bg) 60%); text-align: center; }
.tz-hero-glow { position: absolute; top: -140px; left: 50%; transform: translateX(-50%);
  width: min(760px,90vw); height: 460px; background: radial-gradient(closest-side, rgba(45,90,61,.16), transparent);
  filter: blur(30px); pointer-events: none; }
.tz-hero-inner { position: relative; z-index: 2; }
.tz-badge { display: inline-flex; align-items: center; gap: 9px; background: var(--surf);
  border: 1px solid var(--line-2); border-radius: 999px; padding: 8px 18px; font-size: 13px; font-weight: 600;
  color: var(--g-d); box-shadow: 0 4px 16px rgba(45,90,61,.06); }
.tz-badge-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--gold);
  box-shadow: 0 0 0 4px rgba(200,131,42,.18); }
.tz-h1 { font-family: 'Playfair Display', serif; font-weight: 800; letter-spacing: -.02em;
  font-size: clamp(36px, 6.2vw, 74px); line-height: 1.08; margin: 28px auto 22px; max-width: 15ch; }
.tz-grad { background: linear-gradient(100deg, var(--g) 0%, var(--gold) 100%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.tz-hero-lead { font-size: clamp(16px,2vw,20px); color: var(--tx2); line-height: 1.65; max-width: 620px; margin: 0 auto 36px; }
.tz-hero-actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
.tz-hero-note { display: inline-flex; align-items: center; gap: 8px; margin-top: 22px; font-size: 13.5px; color: var(--tx3); font-weight: 500; }
.tz-hero-note svg { color: var(--g); }

/* product preview */
.tz-preview { position: relative; max-width: 1000px; margin: clamp(56px,8vw,88px) auto 0; }
.tz-window { position: relative; z-index: 3; border-radius: 18px 18px 0 0; overflow: hidden;
  border: 1px solid var(--line-2); border-bottom: none; background: var(--surf);
  box-shadow: 0 40px 80px -30px rgba(30,66,41,.35), 0 0 0 8px rgba(255,255,255,.5); }
.tz-window-bar { height: 46px; display: flex; align-items: center; gap: 8px; padding: 0 18px;
  background: #fbf9f3; border-bottom: 1px solid var(--line); }
.tz-dot { width: 11px; height: 11px; border-radius: 50%; }
.tz-window-url { flex: 1; margin: 0 12px; max-width: 320px; height: 26px; border-radius: 8px;
  background: var(--bg); border: 1px solid var(--line); display: flex; align-items: center; justify-content: center;
  font-size: 11.5px; color: var(--tx3); }
.tz-mock { display: flex; min-height: 440px; text-align: left; }
.tz-mock-side { width: 210px; flex-shrink: 0; background: linear-gradient(180deg,var(--g-d),var(--g-dd)); padding: 18px 14px; }
.tz-mock-brand { display: flex; align-items: center; gap: 9px; padding: 4px 6px 20px; }
.tz-mock-brand img { width: 26px; height: 26px; }
.tz-mock-brand span { color: #fff; font-family: 'Playfair Display', serif; font-weight: 700; font-size: 16px; }
.tz-mock-nav { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border-radius: 9px; margin-bottom: 3px; }
.tz-mock-nav.is-active { background: rgba(255,255,255,.14); }
.tz-mock-nav-ic { width: 16px; height: 16px; border-radius: 5px; background: rgba(255,255,255,.35); flex-shrink: 0; }
.tz-mock-nav.is-active .tz-mock-nav-ic { background: var(--gold); }
.tz-mock-nav-tx { font-size: 12.5px; color: rgba(255,255,255,.62); font-weight: 500; }
.tz-mock-nav.is-active .tz-mock-nav-tx { color: #fff; font-weight: 600; }
.tz-mock-main { flex: 1; min-width: 0; padding: 24px; background: var(--bg); }
.tz-mock-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.tz-mock-title { font-family: 'Playfair Display', serif; font-size: 19px; font-weight: 700; }
.tz-mock-sub { font-size: 12px; color: var(--tx3); margin-top: 2px; }
.tz-mock-btn { background: var(--g); color: #fff; font-size: 12px; font-weight: 600; padding: 8px 14px; border-radius: 9px; }
.tz-mock-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-bottom: 18px; }
.tz-mock-stat { background: var(--surf); border: 1px solid var(--line); border-radius: 14px; padding: 15px; }
.tz-mock-stat-ic { display: block; width: 30px; height: 30px; border-radius: 9px; margin-bottom: 12px; }
.tz-mock-stat-ic.green { background: #eafaf1; border: 1px solid #cdeed9; }
.tz-mock-stat-ic.gold { background: #fdf3e2; border: 1px solid #f2ddb8; }
.tz-mock-stat-ic.blue { background: #e8f2fb; border: 1px solid #cadff2; }
.tz-mock-stat-l { font-size: 11px; color: var(--tx3); font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
.tz-mock-stat-v { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; margin-top: 3px; }
.tz-mock-panel { background: var(--surf); border: 1px solid var(--line); border-radius: 14px; padding: 18px; }
.tz-mock-panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.tz-mock-panel-title { font-size: 13px; font-weight: 600; }
.tz-mock-legend { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--tx3); }
.tz-mock-legend i { width: 9px; height: 9px; border-radius: 3px; background: var(--g); }
.tz-mock-chart { display: flex; align-items: flex-end; gap: 8px; height: 110px; }
.tz-bar { flex: 1; border-radius: 5px 5px 2px 2px; background: linear-gradient(180deg,var(--gold) 0%,var(--g) 100%); opacity: .9; }
.tz-preview-fade { position: absolute; left: -20px; right: -20px; bottom: -1px; height: 150px;
  background: linear-gradient(180deg, transparent, var(--bg) 92%); z-index: 4; pointer-events: none; }

/* accent chips — statically anchored to the window frame corners */
.tz-chip { position: absolute; z-index: 5; display: flex; align-items: center; gap: 12px;
  background: #ffffff; border: 1px solid var(--line);
  border-radius: 16px; padding: 12px 16px; box-shadow: 0 24px 48px -20px rgba(30,66,41,.4);
  transition: transform .35s cubic-bezier(.16,1,.3,1), box-shadow .35s; }
.tz-chip:hover { transform: translateY(-3px); box-shadow: 0 30px 56px -20px rgba(30,66,41,.5); }
.tz-chip-a { top: -26px; left: -26px; }
.tz-chip-b { bottom: 132px; right: -30px; }
.tz-chip-ic { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tz-chip-ic-green { background: #eafaf1; color: var(--g); }
.tz-chip-ic-gold { background: #fdf3e2; color: var(--gold); }
.tz-chip-t { font-size: 15px; font-weight: 800; color: var(--tx); line-height: 1.1; }
.tz-chip-s { font-size: 12px; color: var(--tx2); margin-top: 2px; }

/* stats band */
.tz-statsband { background: linear-gradient(135deg,var(--g),var(--g-d)); }
.tz-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 24px; padding-top: 44px; padding-bottom: 44px; }
.tz-stat { text-align: center; }
.tz-stat-v { font-family: 'Playfair Display', serif; font-size: clamp(28px,4vw,40px); font-weight: 800; color: #fff; line-height: 1; }
.tz-stat-l { font-size: 13px; color: rgba(255,255,255,.72); margin-top: 8px; }

/* generic section */
.tz-section { padding: clamp(72px,10vw,120px) 0; }
.tz-section-alt { background: linear-gradient(180deg,var(--surf),var(--bg)); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.tz-head { text-align: center; max-width: 660px; margin: 0 auto clamp(48px,6vw,72px); }
.tz-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .08em; color: var(--g); margin-bottom: 16px; }
.tz-eyebrow svg { color: var(--gold); }
.tz-eyebrow-light { color: rgba(255,255,255,.9); }
.tz-eyebrow-light svg { color: var(--gold); }
.tz-h2 { font-family: 'Playfair Display', serif; font-weight: 800; letter-spacing: -.015em;
  font-size: clamp(28px,4vw,46px); line-height: 1.15; margin: 0 0 18px; }
.tz-h2-light { color: #fff; }
.tz-lead { font-size: clamp(15px,1.6vw,18px); color: var(--tx2); line-height: 1.65; margin: 0; }
.tz-lead-center { margin-left: auto; margin-right: auto; }
.tz-lead-light { color: rgba(255,255,255,.72); }

/* contrast split */
.tz-split { display: grid; grid-template-columns: 1.05fr .95fr; gap: clamp(40px,6vw,80px); align-items: center; }
.tz-split .tz-eyebrow { margin-top: 0; }
.tz-split .tz-h2, .tz-split .tz-lead { text-align: left; }
.tz-split .tz-lead { margin-bottom: 32px; }
.tz-contrast { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 16px; }
.tz-contrast-row { display: grid; grid-template-columns: minmax(120px,1fr) auto 1.5fr; align-items: center; gap: 14px; }
.tz-contrast-bad { font-size: 14px; font-weight: 600; color: var(--tx3); text-decoration: line-through; text-decoration-color: var(--line-2); }
.tz-contrast-arrow { color: var(--line-2); flex-shrink: 0; }
.tz-contrast-good { position: relative; background: var(--surf); border: 1px solid var(--line);
  border-left: 3px solid var(--g); border-radius: 12px; padding: 12px 16px; }
.tz-contrast-good-t { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; }
.tz-contrast-good-t svg { color: var(--g); flex-shrink: 0; }
.tz-contrast-good-d { font-size: 13px; color: var(--tx2); margin-top: 3px; padding-left: 24px; }

/* contrast visual */
.tz-contrast-visual { position: relative; min-height: 400px; }
.tz-xls { position: absolute; top: 0; right: 0; width: min(320px,80%); background: #fff; border: 1px solid #d9d9d9;
  border-radius: 12px; overflow: hidden; box-shadow: 0 16px 40px -18px rgba(0,0,0,.25);
  transform: rotate(4deg); filter: grayscale(.25); }
.tz-xls-bar { background: #217346; color: #fff; font-size: 11px; font-weight: 600; padding: 8px 12px; }
.tz-xls-grid { padding: 4px 0; }
.tz-xls-row { display: grid; grid-template-columns: 28px 1.4fr 1fr 1fr; border-bottom: 1px solid #f0f0f0; }
.tz-xls-c { font-size: 11px; color: #444; padding: 7px 8px; border-right: 1px solid #f0f0f0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tz-xls-c.muted { background: #f3f2f1; color: #999; text-align: center; }
.tz-xls-c.err { color: #c0392b; font-weight: 700; background: #fdecea; }
.tz-xls-flag { position: absolute; bottom: 24px; right: -8px; background: #c0392b; color: #fff;
  font-size: 11.5px; font-weight: 700; padding: 7px 13px; border-radius: 8px; box-shadow: 0 10px 24px -8px rgba(192,57,43,.6); }
.tz-clean { position: relative; z-index: 2; width: min(330px,88%); margin-top: 130px;
  background: var(--g-dd); border-radius: 20px; padding: 22px;
  box-shadow: 0 40px 70px -28px rgba(22,54,32,.7), 0 0 0 8px rgba(255,255,255,.4); }
.tz-clean-head { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
.tz-clean-ic { width: 42px; height: 42px; border-radius: 12px; background: rgba(255,255,255,.1); color: #58c98a;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tz-clean-t { color: #fff; font-size: 15px; font-weight: 700; }
.tz-clean-s { color: rgba(255,255,255,.6); font-size: 12px; margin-top: 1px; }
.tz-clean-badge { margin-left: auto; align-self: flex-start; background: rgba(88,201,138,.16); color: #58c98a;
  border: 1px solid rgba(88,201,138,.4); font-size: 10.5px; font-weight: 800; letter-spacing: .05em; padding: 4px 9px; border-radius: 7px; }
.tz-clean-row { display: flex; justify-content: space-between; align-items: baseline; padding: 14px 0 12px; }
.tz-clean-row span { color: rgba(255,255,255,.7); font-size: 13px; }
.tz-clean-row strong { color: #fff; font-size: 18px; font-weight: 800; }
.tz-clean-track { height: 8px; border-radius: 5px; background: rgba(255,255,255,.12); overflow: hidden; }
.tz-clean-track span { display: block; width: 100%; height: 100%; background: linear-gradient(90deg,var(--g),var(--gold)); }
.tz-clean-speed { display: flex; align-items: center; gap: 7px; margin-top: 14px; color: rgba(255,255,255,.82); font-size: 12.5px; font-weight: 600; }
.tz-clean-speed svg { color: var(--gold); }

/* features */
.tz-features { display: grid; grid-template-columns: repeat(4,1fr); gap: 18px; }
.tz-fcard { position: relative; overflow: hidden; background: var(--surf); border: 1px solid var(--line);
  border-radius: 18px; padding: 26px 24px; transition: transform .3s cubic-bezier(.16,1,.3,1), box-shadow .3s, border-color .3s; }
.tz-fcard:hover { transform: translateY(-5px); border-color: #cdeed9; box-shadow: 0 22px 40px -22px rgba(45,90,61,.4); }
.tz-ficon { display: flex; align-items: center; justify-content: center; width: 46px; height: 46px; border-radius: 13px;
  background: linear-gradient(135deg,#eafaf1,#d6f0e0); color: var(--g); margin-bottom: 18px;
  box-shadow: 0 4px 12px rgba(45,90,61,.1); transition: transform .3s; }
.tz-fcard:hover .tz-ficon { transform: scale(1.06) rotate(-4deg); }
.tz-fcard h3 { font-size: 16px; font-weight: 700; margin: 0 0 8px; }
.tz-fcard p { font-size: 13.5px; color: var(--tx2); line-height: 1.6; margin: 0; }
.tz-fcard-ghost { position: absolute; right: -22px; bottom: -22px; color: var(--g); opacity: .04; transition: transform .4s, opacity .4s; }
.tz-fcard:hover .tz-fcard-ghost { transform: scale(1.15) rotate(-8deg); opacity: .07; }

/* audit (dark) */
.tz-audit { position: relative; overflow: hidden; padding: clamp(72px,10vw,120px) 0;
  background: linear-gradient(160deg,var(--g-dd) 0%,#1a3c26 100%); }
.tz-audit-glow { position: absolute; bottom: -20%; right: -5%; width: 620px; height: 620px; border-radius: 50%;
  background: radial-gradient(closest-side, rgba(200,131,42,.16), transparent); filter: blur(20px); pointer-events: none; }
.tz-audit-inner { position: relative; z-index: 2; }
.tz-audit .tz-head .tz-btn { margin-top: 30px; }
.tz-audit-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 18px; }
.tz-acard { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.1); border-radius: 18px;
  padding: 28px; transition: transform .3s, background .3s, border-color .3s; }
.tz-acard:hover { transform: translateY(-4px); background: rgba(255,255,255,.07); border-color: rgba(200,131,42,.5); }
.tz-acard-ic { display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 14px;
  background: rgba(255,255,255,.09); border: 1px solid rgba(255,255,255,.14); color: #fff; margin-bottom: 18px; }
.tz-acard:hover .tz-acard-ic { color: var(--gold); border-color: rgba(200,131,42,.45); }
.tz-acard h3 { font-size: 16px; font-weight: 700; color: #fff; margin: 0 0 10px; }
.tz-acard p { font-size: 14px; color: rgba(255,255,255,.62); line-height: 1.6; margin: 0; }

/* steps */
.tz-steps { display: grid; grid-template-columns: repeat(3,1fr); gap: 22px; position: relative; }
.tz-steps::before { content: ''; position: absolute; top: 46px; left: 12%; right: 12%; height: 2px;
  background: linear-gradient(90deg, transparent, var(--line-2) 15%, var(--line-2) 85%, transparent); }
.tz-step { position: relative; text-align: center; background: var(--surf); border: 1px solid var(--line);
  border-radius: 20px; padding: 40px 28px 32px; transition: transform .3s cubic-bezier(.16,1,.3,1), box-shadow .3s, border-color .3s; }
.tz-step:hover { transform: translateY(-6px); border-color: #cdeed9; box-shadow: 0 24px 44px -24px rgba(45,90,61,.4); }
.tz-step-num { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 50%;
  background: var(--surf); border: 1px solid var(--line-2); box-shadow: 0 6px 18px rgba(45,90,61,.1);
  font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 800; color: var(--g);
  margin: -72px auto 20px; position: relative; }
.tz-step h3 { font-size: 17px; font-weight: 700; margin: 0 0 10px; }
.tz-step p { font-size: 14px; color: var(--tx2); line-height: 1.6; margin: 0; }

/* trust */
.tz-trust { display: grid; grid-template-columns: repeat(3,1fr); gap: 18px; }
.tz-tcard { display: flex; gap: 16px; background: var(--surf); border: 1px solid var(--line); border-radius: 18px;
  padding: 26px 24px; transition: transform .3s, box-shadow .3s, border-color .3s; }
.tz-tcard:hover { transform: translateY(-4px); border-color: #cdeed9; box-shadow: 0 20px 38px -22px rgba(45,90,61,.35); }
.tz-tcard-ic { display: flex; align-items: center; justify-content: center; width: 46px; height: 46px; border-radius: 13px; flex-shrink: 0;
  background: linear-gradient(135deg,var(--bg),var(--surf)); border: 1px solid var(--line-2); color: var(--g); }
.tz-tcard h3 { font-size: 15.5px; font-weight: 700; margin: 2px 0 7px; }
.tz-tcard p { font-size: 13.5px; color: var(--tx2); line-height: 1.6; margin: 0; }

/* CTA */
.tz-ctawrap { padding: clamp(56px,8vw,96px) 0; background: var(--surf); border-top: 1px solid var(--line); }
.tz-cta { position: relative; overflow: hidden; border-radius: clamp(24px,4vw,36px);
  background: linear-gradient(135deg,var(--g-d) 0%,var(--g-dd) 100%); padding: clamp(48px,7vw,84px) clamp(24px,5vw,48px); text-align: center; }
.tz-cta-glow { position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(60% 120% at 85% -10%, rgba(200,131,42,.28), transparent 60%),
              radial-gradient(50% 120% at 10% 120%, rgba(45,90,61,.5), transparent 60%); }
.tz-cta-inner { position: relative; z-index: 2; }
.tz-cta h2 { font-family: 'Playfair Display', serif; font-weight: 800; letter-spacing: -.015em;
  font-size: clamp(28px,4.5vw,52px); line-height: 1.15; color: #fff; margin: 0 0 18px; }
.tz-cta p { font-size: clamp(15px,1.8vw,18px); color: rgba(255,255,255,.78); line-height: 1.6; max-width: 540px; margin: 0 auto 36px; }
.tz-cta-actions { margin-top: 0; }

/* footer */
.tz-footer { background: var(--g-dd); color: #fff; padding: 48px 0 28px; }
.tz-footer-inner { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; padding-bottom: 26px;
  border-bottom: 1px solid rgba(255,255,255,.1); }
.tz-footer-brand { display: flex; align-items: center; gap: 12px; }
.tz-footer-brand img { width: 40px; height: 40px; }
.tz-footer-name { font-family: 'Playfair Display', serif; font-weight: 700; font-size: 18px; }
.tz-footer-tag { font-size: 12.5px; color: rgba(255,255,255,.5); margin-top: 2px; }
.tz-footer-links { display: flex; gap: 22px; flex-wrap: wrap; }
.tz-footer-links a { font-size: 13.5px; color: rgba(255,255,255,.65); transition: color .15s; }
.tz-footer-links a:hover { color: #fff; }
.tz-footer-copy { font-size: 12.5px; color: rgba(255,255,255,.42); padding-top: 22px; }

/* ---------------- responsive ---------------- */
@media (max-width: 980px) {
  .tz-split { grid-template-columns: 1fr; }
  .tz-contrast-visual { min-height: 380px; max-width: 420px; margin: 0 auto; }
  .tz-features { grid-template-columns: repeat(2,1fr); }
  .tz-audit-grid, .tz-trust { grid-template-columns: repeat(2,1fr); }
}
@media (max-width: 860px) {
  .tz-nav-links { display: none; }
  .tz-steps { grid-template-columns: 1fr; gap: 44px; }
  .tz-steps::before { display: none; }
  .tz-step-num { margin-top: 0; }
  .tz-chip { display: none; }
  .tz-mock-side { display: none; }
}
@media (max-width: 620px) {
  .tz-stats { grid-template-columns: repeat(2,1fr); gap: 28px; }
  .tz-features, .tz-audit-grid, .tz-trust { grid-template-columns: 1fr; }
  .tz-nav-login { display: none; }
  .tz-contrast-row { grid-template-columns: 1fr; gap: 6px; }
  .tz-contrast-arrow { display: none; }
  .tz-contrast-bad { padding-bottom: 2px; }
  .tz-window-url { display: none; }
  .tz-mock-main { padding: 18px; }
  .tz-mock-stats { gap: 10px; }
  .tz-tcard { padding: 20px; }
}
`
