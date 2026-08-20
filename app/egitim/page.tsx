'use client'
import { useState, useMemo } from 'react'
import Topbar from '@/components/Topbar'
import {
  BookOpen,
  Settings,
  HelpCircle,
  Percent,
  Calculator,
  Clock,
  GraduationCap,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Info,
  DollarSign
} from 'lucide-react'

// Sıkça Sorulan Sorular / Bilgi Kartları Verisi
const GUIDES = [
  {
    id: 'aidat',
    title: 'Öğrenci Aidatı Nasıl Hesaplanır?',
    icon: <GraduationCap size={18} />,
    content: (
      <div>
        <p style={{ margin: '0 0 10px 0', lineHeight: '1.5' }}>
          Öğrenci kulüp aidatları, kulübün yapıldığı aydaki <strong>iş günü sayısı</strong> üzerinden hesaplanır. Hafta sonları ve resmi tatiller hesaba katılmaz.
        </p>
        <div style={{ background: 'var(--surface2)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '10px' }}>
          <strong style={{ display: 'block', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '4px' }}>Formül:</strong>
          <code style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--accent)' }}>Aylık Aidat = İş Günü Sayısı × Günlük Saat × Saat Ücreti</code>
        </div>
        <p style={{ margin: 0, lineHeight: '1.5' }}>
          <strong>Kardeş İndirimi:</strong> Eğer öğrenci için kardeş indirimi aktif edilirse, hesaplanan aidat tutarı üzerinden otomatik olarak <strong>%25 indirim</strong> uygulanır.
        </p>
      </div>
    )
  },
  {
    id: 'defter-puantaj',
    title: 'Sınıf Defterinden Puantaj Aktarımı',
    icon: <Clock size={18} />,
    content: (
      <div>
        <p style={{ margin: '0 0 10px 0', lineHeight: '1.5' }}>
          Öğretmenlerin günlük ders saatlerini tek tek girmek yerine, Sınıf Defteri'ndeki verileri tek tıkla puantaja aktarabilirsiniz.
        </p>
        <ol style={{ paddingLeft: '20px', margin: '0 0 10px 0', lineHeight: '1.6' }}>
          <li>Öğretmenler günlük derslerini işleyip <strong>"Geldi"</strong> olarak işaretler.</li>
          <li>Puantaj sayfasındaki <strong>"Sınıf Defterinden Getir"</strong> butonuna tıklanır.</li>
          <li>Sistem, ders programındaki <strong>Etkinlik Saatlerini</strong> baz alarak öğretmenlerin günlük toplam çalışma saatlerini hesaplar ve resmi tatiller ile hafta sonlarını ayıklayarak otomatik puantaj tablosunu doldurur.</li>
        </ol>
      </div>
    )
  },
  {
    id: 'vergi-istisna',
    title: 'Gelir Vergisi ve Asgari Ücret İstisnası',
    icon: <Calculator size={18} />,
    content: (
      <div>
        <p style={{ margin: '0 0 10px 0', lineHeight: '1.5' }}>
          Bordro hesaplamalarında vergi kesintileri yasal mevzuata tam uyumludur:
        </p>
        <ul style={{ paddingLeft: '20px', margin: '0 0 10px 0', lineHeight: '1.6' }}>
          <li><strong>Kümülatif Matrah:</strong> Gelir vergisi dilimleri, personelin o yıla ait kümülatif matrahı üzerinden dilim atlamalı (kademeli) olarak hesaplanır.</li>
          <li><strong>Vergi İstisnası:</strong> Personel kartında "Vergi İstisnası" aktif edildiğinde, asgari ücrete denk gelen gelir ve damga vergisi tutarları hesaplanan vergilerden otomatik düşülür (istisna tutarı hesaplanan vergiyi aşamaz).</li>
        </ul>
      </div>
    )
  },
  {
    id: 'tavan-ucret',
    title: 'Maaş Tavan Sınırı (MEB Yönergesi)',
    icon: <Percent size={18} />,
    content: (
      <div>
        <p style={{ margin: '0 0 10px 0', lineHeight: '1.5' }}>
          MEB Çocuk Kulüpleri Yönergesi gereği hiçbir personele <strong>En Yüksek Devlet Memuru Brüt Aylığı</strong>'nın belirli bir yüzdesinden fazla brüt ödeme yapılamaz.
        </p>
        <div style={{ background: 'var(--surface2)', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', lineHeight: '1.5' }}>
          <strong>Görev Limitleri:</strong>
          <ul style={{ margin: '6px 0 0 0', paddingLeft: '16px' }}>
            <li>Usta Öğretici: %400</li>
            <li>Öğretmen: %300</li>
            <li>Müdür / Başkan / Koordinatör / Denetçi: %275</li>
            <li>Başkan Yardımcısı: %250</li>
            <li>Muhasebe / Temizlik (Destek): %80</li>
          </ul>
        </div>
      </div>
    )
  }
]

// Ayarlar Haritası Verisi
const SETTINGS_MAP = [
  {
    key: 'kurum_bilgileri',
    label: 'Kurumsal Bilgiler',
    fields: ['Kurum Adı', 'SGK İşyeri No', 'Vergi Dairesi & No'],
    desc: 'Raporlama ve Resmi Çıktılar',
    details: 'Bu bilgiler Resmi Puantaj Cetveli ve Aylık Maaş Bordrosu raporlarının en üstünde, resmi kurumlara sunulacak şekilde gösterilir. İmza sirkülerinin altındaki isimler ve unvanlar da buradan yönetilir.'
  },
  {
    key: 'meb_katsayi',
    label: 'MEB Katsayı Ayarları',
    fields: ['Gösterge (140)', 'Katsayı', 'Yemek Durumu'],
    desc: 'Resmi Saat Ücreti Hesaplama',
    details: 'Yönerge gereği gösterge rakamı (sabit 140) ile memur maaş katsayısı çarpılarak yemek durumuna göre (yemekliyse 3\'e, yemeksizse 4\'e) bölünür. Buradaki katsayı her Ocak ve Temmuz ayında güncellenmelidir. Ayrıca isterseniz "Öğretmen Saat Ücreti" alanına değer girerek yasal hesaplamayı ezebilir ve sabit saat ücreti uygulayabilirsiniz.'
  },
  {
    key: 'dagitim_oranlari',
    label: 'Havuz Dağıtım Oranları (%)',
    fields: ['Temel Gider (%26)', 'Öğretmen (%55)', 'Yönetim / Destek'],
    desc: 'Gelirin Paylaştırılması',
    details: 'Kulüpte toplanan tüm aidat gelirlerinin yasal dağıtım yüzdeleridir. Yönerge standardı: %26 Temel Gider, %55 Öğretmen Havuzu, %7 Kulüp Başkanı, %5 Başkan Yardımcısı, %2 Muhasebe, %4 Temizlik ve %1 Denetim şeklindedir. Toplam oranlar tam olarak %100 olmalıdır.'
  },
  {
    key: 'vergi_dilimleri',
    label: 'Yasal Oranlar & Vergi Dilimleri',
    fields: ['Vergi Dilimleri JSON', 'SGK İşçi & İşveren Payları'],
    desc: 'Vergi ve Sigorta Hesaplamaları',
    details: 'Gelir vergisi dilim sınırları ve SGK prim kesinti oranlarıdır. Türkiye genelinde yasal değişiklikler yapıldığında buradaki oranlar (örneğin %14 SGK işçi payı, kümülatif vergi matrahı sınırları) güncellenerek bordro hesaplarının yasal mevzuata uyması sağlanır.'
  }
]

export default function EgitimPage() {
  // Sekme Kontrolü
  const [activeTab, setActiveTab] = useState<'kılavuz' | 'ayarlar'>('kılavuz')
  
  // Kılavuz Akordeon Kontrolü
  const [openGuide, setOpenGuide] = useState<string | null>('aidat')

  // Ayarlar Haritası Seçili Alan Kontrolü
  const [selectedSetting, setSelectedSetting] = useState<string>('meb_katsayi')

  // Simülatör Değişkenleri
  const [toplamGelir, setToplamGelir] = useState<number>(60000)
  const [ogretmenSayisi, setOgretmenSayisi] = useState<number>(4)
  const [toplamDersSaati, setToplamDersSaati] = useState<number>(120)
  
  // Simülatör Ayar Katsayıları
  const [simKatsayi, setSimKatsayi] = useState<number>(1.387871)
  const [simGosterge, setSimGosterge] = useState<number>(140)
  const [simYemek, setSimYemek] = useState<boolean>(true)

  // Simülatör Dağıtım Oranları State'i
  const [oranlar, setOranlar] = useState({
    gider: 26,
    ogretmen: 55,
    baskan: 7,
    baskanYrd: 5,
    muhasebe: 2,
    temizlik: 4,
    denetim: 1
  })

  // Dağıtım Oranları Toplamı
  const oranlarToplami = useMemo(() => {
    return (
      Number(oranlar.gider) +
      Number(oranlar.ogretmen) +
      Number(oranlar.baskan) +
      Number(oranlar.baskanYrd) +
      Number(oranlar.muhasebe) +
      Number(oranlar.temizlik) +
      Number(oranlar.denetim)
    )
  }, [oranlar])

  // Canlı Simülasyon Hesaplamaları
  const simSonuclar = useMemo(() => {
    const gelir = toplamGelir
    const pct = (val: number) => Math.round((gelir * val) / 100 * 100) / 100

    const giderHavuzu = pct(oranlar.gider)
    const ogretmenHavuzu = pct(oranlar.ogretmen)
    const baskanHavuzu = pct(oranlar.baskan)
    const baskanYrdHavuzu = pct(oranlar.baskanYrd)
    const muhasebeHavuzu = pct(oranlar.muhasebe)
    const temizlikHavuzu = pct(oranlar.temizlik)
    const denetimHavuzu = pct(oranlar.denetim)

    // Yasal Resmi Saat Ücreti Tavanı (MEB Formülü)
    // saatUcreti = (gosterge * katsayi) / bolen
    const bolen = simYemek ? 3 : 4
    const yasalSaatUcreti = Math.round(((simGosterge * simKatsayi) / bolen) * 100) / 100
    
    // Öğretmen Havuzundan Ders Saati Başına düşen dinamik ücret
    const dinamikSaatUcreti = toplamDersSaati > 0 
      ? Math.round((ogretmenHavuzu / toplamDersSaati) * 100) / 100 
      : 0

    return {
      giderHavuzu,
      ogretmenHavuzu,
      baskanHavuzu,
      baskanYrdHavuzu,
      muhasebeHavuzu,
      temizlikHavuzu,
      denetimHavuzu,
      yasalSaatUcreti,
      dinamikSaatUcreti
    }
  }, [toplamGelir, oranlar, toplamDersSaati, simKatsayi, simGosterge, simYemek])

  const activeSettingDetails = useMemo(() => {
    return SETTINGS_MAP.find(s => s.key === selectedSetting)
  }, [selectedSetting])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: 50 }}>
      <Topbar
        title="Eğitim ve Simülasyon Kılavuzu"
        sub="Kulüp yönetimini ve mevzuat hesaplamalarını interaktif olarak öğrenin"
      />

      <div style={{ maxWidth: 1600, margin: '24px auto', padding: '0 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        
        {/* SOL SÜTUN: DERS NOTLARI VE AYARLAR MAP */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* SEKME SEÇİMİ */}
          <div style={{
            display: 'flex',
            background: 'var(--surface)',
            padding: '6px',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            gap: '8px'
          }}>
            <button
              onClick={() => setActiveTab('kılavuz')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: activeTab === 'kılavuz' ? 'var(--accent)' : 'transparent',
                color: activeTab === 'kılavuz' ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.2s'
              }}
            >
              <BookOpen size={16} /> Genel Kullanım Kılavuzları
            </button>
            <button
              onClick={() => setActiveTab('ayarlar')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: activeTab === 'ayarlar' ? 'var(--accent)' : 'transparent',
                color: activeTab === 'ayarlar' ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.2s'
              }}
            >
              <Settings size={16} /> Okul Ayarları Haritası
            </button>
          </div>

          {/* SEKME İÇERİKLERİ */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '24px',
            padding: '28px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
            minHeight: '480px'
          }}>
            
            {activeTab === 'kılavuz' && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', margin: '0 0 8px 0' }}>Sistem Kullanım Kılavuzu</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 24px 0' }}>
                  Aşağıdaki başlıklara tıklayarak sistemin mevzuat hesaplama kurallarını öğrenebilirsiniz.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {GUIDES.map(g => {
                    const isOpen = openGuide === g.id
                    return (
                      <div
                        key={g.id}
                        style={{
                          border: '1px solid var(--border)',
                          borderRadius: '16px',
                          overflow: 'hidden',
                          transition: 'all 0.2s'
                        }}
                      >
                        <button
                          onClick={() => setOpenGuide(isOpen ? null : g.id)}
                          style={{
                            width: '100%',
                            padding: '16px 20px',
                            background: isOpen ? 'var(--surface2)' : 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            textAlign: 'left'
                          }}
                        >
                          <span style={{ color: isOpen ? 'var(--accent)' : 'var(--text3)' }}>{g.icon}</span>
                          <span style={{ flex: 1, fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{g.title}</span>
                          <span style={{ fontSize: '18px', color: 'var(--text3)', fontWeight: 'bold' }}>{isOpen ? '−' : '+'}</span>
                        </button>
                        {isOpen && (
                          <div style={{ padding: '20px', borderTop: '1px solid var(--border)', fontSize: '13px', color: 'var(--text2)' }}>
                            {g.content}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {activeTab === 'ayarlar' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', margin: '0 0 8px 0' }}>İnteraktif Okul Ayarları Haritası</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0' }}>
                    Form gruplarına tıklayarak ilgili ayarların sistemdeki görevlerini ve açıklamalarını inceleyin.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {SETTINGS_MAP.map(s => {
                    const isSelected = selectedSetting === s.key
                    return (
                      <button
                        key={s.key}
                        onClick={() => setSelectedSetting(s.key)}
                        style={{
                          padding: '16px',
                          borderRadius: '16px',
                          border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                          background: isSelected ? 'var(--accent-lighter)' : 'transparent',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: isSelected ? 'var(--accent)' : 'var(--text3)' }}>
                          {s.desc}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                          {s.label}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                          Örn: {s.fields.join(', ')}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {activeSettingDetails && (
                  <div style={{
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Info size={16} color="var(--accent)" />
                      <strong style={{ fontSize: '13px', color: 'var(--text)' }}>
                        {activeSettingDetails.label} Nasıl Çalışır?
                      </strong>
                    </div>
                    <p style={{ fontSize: '12.5px', color: 'var(--text2)', margin: 0, lineHeight: '1.6' }}>
                      {activeSettingDetails.details}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                      {activeSettingDetails.fields.map(f => (
                        <span key={f} style={{ fontSize: '11px', background: '#e9ecef', color: '#495057', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SAĞ SÜTUN: İNTERAKTİF MALİ SİMÜLATÖR */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '28px',
          padding: '28px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', margin: '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="var(--warn)" />
                Mali Dağıtım Simülatörü
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', margin: '0' }}>
                Ayarların ve girdilerin bütçe dağılımına etkisini canlı inceleyin.
              </p>
            </div>
            {oranlarToplami !== 100 ? (
              <div style={{
                background: 'var(--danger-light)',
                border: '1px solid var(--danger-border)',
                color: 'var(--danger)',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <AlertTriangle size={14} />
                Dağıtım Toplamı %{oranlarToplami} (Hata: %100 Olmalı!)
              </div>
            ) : (
              <div style={{
                background: 'var(--success-light)',
                border: '1px solid var(--success-border)',
                color: 'var(--success)',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <CheckCircle2 size={14} />
                Oranlar Toplamı %100
              </div>
            )}
          </div>

          {/* SİMÜLATÖR GİRDİLERİ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--surface2)', padding: '20px', borderRadius: '20px', border: '1px solid var(--border)' }}>
            
            {/* Toplam Gelir Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                <span>Toplam Aidat Geliri (Aylık):</span>
                <span style={{ color: 'var(--accent)', fontSize: '15px' }}>
                  {toplamGelir.toLocaleString('tr-TR')} ₺
                </span>
              </div>
              <input
                type="range"
                min="5000"
                max="300000"
                step="5000"
                value={toplamGelir}
                onChange={e => setToplamGelir(Number(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: 'var(--accent)',
                  cursor: 'pointer'
                }}
              />
            </div>

            {/* Öğretmen ve Saat Girdileri */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '6px' }}>Öğretmen Sayısı</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={ogretmenSayisi}
                  onChange={e => setOgretmenSayisi(Math.max(1, Number(e.target.value)))}
                  style={{
                    width: '100%',
                    height: '38px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    padding: '0 12px',
                    fontSize: '13px',
                    fontWeight: 700,
                    outline: 'none',
                    background: 'var(--surface)'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '6px' }}>Toplam Ders Saati</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={toplamDersSaati}
                  onChange={e => setToplamDersSaati(Math.max(1, Number(e.target.value)))}
                  style={{
                    width: '100%',
                    height: '38px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    padding: '0 12px',
                    fontSize: '13px',
                    fontWeight: 700,
                    outline: 'none',
                    background: 'var(--surface)'
                  }}
                />
              </div>
            </div>

            {/* MEB Yasal Parametreleri Simülasyonu */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Memur Maaş Katsayısı:</span>
                <input 
                  type="number" step="0.000001" value={simKatsayi} 
                  onChange={e => setSimKatsayi(Number(e.target.value))}
                  style={{ width: '90px', height: '28px', border: '1px solid var(--border)', borderRadius: '6px', padding: '0 6px', fontSize: '11px', fontWeight: 600, background: 'var(--surface)' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Yemek Durumu:</span>
                <button
                  onClick={() => setSimYemek(!simYemek)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    background: simYemek ? 'var(--accent)' : 'var(--border)',
                    color: simYemek ? '#fff' : 'var(--text2)'
                  }}
                >
                  {simYemek ? 'Yemekli (Bölen: 3)' : 'Yemeksiz (Bölen: 4)'}
                </button>
              </div>
            </div>

            {/* Dağıtım Oranları Manuel Simülasyon Girdileri */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
              <span style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: 'var(--text2)', marginBottom: '8px' }}>Oranları Düzenle (%):</span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { key: 'gider', label: 'Gider' },
                  { key: 'ogretmen', label: 'Öğretmen' },
                  { key: 'baskan', label: 'Başkan' },
                  { key: 'baskanYrd', label: 'Bşk. Yrd.' },
                  { key: 'muhasebe', label: 'Muhasebe' },
                  { key: 'temizlik', label: 'Temizlik' },
                  { key: 'denetim', label: 'Denetim' }
                ].map(o => (
                  <div key={o.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '9px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 700 }}>{o.label}</span>
                    <input
                      type="number"
                      value={oranlar[o.key as keyof typeof oranlar]}
                      onChange={e => setOranlar(prev => ({ ...prev, [o.key]: Number(e.target.value) }))}
                      style={{
                        width: '50px',
                        height: '28px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        textAlign: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 'var(--surface)'
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* DERS SAATİ ÜCRETİ GÖSTERGELERİ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ background: 'var(--surface2)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 700 }}>Yasal Resmi Saat Ücreti</span>
              <strong style={{ fontSize: '20px', color: 'var(--text)' }}>
                {simSonuclar.yasalSaatUcreti.toLocaleString('tr-TR')} ₺
              </strong>
              <span style={{ fontSize: '9px', color: 'var(--text3)' }}>(140 × Katsayı / Bölen)</span>
            </div>
            
            <div style={{
              background: simSonuclar.dinamikSaatUcreti > simSonuclar.yasalSaatUcreti ? 'var(--warn-light)' : 'var(--accent-lighter)',
              padding: '16px',
              borderRadius: '16px',
              border: `1px solid ${simSonuclar.dinamikSaatUcreti > simSonuclar.yasalSaatUcreti ? 'var(--warn-border)' : 'var(--border)'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <span style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 700 }}>Dağıtılan Dinamik Saat Ücreti</span>
              <strong style={{ fontSize: '20px', color: 'var(--text)' }}>
                {simSonuclar.dinamikSaatUcreti.toLocaleString('tr-TR')} ₺
              </strong>
              <span style={{ fontSize: '9px', color: 'var(--text3)' }}>(Öğretmen Havuzu / Toplam Ders Saati)</span>
            </div>
          </div>

          {simSonuclar.dinamikSaatUcreti > simSonuclar.yasalSaatUcreti && (
            <div style={{
              background: 'var(--warn-light)',
              border: '1px solid var(--warn-border)',
              color: 'var(--warn)',
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '11.5px',
              lineHeight: '1.4',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Tavan Ücret Sınırı Uyarısı:</strong> Hesaplanan dinamik saat ücreti, resmi yasal tavanı aşmaktadır! Bordro hesaplanırken yönerge gereği öğretmenlere yasal tavan olan <strong>{simSonuclar.yasalSaatUcreti} ₺</strong> üzerinden brüt ödeme yapılacak ve kalan havuz miktarı kurum kasasında devredilmek üzere tutulacaktır.
              </div>
            </div>
          )}

          {/* MEB DAĞILIM BAR GRAFİĞİ (ANLIK GÜNCEL) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>Havuz Dağılım Grafiği (₺):</span>
            <div style={{
              height: '32px',
              width: '100%',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              background: '#e9ecef',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
            }}>
              {[
                { label: 'Gider', val: (oranlar.gider / oranlarToplami) * 100, tutar: simSonuclar.giderHavuzu, color: '#3b82f6' },
                { label: 'Öğretmen', val: (oranlar.ogretmen / oranlarToplami) * 100, tutar: simSonuclar.ogretmenHavuzu, color: '#10b981' },
                { label: 'Başkan', val: (oranlar.baskan / oranlarToplami) * 100, tutar: simSonuclar.baskanHavuzu, color: '#f59e0b' },
                { label: 'Bşk. Yrd.', val: (oranlar.baskanYrd / oranlarToplami) * 100, tutar: simSonuclar.baskanYrdHavuzu, color: '#ec4899' },
                { label: 'Muhasebe', val: (oranlar.muhasebe / oranlarToplami) * 100, tutar: simSonuclar.muhasebeHavuzu, color: '#8b5cf6' },
                { label: 'Temizlik', val: (oranlar.temizlik / oranlarToplami) * 100, tutar: simSonuclar.temizlikHavuzu, color: '#6b7280' },
                { label: 'Denetim', val: (oranlar.denetim / oranlarToplami) * 100, tutar: simSonuclar.denetimHavuzu, color: '#f43f5e' }
              ].map(bar => bar.val > 0 ? (
                <div
                  key={bar.label}
                  style={{
                    width: `${bar.val}%`,
                    height: '100%',
                    background: bar.color,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  title={`${bar.label}: ${bar.tutar.toLocaleString('tr-TR')} ₺`}
                />
              ) : null)}
            </div>

            {/* Grafiğin Alt Açıklama Lejantı */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 14px', marginTop: '6px' }}>
              {[
                { label: 'Gider', pct: oranlar.gider, tutar: simSonuclar.giderHavuzu, color: '#3b82f6' },
                { label: 'Öğretmen', pct: oranlar.ogretmen, tutar: simSonuclar.ogretmenHavuzu, color: '#10b981' },
                { label: 'Başkan', pct: oranlar.baskan, tutar: simSonuclar.baskanHavuzu, color: '#f59e0b' },
                { label: 'Bşk. Yrd.', pct: oranlar.baskanYrd, tutar: simSonuclar.baskanYrdHavuzu, color: '#ec4899' },
                { label: 'Muhasebe', pct: oranlar.muhasebe, tutar: simSonuclar.muhasebeHavuzu, color: '#8b5cf6' },
                { label: 'Temizlik', pct: oranlar.temizlik, tutar: simSonuclar.temizlikHavuzu, color: '#6b7280' },
                { label: 'Denetim', pct: oranlar.denetim, tutar: simSonuclar.denetimHavuzu, color: '#f43f5e' }
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text2)' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: item.color }} />
                  <strong>{item.label} (%{item.pct}):</strong>
                  <span>{item.tutar.toLocaleString('tr-TR')} ₺</span>
                </div>
              ))}
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
