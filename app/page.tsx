'use client'
import { useEffect, useState, useCallback } from 'react'
import Topbar from '@/components/Topbar'
import StatCard from '@/components/StatCard'
import { useAy } from '@/lib/AyContext'
import { supabase } from '@/lib/supabase'
import { fmtTL, ayLabel, isGunuSayisi, tarihFmt } from '@/lib/hesaplama'
import { Ogrenci, Tahsilat, HesapHareketi, Ayarlar, Personel } from '@/lib/types'
import Link from 'next/link'

import { 
  Users, 
  Wallet, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  PlusCircle, 
  ArrowRightCircle, 
  Settings, 
  FileText, 
  Clock,
  PieChart,
  UserCheck
} from 'lucide-react'

export default function DashboardPage() {
  const { ay, yil } = useAy()
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[]>([])
  const [tahsilatlar, setTahsilatlar] = useState<Tahsilat[]>([])
  const [hareketler, setHareketler] = useState<HesapHareketi[]>([])
  const [ayarlar, setAyarlar] = useState<Ayarlar | null>(null)
  const [loading, setLoading] = useState(true)
  const [personel, setPersonel] = useState<Personel[]>([])
  const [siniflar, setSiniflar] = useState<any[]>([])
  const [bordrolar, setBordrolar] = useState<any[]>([])
  const [puantajlar, setPuantajlar] = useState<any[]>([])
  const [tatiller, setTatiller] = useState<any[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    const startDate = `${yil}-${String(ay).padStart(2, '0')}-01`
    const lastDay = new Date(yil, ay, 0).getDate()
    const endDate = `${yil}-${String(ay).padStart(2, '0')}-${lastDay}T23:59:59`

    const [
      { data: ogr }, 
      { data: tah }, 
      { data: hh }, 
      { data: ayr }, 
      { data: tat },
      { data: per },
      { data: sin },
      { data: brd },
      { data: pua }
    ] = await Promise.all([
      supabase.from('ogrenciler').select('*'),
      supabase.from('tahsilat').select('*').eq('ay', ay).eq('yil', yil),
      supabase.from('hesap_hareketleri').select('*').order('tarih', { ascending: false }),
      supabase.from('ayarlar').select('*').single(),
      supabase.from('tatiller').select('*'),
      supabase.from('personel').select('*'),
      supabase.from('siniflar').select('*').eq('aktif', true),
      supabase.from('bordro').select('*').eq('ay', ay).eq('yil', yil),
      supabase.from('puantaj').select('*').gte('tarih', startDate).lte('tarih', endDate)
    ])
    setOgrenciler(ogr || [])
    setTahsilatlar(tah || [])
    setHareketler(hh || [])
    setAyarlar(ayr)
    setTatiller(tat || [])
    setPersonel(per || [])
    setSiniflar(sin || [])
    setBordrolar(brd || [])
    setPuantajlar(pua || [])
    setLoading(false)
  }, [ay, yil])

  useEffect(() => { loadData() }, [loadData])

  const isGunu = isGunuSayisi(yil, ay, tatiller)
  const saatUcreti = ayarlar?.saat_ucreti || 0
  const gunlukSaat = ayarlar?.gunluk_saat || 6

  function odenen(o: Ogrenci) {
    return tahsilatlar.filter(t => t.ogrenci_id === o.id).reduce((s, t) => s + Number(t.tutar), 0)
  }

  const toplamTahsilat = tahsilatlar.reduce((s, t) => s + Number(t.tutar), 0)

  // Toplam beklenen tahsilat hesapla
  let toplamBeklenen = 0
  for (const o of ogrenciler) {
    if (o.ucretsiz_mi) continue
    let ucret = isGunu * gunlukSaat * saatUcreti
    if (o.kardes_indirimi) ucret *= 0.75
    toplamBeklenen += Math.round(ucret * 100) / 100
  }

  const tahsilatYuzdesi = toplamBeklenen > 0 ? Math.round((toplamTahsilat / toplamBeklenen) * 100) : 0
  
  // Kapasite
  const toplamKapasite = siniflar.reduce((s, c) => s + (c.kapasite || 0), 0)
  const kapasiteYuzdesi = toplamKapasite > 0 ? Math.round((ogrenciler.length / toplamKapasite) * 100) : 0

  // Bordro Durumu
  const bordroDurumu = bordrolar.length > 0 ? (bordrolar.every(b => b.odendi) ? 2 : 1) : 0

  const netBakiye = hareketler.reduce(
    (s, h) => (h.tur === 'gelir' ? s + Number(h.tutar) : s - Number(h.tutar)), 0
  )
  const toplamGelir = hareketler.filter(h => h.tur === 'gelir').reduce((s, h) => s + Number(h.tutar), 0)
  const toplamGider = hareketler.filter(h => h.tur === 'gider').reduce((s, h) => s + Number(h.tutar), 0)

  const uyarilar = []
  const borcluSayisi = ogrenciler.filter(o => {
    if (o.ucretsiz_mi) return false
    let ucret = isGunu * gunlukSaat * saatUcreti
    if (o.kardes_indirimi) ucret *= 0.75
    return (Math.round(ucret * 100) / 100 - odenen(o)) > 1
  }).length
  
  if (borcluSayisi > 0) uyarilar.push({ text: `${borcluSayisi} öğrencinin ödemesi gecikmiş.`, type: 'warn' })
  if (personel.some(p => !p.iban || !p.tc)) uyarilar.push({ text: `Personel bilgilerinde eksikler var.`, type: 'info' })
  if (bordroDurumu === 0 && new Date().getDate() > 20) uyarilar.push({ text: `Ay sonu yaklaşıyor, bordro henüz hesaplanmadı.`, type: 'alert' })

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>
      <Topbar
        title="Yönetim Merkezi"
        sub={`${ayLabel(ay, yil)} — Kurumsal Übersicht`}
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary btn-sm no-print" onClick={loadData}>
              <Clock size={14} style={{ marginRight: 6 }} /> Güncelle
            </button>
            <button className="btn btn-secondary btn-sm no-print" onClick={() => window.print()}>
              🖨️ Yazdır
            </button>
          </div>
        }
      />
      <div style={{ padding: '24px 32px' }}>
        
        {/* SECTION 1: CANLI DURUM PANELI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
          {/* Tahsilat Durumu */}
          <div className="card" style={{ padding: '20px 24px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderRadius: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ padding: 8, background: '#eafaf1', color: '#27ae60', borderRadius: 8 }}><PieChart size={20} /></div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Tahsilat Oranı</div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#27ae60' }}>%{tahsilatYuzdesi}</div>
            </div>
            <div className="prog-bar" style={{ height: 10, borderRadius: 5 }}>
              <div className="prog-fill" style={{ width: `${tahsilatYuzdesi}%`, background: '#27ae60' }} />
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: '#666', display: 'flex', justifyContent: 'space-between' }}>
              <span>{fmtTL(toplamTahsilat)} Alındı</span>
              <span>Hedef: {fmtTL(toplamBeklenen)}</span>
            </div>
          </div>

          {/* Bordro Durumu */}
          <div className="card" style={{ padding: '20px 24px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderRadius: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ padding: 8, background: '#fef5e7', color: '#e67e22', borderRadius: 8 }}><FileText size={20} /></div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Bordro Durumu</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { label: 'Hesapla', active: bordroDurumu >= 0 },
                { label: 'Onayla/Yazdır', active: bordroDurumu >= 1 }
              ].map((step, idx) => (
                <div key={idx} style={{ 
                  flex: 1, height: 6, borderRadius: 3, 
                  background: step.active ? '#e67e22' : '#eee',
                  position: 'relative'
                }}>
                  <div style={{ position: 'absolute', top: 12, left: 0, fontSize: 10, color: step.active ? '#e67e22' : '#999', fontWeight: 600 }}>{step.label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 22, fontSize: 11, color: '#666' }}>
              {bordroDurumu === 0 ? 'İşlem bekleniyor' : bordroDurumu === 1 ? 'Hesaplamalar yapıldı' : 'Bordro kapatıldı'}
            </div>
          </div>

          {/* Kapasite */}
          <div className="card" style={{ padding: '20px 24px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderRadius: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ padding: 8, background: '#ebf5fb', color: '#2980b9', borderRadius: 8 }}><UserCheck size={20} /></div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Kapasite Doluluğu</div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#2980b9' }}>%{kapasiteYuzdesi}</div>
            </div>
            <div className="prog-bar" style={{ height: 10, borderRadius: 5 }}>
              <div className="prog-fill" style={{ width: `${kapasiteYuzdesi}%`, background: '#2980b9' }} />
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: '#666' }}>
              {ogrenciler.length} / {toplamKapasite} Öğrenci kayıtlı
            </div>
          </div>
        </div>

        {/* SECTION 2: HIZLI ISLEMLER */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Öğrenci Kaydı', icon: <PlusCircle size={24} />, color: '#4834d4', link: '/ogrenciler' },
            { label: 'Ödeme Al', icon: <TrendingUp size={24} />, color: '#6ab04c', link: '/odeme' },
            { label: 'Bordro İncele', icon: <FileText size={24} />, color: '#eb4d4b', link: '/bordro' },
            { label: 'Ayarlar', icon: <Settings size={24} />, color: '#130f40', link: '/ayarlar' }
          ].map((action, idx) => (
            <Link key={idx} href={action.link}>
              <div className="quick-action-card" style={{ 
                background: 'white', padding: 20, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 15,
                transition: 'all 0.2s', cursor: 'pointer', border: '1px solid #eee'
              }}>
                <div style={{ color: action.color }}>{action.icon}</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{action.label}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* SECTION 3: AKILLI UYARILAR & FINANCE */}
        <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: 24, marginBottom: 24 }}>
          
          {/* Akıllı Uyarılar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#2c3e50', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={20} color="#e74c3c" /> Akıllı Uyarılar
            </div>
            {uyarilar.length === 0 ? (
              <div className="card" style={{ padding: 20, textAlign: 'center', color: '#666' }}>
                <CheckCircle2 size={32} color="#27ae60" style={{ marginBottom: 10 }} />
                <p style={{ fontSize: 13 }}>Her şey yolunda!</p>
              </div>
            ) : (
              uyarilar.map((u, i) => (
                <div key={i} className="card" style={{ 
                  padding: '12px 16px', 
                  borderWidth: '0 0 0 4px',
                  borderStyle: 'solid',
                  borderColor: `transparent transparent transparent ${u.type === 'warn' ? '#e67e22' : u.type === 'alert' ? '#e74c3c' : '#3498db'}`,
                  borderRadius: '0 8px 8px 0', 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)' 
                }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{u.text}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Dikkatiniz gerekiyor</div>
                </div>
              ))
            )}
          </div>

          {/* Finansal Grafik & İşlemler */}
          <div className="card" style={{ padding: 24, borderRadius: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Finansal Akış</div>
              <div style={{ display: 'flex', gap: 15 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>Bu Ay Gelir</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#27ae60' }}>{fmtTL(hareketler.filter(h => h.tur === 'gelir' && h.ay === ay && h.yil === yil).reduce((s, h) => s + Number(h.tutar), 0))}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>Bu Ay Gider</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#e74c3c' }}>{fmtTL(hareketler.filter(h => h.tur === 'gider' && h.ay === ay && h.yil === yil).reduce((s, h) => s + Number(h.tutar), 0))}</div>
                </div>
              </div>
            </div>
            <div style={{ height: 180, display: 'flex', alignItems: 'flex-end', gap: 12 }}>
              {(() => {
                const visibleBars = hareketler.slice(0, 10).reverse()
                const maxVal = Math.max(...visibleBars.map(h => Number(h.tutar)), 1)
                return visibleBars.map((h, i) => (
                  <div key={i} style={{ 
                    flex: 1, 
                    height: `${(Number(h.tutar) / maxVal) * 100}%`,
                    background: h.tur === 'gelir' ? '#d4f1de' : '#fbd7d5',
                    borderRadius: '4px 4px 0 0',
                    minHeight: 10,
                    position: 'relative'
                  }} className="fin-bar">
                    <div className="bar-tooltip" style={{ display: 'none', position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', background: '#333', color: 'white', padding: '4px 8px', borderRadius: 4, fontSize: 10, whiteSpace: 'nowrap', zIndex: 10 }}>
                      {fmtTL(Number(h.tutar))}
                    </div>
                  </div>
                ))
              })()}
            </div>
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #eee', paddingTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Cari Bakiye (Genel)</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: netBakiye >= 0 ? '#27ae60' : '#e74c3c' }}>{fmtTL(netBakiye)}</div>
            </div>
          </div>
        </div>

        {/* SECTION 5: PERSONEL ÖZETİ */}
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Personel Ders Yükü</div>
            <Link href="/bordro" style={{ fontSize: 13, color: '#3498db' }}>Detaylı Bordro →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {personel.slice(0, 8).map(p => {
              const pSaat = puantajlar.filter(x => x.personel_id === p.id).reduce((s, x) => s + (Number(x.saat) || 0), 0)
              return (
                <div key={p.id} className="card" style={{ padding: 16, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 20, background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#555' }}>
                    {p.ad.split(' ').map(n => n[0]).join('').slice(0,2)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{p.ad}</div>
                    <div style={{ fontSize: 11, color: '#e67e22', fontWeight: 600 }}>{pSaat} Saat</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>

      <style jsx>{`
        .quick-action-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          border-color: #3498db !important;
        }
        .fin-bar:hover .bar-tooltip {
          display: block !important;
        }
      `}</style>
    </div>
  )
}
