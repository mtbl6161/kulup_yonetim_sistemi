import type { Metadata } from 'next'
import Link from 'next/link'
import PublicShell from '@/components/public/PublicShell'

export const metadata: Metadata = {
  title: 'Çocuk Kulübü Rehberi ve Hesaplama Araçları | Klüp360',
  description:
    'MEB çocuk kulüpleri için ücretsiz bordro, aidat, bütçe ve ek ders hesaplama araçları ile rehber içerikleri tek sayfada. Kayıt gerekmez.',
  alternates: { canonical: 'https://www.klup360.com/rehber' },
  openGraph: {
    title: 'Çocuk Kulübü Rehberi ve Araçları',
    description: 'Ücretsiz hesaplama araçları ve rehber içerikleri tek yerde.',
    url: 'https://www.klup360.com/rehber',
    siteName: 'Klüp360',
    locale: 'tr_TR',
    type: 'website',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'Klüp360' }],
  },
}

const araclar = [
  {
    href: '/cocuk-kulubu-bordro-hesaplama',
    title: 'Bordro Hesaplama',
    desc: 'Brütten net maaş, SGK, gelir ve damga vergisi kesintileri.',
  },
  {
    href: '/cocuk-kulubu-aidat-hesaplama',
    title: 'Aidat Hesaplama',
    desc: 'Veliden toplanacak aylık ücret; iş günü ve kardeş indirimi dahil.',
  },
  {
    href: '/cocuk-kulubu-butce-tablosu',
    title: 'Örnek Bütçe Tablosu',
    desc: 'Toplam gelirin öğretmen havuzu ve görevlilere tahakkuk dağıtımı.',
  },
  {
    href: '/ek-ders-hesaplama',
    title: 'Ek Ders / Saat Ücreti',
    desc: 'Gösterge ve katsayıya göre saat ücreti hesaplama.',
  },
  {
    href: '/gelir-vergisi-dilimleri-2026',
    title: '2026 Gelir Vergisi Dilimleri',
    desc: 'Güncel vergi dilimleri tablosu ve gelir vergisi hesaplama.',
  },
]

const rehberler = [
  {
    href: '/rehber/cocuk-kulubu-yonetmeligi',
    title: 'Yönerge Rehberi',
    desc: 'Kuruluş, personel, ücretlendirme ve denetimin temel maddeleri.',
  },
  {
    href: '/rehber/cocuk-kulubu-acilis-sureci',
    title: 'Açılış Süreci',
    desc: 'Adım adım açılış ve gerekli evraklar.',
  },
  {
    href: '/rehber/tutulacak-defterler',
    title: 'Tutulacak Defterler',
    desc: 'Karar defteri, gelir-gider, puantaj, bordro ve tahakkuk.',
  },
  {
    href: '/rehber/sikca-sorulan-sorular',
    title: 'Sıkça Sorulan Sorular',
    desc: 'Bordro, aidat, saat ücreti ve açılış hakkında yanıtlar.',
  },
  {
    href: '/rehber/belgeler',
    title: 'Belgeler ve Şablonlar',
    desc: 'Dilekçe, sözleşme ve bütçe tablosu şablonları (Word/Excel indir).',
  },
]

export default function Page() {
  return (
    <PublicShell>
      <style>{CSS}</style>
      <section className="pub-hero">
        <div className="pub-container">
          <span className="pub-badge"><span className="pub-badge-dot" /> Ücretsiz araçlar ve rehber</span>
          <h1 className="pub-h1">Çocuk Kulübü <span className="pub-grad">Rehberi ve Araçları</span></h1>
          <p className="pub-lead">
            MEB çocuk kulüpleri için ihtiyacınız olan tüm ücretsiz hesaplama araçları ve rehber
            içerikleri tek sayfada. Kayıt gerekmez.
          </p>
        </div>
      </section>

      <section className="pub-section" style={{ paddingTop: 8 }}>
        <div className="pub-container">
          <h2 className="hub-title">Hesaplama Araçları</h2>
          <div className="hub-grid">
            {araclar.map(a => (
              <Link href={a.href} key={a.href} className="hub-card">
                <span className="hub-card-t">{a.title}</span>
                <span className="hub-card-d">{a.desc}</span>
                <span className="hub-card-go">Hesapla →</span>
              </Link>
            ))}
          </div>

          <h2 className="hub-title" style={{ marginTop: 56 }}>Rehber İçerikleri</h2>
          <div className="hub-grid">
            {rehberler.map(a => (
              <Link href={a.href} key={a.href} className="hub-card">
                <span className="hub-card-t">{a.title}</span>
                <span className="hub-card-d">{a.desc}</span>
                <span className="hub-card-go">Oku →</span>
              </Link>
            ))}
          </div>

          <div className="hub-cta">
            <h2>Hepsini tek panelde otomatik yapın</h2>
            <p>Klüp360; bordro, aidat, puantaj ve tahakkuk cetvelini tüm personel için otomatik üretir.</p>
            <Link href="/signup" className="pub-btn pub-btn-primary pub-btn-lg">Ücretsiz Başlayın</Link>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}

const CSS = `
.hub-title{font-family:'Playfair Display',serif;font-size:24px;font-weight:800;color:var(--tx);margin:0 0 22px;text-align:center}
.hub-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:20px}
.hub-card{display:flex;flex-direction:column;gap:8px;background:var(--surf);border:1px solid var(--line);
  border-radius:18px;padding:24px;box-shadow:0 16px 36px -28px rgba(30,66,41,.35);
  transition:transform .2s,box-shadow .2s,border-color .2s}
.hub-card:hover{transform:translateY(-4px);border-color:var(--g);box-shadow:0 24px 48px -28px rgba(30,66,41,.5)}
.hub-card-t{font-family:'Playfair Display',serif;font-size:19px;font-weight:800;color:var(--tx)}
.hub-card-d{font-size:14px;color:var(--tx2);line-height:1.55;flex:1}
.hub-card-go{font-size:14px;font-weight:700;color:var(--g)}
.hub-cta{margin-top:56px;text-align:center;background:linear-gradient(135deg,var(--g),var(--g-d));border-radius:24px;
  padding:clamp(36px,5vw,56px);color:#fff}
.hub-cta h2{font-family:'Playfair Display',serif;font-size:clamp(22px,3vw,30px);font-weight:800;margin:0 0 12px}
.hub-cta p{font-size:16px;color:rgba(255,255,255,.85);margin:0 auto 24px;max-width:480px}
`
