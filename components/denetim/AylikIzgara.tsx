'use client'
// Denetçi › okul verileri › ders programı / sınıf defteri: bir sınıfın aylık ızgarası.
// Tek seferde tek sınıf gösterilir (sınıf seçici); boş ders satırları gizlenir, tatil ve hafta sonu sütunları
// daraltılır, başlık satırı ve ders sütunu kayarken yerinde kalır — tablo ekrana sığsın, sayfa kaymasın.
import { useMemo, useState } from 'react'
import type { Personel, Sinif, Tatil } from '@/lib/types'
import { AYLAR, gunSayisi, tatilMi } from '@/lib/hesaplama'

interface Kayit {
  kulup_adi: string
  gun: number
  ders_no?: number
  ogretmen?: Pick<Personel, 'ad'> | null
  durum?: 'geldi' | 'gelmedi'
}

const GUN_AD = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']

const ilkBuyuk = (s: string) => s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1).toLocaleLowerCase('tr-TR')

/** "HATİCENUR ÇOLAK" → "H. Çolak" (hücreye tek satırda sığsın; tam ad üzerine gelince görünür) */
export function kisaAd(ad: string): string {
  const p = ad.trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return ''
  if (p.length === 1) return ilkBuyuk(p[0])
  return `${p[0].charAt(0).toLocaleUpperCase('tr-TR')}. ${ilkBuyuk(p[p.length - 1])}`
}

interface Grup { ad: string; koord?: boolean; satirlar: { no: number; etiket: string }[] }

const GRUPLAR: Record<'program' | 'defter', Grup[]> = {
  program: [{ ad: 'Dersler', satirlar: [1, 2, 3, 4, 5, 6].map(no => ({ no, etiket: `${no}. ders` })) }],
  defter: [
    { ad: 'Öğretmen dersleri', satirlar: [1, 2, 3, 4, 5, 6].map(no => ({ no, etiket: `${no}. ders` })) },
    { ad: 'Koordinatör', koord: true, satirlar: [11, 12, 13, 14, 15, 16].map(no => ({ no, etiket: `Koord. ${no - 10}` })) },
  ],
}

export default function AylikIzgara({ tur, siniflar, kayitlar, yil, ay, tatiller }: {
  tur: 'program' | 'defter'
  siniflar: Sinif[]
  kayitlar: Kayit[]
  yil: number
  ay: number
  tatiller: Tatil[]
}) {
  const [seciliId, setSeciliId] = useState<number | null>(null)
  const sinif = siniflar.find(s => s.id === seciliId) ?? siniflar[0]

  const gunler = useMemo(() => Array.from({ length: gunSayisi(yil, ay) }, (_, i) => {
    const g = i + 1
    const hg = new Date(yil, ay - 1, g, 12).getDay()
    const tatil = tatilMi(ay, g, yil, tatiller)
    return { g, ad: GUN_AD[hg], kapali: tatil || hg === 0 || hg === 6, neden: tatil ? 'Tatil' : 'Hafta sonu' }
  }), [yil, ay, tatiller])

  // Sınıf → "ders|gün" → kayıt; program kayıtlarında ders no yoksa 1. ders sayılır
  const dizin = useMemo(() => {
    const m = new Map<string, Map<string, Kayit>>()
    for (const k of kayitlar) {
      const no = tur === 'program' ? (k.ders_no || 1) : k.ders_no
      if (!m.has(k.kulup_adi)) m.set(k.kulup_adi, new Map())
      m.get(k.kulup_adi)!.set(`${no}|${k.gun}`, k)
    }
    return m
  }, [kayitlar, tur])

  const sinifOzeti = (s: Sinif) => {
    const d = [...(dizin.get(s.ad)?.values() ?? [])]
    return { toplam: d.length, gelmedi: d.filter(k => k.durum === 'gelmedi').length }
  }

  if (!sinif) return null
  const sinifKayit = dizin.get(sinif.ad) ?? new Map<string, Kayit>()
  // Ay boyunca hiç kaydı olmayan ders satırları gösterilmez
  const gruplar = GRUPLAR[tur]
    .map(gr => ({ ...gr, satirlar: gr.satirlar.filter(r => gunler.some(({ g }) => sinifKayit.has(`${r.no}|${g}`))) }))
    .filter(gr => gr.satirlar.length > 0)
  const ozet = sinifOzeti(sinif)
  const isGunu = gunler.filter(x => !x.kapali).length

  return (
    <div className="dn-izgara">
      <div className="dn-izgara-arac">
        {siniflar.length > 1 && (
          <div className="yk-segment" role="group" aria-label="Sınıf">
            {siniflar.map(s => {
              const o = sinifOzeti(s)
              return (
                <button key={s.id} type="button" className={s.id === sinif.id ? 'on' : ''} aria-pressed={s.id === sinif.id} onClick={() => setSeciliId(s.id)}>
                  {s.ad}
                  {tur === 'defter' && o.gelmedi > 0
                    ? <em className="dn-sayac-hata" title={`${o.gelmedi} ders gelinmedi`}>{o.gelmedi}</em>
                    : <span>{s.yas_grubu || ''}</span>}
                </button>
              )
            })}
          </div>
        )}
        <div className="dn-izgara-ozet">
          <span><b>{sinif.ad}</b>{sinif.yas_grubu ? ` · ${sinif.yas_grubu}` : ''} · {AYLAR[ay]} {yil} · {isGunu} iş günü · <b>{ozet.toplam}</b> ders</span>
          {tur === 'defter' ? (
            <>
              <span className="dn-lejant"><i className="geldi" aria-hidden="true" /> Geldi</span>
              <span className="dn-lejant"><i className="gelmedi" aria-hidden="true" /> Gelmedi{ozet.gelmedi > 0 && <b style={{ color: 'var(--danger)' }}> ({ozet.gelmedi})</b>}</span>
            </>
          ) : <span className="dn-lejant"><i className="plan" aria-hidden="true" /> Planlı ders</span>}
          <span className="dn-lejant"><i className="kapali" aria-hidden="true" /> Tatil / hafta sonu</span>
        </div>
      </div>

      {gruplar.length === 0 ? (
        <div className="dn-izgara-bos">{sinif.ad} için {AYLAR[ay]} {yil} döneminde {tur === 'defter' ? 'sınıf defteri' : 'ders programı'} kaydı yok.</div>
      ) : (
        <div className="dn-izgara-kutu">
          <table className="dn-izgara-tablo">
            <thead>
              <tr>
                <th scope="col" className="sol">Ders</th>
                {gunler.map(x => (
                  <th key={x.g} scope="col" className={x.kapali ? 'kapali' : undefined} title={x.kapali ? `${x.g} ${AYLAR[ay]} · ${x.neden}` : undefined}>
                    {x.kapali ? x.ad.charAt(0) : x.ad}<b>{x.g}</b>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gruplar.map(gr => (
                <Bolum key={gr.ad} grup={gr} gosterBaslik={gruplar.length > 1 || GRUPLAR[tur].length > 1} sutun={gunler.length + 1}>
                  {gr.satirlar.map(r => (
                    <tr key={r.no}>
                      <th scope="row" className={`sol${gr.koord ? ' koord' : ''}`}>{r.etiket}</th>
                      {gunler.map(x => {
                        if (x.kapali) return <td key={x.g} className="kapali" />
                        const k = sinifKayit.get(`${r.no}|${x.g}`)
                        const ad = k?.ogretmen?.ad
                        if (!k || !ad) return <td key={x.g} />
                        const durum = tur === 'program' ? 'plan' : k.durum === 'gelmedi' ? 'gelmedi' : 'geldi'
                        return (
                          <td key={x.g} className={durum} title={`${ad} · ${x.g} ${AYLAR[ay]} ${r.etiket}${tur === 'defter' ? ` · ${durum === 'gelmedi' ? 'Gelmedi' : 'Geldi'}` : ''}`}>
                            {durum === 'gelmedi' && <span aria-hidden="true">✕ </span>}{kisaAd(ad)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </Bolum>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Bolum({ grup, gosterBaslik, sutun, children }: { grup: Grup; gosterBaslik: boolean; sutun: number; children: React.ReactNode }) {
  return (
    <>
      {gosterBaslik && (
        <tr className={`grup${grup.koord ? ' koord' : ''}`}>
          <th scope="colgroup" colSpan={sutun}><span>{grup.ad}</span></th>
        </tr>
      )}
      {children}
    </>
  )
}
