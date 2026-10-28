'use client'
import type React from 'react'
import type { Tatil } from '@/lib/types'
import { AYLAR, isGunuSayisi } from '@/lib/hesaplama'
import { Calendar, Info, Trash2, Plus } from 'lucide-react'

// Okul Ayarları › Tatil takvimi: kulüp başlangıcı ve tatil listesi
export default function TatilSekmesi({ tatiller, kbMevcut, kbYil, setKbYil, kbTarih, setKbTarih, kbSaving, kulupBaslangicKaydet, varsayilanEgitimYili, setTatilEkleAcik, setTatilForm, tatilSil }: {
  tatiller: Tatil[]
  kbMevcut: Tatil | undefined
  kbYil: number
  setKbYil: (y: number) => void
  kbTarih: string
  setKbTarih: (t: string) => void
  kbSaving: boolean
  kulupBaslangicKaydet: (kaldir?: boolean) => void
  varsayilanEgitimYili: number
  setTatilEkleAcik: (acik: boolean) => void
  setTatilForm: React.Dispatch<React.SetStateAction<{ ad: string; bas: string; bit: string; tip: string }>>
  tatilSil: (id: number) => void
}) {
  return (
    <>
    <div className="card" style={{ margin: '0 0 20px' }}>
      <div className="card-title"><Calendar size={20} color="var(--accent)" /> Kulüp Başlangıç Tarihi</div>
      <p style={{ fontSize: 12.5, color: 'var(--text2)', margin: '0 0 14px', lineHeight: 1.6 }}>
        Kulüp eğitim yılına geç başladıysa başlangıç tarihini girin. Bu tarihten önceki günler iş günü sayılmaz: aylık iş günü, öğrenci aidatı, puantaj, ders programı ve sınıf defteri buna göre hesaplanır.
      </p>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label className="form-label">Eğitim Yılı</label>
          <select className="form-select" style={{ width: 140 }} value={kbYil} onChange={e => setKbYil(Number(e.target.value))}>
            {[varsayilanEgitimYili - 1, varsayilanEgitimYili, varsayilanEgitimYili + 1].map(y => <option key={y} value={y}>{y}-{y + 1}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Kulübün Başladığı Gün</label>
          <input className="form-input" type="date" style={{ width: 180 }} min={`${kbYil}-09-01`} max={`${kbYil + 1}-08-31`} value={kbTarih} onChange={e => setKbTarih(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-sm" disabled={kbSaving} onClick={() => kulupBaslangicKaydet()}>{kbSaving ? 'Kaydediliyor...' : 'Kaydet'}</button>
        {kbMevcut && <button className="btn btn-secondary btn-sm" disabled={kbSaving} onClick={() => kulupBaslangicKaydet(true)}>Kaldır</button>}
      </div>
      {kbMevcut && (
        <div className="alert alert-info" style={{ marginTop: 14, marginBottom: 0 }}>
          <Info size={16} />
          <span>
            {new Date(kbMevcut.baslangic_tarihi).toLocaleDateString('tr-TR')} – {new Date(kbMevcut.bitis_tarihi).toLocaleDateString('tr-TR')} arası kulüp kapalı sayılıyor.
            {' '}{AYLAR[Number(kbTarih.slice(5, 7))]} ayı iş günü: <strong>{isGunuSayisi(Number(kbTarih.slice(0, 4)), Number(kbTarih.slice(5, 7)), tatiller)}</strong>
          </span>
        </div>
      )}
    </div>
    <div className="card" style={{ margin: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>

        {/* SOL: Global tatiller */}
        <div style={{ borderRight: '1px solid var(--border)', paddingRight: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Calendar size={16} color="var(--accent)" />
            <span style={{ fontWeight: 700, fontSize: 13 }}>Resmi &amp; İdari Tatiller</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', background: 'var(--surface2)', padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap' }}>
              Yönetimden
            </span>
          </div>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {tatiller.filter(t => t.okul_id === null).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 12 }}>
                Henüz eklenmemiş.
              </div>
            ) : (
              tatiller.filter(t => t.okul_id === null).map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{t.ad}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {new Date(t.baslangic_tarihi).toLocaleDateString('tr-TR')}
                      {t.baslangic_tarihi !== t.bitis_tarihi && ` – ${new Date(t.bitis_tarihi).toLocaleDateString('tr-TR')}`}
                    </div>
                  </div>
                  <span className={`badge ${t.tip === 'resmi' ? 'badge-blue' : 'badge-orange'}`} style={{ fontSize: 10, whiteSpace: 'nowrap' }}>
                    {t.tip === 'resmi' ? 'Resmi' : 'İdari'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SAĞ: Okula özel tatiller */}
        <div style={{ paddingLeft: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={16} color="var(--accent)" />
              <span style={{ fontWeight: 700, fontSize: 13 }}>Okula Özel Tatiller</span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => { setTatilForm({ ad: '', bas: '', bit: '', tip: 'ozel' }); setTatilEkleAcik(true) }}>
              <Plus size={13} /> Ekle
            </button>
          </div>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {tatiller.filter(t => t.okul_id !== null).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text3)', fontSize: 12 }}>
                Henüz okula özel tatil eklenmemiş.
              </div>
            ) : (
              tatiller.filter(t => t.okul_id !== null).map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{t.ad}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {new Date(t.baslangic_tarihi).toLocaleDateString('tr-TR')}
                      {t.baslangic_tarihi !== t.bitis_tarihi && ` – ${new Date(t.bitis_tarihi).toLocaleDateString('tr-TR')}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span className={`badge ${t.tip === 'idari' ? 'badge-orange' : 'badge-green'}`} style={{ fontSize: 10 }}>
                      {t.tip === 'idari' ? 'İdari' : 'Özel'}
                    </span>
                    <button className="btn btn-outline-danger btn-icon" title="Sil" style={{ width: 28, height: 28, minHeight: 28 }} onClick={() => tatilSil(t.id)}><Trash2 size={11} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
    </>
  )
}
