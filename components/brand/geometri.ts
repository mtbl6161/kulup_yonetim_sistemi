// Klüp360 marka geometrisinin tek kaynağı.
// Logo bileşeni (components/brand/Logo.tsx), paylaşım görseli (app/opengraph-image.tsx)
// ve statik dosyalar (scripts/marka-uret.ts → public/brand, app/icon.svg, favicon) buradan üretilir.
//
// İşaret: "gülümseyen ü" — iki nokta iki çocuk, alttaki yay gülümseme / kucaklayan kulüp.
// Yazı: aynı çizgi diliyle (tek kalınlık, yuvarlak uç) özel çizilmiş "Klüp360".

export const MARKA_RENK = {
  lacivert: '#0E1116',
  mavi: '#2347D9',
  maviKoyuZemin: '#5B78F2', // koyu zeminde okunurluk için açılmış mavi
  acikMavi: '#8EA3EE',
  beyaz: '#FFFFFF',
} as const

// ── İşaret (64 × 64) ─────────────────────────────────────────────
export const ISARET = {
  viewBox: '0 0 64 64',
  koseYaricap: 14,
  yay: 'M17.5 27v8.5a14.5 14.5 0 0 0 29 0V27',
  yayKalinlik: 7,
  noktaSol: { cx: 22, cy: 14.5, r: 5 },
  noktaSag: { cx: 42, cy: 14.5, r: 5 },
}

// ── Yazı ─────────────────────────────────────────────────────────
// Taban çizgisi y=48, büyük harf/rakam y=12, küçük harf y=26. Görünür alan: 206 × 60.
export const YAZI = {
  viewBox: '0 5 206 60',
  oran: 206 / 60,
  kalinlik: 6.5,
  /** "Klüp" çizgileri (ana renk) */
  harfler: [
    'M8 12V48',                               // K gövde
    'M10.5 31.5 28 13.5',                     // K üst kol
    'M14.5 27.5A17 17 0 0 1 30 46.6',         // K alt bacak (yay)
    'M40 12V48',                              // l
    'M51 26V35a12.5 12.5 0 0 0 25 0V26',      // ü
    'M87 26V59',                              // p gövde
  ],
  pHalka: { cx: 97.5, cy: 37, r: 10.5 },
  noktaSol: { cx: 56, cy: 14.5, r: 5.4 },
  noktaSag: { cx: 71, cy: 14.5, r: 5.4 },
  /** "360" çizgileri (vurgu rengi) — taslağa göre aralıkları açılmış */
  rakamlar: [
    'M120 17.9A9 9 0 1 1 128.5 30A9.3 9.3 0 1 1 119.8 42.9',  // 3
    'M165.5 14.5C155 15.5 147.5 24 147.5 37.5',                // 6 sap
  ],
  altiHalka: { cx: 157.75, cy: 37.75, r: 10.25 },
  sifir: { x: 179, y: 12, width: 21, height: 36, rx: 10.5 },
}

export type Ton = 'koyu' | 'acik' | 'mavi' | 'tek'

/** İşaretin zemin/çizgi/nokta renkleri. koyu: lacivert kare, acik: beyaz kare, mavi: mavi kare, tek: zeminsiz tek renk */
export function isaretRenkleri(ton: Ton) {
  switch (ton) {
    case 'acik': return { zemin: MARKA_RENK.beyaz, cizgi: MARKA_RENK.lacivert, sol: MARKA_RENK.mavi, sag: MARKA_RENK.acikMavi }
    case 'mavi': return { zemin: MARKA_RENK.mavi, cizgi: MARKA_RENK.beyaz, sol: MARKA_RENK.lacivert, sag: MARKA_RENK.acikMavi }
    case 'tek': return { zemin: null, cizgi: 'currentColor', sol: 'currentColor', sag: 'currentColor' }
    default: return { zemin: MARKA_RENK.lacivert, cizgi: MARKA_RENK.beyaz, sol: MARKA_RENK.maviKoyuZemin, sag: MARKA_RENK.acikMavi }
  }
}

/** Yazının renkleri: acikZemin (beyaz/açık sayfa) ya da koyuZemin */
export function yaziRenkleri(koyuZemin: boolean) {
  return koyuZemin
    ? { harf: MARKA_RENK.beyaz, rakam: MARKA_RENK.acikMavi, sol: MARKA_RENK.maviKoyuZemin, sag: MARKA_RENK.acikMavi }
    : { harf: MARKA_RENK.lacivert, rakam: MARKA_RENK.mavi, sol: MARKA_RENK.mavi, sag: MARKA_RENK.acikMavi }
}

// ── Statik SVG metinleri (dosya üretimi ve e-posta/OG gibi JSX dışı yerler için) ──
export function isaretSvg(ton: Ton = 'koyu', boyut = 64) {
  const r = isaretRenkleri(ton)
  const { noktaSol: a, noktaSag: b } = ISARET
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ISARET.viewBox}" width="${boyut}" height="${boyut}" role="img" aria-label="Klüp360">`
    + (r.zemin ? `<rect width="64" height="64" rx="${ISARET.koseYaricap}" fill="${r.zemin}"/>` : '')
    + `<path d="${ISARET.yay}" fill="none" stroke="${r.cizgi}" stroke-width="${ISARET.yayKalinlik}" stroke-linecap="round"/>`
    + `<circle cx="${a.cx}" cy="${a.cy}" r="${a.r}" fill="${r.sol}"/><circle cx="${b.cx}" cy="${b.cy}" r="${b.r}" fill="${r.sag}"/>`
    + `</svg>`
}

export function yaziSvg(koyuZemin = false, yukseklik = 60) {
  const r = yaziRenkleri(koyuZemin)
  const k = YAZI.kalinlik
  const cizgi = (d: string, c: string) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${k}" stroke-linecap="round" stroke-linejoin="round"/>`
  const halka = (h: { cx: number; cy: number; r: number }, c: string) => `<circle cx="${h.cx}" cy="${h.cy}" r="${h.r}" fill="none" stroke="${c}" stroke-width="${k}"/>`
  const s = YAZI.sifir
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${YAZI.viewBox}" width="${Math.round(yukseklik * YAZI.oran)}" height="${yukseklik}" role="img" aria-label="Klüp360">`
    + YAZI.harfler.map(d => cizgi(d, r.harf)).join('') + halka(YAZI.pHalka, r.harf)
    + `<circle cx="${YAZI.noktaSol.cx}" cy="${YAZI.noktaSol.cy}" r="${YAZI.noktaSol.r}" fill="${r.sol}"/>`
    + `<circle cx="${YAZI.noktaSag.cx}" cy="${YAZI.noktaSag.cy}" r="${YAZI.noktaSag.r}" fill="${r.sag}"/>`
    + YAZI.rakamlar.map(d => cizgi(d, r.rakam)).join('') + halka(YAZI.altiHalka, r.rakam)
    + `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" rx="${s.rx}" fill="none" stroke="${r.rakam}" stroke-width="${k}"/>`
    + `</svg>`
}
