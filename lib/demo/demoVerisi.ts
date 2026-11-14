// Demo okulun tamamen kurgusal örnek verisi. Saf fonksiyondur: veritabanına ya da ağa dokunmaz,
// aynı tohum ve aynı "bugün" ile her zaman aynı okulu üretir. Tarayıcıda, demo ilk açıldığında bir kez çalışır.
// Tutarlar elle uydurulmaz; uygulamanın kendi hesap kodu (ücret, bordro, istisna kartı) kullanılır.
import { haftaIciMi, tatilMi, gunSayisi, ogrenciUcretiHesapla, ayLabel } from '../hesaplama'
import { bordroSatirlariHesapla } from '../bordroHesap'
import { istisnaKartiOlustur } from '../hesapKontrol'
import { sgkGunleri } from '../muhsgk'
import type { Ayarlar, Personel, Tatil } from '../types'
import {
  tohumluRastgele, kurgusalTc, kurgusalIban, kurgusalTelefon, kurgusalEposta,
  KURGUSAL_SOYADLAR, KIZ_ADLARI, ERKEK_ADLARI, type Rastgele,
} from './kurgusalAdlar'
import { DEMO_OKUL_ID, DEMO_IL_ID, DEMO_ILCE_ID, DEMO_KULLANICI_ID, DEMO_OKUL_ADI, DEMO_PDF_ISARETI } from './mod'

export type Satir = Record<string, unknown>
export type DemoTablolari = Record<string, Satir[]>
export interface DemoDosyasi { kova: string; yol: string; icerik: Uint8Array; mime: string }
export interface DemoVerisi { tablolar: DemoTablolari; dosyalar: DemoDosyasi[] }

export const DEMO_TOHUM = 360

const iki = (n: number) => String(n).padStart(2, '0')
const tarihStr = (yil: number, ay: number, gun: number) => `${yil}-${iki(ay)}-${iki(gun)}`
const zaman = (yil: number, ay: number, gun: number, saat = 10) => `${tarihStr(yil, ay, gun)}T${iki(saat)}:00:00+00:00`
const kurus = (n: number) => Math.round(n * 100) / 100

/** Bugünden geriye, yaz tatili (Temmuz–Ağustos) atlanarak son 6 eğitim ayı; en eskiden yeniye. */
export function demoAylari(bugun: Date): { ay: number; yil: number }[] {
  const aylar: { ay: number; yil: number }[] = []
  let ay = bugun.getMonth() + 1, yil = bugun.getFullYear()
  while (aylar.length < 6) {
    if (ay !== 7 && ay !== 8) aylar.unshift({ ay, yil })
    ay--
    if (ay === 0) { ay = 12; yil-- }
  }
  return aylar
}

/** Sayfa düzeni olmayan, yalnızca ASCII metin içeren küçük ve geçerli bir PDF (örnek belge). */
export function ornekPdf(baslik: string, satirlar: string[] = []): Uint8Array {
  const ascii = (s: string) => s
    .replace(/[İI]/g, 'I').replace(/ı/g, 'i').replace(/[Şş]/g, m => (m === 'Ş' ? 'S' : 's'))
    .replace(/[Ğğ]/g, m => (m === 'Ğ' ? 'G' : 'g')).replace(/[Üü]/g, m => (m === 'Ü' ? 'U' : 'u'))
    .replace(/[Öö]/g, m => (m === 'Ö' ? 'O' : 'o')).replace(/[Çç]/g, m => (m === 'Ç' ? 'C' : 'c'))
    .replace(/—/g, '-').replace(/[^\x20-\x7e]/g, '').replace(/([()\\])/g, '\\$1')
  const metin = [ascii(DEMO_PDF_ISARETI), '', ascii(baslik), '', ...satirlar.map(ascii)]
  const akis = ['BT', '/F1 12 Tf', '14 TL', '60 780 Td', ...metin.map(s => `(${s}) Tj T*`), 'ET'].join('\n')
  const nesneler = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${akis.length} >>\nstream\n${akis}\nendstream`,
  ]
  let govde = '%PDF-1.4\n'
  const konumlar: number[] = []
  nesneler.forEach((n, i) => { konumlar.push(govde.length); govde += `${i + 1} 0 obj\n${n}\nendobj\n` })
  const xref = govde.length
  govde += `xref\n0 ${nesneler.length + 1}\n0000000000 65535 f \n` + konumlar.map(k => `${String(k).padStart(10, '0')} 00000 n \n`).join('')
  govde += `trailer\n<< /Size ${nesneler.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return new TextEncoder().encode(govde)
}

/** Varsayılan denetim evrakı listesi (migration_denetim_dosyasi.sql → denetim_maddeleri_hazirla ile aynı). */
export const DENETIM_MADDELERI: [number, string, 'yukleme' | 'otomatik', string | null, boolean][] = [
  [1, 'Kulüp Açılış Onayı ve varsa Ek Onay', 'yukleme', null, true],
  [2, 'Kulüpte görevli personel listesi ve görevleri', 'otomatik', 'personel_listesi', false],
  [3, 'Ay başı – ay sonu banka hesap hareketleri (Excel formatında)', 'yukleme', null, false],
  [4, 'Sigortalı çalışan personele ait aylık puantaj', 'otomatik', 'puantaj_sgk', false],
  [5, 'Kadrolu çalışan personele ait aylık puantaj', 'otomatik', 'puantaj_kadrolu', false],
  [6, 'Sigortalı çalışan personele ait aylık bordro', 'otomatik', 'bordro_sgk', false],
  [7, 'Kadrolu çalışan personele ait aylık bordro', 'otomatik', 'bordro_kadrolu', false],
  [8, 'Sigortalı çalışan personele ait 4/A hizmet listesi', 'yukleme', null, false],
  [9, "Kadrolu personele ait aylık Gelir ve Damga Vergisi istisna raporu (KBS'den alınmış)", 'yukleme', null, false],
  [11, 'Aylık Muhtasar SGK Beyannamesi, SGK tahakkuk fişi ve hizmet listesi', 'yukleme', null, false],
  [12, 'Aylık ücret dağıtımını gösteren bilanço', 'otomatik', 'bilanco', false],
  [13, 'Kadrolu personele ödenen ücretlerin vergi matrahlarına dahil edildiğini gösteren belge', 'yukleme', null, false],
  [14, 'Çocuk kulübünün vergi ve SGK borcu olmadığına dair borcu yoktur belgesi', 'yukleme', null, false],
]

export function demoAyarlari(okulId = DEMO_OKUL_ID): Ayarlar {
  return {
    id: 1, okul_id: okulId,
    kurum_adi: `${DEMO_OKUL_ADI} Çocuk Kulübü`,
    oab_adi: `${DEMO_OKUL_ADI} Okul Aile Birliği`,
    mudur_adi: 'Deniz Örnek', mudur_unvani: 'Okul Müdürü',
    duzenleyen_adi: 'Selin Taslak', duzenleyen_unvani: 'Muhasebe Personeli',
    adres: 'Örnek Mah. Kurgu Sok. No:1 Kurgu / Örnek İli',
    tel: '0 (500) 000 00 00', email: 'iletisim@example.com',
    vergi_dairesi: 'Örnek Vergi Dairesi', vergi_dairesi_kodu: '000000', vergi_no: '0000000000',
    sgk_no: '0000000000', sgk_sicil_no: '000000000000000000000', sgk_kontrol_no: '00', sgk_araci_no: '000',
    sgk_kanun_no: '05510', sgk_belge_turu: '01',
    gosterge: 0, katsayi: 0, saat_ucreti: 35, gunluk_saat: 2, yemek: false,
    asgari_ucret: 26005.5,
    sgk_kisi_pay: 0.14, sgk_issizlik_kisi: 0.01, sgk_kisa_vadeli: 0.02, sgk_malulluk: 0.02, sgk_saglik: 0.075,
    sgk_issizlik_isveren: 0.02, damga_vergi_orani: 0.00759,
    vergi_dilimleri: [
      { ust: 220000, oran: 0.15 }, { ust: 480000, oran: 0.2 }, { ust: 1800000, oran: 0.27 },
      { ust: 6000000, oran: 0.35 }, { ust: 99999999, oran: 0.4 },
    ],
    dagitim_temel_gider: 26, dagitim_ogretmen: 55, dagitim_baskan: 7, dagitim_baskan_yrd: 5,
    dagitim_muhasebe: 2, dagitim_temizlik: 4, dagitim_denetim: 1,
    tavan_katsayi: 13184.78, ders_saati_sayisi: 6,
    muhsgk_bilgileri: { vd_kodu: '000000' },
  }
}

interface Ogr { id: number; ad: string; soyad: string; sinif: string; ogretmen: string; kardes: boolean; ucretsiz: boolean; aktif: boolean; tur: 'kulup' | 'okul' }

export function demoVerisiUret({ tohum = DEMO_TOHUM, bugun = new Date() }: { tohum?: number; bugun?: Date } = {}): DemoVerisi {
  const r: Rastgele = tohumluRastgele(tohum)
  const okulId = DEMO_OKUL_ID
  const t: DemoTablolari = {}
  const dosyalar: DemoDosyasi[] = []
  const sayac: Record<string, number> = {}
  const ekle = (tablo: string, satir: Satir): Satir => {
    const id = (sayac[tablo] = (sayac[tablo] || 0) + 1)
    const s = { id, ...satir }
    ;(t[tablo] ||= []).push(s)
    return s
  }
  const bugunY = bugun.getFullYear(), bugunA = bugun.getMonth() + 1, bugunG = bugun.getDate()
  const aylar = demoAylari(bugun)
  const ilkAy = aylar[0]
  const olusturma = zaman(ilkAy.yil, ilkAy.ay, 1, 8)

  // ── Kurum ────────────────────────────────────────────────────
  t.iller = [{ id: DEMO_IL_ID, ad: 'Örnek İli', created_at: olusturma }]
  t.ilceler = [{ id: DEMO_ILCE_ID, il_id: DEMO_IL_ID, ad: 'Kurgu' }]
  const lisansBitis = new Date(bugun.getTime() + 15 * 864e5).toISOString()
  t.okullar = [{
    id: okulId, ad: DEMO_OKUL_ADI, il_id: DEMO_IL_ID, ilce_id: DEMO_ILCE_ID,
    odeme_durumu: 'deneme', lisans_bitis: lisansBitis, created_at: olusturma,
  }]
  t.profiller = [{
    id: DEMO_KULLANICI_ID, okul_id: okulId, rol: 'admin', ad: 'Demo', soyad: 'Kullanıcı',
    son_giris: bugun.toISOString(), created_at: olusturma,
  }]
  const ayarlar = demoAyarlari(okulId)
  t.ayarlar = [{ ...ayarlar, updated_at: olusturma }]
  t.kulup_bilgileri = [{
    okul_id: okulId, kurum_kodu: '000000', web_adresi: 'https://example.com', ogretim_sekli: 'Normal öğretim',
    acilis_onay_tarihi: `${ilkAy.ay >= 9 ? ilkAy.yil : ilkAy.yil - 1}-09-01`, acilis_onay_sayisi: 'E-00000000-000-0000',
    faaliyet_turleri: 'Sanat, spor ve bilim etkinlikleri', etkinlik_alanlari: ['Satranç', 'Robotik', 'Drama', 'Resim'],
    etkinlik_alanlari_diger: null, ek2_sozlesme: true, ek4_kayit: true, ek5_acil: true, guncellendi: olusturma,
  }]
  t.tatiller = []

  // ── Personel ─────────────────────────────────────────────────
  type P = Personel & Satir
  const personelEkle = (ad: string, gorev: string, sgkLi: boolean, ek: Partial<Personel> = {}): P => {
    const soyad = ad.split(' ').slice(1).join(' ')
    return ekle('personel', {
      ad, gorev, sgk_li: sgkLi, personel_turu: sgkLi ? 'sgk' : 'kadrolu', kadro_durumu: sgkLi ? 'SGK’lı' : 'Kadrolu',
      tc: kurgusalTc(r), iban: kurgusalIban(r), email: kurgusalEposta(ad.split(' ')[0], soyad),
      vergi_istisnasi: !sgkLi, vergi_istisna_tipi: 'tam', istisna_gv_tutari: 0, istisna_dv_tutari: 0,
      yillik_matrah: 0, is_retired: false, aktif: true, koordinator_id: null,
      meslek_kodu: gorevMeslekKodu(gorev), okul_id: okulId, created_at: olusturma, ...ek,
    }) as unknown as P
  }
  const baskan = personelEkle('Deniz Örnek', 'Başkan', false)
  personelEkle('Burak Kurgu', 'Başkan Yrd.', false)
  personelEkle('Selin Taslak', 'Muhasebe Personeli', false)
  const temizlik = personelEkle('Gamze Masalcı', 'Temizlik Personeli', true)
  const koordinator = personelEkle('Levent Kurgu', 'Koordinatör Öğretmen', false)
  const ogretmenler = [
    personelEkle('Esra Deneme', 'Öğretmen', false, { koordinator_id: koordinator.id }),
    personelEkle('Tolga Hayalsu', 'Usta Öğretici', true, { koordinator_id: koordinator.id }),
    personelEkle('Pınar Örnek', 'Usta Öğretici', true),
    personelEkle('Aylin Taslak', 'Öğretmen', true, { is_retired: true }),
  ]
  const tumPersonel = t.personel as unknown as P[]

  // ── Kulüp sınıfları ──────────────────────────────────────────
  const sinifAdlari = ['Satranç Kulübü', 'Robotik Kulübü', 'Drama Kulübü', 'Resim Kulübü']
  const siniflar = sinifAdlari.map((ad, i) => ekle('siniflar', {
    ad, ogretmen: ogretmenler[i].ad, kapasite: 15, aylik_ucret: null, yas_grubu: i < 2 ? '5-8. sınıf' : '1-4. sınıf',
    aciklama: 'Kurgusal örnek kulüp', aktif: true, okul_id: okulId, created_at: olusturma,
  }))

  // ── Öğrenciler ───────────────────────────────────────────────
  const ogrenciler: Ogr[] = []
  const ogrenciEkle = (tur: 'kulup' | 'okul', sinifIdx: number, ek: Partial<Ogr> = {}) => {
    const kiz = r.olasilik(0.5)
    const ad = r.sec(kiz ? KIZ_ADLARI : ERKEK_ADLARI)
    const soyad = r.sec(KURGUSAL_SOYADLAR)
    const veli = r.sec(kiz ? ERKEK_ADLARI : KIZ_ADLARI)
    const o: Ogr = {
      id: 0, ad, soyad, sinif: tur === 'kulup' ? sinifAdlari[sinifIdx] : `${(sinifIdx % 4) + 5}-${'ABCD'[sinifIdx % 4]}`,
      ogretmen: tur === 'kulup' ? ogretmenler[sinifIdx].ad : '', kardes: false, ucretsiz: false, aktif: true, tur, ...ek,
    }
    const s = ekle('ogrenciler', {
      ad: o.ad, soyad: o.soyad, tc: kurgusalTc(r), sinif: o.sinif, ogretmen: o.ogretmen || null,
      kardes_indirimi: o.kardes, ucretsiz_mi: o.ucretsiz, ucretsiz_nedeni: o.ucretsiz ? 'Örnek muafiyet' : null,
      veli_ad: `${veli} ${soyad}`, anne_adi: `${veli} ${soyad}`, anne_tel: kurgusalTelefon(r),
      veli_eposta: kurgusalEposta(veli, soyad), gunluk_saat: null, aktif: o.aktif, ogrenci_turu: tur,
      okul_id: okulId, created_at: olusturma,
    })
    o.id = s.id as number
    ogrenciler.push(o)
    return o
  }
  for (let i = 0; i < 44; i++) ogrenciEkle('kulup', i % 4, { kardes: i % 11 === 3, ucretsiz: i === 7 || i === 30 })
  ogrenciEkle('kulup', 1, { aktif: false })
  ogrenciEkle('kulup', 2, { aktif: false })
  for (let i = 0; i < 14; i++) ogrenciEkle('okul', i)
  const kulupOgr = ogrenciler.filter(o => o.tur === 'kulup')

  // ── Ders programı, sınıf defteri, puantaj ────────────────────
  const tatilListesi = (t.tatiller as unknown as Tatil[])
  const isGunleri = (yil: number, ay: number, sonGun = gunSayisi(yil, ay)) => {
    const g: number[] = []
    for (let d = 1; d <= sonGun; d++) if (haftaIciMi(yil, ay, d) && !tatilMi(ay, d, yil, tatilListesi)) g.push(d)
    return g
  }
  const puantajTopla = new Map<string, number>()
  for (const { ay, yil } of aylar) {
    const buAy = ay === bugunA && yil === bugunY
    for (let d = 1; d <= gunSayisi(yil, ay); d++) {
      if (!haftaIciMi(yil, ay, d)) continue
      siniflar.forEach((s, i) => {
        for (const dersNo of [1, 2]) ekle('ders_programi', {
          kulup_adi: s.ad, sinif_id: s.id, ogretmen_id: ogretmenler[i].id, gun: d, ay, yil, seans: 'sabah',
          etkinlik_saati: 1, ders_no: dersNo, okul_id: okulId, created_at: olusturma,
        })
      })
    }
    for (const d of isGunleri(yil, ay, buAy ? bugunG : undefined)) {
      siniflar.forEach((s, i) => {
        const ogretmen = ogretmenler[i]
        for (const dersNo of [1, 2]) {
          // Ara sıra bir ders yapılmamış (öğretmen gelmedi) görünür
          const durum = r.olasilik(0.015) ? 'gelmedi' : 'geldi'
          const kayit = { kulup_adi: s.ad, sinif_id: s.id, gun: d, ay, yil, seans: 'sabah', etkinlik_saati: 1, okul_id: okulId, created_at: olusturma }
          ekle('sinif_defteri', { ...kayit, ogretmen_id: ogretmen.id, ders_no: dersNo, durum })
          if (durum === 'geldi') puantajTopla.set(`${ogretmen.id}|${tarihStr(yil, ay, d)}`, (puantajTopla.get(`${ogretmen.id}|${tarihStr(yil, ay, d)}`) || 0) + 1)
          if (ogretmen.koordinator_id) {
            ekle('sinif_defteri', { ...kayit, ogretmen_id: ogretmen.koordinator_id, ders_no: dersNo + 10, durum: 'geldi' })
            const k = `${ogretmen.koordinator_id}|${tarihStr(yil, ay, d)}`
            puantajTopla.set(k, (puantajTopla.get(k) || 0) + 1)
          }
        }
      })
    }
  }
  for (const [anahtar, saat] of puantajTopla) {
    const [pid, tarih] = anahtar.split('|')
    ekle('puantaj', { personel_id: Number(pid), tarih, saat, etkinlik_saati: saat, ay: Number(tarih.slice(5, 7)), yil: Number(tarih.slice(0, 4)), okul_id: okulId })
  }

  // ── Aidat tahsilatı (Ödeme Takibi) ───────────────────────────
  let dekontNo = 1000
  for (const { ay, yil } of aylar) {
    const buAy = ay === bugunA && yil === bugunY
    for (const o of kulupOgr) {
      if (!o.aktif || o.ucretsiz) continue
      // Geçmiş aylarda çoğu öğrenci ödemiş; bu ay ödemeler ayın ilk günlerine yayılır
      const odemeGunu = r.tam(1, 10)
      if (buAy ? odemeGunu > bugunG || r.olasilik(0.25) : r.olasilik(0.04)) continue
      const tamUcret = kurus(ogrenciUcretiHesapla(ayarlar, yil, ay, o.kardes, tatilListesi))
      const tutar = !buAy && r.olasilik(0.05) ? kurus(tamUcret / 2) : tamUcret
      const tarih = tarihStr(yil, ay, odemeGunu)
      const dekont = `D-${++dekontNo}`
      const th = ekle('tahsilat', { ogrenci_id: o.id, tarih, tutar, ay, yil, dekont_no: dekont, aciklama: `${ayLabel(ay, yil)} aidatı`, okul_id: okulId, created_at: zaman(yil, ay, odemeGunu) })
      ekle('hesap_hareketleri', { tarih, tutar, tur: 'gelir', aciklama: `Öğrenci ödemesi (${dekont})`, dekont_no: dekont, kaynak: 'tahsilat', kaynak_id: th.id, ay, yil, okul_id: okulId, created_at: zaman(yil, ay, odemeGunu) })
      const gd = ekle('giderler', { tarih, tutar, kategori: 'Kurum Havuzu Dağıtımı', aciklama: `Kurum Havuzu Dağıtımı (${dekont})`, dekont_no: dekont, ay, yil, okul_id: okulId, created_at: zaman(yil, ay, odemeGunu) })
      ekle('hesap_hareketleri', { tarih, tutar, tur: 'gider', aciklama: `Kurum Havuzu Dağıtımı (${dekont})`, dekont_no: dekont, kaynak: 'giderler', kaynak_id: gd.id, ay, yil, okul_id: okulId, created_at: zaman(yil, ay, odemeGunu) })
    }
  }

  // ── Tahakkuk ve bordro (geçmiş aylar; içinde bulunulan ay kullanıcı hesaplasın) ──
  const tahsilatlar = t.tahsilat || []
  const puantajlar = t.puantaj || []
  aylar.forEach(({ ay, yil }, i) => {
    if (ay === bugunA && yil === bugunY) return
    const gelir = kurus(tahsilatlar.filter(x => x.ay === ay && x.yil === yil).reduce((s, x) => s + Number(x.tutar), 0))
    ekle('tahakkuk', { ay, yil, toplam_gelir: gelir, hesaplandi_mi: true, okul_id: okulId, created_at: zaman(yil, ay, gunSayisi(yil, ay)) })
    const ayPuantaj = puantajlar.filter(p => p.ay === ay && p.yil === yil) as unknown as { personel_id: number; tarih: string; saat: number }[]
    const { yeniSatirlar } = bordroSatirlariHesapla({ ayarlar, personel: tumPersonel, kaydedilmis: [], puantaj: ayPuantaj, tatiller: tatilListesi, ay, yil, gelir })
    const sonAy = i === aylar.length - 2
    // SGK'lı personelin eksik günleri için neden kodu (MUHSGK XML'i bunu ister)
    for (const s of yeniSatirlar) {
      if (!s.personel.sgk_li || !(s.sonuc.brut > 0)) continue
      if (sgkGunleri(s.toplamSaat, null, yil, ay).eksik <= 0) continue
      const istirahat = s.personel.id === temizlik.id && i === aylar.length - 3
      ekle('sgk_eksik_gun', {
        personel_id: s.personel.id, yil, ay, kod: istirahat ? '01' : '06',
        aciklama: istirahat ? 'İstirahat (örnek)' : 'Kısmi süreli çalışma (örnek)', okul_id: okulId, created_at: olusturma,
      })
    }
    for (const s of yeniSatirlar) ekle('bordro', {
      personel_id: s.personel.id, ay, yil, okul_id: okulId, toplam_saat: s.toplamSaat,
      brut: s.sonuc.brut, gv_matrah: s.sonuc.gv_matrah, gv_oran: s.sonuc.gv_oran, gv_hesaplanan: s.sonuc.gv_hesaplanan,
      gv_istisna_tutari: s.sonuc.gv_istisna, gv_tutar: s.sonuc.gv, dv_hesaplanan: s.sonuc.dv_hesaplanan,
      dv_istisna_tutari: s.sonuc.dv_istisna, damga_tutar: s.sonuc.dv, sgk_kisi: s.sonuc.sgk_kisi,
      sgk_issizlik_kisi: s.sonuc.sgk_issizlik, sgk_isveren: s.sonuc.sgk_isveren, toplam_kesinti: s.sonuc.toplam_kesinti,
      net: s.sonuc.net, odendi: !sonAy, istisna_karti: istisnaKartiOlustur(s.personel),
      created_at: zaman(yil, ay, gunSayisi(yil, ay), 16),
    })
  })

  // ── Tahsilat Takip (okul, kulüp ve OAB kategorileri) ─────────
  const kategori = (birim: string, ad: string, tip: string, veri_kaynagi: string, kapsam: string, tutar: number | null, sira: number) =>
    ekle('tahsilat_kategorileri', { birim, ad, tip, veri_kaynagi, kapsam, varsayilan_tutar: tutar, varsayilan_tutar_okul: tutar, sira, aktif: true, okul_id: okulId, created_at: olusturma })
  kategori('kulup', 'Kulüp Aidatı', 'aylik', 'otomatik_kulup', 'tumu', null, 1)
  const kirtasiye = kategori('okul', 'Kırtasiye Katkısı', 'tek_seferlik', 'manuel', 'tumu', 250, 1)
  const gezi = kategori('okul', 'Bilim Merkezi Gezisi', 'tek_seferlik', 'manuel', 'secili', 400, 2)
  const forma = kategori('kulup', 'Kulüp Tişörtü', 'tek_seferlik', 'manuel', 'tumu', 300, 2)
  const oabBagis = kategori('oab', 'Okul Aile Birliği Bağışı', 'tek_seferlik', 'manuel', 'tumu', 500, 1)
  const sonAyBas = aylar[aylar.length - 2]
  const odemeTarihi = () => tarihStr(sonAyBas.yil, sonAyBas.ay, r.tam(2, 25))
  const aktifOgr = ogrenciler.filter(o => o.aktif)
  for (const o of aktifOgr) {
    if (r.olasilik(0.7)) ekle('tahsilat_kayitlari', { kategori_id: kirtasiye.id, ogrenci_id: o.id, donem: '-', tutar: 250, tarih: odemeTarihi(), aciklama: null, okul_id: okulId, created_at: olusturma })
    if (o.tur === 'kulup' && r.olasilik(0.6)) ekle('tahsilat_kayitlari', { kategori_id: forma.id, ogrenci_id: o.id, donem: '-', tutar: 300, tarih: odemeTarihi(), aciklama: null, okul_id: okulId, created_at: olusturma })
    if (r.olasilik(0.2)) ekle('tahsilat_kayitlari', { kategori_id: oabBagis.id, ogrenci_id: o.id, donem: '-', tutar: 500, tarih: odemeTarihi(), aciklama: null, okul_id: okulId, created_at: olusturma })
  }
  const geziOgr = aktifOgr.slice(0, 16)
  geziOgr.forEach((o, i) => {
    ekle('tahsilat_kategori_ogrenci', { kategori_id: gezi.id, ogrenci_id: o.id, okul_id: okulId, created_at: olusturma })
    if (i === 0) {
      // Taksitli ödeme örneği: iki taksit, ilki ödenmiş
      const vade1 = tarihStr(sonAyBas.yil, sonAyBas.ay, 15)
      const vade2 = tarihStr(bugunY, bugunA, Math.min(28, gunSayisi(bugunY, bugunA)))
      ekle('tahsilat_taksit_planlari', { kategori_id: gezi.id, ogrenci_id: o.id, donem: '-', vadeler: [vade1, vade2], tutarlar: [200, 200], aciklama: 'Örnek taksit planı', okul_id: okulId, created_at: olusturma })
      ekle('tahsilat_kayitlari', { kategori_id: gezi.id, ogrenci_id: o.id, donem: '-/T1', tutar: 200, tarih: vade1, aciklama: null, okul_id: okulId, created_at: olusturma })
    } else if (i % 4 !== 1) {
      ekle('tahsilat_kayitlari', { kategori_id: gezi.id, ogrenci_id: o.id, donem: '-', tutar: 400, tarih: odemeTarihi(), aciklama: null, okul_id: okulId, created_at: olusturma })
    }
  })

  // ── İşletme hesabı defterleri ────────────────────────────────
  const defter = (birim: string, yil: number, ay: number, gun: number, tur: 'gelir' | 'gider', tutar: number, aciklama: string, belge: string) =>
    ekle('isletme_defteri', { birim, tarih: tarihStr(yil, ay, gun), belge_no: belge, aciklama, tutar, tur, kaynak: 'manuel', ay, yil, okul_id: okulId, created_at: zaman(yil, ay, gun) })
  let belge = 1
  for (const { ay, yil } of aylar) {
    const son = ay === bugunA && yil === bugunY ? bugunG : gunSayisi(yil, ay)
    const gun = (g: number) => Math.min(g, son)
    defter('kulup', yil, ay, gun(5), 'gider', 1850 + r.tam(0, 6) * 50, 'Kırtasiye ve sarf malzemesi alımı', `F-${belge++}`)
    if (son >= 12) defter('okul', yil, ay, gun(12), 'gelir', 7500, 'Kantin kira geliri', `M-${belge++}`)
    defter('okul', yil, ay, gun(8), 'gider', 2200 + r.tam(0, 8) * 100, 'Temizlik malzemesi alımı', `F-${belge++}`)
    if (son >= 20) defter('oab', yil, ay, gun(20), 'gider', 1200 + r.tam(0, 5) * 100, 'Küçük onarım gideri', `F-${belge++}`)
  }
  for (const birim of ['kulup', 'okul', 'oab']) {
    ekle('isletme_devir', { yil: bugunY, devreden_tutar: birim === 'kulup' ? 18450 : birim === 'okul' ? 5200 : 3100, birim, okul_id: okulId, created_at: olusturma })
  }

  // ── Denetim dosyası ──────────────────────────────────────────
  for (const [sira, baslik, tip, kod, yillik] of DENETIM_MADDELERI) {
    ekle('denetim_maddeleri', { il_id: DEMO_IL_ID, sira_no: sira, baslik, aciklama: null, tip, otomatik_kod: kod, yillik, zorunlu: true, aktif: true, created_at: olusturma })
  }
  const maddeler = t.denetim_maddeleri
  // İçinde bulunulan eğitim yılının geçmiş ayları: ilki onaylandı, sonuncusu iade edildi
  const egitimYiliBas = bugunA >= 9 ? bugunY : bugunY - 1
  const gecmisAylar = aylar.filter(a => !(a.ay === bugunA && a.yil === bugunY) && (a.yil > egitimYiliBas || (a.yil === egitimYiliBas && a.ay >= 9)))
  const teslimAylari = gecmisAylar.length ? gecmisAylar : aylar.slice(-3, -1)
  teslimAylari.forEach((donem, i) => {
    const iade = i === teslimAylari.length - 1 && teslimAylari.length > 1
    const sonGun = gunSayisi(donem.yil, donem.ay)
    for (const m of maddeler) {
      if (m.yillik && i > 0) continue
      const yol = `${okulId}/${donem.yil}-${iki(donem.ay)}/${m.id}/ornek-${m.sira_no}.pdf`
      const icerik = ornekPdf(String(m.baslik), [`${ayLabel(donem.ay, donem.yil)} - ${DEMO_OKUL_ADI}`, 'Bu belge demo icin uretilmistir.'])
      dosyalar.push({ kova: 'denetim', yol, icerik, mime: 'application/pdf' })
      const belgeIade = iade && m.sira_no === 8
      ekle('denetim_belgeleri', {
        okul_id: okulId, yil: donem.yil, ay: donem.ay, madde_id: m.id, kaynak: m.tip, dosya_yolu: yol,
        dosya_adi: `ornek-${m.sira_no}.pdf`, boyut: icerik.length, mime: 'application/pdf',
        durum: iade ? (belgeIade ? 'iade' : 'onaylandi') : 'onaylandi',
        denetci_notu: belgeIade ? '4/A hizmet listesinin son sayfası eksik; lütfen tam listeyi yükleyin. (örnek not)' : null,
        yukleyen: DEMO_KULLANICI_ID, created_at: zaman(donem.yil, donem.ay, Math.min(sonGun, 28)),
      })
    }
    ekle('denetim_teslimleri', {
      okul_id: okulId, yil: donem.yil, ay: donem.ay, durum: iade ? 'iade' : 'onaylandi',
      gonderim_tarihi: zaman(donem.yil, donem.ay, Math.min(sonGun, 28), 15),
      karar_tarihi: zaman(donem.yil, donem.ay, Math.min(sonGun, 28), 17), karar_veren: null,
      denetci_notu: iade ? '4/A hizmet listesini tamamlayıp yeniden gönderin. (örnek not)' : 'Dosya eksiksiz. (örnek not)',
      created_at: zaman(donem.yil, donem.ay, 1),
    })
  })

  // Personel belgeleri
  for (const [p, ad] of [[temizlik, 'SGK işe giriş bildirgesi'], [ogretmenler[1], 'SGK işe giriş bildirgesi'], [baskan, 'Görevlendirme yazısı']] as const) {
    const yol = `${okulId}/${p.id}/ornek-${p.id}.pdf`
    const icerik = ornekPdf(ad, [String(p.ad), 'Bu belge demo icin uretilmistir.'])
    dosyalar.push({ kova: 'personel', yol, icerik, mime: 'application/pdf' })
    ekle('personel_belgeleri', { okul_id: okulId, personel_id: p.id, ad, dosya_yolu: yol, dosya_adi: `ornek-${p.id}.pdf`, boyut: icerik.length, yukleyen: DEMO_KULLANICI_ID, created_at: olusturma })
  }

  // ── Bildirimler ve denetim günlüğü ───────────────────────────
  const sonTarih = new Date(bugun.getTime() + 10 * 864e5).toISOString()
  ekle('okul_bildirimleri', {
    okul_id: okulId, baslik: 'Aylık denetim dosyaları (örnek duyuru)',
    icerik: 'Bu ayın denetim dosyasını ayın son iş gününe kadar sisteme yüklemeyi unutmayın. Bu, demo için yazılmış kurgusal bir duyurudur.',
    kaynak: 'duyuru', son_tarih: sonTarih, okundu: false, grup: null, gonderen: null, created_at: bugun.toISOString(),
  })
  const gunluk = (islem: string, tablo: string, aciklama: string, gunOnce: number) => ekle('audit_log', {
    okul_id: okulId, kullanici_id: DEMO_KULLANICI_ID, kullanici_email: 'demo@example.com', islem, tablo, kayit_id: null, aciklama,
    created_at: new Date(bugun.getTime() - gunOnce * 864e5).toISOString(),
  })
  gunluk('login', 'auth', 'Giriş yapıldı', 0)
  gunluk('hesapla', 'bordro', `${ayLabel(sonAyBas.ay, sonAyBas.yil)} bordrosu hesaplandı`, 12)
  gunluk('ekle', 'tahsilat', 'Aidat ödemesi kaydedildi', 3)

  // Henüz veri bulunmayan ama panelin sorguladığı tablolar boş olarak hazır olsun
  for (const bos of ['denetim_raporlari', 'okul_odemeleri', 'islenen_odemeler', 'denetci_talepleri', 'duyurular', 'sistem_ayarlari', 'yoklama']) t[bos] ||= []

  return { tablolar: t, dosyalar }
}

function gorevMeslekKodu(gorev: string): string {
  if (/temizlik/i.test(gorev)) return '9112.01'
  if (/muhasebe/i.test(gorev)) return '4311.01'
  if (/başkan/i.test(gorev)) return '1345.01'
  return '2359.31'
}
