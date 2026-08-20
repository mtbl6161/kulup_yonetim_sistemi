import Link from 'next/link'
import PublicNav from './PublicNav'

/**
 * Ortak public sayfa kabuğu: ana sayfa (tanıtım) estetiğiyle uyumlu
 * nav + footer + tasarım sistemi. Server component — içindeki PublicNav
 * client sınırıdır (useAuth kullanır).
 */
export default function PublicShell({ children }: { children: React.ReactNode }) {
  const yil = new Date().getFullYear()
  return (
    <div className="pub">
      <style>{PUBLIC_CSS}</style>
      <PublicNav />
      <main className="pub-main">{children}</main>
      <footer className="pub-footer">
        <div className="pub-container pub-footer-inner">
          <div className="pub-footer-brand">
            <img src="/logo.png" alt="Klüp360" />
            <div>
              <div className="pub-footer-name">Klüp360</div>
              <div className="pub-footer-tag">MEB Çocuk Kulüpleri Yönetim Sistemi</div>
            </div>
          </div>
          <div className="pub-footer-links">
            <Link href="/ek-ders-hesaplama">Ek Ders Hesaplama</Link>
            <Link href="/fiyatlandirma">Fiyatlandırma</Link>
            <Link href="/tanitim/kullanim-kosullari">Kullanım Koşulları</Link>
            <Link href="/tanitim/gizlilik-politikasi">Gizlilik</Link>
            <Link href="/tanitim/iade-politikasi">İade</Link>
            <Link href="/tanitim/iletisim">İletişim</Link>
            <Link href="/login">Giriş</Link>
          </div>
        </div>
        <div className="pub-container pub-footer-copy">
          © {yil} Klüp360 — Tüm hakları saklıdır.
        </div>
      </footer>
    </div>
  )
}

export const PUBLIC_CSS = `
.pub {
  --g:#2d5a3d; --g-d:#1e4229; --g-dd:#163620;
  --gold:#c8832a; --gold-d:#a06820;
  --bg:#f5f2ec; --surf:#fffef9; --line:#e6dfd0; --line-2:#d8d0be;
  --tx:#1a1a14; --tx2:#5a5748; --tx3:#8a8070;
  font-family:'DM Sans',system-ui,sans-serif; color:var(--tx); background:var(--bg);
  min-height:100vh; display:flex; flex-direction:column; -webkit-font-smoothing:antialiased;
}
.pub *,.pub *::before,.pub *::after{box-sizing:border-box}
.pub :where(a){text-decoration:none;color:inherit}
.pub img{max-width:100%;display:block}
.pub-main{flex:1}
.pub-container{width:100%;max-width:1180px;margin:0 auto;padding:0 clamp(20px,5vw,48px)}
.pub-grad{background:linear-gradient(120deg,var(--g),var(--gold));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}

/* buttons */
.pub-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:inherit;
  font-weight:600;font-size:14px;border-radius:12px;padding:10px 18px;cursor:pointer;border:1px solid transparent;
  white-space:nowrap;transition:transform .2s,box-shadow .2s,background .2s,border-color .2s}
.pub-btn-lg{font-size:16px;padding:15px 30px;border-radius:14px}
.pub-btn-primary{background:var(--g);color:#fff;box-shadow:0 8px 22px rgba(45,90,61,.22)}
.pub-btn-primary:hover{background:var(--g-d);transform:translateY(-2px);box-shadow:0 14px 30px rgba(45,90,61,.28)}
.pub-btn-ghost{background:var(--surf);color:var(--tx);border-color:var(--line-2)}
.pub-btn-ghost:hover{border-color:var(--g);color:var(--g);transform:translateY(-2px)}
.pub-btn-white{background:#fff;color:var(--g-dd);box-shadow:0 10px 26px rgba(0,0,0,.14)}
.pub-btn-white:hover{transform:translateY(-2px);box-shadow:0 16px 34px rgba(0,0,0,.2)}

/* nav */
.pub-nav{position:sticky;top:0;z-index:100;background:rgba(245,242,236,.82);
  backdrop-filter:saturate(160%) blur(14px);border-bottom:1px solid var(--line)}
.pub-nav-inner{max-width:1180px;margin:0 auto;height:68px;padding:0 clamp(20px,5vw,48px);
  display:flex;align-items:center;justify-content:space-between;gap:20px}
.pub-brand{display:flex;align-items:center;gap:10px}
.pub-brand-mark{width:38px;height:38px}
.pub-brand-name{font-family:'Playfair Display',serif;font-weight:800;font-size:22px;color:var(--g-d);letter-spacing:-.01em}
.pub-brand-360{color:var(--gold)}
.pub-nav-links{display:flex;align-items:center;gap:28px}
.pub-nav-links a{font-size:14.5px;font-weight:500;color:var(--tx2);transition:color .15s}
.pub-nav-links a:hover{color:var(--g)}
.pub-nav-tool{display:inline-flex;align-items:center;gap:6px;font-weight:600!important;color:var(--g-d)!important}
.pub-nav-tool::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--gold)}
.pub-nav-tool:hover{color:var(--gold)!important}
.pub-nav-home{display:inline-flex;align-items:center;gap:6px;font-weight:600}
.pub-nav-home svg{color:var(--g)}
.pub-nav-links a.active{color:var(--g);font-weight:700;text-decoration:underline;text-underline-offset:8px;
  text-decoration-thickness:2px;text-decoration-color:var(--gold)}
.pub-nav-cta{display:flex;align-items:center;gap:14px}
.pub-nav-login{font-size:14.5px;font-weight:600;color:var(--tx)}
.pub-nav-login:hover{color:var(--g)}
.pub-userpill{display:flex;align-items:center;gap:10px;padding:6px 16px 6px 6px;border-radius:999px;
  background:var(--surf);border:1px solid var(--line-2);box-shadow:0 2px 8px rgba(0,0,0,.05);
  font-size:14px;font-weight:600;transition:transform .2s,border-color .2s}
.pub-userpill:hover{border-color:var(--g);transform:translateY(-1px)}
.pub-avatar{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--g),var(--g-d));
  color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700}

/* page hero (başlık bloğu) */
.pub-hero{position:relative;overflow:hidden;text-align:center;padding:clamp(52px,8vw,96px) 0 clamp(30px,4vw,48px);
  background:radial-gradient(120% 70% at 50% -10%,#ecf7f0 0%,var(--bg) 60%)}
.pub-badge{display:inline-flex;align-items:center;gap:9px;background:var(--surf);border:1px solid var(--line-2);
  border-radius:999px;padding:8px 18px;font-size:13px;font-weight:600;color:var(--g-d);box-shadow:0 4px 16px rgba(45,90,61,.06);margin-bottom:20px}
.pub-badge-dot{width:8px;height:8px;border-radius:50%;background:var(--gold);box-shadow:0 0 0 4px rgba(200,131,42,.18)}
.pub-h1{font-family:'Playfair Display',serif;font-weight:800;letter-spacing:-.02em;line-height:1.12;
  font-size:clamp(32px,5vw,52px);margin:0 0 16px}
.pub-lead{font-size:clamp(15px,1.6vw,18px);color:var(--tx2);line-height:1.6;margin:0 auto;max-width:620px}

/* prose (politika/metin sayfaları) */
.pub-section{padding:clamp(40px,6vw,72px) 0}
.pub-prose{max-width:820px;margin:0 auto;background:var(--surf);border:1px solid var(--line);
  border-radius:22px;padding:clamp(26px,4vw,44px);box-shadow:0 20px 50px -34px rgba(30,66,41,.3)}
.pub-prose h2{font-family:'Playfair Display',serif;font-size:clamp(19px,2.4vw,23px);font-weight:800;
  color:var(--tx);margin:32px 0 12px;line-height:1.25}
.pub-prose h2:first-child{margin-top:0}
.pub-prose p{color:var(--tx2);line-height:1.8;font-size:15.5px;margin:0 0 18px}
.pub-prose ul{margin:0 0 18px;padding-left:22px}
.pub-prose li{color:var(--tx2);line-height:1.75;font-size:15.5px;margin-bottom:8px}
.pub-prose strong{color:var(--tx)}
.pub-prose a{color:var(--g);font-weight:600}
.pub-prose-meta{font-size:13px;color:var(--tx3);margin-bottom:26px;text-align:center}

/* footer */
.pub-footer{background:var(--g-dd);color:#fff;padding:clamp(40px,6vw,64px) 0 28px;margin-top:40px}
.pub-footer-inner{display:flex;align-items:flex-start;justify-content:space-between;gap:32px;flex-wrap:wrap;padding-bottom:28px}
.pub-footer-brand{display:flex;align-items:center;gap:12px}
.pub-footer-brand img{width:40px;height:40px}
.pub-footer-name{font-family:'Playfair Display',serif;font-weight:800;font-size:20px}
.pub-footer-tag{font-size:13px;color:rgba(255,255,255,.6);margin-top:2px}
.pub-footer-links{display:flex;flex-wrap:wrap;gap:14px 24px;max-width:560px}
.pub-footer-links a{font-size:14px;color:rgba(255,255,255,.72);transition:color .15s}
.pub-footer-links a:hover{color:#fff}
.pub-footer-copy{border-top:1px solid rgba(255,255,255,.12);padding-top:22px;font-size:13px;color:rgba(255,255,255,.5)}

@media (max-width:860px){
  .pub-nav-links{display:none}
}
@media (max-width:620px){
  .pub-nav-login{display:none}
  .pub-footer-inner{flex-direction:column;gap:24px}
}
`
