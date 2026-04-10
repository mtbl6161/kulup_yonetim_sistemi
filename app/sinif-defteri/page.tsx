'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import Topbar from '@/components/Topbar'
import { useAy } from '@/lib/AyContext'
import { supabase } from '@/lib/supabase'
import { SinifDefteri, Personel, Tatil, Sinif } from '@/lib/types'
import { GUNLER, AYLAR, gunSayisi, tatilMi, ayLabel } from '@/lib/hesaplama'
import React from 'react'

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
  const [seciliSinif, setSeciliSinif] = useState<number | null>(null)
  const [msg, setMsg] = useState('')

  const [pickerSaving, setPickerSaving] = useState(false)
  const [picker, setPicker] = useState<{ day: number, month: number, year: number, sinifId: number, dersNo: number, rect: DOMRect, gunAdi: string } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const [gorunum, setGorunum] = useState<'aylik' | 'haftalik'>('haftalik')

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
    // İlk 3 hafta: her biri 7 gün
    weeks.push(visibleDays.slice(0, 7))
    weeks.push(visibleDays.slice(7, 14))
    weeks.push(visibleDays.slice(14, 21))
    // 4. hafta: 22'sinden ay sonuna kadar (7, 8, 9 veya 10 gün olabilir)
    weeks.push(visibleDays.slice(21))
    return weeks
  }, [visibleDays])

  const load = useCallback(async () => {
    try {
      const [{ data: sd, error: sdErr }, { data: per }, { data: tat }, { data: sin }] = await Promise.all([
        supabase.from('sinif_defteri')
          .select('*, ogretmen:personel(id,ad,gorev)')
          .eq('ay', ay)
          .eq('yil', yil)
          .order('gun'),
        supabase.from('personel').select('*').order('ad'),
        supabase.from('tatiller').select('*'),
        supabase.from('siniflar').select('*').eq('aktif', true).order('ad'),
      ])
      if (sdErr) setMsg('❌ Veri yükleme hatası: ' + sdErr.message)
      setDefter(sd || [])
      setPersonel(per || [])
      setTatiller(tat || [])
      setSiniflar(sin || [])
    } catch (e: any) {
      setMsg('❌ Beklenmeyen hata: ' + (e.message || 'Bilinmiyor'))
    }
  }, [ay, yil])

  useEffect(() => { load() }, [load])

  async function programdanAktar() {
    try {
      setPickerSaving(true)
      setMsg('⌛ Aktarım başlıyor...')
      
      const { data: pr, error: prErr } = await supabase.from('ders_programi').select('*').eq('ay', ay).eq('yil', yil)
      if (prErr) throw prErr
      if (!pr || pr.length === 0) {
        setMsg('ℹ️ Bu ay için ders programı bulunamadı.')
        return
      }

      const payload = pr
        .filter(p => !tatilMi(p.ay, p.gun, p.yil, tatiller)) // TATİL KONTROLÜ
        .map(p => ({
          gun: p.gun, ay: p.ay, yil: p.yil,
          kulup_adi: p.kulup_adi,
          ogretmen_id: p.ogretmen_id,
          ders_no: p.ders_no || 1,
          seans: p.seans || 'sabah',
          etkinlik_saati: p.etkinlik_saati || 1,
          durum: 'geldi'
        }))

      const { error: sdErr } = await supabase.from('sinif_defteri').upsert(payload, { onConflict: 'gun,ay,yil,kulup_adi,ders_no,seans' })
      if (sdErr) throw sdErr
      
      setMsg('✅ Program başarıyla aktarıldı.')
      load()
    } catch (err: any) {
      setMsg('❌ Aktarım hatası: ' + err.message)
    } finally {
      setPickerSaving(false)
      setTimeout(() => setMsg(''), 5000)
    }
  }

  async function durumDegistir(id: number, mevcutDurum: string) {
    const yeniDurum = mevcutDurum === 'geldi' ? 'gelmedi' : 'geldi'
    try {
      setPickerSaving(true)
      const { error } = await supabase.from('sinif_defteri').update({ durum: yeniDurum }).eq('id', id)
      if (error) throw error
      load()
    } catch (err: any) {
      setMsg('❌ Durum güncelleme hatası: ' + err.message)
    } finally {
      setPickerSaving(false)
    }
  }

  function openPicker(e: React.MouseEvent, d: number, m: number, y: number, sinifId: number, dersNo: number, gunAdi: string) {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPicker({ day: d, month: m, year: y, sinifId, dersNo, rect, gunAdi })
  }

  async function directKaydet(personelId: number, pInfo: { day: number, month: number, year: number, sinifId: number, dersNo: number }) {
    if (tatilMi(pInfo.month, pInfo.day, pInfo.year, tatiller)) {
      if (!confirm('Seçilen tarih TATİL olarak işaretlenmiş. Yine de kayıt eklemek istiyor musunuz?')) return
    }
    setPicker(null)
    setPickerSaving(true)
    const sinif = siniflar.find(s => s.id === pInfo.sinifId)
    if (!sinif) return

    try {
      const payload = {
        gun: pInfo.day,
        ay: pInfo.month,
        yil: pInfo.year,
        kulup_adi: sinif.ad,
        ogretmen_id: personelId,
        ders_no: pInfo.dersNo,
        seans: 'sabah',
        durum: 'geldi',
        etkinlik_saati: 1
      }

      const { error } = await supabase.from('sinif_defteri').upsert(payload, { onConflict: 'gun,ay,yil,kulup_adi,ders_no,seans' })
      if (error) throw error
      load()
    } catch (err: any) {
      setMsg('❌ Kayıt hatası: ' + err.message)
    } finally {
      setPickerSaving(false)
    }
  }

  async function koordHaftayiKopyala() {
    if (!confirm('1. haftadaki (1-7. günler) koordinatör atamaları ayın geri kalanındaki tüm haftalara kopyalanacak. Mevcut koordinatör kayıtları (8-31 arası) silinecek. Emin misiniz?')) return
    
    setPickerSaving(true)
    setMsg('⌛ Koordinatör planlaması kopyalanıyor...')
    
    try {
      // 1. Haftadaki (1-7. günler) koordinatör kayıtlarını al (ders_no >= 11)
      const ilkHaftaKoord = defter.filter(p => p.gun >= 1 && p.gun <= 7 && (p.ders_no || 0) >= 11)
      
      if (ilkHaftaKoord.length === 0) {
        setMsg('⚠️ 1. haftada kopyalanacak koordinatör kaydı bulunamadı. Lütfen önce 1. haftayı doldurun.')
        setPickerSaving(false)
        return
      }

      // --- ADIM 1: MEVCUT KOORDİNATÖRLERİ TEMİZLE (8-31 arası) ---
      const { error: delErr } = await supabase.from('sinif_defteri').delete().gte('gun', 8).eq('ay', ay).eq('yil', yil).gte('ders_no', 11)
      if (delErr) throw delErr

      // --- ADIM 2: YENİ KAYITLARI HAZIRLA ---
      const payload: any[] = []
      const ayinGunleri = gunSayisi(yil, ay)

      // 8. günden ay sonuna kadar döngü
      for (let d = 8; d <= ayinGunleri; d++) {
        // TATİL KONTROLÜ
        if (tatilMi(ay, d, yil, tatiller)) continue

        // Bu günün hangi haftalık güne (1-7) denk geldiğini bul
        const kaynakGun = ((d - 1) % 7) + 1
        const kaynakKayitlar = ilkHaftaKoord.filter(p => p.gun === kaynakGun)
        
        kaynakKayitlar.forEach(k => {
          payload.push({
            gun: d,
            ay,
            yil,
            kulup_adi: k.kulup_adi,
            ogretmen_id: k.ogretmen_id,
            ders_no: k.ders_no,
            seans: k.seans || 'sabah',
            etkinlik_saati: k.etkinlik_saati || 1,
            durum: 'geldi'
          })
        })
      }

      if (payload.length > 0) {
        const { error: insErr } = await supabase.from('sinif_defteri').insert(payload)
        if (insErr) throw insErr
        
        setMsg('✅ Koordinatör planı tüm aya başarıyla kopyalandı.')
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

  function fastSil(e: React.MouseEvent, id: number) {
    e.stopPropagation()
    setDeleteConfirm(id)
  }

  async function finishSil() {
    if (!deleteConfirm) return
    const id = deleteConfirm
    setDeleteConfirm(null)
    setPickerSaving(true)
    try {
      const { error } = await supabase.from('sinif_defteri').delete().eq('id', id)
      if (error) throw error
      load()
    } catch (err: any) {
      setMsg('❌ Silme hatası: ' + err.message)
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


  const gorunenSiniflar = seciliSinif ? siniflar.filter(s => s.id === seciliSinif) : siniflar
  const DERS_SAATLERI = [1, 2, 3, 4, 5, 6]
  const KOORD_SAATLERI = [11, 12, 13, 14, 15, 16]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Topbar
        title="Sınıf Defteri"
        sub={`${ayLabel(ay, yil)} — Öğretmen Devam Takibi`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn no-print" disabled={pickerSaving} style={{ background: '#0284c7', color: '#fff', border: 'none', fontWeight: 600, padding: '6px 12px', fontSize: 13, borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }} onClick={koordHaftayiKopyala}>
              {pickerSaving ? '⌛ İşleniyor...' : '💠 Koordinatörleri Tüm Aya Uygula'}
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

        <div className="card no-print" style={{ padding: '12px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 10, textTransform: 'uppercase' }}>Sınıf Seçimi</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setSeciliSinif(null)} style={{ padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '2px solid', borderColor: seciliSinif === null ? 'var(--accent)' : 'var(--border)', background: seciliSinif === null ? 'var(--accent)' : '#fff', color: seciliSinif === null ? '#fff' : 'var(--text2)', transition: 'all 0.2s' }}>Tüm Sınıflar</button>
            {siniflar.map(s => (
              <button key={s.id} onClick={() => setSeciliSinif(seciliSinif === s.id ? null : s.id)} style={{ padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '2px solid', borderColor: seciliSinif === s.id ? 'var(--accent)' : 'var(--border)', background: seciliSinif === s.id ? 'var(--accent)' : '#fff', color: seciliSinif === s.id ? '#fff' : 'var(--text2)', transition: 'all 0.2s' }}>{s.ad}</button>
            ))}
          </div>
          
          <div style={{ marginTop: 15, fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>ℹ️</span>
            <span>Öğretmenlerin yoklama durumunu değiştirmek için <b>isimlerin altındaki etiketlere</b> tıklayabilirsiniz.</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
          {gorunenSiniflar.map(sinif => (
            <div key={sinif.id}>
              <div style={{ padding: '12px 20px', background: '#f8f9fa', borderBottom: '1px solid #eee', borderLeft: '5px solid var(--accent)', borderRadius: '8px 8px 0 0' }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>{sinif.ad} <span style={{ fontWeight: 400, color: 'var(--text3)', fontSize: 12 }}>({sinif.yas_grubu}) Sınıf Defteri</span></h3>
              </div>

              {gorunum === 'aylik' && (
                <div className="scroll-outer" style={{ width: '100%', overflow: 'hidden', borderRadius: '0 0 10px 10px', border: '1px solid #ddd', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                  <div className="scroll-container" style={{ width: '100%', maxHeight: '700px', overflow: 'auto', display: 'block' }}>
                    <table style={{ width: `${visibleDays.length * 80 + 125}px`, minWidth: `${visibleDays.length * 80 + 125}px`, borderCollapse: 'separate', borderSpacing: 0, fontSize: 11, tableLayout: 'fixed' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                        <tr>
                          <th style={{ ...thStyle(120), position: 'sticky', left: 0, top: 0, zIndex: 30, background: '#1e3d29', borderRight: '2px solid #0f1f15' }}>Ders Saati</th>
                          {visibleDays.map(vd => {
                            const tatil = tatilMi(vd.month, vd.day, vd.year, tatiller)
                            const hg = new Date(vd.year, vd.month - 1, vd.day, 12).getDay()
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
                            <td style={{ ...tdStyle, fontWeight: 700, background: '#f5f2ec', position: 'sticky', left: 0, zIndex: 10, borderRight: '2px solid #ddd' }}>{dersNo}. DERS</td>
                            {visibleDays.map(vd => {
                              const ders = dersGetir(sinif.ad, dersNo, vd.day, vd.month, vd.year)
                              const tatil = tatilMi(vd.month, vd.day, vd.year, tatiller)
                              const hg = new Date(vd.year, vd.month - 1, vd.day, 12).getDay()
                              const isHaftaSonu = hg === 0 || hg === 6
                              const ogr = ders ? ders.ogretmen as unknown as Personel | null : null
                              const gunAdi = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][hg]
                              
                              return (
                                <td key={`${vd.day}-${vd.month}`} className="program-cell" 
                                  style={{ ...tdStyle, background: (tatil || isHaftaSonu) ? '#e0dbd0' : ders ? (ders.durum === 'gelmedi' ? '#fff1f0' : '#f0fff4') : '#fff', cursor: (tatil || isHaftaSonu) ? 'default' : 'pointer' }} 
                                  onClick={(e) => {
                                    if (tatil || isHaftaSonu) return
                                    if (ders) durumDegistir(ders.id, ders.durum)
                                    else openPicker(e, vd.day, vd.month, vd.year, sinif.id, dersNo, gunAdi)
                                  }}
                                >
                                  <div style={{ width: 80, minWidth: 80 }}>
                                    {(!tatil && !isHaftaSonu) ? (
                                      ders ? (
                                        <div className="cell-content">
                                          <div style={{ fontWeight: 700, fontSize: 10, color: ders.durum === 'gelmedi' ? '#333' : '#333', textDecoration: ders.durum === 'gelmedi' ? 'line-through' : 'none' }}>{ogr?.ad}</div>
                                          <div className={`status-badge ${ders.durum}`}>{ders.durum === 'geldi' ? '✓ GELDİ' : '✕ GELMEDİ'}</div>
                                        </div>
                                      ) : (
                                        <div className="btn-ata-mini">+</div>
                                      )
                                    ) : <div style={{ fontSize: 8, color: '#999' }}>{isHaftaSonu ? 'H.SONU' : 'TATİL'}</div>}
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                        {KOORD_SAATLERI.map((dersNo) => (
                          <tr key={dersNo}>
                            <td style={{ ...tdStyle, fontWeight: 700, background: '#f5f2ec', position: 'sticky', left: 0, zIndex: 10, borderRight: '2px solid #ddd', color: 'var(--accent)' }}>Koordinatör</td>
                            {visibleDays.map(vd => {
                              const ders = dersGetir(sinif.ad, dersNo, vd.day, vd.month, vd.year)
                              const tatil = tatilMi(vd.month, vd.day, vd.year, tatiller)
                              const hg = new Date(vd.year, vd.month - 1, vd.day, 12).getDay()
                              const isHaftaSonu = hg === 0 || hg === 6
                              const ogr = ders ? ders.ogretmen as unknown as Personel | null : null
                              const gunAdi = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][hg]
                              return (
                                <td key={`${vd.day}-${vd.month}`} className="program-cell" 
                                  style={{ ...tdStyle, background: (tatil || isHaftaSonu) ? '#e0dbd0' : ders ? '#ebf4ff' : '#fff', cursor: (tatil || isHaftaSonu) ? 'default' : 'pointer' }}
                                  onClick={(e) => {
                                    if (tatil || isHaftaSonu) return
                                    if (ders) durumDegistir(ders.id, ders.durum)
                                    else openPicker(e, vd.day, vd.month, vd.year, sinif.id, dersNo, gunAdi)
                                  }}
                                >
                                  <div style={{ width: 80, minWidth: 80 }}>
                                    {(!tatil && !isHaftaSonu) ? (
                                      ders ? (
                                        <div className="cell-content">
                                          <button className="fast-del-mini" onClick={(e) => fastSil(e, ders.id)}>×</button>
                                          <div style={{ fontWeight: 700, fontSize: 10, color: '#0369a1' }}>{ogr?.ad}</div>
                                          <div className={`status-badge ${ders.durum}`} style={{ background: ders.durum === 'geldi' ? '#0369a1' : '#c53030' }}>{ders.durum === 'geldi' ? '✓ GELDİ' : '✕ GELMEDİ'}</div>
                                        </div>
                                      ) : (
                                        <div className="btn-ata-mini">+</div>
                                      )
                                    ) : <div style={{ fontSize: 8, color: '#999' }}>{isHaftaSonu ? 'H.SONU' : 'TATİL'}</div>}
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {gorunum === 'haftalik' && (
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 32, background: '#fff', borderRadius: '0 0 10px 10px', border: '1px solid #ddd' }}>
                  {visibleWeeks.map((week, wIndex) => (
                    <div key={wIndex} className="week-block">
                      <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 6, fontWeight: 700, fontSize: 12, color: 'var(--text2)', borderLeft: '4px solid var(--accent)', display: 'inline-block' }}>
                        📅 {wIndex + 1}. Hafta ({week[0].day} {AYLAR[week[0].month || 1]} - {week[week.length - 1].day} {AYLAR[week[week.length - 1].month || 1]})
                      </div>
                      <div className="scroll-container" style={{ width: '100%', overflowX: 'auto' }}>
                        <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 11 }}>
                          <thead>
                            <tr>
                              <th style={{ ...thStyle(100), background: '#2d5a3d' }}>Saat</th>
                              {week.map(vd => {
                                const tatil = tatilMi(vd.month, vd.day, vd.year, tatiller)
                                const hg = new Date(vd.year, vd.month - 1, vd.day, 12).getDay()
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
                                  const hg = new Date(vd.year, vd.month - 1, vd.day, 12).getDay()
                                  const isHaftaSonu = hg === 0 || hg === 6
                                  const ogr = ders ? ders.ogretmen as unknown as Personel | null : null
                                  const gunAdi = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][hg]
                                  return (
                                    <td key={`${vd.day}-${vd.month}`} className="program-cell" 
                                      style={{ ...tdStyle, background: (tatil || isHaftaSonu) ? '#e0dbd0' : ders ? (ders.durum === 'gelmedi' ? '#fff1f0' : '#f0fff4') : '#fff', cursor: (tatil || isHaftaSonu) ? 'default' : 'pointer' }}
                                      onClick={(e) => {
                                        if (tatil || isHaftaSonu) return
                                        if (ders) durumDegistir(ders.id, ders.durum)
                                        else openPicker(e, vd.day, vd.month, vd.year, sinif.id, dersNo, gunAdi)
                                      }}
                                    >
                                      <div style={{ width: 80, minWidth: 80 }}>
                                        {(!tatil && !isHaftaSonu) ? (
                                          ders ? (
                                            <div className="cell-content">
                                              <div style={{ fontWeight: 700, fontSize: 10, color: ders.durum === 'gelmedi' ? '#333' : '#333', textDecoration: ders.durum === 'gelmedi' ? 'line-through' : 'none' }}>{ogr?.ad}</div>
                                              <div className={`status-badge ${ders.durum}`}>{ders.durum === 'geldi' ? '✓ GELDİ' : '✕ GELMEDİ'}</div>
                                            </div>
                                          ) : (
                                            <div className="btn-ata-mini">+</div>
                                          )
                                        ) : <div style={{ fontSize: 8, color: '#999' }}>{isHaftaSonu ? 'H.SONU' : 'TATİL'}</div>}
                                      </div>
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                            {KOORD_SAATLERI.map((dersNo) => (
                              <tr key={dersNo}>
                                <td style={{ ...tdStyle, fontWeight: 700, background: '#f5f2ec', color: 'var(--accent)' }}>Koordinatör</td>
                                {week.map(vd => {
                                  const ders = dersGetir(sinif.ad, dersNo, vd.day, vd.month, vd.year)
                                  const tatil = tatilMi(vd.month, vd.day, vd.year, tatiller)
                                  const hg = new Date(vd.year, vd.month - 1, vd.day, 12).getDay()
                                  const isHaftaSonu = hg === 0 || hg === 6
                                  const ogr = ders ? ders.ogretmen as unknown as Personel | null : null
                                  const gunAdi = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][hg]
                                  return (
                                    <td key={`${vd.day}-${vd.month}`} className="program-cell" 
                                      style={{ ...tdStyle, background: (tatil || isHaftaSonu) ? '#e0dbd0' : ders ? '#ebf4ff' : '#fff', cursor: (tatil || isHaftaSonu) ? 'default' : 'pointer' }}
                                      onClick={(e) => {
                                        if (tatil || isHaftaSonu) return
                                        if (ders) durumDegistir(ders.id, ders.durum)
                                        else openPicker(e, vd.day, vd.month, vd.year, sinif.id, dersNo, gunAdi)
                                      }}
                                    >
                                      <div style={{ width: 80, minWidth: 80 }}>
                                        {(!tatil && !isHaftaSonu) ? (
                                          ders ? (
                                            <div className="cell-content">
                                              <button className="fast-del-mini" onClick={(e) => fastSil(e, ders.id)}>×</button>
                                              <div style={{ fontWeight: 700, fontSize: 10, color: '#0369a1' }}>{ogr?.ad}</div>
                                              <div className={`status-badge ${ders.durum}`} style={{ background: ders.durum === 'geldi' ? '#0369a1' : '#c53030' }}>{ders.durum === 'geldi' ? '✓ GELDİ' : '✕ GELMEDİ'}</div>
                                            </div>
                                          ) : (
                                            <div className="btn-ata-mini">+</div>
                                          )
                                        ) : <div style={{ fontSize: 8, color: '#999' }}>{isHaftaSonu ? 'H.SONU' : 'TATİL'}</div>}
                                      </div>
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
          ))}
        </div>

      <div className="no-print" style={{ marginTop: 60, padding: '30px 0', borderTop: '1px dashed var(--border)', textAlign: 'center' }}>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 15 }}>⚠️ Eksik veya hatalı veriler mi görüyorsunuz?</p>
          <button 
            className="btn btn-sm" 
            onClick={programdanAktar} 
            disabled={pickerSaving}
            style={{ 
              background: '#f8f9fa', 
              color: 'var(--text2)', 
              border: '1px solid var(--border)',
              padding: '10px 24px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8
            }}
            onMouseOver={e => e.currentTarget.style.background = '#eee'}
            onMouseOut={e => e.currentTarget.style.background = '#f8f9fa'}
          >
            {pickerSaving ? '⌛ Eşitleniyor...' : '🔄 Ders Programı ile Eşitle'}
          </button>
          <div style={{ fontSize: 11, color: '#999', marginTop: 10 }}>Bu işlem, ders programındaki tüm kayıtları mevcut aya kopyalar.</div>
        </div>
      </div>

      {picker && (
        <div className="picker-overlay" onClick={() => setPicker(null)}>
          <div className="fast-picker" style={{ 
            top: picker.rect.bottom + 300 > window.innerHeight ? picker.rect.top - 310 : picker.rect.bottom + 5, 
            left: Math.min(picker.rect.left, window.innerWidth - 220) 
          }} onClick={e => e.stopPropagation()}>
            <div className="picker-header text-xs text-muted-foreground uppercase tracking-wider">{picker.day} {AYLAR[picker.month || 1]} - Seçim</div>
            <div className="picker-list">
              {personel
                .filter(p => {
                  const g = (p.gorev || '').toLowerCase()
                  if (picker.dersNo >= 11) {
                    return g.includes('koordinatör')
                  }
                  return !['muhasebeci', 'muhasebe', 'temizlik'].some(keyword => g.includes(keyword))
                })
                .map(p => (
                <button key={p.id} className="picker-item" onClick={() => directKaydet(p.id, picker)}>
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
            <p style={{ margin: '0 0 24px 0', color: 'var(--text3)', fontSize: 13 }}>Bu koordinatörlük atamasını silmek istediğinizden emin misiniz?</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setDeleteConfirm(null)}>Vazgeç</button>
              <button className="btn btn-danger" style={{ flex: 1, background: '#d00000' }} onClick={finishSil}>Evet, Sil</button>
            </div>
          </div>
        </div>
      )}



      <style jsx>{`
        .scroll-container { scrollbar-width: thick; scrollbar-color: #2d5a3d #e0e0e0; overflow: auto; }
        .scroll-container::-webkit-scrollbar { height: 14px !important; display: block !important; }
        .scroll-container::-webkit-scrollbar-track { background: #f8f9fa !important; }
        .scroll-container::-webkit-scrollbar-thumb { background: #2d5a3d !important; border-radius: 8px; border: 3px solid #f8f9fa; }
        
        .program-cell { cursor: pointer; transition: all 0.2s; min-height: 60px; position: relative; }
        .program-cell:hover { background: #fffcf0 !important; box-shadow: inset 0 0 0 1px rgba(45,90,61,0.1); }
        
        .btn-ata-mini { width: 26px; height: 26px; border-radius: 50%; border: 1px dashed #ccc; background: #fff; cursor: pointer; color: #999; font-size: 16px; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .btn-ata-mini:hover { background: var(--accent); color: #fff; border-style: solid; transform: scale(1.1); box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        
        .cell-content { position: relative; width: 100%; height: 100%; min-height: 54px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4px; }
        .fast-del-mini { position: absolute; top: -6px; right: -6px; width: 18px; height: 18px; background: #fff; color: #e53e3e; border: 1px solid #fed7d7; border-radius: 50%; font-size: 10px; display: none; align-items: center; justify-content: center; cursor: pointer; z-index: 10; box-shadow: 0 2px 5px rgba(0,0,0,0.15); }
        .program-cell:hover .fast-del-mini { display: flex; }
        .fast-del-mini:hover { background: #e53e3e; color: #fff; transform: scale(1.1); }
        
        .status-badge { margin-top: 4px; padding: 2px 6px; border-radius: 10px; font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3px; }
        .status-badge.geldi { background: #2d5a3d; color: #fff; }
        .status-badge.gelmedi { background: #c53030; color: #fff; }
        
        .picker-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.02); }
        .fast-picker { position: absolute; background: #fff; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); border: 1px solid #eee; width: 220px; z-index: 1001; animation: popIn 0.2s ease-out; }
        .picker-header { padding: 10px 14px; background: #f9f9f9; font-size: 10px; font-weight: 800; border-bottom: 1px solid #eee; color: #666; }
        .picker-list { max-height: 250px; overflow-y: auto; padding: 6px; }
        .picker-item { width: 100%; text-align: left; padding: 10px 14px; background: none; border: none; font-size: 13px; cursor: pointer; border-radius: 8px; transition: all 0.1s; display: flex; flex-direction: column; }
        .picker-item:hover { background: #f0fdf4; color: var(--accent); }

        @keyframes popIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        @media print {
          .no-print { display: none !important; }
          .card { border: none !important; box-shadow: none !important; }
          .scroll-outer { border: 1px solid #eee !important; overflow: visible !important; }
          .scroll-container { max-height: none !important; overflow: visible !important; }
          table { width: 100% !important; table-layout: auto !important; }
        }
      `}</style>
    </div>
  )
}

function thStyle(width: number): React.CSSProperties {
  return { padding: '12px 6px', color: '#fff', fontWeight: 700, fontSize: 10, border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', width, minWidth: width, boxSizing: 'border-box', verticalAlign: 'middle' }
}
const tdStyle: React.CSSProperties = { padding: '4px', border: '1px solid #eee', verticalAlign: 'middle', fontSize: 10, textAlign: 'center', position: 'relative' }
