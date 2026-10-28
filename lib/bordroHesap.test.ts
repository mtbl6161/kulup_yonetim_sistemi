import { describe, it, expect } from 'vitest'
import { bordroSatirlariHesapla } from './bordroHesap'
import type { Ayarlar, Personel } from './types'

const ayarlar = {
  saat_ucreti: 200, gunluk_saat: 6, damga_vergi_orani: 0.00759,
  vergi_dilimleri: [{ ust: 158000, oran: 0.15 }, { ust: 1e12, oran: 0.40 }],
} as Ayarlar

const kisi = (id: number, ad: string, gorev: string, ek: Partial<Personel> = {}) =>
  ({ id, ad, gorev, aktif: true, sgk_li: false, tc: String(10000000000 + id), ...ek }) as Personel

describe('aylık bordro dağıtımı', () => {
  // Ekim 2026: 10 saat öğretmen puantajı (iş günü), 10.000 TL tahsilat
  const girdi = {
    ayarlar,
    personel: [kisi(1, 'Ayşe Öğretmen', 'Öğretmen'), kisi(2, 'Mehmet Başkan', 'Kulüp Başkanı')],
    kaydedilmis: [{ id: 99, personel_id: 2, odendi: true }],
    puantaj: [{ personel_id: 1, tarih: '2026-10-05', saat: 6 }, { personel_id: 1, tarih: '2026-10-06', saat: 4 }],
    tatiller: [],
    ay: 10, yil: 2026, gelir: 10000,
  }

  it('öğretmen havuzu (%55) saate bölünür: 5.500 / 10 saat = 550 TL saat ücreti', () => {
    const { yeniSatirlar } = bordroSatirlariHesapla(girdi)
    const ogretmen = yeniSatirlar.find(s => s.personel.id === 1)!
    expect(ogretmen.toplamSaat).toBe(10)
    expect(ogretmen.saatUcreti).toBe('550,00')
    expect(ogretmen.sonuc.brut).toBe(5500)
  })

  it('başkan payı (%7) tek başkana gider ve önceki "ödendi" bilgisi korunur', () => {
    const { yeniSatirlar } = bordroSatirlariHesapla(girdi)
    const baskan = yeniSatirlar.find(s => s.personel.id === 2)!
    expect(baskan.sonuc.brut).toBe(700)
    expect(baskan.saatUcreti).toBe('%7')
    expect(baskan.odendi).toBe(true)
    expect(baskan.bordroId).toBe(99)
  })

  it('tatil günündeki saat sayılmaz', () => {
    const { yeniSatirlar } = bordroSatirlariHesapla({ ...girdi, puantaj: [...girdi.puantaj, { personel_id: 1, tarih: '2026-10-29', saat: 6 }] })
    expect(yeniSatirlar.find(s => s.personel.id === 1)!.toplamSaat).toBe(10)
  })

  it('görev tavanı öğretmen payını sınırlar', () => {
    const { yeniSatirlar } = bordroSatirlariHesapla({ ...girdi, ayarlar: { ...ayarlar, tavan_katsayi: 1000 } })
    expect(yeniSatirlar.find(s => s.personel.id === 1)!.sonuc.brut).toBe(3000) // 1.000 × %300
  })

  it('denetim yetkilisinde brüt = net, kesinti yok', () => {
    const { yeniSatirlar } = bordroSatirlariHesapla({ ...girdi, personel: [...girdi.personel, kisi(3, 'Can Denetçi', 'Denetim Yetkilisi')] })
    const d = yeniSatirlar.find(s => s.personel.id === 3)!
    expect(d.sonuc.brut).toBe(100) // %1
    expect(d.sonuc.net).toBe(100)
    expect(d.sonuc.toplam_kesinti).toBe(0)
  })
})
