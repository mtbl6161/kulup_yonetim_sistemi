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
          <h1 className="pub-h1">Çocuk Kulübü Rehberi ve Araçları</h1>
          <p className="pub-lead">
            MEB çocuk kulüpleri için ihtiyacınız olan tüm ücretsiz hesaplama araçları ve rehber
            içerikleri tek sayfada. Kayıt gerekmez.
          </p>
        </div>
      </section>

      <section className="pub-section" style={{ paddingTop: 8 }}>
        <div className="pub-container">
          <h2 className="hub-title">Hesaplama araçları</h2>
          <ul className="hub-liste">
            {araclar.map(a => (
              <li key={a.href}>
                <Link href={a.href}><span className="hub-t">{a.title}</span><span className="hub-d">{a.desc}</span></Link>
              </li>
            ))}
          </ul>

          <h2 className="hub-title">Rehber yazıları</h2>
          <ul className="hub-liste">
            {rehberler.map(a => (
              <li key={a.href}>
                <Link href={a.href}><span className="hub-t">{a.title}</span><span className="hub-d">{a.desc}</span></Link>
              </li>
            ))}
          </ul>

          <div className="hub-kapanis">
            <h2 className="hub-title">Bu hesapları her ay elle yapmayın</h2>
            <p>Klüp360 bordroyu, aidatı, puantajı ve tahakkuk cetvelini tüm personel ve öğrenciler için kendiliğinden üretir.</p>
            <Link href="/signup" className="pub-btn pub-btn-primary pub-btn-lg">15 gün ücretsiz deneyin</Link>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}

const CSS = `
.hub-title{font-family:var(--baslik);font-size:clamp(24px,3vw,30px);font-weight:700;letter-spacing:-.01em;color:var(--tx);margin:clamp(40px,5vw,56px) 0 16px}
.pub-section .hub-title:first-child{margin-top:0}
.hub-liste{list-style:none;margin:0;padding:0;border-top:2px solid var(--tx);display:grid;grid-template-columns:1fr 1fr;column-gap:56px}
.hub-liste li{border-bottom:1px solid var(--cizgi)}
.hub-liste a{display:flex;flex-direction:column;gap:3px;padding:16px 0}
.hub-t{font-weight:600;color:var(--g);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:5px}
.hub-liste a:hover .hub-t{text-decoration-thickness:2px}
.hub-d{font-size:15.5px;color:var(--tx2)}
.hub-kapanis{margin-top:clamp(48px,6vw,72px);padding-top:8px;border-top:2px solid var(--tx);max-width:60ch}
.hub-kapanis p{color:var(--tx2);margin:0 0 22px}
@media (max-width:760px){.hub-liste{grid-template-columns:1fr}}
`
