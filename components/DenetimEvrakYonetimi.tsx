'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { DenetimMadde, MaddeTip, OtomatikKod, OTOMATIK_KODLAR } from '@/lib/denetimDosyasi'
import { Plus, Save } from 'lucide-react'

const kutu: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }
const th: React.CSSProperties = { padding: '10px 12px', fontSize: 11, fontWeight: 800, color: 'var(--text3)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }
const td: React.CSSProperties = { padding: '8px 12px', fontSize: 13, borderBottom: '1px solid var(--border-light)', verticalAlign: 'middle' }
const inp: React.CSSProperties = { padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, width: '100%', background: 'var(--surface)', color: 'var(--text)' }
const btn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text2)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }

// ============================================================
// Evrak listesi düzenleyici (il bazında). Silme yok: pasife alınır,
// böylece geçmiş aylarda yüklenmiş belgeler kaybolmaz.
// ============================================================
type Taslak = Omit<DenetimMadde, 'id' | 'il_id'> & { id?: number; degisti?: boolean }

export function DenetimMaddeEditor({ ilId }: { ilId: number }) {
  const [satirlar, setSatirlar] = useState<Taslak[]>([])
  const [msg, setMsg] = useState<{ tip: 'ok' | 'hata'; text: string } | null>(null)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  const load = useCallback(async () => {
    await supabase.rpc('denetim_maddeleri_hazirla')
    const { data, error } = await supabase.from('denetim_maddeleri').select('*').eq('il_id', ilId).order('sira_no')
    if (error) { setMsg({ tip: 'hata', text: 'Liste yüklenemedi: ' + error.message }); return }
    setSatirlar((data || []) as Taslak[])
  }, [ilId])

  useEffect(() => { load() }, [load])

  function degistir(i: number, alan: keyof Taslak, deger: unknown) {
    setSatirlar(s => s.map((r, j) => {
      if (j !== i) return r
      const yeni = { ...r, [alan]: deger, degisti: true }
      if (alan === 'tip' && deger === 'yukleme') yeni.otomatik_kod = null
      if (alan === 'tip' && deger === 'otomatik' && !yeni.otomatik_kod) yeni.otomatik_kod = 'personel_listesi'
      return yeni
    }))
  }

  function ekle() {
    const sira = Math.max(0, ...satirlar.map(s => s.sira_no)) + 1
    setSatirlar(s => [...s, { sira_no: sira, baslik: '', aciklama: '', tip: 'yukleme', otomatik_kod: null, yillik: false, zorunlu: true, aktif: true, degisti: true }])
  }

  async function kaydet() {
    const degisen = satirlar.filter(s => s.degisti)
    if (degisen.some(s => !s.baslik.trim())) { setMsg({ tip: 'hata', text: 'Evrak adı boş bırakılamaz.' }); return }
    setKaydediliyor(true); setMsg(null)
    try {
      for (const s of degisen) {
        const kayit = { sira_no: Number(s.sira_no) || 0, baslik: s.baslik.trim(), aciklama: s.aciklama?.trim() || null, tip: s.tip, otomatik_kod: s.tip === 'otomatik' ? s.otomatik_kod : null, yillik: s.yillik, zorunlu: s.zorunlu, aktif: s.aktif }
        const { error } = s.id
          ? await supabase.from('denetim_maddeleri').update(kayit).eq('id', s.id)
          : await supabase.from('denetim_maddeleri').insert({ ...kayit, il_id: ilId })
        if (error) throw error
      }
      setMsg({ tip: 'ok', text: `✅ ${degisen.length} madde kaydedildi. Okullar bir sonraki açılışta yeni listeyi görür.` })
      await load()
    } catch (e) {
      setMsg({ tip: 'hata', text: '❌ ' + (e as Error).message })
    } finally { setKaydediliyor(false) }
  }

  const degisenVar = satirlar.some(s => s.degisti)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{ fontSize: 18, fontWeight: 800, flex: 1 }}>Denetim Evrak Listesi</div>
        <button style={btn} onClick={ekle}><Plus size={14} /> Madde Ekle</button>
        <button style={{ ...btn, background: degisenVar ? 'var(--accent)' : 'var(--surface2)', color: degisenVar ? '#fff' : 'var(--text3)', border: 'none' }} disabled={!degisenVar || kaydediliyor} onClick={kaydet}>
          <Save size={14} /> {kaydediliyor ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text3)', margin: '0 0 14px' }}>
        İlinizdeki tüm okullar bu listeyi görür. &quot;Sistemden otomatik&quot; maddeler okulun verisinden PDF olarak üretilir. Kaldırmak istediğiniz maddeyi pasife alın; geçmiş belgeler korunur.
      </p>
      {msg && <div style={{ padding: 12, borderRadius: 10, marginBottom: 14, fontSize: 13, background: msg.tip === 'ok' ? 'var(--success-light)' : 'var(--danger-light)', color: msg.tip === 'ok' ? '#1a7a3a' : 'var(--danger)' }}>{msg.text}</div>}
      <div style={kutu}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={{ ...th, width: 64 }}>No</th><th style={th}>Evrak</th><th style={{ ...th, width: 230 }}>Kaynak</th>
            <th style={{ ...th, width: 70 }}>Yıllık</th><th style={{ ...th, width: 76 }}>Zorunlu</th><th style={{ ...th, width: 64 }}>Aktif</th>
          </tr></thead>
          <tbody>
            {satirlar.map((s, i) => (
              <tr key={s.id ?? `yeni-${i}`} style={{ opacity: s.aktif ? 1 : 0.5 }}>
                <td style={td}><input style={inp} type="number" value={s.sira_no} onChange={e => degistir(i, 'sira_no', e.target.value)} /></td>
                <td style={td}>
                  <input style={inp} value={s.baslik} onChange={e => degistir(i, 'baslik', e.target.value)} placeholder="Evrak adı" />
                  <input style={{ ...inp, marginTop: 4, fontSize: 12 }} value={s.aciklama || ''} onChange={e => degistir(i, 'aciklama', e.target.value)} placeholder="Açıklama (isteğe bağlı)" />
                </td>
                <td style={td}>
                  <select style={inp} value={s.tip} onChange={e => degistir(i, 'tip', e.target.value as MaddeTip)}>
                    <option value="yukleme">Okul yükler</option>
                    <option value="otomatik">Sistemden otomatik</option>
                  </select>
                  {s.tip === 'otomatik' && (
                    <select style={{ ...inp, marginTop: 4, fontSize: 12 }} value={s.otomatik_kod || ''} onChange={e => degistir(i, 'otomatik_kod', e.target.value as OtomatikKod)}>
                      {OTOMATIK_KODLAR.map(k => <option key={k.kod} value={k.kod}>{k.ad}</option>)}
                    </select>
                  )}
                </td>
                <td style={{ ...td, textAlign: 'center' }}><input type="checkbox" checked={s.yillik} onChange={e => degistir(i, 'yillik', e.target.checked)} /></td>
                <td style={{ ...td, textAlign: 'center' }}><input type="checkbox" checked={s.zorunlu} onChange={e => degistir(i, 'zorunlu', e.target.checked)} /></td>
                <td style={{ ...td, textAlign: 'center' }}><input type="checkbox" checked={s.aktif} onChange={e => degistir(i, 'aktif', e.target.checked)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
