import type { Metadata } from 'next'
import Link from 'next/link'
import PublicShell from '@/components/public/PublicShell'

export const metadata: Metadata = {
  title: 'Çocuk Kulübü Belgeleri ve Şablonları (Ücretsiz İndir) | Klüp360',
  description:
    'Çocuk kulübü için hazır, düzenlenebilir şablonlar: görev alma dilekçesi, öğrenci-veli sözleşmesi ve örnek bütçe tablosu. Word ve Excel formatında ücretsiz indirin.',
  alternates: { canonical: 'https://www.klup360.com/rehber/belgeler' },
  openGraph: {
    title: 'Çocuk Kulübü Belgeleri ve Şablonları — Ücretsiz İndir',
    description: 'Dilekçe, sözleşme ve bütçe tablosu şablonları (Word/Excel).',
    url: 'https://www.klup360.com/rehber/belgeler',
    siteName: 'Klüp360', locale: 'tr_TR', type: 'website',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'Klüp360' }],
  },
}

const sablonlar = [
  {
    href: '/sablonlar/gorev-alma-dilekcesi.docx',
    title: 'Görev Alma Dilekçesi',
    desc: 'Çocuk kulübünde görev almak isteyen öğretmen/personel için hazır dilekçe örneği.',
    format: 'Word (.docx)',
  },
  {
    href: '/sablonlar/ogrenci-veli-sozlesmesi.docx',
    title: 'Öğrenci–Veli Sözleşmesi',
    desc: 'Öğrenci kayıt bilgileri, aidat ve genel hükümleri içeren düzenlenebilir sözleşme.',
    format: 'Word (.docx)',
  },
  {
    href: '/sablonlar/ornek-butce-tablosu.xlsx',
    title: 'Örnek Bütçe Tablosu',
    desc: 'Toplam geliri girince tahakkuk dağıtımını otomatik hesaplayan formüllü Excel tablosu.',
    format: 'Excel (.xlsx)',
  },
]

export default function Page() {
  return (
    <PublicShell>
      <style>{CSS}</style>
      <section className="pub-hero">
        <div className="pub-container">
          <span className="pub-badge"><span className="pub-badge-dot" /> Ücretsiz indir</span>
          <h1 className="pub-h1">Belgeler ve <span className="pub-grad">Şablonlar</span></h1>
          <p className="pub-lead">
            Çocuk kulübünüz için hazır, düzenlenebilir dilekçe, sözleşme ve bütçe tablosu şablonlarını
            ücretsiz indirin. Köşeli parantezli alanları kendi bilgilerinizle doldurmanız yeterli.
          </p>
        </div>
      </section>

      <section className="pub-section" style={{ paddingTop: 8 }}>
        <div className="pub-container">
          <div className="dl-grid">
            {sablonlar.map(s => (
              <div className="dl-card" key={s.href}>
                <span className="dl-badge">{s.format}</span>
                <h2 className="dl-title">{s.title}</h2>
                <p className="dl-desc">{s.desc}</p>
                <a className="dl-btn" href={s.href} download>İndir ↓</a>
              </div>
            ))}
          </div>

          <p className="dl-note">
            Şablonlar bilgilendirme amaçlı örneklerdir; kurumunuzun ve güncel mevzuatın gerekliliklerine
            göre uyarlayın. Tüm belgeleri otomatik üretmek için{' '}
            <Link href="/signup">Klüp360'ı ücretsiz deneyin</Link>. İlgili{' '}
            <Link href="/rehber">rehber ve araçlar</Link>.
          </p>
        </div>
      </section>
    </PublicShell>
  )
}

const CSS = `
.dl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px}
.dl-card{display:flex;flex-direction:column;gap:10px;background:var(--surf);border:1px solid var(--line);
  border-radius:18px;padding:26px;box-shadow:0 16px 36px -28px rgba(30,66,41,.35)}
.dl-badge{align-self:flex-start;font-size:11.5px;font-weight:700;color:var(--g);background:#eafaf1;
  border:1px solid #cdeeda;border-radius:100px;padding:3px 11px}
.dl-title{font-family:'Playfair Display',serif;font-size:20px;font-weight:800;color:var(--tx);margin:2px 0 0}
.dl-desc{font-size:14px;color:var(--tx2);line-height:1.55;flex:1;margin:0}
.dl-btn{display:inline-block;text-align:center;margin-top:6px;padding:12px 16px;border-radius:11px;
  background:var(--g);color:#fff!important;font-weight:700;font-size:14.5px;transition:background .2s,transform .2s}
.dl-btn:hover{background:var(--g-d);transform:translateY(-2px)}
.dl-note{margin-top:28px;font-size:13.5px;color:var(--tx2);line-height:1.6;text-align:center;max-width:640px;margin-left:auto;margin-right:auto}
.dl-note a{color:var(--g);font-weight:600}
`
