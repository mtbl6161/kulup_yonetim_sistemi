// Marka dosyalarını components/brand/geometri.ts'ten üretir.
// Çalıştırma: npx tsx scripts/marka-uret.ts
//
// Üretilenler:
//   public/brand/isaret.svg, isaret-acik.svg, isaret-mavi.svg  — ü işareti (zeminli)
//   public/brand/yazi.svg, yazi-koyu.svg                       — "Klüp360" yazısı (açık / koyu zemin)
//   public/brand/logo-yatay.svg, logo-yatay-koyu.svg           — işaret + yazı
//   public/brand/logo-yatay.png, logo-yatay-koyu.png           — e-posta vb. için (2x)
//   public/brand/lemon-logo.png                                — Lemon Squeezy mağaza logosu (1024)
//   public/brand/logo-mark.svg, public/logo.png                — eski yollar (geriye dönük)
//   app/icon.svg, app/apple-icon.png, app/favicon.ico          — site simgeleri
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { ISARET, MARKA_RENK, YAZI, isaretRenkleri, isaretSvg, yaziSvg } from '../components/brand/geometri'

const kok = path.resolve(import.meta.dirname, '..')
const yaz = (rel: string, icerik: string | Buffer) => {
  const p = path.join(kok, rel)
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, icerik)
  console.log('✓', rel)
}
const png = (svg: string, boyut: number) => sharp(Buffer.from(svg), { density: 72 * Math.max(1, boyut / 64) }).resize(boyut, boyut).png().toBuffer()

/** İşaret + yazı yan yana. Yazının harf yüksekliği (y 12–48) işaretin ortasına hizalanır. */
function yataySvg(koyuZemin: boolean, olcek = 1) {
  const bosluk = 18, yaziX = 64 + bosluk, w = (yaziX + 206) * olcek, h = 64 * olcek
  const isaret = isaretSvg(koyuZemin ? 'mavi' : 'koyu').replace(/<svg[^>]*>|<\/svg>/g, '')
  const yazi = yaziSvg(koyuZemin).replace(/<svg[^>]*>|<\/svg>/g, '')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${yaziX + 206} 64" width="${w}" height="${h}" role="img" aria-label="Klüp360">`
    + `<g>${isaret}</g><g transform="translate(${yaziX} 2)">${yazi}</g></svg>`
}

/** Apple simgesi: köşesiz tam kare (iOS kendi maskesini uygular), işaret biraz içeride */
function appleSvg() {
  const r = isaretRenkleri('koyu')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 76 76" width="180" height="180"><rect x="-6" y="-6" width="76" height="76" fill="${r.zemin}"/>`
    + isaretSvg('koyu').replace(/<svg[^>]*>|<\/svg>/g, '').replace(/<rect[^>]*\/>/, '') + `</svg>`
}

/** PNG girdilerinden çok boyutlu .ico */
function ico(pngler: { boyut: number; veri: Buffer }[]) {
  const baslik = Buffer.alloc(6); baslik.writeUInt16LE(0, 0); baslik.writeUInt16LE(1, 2); baslik.writeUInt16LE(pngler.length, 4)
  let ofset = 6 + 16 * pngler.length
  const girdiler = pngler.map(({ boyut, veri }) => {
    const g = Buffer.alloc(16)
    g.writeUInt8(boyut >= 256 ? 0 : boyut, 0); g.writeUInt8(boyut >= 256 ? 0 : boyut, 1)
    g.writeUInt16LE(1, 4); g.writeUInt16LE(32, 6); g.writeUInt32LE(veri.length, 8); g.writeUInt32LE(ofset, 12)
    ofset += veri.length
    return g
  })
  return Buffer.concat([baslik, ...girdiler, ...pngler.map(p => p.veri)])
}

async function main() {
  yaz('public/brand/isaret.svg', isaretSvg('koyu'))
  yaz('public/brand/isaret-acik.svg', isaretSvg('acik'))
  yaz('public/brand/isaret-mavi.svg', isaretSvg('mavi'))
  yaz('public/brand/yazi.svg', yaziSvg(false))
  yaz('public/brand/yazi-koyu.svg', yaziSvg(true))
  yaz('public/brand/logo-yatay.svg', yataySvg(false))
  yaz('public/brand/logo-yatay-koyu.svg', yataySvg(true))
  yaz('public/brand/logo-mark.svg', isaretSvg('koyu'))
  yaz('app/icon.svg', isaretSvg('koyu'))

  const yatayPng = async (koyu: boolean) => sharp(Buffer.from(yataySvg(koyu, 2)), { density: 144 }).png().toBuffer()
  yaz('public/brand/logo-yatay.png', await yatayPng(false))
  yaz('public/brand/logo-yatay-koyu.png', await yatayPng(true))
  yaz('public/brand/lemon-logo.png', await png(isaretSvg('koyu'), 1024))
  yaz('public/logo.png', await png(isaretSvg('koyu'), 512))
  yaz('app/apple-icon.png', await sharp(Buffer.from(appleSvg()), { density: 216 }).resize(180, 180).png().toBuffer())
  yaz('app/favicon.ico', ico(await Promise.all([16, 32, 48].map(async b => ({ boyut: b, veri: await png(isaretSvg('koyu'), b) })))))

  // Kontrol: geometri sabitleri kullanıldı mı (betiğin eski kopyayla çalışmadığını doğrular)
  console.log('işaret yay:', ISARET.yay, '| yazı kalınlık:', YAZI.kalinlik, '| zemin:', MARKA_RENK.lacivert)
}

main()
