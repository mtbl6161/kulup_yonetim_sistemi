'use client'
import { useEffect, useState, useCallback } from 'react'
import Topbar from '@/components/Topbar'
import { useAy } from '@/lib/AyContext'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  AYLAR, fmtTL, fmt, isGunuSayisi, saatUcretiHesapla,
  tavanHesapla, gorevTavanYuzdesi, gunSayisi,
  tahakkukDagitimHesapla
} from '@/lib/hesaplama'
import { Ayarlar } from '@/lib/types'

// Tavan hesabı yapılacak görev kategorileri
const TAVAN_KATEGORILER = [
  { label: 'Başkan',                    gorev: 'Başkan',              sgkLi: true  },
  { label: 'Başkan Yardımcısı',         gorev: 'Başkan Yardımcısı',   sgkLi: true  },
  { label: 'Öğretmen',                  gorev: 'Öğretmen',            sgkLi: true  },
  { label: 'Koordinatör Öğretmen',      gorev: 'Koordinatör Öğretmen',sgkLi: true  },
  { label: 'Usta Öğretici',             gorev: 'Usta Öğretici',       sgkLi: true  },
  { label: 'Usta Öğretici (Emekli)',    gorev: 'Usta Öğretici',       sgkLi: false },
  { label: 'Muhasebe Memuru',           gorev: 'Muhasebe Personeli',  sgkLi: true  },
  { label: 'Muhasebe Memuru (Emekli)',  gorev: 'Muhasebe Personeli',  sgkLi: false },
  { label: 'Temizlik Personeli',        gorev: 'Temizlik Personeli',  sgkLi: true  },
  { label: 'Temizlik Personeli (Emekli)', gorev: 'Temizlik Personeli',sgkLi: false },
]

export default function BilancoPage() {
  const { ay, yil } = useAy()
  const { okul } = useAuth()
  const [ayarlar, setAyarlar] = useState<Ayarlar | null>(null)
  const [toplamGelir, setToplamGelir] = useState(0)
  const [ogrenciSayisi, setOgrenciSayisi] = useState(0)
  const [subeSayisi, setSubeSayisi] = useState(0)
  const [toplamDersSaati, setToplamDersSaati] = useState(0)
  const [tatiller, setTatiller] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [
      { data: ayr },
      { data: tahs },
      { data: brd },
      { data: sinif },
      { data: tat },
    ] = await Promise.all([
      supabase.from('ayarlar').select('*').single(),
      supabase.from('tahsilat').select('tutar, ogrenci_id').eq('ay', Number(ay)).eq('yil', Number(yil)),
      supabase.from('bordro').select('toplam_saat').eq('ay', Number(ay)).eq('yil', Number(yil)),
      supabase.from('siniflar').select('id').eq('aktif', true),
      supabase.from('tatiller').select('*').or(`okul_id.eq.${okul?.id ?? 0},okul_id.is.null`),
    ])

    setAyarlar(ayr)
    setToplamGelir((tahs || []).reduce((s, t) => s + Number(t.tutar), 0))
    const uniqueStudents = new Set((tahs || []).map(t => t.ogrenci_id)).size
    setOgrenciSayisi(uniqueStudents)
    setSubeSayisi(sinif?.length || 0)
    setTatiller(tat || [])

    const totalBrdHours = (brd || []).reduce((s, b) => s + Number(b.toplam_saat), 0)
    setToplamDersSaati(totalBrdHours)

    setLoading(false)
  }, [ay, yil])

  useEffect(() => { load() }, [load])

  const handlePrint = useCallback(() => {
    const printArea = document.querySelector('.print-area') as HTMLElement | null
    if (!printArea) { window.print(); return }

    // Önceki zoom değerini temizle
    printArea.style.removeProperty('zoom')

    // Tablonun gerçek genişliğini (overflow dahil) ölç
    const table = printArea.querySelector('table') as HTMLElement | null
    const naturalWidth = table ? table.scrollWidth : printArea.scrollWidth

    // A4 yatay baskı alanı: ~1075px (96 dpi)
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

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
      <div className="alert alert-info">⏳ Yükleniyor...</div>
    </div>
  )

  if (!ayarlar) return <div className="alert alert-danger">Ayarlar yüklenemedi.</div>

  const isGunu     = isGunuSayisi(yil, ay, tatiller)
  const sonGun     = gunSayisi(yil, ay)
  const bKatsayi   = ayarlar?.katsayi || 0
  const bGosterge  = ayarlar?.gosterge || 140
  const bGunlukSt  = ayarlar?.gunluk_saat || 6
  // Eğer bordro henüz hesaplanmamışsa (0 ise) teorik hesaplamaya fallback yap (İsimiz kolaylaşsın)
  const bToplamSt  = toplamDersSaati > 0 ? toplamDersSaati : (isGunu * bGunlukSt)

  // Formüller (Yönerge uyumlu + Görsel yuvarlama hassasiyeti)
  const bEnAz = Math.round(((bKatsayi * bGosterge) / 6) * 100) / 100
  const bEnCok = Math.round(((bKatsayi * bGosterge) / 3) * 100) / 100
  const bEnYuksekMemur = Math.round((9500 * bKatsayi) * 100) / 100

  const effectiveAyarlar: Ayarlar = {
    ...ayarlar,
    tavan_katsayi:        ayarlar.tavan_katsayi        || bEnYuksekMemur,
    dagitim_temel_gider:  ayarlar.dagitim_temel_gider  ?? 26,
    dagitim_ogretmen:     ayarlar.dagitim_ogretmen     ?? 55,
    dagitim_baskan:       ayarlar.dagitim_baskan        ?? 7,
    dagitim_baskan_yrd:   ayarlar.dagitim_baskan_yrd   ?? 5,
    dagitim_muhasebe:     ayarlar.dagitim_muhasebe      ?? 2,
    dagitim_temizlik:     ayarlar.dagitim_temizlik      ?? 4,
    dagitim_denetim:      ayarlar.dagitim_denetim       ?? 1,
  }
  const dagitim      = toplamGelir > 0 ? tahakkukDagitimHesapla(toplamGelir, effectiveAyarlar) : null
  const tavanKatsayi = effectiveAyarlar.tavan_katsayi!

  // Tahakkuk dağılım tablosu — yüzdeler effectiveAyarlar'dan (fallback dahil)
  const ea = effectiveAyarlar
  const tahakkukSatirlari = [
    { label: 'Temel Giderler (Materyal, Beslenme, SGK Primi, Diğer Giderler)',  yuzde: ea.dagitim_temel_gider!, tutar: dagitim?.temel_gider || 0 },
    { label: 'Kulüp Yönetim Kurulu Başkanı - Müdür',                            yuzde: ea.dagitim_baskan!,       tutar: dagitim?.baskan || 0 },
    { label: 'Kulüp Yönetim Kurulu Üyesi - Müdür Yardımcısı',                  yuzde: ea.dagitim_baskan_yrd!,   tutar: dagitim?.baskan_yrd || 0 },
    { label: 'Öğretmen, Usta Öğretici, Koordinatör Öğretmen',                   yuzde: ea.dagitim_ogretmen!,     tutar: dagitim?.ogretmen_havuzu || 0 },
    { label: 'Yazışma-Muhasebe İşlerini Yürüten Personel',                      yuzde: ea.dagitim_muhasebe!,     tutar: dagitim?.muhasebe || 0 },
    { label: 'Temizlik Bakım ve Beslenme İşlerini Yürüten Personel',            yuzde: ea.dagitim_temizlik!,     tutar: dagitim?.temizlik || 0 },
    { label: 'Denetim Yetkilisi',                                                yuzde: ea.dagitim_denetim!,      tutar: dagitim?.denetim || 0 },
  ]

  // Tavan hesapları — her iki tabloda da brüt tavan gösterilir (Excel uyumlu)
  const tavanHesaplari = TAVAN_KATEGORILER.map(kat => {
    const brut = tavanHesapla(kat.gorev, tavanKatsayi)
    const yuzde = gorevTavanYuzdesi(kat.gorev)
    return { ...kat, yuzde, brut }
  })

  // Stiller
  const thS: React.CSSProperties = { fontSize: 10, padding: '5px 8px', textAlign: 'center', background: '#f0e6d2', border: '1px solid #ccc', fontWeight: 700, color: '#333' }
  const tdS: React.CSSProperties = { fontSize: 10, padding: '4px 8px', border: '1px solid #ddd' }
  const tdR: React.CSSProperties = { ...tdS, textAlign: 'right' }
  const tdC: React.CSSProperties = { ...tdS, textAlign: 'center' }
  
  const bilanTh: React.CSSProperties = { fontSize: 8, padding: '4px 2px', background: '#f8f9fa', color: '#666', border: '1px solid #ddd', fontWeight: 600, textTransform: 'uppercase', textAlign: 'center' }
  const bilanTd: React.CSSProperties = { fontSize: 13, padding: '8px 4px', background: '#fff', color: '#333', border: '1px solid #ddd', fontWeight: 700, textAlign: 'center' }

  return (
    <div>
      <Topbar
        title="Bilanço"
        actions={
          <button className="btn btn-secondary btn-sm no-print" onClick={handlePrint}>
            🖨️ Yazdır
          </button>
        }
      />

      <div style={{ padding: 24 }}>
        {toplamGelir === 0 && (
          <div className="alert alert-warn no-print" style={{ marginBottom: 16 }}>
            ⚠️ Bu ay için tahsilat kaydı bulunamadı. Önce ödeme takibinden tahsilat girin.
          </div>
        )}

        <div className="card print-area" style={{ padding: 24 }}>

          {/* BAŞLIK */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--danger)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
              {ayarlar.kurum_adi || 'KULÜP ADI TANIMLANMAMIŞ'}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginTop: 6 }}>
              01 {AYLAR[ay]} {yil} – {sonGun} {AYLAR[ay]} {yil} Tarihleri Arası Çocuk Kulübü Bilançosu
            </div>
          </div>

          {/* BİLANÇO PARAMETRELER (TABLO GÖRÜNÜMÜ) */}
          <div style={{ overflowX: 'auto', marginBottom: 20 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #ccc' }}>
              <tbody>
                {/* 1. SATIR */}
                <tr>
                  <th style={bilanTh}>AYLIKLAR İÇİN BELİRLENEN KATSAYI</th>
                  <th style={bilanTh}>GÜNDÜZ ÖĞRETİMİ GÖSTERGESİ</th>
                  <th style={bilanTh}>BELİRLENEBİLECEK EN AZ SAAT ÜCRETİ</th>
                  <th style={bilanTh}>BELİRLENEBİLECEK EN ÇOK SAAT ÜCRETİ</th>
                  <th style={bilanTh}>BELİRLENEN 1 SAAT ÜCRETİ</th>
                  <th style={bilanTh}>EN YÜKSEK DEVLET MEMURU BRÜT AYLIĞI</th>
                </tr>
                <tr>
                  <td style={bilanTd}>{bKatsayi.toFixed(6)}</td>
                  <td style={bilanTd}>{bGosterge}</td>
                  <td style={bilanTd}>{fmt(bEnAz)}</td>
                  <td style={bilanTd}>{fmt(bEnCok)}</td>
                  <td style={bilanTd}>{fmt(ayarlar.saat_ucreti)}</td>
                  <td style={bilanTd}>{fmtTL(bEnYuksekMemur)}</td>
                </tr>
                {/* 2. SATIR */}
                <tr>
                  <th style={bilanTh}>ÖĞRENCİ SAYISI</th>
                  <th style={bilanTh}>ŞUBE SAYISI</th>
                  <th style={bilanTh}>AYLIK İŞ GÜNÜ SAYISI</th>
                  <th style={bilanTh}>GÜNLÜK DERS SAAT SAYISI</th>
                  <th style={bilanTh}>AYLIK DERS SAATİ VE KOORDİNATÖRLÜK TOPLAMI</th>
                  <th style={bilanTh}>AYLIK ÜCRET TOPLAMI</th>
                </tr>
                <tr>
                  <td style={bilanTd}>{ogrenciSayisi}</td>
                  <td style={bilanTd}>{subeSayisi}</td>
                  <td style={bilanTd}>{isGunu}</td>
                  <td style={bilanTd}>{bGunlukSt}</td>
                  <td style={bilanTd}>{bToplamSt}</td>
                  <td style={{ ...bilanTd, color: '#000' }}>{fmt(toplamGelir)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* AYLIK TAHAKKUK TABLOSU */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, background: 'var(--accent)', color: '#fff', padding: '5px 10px', marginBottom: 0 }}>
              AYLIK TAHAKKUK TOPLAMI
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...thS, textAlign: 'left', width: '60%' }}>KATEGORİ</th>
                  <th style={{ ...thS, width: 60 }}>%</th>
                  <th style={{ ...thS, width: 160 }}>TUTAR (TL)</th>
                </tr>
              </thead>
              <tbody>
                {tahakkukSatirlari.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ ...tdS }}>{row.label}</td>
                    <td style={{ ...tdC, fontWeight: 600 }}>%{row.yuzde}</td>
                    <td style={{ ...tdR, fontWeight: 600 }}>{fmtTL(row.tutar)}</td>
                  </tr>
                ))}
                <tr style={{ background: '#f0e6d2', fontWeight: 800 }}>
                  <td style={{ ...tdS, fontWeight: 800 }}>TOPLAM</td>
                  <td style={tdC}></td>
                  <td style={{ ...tdR, fontWeight: 800, fontSize: 11 }}>{fmtTL(toplamGelir)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* NET ve BRÜT TAVAN TABLOLARI — yan yana */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* NET ÜCRETLER */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, background: '#1a6b8a', color: '#fff', padding: '6px 10px', textTransform: 'uppercase' }}>
                EN FAZLA ÖDENECEK NET ÜCRETLER
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    <th style={{ ...thS, textAlign: 'left', background: 'transparent' }}>GÖREVİ</th>
                    <th style={{ ...thS, width: 60, background: 'transparent' }}>ORAN</th>
                    <th style={{ ...thS, width: 130, background: 'transparent' }}>NET ÜCRET</th>
                  </tr>
                </thead>
                <tbody>
                  {tavanHesaplari.map((kat, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f4f9fc' }}>
                      <td style={{ ...tdS, fontSize: 10 }}>{kat.label}</td>
                      <td style={{ ...tdC, color: '#1a6b8a', fontWeight: 700, fontSize: 10 }}>%{kat.yuzde}</td>
                      <td style={{ ...tdR, fontWeight: 700, fontSize: 10 }}>{fmtTL(kat.brut)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* BRÜT ÜCRETLER */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, background: '#8a7d1a', color: '#fff', padding: '6px 10px', textTransform: 'uppercase' }}>
                EN FAZLA ÖDENECEK BRÜT ÜCRETLER
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                    <th style={{ ...thS, textAlign: 'left', background: 'transparent' }}>GÖREVİ</th>
                    <th style={{ ...thS, width: 60, background: 'transparent' }}>ORAN</th>
                    <th style={{ ...thS, width: 130, background: 'transparent' }}>BRÜT ÜCRET</th>
                  </tr>
                </thead>
                <tbody>
                  {tavanHesaplari.map((kat, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fffbf0' }}>
                      <td style={{ ...tdS, fontSize: 10 }}>{kat.label}</td>
                      <td style={{ ...tdC, color: '#8a7d1a', fontWeight: 700, fontSize: 10 }}>%{kat.yuzde}</td>
                      <td style={{ ...tdR, fontWeight: 700, fontSize: 10 }}>{fmtTL(kat.brut)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* İMZA BLOĞU */}
          <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between', padding: '0 40px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 16 }}>DÜZENLEYEN</div>
              <div style={{ fontSize: 11, fontWeight: 700 }}>{ayarlar.duzenleyen_adi || 'Hafize Büşra GÜZEL'}</div>
              <div style={{ fontSize: 10, color: '#444', fontWeight: 500 }}>{ayarlar.duzenleyen_unvani || 'Koordinatör Öğretmen'}</div>
              <div style={{ marginTop: 24, width: 180, borderBottom: '1.5px solid #333', marginInline: 'auto' }}></div>
              <div style={{ fontSize: 9, marginTop: 4, color: '#666' }}>(İmza)</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 16 }}>ONAYLAYAN</div>
              <div style={{ fontSize: 11, fontWeight: 700 }}>{ayarlar.mudur_adi || 'Yasemin AKAYDIN YÜKSEL'}</div>
              <div style={{ fontSize: 10, color: '#444', fontWeight: 500 }}>{ayarlar.mudur_unvani || 'Okul Müdürü / Kulüp Başkanı'}</div>
              <div style={{ marginTop: 24, width: 180, borderBottom: '1.5px solid #333', marginInline: 'auto' }}></div>
              <div style={{ fontSize: 9, marginTop: 4, color: '#666' }}>(İmza)</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}