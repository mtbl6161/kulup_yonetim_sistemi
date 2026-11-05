// ============================================================
// Muhtasar ve Prim Hizmet Beyannamesi (MUHSGK) XML'i
// GİB e-Beyanname düzeni: muhtasar matrahları + SGK aylık bildirimi tek dosyada.
// Biçim, muhasebecinin GİB'e yüklediği gerçek bir MUHSGK_21 dosyasıyla hizalanmıştır.
// ============================================================
import type { Ayarlar, Bordro, Personel } from './types'
import { eksikGunSayisi, primGunu } from './sgkEksikGun'

/**
 * GİB'in kabul ettiği beyanname sürümü (kodVer, şema ve dosya adında geçer).
 * 22: 2026/Ekim döneminden (1 Kasım 2026'dan) itibaren; Ekler sayfasına GVK 23/20 nitelikli hizmet
 * personeli istisna bildirimi eklendi. Bu bildirim çocuk kulüplerinde boştur, diğer alanlar 21 ile aynı.
 */
export const MUHSGK_SURUM = 'MUHSGK_22'

export type MuhsgkSatir = Bordro & { personel: Personel }

/** Beyannameye özgü, ayarlarda olmayan bilgiler (ayarlar.muhsgk_bilgileri) */
export interface MuhsgkBilgileri {
  vd_kodu?: string
  eposta?: string
  tel?: string
  duzenleyen_vkn?: string
  duzenleyen_tc?: string
  duzenleyen_ad?: string
  duzenleyen_soyad?: string
  duzenleyen_eposta?: string
  duzenleyen_tel?: string
  isyeri_tur?: string
  isyeri_kod?: string
  ticaret_sicil_no?: string
  ticaret_sicil_mudurluk?: string
  faaliyet_kod?: string
  adres_no?: string
  mulkiyet_durum?: string
}

export const MUHSGK_VARSAYILAN: MuhsgkBilgileri = {
  isyeri_tur: '1', isyeri_kod: '2', ticaret_sicil_no: '11111', ticaret_sicil_mudurluk: '2147',
  faaliyet_kod: '851001', adres_no: '1111111111', mulkiyet_durum: '2',
}

/** Ayarlar sayfasındaki beyanname bilgileri formu: grup başlığı ve alanlar (anahtar, etiket, ipucu) */
export const MUHSGK_ALANLARI: { grup: string; alanlar: [keyof MuhsgkBilgileri, string, string?][] }[] = [
  { grup: 'Beyanname', alanlar: [['vd_kodu', 'Vergi dairesi kodu *', 'ör. 045252'], ['eposta', 'Kurum e-postası', 'boşsa yukarıdaki'], ['tel', 'Kurum telefonu', 'boşsa yukarıdaki']] },
  { grup: 'Düzenleyen (mali müşavir) — boş bırakılırsa beyanname kurumun kendisi adına verilir', alanlar: [['duzenleyen_vkn', 'Vergi no'], ['duzenleyen_tc', 'T.C. kimlik no'], ['duzenleyen_ad', 'Adı'], ['duzenleyen_soyad', 'Soyadı'], ['duzenleyen_eposta', 'E-posta'], ['duzenleyen_tel', 'Telefon']] },
  { grup: 'İşyeri ek bilgileri', alanlar: [['faaliyet_kod', 'Faaliyet (NACE) kodu'], ['ticaret_sicil_no', 'Ticaret sicil no'], ['ticaret_sicil_mudurluk', 'Sicil müdürlüğü kodu'], ['adres_no', 'Adres no (UAVT)'], ['mulkiyet_durum', 'Mülkiyet (1 kendi, 2 kira)'], ['isyeri_tur', 'İşyeri türü'], ['isyeri_kod', 'İşyeri kodu']] },
]

/** Beyannameye girmeyen satırlar: denetim payı kuruma (MEM) ödenir, ücret değildir */
export const muhtasaraGirer = (b: MuhsgkSatir) => !!b.personel && b.brut > 0 && b.personel.gorev !== 'Denetim Yetkilisi'

const tl = (n: number | null | undefined) => (Math.round((n || 0) * 100) / 100).toFixed(2)
const iki = (n: number | string) => String(n).padStart(2, '0')
const buyuk = (s: string | null | undefined) => (s || '').trim().toLocaleUpperCase('tr-TR')
const xmlKac = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** "HAMİDE KARATAŞ DEMİRCAN" → ad HAMİDE, soyad KARATAŞ DEMİRCAN */
export function adSoyadAyir(tam: string) {
  const t = buyuk(tam).split(/\s+/).filter(Boolean)
  return { ad: t[0] || '', soyad: t.slice(1).join(' ') }
}

/** Telefonu GİB'in alan kodu (3) + numara (7) biçimine böler */
export function telefonAyir(tel: string | null | undefined) {
  let d = (tel || '').replace(/\D/g, '')
  if (d.startsWith('90') && d.length === 12) d = d.slice(2)
  if (d.startsWith('0')) d = d.slice(1)
  return d.length === 10 ? { alanKodu: d.slice(0, 3), telNo: d.slice(3) } : { alanKodu: '', telNo: d }
}

/** Meslek kodunu SGK biçimine getirir: "411007" → "4110.07" */
export function meslekKodu(kod: string | null | undefined) {
  const k = (kod || '').trim()
  return /^\d{6}$/.test(k) ? `${k.slice(0, 4)}.${k.slice(4)}` : k
}

/** 21 haneli SGK işyeri sicilinden (M İİİİ YY EE SSSSSSS İİİ İİ) bildirge alanları */
export function isyeriSicilAyir(sicil: string | null | undefined, yedekSiraNo?: string | null, yedekIl?: string | null) {
  const s = (sicil || '').replace(/\D/g, '')
  if (s.length >= 21) return { yeniSube: s.slice(5, 7), eskiSube: s.slice(7, 9), siraNo: s.slice(9, 16), il: s.slice(16, 19) }
  return { yeniSube: '01', eskiSube: '01', siraNo: (yedekSiraNo || '').replace(/\D/g, ''), il: (yedekIl || '').replace(/\D/g, '').padStart(3, '0') }
}

/**
 * Tüzel kişi unvanı GİB alanlarına bölünür: ilk 30 karakter "soyadi", kalanı "adi"
 * ("VİLAYETLER BİRLİĞİ ANAOKULU ÇO" + "CUK KULUBÜ").
 */
export function unvanAyir(unvan: string) {
  const u = buyuk(unvan)
  return { soyadi: u.slice(0, 30), adi: u.slice(30) }
}

/** SGK gün hesabı: işe giriş bu aydaysa ay o günden başlar; eksik gün kalan günlerden düşülür */
export function sgkGunleri(toplamSaat: number, iseGirisGun: number | null, yil: number, ay: number) {
  const ayGun = new Date(yil, ay, 0).getDate()
  const kalan = iseGirisGun ? Math.max(1, Math.min(30, ayGun - iseGirisGun + 1)) : 30
  const gun = Math.min(kalan, primGunu(toplamSaat))
  return { gun, eksik: iseGirisGun ? Math.max(0, kalan - gun) : eksikGunSayisi(gun, ayGun) }
}

export interface MuhsgkGirdi {
  ayarlar: Ayarlar
  bilgiler: MuhsgkBilgileri
  satirlar: MuhsgkSatir[]
  yil: number
  ay: number
  /** personel_id → eksik gün nedeni kodu */
  eksikNedenleri: Record<number, string | undefined>
  /** personel_id → bu ay işe giriş günü (yoksa null) */
  iseGiris: Record<number, number | null | undefined>
}

export interface MuhsgkOzet {
  ucretSgk: { gayrisafi: number; kesinti: number }
  ucretDiger: { gayrisafi: number; kesinti: number }
  damga: { gayrisafi: number; kesinti: number }
  gvMatrah: number
  gvIstisna: number
  dvIstisna: number
  toplamCalisan: number
  sgkMuaf: number
}

export function muhsgkOzet(satirlar: MuhsgkSatir[]): MuhsgkOzet {
  const dahil = satirlar.filter(muhtasaraGirer)
  const top = (liste: MuhsgkSatir[], f: (b: MuhsgkSatir) => number) => liste.reduce((s, b) => s + (f(b) || 0), 0)
  const sgk = dahil.filter(b => b.personel.sgk_li)
  const diger = dahil.filter(b => !b.personel.sgk_li)
  return {
    ucretSgk: { gayrisafi: top(sgk, b => b.brut), kesinti: top(sgk, b => b.gv_tutar) },
    ucretDiger: { gayrisafi: top(diger, b => b.brut), kesinti: top(diger, b => b.gv_tutar) },
    damga: { gayrisafi: top(dahil, b => b.brut), kesinti: top(dahil, b => b.damga_tutar) },
    gvMatrah: top(dahil, b => b.gv_matrah ?? b.brut - (b.sgk_kisi || 0) - (b.sgk_issizlik_kisi || 0)),
    gvIstisna: top(dahil, b => b.gv_istisna_tutari || 0),
    dvIstisna: top(dahil, b => b.dv_istisna_tutari || 0),
    toplamCalisan: dahil.length,
    sgkMuaf: diger.length,
  }
}

/** Eksik olduğu için XML'i üretmeye engel olan bilgiler */
export function muhsgkEksikleri(g: MuhsgkGirdi): string[] {
  const e: string[] = []
  if (!/^\d{6}$/.test(g.bilgiler.vd_kodu || '')) e.push('Vergi dairesi kodu (6 hane) girilmemiş')
  if (!/^\d{10}$/.test(g.ayarlar.vergi_no || '')) e.push('Kurumun vergi numarası (10 hane) ayarlarda eksik')
  const sicil = isyeriSicilAyir(g.ayarlar.sgk_sicil_no, g.ayarlar.sgk_no, g.ayarlar.ssk_sube)
  const sgkli = g.satirlar.filter(b => muhtasaraGirer(b) && b.personel.sgk_li)
  if (sgkli.length && !/^\d{7}$/.test(sicil.siraNo)) e.push('SGK işyeri sicil numarası ayarlarda eksik')
  for (const b of sgkli) {
    if (!/^\d{11}$/.test(b.personel.tc || '')) e.push(`${b.personel.ad}: T.C. kimlik no eksik`)
    if (!b.personel.meslek_kodu) e.push(`${b.personel.ad}: meslek kodu eksik`)
    const { eksik } = sgkGunleri(b.toplam_saat, g.iseGiris[b.personel_id] ?? null, g.yil, g.ay)
    if (eksik > 0 && !g.eksikNedenleri[b.personel_id]) e.push(`${b.personel.ad}: eksik gün nedeni seçilmemiş`)
  }
  return e
}

function kisiBlok(etiket: string, ozellik: string, o: { vergiNo: string; soyadi: string; adi: string; tc?: string; eposta: string; tel: string }) {
  const { alanKodu, telNo } = telefonAyir(o.tel)
  return [
    `\t\t<${etiket}${ozellik}>`,
    `\t\t\t<vergiNo>${o.vergiNo}</vergiNo>`,
    `\t\t\t<soyadi>${xmlKac(o.soyadi)}</soyadi>`,
    `\t\t\t<adi>${xmlKac(o.adi)}</adi>`,
    ...(o.tc ? [`\t\t\t<tcKimlikNo>${o.tc}</tcKimlikNo>`] : []),
    ...(o.eposta ? [`\t\t\t<eposta>${xmlKac(o.eposta)}</eposta>`] : []),
    ...(alanKodu ? [`\t\t\t<alanKodu>${alanKodu}</alanKodu>`] : []),
    ...(telNo ? [`\t\t\t<telNo>${telNo}</telNo>`] : []),
    `\t\t</${etiket}>`,
  ].join('\n')
}

export function muhsgkXml(g: MuhsgkGirdi): string {
  const { ayarlar: a, bilgiler: b, yil, ay } = g
  const dahil = g.satirlar.filter(muhtasaraGirer)
  const sgkli = dahil.filter(s => s.personel.sgk_li)
  const oz = muhsgkOzet(g.satirlar)
  const gvToplam = oz.ucretSgk.kesinti + oz.ucretDiger.kesinti
  const gayrisafi = oz.ucretSgk.gayrisafi + oz.ucretDiger.gayrisafi
  const unvan = unvanAyir(a.kurum_adi || '')
  const mukellef = { vergiNo: a.vergi_no, ...unvan, eposta: b.eposta || a.email || '', tel: b.tel || a.tel || '' }
  const sicil = isyeriSicilAyir(a.sgk_sicil_no, a.sgk_no, a.ssk_sube)

  const matrahlar = [
    { kod: '012', ...oz.ucretSgk },
    { kod: '018', ...oz.ucretDiger },
    { kod: '302', ...oz.damga },
  ].filter(m => m.gayrisafi > 0)

  const sigortalilar = sgkli.map(s => {
    const p = s.personel
    const giris = g.iseGiris[s.personel_id] ?? null
    const { gun, eksik } = sgkGunleri(s.toplam_saat, giris, yil, ay)
    const { ad, soyad } = adSoyadAyir(p.ad)
    const emekli = !!p.is_retired
    const gvIstisna = s.gv_istisna_tutari || 0
    return [
      '        <sgkCalisanBilgisi>',
      `            <belgeMahiyet>A</belgeMahiyet>`,
      `            <belgeTuru>${emekli ? '02' : a.sgk_belge_turu || '01'}</belgeTuru>`,
      `            <kanun>${emekli ? '00000' : a.sgk_kanun_no || '05510'}</kanun>`,
      `            <isyeriYeniSubeKod>${sicil.yeniSube}</isyeriYeniSubeKod>`,
      `            <isyeriEskiSubeKod>${sicil.eskiSube}</isyeriEskiSubeKod>`,
      `            <isyeriSiraNo>${sicil.siraNo}</isyeriSiraNo>`,
      `            <isyeriIlKod>${sicil.il}</isyeriIlKod>`,
      `            <isyeriAraciSiraNo>${(a.sgk_araci_no || '000').padStart(3, '0')}</isyeriAraciSiraNo>`,
      `            <sigortaliSicil>${p.tc || ''}</sigortaliSicil>`,
      `            <tckno>${p.tc || ''}</tckno>`,
      `            <ad>${xmlKac(ad)}</ad>`,
      `            <soyad>${xmlKac(soyad)}</soyad>`,
      `            <gun>${gun}</gun>`,
      `            <uzakCalismaGun>0</uzakCalismaGun>`,
      `            <hakEdilenUcret>${tl(s.brut)}</hakEdilenUcret>`,
      `            <primIkramiye>0.00</primIkramiye>`,
      ...(giris ? [`            <iseGirisGun>${iki(giris)}</iseGirisGun>`, `            <iseGirisAy>${iki(ay)}</iseGirisAy>`] : []),
      ...(eksik > 0 ? [`            <eksikGunSayisi>${eksik}</eksikGunSayisi>`, `            <eksikGunNedeni>${Number(g.eksikNedenleri[s.personel_id] || 0)}</eksikGunNedeni>`] : []),
      `            <meslekKod>${meslekKodu(p.meslek_kodu)}</meslekKod>`,
      `            <rapCalisti>0</rapCalisti>`,
      `            <tahakkukNeden>A</tahakkukNeden>`,
      `            <hizmetAy>${iki(ay)}</hizmetAy>`,
      `            <hizmetYil>${yil}</hizmetYil>`,
      `            <gvMuafMi>2</gvMuafMi>`,
      `            <ilgiliDonemGvMatrah>${tl(s.gv_matrah ?? s.brut - (s.sgk_kisi || 0) - (s.sgk_issizlik_kisi || 0))}</ilgiliDonemGvMatrah>`,
      `            <hgv>${tl((s.gv_tutar || 0) + gvIstisna)}</hgv>`,
      `            <aUIstisnaGV>${tl(gvIstisna)}</aUIstisnaGV>`,
      `            <gvKesinti>${tl(s.gv_tutar)}</gvKesinti>`,
      `            <aUIstisnaDV>${tl(s.dv_istisna_tutari)}</aUIstisnaDV>`,
      `            <damgaVKesinti>${tl(s.damga_tutar)}</damgaVKesinti>`,
      '        </sgkCalisanBilgisi>',
    ].join('\n')
  })

  const duzenleyen = b.duzenleyen_vkn
    ? '\n' + kisiBlok('duzenleyen', '', {
      vergiNo: b.duzenleyen_vkn, soyadi: buyuk(b.duzenleyen_soyad), adi: buyuk(b.duzenleyen_ad),
      tc: b.duzenleyen_tc, eposta: b.duzenleyen_eposta || '', tel: b.duzenleyen_tel || '',
    })
    : ''
  const v = { ...MUHSGK_VARSAYILAN, ...b }

  return `<?xml version="1.0" encoding="ISO-8859-9"?>
<beyanname kodVer="${MUHSGK_SURUM}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="${MUHSGK_SURUM}.xsd">
\t<genel>
\t\t<idari>
\t\t<vdKodu>${b.vd_kodu || ''}</vdKodu>
\t\t<donem>
\t\t\t<tip>aylik</tip>
\t\t\t<yil>${yil}</yil>
\t\t\t<ay>${ay}</ay>
\t\t</donem>
\t\t</idari>
${kisiBlok('mukellef', '', mukellef)}
${kisiBlok('hsv', ' sifat="kendisi"', mukellef)}${duzenleyen}
\t</genel>
\t<ozel>
\t\t<subeNo>0</subeNo>
\t\t<beyanimVarYok>1</beyanimVarYok>
\t\t<matrahBildirimleri>
${matrahlar.map(m => `\t\t\t<matrahBildirimi>
\t\t\t\t<turKodu>${m.kod}</turKodu>
\t\t\t\t<gayrisafiTutar>${tl(m.gayrisafi)}</gayrisafiTutar>
\t\t\t\t<kesintiTutari>${tl(m.kesinti)}</kesintiTutari>
\t\t\t</matrahBildirimi>`).join('\n')}
\t\t</matrahBildirimleri>
\t\t\t<toplamGayrisafiTutar>${tl(gayrisafi)}</toplamGayrisafiTutar>
\t\t\t<toplamKesintiTutari>${tl(gvToplam)}</toplamKesintiTutari>
\t\t\t<terkinSonrasiTutar>${tl(gvToplam)}</terkinSonrasiTutar>
\t\t\t<damgaVergileri>
\t\t\t\t<tevkifatDamgaVergisi>${tl(oz.damga.kesinti)}</tevkifatDamgaVergisi>
\t\t\t</damgaVergileri>
<calisanIsciler>
    <calisanBilgileri>
        <calisanBilgisi>001</calisanBilgisi>
        <toplamCalisan>${oz.toplamCalisan}</toplamCalisan>
        <sgkMuaf>${oz.sgkMuaf}</sgkMuaf>
        <gelirVergisiMatrahi>${tl(oz.gvMatrah)}</gelirVergisiMatrahi>
        <auIstisnaGV>${tl(oz.gvIstisna)}</auIstisnaGV>
        <gelirVergisiKesintisi>${tl(gvToplam)}</gelirVergisiKesintisi>
        <auIstisnaDV>${tl(oz.dvIstisna)}</auIstisnaDV>
        <damgaVergisiKesintisi>${tl(oz.damga.kesinti)}</damgaVergisiKesintisi>
    </calisanBilgileri>
</calisanIsciler>
\t\t\t<matrah>${tl(gayrisafi)}</matrah>
\t\t\t<tahakkukEden>${tl(gvToplam)}</tahakkukEden>
\t\t\t<tecilEdilecekTutar>0.00</tecilEdilecekTutar>
\t\t\t<odenecek>${tl(gvToplam)}</odenecek>
\t\t\t<iadeEdilecek>0.00</iadeEdilecek>
\t\t\t<odenecekDamgaVergisi>${tl(oz.damga.kesinti)}</odenecekDamgaVergisi>
${sigortalilar.length ? `<sgkBildirgeleri>
    <sgkCalisanBilgileri>
${sigortalilar.join('\n')}
    </sgkCalisanBilgileri>
</sgkBildirgeleri>
` : ''}\t\t<ekler>
\t\t<isyeriCalisanSGKBilgileri>
\t\t\t<calisanlarinIsyeriBilgileri>
\t\t\t\t<calisanlarinIsyeriBilgisi>
\t\t\t\t\t<isyeriTur>${v.isyeri_tur}</isyeriTur>
\t\t\t\t\t<isyeriKod>${v.isyeri_kod}</isyeriKod>
\t\t\t\t\t<ticaretSicilNo>${v.ticaret_sicil_no}</ticaretSicilNo>
\t\t\t\t\t<ticaretSicilMudurluk>${v.ticaret_sicil_mudurluk}</ticaretSicilMudurluk>
\t\t\t\t\t<isyeriFaaliyetKod>${v.faaliyet_kod}</isyeriFaaliyetKod>
\t\t\t\t\t<isyeriAdi>${xmlKac(buyuk(a.kurum_adi))}</isyeriAdi>
\t\t\t\t\t<isyeriAdresNo>${v.adres_no}</isyeriAdresNo>
\t\t\t\t\t<isyeriMulkiyetDurum>${v.mulkiyet_durum}</isyeriMulkiyetDurum>
\t\t\t\t</calisanlarinIsyeriBilgisi>
\t\t\t</calisanlarinIsyeriBilgileri>
\t\t</isyeriCalisanSGKBilgileri>
\t\t</ekler>
\t</ozel>
</beyanname>
`
}

// ISO-8859-9 (Latin-5): Latin-1 ile aynı, yalnızca altı Türkçe harf farklı yerde
const LATIN5: Record<string, number> = { 'Ğ': 0xd0, 'İ': 0xdd, 'Ş': 0xde, 'ğ': 0xf0, 'ı': 0xfd, 'ş': 0xfe }

/** GİB dosyanın ilan ettiği ISO-8859-9 kodlamasını bekler; UTF-8 Türkçe harfleri bozar */
export function latin5Kodla(metin: string): Uint8Array {
  const out = new Uint8Array(metin.length)
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i]
    const k = c.charCodeAt(0)
    out[i] = LATIN5[c] ?? (k < 256 && !'ÐÝÞðýþ'.includes(c) ? k : 0x3f)
  }
  return out
}
