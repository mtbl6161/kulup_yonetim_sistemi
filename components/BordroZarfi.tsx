'use client'
import React from 'react'
import { Ayarlar, BordroSatir } from '@/lib/types'
import { ayLabel, fmtTL, fmt } from '@/lib/hesaplama'

interface Props {
  row: BordroSatir
  ayarlar: Ayarlar | null
  ay: number
  yil: number
}

export default function BordroZarfi({ row, ayarlar, ay, yil }: Props) {
  if (!ayarlar) return null

  const s = row.sonuc
  const p = row.personel

  return (
    <div className="bordro-zarfi" style={{
      width: '100%',
      maxWidth: '210mm',
      padding: '8mm',
      background: 'var(--surface)',
      color: 'var(--text)',
      fontFamily: '"DM Sans", sans-serif',
      fontSize: '10px',
      border: '1px solid var(--border)',
      margin: '0 auto 8mm auto',
      boxShadow: '0 2px 15px rgba(0,0,0,0.04)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Dekoratif Yan Çizgi */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'var(--accent)' }} />

      {/* Üst Başlık ve Kurum Bilgisi */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottom: '1.5px solid var(--accent-lighter)', paddingBottom: 8 }}>
        <div>
          <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: 18, fontWeight: 700, color: 'var(--accent)', margin: 0 }}>{ayarlar.kurum_adi}</h2>
          <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 1, maxWidth: 350 }}>{ayarlar.adres}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 8, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{yil} / {ayLabel(ay, yil).split(' ')[0]}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent2)', marginTop: 1 }}>ÜCRET BORDRO ZARFI</div>
        </div>
      </div>

      {/* Personel & Kurum Detay Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 15 }}>
        <div style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: 8, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 }}>PERSONEL BİLGİLERİ</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { l: 'Adı Soyadı', v: p.ad, b: true },
              { l: 'T.C. Kimlik', v: p.tc || '-' },
              { l: 'Görevi', v: p.gorev },
              { l: 'SGK No', v: p.sgk_no || '-' }
            ].map((item, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, fontSize: 10 }}>
                <span style={{ color: 'var(--text3)' }}>{item.l}:</span>
                <span style={{ fontWeight: item.b ? 700 : 600, wordBreak: 'break-all' }}>{item.v}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: 8, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 }}>KURUM DETAYLARI</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { l: 'Vergi No', v: ayarlar.vergi_no },
              { l: 'SGK İşveren No', v: ayarlar.sgk_no },
              { l: 'SSK Şube', v: ayarlar.ssk_sube || '-' },
              { l: 'Ders Saati', v: `${row.toplamSaat} SAAT`, a: true }
            ].map((item, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '95px 1fr', gap: 8, fontSize: 10 }}>
                <span style={{ color: 'var(--text3)' }}>{item.l}:</span>
                <span style={{ fontWeight: 700, color: item.a ? 'var(--accent)' : 'inherit', wordBreak: 'break-all' }}>{item.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Finansal Tablo */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 15 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--accent)', color: 'white' }}>
              <th style={{ padding: '6px 12px', textAlign: 'left', fontSize: 9 }}>ÖDEME KALEMLERİ</th>
              <th style={{ padding: '6px 12px', textAlign: 'right', fontSize: 9 }}>TUTAR</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '5px 12px', borderBottom: '1px solid var(--border-light)' }}>Aylık Brüt Ücret</td>
              <td style={{ padding: '5px 12px', textAlign: 'right', fontWeight: 700, borderBottom: '1px solid var(--border-light)' }}>{fmtTL(s.brut)}</td>
            </tr>
            <tr>
              <td style={{ padding: '5px 12px', borderBottom: '1px solid var(--border-light)' }}>Gelir Vergisi Matrahı (Bu Ay)</td>
              <td style={{ padding: '5px 12px', textAlign: 'right', borderBottom: '1px solid var(--border-light)' }}>{fmtTL(s.gv_matrah)}</td>
            </tr>
            <tr>
              <td style={{ padding: '5px 12px', borderBottom: '1px solid var(--border-light)', color: 'var(--text3)' }}>Devreden Vergi Matrahı (Eski Aylar)</td>
              <td style={{ padding: '5px 12px', textAlign: 'right', borderBottom: '1px solid var(--border-light)', color: 'var(--text3)' }}>{fmtTL(p.yillik_matrah)}</td>
            </tr>
            <tr>
              <td style={{ padding: '5px 12px', borderBottom: '1px solid var(--border-light)', fontWeight: 600 }}>Kümülatif Vergi Matrahı (Toplam)</td>
              <td style={{ padding: '5px 12px', textAlign: 'right', borderBottom: '1px solid var(--border-light)', fontWeight: 700 }}>{fmtTL((Number(p.yillik_matrah || 0)) + (s.gv_matrah || 0))}</td>
            </tr>
            <tr style={{ background: 'var(--surface2)' }}>
              <td style={{ padding: '6px 12px', fontWeight: 700, color: 'var(--accent)' }}>KAZANÇLAR TOPLAMI</td>
              <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--accent)' }}>{fmtTL(s.brut)}</td>
            </tr>
          </tbody>
        </table>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 1 }}>
          <thead>
            <tr style={{ background: 'var(--accent2)', color: 'white' }}>
              <th style={{ padding: '6px 12px', textAlign: 'left', fontSize: 9 }}>KESİNTİ DETAYLARI</th>
              <th style={{ padding: '6px 12px', textAlign: 'right', fontSize: 9 }}>TUTAR</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '5px 12px', borderBottom: '1px solid var(--border-light)' }}>SGK İşçi Payı (%14 + %1)</td>
              <td style={{ padding: '5px 12px', textAlign: 'right', borderBottom: '1px solid var(--border-light)' }}>{fmtTL(s.sgk_kisi + s.sgk_issizlik)}</td>
            </tr>
            <tr>
              <td style={{ padding: '5px 12px', borderBottom: '1px solid var(--border-light)' }}>Ödenecek Gelir Vergisi (İstisna Düşülmüş)</td>
              <td style={{ padding: '5px 12px', textAlign: 'right', borderBottom: '1px solid var(--border-light)' }}>{fmtTL(s.gv)}</td>
            </tr>
            <tr>
              <td style={{ padding: '5px 12px', borderBottom: '1px solid var(--border-light)' }}>Ödenecek Damga Vergisi (İstisna Düşülmüş)</td>
              <td style={{ padding: '5px 12px', textAlign: 'right', borderBottom: '1px solid var(--border-light)' }}>{fmtTL(s.dv)}</td>
            </tr>
            <tr style={{ background: 'var(--surface2)' }}>
              <td style={{ padding: '6px 12px', fontWeight: 700, color: 'var(--danger)' }}>KESİNTİLER TOPLAMI</td>
              <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--danger)' }}>{fmtTL(s.toplam_kesinti)}</td>
            </tr>
          </tbody>
        </table>

        {/* NET ÜCRET ALANI */}
        <div style={{ background: 'var(--accent)', color: 'white', padding: '10px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>ÖDENECEK NET ÜCRET</span>
          <span style={{ fontSize: 18, fontWeight: 800 }}>{fmtTL(s.net)}</span>
        </div>
      </div>

      {/* İmzalar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginTop: 5 }}>
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10, textAlign: 'center', minHeight: 100, position: 'relative', background: 'white' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', borderBottom: '1px solid var(--border-light)', marginBottom: 8, paddingBottom: 4 }}>İŞVEREN TASDİK</div>
          <div style={{ fontSize: 10, fontWeight: 700 }}>{ayarlar.mudur_adi}</div>
          <div style={{ fontSize: 9, color: 'var(--text3)' }}>Okul Müdürü</div>
          {ayarlar.imza_url && (
            <img src={ayarlar.imza_url} alt="imza" style={{ position: 'absolute', bottom: 5, left: '50%', transform: 'translateX(-50%)', maxHeight: 50, opacity: 0.9 }} />
          )}
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10, textAlign: 'center', minHeight: 100, background: 'white' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', borderBottom: '1px solid var(--border-light)', marginBottom: 8, paddingBottom: 4 }}>PERSONEL İMZA</div>
          <div style={{ fontSize: 9, textAlign: 'left', color: 'var(--text2)', fontStyle: 'italic', lineHeight: 1.3 }}>
            Yukarıda dökümü yapılan net ücretimi teslim aldım.
          </div>
          <div style={{ marginTop: 15, borderBottom: '1px dashed var(--border)', width: '80%', margin: '15px auto 0' }} />
          <div style={{ fontSize: 8, color: 'var(--text3)', marginTop: 2 }}>İmza / Tarih</div>
        </div>
      </div>
      
      {/* Alt Bilgi */}
      <div style={{ textAlign: 'center', marginTop: 12, fontSize: 8, color: 'var(--text3)' }}>
        Bu doküman sistem tarafından otomatik olarak üretilmiştir.
      </div>
    </div>
  )
}
