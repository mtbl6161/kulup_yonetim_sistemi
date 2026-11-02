import { describe, expect, it } from 'vitest'
import { aciklamayiAyristir, aylikDonem, donemlikDonem, hedefleriHazirla, odemeTahminEt, ogrenciEslestir } from './ekstreEslesme'
import type { Ogrenci, TahsilatKategori } from './types'

let id = 0
const ogr = (ad: string, soyad: string, sinif: string, tur: 'kulup' | 'okul' = 'okul'): Ogrenci =>
  ({ id: ++id, ad, soyad, sinif, ogrenci_turu: tur, kardes_indirimi: false, ucretsiz_mi: false })
const kat = (k: Partial<TahsilatKategori>): TahsilatKategori =>
  ({ id: ++id, ad: '', tip: 'aylik', veri_kaynagi: 'manuel', kapsam: 'tumu', aktif: true, ...k })

const ogrenciler = [
  ogr('AYBÜKE', 'ARAS', '3B'), ogr('AYBÜKE', 'KARAN', '3/A', 'kulup'),
  ogr('MUHAMMED ILGAZ', 'KIROĞLU', '4B'), ogr('MUHAMMED BUĞRA', 'KIROĞLU', '4C'),
  ogr('DEVRİM', 'DURMAZ', '4C'), ogr('İPEK', 'AYDEMİR', '3B'), ogr('DENİZ', 'AYDEMİR', '3B'),
  ogr('REMZİ', 'GÜREL', '4C'), ogr('MİRAY', 'BİR', '3B'), ogr('HAFSA', 'CAN', '5/A', 'kulup'),
  ogr('EGE', 'ŞEN', '4C'), ogr('HÜSEYİN EGE', 'ÖZKÜÇÜK', '3B'),
]
const [, karan, ilgaz, , durmaz, , , remzi, miray, hafsa, ege, ozkucuk] = ogrenciler
const kirtasiye = kat({ ad: 'kırtasiye ücreti', tip: 'tek_seferlik', varsayilan_tutar: 6500, varsayilan_tutar_okul: 4000 })
const personel = kat({ ad: 'personel ücreti', tip: 'donemlik', varsayilan_tutar: 6000, varsayilan_tutar_okul: 6000 })
const sabahci = kat({ ad: 'SABAHÇI AİDAT', kapsam: 'secili', varsayilan_tutar_okul: 2600 })
const ogleci = kat({ ad: 'ÖĞLECİ AİDAT', kapsam: 'secili', varsayilan_tutar_okul: 3250 })
const uyelikler = [
  { kategori_id: sabahci.id, ogrenci_id: remzi.id },
  { kategori_id: ogleci.id, ogrenci_id: miray.id }, { kategori_id: ogleci.id, ogrenci_id: ilgaz.id },
]
const hedefler = hedefleriHazirla([kirtasiye, personel, sabahci, ogleci], uyelikler, { dahil: false })
const tahmin = (aciklama: string, tutar: number, tarih = '2026-09-15') => odemeTahminEt(aciklama, tutar, tarih, ogrenciler, hedefler)

describe('aciklamayiAyristir', () => {
  it('ödeyeni, sınıfı ve ayı ayırır; banka adını atar', () => {
    const a = aciklamayiAyristir("BARIŞ ÖZTÜRK 'DAN Beray Öztürk 4-B sınıfı Kırtasiye ücreti , Türkiye İş Bankası")
    expect(a.odeyen).toBe('baris ozturk')
    expect(a.hedef).not.toContain('bank')
    expect(a.sinifIpucu).toBe('4b')
    expect(aciklamayiAyristir("NUR YİĞİT BİR 'DAN Miray BİR Ekim ayı ücreti , Akbank T.A.Ş.").ayIpucu).toBe(10)
    expect(aciklamayiAyristir('MERVE ZORLU ÖZYURT            /DURU ÖZYURT KIRTASIYE').hedef).toBe('duru ozyurt kirtasiye')
  })
  it('iade ve devirleri öğrenci ödemesi saymaz', () => {
    expect(aciklamayiAyristir('SİMAY BAĞDU SEHVEN YATIRILAN KIRTASİYE ÜCRETİ İADESİ').odemeDegil).toBe(true)
    expect(aciklamayiAyristir('2025-2026 eğitim öğretim +yaz okul dahil devri').odemeDegil).toBe(true)
  })
})

describe('ogrenciEslestir', () => {
  it('kelime bazında eşleşir, alt dizgeye kanmaz', () => {
    expect(ogrenciEslestir('ege sen', null, ogrenciler)?.ogrenci).toBe(ege)
    expect(ogrenciEslestir('devrim durmazin okul parasi', null, ogrenciler)?.ogrenci).toBe(durmaz)
    expect(ogrenciEslestir('ege ozkucuk kirtasiye', null, ogrenciler)).toMatchObject({ ogrenci: ozkucuk, belirgin: true })
  })
  it('aynı soyadlı kardeşleri ve yalnız adı tutanları ayırt eder', () => {
    expect(ogrenciEslestir('muhammed ilgaz kiroglu', null, ogrenciler)).toMatchObject({ ogrenci: ilgaz, belirgin: true })
    expect(ogrenciEslestir('aybuke karan 3a', '3a', ogrenciler)).toMatchObject({ ogrenci: karan, belirgin: true })
    expect(ogrenciEslestir('ipek aydemir ve deniz aydemir', null, ogrenciler)).toMatchObject({ coklu: true, belirgin: false })
  })
})

describe('odemeTahminEt', () => {
  it('ödeme türünü açıklamadan bulur ve otomatik işaretler', () => {
    expect(tahmin("HALİL 'DAN Hafsa can kırtasiye , Akbank", 6500)).toMatchObject({ ogrenciId: hafsa.id, hedef: `k${kirtasiye.id}`, isaretle: true, tutaraGore: false })
    expect(tahmin("NUR 'DAN Miray BİR Eylül ayı ücreti , Akbank", 3250)).toMatchObject({ hedef: `k${ogleci.id}`, ay: 9, isaretle: true })
    expect(tahmin("X 'DAN Muhammed Ilgaz KIROĞLU 1B ÖĞLECİ GRUP KIRTASİYE ÜCRETİ", 4000).hedef).toBe(`k${kirtasiye.id}`)
  })
  it('açıklamada tür yoksa tek uyan tutara göre seçer', () => {
    expect(tahmin("MUAMMER GÜREL 'DAN Remzi GÜREL , Yapı ve Kredi", 2600)).toMatchObject({ hedef: `k${sabahci.id}`, tutaraGore: true, isaretle: true })
    expect(tahmin("BİLAL CAN 'DAN 52300406426 Hafsa can , Yapı ve Kredi", 6000)).toMatchObject({ hedef: `k${personel.id}`, isaretle: true })
  })
  it('belirsiz satırları işaretlemez, nedenini söyler', () => {
    expect(tahmin("ERKAN 'DAN İpek Aydemir ve Deniz Aydemir , Yapı", 8000)).toMatchObject({ isaretle: false })
    expect(tahmin("POYRAZ 'DAN Remzi Gürel eylul ayi okul parasi,kirtasiye,temizlik", 21085)).toMatchObject({ isaretle: false, uyari: 'Birden fazla ödeme içeriyor olabilir' })
    expect(tahmin("HALİME KIROĞLU 'DAN GELEN FAST ODEMESİ , Akbank", 2000)).toMatchObject({ isaretle: false })
    expect(tahmin('PARS NOYAN ÇOBAN SEHVEN YATIRILAN PERSONEL ÜCRETİN İADESİ', 6000)).toMatchObject({ odemeDegil: true, uyari: null })
  })
})

describe('dönem hesabı', () => {
  it('aylık ödemeyi eğitim yılına, dönemliği yarıyıla yerleştirir', () => {
    expect(aylikDonem('2026-09-15', 9)).toBe('2026-09')
    expect(aylikDonem('2026-12-20', 1)).toBe('2027-01')
    expect(aylikDonem('2027-02-03', 12)).toBe('2026-12')
    expect(donemlikDonem('2026-09-15')).toBe('2026-D1')
    expect(donemlikDonem('2027-01-10')).toBe('2026-D1')
    expect(donemlikDonem('2027-03-01')).toBe('2026-D2')
  })
})
