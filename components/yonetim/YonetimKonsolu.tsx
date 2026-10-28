'use client'
// Yönetim konsolu: ortak veriyi (kurumlar, iller, ödemeler, denetçi talepleri) bir kez yükler, bölümlere dağıtır.
import { useCallback, useMemo, useState } from 'react'
import { useYukleme } from '@/lib/useYukleme'
import Kabuk from './Kabuk'
import GenelBakis from './GenelBakis'
import Kurumlar from './Kurumlar'
import Tahsilat from './Tahsilat'
import Denetciler from './Denetciler'
import DenetimIzleri from './DenetimIzleri'
import Duyurular from './Duyurular'
import TatilTakvimi from './TatilTakvimi'
import SistemAyarlari from './SistemAyarlari'
import { useAdminApi, kurumlariOlustur, lisansBilgisi } from './ortak'
import type { Sekme, KullaniciSatir, IlSatir, OdemeSatir, TalepSatir } from './ortak'

const SEKMELER: Sekme[] = ['ozet', 'kurumlar', 'tahsilat', 'talepler', 'izler', 'duyurular', 'tatiller', 'ayarlar']
// Eski bağlantılar (ör. yan menüdeki Profiller → ?sekme=kullanicilar)
const ESKI: Record<string, Sekme> = { kullanicilar: 'kurumlar', odemeler: 'tahsilat', loglar: 'izler', iller: 'ayarlar' }

const BASLIK: Record<Sekme, [string, string]> = {
  ozet: ['Genel bakış', 'Tüm kurumların durumu'],
  kurumlar: ['Kurumlar', 'Lisanslar, hesaplar ve kurum bilgileri'],
  tahsilat: ['Tahsilat', 'Kurumların abonelik ödemeleri'],
  talepler: ['Denetçiler', 'İl denetim yetkililerinin başvuruları ve hesapları'],
  izler: ['Denetim izleri', 'Kurumlarda yapılan işlemlerin kaydı'],
  duyurular: ['Duyurular', 'Kurum panellerinde görünen duyurular'],
  tatiller: ['Tatil takvimi', 'Tüm kurumlara uygulanan resmî tatiller'],
  ayarlar: ['Sistem ayarları', 'Bakım modu ve il listesi'],
}

export interface Bildirim { tur: 'basari' | 'hata'; metin: string }

export default function YonetimKonsolu() {
  const api = useAdminApi()
  const [sekme, setSekmeHam] = useState<Sekme>('ozet')
  const [secilenKurum, setSecilenKurum] = useState<number | null>(null)
  const [bildirim, setBildirimHam] = useState<Bildirim | null>(null)

  const [liste, setListe] = useState<KullaniciSatir[]>([])
  const [iller, setIller] = useState<IlSatir[]>([])
  const [odemeler, setOdemeler] = useState<OdemeSatir[]>([])
  const [talepler, setTalepler] = useState<TalepSatir[]>([])
  const [yukleniyor, setYukleniyor] = useState(true)

  const bildir = useCallback((b: Bildirim) => {
    setBildirimHam(b)
    window.setTimeout(() => setBildirimHam(m => (m === b ? null : m)), b.tur === 'hata' ? 8000 : 4000)
  }, [])

  // Sekme adres çubuğunda tutulur: yenileyince ve geri tuşunda aynı ekran
  const setSekme = useCallback((s: Sekme, kurumId: number | null = null) => {
    setSekmeHam(s)
    setSecilenKurum(kurumId)
    const url = new URL(window.location.href)
    url.searchParams.set('sekme', s)
    if (kurumId) url.searchParams.set('kurum', String(kurumId)); else url.searchParams.delete('kurum')
    window.history.replaceState(null, '', url)
  }, [])

  useYukleme(() => {
    const p = new URLSearchParams(window.location.search)
    const istenen = p.get('sekme') || ''
    const s = (SEKMELER as string[]).includes(istenen) ? (istenen as Sekme) : ESKI[istenen]
    if (s) setSekmeHam(s)
    const k = Number(p.get('kurum'))
    if (k) setSecilenKurum(k)
  }, [])

  const kurumlariYukle = useCallback(async () => {
    const r = await api<{ kullanicilar: KullaniciSatir[] }>('/api/admin/kullanici')
    if (r.ok && r.veri) setListe(r.veri.kullanicilar || [])
    else if (r.hata) bildir({ tur: 'hata', metin: 'Kurumlar yüklenemedi: ' + r.hata })
  }, [api, bildir])
  const illeriYukle = useCallback(async () => {
    const r = await api<{ iller: IlSatir[] }>('/api/admin/iller')
    if (r.ok && r.veri) setIller(r.veri.iller || [])
  }, [api])
  const odemeleriYukle = useCallback(async () => {
    const r = await api<{ odemeler: OdemeSatir[] }>('/api/admin/odemeler')
    if (r.ok && r.veri) setOdemeler(r.veri.odemeler || [])
  }, [api])
  const talepleriYukle = useCallback(async () => {
    const r = await api<{ talepler: TalepSatir[] }>('/api/admin/denetim-talep')
    if (r.ok && r.veri) setTalepler(r.veri.talepler || [])
  }, [api])

  const tumunuYukle = useCallback(async () => {
    setYukleniyor(true)
    await Promise.all([kurumlariYukle(), illeriYukle(), odemeleriYukle(), talepleriYukle()])
    setYukleniyor(false)
  }, [kurumlariYukle, illeriYukle, odemeleriYukle, talepleriYukle])
  useYukleme(tumunuYukle)

  const kurumlar = useMemo(() => kurumlariOlustur(liste), [liste])
  const [simdi] = useState(() => Date.now())
  const sayilar = useMemo(() => {
    const doldu = kurumlar.filter(k => lisansBilgisi(k, simdi).tur === 'doldu').length
    return {
      kurumlar: { deger: kurumlar.length, vurgu: false },
      talepler: { deger: talepler.filter(t => t.status === 'beklemede').length, vurgu: true },
      tahsilat: { deger: doldu, vurgu: false },
    }
  }, [kurumlar, talepler, simdi])

  const ortak = { api, bildir, kurumlar, iller, yukleniyor }
  const [baslik, alt] = BASLIK[sekme]

  return (
    <Kabuk sekme={sekme} onSekme={s => setSekme(s)} sayilar={{ kurumlar: sayilar.kurumlar, talepler: sayilar.talepler }} baslik={baslik} alt={alt}>
      {bildirim && (
        <div className={`alert ${bildirim.tur === 'hata' ? 'alert-danger' : 'alert-success'}`} role={bildirim.tur === 'hata' ? 'alert' : 'status'} style={{ margin: 0 }}>
          {bildirim.metin}
        </div>
      )}
      {sekme === 'ozet' && <GenelBakis {...ortak} odemeler={odemeler} talepler={talepler} git={setSekme} />}
      {sekme === 'kurumlar' && <Kurumlar {...ortak} odemeler={odemeler} secili={secilenKurum} sec={id => setSekme('kurumlar', id)} yenile={kurumlariYukle} illeriYenile={illeriYukle} git={setSekme} />}
      {sekme === 'tahsilat' && <Tahsilat {...ortak} odemeler={odemeler} secili={secilenKurum} yenile={async () => { await Promise.all([odemeleriYukle(), kurumlariYukle()]) }} />}
      {sekme === 'talepler' && <Denetciler {...ortak} talepler={talepler} yenile={talepleriYukle} />}
      {sekme === 'izler' && <DenetimIzleri {...ortak} />}
      {sekme === 'duyurular' && <Duyurular {...ortak} />}
      {sekme === 'tatiller' && <TatilTakvimi {...ortak} />}
      {sekme === 'ayarlar' && <SistemAyarlari {...ortak} illeriYenile={illeriYukle} />}
    </Kabuk>
  )
}

export type Ortak = {
  api: ReturnType<typeof useAdminApi>
  bildir: (b: Bildirim) => void
  kurumlar: ReturnType<typeof kurumlariOlustur>
  iller: IlSatir[]
  yukleniyor: boolean
}
