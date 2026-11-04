'use client'
import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, CreditCard, ExternalLink, FileText, Loader2, Lock, RefreshCw, Repeat } from 'lucide-react'
import type { Okul } from '@/lib/types'
import type { AbonelikBilgisi } from '@/lib/lemonsqueezy'
import { supabase } from '@/lib/supabase'
import { hataMesaji } from '@/lib/hata'
import { odemeyeYonlendir } from '@/lib/abonelikOdeme'
import { PlanSecici, SiparisOzeti } from '@/components/abonelik/PlanSecici'
import { DENEME_GUN, DONEM_ADI, planUcreti, tl, variantDonemi, type AbonelikDonemi } from '@/lib/abonelikPlanlari'

// Okul Ayarları › Abonelik: plan durumu, kart, faturalar, iptal (Lemon Squeezy müşteri portalı) ve yeni abonelik.

const LS_DURUM: Record<string, { ad: string; ton: 'ok' | 'warn' | 'bad' }> = {
  active: { ad: 'Aktif', ton: 'ok' },
  on_trial: { ad: 'Deneme', ton: 'ok' },
  past_due: { ad: 'Ödeme alınamadı', ton: 'warn' },
  unpaid: { ad: 'Ödenmedi', ton: 'bad' },
  paused: { ad: 'Duraklatıldı', ton: 'warn' },
  cancelled: { ad: 'İptal edildi', ton: 'warn' },
  expired: { ad: 'Sona erdi', ton: 'bad' },
}
const FATURA_DURUM: Record<string, string> = { paid: 'Ödendi', pending: 'Bekliyor', void: 'Geçersiz', refunded: 'İade edildi', partial_refund: 'Kısmi iade' }
const CANLI = ['active', 'on_trial', 'past_due', 'paused', 'cancelled']

async function abonelikCek(): Promise<AbonelikBilgisi> {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/lemonsqueezy/abonelik', { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` } })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || 'Abonelik bilgisi alınamadı')
  return json
}

const tarih = (iso?: string | null, uzun = true) =>
  iso ? new Date(iso).toLocaleDateString('tr-TR', uzun ? { day: 'numeric', month: 'long', year: 'numeric' } : undefined) : '—'

export default function LisansSekmesi({ okulData }: { okulData: Okul | null }) {
  const [bilgi, setBilgi] = useState<AbonelikBilgisi | null>(null)
  const [bilgiHata, setBilgiHata] = useState<string | null>(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [donem, setDonem] = useState<AbonelikDonemi>('year')
  const [odemeYukleniyor, setOdemeYukleniyor] = useState(false)
  const [odemeHata, setOdemeHata] = useState<string | null>(null)
  // Lemon Squeezy ödeme sonrası ?odeme=tamam ile döner. Sekme yalnızca istemcide açıldığı için window güvenle okunur.
  const [odemeTamam] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('odeme') === 'tamam')
  const [simdi] = useState(() => Date.now())

  const getir = useCallback(() => {
    abonelikCek()
      .then(json => { setBilgi(json); setBilgiHata(null) })
      .catch(e => setBilgiHata(hataMesaji(e)))
      .finally(() => setYukleniyor(false))
  }, [])

  useEffect(() => {
    let iptal = false
    const yukle = () => abonelikCek()
      .then(json => { if (!iptal) { setBilgi(json); setBilgiHata(null) } })
      .catch(e => { if (!iptal) setBilgiHata(hataMesaji(e)) })
      .finally(() => { if (!iptal) setYukleniyor(false) })
    yukle()
    // Ödeme dönüşünde webhook birkaç saniye sonra işlenir; bir kez daha bakılır
    const zamanlayici = odemeTamam ? setTimeout(yukle, 6000) : undefined
    return () => { iptal = true; clearTimeout(zamanlayici) }
  }, [odemeTamam])

  const ode = async () => {
    if (!okulData || odemeYukleniyor) return
    setOdemeYukleniyor(true)
    setOdemeHata(null)
    try {
      await odemeyeYonlendir(okulData.id, donem)
    } catch (e) {
      setOdemeHata(hataMesaji(e, 'Ödeme bağlantısı oluşturulamadı.'))
      setOdemeYukleniyor(false)
    }
  }

  const abonelikVar = !!bilgi?.durum && CANLI.includes(bilgi.durum)
  const abonelikDonemi = bilgi?.variantId ? variantDonemi(bilgi.variantId) : null
  const lisansBitis = okulData?.lisans_bitis ?? null
  const kalanGun = lisansBitis ? Math.max(0, Math.ceil((new Date(lisansBitis).getTime() - simdi) / 86400000)) : 0
  const deneme = okulData?.odeme_durumu === 'deneme'
  const lisansGecerli = kalanGun > 0 && (deneme || okulData?.odeme_durumu === 'aktif')
  const donemGun = deneme ? DENEME_GUN : abonelikDonemi === 'month' ? 30 : 365
  const ilerleme = Math.min(100, Math.max(2, (kalanGun / donemGun) * 100))

  const durum = abonelikVar
    ? LS_DURUM[bilgi!.durum!]
    : lisansGecerli ? { ad: deneme ? 'Deneme süresi' : 'Aktif', ton: 'ok' as const } : { ad: 'Süresi doldu', ton: 'bad' as const }
  const baslik = abonelikVar && abonelikDonemi ? `${DONEM_ADI[abonelikDonemi]} plan` : deneme ? 'Ücretsiz deneme' : lisansGecerli ? 'Lisans' : 'Abonelik yok'

  return (
    <div className="ls">
      <style>{CSS}</style>

      {odemeTamam && (
        <div className="alert alert-success" role="status" style={{ fontSize: 14 }}>
          <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <span><strong>Ödemeniz alındı.</strong> Lisansınız birkaç saniye içinde etkinleşir; faturanız e-posta adresinize gönderildi.</span>
        </div>
      )}

      {/* Durum kartı */}
      <section className="ls-hero">
        <div className="ls-row" style={{ marginBottom: 20 }}>
          <div>
            <div className="ls-hero-sub">Klüp360 · {okulData?.ad || '…'}</div>
            <div className="ls-hero-t">{baslik}</div>
          </div>
          <span className={`ls-pill ls-pill-${durum.ton}`}>● {durum.ad}</span>
        </div>
        <div className="ls-kv">
          <div>
            <small>{abonelikVar && abonelikDonemi ? `${DONEM_ADI[abonelikDonemi]} ücret` : 'Plan'}</small>
            <strong>{abonelikVar && abonelikDonemi ? `₺${tl(planUcreti(abonelikDonemi))}` : deneme ? `${DENEME_GUN} gün ücretsiz` : '—'}</strong>
          </div>
          <div>
            <small>{bilgi?.iptalEdildi ? 'Erişim bitişi' : abonelikVar ? 'Sonraki yenileme' : 'Bitiş tarihi'}</small>
            <strong>{tarih(bilgi?.iptalEdildi ? bilgi.bitis : abonelikVar ? (bilgi?.yenilenme ?? lisansBitis) : lisansBitis)}</strong>
          </div>
          <div>
            <small>Kart</small>
            <strong>{bilgi?.kartSon4 ? `${(bilgi.kartMarka || 'Kart').replace(/^\w/, c => c.toUpperCase())} •••• ${bilgi.kartSon4}` : '—'}</strong>
          </div>
        </div>
        {lisansBitis && (
          <>
            <div className="ls-prog" aria-hidden><i style={{ width: `${ilerleme}%` }} /></div>
            <div className="ls-row ls-hero-sub">
              <span>{kalanGun > 0 ? `${kalanGun} gün kaldı` : 'Süre doldu'}</span>
              <span>{abonelikVar ? (bilgi?.iptalEdildi ? 'Otomatik yenileme kapalı' : 'Otomatik yenileme açık') : deneme ? 'Deneme bitince abonelik gerekir' : ''}</span>
            </div>
          </>
        )}
      </section>

      {bilgiHata && <div className="alert alert-warn">{bilgiHata}</div>}
      {yukleniyor && <div className="ls-muted" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Loader2 size={16} className="animate-spin" /> Abonelik bilgisi yükleniyor…</div>}

      {/* Uyarılar */}
      {bilgi?.durum === 'past_due' && (
        <div className="alert alert-danger">
          <span>Son ödeme kartınızdan çekilemedi. Erişiminiz kesilmeden önce kart bilgilerinizi güncelleyin.</span>
        </div>
      )}
      {bilgi?.iptalEdildi && (
        <div className="alert alert-warn">
          <span>Aboneliğiniz iptal edildi. <strong>{tarih(bilgi.bitis)}</strong> tarihine kadar kullanmaya devam edebilirsiniz. Fikrinizi değiştirirseniz müşteri portalından yeniden başlatabilirsiniz.</span>
        </div>
      )}

      {/* Hızlı işlemler (aktif Lemon Squeezy aboneliği varsa) */}
      {abonelikVar && (
        <div className="ls-actions">
          <Aksiyon href={bilgi?.portalUrl} ikon={<Repeat size={17} />} t={bilgi?.iptalEdildi ? 'Yeniden başlat' : 'Planı değiştir'} s={bilgi?.iptalEdildi ? 'Aboneliği sürdürün' : 'Aylık ↔ yıllık geçiş'} />
          <Aksiyon href={bilgi?.kartGuncelleUrl ?? bilgi?.portalUrl} ikon={<CreditCard size={17} />} t="Ödeme yöntemi" s="Kartı güncelleyin" />
          <Aksiyon href={bilgi?.portalUrl} ikon={<FileText size={17} />} t="Faturalar" s="Tümünü görüntüleyin" />
        </div>
      )}

      {/* Yeni abonelik (deneme, süresi dolmuş ya da online aboneliği olmayan kurum) */}
      {!yukleniyor && !abonelikVar && (
        <section className="card ls-card">
          <h3 className="ls-h">{lisansGecerli && !deneme ? 'Online aboneliğe geçin' : deneme ? 'Deneme bitmeden abone olun' : 'Aboneliğinizi başlatın'}</h3>
          <p className="ls-muted" style={{ margin: '0 0 16px' }}>
            {lisansGecerli ? 'Ödediğiniz süre mevcut bitiş tarihinizin üzerine eklenir; hiçbir gün kaybetmezsiniz.' : 'Ödeme tamamlandığı anda erişiminiz açılır. Kayıtlarınız korunuyor.'}
          </p>
          <PlanSecici donem={donem} setDonem={setDonem} />
          <div style={{ margin: '16px 0' }}><SiparisOzeti donem={donem} /></div>
          {odemeHata && <div className="alert alert-danger" role="alert">{odemeHata}</div>}
          <button type="button" className="ls-cta" onClick={ode} disabled={odemeYukleniyor || !okulData} aria-busy={odemeYukleniyor}>
            {odemeYukleniyor
              ? <><Loader2 size={18} className="animate-spin" /> Güvenli ödeme sayfası açılıyor…</>
              : <>Ödemeye geç · ₺{tl(planUcreti(donem))} <ArrowRight size={18} /></>}
          </button>
          <p className="ls-muted" style={{ fontSize: 12.5, margin: '12px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Lock size={13} /> Ödemeler Lemon Squeezy güvencesiyle 256-bit SSL ile alınır. İstediğiniz an iptal edebilirsiniz.
          </p>
        </section>
      )}

      {/* Ödeme geçmişi */}
      {!!bilgi?.faturalar.length && (
        <section className="card ls-card">
          <div className="ls-row" style={{ marginBottom: 10 }}>
            <h3 className="ls-h" style={{ margin: 0 }}>Ödeme geçmişi</h3>
            {bilgi.portalUrl && <a className="ls-link" href={bilgi.portalUrl} target="_blank" rel="noopener noreferrer">Tüm faturalar <ExternalLink size={13} /></a>}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="ls-inv">
              <thead><tr><th>Tarih</th><th>Tutar</th><th>Durum</th><th /></tr></thead>
              <tbody>
                {bilgi.faturalar.map(f => (
                  <tr key={f.id}>
                    <td>{tarih(f.tarih, false)}</td>
                    <td>{f.tutar}</td>
                    <td><span className={`ls-pill ls-pill-${f.durum === 'paid' ? 'ok' : f.durum === 'pending' ? 'warn' : 'bad'}`}>{FATURA_DURUM[f.durum] ?? f.durum}</span></td>
                    <td style={{ textAlign: 'right' }}>{f.url && <a className="ls-link" href={f.url} target="_blank" rel="noopener noreferrer">Fatura</a>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* İptal */}
      {abonelikVar && !bilgi?.iptalEdildi && bilgi?.portalUrl && (
        <section className="card ls-card ls-row">
          <div style={{ flex: '1 1 280px' }}>
            <h3 className="ls-h" style={{ margin: '0 0 4px' }}>Aboneliği iptal et</h3>
            <div className="ls-muted">İptal ederseniz dönem sonuna ({tarih(bilgi.yenilenme)}) kadar kullanmaya devam edersiniz. Verileriniz silinmez.</div>
          </div>
          <a className="btn btn-outline-danger" href={bilgi.portalUrl} target="_blank" rel="noopener noreferrer">İptal et <ExternalLink size={13} /></a>
        </section>
      )}

      {abonelikVar && (
        <button type="button" className="ls-link" onClick={() => { setYukleniyor(true); getir() }} style={{ justifySelf: 'start' }}>
          <RefreshCw size={13} /> Bilgileri yenile
        </button>
      )}
    </div>
  )
}

function Aksiyon({ href, ikon, t, s }: { href?: string | null; ikon: React.ReactNode; t: string; s: string }) {
  if (!href) return null
  return (
    <a className="ls-act" href={href} target="_blank" rel="noopener noreferrer">
      <span className="ls-act-i">{ikon}</span>
      <span><strong>{t}</strong><small>{s} →</small></span>
    </a>
  )
}

const CSS = `
.ls{display:grid;gap:16px;max-width:760px}
.ls .alert{margin:0}
.ls-row{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.ls-muted{font-size:13.5px;color:var(--text3);line-height:1.5}
.ls-hero{background:linear-gradient(150deg,var(--accent-dark),#14287f);color:#fff;border-radius:16px;padding:24px 26px}
.ls-hero-sub{font-size:13px;color:rgba(255,255,255,.68)}
.ls-hero-t{font-family:var(--font-display);font-size:26px;font-weight:800;letter-spacing:-.02em;margin-top:4px}
.ls-kv{font-variant-numeric:tabular-nums;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.ls-kv small{display:block;font-size:12px;color:rgba(255,255,255,.62);margin-bottom:4px}
.ls-kv strong{font-size:15px;font-weight:700}
.ls-prog{height:8px;border-radius:4px;background:rgba(255,255,255,.16);overflow:hidden;margin:20px 0 8px}
.ls-prog i{display:block;height:100%;background:#7ddba0;border-radius:4px}
.ls-pill{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;border-radius:999px;padding:4px 10px;white-space:nowrap}
.ls-hero .ls-pill-ok{background:rgba(125,219,160,.18);color:#7ddba0}
.ls-hero .ls-pill-warn{background:rgba(255,200,90,.2);color:#ffd27a}
.ls-hero .ls-pill-bad{background:rgba(255,130,130,.2);color:#ffb3b3}
.ls-inv .ls-pill-ok{background:var(--success-light);color:var(--success)}
.ls-inv .ls-pill-warn{background:var(--warn-light);color:#8a5600}
.ls-inv .ls-pill-bad{background:var(--danger-light);color:var(--danger)}
.ls-actions{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
.ls-act{display:flex;gap:12px;align-items:center;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:15px 16px;
  text-decoration:none;color:var(--text);transition:border-color .15s,box-shadow .15s}
.ls-act:hover{border-color:var(--accent-light);box-shadow:0 6px 18px -12px rgba(35,71,217,.5)}
.ls-act:focus-visible{outline:none;box-shadow:var(--ring)}
.ls-act-i{width:36px;height:36px;border-radius:10px;background:var(--accent-lighter);color:var(--accent);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ls-act strong{display:block;font-size:14.5px}
.ls-act small{display:block;font-size:12.5px;color:var(--text3);margin-top:2px}
.ls-card{margin:0;border-radius:16px;padding:22px 24px}
.ls-h{font-size:15.5px;font-weight:700;margin:0 0 6px}
.ls-cta{width:100%;min-height:50px;border-radius:12px;border:0;background:var(--accent);color:#fff;font:inherit;font-size:15px;font-weight:700;
  display:flex;align-items:center;justify-content:center;gap:10px;cursor:pointer;box-shadow:0 8px 20px -8px rgba(35,71,217,.6)}
.ls-cta:hover:not(:disabled){background:var(--accent-dark)}
.ls-cta:focus-visible{outline:none;box-shadow:var(--ring)}
.ls-cta:disabled{opacity:.72;cursor:wait}
.ls-link{display:inline-flex;align-items:center;gap:5px;background:none;border:0;padding:0;font:inherit;font-size:13.5px;font-weight:600;color:var(--accent);text-decoration:none;cursor:pointer}
.ls-inv{font-variant-numeric:tabular-nums;width:100%;border-collapse:collapse;font-size:13.5px}
.ls-inv th{text-align:left;font-size:12px;color:var(--text3);font-weight:600;padding:0 12px 8px 0;border-bottom:1px solid var(--border)}
.ls-inv td{padding:11px 12px 11px 0;border-bottom:1px solid var(--border-light)}
.ls-inv tr:last-child td{border-bottom:0}
@media (max-width:640px){.ls-kv{grid-template-columns:1fr 1fr}.ls-hero{padding:20px}}
`
