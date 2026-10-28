'use client'
import { useCallback, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { onayla } from '@/lib/diyalog'
import { useYukleme } from '@/lib/useYukleme'
import type { Tatil } from '@/lib/types'
import type { Ortak } from './YonetimKonsolu'
import { Bolum } from './ortak'

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const GUNLER = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz']
// Tarihi her yıl aynı olan resmî tatiller (dinî bayramlar her yıl değiştiği için elle eklenir)
const SABIT = [
  ['Yılbaşı', '01-01', '01-01'], ['23 Nisan Ulusal Egemenlik ve Çocuk Bayramı', '04-23', '04-23'],
  ['1 Mayıs Emek ve Dayanışma Günü', '05-01', '05-01'], ['19 Mayıs Atatürk’ü Anma, Gençlik ve Spor Bayramı', '05-19', '05-19'],
  ['15 Temmuz Demokrasi ve Millî Birlik Günü', '07-15', '07-15'], ['30 Ağustos Zafer Bayramı', '08-30', '08-30'],
  ['29 Ekim Cumhuriyet Bayramı', '10-28', '10-29'],
] as const
const RENK = { resmi: { zemin: 'var(--accent-lighter)', yazi: 'var(--accent-dark)' }, idari: { zemin: '#fff1d6', yazi: '#8a5200' } }

export default function TatilTakvimi({ bildir }: Ortak) {
  const [tatiller, setTatiller] = useState<Tatil[]>([])
  const [yil, setYil] = useState(() => new Date().getFullYear())
  const [form, setForm] = useState({ ad: '', bas: '', bit: '', tip: 'resmi' })
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const yukle = useCallback(async () => {
    const { data } = await supabase.from('tatiller').select('*').is('okul_id', null).order('baslangic_tarihi')
    setTatiller(data || [])
  }, [])
  useYukleme(yukle)

  const yilTatilleri = useMemo(() => tatiller.filter(t => t.baslangic_tarihi.startsWith(String(yil)) || t.bitis_tarihi.startsWith(String(yil))), [tatiller, yil])
  const tatilBul = (ay: number, gun: number) => {
    const g = `${yil}-${String(ay + 1).padStart(2, '0')}-${String(gun).padStart(2, '0')}`
    return yilTatilleri.find(t => t.baslangic_tarihi.slice(0, 10) <= g && t.bitis_tarihi.slice(0, 10) >= g)
  }

  async function ekle(e: React.FormEvent) {
    e.preventDefault()
    const bit = form.bit || form.bas
    if (!form.ad.trim() || !form.bas) return
    if (bit < form.bas) { bildir({ tur: 'hata', metin: 'Bitiş tarihi başlangıçtan önce olamaz.' }); return }
    if (tatiller.some(t => t.ad.trim().toLocaleLowerCase('tr') === form.ad.trim().toLocaleLowerCase('tr') && t.baslangic_tarihi === form.bas)) { bildir({ tur: 'hata', metin: 'Bu tatil zaten kayıtlı.' }); return }
    setKaydediliyor(true)
    const { error } = await supabase.from('tatiller').insert({ ad: form.ad.trim(), baslangic_tarihi: form.bas, bitis_tarihi: bit, tip: form.tip, okul_id: null })
    setKaydediliyor(false)
    if (error) return
    bildir({ tur: 'basari', metin: 'Tatil tüm kurumlara eklendi.' })
    setForm({ ad: '', bas: '', bit: '', tip: 'resmi' }); await yukle()
  }

  async function sabitleriEkle() {
    if (!(await onayla(`${yil} yılının tarihi sabit resmî tatilleri (${SABIT.length} gün) tüm kurumlara eklenecek. Dinî bayramları ayrıca ekleyin.`, { onayMetni: 'Ekle' }))) return
    setKaydediliyor(true)
    const kayitlar = SABIT.map(([ad, b, s]) => ({ ad, baslangic_tarihi: `${yil}-${b}`, bitis_tarihi: `${yil}-${s}`, tip: 'resmi', okul_id: null }))
    const { error } = await supabase.from('tatiller').upsert(kayitlar, { onConflict: 'ad,baslangic_tarihi' })
    setKaydediliyor(false)
    if (!error) { bildir({ tur: 'basari', metin: `${yil} sabit resmî tatilleri eklendi.` }); await yukle() }
  }

  async function sil(t: Tatil) {
    if (!(await onayla(`“${t.ad}” tüm kurumların takviminden kaldırılacak; iş günü ve ücret hesapları buna göre değişir.`, { baslik: 'Tatil kaldırılsın mı?', onayMetni: 'Kaldır', tehlikeli: true }))) return
    const { error } = await supabase.from('tatiller').delete().eq('id', t.id)
    if (!error) setTatiller(l => l.filter(x => x.id !== t.id))
  }

  return (
    <>
      <Bolum baslik="Yeni tatil" sag={<button type="button" className="btn btn-secondary btn-sm" onClick={sabitleriEkle} disabled={kaydediliyor}>{yil} sabit tatillerini ekle</button>}>
        <form onSubmit={ekle} className="yk-tatil-form">
          <label><span className="form-label">Tatil adı</span><input className="form-input" value={form.ad} onChange={e => setForm(f => ({ ...f, ad: e.target.value }))} placeholder="Örn. Ramazan Bayramı" /></label>
          <label><span className="form-label">Başlangıç</span><input className="form-input" type="date" value={form.bas} onChange={e => setForm(f => ({ ...f, bas: e.target.value }))} /></label>
          <label><span className="form-label">Bitiş</span><input className="form-input" type="date" value={form.bit} min={form.bas} onChange={e => setForm(f => ({ ...f, bit: e.target.value }))} /></label>
          <label><span className="form-label">Tür</span>
            <select className="form-select" value={form.tip} onChange={e => setForm(f => ({ ...f, tip: e.target.value }))}><option value="resmi">Resmî tatil</option><option value="idari">İdari izin</option></select>
          </label>
          <button type="submit" className="btn btn-primary" disabled={!form.ad.trim() || !form.bas || kaydediliyor}><Plus size={14} aria-hidden="true" /> Ekle</button>
        </form>
      </Bolum>

      <Bolum baslik={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <button type="button" className="btn btn-secondary btn-icon btn-sm" onClick={() => setYil(y => y - 1)} aria-label="Önceki yıl"><ChevronLeft size={15} /></button>
          <span style={{ minWidth: 48, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{yil}</span>
          <button type="button" className="btn btn-secondary btn-icon btn-sm" onClick={() => setYil(y => y + 1)} aria-label="Sonraki yıl"><ChevronRight size={15} /></button>
        </span>
      } sag={
        <span style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text3)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><i style={{ width: 12, height: 12, borderRadius: 3, background: RENK.resmi.zemin, border: '1px solid #c9d4fa' }} />Resmî tatil</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><i style={{ width: 12, height: 12, borderRadius: 3, background: RENK.idari.zemin, border: '1px solid #f3d9a6' }} />İdari izin</span>
        </span>
      }>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          {AYLAR.map((ayAd, ay) => {
            const ilk = new Date(yil, ay, 1).getDay()
            const bosluk = ilk === 0 ? 6 : ilk - 1
            const gunSayisi = new Date(yil, ay + 1, 0).getDate()
            return (
              <div key={ay} style={{ border: '1px solid var(--border-light)', borderRadius: 10, padding: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 12.5, textAlign: 'center', marginBottom: 6 }}>{ayAd}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                  {GUNLER.map(g => <div key={g} style={{ textAlign: 'center', fontSize: 9.5, fontWeight: 600, color: 'var(--text3)', paddingBottom: 3 }}>{g}</div>)}
                  {Array.from({ length: bosluk }, (_, i) => <div key={`b${i}`} />)}
                  {Array.from({ length: gunSayisi }, (_, i) => {
                    const gun = i + 1
                    const t = tatilBul(ay, gun)
                    const hs = [0, 6].includes(new Date(yil, ay, gun).getDay())
                    const r = t ? RENK[(t.tip === 'idari' ? 'idari' : 'resmi')] : null
                    return <div key={gun} title={t?.ad} style={{ textAlign: 'center', fontSize: 10.5, padding: '3px 0', borderRadius: 4, background: r?.zemin, color: r ? r.yazi : hs ? 'var(--text3)' : 'var(--text)', fontWeight: t ? 700 : 400 }}>{gun}</div>
                  })}
                </div>
              </div>
            )
          })}
        </div>
        {yilTatilleri.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {yilTatilleri.map(t => {
              const r = RENK[t.tip === 'idari' ? 'idari' : 'resmi']
              const fmt = (s: string) => new Date(s).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
              return (
                <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: r.zemin, borderRadius: 8, padding: '4px 6px 4px 10px', fontSize: 12.5 }}>
                  <strong style={{ fontWeight: 600, color: r.yazi }}>{t.ad}</strong>
                  <span style={{ color: 'var(--text3)' }}>{fmt(t.baslangic_tarihi)}{t.baslangic_tarihi !== t.bitis_tarihi && ` – ${fmt(t.bitis_tarihi)}`}</span>
                  <button type="button" onClick={() => sil(t)} aria-label={`${t.ad} tatilini kaldır`} style={{ border: 0, background: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'inline-flex', padding: 2 }}><X size={13} /></button>
                </span>
              )
            })}
          </div>
        )}
      </Bolum>
    </>
  )
}
