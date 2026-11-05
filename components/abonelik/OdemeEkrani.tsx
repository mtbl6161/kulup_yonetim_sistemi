'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Info, Loader2, Lock, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { hataMesaji } from '@/lib/hata'
import Logo from '@/components/brand/Logo'
import { PlanSecici, SiparisOzeti } from '@/components/abonelik/PlanSecici'
import { odemeyeYonlendir } from '@/lib/abonelikOdeme'
import { PAKET_OZETI, planUcreti, tl, type AbonelikDonemi } from '@/lib/abonelikPlanlari'

// Abonelik ödeme ekranı (bölünmüş düzen): solda marka ve paket içeriği, sağda plan seçimi ve sipariş özeti.
// mod="baslat": deneme sürecindeki / hiç ödeme yapmamış kurum (/odeme-yap)
// mod="yenile": süresi dolmuş kurum (/abonelik-yenile)

const tarihYaz = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

export default function OdemeEkrani({ mod }: { mod: 'baslat' | 'yenile' }) {
  const { signOut, okul } = useAuth()
  const [donem, setDonem] = useState<AbonelikDonemi>('year')
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState<string | null>(null)
  const [simdi] = useState(() => Date.now())

  const yenile = mod === 'yenile'
  const denemeKalanGun = !yenile && okul?.odeme_durumu === 'deneme' && okul.lisans_bitis
    ? Math.ceil((new Date(okul.lisans_bitis).getTime() - simdi) / 86400000)
    : 0
  const tutar = planUcreti(donem)

  const ode = async () => {
    if (!okul || yukleniyor) return
    setYukleniyor(true)
    setHata(null)
    try {
      await odemeyeYonlendir(okul.id, donem)
      // Başarılıysa sayfa Lemon Squeezy'ye geçer; düğme yönlendirme sürerken kilitli kalır
    } catch (e) {
      setHata(hataMesaji(e, 'Ödeme bağlantısı oluşturulamadı. Lütfen tekrar deneyin.'))
      setYukleniyor(false)
    }
  }

  return (
    <div className="oe">
      <style>{CSS}</style>

      <aside className="oe-side">
        <Logo size={30} tone="onDark" />
        <div className="oe-kurum">
          <small>Kurum</small>
          <div>{okul?.ad || '…'}</div>
        </div>
        <h2>{yenile ? 'Verileriniz sizi bekliyor.' : 'Kulübünüzün tüm işleri tek yerde.'}</h2>
        <ul className="oe-feats">
          {PAKET_OZETI.map(f => (
            <li key={f}><span className="oe-chk"><Check size={11} strokeWidth={3.2} /></span>{f}</li>
          ))}
        </ul>
        <div className="oe-side-foot">
          <span><Lock size={13} /> 256-bit SSL</span>
          <span>Ödeme altyapısı: Lemon Squeezy</span>
        </div>
      </aside>

      <main className="oe-main">
        {yenile && (
          <div className="alert alert-warn oe-alert">
            <Info size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              <strong>Aboneliğinizin süresi {okul?.lisans_bitis ? `${tarihYaz(okul.lisans_bitis)} tarihinde ` : ''}doldu.</strong>{' '}
              Kayıtlarınız korunuyor; aboneliği yenilediğinizde erişiminiz hemen açılır.
            </span>
          </div>
        )}
        {denemeKalanGun > 0 && (
          <div className="alert alert-info oe-alert">
            <Info size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Ücretsiz denemenizin bitmesine <strong>{denemeKalanGun} gün</strong> var. Şimdi abone olursanız deneme bitince kesintisiz devam edersiniz.</span>
          </div>
        )}

        <h1 className="oe-h">{yenile ? 'Yenileme planınızı seçin' : 'Size uygun planı seçin'}</h1>

        <PlanSecici donem={donem} setDonem={setDonem} />
        <div style={{ margin: '20px 0' }}><SiparisOzeti donem={donem} /></div>

        {hata && <div className="alert alert-danger" role="alert">{hata}</div>}

        <button type="button" className="oe-cta" onClick={ode} disabled={yukleniyor || !okul} aria-busy={yukleniyor}>
          {yukleniyor
            ? <><Loader2 size={18} className="animate-spin" /> Güvenli ödeme sayfası açılıyor…</>
            : <>{yenile ? 'Aboneliği yenile' : 'Ödemeye geç'} · ₺{tl(tutar)} <ArrowRight size={18} /></>}
        </button>
        <p className="oe-fine">
          Kart bilgilerinizi bir sonraki adımda Lemon Squeezy&apos;nin güvenli sayfasında girersiniz.
          Aboneliğiniz her {donem === 'year' ? 'yıl' : 'ay'} otomatik yenilenir; istediğiniz an Ayarlar › Abonelik&apos;ten iptal edebilirsiniz.
        </p>

        <div className="oe-foot">
          {denemeKalanGun > 0 ? <Link href="/" className="oe-link">← Panele dön</Link> : <span />}
          <button type="button" onClick={signOut} className="oe-link oe-link-d"><LogOut size={14} /> Çıkış yap</button>
        </div>
      </main>
    </div>
  )
}

const CSS = `
.oe{min-height:100vh;display:grid;grid-template-columns:minmax(340px,5fr) 7fr;background:var(--bg);font-family:var(--font-sans);color:var(--text)}
.oe-side{background:linear-gradient(160deg,var(--accent-dark),#14287f);color:#fff;padding:48px 48px 32px;display:flex;flex-direction:column;gap:28px;position:relative;overflow:hidden}
.oe-side::after{content:"";position:absolute;right:-120px;bottom:-120px;width:340px;height:340px;border-radius:50%;border:56px solid rgba(255,255,255,.05);pointer-events:none}
.oe-kurum{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:16px 18px}
.oe-kurum small{font-size:13px;color:rgba(255,255,255,.66);font-weight:500}
.oe-kurum div{font-weight:700;font-size:16px;margin-top:4px}
.oe-side h2{font-family:var(--font-display);font-size:30px;line-height:1.15;letter-spacing:-.02em;margin:0;font-weight:800;max-width:380px}
.oe-feats{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.oe-feats li{display:flex;gap:10px;align-items:flex-start;font-size:14.5px;line-height:1.4;color:rgba(255,255,255,.88)}
.oe-chk{width:19px;height:19px;border-radius:50%;background:rgba(125,219,160,.18);color:#7ddba0;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
.oe-side-foot{margin-top:auto;font-size:12.5px;color:rgba(255,255,255,.6);display:flex;gap:8px 18px;flex-wrap:wrap}
.oe-side-foot span{display:inline-flex;align-items:center;gap:6px}
.oe-main{padding:48px clamp(20px,5vw,72px);display:flex;flex-direction:column;justify-content:center;width:100%;max-width:640px}
.oe-alert{margin-bottom:22px;font-size:14px}
.oe-h{font-family:var(--font-display);font-size:26px;font-weight:700;margin:0 0 20px;letter-spacing:-.015em}
.oe-cta{width:100%;min-height:54px;border-radius:12px;border:0;background:var(--accent);color:#fff;font:inherit;font-size:15.5px;font-weight:700;
  display:flex;align-items:center;justify-content:center;gap:10px;cursor:pointer;box-shadow:0 8px 20px -8px rgba(35,71,217,.6);transition:background .15s}
.oe-cta:hover:not(:disabled){background:var(--accent-dark)}
.oe-cta:focus-visible{outline:none;box-shadow:var(--ring)}
.oe-cta:disabled{opacity:.72;cursor:wait}
.oe-fine{font-size:13px;line-height:1.55;color:var(--text3);margin:14px 0 0}
.oe-foot{display:flex;justify-content:space-between;align-items:center;margin-top:28px;padding-top:18px;border-top:1px solid var(--border)}
.oe-link{display:inline-flex;align-items:center;gap:6px;background:none;border:0;padding:0;font:inherit;font-size:13.5px;font-weight:600;color:var(--accent);text-decoration:none;cursor:pointer}
.oe-link-d{color:var(--danger)}
@media (max-width:880px){
  .oe{grid-template-columns:1fr}
  .oe-side{padding:24px 20px;gap:18px}
  .oe-side h2{font-size:22px}
  .oe-feats,.oe-side-foot{display:none}
  .oe-main{padding:28px 16px 40px;max-width:none}
}
`
