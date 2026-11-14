// Taklit motoru, panelin kullandığı gerçek supabase-js istemcisiyle sınanır: istek biçimi değişirse testler kırılır.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { DemoSunucu } from './sunucu'
import { DEMO_OKUL_ID, DEMO_SUPABASE_URL } from '../mod'
import { secimAyristir, mantikAyristir, kosulSagla, filtreAyristir } from './sorgu'

const BUGUN = new Date(2026, 10, 13, 12)
let sunucu: DemoSunucu
let db: SupabaseClient
const disari = vi.fn()

beforeEach(() => {
  sunucu = new DemoSunucu(BUGUN)
  disari.mockReset()
  db = createClient(DEMO_SUPABASE_URL, 'demo-anahtar', {
    global: {
      fetch: (girdi: RequestInfo | URL, init?: RequestInit) => {
        const u = String(girdi instanceof Request ? girdi.url : girdi)
        if (!u.startsWith(DEMO_SUPABASE_URL)) disari(u)
        return sunucu.isle(girdi, init)
      },
    },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
})

describe('sorgu ayrıştırıcı', () => {
  it('gömülü seçim, takma ad ve !inner', () => {
    expect(secimAyristir('*, ogretmen:personel(id,ad), tahsilat_kategorileri!inner(ad, birim)')).toEqual([
      { tur: 'yildiz' },
      { tur: 'gomulu', tablo: 'personel', takma: 'ogretmen', ic: false, ipucu: undefined, alanlar: [{ tur: 'kolon', ad: 'id', takma: 'id' }, { tur: 'kolon', ad: 'ad', takma: 'ad' }] },
      { tur: 'gomulu', tablo: 'tahsilat_kategorileri', takma: 'tahsilat_kategorileri', ic: true, ipucu: undefined, alanlar: [{ tur: 'kolon', ad: 'ad', takma: 'ad' }, { tur: 'kolon', ad: 'birim', takma: 'birim' }] },
    ])
  })
  it('iç içe mantık ve SQL null kuralı', () => {
    const k = mantikAyristir('or', '(yil.lt.2026,and(yil.eq.2026,ay.lt.10))')
    expect(kosulSagla({ yil: 2025, ay: 12 }, k)).toBe(true)
    expect(kosulSagla({ yil: 2026, ay: 9 }, k)).toBe(true)
    expect(kosulSagla({ yil: 2026, ay: 10 }, k)).toBe(false)
    expect(kosulSagla({ ad: null }, filtreAyristir('ad', 'neq.x'))).toBe(false)
    expect(kosulSagla({ ad: 'Ada' }, filtreAyristir('ad', 'not.in.(Can,Ege)'))).toBe(true)
  })
})

describe('demo sunucusu + supabase-js', () => {
  it('filtre, sıralama, tekil kayıt ve sayım', async () => {
    const { data: ayarlar, error } = await db.from('ayarlar').select('*').single()
    expect(error).toBeNull()
    expect(ayarlar.okul_id).toBe(DEMO_OKUL_ID)

    const { data: per } = await db.from('personel').select('id, ad, gorev').order('ad')
    expect(per!.map(p => p.ad)).toEqual([...per!.map(p => p.ad)].sort((a, b) => a.localeCompare(b, 'tr')))

    const { count, data: bos } = await db.from('bordro').select('id', { count: 'exact', head: true }).eq('yil', 2026).eq('ay', 10)
    expect(count).toBeGreaterThan(5)
    expect(bos).toBeNull()

    const tek = await db.from('tahakkuk').select('*').eq('ay', 11).eq('yil', 2026).maybeSingle()
    expect(tek.data).toBeNull()
    expect(tek.error).toBeNull()

    const cok = await db.from('personel').select('*').single()
    expect(cok.error?.code).toBe('PGRST116')

    const { data: aralik } = await db.from('ogrenciler').select('id').order('id').range(10, 14)
    expect(aralik!.map(o => o.id)).toEqual([11, 12, 13, 14, 15])
  })

  it('or + is.null, ilike, in, gte/lte', async () => {
    await db.from('tatiller').insert({ ad: 'Genel tatil', baslangic_tarihi: '2026-11-20', bitis_tarihi: '2026-11-20', tip: 'resmi', okul_id: null })
    const { data: tat } = await db.from('tatiller').select('*').or(`okul_id.eq.${DEMO_OKUL_ID},okul_id.is.null`)
    expect(tat).toHaveLength(1)
    expect(tat![0].okul_id).toBeNull()

    const { data: ilike } = await db.from('personel').select('ad').ilike('ad', '%örnek%')
    expect(ilike!.length).toBeGreaterThanOrEqual(2)

    const { data: puan } = await db.from('puantaj').select('personel_id,tarih,saat').in('personel_id', [5, 6]).gte('tarih', '2026-10-01').lte('tarih', '2026-10-31T23:59:59')
    expect(puan!.length).toBeGreaterThan(10)
    expect(puan!.every(p => [5, 6].includes(p.personel_id) && p.tarih.startsWith('2026-10'))).toBe(true)
  })

  it('gömülü ilişkiler ve !inner + gömülü filtre', async () => {
    const { data: sd } = await db.from('sinif_defteri').select('*, ogretmen:personel(id,ad,gorev)').eq('ay', 10).eq('yil', 2026).order('gun').limit(3)
    expect(sd![0].ogretmen).toMatchObject({ id: expect.any(Number), ad: expect.any(String) })

    const { data: kulup } = await db.from('tahsilat_kayitlari')
      .select('id, tarih, tutar, aciklama, tahsilat_kategorileri!inner(ad, birim), ogrenciler(ad, soyad)')
      .eq('tahsilat_kategorileri.birim', 'kulup')
    expect(kulup!.length).toBeGreaterThan(5)
    expect(kulup!.every(k => (k.tahsilat_kategorileri as unknown as { birim: string }).birim === 'kulup')).toBe(true)
    expect((kulup![0].ogrenciler as unknown as { ad: string }).ad).toEqual(expect.any(String))

    const { data: profil } = await db.from('profiller').select('*, okullar(ad)').single()
    expect(profil.okullar.ad).toBe('Papatya Örnek Ortaokulu')
  })

  it('ekleme, benzersizlik, upsert, güncelleme ve silme', async () => {
    const yeni = await db.from('ogrenciler').insert({ ad: 'Deneme', soyad: 'Örnek', tc: '12345678901', sinif: 'Drama Kulübü' }).select().single()
    expect(yeni.error).toBeNull()
    expect(yeni.data).toMatchObject({ okul_id: DEMO_OKUL_ID, aktif: true, kardes_indirimi: false })
    const id = yeni.data.id

    const ayni = await db.from('ogrenciler').insert({ ad: 'İkinci', soyad: 'Örnek', tc: '12345678901' })
    expect(ayni.error?.code).toBe('23505')

    await db.from('ogrenciler').update({ sinif: 'Resim Kulübü' }).eq('id', id)
    const { data: guncel } = await db.from('ogrenciler').select('sinif').eq('id', id).single()
    expect(guncel!.sinif).toBe('Resim Kulübü')

    const up1 = await db.from('puantaj').upsert({ personel_id: 6, tarih: '2026-11-02', saat: 7 }, { onConflict: 'personel_id,tarih' }).select().single()
    expect(up1.data.saat).toBe(7)
    const say = (await db.from('puantaj').select('id').eq('personel_id', 6).eq('tarih', '2026-11-02')).data!.length
    expect(say).toBe(1)

    const sil = await db.from('puantaj').delete().match({ personel_id: 6, tarih: '2026-11-02' })
    expect(sil.error).toBeNull()
    expect((await db.from('puantaj').select('id').eq('personel_id', 6).eq('tarih', '2026-11-02')).data).toEqual([])

    await db.from('ogrenciler').delete().eq('id', id)
    expect((await db.from('ogrenciler').select('id').eq('id', id)).data).toEqual([])
  })

  it('denetim dosyası: gönderim kilitler, iade edilen ay yeniden gönderilir', async () => {
    const yukle = () => db.from('denetim_belgeleri').insert({ okul_id: DEMO_OKUL_ID, yil: 2026, ay: 11, madde_id: 3, dosya_yolu: `${DEMO_OKUL_ID}/x.pdf`, dosya_adi: 'x.pdf' })
    expect((await yukle()).error).toBeNull()
    expect((await db.rpc('denetim_gonder', { p_yil: 2026, p_ay: 11 })).error).toBeNull()
    const ikinci = await yukle()
    expect(ikinci.error?.code).toBe('42501')
    const tekrar = await db.rpc('denetim_gonder', { p_yil: 2026, p_ay: 11 })
    expect(tekrar.error?.message).toContain('zaten gönderilmiş')

    const { data: iade } = await db.from('denetim_teslimleri').select('*').eq('ay', 10).eq('yil', 2026).single()
    expect(iade!.durum).toBe('iade')
    await db.rpc('denetim_gonder', { p_yil: 2026, p_ay: 10 })
    const { data: belgeler } = await db.from('denetim_belgeleri').select('durum').eq('ay', 10).eq('yil', 2026)
    expect(belgeler!.some(b => b.durum === 'iade')).toBe(false)
  })

  it('dosya yükleme, imzalı adres, indirme ve silme yalnızca bellekte', async () => {
    const kova = db.storage.from('personel')
    const dosya = new Blob(['%PDF-1.4 demo'], { type: 'application/pdf' })
    const up = await kova.upload(`${DEMO_OKUL_ID}/1/yeni.pdf`, dosya, { contentType: 'application/pdf' })
    expect(up.error).toBeNull()
    const imza = await kova.createSignedUrl(`${DEMO_OKUL_ID}/1/yeni.pdf`, 300)
    expect(imza.data!.signedUrl.startsWith(`${DEMO_SUPABASE_URL}/storage/v1/object/sign/personel/`)).toBe(true)
    const indir = await db.storage.from('personel').download(`${DEMO_OKUL_ID}/1/yeni.pdf`)
    expect(await indir.data!.text()).toBe('%PDF-1.4 demo')
    const resim = await kova.upload(`${DEMO_OKUL_ID}/1/a.png`, new Blob(['x'], { type: 'image/png' }))
    expect(resim.error).not.toBeNull()
    expect((await kova.remove([`${DEMO_OKUL_ID}/1/yeni.pdf`])).data).toHaveLength(1)
    const yok = await db.storage.from('personel').download(`${DEMO_OKUL_ID}/1/yeni.pdf`)
    expect(yok.error).not.toBeNull()
  })

  it('örnek denetim belgeleri depoda hazır', async () => {
    const { data: b } = await db.from('denetim_belgeleri').select('dosya_yolu').eq('ay', 9).eq('yil', 2026).limit(1).single()
    const indir = await db.storage.from('denetim').download(b!.dosya_yolu)
    expect((await indir.data!.text()).startsWith('%PDF')).toBe(true)
  })

  it('kimlik: kurgusal kullanıcı döner', async () => {
    const { data } = await db.auth.getUser('herhangi')
    expect(data.user?.app_metadata.demo).toBe(true)
  })

  it('desteklenmeyen sorgu açık hata verir, sessizce boş dönmez', async () => {
    const hata = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { error } = await db.from('personel').select('ad').contains('etiketler', ['x'])
    expect(error?.code).toBe('DEMO')
    expect(hata).toHaveBeenCalledWith(expect.stringContaining('DEMO_DESTEKLENMEYEN_SORGU'))
    hata.mockRestore()
  })

  it('hiçbir istek demo adresinin dışına çıkmaz', () => {
    expect(disari).not.toHaveBeenCalled()
  })
})
