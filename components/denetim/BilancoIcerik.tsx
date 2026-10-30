// Denetçi panelindeki bilanço görünümü: okulun seçilen ay için tahakkuk ve tavan ücret tablosu.
import type React from 'react'
import {
  isGunuSayisi, gunSayisi, tahakkukDagitimHesapla,
  tavanHesapla, gorevTavanYuzdesi, detectActiveCategories, bordroHesapla,
} from '@/lib/hesaplama'
import type { Ayarlar, Tatil, Personel, Puantaj, Bordro } from '@/lib/types'

export interface BilancoVerisi {
  ayarlar: Ayarlar
  toplamGelir: number
  ogrenciSayisi: number
  subeSayisi: number
  toplamDersSaati: number
  tatiller: Tatil[]
  personel?: Personel[]
  puantaj?: Puantaj[]
  bordro?: Bordro[]
}

const TAVAN_KATEGORILER: { label: string; gorev: string; sgkLi: boolean; isRetired?: boolean }[] = [
  { label: 'Başkan',                      gorev: 'Başkan',               sgkLi: false },
  { label: 'Başkan Yardımcısı',           gorev: 'Başkan Yardımcısı',    sgkLi: false },
  { label: 'Koordinatör Öğretmen',        gorev: 'Koordinatör Öğretmen', sgkLi: false },
  { label: 'Öğretmen',                    gorev: 'Öğretmen',             sgkLi: false },
  { label: 'Usta Öğretici',               gorev: 'Usta Öğretici',        sgkLi: true  },
  { label: 'Usta Öğretici (Emekli)',      gorev: 'Usta Öğretici',        sgkLi: true, isRetired: true },
  { label: 'Muhasebe Memuru',             gorev: 'Muhasebe Personeli',   sgkLi: true  },
  { label: 'Muhasebe Memuru (Emekli)',    gorev: 'Muhasebe Personeli',   sgkLi: true, isRetired: true },
  { label: 'Temizlik Personeli',          gorev: 'Temizlik Personeli',   sgkLi: true  },
  { label: 'Temizlik Personeli (Emekli)', gorev: 'Temizlik Personeli',   sgkLi: true, isRetired: true },
  { label: 'Denetim Yetkilisi',           gorev: 'Denetim Yetkilisi',    sgkLi: false },
]

const AY_ADI = ['','Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']

export function fmt(v: number | undefined | null) {
  return Number(v ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtTL(v: number) {
  return v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL'
}

export default function BilancoIcerik({ veri, ay, yil, okulAd }: { veri: BilancoVerisi; ay: number; yil: number; okulAd: string }) {
  const { ayarlar, toplamGelir, ogrenciSayisi, subeSayisi, toplamDersSaati, tatiller } = veri

  const isGunu    = isGunuSayisi(yil, ay, tatiller)
  const sonGun    = gunSayisi(yil, ay)
  const bKatsayi  = ayarlar.katsayi || 0
  const bGosterge = ayarlar.gosterge || 140
  const bGunlukSt = ayarlar.gunluk_saat || 6
  const bToplamSt = toplamDersSaati > 0 ? toplamDersSaati : (isGunu * bGunlukSt)

  const bEnAz          = Math.round(((bKatsayi * bGosterge) / 6) * 100) / 100
  const bEnCok         = Math.round(((bKatsayi * bGosterge) / 3) * 100) / 100
  const bEnYuksekMemur = Math.round((9500 * bKatsayi) * 100) / 100

  const effectiveAyarlar: Ayarlar = {
    ...ayarlar,
    tavan_katsayi:       ayarlar.tavan_katsayi       || bEnYuksekMemur,
    dagitim_temel_gider: ayarlar.dagitim_temel_gider ?? 26,
    dagitim_ogretmen:    ayarlar.dagitim_ogretmen    ?? 55,
    dagitim_baskan:      ayarlar.dagitim_baskan      ?? 7,
    dagitim_baskan_yrd:  ayarlar.dagitim_baskan_yrd  ?? 5,
    dagitim_muhasebe:    ayarlar.dagitim_muhasebe    ?? 2,
    dagitim_temizlik:    ayarlar.dagitim_temizlik    ?? 4,
    dagitim_denetim:     ayarlar.dagitim_denetim     ?? 1,
  }
  const activeCategories = detectActiveCategories(veri.personel || [], veri.puantaj || [], veri.bordro || [])
  const dagitim      = toplamGelir > 0 ? tahakkukDagitimHesapla(toplamGelir, effectiveAyarlar, activeCategories) : null
  const tavanKatsayi = effectiveAyarlar.tavan_katsayi!

  const tahakkukSatirlari = [
    { label: 'Temel Giderler (Materyal, Beslenme, SGK Primi, Diğer Giderler)', yuzde: dagitim?.pct_temel_gider ?? effectiveAyarlar.dagitim_temel_gider!, tutar: dagitim?.temel_gider || 0 },
    { label: 'Kulüp Yönetim Kurulu Başkanı (Müdür)',                           yuzde: dagitim?.pct_baskan ?? effectiveAyarlar.dagitim_baskan!,      tutar: dagitim?.baskan || 0 },
    { label: 'Kulüp Yönetim Kurulu Üyesi (Müdür Yardımcısı)',                 yuzde: dagitim?.pct_baskan_yrd ?? effectiveAyarlar.dagitim_baskan_yrd!,  tutar: dagitim?.baskan_yrd || 0 },
    { label: 'Koordinatör Öğretmen, Öğretmen, Usta Öğretici',                  yuzde: dagitim?.pct_ogretmen ?? effectiveAyarlar.dagitim_ogretmen!,    tutar: dagitim?.ogretmen_havuzu || 0 },
    { label: 'Yazışma-Muhasebe İşlerini Yürüten Personel',                     yuzde: dagitim?.pct_muhasebe ?? effectiveAyarlar.dagitim_muhasebe!,    tutar: dagitim?.muhasebe || 0 },
    { label: 'Temizlik Bakım ve Beslenme İşlerini Yürüten Personel',           yuzde: dagitim?.pct_temizlik ?? effectiveAyarlar.dagitim_temizlik!,    tutar: dagitim?.temizlik || 0 },
    { label: 'Denetim Yetkilisi',                                               yuzde: dagitim?.pct_denetim ?? effectiveAyarlar.dagitim_denetim!,     tutar: dagitim?.denetim || 0 },
  ]

  const tavanHesaplari = TAVAN_KATEGORILER.map(kat => {
    const brut = tavanHesapla(kat.gorev, tavanKatsayi, kat.sgkLi)
    const yuzde = gorevTavanYuzdesi(kat.gorev, kat.sgkLi)
    
    let net = brut
    if (kat.gorev.toLowerCase().includes('denetim')) {
      net = brut
    } else {
      const sonuc = bordroHesapla(
        effectiveAyarlar,
        0, // hours
        0, // cumulative matrah
        !!kat.sgkLi,
        !!kat.isRetired,
        kat.gorev,
        brut,
        true // vergiIstisnasi
      )
      net = sonuc.net
    }
    
    return { ...kat, yuzde, brut, net }
  })

  const thS: React.CSSProperties = { fontSize: 10, padding: '12px 16px', background: 'var(--surface2)', border: '1px solid var(--border)', fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase' }
  const tdS: React.CSSProperties = { fontSize: 13, padding: '12px 16px', border: '1px solid var(--border)', color: 'var(--text)', background: 'var(--surface)' }
  const tdR: React.CSSProperties = { ...tdS, textAlign: 'right' }
  const tdC: React.CSSProperties = { ...tdS, textAlign: 'center' }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Başlık */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)', letterSpacing: -0.5, fontFamily: 'var(--font-display)' }}>
          {ayarlar.kurum_adi || okulAd}
        </div>
        <div style={{ fontSize: 15, color: 'var(--text3)', marginTop: 8, fontWeight: 500 }}>
          01 {AY_ADI[ay]} {yil} – {sonGun} {AY_ADI[ay]} {yil} Tarihleri Arası Çocuk Kulübü Bilançosu
        </div>
      </div>

      {/* Parametreler tablosu */}
      <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)', boxShadow: '0 5px 15px rgba(0,0,0,0.05)', background: 'var(--surface)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
          <tbody>
            <tr>
              <th style={{...thS, fontSize: 9}}>AYLIKLAR İÇİN BELİRLENEN KATSAYI</th>
              <th style={{...thS, fontSize: 9}}>GÜNDÜZ ÖĞRETİMİ GÖSTERGESİ</th>
              <th style={{...thS, fontSize: 9}}>EN AZ SAAT ÜCRETİ</th>
              <th style={{...thS, fontSize: 9}}>EN ÇOK SAAT ÜCRETİ</th>
              <th style={{...thS, fontSize: 9}}>SAAT ÜCRETİ</th>
              <th style={{...thS, fontSize: 9}}>EN YÜKSEK MEMUR BRÜTÜ</th>
            </tr>
            <tr>
              <td style={tdC}>{bKatsayi.toFixed(6)}</td>
              <td style={tdC}>{bGosterge}</td>
              <td style={tdC}>{fmt(bEnAz)}</td>
              <td style={tdC}>{fmt(bEnCok)}</td>
              <td style={tdC}>{fmt(ayarlar.saat_ucreti)}</td>
              <td style={{ ...tdC, color: 'var(--accent)', fontWeight: 800 }}>{fmtTL(bEnYuksekMemur)}</td>
            </tr>
            <tr>
              <th style={{...thS, fontSize: 9}}>ÖĞRENCİ SAYISI</th>
              <th style={{...thS, fontSize: 9}}>ŞUBE SAYISI</th>
              <th style={{...thS, fontSize: 9}}>İŞ GÜNÜ SAYISI</th>
              <th style={{...thS, fontSize: 9}}>GÜNLÜK DERS SAATİ</th>
              <th style={{...thS, fontSize: 9}}>TOPLAM DERS SAATİ</th>
              <th style={{...thS, fontSize: 9}}>TOPLAM TAHAKKUK</th>
            </tr>
            <tr>
              <td style={tdC}>{ogrenciSayisi}</td>
              <td style={tdC}>{subeSayisi}</td>
              <td style={tdC}>{isGunu}</td>
              <td style={tdC}>{bGunlukSt}</td>
              <td style={tdC}>{bToplamSt}</td>
              <td style={{ ...tdC, color: 'var(--accent2)', fontWeight: 800 }}>{fmtTL(toplamGelir)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tahakkuk dağılım tablosu */}
      <div style={{ marginBottom: 40, borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <div style={{ fontSize: 13, fontWeight: 700, background: 'var(--th-bg)', color: 'var(--th-fg)', padding: '14px 20px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Aylık Tahakkuk Dağılımı
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...thS, textAlign: 'left', background: 'var(--surface2)' }}>KATEGORİ</th>
              <th style={{ ...thS, textAlign: 'center', width: 100, background: 'var(--surface2)' }}>ORAN</th>
              <th style={{ ...thS, textAlign: 'right', width: 200, background: 'var(--surface2)' }}>TUTAR (TL)</th>
            </tr>
          </thead>
          <tbody>
            {tahakkukSatirlari.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg)' }}>
                <td style={{ ...tdS, textAlign: 'left' }}>{row.label}</td>
                <td style={{ ...tdC, color: 'var(--accent)', fontWeight: 700 }}>%{row.yuzde}</td>
                <td style={{ ...tdR, fontWeight: 700, color: 'var(--text)' }}>{fmtTL(row.tutar)}</td>
              </tr>
            ))}
            <tr style={{ background: 'var(--surface2)', borderTop: '2px solid var(--accent)' }}>
              <td style={{ ...tdS, fontWeight: 800, color: 'var(--text)' }}>TOPLAM TAHAKKUK</td>
              <td style={tdC}></td>
              <td style={{ ...tdR, fontWeight: 800, fontSize: 16, color: 'var(--accent2)' }}>{fmtTL(toplamGelir)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tavan tabloları */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 48 }}>
        <div style={{ borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, background: 'var(--surface2)', color: 'var(--text3)', padding: '12px 16px', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Harcama Tavanı (Net)</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><th style={{...thS, padding: '10px 16px'}}>GÖREV</th><th style={{...thS, padding: '10px 16px'}}>ORAN</th><th style={{...thS, textAlign:'right', padding: '10px 16px'}}>NET (TL)</th></tr>
            </thead>
            <tbody>
              {tavanHesaplari.map((kat, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg)' }}>
                  <td style={{ ...tdS, fontSize: 12, padding: '10px 16px' }}>{kat.label}</td>
                  <td style={{ ...tdC, color: 'var(--accent)', fontSize: 12, padding: '10px 16px' }}>%{kat.yuzde}</td>
                  <td style={{ ...tdR, fontWeight: 700, fontSize: 12, padding: '10px 16px' }}>{fmtTL(kat.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, background: 'var(--surface2)', color: 'var(--text3)', padding: '12px 16px', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Harcama Tavanı (Brüt)</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><th style={{...thS, padding: '10px 16px', background: 'var(--surface2)'}}>GÖREV</th><th style={{...thS, padding: '10px 16px', background: 'var(--surface2)'}}>ORAN</th><th style={{...thS, textAlign:'right', padding: '10px 16px', background: 'var(--surface2)'}}>BRÜT (TL)</th></tr>
            </thead>
            <tbody>
              {tavanHesaplari.map((kat, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg)' }}>
                  <td style={{ ...tdS, fontSize: 12, padding: '10px 16px' }}>{kat.label}</td>
                  <td style={{ ...tdC, color: 'var(--accent2)', fontSize: 12, padding: '10px 16px' }}>%{kat.yuzde}</td>
                  <td style={{ ...tdR, fontWeight: 700, fontSize: 12, color: 'var(--accent2)', padding: '10px 16px' }}>{fmtTL(kat.brut)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* İmza Bloğu */}
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '48px 0', borderTop: '2px solid var(--border-light)' }}>
        {[
          { b: 'ÜYE (DÜZENLEYEN)', a: ayarlar.duzenleyen_adi || '—', u: ayarlar.duzenleyen_unvani || 'Müdür Yardımcısı' },
          { b: 'BAŞKAN (ONAYLAYAN)',  a: ayarlar.mudur_adi || '—',      u: ayarlar.mudur_unvani || 'Okul Müdürü' },
        ].map(i => (
          <div key={i.b} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', marginBottom: 16, letterSpacing: 1 }}>{i.b}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{i.a}</div>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4, fontWeight: 500 }}>{i.u}</div>
            <div style={{ marginTop: 40, width: 200, borderBottom: '1.5px solid var(--border)', margin: '0 auto' }}></div>
            <div style={{ fontSize: 11, marginTop: 8, color: 'var(--text3)', fontWeight: 600 }}>İmza / Mühür</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Sınıf & Stil Sabitleri ────────────────────────────────────
export const actionBtn: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '7px 8px', cursor: 'pointer', color: 'var(--text2)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0, transition: 'all 0.15s',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
}
export const thGrup: React.CSSProperties = {
  padding: '10px 4px', textAlign: 'center', fontSize: 10.5, height: 37, boxSizing: 'border-box',
  fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0,
  borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border-light)',
  background: 'var(--surface2)', lineHeight: 1.4,
}
export const td: React.CSSProperties = {
  padding: '12px 4px', textAlign: 'right', fontSize: 12,
  color: 'var(--text2)', borderRight: '1px solid var(--border-light)',
  whiteSpace: 'nowrap', lineHeight: 1.4
}
