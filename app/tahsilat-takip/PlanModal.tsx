'use client'
import type { TahsilatKategori } from '@/lib/types'
import type { PlanForm } from './yardimcilar'
import { fmtTL } from '@/lib/hesaplama'
import { perdeKapat } from '@/lib/perdeKapat'
import { kulupOgrencisi } from '@/lib/types'
import { sayiCoz } from '@/components/SayiInput'
import { MAX_TAKSIT } from '@/lib/taksit'
import { X } from 'lucide-react'
import { overlay, modalCard, TurRozet } from './yardimcilar'

// Öğrenciye özel taksit planı penceresi: toplam tutar, taksit sayısı, vadeler ve tutarlar
export default function PlanModal({ f, setPlanForm, planFormHesapla, seciliKategori, planSaving, planMsg, planKaydet }: {
  f: PlanForm
  setPlanForm: (f: PlanForm | null) => void
  planFormHesapla: (f: PlanForm, patch: Partial<PlanForm>) => PlanForm
  seciliKategori: TahsilatKategori | null
  planSaving: boolean
  planMsg: string
  planKaydet: () => void
}) {
  const toplamGirilen = f.tutarlar.reduce((s, t) => s + (sayiCoz(t) || 0), 0)
  const toplamHedef = sayiCoz(f.toplam) || 0
  const fark = Math.round((toplamGirilen - toplamHedef) * 100) / 100
  return (
    <div style={overlay} {...perdeKapat(() => !planSaving && setPlanForm(null))}>
      <div className="card" style={{ ...modalCard, maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700 }}>{f.planId ? 'Taksit Planını Düzenle' : 'Taksitlendir'}</h2>
            <div style={{ fontSize: 12.5, color: 'var(--text2)', marginTop: 4 }}>
              <TurRozet okul={!kulupOgrencisi(f.o)} /> <strong>{f.o.ad} {f.o.soyad}</strong> · {seciliKategori?.ad} · {f.d.label}
            </div>
          </div>
          <button onClick={() => setPlanForm(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text3)' }}><X size={20} /></button>
        </div>
        {planMsg && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{planMsg}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label className="form-label">Toplam Tutar (₺)</label>
            <input className="form-input" type="text" inputMode="decimal" value={f.toplam} onChange={e => setPlanForm(planFormHesapla(f, { toplam: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Taksit Sayısı</label>
            <select className="form-select" value={f.adet} onChange={e => setPlanForm(planFormHesapla(f, { adet: Number(e.target.value) }))}>
              {Array.from({ length: MAX_TAKSIT - 1 }, (_, i) => i + 2).map(n => <option key={n} value={n}>{n} taksit</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">İlk Vade</label>
            <input className="form-input" type="date" value={f.ilkVade} onChange={e => setPlanForm(planFormHesapla(f, { ilkVade: e.target.value }))} />
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text3)', marginBottom: 8 }}>Tutar eşit bölünür, vadeler her ay aynı gündür. Aşağıdan tek tek değiştirebilirsiniz.</div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {f.vadeler.map((v, i) => {
            const odendi = f.odenenNo.includes(i + 1)
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr', gap: 10, alignItems: 'center', padding: '8px 12px', borderBottom: i < f.vadeler.length - 1 ? '1px solid var(--border-light)' : 'none', background: odendi ? 'var(--success-light)' : undefined }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>{i + 1}. taksit{odendi && <div style={{ fontSize: 10, color: 'var(--success)', fontWeight: 600 }}>ödendi</div>}</div>
                <input className="form-input" type="date" value={v} onChange={e => setPlanForm({ ...f, vadeler: f.vadeler.map((x, j) => j === i ? e.target.value : x) })} />
                <input className="form-input" type="text" inputMode="decimal" value={f.tutarlar[i] ?? ''} onChange={e => setPlanForm({ ...f, tutarlar: f.tutarlar.map((x, j) => j === i ? e.target.value : x) })} />
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginTop: 8, color: 'var(--text2)' }}>
          <span>Taksitler toplamı: <strong>{fmtTL(toplamGirilen)}</strong></span>
          {fark !== 0 && toplamHedef > 0 && <span style={{ color: 'var(--danger)' }}>Toplam tutardan {fark > 0 ? 'fazla' : 'eksik'}: {fmtTL(Math.abs(fark))}</span>}
        </div>
        <div style={{ marginTop: 12 }}>
          <label className="form-label">Açıklama</label>
          <input className="form-input" value={f.aciklama} onChange={e => setPlanForm({ ...f, aciklama: e.target.value })} placeholder="Opsiyonel (ör. veli talebi)" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={() => setPlanForm(null)} disabled={planSaving}>İptal</button>
          <button className="btn btn-primary" onClick={planKaydet} disabled={planSaving}>{planSaving ? 'Kaydediliyor...' : f.planId ? 'Güncelle' : 'Planı Oluştur'}</button>
        </div>
      </div>
    </div>
  )
}
