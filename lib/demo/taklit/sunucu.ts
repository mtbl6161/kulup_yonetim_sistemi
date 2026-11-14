// Demo istemcisinin "sunucusu": supabase-js'in REST, depolama ve kimlik isteklerini tarayıcı belleğinden yanıtlar.
// Hiçbir istek ağa çıkmaz. Ayrıntı: docs/demo-hesabi.md §3
import { DemoDepo, DemoHatasi, sorguAyristir, type Satir } from './depo'
import { DemoDepolama, DepolamaHatasi } from './depolama'
import { rpcCalistir } from './rpc'
import { DesteklenmeyenSorgu } from './sorgu'
import { demoVerisiUret } from '../demoVerisi'
import { DEMO_SUPABASE_URL } from '../mod'
import { demoKullanicisi, demoOturumu } from '../kimlik'

const JSON_BASLIK = { 'Content-Type': 'application/json; charset=utf-8' }

function jsonYanit(govde: unknown, durum = 200, ek: Record<string, string> = {}) {
  return new Response(JSON.stringify(govde), { status: durum, headers: { ...JSON_BASLIK, ...ek } })
}
const bosYanit = (durum = 204, ek: Record<string, string> = {}) => new Response(null, { status: durum, headers: ek })

async function govdeOku(init?: RequestInit): Promise<{ json?: unknown; dosya?: Blob }> {
  const b = init?.body
  if (b == null) return {}
  if (typeof b === 'string') return { json: b === '' ? undefined : JSON.parse(b) }
  if (typeof FormData !== 'undefined' && b instanceof FormData) {
    for (const [, v] of b.entries()) if (typeof v !== 'string') return { dosya: v }
    return {}
  }
  if (b instanceof Blob) return { dosya: b }
  if (b instanceof ArrayBuffer || ArrayBuffer.isView(b)) return { dosya: new Blob([b as BlobPart]) }
  throw new DesteklenmeyenSorgu('istek gövdesi biçimi')
}

export class DemoSunucu {
  readonly depo: DemoDepo
  readonly depolama: DemoDepolama

  constructor(bugun = new Date()) {
    const veri = demoVerisiUret({ bugun })
    this.depo = new DemoDepo(veri.tablolar as Record<string, Satir[]>)
    this.depolama = new DemoDepolama(veri.dosyalar)
  }

  async isle(girdi: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = new URL(typeof girdi === 'string' ? girdi : girdi instanceof URL ? girdi.href : girdi.url)
    const yontem = (init?.method || (girdi instanceof Request ? girdi.method : 'GET')).toUpperCase()
    const basliklar = new Headers(init?.headers || (girdi instanceof Request ? girdi.headers : undefined))
    if (url.origin !== DEMO_SUPABASE_URL) return jsonYanit({ message: 'Demoda dış istek yapılmaz.' }, 403)
    try {
      const govde = await govdeOku(init)
      const yol = url.pathname
      if (yol.startsWith('/rest/v1/')) return this.rest(yontem, decodeURIComponent(yol.slice(9)), url.searchParams, basliklar, govde.json)
      if (yol.startsWith('/storage/v1/')) return this.depolamaIstegi(yontem, yol.slice(12), basliklar, govde)
      if (yol.startsWith('/auth/v1/')) return this.kimlik(yontem, yol.slice(9))
      throw new DesteklenmeyenSorgu(`${yontem} ${yol}`)
    } catch (e) {
      if (e instanceof DemoHatasi) return jsonYanit(e.govde, e.durum)
      if (e instanceof DepolamaHatasi) return jsonYanit({ statusCode: String(e.durum), error: e.hata, message: e.message }, 400)
      if (e instanceof DesteklenmeyenSorgu) {
        console.error(e.message)
        return jsonYanit({ code: 'DEMO', message: 'Demoda desteklenmeyen işlem.', details: e.message, hint: null }, 501)
      }
      throw e
    }
  }

  private rest(yontem: string, yol: string, params: URLSearchParams, basliklar: Headers, govde: unknown): Response {
    const prefer = basliklar.get('Prefer') || ''
    if (yol.startsWith('rpc/')) {
      const arg = (yontem === 'GET' || yontem === 'HEAD' ? Object.fromEntries(params) : govde || {}) as Record<string, unknown>
      const sonuc = rpcCalistir(this.depo, yol.slice(4), arg)
      return sonuc == null ? bosYanit(204) : jsonYanit(sonuc)
    }
    const tablo = yol
    if (tablo.includes('/')) throw new DesteklenmeyenSorgu(`yol: ${yol}`)
    const sorgu = sorguAyristir(params)
    const tekil = (basliklar.get('Accept') || '').includes('vnd.pgrst.object+json')
    const temsil = prefer.includes('return=representation')
    const sayim = /count=(exact|planned|estimated)/.test(prefer)

    let satirlar: Satir[]
    let toplam: number
    let durum = 200
    if (yontem === 'GET' || yontem === 'HEAD') {
      ;({ satirlar, toplam } = this.depo.sec(tablo, sorgu))
    } else {
      if (sorgu.gomuluKosullar.size) throw new DesteklenmeyenSorgu('yazmada gömülü filtre')
      let etkilenen: Satir[]
      if (yontem === 'POST') {
        const girisler = (Array.isArray(govde) ? govde : [govde]) as Satir[]
        const cozum = prefer.includes('resolution=merge-duplicates') ? 'merge' : prefer.includes('resolution=ignore-duplicates') ? 'ignore' : undefined
        etkilenen = this.depo.ekle(tablo, girisler, { cozum, catisma: sorgu.catisma })
        durum = 201
      } else if (yontem === 'PATCH') {
        etkilenen = this.depo.guncelle(tablo, sorgu.kosullar, (govde || {}) as Satir)
      } else if (yontem === 'DELETE') {
        etkilenen = this.depo.sil(tablo, sorgu.kosullar)
      } else throw new DesteklenmeyenSorgu(`yöntem: ${yontem}`)
      toplam = etkilenen.length
      if (!temsil) {
        const ek: Record<string, string> = sayim ? { 'Content-Range': `*/${toplam}` } : {}
        return bosYanit(yontem === 'POST' ? 201 : 204, ek)
      }
      satirlar = etkilenen.map(s => this.depo.yansit(tablo, s, sorgu.secim)).filter((s): s is Satir => !!s)
    }

    const bas = sorgu.offset || 0
    const aralik = satirlar.length ? `${bas}-${bas + satirlar.length - 1}` : '*'
    const ek = { 'Content-Range': `${aralik}/${sayim ? toplam : '*'}` }
    if (yontem === 'HEAD') return bosYanit(200, ek)
    if (tekil) {
      if (satirlar.length !== 1) {
        return jsonYanit({
          code: 'PGRST116', details: `The result contains ${satirlar.length} rows`, hint: null,
          message: 'JSON object requested, multiple (or no) rows returned',
        }, 406)
      }
      return jsonYanit(satirlar[0], durum, ek)
    }
    return jsonYanit(satirlar, durum, ek)
  }

  private depolamaIstegi(yontem: string, yol: string, basliklar: Headers, govde: { json?: unknown; dosya?: Blob }): Response {
    const parcalar = yol.split('/').map(decodeURIComponent)
    if (parcalar[0] !== 'object') throw new DesteklenmeyenSorgu(`depolama: ${yol}`)
    const [, ikinci, ...geri] = parcalar
    if (ikinci === 'sign') {
      const [kova, ...p] = geri
      const dosyaYolu = p.join('/')
      if (!this.depolama.al(kova, dosyaYolu)) throw new DepolamaHatasi(404, 'not_found', 'Object not found')
      if (yontem === 'POST') return jsonYanit({ signedURL: `/object/sign/${kova}/${dosyaYolu}?token=demo` })
      return this.dosyaYaniti(kova, dosyaYolu)
    }
    if (ikinci === 'authenticated' || ikinci === 'public') {
      const [kova, ...p] = geri
      return this.dosyaYaniti(kova, p.join('/'))
    }
    if (ikinci === 'list') {
      const g = (govde.json || {}) as { prefix?: string }
      return jsonYanit(this.depolama.listele(geri[0], g.prefix || ''))
    }
    const kova = ikinci
    const dosyaYolu = geri.join('/')
    if (yontem === 'DELETE' && !dosyaYolu) {
      const g = (govde.json || {}) as { prefixes?: string[] }
      return jsonYanit(this.depolama.sil(kova, g.prefixes || []))
    }
    if ((yontem === 'POST' || yontem === 'PUT') && govde.dosya) {
      const ustuneYaz = yontem === 'PUT' || basliklar.get('x-upsert') === 'true'
      return jsonYanit(this.depolama.yukle(kova, dosyaYolu, govde.dosya, ustuneYaz))
    }
    if (yontem === 'GET') return this.dosyaYaniti(kova, dosyaYolu)
    throw new DesteklenmeyenSorgu(`depolama: ${yontem} ${yol}`)
  }

  private dosyaYaniti(kova: string, yol: string): Response {
    const n = this.depolama.al(kova, yol)
    if (!n) throw new DepolamaHatasi(404, 'not_found', 'Object not found')
    return new Response(n.blob, { status: 200, headers: { 'Content-Type': n.mime } })
  }

  /** Demo imzalı adresini (https://demo.invalid/storage/v1/object/sign/...) tarayıcıda açılabilen blob: adresine çevirir. */
  imzaliAdresCoz(adres: string): string | null {
    const onek = `${DEMO_SUPABASE_URL}/storage/v1/object/sign/`
    if (!adres.startsWith(onek)) return null
    const [kova, ...p] = decodeURI(adres.slice(onek.length).split('?')[0]).split('/')
    const n = this.depolama.al(kova, p.join('/'))
    return n ? URL.createObjectURL(n.blob) : null
  }

  private kimlik(yontem: string, yol: string): Response {
    if (yol === 'user' && yontem === 'GET') return jsonYanit(demoKullanicisi())
    if (yol === 'user') return jsonYanit({ code: 422, error_code: 'demo', msg: 'Demo hesabının şifresi ve e-postası değiştirilemez.' }, 422)
    if (yol === 'logout') return bosYanit(204)
    if (yol.startsWith('token')) return jsonYanit(demoOturumu())
    if (yol === 'settings') return jsonYanit({ external: {}, disable_signup: true })
    throw new DesteklenmeyenSorgu(`kimlik: ${yontem} ${yol}`)
  }
}
