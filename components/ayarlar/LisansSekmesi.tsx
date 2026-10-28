'use client'
import type { Okul } from '@/lib/types'
import { Info, CreditCard, CheckCircle2 } from 'lucide-react'

// Okul Ayarları › Lisans: abonelik durumu ve ödeme
export default function LisansSekmesi({ okulData, lisansGecerli, secilenPeriod, setSecilenPeriod, checkoutLoading, handlePayment }: {
  okulData: Okul | null
  lisansGecerli: boolean
  secilenPeriod: 'month' | 'year'
  setSecilenPeriod: (p: 'month' | 'year') => void
  checkoutLoading: boolean
  handlePayment: (variantId: string, interval: string) => void
}) {
  return (
    <div className="card" style={{ margin: 0, maxWidth: 600 }}>
      <div className="card-title"><CreditCard size={20} color="var(--accent)" /> Sistem Lisans Durumu</div>

      <div style={{ padding: '24px', background: 'var(--bg2)', borderRadius: 16, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Lisans Durumu</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: okulData?.odeme_durumu === 'aktif' ? '#10b981' : '#f59e0b' }}></div>
              <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>{okulData?.odeme_durumu || 'Deneme'}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Bitiş Tarihi</div>
            <div style={{ fontWeight: 700 }}>
              {okulData?.lisans_bitis ? new Date(okulData.lisans_bitis).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Belirlenmedi'}
            </div>
          </div>
        </div>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 24 }}>
        <Info size={18} />
        <span>Sistem lisansınız <strong>{secilenPeriod === 'month' ? 'aylık' : 'yıllık'}</strong> olarak yenilenir. Ödeme yapıldığında süreniz otomatik olarak <strong>{secilenPeriod === 'month' ? '1 ay' : '1 yıl'}</strong> uzatılacaktır.</span>
      </div>

      {/* Paket Seçici Toggle */}
      <div style={{ 
        display: 'flex', background: 'var(--surface2)', padding: 4, borderRadius: 12, 
        gap: 4, marginBottom: 20, border: '1px solid var(--border-light)', marginTop: 20 
      }}>
        {(['month', 'year'] as const).map(d => (
          <button 
            key={d} 
            onClick={() => setSecilenPeriod(d)} 
            style={{
              flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              background: secilenPeriod === d ? 'var(--accent)' : 'transparent',
              color: secilenPeriod === d ? '#fff' : 'var(--text2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}
          >
            {d === 'month' ? 'Aylık Ödeme' : 'Yıllık Ödeme'}
            {d === 'year' && <span style={{ fontSize: 9, background: '#fbbf24', color: '#000', padding: '1px 6px', borderRadius: 4 }}>%20 İNDİRİM</span>}
          </button>
        ))}
      </div>

      {/* Fiyat Bilgisi ve Özellikler */}
      <div style={{ background: 'var(--surface2)', borderRadius: 16, padding: '24px', border: '1px solid var(--border-light)', textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
          {secilenPeriod === 'year' && (
            <span style={{ fontSize: 16, color: 'var(--text3)', textDecoration: 'line-through', marginBottom: -8 }}>₺9.000</span>
          )}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>₺</span>
            <span style={{ fontSize: 42, fontWeight: 800, color: 'var(--text)' }}>{secilenPeriod === 'month' ? '750' : '7.500'}</span>
            <span style={{ fontSize: 14, color: 'var(--text2)' }}>/ {secilenPeriod === 'month' ? 'ay' : 'yıl'}</span>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '20px 0', opacity: 0.5 }} />

        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', textAlign: 'left', display: 'inline-block' }}>
          {[
            'Sınırsız Öğrenci ve Personel Kaydı',
            'Otomatik Bordro ve Puantaj Takibi',
            'Dijital Sınıf Defteri ve Yoklama',
            'Ödeme ve Aidat Otomasyonu',
            '7/24 Teknik Destek ve Güncellemeler'
          ].map((f, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>
              <CheckCircle2 size={14} color="var(--success)" /> {f}
            </li>
          ))}
        </ul>

        {lisansGecerli ? (
          <div className="flex flex-col gap-4">
            <div style={{ 
              background: 'rgba(39, 174, 96, 0.1)', 
              border: '1px solid var(--success-border)',
              padding: '16px', borderRadius: 12, textAlign: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--success)', fontWeight: 700, fontSize: 15 }}>
                <CheckCircle2 size={18} />
                Lisansınız Aktif
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
                {okulData?.odeme_durumu === 'deneme' ? 'Deneme süreniz devam ediyor.' : 'Abonelik süreniz devam ediyor.'}
              </div>
            </div>

            <button 
              onClick={() => handlePayment(secilenPeriod === 'month' ? '1581329' : '1581465', secilenPeriod)}
              disabled={checkoutLoading || !okulData}
              style={{
                width: '100%',
                background: 'white',
                color: 'var(--accent)',
                padding: '14px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '700',
                border: '2px solid var(--accent)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'var(--accent)' }}
            >
              {checkoutLoading ? 'Hazırlanıyor...' : (
                okulData?.odeme_durumu === 'deneme' ? 'Şimdi Lisans Al' : 
                (secilenPeriod === 'year' ? 'Yıllık Pakete Yükselt (%20 İndirim)' : 'Abonelik Süresini Uzat')
              )}
            </button>
          </div>
        ) : (
          <button 
            onClick={() => handlePayment(secilenPeriod === 'month' ? '1581329' : '1581465', secilenPeriod)}
            disabled={checkoutLoading || !okulData}
            style={{
              width: '100%',
              background: 'var(--accent)',
              color: '#fff',
              padding: '16px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(35,71,217, 0.2)'
            }}
          >
            {checkoutLoading ? 'Bağlantı Hazırlanıyor...' : 'Hemen Güvenli Öde'}
          </button>
        )}
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)', marginTop: 16 }}>
        Ödemeleriniz Lemon Squeezy güvencesiyle 256-bit SSL ile korunmaktadır.
      </p>
    </div>
  )
}
