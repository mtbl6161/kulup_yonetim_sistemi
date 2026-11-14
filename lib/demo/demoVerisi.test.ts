import { describe, expect, it } from 'vitest'
import { demoVerisiUret, demoAylari, ornekPdf, demoAyarlari, type Satir } from './demoVerisi'
import { tcAlgoritmayaUyar, kurgusalTc, kurgusalIban, tohumluRastgele, KURGUSAL_SOYADLAR } from './kurgusalAdlar'
import { hesapKontrolEt, type KontrolBordro } from '../hesapKontrol'
import { muhsgkXml, muhsgkEksikleri, MUHSGK_VARSAYILAN, type MuhsgkSatir } from '../muhsgk'
import { bordroSatirlariHesapla } from '../bordroHesap'
import { DEMO_OKUL_ID } from './mod'
import type { Personel } from '../types'

const BUGUN = new Date(2026, 10, 13, 12) // 13 Kasım 2026
const veri = demoVerisiUret({ bugun: BUGUN })
const T = veri.tablolar

describe('demo verisi üreteci', () => {
  it('aynı tohum ve gün için aynı veriyi üretir', () => {
    const ikinci = demoVerisiUret({ bugun: BUGUN })
    expect(JSON.stringify(ikinci.tablolar)).toBe(JSON.stringify(T))
  })

  it('yaz tatilini atlayarak son 6 eğitim ayını seçer', () => {
    expect(demoAylari(BUGUN)).toEqual([
      { ay: 4, yil: 2026 }, { ay: 5, yil: 2026 }, { ay: 6, yil: 2026 },
      { ay: 9, yil: 2026 }, { ay: 10, yil: 2026 }, { ay: 11, yil: 2026 },
    ])
  })

  it('beklenen hacimde okul üretir', () => {
    expect(T.okullar).toHaveLength(1)
    expect(T.personel).toHaveLength(9)
    expect(T.siniflar).toHaveLength(4)
    expect(T.ogrenciler.filter(o => o.ogrenci_turu === 'kulup')).toHaveLength(46)
    expect(T.ogrenciler.filter(o => o.aktif === false)).toHaveLength(2)
    expect(T.tahsilat.length).toBeGreaterThan(150)
    expect(T.bordro.length).toBeGreaterThan(30)
    expect(T.denetim_teslimleri.map(d => d.durum)).toEqual(['onaylandi', 'iade'])
  })

  it('her satır demo okula aittir ve ilişkiler tutarlıdır', () => {
    for (const [tablo, satirlar] of Object.entries(T)) {
      for (const s of satirlar) if ('okul_id' in s) expect(s.okul_id, tablo).toBe(DEMO_OKUL_ID)
    }
    const idler = (tablo: string) => new Set(T[tablo].map(s => s.id))
    const ogr = idler('ogrenciler'), per = idler('personel'), kat = idler('tahsilat_kategorileri'), mad = idler('denetim_maddeleri')
    for (const tablo of ['tahsilat', 'tahsilat_kayitlari', 'tahsilat_kategori_ogrenci', 'tahsilat_taksit_planlari']) {
      for (const s of T[tablo]) expect(ogr.has(s.ogrenci_id), tablo).toBe(true)
    }
    for (const tablo of ['puantaj', 'bordro', 'personel_belgeleri', 'sgk_eksik_gun']) {
      for (const s of T[tablo]) expect(per.has(s.personel_id), tablo).toBe(true)
    }
    for (const s of [...T.ders_programi, ...T.sinif_defteri]) expect(per.has(s.ogretmen_id)).toBe(true)
    for (const s of T.tahsilat_kayitlari) expect(kat.has(s.kategori_id)).toBe(true)
    for (const s of T.denetim_belgeleri) expect(mad.has(s.madde_id)).toBe(true)
    const yollar = new Set(veri.dosyalar.map(d => d.yol))
    for (const s of [...T.denetim_belgeleri, ...T.personel_belgeleri]) expect(yollar.has(String(s.dosya_yolu))).toBe(true)
  })

  it('kişi bilgileri kurgusaldır', () => {
    const tcler = [...T.ogrenciler, ...T.personel].map(s => String(s.tc))
    for (const tc of tcler) {
      expect(tc).toMatch(/^\d{11}$/)
      expect(tcAlgoritmayaUyar(tc)).toBe(false)
    }
    for (const o of T.ogrenciler) {
      expect(KURGUSAL_SOYADLAR).toContain(o.soyad)
      expect(String(o.veli_eposta)).toMatch(/@example\.com$/)
      expect(String(o.anne_tel)).toMatch(/^0 \(500\) 000 00 \d\d$/)
    }
    for (const p of T.personel) {
      expect(KURGUSAL_SOYADLAR).toContain(String(p.ad).split(' ').slice(1).join(' '))
      expect(String(p.email)).toMatch(/@example\.com$/)
      expect(String(p.iban)).toMatch(/^TR\d{2}00000/)
    }
    // Açıklamalara öğrenci adı yazılmaz
    const adlar = T.ogrenciler.map(o => `${o.ad} ${o.soyad}`)
    for (const s of [...T.hesap_hareketleri, ...T.giderler, ...T.tahsilat]) {
      for (const ad of adlar) expect(String(s.aciklama)).not.toContain(ad)
    }
  })

  it('kurgusal T.C. ve IBAN üreticileri', () => {
    const r = tohumluRastgele(1)
    for (let i = 0; i < 200; i++) expect(tcAlgoritmayaUyar(kurgusalTc(r))).toBe(false)
    expect(tcAlgoritmayaUyar('10000000146')).toBe(true) // algoritmaya uyan bilinen örnek
    // IBAN kontrol haneleri ISO 13616'ya göre geçerli
    const iban = kurgusalIban(r)
    const yeniden = (iban.slice(4) + iban.slice(0, 4)).replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55))
    let mod = 0
    for (const c of yeniden) mod = (mod * 10 + Number(c)) % 97
    expect(mod).toBe(1)
  })

  it('bordro uygulamanın kendi hesabıyla birebir aynıdır', () => {
    const ayarlar = demoAyarlari()
    const { ay, yil } = { ay: 10, yil: 2026 }
    const gelir = T.tahsilat.filter(x => x.ay === ay && x.yil === yil).reduce((s, x) => s + Number(x.tutar), 0)
    const { yeniSatirlar } = bordroSatirlariHesapla({
      ayarlar, personel: T.personel as unknown as Personel[], kaydedilmis: [], tatiller: [], ay, yil,
      puantaj: T.puantaj.filter(p => p.ay === ay && p.yil === yil) as unknown as { personel_id: number; tarih: string; saat: number }[],
      gelir: Math.round(gelir * 100) / 100,
    })
    const kayitli = T.bordro.filter(b => b.ay === ay && b.yil === yil)
    expect(kayitli).toHaveLength(yeniSatirlar.length)
    for (const s of yeniSatirlar) {
      const b = kayitli.find(k => k.personel_id === s.personel.id)!
      expect(b.net).toBe(s.sonuc.net)
      expect(b.brut).toBe(s.sonuc.brut)
    }
  })

  it('denetçi hesap kontrolü demo bordrosunda hata bulmaz', () => {
    const ayarlar = demoAyarlari()
    for (const { ay, yil } of [{ ay: 9, yil: 2026 }, { ay: 10, yil: 2026 }]) {
      const personel = T.personel as unknown as Personel[]
      const bordro = T.bordro.filter(b => b.ay === ay && b.yil === yil)
        .map(b => ({ ...b, personel: personel.find(p => p.id === b.personel_id) })) as unknown as KontrolBordro[]
      const toplamGelir = T.tahsilat.filter(x => x.ay === ay && x.yil === yil).reduce((s, x) => s + Number(x.tutar), 0)
      const sonuc = hesapKontrolEt({ ayarlar, ay, yil, toplamGelir: Math.round(toplamGelir * 100) / 100, bordro, personel })
      const hatalar = [...sonuc.genel, ...sonuc.kisiler.flatMap(k => k.bulgular)].filter(b => b.durum === 'hata').map(b => b.baslik)
      expect(hatalar, `${ay}/${yil}`).toEqual([])
    }
  })

  it('MUHSGK XML demo bordrosundan üretilebilir', () => {
    const personel = T.personel as unknown as Personel[]
    const satirlar = T.bordro.filter(b => b.ay === 10 && b.yil === 2026)
      .map(b => ({ ...b, personel: personel.find(p => p.id === b.personel_id)! })) as unknown as MuhsgkSatir[]
    const ayarlar = demoAyarlari()
    const eksikNedenleri = Object.fromEntries(T.sgk_eksik_gun.filter(e => e.ay === 10 && e.yil === 2026).map(e => [e.personel_id, String(e.kod)]))
    const girdi = { ayarlar, bilgiler: { ...MUHSGK_VARSAYILAN, ...ayarlar.muhsgk_bilgileri }, satirlar, yil: 2026, ay: 10, eksikNedenleri, iseGiris: {} }
    expect(muhsgkEksikleri(girdi)).toEqual([])
    const xml = muhsgkXml(girdi)
    expect(xml).toContain('<?xml')
    expect(xml.length).toBeGreaterThan(500)
  })

  it('örnek PDF geçerli bir PDF iskeletidir', () => {
    const pdf = new TextDecoder().decode(ornekPdf('Başlık İçeriği', ['satır']))
    expect(pdf.startsWith('%PDF-1.4')).toBe(true)
    expect(pdf).toContain('ORNEK - KURGUSAL VERI')
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true)
    const xref = Number(/startxref\n(\d+)/.exec(pdf)![1])
    expect(pdf.slice(xref, xref + 4)).toBe('xref')
  })

  it('içinde bulunulan ayın bordrosu hesaplanmamış bırakılır', () => {
    expect(T.bordro.some((b: Satir) => b.ay === 11 && b.yil === 2026)).toBe(false)
    expect(T.tahsilat.every((x: Satir) => !(x.ay === 11 && x.yil === 2026) || String(x.tarih) <= '2026-11-13')).toBe(true)
  })
})
