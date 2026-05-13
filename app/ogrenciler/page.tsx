'use client'
import { useEffect, useState } from 'react'
import Topbar from '@/components/Topbar'
import Badge from '@/components/Badge'
import ImportModal from '@/components/ImportModal'
import ConfirmModal from '@/components/ConfirmModal'
import { supabase } from '@/lib/supabase'
import { logIslem } from '@/lib/audit'
import { useAuth } from '@/lib/AuthContext'
import { Ogrenci, Ayarlar, Personel } from '@/lib/types'
import OgrenciModal from '@/components/OgrenciModal'
import { Plus, Search } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function OgrencilerIc() {
  const { profil } = useAuth()
  const searchParams = useSearchParams()
  const targetId = searchParams.get('id')

  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>([])
  const [personel, setPersonel] = useState<Personel[]>([])
  const [siniflar, setSiniflar] = useState<any[]>([])
  const [editItem, setEditItem] = useState<Ogrenci | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [silOnayId, setSilOnayId] = useState<number | null>(null)
  const [filtre, setFiltre] = useState('')
  const [sinifFiltre, setSinifFiltre] = useState('')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [importAcik, setImportAcik] = useState(false)
  const [ayarlar, setAyarlar] = useState<Ayarlar | null>(null)

  async function load() {
    setLoading(true)
    const [{ data: ogr }, { data: per }, { data: sin }, { data: ayr }] = await Promise.all([
      supabase.from('ogrenciler').select('*').order('soyad'),
      supabase.from('personel').select('*').order('ad'),
      supabase.from('siniflar').select('*').eq('aktif', true).order('ad'),
      supabase.from('ayarlar').select('*').single()
    ])
    
    const aktifOgrenciler = (ogr || []).filter(o => o.aktif !== false)
    setOgrenciler(aktifOgrenciler)
    setPersonel((per || []).filter(p => p.aktif !== false))
    setSiniflar(sin || [])
    setAyarlar(ayr || null)
    setLoading(false)

    // URL'den gelen ID varsa modalı aç
    if (targetId && aktifOgrenciler.length > 0) {
      const found = aktifOgrenciler.find(o => o.id === Number(targetId))
      if (found) {
        setEditItem(found)
        setIsModalOpen(true)
      }
    }
  }

  useEffect(() => { load() }, [targetId])

  // Hiyerarşik Sıralama ve Filtreleme Mantığı
  const ogretmenListesi = personel
    .filter(p => {
      const g = (p.gorev || '').toLowerCase()
      // Sadece ilgili rolleri al
      return g.includes('başkan') || g.includes('öğretmen') || g.includes('usta') || g.includes('koordinatör')
    })
    .sort((a, b) => {
      const getPriority = (gorev: string = '') => {
        const g = gorev.toLowerCase()
        if (g.includes('başkan') && !g.includes('yardımcısı')) return 1
        if (g.includes('yardımcısı') || g.includes('müdür')) return 2
        if (g.includes('koordinatör')) return 3
        if (g.includes('öğretmen')) return 4
        if (g.includes('usta')) return 5
        return 6
      }
      const p1 = getPriority(a.gorev)
      const p2 = getPriority(b.gorev)
      if (p1 !== p2) return p1 - p2
      return (a.ad || '').localeCompare(b.ad || '', 'tr')
    })

  function duzenle(o: Ogrenci) {
    setEditItem(o)
    setIsModalOpen(true)
  }

  async function sil(id: number) {
    const silinen = ogrenciler.find(o => o.id === id)
    setSilOnayId(null)

    const { error } = await supabase
      .from('ogrenciler')
      .delete()
      .eq('id', id)

    if (!error) {
      if (silinen) logIslem({ islem: 'sil', tablo: 'ogrenciler', kayit_id: id, aciklama: `${silinen.ad} ${silinen.soyad} silindi` })
      load()
      return
    }

    if (error.code === '23503') {
      setMsg(`❌ "${silinen?.ad} ${silinen?.soyad}" silinemedi: Bağlı yoklama/tahsilat kayıtları var. Lütfen önce "migration_fix_fk_on_delete_set_null.sql" dosyasını Supabase'de çalıştırın.`)
    } else {
      setMsg(`❌ Silme hatası (${error.code}): ${error.message}`)
    }
    setTimeout(() => setMsg(''), 10000)
  }

  function modalKapat() {
    setIsModalOpen(false)
    setEditItem(null)
  }

  const liste = ogrenciler.filter(o => {
    const q = filtre.toLowerCase()
    const matchSearch = !q || (o.ad + ' ' + o.soyad + ' ' + (o.sinif || '')).toLowerCase().includes(q)
    const matchSinif = !sinifFiltre || o.sinif === sinifFiltre
    return matchSearch && matchSinif
  }).sort((a, b) => {
    const nameA = (a.ad + ' ' + a.soyad).toLocaleLowerCase('tr')
    const nameB = (b.ad + ' ' + b.soyad).toLocaleLowerCase('tr')
    return nameA.localeCompare(nameB, 'tr')
  })

  return (
    <div>
      <Topbar title="Öğrenci Listesi" sub="Kayıt ve yönetim" />
      <div style={{ padding: 28 }}>
        {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: 20 }}>{msg}</div>}

        {/* Liste */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>
              Öğrenci Listesi ({loading ? '...' : ogrenciler.length})
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <select
                className="form-select"
                style={{ width: 160 }}
                value={sinifFiltre}
                onChange={e => setSinifFiltre(e.target.value)}
              >
                <option value="">Tüm Sınıflar</option>
                {siniflar.map((s, i) => (
                  <option key={i} value={s.ad}>{s.ad}</option>
                ))}
              </select>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  style={{ width: 220, paddingLeft: 34 }}
                  placeholder="Ara..."
                  value={filtre}
                  onChange={e => setFiltre(e.target.value)}
                />
                <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: '#aaa' }} />
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setImportAcik(true)}>
                📥 Toplu İçe Aktar
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setIsModalOpen(true)}>
                <Plus size={16} /> Yeni Öğrenci Ekle
              </button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th><th>Ad Soyad</th><th>T.C.</th><th>Sınıf</th><th>Öğretmen</th>
                  <th>Kardeş</th><th>Ücretsiz</th><th>Anne Adı</th><th>Anne Tel</th><th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {liste.length === 0 ? (
                  <tr><td colSpan={10}>
                    <div className="empty-state">
                      <div className="empty-icon">👨‍🎓</div>
                      <p>{loading ? 'Yükleniyor...' : 'Öğrenci bulunamadı'}</p>
                    </div>
                  </td></tr>
                ) : (
                  liste.map((o, i) => (
                    <tr key={o.id}>
                      <td style={{ color: 'var(--text3)', fontSize: 12 }}>{i + 1}</td>
                      <td><strong>{o.ad} {o.soyad}</strong></td>
                      <td style={{ fontSize: 12, color: 'var(--text3)' }}>{o.tc || '-'}</td>
                      <td>{o.sinif || '-'}</td>
                      <td>{o.ogretmen || '-'}</td>
                      <td>
                        <Badge variant={o.kardes_indirimi ? 'orange' : 'gray'}>
                          {o.kardes_indirimi ? 'Evet' : 'Hayır'}
                        </Badge>
                      </td>
                      <td>
                        {o.ucretsiz_mi ? <Badge variant="blue">Ücretsiz</Badge> : '-'}
                      </td>
                      <td>{o.anne_adi || '-'}</td>
                      <td>{o.anne_tel || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => duzenle(o)}>✏️</button>
                          <button className="btn btn-danger btn-sm" onClick={() => setSilOnayId(o.id)}>🗑️</button>
                        </div>
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
          tip="ogrenci"
          mevcutOgrenciler={ogrenciler}
          onKapat={() => setImportAcik(false)}
          onTamamlandi={() => { setImportAcik(false); load() }}
        />
      )}

      {silOnayId !== null && (() => {
        const hedef = ogrenciler.find(o => o.id === silOnayId)
        return (
          <ConfirmModal
            baslik="Öğrenciyi Pasife Al"
            mesaj={`"${hedef?.ad} ${hedef?.soyad}" adlı öğrenciyi listeden kaldırmak istediğinizden emin misiniz? Geçmiş ödeme verileri korunur.`}
            onayMetni="Evet, Kaldır"
            iptalMetni="Vazgeç"
            onOnayla={() => sil(silOnayId)}
            onIptal={() => setSilOnayId(null)}
          />
        )
      })()}

      {isModalOpen && (
        <OgrenciModal
          editItem={editItem}
          ayarlar={ayarlar}
          profilOkulId={profil?.okul_id}
          siniflar={siniflar}
          ogretmenListesi={ogretmenListesi}
          onClose={modalKapat}
          onSaved={() => {
            modalKapat()
            load()
            setMsg('✅ Öğrenci başarıyla kaydedildi.')
            setTimeout(() => setMsg(''), 3000)
          }}
        />
      )}
    </div>
  )
}

export default function OgrencilerPage() {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <OgrencilerIc />
    </Suspense>
  )
}
