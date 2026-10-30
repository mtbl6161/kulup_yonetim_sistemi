'use client'
import type React from 'react'
import { kulupOgrencisi } from '@/lib/types'
import { perdeKapat } from '@/lib/perdeKapat'
import type { Birim, Ogrenci, TahsilatKategoriTip, TahsilatVeriKaynagi } from '@/lib/types'
import { Users, RefreshCw, Search, X } from 'lucide-react'
import { overlay, modalCard, TurRozet, secBtn, type FormState } from './yardimcilar'

// Tahsilat kategorisi ekleme / düzenleme penceresi
export default function KategoriModal({ birim, editId, form, setForm, otomatikKilit, kaynakDegistir, ogrenciArama, setOgrenciArama, filtreliOgrenciler, seciliOgrenci, setSeciliOgrenci, toggleOgrenci, saving, setModalAcik, kaydet }: {
  birim: Birim
  editId: number | null
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  otomatikKilit: boolean
  kaynakDegistir: (v: TahsilatVeriKaynagi) => void
  ogrenciArama: string
  setOgrenciArama: (v: string) => void
  filtreliOgrenciler: Ogrenci[]
  seciliOgrenci: Set<number>
  setSeciliOgrenci: React.Dispatch<React.SetStateAction<Set<number>>>
  toggleOgrenci: (id: number) => void
  saving: boolean
  setModalAcik: (acik: boolean) => void
  kaydet: () => void
}) {
  return (
    <div style={overlay} {...perdeKapat(() => !saving && setModalAcik(false))}>
      <div className="card" style={modalCard} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700 }}>{editId ? 'Kategoriyi Düzenle' : 'Yeni Kategori'}</h2>
          <button onClick={() => setModalAcik(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text3)' }}><X size={20} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="form-label">Kategori Adı</label>
            <input className="form-input" autoFocus value={form.ad} onChange={e => setForm(f => ({ ...f, ad: e.target.value }))} placeholder="Örn. Kırtasiye, Bahar Şenliği, Okul Aidatı" />
          </div>
          <div>
            <label className="form-label">Veri Kaynağı</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => kaynakDegistir('manuel')} style={secBtn(form.veri_kaynagi === 'manuel')}><Users size={14} /> Manuel işaretleme</button>
              {birim === 'okul' && <button type="button" onClick={() => kaynakDegistir('otomatik_kulup')} style={secBtn(form.veri_kaynagi === 'otomatik_kulup')}><RefreshCw size={14} /> Otomatik (Kulüp)</button>}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 6, lineHeight: 1.5 }}>
              {otomatikKilit ? 'Kulüp aidatı mevcut Ödeme Takibi verisinden salt-okunur gelir. Aylık ve tüm öğrenciler olarak sabitlenir.' : 'Memur her öğrenciyi ödedi / ödenmedi olarak elle işaretler.'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, opacity: otomatikKilit ? 0.5 : 1, pointerEvents: otomatikKilit ? 'none' : 'auto' }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Dönem Tipi</label>
              <select className="form-select" value={form.tip} onChange={e => setForm(f => ({ ...f, tip: e.target.value as TahsilatKategoriTip }))}>
                <option value="aylik">Aylık (12 ay)</option>
                <option value="donemlik">Dönemlik (1. / 2. Dönem)</option>
                <option value="tek_seferlik">Tek Seferlik</option>
              </select>
            </div>
          </div>
          {!otomatikKilit && (
            <div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Kulüp Öğrencisi Ücreti (₺)</label>
                  <input className="form-input" type="text" inputMode="decimal" value={form.varsayilan_tutar} onChange={e => setForm(f => ({ ...f, varsayilan_tutar: e.target.value }))} placeholder="Opsiyonel" />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Okul Öğrencisi Ücreti (₺)</label>
                  <input className="form-input" type="text" inputMode="decimal" value={form.varsayilan_tutar_okul} onChange={e => setForm(f => ({ ...f, varsayilan_tutar_okul: e.target.value }))} placeholder={form.varsayilan_tutar ? `Boşsa ${form.varsayilan_tutar}` : 'Opsiyonel'} />
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 6, lineHeight: 1.5 }}>
                &quot;Ödedi&quot; işaretlenince öğrencinin türüne göre bu ücret yazılır. Ücret farkı yoksa ikisine aynı tutarı girin (okul ücreti boş bırakılırsa kulüp ücreti kullanılır).
                {form.tip !== 'aylik' && ' Taksit isteyen öğrenciye, takip ekranında hücredeki taksit düğmesiyle bu ücret üzerinden plan açılır.'}
              </div>
            </div>
          )}
          {!otomatikKilit && (
            <div>
              <label className="form-label">Kapsam</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setForm(f => ({ ...f, kapsam: 'tumu' }))} style={secBtn(form.kapsam === 'tumu')}>Tüm öğrenciler</button>
                <button type="button" onClick={() => setForm(f => ({ ...f, kapsam: 'secili' }))} style={secBtn(form.kapsam === 'secili')}>Seçili öğrenciler</button>
              </div>
            </div>
          )}
          {!otomatikKilit && form.kapsam === 'secili' && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                <Search size={14} style={{ color: 'var(--text3)' }} />
                <input value={ogrenciArama} onChange={e => setOgrenciArama(e.target.value)} placeholder="Öğrenci / sınıf ara..." style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13 }} />
                <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>{seciliOgrenci.size} seçili</span>
              </div>
              <div style={{ display: 'flex', gap: 8, padding: '6px 10px', borderBottom: '1px solid var(--border)' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSeciliOgrenci(new Set(filtreliOgrenciler.map(o => o.id)))} style={{ fontSize: 11 }}>Görünenleri Seç</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSeciliOgrenci(new Set())} style={{ fontSize: 11 }}>Temizle</button>
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {filtreliOgrenciler.length === 0 ? (
                  <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>Öğrenci bulunamadı.</div>
                ) : filtreliOgrenciler.map(o => (
                  <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}>
                    <input type="checkbox" checked={seciliOgrenci.has(o.id)} onChange={() => toggleOgrenci(o.id)} />
                    <TurRozet okul={!kulupOgrencisi(o)} />
                    <span style={{ fontSize: 13 }}>{o.ad} {o.soyad}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>{o.sinif || '-'}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
          <button className="btn btn-secondary" onClick={() => setModalAcik(false)} disabled={saving}>İptal</button>
          <button className="btn btn-primary" onClick={kaydet} disabled={saving}>{saving ? 'Kaydediliyor...' : (editId ? 'Güncelle' : 'Kaydet')}</button>
        </div>
      </div>
    </div>
  )
}
