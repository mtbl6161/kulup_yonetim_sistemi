import { describe, it, expect } from 'vitest'
import {
  gunSayisi, isGunuSayisi, tatilMi, saatUcretiHesapla, ogrenciUcretiHesapla,
  gelirVergisiHesapla, gorevTavanYuzdesi, tavanHesapla, bordroHesapla, tahakkukDagitimHesapla,
} from './hesaplama'
import type { Ayarlar } from './types'

// Beklenen değerler elle hesaplandı; her testin yanında işlem yazılı.
const DILIMLER = [
  { ust: 158000, oran: 0.15 },
  { ust: 330000, oran: 0.20 },
  { ust: 1200000, oran: 0.27 },
  { ust: 4300000, oran: 0.35 },
  { ust: 1e12, oran: 0.40 },
]

const ayarlar = (ek: Partial<Ayarlar> = {}) => ({
  saat_ucreti: 200,
  gunluk_saat: 6,
  damga_vergi_orani: 0.00759,
  vergi_dilimleri: DILIMLER,
  ...ek,
}) as Ayarlar

describe('tarih yardımcıları', () => {
  it('ayın gün sayısı (artık yıl dahil)', () => {
    expect(gunSayisi(2026, 2)).toBe(28)
    expect(gunSayisi(2028, 2)).toBe(29)
    expect(gunSayisi(2026, 10)).toBe(31)
  })

  it('Ekim 2026 iş günü: 22 hafta içi − 29 Ekim = 21', () => {
    expect(isGunuSayisi(2026, 10)).toBe(21)
  })

  it('okula özel tatil aralığı iş gününden düşer', () => {
    const tatil = [{ baslangic_tarihi: '2026-10-05', bitis_tarihi: '2026-10-09' }] // Pzt–Cum
    expect(tatilMi(10, 7, 2026, tatil)).toBe(true)
    expect(tatilMi(10, 12, 2026, tatil)).toBe(false)
    expect(isGunuSayisi(2026, 10, tatil)).toBe(16)
  })
})

describe('ücretler', () => {
  it('saat ücreti: gösterge × katsayı / bölen (6, 4, yemekli 3)', () => {
    expect(saatUcretiHesapla(140, 1.2, false, 'min')).toBeCloseTo(28, 6)
    expect(saatUcretiHesapla(140, 1.2, false, 'max')).toBeCloseTo(42, 6)
    expect(saatUcretiHesapla(140, 1.2, true)).toBeCloseTo(56, 6)
  })

  it('öğrenci ücreti: iş günü × günlük saat × saat ücreti, kardeşe %25 indirim', () => {
    expect(ogrenciUcretiHesapla(ayarlar(), 2026, 10, false)).toBe(21 * 6 * 200)
    expect(ogrenciUcretiHesapla(ayarlar(), 2026, 10, true)).toBe(21 * 6 * 200 * 0.75)
    expect(ogrenciUcretiHesapla(ayarlar(), 2026, 10, true, [], 60)).toBe(60 * 200 * 0.75)
  })
})

describe('gelir vergisi (kademeli)', () => {
  it('ilk dilimde', () => {
    expect(gelirVergisiHesapla(100000, DILIMLER)).toEqual({ oran: 0.15, tutar: 15000 })
  })
  it('dilim aşımı yalnızca aşan kısmı üst orandan vergiler: 158000×%15 + 42000×%20', () => {
    expect(gelirVergisiHesapla(200000, DILIMLER)).toEqual({ oran: 0.20, tutar: 32100 })
  })
  it('sıfır matrah', () => {
    expect(gelirVergisiHesapla(0, DILIMLER)).toEqual({ oran: 0, tutar: 0 })
  })
})

describe('görev tavanları (Yönerge md. 16)', () => {
  it('yüzdeler', () => {
    expect(gorevTavanYuzdesi('Koordinatör Öğretmen')).toBe(275)
    expect(gorevTavanYuzdesi('Kulüp Başkanı')).toBe(275)
    expect(gorevTavanYuzdesi('Müdür Yardımcısı')).toBe(250)
    expect(gorevTavanYuzdesi('Temizlik Personeli')).toBe(200)
    expect(gorevTavanYuzdesi('Muhasebe Personeli')).toBe(200)
    expect(gorevTavanYuzdesi('Öğretmen', false)).toBe(300)
    expect(gorevTavanYuzdesi('Öğretmen', true)).toBe(400)
    expect(gorevTavanYuzdesi('Usta Öğretici')).toBe(400)
  })
  it('tavan tutarı = katsayı × yüzde', () => {
    expect(tavanHesapla('Öğretmen', 1000, false)).toBe(3000)
  })
})

describe('bordro', () => {
  it("SGK'lı: 100 saat × 200 = 20.000 brüt", () => {
    const s = bordroHesapla(ayarlar(), 100, 0, true, false)
    expect(s.brut).toBe(20000)
    expect(s.sgk_kisi).toBe(2800)          // %14
    expect(s.sgk_issizlik).toBe(200)       // %1
    expect(s.gv_matrah).toBe(17000)
    expect(s.gv).toBe(2550)                // 17.000 × %15
    expect(s.dv).toBeCloseTo(151.8, 2)     // 20.000 × binde 7,59
    expect(s.toplam_kesinti).toBeCloseTo(5701.8, 2)
    expect(s.net).toBeCloseTo(14298.2, 2)
    expect(s.sgk_isveren).toBe(7550)       // %2,25 + %20 + %12,5 + %3
  })

  it('emekli (SGDP): kişi %7,5, işsizlik yok, işveren %24,5', () => {
    const s = bordroHesapla(ayarlar(), 100, 0, true, true)
    expect(s.sgk_kisi).toBe(1500)
    expect(s.sgk_issizlik).toBe(0)
    expect(s.gv).toBe(2775)                // 18.500 × %15
    expect(s.net).toBeCloseTo(15573.2, 2)
    expect(s.sgk_isveren).toBe(4900)
  })

  it('kadrolu: SGK kesintisi yok', () => {
    const s = bordroHesapla(ayarlar(), 100, 0, false, false)
    expect(s.sgk_kisi + s.sgk_issizlik + s.sgk_isveren).toBe(0)
    expect(s.gv).toBe(3000)
    expect(s.net).toBeCloseTo(16848.2, 2)
  })

  it('kümülatif matrah: yılbaşından 150.000 sonra bu ayın 17.000 matrahı dilimi aşar', () => {
    // GV(167.000) − GV(150.000) = (23.700 + 9.000×%20) − 22.500 = 3.000
    const s = bordroHesapla(ayarlar(), 100, 150000, true, false)
    expect(s.gv).toBe(3000)
    expect(s.gv_oran).toBe(0.20)
  })

  it('asgari ücret istisnası hesaplanan vergiyi aşamaz', () => {
    const s = bordroHesapla(ayarlar({ asgari_ucret: 33030 }), 100, 0, true, false, undefined, undefined, true)
    expect(s.gv_istisna).toBe(2550)
    expect(s.gv).toBe(0)
    expect(s.dv).toBe(0)
    expect(s.net).toBe(17000)
  })

  it('personele özel sabit istisna tutarı', () => {
    const s = bordroHesapla(ayarlar(), 100, 0, true, false, undefined, undefined, true, { gv: 400, dv: 50 })
    expect(s.gv).toBe(2150)
    expect(s.dv).toBeCloseTo(101.8, 2)
    expect(s.net).toBeCloseTo(14748.2, 2)
  })

  it('görev tavanı brütü sınırlar', () => {
    const s = bordroHesapla(ayarlar({ tavan_katsayi: 1000 }), 100, 0, false, false, 'Öğretmen')
    expect(s.brut).toBe(3000)
  })

  it('havuzdan gelen brüt saat hesabının yerine geçer', () => {
    expect(bordroHesapla(ayarlar(), 0, 0, false, false, undefined, 12345.678).brut).toBe(12345.68)
  })
})

describe('tahakkuk dağılımı', () => {
  it('varsayılan oranlar: %26 temel, %55 öğretmen, %7/%5/%2/%4/%1', () => {
    const t = tahakkukDagitimHesapla(10000, ayarlar())
    expect(t.ogretmen_havuzu).toBe(5500)
    expect(t.baskan).toBe(700)
    expect(t.baskan_yrd).toBe(500)
    expect(t.muhasebe).toBe(200)
    expect(t.temizlik).toBe(400)
    expect(t.denetim).toBe(100)
    expect(t.temel_gider).toBe(2600)
    expect(t.temel_gider + t.ogretmen_havuzu + t.baskan + t.baskan_yrd + t.muhasebe + t.temizlik + t.denetim).toBe(10000)
  })

  it('görevlisi olmayan kategorinin payı temel gidere eklenir', () => {
    const t = tahakkukDagitimHesapla(10000, ayarlar(), { baskan: false, baskan_yrd: true, muhasebe: true, temizlik: true, denetim: true })
    expect(t.baskan).toBe(0)
    expect(t.pct_temel_gider).toBe(33)
    expect(t.temel_gider).toBe(3300)
  })

  it('kuruş farkı temel giderde toplanır, toplam bozulmaz', () => {
    const t = tahakkukDagitimHesapla(1234.57, ayarlar())
    const toplam = t.temel_gider + t.ogretmen_havuzu + t.baskan + t.baskan_yrd + t.muhasebe + t.temizlik + t.denetim
    expect(Math.round(toplam * 100) / 100).toBe(1234.57)
  })
})
