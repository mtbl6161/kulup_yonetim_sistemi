'use client'
import { useState } from 'react'
import Topbar from '@/components/Topbar'
import Badge from '@/components/Badge'
import ImportModal from '@/components/ImportModal'
import { supabase } from '@/lib/supabase'
import { logIslem } from '@/lib/audit'
import { useAuth } from '@/lib/AuthContext'
import { Personel, Ayarlar } from '@/lib/types'
import ConfirmModal from '@/components/ConfirmModal'
import PersonelModal from '@/components/PersonelModal'
import { Plus, Pencil, Trash2, RotateCcw, FileSpreadsheet, X } from 'lucide-react'
import { kisiTekillestir } from '@/lib/hesaplama'
import { excelIndir, bugunEtiketi } from '@/lib/excel'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { EmptyStudents } from '@/components/brand/Illustrations'
import { useYukleme } from '@/lib/useYukleme'

function PersonelIc() {
  const { profil } = useAuth()
  const searchParams = useSearchParams()
  const targetId = searchParams.get('id')

  const [personel, setPersonel] = useState<Personel[]>([])
  const [editItem, setEditItem] = useState<Personel | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [silOnayId, setSilOnayId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [importAcik, setImportAcik] = useState(false)
  const [ayarlar, setAyarlar] = useState<Ayarlar | null>(null)
  const [listeTuru, setListeTuru] = useState<'aktif' | 'arsiv'>('aktif')

  async function load() {
    setLoading(true)
    const [{ data: per }, { data: ayr }] = await Promise.all([
      supabase.from('personel').select('*').order('ad'),
      supabase.from('ayarlar').select('*').single()
    ])
    setPersonel(per || [])
    setAyarlar(ayr || null)
    setLoading(false)

    // URL'den gelen ID varsa modalı aç
    const aktifPersonel = (per || []).filter(p => p.aktif !== false)
    if (targetId && aktifPersonel.length > 0) {
      const found = aktifPersonel.find(p => p.id === Number(targetId))
      if (found) {
        setEditItem(found)
        setIsModalOpen(true)
      }
    }
  }

  useYukleme(load, [targetId])

  function duzenle(p: Personel) {
    setEditItem(p)
    setIsModalOpen(true)
  }

  async function sil(id: number) {
    const silinen = personel.find(p => p.id === id)
    setSilOnayId(null)

    const { error } = await supabase
      .from('personel')
      .update({ aktif: false })
      .eq('id', id)

    if (!error) {
      if (silinen) logIslem({ islem: 'sil', tablo: 'personel', kayit_id: id, aciklama: `${silinen.ad} arşive kaldırıldı` })
      load()
      return
    }

    setMsg(`❌ Silme hatası: ${error.message}`)
    setTimeout(() => setMsg(''), 10000)
  }

  async function geriYukle(id: number) {
    const geriYuklenen = personel.find(p => p.id === id)
    const { error } = await supabase
      .from('personel')
      .update({ aktif: true })
      .eq('id', id)

    if (!error) {
      if (geriYuklenen) logIslem({ islem: 'guncelle', tablo: 'personel', kayit_id: id, aciklama: `${geriYuklenen.ad} arşivden geri yüklendi` })
      load()
      setMsg('✅ Personel başarıyla geri yüklendi.')
      setTimeout(() => setMsg(''), 3000)
      return
    }

    setMsg(`❌ Geri yükleme hatası: ${error.message}`)
    setTimeout(() => setMsg(''), 10000)
  }

  function modalKapat() {
    setIsModalOpen(false)
    setEditItem(null)
  }

  const getPriority = (gorev: string = '') => {
    const g = gorev.toLowerCase();
    if (g.includes('başkan') && !g.includes('yardımcısı')) return 1;
    if (g.includes('yardımcısı') || g.includes('müdür')) return 2;
    if (g.includes('denetim')) return 3;
    if (g.includes('koordinatör')) return 4;
    if (g.includes('öğretmen')) return 5;
    if (g.includes('usta')) return 6;
    if (g.includes('muhasebe') || g.includes('memur')) return 7;
    if (g.includes('temizlik') || g.includes('hizmet')) return 8;
    return 9;
  };

  // Aynı kişinin birden fazla görev kaydı (ör. Başkan Yrd. + Koordinatör Öğretmen) tek satırda gösterilir;
  // üst görev satırda kalır, diğerleri ek görev rozeti olur (bordroda zaten yalnız biri ödenir)
  const { tekil, ekGorevler } = kisiTekillestir(
    personel.filter(p => listeTuru === 'aktif' ? p.aktif !== false : p.aktif === false),
    p => getPriority(p.gorev)
  )
  const gorevler = (p: Personel) => [p, ...(ekGorevler.get(p.id) || [])]

  const sorted = [...tekil]
    .sort((a, b) => {
      const p1 = getPriority(a.gorev);
      const p2 = getPriority(b.gorev);
      if (p1 !== p2) return p1 - p2;
      return (a.ad || '').localeCompare(b.ad || '', 'tr');
    });

  const excelAktar = () => excelIndir(`Personel_Listesi_${listeTuru === 'arsiv' ? 'Arsiv_' : ''}${bugunEtiketi()}`, 'Personel',
    ['Sıra', 'Ad soyad', 'T.C. Kimlik No', 'Görev', 'Meslek kodu', 'Sigorta', 'Emekli', 'SGK no', 'IBAN', 'E-posta'],
    sorted.map((p, i) => [i + 1, p.ad, p.tc, gorevler(p).map(x => x.gorev).join(' / '), p.meslek_kodu, p.sgk_li ? "SGK'lı" : 'Kadrolu', p.is_retired ? 'Evet' : 'Hayır', p.sgk_no, p.iban, p.email]))

  return (
    <div>
      <Topbar title="Personeller" sub="Çalışan yönetimi" actions={<button className="btn btn-secondary btn-sm" onClick={excelAktar} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><FileSpreadsheet size={15} /> Excel</button>} />
      <div style={{ padding: 20 }}>
        {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: 20 }}>{msg}</div>}

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>
              Personeller ({loading ? '...' : sorted.length})
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                className="form-select"
                style={{ width: 180 }}
                value={listeTuru}
                onChange={e => setListeTuru(e.target.value as typeof listeTuru)}
              >
                <option value="aktif">Aktif Personeller</option>
                <option value="arsiv">Silinenler / Arşiv</option>
              </select>
              <button className="btn btn-secondary btn-sm" onClick={() => setImportAcik(true)}>
                📥 Toplu İçe Aktar
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setIsModalOpen(true)}>
                <Plus size={16} /> Yeni Personel Ekle
              </button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead style={{ fontSize: 11 }}>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Personel Bilgisi</th>
                  <th>Görev / Meslek</th>
                  <th>Durum</th>
                  <th>Finansal / IBAN</th>
                  <th>Koord.</th>
                  <th style={{ textAlign: 'right' }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr><td colSpan={10}>
                    <div className="empty-state">
                      <EmptyStudents width={200} />
                      <p>{loading ? 'Yükleniyor...' : 'Personel bulunamadı'}</p>
                    </div>
                  </td></tr>
                ) : (
                  sorted.map((p, i) => (
                    <tr key={p.id} style={{ fontSize: 12 }}>
                      <td style={{ color: 'var(--text3)', fontSize: 11 }}>{i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text1)' }}>{p.ad}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                          {p.tc || 'TC Yok'} • {p.email || 'E-posta Yok'}
                        </div>
                      </td>
                      <td>
                        <div style={{ marginBottom: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <span className="badge badge-blue" style={{ fontSize: 10 }}>{p.gorev}</span>
                          {(ekGorevler.get(p.id) || []).map(e => (
                            <span key={e.id} className="badge badge-gray" style={{ fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              title="Aynı kişinin ek görev kaydı — bordroda yalnız ücreti yüksek görev ödenir">
                              <button type="button" onClick={() => duzenle(e)} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: 'inherit', font: 'inherit' }}>+ {e.gorev}</button>
                              {listeTuru === 'aktif' && (
                                <button type="button" onClick={() => setSilOnayId(e.id)} title="Bu görev kaydını arşive kaldır" aria-label={`${e.gorev} görev kaydını arşive kaldır`}
                                  style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: 'inherit', display: 'inline-flex' }}><X size={10} /></button>
                              )}
                              {listeTuru === 'arsiv' && (
                                <button type="button" onClick={() => geriYukle(e.id)} title="Bu görev kaydını geri yükle" aria-label={`${e.gorev} görev kaydını geri yükle`}
                                  style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: 'inherit', display: 'inline-flex' }}><RotateCcw size={10} /></button>
                              )}
                            </span>
                          ))}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
                          Kod: {p.meslek_kodu || '-'}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <Badge variant={p.personel_turu === 'kadrolu' ? 'blue' : 'orange'}>
                            {p.personel_turu === 'kadrolu' ? 'Kadrolu' : 'SGK\'lı'}
                          </Badge>
                          {p.sgk_li && <Badge variant="green">SGK Girişi Var</Badge>}
                          {p.is_retired && <Badge variant="gray">Emekli</Badge>}
                          {p.vergi_istisnasi && (
                            <Badge variant="orange">
                              {p.vergi_istisna_tipi === 'tutar'
                                ? `İstisna: ₺${(Number(p.istisna_gv_tutari || 0) + Number(p.istisna_dv_tutari || 0)).toLocaleString('tr-TR')}`
                                : 'Tam İstisna'}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>
                          {p.yillik_matrah ? `₺${Number(p.yillik_matrah).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '-'}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.iban || ''}>
                          {p.iban || 'IBAN Yok'}
                        </div>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {(() => {
                          const koor = personel.find(k => k.id === p.koordinator_id)
                          return koor ? koor.ad.split(' ')[0] : <span style={{ color: '#ccc' }}>-</span>
                        })()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {listeTuru === 'aktif' ? (
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary btn-icon" onClick={() => duzenle(p)} title="Düzenle"><Pencil size={14} /></button>
                            <button className="btn btn-outline-danger btn-icon" onClick={() => setSilOnayId(p.id)} title="Sil ve Arşivle"><Trash2 size={14} /></button>
                          </div>
                        ) : (
                          <button className="btn btn-success btn-sm" onClick={() => geriYukle(p.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px' }} title="Arşivden Geri Yükle">
                            <RotateCcw size={13} /> Geri Yükle
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {importAcik && (
        <ImportModal
          tip="personel"
          mevcutPersonel={personel}
          onKapat={() => setImportAcik(false)}
          onTamamlandi={() => { setImportAcik(false); load() }}
        />
      )}

      {silOnayId !== null && (() => {
        const hedef = personel.find(p => p.id === silOnayId)
        return (
          <ConfirmModal
            baslik="Personeli Sil ve Arşive Kaldır"
            mesaj={`"${hedef?.ad}" adlı personelin "${hedef?.gorev}" görev kaydını silmek istediğinizden emin misiniz? Kayıt listeden kaldırılır (kişinin başka görev kaydı varsa o kalır) ancak geçmiş dönemlerdeki tüm bordro ve puantaj verileri ismiyle beraber korunmaya devam eder. Dilediğiniz zaman "Silinenler / Arşiv" seçeneğinden personeli tüm geçmiş bilgileriyle birlikte geri yükleyebilirsiniz.`}
            onayMetni="Evet, Sil ve Arşivle"
            iptalMetni="İptal"
            onOnayla={() => sil(silOnayId)}
            onIptal={() => setSilOnayId(null)}
          />
        )
      })()}

      {isModalOpen && (
        <PersonelModal
          editItem={editItem}
          ayarlar={ayarlar}
          profilOkulId={profil?.okul_id}
          onClose={modalKapat}
          onSaved={() => {
            modalKapat()
            load()
            setMsg('✅ Personel başarıyla kaydedildi.')
            setTimeout(() => setMsg(''), 3000)
          }}
        />
      )}
    </div>
  )
}

export default function PersonelPage() {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <PersonelIc />
    </Suspense>
  )
}
