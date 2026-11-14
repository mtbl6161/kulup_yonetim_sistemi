// Okul panelinin çağırdığı veritabanı fonksiyonlarının (RPC) demo karşılıkları.
// Asılları: supabase/migration_denetim_dosyasi.sql, migration_denetim_raporu.sql, migration_multiuser.sql
import { DemoHatasi, type DemoDepo } from './depo'
import { DesteklenmeyenSorgu } from './sorgu'
import { DEMO_OKUL_ID } from '../mod'

type Arg = Record<string, unknown>

function hata(mesaj: string): never {
  throw new DemoHatasi(400, { code: 'P0001', message: mesaj, details: null, hint: null })
}

export const RPCLER: Record<string, (depo: DemoDepo, a: Arg) => unknown> = {
  get_my_okul_id: () => DEMO_OKUL_ID,

  // Varsayılan liste demo verisinde hazır geliyor
  denetim_maddeleri_hazirla: () => null,

  denetim_otomatik_kaydet: (depo, a) => {
    const yil = Number(a.p_yil), ay = Number(a.p_ay), madde = Number(a.p_madde_id)
    if (!depo.denetimDosyasiAcikMi(DEMO_OKUL_ID, yil, ay)) hata('Dosya kilitli (denetime gönderilmiş)')
    if (!String(a.p_yol).startsWith(`${DEMO_OKUL_ID}/`)) hata('Geçersiz dosya yolu')
    depo.tablolar.denetim_belgeleri = depo.tablo('denetim_belgeleri').filter(b =>
      !(b.okul_id === DEMO_OKUL_ID && b.yil === yil && b.ay === ay && b.madde_id === madde && b.kaynak === 'otomatik'))
    depo.icEkle('denetim_belgeleri', {
      okul_id: DEMO_OKUL_ID, yil, ay, madde_id: madde, kaynak: 'otomatik', durum: 'bekliyor',
      dosya_yolu: a.p_yol, dosya_adi: a.p_ad, boyut: a.p_boyut, mime: a.p_mime,
    })
    return null
  },

  denetim_gonder: (depo, a) => {
    const yil = Number(a.p_yil), ay = Number(a.p_ay)
    if (!depo.denetimDosyasiAcikMi(DEMO_OKUL_ID, yil, ay)) hata('Dosya zaten gönderilmiş')
    for (const b of depo.tablo('denetim_belgeleri')) {
      if (b.okul_id === DEMO_OKUL_ID && b.yil === yil && b.ay === ay && b.durum === 'iade') b.durum = 'bekliyor'
    }
    const simdi = new Date().toISOString()
    const mevcut = depo.tablo('denetim_teslimleri').find(t => t.okul_id === DEMO_OKUL_ID && t.yil === yil && t.ay === ay)
    if (mevcut) Object.assign(mevcut, { durum: 'gonderildi', gonderim_tarihi: simdi })
    else depo.icEkle('denetim_teslimleri', { okul_id: DEMO_OKUL_ID, yil, ay, durum: 'gonderildi', gonderim_tarihi: simdi })
    return null
  },

  okul_bildirimi_okundu: (depo, a) => {
    const b = depo.tablo('okul_bildirimleri').find(x => x.id === Number(a.p_id) && x.okul_id === DEMO_OKUL_ID)
    if (b) b.okundu = true
    return null
  },
}

export function rpcCalistir(depo: DemoDepo, ad: string, arg: Arg): unknown {
  const fn = RPCLER[ad]
  if (!fn) throw new DesteklenmeyenSorgu(`rpc: ${ad}`)
  return fn(depo, arg)
}
