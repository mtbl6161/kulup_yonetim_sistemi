// Aylık bordro hesabı: tahsilat havuzunun Yönerge oranlarıyla dağıtımı, öğretmen saat ücreti,
// görev tavanları ve kişi bazında vergi / SGK kesintileri. Veritabanına dokunmaz; test edilebilir.
import {
  fmt, tatilMi, tavanHesapla, bordroHesapla, detectActiveCategories, tahakkukDagitimHesapla, mukerrerGorevAyikla,
  isOgretmen, isBaskan, isBaskanYrd, isMuhasebe, isTemizlik, isDenetim,
} from './hesaplama'
import type { Ayarlar, Bordro, BordroSatir, Personel, Puantaj, Tatil } from './types'

export interface BordroGirdisi {
  ayarlar: Ayarlar
  /** Bu ay bordroya girebilecek personel (aktifler + ayrılmış ama puantajı / kaydı olanlar) */
  personel: Personel[]
  /** Bu ay daha önce kaydedilmiş bordro satırları (ödendi bilgisi korunur) */
  kaydedilmis: Pick<Bordro, 'id' | 'personel_id' | 'odendi'>[]
  puantaj: Pick<Puantaj, 'personel_id' | 'tarih' | 'saat'>[]
  tatiller: Tatil[]
  ay: number
  yil: number
  /** Ayın gerçekleşen tahsilat toplamı (dağıtılacak havuz) */
  gelir: number
}

export function bordroSatirlariHesapla({ ayarlar, personel: aktifPersonelListesi, kaydedilmis, puantaj: puantajData, tatiller, ay, yil, gelir: finalGelir }: BordroGirdisi) {
  const effectiveTavan = ayarlar.tavan_katsayi || 13184.78

  const isWorking = (p: Personel) => {
    const hasSavedBordro = kaydedilmis.some(b => b.personel_id === p.id)
    if (hasSavedBordro) return true

    if (p.aktif !== false) {
      if (isBaskan(p.gorev) || isBaskanYrd(p.gorev) || isMuhasebe(p.gorev) || isTemizlik(p.gorev) || isDenetim(p.gorev)) {
        return true
      }
      const hasPuantaj = puantajData.some(pu => pu.personel_id === p.id && Number(pu.saat) > 0)
      return hasPuantaj
    }

    const hasPuantaj = puantajData.some(pu => pu.personel_id === p.id && Number(pu.saat) > 0)
    if (hasPuantaj) return true

    return false
  }

  const activeCategories = detectActiveCategories(aktifPersonelListesi, puantajData, kaydedilmis)
  const dagitim = tahakkukDagitimHesapla(finalGelir, ayarlar, activeCategories)

  const pools = {
    ogretmen:  dagitim.ogretmen_havuzu,
    baskan:    dagitim.baskan,
    baskanYrd: dagitim.baskan_yrd,
    muhasebe:  dagitim.muhasebe,
    temizlik:  dagitim.temizlik,
    denetim:   dagitim.denetim,
  }

  // Öğretmen türündeki personel ve saatleri
  const ogretmenler = aktifPersonelListesi.filter(p => isOgretmen(p.gorev))
  const ogretmenSaatMap = new Map<number, number>()
  ogretmenler.forEach(p => {
    const pSaatler = puantajData.filter(x => x.personel_id === p.id)
    const toplamSaat = pSaatler.filter(x => {
      const d = Number(x.tarih.split('T')[0].split('-')[2])
      return !tatilMi(ay, d, yil, tatiller)
    }).reduce((sum, x) => sum + (Number(x.saat) || 0), 0)
    ogretmenSaatMap.set(p.id, toplamSaat)
  })
  const toplamOgretmenSaat = ogretmenler.reduce((s, p) => s + (ogretmenSaatMap.get(p.id) || 0), 0)

  const ogretmenBrutMap = new Map<number, number>()
  let ogretmenBirimSaatUcreti = 0
  if (toplamOgretmenSaat > 0) {
    // Kullanıcı manuel ücret girmemişse havuzu saatlere böl (Dinamik), girmişse onu kullan (Manuel)
    ogretmenBirimSaatUcreti = (ayarlar.ogretmen_saat_ucreti && ayarlar.ogretmen_saat_ucreti > 0) 
      ? ayarlar.ogretmen_saat_ucreti 
      : Math.floor(pools.ogretmen / toplamOgretmenSaat) // küsürat atılır: 480,90 → 480,00
    
    ogretmenler.forEach(p => {
      const saat = ogretmenSaatMap.get(p.id) || 0
      let pay = ogretmenBirimSaatUcreti * saat
      const tavan = tavanHesapla(p.gorev, effectiveTavan, !!p.sgk_li)
      if (pay > tavan) pay = tavan
      ogretmenBrutMap.set(p.id, Math.round(pay * 100) / 100)
    })
  }

  // Sadece aktif personeller üzerinden dağıtım yap (Excel mantığı)
  const aktifPersonel = aktifPersonelListesi.filter(isWorking)
  const baskanSayisi = aktifPersonel.filter(p => isBaskan(p.gorev)).length || 1
  const baskanYrdSay = aktifPersonel.filter(p => isBaskanYrd(p.gorev)).length || 1
  const muhasebeSay  = aktifPersonel.filter(p => isMuhasebe(p.gorev)).length || 1
  const temizlikSay  = aktifPersonel.filter(p => isTemizlik(p.gorev)).length || 1
  const denetimSay   = aktifPersonel.filter(p => isDenetim(p.gorev)).length || 1

  const hesapAyarlar: Ayarlar = { ...ayarlar, tavan_katsayi: effectiveTavan }

  const tumSatirlar: BordroSatir[] = aktifPersonelListesi.map(p => {
    const pSaat = ogretmenSaatMap.get(p.id) || 0
    let havuzBrut: number
    if (isOgretmen(p.gorev)) havuzBrut = ogretmenBrutMap.get(p.id) || 0
    else if (isBaskan(p.gorev)) havuzBrut = Math.round(pools.baskan / baskanSayisi * 100) / 100
    else if (isBaskanYrd(p.gorev)) havuzBrut = Math.round(pools.baskanYrd / baskanYrdSay * 100) / 100
    else if (isMuhasebe(p.gorev)) havuzBrut = Math.round(pools.muhasebe / muhasebeSay * 100) / 100
    else if (isTemizlik(p.gorev)) havuzBrut = Math.round(pools.temizlik / temizlikSay * 100) / 100
    else if (isDenetim(p.gorev)) havuzBrut = Math.round(pools.denetim / denetimSay * 100) / 100
    else havuzBrut = 0

    const hamBrut = havuzBrut
    const mevcut = kaydedilmis.find(b => b.personel_id === p.id)
    const sonuc = bordroHesapla(hesapAyarlar, pSaat, Number(p.yillik_matrah || 0), !!p.sgk_li, !!p.is_retired, p.gorev, havuzBrut, p.vergi_istisnasi,
      p.vergi_istisna_tipi === 'tutar' ? { gv: Number(p.istisna_gv_tutari || 0), dv: Number(p.istisna_dv_tutari || 0) } : undefined)
    
    // Excel uyumlu "Saat Ücreti" gösterim metni (display string)
    let sUcretDisplay: string
    if (isOgretmen(p.gorev)) {
      sUcretDisplay = fmt(ogretmenBirimSaatUcreti)
    } else if (isBaskan(p.gorev)) {
      sUcretDisplay = `%${dagitim.pct_baskan}`
    } else if (isBaskanYrd(p.gorev)) {
      sUcretDisplay = `%${dagitim.pct_baskan_yrd}`
    } else if (isMuhasebe(p.gorev)) {
      sUcretDisplay = `%${dagitim.pct_muhasebe}`
    } else if (isTemizlik(p.gorev)) {
      sUcretDisplay = `%${dagitim.pct_temizlik} / ${temizlikSay}`
    } else if (isDenetim(p.gorev)) {
      sUcretDisplay = `%${dagitim.pct_denetim}`
    } else {
      sUcretDisplay = "0"
    }

    if (isDenetim(p.gorev)) {
      // Denetim Yetkilisi: Brüt = Net (Excel standardı)
      sonuc.brut = havuzBrut
      sonuc.gv_matrah = 0
      sonuc.gv_hesaplanan = 0; sonuc.gv_istisna = 0; sonuc.gv = 0
      sonuc.dv_hesaplanan = 0; sonuc.dv_istisna = 0; sonuc.dv = 0
      sonuc.sgk_kisi = 0; sonuc.sgk_issizlik = 0; sonuc.toplam_kesinti = 0
      sonuc.sgk_isveren = 0
      sonuc.sgk_detay_kisa = 0; sonuc.sgk_detay_malulluk = 0
      sonuc.sgk_detay_saglik = 0; sonuc.sgk_detay_issizlik = 0
      sonuc.sgk_detay_toplam = 0
      sonuc.net = havuzBrut
    }

    return {
      personel: p,
      toplamSaat: pSaat,
      saatUcreti: sUcretDisplay,
      hamBrut,
      sonuc,
      odendi: !!mevcut?.odendi,
      bordroId: mevcut?.id
    }
  })

  // Aynı kişi birden fazla görevdeyse yalnızca yüksek ücretli görev ödenir; diğerinin payı okulda kalır
  const { kalan: yeniSatirlar, elenen: elenenGorevler } = mukerrerGorevAyikla(tumSatirlar)
  return { yeniSatirlar, elenenGorevler }
}
