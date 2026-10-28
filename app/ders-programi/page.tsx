'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import Topbar from '@/components/Topbar'
import { useAy } from '@/lib/AyContext'
import { supabase } from '@/lib/supabase'
import { DersProgrami, Personel, Tatil, Sinif, Ayarlar } from '@/lib/types'
import { AYLAR, gunSayisi, tatilMi, ayLabel } from '@/lib/hesaplama'
import { Download, Calendar, Copy, X, Plus, Minus, Check } from 'lucide-react'
import { ayHaftalari, varsayilanHafta, tatilAdi, ROZET, ROZET_VURGU, basHarf, bugunMu, HaftaSecici, GunBasligi, TatilBlogu, GUN_UZUN } from '@/components/HaftalikPlan'
import Link from 'next/link'
import Bildirim from '@/components/Bildirim'
import { pdfHazirla, pdfBaslik, pdfTablo, pdfImza, pdfSonY, pdfAc, PDF_RENK } from '@/lib/pdf'
import type { RowInput, CellInput } from '@/lib/pdf'
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

// İyimser güncellemelerde sunucu kimliği gelene kadar kullanılan geçici negatif kimlik
let geciciSayac = 0
const geciciId = () => --geciciSayac

export default function DersProgramiPage() {
  const { ay, yil } = useAy()
  const [program, setProgram] = useState<DersProgrami[]>([])
  const [personel, setPersonel] = useState<Personel[]>([])
  const [tatiller, setTatiller] = useState<Tatil[]>([])
  const [siniflar, setSiniflar] = useState<Sinif[]>([])
  const [ayarlar, setAyarlar] = useState<Ayarlar | null>(null)
  const [loading, setLoading] = useState(true)
  // Seçili sınıf tarayıcıda hatırlanır; ilk çizim sunucuyla aynı olsun diye açılıştan sonra okunur
  const [seciliSinif, setSeciliSinif] = useState<number | null>(null)
  const [sinifOkundu, setSinifOkundu] = useState(false)
  useYukleme(() => {
    try {
      const saved = window.localStorage.getItem('ders-programi-secili-sinif')
      if (saved && saved !== 'null') setSeciliSinif(Number(saved))
    } catch {}
    setSinifOkundu(true)
  }, [])
  const [msg, setMsg] = useState('')
  const [conf, setConf] = useState<{
    open: boolean,
    type: 'sil' | 'kopyala',
    id?: number,
    title: string,
    message: string
  } | null>(null)

  const [picker, setPicker] = useState<{
    day: number;
    month: number;
    year: number;
    sinifId: number;
    dersNo: number;
    gunAdi: string;
    rect: DOMRect
  } | null>(null)
  const [pickerOgretmen, setPickerOgretmen] = useState('')
  const [pickerArama, setPickerArama] = useState('')
  // Haftalık plan: seçili hafta (null = bugünün haftası / ilk hafta)
  const [haftaSecim, setHaftaSecim] = useState<number | null>(null)
  // Öğretmen vurgulama: seçilen öğretmenin dersleri öne çıkar, diğerleri soluklaşır
  const [vurgu, setVurgu] = useState<number | null>(null)
  useDegisince(`${ay}-${yil}`, () => setHaftaSecim(null))

  // --- TAKVİM HESAPLAMA ---
  const visibleDays = useMemo(() => {
    const dates: VisibleDay[] = []
    const count = gunSayisi(yil, ay)
    for (let d = 1; d <= count; d++) {
      dates.push({ day: d, month: ay, year: yil, isCurrentMonth: true })
    }
    return dates
  }, [ay, yil])

  // Sadece ders verebilecek personel (öğretmen, usta öğretici)
  const dersVerebilenPersonel = useMemo(() => {
    return personel.filter(p => {
      if (p.aktif === false) return false;
      const g = (p.gorev || '').toLocaleLowerCase('tr')
      return g.includes('öğretmen') || g.includes('ogretmen') || g.includes('usta')
    })
  }, [personel])

  const load = useCallback(async () => {
    const prevDate = new Date(yil, ay - 2, 1)
    const nextDate = new Date(yil, ay, 1)
    const pAy = prevDate.getMonth() + 1
    const pYil = prevDate.getFullYear()
    const nAy = nextDate.getMonth() + 1
    const nYil = nextDate.getFullYear()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profil } = await supabase.from('profiller').select('okul_id').eq('id', user?.id).single()
      const okulId = profil?.okul_id

      const [{ data: pr, error: prErr }, { data: per }, { data: tat }, { data: sin }, { data: ayr }] = await Promise.all([
        supabase.from('ders_programi')
          .select('*, ogretmen:personel(id,ad,gorev,aktif)')
          .or(`and(ay.eq.${ay},yil.eq.${yil}),ay.is.null,and(ay.eq.${pAy},yil.eq.${pYil}),and(ay.eq.${nAy},yil.eq.${nYil})`)
          .order('gun'),
        supabase.from('personel').select('*').order('ad'),
        supabase.from('tatiller').select('*').or(`okul_id.eq.${okulId ?? 0},okul_id.is.null`).order('baslangic_tarihi'),
        supabase.from('siniflar').select('*').eq('aktif', true).order('ad'),
        supabase.from('ayarlar').select('*').single(),
      ])
      if (prErr) setMsg('❌ Veri yükleme hatası: ' + prErr.message)
      setProgram(pr || [])
      setPersonel(per || [])
      setTatiller(tat || [])
      setSiniflar(sin || [])
      setAyarlar(ayr || null)
    } catch (e) {
      setMsg('❌ Beklenmeyen hata: ' + (hataMesaji(e, 'Bilinmiyor')))
    } finally {
      setLoading(false)
    }
  }, [ay, yil])

  useYukleme(load)

  // Sınıf seçimini hatırla
  useEffect(() => {
    if (!sinifOkundu) return
    try { window.localStorage.setItem('ders-programi-secili-sinif', seciliSinif?.toString() ?? 'null') } catch {}
  }, [seciliSinif, sinifOkundu])

  function isHaftaSonu(d: number, m: number, y: number) {
    const day = new Date(y, m - 1, d).getDay()
    return day === 0 || day === 6 // 0: Pazar, 6: Cumartesi
  }

  function dersGetir(sinifAd: string, dersNo: number, d: number, m: number, y: number): DersProgrami | null {
    if (isHaftaSonu(d, m, y)) return null 
    if (tatilMi(m, d, y, tatiller)) return null
    return program.find(p =>
      p.kulup_adi === sinifAd &&
      (p.ders_no || 1) === dersNo &&
      p.gun === d && 
      ((p.ay === m && p.yil === y) || (p.ay === null && m === ay && y === yil))
    ) || null
  }

  async function handlePdfDownload() {
    if (gorunenSiniflar.length === 0) {
      setMsg('⚠️ PDF için sınıf bulunamadı.')
      setTimeout(() => setMsg(''), 3000)
      return
    }
    setMsg('⌛ PDF hazırlanıyor...')
    try {
      const { pdf, autoTable } = await pdfHazirla('landscape')
      const kisaGun = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
      let ilkSayfa = true

      for (const sinif of gorunenSiniflar) {
        if (!ilkSayfa) pdf.addPage()
        ilkSayfa = false

        const y = pdfBaslik(pdf, { kurum: ayarlar?.kurum_adi, baslik: `${sinif.ad} sınıfı ders programı`, alt: `${AYLAR[ay]} ${yil}` })

        // Tablo başlığı: Ders + her gün
        const head: RowInput[] = [[
          'Ders',
          ...visibleDays.map(vd => `${kisaGun[new Date(vd.year, vd.month - 1, vd.day).getDay()]}\n${vd.day}`),
        ]]

        // Gövde: her ders saati için bir satır
        const body = DERS_SAATLERI.map(dersNo => {
          const row: CellInput[] = [`${dersNo}. ders`]
          for (const vd of visibleDays) {
            const hs = isHaftaSonu(vd.day, vd.month, vd.year)
            const t = tatilMi(vd.month, vd.day, vd.year, tatiller)
            if (hs) {
              row.push({ content: '', styles: { fillColor: PDF_RENK.kapaliZemin } })
            } else if (t) {
              row.push({ content: 'Tatil', styles: { fillColor: PDF_RENK.tatilZemin, textColor: PDF_RENK.hata, fontSize: 5 } })
            } else {
              const ders = dersGetir(sinif.ad, dersNo, vd.day, vd.month, vd.year)
              const ogr = ders?.ogretmen
              row.push(ogr?.ad ? `${ogr.ad}${ogr.aktif === false ? ' (Ayrıldı)' : ''}` : '')
            }
          }
          return row
        })

        autoTable(pdf, pdfTablo({
          head,
          body,
          startY: y,
          styles: { fontSize: 5.5, cellPadding: 0.9, halign: 'center' },
          headStyles: { fontSize: 6 },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 14, halign: 'left' } },
          didParseCell: (data) => {
            if (data.section !== 'head' || data.column.index === 0) return
            const vd = visibleDays[data.column.index - 1]
            if (vd && (isHaftaSonu(vd.day, vd.month, vd.year) || tatilMi(vd.month, vd.day, vd.year, tatiller))) {
              data.cell.styles.fillColor = PDF_RENK.kapaliZemin
              data.cell.styles.textColor = PDF_RENK.kapaliMetin
            }
          },
        }))

        pdfImza(pdf, ayarlar, pdfSonY(pdf, 180))
      }

      pdfAc(pdf, 'Ders programı')
      setMsg('✅ PDF hazırlandı.')
    } catch (err) {
      console.error(err)
      setMsg('❌ PDF hatası: ' + (hataMesaji(err, 'Bilinmeyen')))
    } finally {
      setTimeout(() => setMsg(''), 4000)
    }
  }

  function openPicker(e: React.MouseEvent, day: number, month: number, year: number, sinifId: number, dersNo: number, gunAdi: string) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const sinif = siniflar.find(s => s.id === sinifId)
    const existing = program.find(p => p.gun === day && p.ay === month && p.yil === year && p.kulup_adi === sinif?.ad && (p.ders_no || 1) === dersNo)
    setPickerOgretmen(existing?.ogretmen_id?.toString() || '')
    setPickerArama('')
    setPicker({ day, month, year, sinifId, dersNo, gunAdi, rect })
  }

  function closePicker() {
    setPicker(null)
    setPickerArama('')
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

  async function directKaydet(teacherId: number, pk: { day: number; month: number; year: number; sinifId: number; dersNo: number }) {
    if (tatilMi(pk.month, pk.day, pk.year, tatiller)) {
      setMsg('❌ Tatil günlerine ders ataması yapılamaz.')
      setPicker(null)
      setTimeout(() => setMsg(''), 3000)
      return
    }
    if (isHaftaSonu(pk.day, pk.month, pk.year)) {
      setMsg('❌ Hafta sonu günlerine ders ataması yapılamaz.')
      setPicker(null)
      setTimeout(() => setMsg(''), 3000)
      return
    }
    directKaydetGercek(teacherId, pk)
  }

  async function directKaydetGercek(teacherId: number, pk: { day: number; month: number; year: number; sinifId: number; dersNo: number }) {
    setConf(null)
    const oldProgram = [...program]
    
    // --- OPTIMISTIC UPDATE: Anında Arayüzü Güncelle ---
    const sinif = siniflar.find(s => s.id === pk.sinifId)
    const secilenOgretmen = personel.find(p => p.id === teacherId)
    const kulupAdi = sinif?.ad || '-'
    
    // Eski ders kaydını ve öğretmen/koordinatör bilgilerini çek
    const oldLesson = program.find(p => p.gun === pk.day && p.ay === pk.month && p.yil === pk.year && p.kulup_adi === kulupAdi && (p.ders_no || 1) === pk.dersNo)
    const oldTeacherId = oldLesson?.ogretmen_id
    const oldTeacher = oldTeacherId ? personel.find(p => p.id === oldTeacherId) : null
    const oldKoordinatorId = oldTeacher?.koordinator_id

    const optimisticItem = {
      id: geciciId(),
      gun: pk.day, ay: pk.month, yil: pk.year,
      ders_no: pk.dersNo, kulup_adi: kulupAdi,
      ogretmen_id: teacherId,
      ogretmen: secilenOgretmen
    } as DersProgrami

    setProgram(prev => {
      const filtered = prev.filter(p => !(p.gun === pk.day && p.ay === pk.month && p.yil === pk.year && p.kulup_adi === kulupAdi && (p.ders_no || 1) === pk.dersNo))
      return [...filtered, optimisticItem]
    })
    setPicker(null) // Menüyü anında kapat

    // --- ARKA PLANDA KAYIT ---
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profil } = await supabase.from('profiller').select('okul_id').eq('id', user?.id).single()
      const currentOkulId = profil?.okul_id ? Number(profil.okul_id) : (ayarlar?.okul_id ? Number(ayarlar.okul_id) : null)

      if (!currentOkulId) {
        throw new Error("Okul kimliği (okul_id) bulunamadı.")
      }

      const payload = {
        gun: pk.day, ay: pk.month, yil: pk.year,
        ders_no: pk.dersNo, kulup_adi: kulupAdi,
        ogretmen_id: teacherId,
        seans: 'sabah', etkinlik_saati: 1,
        okul_id: currentOkulId
      }
      
      const { data: existing } = await supabase.from('ders_programi')
        .select('id')
        .match({ gun: pk.day, ay: pk.month, yil: pk.year, kulup_adi: kulupAdi, ders_no: pk.dersNo, okul_id: currentOkulId })
        .single()

      if (existing) {
        await supabase.from('ders_programi').update({ ogretmen_id: teacherId }).eq('id', existing.id)
      } else {
        await supabase.from('ders_programi').insert(payload)
      }

      // Sınıf Defteri ve Koordinatör işlemleri — seans olmadan ara (kısıtlama seans içermiyor)
      const { data: existingDefter } = await supabase.from('sinif_defteri').select('id').match({ gun: pk.day, ay: pk.month, yil: pk.year, kulup_adi: kulupAdi, ders_no: pk.dersNo, okul_id: currentOkulId }).maybeSingle()
      if (existingDefter) await supabase.from('sinif_defteri').update({ ogretmen_id: teacherId, durum: 'geldi' }).eq('id', existingDefter.id)
      else await supabase.from('sinif_defteri').insert({ ...payload, durum: 'geldi' })

      const koordDersNo = (payload.ders_no || 1) + 10
      if (secilenOgretmen?.koordinator_id) {
        const { data: existingKoord } = await supabase.from('sinif_defteri').select('id').match({ gun: pk.day, ay: pk.month, yil: pk.year, kulup_adi: kulupAdi, ders_no: koordDersNo, okul_id: currentOkulId }).maybeSingle()
        if (existingKoord) await supabase.from('sinif_defteri').update({ ogretmen_id: secilenOgretmen.koordinator_id, durum: 'geldi' }).eq('id', existingKoord.id)
        else await supabase.from('sinif_defteri').insert({ ...payload, ogretmen_id: secilenOgretmen.koordinator_id, ders_no: koordDersNo, durum: 'geldi' })
      } else {
        // Yeni öğretmenin koordinatörü yoksa, eski koordinatör kaydını siliyoruz
        await supabase.from('sinif_defteri').delete().match({ gun: pk.day, ay: pk.month, yil: pk.year, kulup_adi: kulupAdi, ders_no: koordDersNo, okul_id: currentOkulId })
      }

      // Etkilenen tüm öğretmen/koordinatörlerin puantajlarını güncelle
      const uniquePersonelIds = new Set<number>()
      uniquePersonelIds.add(teacherId)
      if (secilenOgretmen?.koordinator_id) uniquePersonelIds.add(secilenOgretmen.koordinator_id)
      if (oldTeacherId) uniquePersonelIds.add(oldTeacherId)
      if (oldKoordinatorId) uniquePersonelIds.add(oldKoordinatorId)

      await Promise.all(Array.from(uniquePersonelIds).map(pid => syncPuantajForPersonDay(pid, pk.day, pk.month, pk.year)))
    } catch (err) {
      setProgram(oldProgram) // Hata olursa eski haline döndür
      setMsg('❌ Kayıt hatası: ' + hataMesaji(err))
      console.error(err)
    }
  }

  async function fastSil(e: React.MouseEvent, id: number) {
    e.stopPropagation()
    setConf({
      open: true,
      type: 'sil',
      id,
      title: 'Ders Atamasını Sil',
      message: 'Bu ders atamasını silmek istediğinizden emin misiniz?'
    })
  }

  async function finishSil(id: number) {
    setConf(null)
    const silinecek = program.find(p => p.id === id)
    if (!silinecek) return

    // Optimistic update: UI'dan hemen kaldır
    const oldProgram = program
    setProgram(prev => prev.filter(p => p.id !== id))

    const silinecekOgretmen = personel.find(p => p.id === silinecek.ogretmen_id)
    const koordinatorId = silinecekOgretmen?.koordinator_id

    try {
      await Promise.all([
        supabase.from('ders_programi').delete().eq('id', id),
        supabase.from('sinif_defteri').delete().match({
          gun: silinecek.gun,
          ay: silinecek.ay,
          yil: silinecek.yil,
          kulup_adi: silinecek.kulup_adi,
        }).in('ders_no', [silinecek.ders_no || 1, (silinecek.ders_no || 1) + 10]),
      ])

      // Puantajları senkronize et
      const uniquePersonelIds = new Set<number>()
      if (silinecek.ogretmen_id) uniquePersonelIds.add(silinecek.ogretmen_id)
      if (koordinatorId) uniquePersonelIds.add(koordinatorId)

      await Promise.all(Array.from(uniquePersonelIds).map(pid => syncPuantajForPersonDay(pid, silinecek.gun, silinecek.ay ?? ay, silinecek.yil ?? yil)))
    } catch (err) {
      // Hata olursa eski haline döndür
      setProgram(oldProgram)
      setMsg('❌ Silme hatası: ' + (hataMesaji(err, 'Bilinmiyor')))
      setTimeout(() => setMsg(''), 3000)
    }
  }

  async function ilkHaftayiKopyala() {
    setConf({
      open: true,
      type: 'kopyala',
      title: 'İlk Haftayı Aya Uygula',
      message: 'İlk haftadaki ders programınız ay boyunca tekrarlanacak. Diğer haftalardaki mevcut atamalar silinerek yeniden oluşturulacak. Devam etmek istiyor musunuz?'
    })
  }

  async function ilkHaftayiKopyalaGercek() {
    setConf(null)
    setMsg('⌛ Kopyalanıyor...')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profil } = await supabase.from('profiller').select('okul_id').eq('id', user?.id).single()
      const okulId = profil?.okul_id
      if (!okulId) throw new Error('Okul kimliği bulunamadı')

      const ayinSonGunu = gunSayisi(yil, ay)

      // 1) Şablon günleri belirle: aydaki her haftanın günü (Pzt-Cum) için ilk geçerli gün.
      //    Bu sayede atama olsun olmasın bile şablon haftasını biliriz.
      const templateGunler: number[] = []
      const haftaGunuKaydedildi = new Set<number>()
      for (let d = 1; d <= ayinSonGunu; d++) {
        if (isHaftaSonu(d, ay, yil)) continue
        if (tatilMi(ay, d, yil, tatiller)) continue
        const dow = new Date(yil, ay - 1, d).getDay()
        if (haftaGunuKaydedildi.has(dow)) continue
        haftaGunuKaydedildi.add(dow)
        templateGunler.push(d)
      }

      if (templateGunler.length === 0) {
        setMsg('⚠️ Bu ay için geçerli şablon haftası bulunamadı.')
        return
      }

      // 2) Her şablon günü için sonraki aynı haftanın günü gerçekleşmelerini topla
      const hedefGunlerSet = new Set<number>()
      const sablonHedefMap = new Map<number, number[]>() // şablon gün -> hedef günler

      for (const tGun of templateGunler) {
        const hedefler: number[] = []
        for (let hedefGun = tGun + 7; hedefGun <= ayinSonGunu; hedefGun += 7) {
          if (isHaftaSonu(hedefGun, ay, yil)) continue
          if (tatilMi(ay, hedefGun, yil, tatiller)) continue
          hedefler.push(hedefGun)
          hedefGunlerSet.add(hedefGun)
        }
        sablonHedefMap.set(tGun, hedefler)
      }

      // 3) Hedef günlerin tümünü temizle (boş slot'lar dahil — silinmeli ki tutarlı olsun)
      const hedefGunler = [...hedefGunlerSet]
      if (hedefGunler.length > 0) {
        await supabase.from('ders_programi').delete()
          .eq('ay', ay).eq('yil', yil).eq('okul_id', okulId).in('gun', hedefGunler)
        await supabase.from('sinif_defteri').delete()
          .eq('ay', ay).eq('yil', yil).eq('okul_id', okulId).in('gun', hedefGunler)
      }

      // 4) Şablondaki dolu slot'ları hedef günlere kopyala
      const dpInserts: Record<string, unknown>[] = []
      const defterInserts: Record<string, unknown>[] = []

      for (const [tGun, hedefler] of sablonHedefMap.entries()) {
        const tDersler = program.filter(p =>
          p.gun === tGun && p.ay === ay && p.yil === yil && p.ogretmen_id
        )
        for (const ders of tDersler) {
          const secilenOgretmen = personel.find(p => p.id === ders.ogretmen_id)
          for (const hedefGun of hedefler) {
            const base = {
              gun: hedefGun, ay, yil,
              ders_no: ders.ders_no || 1,
              kulup_adi: ders.kulup_adi,
              ogretmen_id: ders.ogretmen_id,
              seans: ders.seans || 'sabah',
              etkinlik_saati: ders.etkinlik_saati || 1,
              okul_id: okulId,
            }
            dpInserts.push(base)
            defterInserts.push({ ...base, durum: 'geldi' })
            if (secilenOgretmen?.koordinator_id) {
              defterInserts.push({
                ...base,
                ogretmen_id: secilenOgretmen.koordinator_id,
                ders_no: base.ders_no + 10,
                durum: 'geldi',
              })
            }
          }
        }
      }

      if (dpInserts.length > 0) {
        const { error: dpErr } = await supabase.from('ders_programi').insert(dpInserts)
        if (dpErr) throw dpErr
      }
      if (defterInserts.length > 0) {
        const { error: defterErr } = await supabase.from('sinif_defteri').insert(defterInserts)
        if (defterErr) throw defterErr
      }

      // Puantajları senkronize et
      await syncPuantajForMonth(ay, yil, okulId)

      setMsg(`✅ Kopyalama tamamlandı: ${dpInserts.length} ders işlendi, boş slot'lar temizlendi.`)
      load()
    } catch (err) {
      setMsg('❌ Kopyalama hatası: ' + hataMesaji(err))
      console.error(err)
    } finally {
      setTimeout(() => setMsg(''), 4000)
    }
  }

  async function dersSaatiGuncelle(yeni: number) {
    const clamped = Math.max(1, Math.min(10, yeni))
    if (!ayarlar) {
      setMsg('⚠️ Ayarlar henüz yüklenmedi, lütfen tekrar deneyin.')
      setTimeout(() => setMsg(''), 3000)
      return
    }
    if (clamped === (ayarlar.ders_saati_sayisi ?? 6)) return
    const oncekiAyarlar = ayarlar
    // Optimistic: arayüzü anında güncelle
    setAyarlar({ ...ayarlar, ders_saati_sayisi: clamped })
    const { error } = await supabase.from('ayarlar').update({ ders_saati_sayisi: clamped }).eq('id', ayarlar.id)
    if (error) {
      setAyarlar(oncekiAyarlar)
      setMsg('❌ Ders saati güncellenemedi: ' + error.message)
      setTimeout(() => setMsg(''), 3000)
    }
  }

  const gorunenSiniflar = seciliSinif ? siniflar.filter(s => s.id === seciliSinif) : siniflar
  const dersSaatiSayisi = Math.max(1, Math.min(10, ayarlar?.ders_saati_sayisi ?? 6))
  const DERS_SAATLERI = Array.from({ length: dersSaatiSayisi }, (_, i) => i + 1)

  // ── Haftalık plan ──────────────────────────────────────────
  const HUCRE_H = 62
  const BOSLUK = 8
  const haftalar = ayHaftalari(yil, ay)
  const aktifHafta = Math.max(0, Math.min(haftaSecim ?? varsayilanHafta(haftalar), haftalar.length - 1))
  const haftaGunleri = haftalar[aktifHafta] || []
  const isGunu = (g: { day: number; month: number; year: number }) => !tatilMi(g.month, g.day, g.year, tatiller)

  // Hafta hapları için doluluk (görünen sınıflar)
  const doluluk = haftalar.map(h => {
    let gerek = 0, dolu = 0
    for (const g of h) {
      if (!isGunu(g)) continue
      for (const s of gorunenSiniflar) for (const n of DERS_SAATLERI) { gerek++; if (dersGetir(s.ad, n, g.day, g.month, g.year)) dolu++ }
    }
    return gerek ? Math.round(dolu / gerek * 100) : null
  })

  // Ay geneli: öğretmen yükü ve boş saatler (görünen sınıflar)
  const yukMap = new Map<number, { ad: string; saat: number }>()
  const bosSaatler: { gun: number; dersNo: number; sinif: string }[] = []
  let ayAtanan = 0, ayIsGunu = 0, ayTatil = 0
  for (const vd of visibleDays) {
    if (isHaftaSonu(vd.day, vd.month, vd.year)) continue
    if (!isGunu(vd)) { ayTatil++; continue }
    ayIsGunu++
    for (const s of gorunenSiniflar) for (const n of DERS_SAATLERI) {
      const d = dersGetir(s.ad, n, vd.day, vd.month, vd.year)
      if (d?.ogretmen_id) {
        ayAtanan++
        const o = yukMap.get(d.ogretmen_id) || { ad: d.ogretmen?.ad || 'Bilinmiyor', saat: 0 }
        o.saat++; yukMap.set(d.ogretmen_id, o)
      } else bosSaatler.push({ gun: vd.day, dersNo: n, sinif: s.ad })
    }
  }
  const yukListe = [...yukMap.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.saat - a.saat)
  const maxYuk = Math.max(1, ...yukListe.map(y => y.saat))

  // Sınıf başına ay içindeki boş saat (sınıf düğmelerinde)
  const sinifBos = (ad: string) => visibleDays.reduce((t, vd) => {
    if (isHaftaSonu(vd.day, vd.month, vd.year) || !isGunu(vd)) return t
    return t + DERS_SAATLERI.filter(n => !dersGetir(ad, n, vd.day, vd.month, vd.year)).length
  }, 0)

  // Seçici için: öğretmenin bu haftaki ders sayısı (tüm sınıflar)
  const haftaYuk = new Map<number, number>()
  for (const p of program) {
    if (!p.ogretmen_id) continue
    if (haftaGunleri.some(g => g.day === p.gun && ((p.ay === g.month && p.yil === g.year) || (p.ay == null && g.month === ay)))) haftaYuk.set(p.ogretmen_id, (haftaYuk.get(p.ogretmen_id) || 0) + 1)
  }

  const vurguAd = vurgu === null ? null : (personel.find(p => p.id === vurgu)?.ad || yukListe.find(y => y.id === vurgu)?.ad || 'Öğretmen')

  const segmentDugme = (aktif: boolean): React.CSSProperties => ({ height: 30, padding: '0 12px', borderRadius: 7, border: `1px solid ${aktif ? 'var(--border)' : 'transparent'}`, background: aktif ? '#fff' : 'transparent', fontWeight: aktif ? 600 : 500, fontSize: 13, color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, boxShadow: aktif ? '0 1px 2px rgba(14,17,22,0.08)' : 'none' })
  const stepDugme: React.CSSProperties = { width: 30, height: 30, border: 'none', background: 'transparent', color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Topbar
        title="Ders Programı"
        sub={`${ayLabel(ay, yil)} · hücreye tıklayarak öğretmen atayın`}
        actions={
          <>
            <button className="btn btn-secondary btn-sm no-print" onClick={ilkHaftayiKopyala} title="1. haftadaki atamalar ayın diğer haftalarına kopyalanır; tatil ve hafta sonları atlanır">
              <Copy size={14} /> İlk haftayı aya uygula
            </button>
            <button className="btn btn-secondary btn-sm no-print" onClick={handlePdfDownload}>
              <Download size={14} /> PDF
            </button>
          </>
        }
      />

      <div style={{ padding: '20px 28px 48px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Bildirim msg={msg} onClose={() => setMsg('')} className="no-print" />

        {/* Araç çubuğu: sınıf · hafta · günlük ders */}
        <div className="card no-print" style={{ margin: 0, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div role="tablist" aria-label="Sınıf" style={{ display: 'flex', gap: 3, padding: 3, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 9, flexWrap: 'wrap' }}>
            <button role="tab" aria-selected={seciliSinif === null} onClick={() => setSeciliSinif(null)} style={segmentDugme(seciliSinif === null)}>Tüm sınıflar</button>
            {siniflar.map(s => {
              const bos = sinifBos(s.ad)
              return (
                <button key={s.id} role="tab" aria-selected={seciliSinif === s.id} onClick={() => setSeciliSinif(s.id)} style={segmentDugme(seciliSinif === s.id)}>
                  {s.ad}
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '0 6px', borderRadius: 99, background: bos ? '#FFF1D6' : 'var(--success-light)', color: bos ? '#8A5200' : '#0B6B42' }}>{bos ? `${bos} boş` : 'tam'}</span>
                </button>
              )
            })}
          </div>
          <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
          <HaftaSecici haftalar={haftalar} secili={aktifHafta} onSec={setHaftaSecim} doluluk={doluluk} />
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)' }}>
            Günlük ders
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-strong)', borderRadius: 8, overflow: 'hidden' }}>
              <button style={{ ...stepDugme, opacity: dersSaatiSayisi <= 1 ? 0.4 : 1 }} disabled={dersSaatiSayisi <= 1} onClick={() => dersSaatiGuncelle(dersSaatiSayisi - 1)} aria-label="Ders saatini azalt"><Minus size={14} /></button>
              <span className="tabular" style={{ width: 26, textAlign: 'center', fontWeight: 500, color: 'var(--text)' }}>{dersSaatiSayisi}</span>
              <button style={{ ...stepDugme, opacity: dersSaatiSayisi >= 10 ? 0.4 : 1 }} disabled={dersSaatiSayisi >= 10} onClick={() => dersSaatiGuncelle(dersSaatiSayisi + 1)} aria-label="Ders saati ekle"><Plus size={14} /></button>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 20px', color: 'var(--text3)' }}>
            <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.9s linear infinite', marginBottom: 14 }} />
            Ders programı yükleniyor…
          </div>
        ) : siniflar.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 20px', textAlign: 'center', background: 'var(--surface)', borderRadius: 12, border: '1px dashed var(--border-strong)' }}>
            <Calendar size={40} color="var(--text3)" style={{ marginBottom: 14 }} />
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Ders programı hazır değil</h2>
            <p style={{ color: 'var(--text3)', maxWidth: 400, margin: '8px 0 20px' }}>Henüz aktif bir sınıf tanımlanmamış. Ders ataması yapabilmek için önce sınıflarınızı oluşturun.</p>
            <Link href="/siniflar" className="btn btn-primary" style={{ textDecoration: 'none' }}>Sınıf tanımlarına git</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '999 1 640px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {gorunenSiniflar.map(sinif => {
                let hToplam = 0, hDolu = 0
                for (const g of haftaGunleri) {
                  if (!isGunu(g)) continue
                  for (const n of DERS_SAATLERI) { hToplam++; if (dersGetir(sinif.ad, n, g.day, g.month, g.year)) hDolu++ }
                }
                const hBos = hToplam - hDolu
                return (
                  <section key={sinif.id} className="card" style={{ margin: 0, padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '0 4px 10px' }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{sinif.ad}</h3>
                      <span style={{ fontSize: 12.5, color: 'var(--text3)' }}><span className="tabular" style={{ color: 'var(--text)' }}>{hDolu} / {hToplam}</span> ders atandı</span>
                      {hBos > 0 && <span className="badge badge-orange">{hBos} boş saat</span>}
                      {vurguAd && <button className="vurgu-cip" onClick={() => setVurgu(null)} aria-label={`${vurguAd} vurgusunu kaldır`}>{vurguAd} vurgulanıyor <X size={12} /></button>}
                    </div>
                    <div style={{ display: 'flex', gap: BOSLUK }}>
                      <div style={{ width: 64, flex: 'none', display: 'flex', flexDirection: 'column', gap: BOSLUK }}>
                        <div style={{ height: 62 }} />
                        {DERS_SAATLERI.map(n => <div key={n} style={{ height: HUCRE_H, display: 'flex', alignItems: 'center', fontWeight: 600, fontSize: 13 }}>{n}. ders</div>)}
                      </div>
                      {haftaGunleri.map(g => {
                        const tAd = tatilAdi(g, tatiller)
                        const bugun = bugunMu(g)
                        return (
                          <div key={g.day} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: BOSLUK, borderRadius: 10, background: bugun ? '#F6F8FF' : 'transparent', padding: '0 4px 4px' }}>
                            <GunBasligi g={g} tatil={!!tAd} />
                            {tAd ? (
                              <TatilBlogu ad={tAd} alt="Ders atanmaz" yukseklik={DERS_SAATLERI.length * HUCRE_H + (DERS_SAATLERI.length - 1) * BOSLUK} />
                            ) : DERS_SAATLERI.map(n => {
                              const ders = dersGetir(sinif.ad, n, g.day, g.month, g.year)
                              const og = ders?.ogretmen
                              const vurguMu = vurgu !== null && ders?.ogretmen_id === vurgu
                              const soluk = vurgu !== null && !vurguMu
                              const r = vurguMu ? ROZET_VURGU : ROZET
                              const secili = !!picker && picker.day === g.day && picker.month === g.month && picker.sinifId === sinif.id && picker.dersNo === n
                              const ac = (e: React.MouseEvent) => openPicker(e, g.day, g.month, g.year, sinif.id, n, GUN_UZUN[g.dow])
                              return (
                                <div key={n} className="dp-hucre" style={{ position: 'relative', height: HUCRE_H, opacity: soluk ? 0.35 : 1, transition: 'opacity .15s' }}>
                                  {ders ? (
                                    <>
                                      <button className="dp-dolu" onClick={ac} aria-label={`${GUN_UZUN[g.dow]} ${g.day}, ${n}. ders: ${og?.ad || 'öğretmen'}. Değiştirmek için seçin`} style={secili ? { borderColor: 'var(--accent)', boxShadow: 'var(--ring)' } : vurguMu ? { borderColor: '#C9D4FA', background: 'var(--accent-lighter)' } : undefined}>
                                        <span className="dp-avatar" style={{ background: r.tint, color: r.renk }}>{basHarf(og?.ad)}</span>
                                        <span style={{ minWidth: 0 }}>
                                          <span className="dp-ad">{og?.ad || 'Bilinmiyor'}</span>
                                          <span className="dp-alt" style={og?.aktif === false ? { color: 'var(--danger)', fontWeight: 600 } : undefined}>{og?.aktif === false ? 'Ayrıldı' : (og?.gorev || 'Öğretmen')}</span>
                                        </span>
                                      </button>
                                      <button className="dp-sil no-print" onClick={(e) => fastSil(e, ders.id)} aria-label={`${n}. ders atamasını kaldır`}><X size={12} /></button>
                                    </>
                                  ) : (
                                    <button className="dp-bos" onClick={ac} aria-label={`${GUN_UZUN[g.dow]} ${g.day}, ${n}. ders için öğretmen ata`} style={secili ? { borderColor: 'var(--accent)', background: 'var(--accent-lighter)', color: 'var(--accent-dark)', borderStyle: 'solid' } : undefined}>
                                      <Plus size={14} /> Öğretmen ata
                                    </button>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>

            <aside style={{ flex: '1 1 280px', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 88 }}>
              <section className="card" style={{ margin: 0, padding: 16 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Öğretmen yükü · {ayLabel(ay, yil).split(' ')[0]}</h3>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{seciliSinif ? `${gorunenSiniflar[0]?.ad} sınıfındaki` : 'Tüm sınıflardaki'} aylık ders saati · derslerini görmek için öğretmene tıklayın</div>
                {yukListe.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 14 }}>Bu ay için henüz atama yok.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 12 }}>
                    {yukListe.slice(0, 12).map(y => {
                      const aktif = vurgu === y.id
                      return (
                        <button key={y.id} type="button" className="yuk-satir" aria-pressed={aktif} onClick={() => setVurgu(aktif ? null : y.id)} title={aktif ? 'Vurguyu kaldır' : 'Bu öğretmenin derslerini vurgula'} style={aktif ? { background: 'var(--accent-lighter)', borderColor: '#C9D4FA' } : undefined}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                            <span className="dp-avatar" style={{ width: 22, height: 22, fontSize: 9.5, background: aktif ? 'var(--accent)' : '#EEF0F4', color: aktif ? '#fff' : 'var(--text2)' }}>{basHarf(y.ad)}</span>
                            <span style={{ flex: 1, fontWeight: aktif ? 600 : 500, color: aktif ? 'var(--accent-dark)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{y.ad}</span>
                            <span className="tabular" style={{ fontSize: 12 }}>{y.saat} sa</span>
                          </span>
                          <span style={{ display: 'block', height: 5, borderRadius: 3, background: '#EEF0F4', marginTop: 6, overflow: 'hidden' }}>
                            <span style={{ display: 'block', height: '100%', width: `${y.saat / maxYuk * 100}%`, background: aktif ? 'var(--accent)' : '#AEB5C0', borderRadius: 3 }} />
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </section>
              <section className="card" style={{ margin: 0, padding: 16 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Ay geneli</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                  {[
                    { l: 'Atanan', v: ayAtanan, c: 'var(--text)' },
                    { l: 'Boş saat', v: bosSaatler.length, c: bosSaatler.length ? '#8A5200' : 'var(--text)' },
                    { l: 'İş günü', v: ayIsGunu, c: 'var(--text)' },
                    { l: 'Tatil', v: ayTatil, c: ayTatil ? 'var(--danger-hover)' : 'var(--text)' },
                  ].map(k => (
                    <div key={k.l} style={{ padding: 10, border: '1px solid var(--border-light)', borderRadius: 8 }}>
                      <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>{k.l}</div>
                      <div className="tabular" style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: k.c }}>{k.v}</div>
                    </div>
                  ))}
                </div>
                {bosSaatler.length > 0 && (
                  <div className="alert alert-warn" style={{ marginTop: 12, marginBottom: 0, display: 'block', fontSize: 12.5 }}>
                    Boş saatler: {bosSaatler.slice(0, 4).map(b => `${b.gun} ${AYLAR[ay]} ${b.dersNo}. ders${gorunenSiniflar.length > 1 ? ` (${b.sinif})` : ''}`).join(', ')}{bosSaatler.length > 4 ? ` ve ${bosSaatler.length - 4} saat daha` : ''}
                  </div>
                )}
              </section>
            </aside>
          </div>
        )}
      </div>

      {picker && (() => {
        const aramaLower = pickerArama.toLocaleLowerCase('tr')
        const sinifAd = siniflar.find(s => s.id === picker.sinifId)?.ad
        const liste = dersVerebilenPersonel
          .filter(p => !pickerArama || (p.ad || '').toLocaleLowerCase('tr').includes(aramaLower) || (p.gorev || '').toLocaleLowerCase('tr').includes(aramaLower))
          .map(p => {
            const cakisma = program.find(x => x.ogretmen_id === p.id && x.gun === picker.day && (x.ders_no || 1) === picker.dersNo && x.kulup_adi !== sinifAd && ((x.ay === picker.month && x.yil === picker.year) || (x.ay == null && picker.month === ay)))
            return { p, cakisma }
          })
        const secilebilir = liste.filter(x => !x.cakisma)
        const mevcutId = pickerOgretmen ? Number(pickerOgretmen) : null
        // Seçici, hücrenin altında ya da üstünde hangisinde daha çok yer varsa orada açılır ve ekrandan taşmaz
        const ekranH = typeof window !== 'undefined' ? window.innerHeight : 900
        const altBosluk = ekranH - picker.rect.bottom - 12
        const ustBosluk = picker.rect.top - 12
        const altta = altBosluk >= 380 || altBosluk >= ustBosluk
        const kullanilabilir = Math.max(200, altta ? altBosluk : ustBosluk)
        const listeMax = Math.max(110, Math.min(300, kullanilabilir - (mevcutId !== null ? 150 : 104)))
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(14,17,22,0.12)' }} onClick={closePicker}>
            <div
              role="dialog"
              aria-label="Öğretmen seç"
              onClick={e => e.stopPropagation()}
              style={{
                position: 'absolute',
                ...(altta ? { top: picker.rect.bottom + 6 } : { bottom: ekranH - picker.rect.top + 6 }),
                maxHeight: kullanilabilir, display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
                left: Math.max(8, Math.min(picker.rect.left, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 308)),
                width: 300, background: 'var(--surface)', borderRadius: 12, boxShadow: 'var(--shadow-float)', padding: 10, border: '1px solid var(--border)',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', padding: '2px 4px 8px', color: 'var(--text3)', textTransform: 'uppercase' }}>
                {picker.gunAdi} {picker.day} {AYLAR[picker.month]} · {picker.dersNo}. ders · {sinifAd}
              </div>
              <input
                type="text"
                autoFocus
                value={pickerArama}
                onChange={e => setPickerArama(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') closePicker(); if (e.key === 'Enter' && secilebilir.length === 1) directKaydet(secilebilir[0].p.id, picker) }}
                placeholder="Öğretmen ara…"
                aria-label="Öğretmen ara"
                className="form-input"
                style={{ marginBottom: 8, fontSize: 13 }}
              />
              <div style={{ maxHeight: listeMax, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 1, minHeight: 0 }}>
                {dersVerebilenPersonel.length === 0 ? (
                  <div style={{ padding: 14, fontSize: 12.5, color: 'var(--text3)', textAlign: 'center' }}>Ders verebilecek personel bulunamadı.</div>
                ) : liste.length === 0 ? (
                  <div style={{ padding: 14, fontSize: 12.5, color: 'var(--text3)', textAlign: 'center' }}>Eşleşen öğretmen yok.</div>
                ) : liste.map(({ p, cakisma }) => {
                  const seciliMi = mevcutId === p.id
                  const r = ROZET
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className="picker-item"
                      disabled={!!cakisma}
                      aria-pressed={seciliMi}
                      onClick={() => directKaydet(p.id, picker)}
                      style={{ background: seciliMi ? 'var(--accent-lighter)' : undefined, opacity: cakisma ? 0.55 : 1, cursor: cakisma ? 'not-allowed' : 'pointer' }}
                    >
                      <span className="dp-avatar" style={{ width: 26, height: 26, fontSize: 10.5, background: r.tint, color: r.renk }}>{basHarf(p.ad)}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>{p.ad}{seciliMi && <Check size={13} color="var(--success)" />}</span>
                        <span style={{ display: 'block', fontSize: 11.5, color: cakisma ? 'var(--danger)' : 'var(--text3)' }}>
                          {cakisma ? `Bu saatte ${cakisma.kulup_adi} sınıfında` : `${p.gorev || 'Öğretmen'} · bu hafta ${haftaYuk.get(p.id) || 0} ders`}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
              {mevcutId !== null && (
                <button
                  onClick={() => {
                    const existing = program.find(p => p.gun === picker.day && p.ay === picker.month && p.yil === picker.year && p.kulup_adi === sinifAd && (p.ders_no || 1) === picker.dersNo)
                    if (existing) { closePicker(); finishSil(existing.id) }
                  }}
                  className="btn btn-outline-danger btn-sm"
                  style={{ marginTop: 8, width: '100%' }}
                >
                  <X size={14} /> Atamayı kaldır
                </button>
              )}
            </div>
          </div>
        )
      })()}

      {conf?.open && (
        <ConfirmModal
          baslik={conf.title}
          mesaj={conf.message}
          onOnayla={() => {
            if (conf.type === 'sil') finishSil(conf.id!)
            else if (conf.type === 'kopyala') ilkHaftayiKopyalaGercek()
          }}
          onIptal={() => setConf(null)}
        />
      )}

      <style jsx>{`
        .dp-dolu { width: 100%; height: 100%; border-radius: 9px; border: 1px solid var(--border); background: var(--surface); padding: 0 10px; display: flex; align-items: center; gap: 9px; text-align: left; cursor: pointer; transition: border-color .15s, background .15s; font: inherit; color: var(--text); }
        .dp-dolu:hover { border-color: #C9D4FA; background: #FBFCFF; }
        .dp-dolu:focus-visible, .dp-bos:focus-visible { outline: none; box-shadow: var(--ring); border-color: var(--accent); }
        .dp-ad { display: block; font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dp-alt { display: block; font-size: 11.5px; color: var(--text3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .dp-bos { width: 100%; height: 100%; border-radius: 9px; border: 1px dashed var(--border-strong); background: transparent; color: var(--text3); font: inherit; font-size: 12.5px; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; transition: all .15s; }
        .dp-bos:hover { border-color: var(--accent); color: var(--accent-dark); background: var(--accent-lighter); border-style: solid; }
        .dp-sil { position: absolute; top: -6px; right: -6px; width: 22px; height: 22px; padding: 0; border-radius: 50%; border: 1px solid var(--danger-border); background: var(--danger-light); color: var(--danger); display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0; transition: opacity .15s; }
        .dp-hucre:hover .dp-sil, .dp-sil:focus-visible { opacity: 1; }
        .dp-sil:hover { background: var(--danger); color: #fff; }
        @media (hover: none) { .dp-sil { opacity: 1; } }
        :global(.dp-avatar) { width: 28px; height: 28px; flex: none; border-radius: 50%; font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center; }
        .picker-item { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; border: none; background: none; font: inherit; color: var(--text); padding: 8px; border-radius: 8px; font-size: 13px; }
        .picker-item:not(:disabled):hover { background: var(--accent-lighter); }
        .yuk-satir { display: block; width: calc(100% + 16px); margin: 0 -8px; text-align: left; border: 1px solid transparent; background: none; border-radius: 8px; padding: 6px 8px; font: inherit; color: inherit; cursor: pointer; transition: background .12s; }
        .yuk-satir:hover { background: var(--surface2); }
        .yuk-satir:focus-visible { outline: none; box-shadow: var(--ring); }
        .vurgu-cip { display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 8px 0 10px; border-radius: 99px; border: 1px solid #C9D4FA; background: var(--accent-lighter); color: var(--accent-dark); font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
        .vurgu-cip:hover { background: #E1E8FD; }
      `}</style>
    </div>
  )
}
