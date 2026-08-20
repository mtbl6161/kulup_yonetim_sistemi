'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import Topbar from '@/components/Topbar'
import { useAy } from '@/lib/AyContext'
import { supabase } from '@/lib/supabase'
import { SinifDefteri, Personel, Tatil, Sinif, Ayarlar } from '@/lib/types'
import { GUNLER, AYLAR, gunSayisi, tatilMi, ayLabel, haftaIciMi } from '@/lib/hesaplama'
import { Download, RefreshCw, Calendar, Grid } from 'lucide-react'
import React from 'react'
import ConfirmModal from '@/components/ConfirmModal'

interface VisibleDay {
  day: number
  month: number
  year: number
  isCurrentMonth: boolean
}

// ── Tablo Stilleri ──────────────────────────────────────────
function thStyle(width: number): React.CSSProperties {
  return { padding: '12px 6px', color: '#fff', fontWeight: 700, fontSize: 10, border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', width, minWidth: width, boxSizing: 'border-box', verticalAlign: 'middle' }
}
const tdStyle: React.CSSProperties = { padding: '4px', border: '1px solid #eee', verticalAlign: 'middle', fontSize: 10, textAlign: 'center', position: 'relative' }

// ── RenderTable Bileşeni (Stabilite için dışarıda) ───────────
interface RenderTableProps {
  sinif: Sinif
  hours: number[]
  type: 'ders' | 'koord'
  currentTab: string
  ayarlar: Ayarlar | null
  ay: number
  yil: number
  visibleDays: VisibleDay[]
  tatiller: Tatil[]
  dersGetir: (sinifAd: string, dersNo: number, gun: number, ay: number, yil: number) => SinifDefteri | null
  durumDegistir: (id: number, current: string) => Promise<void>
  openPicker: (e: any, day: number, month: number, year: number, sinifId: number, dersNo: number, gunAdi: string) => void
  fastSil: (e: any, id: number) => void
}

const RenderTable = ({ 
  sinif, hours, type, currentTab, ayarlar, ay, yil, visibleDays, tatiller,
  dersGetir, durumDegistir, openPicker, fastSil
}: RenderTableProps) => (
  <div className={`table-print-container ${currentTab === type ? 'tab-active' : 'tab-inactive'} print-area`}>
    {/* Print Only Header */}
    <div className="print-only" style={{ marginBottom: 15, textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: 15 }}>
      <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--danger)', marginBottom: 4 }}>{ayarlar?.kurum_adi?.toUpperCase() || 'ÇOCUK KULÜBÜ'}</div>
      <h2 style={{ margin: 0, fontSize: 13, fontWeight: 800 }}>{sinif.ad.toUpperCase()} SINIF DEFTERİ - {type === 'ders' ? 'ÖĞRETMEN' : 'KOORDİNATÖR'}</h2>
      <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>{ayLabel(ay, yil).toUpperCase()} — (01 {AYLAR[ay]} - {gunSayisi(yil, ay)} {AYLAR[ay]} {yil})</div>
    </div>

    <div className="scroll-outer" style={{ width: '100%', overflow: 'hidden' }}>
      <div className="scroll-container" style={{ width: '100%', maxHeight: '600px', overflow: 'auto' }}>
        <table style={{ width: `${visibleDays.length * 100 + 125}px`, borderCollapse: 'separate', borderSpacing: 0, fontSize: 11, tableLayout: 'fixed' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
            <tr>
              <th style={{ ...thStyle(120), position: 'sticky', left: 0, top: 0, zIndex: 30, background: '#1e3d29', borderRight: '2px solid #0f1f15' }}>Saat / Gün</th>
              {visibleDays.map(vd => {
                const tatil = tatilMi(vd.month, vd.day, vd.year, tatiller)
                const hg = new Date(vd.year, vd.month - 1, vd.day, 12).getDay()
                const isHaftaSonu = hg === 0 || hg === 6
                const gunAdi = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][hg]
                return (
                  <th key={`${vd.day}-${vd.month}`} style={{ ...thStyle(100), background: (tatil || isHaftaSonu) ? 'var(--border)' : 'var(--accent)' }}>
                    {gunAdi}<br /><span style={{ fontSize: 13, fontWeight: 700 }}>{vd.day}</span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {hours.map((dersNo, idx) => (
              <tr key={dersNo}>
                <td style={{ ...tdStyle, fontWeight: 700, background: 'var(--bg)', position: 'sticky', left: 0, zIndex: 10, borderRight: '2px solid #ddd', color: type === 'koord' ? 'var(--info)' : 'var(--text)' }}>
                  {type === 'koord' ? 'KOORD' : `${idx + 1}. DERS`}
                </td>
                {visibleDays.map(vd => {
                  const ders = dersGetir(sinif.ad, dersNo, vd.day, vd.month, vd.year)
                  const tatil = tatilMi(vd.month, vd.day, vd.year, tatiller)
                  const hg = new Date(vd.year, vd.month - 1, vd.day, 12).getDay()
                  const isHaftaSonu = hg === 0 || hg === 6
                  const ogr = ders ? ders.ogretmen as unknown as Personel | null : null
                  const gunAdi = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][hg]
                  
                  return (
                    <td key={`${vd.day}-${vd.month}`} className="program-cell" 
                      style={{ ...tdStyle, background: (tatil || isHaftaSonu) ? 'var(--border-light)' : '#fff', cursor: (tatil || isHaftaSonu || (!ders && type === 'ders')) ? 'default' : 'pointer' }} 
                      onClick={(e) => {
                        if (tatil || isHaftaSonu) return
                        if (ders) durumDegistir(ders.id, ders.durum)
                        else if (type === 'koord') openPicker(e, vd.day, vd.month, vd.year, sinif.id, dersNo, gunAdi)
                        // type==='ders' ise boş hücreye tıklamak bir şey yapmaz (ders programından gelir)
                      }}
                    >
                      <div style={{ width: 100, minWidth: 100, padding: 4 }}>
                        {(!tatil && !isHaftaSonu) ? (
                          ders ? (
                            <div className="cell-content">
                              {type === 'koord' && <button className="fast-del-mini no-print" onClick={(e) => fastSil(e, ders.id)}>×</button>}
                                <div style={{ fontWeight: 700, fontSize: 10, color: '#343a40', textDecoration: ders.durum === 'gelmedi' ? 'line-through' : 'none' }}>
                                  {ogr?.ad}
                                  {ogr?.aktif === false && <span style={{ color: 'var(--danger)', fontSize: 9 }}> (Ayrıldı)</span>}
                                </div>
                                <div className={`status-badge ${ders.durum}`}>
                                  {ders.durum === 'geldi' ? '✓ GELDİ' : '✕ GELMEDİ'}
                                </div>
                            </div>
                          ) : (
                            type === 'koord'
                              ? <div className="btn-ata-mini no-print">+</div>
                              : <div style={{ fontSize: 9, color: '#ccc' }}>—</div>
                          )
                        ) : <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600 }}>{isHaftaSonu ? 'H.SONU' : 'TATİL'}</div>}
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
  </div>
)

// ── RenderWeeklyTable Bileşeni (Haftalık görünüm stabilitesi için) ──
interface RenderWeeklyTableProps {
  sinif: Sinif
  week: VisibleDay[]
  currentHours: number[]
  currentTab: 'ders' | 'koord'
  defter: SinifDefteri[]
  tatiller: Tatil[]
  wIndex: number
  dersGetir: (sinifAd: string, dersNo: number, gun: number, ay: number, yil: number) => SinifDefteri | null
  durumDegistir: (id: number, current: string) => Promise<void>
  openPicker: (e: any, day: number, month: number, year: number, sinifId: number, dersNo: number, gunAdi: string) => void
  fastSil: (e: any, id: number) => void
}

const RenderWeeklyTable = ({
  sinif, week, currentHours, currentTab, defter, tatiller, wIndex,
  dersGetir, durumDegistir, openPicker, fastSil
}: RenderWeeklyTableProps) => (
  <div className="week-block">
    <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--bg)', borderRadius: 6, fontWeight: 700, fontSize: 13, color: 'var(--text2)', borderLeft: '4px solid var(--accent)', display: 'inline-block' }}>
      📅 {wIndex + 1}. Hafta ({week[0].day} {AYLAR[week[0].month || 1]} - {week[week.length - 1].day} {AYLAR[week[week.length - 1].month || 1]})
    </div>
    <div className="scroll-container" style={{ width: '100%', overflowX: 'auto' }}>
      <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ ...thStyle(100), background: 'var(--accent)' }}>Saat</th>
            {week.map(vd => {
              const tatil = tatilMi(vd.month, vd.day, vd.year, tatiller)
              const hg = new Date(vd.year, vd.month - 1, vd.day, 12).getDay()
              const isHaftaSonu = hg === 0 || hg === 6
              const gunAdi = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][hg]
              return (
                <th key={`${vd.day}-${vd.month}`} style={{ ...thStyle(100), background: (tatil || isHaftaSonu) ? 'var(--border)' : 'var(--accent)' }}>
                  {gunAdi}<br /><span style={{ fontSize: 13, fontWeight: 700 }}>{vd.day}</span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {currentHours.map((dersNo, idx) => (
            <tr key={dersNo}>
              <td style={{ ...tdStyle, fontWeight: 700, background: 'var(--bg)', color: currentTab === 'koord' ? 'var(--info)' : 'var(--text)' }}>
                {currentTab === 'koord' ? 'KOORD' : `${idx + 1}. DERS`}
              </td>
              {week.map(vd => {
                const ders = dersGetir(sinif.ad, dersNo, vd.day, vd.month, vd.year)
                const tatil = tatilMi(vd.month, vd.day, vd.year, tatiller)
                const hg = new Date(vd.year, vd.month - 1, vd.day, 12).getDay()
                const isHaftaSonu = hg === 0 || hg === 6
                const ogr = ders ? ders.ogretmen as unknown as Personel | null : null
                const gunAdi = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][hg]
                return (
                  <td key={`${vd.day}-${vd.month}`} className="program-cell" 
                    style={{ ...tdStyle, background: (tatil || isHaftaSonu) ? 'var(--border-light)' : '#fff', cursor: (tatil || isHaftaSonu || (!ders && currentTab === 'ders')) ? 'default' : 'pointer' }}
                    onClick={(e) => {
                      if (tatil || isHaftaSonu) return
                      if (ders) durumDegistir(ders.id, ders.durum)
                      else if (currentTab === 'koord') openPicker(e, vd.day, vd.month, vd.year, sinif.id, dersNo, gunAdi)
                    }}
                  >
                    <div style={{ width: 100, minWidth: 100, padding: 4 }}>
                      {(!tatil && !isHaftaSonu) ? (
                        ders ? (
                          <div className="cell-content">
                            {currentTab === 'koord' && <button className="fast-del-mini no-print" onClick={(e) => fastSil(e, ders.id)}>×</button>}
                            <div style={{ fontWeight: 700, fontSize: 10, color: '#333', textDecoration: ders.durum === 'gelmedi' ? 'line-through' : 'none' }}>
                              {ogr?.ad}
                              {ogr?.aktif === false && <span style={{ color: 'var(--danger)', fontSize: 9 }}> (Ayrıldı)</span>}
                            </div>
                            <div className={`status-badge ${ders.durum}`}>
                              {ders.durum === 'geldi' ? '✓ GELDİ' : '✕ GELMEDİ'}
                            </div>
                          </div>
                        ) : (
                          currentTab === 'koord'
                            ? <div className="btn-ata-mini no-print">+</div>
                            : <div style={{ fontSize: 9, color: '#ccc' }}>—</div>
                        )
                      ) : <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600 }}>{isHaftaSonu ? 'H.SONU' : 'TATİL'}</div>}
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
)

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
    payload?: any,
    title: string,
    message: string
  } | null>(null)

  const [gorunum, setGorunum] = useState<'aylik' | 'haftalik'>('aylik')
  const [activeTabs, setActiveTabs] = useState<Record<number, 'ders' | 'koord'>>({})

  const getTab = (id: number) => activeTabs[id] || 'ders'
  const setTab = (id: number, t: 'ders' | 'koord') => setActiveTabs(prev => ({ ...prev, [id]: t }))

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
              const ogr = perList.find((x: any) => x.id === p.ogretmen_id)
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
    } catch (e: any) {
      setMsg('❌ Beklenmeyen hata: ' + (e.message || 'Bilinmiyor'))
    }
  }, [ay, yil])

  useEffect(() => { load() }, [load])

  function programdanAktar() {
    setConf({
      open: true,
      type: 'programdan-aktar',
      title: 'Ders Programı ile Eşitle',
      message: `${ayLabel(ay, yil)} dönemine ait mevcut tüm sınıf defteri ve koordinatör kayıtları silinecek ve ders programı şablonundan yeniden oluşturulacaktır. Bu işlem geri alınamaz. Emin misiniz?`
    })
  }

  async function programdanAktarGercek() {
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
    } catch (err: any) {
      setMsg('❌ Aktarım hatası: ' + err.message)
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
      const upserts: any[] = []
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

      const promises: any[] = []
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
    } catch (err: any) {
      // Hata durumunda orijinal state'e dön
      setDefter(defter.map(d => guncellenenIdler.has(d.id) ? ({ ...d, durum: mevcutDurum } as SinifDefteri) : d))
      setMsg('❌ Durum güncelleme hatası: ' + err.message)
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

      const payload: any = {
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
    } catch (err: any) {
      setMsg('❌ Kayıt hatası: ' + err.message)
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

  const handlePdfDownload = async () => {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

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
    const PH = pdf.internal.pageSize.getHeight()
    const M = 10
    const hedefSiniflar = seciliSinif ? siniflar.filter(s => s.id === seciliSinif) : siniflar

    hedefSiniflar.forEach((sinif, sIdx) => {
      // Her sınıf için hem öğretmen hem koordinatör defteri
      ['Ders', 'Koordinatör'].forEach((typeLabel, tIdx) => {
        if (sIdx > 0 || tIdx > 0) pdf.addPage()

        // Institutional Header
        pdf.setFontSize(11)
        pdf.setFont('NotoSans', 'bold')
        pdf.setTextColor(0, 0, 0)
        pdf.text(ayarlar?.kurum_adi?.toUpperCase() || 'ÇOCUK KULÜBÜ', PW / 2, 12, { align: 'center' })
        
        pdf.setFontSize(9)
        pdf.text(`${sinif.ad.toUpperCase()} SINIF DEFTERİ - ${typeLabel.toUpperCase()}`, PW / 2, 17, { align: 'center' })
        pdf.setFont('NotoSans', 'normal')
        pdf.text(`${ayLabel(ay, yil).toUpperCase()} (${gorunum === 'aylik' ? 'AYLIK' : 'HAFTALIK'})`, PW / 2, 22, { align: 'center' })

        const currentHours = typeLabel === 'Ders' ? [1, 2, 3, 4, 5, 6] : [11, 12, 13, 14, 15, 16]

        if (gorunum === 'aylik') {
          // --- AYLIK GÖRÜNÜM ---
          const daysInMonth = gunSayisi(yil, ay)
          const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1)
          
          const headRows: any[] = [[
            { content: 'Saat / Gün', styles: { halign: 'center', fillColor: [255, 255, 255] } },
            ...daysArray.map(d => {
              const dInfo = new Date(yil, ay - 1, d, 12)
              const hg = dInfo.getDay()
              const gunAdi = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][hg]
              const isWE = hg === 0 || hg === 6
              const isT = tatilMi(ay, d, yil, tatiller)
              return { 
                content: `${gunAdi}\n${d}`, 
                styles: { halign: 'center', fillColor: (isWE || isT) ? [245, 245, 245] : [255, 255, 255] } 
              }
            })
          ]]

          const bodyRows = currentHours.map((dersNo, idx) => {
            return [
              typeLabel === 'Ders' ? `${idx + 1}. DERS` : 'KOORD.',
              ...daysArray.map(d => {
                const ders = dersGetir(sinif.ad, dersNo, d, ay, yil)
                if (!ders) return ''
                const ogr = ders.ogretmen as any
                const status = ders.durum === 'geldi' ? 'GELDİ' : 'GELMEDİ'
                const ayrildiText = ogr?.aktif === false ? ' (Ayrıldı)' : ''
                return `${ogr?.ad || ''}${ayrildiText}\n(${status})`
              })
            ]
          })

          autoTable(pdf, {
            head: headRows,
            body: bodyRows,
            startY: 28,
            margin: { top: M, left: M, right: M, bottom: M },
            styles: { font: 'NotoSans', fontSize: 5, lineWidth: 0.1, lineColor: [40, 40, 40], cellPadding: 0.8, valign: 'middle', textColor: [0, 0, 0] },
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
            columnStyles: { 0: { cellWidth: 15, fontStyle: 'bold' } },
            didParseCell: (data) => {
              if (data.column.index > 0) {
                const d = daysArray[data.column.index - 1]
                const isWE = new Date(yil, ay - 1, d, 12).getDay() % 6 === 0
                const isT = tatilMi(ay, d, yil, tatiller)
                if (isWE || isT) data.cell.styles.fillColor = [245, 245, 245]
                if (data.cell.text.some(t => t.includes('GELMEDİ'))) data.cell.styles.textColor = [180, 0, 0]
              }
            }
          })
        } else {
          // --- HAFTALIK GÖRÜNÜM ---
          let currentY = 28
          visibleWeeks.forEach((week, wIdx) => {
            pdf.setFont('NotoSans', 'bold')
            pdf.setFontSize(8)
            pdf.text(`📅 ${wIdx + 1}. HAFTA (${week[0].day} ${AYLAR[week[0].month || 1]} - ${week[week.length - 1].day} ${AYLAR[week[week.length - 1].month || 1]})`, M, currentY - 2)

            const headRows: any[] = [[
              { content: 'Saat', styles: { halign: 'center' } },
              ...week.map(vd => {
                const hg = new Date(vd.year, vd.month - 1, vd.day).getDay()
                return { content: `${['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'][hg]}\n${vd.day}`, styles: { halign: 'center' } }
              })
            ]]

            const bodyRows = currentHours.map((dersNo, idx) => {
              return [
                typeLabel === 'Ders' ? `${idx + 1}. DERS` : 'KOORD.',
                ...week.map(vd => {
                  const ders = dersGetir(sinif.ad, dersNo, vd.day, vd.month, vd.year)
                  if (!ders) return ''
                  const ogr = ders.ogretmen as any
                  const status = ders.durum === 'geldi' ? 'GELDİ' : 'GELMEDİ'
                  const ayrildiText = ogr?.aktif === false ? ' (Ayrıldı)' : ''
                  return `${ogr?.ad || ''}${ayrildiText}\n(${status})`
                })
              ]
            })

            autoTable(pdf, {
              head: headRows,
              body: bodyRows,
              startY: currentY,
              margin: { left: M, right: M },
              styles: { font: 'NotoSans', fontSize: 6.5, lineWidth: 0.1, lineColor: [40, 40, 40], cellPadding: 1.2, valign: 'middle', textColor: [0, 0, 0] },
              headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
              columnStyles: { 0: { cellWidth: 20, fontStyle: 'bold' } },
              didParseCell: (data) => {
                if (data.column.index > 0) {
                  const vd = week[data.column.index - 1]
                  const hg = new Date(vd.year, vd.month - 1, vd.day).getDay()
                  const isWE = hg === 0 || hg === 6
                  const isT = tatilMi(vd.month, vd.day, vd.year, tatiller)
                  if (isWE || isT) data.cell.styles.fillColor = [245, 245, 245]
                  if (data.cell.text.some(t => t.includes('GELMEDİ'))) data.cell.styles.textColor = [180, 0, 0]
                }
              }
            })
            currentY = (pdf as any).lastAutoTable.finalY + 12
            if (currentY > PH - 45 && wIdx < visibleWeeks.length - 1) {
              pdf.addPage()
              currentY = 20
            }
          })
        }

        // Signature Blocks (Per Page as these are independent sheets of a dossier)
        const finalY = (pdf as any).lastAutoTable?.finalY || 150
        const signY = Math.max(finalY + 12, PH - 35)
        const duzenleyenAdi   = ayarlar?.duzenleyen_adi   ?? '___________________'
        const duzenleyenUnvan = ayarlar?.duzenleyen_unvani ?? 'Büro Personeli'
        const onaylayanAdi    = ayarlar?.mudur_adi         ?? '___________________'
        const onaylayanUnvan  = 'Okul Müdürü / Kulüp Başkanı'

        pdf.setFontSize(8)
        pdf.setFont('NotoSans', 'bold')
        pdf.text('DÜZENLEYEN', M + 40, signY, { align: 'center' })
        pdf.text('ONAYLAYAN', PW - M - 40, signY, { align: 'center' })
        pdf.setFontSize(7.5)
        pdf.text(duzenleyenAdi, M + 40, signY + 6, { align: 'center' })
        pdf.setFont('NotoSans', 'normal')
        pdf.setFontSize(7)
        pdf.text(duzenleyenUnvan, M + 40, signY + 10, { align: 'center' })
        pdf.line(M + 10, signY + 16, M + 70, signY + 16)
        pdf.setFont('NotoSans', 'bold')
        pdf.setFontSize(7.5)
        pdf.text(onaylayanAdi, PW - M - 40, signY + 6, { align: 'center' })
        pdf.setFont('NotoSans', 'normal')
        pdf.setFontSize(7)
        pdf.text(onaylayanUnvan, PW - M - 40, signY + 10, { align: 'center' })
        pdf.line(PW - M - 70, signY + 16, PW - M - 10, signY + 16)
      })
    })

    const blob = pdf.output('blob')
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
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
            <button 
              className="btn no-print" 
              disabled={pickerSaving} 
              style={{ 
                background: 'var(--accent)', 
                color: '#fff', 
                border: 'none', 
                fontWeight: 600, 
                padding: '6px 12px', 
                fontSize: 13, 
                borderRadius: 6, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }} 
              onClick={programdanAktar}
              onMouseOver={e => e.currentTarget.style.background = 'var(--accent-hover)'}
              onMouseOut={e => e.currentTarget.style.background = 'var(--accent)'}
            >
              <RefreshCw size={14} className={pickerSaving ? "animate-spin" : ""} />
              {pickerSaving ? 'Eşitleniyor...' : 'Ders Programı ile Eşitle'}
            </button>
            <div style={{ display: 'flex', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
              {(['aylik', 'haftalik'] as const).map(g => (
                <button
                  key={g} className="btn btn-sm no-print"
                  style={{
                    borderRadius: 0, border: 'none',
                    background: gorunum === g ? 'var(--accent)' : 'transparent',
                    color: gorunum === g ? '#fff' : 'var(--text2)',
                    padding: '6px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  onClick={() => setGorunum(g)}
                >
                  {g === 'aylik' ? <Calendar size={14} /> : <Grid size={14} />}
                  {g === 'aylik' ? 'Aylık' : 'Haftalık'}
                </button>
              ))}
            </div>
            <button 
              className="btn btn-sm" 
              onClick={handlePdfDownload} 
              style={{ 
                background: 'var(--danger)', 
                color: '#fff', 
                border: 'none', 
                fontWeight: 600, 
                padding: '6px 12px', 
                fontSize: 13, 
                borderRadius: 6, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--danger-hover)'}
              onMouseOut={e => e.currentTarget.style.background = 'var(--danger)'}
            >
              <Download size={14} /> PDF İndir
            </button>
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
          {gorunenSiniflar.map(sinif => {
            const currentTab = getTab(sinif.id)
            
            return (
              <div key={sinif.id} className="sinif-block" style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', background: '#fff' }}>
                <div className="no-print" style={{ padding: '16px 20px', background: '#f8f9fa', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
                    {sinif.ad} <span style={{ fontWeight: 400, color: 'var(--text3)', fontSize: 13 }}>({sinif.yas_grubu})</span>
                  </h3>
                  
                  {/* Tab Selector */}
                  <div style={{ display: 'flex', background: 'var(--bg)', padding: 3, borderRadius: 8, border: '1px solid var(--border)' }}>
                    <button 
                      onClick={() => setTab(sinif.id, 'ders')}
                      style={{ 
                        border: 'none', padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        background: currentTab === 'ders' ? 'var(--accent)' : 'transparent',
                        color: currentTab === 'ders' ? '#fff' : 'var(--text2)',
                        transition: 'all 0.2s'
                      }}
                    >
                      🏫 Öğretmen Defteri
                    </button>
                    <button 
                      onClick={() => setTab(sinif.id, 'koord')}
                      style={{ 
                        border: 'none', padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        background: currentTab === 'koord' ? 'var(--info)' : 'transparent',
                        color: currentTab === 'koord' ? '#fff' : 'var(--text2)',
                        transition: 'all 0.2s'
                      }}
                    >
                      👔 Koordinatör Defteri
                    </button>
                  </div>
                </div>

                {gorunum === 'aylik' && (
                  <RenderTable 
                    sinif={sinif} 
                    hours={currentTab === 'ders' ? DERS_SAATLERI : KOORD_SAATLERI} 
                    type={currentTab} 
                    currentTab={currentTab} 
                    ayarlar={ayarlar} 
                    ay={ay} 
                    yil={yil} 
                    visibleDays={visibleDays} 
                    tatiller={tatiller}
                    dersGetir={dersGetir}
                    durumDegistir={durumDegistir}
                    openPicker={openPicker}
                    fastSil={fastSil}
                  />
                )}

                {gorunum === 'haftalik' && (
                  <div className="no-print" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 32, background: '#fff' }}>
                    {visibleWeeks.map((week, wIndex) => (
                      <RenderWeeklyTable 
                        key={wIndex}
                        sinif={sinif}
                        week={week}
                        currentHours={currentTab === 'ders' ? DERS_SAATLERI : KOORD_SAATLERI}
                        currentTab={currentTab}
                        defter={defter}
                        tatiller={tatiller}
                        wIndex={wIndex}
                        dersGetir={dersGetir}
                        durumDegistir={durumDegistir}
                        openPicker={openPicker}
                        fastSil={fastSil}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

      <div className="no-print" style={{ marginTop: 60, padding: '30px 0', borderTop: '1px dashed var(--border)', textAlign: 'center' }}>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 15 }}>⚠️ Eksik veya hatalı veriler mi görüyorsunuz?</p>
          <button 
            className="btn no-print" 
            onClick={programdanAktar} 
            disabled={pickerSaving}
            style={{ 
              background: 'var(--accent)', 
              color: '#fff', 
              border: 'none',
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
            onMouseOver={e => e.currentTarget.style.background = 'var(--accent-hover)'}
            onMouseOut={e => e.currentTarget.style.background = 'var(--accent)'}
          >
            <RefreshCw size={14} className={pickerSaving ? "animate-spin" : ""} />
            {pickerSaving ? 'Eşitleniyor...' : 'Ders Programı ile Eşitle'}
          </button>
          <div style={{ fontSize: 11, color: '#999', marginTop: 10 }}>Bu işlem, ders programındaki tüm kayıtları mevcut aya kopyalar.</div>
        </div>
      </div>

      {picker && (
        <div
          className="picker-overlay"
          onClick={() => setPicker(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 9000 }}
        >
          <div
            className="fast-picker"
            style={{
              position: 'fixed',
              top: (
                picker.rect.bottom + 320 > window.innerHeight
                  ? picker.rect.top - 320
                  : picker.rect.bottom + 6
              ),
              left: Math.min(
                Math.max(picker.rect.left, 8),
                window.innerWidth - 230
              ),
              zIndex: 9999,
              width: 220,
              maxHeight: 300,
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="picker-header">
              {picker.day} {AYLAR[picker.month || 1]} — {picker.dersNo >= 11 ? 'Koordinatör Seç' : 'Öğretmen Seç'}
            </div>
            <div className="picker-list" style={{ overflowY: 'auto', flex: 1 }}>
              {(() => {
                const filtered = personel.filter(p => {
                  if (p.aktif === false) return false;
                  const g = (p.gorev || '').toLowerCase()
                  if (picker.dersNo >= 11) {
                    return g.includes('koordinatör') || g.includes('koord') || g.includes('başkan')
                  }
                  return !['muhasebe', 'temizlik', 'başkan', 'denetim'].some(kw => g.includes(kw))
                })
                if (filtered.length === 0) {
                  return (
                    <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text3)', textAlign: 'center' }}>
                      {picker.dersNo >= 11 ? 'Koordinatör öğretmen bulunamadı' : 'Personel bulunamadı'}
                    </div>
                  )
                }
                return filtered.map(p => (
                  <button key={p.id} className="picker-item" onClick={() => directKaydet(p.id, picker)}>
                    {p.ad} <span style={{ fontSize: 10, opacity: 0.6 }}>- {p.gorev}</span>
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
            else if (conf.type === 'tatil') directKaydetGercek(conf.payload.personelId, conf.payload.pInfo)
          }}
          onIptal={() => setConf(null)}
        />
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }

        :global(.scroll-container) { scrollbar-width: thick; scrollbar-color: var(--accent) #e0e0e0; overflow: auto; }
        :global(.scroll-container::-webkit-scrollbar) { height: 12px !important; display: block !important; }
        :global(.scroll-container::-webkit-scrollbar-track) { background: var(--bg) !important; }
        :global(.scroll-container::-webkit-scrollbar-thumb) { background: var(--border) !important; border-radius: 8px; border: 3px solid var(--bg); }
        
        :global(.program-cell) { cursor: pointer; transition: all 0.2s; min-height: 60px; position: relative; }
        :global(.program-cell:hover) { background: #fffcf0 !important; box-shadow: inset 0 0 0 1px rgba(45,90,61,0.1); }
        
        :global(.btn-ata-mini) { width: 26px; height: 26px; border-radius: 50%; border: 1px dashed #ccc; background: #fff; cursor: pointer; color: #999; font-size: 16px; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s; }
        :global(.btn-ata-mini:hover) { background: var(--accent); color: #fff; border-style: solid; transform: scale(1.1); box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        
        :global(.cell-content) { position: relative; width: calc(100% - 6px); height: 100%; min-height: 54px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4px; margin: 0 3px; background: #f8f9fa; border: 1.5px solid #dee2e6; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); transition: border-color 0.15s; }
        :global(.program-cell:hover .cell-content) { border-color: #adb5bd; }
        
        :global(.fast-del-mini) { position: absolute; top: -8px; right: -8px; width: 22px; height: 22px; background: #fff; color: #e53e3e; border: 1px solid #eee; border-radius: 50%; font-size: 12px; display: none; align-items: center; justify-content: center; cursor: pointer; z-index: 10; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: all 0.2s; }
        :global(.program-cell:hover .fast-del-mini) { display: flex; }
        :global(.fast-del-mini:hover) { background: #ef4444; color: #fff; border-color: #ef4444; transform: scale(1.1); }
        
        :global(.status-badge) { margin-top: 4px; padding: 2px 6px; border-radius: 10px; font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3px; display: inline-block; }
        :global(.status-badge.geldi) { background: var(--accent); color: #fff; }
        :global(.status-badge.gelmedi) { background: #c53030; color: #fff; }

        :global(.add-btn-dash) { 
          color: var(--border); 
          font-size: 20px; 
          font-weight: 300; 
          opacity: 0.5; 
          transition: all 0.2s;
        }
        :global(.program-cell:hover .add-btn-dash) { color: var(--accent); opacity: 1; transform: scale(1.2); }
        
        @keyframes popIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        /* ── Picker ─────────────────────────────────── */
        .picker-overlay {
          position: fixed;
          inset: 0;
          z-index: 9000;
          background: transparent;
        }
        .fast-picker {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10);
          border: 1px solid #e5e7eb;
          overflow: hidden;
          animation: popIn 0.15s ease;
          min-width: 200px;
        }
        .picker-header {
          padding: 10px 14px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--accent);
          background: #f8faf8;
          border-bottom: 1px solid #e5e7eb;
        }
        .picker-list {
          max-height: 260px;
          overflow-y: auto;
          padding: 4px 0;
        }
        .picker-item {
          display: block;
          width: 100%;
          padding: 9px 14px;
          text-align: left;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          color: var(--text1, #111);
          border-radius: 0;
          transition: background 0.12s;
        }
        .picker-item:hover {
          background: #f0fdf4;
          color: var(--accent);
        }

        .print-only { display: none; }

        @media screen {
          :global(.tab-inactive) { display: none; }
        }

        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          :global(.no-print) { display: none !important; }
          .print-only { display: block !important; }
          :global(.scroll-outer) { overflow: visible !important; border: 1px solid #000 !important; border-radius: 0 !important; width: 100% !important; }
          :global(.scroll-container) { max-height: none !important; height: auto !important; overflow: visible !important; width: 100% !important; }
          table { width: 100% !important; table-layout: auto !important; border: 1px solid #000 !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #000 !important; color: #000 !important; position: static !important; }
          th { background: #f0f0f0 !important; color: #000 !important; }
          :global(.sinif-block) { border: none !important; margin-bottom: 0 !important; padding: 0 !important; overflow: visible !important; break-after: page; }
          :global(.tab-inactive) { display: block !important; }
          :global(.print-spacer) { display: block !important; height: 30px !important; }
          :global(.table-print-container) { break-inside: avoid; margin-bottom: 20px; width: 100%; overflow: visible !important; }
          body { background: #fff !important; padding: 0 !important; margin: 0 !important; overflow: visible !important; }
          .card { box-shadow: none !important; border: none !important; overflow: visible !important; }
          :global(.print-area) { zoom: 1 !important; transform: none !important; overflow: visible !important; }
          :global(.status-badge) { border: 1px solid #000 !important; color: #000 !important; background: transparent !important; }
        }
      `}</style>
    </div>
  )
}
