'use client'
import { useEffect, useState, useCallback } from 'react'
import Topbar from '@/components/Topbar'
import { useAy } from '@/lib/AyContext'
import { supabase } from '@/lib/supabase'
import { ayLabel, fmtTL, bordroHesapla } from '@/lib/hesaplama'
import { Personel, Puantaj, Ayarlar, Bordro, BordroSonuc } from '@/lib/types'

interface BordroSatir {
  personel: Personel
  toplamSaat: number
  sonuc: BordroSonuc
  odendi: boolean
  bordroId?: number
}

export default function BordroPage() {
  const { ay, yil } = useAy()
  const [personel, setPersonel] = useState<Personel[]>([])
  const [puantaj, setPuantaj] = useState<Puantaj[]>([])
  const [ayarlar, setAyarlar] = useState<Ayarlar | null>(null)
  const [kaydedilmis, setKaydedilmis] = useState<Bordro[]>([])
  const [satirlar, setSatirlar] = useState<BordroSatir[]>([])
  const [hesaplandi, setHesaplandi] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: per }, { data: puan }, { data: ayr }, { data: brd }] = await Promise.all([
      supabase.from('personel').select('*').order('ad'),
      supabase.from('puantaj').select('*').eq('ay', ay).eq('yil', yil),
      supabase.from('ayarlar').select('*').single(),
      supabase.from('bordro').select('*, personel(*)').eq('ay', ay).eq('yil', yil),
    ])
    setPersonel(per || [])
    setPuantaj(puan || [])
    setAyarlar(ayr)
    setKaydedilmis(brd || [])
    setLoading(false)

    if (brd && brd.length > 0) {
      // Kaydedilmiş bordro varsa göster
      const satirlar: BordroSatir[] = (brd || []).map((b: Bordro & { personel: Personel }) => ({
        personel: b.personel,
        toplamSaat: Number(b.toplam_saat),
        sonuc: {
          brut: Number(b.brut),
          sgk_kisi: Number(b.sgk_kisi),
          sgk_issizlik: Number(b.sgk_issizlik ?? b.sgk_issizlik_kisi),
          gv_matrah: Number(b.gv_matrah ?? 0),
          gv_oran: Number(b.gv_oran),
          gv: Number(b.gv_tutar),   // DB: gv_tutar
          dv: Number(b.damga_tutar), // DB: damga_tutar
          toplam_kesinti: Number(b.toplam_kesinti),
          net: Number(b.net),
          sgk_isveren: Number(b.sgk_isveren),
        },
        odendi: b.odendi,
        bordroId: b.id,
      }))
      setSatirlar(satirlar)
      setHesaplandi(true)
    }
  }, [ay, yil])

  useEffect(() => { load() }, [load])

  function hesapla() {
    if (!ayarlar) return
    const yeniSatirlar: BordroSatir[] = personel.map(p => {
      const pPuan = puantaj.filter(x => x.personel_id === p.id)
      const toplamSaat = pPuan.reduce((s, x) => s + Number(x.etkinlik_saati ?? x.saat), 0)
      const mevcut = kaydedilmis.find(b => b.personel_id === p.id)
      const sonuc = bordroHesapla(ayarlar, toplamSaat, Number(p.yillik_matrah || 0), p.sgk_li)
      return {
        personel: p, toplamSaat, sonuc,
        odendi: mevcut?.odendi || false,
        bordroId: mevcut?.id,
      }
    })
    setSatirlar(yeniSatirlar)
    setHesaplandi(true)
  }

  async function kaydet() {
    if (!satirlar.length) return
    setSaving(true)
    setMsg('')
    const upserts = satirlar.map(s => ({
      personel_id: s.personel.id,
      ay, yil,
      toplam_saat: s.toplamSaat,
      brut: s.sonuc.brut,
      gv_matrah: s.sonuc.gv_matrah,  // migration ile eklendi
      gv_oran: s.sonuc.gv_oran,
      gv_tutar: s.sonuc.gv,          // DB gerçek kolon adı
      damga_tutar: s.sonuc.dv,       // DB gerçek kolon adı
      sgk_kisi: s.sonuc.sgk_kisi,
      sgk_issizlik_kisi: s.sonuc.sgk_issizlik, // DB gerçek kolon adı
      sgk_issizlik: s.sonuc.sgk_issizlik,       // migration alias
      sgk_isveren: s.sonuc.sgk_isveren,
      toplam_kesinti: s.sonuc.toplam_kesinti,
      net: s.sonuc.net,
      odendi: s.odendi,
    }))
    const { error } = await supabase.from('bordro').upsert(upserts, { onConflict: 'personel_id,ay,yil' })
    setSaving(false)
    if (error) { setMsg('❌ Hata: ' + error.message); return }
    setMsg('✅ Bordro kaydedildi!')
    setTimeout(() => setMsg(''), 3000)
    load()
  }

  async function odemeIsaretle(bordroId: number, odendi: boolean) {
    await supabase.from('bordro').update({ odendi }).eq('id', bordroId)
    setSatirlar(s => s.map(x => x.bordroId === bordroId ? { ...x, odendi } : x))
  }

  const toplamBrut = satirlar.reduce((s, r) => s + r.sonuc.brut, 0)
  const toplamGv = satirlar.reduce((s, r) => s + r.sonuc.gv, 0)
  const toplamDv = satirlar.reduce((s, r) => s + r.sonuc.dv, 0)
  const toplamSgkKisi = satirlar.reduce((s, r) => s + r.sonuc.sgk_kisi, 0)
  const toplamKesinti = satirlar.reduce((s, r) => s + r.sonuc.toplam_kesinti, 0)
  const toplamNet = satirlar.reduce((s, r) => s + r.sonuc.net, 0)
  const toplamSgkIsv = satirlar.reduce((s, r) => s + r.sonuc.sgk_isveren, 0)

  return (
    <div>
      <Topbar
        title="Bordro"
        sub={`${ayLabel(ay, yil)} — Ücret hesaplama`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={hesapla} disabled={loading}>
              🔄 Hesapla
            </button>
            {hesaplandi && (
              <button className="btn btn-warn btn-sm" onClick={kaydet} disabled={saving}>
                {saving ? '⏳...' : '💾 Kaydet'}
              </button>
            )}
            <button className="btn btn-secondary btn-sm no-print" onClick={() => window.print()}>🖨️ Yazdır</button>
          </div>
        }
      />
      <div style={{ padding: 28 }}>
        {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`}>{msg}</div>}
        {loading && <div className="alert alert-info">⏳ Yükleniyor...</div>}

        {!hesaplandi && !loading && (
          <div className="alert alert-warn">
            ⚠️ Bordroyu hesaplamak için <strong>"🔄 Hesapla"</strong> butonuna tıklayın. Puantaj verilerinden otomatik hesaplanır.
          </div>
        )}

        {/* Ana Bordro Tablosu */}
        {satirlar.length > 0 && (
          <div className="card">
            <div className="card-title">📊 {ayLabel(ay, yil)} Bordro</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th rowSpan={2} style={{ verticalAlign: 'middle' }}>#</th>
                    <th rowSpan={2} style={{ verticalAlign: 'middle' }}>Ad Soyad</th>
                    <th rowSpan={2} style={{ verticalAlign: 'middle' }}>Görevi</th>
                    <th rowSpan={2} className="td-num" style={{ verticalAlign: 'middle' }}>Top. Saat</th>
                    <th rowSpan={2} className="td-num" style={{ verticalAlign: 'middle' }}>Brüt (₺)</th>
                    <th colSpan={2} style={{ textAlign: 'center', background: '#fef9e7' }}>Gelir Vergisi</th>
                    <th className="td-num" style={{ background: '#fef9e7' }}>Damga V.</th>
                    <th colSpan={2} style={{ textAlign: 'center', background: '#fde8e6' }}>SGK Kişi</th>
                    <th rowSpan={2} className="td-num" style={{ verticalAlign: 'middle' }}>Kesinti</th>
                    <th rowSpan={2} className="td-num" style={{ verticalAlign: 'middle', color: 'var(--success)' }}>Net (₺)</th>
                    <th rowSpan={2} style={{ verticalAlign: 'middle' }}>Ödendi</th>
                  </tr>
                  <tr>
                    <th className="td-num" style={{ background: '#fef9e7' }}>%</th>
                    <th className="td-num" style={{ background: '#fef9e7' }}>₺</th>
                    <th className="td-num" style={{ background: '#fef9e7' }}>₺</th>
                    <th className="td-num" style={{ background: '#fde8e6' }}>%14 ₺</th>
                    <th className="td-num" style={{ background: '#fde8e6' }}>İşs. ₺</th>
                  </tr>
                </thead>
                <tbody>
                  {satirlar.map((s, i) => (
                    <tr key={s.personel.id}>
                      <td style={{ fontSize: 12, color: 'var(--text3)' }}>{i + 1}</td>
                      <td><strong>{s.personel.ad}</strong></td>
                      <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{s.personel.gorev_kategorisi}</span></td>
                      <td className="td-num">{s.toplamSaat}</td>
                      <td className="td-num fw-600">{fmtTL(s.sonuc.brut)}</td>
                      <td className="td-num" style={{ background: '#fef9e7', fontSize: 12 }}>%{(s.sonuc.gv_oran * 100).toFixed(0)}</td>
                      <td className="td-num" style={{ background: '#fef9e7' }}>{fmtTL(s.sonuc.gv)}</td>
                      <td className="td-num" style={{ background: '#fef9e7' }}>{fmtTL(s.sonuc.dv)}</td>
                      <td className="td-num" style={{ background: '#fde8e6' }}>{fmtTL(s.sonuc.sgk_kisi)}</td>
                      <td className="td-num" style={{ background: '#fde8e6' }}>{fmtTL(s.sonuc.sgk_issizlik)}</td>
                      <td className="td-num" style={{ color: 'var(--danger)' }}>{fmtTL(s.sonuc.toplam_kesinti)}</td>
                      <td className="td-num fw-600" style={{ color: 'var(--success)' }}>{fmtTL(s.sonuc.net)}</td>
                      <td style={{ textAlign: 'center' }}>
                        {s.bordroId ? (
                          <button
                            className={`btn btn-sm ${s.odendi ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => odemeIsaretle(s.bordroId!, !s.odendi)}
                          >
                            {s.odendi ? '✅' : '⬜'}
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                  <tr className="sum-row">
                    <td colSpan={4}>TOPLAM</td>
                    <td className="td-num">{fmtTL(toplamBrut)}</td>
                    <td className="td-num">—</td>
                    <td className="td-num">{fmtTL(toplamGv)}</td>
                    <td className="td-num">{fmtTL(toplamDv)}</td>
                    <td className="td-num">{fmtTL(toplamSgkKisi)}</td>
                    <td />
                    <td className="td-num">{fmtTL(toplamKesinti)}</td>
                    <td className="td-num">{fmtTL(toplamNet)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SGK Özeti */}
        {satirlar.length > 0 && (
          <div className="card">
            <div className="card-title">🏥 SGK Özet</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ad Soyad</th>
                    <th className="td-num">Brüt (₺)</th>
                    <th className="td-num">SGK Kişi (₺)</th>
                    <th className="td-num">İşsizlik Kişi (₺)</th>
                    <th className="td-num">SGK İşveren (₺)</th>
                    <th className="td-num">Toplam SGK (₺)</th>
                  </tr>
                </thead>
                <tbody>
                  {satirlar.filter(s => s.personel.sgk_li).map(s => (
                    <tr key={s.personel.id}>
                      <td><strong>{s.personel.ad}</strong></td>
                      <td className="td-num">{fmtTL(s.sonuc.brut)}</td>
                      <td className="td-num">{fmtTL(s.sonuc.sgk_kisi)}</td>
                      <td className="td-num">{fmtTL(s.sonuc.sgk_issizlik)}</td>
                      <td className="td-num">{fmtTL(s.sonuc.sgk_isveren)}</td>
                      <td className="td-num fw-600">{fmtTL(s.sonuc.sgk_kisi + s.sonuc.sgk_issizlik + s.sonuc.sgk_isveren)}</td>
                    </tr>
                  ))}
                  <tr className="sum-row">
                    <td>TOPLAM</td>
                    <td className="td-num">{fmtTL(satirlar.filter(s => s.personel.sgk_li).reduce((sum, s) => sum + s.sonuc.brut, 0))}</td>
                    <td className="td-num">{fmtTL(toplamSgkKisi)}</td>
                    <td className="td-num">{fmtTL(satirlar.reduce((s, r) => s + r.sonuc.sgk_issizlik, 0))}</td>
                    <td className="td-num">{fmtTL(toplamSgkIsv)}</td>
                    <td className="td-num">{fmtTL(toplamSgkKisi + satirlar.reduce((s, r) => s + r.sonuc.sgk_issizlik, 0) + toplamSgkIsv)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
