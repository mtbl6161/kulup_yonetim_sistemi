// Demo okulun bellek içi veritabanı: PostgREST'in panelin kullandığı alt kümesini tablolar üzerinde uygular.
// Yalnızca tarayıcı belleğinde yaşar; sayfa yenilenince üreteçten yeniden kurulur.
import {
  DesteklenmeyenSorgu, kosulSagla, sirala, sorguAyristir,
  type AyrisikSorgu, type Kosul, type SecimOgesi,
} from './sorgu'
import { DEMO_OKUL_ID, DEMO_KULLANICI_ID } from '../mod'

export type Satir = Record<string, unknown>

/** Yabancı anahtarlar: [tablo, kolon, hedef tablo]. Gömülü seçimler (`personel(ad)`) bunlarla çözülür. */
export const ILISKILER: [string, string, string][] = [
  ['profiller', 'okul_id', 'okullar'], ['profiller', 'il_id', 'iller'],
  ['okullar', 'il_id', 'iller'], ['okullar', 'ilce_id', 'ilceler'], ['ilceler', 'il_id', 'iller'],
  ['denetci_talepleri', 'okul_id', 'okullar'], ['denetci_talepleri', 'il_id', 'iller'],
  ['bordro', 'personel_id', 'personel'], ['puantaj', 'personel_id', 'personel'],
  ['personel_belgeleri', 'personel_id', 'personel'], ['sgk_eksik_gun', 'personel_id', 'personel'],
  ['ders_programi', 'ogretmen_id', 'personel'], ['sinif_defteri', 'ogretmen_id', 'personel'],
  ['personel', 'koordinator_id', 'personel'],
  ['ders_programi', 'sinif_id', 'siniflar'], ['sinif_defteri', 'sinif_id', 'siniflar'],
  ['tahsilat', 'ogrenci_id', 'ogrenciler'], ['tahsilat_kayitlari', 'ogrenci_id', 'ogrenciler'],
  ['tahsilat_kategori_ogrenci', 'ogrenci_id', 'ogrenciler'], ['tahsilat_taksit_planlari', 'ogrenci_id', 'ogrenciler'],
  ['yoklama', 'ogrenci_id', 'ogrenciler'],
  ['tahsilat_kayitlari', 'kategori_id', 'tahsilat_kategorileri'], ['tahsilat_kategori_ogrenci', 'kategori_id', 'tahsilat_kategorileri'],
  ['tahsilat_taksit_planlari', 'kategori_id', 'tahsilat_kategorileri'],
  ['denetim_belgeleri', 'madde_id', 'denetim_maddeleri'],
]

/** Benzersizlik kısıtları (canlı şemadakilerle aynı). Boş değer içeren satır kısıta girmez (Postgres davranışı). */
const BENZERSIZ: Record<string, string[][]> = {
  ogrenciler: [['tc', 'okul_id']],
  personel: [['tc', 'okul_id', 'gorev']],
  puantaj: [['personel_id', 'tarih']],
  tahakkuk: [['ay', 'yil', 'okul_id']],
  sgk_eksik_gun: [['personel_id', 'yil', 'ay']],
  ders_programi: [['gun', 'ay', 'yil', 'kulup_adi', 'ders_no', 'okul_id']],
  sinif_defteri: [['gun', 'ay', 'yil', 'kulup_adi', 'ders_no', 'okul_id']],
  isletme_devir: [['yil', 'okul_id', 'birim']],
  ayarlar: [['okul_id']],
  kulup_bilgileri: [['okul_id']],
  denetim_teslimleri: [['okul_id', 'yil', 'ay']],
  denetim_raporlari: [['okul_id', 'yil', 'ay']],
  tatiller: [['ad', 'baslangic_tarihi']],
}

/** Birincil anahtarı `id` olmayan tablolar */
const BIRINCIL: Record<string, string> = { kulup_bilgileri: 'okul_id' }

/** Sütun varsayılanları (canlı şemadaki DEFAULT değerleri) */
const VARSAYILAN: Record<string, Satir> = {
  ogrenciler: { aktif: true, kardes_indirimi: false, ucretsiz_mi: false, ogrenci_turu: 'kulup' },
  personel: { aktif: true, sgk_li: false, vergi_istisnasi: false, is_retired: false, yillik_matrah: 0 },
  siniflar: { aktif: true },
  bordro: { odendi: false },
  tahakkuk: { hesaplandi_mi: false },
  tahsilat_kategorileri: { aktif: true },
  sinif_defteri: { durum: 'geldi', seans: 'sabah', etkinlik_saati: 1 },
  denetim_maddeleri: { aktif: true, zorunlu: true, yillik: false, tip: 'yukleme' },
  denetim_belgeleri: { kaynak: 'yukleme', durum: 'bekliyor' },
  denetim_teslimleri: { durum: 'taslak' },
  okul_bildirimleri: { okundu: false, kaynak: 'duyuru' },
  kulup_bilgileri: { etkinlik_alanlari: [] },
}

/** okul_id'si boş gelirse oturumdaki okul yazılan tablolar (canlıdaki auto_set_okul_id tetikleyicisi). Tatiller hariç: okul_id boş = tüm kurumlar. */
const OKULSUZ = new Set(['iller', 'ilceler', 'okullar', 'profiller', 'tatiller', 'denetim_maddeleri', 'duyurular', 'sistem_ayarlari'])

export class DemoHatasi extends Error {
  constructor(public durum: number, public govde: { code: string; message: string; details?: string | null; hint?: string | null }) {
    super(govde.message)
  }
}

const kopya = <T,>(v: T): T => (v == null || typeof v !== 'object' ? v : JSON.parse(JSON.stringify(v)))

export class DemoDepo {
  readonly tablolar: Record<string, Satir[]>
  private sayaclar: Record<string, number> = {}

  constructor(tablolar: Record<string, Satir[]>) {
    this.tablolar = {}
    for (const [ad, satirlar] of Object.entries(tablolar)) this.tablolar[ad] = satirlar.map(s => ({ ...s }))
  }

  tablo(ad: string): Satir[] {
    return (this.tablolar[ad] ||= [])
  }

  private yeniId(tablo: string): number {
    if (this.sayaclar[tablo] == null) {
      this.sayaclar[tablo] = this.tablo(tablo).reduce((m, s) => (typeof s.id === 'number' && s.id > m ? s.id : m), 0)
    }
    return ++this.sayaclar[tablo]
  }

  // ── Okuma ────────────────────────────────────────────────────
  sec(tablo: string, sorgu: AyrisikSorgu): { satirlar: Satir[]; toplam: number } {
    let satirlar = this.tablo(tablo).filter(s => sorgu.kosullar.every(k => kosulSagla(s, k)))
    satirlar = sirala(satirlar, sorgu.siralama)
    const yansitilan: Satir[] = []
    for (const s of satirlar) {
      const y = this.yansit(tablo, s, sorgu.secim, sorgu.gomuluKosullar)
      if (y) yansitilan.push(y)
    }
    const toplam = yansitilan.length
    const bas = sorgu.offset || 0
    const son = sorgu.limit != null ? bas + sorgu.limit : undefined
    return { satirlar: yansitilan.slice(bas, son), toplam }
  }

  /** Satırı seçim listesine göre şekillendirir; !inner koşulu sağlanmazsa null döner. */
  yansit(tablo: string, satir: Satir, secim: SecimOgesi[], gomuluKosullar: Map<string, Kosul[]> = new Map()): Satir | null {
    const sonuc: Satir = {}
    for (const oge of secim) {
      if (oge.tur === 'yildiz') Object.assign(sonuc, kopya(satir))
      else if (oge.tur === 'kolon') sonuc[oge.takma] = kopya(satir[oge.ad] ?? null)
      else {
        const kosullar = gomuluKosullar.get(oge.takma) || gomuluKosullar.get(oge.tablo) || []
        const iliski = this.iliskiBul(tablo, oge.tablo, oge.ipucu)
        const uygun = (s: Satir) => kosullar.every(k => kosulSagla(s, k))
        if (iliski.yon === 'tekil') {
          const anahtar = satir[iliski.kolon]
          const hedef = anahtar == null ? undefined : this.tablo(oge.tablo).find(s => s.id === anahtar && uygun(s))
          const deger = hedef ? this.yansit(oge.tablo, hedef, oge.alanlar) : null
          if (oge.ic && !deger) return null
          sonuc[oge.takma] = deger
        } else {
          const hedefler = this.tablo(oge.tablo).filter(s => s[iliski.kolon] === satir.id && uygun(s))
          if (oge.ic && hedefler.length === 0) return null
          sonuc[oge.takma] = hedefler.map(h => this.yansit(oge.tablo, h, oge.alanlar)).filter(Boolean)
        }
      }
    }
    return sonuc
  }

  private iliskiBul(kaynak: string, hedef: string, ipucu?: string): { yon: 'tekil' | 'coklu'; kolon: string } {
    const tekil = ILISKILER.filter(([t, k, h]) => t === kaynak && h === hedef && (!ipucu || k === ipucu))
    if (tekil.length) return { yon: 'tekil', kolon: tekil[0][1] }
    const coklu = ILISKILER.filter(([t, k, h]) => t === hedef && h === kaynak && (!ipucu || k === ipucu))
    if (coklu.length) return { yon: 'coklu', kolon: coklu[0][1] }
    // Her okul tablosu okul_id ile okullar'a bağlıdır
    if (hedef === 'okullar' && !OKULSUZ.has(kaynak)) return { yon: 'tekil', kolon: 'okul_id' }
    throw new DesteklenmeyenSorgu(`ilişki: ${kaynak} → ${hedef}`)
  }

  // ── Yazma ────────────────────────────────────────────────────
  private varsayilanlariUygula(tablo: string, giris: Satir): Satir {
    const s: Satir = { ...kopya(VARSAYILAN[tablo] || {}), ...kopya(giris) }
    const pk = BIRINCIL[tablo] || 'id'
    if (pk === 'id' && s.id == null && tablo !== 'profiller') s.id = this.yeniId(tablo)
    if (s.created_at == null && tablo !== 'kulup_bilgileri') s.created_at = new Date().toISOString()
    if (!OKULSUZ.has(tablo) && s.okul_id == null) s.okul_id = DEMO_OKUL_ID
    if ((tablo === 'denetim_belgeleri' || tablo === 'personel_belgeleri') && s.yukleyen == null) s.yukleyen = DEMO_KULLANICI_ID
    return s
  }

  private catisanBul(tablo: string, s: Satir, kolonlar?: string[]): Satir | undefined {
    const listeler = kolonlar ? [kolonlar] : [...(BENZERSIZ[tablo] || []), [BIRINCIL[tablo] || 'id']]
    for (const kl of listeler) {
      if (kl.some(k => s[k] == null || s[k] === '')) continue
      const bulunan = this.tablo(tablo).find(x => x !== s && kl.every(k => String(x[k]) === String(s[k])))
      if (bulunan) return bulunan
    }
    return undefined
  }

  private kisitHatasi(tablo: string): never {
    throw new DemoHatasi(409, {
      code: '23505', message: `duplicate key value violates unique constraint "${tablo}_benzersiz"`,
      details: 'Demo veritabanında aynı anahtarla bir kayıt zaten var.', hint: null,
    })
  }

  ekle(tablo: string, girisler: Satir[], secenek: { cozum?: 'merge' | 'ignore'; catisma?: string[] } = {}): Satir[] {
    this.yazmaKurallari(tablo, 'ekle', girisler)
    const eklenen: Satir[] = []
    for (const giris of girisler) {
      const s = this.varsayilanlariUygula(tablo, giris)
      const catisan = this.catisanBul(tablo, s, secenek.catisma)
      if (catisan) {
        if (secenek.cozum === 'merge') {
          for (const [k, v] of Object.entries(kopya(giris))) if (k !== 'id') catisan[k] = v
          eklenen.push(catisan)
          continue
        }
        if (secenek.cozum === 'ignore') continue
        this.kisitHatasi(tablo)
      }
      this.tablo(tablo).push(s)
      eklenen.push(s)
    }
    return eklenen
  }

  guncelle(tablo: string, kosullar: Kosul[], degisiklik: Satir): Satir[] {
    const hedefler = this.tablo(tablo).filter(s => kosullar.every(k => kosulSagla(s, k)))
    this.yazmaKurallari(tablo, 'guncelle', hedefler)
    for (const s of hedefler) {
      const yeni = { ...s, ...kopya(degisiklik) }
      for (const kl of (BENZERSIZ[tablo] || []).filter(kl => kl.some(k => k in degisiklik))) {
        if (kl.some(k => yeni[k] == null || yeni[k] === '')) continue
        if (this.tablo(tablo).some(x => x !== s && kl.every(k => String(x[k]) === String(yeni[k])))) this.kisitHatasi(tablo)
      }
      Object.assign(s, kopya(degisiklik))
    }
    return hedefler
  }

  sil(tablo: string, kosullar: Kosul[]): Satir[] {
    const liste = this.tablo(tablo)
    const silinen = liste.filter(s => kosullar.every(k => kosulSagla(s, k)))
    this.yazmaKurallari(tablo, 'sil', silinen)
    this.tablolar[tablo] = liste.filter(s => !silinen.includes(s))
    return silinen
  }

  /** Canlıdaki RLS / tetikleyicilerden kullanıcının fark edeceği kurallar. */
  private yazmaKurallari(tablo: string, islem: 'ekle' | 'guncelle' | 'sil', satirlar: Satir[]) {
    if (tablo === 'denetim_belgeleri' && islem !== 'guncelle') {
      for (const s of satirlar) {
        if (!this.denetimDosyasiAcikMi(Number(s.okul_id ?? DEMO_OKUL_ID), Number(s.yil), Number(s.ay)) || (islem === 'sil' && s.durum === 'onaylandi')) {
          throw new DemoHatasi(403, { code: '42501', message: 'new row violates row-level security policy for table "denetim_belgeleri"', details: 'Dosya denetime gönderilmiş; değiştirilemez.', hint: null })
        }
      }
    }
    if (['okullar', 'iller', 'ilceler', 'denetim_maddeleri', 'denetim_teslimleri'].includes(tablo)) {
      throw new DemoHatasi(403, { code: '42501', message: `permission denied for table ${tablo}`, details: null, hint: null })
    }
  }

  denetimDosyasiAcikMi(okulId: number, yil: number, ay: number): boolean {
    return !this.tablo('denetim_teslimleri').some(t => t.okul_id === okulId && t.yil === yil && t.ay === ay && (t.durum === 'gonderildi' || t.durum === 'onaylandi'))
  }

  /** Sunucu tarafı fonksiyonların (RPC) doğrudan yazabilmesi için kuralsız ekleme. */
  icEkle(tablo: string, giris: Satir): Satir {
    const s = this.varsayilanlariUygula(tablo, giris)
    this.tablo(tablo).push(s)
    return s
  }
}

export { sorguAyristir }
