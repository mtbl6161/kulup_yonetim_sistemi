import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { HesapKontrolSonuc } from './hesapKontrol'

// Supabase sorgularını tablo başına sabit veriyle taklit eder (filtreler yok sayılır; maybeSingle ilk satırı döner)
const tablolar: Record<string, unknown[]> = {}
vi.mock('./supabase', () => {
  const sorgu = (tablo: string) => {
    let tek = false
    const zincir: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'neq', 'or', 'order', 'limit', 'in']) zincir[m] = () => zincir
    zincir.maybeSingle = () => { tek = true; return zincir }
    zincir.then = (coz: (r: { data: unknown }) => unknown) => {
      const satirlar = tablolar[tablo] || []
      return Promise.resolve({ data: tek ? satirlar[0] ?? null : satirlar }).then(coz)
    }
    return zincir
  }
  return { supabase: { from: sorgu } }
})

const { ek6OnDoldur, eksikMaddeler, hesaptanOneriler, bosEvetHayir } = await import('./ek6')

const bulgu = (baslik: string, durum: string) => ({ baslik, durum })
const hesap = (genel: unknown[], kisiler: unknown[]) => ({ genel, kisiler } as unknown as HesapKontrolSonuc)

beforeEach(() => {
  tablolar.ayarlar = [{ kurum_adi: 'Örnek Anaokulu', tel: '0236 000 00 00', email: 'okul@meb.k12.tr', mudur_adi: 'Ali Veli', yemek: true }]
  tablolar.kulup_bilgileri = [{ okul_id: 1, kurum_kodu: '123456', web_adresi: 'ornek.meb.k12.tr', ogretim_sekli: 'Normal öğretim',
    acilis_onay_tarihi: '2025-09-01', acilis_onay_sayisi: 'E-1', faaliyet_turleri: 'Drama', etkinlik_alanlari: ['Bahçe', 'Sınıf'],
    etkinlik_alanlari_diger: 'Ortak oyun alanı', ek2_sozlesme: true, ek4_kayit: true, ek5_acil: false }]
  tablolar.personel = [
    { gorev: 'Öğretmen', aktif: true }, { gorev: 'Öğretmen', aktif: true }, { gorev: 'Usta Öğretici', aktif: true },
    { gorev: 'Koordinatör Öğretmen', aktif: true }, { gorev: 'Temizlik Personeli', aktif: true }, { gorev: 'Öğretmen', aktif: false },
  ]
  tablolar.ogrenciler = [
    { aktif: true, ucretsiz_mi: false, ogrenci_turu: 'kulup' }, { aktif: true, ucretsiz_mi: true, ogrenci_turu: 'kulup' },
    { aktif: true, ucretsiz_mi: false, ogrenci_turu: 'okul' }, { aktif: false, ucretsiz_mi: false, ogrenci_turu: 'kulup' },
  ]
  tablolar.denetim_raporlari = [{ denetim_tarihi: '2026-09-15', denetciler: [{ ad: 'Ayşe Denetçi', unvan: 'Şube Müdürü' }],
    cevaplar: { fiziki: false, beslenme: false, temizlik: true, diger: 'Sınıf panosu güncel değil.' } }]
})

describe('EK-6 ön doldurma', () => {
  it('sistem, kulüp bilgileri ve önceki rapordan doldurur', async () => {
    const { cevaplar: c, baskanAd } = await ek6OnDoldur(1, 2026, 10, null)
    expect(baskanAd).toBe('Ali Veli')
    expect(c).toMatchObject({
      kurum_kodu: '123456', kurum_adi: 'Örnek Anaokulu', ogretim_sekli: 'Normal öğretim',
      ogretmen_sayisi: '2', usta_sayisi: '1', okul_ogrenci: '3', kulup_ogrenci: '2', ucretsiz_ogrenci: '1',
      acilis_onay: '01.09.2025 / E-1', etkinlik_alanlari: 'Bahçe, Sınıf, Ortak oyun alanı', ek2: true, ek5: false, beslenme: true,
      onceki_tarih: '15.09.2026', onceki_denetciler: 'Ayşe Denetçi', onceki_eksik: true,
    })
    // "Yemek verilmiyor" eksiklik sayılmaz; olumsuz cevap ve "diğer hususlar" sayılır
    expect(c.eksiklikler).toContain('fiziki imkânları')
    expect(c.eksiklikler).toContain('Sınıf panosu güncel değil.')
    expect(c.eksiklikler).not.toContain('beslenme')
  })

  it('önceki rapor yoksa önceki denetim alanları boş kalır', async () => {
    tablolar.denetim_raporlari = []
    const { cevaplar: c } = await ek6OnDoldur(1, 2026, 10, null)
    expect(c).toMatchObject({ onceki_tarih: '', onceki_denetciler: '', onceki_eksik: null, eksiklikler: '' })
  })
})

describe('hesap kontrolünden öneriler', () => {
  it('sorunsuz hesapta olumlu, sorunlu bulguda olumsuz önerir', () => {
    expect(hesaptanOneriler(hesap([bulgu('Dağıtım oranları', 'ok')], [{ gorev: 'Usta Öğretici', bulgular: [] }])))
      .toEqual({ odeme_oran: true, vergi_matrah: true, usta_sgk: true })
    expect(hesaptanOneriler(hesap([bulgu('Yönergeden farklı dağıtım oranı', 'uyari')], [
      { gorev: 'Öğretmen', bulgular: [bulgu('Gelir vergisi matrahı hatalı', 'hata')] },
      { gorev: 'Usta Öğretici', bulgular: [bulgu('SGK işçi payı hatalı', 'hata')] },
    ]))).toEqual({ odeme_oran: false, vergi_matrah: false, usta_sgk: false })
  })

  it('usta öğretici yoksa o soruyu boş bırakır, hesap yoksa öneri vermez', () => {
    expect(hesaptanOneriler(hesap([], [])).usta_sgk).toBeNull()
    expect(hesaptanOneriler(null)).toEqual({})
  })
})

describe('yardımcılar', () => {
  it('olumsuz evet/hayır cevaplarını eksik sayar, yemek hizmetini saymaz', () => {
    expect(eksikMaddeler({ fiziki: false, beslenme: false, temizlik: true })).toHaveLength(1)
  })
  it('cevapsız evet/hayır sorularını bulur', () => {
    expect(bosEvetHayir({ fiziki: true }).map(s => s.anahtar)).not.toContain('fiziki')
    expect(bosEvetHayir({}).length).toBeGreaterThan(10)
  })
})
