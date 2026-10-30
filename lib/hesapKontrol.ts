// ============================================================
// Denetçi Hesap Kontrolü — "Kulüp Denetim Programı" Excel'inin kontrol ekranı
// Kaydedilmiş bordroyu sistemin kurallarıyla yeniden doğrular:
// dağıtım havuzları, birim saat ücreti, tavan, SGK, vergi, istisna üst sınırları,
// kesinti/net aritmetiği ve mükerrer görev. Veri girişi gerektirmez.
// ============================================================
import {
  AYLAR, fmt, tahakkukDagitimHesapla, detectActiveCategories, tavanHesapla, gorevTavanYuzdesi, kisiGruplari,
  isOgretmen, isBaskan, isBaskanYrd, isMuhasebe, isTemizlik, isDenetim,
} from './hesaplama'
import { Ayarlar, Personel } from './types'

export type KontrolDurum = 'ok' | 'uyari' | 'hata' | 'bilgi'

export interface KontrolBulgu {
  baslik: string
  durum: KontrolDurum
  aciklama?: string   // ne bulundu (rakamlarla)
  kural?: string      // hangi kurala / hesaba göre
  oneri?: string      // ne yapılmalı
  beklenen?: number
  bulunan?: number
}

export interface KontrolBordro {
  id: number
  personel_id: number
  toplam_saat: number
  brut: number
  gv_matrah?: number | null
  gv_oran?: number | null
  gv_hesaplanan?: number | null
  gv_istisna_tutari?: number | null
  gv_tutar: number
  dv_hesaplanan?: number | null
  dv_istisna_tutari?: number | null
  damga_tutar: number
  sgk_kisi: number
  sgk_issizlik_kisi?: number | null
  sgk_issizlik?: number | null
  sgk_isveren?: number | null
  toplam_kesinti: number
  net: number
  odendi: boolean
  personel?: Personel | null
}

export type Kategori = 'ogretmen' | 'baskan' | 'baskan_yrd' | 'muhasebe' | 'temizlik' | 'denetim' | 'diger'

export const KATEGORI_AD: Record<Kategori, string> = {
  ogretmen: 'Öğretmen / Usta Öğretici',
  baskan: 'Kulüp Başkanı (Müdür)',
  baskan_yrd: 'Başkan Yrd. (Müdür Yrd.)',
  muhasebe: 'Muhasebe',
  temizlik: 'Temizlik',
  denetim: 'Denetim Yetkilisi',
  diger: 'Diğer',
}

export function kategoriBul(gorev: string | null | undefined): Kategori {
  if (isDenetim(gorev)) return 'denetim'
  if (isOgretmen(gorev)) return 'ogretmen'
  if (isBaskanYrd(gorev)) return 'baskan_yrd'
  if (isBaskan(gorev)) return 'baskan'
  if (isMuhasebe(gorev)) return 'muhasebe'
  if (isTemizlik(gorev)) return 'temizlik'
  return 'diger'
}

export interface DagitimSatir {
  kategori: Kategori | 'temel_gider'
  ad: string
  oran: number
  havuz: number
  dagitilan: number
  kisi: number
  durum: KontrolDurum
}

export interface KisiKontrol {
  satir: KontrolBordro
  ad: string
  gorev: string
  kategori: Kategori
  tavan: number
  beklenenBrut: number
  sgkToplam: number
  gvIstisnaSiniri: number
  dvIstisnaSiniri: number
  efektifGvOrani: number | null
  baskaKurum: string[] // başka kurumda çalıştığına dair işaretler
  bulgular: KontrolBulgu[]
  durum: KontrolDurum
}

/** Banka karşılaştırması için ham veriler — yalnızca kulüp aidatı (kırtasiye vb. dahil edilmez) */
export interface BankaGirdi {
  /** Ayın banka (işletme defteri) gelir hareketleri; boşsa ekstre yüklenmemiş sayılır */
  defterGelir: { tutar: number; tarih?: string | null }[]
  /** Bu aya ait (ay/yil) VEYA tarihi bu ay içinde olan kulüp aidatı tahsilatları */
  tahsilatlar: { id: number; tutar: number; tarih?: string | null; ay: number; yil: number; ad?: string }[]
  /** hesap_hareketleri'ne işlenmiş tahsilat id'leri (kaynak = 'tahsilat') */
  hareketliTahsilatIdleri: Set<number>
}

export interface BankaKontrol {
  ekstreVar: boolean
  buAyYatanAidat: number      // bu ay ödendiği kayıtlı kulüp aidatı (hangi aya ait olursa olsun)
  buAyYatanAdet: number
  aidatBuAyYatan: number      // bu aya ait, bu ay yatan
  aidatOncedenYatan: number   // bu aya ait, önceki aylarda yatan (peşin)
  aidatSonradanYatan: number  // bu aya ait, sonraki aylarda yatan (gecikmeli)
  baskaAyAidat: number        // başka aya ait, bu ay yatan
  bankadaBulunan: number      // banka hareketleriyle eşleşen kulüp aidatı
  bankadaBulunmayan: number   // banka hareketlerinde karşılığı bulunamayan kulüp aidatı
  bulunmayanlar: { ad?: string; tarih?: string | null; tutar: number }[]
  hareketsizTahsilat: number  // hesap hareketlerine işlenmemiş tahsilat sayısı
}

/** Banka hareketiyle eşleştirmede kabul edilen en büyük tarih farkı (gün) */
export const BANKA_TARIH_TOLERANSI = 5

export interface HesapKontrolSonuc {
  toplamGelir: number
  tavanKatsayi: number
  genel: KontrolBulgu[]
  banka: BankaKontrol | null
  dagitim: DagitimSatir[]
  birimSaat: { beklenen: number; manuel: boolean; toplamSaat: number; havuz: number }
  kisiler: KisiKontrol[]
  muhtasar: {
    gvMatrah: number; gvHesaplanan: number; gvIstisna: number; gv: number
    dvHesaplanan: number; dvIstisna: number; dv: number
    sgkKisi: number; sgkIssizlik: number; sgkIsveren: number
    brut: number; net: number; sgkliSayisi: number; kadroluSayisi: number
  }
  ozet: { hata: number; uyari: number; ok: number }
}

const r2 = (n: number) => Math.round(n * 100 + 1e-9) / 100
const tl = (n: number) => `${fmt(n)} TL`
const sayi = (n: number) => n.toLocaleString('tr-TR', { maximumFractionDigits: 2 })
const ARITMETIK_TOL = 0.05 // kuruş yuvarlamaları
const BRUT_TOL = 1         // havuz payı / saat ücreti yuvarlamaları
const YONERGE_ORAN = { temel: 26, ogretmen: 55, baskan: 7, baskan_yrd: 5, muhasebe: 2, temizlik: 4, denetim: 1 }

const DURUM_AGIRLIK: Record<KontrolDurum, number> = { ok: 0, bilgi: 0, uyari: 1, hata: 2 }
function enKotu(b: KontrolBulgu[]): KontrolDurum {
  return b.reduce<KontrolDurum>((acc, x) => DURUM_AGIRLIK[x.durum] > DURUM_AGIRLIK[acc] ? x.durum : acc, 'ok')
}

/** Asgari ücrete isabet eden aylık GV istisnasının yasal üst sınırı (kümülatif matrahla; Temmuz'dan sonra dilim değişir) */
export function aylikGvIstisnaSiniri(ay: number, ayarlar: Ayarlar): number {
  if (ayarlar.gv_istisna_sabiti && ayarlar.gv_istisna_sabiti > 0) return ayarlar.gv_istisna_sabiti
  const asgariMatrah = r2((ayarlar.asgari_ucret || 0) * (1 - (ayarlar.sgk_kisi_pay || 0.14) - (ayarlar.sgk_issizlik_kisi || 0.01)))
  const dilimler = ayarlar.vergi_dilimleri || []
  if (!asgariMatrah || dilimler.length === 0) return 0
  // Kümülatif tutarlar yuvarlanmadan farkı alınır (yuvarlanmış farklar 1 kuruş kaydırır: 4211,32 ≠ 4211,33)
  const gv = (m: number) => {
    let v = 0, prev = 0
    for (const d of dilimler) { if (m <= prev) break; v += (Math.min(m, d.ust) - prev) * d.oran; prev = d.ust }
    return v
  }
  return r2(gv(asgariMatrah * ay) - gv(asgariMatrah * (ay - 1)))
}

export function aylikDvIstisnaSiniri(ayarlar: Ayarlar): number {
  if (ayarlar.dv_istisna_sabiti && ayarlar.dv_istisna_sabiti > 0) return ayarlar.dv_istisna_sabiti
  return r2((ayarlar.asgari_ucret || 0) * (ayarlar.damga_vergi_orani || 0.00759))
}

export function hesapKontrolEt(girdi: {
  ayarlar: Ayarlar
  ay: number
  yil: number
  toplamGelir: number
  bordro: KontrolBordro[]
  personel: Personel[]
  banka?: BankaGirdi
  /** personel_id → il içinde aynı T.C. ile kaydı bulunan diğer okulların adları */
  digerOkulKayitlari?: Map<number, string[]>
}): HesapKontrolSonuc {
  const { ayarlar, ay, yil, toplamGelir, bordro, personel } = girdi
  const genel: KontrolBulgu[] = []

  const tavanKatsayi = ayarlar.tavan_katsayi || r2(9500 * (ayarlar.katsayi || 0)) || 13184.78
  const oranlar = {
    temel: ayarlar.dagitim_temel_gider ?? YONERGE_ORAN.temel,
    ogretmen: ayarlar.dagitim_ogretmen ?? YONERGE_ORAN.ogretmen,
    baskan: ayarlar.dagitim_baskan ?? YONERGE_ORAN.baskan,
    baskan_yrd: ayarlar.dagitim_baskan_yrd ?? YONERGE_ORAN.baskan_yrd,
    muhasebe: ayarlar.dagitim_muhasebe ?? YONERGE_ORAN.muhasebe,
    temizlik: ayarlar.dagitim_temizlik ?? YONERGE_ORAN.temizlik,
    denetim: ayarlar.dagitim_denetim ?? YONERGE_ORAN.denetim,
  }
  const effAyarlar: Ayarlar = {
    ...ayarlar, tavan_katsayi: tavanKatsayi,
    dagitim_temel_gider: oranlar.temel, dagitim_ogretmen: oranlar.ogretmen, dagitim_baskan: oranlar.baskan,
    dagitim_baskan_yrd: oranlar.baskan_yrd, dagitim_muhasebe: oranlar.muhasebe, dagitim_temizlik: oranlar.temizlik,
    dagitim_denetim: oranlar.denetim,
  }

  // ---------- Genel kontroller ----------
  const donemAd = `${AYLAR[ay]} ${yil}`
  if (toplamGelir <= 0) {
    genel.push({
      baslik: 'Aylık tahsilat yok', durum: 'hata',
      aciklama: `${donemAd} dönemine ait hiç aidat tahsilatı kayıtlı değil. Dağıtıma esas tutar 0 TL olduğu için gider kalemleri ve personel ücretleri hesaplanamaz.`,
      kural: 'Gider kalemleri ve personel payları, ilgili aya ait aidat tahsilatlarının toplamı (dağıtıma esas tutar) üzerinden dağıtılır.',
      oneri: 'Okuldan bu aya ait tahsilatları sisteme girmesini isteyin. Tahsilat yoksa bu ay için ücret ödenmemesi gerekir.',
    })
  } else {
    genel.push({
      baslik: 'Dağıtıma esas tutar', durum: 'ok', bulunan: toplamGelir,
      aciklama: `${donemAd} dönemine ait aidat tahsilatlarının toplamı ${tl(toplamGelir)}. Gider dağılımı ve personel payları bu tutar üzerinden kontrol edildi.`,
    })
  }

  if (bordro.length === 0) {
    genel.push({
      baslik: 'Bordro yok', durum: 'hata',
      aciklama: `${donemAd} için kaydedilmiş bordro bulunamadı. Personel ücretleri, vergi ve SGK kesintileri kontrol edilemedi.`,
      oneri: 'Okul bordroyu hesaplayıp kaydetmeden dosya onaylanmamalı.',
    })
  }

  // ---------- Banka ↔ kulüp aidatı (kırtasiye vb. dahil edilmez) ----------
  const banka = girdi.banka ? bankaKarsilastir(girdi.banka, ay, yil) : null
  if (banka) {
    if (banka.hareketsizTahsilat > 0) {
      genel.push({
        baslik: 'Hesap hareketine işlenmemiş tahsilat', durum: 'uyari',
        aciklama: `Bu aya ait ${banka.hareketsizTahsilat} tahsilat kaydının hesap hareketleri defterinde karşılığı yok. Kayıt silinip yeniden girilmiş ya da toplu aktarımda atlanmış olabilir.`,
        kural: 'Ödeme Takip ekranından girilen her tahsilat, hesap hareketlerine gelir olarak otomatik işlenir.',
        oneri: 'Okuldan hesap hareketleri dökümünü kontrol etmesini isteyin; işlenmeyen tahsilatlar gelir-gider tablolarında eksik görünür.',
      })
    }
  }

  const ORAN_AD: Record<keyof typeof YONERGE_ORAN, string> = {
    temel: 'Temel giderler', ogretmen: 'Öğretmen / usta öğretici', baskan: 'Kulüp başkanı', baskan_yrd: 'Başkan yardımcısı',
    muhasebe: 'Muhasebe', temizlik: 'Temizlik', denetim: 'Denetim yetkilisi',
  }
  const YONERGE_METIN = 'Yönerge dağılımı: temel giderler %26, öğretmen / usta öğretici %55, kulüp başkanı %7, başkan yardımcısı %5, muhasebe %2, temizlik %4, denetim yetkilisi %1.'
  const oranToplam = Object.values(oranlar).reduce((s, x) => s + Number(x || 0), 0)
  if (Math.abs(oranToplam - 100) > 0.001) {
    genel.push({
      baslik: 'Dağıtım oranlarının toplamı %100 değil', durum: 'hata', beklenen: 100, bulunan: oranToplam,
      aciklama: `Okulun ayarlarındaki dağıtım oranlarının toplamı %${sayi(oranToplam)}. Aradaki %${sayi(Math.abs(100 - oranToplam))} fark, gelirin ${oranToplam < 100 ? 'bir kısmının hiçbir kaleme dağıtılmamasına' : 'olduğundan fazla dağıtılmasına'} yol açar.`,
      kural: YONERGE_METIN,
      oneri: 'Okulun Ayarlar ekranındaki tahakkuk dağılım oranları düzeltilip bordro yeniden hesaplanmalı.',
    })
  } else {
    const farkli = (Object.keys(YONERGE_ORAN) as (keyof typeof YONERGE_ORAN)[]).filter(k => Number(oranlar[k]) !== YONERGE_ORAN[k])
    genel.push(farkli.length
      ? {
        baslik: 'Yönergeden farklı dağıtım oranı', durum: 'uyari',
        aciklama: `Okul şu kalemlerde yönergeden farklı oran kullanıyor: ${farkli.map(k => `${ORAN_AD[k]} %${sayi(Number(oranlar[k]))} (yönerge %${YONERGE_ORAN[k]})`).join(', ')}.`,
        kural: YONERGE_METIN,
        oneri: 'Farklı oranın dayanağı (kurul kararı vb.) okuldan istenmeli; dayanağı yoksa oranlar düzeltilip bordro yeniden hesaplanmalı.',
      }
      : { baslik: 'Dağıtım oranları', durum: 'ok', aciklama: YONERGE_METIN.replace('Yönerge dağılımı:', 'Yönerge oranları uygulanmış:') })
  }

  // ---------- Dağıtım havuzları ----------
  const active = detectActiveCategories(personel, [], bordro)
  const d = tahakkukDagitimHesapla(toplamGelir, effAyarlar, active)
  const havuz: Record<Exclude<Kategori, 'diger'>, number> = {
    ogretmen: d.ogretmen_havuzu, baskan: d.baskan, baskan_yrd: d.baskan_yrd,
    muhasebe: d.muhasebe, temizlik: d.temizlik, denetim: d.denetim,
  }
  const pct: Record<Exclude<Kategori, 'diger'>, number> = {
    ogretmen: d.pct_ogretmen, baskan: d.pct_baskan, baskan_yrd: d.pct_baskan_yrd,
    muhasebe: d.pct_muhasebe, temizlik: d.pct_temizlik, denetim: d.pct_denetim,
  }

  const satirKat = bordro.map(b => ({ b, kat: kategoriBul(b.personel?.gorev) }))
  const katSatirlari = (k: Kategori) => satirKat.filter(x => x.kat === k).map(x => x.b)

  // Öğretmen birim saat ücreti (bordro üretimiyle aynı kural: manuel değer yoksa havuz / toplam saat, küsurat atılır)
  const ogretmenSatirlari = katSatirlari('ogretmen')
  const toplamOgretmenSaat = ogretmenSatirlari.reduce((s, b) => s + Number(b.toplam_saat || 0), 0)
  const manuelSaat = !!(ayarlar.ogretmen_saat_ucreti && ayarlar.ogretmen_saat_ucreti > 0)
  const havuzdanSaat = toplamOgretmenSaat > 0 ? Math.floor(havuz.ogretmen / toplamOgretmenSaat) : 0
  const birimSaat = manuelSaat ? Number(ayarlar.ogretmen_saat_ucreti) : havuzdanSaat
  const birimSaatKurali = manuelSaat
    ? `Öğretmen birim saat ücreti ayarlarda elle ${tl(birimSaat)} girilmiş.`
    : `Öğretmen birim saat ücreti = öğretmen payı ${tl(havuz.ogretmen)} ÷ toplam ${sayi(toplamOgretmenSaat)} ders saati = ${tl(birimSaat)} (küsurat atılır).`
  if (manuelSaat) {
    genel.push({
      baslik: 'Saat ücreti elle girilmiş', durum: 'bilgi',
      aciklama: `Öğretmen saat ücreti havuzdan hesaplanmıyor; ayarlarda elle ${tl(birimSaat)} girilmiş.${toplamOgretmenSaat > 0 ? ` Havuzdan hesaplansaydı ${tl(havuzdanSaat)} olurdu (öğretmen payı ${tl(havuz.ogretmen)} ÷ ${sayi(toplamOgretmenSaat)} saat).` : ''}`,
      oneri: 'Elle girilen ücretin dayanağı okuldan sorulmalı; öğretmen payının tamamının dağıtılıp dağıtılmadığını gider kalemleri tablosundan kontrol edin.',
    })
  }

  const dagitim: DagitimSatir[] = (Object.keys(havuz) as Exclude<Kategori, 'diger'>[]).map(k => {
    const s = katSatirlari(k)
    const dagitilan = r2(s.reduce((t, b) => t + Number(b.brut || 0), 0))
    return {
      kategori: k, ad: KATEGORI_AD[k], oran: pct[k], havuz: havuz[k], dagitilan, kisi: s.length,
      durum: dagitilan > havuz[k] + BRUT_TOL ? 'hata' : 'ok',
    }
  })
  const dagitilanToplam = dagitim.reduce((s, x) => s + x.dagitilan, 0)
  dagitim.unshift({
    kategori: 'temel_gider', ad: 'Temel Giderler', oran: d.pct_temel_gider, havuz: d.temel_gider,
    dagitilan: r2(toplamGelir - dagitilanToplam), kisi: 0, durum: 'bilgi',
  })
  const asan = dagitim.filter(x => x.durum === 'hata')
  if (asan.length) {
    genel.push({
      baslik: 'Gider kalemi payı aşılmış', durum: 'hata',
      aciklama: `Şu kalemlerde personele kalemin payından fazla brüt ödenmiş: ${asan.map(x => `${x.ad} — pay ${tl(x.havuz)} (%${sayi(x.oran)}), dağıtılan ${tl(x.dagitilan)}, ${tl(x.dagitilan - x.havuz)} fazla`).join('; ')}.`,
      kural: 'Her kaleme en fazla, dağıtıma esas tutarın o kaleme ayrılan oranı kadar ödeme yapılabilir; tavan nedeniyle dağıtılamayan tutar okulda (temel giderde) kalır.',
      oneri: 'Fazla ödenen tutar ilgili personelden geri alınmalı ve bordro yeniden hesaplanmalı.',
    })
  }
  const digerSatir = katSatirlari('diger')
  if (digerSatir.length) {
    genel.push({
      baslik: 'Görevi tanımsız personel', durum: 'uyari',
      aciklama: `${digerSatir.map(b => `${b.personel?.ad || '#' + b.personel_id} (“${b.personel?.gorev || 'görev yok'}”)`).join(', ')} için görev hiçbir gider kalemine uymuyor; ücretin hangi paydan ödendiği kontrol edilemedi.`,
      oneri: 'Personel kartında görev; Başkan, Başkan Yardımcısı, Öğretmen, Koordinatör Öğretmen, Usta Öğretici, Muhasebe, Temizlik veya Denetim Yetkilisi olarak seçilmeli.',
    })
  }

  // ---------- Kişi bazında ----------
  const gvSinirGenel = aylikGvIstisnaSiniri(ay, ayarlar)
  const dvSinirGenel = aylikDvIstisnaSiniri(ayarlar)
  const damgaOrani = ayarlar.damga_vergi_orani || 0.00759
  const damgaMetin = `binde ${sayi(damgaOrani * 1000)}`
  const sgkOrani = ayarlar.sgk_kisi_pay || 0.14
  const issOrani = ayarlar.sgk_issizlik_kisi || 0.01
  const dilimOranlari = new Set((ayarlar.vergi_dilimleri || []).map(x => Number(x.oran)))
  const minOran = dilimOranlari.size ? Math.min(...dilimOranlari) : 0.15
  const maxOran = dilimOranlari.size ? Math.max(...dilimOranlari) : 0.40

  const grup = kisiGruplari(bordro.map(b => ({ id: b.personel_id, ad: b.personel?.ad || '', tc: b.personel?.tc, iban: b.personel?.iban })))
  const grupUyeleri = new Map<string, KontrolBordro[]>()
  bordro.forEach(b => { const g = grup.get(b.personel_id)!; grupUyeleri.set(g, [...(grupUyeleri.get(g) || []), b]) })

  const kisiler: KisiKontrol[] = satirKat.map(({ b, kat }) => {
    const p = b.personel
    const gorev = p?.gorev || ''
    const bulgular: KontrolBulgu[] = []
    const brut = Number(b.brut || 0)
    const tavan = tavanHesapla(gorev, tavanKatsayi, p ? !!p.sgk_li : undefined)
    const tavanKurali = `Tavan = en yüksek devlet memuru brüt aylığı ${tl(tavanKatsayi)} × ${gorev || 'görev'}${p && (kat === 'ogretmen') ? (p.sgk_li ? ' (resmî görevi yok)' : ' (resmî görevli)') : ''} oranı %${gorevTavanYuzdesi(gorev, p ? !!p.sgk_li : undefined)} = ${tl(tavan)} (Çocuk Kulüpleri Yönergesi md. 16).`

    // Tavan
    if (brut > tavan + 0.01) {
      bulgular.push({
        baslik: 'Tavan aşılmış', durum: 'hata', beklenen: tavan, bulunan: brut,
        aciklama: `Brüt ücret ${tl(brut)}; ${gorev} görevi için ödenebilecek en yüksek tutar ${tl(tavan)}. ${tl(brut - tavan)} fazla ödenmiş.`,
        kural: tavanKurali,
        oneri: 'Fazla ödenen tutar personelden geri alınmalı; bordro tavanla sınırlanarak yeniden hesaplanmalı.',
      })
    }

    // Beklenen brüt (havuz payı / saat ücreti)
    let beklenenBrut = 0
    let beklenenKurali = ''
    if (kat === 'ogretmen') {
      const ham = r2(birimSaat * Number(b.toplam_saat || 0))
      beklenenBrut = r2(Math.min(ham, tavan))
      beklenenKurali = `${birimSaatKurali} ${sayi(Number(b.toplam_saat || 0))} saat × ${tl(birimSaat)} = ${tl(ham)}${ham > tavan ? `; tavan ${tl(tavan)} ile sınırlanır` : ''}.`
    } else if (kat !== 'diger') {
      const n = katSatirlari(kat).length || 1
      const kisiBasi = r2(havuz[kat] / n)
      beklenenBrut = kat === 'denetim' ? kisiBasi : r2(Math.min(kisiBasi, tavan))
      beklenenKurali = `${KATEGORI_AD[kat]} payı: dağıtıma esas tutar ${tl(toplamGelir)} × %${sayi(pct[kat])} = ${tl(havuz[kat])}${n > 1 ? `; bu kalemde ${n} kişi olduğundan kişi başı ${tl(kisiBasi)}` : ''}${kat !== 'denetim' && kisiBasi > tavan ? `; tavan ${tl(tavan)} ile sınırlanır` : ''}.`
    }
    // Fark tamamen tavan aşımından geliyorsa ikinci kez yazılmaz (tavan bulgusu açıklıyor)
    const tavanAciklar = brut > tavan + 0.01 && beklenenBrut >= tavan - 0.01
    if (kat !== 'diger' && !tavanAciklar && Math.abs(beklenenBrut - brut) > BRUT_TOL) {
      const fazla = brut > beklenenBrut
      bulgular.push({
        baslik: fazla ? 'Olması gerekenden fazla ödeme' : 'Olması gerekenden az ödeme',
        durum: 'uyari', beklenen: beklenenBrut, bulunan: brut,
        aciklama: `Bordroda brüt ${tl(brut)}, olması gereken ${tl(beklenenBrut)}. Personele ${tl(Math.abs(brut - beklenenBrut))} ${fazla ? 'fazla' : 'eksik'} brüt ödenmiş.`,
        kural: beklenenKurali,
        oneri: kat === 'ogretmen'
          ? (fazla ? 'Bordrodaki ders saati puantaj ve sınıf defteriyle karşılaştırılmalı; fazla ödeme varsa geri alınmalı.' : 'Eksik ödemenin nedeni (rapor, devamsızlık, sonradan girilen ders) okuldan sorulmalı; nedensizse bordro yeniden hesaplanmalı.')
          : (fazla ? 'Kalemin payından fazla ödeme yapılmış; fark geri alınmalı.' : 'Eksik ödemenin nedeni okuldan sorulmalı; ödenmeyen pay okulda kalır.'),
      })
    }

    const ayniKisi = grupUyeleri.get(grup.get(b.personel_id)!) || []
    if (ayniKisi.length > 1) {
      bulgular.push({
        baslik: 'Aynı kişiye birden fazla görevden ödeme', durum: 'hata',
        aciklama: `Bu kişi aynı T.C. / IBAN ile bu bordroda ${ayniKisi.length} ayrı görevden ücret almış: ${ayniKisi.map(x => `${x.personel?.gorev || '?'} ${tl(Number(x.brut || 0))}`).join(', ')}.`,
        kural: 'Birden fazla görevi olan personel yalnızca ücreti en yüksek görevin ücretini alır; diğer görevin payı okulda kalır.',
        oneri: 'Düşük ücretli görevden yapılan ödeme geri alınmalı ve bordro yeniden hesaplanmalı.',
      })
    }

    const sgkKisi = Number(b.sgk_kisi || 0)
    const sgkIss = Number(b.sgk_issizlik_kisi ?? b.sgk_issizlik ?? 0)
    let efektifGvOrani: number | null = null
    let gvSinir = 0, dvSinir = 0

    if (kat === 'denetim') {
      if (Math.abs(Number(b.net || 0) - brut) > ARITMETIK_TOL) {
        bulgular.push({
          baslik: 'Denetim yetkilisinden kesinti yapılmış', durum: 'uyari', beklenen: brut, bulunan: Number(b.net || 0),
          aciklama: `Denetim yetkilisine net ${tl(Number(b.net || 0))} ödenmiş; brüt ${tl(brut)}. ${tl(brut - Number(b.net || 0))} kesinti yapılmış görünüyor.`,
          kural: 'Sistemde denetim yetkilisi payı kesintisiz ödenir (brüt = net).',
          oneri: 'Kesintinin nedeni okuldan sorulmalı.',
        })
      }
    } else {
      // SGK
      if (p?.sgk_li) {
        const emekli = !!p.is_retired
        const beklSgk = r2(brut * (emekli ? 0.075 : sgkOrani))
        const beklIss = emekli ? 0 : r2(brut * issOrani)
        if (Math.abs(beklSgk - sgkKisi) > ARITMETIK_TOL) {
          bulgular.push({
            baslik: 'SGK işçi payı hatalı', durum: 'hata', beklenen: beklSgk, bulunan: sgkKisi,
            aciklama: `SGK işçi payı ${tl(sgkKisi)} kesilmiş; brüt ${tl(brut)} × %${sayi((emekli ? 0.075 : sgkOrani) * 100)} = ${tl(beklSgk)} olmalı. ${tl(Math.abs(beklSgk - sgkKisi))} ${sgkKisi < beklSgk ? 'eksik' : 'fazla'} kesinti.`,
            kural: emekli ? 'Emekli (SGDP) personelden %7,5 sosyal güvenlik destek primi kesilir.' : `SGK'lı personelin brüt ücretinden %${sayi(sgkOrani * 100)} oranında SGK işçi payı kesilir.`,
            oneri: 'Hatalı kesinti SGK bildirgesini de etkiler; bordro ve SGK bildirimi düzeltilmeli.',
          })
        }
        if (Math.abs(beklIss - sgkIss) > ARITMETIK_TOL) {
          bulgular.push({
            baslik: 'İşsizlik sigortası işçi payı hatalı', durum: 'hata', beklenen: beklIss, bulunan: sgkIss,
            aciklama: emekli
              ? `Emekli personelden ${tl(sgkIss)} işsizlik sigortası kesilmiş; kesilmemesi gerekir.`
              : `İşsizlik sigortası işçi payı ${tl(sgkIss)} kesilmiş; brüt ${tl(brut)} × %${sayi(issOrani * 100)} = ${tl(beklIss)} olmalı.`,
            kural: emekli ? 'Emekli (SGDP) personelden işsizlik sigortası primi kesilmez.' : `SGK'lı personelin brüt ücretinden %${sayi(issOrani * 100)} oranında işsizlik sigortası işçi payı kesilir.`,
            oneri: 'Bordro ve SGK bildirimi düzeltilmeli.',
          })
        }
      } else if (sgkKisi + sgkIss > 0) {
        bulgular.push({
          baslik: 'Kadrolu personelden SGK kesintisi', durum: 'uyari', bulunan: r2(sgkKisi + sgkIss),
          aciklama: `Personel kartında SGK'lı değil (kadrolu) görünüyor ama ${tl(r2(sgkKisi + sgkIss))} SGK / işsizlik kesintisi yapılmış.`,
          kural: 'Kadrolu personelin kulüp ücretinden SGK primi kesilmez; yalnızca gelir ve damga vergisi kesilir.',
          oneri: 'Personel kartındaki SGK durumu ya da bordro düzeltilmeli.',
        })
      }

      // GV matrahı
      const beklMatrah = r2(brut - sgkKisi - sgkIss)
      const matrah = Number(b.gv_matrah ?? beklMatrah)
      if (Math.abs(beklMatrah - matrah) > ARITMETIK_TOL) {
        bulgular.push({
          baslik: 'Gelir vergisi matrahı hatalı', durum: 'hata', beklenen: beklMatrah, bulunan: matrah,
          aciklama: `GV matrahı ${tl(matrah)} yazılmış; brüt ${tl(brut)} − SGK ${tl(sgkKisi)} − işsizlik ${tl(sgkIss)} = ${tl(beklMatrah)} olmalı.`,
          kural: 'Gelir vergisi matrahı = brüt ücret − SGK işçi payı − işsizlik sigortası işçi payı.',
          oneri: 'Matrah hatası gelir vergisini ve muhtasar beyannameyi etkiler; bordro yeniden hesaplanmalı.',
        })
      }

      const gvIst = Number(b.gv_istisna_tutari || 0)
      const dvIst = Number(b.dv_istisna_tutari || 0)
      const gvHes = Number(b.gv_hesaplanan || 0) || r2(Number(b.gv_tutar || 0) + gvIst)
      const dvHes = Number(b.dv_hesaplanan || 0) || r2(Number(b.damga_tutar || 0) + dvIst)
      const dilimMetin = `Gelir vergisi, personelin yıl başından beri biriken (kümülatif) matrahına göre %${sayi(minOran * 100)} ile %${sayi(maxOran * 100)} arasındaki dilimlerden hesaplanır.`

      // Vergi oranı makul mü (kümülatif matraha göre dilim aralığında olmalı)
      if (matrah > 0 && gvHes > 0) {
        efektifGvOrani = gvHes / matrah
        if (efektifGvOrani < minOran - 0.005 || efektifGvOrani > maxOran + 0.005) {
          bulgular.push({
            baslik: 'Gelir vergisi oranı dilim dışında', durum: 'hata',
            aciklama: `Hesaplanan gelir vergisi ${tl(gvHes)}, matrah ${tl(matrah)}; efektif oran %${sayi(efektifGvOrani * 100)} ve bu oran hiçbir vergi dilimine uymuyor.`,
            kural: dilimMetin,
            oneri: 'Personelin kümülatif matrahı KBS / önceki bordrolarla karşılaştırılmalı ve vergi yeniden hesaplanmalı.',
          })
        }
      } else if (matrah > 0 && gvHes === 0) {
        bulgular.push({
          baslik: 'Gelir vergisi hesaplanmamış', durum: 'uyari',
          aciklama: `Matrah ${tl(matrah)} olduğu halde hesaplanan gelir vergisi 0 TL.`,
          kural: dilimMetin,
          oneri: 'Bordro yeniden hesaplanmalı; vergi hiç hesaplanmadıysa muhtasar beyanname eksik verilmiş olabilir.',
        })
      }
      if (b.gv_oran != null && dilimOranlari.size && Number(b.gv_oran) > 0 && !dilimOranlari.has(Number(b.gv_oran))) {
        bulgular.push({
          baslik: 'Bordrodaki vergi oranı geçersiz', durum: 'uyari',
          aciklama: `Bordroda vergi oranı %${sayi(Number(b.gv_oran) * 100)} yazılmış; bu oran yürürlükteki vergi dilimlerinde (${[...dilimOranlari].sort((x, y) => x - y).map(o => '%' + sayi(o * 100)).join(', ')}) yok.`,
          kural: dilimMetin,
          oneri: 'Okulun ayarlarındaki vergi dilimleri ve bordro kontrol edilmeli.',
        })
      }

      // Damga vergisi
      const beklDv = r2(brut * damgaOrani)
      if (Math.abs(beklDv - dvHes) > ARITMETIK_TOL) {
        bulgular.push({
          baslik: 'Damga vergisi hatalı', durum: 'hata', beklenen: beklDv, bulunan: dvHes,
          aciklama: `Hesaplanan damga vergisi ${tl(dvHes)}; brüt ${tl(brut)} × ${damgaMetin} = ${tl(beklDv)} olmalı.`,
          kural: `Ücret ödemelerinde damga vergisi brüt ücret üzerinden ${damgaMetin} oranında hesaplanır.`,
          oneri: 'Bordro yeniden hesaplanmalı; fark muhtasar beyannamede düzeltilmeli.',
        })
      }

      // İstisna üst sınırları
      const tutarTipi = p?.vergi_istisna_tipi === 'tutar'
      const istisnaKapali = p?.vergi_istisnasi === false
      gvSinir = istisnaKapali ? 0 : tutarTipi ? Number(p?.istisna_gv_tutari || 0) : gvSinirGenel
      dvSinir = istisnaKapali ? 0 : tutarTipi ? Number(p?.istisna_dv_tutari || 0) : dvSinirGenel
      const gvIzin = r2(Math.min(gvSinir, gvHes))
      const dvIzin = r2(Math.min(dvSinir, dvHes))
      const gvKural = `Asgari ücretin gelir vergisi istisnası ${AYLAR[ay]} ayı için en fazla ${tl(gvSinirGenel)}'dir (asgari ücretin vergi matrahına kümülatif dilimle isabet eden vergi). İstisna, hesaplanan vergiyi aşamaz.`
      const dvKural = `Asgari ücretin damga vergisi istisnası en fazla ${tl(dvSinirGenel)}'dir (asgari ücret × ${damgaMetin}). İstisna, hesaplanan damga vergisini aşamaz.`
      // Fazla istisnanın gerçek etkisi: kesilmesi gereken vergi ile kesilen vergi arasındaki fark
      const gvEksik = r2(Math.max(0, (gvHes - gvIzin) - Number(b.gv_tutar || 0)))
      const dvEksik = r2(Math.max(0, (dvHes - dvIzin) - Number(b.damga_tutar || 0)))
      if (gvIst > gvIzin + ARITMETIK_TOL) {
        bulgular.push({
          baslik: 'Gelir vergisi istisnası fazla uygulanmış', durum: 'hata', beklenen: gvIzin, bulunan: gvIst,
          aciklama: (istisnaKapali
            ? `Personel kartında asgari ücret istisnası kapalı olduğu halde ${tl(gvIst)} GV istisnası uygulanmış.`
            : `${tl(gvIst)} GV istisnası uygulanmış; uygulanabilecek en fazla ${tl(gvIzin)} (${tutarTipi ? `personele özel tanımlı ${tl(gvSinir)}` : `ayın istisna sınırı ${tl(gvSinir)}`} ile hesaplanan GV ${tl(gvHes)} tutarından küçük olanı).`)
            + (gvEksik > ARITMETIK_TOL
              ? ` Bu nedenle ${tl(gvEksik)} gelir vergisi eksik kesilmiş (kesilmesi gereken ${tl(r2(gvHes - gvIzin))}, kesilen ${tl(Number(b.gv_tutar || 0))}).`
              : ' Kesilen vergi tutarı etkilenmemiş, ancak bordroda ve muhtasar beyannamede istisna olduğundan fazla görünür.'),
          kural: gvKural,
          oneri: gvEksik > ARITMETIK_TOL
            ? 'Eksik kesilen vergi muhtasar beyannamede düzeltilmeli; personel istisnayı başka işverende kullanıyorsa kartında istisna kapatılmalı.'
            : 'Bordrodaki istisna tutarı düzeltilmeli ve muhtasar beyannamedeki istisna tutarı kontrol edilmeli.',
        })
      }
      if (dvIst > dvIzin + ARITMETIK_TOL) {
        bulgular.push({
          baslik: 'Damga vergisi istisnası fazla uygulanmış', durum: 'hata', beklenen: dvIzin, bulunan: dvIst,
          aciklama: (istisnaKapali
            ? `Personel kartında asgari ücret istisnası kapalı olduğu halde ${tl(dvIst)} DV istisnası uygulanmış.`
            : `${tl(dvIst)} DV istisnası uygulanmış; uygulanabilecek en fazla ${tl(dvIzin)} (${tutarTipi ? `personele özel tanımlı ${tl(dvSinir)}` : `istisna sınırı ${tl(dvSinir)}`} ile hesaplanan DV ${tl(dvHes)} tutarından küçük olanı).`)
            + (dvEksik > ARITMETIK_TOL
              ? ` Bu nedenle ${tl(dvEksik)} damga vergisi eksik kesilmiş.`
              : ' Kesilen damga vergisi etkilenmemiş, ancak istisna olduğundan fazla görünür.'),
          kural: dvKural,
          oneri: dvEksik > ARITMETIK_TOL
            ? 'Eksik kesilen damga vergisi muhtasar beyannamede düzeltilmeli.'
            : 'Bordrodaki istisna tutarı düzeltilmeli.',
        })
      }

      // İstisna sonrası vergi (istisna hesaplanan vergiyi aşamayacağı için vergi eksiye düşmez)
      const beklGv = r2(gvHes - Math.min(gvIst, gvHes))
      const beklDvOd = r2(dvHes - Math.min(dvIst, dvHes))
      if (Math.abs(beklGv - Number(b.gv_tutar || 0)) > ARITMETIK_TOL) {
        bulgular.push({
          baslik: 'Kesilen gelir vergisi tutmuyor', durum: 'hata', beklenen: beklGv, bulunan: Number(b.gv_tutar || 0),
          aciklama: `Kesilen gelir vergisi ${tl(Number(b.gv_tutar || 0))}; hesaplanan ${tl(gvHes)} − istisna ${tl(gvIst)} = ${tl(beklGv)} olmalı.`,
          kural: 'Kesilecek gelir vergisi = hesaplanan gelir vergisi − asgari ücret istisnası.',
          oneri: 'Bordro yeniden hesaplanmalı.',
        })
      }
      if (Math.abs(beklDvOd - Number(b.damga_tutar || 0)) > ARITMETIK_TOL) {
        bulgular.push({
          baslik: 'Kesilen damga vergisi tutmuyor', durum: 'hata', beklenen: beklDvOd, bulunan: Number(b.damga_tutar || 0),
          aciklama: `Kesilen damga vergisi ${tl(Number(b.damga_tutar || 0))}; hesaplanan ${tl(dvHes)} − istisna ${tl(dvIst)} = ${tl(beklDvOd)} olmalı.`,
          kural: 'Kesilecek damga vergisi = hesaplanan damga vergisi − asgari ücret istisnası.',
          oneri: 'Bordro yeniden hesaplanmalı.',
        })
      }

      // Kesinti ve net
      const gvKes = Number(b.gv_tutar || 0), dvKes = Number(b.damga_tutar || 0)
      const beklKesinti = r2(sgkKisi + sgkIss + gvKes + dvKes)
      if (Math.abs(beklKesinti - Number(b.toplam_kesinti || 0)) > ARITMETIK_TOL) {
        bulgular.push({
          baslik: 'Toplam kesinti tutmuyor', durum: 'hata', beklenen: beklKesinti, bulunan: Number(b.toplam_kesinti || 0),
          aciklama: `Toplam kesinti ${tl(Number(b.toplam_kesinti || 0))} yazılmış; SGK ${tl(sgkKisi)} + işsizlik ${tl(sgkIss)} + GV ${tl(gvKes)} + DV ${tl(dvKes)} = ${tl(beklKesinti)} olmalı.`,
          oneri: 'Bordro yeniden hesaplanmalı.',
        })
      }
      const beklNet = r2(brut - beklKesinti)
      const net = Number(b.net || 0)
      if (Math.abs(beklNet - net) > ARITMETIK_TOL) {
        bulgular.push({
          baslik: 'Net ödenen tutmuyor', durum: 'hata', beklenen: beklNet, bulunan: net,
          aciklama: `Net ödenen ${tl(net)}; brüt ${tl(brut)} − kesintiler ${tl(beklKesinti)} = ${tl(beklNet)} olmalı. Personele ${tl(Math.abs(net - beklNet))} ${net > beklNet ? 'fazla' : 'eksik'} ödenmiş görünüyor.`,
          kural: 'Net ödenen = brüt ücret − (SGK + işsizlik + gelir vergisi + damga vergisi).',
          oneri: net > beklNet ? 'Fazla ödenen tutar personelden geri alınmalı.' : 'Eksik ödenen tutar personele ödenmeli.',
        })
      }
    }

    // Başka kurumda çalışma işaretleri (Excel'de kulübün beyanıyla gelir; burada veriden çıkarılır)
    const baskaKurum: string[] = []
    const digerOkullar = girdi.digerOkulKayitlari?.get(b.personel_id) || []
    if (digerOkullar.length) {
      baskaKurum.push(`İl içinde başka kulüpte de kayıtlı: ${digerOkullar.join(', ')}`)
      bulgular.push({
        baslik: 'Başka kurumda da çalışıyor', durum: 'uyari',
        aciklama: `Aynı T.C. kimlik numarasıyla ${digerOkullar.join(', ')} kulübünde de personel kaydı var.`,
        kural: 'Birden fazla işverende çalışan personelde kümülatif vergi matrahı tüm ücretler birlikte izlenir; asgari ücret istisnası yalnızca bir işverende uygulanabilir.',
        oneri: 'Diğer kurumun aynı aya ait bordrosu denetim dosyasında olmalı; kümülatif matrah ve istisnanın iki kurumda mükerrer uygulanmadığı kontrol edilmeli.',
      })
    }
    if (kat !== 'denetim' && p?.sgk_li) {
      const istisnaYok = p.vergi_istisnasi === false
      const istisnaEksik = p.vergi_istisna_tipi === 'tutar' && Number(p.istisna_gv_tutari || 0) < gvSinirGenel - ARITMETIK_TOL
      if (istisnaYok || istisnaEksik) {
        baskaKurum.push('Asgari ücret istisnası kısıtlı')
        bulgular.push({
          baslik: 'İstisna başka işverende kullanılıyor olabilir', durum: 'bilgi',
          aciklama: istisnaYok
            ? 'SGK\'lı personelde asgari ücret istisnası hiç uygulanmamış. Bu genellikle istisnanın başka bir işverende kullanıldığını gösterir.'
            : `SGK'lı personelde aylık ${tl(Number(p.istisna_gv_tutari || 0))} GV istisnası tanımlı; tam tutar ${tl(gvSinirGenel)}. Kalan ${tl(gvSinirGenel - Number(p.istisna_gv_tutari || 0))} başka işverende kullanılıyor olabilir.`,
          kural: 'Asgari ücret istisnası aynı ay içinde yalnızca bir kez (bir işverende) uygulanabilir.',
          oneri: 'KBS / diğer işverenin bordrosu ile teyit edin; başka işveren yoksa istisna eksik uygulanmış demektir ve personel aleyhine fazla vergi kesilmiştir.',
        })
      }
    }

    return {
      satir: b, ad: p?.ad || `#${b.personel_id}`, gorev, kategori: kat, tavan, beklenenBrut,
      sgkToplam: r2(sgkKisi + sgkIss), gvIstisnaSiniri: gvSinir, dvIstisnaSiniri: dvSinir, efektifGvOrani,
      baskaKurum, bulgular, durum: enKotu(bulgular),
    }
  })

  // ---------- Muhtasar özeti ----------
  const vergili = kisiler.filter(k => k.kategori !== 'denetim')
  const top = (f: (k: KisiKontrol) => number, liste = vergili) => r2(liste.reduce((s, k) => s + f(k), 0))
  const muhtasar = {
    gvMatrah: top(k => Number(k.satir.gv_matrah ?? 0)),
    gvHesaplanan: top(k => Number(k.satir.gv_hesaplanan || 0) || Number(k.satir.gv_tutar || 0) + Number(k.satir.gv_istisna_tutari || 0)),
    gvIstisna: top(k => Number(k.satir.gv_istisna_tutari || 0)),
    gv: top(k => Number(k.satir.gv_tutar || 0)),
    dvHesaplanan: top(k => Number(k.satir.dv_hesaplanan || 0) || Number(k.satir.damga_tutar || 0) + Number(k.satir.dv_istisna_tutari || 0)),
    dvIstisna: top(k => Number(k.satir.dv_istisna_tutari || 0)),
    dv: top(k => Number(k.satir.damga_tutar || 0)),
    sgkKisi: top(k => Number(k.satir.sgk_kisi || 0)),
    sgkIssizlik: top(k => Number(k.satir.sgk_issizlik_kisi ?? k.satir.sgk_issizlik ?? 0)),
    sgkIsveren: top(k => Number(k.satir.sgk_isveren || 0)),
    brut: top(k => Number(k.satir.brut || 0), kisiler),
    net: top(k => Number(k.satir.net || 0), kisiler),
    sgkliSayisi: kisiler.filter(k => k.satir.personel?.sgk_li).length,
    kadroluSayisi: kisiler.filter(k => !k.satir.personel?.sgk_li).length,
  }

  const tum = [...genel, ...kisiler.flatMap(k => k.bulgular)]
  const ozet = {
    hata: tum.filter(x => x.durum === 'hata').length, // havuz aşımları genel bulgularda tek satırda sayılır
    uyari: tum.filter(x => x.durum === 'uyari').length,
    ok: kisiler.filter(k => k.durum === 'ok').length,
  }

  return {
    toplamGelir, tavanKatsayi, genel, banka, dagitim,
    birimSaat: { beklenen: birimSaat, manuel: manuelSaat, toplamSaat: toplamOgretmenSaat, havuz: havuz.ogretmen },
    kisiler, muhtasar, ozet,
  }
}

/**
 * Bu ay ödendiği kayıtlı kulüp aidatlarını banka gelir hareketleriyle tek tek eşleştirir.
 * Banka toplamı kullanılmaz: aynı hesaba kırtasiye vb. gelirler de girdiği için yalnızca
 * "sistemdeki kulüp tahsilatının bankada karşılığı var mı" sorusu cevaplanır.
 */
export function bankaKarsilastir(g: BankaGirdi, ay: number, yil: number): BankaKontrol {
  const ayAnahtar = yil * 12 + ay
  const tarihAyi = (t?: string | null) => {
    if (!t) return null
    const [y, m] = t.slice(0, 10).split('-').map(Number)
    return y * 12 + m
  }
  const gunNo = (t?: string | null) => {
    if (!t) return null
    const [y, m, d] = t.slice(0, 10).split('-').map(Number)
    return Math.round(Date.UTC(y, m - 1, d) / 86400000)
  }

  let aidatBuAyYatan = 0, aidatOncedenYatan = 0, aidatSonradanYatan = 0, baskaAyAidat = 0, hareketsizTahsilat = 0
  const yatanlar: BankaGirdi['tahsilatlar'] = [] // bu ay ödenenler (hangi aya ait olursa olsun)
  for (const t of g.tahsilatlar) {
    const tutar = Number(t.tutar || 0)
    const buAyaAit = t.ay === ay && t.yil === yil
    const yatis = tarihAyi(t.tarih) ?? (buAyaAit ? ayAnahtar : null) // tarihsiz kayıt kendi ayında yatmış sayılır
    if (buAyaAit) {
      if (yatis === ayAnahtar) aidatBuAyYatan += tutar
      else if (yatis != null && yatis < ayAnahtar) aidatOncedenYatan += tutar
      else aidatSonradanYatan += tutar
      if (!g.hareketliTahsilatIdleri.has(t.id)) hareketsizTahsilat++
    } else if (yatis === ayAnahtar) {
      baskaAyAidat += tutar
    }
    if (yatis === ayAnahtar) yatanlar.push(t)
  }

  // 1) Tek tek: aynı tutar, tarih farkı toleransta olan en yakın banka hareketi
  const banka = g.defterGelir.map(x => ({ tutar: r2(Number(x.tutar || 0)), gun: gunNo(x.tarih), kullanildi: false }))
  const enYakin = (tutar: number, gun: number | null) => {
    let en: typeof banka[number] | null = null, enFark = Infinity
    for (const b of banka) {
      if (b.kullanildi || Math.abs(b.tutar - tutar) > 0.005) continue
      const fark = gun == null || b.gun == null ? BANKA_TARIH_TOLERANSI : Math.abs(b.gun - gun)
      if (fark <= BANKA_TARIH_TOLERANSI && fark < enFark) { en = b; enFark = fark }
    }
    return en
  }
  let kalan: BankaGirdi['tahsilatlar'] = []
  for (const t of [...yatanlar].sort((a, b) => (a.tarih || '').localeCompare(b.tarih || ''))) {
    const b = enYakin(r2(Number(t.tutar || 0)), gunNo(t.tarih))
    if (b) b.kullanildi = true
    else kalan.push(t)
  }

  // 2) Toplu yatırma: aynı gün girilen eşleşmemiş tahsilatların toplamı tek banka hareketine eşitse
  const gunluk = new Map<string, BankaGirdi['tahsilatlar']>()
  kalan.forEach(t => { const k = (t.tarih || '').slice(0, 10); gunluk.set(k, [...(gunluk.get(k) || []), t]) })
  for (const [gun, liste] of gunluk) {
    if (liste.length < 2) continue
    const b = enYakin(r2(liste.reduce((s, t) => s + Number(t.tutar || 0), 0)), gunNo(gun || null))
    if (b) { b.kullanildi = true; kalan = kalan.filter(t => !liste.includes(t)) }
  }

  const buAyYatanAidat = r2(yatanlar.reduce((s, t) => s + Number(t.tutar || 0), 0))
  const bankadaBulunmayan = r2(kalan.reduce((s, t) => s + Number(t.tutar || 0), 0))
  return {
    // Komşu ay günleri yalnızca eşleştirme için çekilir; ekstre, ayın kendi hareketi varsa yüklenmiş sayılır
    ekstreVar: g.defterGelir.some(x => (tarihAyi(x.tarih) ?? ayAnahtar) === ayAnahtar),
    buAyYatanAidat,
    buAyYatanAdet: yatanlar.length,
    aidatBuAyYatan: r2(aidatBuAyYatan),
    aidatOncedenYatan: r2(aidatOncedenYatan),
    aidatSonradanYatan: r2(aidatSonradanYatan),
    baskaAyAidat: r2(baskaAyAidat),
    bankadaBulunan: r2(buAyYatanAidat - bankadaBulunmayan),
    bankadaBulunmayan,
    bulunmayanlar: kalan.map(t => ({ ad: t.ad, tarih: t.tarih, tutar: Number(t.tutar || 0) })),
    hareketsizTahsilat,
  }
}
