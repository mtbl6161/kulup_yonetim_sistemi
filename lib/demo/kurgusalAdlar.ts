// Demo okulun kurgusal kişi bilgileri. Hiçbiri gerçek bir kişiye ait değildir:
// soyadları demo olduğu belli sözcüklerden seçilir, T.C. numaraları doğrulama algoritmasına bilerek uymaz,
// e-postalar ayrılmış example.com alan adını, IBAN'lar var olmayan 00000 banka kodunu kullanır.

/** Tohumlu, tekrarlanabilir rastgele sayı üreteci (mulberry32). */
export function tohumluRastgele(tohum: number) {
  let t = tohum >>> 0
  const sonraki = () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
  return {
    sayi: sonraki,
    tam: (min: number, max: number) => min + Math.floor(sonraki() * (max - min + 1)),
    sec: <T,>(dizi: readonly T[]): T => dizi[Math.floor(sonraki() * dizi.length)],
    olasilik: (p: number) => sonraki() < p,
  }
}
export type Rastgele = ReturnType<typeof tohumluRastgele>

export const KURGUSAL_SOYADLAR = ['Örnek', 'Kurgu', 'Taslak', 'Masalcı', 'Deneme', 'Hayalsu'] as const

export const KIZ_ADLARI = ['Ada', 'Elif', 'Zeynep', 'Defne', 'Ela', 'Nehir', 'Duru', 'Asel', 'Mira', 'Lina', 'Ece', 'İpek', 'Su', 'Nil', 'Öykü', 'Yağmur'] as const
export const ERKEK_ADLARI = ['Can', 'Ege', 'Kerem', 'Aras', 'Deniz', 'Mert', 'Arda', 'Efe', 'Kaan', 'Umut', 'Yiğit', 'Emir', 'Batu', 'Onur', 'Çınar', 'Doruk'] as const
export const YETISKIN_ADLARI = ['Selin', 'Burak', 'Gamze', 'Tolga', 'Esra', 'Serkan', 'Derya', 'Levent', 'Pınar', 'Volkan', 'Aylin', 'Murat'] as const

/** T.C. kimlik numarası biçiminde, ama 10. hanesi bilerek yanlış olan (hiçbir kişiye ait olamayan) 11 haneli sayı. */
export function kurgusalTc(r: Rastgele): string {
  const d = [r.tam(1, 9), ...Array.from({ length: 8 }, () => r.tam(0, 9))]
  const tek = d[0] + d[2] + d[4] + d[6] + d[8]
  const cift = d[1] + d[3] + d[5] + d[7]
  const dogru10 = (((tek * 7 - cift) % 10) + 10) % 10
  const d10 = (dogru10 + 1) % 10
  const d11 = (d.reduce((s, x) => s + x, 0) + d10) % 10
  return [...d, d10, d11].join('')
}

/** Gerçek T.C. kimlik algoritmasına uyuyor mu? (testlerde kurgusallığı denetlemek için) */
export function tcAlgoritmayaUyar(tc: string): boolean {
  if (!/^[1-9]\d{10}$/.test(tc)) return false
  const d = tc.split('').map(Number)
  const tek = d[0] + d[2] + d[4] + d[6] + d[8]
  const cift = d[1] + d[3] + d[5] + d[7]
  if ((((tek * 7 - cift) % 10) + 10) % 10 !== d[9]) return false
  return d.slice(0, 10).reduce((s, x) => s + x, 0) % 10 === d[10]
}

/** Kontrol haneleri geçerli, banka kodu 00000 (var olmayan banka) olan TR IBAN'ı. */
export function kurgusalIban(r: Rastgele): string {
  const hesap = Array.from({ length: 16 }, () => r.tam(0, 9)).join('')
  const bban = `00000` + `0` + hesap
  // ISO 13616: BBAN + "TR00" → harfler sayıya (T=29, R=27) → 98 - (mod 97)
  const sayisal = bban + '292700'
  let mod = 0
  for (const c of sayisal) mod = (mod * 10 + Number(c)) % 97
  const kontrol = String(98 - mod).padStart(2, '0')
  return `TR${kontrol}${bban}`
}

export function kurgusalTelefon(r: Rastgele): string {
  return `0 (500) 000 00 ${String(r.tam(10, 99))}`
}

/** ASCII'ye indirgenmiş e-posta yerel kısmı. */
function asciiYap(s: string) {
  return s.toLocaleLowerCase('tr').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/[^a-z0-9]/g, '')
}
export function kurgusalEposta(ad: string, soyad: string): string {
  return `${asciiYap(ad)}.${asciiYap(soyad)}@example.com`
}
