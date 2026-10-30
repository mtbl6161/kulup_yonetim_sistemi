import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Ayarlar } from './types'

// Supabase sorgularını tablo başına sabit veriyle taklit eder (zincirdeki filtreler yok sayılır)
const tablolar: Record<string, unknown[]> = {}
vi.mock('./supabase', () => {
  const sorgu = (tablo: string) => {
    const zincir: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'gt', 'gte', 'lte', 'in', 'or', 'order', 'limit']) zincir[m] = () => zincir
    zincir.then = (coz: (r: { data: unknown[] }) => unknown) => Promise.resolve({ data: tablolar[tablo] || [] }).then(coz)
    return zincir
  }
  return { supabase: { from: sorgu } }
})

const { saatUcretiBul, tavaniAsanKoordinatorler, tavanAciklamasi } = await import('./koordinatorTavan')

// Ekim 2026, tavan katsayısı 10.000 → koordinatör tavanı %275 = 27.500 TL
const ayarlar = { tavan_katsayi: 10000 } as Ayarlar
const ekimGunu = (gun: number) => `2026-10-${String(gun).padStart(2, '0')}`

beforeEach(() => {
  tablolar.tatiller = []
  tablolar.personel = [
    { id: 1, ad: 'Zeynep Kaya', gorev: 'Öğretmen', sgk_li: false },
    { id: 9, ad: 'Ayşe Doğan', gorev: 'Koordinatör Öğretmen', sgk_li: false },
  ]
  // Eylül bordrosu: öğretmen 100 saat × 250 = 25.000 → saat ücreti 250
  tablolar.bordro = [{ personel_id: 1, ay: 9, yil: 2026, brut: 25000, toplam_saat: 100 }]
  // Koordinatörün Ekim'de 5 iş gününde 20'şer saati var (100 saat)
  tablolar.puantaj = [5, 6, 7, 8, 9].map(g => ({ personel_id: 9, tarih: ekimGunu(g), saat: 20 }))
})

describe('koordinatör tavan kontrolü', () => {
  it('saat ücreti elle girilmişse onu, yoksa geçen ayın bordrosunu (tahmini) kullanır', async () => {
    expect(await saatUcretiBul({ ...ayarlar, ogretmen_saat_ucreti: 300 } as Ayarlar, 1, 10, 2026)).toMatchObject({ ucret: 300, tahmini: false })
    expect(await saatUcretiBul(ayarlar, 1, 10, 2026)).toMatchObject({ ucret: 250, tahmini: true })
  })

  it('tavana karşılık gelen saati aşacak eklemeyi yakalar', async () => {
    // 27.500 / 250 = 110 saat sınır; 100 + 15 = 115 → aşar
    const asan = await tavaniAsanKoordinatorler({ ayarlar, okulId: 1, ay: 10, yil: 2026, ekSaat: new Map([[9, 15]]) })
    expect(asan).toHaveLength(1)
    expect(asan[0]).toMatchObject({ ad: 'Ayşe Doğan', mevcut: 100, ek: 15, sinir: 110, tavan: 27500 })
    expect(tavanAciklamasi(asan)).toContain('Aşan 5 saat ücrete yansımaz')
  })

  it('sınırın altında kalan eklemede uyarı vermez', async () => {
    expect(await tavaniAsanKoordinatorler({ ayarlar, okulId: 1, ay: 10, yil: 2026, ekSaat: new Map([[9, 10]]) })).toHaveLength(0)
  })

  it('yeniden yazılacak günleri mevcut saate katmaz', async () => {
    // 5 ve 6 Ekim yeniden yazılacak → mevcut 60 saat; 60 + 45 = 105 ≤ 110
    expect(await tavaniAsanKoordinatorler({ ayarlar, okulId: 1, ay: 10, yil: 2026, ekSaat: new Map([[9, 45]]), haricGunler: [5, 6] })).toHaveLength(0)
  })

  it('saat ücreti bilinmiyorsa uyarı vermez', async () => {
    tablolar.bordro = []
    expect(await tavaniAsanKoordinatorler({ ayarlar, okulId: 1, ay: 10, yil: 2026, ekSaat: new Map([[9, 500]]) })).toHaveLength(0)
  })
})
