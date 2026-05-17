'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import Topbar from '@/components/Topbar'
import { useAy } from '@/lib/AyContext'
import { supabase } from '@/lib/supabase'
import { DersProgrami, Personel, Tatil, Sinif, Ayarlar } from '@/lib/types'
import { GUNLER, AYLAR, gunSayisi, tatilMi, ayLabel } from '@/lib/hesaplama'
import { Download, Calendar, Zap, CalendarDays } from 'lucide-react'
import React from 'react'
import ConfirmModal from '@/components/ConfirmModal'

interface VisibleDay {
  day: number
  month: number
  year: number
  isCurrentMonth: boolean
}

export default function DersProgramiPage() {
  const { ay, yil } = useAy()
  const [program, setProgram] = useState<DersProgrami[]>([])
  const [personel, setPersonel] = useState<Personel[]>([])
  const [tatiller, setTatiller] = useState<Tatil[]>([])
  const [siniflar, setSiniflar] = useState<Sinif[]>([])
  const [ayarlar, setAyarlar] = useState<Ayarlar | null>(null)
  const [loading, setLoading] = useState(true)
  const [seciliSinif, setSeciliSinif] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null
    const saved = window.localStorage.getItem('ders-programi-secili-sinif')
    return saved && saved !== 'null' ? Number(saved) : null
  })
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
          .select('*, ogretmen:personel(id,ad,gorev)')
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
    } catch (e: any) {
      setMsg('❌ Beklenmeyen hata: ' + (e.message || 'Bilinmiyor'))
    } finally {
      setLoading(false)
    }
  }, [ay, yil])

  useEffect(() => { load() }, [load])

  // Sınıf seçimini hatırla
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('ders-programi-secili-sinif', seciliSinif?.toString() ?? 'null')
  }, [seciliSinif])

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
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      // Türkçe karakter desteği için NotoSans yükle
      async function loadFontB64(path: string) {
        const res = await fetch(path)
        const buf = await res.arrayBuffer()
        const bytes = new Uint8Array(buf)
        let binary = ''
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
        return btoa(binary)
      }
      const [regularB64, boldB64] = await Promise.all([
        loadFontB64('/fonts/NotoSans-Regular.ttf'),
        loadFontB64('/fonts/NotoSans-Bold.ttf'),
      ])

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      pdf.addFileToVFS('NotoSans-Regular.ttf', regularB64)
      pdf.addFileToVFS('NotoSans-Bold.ttf', boldB64)
      pdf.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal', 'Identity-H')
      pdf.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold', 'Identity-H')
      pdf.setFont('NotoSans')

      const PW = pdf.internal.pageSize.getWidth()
      const M = 5
      const kisaGun = ['Pa', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct']
      let ilkSayfa = true

      for (const sinif of gorunenSiniflar) {
        if (!ilkSayfa) pdf.addPage()
        ilkSayfa = false

        // Başlık
        pdf.setFont('NotoSans', 'bold')
        pdf.setFontSize(12)
        pdf.text(ayarlar?.kurum_adi || 'ÇOCUK KULÜBÜ', PW / 2, 10, { align: 'center' })
        pdf.setFontSize(10)
        pdf.text(`${sinif.ad} - ${AYLAR[ay]} ${yil} Ders Programı`, PW / 2, 16, { align: 'center' })

        // Tablo başlığı: Ders + her gün
        const head: any[] = [
          ['Ders', ...visibleDays.map(vd => {
            const d = new Date(vd.year, vd.month - 1, vd.day).getDay()
            return `${vd.day}\n${kisaGun[d]}`
          })],
        ]

        // Gövde: her ders saati için bir satır
        const body = DERS_SAATLERI.map(dersNo => {
          const row: any[] = [{ content: `${dersNo}. Ders`, styles: { fontStyle: 'bold', fillColor: [240, 230, 210] } }]
          for (const vd of visibleDays) {
            const hs = isHaftaSonu(vd.day, vd.month, vd.year)
            const t = tatilMi(vd.month, vd.day, vd.year, tatiller)
            if (hs) {
              row.push({ content: '—', styles: { fillColor: [230, 230, 230], textColor: [150, 150, 150] } })
            } else if (t) {
              row.push({ content: 'Tatil', styles: { fillColor: [253, 232, 230], textColor: [180, 80, 80], fontSize: 5 } })
            } else {
              const ders = dersGetir(sinif.ad, dersNo, vd.day, vd.month, vd.year)
              const ad = (ders?.ogretmen as any)?.ad || ''
              row.push(ad)
            }
          }
          return row
        })

        autoTable(pdf, {
          head,
          body,
          startY: 20,
          margin: { top: M, right: M, bottom: M, left: M },
          styles: {
            font: 'NotoSans',
            fontSize: 6,
            cellPadding: 1.2,
            halign: 'center',
            valign: 'middle',
            overflow: 'linebreak',
            lineWidth: 0.1,
            lineColor: [200, 200, 200],
            textColor: [40, 40, 40],
          },
          headStyles: {
            fillColor: [45, 90, 61],
            textColor: [255, 255, 255],
            fontSize: 6.5,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
          },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 18, halign: 'left' } },
          theme: 'grid',
        })

        // İmza bloğu (her sayfada altta)
        const finalY: number = (pdf as any).lastAutoTable?.finalY ?? 180
        const pageH = pdf.internal.pageSize.getHeight()
        if (finalY + 22 <= pageH - M) {
          const signY = finalY + 14
          pdf.setFont('NotoSans', 'bold')
          pdf.setFontSize(7)
          pdf.text('DÜZENLEYEN', M + 30, signY, { align: 'center' })
          pdf.text('ONAYLAYAN', PW - M - 30, signY, { align: 'center' })
          pdf.setFont('NotoSans', 'normal')
          pdf.setFontSize(7)
          pdf.text(ayarlar?.duzenleyen_adi || '', M + 30, signY + 4, { align: 'center' })
          pdf.text(ayarlar?.mudur_adi || '', PW - M - 30, signY + 4, { align: 'center' })
          pdf.setDrawColor(80, 80, 80)
          pdf.setLineWidth(0.3)
          pdf.line(M, signY + 8, M + 60, signY + 8)
          pdf.line(PW - M - 60, signY + 8, PW - M, signY + 8)
        }
      }

      const blob = pdf.output('blob')
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
      setMsg('✅ PDF hazırlandı.')
    } catch (err: any) {
      console.error(err)
      setMsg('❌ PDF hatası: ' + (err.message || 'Bilinmeyen'))
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
    
    const optimisticItem: any = {
      id: Math.random(), // Geçici ID
      gun: pk.day, ay: pk.month, yil: pk.year,
      ders_no: pk.dersNo, kulup_adi: kulupAdi,
      ogretmen_id: teacherId,
      ogretmen: secilenOgretmen
    }

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

      if (secilenOgretmen?.koordinator_id) {
        const koordDersNo = (payload.ders_no || 1) + 10
        const { data: existingKoord } = await supabase.from('sinif_defteri').select('id').match({ gun: pk.day, ay: pk.month, yil: pk.year, kulup_adi: kulupAdi, ders_no: koordDersNo, okul_id: currentOkulId }).maybeSingle()
        if (existingKoord) await supabase.from('sinif_defteri').update({ ogretmen_id: secilenOgretmen.koordinator_id, durum: 'geldi' }).eq('id', existingKoord.id)
        else await supabase.from('sinif_defteri').insert({ ...payload, ogretmen_id: secilenOgretmen.koordinator_id, ders_no: koordDersNo, durum: 'geldi' })
      }
    } catch (err: any) {
      setProgram(oldProgram) // Hata olursa eski haline döndür
      setMsg('❌ Kayıt hatası: ' + err.message)
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

    try {
      await Promise.all([
        supabase.from('ders_programi').delete().eq('id', id),
        supabase.from('sinif_defteri').delete().match({
          gun: silinecek.gun,
          ay: silinecek.ay,
          yil: silinecek.yil,
          kulup_adi: silinecek.kulup_adi,
          ders_no: silinecek.ders_no || 1,
        }),
      ])
    } catch (err: any) {
      // Hata olursa eski haline döndür
      setProgram(oldProgram)
      setMsg('❌ Silme hatası: ' + (err.message || 'Bilinmiyor'))
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
      const dpInserts: any[] = []
      const defterInserts: any[] = []

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

      setMsg(`✅ Kopyalama tamamlandı: ${dpInserts.length} ders işlendi, boş slot'lar temizlendi.`)
      load()
    } catch (err: any) {
      setMsg('❌ Kopyalama hatası: ' + err.message)
      console.error(err)
    } finally {
      setTimeout(() => setMsg(''), 4000)
    }
  }

  const gorunenSiniflar = seciliSinif ? siniflar.filter(s => s.id === seciliSinif) : siniflar
  const DERS_SAATLERI = [1, 2, 3, 4, 5, 6]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Topbar
        title="Ders Programı"
        sub={`${ayLabel(ay, yil)} — Ders Programı Yönetimi`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm" onClick={handlePdfDownload} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px' }}>
              <Download size={14} /> PDF
            </button>
          </div>
        }
      />

      <div style={{ padding: '16px 28px' }}>
        {msg && (() => {
          const isSuccess = msg.startsWith('✅')
          const isWarn = msg.startsWith('⚠️')
          const isLoading = msg.startsWith('⌛') || msg.startsWith('🔄')
          const palette = isSuccess
            ? { bg: '#f0fdf4', border: '#86efac', fg: '#166534' }
            : isWarn
            ? { bg: '#fffbeb', border: '#fcd34d', fg: '#92400e' }
            : isLoading
            ? { bg: '#eff6ff', border: '#93c5fd', fg: '#1e40af' }
            : { bg: '#fff1f2', border: '#fca5a5', fg: '#991b1b' }
          return (
            <div style={{
              marginBottom: 16,
              padding: '10px 14px',
              borderRadius: 10,
              background: palette.bg,
              border: `1px solid ${palette.border}`,
              color: palette.fg,
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}>
              <span>{msg}</span>
              <button
                onClick={() => setMsg('')}
                style={{
                  background: 'transparent', border: 'none',
                  color: palette.fg, cursor: 'pointer',
                  fontSize: 18, lineHeight: 1, padding: 0,
                  opacity: 0.6,
                }}
                aria-label="Kapat"
              >×</button>
            </div>
          )
        })()}

        <div className="card no-print" style={{ padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 10 }}>Sınıf Seçimi</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setSeciliSinif(null)} className={`btn ${seciliSinif === null ? 'btn-primary' : 'btn-secondary'}`} style={{ borderRadius: 20, fontSize: 12 }}>Tüm Sınıflar</button>
            {siniflar.map(s => (
              <button key={s.id} onClick={() => setSeciliSinif(s.id)} className={`btn ${seciliSinif === s.id ? 'btn-primary' : 'btn-secondary'}`} style={{ borderRadius: 20, fontSize: 12 }}>{s.ad}</button>
            ))}
          </div>
        </div>

        {siniflar.length > 0 && (
          <div className="no-print" style={{
            padding: '14px 20px',
            marginBottom: 20,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
            border: '1px solid #6ee7b7',
            boxShadow: '0 2px 6px rgba(5,150,105,0.08)',
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10,
              background: '#059669', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <CalendarDays size={22} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#065f46', marginBottom: 2 }}>
                İlk Haftayı Tüm Aya Uygula
              </div>
              <div style={{ fontSize: 12, color: '#047857', lineHeight: 1.5 }}>
                İlk hafta için yaptığınız atamalar aydaki tüm haftalara otomatik kopyalanır. Tatil ve hafta sonu günleri atlanır, boş bıraktığınız slotlar diğer haftalarda da boş kalır.
              </div>
            </div>
            <button
              onClick={ilkHaftayiKopyala}
              style={{
                background: '#059669', color: '#fff',
                borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: 'none', padding: '10px 18px',
                display: 'flex', alignItems: 'center', gap: 6,
                whiteSpace: 'nowrap', cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(5,150,105,0.3)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#047857' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#059669' }}
            >
              <Zap size={14} /> Aya Uygula
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px' }}>
            <div style={{
              width: 44, height: 44,
              border: '4px solid #e5e7eb',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              animation: 'spin 0.9s linear infinite',
              marginBottom: 16,
            }} />
            <div style={{ fontSize: 13, color: '#666', fontWeight: 600 }}>Ders programı yükleniyor...</div>
          </div>
        ) : siniflar.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center', background: '#fff', borderRadius: 16, border: '2px dashed #eee' }}>
            <Calendar size={48} color="var(--accent)" style={{ marginBottom: 20 }} />
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>Ders Programı Hazır Değil</h2>
            <p style={{ color: '#666', maxWidth: 400, marginBottom: 24 }}>Henüz aktif bir sınıf tanımlanmamış. Dersatama yapabilmek için önce sınıflarınızı oluşturun.</p>
            <a href="/siniflar" className="btn btn-primary" style={{ textDecoration: 'none' }}>Sınıf Ayarlarına Git</a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {gorunenSiniflar.map(sinif => (
              <div key={sinif.id} className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: '5px solid var(--accent)' }}>
                <div style={{ padding: '12px 20px', background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>{sinif.ad} Programı</h3>
                </div>
                <div style={{ overflowX: 'auto', maxHeight: '70vh', overflowY: 'auto' }}>
                  <table style={{ width: '100%', minWidth: 1200, borderCollapse: 'separate', borderSpacing: 0, fontSize: 11 }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 6 }}>
                          <tr>
                            <th style={{ ...thStyle(110), background: 'var(--accent)', position: 'sticky', left: 0, zIndex: 7, boxShadow: '2px 0 4px rgba(0,0,0,0.08)' }}>Ders Saati</th>
                            {visibleDays.map(vd => {
                              const t = tatilMi(vd.month, vd.day, vd.year, tatiller)
                              const hs = isHaftaSonu(vd.day, vd.month, vd.year)
                              const dow = new Date(vd.year, vd.month - 1, vd.day).getDay()
                              const kisaGun = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][dow]
                              const bugun = new Date()
                              const isBugun = vd.day === bugun.getDate() && vd.month === (bugun.getMonth() + 1) && vd.year === bugun.getFullYear()
                              return (
                                <th key={vd.day} style={{
                                  ...thStyle(110),
                                  background: isBugun ? '#f59e0b' : (t || hs) ? '#999' : 'var(--accent)',
                                  lineHeight: 1.25,
                                  boxShadow: isBugun ? 'inset 0 -3px 0 #fbbf24' : undefined,
                                }}>
                                  <div style={{ fontSize: 11, fontWeight: 800 }}>{vd.day}</div>
                                  <div style={{ fontSize: 9, opacity: 0.9, fontWeight: 600, marginTop: 1 }}>{kisaGun}</div>
                                  <div style={{ fontSize: 8, opacity: 0.7, marginTop: 1 }}>{isBugun ? 'Bugün' : AYLAR[vd.month].substring(0,3)}</div>
                                </th>
                              )
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {DERS_SAATLERI.map(dersNo => (
                            <tr key={dersNo} style={{ borderBottom: '1px solid #eee' }}>
                              <td style={{ ...tdStyleObj, fontWeight: 700, background: '#f8f9fa', position: 'sticky', left: 0, zIndex: 4, boxShadow: '2px 0 4px rgba(0,0,0,0.05)', borderRight: '1px solid #e5e7eb' }}>{dersNo}. DERS</td>
                              {visibleDays.map(vd => {
                                const ders = dersGetir(sinif.ad, dersNo, vd.day, vd.month, vd.year)
                                const t = tatilMi(vd.month, vd.day, vd.year, tatiller)
                                const hs = isHaftaSonu(vd.day, vd.month, vd.year)
                                const bugun = new Date()
                                const isBugun = vd.day === bugun.getDate() && vd.month === (bugun.getMonth() + 1) && vd.year === bugun.getFullYear()
                                const bgColor = (t || hs) ? '#f0f0f0' : isBugun ? '#fffbeb' : '#fff'
                                return (
                                  <td key={vd.day} style={{ ...tdStyleObj, background: bgColor, color: hs ? '#999' : 'inherit', borderRight: '1px solid #eee' }}>
                                    {hs ? <span style={{fontSize: 10, color: '#6b7280', fontWeight: 600, letterSpacing: 0.3}}>HAFTA<br/>SONU</span> : t ? <span style={{fontSize: 10, color: '#b91c1c', fontWeight: 700, letterSpacing: 0.3}}>RESMİ<br/>TATİL</span> : ders ? (
                                      <div className="cell-content" onClick={(e) => openPicker(e, vd.day, vd.month, vd.year, sinif.id, dersNo, '')}>
                                        <button className="fast-del" onClick={(e) => fastSil(e, ders.id)}>×</button>
                                        <div className="ogretmen-ad">{(ders.ogretmen as any)?.ad?.toUpperCase()}</div>
                                      </div>
                                    ) : (
                                      <button onClick={(e) => openPicker(e, vd.day, vd.month, vd.year, sinif.id, dersNo, '')} className="btn-ata">+</button>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {picker && (() => {
        const aramaLower = pickerArama.toLocaleLowerCase('tr')
        const filtrelenmis = dersVerebilenPersonel.filter(p =>
          !pickerArama || (p.ad || '').toLocaleLowerCase('tr').includes(aramaLower) || (p.gorev || '').toLocaleLowerCase('tr').includes(aramaLower)
        )
        const mevcutId = pickerOgretmen ? Number(pickerOgretmen) : null
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.1)' }} onClick={closePicker}>
            <div style={{ position: 'absolute', top: picker.rect.bottom + 5, left: Math.min(picker.rect.left, typeof window !== 'undefined' ? window.innerWidth - 260 : 0), background: '#fff', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.2)', padding: '10px', minWidth: 240, border: '1px solid #eee', animation: 'pop 0.2s ease-out' }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 10, fontWeight: 800, marginBottom: 8, padding: '0 4px', color: '#666' }}>ÖĞRETMEN SEÇİN</div>
              <input
                type="text"
                autoFocus
                value={pickerArama}
                onChange={e => setPickerArama(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') closePicker() }}
                placeholder="Öğretmen ara..."
                style={{
                  width: '100%', padding: '8px 10px', fontSize: 12,
                  border: '1px solid #e5e7eb', borderRadius: 8,
                  marginBottom: 8, outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb' }}
              />
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {dersVerebilenPersonel.length === 0 ? (
                  <div style={{ padding: 14, fontSize: 12, color: '#999', textAlign: 'center' }}>
                    Ders verebilecek personel bulunamadı.
                  </div>
                ) : filtrelenmis.length === 0 ? (
                  <div style={{ padding: 14, fontSize: 12, color: '#999', textAlign: 'center' }}>
                    Eşleşen öğretmen yok.
                  </div>
                ) : filtrelenmis.map(p => {
                  const seciliMi = mevcutId === p.id
                  return (
                    <div
                      key={p.id}
                      onClick={() => directKaydet(p.id, picker)}
                      className="picker-item"
                      style={seciliMi ? { background: '#dcfce7', color: '#166534', fontWeight: 700 } : undefined}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {seciliMi && <span style={{ color: '#16a34a', fontSize: 12 }}>✓</span>}
                        {p.ad}
                        <span style={{ fontSize: 10, opacity: 0.6, fontWeight: 400 }}>- {p.gorev}</span>
                      </span>
                    </div>
                  )
                })}
              </div>
              {mevcutId !== null && (
                <button
                  onClick={async () => {
                    const sinif = siniflar.find(s => s.id === picker.sinifId)
                    const existing = program.find(p => p.gun === picker.day && p.ay === picker.month && p.yil === picker.year && p.kulup_adi === sinif?.ad && (p.ders_no || 1) === picker.dersNo)
                    if (existing) {
                      closePicker()
                      finishSil(existing.id)
                    }
                  }}
                  style={{
                    marginTop: 8, width: '100%', padding: '8px',
                    background: '#fee2e2', color: '#dc2626',
                    border: '1px solid #fecaca', borderRadius: 8,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  × Atamayı Kaldır
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
        .program-cell { transition: all 0.2s; min-width: 110px; }
        .cell-content { position: relative; width: 100%; min-height: 44px; display: flex; align-items: center; justify-content: center; padding: 6px 8px; cursor: pointer; border-radius: 8px; background: #f8f9fa; border: 1.5px solid #dee2e6; box-shadow: 0 1px 3px rgba(0,0,0,0.06); transition: all 0.15s; }
        .cell-content:hover { background: #f1f3f5; border-color: #adb5bd; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
        .ogretmen-kart { display: flex; flex-direction: column; align-items: center; gap: 1px; }
        .ogretmen-ad { font-weight: 700; font-size: 11px; line-height: 1.25; color: #343a40; text-align: center; word-break: break-word; }
        .ogretmen-gorev { font-size: 9px; color: #868e96; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
        
        .fast-del { position: absolute; top: -4px; right: -4px; width: 20px; height: 20px; border: none; background: #fee2e2; color: #ef4444; border-radius: 50%; font-size: 12px; line-height: 1; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.15); opacity: 0.55; }
        .cell-content:hover .fast-del { opacity: 1; }
        .fast-del:hover { background: #ef4444; color: #fff; transform: scale(1.15); opacity: 1; }
        @media (hover: none) { .fast-del { opacity: 1; } }

        .btn-ata { width: 26px; height: 26px; border-radius: 50%; border: 1px dashed #ccc; background: none; cursor: pointer; color: #999; font-size: 14px; transition: all 0.2s; }
        .btn-ata:hover { border-style: solid; background: var(--accent); color: #fff; transform: scale(1.1); }

        .picker-item { padding: 10px 12px; cursor: pointer; border-radius: 8px; font-size: 13px; transition: all 0.1s; }
        .picker-item:hover { background: #f0fdf4; color: #166534; }

        @keyframes pop {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .btn { padding: 6px 12px; border: 1px solid #ddd; background: #fff; cursor: pointer; transition: all 0.2s; }
        .btn-primary { background: var(--accent); color: #fff; border: none; }
        .btn-secondary { color: #666; }
        .card { background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
      `}</style>
    </div>
  )
}

function thStyle(width: number): React.CSSProperties { return { padding: '10px 4px', color: '#fff', fontSize: 10, textAlign: 'center', width, minWidth: width } }
function tdStyle(): React.CSSProperties { return { padding: '8px 4px', textAlign: 'center', fontSize: 10 } }
const tdStyleObj = tdStyle();
