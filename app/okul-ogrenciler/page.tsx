'use client'
import { useEffect, useMemo, useState, useCallback } from 'react'
import Topbar from '@/components/Topbar'
import ImportModal from '@/components/ImportModal'
import ConfirmModal from '@/components/ConfirmModal'
import { supabase } from '@/lib/supabase'
import { logIslem } from '@/lib/audit'
import { useAuth } from '@/lib/AuthContext'
import { Ogrenci, kulupOgrencisi } from '@/lib/types'
import { Plus, Search, Pencil, Trash2, School, RotateCcw, X, Save, Info } from 'lucide-react'

// Okul öğrencisi = kulübe kayıtlı olmayan, sadece okul tahsilatlarında (Kırtasiye, Etkinlik vb.) yer alan öğrenci.
// Aynı `ogrenciler` tablosunda ogrenci_turu = 'okul' olarak tutulur; kulüp ekranlarında görünmez.

interface FormState { ad: string; soyad: string; tc: string; sinif: string; ogretmen: string; veli_ad: string; anne_tel: string }
const BOS: FormState = { ad: '', soyad: '', tc: '', sinif: '', ogretmen: '', veli_ad: '', anne_tel: '' }

export default function OkulOgrencileriPage() {
  const { okul, profil } = useAuth()
  const okulId = okul?.id ?? profil?.okul_id ?? null

  const [tum, setTum] = useState<Ogrenci[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [filtre, setFiltre] = useState('')
  const [sinifFiltre, setSinifFiltre] = useState('')
  const [listeTuru, setListeTuru] = useState<'aktif' | 'arsiv'>('aktif')
  const [importAcik, setImportAcik] = useState(false)
  const [silOnay, setSilOnay] = useState<Ogrenci | null>(null)

  const [modalAcik, setModalAcik] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(BOS)
  const [saving, setSaving] = useState(false)
  const [formMsg, setFormMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('ogrenciler').select('*').order('soyad')
    setTum(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function bilgi(text: string, sure = 3000) { setMsg(text); if (sure) setTimeout(() => setMsg(''), sure) }

  const okulOgrencileri = useMemo(() => tum.filter(o => !kulupOgrencisi(o)), [tum])
  const kulupSayisi = useMemo(() => tum.filter(o => kulupOgrencisi(o) && o.aktif !== false).length, [tum])
  const siniflar = useMemo(() => Array.from(new Set(okulOgrencileri.map(o => o.sinif).filter(Boolean))).sort((a, b) => a!.localeCompare(b!, 'tr')) as string[], [okulOgrencileri])
  const ogretmenler = useMemo(() => Array.from(new Set(okulOgrencileri.map(o => o.ogretmen).filter(Boolean))).sort() as string[], [okulOgrencileri])

  const liste = useMemo(() => {
    const q = filtre.toLocaleLowerCase('tr').trim()
    return okulOgrencileri
      .filter(o => listeTuru === 'aktif' ? o.aktif !== false : o.aktif === false)
      .filter(o => !sinifFiltre || o.sinif === sinifFiltre)
      .filter(o => !q || `${o.ad} ${o.soyad} ${o.sinif || ''} ${o.tc || ''}`.toLocaleLowerCase('tr').includes(q))
      .sort((a, b) => (a.sinif || '').localeCompare(b.sinif || '', 'tr') || `${a.ad} ${a.soyad}`.localeCompare(`${b.ad} ${b.soyad}`, 'tr'))
  }, [okulOgrencileri, listeTuru, sinifFiltre, filtre])

  function yeniAc() { setEditId(null); setForm(BOS); setFormMsg(''); setModalAcik(true) }
  function duzenleAc(o: Ogrenci) {
    setEditId(o.id)
    setForm({ ad: o.ad, soyad: o.soyad, tc: o.tc || '', sinif: o.sinif || '', ogretmen: o.ogretmen || '', veli_ad: o.veli_ad || '', anne_tel: o.anne_tel || '' })
    setFormMsg(''); setModalAcik(true)
  }

  async function kaydet() {
    const ad = form.ad.trim().toLocaleUpperCase('tr')
    const soyad = form.soyad.trim().toLocaleUpperCase('tr')
    const tc = form.tc.replace(/\s/g, '')
    if (!ad || !soyad) { setFormMsg('❌ Ad ve soyad zorunlu.'); return }
    if (!form.sinif.trim()) { setFormMsg('❌ Sınıf zorunlu.'); return }
    if (tc && !/^\d{11}$/.test(tc)) { setFormMsg('❌ TC 11 haneli rakam olmalı.'); return }
    if (!okulId) { setFormMsg('❌ Oturum bilgisi eksik, sayfayı yenileyin.'); return }

    // Mükerrer kontrolü (kulüp öğrencileri dahil): aynı çocuk iki kez kaydedilmesin.
    // TC veritabanında (tc, okul_id) ile benzersiz olduğundan arşivdekiler de kontrol edilir.
    const cakisan = tum.find(o => o.id !== editId && (
      (tc && o.tc === tc) || (!tc && o.aktif !== false && o.ad === ad && o.soyad === soyad)
    ))
    if (cakisan) {
      const nerede = cakisan.aktif === false
        ? ` — arşivde (${kulupOgrencisi(cakisan) ? 'kulüp' : 'okul'} öğrencisi). Yeni kayıt yerine arşivden geri yükleyin`
        : kulupOgrencisi(cakisan) ? ' (kulüp öğrencisi — okul tahsilatlarında zaten yer alıyor)' : ''
      setFormMsg(`❌ ${cakisan.ad} ${cakisan.soyad} bu TC ile zaten kayıtlı${nerede}.`)
      return
    }

    setSaving(true)
    const payload = {
      ad, soyad, tc: tc || null,
      sinif: form.sinif.trim().toLocaleUpperCase('tr'),
      ogretmen: form.ogretmen.trim() || null,
      veli_ad: form.veli_ad.trim() || null,
      anne_tel: form.anne_tel.trim() || null,
    }
    const { error } = editId
      ? await supabase.from('ogrenciler').update(payload).eq('id', editId)
      : await supabase.from('ogrenciler').insert({ ...payload, ogrenci_turu: 'okul', kardes_indirimi: false, ucretsiz_mi: false, aktif: true, okul_id: okulId })
    setSaving(false)
    if (error) {
      if (error.code === '23505' && /tc/i.test(error.message)) {
        setFormMsg(/ogrenciler_tc_key|unique_tc/.test(error.message)
          ? '❌ Bu TC başka bir kurumda kayıtlı. Veritabanında eski genel TC kısıtı duruyor; supabase/migration_fix_unique_tc_multitenant.sql çalıştırılmalı.'
          : '❌ Bu TC ile kayıtlı bir öğrenci zaten var (arşivdekiler dahil).')
        return
      }
      setFormMsg('❌ Kayıt hatası: ' + error.message); return
    }
    logIslem({ islem: editId ? 'guncelle' : 'ekle', tablo: 'ogrenciler', aciklama: `${ad} ${soyad} (okul öğrencisi) ${editId ? 'güncellendi' : 'eklendi'}` })
    setModalAcik(false)
    bilgi(editId ? '✅ Öğrenci güncellendi.' : '✅ Öğrenci eklendi.')
    load()
  }

  async function aktiflik(o: Ogrenci, aktif: boolean) {
    setSilOnay(null)
    const { error } = await supabase.from('ogrenciler').update({ aktif }).eq('id', o.id)
    if (error) { bilgi('❌ İşlem başarısız: ' + error.message, 6000); return }
    logIslem({ islem: aktif ? 'guncelle' : 'sil', tablo: 'ogrenciler', kayit_id: o.id, aciklama: `${o.ad} ${o.soyad} (okul öğrencisi) ${aktif ? 'arşivden geri yüklendi' : 'arşive kaldırıldı'}` })
    bilgi(aktif ? '✅ Öğrenci geri yüklendi.' : '✅ Öğrenci arşive kaldırıldı.')
    load()
  }

  return (
    <div>
      <Topbar title="Okul Öğrencileri" sub="Kulübe kayıtlı olmayan okul öğrencileri" />
      <div style={{ padding: 28 }}>
        {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: 16 }}>{msg}</div>}

        <div className="alert alert-info" style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            Buraya yalnızca <strong>kulübe kayıtlı olmayan</strong> öğrencileri ekleyin. Kulüp öğrencileri ({kulupSayisi} kişi) Kulüp › Öğrenci Listesi&apos;nden gelir ve okul tahsilatlarında zaten yer alır.
            Tahsilat Takip&apos;te her öğrenciye türüne göre <strong>kulüp</strong> veya <strong>okul</strong> ücreti uygulanır.
          </span>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Okul Öğrencileri ({loading ? '...' : liste.length})</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <select className="form-select" style={{ width: 170 }} value={listeTuru} onChange={e => setListeTuru(e.target.value as 'aktif' | 'arsiv')}>
                <option value="aktif">Aktif Öğrenciler</option>
                <option value="arsiv">Silinenler / Arşiv</option>
              </select>
              <select className="form-select" style={{ width: 140 }} value={sinifFiltre} onChange={e => setSinifFiltre(e.target.value)}>
                <option value="">Tüm Sınıflar</option>
                {siniflar.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div style={{ position: 'relative' }}>
                <input className="form-input" style={{ width: 200, paddingLeft: 34 }} placeholder="Ara..." value={filtre} onChange={e => setFiltre(e.target.value)} />
                <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: '#aaa' }} />
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setImportAcik(true)}>📥 Toplu İçe Aktar</button>
              <button className="btn btn-primary btn-sm" onClick={yeniAc}><Plus size={16} /> Yeni Öğrenci</button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>Ad Soyad</th><th>T.C.</th><th>Sınıf</th><th>Öğretmen</th><th>Veli</th><th>Telefon</th><th>İşlem</th></tr>
              </thead>
              <tbody>
                {liste.length === 0 ? (
                  <tr><td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-icon"><School size={48} style={{ color: 'var(--text3)' }} /></div>
                      <p>{loading ? 'Yükleniyor...' : listeTuru === 'aktif' ? 'Henüz okul öğrencisi yok. Tek tek ekleyebilir veya Excel\'den toplu aktarabilirsiniz.' : 'Arşivde öğrenci yok.'}</p>
                    </div>
                  </td></tr>
                ) : liste.map((o, i) => (
                  <tr key={o.id}>
                    <td style={{ color: 'var(--text3)', fontSize: 12 }}>{i + 1}</td>
                    <td><strong>{o.ad} {o.soyad}</strong></td>
                    <td style={{ fontSize: 12, color: 'var(--text3)' }}>{o.tc || '-'}</td>
                    <td>{o.sinif || '-'}</td>
                    <td>{o.ogretmen || '-'}</td>
                    <td>{o.veli_ad || '-'}</td>
                    <td>{o.anne_tel || '-'}</td>
                    <td>
                      {listeTuru === 'aktif' ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => duzenleAc(o)} style={iconBtn} title="Düzenle"><Pencil size={14} /></button>
                          <button className="btn btn-danger btn-sm" onClick={() => setSilOnay(o)} style={iconBtn} title="Sil ve Arşivle"><Trash2 size={14} /></button>
                        </div>
                      ) : (
                        <button className="btn btn-success btn-sm" onClick={() => aktiflik(o, true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px' }}>
                          <RotateCcw size={13} /> Geri Yükle
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {importAcik && (
        <ImportModal
          tip="ogrenci"
          ogrenciTuru="okul"
          mevcutOgrenciler={tum}
          onKapat={() => setImportAcik(false)}
          onTamamlandi={() => { setImportAcik(false); load() }}
        />
      )}

      {silOnay && (
        <ConfirmModal
          baslik="Öğrenciyi Arşive Kaldır"
          mesaj={`"${silOnay.ad} ${silOnay.soyad}" listeden kaldırılacak. Geçmiş tahsilat kayıtları korunur; "Silinenler / Arşiv" seçeneğinden geri yükleyebilirsiniz.`}
          onayMetni="Evet, Arşivle"
          iptalMetni="İptal"
          tehlikeli
          onOnayla={() => aktiflik(silOnay, false)}
          onIptal={() => setSilOnay(null)}
        />
      )}

      {modalAcik && (
        <div style={overlay} onClick={() => !saving && setModalAcik(false)}>
          <div className="card" style={modalCard} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 19, fontWeight: 700 }}>{editId ? 'Okul Öğrencisini Düzenle' : 'Yeni Okul Öğrencisi'}</h2>
              <button onClick={() => setModalAcik(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text3)' }}><X size={20} /></button>
            </div>
            {formMsg && <div className="alert alert-danger" style={{ marginBottom: 14 }}>{formMsg}</div>}
            <div style={grid2}>
              <div><label className="form-label">Ad *</label><input className="form-input" autoFocus value={form.ad} onChange={e => setForm(f => ({ ...f, ad: e.target.value }))} /></div>
              <div><label className="form-label">Soyad *</label><input className="form-input" value={form.soyad} onChange={e => setForm(f => ({ ...f, soyad: e.target.value }))} /></div>
            </div>
            <div style={grid2}>
              <div><label className="form-label">T.C. Kimlik No</label><input className="form-input" maxLength={11} value={form.tc} onChange={e => setForm(f => ({ ...f, tc: e.target.value }))} placeholder="11 hane" /></div>
              <div>
                <label className="form-label">Sınıf *</label>
                <input className="form-input" list="okul-siniflar" value={form.sinif} onChange={e => setForm(f => ({ ...f, sinif: e.target.value }))} placeholder="Örn. 2-A" />
                <datalist id="okul-siniflar">{siniflar.map(s => <option key={s} value={s} />)}</datalist>
              </div>
            </div>
            <div style={grid2}>
              <div>
                <label className="form-label">Öğretmen</label>
                <input className="form-input" list="okul-ogretmenler" value={form.ogretmen} onChange={e => setForm(f => ({ ...f, ogretmen: e.target.value }))} />
                <datalist id="okul-ogretmenler">{ogretmenler.map(s => <option key={s} value={s} />)}</datalist>
              </div>
              <div><label className="form-label">Veli Adı</label><input className="form-input" value={form.veli_ad} onChange={e => setForm(f => ({ ...f, veli_ad: e.target.value }))} /></div>
            </div>
            <div style={grid2}>
              <div><label className="form-label">Telefon</label><input className="form-input" value={form.anne_tel} onChange={e => setForm(f => ({ ...f, anne_tel: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button className="btn btn-secondary" onClick={() => setModalAcik(false)} disabled={saving}>İptal</button>
              <button className="btn btn-primary" onClick={kaydet} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Save size={16} /> {saving ? 'Kaydediliyor...' : editId ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const iconBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }
const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(26,26,20,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }
const modalCard: React.CSSProperties = { width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: '24px 26px', marginBottom: 0, boxShadow: '0 24px 60px rgba(0,0,0,0.28)' }
