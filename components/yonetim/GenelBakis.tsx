'use client'
import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronRight, Clock, ShieldCheck, UserCheck } from 'lucide-react'
import type { Ortak } from './YonetimKonsolu'
import { Bolum, Bos, goreceZaman, lisansBilgisi, tl } from './ortak'
import type { OdemeSatir, Sekme, TalepSatir } from './ortak'

const AY_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

export default function GenelBakis({ kurumlar, iller, odemeler, talepler, yukleniyor, git }: Ortak & {
  odemeler: OdemeSatir[]; talepler: TalepSatir[]; git: (s: Sekme, kurumId?: number | null) => void
}) {
  const [simdi] = useState(() => Date.now())

  const durum = useMemo(() => {
    const say = { aktif: 0, deneme: 0, doldu: 0, pasif: 0, yakinda: 0, yeniAktif: 0 }
    const ayBasi = new Date(simdi); ayBasi.setDate(1); ayBasi.setHours(0, 0, 0, 0)
    for (const k of kurumlar) {
      const l = lisansBilgisi(k, simdi)
      say[l.tur]++
      if (l.tur === 'deneme' && l.kalanGun !== null && l.kalanGun <= 7) say.yakinda++
      if (l.tur === 'aktif' && new Date(k.kayit) >= ayBasi) say.yeniAktif++
    }
    return say
  }, [kurumlar, simdi])

  // Son 6 ay: her ayın toplamı
  const aylar = useMemo(() => {
    const d = new Date(simdi)
    return Array.from({ length: 6 }, (_, i) => {
      const a = new Date(d.getFullYear(), d.getMonth() - 5 + i, 1)
      const tutar = odemeler.filter(o => { const t = new Date(o.odeme_tarihi); return t.getFullYear() === a.getFullYear() && t.getMonth() === a.getMonth() })
        .reduce((s, o) => s + Number(o.tutar || 0), 0)
      const adet = odemeler.filter(o => { const t = new Date(o.odeme_tarihi); return t.getFullYear() === a.getFullYear() && t.getMonth() === a.getMonth() }).length
      return { ad: AY_KISA[a.getMonth()], tutar, adet }
    })
  }, [odemeler, simdi])
  const enBuyuk = Math.max(1, ...aylar.map(a => a.tutar))
  const buAy = aylar[5], gecenAy = aylar[4]

  const bekleyen = talepler.filter(t => t.status === 'beklemede')
  const enEskiTalep = bekleyen.length ? Math.round((simdi - Math.min(...bekleyen.map(t => new Date(t.created_at).getTime()))) / 86400000) : 0
  const ilAdi = (id: number | null) => iller.find(i => i.id === id)?.ad || '—'
  const sonKurumlar = [...kurumlar].sort((a, b) => new Date(b.kayit).getTime() - new Date(a.kayit).getTime()).slice(0, 6)

  const bekle = (v: number | string) => (yukleniyor ? '…' : v)

  return (
    <>
      <section aria-label="Özet" className="yk-kpi">
        <div><div className="ad">Aktif abonelik</div><div className="deger">{bekle(durum.aktif)}</div><div className="alt">{yukleniyor ? ' ' : `bu ay ${durum.yeniAktif} yeni kurum`}</div></div>
        <div><div className="ad">Denemede</div><div className="deger">{bekle(durum.deneme)}</div><div className="alt">{yukleniyor ? ' ' : `${durum.yakinda} tanesi 7 gün içinde bitiyor`}</div></div>
        <div><div className="ad">Süresi dolmuş</div><div className="deger" style={{ color: durum.doldu ? 'var(--danger)' : undefined }}>{bekle(durum.doldu)}</div><div className="alt">ödeme bekleniyor</div></div>
        <div><div className="ad">Bu ay tahsilat</div><div className="deger">{yukleniyor ? '…' : tl(buAy.tutar)}</div><div className="alt">{buAy.adet} ödeme · geçen ay {tl(gecenAy.tutar)}</div></div>
      </section>

      <div className="yk-iki">
        <div className="genis">
          <Bolum baslik="Aylık tahsilat" sag={<span style={{ fontSize: 12, color: 'var(--text3)' }}>son 6 ay</span>}>
            <div role="img" aria-label={`Son 6 ayın tahsilatı: ${aylar.map(a => `${a.ad} ${tl(a.tutar)}`).join(', ')}`} style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 190, paddingTop: 8 }}>
              {aylar.map((a, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: i === 5 ? 'var(--text)' : 'var(--text3)', fontWeight: i === 5 ? 600 : 400 }}>{a.tutar ? (a.tutar / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + 'B' : '0'}</span>
                  <div style={{ width: '100%', height: `${Math.max(3, (a.tutar / enBuyuk) * 140)}px`, background: i === 5 ? 'var(--accent)' : '#d7defa', borderRadius: '5px 5px 0 0' }} />
                  <span style={{ fontSize: 11.5, color: i === 5 ? 'var(--text)' : 'var(--text3)', fontWeight: i === 5 ? 600 : 400 }}>{a.ad}</span>
                </div>
              ))}
            </div>
          </Bolum>

          <Bolum baslik="Son kaydolan kurumlar" sag={<button type="button" className="btn btn-secondary btn-sm" onClick={() => git('kurumlar')}>Tümü</button>} dolgu={false}>
            {sonKurumlar.length === 0 ? <Bos>{yukleniyor ? 'Yükleniyor…' : 'Henüz kurum yok.'}</Bos> : (
              <div className="yk-tablo">
                <table className="data-table">
                  <thead><tr><th>Kurum</th><th>İl</th><th>Lisans</th><th className="td-num">Kayıt</th></tr></thead>
                  <tbody>
                    {sonKurumlar.map(k => {
                      const l = lisansBilgisi(k, simdi)
                      return (
                        <tr key={k.id} className="tikla" onClick={() => git('kurumlar', k.id)}>
                          <td><button type="button" onClick={() => git('kurumlar', k.id)} style={{ all: 'unset', cursor: 'pointer' }}><div style={{ fontWeight: 600 }}>{k.ad}</div><div style={{ fontSize: 12, color: 'var(--text3)' }}>{k.yonetici.email || '—'}</div></button></td>
                          <td>{ilAdi(k.ilId)}</td>
                          <td><span className={`badge ${l.rozet}`}>{l.etiket}</span></td>
                          <td className="td-num" style={{ color: 'var(--text3)' }}>{goreceZaman(k.kayit, simdi)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Bolum>
        </div>

        <div className="dar">
          <section className="yk-kart" style={{ overflow: 'hidden' }}>
            <div className="yk-kart-bas"><h2>Dikkat isteyenler</h2></div>
            {bekleyen.length > 0 && (
              <button type="button" className="yk-satir-link" onClick={() => git('talepler')}>
                <span className="yk-ikon" style={{ background: '#fff4e0', color: '#8a5200' }}><UserCheck size={16} aria-hidden="true" /></span>
                <span style={{ flex: 1, minWidth: 0 }}><strong style={{ display: 'block', fontSize: 13 }}>{bekleyen.length} denetçi başvurusu bekliyor</strong><span style={{ fontSize: 12, color: 'var(--text3)' }}>En eskisi {enEskiTalep} gün önce</span></span>
                <ChevronRight size={15} aria-hidden="true" color="var(--text3)" />
              </button>
            )}
            {durum.yakinda > 0 && (
              <button type="button" className="yk-satir-link" onClick={() => git('kurumlar')}>
                <span className="yk-ikon" style={{ background: 'var(--accent-lighter)', color: 'var(--accent-dark)' }}><Clock size={16} aria-hidden="true" /></span>
                <span style={{ flex: 1, minWidth: 0 }}><strong style={{ display: 'block', fontSize: 13 }}>{durum.yakinda} deneme 7 gün içinde bitiyor</strong><span style={{ fontSize: 12, color: 'var(--text3)' }}>Ödeme için hatırlatılabilir</span></span>
                <ChevronRight size={15} aria-hidden="true" color="var(--text3)" />
              </button>
            )}
            {durum.doldu > 0 && (
              <button type="button" className="yk-satir-link" onClick={() => git('kurumlar')}>
                <span className="yk-ikon" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}><AlertTriangle size={16} aria-hidden="true" /></span>
                <span style={{ flex: 1, minWidth: 0 }}><strong style={{ display: 'block', fontSize: 13 }}>{durum.doldu} kurumun lisansı doldu</strong><span style={{ fontSize: 12, color: 'var(--text3)' }}>Ödeme girişi ya da deneme uzatma</span></span>
                <ChevronRight size={15} aria-hidden="true" color="var(--text3)" />
              </button>
            )}
            {!yukleniyor && !bekleyen.length && !durum.yakinda && !durum.doldu && (
              <div className="yk-satir-link" style={{ cursor: 'default' }}>
                <span className="yk-ikon" style={{ background: 'var(--success-light)', color: '#0b6b42' }}><ShieldCheck size={16} aria-hidden="true" /></span>
                <span style={{ fontSize: 13 }}>Bekleyen bir iş yok.</span>
              </div>
            )}
          </section>

          <Bolum baslik="İllere göre kurumlar">
            {iller.filter(i => i.okullar?.length).length === 0 ? <Bos>İl ataması yapılmış kurum yok.</Bos> : (
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...iller].filter(i => i.okullar?.length).sort((a, b) => b.okullar.length - a.okullar.length).slice(0, 8).map(il => (
                  <li key={il.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                    <span style={{ width: 90, flexShrink: 0 }}>{il.ad}</span>
                    <span style={{ flex: 1, height: 8, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
                      <span style={{ display: 'block', height: '100%', width: `${(il.okullar.length / Math.max(1, kurumlar.length)) * 100}%`, minWidth: 6, background: 'var(--accent)', borderRadius: 4 }} />
                    </span>
                    <span style={{ width: 28, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text2)' }}>{il.okullar.length}</span>
                  </li>
                ))}
              </ol>
            )}
          </Bolum>
        </div>
      </div>
    </>
  )
}
