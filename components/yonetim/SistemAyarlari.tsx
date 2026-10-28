'use client'
import { useCallback, useState } from 'react'
import { onayla } from '@/lib/diyalog'
import { useYukleme } from '@/lib/useYukleme'
import type { Ortak } from './YonetimKonsolu'
import { Bolum, Bos } from './ortak'

export default function SistemAyarlari({ api, bildir, iller, illeriYenile }: Ortak & { illeriYenile: () => Promise<void> }) {
  const [bakim, setBakim] = useState<{ aktif: boolean; mesaj: string } | null>(null)
  const [mesaj, setMesaj] = useState('')
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [yeniIl, setYeniIl] = useState('')
  const [ilAra, setIlAra] = useState('')

  const yukle = useCallback(async () => {
    const r = await api<{ settings: { aktif: boolean; mesaj: string } }>('/api/admin/bakim')
    const s = r.veri?.settings || { aktif: false, mesaj: '' }
    setBakim(s); setMesaj(s.mesaj || '')
  }, [api])
  useYukleme(yukle)

  async function bakimDegis(aktif: boolean) {
    if (aktif && !(await onayla('Bakım modu açılınca sistem yöneticileri dışında kimse giriş yapamaz; açık oturumlar bakım sayfasına yönlenir.', { baslik: 'Bakım modu açılsın mı?', onayMetni: 'Bakımı başlat', tehlikeli: true }))) return
    setKaydediliyor(true)
    const r = await api('/api/admin/bakim', { method: 'POST', govde: { aktif, mesaj: mesaj.trim() } })
    setKaydediliyor(false)
    if (!r.ok) { bildir({ tur: 'hata', metin: 'Kaydedilemedi: ' + r.hata }); return }
    setBakim({ aktif, mesaj: mesaj.trim() })
    bildir({ tur: 'basari', metin: aktif ? 'Bakım modu açıldı.' : 'Bakım modu kapatıldı; sistem herkese açık.' })
  }

  async function ilEkle(e: React.FormEvent) {
    e.preventDefault()
    const ad = yeniIl.trim()
    if (!ad) return
    if (iller.some(i => i.ad.toLocaleLowerCase('tr') === ad.toLocaleLowerCase('tr'))) { bildir({ tur: 'hata', metin: `${ad} zaten listede.` }); return }
    const r = await api('/api/admin/iller', { method: 'POST', govde: { ad } })
    if (!r.ok) { bildir({ tur: 'hata', metin: 'Eklenemedi: ' + r.hata }); return }
    setYeniIl(''); bildir({ tur: 'basari', metin: `${ad} eklendi.` }); await illeriYenile()
  }

  const gorunenIller = [...iller].filter(i => i.ad.toLocaleLowerCase('tr').includes(ilAra.toLocaleLowerCase('tr').trim())).sort((a, b) => a.ad.localeCompare(b.ad, 'tr'))

  return (
    <div className="yk-iki">
      <div className="dar" style={{ maxWidth: 460 }}>
        <Bolum baslik="Bakım modu" sag={bakim && <span className={`badge ${bakim.aktif ? 'badge-red' : 'badge-green'}`}>{bakim.aktif ? 'Sistem kapalı' : 'Sistem açık'}</span>}>
          {!bakim ? <Bos>Yükleniyor…</Bos> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>Güncelleme sırasında kurumların girişini geçici olarak kapatır. Sistem yöneticileri çalışmaya devam eder.</p>
              <label><span className="form-label">Kullanıcılara gösterilecek mesaj</span>
                <textarea className="form-input" rows={3} style={{ paddingTop: 8, paddingBottom: 8, resize: 'vertical', minHeight: 72 }} value={mesaj} onChange={e => setMesaj(e.target.value)} placeholder="Örn. Sistem 22:00–23:00 arası bakımdadır." maxLength={300} />
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                {bakim.aktif && mesaj.trim() !== (bakim.mesaj || '') && <button type="button" className="btn btn-secondary" disabled={kaydediliyor} onClick={() => bakimDegis(true)}>Mesajı güncelle</button>}
                <button type="button" className={`btn ${bakim.aktif ? 'btn-primary' : 'btn-danger'}`} disabled={kaydediliyor} onClick={() => bakimDegis(!bakim.aktif)}>{bakim.aktif ? 'Bakımı bitir' : 'Bakımı başlat'}</button>
              </div>
            </div>
          )}
        </Bolum>
      </div>
      <div className="genis">
        <Bolum baslik={`İller (${iller.length})`} sag={
          <form onSubmit={ilEkle} style={{ display: 'flex', gap: 8 }}>
            <input className="form-input" style={{ width: 160, minHeight: 32 }} placeholder="Yeni il" aria-label="Yeni il adı" value={yeniIl} onChange={e => setYeniIl(e.target.value)} />
            <button type="submit" className="btn btn-secondary btn-sm" disabled={!yeniIl.trim()}>Ekle</button>
          </form>
        }>
          <input className="form-input" style={{ marginBottom: 12, maxWidth: 280 }} type="search" placeholder="İl ara" aria-label="İl ara" value={ilAra} onChange={e => setIlAra(e.target.value)} />
          {gorunenIller.length === 0 ? <Bos>İl bulunamadı.</Bos> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8 }}>
              {gorunenIller.map(il => (
                <div key={il.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 13 }}>
                  <span>{il.ad}</span>
                  <span style={{ fontSize: 12, color: il.okullar?.length ? 'var(--accent-dark)' : 'var(--text3)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{il.okullar?.length || 0}</span>
                </div>
              ))}
            </div>
          )}
          <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--text3)' }}>Kurumun ilini Kurumlar ekranındaki kurum detayından değiştirebilirsiniz.</p>
        </Bolum>
      </div>
    </div>
  )
}
