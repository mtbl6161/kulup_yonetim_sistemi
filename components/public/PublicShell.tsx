import Link from 'next/link'
import { BrandMark, Wordmark } from '@/components/brand/Logo'
import { PUBLIC_FONT_SINIFI } from './fontlar'
import PublicNav from './PublicNav'

/**
 * Herkese açık sayfaların ortak kabuğu (fiyatlandırma, rehber, araçlar, iletişim, yasal metinler).
 * Tanıtım sayfasıyla aynı tasarım dili: sola hizalı, belge gibi; kart, geçiş rengi ve süs hareketi yok.
 * Server component — içindeki PublicNav client sınırıdır (useAuth kullanır).
 */
export default function PublicShell({ children }: { children: React.ReactNode }) {
  const yil = new Date().getFullYear()
  return (
    <div className={`pub ${PUBLIC_FONT_SINIFI}`}>
      <style>{PUBLIC_CSS}</style>
      <PublicNav />
      <main className="pub-main">{children}</main>
      <footer className="pub-footer">
        <div className="pub-container pub-footer-inner">
          <div className="pub-footer-brand">
            <BrandMark size={40} tone="blue" title="" />
            <div>
              <Wordmark height={26} onDark />
              <div className="pub-footer-tag">MEB çocuk kulüpleri yönetim sistemi</div>
            </div>
          </div>
          <div className="pub-footer-links">
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
        <div className="pub-container pub-footer-copy">© {yil} Klüp360. Tüm hakları saklıdır.</div>
      </footer>
    </div>
  )
}

export const PUBLIC_CSS = `
.pub{
  /* tanıtım sayfasıyla aynı palet; eski adlar sayfa stilleri bozulmasın diye korunur */
  --kagit:#FFFFFF; --zemin:#F6F8FC; --cizgi:#DCE3F3; --murekkep:#1A2233; --gece:#141C2E;
  --g:#2347D9; --g-d:#1B38B8; --g-dd:#141C2E; --gold:#8EA3EE; --gold-d:#5D78E8;
  --bg:#F6F8FC; --surf:#FFFFFF; --line:#DCE3F3; --line-2:#DCE3F3; --soluk:#E6ECFC;
  --tx:#1A2233; --tx2:#465066; --tx3:#66708A;
  --baslik:var(--font-tz-baslik), system-ui, sans-serif;
  --govde:var(--font-tz-govde), system-ui, sans-serif;
  /* sayfa stillerindeki eski var(--font-display) / var(--font-sans) kullanımları da yeni fontlara geçsin */
  --font-display:var(--font-tz-baslik), system-ui, sans-serif;
  --font-sans:var(--font-tz-govde), system-ui, sans-serif;
  font-family:var(--govde); font-size:17px; line-height:1.6; color:var(--tx); background:var(--kagit);
  min-height:100vh; display:flex; flex-direction:column; -webkit-font-smoothing:antialiased;
}
.pub *,.pub *::before,.pub *::after{box-sizing:border-box}
.pub :where(a){text-decoration:none;color:inherit}
.pub img{max-width:100%;display:block}
.pub-main{flex:1}
.pub-container{width:100%;max-width:1120px;margin:0 auto;padding:0 clamp(16px,4vw,40px)}
.pub a:focus-visible,.pub button:focus-visible,.pub input:focus-visible,.pub select:focus-visible{outline:3px solid var(--g);outline-offset:3px}
/* eski başlık vurgusu: tek ifadeyi renklendirmek kaldırıldı, sınıf geriye dönük olarak etkisiz */
.pub-grad{color:inherit}

/* düğmeler */
.pub-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 18px;border-radius:10px;
  font:600 15px/1 var(--govde);border:1px solid transparent;cursor:pointer;white-space:nowrap}
.pub-btn-lg{min-height:52px;padding:0 24px;font-size:16.5px}
.pub-btn-primary{background:var(--g);color:#fff}
.pub-btn-primary:hover{background:var(--g-d)}
.pub-btn-ghost{background:var(--kagit);color:var(--tx);border-color:var(--cizgi)}
.pub-btn-ghost:hover{border-color:var(--g)}
.pub-btn-white{background:#fff;color:var(--gece)}
.pub-btn-white:hover{background:var(--soluk)}

/* menü */
.pub-nav{position:sticky;top:0;z-index:100;background:rgba(255,255,255,.94);border-bottom:1px solid var(--cizgi)}
.pub-nav-inner{max-width:1120px;margin:0 auto;height:68px;padding:0 clamp(16px,4vw,40px);display:flex;align-items:center;gap:28px}
.pub-brand{display:flex;align-items:center;gap:10px;flex-shrink:0}
.pub-nav-links{display:flex;gap:24px;margin-right:auto}
.pub-nav-links a{font-size:15px;color:var(--tx2)}
.pub-nav-links a:hover{color:var(--tx);text-decoration:underline;text-underline-offset:5px}
.pub-nav-links a.active{color:var(--tx);font-weight:600;text-decoration:underline;text-underline-offset:6px;text-decoration-thickness:2px;text-decoration-color:var(--g)}
.pub-nav-cta{display:flex;align-items:center;gap:16px;margin-left:auto}
.pub-nav-login{font-size:15px;font-weight:600}
.pub-menu-btn{display:none;width:44px;height:44px;border-radius:10px;border:1px solid var(--cizgi);background:var(--kagit);color:var(--tx);align-items:center;justify-content:center;cursor:pointer}
.pub-mobil-menu{display:none}

/* sayfa başlığı */
.pub-hero{padding:clamp(40px,6vw,72px) 0 clamp(28px,4vw,40px)}
.pub-ust{display:inline-flex;align-items:center;gap:6px;font-size:14.5px;font-weight:600;color:var(--g);margin-bottom:18px;
  text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:5px}
.pub-ust:hover{text-decoration-thickness:2px}
.pub-h1{font-family:var(--baslik);font-weight:700;letter-spacing:-.012em;line-height:1.08;font-size:clamp(34px,5vw,52px);margin:0 0 16px;max-width:22ch;text-wrap:balance}
.pub-lead{font-size:clamp(17px,1.6vw,19px);color:var(--tx2);line-height:1.6;margin:0;max-width:60ch}

/* uzun metin (rehber, yasal) */
.pub-section{padding:clamp(32px,5vw,56px) 0}
.pub-prose{max-width:72ch;border-top:2px solid var(--tx);padding-top:8px}
.pub-prose h2{font-family:var(--baslik);font-size:clamp(21px,2.4vw,26px);font-weight:700;letter-spacing:-.01em;color:var(--tx);margin:40px 0 12px;line-height:1.25}
.pub-prose h2:first-child{margin-top:24px}
.pub-prose h3{font-family:var(--baslik);font-size:19px;font-weight:700;margin:28px 0 8px}
.pub-prose p{color:var(--tx2);line-height:1.75;margin:0 0 16px}
.pub-prose ul,.pub-prose ol{margin:0 0 16px;padding-left:22px}
.pub-prose ul{list-style:disc}.pub-prose ol{list-style:decimal}
.pub-prose li{color:var(--tx2);line-height:1.7;margin-bottom:6px}
.pub-prose strong{color:var(--tx);font-weight:600}
.pub-prose a{color:var(--g);font-weight:600;text-decoration:underline;text-underline-offset:4px}
.pub-prose table{width:100%;border-collapse:collapse;margin:0 0 20px;font-size:15.5px}
.pub-prose th,.pub-prose td{text-align:left;padding:10px 12px 10px 0;border-bottom:1px solid var(--cizgi);vertical-align:top}
.pub-prose th{font-weight:600;color:var(--tx)}
.pub-prose-meta{font-size:14px;color:var(--tx3);margin:16px 0 0}

/* altbilgi */
.pub-footer{background:var(--gece);color:#fff;padding:44px 0 26px;margin-top:clamp(40px,6vw,72px)}
.pub-footer-inner{display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap;padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,.12)}
.pub-footer-brand{display:flex;align-items:center;gap:12px}
.pub-footer-tag{font-size:13px;color:rgba(255,255,255,.6);margin-top:4px}
.pub-footer-links{display:flex;flex-wrap:wrap;gap:8px 22px}
.pub-footer-links a{font-size:14px;color:rgba(255,255,255,.72)}
.pub-footer-links a:hover{color:#fff;text-decoration:underline;text-underline-offset:4px}
.pub-footer-copy{font-size:13px;color:rgba(255,255,255,.62);padding-top:20px}

@media (max-width:960px){
  .pub-nav-links{display:none}
  .pub-menu-btn{display:inline-flex}
  .pub-mobil-menu{display:flex;flex-direction:column;padding:4px clamp(16px,4vw,40px) 12px;border-top:1px solid var(--cizgi);background:var(--kagit)}
  .pub-mobil-menu a{display:flex;align-items:center;min-height:48px;font-weight:600;border-bottom:1px solid var(--cizgi)}
  .pub-mobil-menu a:last-child{border-bottom:0}
  .pub-mobil-menu .pub-mobil-giris{color:var(--g)}
}
@media (max-width:520px){
  .pub-nav-login{display:none}
  .pub-nav-cta .pub-btn-primary{padding:0 14px}
  .pub-brand svg:last-child{display:none !important}
}
`
