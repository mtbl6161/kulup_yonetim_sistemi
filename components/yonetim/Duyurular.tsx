'use client'
import { useCallback, useState } from 'react'
import { Megaphone, Pencil, Trash2 } from 'lucide-react'
import { onayla } from '@/lib/diyalog'
import { useYukleme } from '@/lib/useYukleme'
import type { Ortak } from './YonetimKonsolu'
import { Bolum, Bos, tarih } from './ortak'
import type { DuyuruSatir } from './ortak'

const TUR: Record<string, { ad: string; rozet: string; renk: string; zemin: string; kenar: string }> = {
  info: { ad: 'Bilgi', rozet: 'badge-blue', renk: 'var(--info)', zemin: 'var(--info-light)', kenar: 'var(--info-border)' },
  warning: { ad: 'Uyarı', rozet: 'badge-orange', renk: 'var(--warn)', zemin: 'var(--warn-light)', kenar: 'var(--warn-border)' },
  danger: { ad: 'Kritik', rozet: 'badge-red', renk: 'var(--danger)', zemin: 'var(--danger-light)', kenar: 'var(--danger-border)' },
}
const BOS = { baslik: '', icerik: '', tur: 'info' }

export default function Duyurular({ api, bildir }: Ortak) {
  const [liste, setListe] = useState<DuyuruSatir[] | null>(null)
  const [form, setForm] = useState(BOS)
  const [duzenlenen, setDuzenlenen] = useState<number | null>(null)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const yukle = useCallback(async () => {
    const r = await api<{ duyurular: DuyuruSatir[] }>('/api/admin/duyurular')
    setListe(r.veri?.duyurular || [])
  }, [api])
  useYukleme(yukle)

  async function kaydet(e: React.FormEvent) {
    e.preventDefault()
    if (!form.baslik.trim() || !form.icerik.trim()) return
    setKaydediliyor(true)
    const govde = { baslik: form.baslik.trim(), icerik: form.icerik.trim(), tur: form.tur }
    const r = duzenlenen
      ? await api('/api/admin/duyurular', { method: 'PUT', govde: { id: duzenlenen, ...govde } })
      : await api('/api/admin/duyurular', { method: 'POST', govde })
    setKaydediliyor(false)
    if (!r.ok) { bildir({ tur: 'hata', metin: 'Kaydedilemedi: ' + r.hata }); return }
    bildir({ tur: 'basari', metin: duzenlenen ? 'Duyuru güncellendi.' : 'Duyuru yayınlandı; kurum panellerinin üstünde görünür.' })
    setForm(BOS); setDuzenlenen(null); await yukle()
  }
  async function aktifDegis(d: DuyuruSatir) {
    const r = await api('/api/admin/duyurular', { method: 'PUT', govde: { id: d.id, aktif: !d.aktif } })
    if (!r.ok) bildir({ tur: 'hata', metin: 'Değiştirilemedi: ' + r.hata }); else await yukle()
  }
  async function sil(d: DuyuruSatir) {
    if (!(await onayla(`“${d.baslik}” duyurusu silinecek.`, { baslik: 'Duyuru silinsin mi?', onayMetni: 'Sil', tehlikeli: true }))) return
    const r = await api('/api/admin/duyurular', { method: 'DELETE', govde: { id: d.id } })
    if (!r.ok) bildir({ tur: 'hata', metin: 'Silinemedi: ' + r.hata }); else { if (duzenlenen === d.id) { setDuzenlenen(null); setForm(BOS) } await yukle() }
  }
  const t = TUR[form.tur] || TUR.info

  return (
    <div className="yk-iki">
      <div className="genis">
        <Bolum baslik="Yayındaki ve geçmiş duyurular" dolgu={false}>
          {liste === null ? <Bos>Yükleniyor…</Bos> : liste.length === 0 ? <Bos>Henüz duyuru yok.</Bos> : (
            <div className="yk-tablo">
              <table className="data-table">
                <thead><tr><th>Tarih</th><th>Tür</th><th>Duyuru</th><th>Durum</th><th className="td-num">İşlem</th></tr></thead>
                <tbody>{liste.map(d => {
                  const tt = TUR[d.tur] || TUR.info
                  return (
                    <tr key={d.id} className={duzenlenen === d.id ? 'secili' : ''}>
                      <td style={{ whiteSpace: 'nowrap' }}>{tarih(d.created_at)}</td>
                      <td><span className={`badge ${tt.rozet}`}>{tt.ad}</span></td>
                      <td><div style={{ fontWeight: 600 }}>{d.baslik}</div><div style={{ fontSize: 12, color: 'var(--text3)', maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.icerik}</div></td>
                      <td>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer' }}>
                          <input type="checkbox" checked={d.aktif} onChange={() => aktifDegis(d)} /> {d.aktif ? 'Yayında' : 'Kapalı'}
                        </label>
                      </td>
                      <td className="td-num" style={{ whiteSpace: 'nowrap' }}>
                        <button type="button" className="btn btn-secondary btn-icon" aria-label="Düzenle" title="Düzenle" onClick={() => { setDuzenlenen(d.id); setForm({ baslik: d.baslik, icerik: d.icerik, tur: d.tur }) }}><Pencil size={14} /></button>{' '}
                        <button type="button" className="btn btn-outline-danger btn-icon" aria-label="Sil" title="Sil" onClick={() => sil(d)}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  )
                })}</tbody>
              </table>
            </div>
          )}
        </Bolum>
      </div>
      <div className="dar" style={{ maxWidth: 420 }}>
        <section className="yk-kart">
          <form onSubmit={kaydet} style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{duzenlenen ? 'Duyuruyu düzenle' : 'Yeni duyuru'}</h2>
            <label><span className="form-label">Başlık</span><input className="form-input" value={form.baslik} onChange={e => setForm(f => ({ ...f, baslik: e.target.value }))} maxLength={120} /></label>
            <label><span className="form-label">İçerik</span><textarea className="form-input" rows={4} style={{ paddingTop: 8, paddingBottom: 8, resize: 'vertical', minHeight: 96 }} value={form.icerik} onChange={e => setForm(f => ({ ...f, icerik: e.target.value }))} maxLength={600} /></label>
            <label><span className="form-label">Tür</span>
              <select className="form-select" value={form.tur} onChange={e => setForm(f => ({ ...f, tur: e.target.value }))}>
                <option value="info">Bilgi</option><option value="warning">Uyarı</option><option value="danger">Kritik</option>
              </select>
            </label>
            <div>
              <span className="form-label">Önizleme</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', borderRadius: 8, background: t.zemin, border: `1px solid ${t.kenar}` }}>
                <span style={{ color: t.renk, display: 'flex' }}><Megaphone size={16} aria-hidden="true" /></span>
                <div style={{ flex: 1, fontSize: 13, color: 'var(--text2)', lineHeight: 1.45 }}><strong style={{ color: 'var(--text)', fontWeight: 600 }}>{form.baslik || 'Başlık'}</strong> {form.icerik || 'İçerik burada görünür.'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {duzenlenen && <button type="button" className="btn btn-secondary" onClick={() => { setDuzenlenen(null); setForm(BOS) }}>Vazgeç</button>}
              <button type="submit" className="btn btn-primary" disabled={!form.baslik.trim() || !form.icerik.trim() || kaydediliyor}>{kaydediliyor ? 'Kaydediliyor…' : duzenlenen ? 'Güncelle' : 'Yayınla'}</button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
