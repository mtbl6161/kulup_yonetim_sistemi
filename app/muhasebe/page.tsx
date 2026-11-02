'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Calculator, FileText, TrendingUp, Landmark, FileDown, AlertTriangle, CheckCircle2, Download, Settings } from 'lucide-react'
import StatCard from '@/components/StatCard'
import { AYLAR, fmtTL } from '@/lib/hesaplama'
import { useAy } from '@/lib/AyContext'
import { uyari } from '@/lib/diyalog'
import type { Ayarlar } from '@/lib/types'
import { useYukleme } from '@/lib/useYukleme'
import { useAuth } from '@/lib/AuthContext'
import { EKSIK_GUN_NEDENLERI, eksikGunAdi } from '@/lib/sgkEksikGun'
import type { EksikGunKaydi } from '@/lib/sgkEksikGun'
import { adSoyadAyir, latin5Kodla, muhsgkEksikleri, muhsgkOzet, muhsgkXml, muhtasaraGirer, sgkGunleri, MUHSGK_VARSAYILAN, type MuhsgkBilgileri, type MuhsgkSatir } from '@/lib/muhsgk'
import { pdfHazirla, pdfBaslik, pdfTablo, pdfImza, pdfSonY, pdfAc } from '@/lib/pdf'

// Sorgu personel(*) ile birleştirir; her bordro satırının personeli vardır
type MuhasebeSatir = MuhsgkSatir

const girisAnahtari = (okulId: number | undefined, yil: number, ay: number) => `muhsgk_isegiris_${okulId ?? 0}_${yil}_${ay}`
function yerelOku<T>(anahtar: string): T | null {
  try { const v = localStorage.getItem(anahtar); return v ? JSON.parse(v) as T : null } catch { return null }
}
function yerelYaz(anahtar: string, deger: unknown) {
  try { localStorage.setItem(anahtar, JSON.stringify(deger)) } catch { /* özel pencere */ }
}

export default function MuhasebePage() {
  const [, setLoading] = useState(false)
  const { ay: activeMonth, yil: activeYear } = useAy()

  const [settings, setSettings] = useState<Ayarlar | null>(null)
  const [payrollData, setPayrollData] = useState<MuhasebeSatir[]>([])
  const { okul } = useAuth()
  // personel_id → seçilen eksik gün nedeni; tablo yoksa (migration çalıştırılmadı) null
  const [eksikler, setEksikler] = useState<Record<number, EksikGunKaydi> | null>({})
  // personel_id → bu ay işe giriş günü (önceki ay bordrosu olmayan SGK'lılar için ilk puantaj gününden önerilir)
  const [iseGiris, setIseGiris] = useState<Record<number, number | null>>({})
  // Beyanname bilgileri Ayarlar › Kurum bilgileri › Gelişmiş bölümünde düzenlenir
  const [bilgiler, setBilgiler] = useState<MuhsgkBilgileri>(MUHSGK_VARSAYILAN)

  const fetchData = async () => {
    setLoading(true)
    const oncekiAy = activeMonth === 1 ? 12 : activeMonth - 1
    const oncekiYil = activeMonth === 1 ? activeYear - 1 : activeYear
    const ayStr = String(activeMonth).padStart(2, '0')
    const ayGun = new Date(activeYear, activeMonth, 0).getDate()
    const [{ data: ayar }, { data: bordro }, { data: eg, error: egHata }, { data: onceki }, { data: puantaj }] = await Promise.all([
      supabase.from('ayarlar').select('*').single(),
      supabase.from('bordro').select('*, personel(*)').eq('yil', activeYear).eq('ay', activeMonth),
      supabase.from('sgk_eksik_gun').select('*').eq('yil', activeYear).eq('ay', activeMonth),
      supabase.from('bordro').select('personel_id').eq('yil', oncekiYil).eq('ay', oncekiAy),
      supabase.from('puantaj').select('personel_id, tarih, saat').gte('tarih', `${activeYear}-${ayStr}-01`).lte('tarih', `${activeYear}-${ayStr}-${ayGun}`),
    ])
    setEksikler(egHata ? null : Object.fromEntries((eg || []).map((k: EksikGunKaydi) => [k.personel_id, k])))

    // İşe giriş önerisi: önceki ay bordrosu olmayan SGK'lı bu ay işe girmiş sayılır. Giriş günü kişinin ilk puantaj günü;
    // puantajı olmayanlar (pay usulü ödenenler) için kulübün o ayki ilk çalışma günü. Tabloda değiştirilebilir.
    const oncekiler = new Set((onceki || []).map((r: { personel_id: number }) => r.personel_id))
    const ilkGun: Record<number, number> = {}
    for (const p of (puantaj || []) as { personel_id: number; tarih: string; saat: number }[]) {
      if (!(p.saat > 0)) continue
      const g = Number(p.tarih.slice(8, 10))
      if (!ilkGun[p.personel_id] || g < ilkGun[p.personel_id]) ilkGun[p.personel_id] = g
    }
    const kulupIlkGun = Object.values(ilkGun).length ? Math.min(...Object.values(ilkGun)) : null
    const oneri: Record<number, number | null> = {}
    for (const b of (bordro || []) as MuhasebeSatir[]) {
      if (!b.personel?.sgk_li || oncekiler.has(b.personel_id)) continue
      const g = ilkGun[b.personel_id] ?? kulupIlkGun
      oneri[b.personel_id] = g && g > 1 ? g : null
    }
    setIseGiris({ ...oneri, ...(yerelOku<Record<number, number | null>>(girisAnahtari(okul?.id, activeYear, activeMonth)) || {}) })

    setBilgiler({ ...MUHSGK_VARSAYILAN, ...(ayar?.muhsgk_bilgileri || {}) })
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

  function girisDegistir(personelId: number, deger: string) {
    const ayGun = new Date(activeYear, activeMonth, 0).getDate()
    const g = Math.trunc(Number(deger))
    const yeni = { ...iseGiris, [personelId]: g >= 1 && g <= ayGun ? g : null }
    setIseGiris(yeni)
    yerelYaz(girisAnahtari(okul?.id, activeYear, activeMonth), yeni)
  }

  // Hata Denetimi
  const hatalar = payrollData.filter(b => {
    const p = b.personel
    if (!p) return false
    return !p.tc || p.tc.length !== 11 || (p.sgk_li && !p.meslek_kodu) || !p.iban || p.iban.length < 10
  })

  const generateBankList = async () => {
    const liste = payrollData.filter(b => (b.net || 0) > 0).sort((a, b) => (a.personel?.ad || '').localeCompare(b.personel?.ad || '', 'tr'))
    if (liste.length === 0) return uyari('Ödeme verisi bulunamadı!')
    const ibanBicim = (iban?: string) => (iban || '').replace(/\s+/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim()
    const toplam = liste.reduce((s, b) => s + (b.net || 0), 0)

    const { pdf, autoTable } = await pdfHazirla('portrait')
    const y = pdfBaslik(pdf, {
      kurum: settings?.kurum_adi, baslik: 'Banka Ödeme Listesi',
      alt: `${AYLAR[activeMonth]} ${activeYear} dönemi ücret ödemeleri · ${liste.length} kişi`,
    })
    autoTable(pdf, pdfTablo({
      startY: y,
      head: [['Sıra', 'Adı Soyadı', 'T.C. Kimlik No', 'IBAN', 'Net Ödenecek (₺)']],
      body: liste.map((b, i) => [String(i + 1), (b.personel?.ad || '').toLocaleUpperCase('tr-TR'), b.personel?.tc || '', ibanBicim(b.personel?.iban) || '— IBAN eksik —', fmtTL(b.net)]),
      foot: [[{ content: 'TOPLAM', colSpan: 4, styles: { halign: 'right' } }, { content: fmtTL(toplam), styles: { halign: 'right' } }]],
      styles: { fontSize: 8.5, cellPadding: 1.8 },
      columnStyles: { 0: { halign: 'center', cellWidth: 12 }, 2: { halign: 'center', cellWidth: 28 }, 3: { cellWidth: 64 }, 4: { halign: 'right', cellWidth: 32 } },
    }))
    pdfImza(pdf, settings, pdfSonY(pdf))
    pdfAc(pdf, 'Banka ödeme listesi')
  }

  const ozet = muhsgkOzet(payrollData)
  const matrahlar = [
    { kod: '012', label: '012 (Ücret — SGK\'lı personel)', gayrisafi: ozet.ucretSgk.gayrisafi, kesinti: ozet.ucretSgk.kesinti },
    { kod: '018', label: '018 (Ücret — SGK\'sız / kadrolu)', gayrisafi: ozet.ucretDiger.gayrisafi, kesinti: ozet.ucretDiger.kesinti },
    { kod: '302', label: '302 (Damga Vergisi — Toplam)', gayrisafi: ozet.damga.gayrisafi, kesinti: ozet.damga.kesinti },
  ]

  const totalBrut = ozet.damga.gayrisafi
  const totalNet = payrollData.filter(muhtasaraGirer).reduce((sum: number, b) => sum + (b.net || 0), 0)
  const totalGV = ozet.ucretSgk.kesinti + ozet.ucretDiger.kesinti
  const totalDV = ozet.damga.kesinti

  const xmlGirdi = settings ? {
    ayarlar: settings, bilgiler, satirlar: payrollData, yil: activeYear, ay: activeMonth, iseGiris,
    eksikNedenleri: Object.fromEntries(Object.entries(eksikler || {}).map(([k, v]) => [k, v.kod])),
  } : null

  const generateXML = () => {
    if (!xmlGirdi || !settings) return uyari('Ayarlar yüklenemedi!')
    if (!payrollData.some(muhtasaraGirer)) return uyari(`${AYLAR[activeMonth]} ${activeYear} için bordro bulunamadı. Önce bordroyu oluşturun.`)
    const eksik = muhsgkEksikleri(xmlGirdi)
    if (eksik.length) {
      const ayarda = eksik.some(e => e.startsWith('Vergi dairesi') || e.includes('ayarlarda'))
      return uyari(`MUHSGK XML oluşturulamadı:\n• ${eksik.join('\n• ')}${ayarda ? '\n\nKurum ve beyanname bilgileri: Ayarlar › Kurum bilgileri › Gelişmiş: e-Beyanname (MUHSGK) ve SGK parametreleri.' : ''}`)
    }
    const bytes = latin5Kodla(muhsgkXml(xmlGirdi))
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'text/xml;charset=ISO-8859-9' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const son = new Date(activeYear, activeMonth, 0).getDate()
    const donem = `${String(activeMonth).padStart(2, '0')}${activeYear}`
    a.href = url
    a.download = `${bilgiler.vd_kodu}_${settings.vergi_no}_MUHSGK_21_01${donem}_${son}${donem}.xml`
    a.click()
    URL.revokeObjectURL(url)
  }

  const sgkSatirlari = payrollData.filter(b => muhtasaraGirer(b) && b.personel.sgk_li)

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ padding: '24px' }}>
        <div className="card" style={{ marginBottom: 24, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 4px' }}>e-Beyanname ve Bildirge Yönetimi</h3>
              <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0 }}>Muhtasar ve prim hizmet beyannamesi (MUHSGK) tek XML dosyasında: GİB e-Beyanname&apos;ye yüklenir.</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 8 }}>Aktif Dönem: {AYLAR[activeMonth]} {activeYear}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={generateBankList} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Download size={18} /> Banka Listesi (PDF)
                </button>
                <button className="btn btn-primary" onClick={generateXML} style={{ background: '#16a34a', borderColor: '#16a34a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileDown size={18} /> MUHSGK XML (Muhtasar + SGK)
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12.5, color: bilgiler.vd_kodu ? 'var(--text2)' : 'var(--danger)', fontWeight: bilgiler.vd_kodu ? 400 : 600 }}>
            <Settings size={14} />
            {bilgiler.vd_kodu
              ? <span>Beyanname bilgileri Ayarlar&apos;da: vergi dairesi {bilgiler.vd_kodu}{bilgiler.duzenleyen_vkn ? ` · düzenleyen ${[bilgiler.duzenleyen_ad, bilgiler.duzenleyen_soyad].filter(Boolean).join(' ') || bilgiler.duzenleyen_vkn}` : ' · kurum kendisi verir'}</span>
              : <span>Vergi dairesi kodu girilmemiş; MUHSGK XML oluşturulamaz.</span>}
            <Link href="/ayarlar#beyanname" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>{bilgiler.vd_kodu ? 'Düzenle →' : 'Ayarlar’dan girin →'}</Link>
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
          <StatCard title="Gelir Vergisi" value={`₺${totalGV.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`} icon={<Calculator size={20} />} color="#ef4444" />
          <StatCard title="Damga Vergisi" value={`₺${totalDV.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`} icon={<FileText size={20} />} color="#10b981" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
          <div className="card" style={{ padding: 0, border: '1px solid var(--accent)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--th-border)', background: 'var(--th-bg)', color: 'var(--th-fg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Beyanname Matrah Bildirimi</h3>
              <span style={{ fontSize: 12 }}>{ozet.toplamCalisan} çalışan · {ozet.sgkMuaf} SGK muaf</span>
            </div>
            <div style={{ padding: '24px', overflowX: 'auto' }}>
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
              <p style={{ margin: '10px 0 0', fontSize: 11.5, color: 'var(--text3)' }}>Denetim payı kuruma ödendiği için beyannameye girmez. Asgari ücret istisnası: GV ₺{ozet.gvIstisna.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} · DV ₺{ozet.dvIstisna.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="card" style={{ padding: 0, border: '1px solid #d97706' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #d97706', background: '#d97706', color: '#fff' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>SGK Bildirimi (MUHSGK içinde)</h3>
            </div>
            {eksikler === null ? (
              <div className="alert alert-warn" style={{ margin: 16 }}>Eksik gün nedenleri kaydedilemiyor: veritabanında <strong>sgk_eksik_gun</strong> tablosu yok. supabase/migration_sgk_eksik_gun.sql dosyasını Supabase SQL Editor&apos;da çalıştırın.</div>
            ) : (
              <p style={{ margin: 0, padding: '10px 16px', fontSize: 12, color: 'var(--text2)', borderBottom: '1px solid var(--border)' }}>SGK ayı 30 gün sayar; personel ay içinde işe girdiyse ay giriş gününden başlar. Önceki ay bordrosu olmayanlar için giriş günü ilk puantaj gününden önerilir, gerekirse düzeltin ya da silin. Eksik günü olan herkes için neden seçilmeden XML oluşturulmaz.</p>
            )}
            <div style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
                    <th style={{ padding: '12px 16px' }}>Sno</th>
                    <th style={{ padding: '12px 16px' }}>TC Kimlik</th>
                    <th style={{ padding: '12px 16px' }}>Ad / Soyad</th>
                    <th style={{ padding: '12px 16px' }}>Belge</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Hak edilen ücret</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>İşe giriş günü</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Gün</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Eksik</th>
                    <th style={{ padding: '12px 16px', minWidth: 280 }}>Eksik gün nedeni</th>
                    <th style={{ padding: '12px 16px' }}>Meslek</th>
                  </tr>
                </thead>
                <tbody>
                  {sgkSatirlari.map((b, idx) => {
                    const giris = iseGiris[b.personel_id] ?? null
                    const { gun, eksik } = sgkGunleri(b.toplam_saat, giris, activeYear, activeMonth)
                    const secim = eksikler?.[b.personel_id]
                    const { ad, soyad } = adSoyadAyir(b.personel.ad)
                    return (
                      <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 16px' }}>{idx + 1}</td>
                        <td style={{ padding: '10px 16px' }}>{b.personel.tc}</td>
                        <td style={{ padding: '10px 16px' }}><strong>{ad}</strong> <span style={{ color: 'var(--text2)' }}>{soyad}</span></td>
                        <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>{b.personel.is_retired ? '02 (emekli)' : settings?.sgk_belge_turu || '01'}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>₺{b.brut.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '6px 16px', textAlign: 'center' }}>
                          <input type="number" min={1} max={31} className="form-input" aria-label={`${b.personel.ad} işe giriş günü`} placeholder="—"
                            style={{ width: 64, minHeight: 30, fontSize: 12, textAlign: 'center' }}
                            value={giris ?? ''} onChange={e => girisDegistir(b.personel_id, e.target.value)} />
                        </td>
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
