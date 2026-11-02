import { describe, expect, it } from 'vitest'
import { adSoyadAyir, isyeriSicilAyir, latin5Kodla, meslekKodu, muhsgkEksikleri, muhsgkXml, sgkGunleri, telefonAyir, unvanAyir, type MuhsgkSatir } from './muhsgk'
import type { Ayarlar, Personel } from './types'

const ayarlar = {
  kurum_adi: 'Vilayetler Birliği Anaokulu Çocuk Kulubü', vergi_no: '8830303024', email: 'info@ornek.com', tel: '05067776045',
  sgk_sicil_no: '285100101121536604518', sgk_araci_no: '000', sgk_kanun_no: '05510', sgk_belge_turu: '01',
} as Ayarlar

let id = 0
function satir(p: Partial<Personel>, b: Partial<MuhsgkSatir>): MuhsgkSatir {
  id++
  return {
    id, personel_id: id, ay: 9, yil: 2026, toplam_saat: 0, gv_oran: 0, sgk_kisi: 0, sgk_issizlik_kisi: 0, sgk_isveren: 0,
    toplam_kesinti: 0, net: 0, odendi: false, brut: 0, gv_tutar: 0, damga_tutar: 0, ...b,
    personel: { id, ad: '', gorev: 'Öğretmen', sgk_li: true, vergi_istisnasi: false, yillik_matrah: 0, tc: '11111111110', meslek_kodu: '2359.31', ...p },
  }
}

describe('MUHSGK yardımcıları', () => {
  it('unvanı ilk 30 karakterden böler', () => {
    expect(unvanAyir(ayarlar.kurum_adi)).toEqual({ soyadi: 'VİLAYETLER BİRLİĞİ ANAOKULU ÇO', adi: 'CUK KULUBÜ' })
  })
  it('telefon, meslek kodu, ad soyad ve sicil', () => {
    expect(telefonAyir('0 (506) 777 60 45')).toEqual({ alanKodu: '506', telNo: '7776045' })
    expect(meslekKodu('411007')).toBe('4110.07')
    expect(adSoyadAyir('Hamide Karataş Demircan')).toEqual({ ad: 'HAMİDE', soyad: 'KARATAŞ DEMİRCAN' })
    expect(isyeriSicilAyir('285100101121536604518')).toEqual({ yeniSube: '01', eskiSube: '01', siraNo: '1215366', il: '045' })
  })
  it('işe giriş ayın günlerini kısaltır', () => {
    expect(sgkGunleri(0, 18, 2026, 9)).toEqual({ gun: 1, eksik: 12 })
    expect(sgkGunleri(28, 19, 2026, 9)).toEqual({ gun: 4, eksik: 8 })
    expect(sgkGunleri(225, null, 2026, 9)).toEqual({ gun: 30, eksik: 0 })
  })
  it('Türkçe harfleri ISO-8859-9 olarak kodlar', () => {
    expect([...latin5Kodla('ĞİŞğışÇÖÜ')]).toEqual([0xd0, 0xdd, 0xde, 0xf0, 0xfd, 0xfe, 0xc7, 0xd6, 0xdc])
  })
})

describe('muhsgkXml', () => {
  const satirlar = [
    satir({ ad: 'ARZU YILDIRIM', meslek_kodu: '4110.07' }, { brut: 4555.53, gv_matrah: 3872.2, gv_tutar: 774.44, damga_tutar: 34.58 }),
    satir({ ad: 'FATMA UDÜL' }, { brut: 22125.95, toplam_saat: 52, gv_matrah: 18807.06, gv_istisna_tutari: 2821.06, dv_istisna_tutari: 167.94 }),
    satir({ ad: 'RAİFE ECE', is_retired: true, meslek_kodu: '9622.01' }, { brut: 3037.02, gv_matrah: 2809.24, gv_tutar: 561.85, damga_tutar: 23.05 }),
    satir({ ad: 'KEZBAN RAKICI ÖZCAN', sgk_li: false }, { brut: 15944.36, gv_matrah: 15944.36, gv_tutar: 3407.05, damga_tutar: 121.02 }),
    satir({ ad: 'MANİSA İL MEM', sgk_li: false, gorev: 'Denetim Yetkilisi' }, { brut: 2277.77 }),
  ]
  const g = {
    ayarlar, satirlar, yil: 2026, ay: 9, bilgiler: { vd_kodu: '045252' },
    eksikNedenleri: Object.fromEntries(satirlar.map(s => [s.personel_id, '06'])),
    iseGiris: Object.fromEntries(satirlar.map(s => [s.personel_id, 18])),
  }
  const xml = muhsgkXml(g)

  it('muhtasar matrahlarını SGK’lı (012), SGK’sız (018) ve damga (302) olarak ayırır; denetim payını almaz', () => {
    expect(xml).toContain('<turKodu>012</turKodu>\n\t\t\t\t<gayrisafiTutar>29718.50</gayrisafiTutar>\n\t\t\t\t<kesintiTutari>1336.29</kesintiTutari>')
    expect(xml).toContain('<turKodu>018</turKodu>\n\t\t\t\t<gayrisafiTutar>15944.36</gayrisafiTutar>')
    expect(xml).toContain('<turKodu>302</turKodu>\n\t\t\t\t<gayrisafiTutar>45662.86</gayrisafiTutar>\n\t\t\t\t<kesintiTutari>178.65</kesintiTutari>')
    expect(xml).toContain('<toplamCalisan>4</toplamCalisan>')
    expect(xml).toContain('<sgkMuaf>1</sgkMuaf>')
    expect(xml).toContain('<odenecek>4743.34</odenecek>')
    expect(xml).not.toContain('MANİSA')
  })

  it('SGK bildirimine yalnız SGK’lıları, emekliyi 02/00000 belgeyle yazar', () => {
    expect(xml.match(/<sgkCalisanBilgisi>/g)).toHaveLength(3)
    expect(xml).toContain('<belgeTuru>02</belgeTuru>\n            <kanun>00000</kanun>')
    expect(xml).toContain('<ad>FATMA</ad>\n            <soyad>UDÜL</soyad>\n            <gun>7</gun>')
    expect(xml).toContain('<iseGirisGun>18</iseGirisGun>\n            <iseGirisAy>09</iseGirisAy>\n            <eksikGunSayisi>6</eksikGunSayisi>\n            <eksikGunNedeni>6</eksikGunNedeni>')
    expect(xml).toContain('<hgv>2821.06</hgv>\n            <aUIstisnaGV>2821.06</aUIstisnaGV>\n            <gvKesinti>0.00</gvKesinti>')
    expect(xml).toContain('<isyeriSiraNo>1215366</isyeriSiraNo>\n            <isyeriIlKod>045</isyeriIlKod>')
  })

  it('mükellef bilgisini GİB düzeninde yazar', () => {
    expect(xml).toContain('<vdKodu>045252</vdKodu>')
    expect(xml).toContain('<hsv sifat="kendisi">')
    expect(xml).toContain('<alanKodu>506</alanKodu>')
    expect(xml).not.toContain('<duzenleyen>')
    expect(muhsgkXml({ ...g, bilgiler: { vd_kodu: '045252', duzenleyen_vkn: '2120101292', duzenleyen_ad: 'Mehmet', duzenleyen_soyad: 'Coşar' } })).toContain('<soyadi>COŞAR</soyadi>')
  })

  it('eksik bilgileri listeler', () => {
    expect(muhsgkEksikleri(g)).toEqual([])
    expect(muhsgkEksikleri({ ...g, bilgiler: {}, eksikNedenleri: {} })).toContain('Vergi dairesi kodu (6 hane) girilmemiş')
    expect(muhsgkEksikleri({ ...g, eksikNedenleri: {} }).some(e => e.includes('eksik gün nedeni'))).toBe(true)
  })
})
