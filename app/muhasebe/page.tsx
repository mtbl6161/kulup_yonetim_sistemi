'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Calculator, FileText, TrendingUp, Landmark, FileDown, AlertTriangle, CheckCircle2, Download } from 'lucide-react'
import StatCard from '@/components/StatCard'
import { AYLAR } from '@/lib/hesaplama'
import { useAy } from '@/lib/AyContext'
import { uyari } from '@/lib/diyalog'
import type { Ayarlar, Bordro, Personel } from '@/lib/types'
import { useYukleme } from '@/lib/useYukleme'
import { useAuth } from '@/lib/AuthContext'
import { EKSIK_GUN_NEDENLERI, eksikGunAdi, eksikGunSayisi, primGunu } from '@/lib/sgkEksikGun'
import type { EksikGunKaydi } from '@/lib/sgkEksikGun'

// Sorgu personel(*) ile birleştirir; her bordro satırının personeli vardır
type MuhasebeSatir = Bordro & { personel: Personel }

export default function MuhasebePage() {
  const [, setLoading] = useState(false)
  const { ay: activeMonth, yil: activeYear } = useAy()

  const [settings, setSettings] = useState<Ayarlar | null>(null)
  const [payrollData, setPayrollData] = useState<MuhasebeSatir[]>([])
  const { okul } = useAuth()
  // personel_id → seçilen eksik gün nedeni; tablo yoksa (migration çalıştırılmadı) null
  const [eksikler, setEksikler] = useState<Record<number, EksikGunKaydi> | null>({})

  const fetchData = async () => {
    setLoading(true)
    const { data: ayar } = await supabase.from('ayarlar').select('*').single()
    const { data: bordro } = await supabase.from('bordro').select('*, personel(*)').eq('yil', activeYear).eq('ay', activeMonth)
    const { data: eg, error: egHata } = await supabase.from('sgk_eksik_gun').select('*').eq('yil', activeYear).eq('ay', activeMonth)
    setEksikler(egHata ? null : Object.fromEntries((eg || []).map((k: EksikGunKaydi) => [k.personel_id, k])))

    setSettings(ayar)
    setPayrollData(bordro || [])
    setLoading(false)
  }

  useYukleme(() => {
    fetchData()
  }, [activeMonth, activeYear])

  async function eksikKaydet(personelId: number, kod: string, aciklama: string | null) {
    const onceki = eksikler?.[personelId]
    const kayit: EksikGunKaydi = { personel_id: personelId, yil: activeYear, ay: activeMonth, kod, aciklama: aciklama?.trim() || null }
    setEksikler(e => ({ ...(e || {}), [personelId]: kayit }))
    const { error } = kod
      ? await supabase.from('sgk_eksik_gun').upsert({ ...kayit, okul_id: okul?.id }, { onConflict: 'personel_id,yil,ay' })
      : await supabase.from('sgk_eksik_gun').delete().eq('personel_id', personelId).eq('yil', activeYear).eq('ay', activeMonth)
    if (error) setEksikler(e => ({ ...(e || {}), ...(onceki ? { [personelId]: onceki } : {}) }))
  }

  // Hata Denetimi
  const hatalar = payrollData.filter(b => {
    const p = b.personel
    if (!p) return false
    return !p.tc || p.tc.length !== 11 || (p.sgk_li && !p.meslek_kodu) || !p.iban || p.iban.length < 10
  })

  const generateBankList = () => {
    if (payrollData.length === 0) return uyari('Ödeme verisi bulunamadı!')
    
    // Excel'in Türkçe karakterleri tanıması için BOM ekliyoruz
    let csv = '\uFEFFAd Soyad;IBAN;Net Odenecek;TC Kimlik No\n'
    
    payrollData.forEach(b => {
      const net = b.net || 0
      const ad = (b.personel?.ad || 'BILSIZ').toUpperCase()
      const iban = b.personel?.iban || ''
      const tc = b.personel?.tc || ''
      
      csv += `${ad};${iban};${net.toFixed(2).replace('.', ',')};${tc}\n`
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Banka_Odeme_Listesi_${activeYear}_${activeMonth}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const matrahlar = (() => {
    const summary = [
      { kod: '011', label: '011 (Asgari Ücretli - Hizmet)', gayrisafi: 0, kesinti: 0 },
      { kod: '012', label: '012 (Diğer Ücretli - Öğretmen)', gayrisafi: 0, kesinti: 0 },
      { kod: '018', label: '018 (Ek Ders / Huzur Hakkı)', gayrisafi: 0, kesinti: 0 },
      { kod: '302', label: '302 (Damga Vergisi - Toplam)', gayrisafi: 0, kesinti: 0 }
    ]

    payrollData.forEach(b => {
      const g = (b.personel?.gorev || '').toLowerCase()
      const isAdmin = g.includes('başkan') || g.includes('muhasebe') || g.includes('denetim') || g.includes('müdür')
      const isTeacher = g.includes('öğretmen') || g.includes('usta') || g.includes('koordinatör')
      
      if (b.personel?.personel_turu === 'kadrolu' || isAdmin) {
        summary[2].gayrisafi += (b.brut || 0)
        summary[2].kesinti += (b.gv_tutar || 0)
      } else if (isTeacher) {
        summary[1].gayrisafi += (b.brut || 0)
        summary[1].kesinti += (b.gv_tutar || 0)
      } else {
        summary[0].gayrisafi += (b.brut || 0)
        summary[0].kesinti += (b.gv_tutar || 0)
      }

      summary[3].gayrisafi += (b.brut || 0)
      summary[3].kesinti += (b.damga_tutar || 0)
    })

    return summary
  })()

  const totalBrut = payrollData.reduce((sum: number, b) => sum + (b.brut || 0), 0)
  const totalNet = payrollData.reduce((sum: number, b) => sum + (b.net || 0), 0)
  const totalGV = matrahlar.filter(m => m.kod !== '302').reduce((sum: number, m) => sum + m.kesinti, 0)
  const totalDV = matrahlar.find(m => m.kod === '302')?.kesinti || 0

  const generateXML = () => {
    if (!settings) return uyari('Ayarlar yüklenemedi!')
    
    const xml = `<?xml version="1.0" encoding="ISO-8859-9"?>
<beyanname kod="MUHSGK" versiyon="21">
  <genelBilgiler>
    <vergiDairesiKodu>${settings.vergi_dairesi_kodu || '045260'}</vergiDairesiKodu>
    <donemTip>Aylık</donemTip>
    <yil>${activeYear}</yil>
    <ay>${String(activeMonth).padStart(2, '0')}</ay>
    <mukellef>
      <vkn>${settings.vergi_no || ''}</vkn>
      <unvan>${settings.kurum_adi || ''}</unvan>
    </mukellef>
  </genelBilgiler>
  <muhSGK>
    <matrahVeVergiBildirimi>
      ${matrahlar.filter((m) => m.gayrisafi > 0).map((m) => `
      <tevkifatSatiri>
        <turKod>${m.kod}</turKod>
        <gayrisafiTutar>${m.gayrisafi.toFixed(2)}</gayrisafiTutar>
        <vergiKesintiTutari>${m.kesinti.toFixed(2)}</vergiKesintiTutari>
      </tevkifatSatiri>`).join('')}
    </matrahVeVergiBildirimi>
    <vergiBildirimi>
      <tahakkukEdenVergiler>
        <vergiKodu>0003</vergiKodu>
        <vergiTutari>${totalGV.toFixed(2)}</vergiTutari>
      </tahakkukEdenVergiler>
      <tahakkukEdenVergiler>
        <vergiKodu>1046</vergiKodu>
        <vergiTutari>${totalDV.toFixed(2)}</vergiTutari>
      </tahakkukEdenVergiler>
      <tahakkukEdenVergiler>
        <vergiKodu>1048</vergiKodu>
        <vergiTutari>${(settings?.beyanname_damga_vergisi || 939.70).toFixed(2)}</vergiTutari>
      </tahakkukEdenVergiler>
    </vergiBildirimi>
    <sgkBilgileri>
      ${payrollData.filter((b) => b.personel?.sgk_li).map((b) => `
      <sigortaliCalisanBilgileri>
        <tcKimlikNo>${b.personel.tc || ''}</tcKimlikNo>
        <ad>${b.personel.ad.split(' ')[0]?.toUpperCase() || ''}</ad>
        <soyad>${b.personel.ad.split(' ').slice(1).join(' ')?.toUpperCase() || ''}</soyad>
        <primOdemeGunu>${Math.min(30, Math.round(b.toplam_saat / 7.5)) || 1}</primOdemeGunu>
        <hakEdilenUcret>${b.brut.toFixed(2)}</hakEdilenUcret>
        <meslekKodu>${b.personel.meslek_kodu || ''}</meslekKodu>
      </sigortaliCalisanBilgileri>`).join('')}
    </sgkBilgileri>
  </muhSGK>
  <duzenleyenBilgileri>
    <tcKimlikNo>${settings.vergi_no || ''}</tcKimlikNo>
    <ad>${settings.mudur_adi?.split(' ')[0]?.toUpperCase() || ''}</ad>
    <soyad>${settings.mudur_adi?.split(' ').slice(1).join(' ')?.toUpperCase() || ''}</soyad>
  </duzenleyenBilgileri>
</beyanname>`

    const blob = new Blob([xml], { type: 'text/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `MUHSGK_${settings.vergi_no}_${activeYear}_${activeMonth}.xml`
    a.click()
    URL.revokeObjectURL(url)
  }

  const generateSGKXML = () => {
    if (!settings) return uyari('Ayarlar yüklenemedi!')
    if (!settings.sgk_sicil_no) return uyari('SGK Sicil No ayarlar sayfasında tanımlanmamış!')

    const filteredEmployees = payrollData.filter((b) => b.personel?.sgk_li)
    const nedensiz = filteredEmployees.filter(b => eksikGunSayisi(primGunu(b.toplam_saat)) > 0 && !eksikler?.[b.personel_id]?.kod)
    if (nedensiz.length) return uyari(`Eksik günü olan personel için SGK eksik gün nedeni seçilmemiş: ${nedensiz.map(b => b.personel.ad).join(', ')}. Aşağıdaki bildirge taslağından nedeni seçin.`)

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<AYLIKBILDIRGELER>
  <ISYERI ISYERISICIL="${settings.sgk_sicil_no}" KONTROLNO="${settings.sgk_kontrol_no || '00'}" ISYERIARACINO="${settings.sgk_araci_no || '000'}" ISYERIUNVAN="${(settings.kurum_adi || '').toUpperCase()}" ISYERIADRES="${(settings.adres || '').toUpperCase()}" ISYERIVERGINO="${settings.vergi_no}" />
  <BORDRO DONEMAY="${activeMonth}" DONEMYIL="${activeYear}" BELGEMAHIYET="A" />
  <BILDIRGELER BELGETURU="${settings.sgk_belge_turu || '01'}" KANUN="${settings.sgk_kanun_no || '05510'}">
    <SIGORTALILAR>
      ${filteredEmployees.map((b, index: number) => {
        const ad = (b.personel.ad.split(' ')[0] || '').toUpperCase()
        const soyad = (b.personel.ad.split(' ').slice(1).join(' ') || '').toUpperCase()
        const gun = primGunu(b.toplam_saat)
        const g = (b.personel.gorev || '').toLowerCase()
        const is011 = g.includes('temizlik') || g.includes('hizmet') || g.includes('büro') || g.includes('bakım') || g.includes('memur')
        
        let ucret = b.brut
        let ikramiye = 0
        if (is011 && settings?.asgari_ucret) {
          const gunlukAsgari = settings.asgari_ucret / 30
          ucret = Math.min(b.brut, gunlukAsgari * gun)
          ikramiye = Math.max(0, b.brut - ucret)
        }
        
        const eksikGun = eksikGunSayisi(gun)
        return `<SIGORTALI SIRA="${index + 1}" TCKNO="${b.personel.tc}" AD="${ad}" SOYAD="${soyad}" PEK="${b.brut.toFixed(2)}" PRIM_IKRAMIYE="${ikramiye.toFixed(2)}" GUN="${gun}" EKSIKGUNSAYISI="${eksikGun > 0 ? eksikGun : ''}" EKSIKGUNNEDENI="${eksikGun > 0 ? eksikler?.[b.personel_id]?.kod ?? '' : ''}" MESLEKKOD="${b.personel.meslek_kodu || ''}" />`
      }).join('\n      ')}
    </SIGORTALILAR>
  </BILDIRGELER>
</AYLIKBILDIRGELER>`

    const blob = new Blob([xml], { type: 'text/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `SGK_APHB_${activeYear}_${activeMonth}.xml`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ padding: '24px' }}>
        <div className="card" style={{ marginBottom: 24, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 4px' }}>e-Beyanname ve Bildirge Yönetimi</h3>
              <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0 }}>GİB ve SGK standartlarında resmi XML paketleri oluşturun.</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 8 }}>Aktif Dönem: {AYLAR[activeMonth]} {activeYear}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={generateBankList} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Download size={18} /> Banka Listesi
                </button>
                <button className="btn btn-primary" onClick={generateXML} style={{ background: '#16a34a', borderColor: '#16a34a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileDown size={18} /> MUHSGK XML
                </button>
                <button className="btn btn-primary" onClick={generateSGKXML} style={{ background: '#d97706', borderColor: '#d97706', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileDown size={18} /> SGK XML
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Hata Denetim Paneli */}
        {hatalar.length > 0 ? (
          <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#991b1b', marginBottom: 12 }}>
              <AlertTriangle size={20} />
              <h4 style={{ margin: 0, fontWeight: 700 }}>Eksik Bilgi Uyarısı ({hatalar.length} Personel)</h4>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {hatalar.map((h, i) => (
                <div key={i} style={{ background: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 12, border: '1px solid #fee2e2' }}>
                  <div style={{ fontWeight: 700 }}>{h.personel?.ad}</div>
                  <div style={{ color: '#ef4444' }}>
                    {!h.personel?.tc && '• T.C. No eksik '}
                    {h.personel?.sgk_li && !h.personel?.meslek_kodu && '• Meslek Kodu eksik '}
                    {!h.personel?.iban && '• IBAN eksik'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: 12, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10, color: '#166534' }}>
            <CheckCircle2 size={18} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Tüm personel bilgileri XML ve banka listesi için eksiksiz görünüyor.</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 32 }}>
          <StatCard title="Toplam Brüt (Matrah)" value={`₺${totalBrut.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`} icon={<TrendingUp size={20} />} color="var(--accent)" />
          <StatCard title="Ödenecek Net Maaş" value={`₺${totalNet.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`} icon={<Landmark size={20} />} color="#0284c7" />
          <StatCard title="Gelir Vergisi (0003)" value={`₺${totalGV.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`} icon={<Calculator size={20} />} color="#ef4444" />
          <StatCard title="Damga Vergisi (1046)" value={`₺${totalDV.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`} icon={<FileText size={20} />} color="#10b981" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
          <div className="card" style={{ padding: 0, border: '1px solid var(--accent)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--th-border)', background: 'var(--th-bg)', color: 'var(--th-fg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Beyanname Matrah Bildirimi</h3>
            </div>
            <div style={{ padding: '24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)', background: 'var(--bg2)' }}>
                    <th style={{ padding: '12px 16px' }}>Kod / Tür</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Gayrisafi Tutar (Matrah)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Vergi Kesinti Tutarı</th>
                  </tr>
                </thead>
                <tbody>
                  {matrahlar.map((m, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{m.label}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>₺{m.gayrisafi.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>₺{m.kesinti.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ padding: 0, border: '1px solid #d97706' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #d97706', background: '#d97706', color: '#fff' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>SGK e-Bildirge Taslağı (APHB)</h3>
            </div>
            {eksikler === null ? (
              <div className="alert alert-warn" style={{ margin: 16 }}>Eksik gün nedenleri kaydedilemiyor: veritabanında <strong>sgk_eksik_gun</strong> tablosu yok. supabase/migration_sgk_eksik_gun.sql dosyasını Supabase SQL Editor&apos;da çalıştırın.</div>
            ) : (
              <p style={{ margin: 0, padding: '10px 16px', fontSize: 12, color: 'var(--text2)', borderBottom: '1px solid var(--border)' }}>SGK ayı 30 gün sayar. 30 günden az bildirilen her personel için eksik gün nedenini seçin ve kısaca açıklayın; seçim olmadan SGK XML oluşturulmaz.</p>
            )}
            <div style={{ padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
                    <th style={{ padding: '12px 16px' }}>Sno</th>
                    <th style={{ padding: '12px 16px' }}>TC Kimlik</th>
                    <th style={{ padding: '12px 16px' }}>Ad Soyad</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>PEK (TL)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>İkramiye</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Gün</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Eksik</th>
                    <th style={{ padding: '12px 16px', minWidth: 300 }}>Eksik gün nedeni</th>
                    <th style={{ padding: '12px 16px' }}>Meslek</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollData.filter(b => b.personel?.sgk_li).map((b, idx) => {
                    const gun = primGunu(b.toplam_saat)
                    const eksik = eksikGunSayisi(gun)
                    const secim = eksikler?.[b.personel_id]
                    const g = (b.personel.gorev || '').toLowerCase()
                    const is011 = g.includes('temizlik') || g.includes('hizmet') || g.includes('büro') || g.includes('bakım') || g.includes('memur')
                    let u = b.brut, i = 0
                    if (is011 && settings?.asgari_ucret) {
                      u = Math.min(b.brut, ((settings?.asgari_ucret ?? 0) / 30) * gun)
                      i = Math.max(0, b.brut - u)
                    }
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 16px' }}>{idx + 1}</td>
                        <td style={{ padding: '10px 16px' }}>{b.personel.tc}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 600 }}>{b.personel.ad.toUpperCase()}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>₺{u.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>₺{i.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>{gun}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>{eksik > 0 ? eksik : ''}</td>
                        <td style={{ padding: '6px 16px' }}>
                          {eksik > 0 && eksikler && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <select className="form-select" aria-label={`${b.personel.ad} eksik gün nedeni`} style={{ minHeight: 30, fontSize: 12, borderColor: secim?.kod ? undefined : 'var(--danger)' }}
                                value={secim?.kod ?? ''} onChange={e => eksikKaydet(b.personel_id, e.target.value, secim?.aciklama ?? null)}>
                                <option value="">Neden seçin</option>
                                {EKSIK_GUN_NEDENLERI.map(n => <option key={n.kod} value={n.kod}>{n.kod} – {n.ad}</option>)}
                              </select>
                              {secim?.kod && (
                                <input key={`${b.personel_id}-${secim.kod}`} className="form-input" style={{ minHeight: 30, fontSize: 12 }} placeholder={`Açıklama (ör. ${eksikGunAdi(secim.kod)} tarihleri)`}
                                  aria-label={`${b.personel.ad} eksik gün açıklaması`} defaultValue={secim.aciklama ?? ''} maxLength={200}
                                  onBlur={e => { if ((e.target.value.trim() || null) !== (secim.aciklama ?? null)) eksikKaydet(b.personel_id, secim.kod, e.target.value) }} />
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 16px' }}>{b.personel.meslek_kodu}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
