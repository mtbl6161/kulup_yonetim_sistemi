// Demo dosya deposu: yüklenen dosyalar yalnızca bu sekmenin belleğinde Blob olarak tutulur, sunucuya gitmez.
export const DEMO_DOSYA_SINIRI = 10 * 1024 * 1024
export const DEMO_TOPLAM_SINIR = 50 * 1024 * 1024

interface Nesne { blob: Blob; mime: string; olusturma: string }

export class DemoDepolama {
  private nesneler = new Map<string, Nesne>()

  constructor(baslangic: { kova: string; yol: string; icerik: Uint8Array; mime: string }[] = []) {
    for (const d of baslangic) {
      this.nesneler.set(`${d.kova}/${d.yol}`, { blob: new Blob([d.icerik.slice().buffer], { type: d.mime }), mime: d.mime, olusturma: new Date().toISOString() })
    }
  }

  toplamBoyut() {
    let t = 0
    for (const n of this.nesneler.values()) t += n.blob.size
    return t
  }

  yukle(kova: string, yol: string, blob: Blob, ustuneYaz: boolean): { Id: string; Key: string } {
    const anahtar = `${kova}/${yol}`
    if (this.nesneler.has(anahtar) && !ustuneYaz) throw new DepolamaHatasi(409, 'Duplicate', 'The resource already exists')
    if (blob.size > DEMO_DOSYA_SINIRI) throw new DepolamaHatasi(413, 'Payload too large', 'Dosya 10 MB sınırını aşıyor.')
    if (this.toplamBoyut() + blob.size > DEMO_TOPLAM_SINIR) throw new DepolamaHatasi(413, 'Payload too large', 'Demoda bu sekmede en fazla 50 MB dosya tutulabilir.')
    const mime = blob.type || 'application/octet-stream'
    if (kova === 'personel' && mime !== 'application/pdf' && !/\.pdf$/i.test(yol)) throw new DepolamaHatasi(415, 'invalid_mime_type', 'Yalnızca PDF yüklenebilir.')
    this.nesneler.set(anahtar, { blob, mime, olusturma: new Date().toISOString() })
    return { Id: `demo-${this.nesneler.size}`, Key: anahtar }
  }

  al(kova: string, yol: string): Nesne | undefined {
    return this.nesneler.get(`${kova}/${yol}`)
  }

  sil(kova: string, yollar: string[]) {
    const silinen: { name: string; bucket_id: string }[] = []
    for (const y of yollar) if (this.nesneler.delete(`${kova}/${y}`)) silinen.push({ name: y, bucket_id: kova })
    return silinen
  }

  listele(kova: string, onek: string) {
    const bas = `${kova}/${onek ? onek.replace(/\/?$/, '/') : ''}`
    return [...this.nesneler.entries()].filter(([k]) => k.startsWith(bas)).map(([k, n]) => ({
      name: k.slice(bas.length), id: k, created_at: n.olusturma, updated_at: n.olusturma,
      metadata: { size: n.blob.size, mimetype: n.mime },
    }))
  }
}

export class DepolamaHatasi extends Error {
  constructor(public durum: number, public hata: string, mesaj: string) { super(mesaj) }
}
