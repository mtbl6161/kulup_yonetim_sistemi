'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import Topbar from '@/components/Topbar'
import { useAy } from '@/lib/AyContext'
import { perdeKapat } from '@/lib/perdeKapat'
import { supabase } from '@/lib/supabase'
import { SinifDefteri, Personel, Tatil, Sinif, Ayarlar } from '@/lib/types'
import { AYLAR, gunSayisi, tatilMi, ayLabel, haftaIciMi } from '@/lib/hesaplama'
import { Download, RefreshCw, Calendar, School, UserCog, Plus, Check, X } from 'lucide-react'
import Bildirim from '@/components/Bildirim'
import { pdfHazirla, pdfBaslik, pdfTablo, pdfImza, pdfSonY, pdfAc, PDF_RENK, PDF_KENAR } from '@/lib/pdf'
import type { CellHookData } from '@/lib/pdf'
import { ayHaftalari, varsayilanHafta, tatilAdi, bugunMu, basHarf, gecmisMi, HaftaSecici, GunBasligi, TatilBlogu, GUN_UZUN, HaftaGunu } from '@/components/HaftalikPlan'
import React from 'react'
import ConfirmModal from '@/components/ConfirmModal'
import { hataMesaji } from '@/lib/hata'
import { useYukleme } from '@/lib/useYukleme'
import { useDegisince } from '@/lib/useDegisince'

interface VisibleDay {
  day: number
  month: number
  year: number
  isCurrentMonth: boolean
}

export default function SinifDefteriPage() {
  const { ay, yil } = useAy()
  const [defter, setDefter] = useState<SinifDefteri[]>([])
  const [personel, setPersonel] = useState<Personel[]>([])
  const [tatiller, setTatiller] = useState<Tatil[]>([])
  const [siniflar, setSiniflar] = useState<Sinif[]>([])
  const [ayarlar, setAyarlar] = useState<Ayarlar | null>(null)
  const [seciliSinif, setSeciliSinif] = useState<number | null>(null)
  const [msg, setMsg] = useState('')

  const [pickerSaving, setPickerSaving] = useState(false)
  const [picker, setPicker] = useState<{ day: number, month: number, year: number, sinifId: number, dersNo: number, rect: DOMRect, gunAdi: string } | null>(null)
  const [conf, setConf] = useState<{ 
    open: boolean, 
    type: 'sil' | 'kopyala' | 'tatil' | 'programdan-aktar', 
    id?: number, 
    payload?: { personelId: number; pInfo: { day: number; month: number; year: number; sinifId: number; dersNo: number } },
    title: string,
    message: string
  } | null>(null)

  const [defterTuru, setDefterTuru] = useState<'ders' | 'koord'>('ders')
  // Haftalık yoklama: seçili hafta (null = bugünün haftası / ilk hafta)
  const [haftaSecim, setHaftaSecim] = useState<number | null>(null)
  // Öğretmen vurgulama: seçilen öğretmenin dersleri öne çıkar, diğerleri soluklaşır
  const [vurgu, setVurgu] = useState<number | null>(null)
  useDegisince(`${ay}-${yil}`, () => setHaftaSecim(null))

  // --- TAKVİM HESAPLAMA ---
  const visibleDays = useMemo(() => {
    const dates: VisibleDay[] = []
    const total = gunSayisi(yil, ay)
    for (let d = 1; d <= total; d++) {
      dates.push({
        day: d,
        month: ay,
        year: yil,
        isCurrentMonth: true
      })
    }
    return dates
  }, [ay, yil])

  const visibleWeeks = useMemo(() => {
    const weeks: VisibleDay[][] = []
    weeks.push(visibleDays.slice(0, 7))
    weeks.push(visibleDays.slice(7, 14))
    weeks.push(visibleDays.slice(14, 21))
    weeks.push(visibleDays.slice(21))
    return weeks
  }, [visibleDays])

  const load = useCallback(async () => {
    try {
      // okulId'yi önce al — tatil filtresinde gerekli
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profil } = await supabase.from('profiller').select('okul_id').eq('id', user?.id).single()

      const [{ data: sd, error: sdErr }, { data: per }, { data: tat }, { data: sin }, { data: ayr }] = await Promise.all([
        supabase.from('sinif_defteri')
          .select('*, ogretmen:personel(id,ad,gorev,aktif)')
          .eq('ay', ay)
          .eq('yil', yil)
          .order('gun'),
        supabase.from('personel').select('*').order('ad'),
        supabase.from('tatiller').select('*').or(`okul_id.eq.${profil?.okul_id ?? 0},okul_id.is.null`),
        supabase.from('siniflar').select('*').eq('aktif', true).order('ad'),
        supabase.from('ayarlar').select('*').single()
      ])
      if (sdErr) setMsg('❌ Veri yükleme hatası: ' + sdErr.message)

      let finalSd = sd || []

      // Otomatik eşitleme: bu ay sınıf defteri boşsa ders programından çek
      if (finalSd.length === 0) {
        const currentOkulId = Number(user?.user_metadata?.okul_id || profil?.okul_id || ayr?.okul_id)

        if (currentOkulId && !isNaN(currentOkulId)) {
          const { data: pr } = await supabase.from('ders_programi').select('*').eq('ay', ay).eq('yil', yil).eq('okul_id', currentOkulId)

          if (pr && pr.length > 0) {
            const perList = per || []
            const tatList = tat || []
            const uniquePayload = new Map<string, object>()

            pr.filter(p => haftaIciMi(p.yil, p.ay, p.gun) && !tatilMi(p.ay, p.gun, p.yil, tatList)).forEach(p => {
              const key = `${p.gun}-${p.ay}-${p.yil}-${p.kulup_adi}-${p.ders_no || 1}`
              uniquePayload.set(key, {
                gun: p.gun, ay: p.ay, yil: p.yil,
                kulup_adi: p.kulup_adi, sinif_id: p.sinif_id,
                ogretmen_id: p.ogretmen_id, ders_no: p.ders_no || 1,
                seans: p.seans || 'sabah', etkinlik_saati: p.etkinlik_saati || 1,
                durum: 'geldi', okul_id: currentOkulId
              })
              const ogr = perList.find((x) => x.id === p.ogretmen_id)
              if (ogr?.koordinator_id) {
                const kDersNo = (p.ders_no || 1) + 10
                uniquePayload.set(`${p.gun}-${p.ay}-${p.yil}-${p.kulup_adi}-${kDersNo}`, {
                  gun: p.gun, ay: p.ay, yil: p.yil,
                  kulup_adi: p.kulup_adi, sinif_id: p.sinif_id,
                  ogretmen_id: ogr.koordinator_id, ders_no: kDersNo,
                  seans: p.seans || 'sabah', etkinlik_saati: p.etkinlik_saati || 1,
                  durum: 'geldi', okul_id: currentOkulId
                })
              }
            })

            const payload = Array.from(uniquePayload.values())
            if (payload.length > 0) {
              await supabase.from('sinif_defteri').delete().match({ ay, yil, okul_id: currentOkulId })
              const { data: inserted } = await supabase.from('sinif_defteri')
                .insert(payload)
                .select('*, ogretmen:personel(id,ad,gorev)')
              finalSd = inserted || []
            }
          }
        }
      }

      setDefter(finalSd)
      setPersonel(per || [])
      setTatiller(tat || [])
      setSiniflar(sin || [])
      setAyarlar(ayr || null)
    } catch (e) {
      setMsg('❌ Beklenmeyen hata: ' + (hataMesaji(e, 'Bilinmiyor')))
    }
  }, [ay, yil])

  useYukleme(load)

  useEffect(() => {
    if (!picker) return
    const kapat = (e: KeyboardEvent) => { if (e.key === 'Escape') setPicker(null) }
    window.addEventListener('keydown', kapat)
    return () => window.removeEventListener('keydown', kapat)
  }, [picker])

  function programdanAktar() {
    setConf({
      open: true,
      type: 'programdan-aktar',
      title: 'Ders Programı ile Eşitle',
      message: `${ayLabel(ay, yil)} dönemine ait mevcut tüm sınıf defteri ve koordinatör kayıtları silinecek ve ders programı şablonundan yeniden oluşturulacaktır. Bu işlem geri alınamaz. Emin misiniz?`
    })
  }

  async function programdanAktarGercek() {
    setConf(null)
    try {
      setPickerSaving(true)
      setMsg('⌛ Aktarım başlıyor...')
      
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profil } = await supabase.from('profiller').select('okul_id').eq('id', user?.id).single()
      
      // En güvenilir ID'yi bul (Metadata > Profil > Ayarlar)
      const metaOkulId = user?.user_metadata?.okul_id
      const currentOkulId = Number(metaOkulId || profil?.okul_id || ayarlar?.okul_id)

      if (!currentOkulId || isNaN(currentOkulId)) {
        throw new Error("Okul kimliği doğrulanamadı. Lütfen tekrar giriş yapmayı deneyin.")
      }

      const { data: pr, error: prErr } = await supabase.from('ders_programi').select('*').eq('ay', ay).eq('yil', yil).eq('okul_id', currentOkulId)
      if (prErr) throw prErr
      if (!pr || pr.length === 0) {
        setMsg('ℹ️ Ders programında bu ay için veri bulunamadı. Lütfen önce ders programını doldurun.')
        setPickerSaving(false)
        return
      }

      const uniquePayload = new Map()
      const prData = pr.filter(p => haftaIciMi(p.yil, p.ay, p.gun) && !tatilMi(p.ay, p.gun, p.yil, tatiller))

      prData.forEach(p => {
        // Anahtar seans içermemeli — kısıtlama (gun, ay, yil, kulup_adi, ders_no, okul_id) üzerinde
        const key = `${p.gun}-${p.ay}-${p.yil}-${p.kulup_adi}-${p.ders_no || 1}`
        uniquePayload.set(key, {
          gun: p.gun, ay: p.ay, yil: p.yil,
          kulup_adi: p.kulup_adi,
          sinif_id: p.sinif_id,
          ogretmen_id: p.ogretmen_id,
          ders_no: p.ders_no || 1,
          seans: p.seans || 'sabah',
          etkinlik_saati: p.etkinlik_saati || 1,
          durum: 'geldi',
          okul_id: currentOkulId
        })

        const ogr = personel.find(per => per.id === p.ogretmen_id)
        if (ogr?.koordinator_id) {
          const kDersNo = (p.ders_no || 1) + 10
          const kKey = `${p.gun}-${p.ay}-${p.yil}-${p.kulup_adi}-${kDersNo}`
          uniquePayload.set(kKey, {
            gun: p.gun, ay: p.ay, yil: p.yil,
            kulup_adi: p.kulup_adi,
            sinif_id: p.sinif_id,
            ogretmen_id: ogr.koordinator_id,
            ders_no: kDersNo,
            seans: p.seans || 'sabah',
            etkinlik_saati: p.etkinlik_saati || 1,
            durum: 'geldi',
            okul_id: currentOkulId
          })
        }
      })

      const finalPayload = Array.from(uniquePayload.values())

      // Mevcutu temizle
      const { error: delErr } = await supabase.from('sinif_defteri').delete().match({ ay, yil, okul_id: currentOkulId })
      if (delErr) throw delErr

      // Toplu ekle — migration sonrası onConflict sütunları eşleşecek
      const { error: insErr } = await supabase.from('sinif_defteri').insert(finalPayload)
      if (insErr) throw insErr
      
      // Puantajı senkronize et
      await syncPuantajForMonth(ay, yil, currentOkulId)

      setMsg('✅ Program başarıyla aktarıldı.')
      load()
    } catch (err) {
      setMsg('❌ Aktarım hatası: ' + hataMesaji(err))
    } finally {
      setPickerSaving(false)
      setTimeout(() => setMsg(''), 5000)
    }
  }
  function puantajGuncelle(updatedDefter: SinifDefteri[], personelId: number, day: number, month: number, year: number) {
    const totalHours = updatedDefter
      .filter(d => d.ogretmen_id === personelId && d.gun === day && d.ay === month && d.yil === year && d.durum === 'geldi')
      .reduce((sum, d) => sum + (Number(d.etkinlik_saati) || 1), 0)
    const tarih = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (totalHours > 0) {
      return supabase.from('puantaj').upsert({ personel_id: personelId, tarih, saat: totalHours, okul_id: ayarlar?.okul_id }, { onConflict: 'personel_id,tarih' })
    }
    return supabase.from('puantaj').delete().match({ personel_id: personelId, tarih })
  }

  async function syncPuantajForPersonDay(personelId: number, day: number, month: number, year: number) {
    const { data: entries, error } = await supabase
      .from('sinif_defteri').select('etkinlik_saati')
      .eq('ogretmen_id', personelId).eq('gun', day).eq('ay', month).eq('yil', year).eq('durum', 'geldi')
    if (error) return
    const totalHours = entries.reduce((sum, e) => sum + (Number(e.etkinlik_saati) || 1), 0)
    const tarih = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (totalHours > 0) {
      await supabase.from('puantaj').upsert({ personel_id: personelId, tarih, saat: totalHours, okul_id: ayarlar?.okul_id }, { onConflict: 'personel_id,tarih' })
    } else {
      await supabase.from('puantaj').delete().match({ personel_id: personelId, tarih })
    }
  }

  async function syncPuantajForMonth(m: number, y: number, okulId: number) {
    try {
      const { data: defterEntries, error: defterErr } = await supabase
        .from('sinif_defteri')
        .select('ogretmen_id, gun, etkinlik_saati, durum')
        .eq('ay', m)
        .eq('yil', y)
        .eq('okul_id', okulId)
      if (defterErr) throw defterErr

      const startDate = `${y}-${String(m).padStart(2, '0')}-01`
      const endDate = `${y}-${String(m).padStart(2, '0')}-31`
      const { data: existingPuantaj, error: puantajErr } = await supabase
        .from('puantaj')
        .select('id, personel_id, tarih, saat')
        .eq('okul_id', okulId)
        .gte('tarih', startDate)
        .lte('tarih', endDate)
      if (puantajErr) throw puantajErr

      const expectedHours: Record<string, number> = {}
      const affectedPersonelIds = new Set<number>()

      defterEntries?.forEach(entry => {
        if (entry.ogretmen_id && entry.durum === 'geldi') {
          const key = `${entry.ogretmen_id}_${entry.gun}`
          expectedHours[key] = (expectedHours[key] || 0) + (Number(entry.etkinlik_saati) || 1)
          affectedPersonelIds.add(entry.ogretmen_id)
        }
      })

      existingPuantaj?.forEach(p => {
        if (p.personel_id) {
          affectedPersonelIds.add(p.personel_id)
        }
      })

      const daysInMonth = gunSayisi(y, m)
      const upserts: Record<string, unknown>[] = []
      const deletes: number[] = []

      affectedPersonelIds.forEach(pid => {
        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const key = `${pid}_${day}`
          const totalHours = expectedHours[key] || 0
          const existing = existingPuantaj?.find(p => p.personel_id === pid && p.tarih === dateStr)

          if (totalHours > 0) {
            if (!existing || existing.saat !== totalHours) {
              upserts.push({
                personel_id: pid,
                tarih: dateStr,
                saat: totalHours,
                okul_id: okulId
              })
            }
          } else {
            if (existing) {
              deletes.push(existing.id)
            }
          }
        }
      })

      const promises: PromiseLike<unknown>[] = []
      if (upserts.length > 0) {
        promises.push(supabase.from('puantaj').upsert(upserts, { onConflict: 'personel_id,tarih' }))
      }
      if (deletes.length > 0) {
        promises.push(supabase.from('puantaj').delete().in('id', deletes))
      }

      await Promise.all(promises)
    } catch (err) {
      console.error('Error syncing puantaj for month:', err)
    }
  }

  async function durumDegistir(id: number, mevcutDurum: string) {
    const yeniDurum = mevcutDurum === 'geldi' ? 'gelmedi' : 'geldi'

    const item = defter.find(d => d.id === id)
    if (!item) return

    // Koordinatör veya ana ders kaydını local state'ten bul
    const eslesId = (item.ders_no || 0) < 11
      ? defter.find(d => d.gun === item.gun && d.ay === item.ay && d.yil === item.yil && d.kulup_adi === item.kulup_adi && d.ders_no === (item.ders_no || 1) + 10)?.id
      : defter.find(d => d.gun === item.gun && d.ay === item.ay && d.yil === item.yil && d.kulup_adi === item.kulup_adi && d.ders_no === (item.ders_no || 11) - 10)?.id

    const guncellenenIdler = new Set([id, ...(eslesId ? [eslesId] : [])])

    // Optimistik güncelleme — anında göster
    const yeniDefter = defter.map(d => guncellenenIdler.has(d.id) ? ({ ...d, durum: yeniDurum } as SinifDefteri) : d)
    setDefter(yeniDefter)

    try {
      // DB güncellemeleri paralel
      await Promise.all([...guncellenenIdler].map(gId => supabase.from('sinif_defteri').update({ durum: yeniDurum }).eq('id', gId)))

      // Puantaj senkronizasyonu paralel — local state'ten hesaplanır, SELECT yok
      const etkilenenKisiler = [...guncellenenIdler]
        .map(gId => yeniDefter.find(d => d.id === gId))
        .filter((d): d is SinifDefteri => !!d)
        .map(d => ({ personelId: d.ogretmen_id, gun: d.gun, ay: d.ay, yil: d.yil }))
      await Promise.all(etkilenenKisiler.map(k => puantajGuncelle(yeniDefter, k.personelId!, k.gun, k.ay, k.yil)))
    } catch (err) {
      // Hata durumunda orijinal state'e dön
      setDefter(defter.map(d => guncellenenIdler.has(d.id) ? ({ ...d, durum: mevcutDurum } as SinifDefteri) : d))
      setMsg('❌ Durum güncelleme hatası: ' + hataMesaji(err))
    }
  }

  function openPicker(e: React.MouseEvent, d: number, m: number, y: number, sinifId: number, dersNo: number, gunAdi: string) {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPicker({ day: d, month: m, year: y, sinifId, dersNo, rect, gunAdi })
  }

  async function directKaydet(personelId: number, pInfo: { day: number, month: number, year: number, sinifId: number, dersNo: number }) {
    if (tatilMi(pInfo.month, pInfo.day, pInfo.year, tatiller)) {
      setConf({
        open: true,
        type: 'tatil',
        payload: { personelId, pInfo },
        title: 'Tatil Günü Uyarısı',
        message: 'Seçilen tarih TATİL olarak işaretlenmiş. Yine de kayıt eklemek istiyor musunuz?'
      })
      return
    }
    directKaydetGercek(personelId, pInfo)
  }

  async function directKaydetGercek(personelId: number, pInfo: { day: number, month: number, year: number, sinifId: number, dersNo: number }) {
    setConf(null)
    setPicker(null)
    setPickerSaving(true)
    const sinif = siniflar.find(s => s.id === pInfo.sinifId)
    if (!sinif) return

    // Eski kaydı ve öğretmenini bul
    const oldEntry = defter.find(d => d.gun === pInfo.day && d.ay === pInfo.month && d.yil === pInfo.year && d.kulup_adi === sinif.ad && (d.ders_no || 1) === pInfo.dersNo)
    const oldTeacherId = oldEntry?.ogretmen_id
    const oldTeacher = oldTeacherId ? personel.find(p => p.id === oldTeacherId) : null
    const oldKoordinatorId = oldTeacher?.koordinator_id

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profil } = await supabase.from('profiller').select('okul_id').eq('id', user?.id).single()
      const okulId = profil?.okul_id

      const payload: Record<string, unknown> = {
        gun: pInfo.day,
        ay: pInfo.month,
        yil: pInfo.year,
        kulup_adi: sinif.ad,
        ogretmen_id: personelId,
        ders_no: pInfo.dersNo,
        seans: 'sabah',
        durum: 'geldi',
        etkinlik_saati: 1,
        okul_id: okulId
      }

      const { error } = await supabase.from('sinif_defteri').upsert(payload, { onConflict: 'gun,ay,yil,kulup_adi,ders_no,okul_id' })
      if (error) throw error

      // ÖĞRETMEN İÇİN KOORDİNATÖR OTOMASYONU
      const secilenOgr = personel.find(p => p.id === personelId)
      const koordDersNo = pInfo.dersNo + 10

      if (secilenOgr?.koordinator_id && pInfo.dersNo < 11) {
        const koordPayload = {
          ...payload,
          ogretmen_id: secilenOgr.koordinator_id,
          ders_no: koordDersNo
        }
        await supabase.from('sinif_defteri').upsert(koordPayload, { onConflict: 'gun,ay,yil,kulup_adi,ders_no,okul_id' })
      } else if (pInfo.dersNo < 11) {
        // Yeni öğretmenin koordinatörü yoksa, eski koordinatör kaydını siliyoruz
        await supabase.from('sinif_defteri').delete().match({
          gun: pInfo.day,
          ay: pInfo.month,
          yil: pInfo.year,
          kulup_adi: sinif.ad,
          ders_no: koordDersNo,
          seans: 'sabah',
          okul_id: okulId
        })
      }

      // Etkilenen tüm öğretmen/koordinatörlerin puantajlarını güncelle
      const uniquePersonelIds = new Set<number>()
      uniquePersonelIds.add(personelId)
      if (secilenOgr?.koordinator_id) uniquePersonelIds.add(secilenOgr.koordinator_id)
      if (oldTeacherId) uniquePersonelIds.add(oldTeacherId)
      if (oldKoordinatorId) uniquePersonelIds.add(oldKoordinatorId)

      await Promise.all(Array.from(uniquePersonelIds).map(pid => syncPuantajForPersonDay(pid, pInfo.day, pInfo.month, pInfo.year)))

      load()
    } catch (err) {
      setMsg('❌ Kayıt hatası: ' + hataMesaji(err))
    } finally {
      setPickerSaving(false)
    }
  }


  function fastSil(e: React.MouseEvent, id: number) {
    e.stopPropagation()
    setConf({
      open: true,
      type: 'sil',
      id,
      title: 'Defter Kaydını Sil',
      message: 'Bu ders/koordinatör kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.'
    })
  }

  async function finishSil(id: number) {
    setConf(null)
    setPickerSaving(true)
    try {
      const { data: item } = await supabase.from('sinif_defteri').select('*').eq('id', id).single()
      if (!item) return

      const { error } = await supabase.from('sinif_defteri').delete().eq('id', id)
      if (error) throw error
      
      // Puantajı senkronize et
      await syncPuantajForPersonDay(item.ogretmen_id, item.gun, item.ay, item.yil)

      // Eğer bu bir 'ders' ise ve koordinatörü varsa, onu da sil
      if ((item.ders_no || 0) < 11) {
        const koordDersNo = (item.ders_no || 1) + 10
        const { data: koordItem } = await supabase.from('sinif_defteri')
          .select('*')
          .match({ gun: item.gun, ay: item.ay, yil: item.yil, kulup_adi: item.kulup_adi, ders_no: koordDersNo })
          .maybeSingle()
        
        if (koordItem) {
          await supabase.from('sinif_defteri').delete().eq('id', koordItem.id)
          await syncPuantajForPersonDay(koordItem.ogretmen_id, koordItem.gun, koordItem.ay, koordItem.yil)
        }
      }

      load()
    } catch (err) {
      setMsg('❌ Silme hatası: ' + hataMesaji(err))
    } finally {
      setPickerSaving(false)
    }
  }

  function dersGetir(sinifAd: string, dersNo: number, d: number, m: number, y: number): SinifDefteri | null {
    const dt = new Date(y, m - 1, d)
    const hg = dt.getDay()
    if (hg === 0 || hg === 6) return null
    if (tatilMi(m, d, y, tatiller)) return null
    return defter.find(p =>
      p.kulup_adi === sinifAd &&
      (p.ders_no || 1) === dersNo &&
      p.gun === d && p.ay === m && p.yil === y
    ) || null
  }

  const handlePdfDownload = async (tur: 'aylik' | 'haftalik' = 'aylik') => {
    const { pdf, autoTable } = await pdfHazirla('landscape')
    const PH = pdf.internal.pageSize.getHeight()
    const GUN = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
    const hedefSiniflar = seciliSinif ? siniflar.filter(s => s.id === seciliSinif) : siniflar
    const pdfDersSaati = Math.max(1, Math.min(10, ayarlar?.ders_saati_sayisi ?? 6))
    const kapali = (d: number, m: number, y: number) => { const g = new Date(y, m - 1, d, 12).getDay(); return g === 0 || g === 6 || tatilMi(m, d, y, tatiller) }
    const hucre = (ders: SinifDefteri | null) => {
      if (!ders) return ''
      const ogr = ders.ogretmen
      return `${ogr?.ad || ''}${ogr?.aktif === false ? ' (Ayrıldı)' : ''}\n${ders.durum === 'geldi' ? 'Geldi' : 'GELMEDİ'}`
    }
    const boya = (kapaliMi: boolean) => (data: CellHookData) => {
      if (data.column.index === 0) return
      if (kapaliMi) { data.cell.styles.fillColor = PDF_RENK.kapaliZemin; if (data.section === 'head') data.cell.styles.textColor = PDF_RENK.kapaliMetin }
      if (data.section === 'body' && data.cell.text.some((t: string) => t.includes('GELMEDİ'))) data.cell.styles.textColor = PDF_RENK.hata
    }

    let ilk = true
    for (const sinif of hedefSiniflar) {
      // Her sınıf için hem öğretmen hem koordinatör defteri
      for (const typeLabel of ['Öğretmen', 'Koordinatör']) {
        if (!ilk) pdf.addPage()
        ilk = false
        const y = pdfBaslik(pdf, { kurum: ayarlar?.kurum_adi, baslik: `${sinif.ad} sınıf defteri · ${typeLabel}`, alt: `${ayLabel(ay, yil)} · ${tur === 'aylik' ? 'aylık' : 'haftalık'} görünüm` })
        const currentHours = Array.from({ length: pdfDersSaati }, (_, i) => typeLabel === 'Öğretmen' ? i + 1 : i + 11)
        const satirAdi = (i: number) => typeLabel === 'Öğretmen' ? `${i + 1}. ders` : `${i + 1}. koord.`

        if (tur === 'aylik') {
          const gunler = Array.from({ length: gunSayisi(yil, ay) }, (_, i) => i + 1)
          autoTable(pdf, pdfTablo({
            head: [['Ders', ...gunler.map(d => `${GUN[new Date(yil, ay - 1, d, 12).getDay()]}\n${d}`)]],
            body: currentHours.map((dersNo, i) => [satirAdi(i), ...gunler.map(d => hucre(dersGetir(sinif.ad, dersNo, d, ay, yil)))]),
            startY: y,
            styles: { fontSize: 5, cellPadding: 0.7, halign: 'center' },
            headStyles: { fontSize: 5.5 },
            columnStyles: { 0: { cellWidth: 14, fontStyle: 'bold', halign: 'left' } },
            didParseCell: (data) => { if (data.column.index > 0) boya(kapali(gunler[data.column.index - 1], ay, yil))(data) },
          }))
        } else {
          let currentY = y
          visibleWeeks.forEach((week, wIdx) => {
            pdf.setFont('NotoSans', 'bold'); pdf.setFontSize(8)
            pdf.text(`${wIdx + 1}. hafta · ${week[0].day} ${AYLAR[week[0].month || 1]} – ${week[week.length - 1].day} ${AYLAR[week[week.length - 1].month || 1]}`, PDF_KENAR, currentY + 3)
            autoTable(pdf, pdfTablo({
              head: [['Ders', ...week.map(vd => `${GUN[new Date(vd.year, vd.month - 1, vd.day, 12).getDay()]}\n${vd.day}`)]],
              body: currentHours.map((dersNo, i) => [satirAdi(i), ...week.map(vd => hucre(dersGetir(sinif.ad, dersNo, vd.day, vd.month, vd.year)))]),
              startY: currentY + 5,
              styles: { fontSize: 6.5, halign: 'center' },
              columnStyles: { 0: { cellWidth: 20, fontStyle: 'bold', halign: 'left' } },
              didParseCell: (data) => { if (data.column.index > 0) { const vd = week[data.column.index - 1]; boya(kapali(vd.day, vd.month, vd.year))(data) } },
            }))
            currentY = pdfSonY(pdf) + 8
            if (currentY > PH - 50 && wIdx < visibleWeeks.length - 1) { pdf.addPage(); currentY = 16 }
          })
        }

        // Her sayfa dosyada bağımsız bir sayfa olduğu için imza her sayfada
        pdfImza(pdf, { ...ayarlar, mudur_unvani: ayarlar?.mudur_unvani || 'Okul Müdürü / Kulüp Başkanı' }, pdfSonY(pdf, 150), true)
      }
    }

    pdfAc(pdf, 'Sınıf defteri')
  }

  const gorunenSiniflar = seciliSinif ? siniflar.filter(s => s.id === seciliSinif) : siniflar
  const dersSaatiSayisi = Math.max(1, Math.min(10, ayarlar?.ders_saati_sayisi ?? 6))
  const DERS_SAATLERI = Array.from({ length: dersSaatiSayisi }, (_, i) => i + 1)
  const KOORD_SAATLERI = Array.from({ length: dersSaatiSayisi }, (_, i) => i + 11)

  // ── Haftalık yoklama ───────────────────────────────────────
  const HUCRE_H = 70
  const BOSLUK = 8
  const saatler = defterTuru === 'ders' ? DERS_SAATLERI : KOORD_SAATLERI
  const haftalar = ayHaftalari(yil, ay)
  const aktifHafta = Math.max(0, Math.min(haftaSecim ?? varsayilanHafta(haftalar), haftalar.length - 1))
  const haftaGunleri = haftalar[aktifHafta] || []
  const isGunu = (g: { day: number; month: number; year: number }) => !tatilMi(g.month, g.day, g.year, tatiller)
  const islenebilir = (g: HaftaGunu) => gecmisMi(g) || bugunMu(g)

  function durumAyarla(ders: SinifDefteri, hedef: 'geldi' | 'gelmedi') {
    if (ders.durum !== hedef) durumDegistir(ders.id, ders.durum)
  }

  // Hafta hapları: işlenmiş derslerde devam oranı (gelmedi varsa turuncu)
  const doluluk = haftalar.map(h => {
    let geldi = 0, toplam = 0
    for (const g of h) {
      if (!isGunu(g) || !islenebilir(g)) continue
      for (const s of gorunenSiniflar) for (const n of saatler) {
        const d = dersGetir(s.ad, n, g.day, g.month, g.year)
        if (d) { toplam++; if (d.durum === 'geldi') geldi++ }
      }
    }
    return toplam ? Math.round(geldi / toplam * 100) : null
  })

  // Ay özeti (bugüne kadar işlenen dersler)
  const ozetMap = new Map<number, { ad: string; geldi: number; gelmedi: number }>()
  const gelinmeyen: { gun: number; dersNo: number; ad: string; sinif: string }[] = []
  for (const vd of visibleDays) {
    const g = { ...vd, dow: new Date(vd.year, vd.month - 1, vd.day, 12).getDay() }
    if (g.dow === 0 || g.dow === 6 || !isGunu(g) || !islenebilir(g)) continue
    for (const s of gorunenSiniflar) for (const n of saatler) {
      const d = dersGetir(s.ad, n, g.day, g.month, g.year)
      if (!d?.ogretmen_id) continue
      const ad = d.ogretmen?.ad || 'Bilinmiyor'
      const o = ozetMap.get(d.ogretmen_id) || { ad, geldi: 0, gelmedi: 0 }
      if (d.durum === 'geldi') o.geldi++; else { o.gelmedi++; gelinmeyen.push({ gun: g.day, dersNo: n > 10 ? n - 10 : n, ad, sinif: s.ad }) }
      ozetMap.set(d.ogretmen_id, o)
    }
  }
  const ozetListe = [...ozetMap.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => (b.geldi + b.gelmedi) - (a.geldi + a.gelmedi))
  const topGeldi = ozetListe.reduce((t, o) => t + o.geldi, 0)
  const topGelmedi = ozetListe.reduce((t, o) => t + o.gelmedi, 0)
  const devamOrani = topGeldi + topGelmedi ? Math.round(topGeldi / (topGeldi + topGelmedi) * 100) : null

  const vurguAd = vurgu === null ? null : (personel.find(p => p.id === vurgu)?.ad || ozetListe.find(o => o.id === vurgu)?.ad || 'Öğretmen')

  const segmentDugme = (aktif: boolean): React.CSSProperties => ({ height: 30, padding: '0 12px', borderRadius: 7, border: `1px solid ${aktif ? 'var(--border)' : 'transparent'}`, background: aktif ? '#fff' : 'transparent', fontWeight: aktif ? 600 : 500, fontSize: 13, color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, boxShadow: aktif ? '0 1px 2px rgba(14,17,22,0.08)' : 'none' })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Topbar
        title="Sınıf Defteri"
        sub={`${ayLabel(ay, yil)} · öğretmen devam takibi`}
        actions={
          <>
            <button className="btn btn-secondary btn-sm no-print" disabled={pickerSaving} onClick={programdanAktar} title="Ders programındaki atamaları bu aya aktarır">
              <RefreshCw size={14} className={pickerSaving ? 'animate-spin' : ''} />
              {pickerSaving ? 'Eşitleniyor…' : 'Ders programıyla eşitle'}
            </button>
            <button className="btn btn-secondary btn-sm no-print" onClick={() => handlePdfDownload('aylik')}><Download size={14} /> Aylık PDF</button>
            <button className="btn btn-secondary btn-sm no-print" onClick={() => handlePdfDownload('haftalik')}><Download size={14} /> Haftalık PDF</button>
          </>
        }
      />

      <div style={{ padding: '20px 28px 48px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Bildirim msg={msg} onClose={() => setMsg('')} className="no-print" />

        {/* Araç çubuğu: sınıf · defter türü · hafta · açıklama */}
        <div className="card no-print" style={{ margin: 0, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div role="tablist" aria-label="Sınıf" style={{ display: 'flex', gap: 3, padding: 3, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, flexWrap: 'wrap' }}>
            <button role="tab" aria-selected={seciliSinif === null} onClick={() => setSeciliSinif(null)} style={segmentDugme(seciliSinif === null)}>Tüm sınıflar</button>
            {siniflar.map(s => <button key={s.id} role="tab" aria-selected={seciliSinif === s.id} onClick={() => setSeciliSinif(s.id)} style={segmentDugme(seciliSinif === s.id)}>{s.ad}</button>)}
          </div>
          <div role="tablist" aria-label="Defter" style={{ display: 'flex', gap: 3, padding: 3, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9 }}>
            <button role="tab" aria-selected={defterTuru === 'ders'} onClick={() => setDefterTuru('ders')} style={segmentDugme(defterTuru === 'ders')}><School size={14} /> Öğretmen</button>
            <button role="tab" aria-selected={defterTuru === 'koord'} onClick={() => setDefterTuru('koord')} style={segmentDugme(defterTuru === 'koord')}><UserCog size={14} /> Koordinatör</button>
          </div>
          <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
          <HaftaSecici haftalar={haftalar} secili={aktifHafta} onSec={setHaftaSecim} doluluk={doluluk} />
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12.5, color: 'var(--text2)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="sd-lejant" style={{ background: 'var(--success-light)', borderColor: 'var(--success-border)', color: '#0B6B42' }}><Check size={10} strokeWidth={3.5} /></span>Geldi</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="sd-lejant" style={{ background: 'var(--danger-light)', borderColor: 'var(--danger-border)', color: 'var(--danger-hover)' }}><X size={10} strokeWidth={3.5} /></span>Gelmedi</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="sd-lejant" style={{ borderStyle: 'dashed' }} />İleri tarih</span>
          </div>
        </div>

        {siniflar.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 20px', textAlign: 'center', background: 'var(--surface)', borderRadius: 12, border: '1px dashed var(--border-strong)' }}>
            <Calendar size={40} color="var(--text3)" style={{ marginBottom: 14 }} />
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Sınıf defteri boş</h2>
            <p style={{ color: 'var(--text3)', maxWidth: 420, margin: '8px 0 0' }}>Aktif sınıf yok ya da veriler yükleniyor. Sınıflar tanımlıysa önce ders programını doldurup “Ders programıyla eşitle” düğmesini kullanın.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '999 1 640px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {gorunenSiniflar.map(sinif => (
                <section key={sinif.id} className="card" style={{ margin: 0, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '0 4px 10px' }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{sinif.ad}</h3>
                    {sinif.yas_grubu && <span style={{ fontSize: 12.5, color: 'var(--text3)' }}>{sinif.yas_grubu}</span>}
                    <span style={{ fontSize: 12.5, color: 'var(--text3)' }}>{defterTuru === 'ders' ? 'Öğretmen defteri' : 'Koordinatör defteri'}</span>
                    {vurguAd && <button className="vurgu-cip" onClick={() => setVurgu(null)} aria-label={`${vurguAd} vurgusunu kaldır`}>{vurguAd} vurgulanıyor <X size={12} /></button>}
                  </div>
                  <div style={{ display: 'flex', gap: BOSLUK }}>
                    <div style={{ width: 64, flex: 'none', display: 'flex', flexDirection: 'column', gap: BOSLUK }}>
                      <div style={{ height: 74 }} />
                      {saatler.map((n, i) => <div key={n} style={{ height: HUCRE_H, display: 'flex', alignItems: 'center', fontWeight: 600, fontSize: 13, color: defterTuru === 'koord' ? 'var(--info)' : 'var(--text)' }}>{i + 1}. {defterTuru === 'koord' ? 'koord.' : 'ders'}</div>)}
                    </div>
                    {haftaGunleri.map(g => {
                      const tAd = tatilAdi(g, tatiller)
                      const bugun = bugunMu(g)
                      const isle = islenebilir(g)
                      const gunDersleri = saatler.map(n => dersGetir(sinif.ad, n, g.day, g.month, g.year)).filter(Boolean) as SinifDefteri[]
                      const gelmeyen = gunDersleri.filter(d => d.durum === 'gelmedi').length
                      const ozet = tAd ? 'Tatil' : !gunDersleri.length ? 'Ders yok' : isle ? `${gunDersleri.length - gelmeyen} / ${gunDersleri.length} geldi` : 'Planlandı'
                      return (
                        <div key={g.day} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: BOSLUK, borderRadius: 10, background: bugun ? '#F6F8FF' : 'transparent', padding: '0 4px 4px' }}>
                          <GunBasligi g={g} tatil={!!tAd} yukseklik={74} ozet={ozet} ozetRenk={gelmeyen ? 'var(--danger-hover)' : bugun ? 'var(--accent-dark)' : undefined} />
                          {tAd ? (
                            <TatilBlogu ad={tAd} alt="Yoklama alınmaz" yukseklik={saatler.length * HUCRE_H + (saatler.length - 1) * BOSLUK} />
                          ) : saatler.map(n => {
                            const ders = dersGetir(sinif.ad, n, g.day, g.month, g.year)
                            const og = ders?.ogretmen
                            const vurguMu = vurgu !== null && ders?.ogretmen_id === vurgu
                            const soluk = vurgu !== null && !vurguMu
                            if (!ders) {
                              return defterTuru === 'koord' ? (
                                <button key={n} className="sd-bos" style={{ height: HUCRE_H, opacity: soluk ? 0.35 : 1 }} onClick={(e) => openPicker(e, g.day, g.month, g.year, sinif.id, n, GUN_UZUN[g.dow])} aria-label={`${GUN_UZUN[g.dow]} ${g.day} için koordinatör ata`}>
                                  <Plus size={14} /> Koordinatör ata
                                </button>
                              ) : (
                                <div key={n} className="sd-yok" style={{ height: HUCRE_H, opacity: soluk ? 0.35 : 1 }}>Ders yok</div>
                              )
                            }
                            const gelmedi = ders.durum === 'gelmedi'
                            return (
                              <div key={n} className="sd-hucre" style={{ height: HUCRE_H, borderStyle: isle ? 'solid' : 'dashed', background: gelmedi ? '#FFF8F8' : vurguMu ? 'var(--accent-lighter)' : isle ? 'var(--surface)' : '#FAFBFC', borderColor: gelmedi ? 'var(--danger-border)' : vurguMu ? '#C9D4FA' : 'var(--border)', opacity: soluk ? 0.35 : 1, transition: 'opacity .15s' }}>
                                {defterTuru === 'koord' && <button className="sd-sil no-print" onClick={(e) => fastSil(e, ders.id)} aria-label="Koordinatör atamasını sil"><X size={12} /></button>}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                                  <span style={{ fontWeight: 600, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: gelmedi ? 'var(--danger-hover)' : isle ? 'var(--text)' : 'var(--text3)', textDecoration: gelmedi ? 'line-through' : 'none' }}>{og?.ad || 'Bilinmiyor'}</span>
                                  {og?.aktif === false && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--danger)' }}>Ayrıldı</span>}
                                </div>
                                {isle ? (
                                  <div role="radiogroup" aria-label={`${g.day} ${AYLAR[g.month]}, ${og?.ad || ''} yoklama`} style={{ display: 'flex', gap: 4 }}>
                                    <button role="radio" aria-checked={!gelmedi} aria-label="Geldi" title="Geldi" className={`sd-durum ${!gelmedi ? 'geldi' : ''}`} onClick={() => durumAyarla(ders, 'geldi')}><Check size={11} strokeWidth={3.2} /><span className="sd-durum-metin">Geldi</span></button>
                                    <button role="radio" aria-checked={gelmedi} aria-label="Gelmedi" title="Gelmedi" className={`sd-durum ${gelmedi ? 'gelmedi' : ''}`} onClick={() => durumAyarla(ders, 'gelmedi')}><X size={11} strokeWidth={3.2} /><span className="sd-durum-metin">Gelmedi</span></button>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: 11.5, color: 'var(--text3)' }}>Planlandı</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>

            <aside style={{ flex: '1 1 280px', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 88 }}>
              <section className="card" style={{ margin: 0, padding: 16 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{ayLabel(ay, yil).split(' ')[0]} yoklama özeti</h3>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{seciliSinif ? gorunenSiniflar[0]?.ad : 'Tüm sınıflar'} · bugüne kadar işlenen dersler · derslerini görmek için öğretmene tıklayın</div>
                {devamOrani === null ? (
                  <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 14 }}>Henüz işlenmiş ders yok.</div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 14 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em' }}>%{devamOrani}</span>
                      <span className="tabular" style={{ fontSize: 12.5, color: 'var(--text3)' }}>devam · {topGeldi} / {topGeldi + topGelmedi} ders</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--danger-light)', marginTop: 8, overflow: 'hidden' }}><div style={{ width: `${devamOrani}%`, height: '100%', background: 'var(--success)' }} /></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 12 }}>
                      {ozetListe.slice(0, 12).map(o => (
                        <button key={o.id} type="button" className="yuk-satir" aria-pressed={vurgu === o.id} onClick={() => setVurgu(vurgu === o.id ? null : o.id)} title={vurgu === o.id ? 'Vurguyu kaldır' : 'Bu öğretmenin derslerini vurgula'} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, ...(vurgu === o.id ? { background: 'var(--accent-lighter)', borderColor: '#C9D4FA' } : {}) }}>
                          <span style={{ width: 22, height: 22, flex: 'none', borderRadius: '50%', fontSize: 9.5, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: vurgu === o.id ? 'var(--accent)' : '#EEF0F4', color: vurgu === o.id ? '#fff' : 'var(--text2)' }}>{basHarf(o.ad)}</span>
                          <span style={{ flex: 1, fontWeight: vurgu === o.id ? 600 : 500, color: vurgu === o.id ? 'var(--accent-dark)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.ad}</span>
                          <span className="tabular" style={{ fontSize: 12, color: '#0B6B42' }} title="Geldi">{o.geldi}</span>
                          <span className="tabular" style={{ fontSize: 12, width: 26, textAlign: 'right', color: o.gelmedi ? 'var(--danger-hover)' : 'var(--text3)' }} title="Gelmedi">{o.gelmedi}</span>
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, fontSize: 11, color: 'var(--text3)', marginTop: 6 }}><span>geldi</span><span>gelmedi</span></div>
                  </>
                )}
              </section>
              <section className="card" style={{ margin: 0, padding: 16 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Gelinmeyen dersler</h3>
                {gelinmeyen.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 10 }}>Bu ay gelinmeyen ders yok.</div>
                ) : (
                  <div style={{ marginTop: 6 }}>
                    {gelinmeyen.slice().reverse().slice(0, 6).map((k, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: i ? '1px solid var(--border-light)' : 'none' }}>
                        <div style={{ width: 38, height: 40, flex: 'none', border: '1px solid var(--border)', borderRadius: 7, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1.1 }}>
                          <span className="tabular" style={{ fontWeight: 500 }}>{k.gun}</span>
                          <span style={{ fontSize: 9.5, color: 'var(--text3)' }}>{AYLAR[ay].slice(0, 3).toLocaleUpperCase('tr-TR')}</span>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.ad}</div>
                          <div style={{ fontSize: 12, color: 'var(--text3)' }}>{k.dersNo}. ders{gorunenSiniflar.length > 1 ? ` · ${k.sinif}` : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </aside>
          </div>
        )}
      </div>

      {picker && (
        <div className="picker-overlay" {...perdeKapat(() => setPicker(null))} style={{ position: 'fixed', inset: 0, zIndex: 9000 }}>
          <div
            className="fast-picker"
            role="dialog"
            aria-label="Koordinatör seç"
            style={{
              position: 'fixed',
              top: picker.rect.bottom + 320 > window.innerHeight ? Math.max(8, picker.rect.top - 320) : picker.rect.bottom + 6,
              left: Math.min(Math.max(picker.rect.left, 8), window.innerWidth - 248),
              zIndex: 9999, width: 240, maxHeight: 300, display: 'flex', flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="picker-header">{picker.gunAdi} {picker.day} {AYLAR[picker.month || 1]} · {picker.dersNo >= 11 ? 'Koordinatör seç' : 'Öğretmen seç'}</div>
            <div className="picker-list" style={{ overflowY: 'auto', flex: 1 }}>
              {(() => {
                const filtered = personel.filter(p => {
                  if (p.aktif === false) return false
                  const g = (p.gorev || '').toLowerCase()
                  if (picker.dersNo >= 11) return g.includes('koordinatör') || g.includes('koord') || g.includes('başkan')
                  return !['muhasebe', 'temizlik', 'başkan', 'denetim'].some(kw => g.includes(kw))
                })
                if (filtered.length === 0) {
                  return <div style={{ padding: '12px 16px', fontSize: 12.5, color: 'var(--text3)', textAlign: 'center' }}>{picker.dersNo >= 11 ? 'Koordinatör görevli personel bulunamadı' : 'Personel bulunamadı'}</div>
                }
                return filtered.map(p => (
                  <button key={p.id} className="picker-item" onClick={() => directKaydet(p.id, picker)}>
                    {p.ad} <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>{p.gorev}</span>
                  </button>
                ))
              })()}
            </div>
          </div>
        </div>
      )}

      {conf?.open && (
        <ConfirmModal
          baslik={conf.title}
          mesaj={conf.message}
          onayMetni={conf.type === 'sil' ? 'Evet, Sil' : conf.type === 'programdan-aktar' ? 'Evet, Eşitle' : 'Evet, Devam Et'}
          tehlikeli={conf.type === 'sil' || conf.type === 'programdan-aktar'}
          onOnayla={() => {
            if (conf.type === 'sil') finishSil(conf.id!)
            else if (conf.type === 'programdan-aktar') programdanAktarGercek()
            else if (conf.type === 'tatil' && conf.payload) directKaydetGercek(conf.payload.personelId, conf.payload.pInfo)
          }}
          onIptal={() => setConf(null)}
        />
      )}

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        :global(.animate-spin) { animation: spin 1s linear infinite; }
        .sd-hucre { container-type: inline-size; position: relative; border-radius: 9px; border-width: 1px; padding: 7px 8px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; }
        .sd-durum { flex: 1; height: 26px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface); color: var(--text3); font: inherit; font-size: 11.5px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 4px; cursor: pointer; padding: 0; transition: background .12s, border-color .12s, color .12s; }
        .sd-durum { min-width: 0; overflow: hidden; white-space: nowrap; }
        @container (max-width: 150px) { .sd-durum-metin { display: none; } }
        .sd-durum:hover { border-color: var(--border-strong); color: var(--text); }
        .sd-durum.geldi { background: var(--success-light); border-color: var(--success-border); color: #0B6B42; }
        .sd-durum.gelmedi { background: var(--danger-light); border-color: var(--danger-border); color: var(--danger-hover); }
        .sd-durum:focus-visible, .sd-bos:focus-visible { outline: none; box-shadow: var(--ring); }
        .sd-bos { width: 100%; border-radius: 9px; border: 1px dashed var(--border-strong); background: transparent; color: var(--text3); font: inherit; font-size: 12.5px; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; }
        .sd-bos:hover { border-color: var(--accent); border-style: solid; color: var(--accent-dark); background: var(--accent-lighter); }
        .sd-yok { border-radius: 9px; border: 1px dashed var(--border); display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--text3); }
        .sd-sil { position: absolute; top: -6px; right: -6px; width: 22px; height: 22px; padding: 0; border-radius: 50%; border: 1px solid var(--danger-border); background: var(--danger-light); color: var(--danger); display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0; transition: opacity .15s; }
        .sd-hucre:hover .sd-sil, .sd-sil:focus-visible { opacity: 1; }
        .sd-sil:hover { background: var(--danger); color: #fff; }
        @media (hover: none) { .sd-sil { opacity: 1; } }
        .sd-lejant { width: 16px; height: 16px; border-radius: 5px; border: 1px solid var(--border-strong); display: inline-flex; align-items: center; justify-content: center; }

        .fast-picker { background: var(--surface); border-radius: 12px; box-shadow: var(--shadow-float); border: 1px solid var(--border); overflow: hidden; min-width: 200px; }
        .picker-header { padding: 10px 14px; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text3); background: var(--surface2); border-bottom: 1px solid var(--border); }
        .picker-list { max-height: 260px; overflow-y: auto; padding: 4px 0; }
        .picker-item { display: block; width: 100%; padding: 9px 14px; text-align: left; background: none; border: none; cursor: pointer; font: inherit; font-size: 13px; font-weight: 600; color: var(--text); }
        .picker-item:hover { background: var(--accent-lighter); color: var(--accent-dark); }
        .yuk-satir { display: block; width: calc(100% + 16px); margin: 0 -8px; text-align: left; border: 1px solid transparent; background: none; border-radius: 8px; padding: 6px 8px; font: inherit; color: inherit; cursor: pointer; transition: background .12s; }
        .yuk-satir:hover { background: var(--surface2); }
        .yuk-satir:focus-visible { outline: none; box-shadow: var(--ring); }
        .vurgu-cip { display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 8px 0 10px; border-radius: 99px; border: 1px solid #C9D4FA; background: var(--accent-lighter); color: var(--accent-dark); font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
        .vurgu-cip:hover { background: #E1E8FD; }
      `}</style>
    </div>
  )
}
