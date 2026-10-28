'use client'
import { useState, useCallback, useMemo } from 'react'
import Topbar from '@/components/Topbar'
import { useAy } from '@/lib/AyContext'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { ayLabel, gunSayisi, haftaIciMi, tatilMi } from '@/lib/hesaplama'
import { pdfHazirla, pdfBaslik, pdfTablo, pdfImza, pdfSonY, pdfAc, PDF_RENK, PDF_KENAR } from '@/lib/pdf'
import type { RowInput, CellInput } from '@/lib/pdf'
import { Personel, Puantaj, Ayarlar, SinifDefteri, Tatil } from '@/lib/types'
import ConfirmModal from '@/components/ConfirmModal'
import { Download } from 'lucide-react'
import { hataMesaji } from '@/lib/hata'
import { useYukleme } from '@/lib/useYukleme'

export default function PuantajPage() {
  const { ay, yil } = useAy()
  const { profil } = useAuth()
// ... (state definitions same as before)
  const [personel, setPersonel] = useState<Personel[]>([])
  const [puantaj, setPuantaj] = useState<Puantaj[]>([])
  const [defter, setDefter] = useState<SinifDefteri[]>([])
  const [tatiller, setTatiller] = useState<Tatil[]>([])
  const [ayarlar, setAyarlar] = useState<Ayarlar | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeType, setActiveType] = useState<'kadrolu' | 'sgk'>('kadrolu')
  const [msg, setMsg] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null)
  const [conf, setConf] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const startDate = `${yil}-${String(ay).padStart(2, '0')}-01`
    const lastDay = gunSayisi(yil, ay)
    const endDate = `${yil}-${String(ay).padStart(2, '0')}-${lastDay}T23:59:59`
    
    try {
      const [{ data: per }, { data: puan }, { data: ayr }, { data: sd }, { data: tat }] = await Promise.all([
        supabase.from('personel').select('*').order('ad'),
        supabase.from('puantaj').select('*').gte('tarih', startDate).lte('tarih', endDate),
        supabase.from('ayarlar').select('*').single(),
        supabase.from('sinif_defteri').select('*').or(`and(ay.eq.${ay},yil.eq.${yil}),ay.is.null`).eq('durum', 'geldi'),
        supabase.from('tatiller').select('*').or(`okul_id.eq.${profil?.okul_id ?? 0},okul_id.is.null`)
      ])
      setPersonel(per || [])
      setPuantaj(puan || [])
      setAyarlar(ayr)
      setDefter(sd || [])
      setTatiller(tat || [])
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [ay, yil])

  useYukleme(load)

  const daysInMonth = gunSayisi(yil, ay)
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const filteredPersonel = useMemo(() => {
    return personel.filter(p => {
      const gorev = (p.gorev || '').toLowerCase();
      if (gorev.includes('denetim')) return false;

      const type = p.sgk_li ? 'sgk' : 'kadrolu';
      if (type !== activeType) return false;

      if (p.aktif !== false) return true;
      const hasHours = puantaj.some(x => x.personel_id === p.id && Number(x.saat) > 0);
      return hasHours;
    })
  }, [personel, activeType, puantaj])

  const handlePdfDownload = async () => {
    const { pdf, autoTable } = await pdfHazirla('landscape')
    const PW = pdf.internal.pageSize.getWidth()
    const M = PDF_KENAR
    const baslangicY = pdfBaslik(pdf, {
      kurum: ayarlar?.kurum_adi,
      baslik: `Resmî puantaj cetveli · ${activeType === 'kadrolu' ? 'Kadrolu' : "SGK'lı"}`,
      alt: ayLabel(ay, yil),
    })

    const daysInMonth = gunSayisi(yil, ay)
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1)
// ... (Priority and Sort logic same)
    // Rol Önceliği (Tablo sıralaması için)
    const getPriority = (gorev: string = '') => {
      const g = gorev.toLowerCase();
      if (g.includes('başkan') && !g.includes('yardımcısı')) return 1;
      if (g.includes('yardımcısı') || g.includes('müdür')) return 2;
      if (g.includes('denetim')) return 3;
      if (g.includes('koordinatör')) return 4;
      if (g.includes('öğretmen')) return 5;
      if (g.includes('usta')) return 6;
      if (g.includes('muhasebe') || g.includes('memur')) return 7;
      if (g.includes('temizlik') || g.includes('hizmet')) return 8;
      return 9;
    };

    const sorted = [...filteredPersonel].sort((a, b) => {
      const p1 = getPriority(a.gorev);
      const p2 = getPriority(b.gorev);
      if (p1 !== p2) return p1 - p2;
      return (a.ad || '').localeCompare(b.ad || '', 'tr');
    });

    const ROW1: CellInput[] = [
      { content: 'S.N.', rowSpan: 2 },
      { content: 'ADI SOYADI', rowSpan: 2 },
      { content: 'GÖREVİ', rowSpan: 2 },
      { content: 'GÜNLER', colSpan: daysInMonth, styles: { halign: 'center' } },
      { content: 'TOPLAM', rowSpan: 2 },
      { content: 'İMZA', rowSpan: 2 }
    ]
    const ROW2: CellInput[] = daysArray.map(d => ({ 
      content: d.toString(), 
      styles: { 
        halign: 'center', 
        textColor: !haftaIciMi(yil, ay, d) ? PDF_RENK.kapaliMetin : PDF_RENK.metin,
        fillColor: !haftaIciMi(yil, ay, d) ? PDF_RENK.kapaliZemin : PDF_RENK.baslikZemin 
      } 
    }))

    const body = sorted.map((p, idx) => {
      const days = daysArray.map(d => {
        const val = getPuantajValue(p.id, d)
        return val > 0 ? val.toString() : ''
      })
      
      const g = (p.gorev || '').toLowerCase()
      const isSabitSaatli = g.includes('temizlik') || g.includes('muhasebe')
      const pPuan = puantaj.filter(x => x.personel_id === p.id)
      const filteredPuan = pPuan.filter(x => {
        const d = Number(x.tarih.split('T')[0].split('-')[2])
        return !tatilMi(ay, d, yil, tatiller)
      })
      const total = isSabitSaatli ? 7 : filteredPuan.reduce((sum, x) => sum + (Number(x.saat) || 0), 0)

      return [
        (idx + 1).toString(),
        p.ad + (p.aktif === false ? ' (Ayrıldı)' : ''),
        p.gorev,
        ...days,
        total.toString(),
        ''
      ]
    })

    const totalAggregate = filteredPersonel.reduce((sum, p) => {
      const g = (p.gorev || '').toLowerCase()
      const isEgitim = g.includes('öğretmen') || g.includes('usta') || g.includes('koordinatör')
      if (!isEgitim) return sum
      const pPuan = puantaj.filter(x => x.personel_id === p.id)
      const filteredPuan = pPuan.filter(x => {
        const d = new Date(x.tarih).getDate()
        return !tatilMi(ay, d, yil, tatiller)
      })
      return sum + filteredPuan.reduce((s, x) => s + (Number(x.saat) || 0), 0)
    }, 0)

    const foot: RowInput[] = [[
      { content: `OKUTULAN TOPLAM DERS SAATİ ( ${activeType.toUpperCase()} )`, colSpan: daysInMonth + 3, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: totalAggregate.toString(), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: '' }
    ]]

    autoTable(pdf, pdfTablo({
      head: [ROW1, ROW2],
      body,
      foot,
      startY: baslangicY,
      styles: { fontSize: 6.5, cellPadding: 0.8 },
      columnStyles: {
        0: { cellWidth: 6, halign: 'center' },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        [daysInMonth + 3]: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
        [daysInMonth + 4]: { cellWidth: 15 }
      },
      didParseCell: (data) => {
        // Gün sütunları (3'ten 3+daysInMonth-1'e kadar)
        if (data.column.index >= 3 && data.column.index < daysInMonth + 3) {
          data.cell.styles.cellWidth = (PW - 2 * M - 6 - 30 - 25 - 15 - 15) / daysInMonth
          data.cell.styles.halign = 'center'
          
          // Hafta sonu boyaması (body ve foot için de geçerli olsun)
          const dayIndex = data.column.index - 3
          const day = daysArray[dayIndex]
          if (day && !haftaIciMi(yil, ay, day)) {
            data.cell.styles.fillColor = PDF_RENK.kapaliZemin
          }
        }
      }
    }))

    pdfImza(pdf, {
      duzenleyen_adi: ayarlar?.duzenleyen_adi,
      duzenleyen_unvani: ayarlar?.duzenleyen_unvani || 'Büro Personeli',
      mudur_adi: ayarlar?.mudur_adi,
      mudur_unvani: ayarlar?.mudur_unvani || 'Okul Müdürü / Kulüp Başkanı',
    }, pdfSonY(pdf, 150))

    pdfAc(pdf, 'Puantaj cetveli')
  }


  const getPuantajValue = (personelId: number, day: number) => {
    if (tatilMi(ay, day, yil, tatiller)) return 0
    const targetDate = `${yil}-${String(ay).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const p = puantaj.find(x => x.personel_id === personelId && (x.tarih === targetDate || x.tarih.split('T')[0] === targetDate))
    return p?.saat !== undefined ? Number(p.saat) : 0
  }

  const updatePuantaj = async (personelId: number, day: number, value: number) => {
    const tarih = `${yil}-${String(ay).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSaving(true)
    try {
      const payload: Record<string, unknown> = { personel_id: personelId, tarih, saat: value }
      if (profil?.okul_id) payload.okul_id = profil.okul_id
      const { error } = await supabase.from('puantaj').upsert(payload, { onConflict: 'personel_id,tarih' })
      if (error) throw error
      setPuantaj(prev => {
        const filtered = prev.filter(x => !(x.personel_id === personelId && (x.tarih === tarih || x.tarih.startsWith(tarih))))
        return [...filtered, { personel_id: personelId, tarih, saat: value } as Puantaj]
      })
    } catch (err) { console.error(err) } finally { setSaving(false) }
  }

  const syncFromClassNotebook = async () => setConf(true)
  const syncFromClassNotebookGercek = async () => {
    setConf(false); setSaving(true); setMsg({ type: 'info', text: '🔄 Sınıf defteri verileri senkronize ediliyor...' })
    try {
      const startDate = `${yil}-${String(ay).padStart(2, '0')}-01`
      const lastDay = gunSayisi(yil, ay)
      const endDate = `${yil}-${String(ay).padStart(2, '0')}-${lastDay}T23:59:59`
      const ids = filteredPersonel.map(p => p.id)
      if (ids.length > 0) {
        const { error: delErr } = await supabase.from('puantaj').delete().in('personel_id', ids).gte('tarih', startDate).lte('tarih', endDate)
        if (delErr) throw delErr
      }
      const dailyAttendance: Record<string, number> = {} 
      defter.forEach(d => {
        const ayEslesti = d.ay === ay || (d.ay === null) 
        const tatil = tatilMi(ay, d.gun || 0, yil, tatiller)
        if (d.ogretmen_id && d.gun && ayEslesti && !tatil && haftaIciMi(d.yil || yil, d.ay || ay, d.gun)) {
          const key = `${d.ogretmen_id}-${d.gun}`
          const h = Number(d.etkinlik_saati) || 1
          dailyAttendance[key] = (dailyAttendance[key] || 0) + h
        }
      })
      const upserts = Object.entries(dailyAttendance).map(([key, hours]) => {
        const [oid, day] = key.split('-').map(Number)
        if (day < 1 || day > daysInMonth) return null
        const tarih = `${yil}-${String(ay).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const row: Record<string, unknown> = { personel_id: oid, tarih, saat: hours }
        if (profil?.okul_id) row.okul_id = profil.okul_id
        return row
      }).filter((r): r is Record<string, unknown> => r !== null)
      if (upserts.length === 0) { setMsg({ type: 'error', text: 'ℹ️ Sınıf defterinde bu ay için uygun kayıt bulunamadı.' }); return }
      const { error } = await supabase.from('puantaj').upsert(upserts, { onConflict: 'personel_id,tarih' })
      if (error) throw error
      setMsg({ type: 'success', text: `✅ ${upserts.length} adet günlük puantaj kaydı güncellendi.` }); load()
    } catch (err) { setMsg({ type: 'error', text: '❌ Aktarım Hatası: ' + hataMesaji(err) }) } finally { setSaving(false); setTimeout(() => setMsg(null), 5000) }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 50 }}>
      <Topbar 
        title="Resmi Puantaj Cetveli" 
        sub="Excel Formatında Görünüm"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm no-print" onClick={syncFromClassNotebook} disabled={saving}>
              🔄 Sınıf Defterinden Getir
            </button>
            <button className="btn btn-pdf btn-sm no-print" onClick={handlePdfDownload}>
              <Download size={14} style={{ marginRight: 4 }} /> PDF İndir
            </button>
          </div>
        }
      />

      <div className="print-area" style={{ 
        maxWidth: 1400, 
        margin: '20px auto', 
        background: '#fff', 
        padding: '30px', 
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        borderRadius: 8
      }}>
        {msg && <div className="no-print"><div className={`alert alert-${msg.type === 'error' ? 'danger' : msg.type}`} style={{ marginBottom: 20 }}>{msg.text}</div></div>}

        {/* Sekme Seçimi */}
        <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid #e2e8f0', paddingBottom: 15 }}>
          <button 
            onClick={() => setActiveType('kadrolu')}
            style={{
              padding: '8px 20px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
              background: activeType === 'kadrolu' ? 'var(--accent)' : 'var(--surface2)',
              color: activeType === 'kadrolu' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s'
            }}
          >
            🏛️ Kadrolu Personel
          </button>
          <button 
            onClick={() => setActiveType('sgk')}
            style={{
              padding: '8px 20px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 13,
              background: activeType === 'sgk' ? 'var(--accent)' : 'var(--surface2)',
              color: activeType === 'sgk' ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s'
            }}
          >
            💳 SGK’lı Personel
          </button>
        </div>

        {/* Resmi Başlık */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, borderBottom: '2px solid #333', paddingBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            OKUL VEYA KURUMU: <span style={{ textDecoration: 'underline' }}>{ayarlar?.kurum_adi || 'TÜRKİYE YÜZYILI ANAOKULU'}</span>
          </div>
          <div style={{ display: 'flex', gap: 40, fontSize: 13, fontWeight: 700 }}>
            <div>AİT OLDUĞU AY: <span style={{ textDecoration: 'underline' }}>{ayLabel(ay, yil).split(' ')[0].toUpperCase()}</span></div>
            <div>BÜTÇE YILI: <span style={{ textDecoration: 'underline' }}>{yil}</span></div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>Yükleniyor...</div>
        ) : (
          <>
          <div className="no-print" style={{ display: 'none', fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textAlign: 'center' }} id="scroll-hint">
            ← Tabloyu görmek için sağa kaydırın →
          </div>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="excel-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th rowSpan={2} style={{ width: 40 }}>Sıra No</th>
                  <th rowSpan={2} style={{ width: 220 }}>Adı Soyadı</th>
                  <th rowSpan={2} style={{ width: 150 }}>Kayıt Türü</th>
                  <th colSpan={daysInMonth} style={{ textAlign: 'center' }}>Günler</th>
                  <th rowSpan={2} style={{ width: 60 }}>Toplam</th>
                  <th rowSpan={2} style={{ width: 100 }} className="no-mobile">İmza</th>
                </tr>
                <tr>
                  {daysArray.map(d => {
                    const isWeekend = !haftaIciMi(yil, ay, d)
                    return (
                      <th key={d} style={{ 
                        width: 28, 
                        minWidth: 28, 
                        fontSize: 10,
                        background: isWeekend ? '#ccc' : '#fff' 
                      }}>
                        {d}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Rol Önceliği Tanımla (Kurumsal Rapor Formatı)
                  const getPriority = (gorev: string = '') => {
                    const g = gorev.toLowerCase();
                    if (g.includes('başkan') && !g.includes('yardımcısı')) return 1;
                    if (g.includes('yardımcısı') || g.includes('müdür')) return 2;
                    if (g.includes('denetim')) return 3;
                    if (g.includes('koordinatör')) return 4;
                    if (g.includes('öğretmen')) return 5;
                    if (g.includes('usta')) return 6;
                    if (g.includes('muhasebe') || g.includes('memur')) return 7;
                    if (g.includes('temizlik') || g.includes('hizmet')) return 8;
                    return 9;
                  };

                  const sorted = [...filteredPersonel].sort((a, b) => {
                    const p1 = getPriority(a.gorev);
                    const p2 = getPriority(b.gorev);
                    if (p1 !== p2) return p1 - p2;
                    return (a.ad || '').localeCompare(b.ad || '', 'tr');
                  });

                  return sorted.length === 0 ? (
                    <tr><td colSpan={daysInMonth + 5} style={{ textAlign: 'center', padding: 20 }}>Personel kaydı bulunamadı.</td></tr>
                  ) : (
                    sorted.map((p, idx) => {
                      const pPuan = puantaj.filter(x => x.personel_id === p.id)
                      const g = (p.gorev || '').toLowerCase()
                      const isSabitSaatli = g.includes('temizlik') || g.includes('muhasebe')
                      const filteredPuan = pPuan.filter(x => {
                        const d = Number(x.tarih.split('T')[0].split('-')[2])
                        return !tatilMi(ay, d, yil, tatiller)
                      })
                      const total = isSabitSaatli ? 7 : filteredPuan.reduce((sum, x) => sum + (Number(x.saat) || 0), 0)
                      
                      return (
                        <tr key={p.id}>
                          <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ fontWeight: 600, fontSize: 12 }}>
                            {p.ad}
                            {p.aktif === false && <span style={{ color: 'var(--danger)', fontSize: 10, marginLeft: 6 }} className="no-print"> (Ayrıldı)</span>}
                          </td>
                          <td style={{ fontSize: 11 }}>{p.gorev}</td>
                          {daysArray.map(d => {
                            const val = getPuantajValue(p.id, d)
                            const isWeekend = !haftaIciMi(yil, ay, d)
                            const isHoliday = tatilMi(ay, d, yil, tatiller)
                            
                            return (
                              <td key={d} style={{ 
                                padding: '4px', 
                                background: (isWeekend || isHoliday) ? '#e5e7eb' : '#fff',
                                textAlign: 'center',
                                fontSize: 13,
                                fontWeight: val > 0 ? 700 : 400,
                                color: val > 0 ? 'var(--accent)' : '#ccc'
                              }}>
                                {val || ''}
                              </td>
                            )
                          })}
                          <td style={{ textAlign: 'center', fontWeight: 700, background: '#f9fafb' }}>{total}</td>
                          <td className="no-mobile"></td>
                        </tr>
                      )
                    })
                  );
                })()}

                {/* Genel Toplam Satırı - Sadece %55 Havuzuna Giren Eğitim Personeli (Öğretmen/Koord) */}
                {(() => {
                  const totalAggregate = filteredPersonel.reduce((sum, p) => {
                    const g = (p.gorev || '').toLowerCase()
                    const isEgitim = g.includes('öğretmen') || g.includes('usta') || g.includes('koordinatör')
                    if (!isEgitim) return sum
                    const pPuan = puantaj.filter(x => x.personel_id === p.id)
                    const filteredPuan = pPuan.filter(x => {
                      const d = Number(x.tarih.split('T')[0].split('-')[2])
                      return !tatilMi(ay, d, yil, tatiller)
                    })
                    return sum + filteredPuan.reduce((s, x) => s + (Number(x.saat) || 0), 0)
                  }, 0)

                  if (filteredPersonel.length === 0) return null;

                  return (
                    <tr style={{ background: '#f0fdf4', fontWeight: 800 }}>
                      <td colSpan={daysInMonth + 3} style={{ textAlign: 'right', paddingRight: 20 }}>Okutulan Toplam Ders Saati ( {activeType.toUpperCase()} )</td>
                      <td style={{ textAlign: 'center', fontSize: 14, color: 'var(--accent)' }}>{totalAggregate}</td>
                      <td className="no-mobile"></td>
                    </tr>
                  )
                })()}
              </tbody>
            </table>

            {/* Footer Metin */}
            <div style={{ marginTop: 20, fontSize: 12, fontWeight: 600 }}>
              Yukarıda belirtilen görevlilerce {yil}-{ayLabel(ay, yil).split(' ')[0]} ayında toplam 
              <span style={{ padding: '0 10px', textDecoration: 'underline' }}>
                {filteredPersonel.reduce((sum, p) => {
                  const g = (p.gorev || '').toLowerCase()
                  const isEgitim = g.includes('öğretmen') || g.includes('usta') || g.includes('koordinatör')
                  if (!isEgitim) return sum
                  
                  const pPuan = puantaj.filter(x => x.personel_id === p.id)
                  const filteredPuan = pPuan.filter(x => {
                    const d = Number(x.tarih.split('T')[0].split('-')[2])
                    return !tatilMi(ay, d, yil, tatiller)
                  })
                  return sum + filteredPuan.reduce((s, x) => s + (Number(x.saat) || 0), 0)
                }, 0)}
              </span> 
              saat kulüp dersi okutulmuştur.
            </div>

            {/* İmza Bölümü */}
            {(() => {
              const duzenleyenAdi   = ayarlar?.duzenleyen_adi   ?? '..........................'
              const duzenleyenUnvan = ayarlar?.duzenleyen_unvani ?? 'Büro Personeli'
              const onaylayanAdi    = ayarlar?.mudur_adi         ?? '..........................'
              const onaylayanUnvan  = 'Okul Müdürü / Kulüp Başkanı'

              return (
                <div style={{ 
                  marginTop: 60, 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: 100,
                  padding: '0 40px',
                  fontSize: 13
                }}>
                  {/* Düzenleyen */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontWeight: 800, marginBottom: 10, textDecoration: 'underline' }}>DÜZENLEYEN</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', textAlign: 'left', gap: 4, width: '100%' }}>
                      <span>Adı Soyadı</span><span>: {duzenleyenAdi}</span>
                      <span>Unvanı</span><span>: {duzenleyenUnvan}</span>
                      <span>İmza</span><span>: </span>
                    </div>
                  </div>

                  {/* Onaylayan */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontWeight: 800, marginBottom: 10, textDecoration: 'underline' }}>ONAYLAYAN</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', textAlign: 'left', gap: 4, width: '100%' }}>
                      <span>Adı Soyadı</span><span>: {onaylayanAdi}</span>
                      <span>Unvanı</span><span>: {onaylayanUnvan}</span>
                      <span>İmza</span><span>: </span>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
          </>
        )}
      </div>

      <style jsx>{`
        .excel-table {
          width: 100%;
          border-collapse: collapse;
          font-family: sans-serif;
          border: 2px solid #333;
        }
        .excel-table th, .excel-table td {
          border: 1px solid #333;
          padding: 4px;
          height: 32px;
        }
        .excel-table th {
          background: var(--surface2);
          font-size: 11px;
          font-weight: 800;
        }
        .excel-input {
          width: 100%;
          height: 32px;
          border: none;
          text-align: center;
          font-size: 11px;
          font-weight: 700;
          background: transparent;
        }
        .excel-input:focus { outline: 2px solid var(--accent); background: #fff; }
        .excel-input::-webkit-inner-spin-button { -webkit-appearance: none; }

        .empty-row td { height: 32px; }

        #scroll-hint { display: none; }

        @media (max-width: 768px) {
          #scroll-hint { display: block !important; }
        }

        @media print {
          .no-print { display: none !important; }
          .print-area { box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: none !important; }
          body { background: white !important; }
          @page { size: landscape; margin: 1cm; }
        }
      `}</style>
      {conf && (
        <ConfirmModal
          baslik="Sınıf Defterinden Aktar"
          mesaj="Öğretmenlerin puantaj verileri Sınıf Defteri'ndeki 'geldi' kayıtlarına göre güncellenecektir. Mevcut verilerin üzerine yazılabilir. Devam edilsin mi?"
          onayMetni="Evet, Aktar"
          onOnayla={syncFromClassNotebookGercek}
          onIptal={() => setConf(false)}
        />
      )}
    </div>
  )
}
