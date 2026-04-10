'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import Topbar from '@/components/Topbar'
import { useAy } from '@/lib/AyContext'
import { supabase } from '@/lib/supabase'
import { DersProgrami, Personel, Tatil, Sinif } from '@/lib/types'
import { GUNLER, AYLAR, gunSayisi, tatilMi, ayLabel } from '@/lib/hesaplama'
import React from 'react'

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
  const [seciliSinif, setSeciliSinif] = useState<number | null>(null)
  const [msg, setMsg] = useState('')
  const [gorunum, setGorunum] = useState<'aylik' | 'haftalik'>('aylik')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

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
  const [pickerSaving, setPickerSaving] = useState(false)

  // --- TAKVİM HESAPLAMA (4 BLOK MODELİ: 7-7-7-KALAN) ---
  const visibleDays = useMemo(() => {
    const dates: VisibleDay[] = []
    const count = gunSayisi(yil, ay)
    
    for (let d = 1; d <= count; d++) {
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
    // İlk 3 hafta: her biri 7 gün
    weeks.push(visibleDays.slice(0, 7))
    weeks.push(visibleDays.slice(7, 14))
    weeks.push(visibleDays.slice(14, 21))
    // 4. hafta: 22'sinden ay sonuna kadar (7, 8, 9 veya 10 gün olabilir)
    weeks.push(visibleDays.slice(21))
    return weeks
  }, [visibleDays])

  const load = useCallback(async () => {
    // Komşu ayları hesapla (Önceki ve Sonraki)
    const prevDate = new Date(yil, ay - 2, 1)
    const nextDate = new Date(yil, ay, 1)
    const pAy = prevDate.getMonth() + 1
    const pYil = prevDate.getFullYear()
    const nAy = nextDate.getMonth() + 1
    const nYil = nextDate.getFullYear()

    try {
      const [{ data: pr, error: prErr }, { data: per }, { data: tat }, { data: sin }] = await Promise.all([
        supabase.from('ders_programi')
          .select('*, ogretmen:personel(id,ad,gorev)')
          .or(`and(ay.eq.${ay},yil.eq.${yil}),ay.is.null,and(ay.eq.${pAy},yil.eq.${pYil}),and(ay.eq.${nAy},yil.eq.${nYil})`)
          .order('gun'),
        supabase.from('personel').select('*').order('ad'),
        supabase.from('tatiller').select('*'),
        supabase.from('siniflar').select('*').eq('aktif', true).order('ad'),
      ])
      if (prErr) setMsg('❌ Veri yükleme hatası: ' + prErr.message)
      setProgram(pr || [])
      setPersonel(per || [])
      setTatiller(tat || [])
      setSiniflar(sin || [])
    } catch (e: any) {
      setMsg('❌ Beklenmeyen hata: ' + (e.message || 'Bilinmiyor'))
    }
  }, [ay, yil])

  useEffect(() => { load() }, [load])

  function openPicker(e: React.MouseEvent, day: number, month: number, year: number, sinifId: number, dersNo: number, gunAdi: string) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const sinif = siniflar.find(s => s.id === sinifId)
    const existing = program.find(p => p.gun === day && p.ay === month && p.yil === year && p.kulup_adi === sinif?.ad && (p.ders_no || 1) === dersNo)
    setPickerOgretmen(existing?.ogretmen_id?.toString() || '')
    setPicker({ day, month, year, sinifId, dersNo, gunAdi, rect })
  }

  async function pickerKaydet() {
    if (!picker) return
    const oldProgram = [...program]
    setPickerSaving(true)
    
    try {
      const sinif = siniflar.find(s => s.id === picker.sinifId)
      const secilenOgretmen = personel.find(p => p.id === parseInt(pickerOgretmen))
      
      const payload = {
        gun: picker.day, ders_no: picker.dersNo,
        ogretmen_id: pickerOgretmen ? parseInt(pickerOgretmen) : null,
        kulup_adi: sinif?.ad || '-',
        seans: 'sabah', etkinlik_saati: 1,
        ay: picker.month, yil: picker.year
      }

      // OPTIMISTIC UPDATE
      setProgram(prev => {
        const filtered = prev.filter(p => !(p.gun === picker.day && p.ay === picker.month && p.yil === picker.year && p.kulup_adi === sinif?.ad && (p.ders_no || 1) === picker.dersNo))
        if (!payload.ogretmen_id) return filtered
        const optimisticItem: any = { ...payload, id: Math.random(), ogretmen: secilenOgretmen }
        return [...filtered, optimisticItem]
      })
      setPicker(null)

      // BACKEND
      const existing = program.find(p => p.gun === picker.day && p.ay === picker.month && p.yil === picker.year && p.kulup_adi === sinif?.ad && (p.ders_no || 1) === picker.dersNo)
      
      let error
      if (existing) {
        const { error: err } = await supabase.from('ders_programi').update({ ogretmen_id: payload.ogretmen_id }).eq('id', existing.id)
        error = err
      } else {
        const { error: err } = await supabase.from('ders_programi').insert(payload)
        error = err
      }
      
      if (error) throw error

      if (payload.ogretmen_id) {
        await supabase.from('sinif_defteri').upsert({ ...payload, durum: 'geldi' }, { onConflict: 'gun,ay,yil,kulup_adi,ders_no,seans' })
      } else if (existing) {
        await supabase.from('sinif_defteri').delete().match({ gun: payload.gun, ay: payload.ay, yil: payload.yil, kulup_adi: payload.kulup_adi, ders_no: payload.ders_no })
      }
      
      load()
    } catch (err: any) {
      setProgram(oldProgram)
      setMsg('❌ Kayıt hatası: ' + err.message)
    } finally {
      setPickerSaving(false)
    }
  }

  async function ilkHaftayiKopyala() {
    if (!confirm('1. haftadaki program (1-7. günler) ayın geri kalanındaki tüm haftalara kopyalanacak. Mevcut kayıtların üzerine yazılacak. Emin misiniz?')) return
    
    setPickerSaving(true)
    setMsg('⌛ Haftalık program ayın geri kalanına kopyalanıyor...')
    
    try {
      // 1. Haftadaki (1-7. günler) kayıtları al
      const ilkHaftaKayitlari = program.filter(p => p.gun >= 1 && p.gun <= 7 && p.ay === ay && p.yil === yil)
      
      if (ilkHaftaKayitlari.length === 0) {
        setMsg('⚠️ 1. haftada kopyalanacak ders bulunamadı. Lütfen önce 1. haftayı doldurun.')
        setPickerSaving(false)
        return
      }

      // --- ADIM 1: MEVCUT KAYITLARI TEMİZLE (8-31 arası) ---
      // Ders Programı temizliği
      const { error: delPrErr } = await supabase.from('ders_programi').delete().gte('gun', 8).eq('ay', ay).eq('yil', yil)
      if (delPrErr) throw delPrErr
      
      // Sınıf Defteri temizliği
      const { error: delSdErr } = await supabase.from('sinif_defteri').delete().gte('gun', 8).eq('ay', ay).eq('yil', yil)
      if (delSdErr) throw delSdErr

      // --- ADIM 2: YENİ KAYITLARI HAZIRLA ---
      const payload: any[] = []
      const ayinGunleri = gunSayisi(yil, ay)

      // 8. günden ay sonuna kadar döngü
      for (let d = 8; d <= ayinGunleri; d++) {
        // TATİL KONTROLÜ: Eğer o gün tatilse kopyalama yapma
        if (tatilMi(ay, d, yil, tatiller)) continue

        // Bu günün hangi haftalık güne (1-7) denk geldiğini bul
        const kaynakGun = ((d - 1) % 7) + 1
        const kaynakKayitlar = ilkHaftaKayitlari.filter(p => p.gun === kaynakGun)
        
        kaynakKayitlar.forEach(k => {
          payload.push({
            gun: d,
            ders_no: k.ders_no || 1,
            ogretmen_id: k.ogretmen_id,
            kulup_adi: k.kulup_adi,
            seans: k.seans || 'sabah',
            etkinlik_saati: k.etkinlik_saati || 1,
            ay,
            yil
          })
        })
      }

      if (payload.length > 0) {
        // Ders Programı Insert
        const { error: insPrErr } = await supabase.from('ders_programi').insert(payload)
        if (insPrErr) throw insPrErr
        
        // Sınıf Defteri Insert (Puantaj için 'geldi' durumuyla)
        const sdPayload = payload.map(p => ({ ...p, durum: 'geldi' }))
        const { error: insSdErr } = await supabase.from('sinif_defteri').insert(sdPayload)
        if (insSdErr) throw insSdErr
        
        setMsg('✅ 1. hafta tüm aya başarıyla kopyalandı ve sınıf defteri güncellendi.')
        load()
      } else {
        setMsg('ℹ️ Kopyalanacak veri oluşmadı.')
      }
    } catch (err: any) {
      setMsg('❌ Kopyalama hatası: ' + err.message)
    } finally {
      setPickerSaving(false)
    }
  }

  async function directKaydet(teacherId: number, pk: { day: number; month: number; year: number; sinifId: number; dersNo: number }) {
    if (tatilMi(pk.month, pk.day, pk.year, tatiller)) {
      if (!confirm('Seçilen tarih TATİL olarak işaretlenmiş. Yine de ders ataması yapmak istiyor musunuz?')) return
    }
    const oldProgram = [...program]
    try {
      const sinif = siniflar.find(s => s.id === pk.sinifId)
      const secilenOgretmen = personel.find(p => p.id === teacherId)
      
      // OPTIMISTIC UPDATE: Hemen state'i güncelle
      const optimisticItem: any = {
        id: Math.random(), 
        gun: pk.day, ay: pk.month, yil: pk.year,
        ders_no: pk.dersNo,
        kulup_adi: sinif?.ad || '-',
        ogretmen_id: teacherId,
        ogretmen: secilenOgretmen 
      }

      setProgram(prev => {
        const filtered = prev.filter(p => !(p.gun === pk.day && p.ay === pk.month && p.yil === pk.year && p.kulup_adi === sinif?.ad && (p.ders_no || 1) === pk.dersNo))
        return [...filtered, optimisticItem]
      })
      setPicker(null) // Listeyi hemen kapat

      // BACKEND UPDATE
      const existing = program.find(p => 
        p.gun === pk.day && p.ay === pk.month && p.yil === pk.year && 
        p.kulup_adi === sinif?.ad && (p.ders_no || 1) === pk.dersNo
      )
      
      const payload = {
        gun: pk.day, ders_no: pk.dersNo,
        ogretmen_id: teacherId, kulup_adi: sinif?.ad || '-',
        seans: 'sabah', etkinlik_saati: 1,
        ay: pk.month, yil: pk.year
      }
      
      let error
      if (existing) {
        const { error: err } = await supabase.from('ders_programi').update({ ogretmen_id: teacherId }).eq('id', existing.id)
        error = err
      } else {
        const { error: err } = await supabase.from('ders_programi').insert(payload)
        error = err
      }
      if (error) throw error

      await supabase.from('sinif_defteri').upsert({ ...payload, durum: 'geldi' }, { onConflict: 'gun,ay,yil,kulup_adi,ders_no,seans' })
      load() 
    } catch (err: any) {
      setProgram(oldProgram) 
      setMsg('❌ Kayıt hatası: ' + err.message)
      setTimeout(() => setMsg(''), 3000)
    }
  }

  async function fastSil(e: React.MouseEvent, id: number) {
    e.stopPropagation()
    setDeleteConfirm(id)
  }

  async function pickerSil() {
    if (!picker) return
    const oldProgram = [...program]
    const sinif = siniflar.find(s => s.id === picker.sinifId)
    const existing = program.find(p => p.gun === picker.day && p.ay === picker.month && p.yil === picker.year && p.kulup_adi === sinif?.ad && (p.ders_no || 1) === picker.dersNo)
    
    if (existing) {
      // OPTIMISTIC UPDATE
      setProgram(prev => prev.filter(p => p.id !== existing.id))
      setPicker(null)

      try {
        await supabase.from('ders_programi').delete().eq('id', existing.id)
        await supabase.from('sinif_defteri').delete().match({ gun: existing.gun, ay: existing.ay, yil: existing.yil, kulup_adi: existing.kulup_adi, ders_no: existing.ders_no || 1, seans: existing.seans || 'sabah' })
        load()
      } catch (err: any) {
        setProgram(oldProgram)
        setMsg('❌ Silme hatası: ' + err.message)
      }
    } else {
      setPicker(null)
    }
  }

  function dersGetir(sinifAd: string, dersNo: number, d: number, m: number, y: number): DersProgrami | null {
    const dt = new Date(y, m - 1, d)
    const hg = dt.getDay()
    if (hg === 0 || hg === 6) return null // Hafta sonu ise ders yok
    if (tatilMi(m, d, y, tatiller)) return null
    return program.find(p =>
      p.kulup_adi === sinifAd &&
      (p.ders_no || 1) === dersNo &&
      p.gun === d && 
      (
        (p.ay === m && p.yil === y) || 
        (p.ay === null && m === ay && y === yil)
      )
    ) || null
  }

  async function sil(id: number) {
    setDeleteConfirm(id)
  }

  async function finishSil() {
    if (!deleteConfirm) return
    const oldProgram = [...program]
    const id = deleteConfirm
    const silinecek = program.find(p => p.id === id)

    // OPTIMISTIC UPDATE
    setProgram(prev => prev.filter(p => p.id !== id))
    setDeleteConfirm(null)

    try {
      const { error } = await supabase.from('ders_programi').delete().eq('id', id)
      if (error) throw error

      if (silinecek) {
        await supabase.from('sinif_defteri').delete().match({ 
          gun: silinecek.gun, 
          ay: silinecek.ay, 
          yil: silinecek.yil, 
          kulup_adi: silinecek.kulup_adi, 
          ders_no: silinecek.ders_no || 1, 
          seans: silinecek.seans || 'sabah' 
        })
      }
      load()
    } catch (err: any) {
      setProgram(oldProgram)
      setMsg('❌ Silme hatası: ' + err.message)
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
            <button className="btn no-print" disabled={pickerSaving} style={{ background: '#059669', color: '#fff', border: 'none', fontWeight: 600, padding: '6px 12px', fontSize: 13, borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }} onClick={ilkHaftayiKopyala}>
              {pickerSaving ? '⌛ İşleniyor...' : '🎯 1. Haftayı Tüm Aya Uygula'}
            </button>
            <div style={{ display: 'flex', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
              {(['aylik', 'haftalik'] as const).map(g => (
                <button
                  key={g} className="btn btn-sm no-print"
                  style={{
                    borderRadius: 0, border: 'none',
                    background: gorunum === g ? 'var(--accent)' : 'transparent',
                    color: gorunum === g ? '#fff' : 'var(--text2)',
                    padding: '6px 12px'
                  }}
                  onClick={() => setGorunum(g)}
                >
                  {g === 'aylik' ? '📅 Aylık' : '📆 Haftalık'}
                </button>
              ))}
            </div>
            <button className="btn btn-secondary btn-sm no-print" onClick={() => window.print()}>🖨️ Yazdır</button>
          </div>
        }
      />

      <div style={{ padding: '16px 28px 250px 28px' }}>
        {msg && <div className="no-print" style={{ marginBottom: 16 }}><div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`}>{msg}</div></div>}

        {/* Sınıf Seçici */}
        <div className="card no-print" style={{ padding: '12px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 10, textTransform: 'uppercase' }}>Sınıf Seçimi</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setSeciliSinif(null)} style={{ padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '2px solid', borderColor: seciliSinif === null ? 'var(--accent)' : 'var(--border)', background: seciliSinif === null ? 'var(--accent)' : '#fff', color: seciliSinif === null ? '#fff' : 'var(--text2)', transition: 'all 0.2s' }}>Tüm Sınıflar</button>
            {siniflar.map(s => (
              <button key={s.id} onClick={() => setSeciliSinif(seciliSinif === s.id ? null : s.id)} style={{ padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '2px solid', borderColor: seciliSinif === s.id ? 'var(--accent)' : 'var(--border)', background: seciliSinif === s.id ? 'var(--accent)' : '#fff', color: seciliSinif === s.id ? '#fff' : 'var(--text2)', transition: 'all 0.2s' }}>{s.ad}</button>
            ))}
          </div>
        </div>

        {gorunum === 'aylik' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {gorunenSiniflar.map(sinif => (
              <div key={sinif.id} className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: '5px solid var(--accent)' }}>
                <div style={{ padding: '12px 20px', background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>{sinif.ad} <span style={{ fontWeight: 400, color: 'var(--text3)', fontSize: 12 }}>({sinif.yas_grubu}) Programı</span></h3>
                </div>

                <div className="scroll-container" style={{ width: '100%', overflowX: 'auto' }}>
                  <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 11 }}>
                    <thead>
                      <tr>
                        <th style={{ ...thStyle(120), position: 'sticky', left: 0, zIndex: 15, background: '#2d5a3d' }}>Ders Saati</th>
                        {visibleDays.map(vd => {
                          const tatil = tatilMi(vd.month, vd.day, vd.year, tatiller)
                          const dInfo = new Date(vd.year, vd.month - 1, vd.day, 12)
                          const hg = dInfo.getDay()
                          const isHaftaSonu = hg === 0 || hg === 6
                          const gunAdi = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][hg]
                          return (
                            <th key={`${vd.day}-${vd.month}`} style={{ ...thStyle(70), background: (tatil || isHaftaSonu) ? '#c8c0aa' : '#2d5a3d' }}>
                              {gunAdi}<br /><span style={{ fontSize: 13, fontWeight: 700 }}>{vd.day}</span>{!vd.isCurrentMonth && <div style={{fontSize:9, fontWeight:400}}>{AYLAR[vd.month || 1].substring(0,3)}</div>}
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {DERS_SAATLERI.map(dersNo => (
                        <tr key={dersNo}>
                          <td style={{ ...tdStyle, fontWeight: 700, background: '#f5f2ec', position: 'sticky', left: 0, zIndex: 10 }}>{dersNo}. DERS</td>
                          {visibleDays.map(vd => {
                            const ders = dersGetir(sinif.ad, dersNo, vd.day, vd.month, vd.year)
                            const tatil = tatilMi(vd.month, vd.day, vd.year, tatiller)
                            const dt = new Date(vd.year, vd.month-1, vd.day)
                            const hg = dt.getDay()
                            const isHaftaSonu = hg === 0 || hg === 6
                            const ogr = ders ? ders.ogretmen as unknown as Personel | null : null
                            const parts = (ogr?.ad || '').trim().split(' ')
                            const soyad = parts.length > 1 ? parts[parts.length - 1] : ''
                            const ad = parts.length > 1 ? parts.slice(0, -1).join(' ') : (ogr?.ad || '')
                            const gunAdi = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][hg]

                            return (
                              <td key={`${vd.day}-${vd.month}`} className="program-cell" style={{ ...tdStyle, background: (tatil || isHaftaSonu) ? '#e0dbd0' : ders ? '#f0fff4' : '#fff' }}>
                                {(!tatil && !isHaftaSonu) ? (
                                  ders ? (
                                    <div className="cell-content" onClick={(e) => openPicker(e, vd.day, vd.month, vd.year, sinif.id, dersNo, gunAdi)}>
                                      <button className="fast-del" onClick={(e) => fastSil(e, ders.id)}>×</button>
                                      <div style={{ fontWeight: 700, fontSize: 11, color: '#2d5a3d' }}>{ad}</div>
                                      <div style={{ fontSize: 10, color: '#5a5748' }}>{soyad}</div>
                                    </div>
                                  ) : (
                                    <button onClick={(e) => openPicker(e, vd.day, vd.month, vd.year, sinif.id, dersNo, gunAdi)} className="btn-ata">+</button>
                                  )
                                ) : <div style={{ fontSize: 8, color: '#999', fontWeight: 600 }}>{isHaftaSonu ? 'H.SONU' : 'TATİL'}</div>}
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

        {gorunum === 'haftalik' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            {gorunenSiniflar.map(sinif => (
              <div key={sinif.id} className="card" style={{ padding: 0, overflow: 'hidden', borderLeft: '5px solid #1a3a2a' }}>
                <div style={{ padding: '12px 20px', background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>🏫 {sinif.ad} <span style={{ fontWeight: 400, color: 'var(--text3)', fontSize: 12 }}>Haftalık Program</span></h3>
                </div>

                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 32 }}>
                  {visibleWeeks.map((week, wIndex) => (
                    <div key={wIndex} className="week-block">
                      <div className="week-header" style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 6, fontWeight: 700, fontSize: 12, color: 'var(--text2)', borderLeft: '4px solid var(--accent)', display: 'inline-block' }}>
                        📅 {wIndex + 1}. Hafta ({week[0].day} {AYLAR[week[0].month || 1]} - {week[week.length - 1].day} {AYLAR[week[week.length - 1].month || 1]})
                      </div>

                      <div className="scroll-container" style={{ width: '100%', overflowX: 'auto' }}>
                        <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 11 }}>
                          <thead>
                            <tr>
                              <th style={{ ...thStyle(100), background: '#2d5a3d' }}>Saat</th>
                              {week.map(vd => {
                                const tatil = tatilMi(vd.month, vd.day, vd.year, tatiller)
                                const hg = new Date(vd.year, vd.month - 1, vd.day).getDay()
                                const isHaftaSonu = hg === 0 || hg === 6
                                const gunAdi = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][hg]
                                return (
                                  <th key={`${vd.day}-${vd.month}`} style={{ ...thStyle(80), background: (tatil || isHaftaSonu) ? '#c8c0aa' : '#2d5a3d' }}>
                                    {gunAdi}<br /><span style={{ fontSize: 13, fontWeight: 700 }}>{vd.day}</span>
                                  </th>
                                )
                              })}
                            </tr>
                          </thead>
                          <tbody>
                            {DERS_SAATLERI.map(dersNo => (
                              <tr key={dersNo}>
                                <td style={{ ...tdStyle, fontWeight: 700, background: '#f5f2ec' }}>{dersNo}. DERS</td>
                                {week.map(vd => {
                                  const ders = dersGetir(sinif.ad, dersNo, vd.day, vd.month, vd.year)
                                  const tatil = tatilMi(vd.month, vd.day, vd.year, tatiller)
                                  const hg = new Date(vd.year, vd.month - 1, vd.day).getDay()
                                  const isHaftaSonu = hg === 0 || hg === 6
                                  const ogr = ders ? ders.ogretmen as unknown as Personel | null : null
                                  const parts = (ogr?.ad || '').trim().split(' ')
                                  const soyad = parts.length > 1 ? parts[parts.length - 1] : ''
                                  const ad = parts.length > 1 ? parts.slice(0, -1).join(' ') : (ogr?.ad || '')
                                  const gunAdi = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][hg]

                                  return (
                                    <td key={`${vd.day}-${vd.month}`} className="program-cell" style={{ ...tdStyle, background: (tatil || isHaftaSonu) ? '#e0dbd0' : ders ? '#f0fff4' : '#fff' }}>
                                      {(!tatil && !isHaftaSonu) ? (
                                        ders ? (
                                          <div className="cell-content" onClick={(e) => openPicker(e, vd.day, vd.month, vd.year, sinif.id, dersNo, gunAdi)}>
                                            <button className="fast-del" onClick={(e) => fastSil(e, ders.id)}>×</button>
                                            <div style={{ fontWeight: 700, fontSize: 11, color: '#2d5a3d' }}>{ad}</div>
                                            <div style={{ fontSize: 10, color: '#5a5748' }}>{soyad}</div>
                                          </div>
                                        ) : (
                                          <button onClick={(e) => openPicker(e, vd.day, vd.month, vd.year, sinif.id, dersNo, gunAdi)} className="btn-ata">+</button>
                                        )
                                      ) : <div style={{ fontSize: 8, color: '#999', fontWeight: 600 }}>{isHaftaSonu ? 'H.SONU' : 'TATİL'}</div>}
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
              </div>
            ))}
          </div>
        )}
      </div>

      {picker && (
        <div className="picker-overlay" onClick={() => setPicker(null)}>
          <div className="fast-picker" style={{ 
            top: picker.rect.bottom + 300 > window.innerHeight ? picker.rect.top - 310 : picker.rect.bottom + 5, 
            left: Math.min(picker.rect.left, window.innerWidth - 220) 
          }} onClick={e => e.stopPropagation()}>
            <div className="picker-header">{picker.day} {AYLAR[picker.month || 1]} - Öğretmen Seçin</div>
            <div className="picker-list">
              {personel
                .filter(p => {
                  const g = (p.gorev || '').toLowerCase()
                  return !g.includes('muhasebeci') && !g.includes('temizlik')
                })
                .map(p => (
                <button key={p.id} className="picker-item" onClick={() => directKaydet(p.id, picker as any)}>
                  {p.ad} <span style={{fontSize:10, opacity:0.6}}>- {p.gorev}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="picker-overlay" style={{ background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }} onClick={() => setDeleteConfirm(null)}>
          <div className="fast-picker" style={{ position: 'relative', top: 0, left: 0, width: 320, padding: 24, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text)' }}>Emin misiniz?</h3>
            <p style={{ margin: '0 0 24px 0', color: 'var(--text3)', fontSize: 13, lineHeight: 1.5 }}>
              Bu ders atamasını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" style={{ flex: 1, padding: '10px' }} onClick={() => setDeleteConfirm(null)}>Vazgeç</button>
              <button className="btn btn-danger" style={{ flex: 1, padding: '10px', background: '#d00000' }} onClick={finishSil}>Evet, Sil</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .scroll-container { scrollbar-width: thin; scrollbar-color: var(--accent) transparent; overflow-x: auto; }
        .scroll-container::-webkit-scrollbar { height: 8px; }
        .scroll-container::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 4px; }
        
        .btn-ata { width: 28px; height: 28px; border-radius: 50%; border: 1px dashed #ccc; background: none; cursor: pointer; color: #999; font-size: 16px; transition: all 0.2s; }
        .btn-ata:hover { background: var(--accent); color: #fff; border-style: solid; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        
        .cell-content { cursor: pointer; position: relative; width: 100%; height: 100%; min-height: 44px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4px; }
        .fast-del { position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; background: #fff; color: #e53e3e; border: 1px solid #fed7d7; border-radius: 50%; font-size: 12px; display: none; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); z-index: 10; }
        .program-cell:hover .fast-del { display: flex; }
        .fast-del:hover { background: #e53e3e; color: #fff; }
        
        .picker-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.05); }
        .fast-picker { position: absolute; background: #fff; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); border: 1px solid #eee; width: 220px; z-index: 1001; overflow: hidden; animation: popIn 0.2s ease-out; }
        .picker-header { padding: 10px 14px; background: #f9f9f9; font-size: 11px; font-weight: 800; border-bottom: 1px solid #eee; color: #666; text-transform: uppercase; }
        .picker-list { max-height: 250px; overflow-y: auto; padding: 6px; }
        .picker-item { width: 100%; text-align: left; padding: 10px 14px; background: none; border: none; font-size: 13px; cursor: pointer; border-radius: 8px; transition: all 0.1s; display: flex; flex-direction: column; }
        .picker-item:hover { background: #f0fdf4; color: #166534; }
        
        @keyframes popIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function thStyle(width: number): React.CSSProperties {
  return { padding: '12px 6px', color: '#fff', fontWeight: 700, fontSize: 10, border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', width, minWidth: width, boxSizing: 'border-box', verticalAlign: 'middle' }
}
const tdStyle: React.CSSProperties = { padding: '4px', border: '1px solid #eee', verticalAlign: 'middle', fontSize: 10, textAlign: 'center', position: 'relative' }
