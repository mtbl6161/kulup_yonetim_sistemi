// PostgREST sorgu dizgesinin, panelin gerçekten kullandığı alt kümesini ayrıştırır.
// Desteklenmeyen bir biçim gelirse sessizce yanlış sonuç dönmek yerine DesteklenmeyenSorgu fırlatır.

export class DesteklenmeyenSorgu extends Error {
  constructor(ayrinti: string) {
    super(`DEMO_DESTEKLENMEYEN_SORGU: ${ayrinti}`)
    this.name = 'DesteklenmeyenSorgu'
  }
}

export type SecimOgesi =
  | { tur: 'yildiz' }
  | { tur: 'kolon'; ad: string; takma: string }
  | { tur: 'gomulu'; tablo: string; takma: string; ic: boolean; ipucu?: string; alanlar: SecimOgesi[] }

export type Operator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is' | 'in'
export type Kosul =
  | { tur: 'karsilastirma'; kolon: string; op: Operator; deger: string; degil: boolean }
  | { tur: 'mantik'; op: 'and' | 'or'; ic: Kosul[]; degil: boolean }

const OPERATORLER = new Set<Operator>(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in'])

/** Parantez ve tırnak dışındaki virgüllerden böler. */
export function ustDuzeyBol(metin: string): string[] {
  const parcalar: string[] = []
  let derinlik = 0, tirnak = false, bas = 0
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i]
    if (c === '"' && metin[i - 1] !== '\\') tirnak = !tirnak
    else if (!tirnak && c === '(') derinlik++
    else if (!tirnak && c === ')') derinlik--
    else if (!tirnak && derinlik === 0 && c === ',') { parcalar.push(metin.slice(bas, i)); bas = i + 1 }
  }
  parcalar.push(metin.slice(bas))
  return parcalar.map(p => p.trim()).filter(p => p !== '')
}

export function secimAyristir(secim: string | null): SecimOgesi[] {
  if (!secim || secim === '*') return [{ tur: 'yildiz' }]
  return ustDuzeyBol(secim).map(oge => {
    if (oge === '*') return { tur: 'yildiz' } as const
    const parantez = oge.indexOf('(')
    if (parantez >= 0) {
      if (!oge.endsWith(')')) throw new DesteklenmeyenSorgu(`seçim: ${oge}`)
      let bas = oge.slice(0, parantez)
      const ic = oge.slice(parantez + 1, -1)
      let takma: string | undefined
      if (bas.includes(':')) [takma, bas] = bas.split(':')
      const [tablo, ...ipuclari] = bas.split('!')
      const inner = ipuclari.includes('inner')
      const ipucu = ipuclari.find(i => i !== 'inner' && i !== 'left')
      return { tur: 'gomulu', tablo, takma: takma || tablo, ic: inner, ipucu, alanlar: secimAyristir(ic || '*') } as const
    }
    if (oge.includes('->')) throw new DesteklenmeyenSorgu(`JSON yolu: ${oge}`)
    let ad = oge.split('::')[0]
    let takma = ad
    if (ad.includes(':')) [takma, ad] = ad.split(':')
    return { tur: 'kolon', ad, takma } as const
  })
}

/** in.(a,b,"c,d") listesindeki değerler. */
export function listeAyristir(metin: string): string[] {
  if (!metin.startsWith('(') || !metin.endsWith(')')) throw new DesteklenmeyenSorgu(`liste: ${metin}`)
  return ustDuzeyBol(metin.slice(1, -1)).map(v => (v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1).replace(/\\"/g, '"') : v))
}

/** "op.deger" ya da "not.op.deger" biçimli filtre değeri. */
export function filtreAyristir(kolon: string, deger: string): Kosul {
  let degil = false
  let geri = deger
  if (geri.startsWith('not.')) { degil = true; geri = geri.slice(4) }
  const nokta = geri.indexOf('.')
  const op = (nokta < 0 ? geri : geri.slice(0, nokta)) as Operator
  if (!OPERATORLER.has(op)) throw new DesteklenmeyenSorgu(`operatör: ${kolon}=${deger}`)
  return { tur: 'karsilastirma', kolon, op, deger: nokta < 0 ? '' : geri.slice(nokta + 1), degil }
}

/** or=(a.eq.1,and(b.eq.2,c.lt.3)) gibi mantık ağaçları. */
export function mantikAyristir(op: 'and' | 'or', govde: string, degil = false): Kosul {
  if (!govde.startsWith('(') || !govde.endsWith(')')) throw new DesteklenmeyenSorgu(`${op}: ${govde}`)
  const ic = ustDuzeyBol(govde.slice(1, -1)).map(parca => {
    const m = /^(not\.)?(and|or)(\(.*\))$/.exec(parca)
    if (m) return mantikAyristir(m[2] as 'and' | 'or', m[3], !!m[1])
    const nokta = parca.indexOf('.')
    if (nokta < 0) throw new DesteklenmeyenSorgu(`koşul: ${parca}`)
    return filtreAyristir(parca.slice(0, nokta), parca.slice(nokta + 1))
  })
  return { tur: 'mantik', op, ic, degil }
}

/** Sıralama: "ad.asc,tarih.desc.nullslast" */
export interface Siralama { kolon: string; artan: boolean; nullBasta: boolean }
export function siralamaAyristir(metin: string): Siralama[] {
  return ustDuzeyBol(metin).map(p => {
    const [kolon, ...bayraklar] = p.split('.')
    const artan = !bayraklar.includes('desc')
    const nullBasta = bayraklar.includes('nullsfirst') ? true : bayraklar.includes('nullslast') ? false : !artan
    return { kolon, artan, nullBasta }
  })
}

const AYRILMIS = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'])

export interface AyrisikSorgu {
  secim: SecimOgesi[]
  kosullar: Kosul[]
  /** Gömülü tablolara ait filtreler: tablo/takma adı → koşullar */
  gomuluKosullar: Map<string, Kosul[]>
  siralama: Siralama[]
  limit?: number
  offset?: number
  catisma?: string[]
}

export function sorguAyristir(params: URLSearchParams): AyrisikSorgu {
  const kosullar: Kosul[] = []
  const gomuluKosullar = new Map<string, Kosul[]>()
  for (const [anahtar, deger] of params) {
    if (AYRILMIS.has(anahtar)) continue
    if (anahtar.endsWith('.order') || anahtar.endsWith('.limit') || anahtar.endsWith('.offset')) {
      throw new DesteklenmeyenSorgu(`gömülü sıralama/sınır: ${anahtar}`)
    }
    if (anahtar === 'or' || anahtar === 'and' || anahtar === 'not.or' || anahtar === 'not.and') {
      kosullar.push(mantikAyristir(anahtar.replace('not.', '') as 'and' | 'or', deger, anahtar.startsWith('not.')))
      continue
    }
    const nokta = anahtar.indexOf('.')
    if (nokta >= 0) {
      const tablo = anahtar.slice(0, nokta)
      const liste = gomuluKosullar.get(tablo) || []
      liste.push(filtreAyristir(anahtar.slice(nokta + 1), deger))
      gomuluKosullar.set(tablo, liste)
      continue
    }
    kosullar.push(filtreAyristir(anahtar, deger))
  }
  const sayi = (s: string | null) => (s == null ? undefined : Number(s))
  return {
    secim: secimAyristir(params.get('select')),
    kosullar, gomuluKosullar,
    siralama: params.get('order') ? siralamaAyristir(params.get('order')!) : [],
    limit: sayi(params.get('limit')),
    offset: sayi(params.get('offset')),
    catisma: params.get('on_conflict')?.split(',').map(s => s.trim()),
  }
}

// ── Değerlendirme ──────────────────────────────────────────────

function sayisalMi(v: unknown): v is number { return typeof v === 'number' }

function karsilastirmaDegeri(satirDeger: unknown, filtre: string): number | null {
  if (satirDeger == null) return null
  if (sayisalMi(satirDeger)) return satirDeger - Number(filtre)
  const a = String(satirDeger)
  return a < filtre ? -1 : a > filtre ? 1 : 0
}

function esitMi(satirDeger: unknown, filtre: string): boolean | null {
  if (satirDeger == null) return null
  if (sayisalMi(satirDeger)) return satirDeger === Number(filtre)
  if (typeof satirDeger === 'boolean') return String(satirDeger) === filtre
  return String(satirDeger) === filtre
}

function desenRegex(desen: string, buyukKucuk: boolean) {
  const kacis = desen.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/[%*]/g, '.*').replace(/_/g, '.')
  return new RegExp(`^${kacis}$`, buyukKucuk ? 'iu' : 'u')
}

/** SQL üç değerli mantığı: null = bilinmiyor → satır elenir. */
export function kosulSagla(satir: Record<string, unknown>, k: Kosul): boolean {
  let sonuc: boolean | null
  if (k.tur === 'mantik') {
    const ic = k.ic.map(x => kosulSagla(satir, x))
    sonuc = k.op === 'and' ? ic.every(Boolean) : ic.some(Boolean)
  } else {
    const v = satir[k.kolon]
    switch (k.op) {
      case 'eq': sonuc = esitMi(v, k.deger); break
      case 'neq': { const e = esitMi(v, k.deger); sonuc = e == null ? null : !e; break }
      case 'gt': { const c = karsilastirmaDegeri(v, k.deger); sonuc = c == null ? null : c > 0; break }
      case 'gte': { const c = karsilastirmaDegeri(v, k.deger); sonuc = c == null ? null : c >= 0; break }
      case 'lt': { const c = karsilastirmaDegeri(v, k.deger); sonuc = c == null ? null : c < 0; break }
      case 'lte': { const c = karsilastirmaDegeri(v, k.deger); sonuc = c == null ? null : c <= 0; break }
      case 'like': sonuc = v == null ? null : desenRegex(k.deger, false).test(String(v)); break
      case 'ilike': sonuc = v == null ? null : desenRegex(k.deger.toLocaleLowerCase('tr'), true).test(String(v).toLocaleLowerCase('tr')); break
      case 'in': { const l = listeAyristir(k.deger); sonuc = v == null ? null : l.some(x => esitMi(v, x)); break }
      case 'is':
        if (k.deger === 'null') sonuc = v == null
        else if (k.deger === 'true') sonuc = v === true
        else if (k.deger === 'false') sonuc = v === false
        else if (k.deger === 'unknown') sonuc = v == null
        else throw new DesteklenmeyenSorgu(`is.${k.deger}`)
        break
    }
  }
  if (sonuc == null) return false
  return k.degil ? !sonuc : sonuc
}

export function sirala<T extends Record<string, unknown>>(satirlar: T[], siralama: Siralama[]): T[] {
  if (!siralama.length) return satirlar
  return [...satirlar].sort((a, b) => {
    for (const s of siralama) {
      const x = a[s.kolon], y = b[s.kolon]
      if (x == null || y == null) {
        if (x == null && y == null) continue
        return (x == null) === s.nullBasta ? -1 : 1
      }
      let c: number
      if (typeof x === 'number' && typeof y === 'number') c = x - y
      else if (typeof x === 'boolean' && typeof y === 'boolean') c = Number(x) - Number(y)
      else c = String(x).localeCompare(String(y), 'tr')
      if (c !== 0) return s.artan ? c : -c
    }
    return 0
  })
}
