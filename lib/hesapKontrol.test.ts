import { describe, it, expect } from 'vitest'
import { hesapKontrolEt, istisnaKartiOlustur, type KontrolBordro } from './hesapKontrol'
import type { Ayarlar, Personel } from './types'

const ayarlar = {
  asgari_ucret: 26005.5, sgk_kisi_pay: 0.14, sgk_issizlik_kisi: 0.01, damga_vergi_orani: 0.00759,
  vergi_dilimleri: [{ ust: 158000, oran: 0.15 }, { ust: 1e12, oran: 0.40 }], tavan_katsayi: 50000,
} as Ayarlar

// Eylül bordrosu asgari ücret istisnası uygulanarak hesaplanmış; personel kartında istisna sonradan (Ekim için) kapatılmış
const kart = { id: 7, ad: 'Usta Öğretici', gorev: 'Usta Öğretici', sgk_li: true, vergi_istisnasi: false, aktif: true } as Personel
const satir = (ek: Partial<KontrolBordro> = {}): KontrolBordro => ({
  id: 1, personel_id: 7, toplam_saat: 24, brut: 11544, gv_matrah: 9812.4, gv_oran: 15, gv_hesaplanan: 1471.86,
  gv_istisna_tutari: 1471.86, gv_tutar: 0, dv_hesaplanan: 87.62, dv_istisna_tutari: 87.62, damga_tutar: 0,
  sgk_kisi: 1616.16, sgk_issizlik_kisi: 115.44, toplam_kesinti: 1731.6, net: 9812.4, odendi: false, personel: kart, ...ek,
})
const istisnaBulgulari = (b: KontrolBordro) => hesapKontrolEt({ ayarlar, ay: 9, yil: 2026, toplamGelir: 0, bordro: [b], personel: [kart] })
  .kisiler[0].bulgular.filter(x => /istisna/i.test(x.baslik))

describe('asgari ücret istisnası kontrolü', () => {
  it('bordroyla saklanan istisna ayarını esas alır; kart sonradan kapatılsa da hata vermez', () => {
    const bulgular = istisnaBulgulari(satir({ istisna_karti: { vergi_istisnasi: true, tip: 'tam', gv: 0, dv: 0 } }))
    expect(bulgular.filter(x => x.durum === 'hata')).toHaveLength(0)
    expect(bulgular.map(x => x.baslik)).not.toContain('İstisna başka işverende kullanılıyor olabilir')
  })

  it('bordro anında istisna gerçekten kapalıysa hata verir', () => {
    const bulgular = istisnaBulgulari(satir({ istisna_karti: { vergi_istisnasi: false, tip: 'tam', gv: 0, dv: 0 } }))
    expect(bulgular.filter(x => x.durum === 'hata').map(x => x.baslik)).toEqual(['Gelir vergisi istisnası fazla uygulanmış', 'Damga vergisi istisnası fazla uygulanmış'])
  })

  it('istisna ayarı saklanmamış eski bordroda, istisna uygulanmışsa o ay açık kabul eder (kartı sonradan kapatmak hata doğurmaz)', () => {
    const bulgular = istisnaBulgulari(satir())
    expect(bulgular).toHaveLength(0)
  })

  it('eski bordroda da yasal üst sınırı aşan istisnayı hata sayar', () => {
    // Eylül GV istisna sınırı ~5.615 TL; hesaplanan vergiyi (1.471,86) aşan istisna olamaz
    const bulgular = istisnaBulgulari(satir({ gv_istisna_tutari: 2000 }))
    expect(bulgular.filter(x => x.durum === 'hata').map(x => x.baslik)).toContain('Gelir vergisi istisnası fazla uygulanmış')
  })

  it('kayıt, kartın istisna ayarını alır', () => {
    expect(istisnaKartiOlustur({ ...kart, vergi_istisnasi: true, vergi_istisna_tipi: 'tutar', istisna_gv_tutari: 500, istisna_dv_tutari: 40 } as Personel))
      .toEqual({ vergi_istisnasi: true, tip: 'tutar', gv: 500, dv: 40 })
  })
})
