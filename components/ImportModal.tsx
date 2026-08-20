'use client'
import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import { logIslem } from '@/lib/audit'
import { Ogrenci, Personel } from '@/lib/types'
import { Upload, Download, X, CheckCircle, AlertTriangle, FileSpreadsheet, Copy } from 'lucide-react'

type Tip = 'ogrenci' | 'personel'
type Adim = 'yukle' | 'onizleme' | 'sonuc'
type SatirDurum = 'gecerli' | 'hatali' | 'muskerrer'

interface ParsedSatir {
  index: number
  durum: SatirDurum
  hatalar: string[]
  data: Partial<Ogrenci> | Partial<Personel>
  ham: Record<string, string>
}

interface Props {
  tip: Tip
  mevcutOgrenciler?: Ogrenci[]
  mevcutPersonel?: Personel[]
  onKapat: () => void
  onTamamlandi: () => void
}

// ── Şablon tanımları ────────────────────────────────────────────
const OGR_KOLONLAR = [
  'Ad', 'Soyad', 'TC Kimlik No', 'Sınıf', 'Öğretmen',
  'Anne Adı', 'Anne Telefonu', 'Veli Adı', 'Kardeş İndirimi (Evet/Hayır)',
  'Ücretsiz Mi (Evet/Hayır)', 'Ücretsiz Nedeni', 'Günlük Ders Saati Limiti'
]
const OGR_ORNEK = [
  ['Ali', 'YILMAZ', '12345678901', '1-A', 'Ayşe Öğretmen', 'Fatma', '0532 111 2233', 'Ahmet YILMAZ', 'Hayır', 'Hayır', '', ''],
  ['Zeynep', 'KAYA', '', '2-B', '', 'Emine', '0543 222 3344', 'Hasan KAYA', 'Evet', 'Evet', 'Şehit çocuğu', '2'],
]

const PER_KOLONLAR = [
  'Ad Soyad', 'TC Kimlik No', 'SGK No', 'Görevi', 'Kadro Durumu', 
  'SGK\'lı mı (Evet/Hayır)', 'Vergi İstisnası (Evet/Hayır)', 'IBAN', 
  'Yıllık Matrah (₺)', 'Meslek Kodu', 'Personel Türü', 'Emekli mi (Evet/Hayır)', 'E-posta'
]
const PER_GOREVLER = [
  'Öğretmen', 'Usta Öğretici', 'Koordinatör Öğretmen',
  'Muhasebe Personeli', 'Temizlik Personeli', 'Başkan', 'Başkan Yrd.', 'Denetim Yetkilisi',
]
const PER_ORNEK = [
  ['Ayşe ÖZTÜRK', '98765432109', '12345678901', 'Öğretmen', 'Kadrolu', 'Evet', 'Hayır', 'TR330006100519786457841326', '150000', '2311.01', 'Kadrolu MEB Personeli', 'Hayır', 'ayse@okul.k12.tr'],
  ['Mehmet DEMİR', '', '', 'Başkan', 'Dışarıdan', 'Hayır', 'Evet', '', '0', '1112.01', 'Yönetici', 'Evet', 'mehmet@domain.com'],
]

function evet(s: string): boolean {
  return s.trim().toLowerCase() === 'evet' || s.trim() === '1' || s.trim().toLowerCase() === 'true'
}

function normalizeAd(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, ' ')
}

function isKolonZorunlu(tip: Tip, k: string): boolean {
  if (tip === 'ogrenci') {
    return [
      'Ad', 'Soyad', 'Sınıf', 'Kardeş İndirimi (Evet/Hayır)'
    ].includes(k)
  }
  return [
    'Ad Soyad', 'Görevi', 'TC Kimlik No', 'Meslek Kodu', 
    'E-posta', 'IBAN', 'Personel Türü', 
    'SGK\'lı mı (Evet/Hayır)', 'Emekli mi (Evet/Hayır)', 'Vergi İstisnası (Evet/Hayır)'
  ].includes(k)
}

// ── Ana bileşen ─────────────────────────────────────────────────
export default function ImportModal({ tip, mevcutOgrenciler = [], mevcutPersonel = [], onKapat, onTamamlandi }: Props) {
  const [adim, setAdim] = useState<Adim>('yukle')
  const [satirlar, setSatirlar] = useState<ParsedSatir[]>([])
  const [yukleniyor, setYukleniyor] = useState(false)
  const [sonuc, setSonuc] = useState<{ eklenen: number; atlanan: number; hatali: number } | null>(null)
  const [surukleniyor, setSurukleniyor] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const kolonlar = tip === 'ogrenci' ? OGR_KOLONLAR : PER_KOLONLAR

  // ── Şablon indir ──────────────────────────────────────────────
  function sablonIndir() {
    const ornekler = tip === 'ogrenci' ? OGR_ORNEK : PER_ORNEK
    const ws = XLSX.utils.aoa_to_sheet([kolonlar, ...ornekler])

    // Sütun genişlikleri
    ws['!cols'] = kolonlar.map(k => ({ wch: Math.max(k.length + 4, 16) }))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, tip === 'ogrenci' ? 'Öğrenciler' : 'Personel')
    XLSX.writeFile(wb, tip === 'ogrenci' ? 'ogrenci_sablonu.xlsx' : 'personel_sablonu.xlsx')
  }

  // ── Satır parse: öğrenci ──────────────────────────────────────
  function parseOgrenciSatir(ham: Record<string, string>, idx: number, mevcutTcler: Set<string>, mevcutAdlar: Set<string>): ParsedSatir {
    const hatalar: string[] = []
    const ad = normalizeAd(ham['Ad'] || '')
    const soyad = normalizeAd(ham['Soyad'] || '')
    const tc = (ham['TC Kimlik No'] || '').replace(/\s/g, '')

    if (!ad) hatalar.push('Ad boş')
    if (!soyad) hatalar.push('Soyad boş')
    if (tc && (!/^\d{11}$/.test(tc))) hatalar.push('TC 11 haneli rakam olmalı')

    const sinif = (ham['Sınıf'] || '').trim()
    if (!sinif) hatalar.push('Sınıf boş')

    const kardesStr = (ham['Kardeş İndirimi (Evet/Hayır)'] || '').trim().toLowerCase()
    if (!kardesStr) {
      hatalar.push('Kardeş İndirimi boş')
    } else if (kardesStr !== 'evet' && kardesStr !== 'hayır') {
      hatalar.push('Kardeş İndirimi "Evet" veya "Hayır" olmalı')
    }

    if (hatalar.length > 0) {
      return { index: idx, durum: 'hatali', hatalar, data: {}, ham }
    }

    // Mükerrer kontrol: önce TC, sonra ad+soyad
    const adKey = `${ad}|${soyad}`
    if (tc && mevcutTcler.has(tc)) {
      return { index: idx, durum: 'muskerrer', hatalar: [`TC ${tc} zaten kayıtlı`], data: {}, ham }
    }
    if (!tc && mevcutAdlar.has(adKey)) {
      return { index: idx, durum: 'muskerrer', hatalar: [`${ad} ${soyad} zaten kayıtlı`], data: {}, ham }
    }

    const data: Partial<Ogrenci> = {
      ad,
      soyad,
      tc: tc || undefined,
      sinif: sinif,
      ogretmen: (ham['Öğretmen'] || '').trim() || undefined,
      anne_adi: (ham['Anne Adı'] || '').trim() || undefined,
      anne_tel: (ham['Anne Telefonu'] || '').trim() || undefined,
      veli_ad: (ham['Veli Adı'] || '').trim() || undefined,
      kardes_indirimi: evet(kardesStr),
      ucretsiz_mi: evet(ham['Ücretsiz Mi (Evet/Hayır)'] || ''),
      ucretsiz_nedeni: (ham['Ücretsiz Nedeni'] || '').trim() || undefined,
      gunluk_saat: ham['Günlük Ders Saati Limiti'] ? (parseInt(ham['Günlük Ders Saati Limiti']) || undefined) : undefined,
    }

    return { index: idx, durum: 'gecerli', hatalar: [], data, ham }
  }

  // ── Satır parse: personel ─────────────────────────────────────
  function parsePersonelSatir(ham: Record<string, string>, idx: number, mevcutTcler: Set<string>, mevcutAdlar: Set<string>): ParsedSatir {
    const hatalar: string[] = []
    const ad = normalizeAd(ham['Ad Soyad'] || '')
    const tc = (ham['TC Kimlik No'] || '').replace(/\s/g, '')
    const gorev = (ham['Görevi'] || '').trim()
    const matrah = parseFloat((ham['Yıllık Matrah (₺)'] || '0').replace(',', '.')) || 0

    if (!ad) hatalar.push('Ad Soyad boş')
    
    if (!tc) {
      hatalar.push('TC Kimlik No boş')
    } else if (!/^\d{11}$/.test(tc)) {
      hatalar.push('TC 11 haneli rakam olmalı')
    }
    
    if (!gorev) {
      hatalar.push('Görevi boş')
    } else if (!PER_GOREVLER.includes(gorev)) {
      hatalar.push(`Geçersiz görev: "${gorev}". Geçerli: ${PER_GOREVLER.join(', ')}`)
    }

    const meslekKodu = (ham['Meslek Kodu'] || '').trim()
    if (!meslekKodu) hatalar.push('Meslek Kodu boş')

    const email = (ham['E-posta'] || '').trim()
    if (!email) hatalar.push('E-posta boş')

    const iban = (ham['IBAN'] || '').replace(/\s/g, '').toUpperCase()
    if (!iban) {
      hatalar.push('IBAN boş')
    } else if (!iban.startsWith('TR')) {
      hatalar.push('IBAN TR ile başlamalı')
    }

    const personelTuru = (ham['Personel Türü'] || '').trim().toLowerCase()
    if (!personelTuru) {
      hatalar.push('Personel Türü boş')
    } else if (personelTuru !== 'kadrolu' && personelTuru !== 'sgk') {
      hatalar.push('Personel Türü "kadrolu" veya "sgk" olmalı')
    }

    const sgkLiStr = (ham['SGK\'lı mı (Evet/Hayır)'] || '').trim().toLowerCase()
    if (!sgkLiStr) {
      hatalar.push('SGK\'lı mı boş')
    } else if (sgkLiStr !== 'evet' && sgkLiStr !== 'hayır') {
      hatalar.push('SGK\'lı mı "Evet" veya "Hayır" olmalı')
    }

    const emekliStr = (ham['Emekli mi (Evet/Hayır)'] || '').trim().toLowerCase()
    if (!emekliStr) {
      hatalar.push('Emekli mi boş')
    } else if (emekliStr !== 'evet' && emekliStr !== 'hayır') {
      hatalar.push('Emekli mi "Evet" veya "Hayır" olmalı')
    }

    const vergiStr = (ham['Vergi İstisnası (Evet/Hayır)'] || '').trim().toLowerCase()
    if (!vergiStr) {
      hatalar.push('Vergi İstisnası boş')
    } else if (vergiStr !== 'evet' && vergiStr !== 'hayır') {
      hatalar.push('Vergi İstisnası "Evet" veya "Hayır" olmalı')
    }

    if (hatalar.length > 0) {
      return { index: idx, durum: 'hatali', hatalar, data: {}, ham }
    }

    const adKey = ad
    if (tc && mevcutTcler.has(tc)) {
      return { index: idx, durum: 'muskerrer', hatalar: [`TC ${tc} zaten kayıtlı`], data: {}, ham }
    }
    if (!tc && mevcutAdlar.has(adKey)) {
      return { index: idx, durum: 'muskerrer', hatalar: [`${ad} zaten kayıtlı`], data: {}, ham }
    }

    const data: Partial<Personel> = {
      ad,
      tc: tc,
      sgk_no: (ham['SGK No'] || '').trim() || undefined,
      gorev: gorev,
      kadro_durumu: (ham['Kadro Durumu'] || '').trim() || undefined,
      sgk_li: evet(sgkLiStr),
      vergi_istisnasi: evet(vergiStr),
      iban: iban,
      yillik_matrah: matrah,
      meslek_kodu: meslekKodu,
      personel_turu: personelTuru,
      is_retired: evet(emekliStr),
      email: email,
    }

    return { index: idx, durum: 'gecerli', hatalar: [], data, ham }
  }

  // ── Dosya işle ────────────────────────────────────────────────
  function dosyaIsle(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result
        const wb = XLSX.read(buffer, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

        if (rows.length === 0) {
          alert('Dosya boş veya okunamadı.')
          return
        }

        // Mevcut kayıtlardan TC ve Ad setleri oluştur
        const mevcutTcler = new Set<string>()
        const mevcutAdlar = new Set<string>()

        if (tip === 'ogrenci') {
          mevcutOgrenciler.forEach(o => {
            if (o.tc) mevcutTcler.add(o.tc.replace(/\s/g, ''))
            mevcutAdlar.add(`${normalizeAd(o.ad)}|${normalizeAd(o.soyad)}`)
          })
        } else {
          mevcutPersonel.forEach(p => {
            if (p.tc) mevcutTcler.add(p.tc.replace(/\s/g, ''))
            mevcutAdlar.add(normalizeAd(p.ad))
          })
        }

        const parsed = rows.map((row, i) =>
          tip === 'ogrenci'
            ? parseOgrenciSatir(row as Record<string, string>, i + 2, mevcutTcler, mevcutAdlar)
            : parsePersonelSatir(row as Record<string, string>, i + 2, mevcutTcler, mevcutAdlar)
        )

        setSatirlar(parsed)
        setAdim('onizleme')
      } catch {
        alert('Dosya okunamadı. Lütfen geçerli bir Excel (.xlsx) veya CSV dosyası yükleyin.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // ── Sürükle bırak ─────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setSurukleniyor(false)
    const file = e.dataTransfer.files[0]
    if (file) dosyaIsle(file)
  }, [mevcutOgrenciler, mevcutPersonel])

  // ── Import et ─────────────────────────────────────────────────
  async function importEt() {
    const gecerliler = satirlar.filter(s => s.durum === 'gecerli')
    if (gecerliler.length === 0) return

    setYukleniyor(true)
    const tablo = tip === 'ogrenci' ? 'ogrenciler' : 'personel'

    // RLS için okul_id'yi önceden al (trigger'a güvenmiyoruz)
    const { data: okulId } = await supabase.rpc('get_my_okul_id')

    // Sadece var olduğu kesin kolonları gönder, undefined / null / '' temizle
    const satirVerileri = gecerliler.map(s => {
      const raw = s.data as Record<string, unknown>
      const temiz: Record<string, unknown> = { okul_id: okulId }
      for (const [k, v] of Object.entries(raw)) {
        if (typeof v === 'boolean') { temiz[k] = v; continue }
        if (v !== undefined && v !== null && v !== '') temiz[k] = v
      }
      return temiz
    })

    const { error } = await supabase.from(tablo).insert(satirVerileri)

    setYukleniyor(false)
    if (error) {
      alert('Kayıt hatası: ' + error.message)
      return
    }

    logIslem({
      islem: 'import',
      tablo: tablo,
      aciklama: `${gecerliler.length} ${tip === 'ogrenci' ? 'öğrenci' : 'personel'} toplu içe aktarıldı`,
    })

    setSonuc({
      eklenen: gecerliler.length,
      atlanan: satirlar.filter(s => s.durum === 'muskerrer').length,
      hatali: satirlar.filter(s => s.durum === 'hatali').length,
    })
    setAdim('sonuc')
    onTamamlandi()
  }

  const gecerliSayisi = satirlar.filter(s => s.durum === 'gecerli').length
  const muskSayisi = satirlar.filter(s => s.durum === 'muskerrer').length
  const hatalıSayisi = satirlar.filter(s => s.durum === 'hatali').length

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16
    }}>
      <div style={{
        background: 'white', borderRadius: 20, width: '100%',
        maxWidth: adim === 'onizleme' ? 860 : 520,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
      }}>
        {/* Başlık */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileSpreadsheet size={20} style={{ color: 'var(--accent)' }} />
            <strong style={{ fontSize: 16 }}>
              {tip === 'ogrenci' ? 'Öğrenci' : 'Personel'} Toplu İçe Aktar
            </strong>
          </div>
          <button onClick={onKapat} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: 24, flex: 1 }}>

          {/* ADIM 1: Yükle */}
          {adim === 'yukle' && (
            <div>
              <p style={{ fontSize: 13, color: '#555', marginBottom: 20 }}>
                Excel (.xlsx) veya CSV formatında dosya yükleyin.
                Hangi sütunların kullanılacağını görmek için önce şablonu indirin.
              </p>

              <button
                onClick={sablonIndir}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px', borderRadius: 10, border: '1.5px solid var(--accent)',
                  background: 'var(--accent-lighter)', color: 'var(--accent)',
                  cursor: 'pointer', fontWeight: 600, fontSize: 13, marginBottom: 24,
                }}
              >
                <Download size={16} />
                Şablon İndir (.xlsx)
              </button>

              {/* Sürükle bırak alanı */}
              <div
                onDragOver={e => { e.preventDefault(); setSurukleniyor(true) }}
                onDragLeave={() => setSurukleniyor(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                style={{
                  border: `2px dashed ${surukleniyor ? 'var(--accent)' : '#d1d5db'}`,
                  borderRadius: 14, padding: '40px 24px', textAlign: 'center',
                  cursor: 'pointer', background: surukleniyor ? 'var(--accent-lighter)' : '#fafafa',
                  transition: 'all 0.2s'
                }}
              >
                <Upload size={32} style={{ color: surukleniyor ? 'var(--accent)' : '#9ca3af', marginBottom: 12 }} />
                <p style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                  Dosyayı buraya sürükleyin veya tıklayın
                </p>
                <p style={{ fontSize: 12, color: '#9ca3af' }}>Excel (.xlsx) veya CSV dosyası</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) dosyaIsle(f) }}
                />
              </div>

              {/* Sütun rehberi */}
              <div style={{ marginTop: 20, background: '#f8fafc', borderRadius: 10, padding: 14, userSelect: 'text' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: 0 }}>Beklenen sütunlar:</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const text = kolonlar.join('\t');
                      navigator.clipboard.writeText(text)
                        .then(() => alert('Sütun başlıkları Excel\'e yapıştırılmak üzere panoya kopyalandı!'))
                        .catch(() => alert('Kopyalama başarısız oldu.'));
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Copy size={12} />
                    Başlıkları Kopyala
                  </button>
                </div>
                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, userSelect: 'text' }}>
                  {kolonlar.map(k => {
                    const zorunlu = isKolonZorunlu(tip, k);
                    return (
                      <span key={k} style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 6,
                        background: zorunlu ? '#dbeafe' : '#f3f4f6',
                        color: zorunlu ? '#1d4ed8' : '#6b7280',
                        fontWeight: zorunlu ? 600 : 400,
                        userSelect: 'text'
                      }}>
                        {k}
                      </span>
                    );
                  })}
                </div>
                <p style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>Mavi olanlar zorunlu alanlardır. Başlıkları kopyalayıp Excel sayfanızın ilk satırına yapıştırabilirsiniz.</p>
              </div>
            </div>
          )}

          {/* ADIM 2: Önizleme */}
          {adim === 'onizleme' && (
            <div>
              {/* Özet */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, background: '#f0fdf4', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#16a34a' }}>{gecerliSayisi}</div>
                  <div style={{ fontSize: 12, color: '#15803d' }}>Eklenecek</div>
                </div>
                <div style={{ flex: 1, background: '#fffbeb', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#d97706' }}>{muskSayisi}</div>
                  <div style={{ fontSize: 12, color: '#b45309' }}>Mükerrer (atlanacak)</div>
                </div>
                <div style={{ flex: 1, background: '#fff5f5', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--danger)' }}>{hatalıSayisi}</div>
                  <div style={{ fontSize: 12, color: '#b91c1c' }}>Hatalı (atlanacak)</div>
                </div>
              </div>

              {/* Tablo */}
              <div style={{ overflowX: 'auto', fontSize: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={thStyle}>#</th>
                      <th style={thStyle}>Durum</th>
                      {tip === 'ogrenci'
                        ? <><th style={thStyle}>Ad</th><th style={thStyle}>Soyad</th><th style={thStyle}>TC</th><th style={thStyle}>Sınıf</th></>
                        : <><th style={thStyle}>Ad Soyad</th><th style={thStyle}>TC</th><th style={thStyle}>Görevi</th></>
                      }
                      <th style={thStyle}>Not</th>
                    </tr>
                  </thead>
                  <tbody>
                    {satirlar.map(s => (
                      <tr key={s.index} style={{
                        background: s.durum === 'gecerli' ? '#f0fdf4' : s.durum === 'muskerrer' ? '#fffbeb' : '#fff5f5',
                        borderBottom: '1px solid #f0f0f0'
                      }}>
                        <td style={tdStyle}>{s.index}</td>
                        <td style={tdStyle}>
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                            background: s.durum === 'gecerli' ? '#dcfce7' : s.durum === 'muskerrer' ? '#fef9c3' : '#fee2e2',
                            color: s.durum === 'gecerli' ? '#16a34a' : s.durum === 'muskerrer' ? '#92400e' : '#dc2626'
                          }}>
                            {s.durum === 'gecerli' ? 'Eklenecek' : s.durum === 'muskerrer' ? 'Mükerrer' : 'Hatalı'}
                          </span>
                        </td>
                        {tip === 'ogrenci' ? (
                          <>
                            <td style={tdStyle}>{s.ham['Ad'] || '-'}</td>
                            <td style={tdStyle}>{s.ham['Soyad'] || '-'}</td>
                            <td style={tdStyle}>{s.ham['TC Kimlik No'] || '-'}</td>
                            <td style={tdStyle}>{s.ham['Sınıf'] || '-'}</td>
                          </>
                        ) : (
                          <>
                            <td style={tdStyle}>{s.ham['Ad Soyad'] || '-'}</td>
                            <td style={tdStyle}>{s.ham['TC Kimlik No'] || '-'}</td>
                            <td style={tdStyle}>{s.ham['Görevi'] || '-'}</td>
                          </>
                        )}
                        <td style={{ ...tdStyle, color: s.durum === 'gecerli' ? '#16a34a' : '#dc2626', maxWidth: 180 }}>
                          {s.hatalar.join(', ') || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ADIM 3: Sonuç */}
          {adim === 'sonuc' && sonuc && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 64, height: 64, background: '#f0fdf4', borderRadius: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px', color: '#16a34a'
              }}>
                <CheckCircle size={32} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>İçe Aktarma Tamamlandı</h2>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
                <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 20px', minWidth: 100 }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>{sonuc.eklenen}</div>
                  <div style={{ fontSize: 12, color: '#15803d' }}>Eklendi</div>
                </div>
                {sonuc.atlanan > 0 && (
                  <div style={{ background: '#fffbeb', borderRadius: 10, padding: '12px 20px', minWidth: 100 }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#d97706' }}>{sonuc.atlanan}</div>
                    <div style={{ fontSize: 12, color: '#b45309' }}>Atlandı</div>
                  </div>
                )}
                {sonuc.hatali > 0 && (
                  <div style={{ background: '#fff5f5', borderRadius: 10, padding: '12px 20px', minWidth: 100 }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>{sonuc.hatali}</div>
                    <div style={{ fontSize: 12, color: '#b91c1c' }}>Hatalı</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Alt butonlar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 24px', borderTop: '1px solid #f0f0f0' }}>
          {adim === 'yukle' && (
            <button onClick={onKapat} className="btn btn-secondary">İptal</button>
          )}
          {adim === 'onizleme' && (
            <>
              <button onClick={() => { setAdim('yukle'); setSatirlar([]) }} className="btn btn-secondary">
                ← Geri
              </button>
              {gecerliSayisi > 0 ? (
                <button onClick={importEt} disabled={yukleniyor} className="btn btn-primary">
                  {yukleniyor ? 'Kaydediliyor...' : `${gecerliSayisi} Kayıt Ekle`}
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#dc2626' }}>
                  <AlertTriangle size={16} />
                  Eklenecek geçerli satır yok
                </div>
              )}
            </>
          )}
          {adim === 'sonuc' && (
            <button onClick={onKapat} className="btn btn-primary">Kapat</button>
          )}
        </div>
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '8px 10px', textAlign: 'left', fontSize: 11,
  fontWeight: 600, color: '#6b7280', whiteSpace: 'nowrap',
}
const tdStyle: React.CSSProperties = {
  padding: '6px 10px', fontSize: 12, color: '#374151',
}
