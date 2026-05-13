'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Topbar from '@/components/Topbar'
import Badge from '@/components/Badge'
import { useAy } from '@/lib/AyContext'
import { supabase } from '@/lib/supabase'
import { fmtTL, ayLabel, isGunuSayisi, tarihFmt } from '@/lib/hesaplama'
import { Ogrenci, Tahsilat, Ayarlar } from '@/lib/types'
import { logIslem } from '@/lib/audit'
import { useAuth } from '@/lib/AuthContext'
import ConfirmModal from '@/components/ConfirmModal'

export default function OdemePage() {
  const { ay, yil } = useAy()
  const { okul, profil } = useAuth()
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>([])
  const [tahsilatlar, setTahsilatlar] = useState<Tahsilat[]>([])
  const [siniflar, setSiniflar] = useState<any[]>([])
  const [ayarlar, setAyarlar] = useState<Ayarlar | null>(null)
  const [tatiller, setTatiller] = useState<any[]>([])
  const [secilenler, setSecilenler] = useState<number[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState('hepsi')
  const [sinifFiltre, setSinifFiltre] = useState('')

  // Form
  const [ogrenciId, setOgrenciId] = useState('')
  const [tutar, setTutar] = useState('')
  const [tarih, setTarih] = useState(new Date().toISOString().split('T')[0])
  const [aciklama, setAciklama] = useState('')
  const [dekont, setDekont] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [progress, setProgress] = useState<{ current: number; total: number; name: string } | null>(null)
  const cancelRef = useRef(false)
  const [conf, setConf] = useState<{ open: boolean, type: 'sil' | 'toplu', id?: number, title: string, message: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: ogr }, { data: tah }, { data: ayr }, { data: sin }, { data: tat }] = await Promise.all([
      supabase.from('ogrenciler').select('*').order('soyad'),
      supabase.from('tahsilat').select('*').eq('ay', ay).eq('yil', yil).order('tarih', { ascending: false }),
      supabase.from('ayarlar').select('*').single(),
      supabase.from('siniflar').select('*'),
      supabase.from('tatiller').select('*').or(`okul_id.eq.${okul?.id ?? 0},okul_id.is.null`)
    ])
    setOgrenciler(ogr || [])
    setTahsilatlar(tah || [])
    setAyarlar(ayr)
    setSiniflar(sin || [])
    setTatiller(tat || [])
    setLoading(false)
  }, [ay, yil])

  useEffect(() => { load() }, [load])
  
  // Seçili ay değiştiğinde tarih alanını o aya göre güncelle
  useEffect(() => {
    const today = new Date()
    const isCurrentMonth = today.getMonth() + 1 === ay && today.getFullYear() === yil
    if (isCurrentMonth) {
      setTarih(today.toISOString().split('T')[0])
    } else {
      // Değilse seçili ayın 1. gününe ayarla
      setTarih(`${yil}-${String(ay).padStart(2, '0')}-01`)
    }
  }, [ay, yil])

  const isGunu = isGunuSayisi(yil, ay, tatiller)

  async function tahakkukGuncelle() {
    try {
      // Bu ayın tüm tahsilatlarını topla ve tahakkuk tablosunu güncelle
      const { data: tahs } = await supabase.from('tahsilat').select('tutar').eq('ay', ay).eq('yil', yil)
      const toplam = (tahs || []).reduce((s, t) => s + Number(t.tutar), 0)

      const okulId = okul?.id || profil?.okul_id
      
      await supabase.from('tahakkuk').upsert({
        ay, yil, toplam_gelir: toplam, hesaplandi_mi: true,
        okul_id: okulId
      }, { onConflict: 'ay,yil,okul_id' })
    } catch (e) {
      console.error('Tahakkuk guncelleme hatasi:', e)
    }
  }

  function gereken(o: Ogrenci): number {
    if (o.ucretsiz_mi) return 0
    if (!ayarlar) return 0

    if (o.gunluk_saat != null && o.gunluk_saat > 0) {
      // Eğer öğrenciye özel TOPLAM ders saati girilmişse (örn. 60 saat)
      let u = o.gunluk_saat * (ayarlar.saat_ucreti || 0)
      if (o.kardes_indirimi) u *= 0.75
      return u
    }

    const isGunu = isGunuSayisi(yil, ay, tatiller)
    let u = isGunu * (ayarlar.gunluk_saat || 6) * (ayarlar.saat_ucreti || 0)
    
    if (o.kardes_indirimi) u *= 0.75
    return u // Hassas hesaplama için yuvarlamayı kaldırıyoruz
  }

  function odened(oId: number): number {
    return tahsilatlar.filter(t => t.ogrenci_id === oId).reduce((s, t) => s + Number(t.tutar), 0)
  }

  async function odemeKaydet() {
    if (!ogrenciId || !tutar || !tarih) { setMsg('❌ Öğrenci, tutar ve tarih zorunlu!'); return }
    setSaving(true)
    setMsg('')
    const ayX = ay
    const yilX = yil
    // okul_id'yi güvenli al
    const okulId = okul?.id ?? profil?.okul_id
    if (!okulId) { setMsg('❌ Oturum bilgisi eksik, sayfayı yenileyin.'); setSaving(false); return }

    // Mükerrer Ödeme Kontrolü
    const { data: mevcut } = await supabase.from('tahsilat')
      .select('id')
      .eq('ogrenci_id', parseInt(ogrenciId))
      .eq('ay', ayX)
      .eq('yil', yilX)
      .maybeSingle()

    if (mevcut) {
      setMsg(`⚠️ Hata: Bu öğrencinin ${ayLabel(ayX, yilX)} ayı için zaten bir ödeme kaydı bulunmaktadır.`);
      setSaving(false); return
    }

    const tahsData = {
      ogrenci_id: parseInt(ogrenciId),
      tutar: parseFloat(tutar),
      tarih, aciklama, dekont_no: dekont,
      ay: ayX, yil: yilX,
      okul_id: okulId
    }
    const { data: tahNew, error: e1 } = await supabase.from('tahsilat').insert(tahsData).select().single()
    if (e1) { setMsg('❌ Tahsilat hatası: ' + e1.message); setSaving(false); return }

    // Hesap hareketlerine ekle (GELİR)
    const ogr = ogrenciler.find(o => o.id === parseInt(ogrenciId))
    const aciklamaMetni = `Öğrenci ödemesi: ${ogr ? ogr.ad + ' ' + ogr.soyad : ''} ${aciklama || ''}`.trim()
    
    const { error: hErr1 } = await supabase.from('hesap_hareketleri').insert({
      tarih, tutar: parseFloat(tutar), tur: 'gelir',
      aciklama: aciklamaMetni,
      dekont_no: dekont, kaynak: 'tahsilat', kaynak_id: tahNew?.id,
      ay: ay, yil: yil,
      okul_id: okulId
    })
    if (hErr1) console.error('Hesap hareketi (gelir) eklenemedi:', hErr1.message)

    // OTOMATİK DENGELEME: Giderler tablosuna ve hareketlerine Ekle
    const dagitimAciklama = `Kurum Havuzu Dağıtımı (${ogr ? ogr.ad + ' ' + ogr.soyad : ''})`
    const { data: gidNew, error: gErr } = await supabase.from('giderler').insert({
      tarih, tutar: parseFloat(tutar), kategori: 'Kurum Havuzu Dağıtımı',
      aciklama: dagitimAciklama, dekont_no: dekont,
      ay: ay, yil: yil,
      okul_id: okulId
    }).select().single()
    if (gErr) console.error('Gider eklenemedi:', gErr.message)

    const { error: hErr2 } = await supabase.from('hesap_hareketleri').insert({
      tarih, tutar: parseFloat(tutar), tur: 'gider',
      aciklama: dagitimAciklama,
      dekont_no: dekont, kaynak: 'giderler', kaynak_id: gidNew?.id,
      ay: ay, yil: yil,
      okul_id: okulId
    })
    if (hErr2) console.error('Hesap hareketi (gider) eklenemedi:', hErr2.message)

    setSaving(false)
    if (ogr) logIslem({ islem: 'ekle', tablo: 'tahsilat', kayit_id: tahNew?.id, aciklama: `${ogr.ad} ${ogr.soyad} için ödeme kaydedildi (${parseFloat(tutar).toLocaleString('tr-TR')} ₺)` })
    setMsg('✅ Ödeme kaydedildi!')
    setTimeout(() => setMsg(''), 2500)
    setTutar(''); setAciklama(''); setDekont('')
    setSecilenler([])
    load()
    tahakkukGuncelle()
  }

  const formRef = useRef<HTMLDivElement>(null)

  function hizliOdemeDoldur(o: Ogrenci) {
    const k = gereken(o) - odened(o.id)
    if (k <= 0) { setMsg('ℹ️ Bu öğrencinin borcu bulunmamaktadır.'); return }
    setOgrenciId(String(o.id))
    setTutar(String(k))
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setMsg(`💡 ${o.ad} için ödeme formu dolduruldu.`)
  }

  async function topluOdemeKaydet() {
    if (secilenler.length === 0) return
    setConf({
      open: true,
      type: 'toplu',
      title: 'Toplu Ödeme Onayı',
      message: `${secilenler.length} öğrenci için borç kapama ödemesi oluşturulacak. Emin misiniz?`
    })
  }

  async function topluOdemeGercek() {
    setConf(null)
    const okulId = okul?.id ?? profil?.okul_id
    if (!okulId) { setMsg('❌ Oturum bilgisi eksik, sayfayı yenileyin.'); return }

    setSaving(true)
    cancelRef.current = false
    
    const seciliOgrenciler = ogrenciler.filter(o => secilenler.includes(o.id))
    setProgress({ current: 0, total: seciliOgrenciler.length, name: '' })
    
    try {
      const ayX = ay
      const yilX = yil
      
      let count = 0
      let processedCount = 0
      for (const o of seciliOgrenciler) {
        if (cancelRef.current) {
          break
        }
        count++
        setProgress({ current: count, total: seciliOgrenciler.length, name: `${o.ad} ${o.soyad}` })
        const { data: v } = await supabase.from('tahsilat').select('id').eq('ogrenci_id', o.id).eq('ay', ayX).eq('yil', yilX).maybeSingle()
        if (v) continue

        const k = gereken(o) - odened(o.id)
        if (k <= 0) continue

        const { data: tahNew, error } = await supabase.from('tahsilat').insert({
          ogrenci_id: o.id,
          tutar: k,
          tarih,
          aciklama: `${ayLabel(ayX, yilX)} Toplu Ödeme`,
          ay: ayX,
          yil: yilX,
          okul_id: okulId
        }).select().single()

        if (!error && tahNew) {
          processedCount++
          const aciklamaMetni = `Toplu Ödeme: ${o.ad} ${o.soyad}`
          // Gelir Hareketi
          await supabase.from('hesap_hareketleri').insert({
            tarih, tutar: k, tur: 'gelir',
            aciklama: aciklamaMetni,
            kaynak: 'tahsilat', kaynak_id: tahNew.id,
            ay: ay, yil: yil,
            okul_id: okulId
          })

          // Gider ve Dağıtım Hareketi
          const dagitimAciklama = `Kurum Havuzu Dağıtımı (Toplu: ${o.ad} ${o.soyad})`
          const { data: gidNew } = await supabase.from('giderler').insert({
            tarih, tutar: k, kategori: 'Kurum Havuzu Dağıtımı',
            aciklama: dagitimAciklama,
            ay: ay, yil: yil,
            okul_id: okulId
          }).select().single()

          await supabase.from('hesap_hareketleri').insert({
            tarih, tutar: k, tur: 'gider',
            aciklama: dagitimAciklama,
            kaynak: 'giderler', kaynak_id: gidNew?.id,
            ay: ay, yil: yil,
            okul_id: okulId
          })
        }
      }

      if (cancelRef.current) {
        setMsg(`⚠️ İşlem kullanıcı tarafından durduruldu. ${processedCount} adet ödeme kaydedildi.`)
      } else {
        setMsg(`✅ ${processedCount} adet ödeme başarıyla kaydedildi!`)
      }
      setSecilenler([])
      load()
      tahakkukGuncelle()
    } catch (err: any) {
      setMsg('❌ Hata: ' + err.message)
    } finally {
      setSaving(false)
      setProgress(null)
    }
  }

  async function tahsilatSil(id: number) {
    setConf({
      open: true,
      type: 'sil',
      id,
      title: 'Ödeme İptal Onayı',
      message: 'Bu ödeme kaydını ve bağlı kasa hareketini silmek istediğinizden emin misiniz?'
    })
  }

  async function tahsilatSilGercek(id: number) {
    setConf(null)
    setMsg('🔄 Siliniyor...')
    
    try {
      // 1. Tahsilat kaydını al (silmeden önce bilgilerine ihtiyacımız var)
      const { data: tahs, error: fErr } = await supabase.from('tahsilat').select('*, ogrenciler(ad, soyad)').eq('id', id).single()
      if (fErr || !tahs) throw new Error('Tahsilat kaydı bulunamadı')

      const ads = `${tahs.ogrenciler.ad} ${tahs.ogrenciler.soyad}`
      const tag = `Kurum Havuzu Dağıtımı (${ads})`

      // 2. Tahsilat kaydını sil
      const { error: e1 } = await supabase.from('tahsilat').delete().eq('id', id)
      if (e1) throw e1

      // 3. Gelir hareketini sil (tahsilat_id bazlı)
      await supabase.from('hesap_hareketleri').delete().eq('kaynak', 'tahsilat').eq('kaynak_id', id)

      // 4. Gider hareketini ve Giderler tablosundaki karşılığını sil (Dağıtım dengesi için)
      // Önce giderler tablosundan bul ve sil (aciklama ve tutar eşleşmesiyle)
      const { data: gid, error: gFindErr } = await supabase.from('giderler')
        .select('id')
        .eq('aciklama', tag)
        .eq('tutar', tahs.tutar)
        .eq('tarih', tahs.tarih)
        .maybeSingle()

      if (gid) {
        await supabase.from('giderler').delete().eq('id', gid.id)
        await supabase.from('hesap_hareketleri').delete().eq('kaynak', 'giderler').eq('kaynak_id', gid.id)
      } else {
        // Giderler tablosunda yoksa bile hesap_hareketleri'nden açıklamaya göre temizle (fallback)
        await supabase.from('hesap_hareketleri').delete().eq('aciklama', tag).eq('tur', 'gider')
      }
      
      setMsg('✅ Ödeme ve tüm dağıtım kayıtları başarıyla silindi.')
      load()
      tahakkukGuncelle()
    } catch (err: any) {
      setMsg('❌ Hata: ' + (err.message || 'Silme işlemi tamamlanamadı'))
    }
    
    setTimeout(() => setMsg(''), 4000)
  }

  const ozet = ogrenciler.map(o => {
    const g = gereken(o)
    const od = odened(o.id)
    const kalan = g - od
    const durum = kalan <= 0 ? 'tam' : od > 0 ? 'kismi' : 'odenmedi'
    // Bu ayki tahsilatı bul (iptal butonu için)
    const sonTahsilat = tahsilatlar.find(t => t.ogrenci_id === o.id)
    return { ogrenci: o, gereken: g, odenen: od, kalan, durum, tahsilatId: sonTahsilat?.id }
  })

  const filtrelenmis = ozet.filter(r => {
    const matchFiltre = filtre === 'borclu'
      ? r.kalan > 0
      : filtre === 'odendi'
      ? r.kalan <= 0 && r.gereken > 0
      : true
    const matchSinif = !sinifFiltre || r.ogrenci.sinif === sinifFiltre
    return matchFiltre && matchSinif
  }).sort((a, b) => {
    const nameA = (a.ogrenci.ad + ' ' + a.ogrenci.soyad).toLocaleLowerCase('tr')
    const nameB = (b.ogrenci.ad + ' ' + b.ogrenci.soyad).toLocaleLowerCase('tr')
    return nameA.localeCompare(nameB, 'tr')
  })

  const toplamGereken = ozet.reduce((s, r) => s + r.gereken, 0)
  const toplamOdenen = ozet.reduce((s, r) => s + r.odenen, 0)
  const toplamKalan = ozet.reduce((s, r) => s + Math.max(r.kalan, 0), 0)

  return (
    <div>
      <Topbar
        title="Ödeme Takibi"
        sub={`${ayLabel(ay, yil)} — Aylık tahsilat`}
        actions={
          <button className="btn btn-secondary btn-sm no-print" onClick={() => window.print()}>🖨️ Yazdır</button>
        }
      />
      <div style={{ padding: 28 }}>
        {/* Özet istatistikler */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-label">Toplam Gereken</div>
            <div className="stat-value">{fmtTL(toplamGereken)}</div>
            <div className="stat-sub">{ayLabel(ay, yil)} — {isGunu} iş günü</div>
          </div>
          <div className="stat-card orange">
            <div className="stat-label">Toplam Ödenen</div>
            <div className="stat-value">{fmtTL(toplamOdenen)}</div>
            <div className="stat-sub">{tahsilatlar.length} adet tahsilat</div>
          </div>
          <div className="stat-card red">
            <div className="stat-label">Kalan Borç</div>
            <div className="stat-value">{fmtTL(toplamKalan)}</div>
            <div className="stat-sub">{ozet.filter(r => r.kalan > 0).length} öğrenci borçlu</div>
          </div>
        </div>

        {/* Ödeme kayıt formu */}
        <div ref={formRef} className="card">
          <div className="card-title">💰 Ödeme Kaydet</div>
          {msg && !progress && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`}>{msg}</div>}
          {progress && (
            <div className="alert alert-info" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 20px', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14 }}>🔄 <strong>{progress.name}</strong> işleniyor...</span>
                <span className="fw-600" style={{ fontSize: 15, color: 'var(--info)' }}>{progress.current} / {progress.total}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 15, width: '100%' }}>
                <div className="prog-bar" style={{ flex: 1, height: 10, marginTop: 0, background: 'rgba(0,0,0,0.08)' }}>
                  <div className="prog-fill" style={{ width: `${(progress.current / progress.total) * 100}%`, boxShadow: '0 0 10px rgba(45,90,61,0.3)' }}></div>
                </div>
                <button 
                  className="btn" 
                  onClick={() => (cancelRef.current = true)}
                  style={{ 
                    height: 28, padding: '0 14px', fontSize: 12,
                    background: 'white', color: 'var(--danger)',
                    border: '1px solid var(--danger-border)',
                    borderRadius: 6, transition: 'all 0.2s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'var(--danger-light)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  🛑 İşlemi Durdur
                </button>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <div style={{ flex: 2, minWidth: 200 }}>
              <label htmlFor="odeme-ogrenci" className="form-label">Öğrenci</label>
              <select id="odeme-ogrenci" className="form-select" required value={ogrenciId} onChange={e => {
                setOgrenciId(e.target.value)
                if (e.target.value) {
                  const o = ogrenciler.find(o => o.id === parseInt(e.target.value))
                  if (o) setTutar(String(gereken(o)))
                }
              }}>
                <option value="">-- Seçin --</option>
                {ogrenciler.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.ad} {o.soyad} ({o.sinif || '?'}) — Gereken: {fmtTL(gereken(o))}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ width: 130 }}>
              <label htmlFor="odeme-tutar" className="form-label">Tutar (₺)</label>
              <input id="odeme-tutar" className="form-input" required type="number" step="0.01" min="0" value={tutar} onChange={e => setTutar(e.target.value)} />
            </div>
            <div style={{ width: 150 }}>
              <label htmlFor="odeme-tarih" className="form-label">Tarih</label>
              <input id="odeme-tarih" className="form-input" required type="date" value={tarih} onChange={e => setTarih(e.target.value)} />
            </div>
            <div style={{ width: 120 }}>
              <label htmlFor="odeme-dekont" className="form-label">Dekont No</label>
              <input id="odeme-dekont" className="form-input" value={dekont} onChange={e => setDekont(e.target.value)} />
            </div>
            <div style={{ flex: 2, minWidth: 160 }}>
              <label htmlFor="odeme-aciklama" className="form-label">Açıklama</label>
              <input id="odeme-aciklama" className="form-input" placeholder="Ödeme açıklaması" value={aciklama} onChange={e => setAciklama(e.target.value)} />
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <button className="btn btn-primary" onClick={odemeKaydet} disabled={saving}>
              {saving ? '⏳...' : '💾 Ödemeyi Kaydet'}
            </button>
          </div>
        </div>

        {/* Ödeme durumu tablosu */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Ödeme Durumu</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button 
                className="btn btn-secondary btn-sm no-print" 
                onClick={() => setShowHistory(true)}
                style={{ backgroundColor: 'var(--bg2)', border: '1px solid var(--border)' }}
              >
                📋 Ödeme Geçmişi
              </button>
              <select className="form-select" style={{ width: 140 }} value={sinifFiltre} onChange={e => setSinifFiltre(e.target.value)}>
                <option value="">Tüm Sınıflar</option>
                {siniflar.map((s, i) => (
                  <option key={i} value={s.ad}>{s.ad}</option>
                ))}
              </select>
              <select className="form-select" style={{ width: 160 }} value={filtre} onChange={e => setFiltre(e.target.value)}>
                <option value="hepsi">Tüm Ödemeler</option>
                <option value="borclu">Borcu Olanlar</option>
                <option value="odendi">Tam Ödeyenler</option>
              </select>
              {secilenler.length > 0 && (
                <button 
                  className="btn btn-primary" 
                  style={{ background: 'var(--success)', borderColor: 'var(--success)' }}
                  onClick={topluOdemeKaydet}
                  disabled={saving}
                >
                  ✅ Seçilenleri Öde ({secilenler.length})
                </button>
              )}
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input 
                      type="checkbox" 
                      checked={secilenler.length > 0 && secilenler.length === filtrelenmis.length}
                      onChange={e => {
                        if (e.target.checked) setSecilenler(filtrelenmis.map(r => r.ogrenci.id))
                        else setSecilenler([])
                      }}
                    />
                  </th>
                  <th>Öğrenci</th><th style={{ width: 100 }}>Sınıf</th>
                  <th className="td-num" style={{ width: 110 }}>Gereken (₺)</th>
                  <th className="td-num" style={{ width: 110 }}>Ödenen (₺)</th>
                  <th className="td-num" style={{ width: 110 }}>Kalan (₺)</th>
                  <th style={{ textAlign: 'center', width: 125 }}>Durum</th>
                  <th style={{ textAlign: 'center', width: 90 }}>Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {filtrelenmis.map((r, i) => (
                  <tr key={r.ogrenci.id}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={secilenler.includes(r.ogrenci.id)} 
                        onChange={e => {
                          if (e.target.checked) setSecilenler(s => [...s, r.ogrenci.id])
                          else setSecilenler(s => s.filter(id => id !== r.ogrenci.id))
                        }}
                      />
                    </td>
                    <td>
                      <strong>{r.ogrenci.ad} {r.ogrenci.soyad}</strong>
                      {r.ogrenci.gunluk_saat && (
                        <span style={{ fontSize: 9, marginLeft: 8, padding: '1px 4px', background: '#e9ecef', borderRadius: 4, color: '#495057', border: '1px solid #dee2e6' }}>
                          {r.ogrenci.gunluk_saat} Saat
                        </span>
                      )}
                    </td>
                    <td>{r.ogrenci.sinif || '-'}</td>
                    <td className="td-num">{fmtTL(r.gereken)}</td>
                    <td className="td-num">{fmtTL(r.odenen)}</td>
                    <td className="td-num fw-600" style={{ color: r.kalan > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      {r.kalan > 0 ? fmtTL(r.kalan) : fmtTL(0)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {r.ogrenci.ucretsiz_mi ? (
                          <Badge variant="blue">Ücretsiz</Badge>
                        ) : r.durum === 'tam' ? (
                          <Badge variant="green">✅ Ödendi</Badge>
                        ) : r.durum === 'kismi' ? (
                          <Badge variant="orange">⏳ Kısmi</Badge>
                        ) : (
                          <Badge variant="red">❌ Ödenmedi</Badge>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {r.tahsilatId ? (
                        <button 
                          className="btn btn-outline-danger btn-sm" 
                          title="Ödemeyi İptal Et"
                          onClick={() => tahsilatSil(r.tahsilatId!)}
                          style={{ minWidth: 80 }}
                        >
                          ✖️ İptal Et
                        </button>
                      ) : (
                        <button 
                          className="btn btn-secondary btn-sm" 
                          title="Ödeme Formunu Doldur"
                          onClick={() => hizliOdemeDoldur(r.ogrenci)}
                          disabled={r.kalan <= 0}
                          style={{ minWidth: 80 }}
                        >
                          💰 Öde
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="sum-row">
                  <td colSpan={3}>TOPLAM</td>
                  <td className="td-num">{fmtTL(filtrelenmis.reduce((s, r) => s + r.gereken, 0))}</td>
                  <td className="td-num">{fmtTL(filtrelenmis.reduce((s, r) => s + r.odenen, 0))}</td>
                  <td className="td-num">{fmtTL(filtrelenmis.reduce((s, r) => s + Math.max(r.kalan, 0), 0))}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ÖDEME GEÇMİŞİ MODAL */}
      {showHistory && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="card" style={{
            width: '90%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto',
            position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}>
            <button 
              onClick={() => setShowHistory(false)}
              style={{ position: 'absolute', top: 15, right: 15, border: 'none', background: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--text3)' }}
            >
              ✕
            </button>
            <div className="card-title">📋 {ayLabel(ay, yil)} Ödeme Geçmişi</div>
            {loading ? <div className="alert alert-info">⏳ Yükleniyor...</div> : tahsilatlar.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">💳</div><p>Bu ay henüz ödeme kaydı yok</p></div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr><th>Tarih</th><th>Öğrenci</th><th>Açıklama</th><th>Dekont</th><th className="td-num">Tutar (₺)</th><th>İşlem</th></tr>
                  </thead>
                  <tbody>
                    {tahsilatlar.map(t => {
                      const o = ogrenciler.find(x => x.id === t.ogrenci_id)
                      return (
                        <tr key={t.id}>
                          <td>{tarihFmt(t.tarih)}</td>
                          <td>{o ? o.ad + ' ' + o.soyad : '?'}</td>
                          <td>{t.aciklama || '-'}</td>
                          <td style={{ fontSize: 12 }}>{t.dekont_no || '-'}</td>
                          <td className="td-num fw-600" style={{ color: 'var(--success)' }}>{fmtTL(Number(t.tutar))}</td>
                          <td>
                            <button className="btn btn-danger btn-sm" onClick={() => tahsilatSil(t.id)}>🗑️ Sil</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ textAlign: 'right', marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setShowHistory(false)}>Kapat</button>
            </div>
          </div>
        </div>
      )}
      {conf?.open && (
        <ConfirmModal
          baslik={conf.title}
          mesaj={conf.message}
          onayMetni={conf.type === 'sil' ? 'Evet, İptal Et' : 'Evet, Öde'}
          tehlikeli={conf.type === 'sil'}
          onOnayla={() => {
            if (conf.type === 'sil') tahsilatSilGercek(conf.id!)
            else if (conf.type === 'toplu') topluOdemeGercek()
          }}
          onIptal={() => setConf(null)}
        />
      )}
    </div>
  )
}
