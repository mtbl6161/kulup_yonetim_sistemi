'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import Topbar from '@/components/Topbar'
import { useAy } from '@/lib/AyContext'
import { supabase } from '@/lib/supabase'
import { ayLabel, gunSayisi, haftaIciMi, tatilMi, fmtTL } from '@/lib/hesaplama'
import { Personel, Puantaj, Ayarlar, SinifDefteri, Tatil } from '@/lib/types'
import React from 'react'

export default function PuantajPage() {
  const { ay, yil } = useAy()
  const [personel, setPersonel] = useState<Personel[]>([])
  const [puantaj, setPuantaj] = useState<Puantaj[]>([])
  const [defter, setDefter] = useState<SinifDefteri[]>([])
  const [tatiller, setTatiller] = useState<Tatil[]>([])
  const [ayarlar, setAyarlar] = useState<Ayarlar | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeType, setActiveType] = useState<'kadrolu' | 'sgk'>('kadrolu')
  const [msg, setMsg] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const startDate = `${yil}-${String(ay).padStart(2, '0')}-01`
    const lastDay = gunSayisi(yil, ay)
    // lte filtresinin saat farkı nedeniyle son günü kaçırmaması için bir gün sonrasını veya tam günü hedefliyoruz
    const endDate = `${yil}-${String(ay).padStart(2, '0')}-${lastDay}T23:59:59`
    
    try {
      const [
        { data: per }, 
        { data: puan }, 
        { data: ayr }, 
        { data: sd },
        { data: tat }
      ] = await Promise.all([
        supabase.from('personel').select('*').order('ad'),
        supabase.from('puantaj').select('*').gte('tarih', startDate).lte('tarih', endDate),
        supabase.from('ayarlar').select('*').single(),
        supabase.from('sinif_defteri').select('*').or(`and(ay.eq.${ay},yil.eq.${yil}),ay.is.null`).eq('durum', 'geldi'),
        supabase.from('tatiller').select('*')
      ])
      
      setPersonel(per || [])
      setPuantaj(puan || [])
      setAyarlar(ayr)
      setDefter(sd || [])
      setTatiller(tat || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [ay, yil])

  useEffect(() => { load() }, [load])

  const handlePrint = useCallback(() => {
    const printArea = document.querySelector('.print-area') as HTMLElement | null
    if (!printArea) { window.print(); return }

    printArea.style.removeProperty('zoom')

    const table = printArea.querySelector('table') as HTMLElement | null
    const naturalWidth = table ? table.scrollWidth : printArea.scrollWidth

    // A4 yatay baskı alanı: 297mm − 12mm kenar ≈ 1075px (96 dpi)
    const a4PrintWidth = 1075
    const scale = Math.min(1, a4PrintWidth / naturalWidth)

    if (scale < 1) {
      printArea.style.zoom = scale.toFixed(4)
    }

    const cleanup = () => {
      printArea.style.removeProperty('zoom')
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)

    window.print()
  }, [])

  const daysInMonth = gunSayisi(yil, ay)
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Personel Kategorizasyonu (Yönergeye Göre)
  const categories = useMemo(() => {
    const cats = {
      egitim: [] as Personel[],    // Öğretmen, Usta Öğretici, Koordinatör (%55)
      yonetim: [] as Personel[],   // Başkan (%7), Başkan Yrd (%5)
      destek: [] as Personel[],    // Muhasebe (%2), Temizlik (%4)
      diger: [] as Personel[]
    }

    personel.forEach(p => {
      // Sadece aktif olan türe göre kategorize et
      const type = (p.personel_turu || '').toLowerCase().trim() === 'kadrolu' ? 'kadrolu' : 'sgk';
      const isDenetim = (p.gorev || '').toLowerCase().includes('denetim');
      if (type !== activeType || isDenetim) return;

      const gorev = (p.gorev || '').toLowerCase()
      if (gorev.includes('öğretmen') || gorev.includes('usta') || gorev.includes('koordinatör')) {
        cats.egitim.push(p)
      } else if (gorev.includes('başkan') || gorev.includes('müdür') || gorev.includes('denetim')) {
        cats.yonetim.push(p)
      } else if (gorev.includes('muhasebe') || gorev.includes('temizlik') || gorev.includes('beslenme')) {
        cats.destek.push(p)
      } else {
        cats.diger.push(p)
      }
    })

    return cats
  }, [personel, activeType])

  // Aktif Personel Listesi (Filtrelenmiş)
  const filteredPersonel = useMemo(() => {
    return personel.filter(p => {
      const type = (p.personel_turu || '').toLowerCase().trim() === 'kadrolu' ? 'kadrolu' : 'sgk';
      const isDenetim = (p.gorev || '').toLowerCase().includes('denetim');
      return type === activeType && !isDenetim;
    })
  }, [personel, activeType])

  // Puantaj Hücre Verisi
  const getPuantajValue = (personelId: number, day: number) => {
    // TATİL KONTROLÜ: Eğer o gün tatilse veri olsa bile 0 döndür
    if (tatilMi(ay, day, yil, tatiller)) return 0
    
    const targetDate = `${yil}-${String(ay).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const p = puantaj.find(x => 
      x.personel_id === personelId && 
      (x.tarih === targetDate || x.tarih.split('T')[0] === targetDate)
    )
    return p?.saat !== undefined ? Number(p.saat) : 0
  }

  // Veri Kaydetme
  const updatePuantaj = async (personelId: number, day: number, value: number) => {
    const tarih = `${yil}-${String(ay).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setSaving(true)
    try {
      // Şemadaki gerçek kolonlara (personel_id, tarih, saat) göre işlem yapıyoruz
      const { error } = await supabase.from('puantaj').upsert({
        personel_id: personelId,
        tarih,
        saat: value
      }, { onConflict: 'personel_id,tarih' })
      
      if (error) throw error
      
      // Local state güncelle
      setPuantaj(prev => {
        const filtered = prev.filter(x => !(x.personel_id === personelId && (x.tarih === tarih || x.tarih.startsWith(tarih))))
        return [...filtered, { personel_id: personelId, tarih, saat: value } as Puantaj]
      })
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // --- KRİTİK FONKSİYON: Sınıf Defterinden Aktar ---
  const syncFromClassNotebook = async () => {
    if (!confirm('Öğretmenlerin puantaj verileri Sınıf Defteri\'ndeki "geldi" kayıtlarına göre güncellenecektir. Devam edilsin mi?')) return
    
    setSaving(true)
    setMsg({ type: 'info', text: '🔄 Sınıf defteri verileri senkronize ediliyor...' })
    
    try {
      const startDate = `${yil}-${String(ay).padStart(2, '0')}-01`
      const lastDay = gunSayisi(yil, ay)
      const endDate = `${yil}-${String(ay).padStart(2, '0')}-${lastDay}T23:59:59`
      
      const ids = filteredPersonel.map(p => p.id)

      // --- ADIM 1: MEVCUT AYIN PUANTAJINI TEMİZLE (Sadece filtrelenmiş personel için) ---
      if (ids.length > 0) {
        const { error: delErr } = await supabase.from('puantaj').delete()
          .in('personel_id', ids)
          .gte('tarih', startDate)
          .lte('tarih', endDate)
        if (delErr) throw delErr
      }

      const dailyAttendance: Record<string, number> = {} 
      
      defter.forEach(d => {
        // Geriye dönük uyumluluk: ay null olanlar sadece kendi ayında işlensin
        const ayEslesti = d.ay === ay || (d.ay === null) 
        // TATİL KONTROLÜ: Tatil günlerini aktarma
        const tatil = tatilMi(ay, d.gun || 0, yil, tatiller)
        
        if (d.ogretmen_id && d.gun && ayEslesti && !tatil) {
          const key = `${d.ogretmen_id}-${d.gun}`
          const h = Number(d.etkinlik_saati) || 1
          dailyAttendance[key] = (dailyAttendance[key] || 0) + h
        }
      })

      const upserts = Object.entries(dailyAttendance).map(([key, hours]) => {
        const [oid, day] = key.split('-').map(Number)
        // Sadece bu ayın gün sınırları içindeyse ekle
        if (day < 1 || day > daysInMonth) return null
        
        const tarih = `${yil}-${String(ay).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        return {
          personel_id: oid,
          tarih,
          saat: hours
        }
      }).filter(Boolean) as any[]

      if (upserts.length === 0) {
        setMsg({ type: 'error', text: 'ℹ️ Sınıf defterinde bu ay için uygun kayıt bulunamadı.' })
        return
      }

      const { error } = await supabase.from('puantaj').upsert(upserts, { onConflict: 'personel_id,tarih' })
      if (error) throw error

      setMsg({ type: 'success', text: `✅ ${upserts.length} adet günlük puantaj kaydı güncellendi.` })
      load()
    } catch (err: any) {
      setMsg({ type: 'error', text: '❌ Aktarım Hatası: ' + err.message })
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(null), 5000)
    }
  }

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', paddingBottom: 50 }}>
      <Topbar 
        title="Resmi Puantaj Cetveli" 
        sub="Excel Formatında Görünüm"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm no-print" onClick={syncFromClassNotebook} disabled={saving}>
              🔄 Sınıf Defterinden Getir
            </button>
            <button className="btn btn-primary btn-sm no-print" onClick={handlePrint}>🖨️ Yazdır (PDF)</button>
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
              background: activeType === 'kadrolu' ? '#166534' : '#f1f5f9',
              color: activeType === 'kadrolu' ? '#fff' : '#475569',
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
              background: activeType === 'sgk' ? '#166534' : '#f1f5f9',
              color: activeType === 'sgk' ? '#fff' : '#475569',
              transition: 'all 0.2s'
            }}
          >
            💳 SGK'lı Personel
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
          <div style={{ overflowX: 'auto' }}>
            <table className="excel-table">
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
                        const d = new Date(x.tarih).getDate()
                        return !tatilMi(ay, d, yil, tatiller)
                      })
                      const total = isSabitSaatli ? 7 : filteredPuan.reduce((sum, x) => sum + (Number(x.saat) || 0), 0)
                      
                      return (
                        <tr key={p.id}>
                          <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ fontWeight: 600, fontSize: 12 }}>{p.ad}</td>
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
                    // SADECE EĞİTİM PERSONELİNİ TOPLA (%55 Havuzu)
                    const isEgitim = g.includes('öğretmen') || g.includes('usta') || g.includes('koordinatör')
                    if (!isEgitim) return sum

                    const pPuan = puantaj.filter(x => x.personel_id === p.id)
                    // TATİL SÜZGECİ EKLE
                    const filteredPuan = pPuan.filter(x => {
                      const d = new Date(x.tarih).getDate()
                      return !tatilMi(ay, d, yil, tatiller)
                    })
                    
                    return sum + filteredPuan.reduce((s, x) => s + (Number(x.saat) || 0), 0)
                  }, 0)

                  return (
                    <tr style={{ background: '#f0fdf4', fontWeight: 800 }}>
                      <td colSpan={daysInMonth + 3} style={{ textAlign: 'right', paddingRight: 20 }}>Okutulan Toplam Ders Saati ( {activeType.toUpperCase()} )</td>
                      <td style={{ textAlign: 'center', fontSize: 14, color: 'var(--accent)' }}>{totalAggregate}</td>
                      <td className="no-mobile"></td>
                    </tr>
                  )
                })()}

                {/* Boş Satırlar (Excel Görüntüsü İçin) */}
                {Array.from({ length: Math.max(0, 15 - personel.length) }).map((_, i) => (
                  <tr key={`empty-${i}`} className="empty-row">
                    <td style={{ textAlign: 'center' }}>{personel.length + i + 1}</td>
                    <td></td><td></td>
                    {daysArray.map(d => <td key={d} style={{ background: !haftaIciMi(yil, ay, d) ? '#e5e7eb' : '#fff' }}></td>)}
                    <td></td><td></td>
                  </tr>
                ))}
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
                    const d = new Date(x.tarih).getDate()
                    return !tatilMi(ay, d, yil, tatiller)
                  })
                  return sum + filteredPuan.reduce((s, x) => s + (Number(x.saat) || 0), 0)
                }, 0)}
              </span> 
              saat kulüp dersi okutulmuştur.
            </div>

            {/* İmza Bölümü */}
            {(() => {
              const baskan = ayarlar?.mudur_adi || '..........................'
              const baskanYrd = personel.find(p => (p.gorev || '').toLowerCase().includes('yardımcı'))?.ad || '..........................'

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
                      <span>Adı Soyadı</span><span>: {baskanYrd}</span>
                      <span>Unvanı</span><span>: Başkan Yardımcısı</span>
                      <span>İmza</span><span>: </span>
                    </div>
                  </div>

                  {/* Onaylayan */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontWeight: 800, marginBottom: 10, textDecoration: 'underline' }}>ONAYLAYAN</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', textAlign: 'left', gap: 4, width: '100%' }}>
                      <span>Adı Soyadı</span><span>: {baskan}</span>
                      <span>Unvanı</span><span>: Başkan</span>
                      <span>İmza</span><span>: </span>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
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
          background: #f1f5f9;
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
        .excel-input:focus { outline: 2px solid #2d5a3d; background: #fff; }
        .excel-input::-webkit-inner-spin-button { -webkit-appearance: none; }
        
        .empty-row td { height: 32px; }

        @media print {
          .no-print { display: none !important; }
          .print-area { box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: none !important; }
          body { background: white !important; }
          @page { size: landscape; margin: 1cm; }
        }
      `}</style>
    </div>
  )
}

const thS: React.CSSProperties = { border: '1px solid #333' }
const tdS: React.CSSProperties = { border: '1px solid #333' }
