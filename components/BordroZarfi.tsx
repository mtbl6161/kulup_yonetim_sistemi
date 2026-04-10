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
      maxWidth: '210mm', // A4 En
      padding: '10mm',
      background: 'white',
      color: 'black',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      fontSize: '11px',
      border: '1px solid #eee',
      margin: '0 auto 10mm auto',
      boxShadow: '0 0 10px rgba(0,0,0,0.05)'
    }}>
      {/* Üst Bilgi Alanı */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px' }}>
        <tbody>
          <tr>
            <td style={{ width: '60%' }}></td>
            <td style={{ border: '1px solid black', padding: '2px 8px', fontWeight: 'bold', textAlign: 'center' }}>YIL / AY</td>
            <td style={{ border: '1px solid black', padding: '2px 8px', textAlign: 'center', width: '60px' }}>{yil}</td>
            <td style={{ border: '1px solid black', padding: '2px 8px', textAlign: 'center', width: '80px' }}>{ayLabel(ay, yil).split(' ')[0]}</td>
          </tr>
        </tbody>
      </table>

      {/* İşveren Bilgileri */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black' }}>
        <tbody>
          <tr>
            <td style={{ width: '150px', borderBottom: '1px solid black', borderRight: '1px solid black', padding: '2px 4px', fontWeight: 'bold' }}>İŞVEREN ADI SOYADI</td>
            <td style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '2px 4px' }}>: {ayarlar.kurum_adi}</td>
            <td style={{ width: '120px', borderBottom: '1px solid black', borderRight: '1px solid black', padding: '2px 4px', fontWeight: 'bold' }}>SSK ŞUBE</td>
            <td style={{ borderBottom: '1px solid black', padding: '2px 4px' }}>: {ayarlar.ssk_sube || '-'}</td>
          </tr>
          <tr>
            <td rowSpan={3} style={{ borderRight: '1px solid black', padding: '2px 4px', fontWeight: 'bold', verticalAlign: 'top' }}>ADRES</td>
            <td rowSpan={3} style={{ borderRight: '1px solid black', padding: '2px 4px', verticalAlign: 'top' }}>: {ayarlar.adres}</td>
            <td style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '2px 4px', fontWeight: 'bold' }}>SSK İŞVEREN NO</td>
            <td style={{ borderBottom: '1px solid black', padding: '2px 4px' }}>: {ayarlar.sgk_no}</td>
          </tr>
          <tr>
            <td style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '2px 4px', fontWeight: 'bold' }}>VERGİ DAİRESİ</td>
            <td style={{ borderBottom: '1px solid black', padding: '2px 4px' }}>: {ayarlar.vergi_dairesi}</td>
          </tr>
          <tr>
            <td style={{ borderRight: '1px solid black', padding: '2px 4px', fontWeight: 'bold' }}>VERGİ NO</td>
            <td style={{ padding: '2px 4px' }}>: {ayarlar.vergi_no}</td>
          </tr>
        </tbody>
      </table>

      {/* Başlık */}
      <div style={{
        background: '#8da9cf',
        color: 'black',
        textAlign: 'center',
        padding: '4px',
        fontWeight: 'bold',
        fontSize: '16px',
        borderLeft: '1px solid black',
        borderRight: '1px solid black',
        letterSpacing: '3px'
      }}>
        ÜCRET BORDRO ZARFI
      </div>

      {/* Personel Ana Bilgi */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', marginBottom: '4px' }}>
        <tbody>
          <tr>
            <td style={{ width: '150px', borderRight: '1px solid black', padding: '3px 4px', fontWeight: 'bold', textAlign: 'center' }}>ADI SOYADI</td>
            <td style={{ borderRight: '2px solid black', padding: '3px 8px', fontWeight: 'bold' }}>: {p.ad}</td>
            <td style={{ width: '120px', borderRight: '1px solid black', padding: '3px 4px', fontWeight: 'bold', textAlign: 'center' }}>GÖREVİ</td>
            <td style={{ padding: '3px 8px', fontWeight: 'bold' }}>: {p.gorev}</td>
          </tr>
        </tbody>
      </table>

      {/* Hesap Bölümü */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {/* Sol Sütun: SGK ve Brüt Detayları */}
        <div>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black' }}>
            <tbody>
              <tr><td style={{ width: '120px', borderBottom: '1px solid black', borderRight: '1px solid black', padding: '2px 4px' }}>Sgk No</td><td style={{ borderBottom: '1px solid black', padding: '2px 4px' }}>: {p.sgk_no || '-'}</td></tr>
              <tr><td style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '2px 4px' }}>TC Kimlik No</td><td style={{ borderBottom: '1px solid black', padding: '2px 4px' }}>: {p.tc || '-'}</td></tr>
              <tr><td style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '2px 4px' }}>Ssk Günü</td><td style={{ borderBottom: '1px solid black', padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>: {p.sgk_li ? 30 : 0}</td></tr>
              <tr><td style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '2px 4px' }}>Aylık Brüt</td><td style={{ borderBottom: '1px solid black', padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>: {fmtTL(s.brut)}</td></tr>
              <tr><td style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '2px 4px' }}>Günlük</td><td style={{ borderBottom: '1px solid black', padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>: {fmtTL(s.brut / 30)}</td></tr>
              <tr><td style={{ borderRight: '1px solid black', padding: '2px 4px' }}>Aylık Ders Saati</td><td style={{ padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>: {row.toplamSaat}</td></tr>
            </tbody>
          </table>
          
          <div style={{ height: '40px' }} /> {/* Boşluk */}
          
          <div style={{ border: '1px solid black', height: '60px', padding: '4px' }}>
            {/* Alt Bilgi Alanı (Opsiyonel) */}
          </div>
        </div>

        {/* Sağ Sütun: Vergi ve Kesinti Detayları */}
        <div>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black' }}>
            <tbody>
              <tr><td style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '2px 4px' }}>Gelir Vergisi Matrahı</td><td style={{ borderBottom: '1px solid black', padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>: {fmtTL(s.gv_matrah)}</td></tr>
              <tr><td style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '2px 4px' }}>Hesaplanan Gelir Vergisi</td><td style={{ borderBottom: '1px solid black', padding: '2px 4px', textAlign: 'right' }}>: {fmtTL(s.gv_hesaplanan)}</td></tr>
              <tr><td style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '2px 4px' }}>Gelir Vergisi İstisna</td><td style={{ borderBottom: '1px solid black', padding: '2px 4px', textAlign: 'right' }}>: {fmtTL(s.gv_istisna)}</td></tr>
              <tr><td style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '2px 4px', fontWeight: 'bold' }}>Ödenecek Gelir Vergisi</td><td style={{ borderBottom: '1px solid black', padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>: {fmtTL(s.gv)}</td></tr>
              <tr><td style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '2px 4px' }}>Hesaplanan Damga Vergisi</td><td style={{ borderBottom: '1px solid black', padding: '2px 4px', textAlign: 'right' }}>: {fmtTL(s.dv_hesaplanan)}</td></tr>
              <tr><td style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '2px 4px' }}>Damga Vergisi İstisna</td><td style={{ borderBottom: '1px solid black', padding: '2px 4px', textAlign: 'right' }}>: {fmtTL(s.dv_istisna)}</td></tr>
              <tr><td style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '2px 4px', fontWeight: 'bold' }}>Ödenecek Damga Vergisi</td><td style={{ borderBottom: '1px solid black', padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>: {fmtTL(s.dv)}</td></tr>
              <tr><td style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '2px 4px', fontSize: '10px' }}>Ssk + İşsizlik Sigortası İşçi Payı</td><td style={{ borderBottom: '1px solid black', padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>: {fmtTL(s.sgk_kisi + s.sgk_issizlik)}</td></tr>
              <tr style={{ background: '#f5f5f5' }}><td style={{ borderBottom: '1px solid black', borderRight: '1px solid black', padding: '3px 4px', fontWeight: 'bold' }}>KAZANÇLAR TOPLAMI</td><td style={{ borderBottom: '1px solid black', padding: '3px 4px', textAlign: 'right', fontWeight: 'bold' }}>: {fmtTL(s.brut)}</td></tr>
              <tr style={{ background: '#f5f5f5' }}><td style={{ borderRight: '1px solid black', padding: '3px 4px', fontWeight: 'bold' }}>KESİNTİLER TOPLAMI</td><td style={{ padding: '3px 4px', textAlign: 'right', fontWeight: 'bold' }}>: {fmtTL(s.toplam_kesinti)}</td></tr>
            </tbody>
          </table>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black', marginTop: '12px' }}>
            <tbody>
              <tr>
                <td style={{ borderRight: '1px solid black', padding: '6px 4px', fontWeight: 'bold', fontSize: '14px' }}>NET ÜCRET</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '16px' }}>: {fmtTL(s.net)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* İmzalar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '16px' }}>
        {/* İşveren Kutusu */}
        <div style={{ border: '1px solid black', padding: '4px', textAlign: 'center', minHeight: '120px', position: 'relative' }}>
          <div style={{ fontWeight: 'bold', borderBottom: '1px solid black', marginBottom: '8px', paddingBottom: '2px' }}>İŞVEREN</div>
          <div style={{ fontSize: '10px' }}>
            {ayarlar.kurum_adi}<br />
            {ayarlar.mudur_adi}<br />
            Okul Müdürü
          </div>
          {ayarlar.imza_url && (
            <img src={ayarlar.imza_url} alt="imza" style={{ position: 'absolute', bottom: '4px', left: '50%', transform: 'translateX(-50%)', maxHeight: '60px', opacity: 0.8 }} />
          )}
        </div>

        {/* Denetim/Alıcı Kutusu */}
        <div style={{ border: '1px solid black', padding: '4px', textAlign: 'center', minHeight: '120px', position: 'relative' }}>
          <div style={{ fontWeight: 'bold', borderBottom: '1px solid black', marginBottom: '8px', paddingBottom: '2px' }}>Denetim Yetkilisi / Teslim Alan</div>
          <div style={{ fontSize: '10px', textAlign: 'left', marginTop: '2px' }}>
            Ücretimi Net ve Eksiksiz Olarak Aldım<br />
            İmza :
          </div>
          <div style={{ borderBottom: '1px dotted black', width: '80%', margin: '20px auto 0 auto' }} />
        </div>
      </div>
    </div>
  )
}
