'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, ArrowRight, CheckCircle } from 'lucide-react'

const AYLIK = 750
const YILLIK_TOPLAM = 7500
const YILLIK_AYLIK = Math.round(YILLIK_TOPLAM / 12)

const ozellikler = [
  'Öğrenci yönetimi', 'Personel yönetimi', 'Sınıf tanımları', 'Ders programı',
  'Sınıf defteri & devam', 'Puantaj takibi', 'Otomatik bordro hesabı', 'Bordro e-posta gönderimi',
  'Ödeme & tahsilat takibi', 'Gelir / gider raporları', 'Bilanço', 'Hesap hareketleri',
  'Kurumsal ayarlar', 'Akıllı uyarılar', 'MEB mevzuatına tam uyum',
]

const sss = [
  { q: 'İptal edebilir miyim?', a: 'Sistem üzerinden istediğiniz an, kimseyle görüşmeden tek tıkla iptal edebilirsiniz. Uzun sözleşmeler veya cayma bedeli yoktur.' },
  { q: 'Sınırlar var mı?', a: 'Sınırsız personel, sınırsız sınıf ve sınırsız öğrenci. Fiyatlandırma sadece yönetilen kurum başına sabittir.' },
  { q: 'Veri güvenliği nasıl?', a: 'Tüm kişisel ve finansal verileriniz 256-bit uçtan uca şifrelemeyle güvenli bulut altyapısında barındırılır.' },
]

export default function FiyatlandirmaContent() {
  const [donem, setDonem] = useState<'aylik' | 'yillik'>('aylik')

  const fiyat = donem === 'aylik' ? AYLIK : YILLIK_AYLIK
  const perLabel = donem === 'aylik' ? '/ ay · kurum başına' : '/ ay · yıllık fatura'
  const tasarruf = AYLIK * 12 - YILLIK_TOPLAM

  return (
    <div className="fp">
      <style>{CSS}</style>

      {/* Dönem seçici */}
      <div className="fp-toggle">
        {(['aylik', 'yillik'] as const).map(d => (
          <button key={d} type="button" className={donem === d ? 'on' : ''} onClick={() => setDonem(d)}>
            {d === 'aylik' ? 'Aylık Fatura' : 'Yıllık Fatura'}
            {d === 'yillik' && <span className="fp-save">%20 indirim</span>}
          </button>
        ))}
      </div>

      {/* Plan kartı */}
      <div className="fp-card">
        <div className="fp-price">
          <div className="fp-badge"><CheckCircle size={15} /> Tek plan · tüm modüller</div>
          <div className="fp-amount">
            <span className="fp-cur">₺</span>
            <span className="fp-num">{fiyat.toLocaleString('tr-TR')}</span>
          </div>
          <div className="fp-per">{perLabel}</div>

          {donem === 'yillik' ? (
            <div className="fp-note">
              Yılda toplam {YILLIK_TOPLAM.toLocaleString('tr-TR')} ₺
              <strong>{tasarruf.toLocaleString('tr-TR')} ₺ net tasarruf</strong>
            </div>
          ) : <div className="fp-note-sp" />}

          <Link href="/signup" className="fp-cta">7 Gün Ücretsiz Dene <ArrowRight size={19} /></Link>
          <p className="fp-cta-note">Kredi kartı gerekmez</p>
        </div>

        <div className="fp-feats">
          <p className="fp-feats-h">Pakete dahil olan her şey</p>
          <div className="fp-feats-grid">
            {ozellikler.map(o => (
              <div className="fp-feat" key={o}>
                <span className="fp-check"><Check size={13} strokeWidth={3} /></span>
                <span>{o}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SSS */}
      <div className="fp-faq">
        {sss.map((item, i) => (
          <div className="fp-faq-card" key={item.q}>
            <div className="fp-faq-num">0{i + 1}</div>
            <p className="fp-faq-q">{item.q}</p>
            <p className="fp-faq-a">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const CSS = `
.fp{max-width:1000px;margin:0 auto}
.fp-toggle{display:inline-flex;background:var(--surf);border:1px solid var(--line-2);border-radius:999px;padding:6px;gap:4px;
  box-shadow:0 4px 15px rgba(0,0,0,.03);margin:0 auto 40px;position:relative;left:50%;transform:translateX(-50%)}
.fp-toggle button{padding:12px 26px;border-radius:999px;font:inherit;font-size:14.5px;font-weight:700;border:none;cursor:pointer;
  background:transparent;color:var(--tx2);transition:all .25s;display:inline-flex;align-items:center;gap:9px}
.fp-toggle button.on{background:var(--g);color:#fff;box-shadow:0 8px 20px rgba(45,90,61,.22)}
.fp-save{background:#eafaf1;color:var(--g);border-radius:999px;padding:3px 9px;font-size:11.5px;font-weight:800}
.fp-toggle button.on .fp-save{background:rgba(255,255,255,.2);color:#fff}

.fp-card{background:var(--surf);border:1px solid var(--line-2);border-radius:28px;overflow:hidden;
  display:grid;grid-template-columns:minmax(320px,1fr) 1.5fr;box-shadow:0 40px 80px -50px rgba(45,90,61,.4)}
.fp-price{background:linear-gradient(150deg,var(--g-d),var(--g-dd));color:#fff;padding:clamp(32px,4vw,48px)}
.fp-badge{display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);
  border-radius:999px;padding:6px 15px;font-size:12.5px;font-weight:700;margin-bottom:28px}
.fp-badge svg{color:#7ddba0}
.fp-amount{display:flex;align-items:flex-start;gap:6px}
.fp-cur{font-size:30px;font-weight:600;color:rgba(255,255,255,.8);margin-top:10px}
.fp-num{font-family:'Playfair Display',serif;font-size:clamp(56px,8vw,72px);font-weight:800;line-height:1}
.fp-per{font-size:15px;color:rgba(255,255,255,.6);padding-bottom:22px;margin-bottom:22px;border-bottom:1px solid rgba(255,255,255,.12)}
.fp-note{background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px 18px;
  font-size:14px;color:rgba(255,255,255,.82);margin-bottom:28px}
.fp-note strong{display:block;margin-top:6px;color:#7ddba0;font-size:15px}
.fp-note-sp{height:28px}
.fp-cta{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:18px 0;border-radius:15px;
  background:#fff;color:var(--g-dd);font-weight:800;font-size:16.5px;box-shadow:0 10px 26px rgba(0,0,0,.2);transition:transform .2s}
.fp-cta:hover{transform:translateY(-2px)}
.fp-cta-note{text-align:center;font-size:13px;color:rgba(255,255,255,.5);margin:14px 0 0}

.fp-feats{padding:clamp(28px,4vw,48px)}
.fp-feats-h{font-size:13px;font-weight:800;color:var(--tx);text-transform:uppercase;letter-spacing:.05em;
  margin:0 0 22px;padding-bottom:16px;border-bottom:1px solid var(--line)}
.fp-feats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:18px 16px}
.fp-feat{display:flex;align-items:flex-start;gap:11px;font-size:14px;color:#3a3a2e;font-weight:600;line-height:1.4}
.fp-check{width:23px;height:23px;border-radius:50%;background:#eafaf1;color:var(--g);flex-shrink:0;
  display:flex;align-items:center;justify-content:center;margin-top:1px}

.fp-faq{margin-top:64px;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}
.fp-faq-card{background:var(--surf);border:1px solid var(--line);border-radius:20px;padding:28px 24px;
  box-shadow:0 14px 34px -26px rgba(30,66,41,.35)}
.fp-faq-num{width:42px;height:42px;border-radius:12px;background:#eafaf1;color:var(--g);font-weight:800;font-size:15px;
  display:flex;align-items:center;justify-content:center;margin-bottom:18px}
.fp-faq-q{font-size:16px;font-weight:700;color:var(--tx);margin:0 0 10px}
.fp-faq-a{font-size:14px;color:var(--tx2);margin:0;line-height:1.65}

@media (max-width:820px){
  .fp-card{grid-template-columns:1fr}
}
`
