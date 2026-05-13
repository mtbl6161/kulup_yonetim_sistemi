'use client'
import Link from 'next/link'
import {
  Users, Calendar, BookOpen, Clock, BarChart3, Wallet,
  Landmark, TrendingUp, FileText, Settings, GraduationCap,
  School, ClipboardList, CheckCircle, Shield, Zap,
  ArrowRight, Star, Building2, ChevronRight, Eye, MapPin,
  Activity, BarChart2, UserCheck, User as UserIcon
} from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'

const features = [
  {
    icon: Users,
    title: 'Öğrenci Yönetimi',
    desc: 'Kayıt, devam takibi, sınıf atama ve veli bilgileri tek ekranda.',
  },
  {
    icon: GraduationCap,
    title: 'Personel Yönetimi',
    desc: 'Öğretmen ve personel bilgileri, görev atamaları, iletişim kayıtları.',
  },
  {
    icon: Calendar,
    title: 'Ders Programı',
    desc: 'Haftalık ders planlaması, sınıf ve öğretmen bazlı program takibi.',
  },
  {
    icon: BookOpen,
    title: 'Sınıf Defteri',
    desc: 'Günlük devam kaydı, yoklama ve gözlem notları dijital ortamda.',
  },
  {
    icon: Clock,
    title: 'Puantaj',
    desc: 'Personel çalışma saatlerini otomatik hesapla, aylık puantaj oluştur.',
  },
  {
    icon: FileText,
    title: 'Bordro',
    desc: 'MEB katsayılarına göre tam otomatik maaş hesaplama ve e-posta gönderimi.',
  },
  {
    icon: Wallet,
    title: 'Ödeme Takibi',
    desc: 'Öğrenci aidat ve kurs ücretlerini tahsil et, gecikmeleri izle.',
  },
  {
    icon: BarChart3,
    title: 'Gelir / Gider',
    desc: 'Tüm finansal hareketler, kategori bazlı raporlar ve grafikler.',
  },
  {
    icon: Landmark,
    title: 'Bilanço',
    desc: 'Yıllık mali durum, aktif/pasif dengesi, kurumsal finansal rapor.',
  },
  {
    icon: TrendingUp,
    title: 'Hesap Hareketleri',
    desc: 'Kasa ve banka hareketleri, dönem bazlı akış analizi.',
  },
  {
    icon: School,
    title: 'Sınıf Tanımları',
    desc: 'Sınıf oluştur, öğretmen ata, kapasite ve program ayarla.',
  },
  {
    icon: Settings,
    title: 'Kurumsal Ayarlar',
    desc: 'SGK, vergi, katsayı ve tüm bordo parametrelerini tek yerden yönet.',
  },
]

const stats = [
  { value: '12+', label: 'Modül' },
  { value: '100%', label: 'MEB Uyumlu' },
  { value: 'Otomatik', label: 'Bordro Hesabı' },
  { value: 'Güvenli', label: 'Bulut Altyapı' },
]

const steps = [
  {
    num: '01',
    title: 'Kurumunuzu Kaydedin',
    desc: 'Birkaç dakikada okul bilgilerinizi ve SGK/vergi parametrelerinizi tanımlayın.',
  },
  {
    num: '02',
    title: 'Personel ve Öğrencileri Girin',
    desc: 'Mevcut verilerinizi içe aktarın ya da sıfırdan kayıt oluşturun.',
  },
  {
    num: '03',
    title: 'Yönetimi Otomatikleştirin',
    desc: 'Bordro, tahsilat, devam ve raporlar artık tek tıkla hazır.',
  },
]

export default function TanitimPage() {
  const { user, profil } = useAuth()
  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', color: '#1a1a14', background: '#f5f2ec', minHeight: '100vh' }}>

      {/* NAV */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(245,242,236,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #d8d0be',
        padding: '0 40px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,#2d5a3d,#1e4229)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ClipboardList size={20} color="white" />
          </div>
          <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 20, color: '#2d5a3d' }}>
            Klüp360
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/tanitim/kullanim-kosullari" style={{ fontSize: 14, fontWeight: 500, color: '#5a5748', textDecoration: 'none' }}>Koşullar</Link>
          <Link href="/tanitim/gizlilik-politikasi" style={{ fontSize: 14, fontWeight: 500, color: '#5a5748', textDecoration: 'none' }}>Gizlilik</Link>
          <Link href="/tanitim/iade-politikasi" style={{ fontSize: 14, fontWeight: 500, color: '#5a5748', textDecoration: 'none' }}>İade</Link>
          <Link href="/tanitim/iletisim" style={{ fontSize: 14, fontWeight: 500, color: '#5a5748', textDecoration: 'none' }}>İletişim</Link>
          <Link href="/fiyatlandirma" style={{
            padding: '8px 18px', borderRadius: 10, fontSize: 14, fontWeight: 500,
            color: '#5a5748', textDecoration: 'none',
          }}>
            Fiyatlandırma
          </Link>
          
          {user ? (() => {
            const panelUrl = profil?.rol === 'super_admin' ? '/yonetim' : (profil?.rol === 'denetim_yetkilisi' ? '/denetim' : '/')
            return (
              <Link href={panelUrl} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 14px', borderRadius: 99,
                background: 'white', border: '1px solid #d8d0be',
                textDecoration: 'none', transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#2d5a3d'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#d8d0be'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #2d5a3d, #1e4229)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700
              }}>
                {user.email?.[0].toUpperCase()}
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a14' }}>Panele Dön</span>
            </Link>
          )
        })() : (
            <>
              <Link href="/signup" style={{
                padding: '8px 18px', borderRadius: 10, fontSize: 14, fontWeight: 500,
                color: '#2d5a3d', border: '1px solid #2d5a3d', textDecoration: 'none',
              }}>
                Kayıt Ol
              </Link>
              <Link href="/login" style={{
                padding: '8px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                background: '#2d5a3d', color: 'white', textDecoration: 'none',
              }}>
                Giriş Yap
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* HERO SECTION - 2026 EDITION */}
      <section style={{
        position: 'relative',
        padding: '140px 40px 100px',
        overflow: 'hidden',
        textAlign: 'center',
        background: 'radial-gradient(ellipse at top, #eafaf1 0%, transparent 70%)',
      }}>
        {/* Ambient glow behind text */}
        <div style={{
          position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)',
          width: 800, height: 400, background: 'var(--accent)', opacity: 0.15,
          filter: 'blur(120px)', zIndex: 0, borderRadius: '50%'
        }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 10 }}>

          {/* Top Pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: 'white', border: '1px solid rgba(45,90,61,0.15)',
            boxShadow: '0 4px 16px rgba(45,90,61,0.06)',
            borderRadius: 999, padding: '8px 24px', fontSize: 13, fontWeight: 700,
            color: 'var(--accent)', marginBottom: 40, letterSpacing: '0.02em', textTransform: 'uppercase'
          }}>
            <span style={{ display: 'flex', width: 20, height: 20, background: '#eafaf1', borderRadius: '50%', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={12} fill="var(--accent)" />
            </span>
            MEB Mevzuatına %100 Uyumlu Yönetim Altyapısı
          </div>

          {/* Epic Headline */}
          <h1 style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: 'clamp(48px, 6vw, 84px)',
            fontWeight: 800, lineHeight: 1.1,
            color: '#1a1a14', marginBottom: 30,
            letterSpacing: '-0.02em'
          }}>
            Kulübünüzün Kontrolü <br />
            <span style={{
              background: 'linear-gradient(135deg, var(--accent) 0%, #45b673 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              display: 'inline-block', filter: 'drop-shadow(0 4px 20px rgba(45,90,61,0.15))'
            }}>
              Dijital Asistanınızda
            </span>
          </h1>

          <p style={{
            fontSize: 20, color: '#5a5748', lineHeight: 1.7,
            maxWidth: 680, margin: '0 auto 50px', fontWeight: 400
          }}>
            Excel dosyalarına ve kağıt yığınlarına veda edin. Bordro, tahsilat, ders programı ve yoklama
            süreçlerinizi <b>saniyeler içinde</b> hatasız yönetin.
          </p>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '18px 40px', borderRadius: 999, fontSize: 17, fontWeight: 700,
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%)',
              color: 'white', textDecoration: 'none',
              boxShadow: '0 12px 30px rgba(45,90,61,0.25)',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) translateY(0)'}
            >
              Ücretsiz Başlayın <ArrowRight size={20} />
            </Link>
            <Link href="/fiyatlandirma" style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '18px 40px', borderRadius: 999, fontSize: 17, fontWeight: 600,
              background: 'white', border: '2px solid #e0dbd0',
              color: '#1a1a14', textDecoration: 'none',
              transition: 'all 0.3s',
              boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f9f7f0'; e.currentTarget.style.borderColor = '#d8d0be' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e0dbd0' }}
            >
              Sistemi Keşfedin
            </Link>
          </div>

          {/* ADVANCED DASHBOARD SHOWCASE */}
          <div style={{
            marginTop: 100,
            perspective: '1400px',
            position: 'relative'
          }}>

            {/* Floating Card Left - Success Popup */}
            <div style={{
              position: 'absolute', top: -30, left: -20, zIndex: 20,
              background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(20px)',
              padding: '20px 24px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.5)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              display: 'flex', alignItems: 'center', gap: 16,
              animation: 'floatLeft 6s ease-in-out infinite'
            }}>
              <div style={{ width: 48, height: 48, background: '#eafaf1', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={24} color="var(--accent)" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a14' }}>Bordro Hesaplandı</div>
                <div style={{ fontSize: 13, color: '#5a5748' }}>Tüm personeller eksiksiz.</div>
              </div>
            </div>

            {/* Floating Card Right - Revenue Popup */}
            <div style={{
              position: 'absolute', top: 120, right: -40, zIndex: 20,
              background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(20px)',
              padding: '24px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.5)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              display: 'flex', alignItems: 'center', gap: 16,
              animation: 'floatRight 8s ease-in-out infinite'
            }}>
              <div style={{ width: 48, height: 48, background: '#fef9e7', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={24} color="#e67e22" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#1a1a14' }}>+₺45.250</div>
                <div style={{ fontSize: 13, color: '#5a5748' }}>Bu haftaki tahsilat</div>
              </div>
            </div>

            <div style={{
              maxWidth: 1040,
              margin: '0 auto',
              background: 'var(--surface)',
              borderRadius: '24px 24px 0 0',
              border: '1px solid #d8d0be',
              borderBottom: 'none',
              boxShadow: '0 30px 60px rgba(0,0,0,0.12), 0 0 0 10px rgba(255,255,255,0.4)',
              overflow: 'hidden',
              transform: 'rotateX(8deg) translateY(0) scale(1)',
              transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'rotateX(2deg) translateY(-10px) scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'rotateX(8deg) translateY(0) scale(1)'}
            >
              {/* Mockup Topbar */}
              <div style={{ height: 60, background: '#fffef9', borderBottom: '1px solid #e0dbd0', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f56' }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#27c93f' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                  <div style={{ width: 300, height: 32, background: '#f5f2ec', borderRadius: 8 }} />
                </div>
              </div>

              {/* Mockup Layout */}
              <div style={{ display: 'flex', height: 480 }}>
                {/* Mockup Sidebar */}
                <div style={{ width: 220, background: '#1e4229', padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 30 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.2)' }} />
                    <div style={{ width: 100, height: 14, background: 'rgba(255,255,255,0.8)', borderRadius: 4 }} />
                  </div>
                  {[75, 82, 55, 90, 68, 60].map((w, i) => (
                    <div key={i} style={{
                      width: '100%', height: 40,
                      background: i === 1 ? 'rgba(255,255,255,0.15)' : 'transparent',
                      marginBottom: 8, borderRadius: 8,
                      display: 'flex', alignItems: 'center', padding: '0 12px', gap: 12
                    }}>
                      <div style={{ width: 16, height: 16, borderRadius: 4, background: i === 1 ? '#fff' : 'rgba(255,255,255,0.3)' }} />
                      <div style={{ width: w, height: 10, borderRadius: 4, background: i === 1 ? '#fff' : 'rgba(255,255,255,0.3)' }} />
                    </div>
                  ))}
                </div>

                {/* Mockup Content Area */}
                <div style={{ flex: 1, padding: 32, background: '#f5f2ec' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                    <div style={{ width: 200, height: 24, background: '#d8d0be', borderRadius: 6 }} />
                    <div style={{ width: 120, height: 36, background: 'var(--accent)', borderRadius: 8 }} />
                  </div>

                  {/* Mockup Stat Cards */}
                  <div style={{ display: 'flex', gap: 20, marginBottom: 32 }}>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} style={{ flex: 1, height: 110, background: 'white', borderRadius: 16, border: '1px solid #e0dbd0', padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: i === 0 ? '#eafaf1' : i === 1 ? '#fef9e7' : '#e8f4fd', marginBottom: 12 }} />
                        <div style={{ width: 80, height: 10, background: '#d8d0be', borderRadius: 4, marginBottom: 8 }} />
                        <div style={{ width: 120, height: 20, background: '#1a1a14', borderRadius: 4 }} />
                      </div>
                    ))}
                  </div>

                  {/* Mockup Table */}
                  <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e0dbd0', padding: 20, height: 200, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid #f0ede4', paddingBottom: 16, marginBottom: 16 }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} style={{ flex: i === 0 ? 2 : 1, height: 12, background: '#d8d0be', borderRadius: 4 }} />
                      ))}
                    </div>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <div key={j} style={{ flex: j === 0 ? 2 : 1, height: 10, background: '#f0ede4', borderRadius: 4 }} />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Fade out bottom of mockup to blend into page */}
            <div style={{
              position: 'absolute', bottom: -5, left: 0, right: 0, height: 150,
              background: 'linear-gradient(to bottom, transparent, #f5f2ec)',
              pointerEvents: 'none'
            }} />

            <style>
              {`
                @keyframes floatLeft {
                  0% { transform: translateY(0px) rotate(-2deg); }
                  50% { transform: translateY(-15px) rotate(2deg); }
                  100% { transform: translateY(0px) rotate(-2deg); }
                }
                @keyframes floatRight {
                  0% { transform: translateY(0px) rotate(2deg); }
                  50% { transform: translateY(-10px) rotate(-1deg); }
                  100% { transform: translateY(0px) rotate(2deg); }
                }
              `}
            </style>
          </div>
        </div>
      </section>

      {/* CONTRAST - BEFORE / AFTER */}
      <section style={{ padding: '100px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 60, alignItems: 'center' }}>
          <div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(32px, 4vw, 44px)', fontWeight: 800, color: '#1a1a14', marginBottom: 24, lineHeight: 1.2 }}>
              Eski Yöntemleri <br />Geride Bırakın
            </h2>
            <p style={{ fontSize: 18, color: '#5a5748', lineHeight: 1.6, marginBottom: 40 }}>
              Excel dosyaları, kayıp kağıtlar ve manuel bordro hesaplama yüküyle kurumunuzu yormayın.
              Modern dijital yönetimle hatasız ve hızlı bir düzene geçin.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { bad: 'Karışık Excel Tabloları', good: 'Tek Merkezi Sistem', badDesc: 'Kaosa neden olan veri yığınları', goodDesc: 'Her şeyin birbirine bağlı olduğu akıllı mimari' },
                { bad: 'Manuel Maaş Hesapları', good: 'Saniyeler İçinde Bordro', badDesc: 'Katsayı hesaplamalarıyla uğraşmak', goodDesc: 'Güncel MEB parametreleriyle sıfır hata' },
                { bad: 'Geciken Aidat Tespiti', good: 'Zamanında Tahsilat', badDesc: 'Kim ödedi, kim gecikti akılda tutmak', goodDesc: 'Vadesi geçen ödemeler için otomatik uyarılar' }
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) minmax(240px, 1.4fr)', gap: 16, alignItems: 'center',
                  transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)', cursor: 'default'
                }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateX(8px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
                >
                  {/* BAD */}
                  <div style={{
                    padding: '16px 20px', borderRadius: 16, background: '#f5f2ec', border: '1px dashed #d8d0be',
                    opacity: 0.7, position: 'relative'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(192, 57, 43, 0.1)', color: '#c0392b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 800 }}>✕</span>
                      </div>
                      <span style={{ fontSize: 14, color: '#8a8070', textDecoration: 'line-through', fontWeight: 600 }}>{item.bad}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#b5ac9d', paddingLeft: 30 }}>{item.badDesc}</div>

                    {/* Connector Arrow */}
                    <div style={{ position: 'absolute', right: -24, top: '50%', transform: 'translateY(-50%)', zIndex: 10, color: '#d8d0be' }}>
                      <ArrowRight size={18} />
                    </div>
                  </div>

                  {/* GOOD */}
                  <div style={{
                    padding: '18px 24px', borderRadius: 16, background: 'white', border: '1px solid rgba(45,90,61,0.2)',
                    boxShadow: '0 8px 24px rgba(45,90,61,0.06)', position: 'relative', overflow: 'hidden'
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: 'var(--accent)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#eafaf1', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CheckCircle size={14} />
                      </div>
                      <span style={{ fontSize: 16, color: '#1a1a14', fontWeight: 800 }}>{item.good}</span>
                    </div>
                    <div style={{ fontSize: 14, color: '#5a5748', paddingLeft: 36 }}>{item.goodDesc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            {/* Decorative Background */}
            <div style={{
              width: '85%', height: '85%',
              background: 'linear-gradient(135deg, #eafaf1 0%, #fef9e7 100%)',
              borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%', position: 'absolute', zIndex: -1,
              animation: 'morph 8s ease-in-out infinite alternate'
            }} />

            {/* Modern Comparison Graphic (Excel vs Klup360) */}
            <div style={{ position: 'relative', width: '100%', maxWidth: 440, height: 420 }}>
              {/* BACK LAYER: Ugly Excel (Before) */}
              <div style={{
                position: 'absolute', top: 20, right: 0, width: 320,
                background: 'white', borderRadius: 16, border: '1px solid #d0d0d0',
                boxShadow: '0 10px 30px rgba(0,0,0,0.05)', overflow: 'hidden',
                transform: 'rotate(6deg) translate(20px, -20px)', opacity: 0.85,
                filter: 'grayscale(0.3)'
              }}>
                <div style={{ background: '#217346', height: 28, display: 'flex', alignItems: 'center', padding: '0 12px' }}>
                  <div style={{ fontSize: 11, color: 'white', fontWeight: 600 }}>Bordro_Hesapları_Son.xlsx</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '40px 1.5fr 1fr 1.2fr', borderBottom: '1px solid #ccc' }}>
                  <div style={{ background: '#f3f2f1', borderRight: '1px solid #ccc', height: 24 }} />
                  <div style={{ background: '#f3f2f1', borderRight: '1px solid #ccc', fontSize: 11, textAlign: 'center', color: '#666', lineHeight: '24px' }}>A</div>
                  <div style={{ background: '#f3f2f1', borderRight: '1px solid #ccc', fontSize: 11, textAlign: 'center', color: '#666', lineHeight: '24px' }}>B</div>
                  <div style={{ background: '#f3f2f1', fontSize: 11, textAlign: 'center', color: '#666', lineHeight: '24px' }}>C</div>
                </div>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1.5fr 1fr 1.2fr', borderBottom: '1px solid #eee' }}>
                    <div style={{ background: '#f3f2f1', borderRight: '1px solid #ccc', fontSize: 11, textAlign: 'center', color: '#666', lineHeight: '28px' }}>{i + 1}</div>
                    <div style={{ borderRight: '1px solid #eee', padding: '6px', fontSize: 11, color: '#333' }}>{i === 1 ? 'Ahmet Yılmaz' : i === 3 ? 'Ayşe K.' : 'Personel ' + i}</div>
                    <div style={{ borderRight: '1px solid #eee', padding: '6px', fontSize: 11, color: i === 1 ? '#c0392b' : '#333', fontWeight: i === 1 ? 600 : 400 }}>{i === 1 ? 'EKSİK' : 'TAMAM'}</div>
                    <div style={{ padding: '6px', fontSize: 11, color: i === 3 ? '#c0392b' : '#333', background: i === 3 ? '#ffecec' : 'transparent', fontWeight: i === 3 ? 600 : 400 }}>{i === 3 ? '#DEĞER!' : '₺24,500'}</div>
                  </div>
                ))}

                {/* Floating Excel Error Warning */}
                <div style={{
                  position: 'absolute', bottom: 30, right: -10, background: '#c0392b', color: 'white',
                  padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  boxShadow: '0 8px 24px rgba(192,57,43,0.4)', display: 'flex', alignItems: 'center', gap: 6
                }}>
                  <span style={{ fontSize: 14 }}>✕</span> Formül Hatası
                </div>
              </div>

              {/* FRONT LAYER: 2026 UI (After) */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, width: 340,
                background: '#163620', borderRadius: 24, border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 30px 60px rgba(0,0,0,0.25), 0 0 0 10px rgba(255,255,255,0.4)',
                padding: 28, transform: 'translateY(10px)', zIndex: 10
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.1)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle size={22} color="#45b673" />
                    </div>
                    <div>
                      <div style={{ color: 'white', fontSize: 16, fontWeight: 700, marginBottom: 2 }}>Maaş Bordrosu</div>
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Tüm kayıtlar doğrulandı</div>
                    </div>
                  </div>
                  <div style={{ padding: '6px 10px', background: 'rgba(69, 182, 115, 0.2)', border: '1px solid rgba(69, 182, 115, 0.5)', borderRadius: 8, color: '#45b673', fontSize: 11, fontWeight: 800, letterSpacing: '0.05em' }}>
                    HATASIZ
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Toplam Ödenecek</span>
                    <span style={{ color: 'white', fontSize: 18, fontWeight: 800 }}>₺145,500.00</span>
                  </div>
                  <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #2d5a3d, #45b673)' }} />
                  </div>
                </div>

                {/* Floating System Speed Badge */}
                <div style={{
                  position: 'absolute', top: -20, left: -20, background: 'white',
                  padding: '12px 20px', borderRadius: 16, boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
                  display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #e0dbd0',
                  animation: 'float 4s ease-in-out infinite'
                }}>
                  <Zap size={22} fill="#e67e22" color="#e67e22" />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1a14', lineHeight: 1, marginBottom: 2 }}>0.3sn</div>
                    <div style={{ fontSize: 12, color: '#8a8070', fontWeight: 500 }}>Hesaplama Süresi</div>
                  </div>
                </div>
              </div>
            </div>

            <style>
              {`
                @keyframes morph {
                  0% { border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%; }
                  100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
                }
              `}
            </style>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{
        background: 'linear-gradient(135deg,#2d5a3d,#1e4229)',
        padding: '48px 40px',
      }}>
        <div style={{
          maxWidth: 900, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 32,
        }}>
          {stats.map(s => (
            <div key={s.value} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: 36, fontWeight: 700, color: 'white', lineHeight: 1,
              }}>{s.value}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES - PREMIUM 2026 */}
      <section style={{ padding: '120px 40px', maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
        {/* Decorative background blurs for depth */}
        <div style={{ position: 'absolute', top: 100, left: -100, width: 400, height: 400, background: 'var(--accent)', opacity: 0.05, filter: 'blur(100px)', zIndex: -1, borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: 100, right: -100, width: 400, height: 400, background: '#c8832a', opacity: 0.03, filter: 'blur(100px)', zIndex: -1, borderRadius: '50%' }} />

        <div style={{ textAlign: 'center', marginBottom: 70 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--accent)', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
            <Star size={16} fill="var(--accent)" /> Hepsi Bir Arada Yekpare Sistem
          </div>
          <h2 style={{
            fontFamily: 'Playfair Display, serif', fontSize: 'clamp(36px, 4vw, 48px)', fontWeight: 800,
            color: '#1a1a14', marginBottom: 16, lineHeight: 1.2
          }}>
            İhtiyacınız Olan Her Şey
          </h2>
          <p style={{ fontSize: 18, color: '#5a5748', maxWidth: 580, margin: '0 auto', lineHeight: 1.6 }}>
            12 modül, tek platform. Başka hiçbir yazılıma veya Excel dosyasına ihtiyaç duymadan kulübünüzü yönetmek için gereken tüm akıllı araçlar eksiksiz burada.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 24,
        }}>
          {features.map(f => (
            <div key={f.title} style={{
              position: 'relative',
              background: '#fffef9', borderRadius: 24,
              border: '1px solid rgba(216, 208, 190, 0.6)',
              padding: '32px 28px',
              overflow: 'hidden',
              boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
              transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              cursor: 'default'
            }}
              onMouseEnter={e => {
                const target = e.currentTarget as HTMLElement;
                target.style.transform = 'translateY(-6px)';
                target.style.boxShadow = '0 20px 40px rgba(45,90,61,0.08), 0 0 0 1px var(--accent)';
                target.style.background = 'linear-gradient(180deg, #ffffff 0%, #f9fdfa 100%)';
                const bgIcon = target.querySelector('.bg-icon') as HTMLElement;
                if (bgIcon) { bgIcon.style.transform = 'scale(1.2) rotate(-10deg)'; bgIcon.style.opacity = '0.08'; }
              }}
              onMouseLeave={e => {
                const target = e.currentTarget as HTMLElement;
                target.style.transform = 'translateY(0)';
                target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.02)';
                target.style.background = '#fffef9';
                target.style.border = '1px solid rgba(216, 208, 190, 0.6)';
                const bgIcon = target.querySelector('.bg-icon') as HTMLElement;
                if (bgIcon) { bgIcon.style.transform = 'scale(1) rotate(0deg)'; bgIcon.style.opacity = '0.03'; }
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'linear-gradient(135deg, #eafaf1 0%, #d4f2df 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20, boxShadow: '0 4px 12px rgba(45,90,61,0.1)',
                position: 'relative', zIndex: 2
              }}>
                <f.icon size={22} color="var(--accent)" />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1a1a14', marginBottom: 10, position: 'relative', zIndex: 2 }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 14, color: '#5a5748', lineHeight: 1.65, margin: 0, position: 'relative', zIndex: 2 }}>
                {f.desc}
              </p>

              {/* Giant abstract faded icon in background */}
              <div className="bg-icon" style={{
                position: 'absolute', right: -20, bottom: -20,
                opacity: 0.03, transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                zIndex: 1
              }}>
                <f.icon size={120} color="var(--accent)" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DENETİM YETKİLİSİ - PREMIUM 2026 */}
      <section style={{
        background: 'linear-gradient(135deg, #163620 0%, #20412a 100%)',
        padding: '120px 40px', position: 'relative', overflow: 'hidden'
      }}>
        {/* Glow Effects */}
        <div style={{ position: 'absolute', top: '10%', left: '20%', width: 500, height: 500, background: 'rgba(255,255,255,0.03)', filter: 'blur(100px)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '10%', width: 600, height: 600, background: 'var(--accent)', filter: 'blur(150px)', opacity: 0.1, borderRadius: '50%', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 80 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 999, padding: '8px 20px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
              color: 'rgba(255,255,255,0.95)', marginBottom: 24, backdropFilter: 'blur(10px)'
            }}>
              <Eye size={16} /> Resmi Kurumlar / MEB İçin
            </div>

            <h2 style={{
              fontFamily: 'Playfair Display, serif', fontSize: 'clamp(36px, 4vw, 56px)', fontWeight: 800,
              color: 'white', marginBottom: 20, lineHeight: 1.15
            }}>
              Şeffaf ve Anlık<br />Denetim Paneli
            </h2>

            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.6 }}>
              İl ve İlçe Milli Eğitim Müdürlüklerine özel olarak tahsis edilen salt-okunur panel ile bölgenizdeki tüm bağlı kurumları saniyeler içinde denetleyin.
            </p>

            <Link href="/login?type=denetim" style={{
              display: 'inline-flex', alignItems: 'center', gap: 12,
              padding: '16px 40px', borderRadius: 16, fontSize: 17, fontWeight: 700,
              background: 'white', color: '#163620', textDecoration: 'none',
              boxShadow: '0 0 0 4px rgba(255,255,255,0.1), 0 10px 30px rgba(0,0,0,0.2)',
              transition: 'all 0.3s ease'
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 0 0 6px rgba(255,255,255,0.15), 0 20px 40px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 0 0 4px rgba(255,255,255,0.1), 0 10px 30px rgba(0,0,0,0.2)';
              }}
            >
              Denetçi Girişi Yapın <ArrowRight size={20} />
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
            {[
              {
                icon: MapPin,
                title: 'İl / İlçe Geneli Özet',
                desc: 'Bölgedeki toplam öğrenci, personel ve ruhsatlı/ruhsatsız operasyon verilerini kuşbakışı haritada tek bakışta görün.',
              },
              {
                icon: Building2,
                title: 'Okul Bazlı Kesin İzleme',
                desc: 'Bağlı her kulübün dosyasına dijital olarak inin. Mevcut öğrenci sayısı ve kapasite aşımı kontrolleri anlık hesaplanır.',
              },
              {
                icon: FileText,
                title: 'Resmi Bordro Görüntüleme',
                desc: 'Kulüplerin beyan ettiği aylık bordroları, MEB katsayı doğrulamalarını ve kesintileri salt-okunur olarak inceleyin.',
              },
              {
                icon: BarChart2,
                title: 'Finansal Şeffaflık Raporları',
                desc: 'Gelir-gider tabloları, vergi dilimleri ve aidat tahsilat oranları yasal denetim formatında sistemde her an hazırdır.',
              },
              {
                icon: Calendar,
                title: 'Sınıf Defteri & Yoklama',
                desc: 'Kurumda o an hangi öğretmenin, hangi sınıfta derste olduğunu fiili devam defterinden yerinde olmadan inceleyin.',
              },
              {
                icon: UserCheck,
                title: 'Mutlak Salt Okunur Erişim',
                desc: 'Denetim yetkilisi veriyi değiştiremez, silemez. Kurumun sisteme girdiği veri %100 şeffaflıkla ekrana yansır.',
              },
            ].map(item => (
              <div key={item.title} style={{
                background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 24, padding: '32px', position: 'relative', overflow: 'hidden',
                transition: 'all 0.3s ease', cursor: 'default'
              }}
                onMouseEnter={e => {
                  const target = e.currentTarget as HTMLElement;
                  target.style.background = 'rgba(255,255,255,0.06)';
                  target.style.borderColor = 'rgba(255,255,255,0.2)';
                  target.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={e => {
                  const target = e.currentTarget as HTMLElement;
                  target.style.background = 'rgba(255,255,255,0.03)';
                  target.style.borderColor = 'rgba(255,255,255,0.1)';
                  target.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  width: 52, height: 52, borderRadius: 16,
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  <item.icon size={26} color="white" />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: 'white', marginBottom: 12 }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>
                  {item.desc}
                </p>

                {/* Decorative glowing dot */}
                <div style={{ position: 'absolute', top: 32, right: 32, width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', boxShadow: '0 0 10px rgba(255,255,255,0.5)' }} />
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* HOW IT WORKS - PREMIUM TIMELINE */}
      <section style={{
        background: 'linear-gradient(180deg, #fffef9 0%, #f5f2ec 100%)',
        padding: '140px 40px', position: 'relative', overflow: 'hidden'
      }}>
        {/* Background Decorative Mesh */}
        <div style={{ position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)', width: 1000, height: 400, background: 'radial-gradient(ellipse, #eafaf1 0%, transparent 70%)', opacity: 0.8, pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 10 }}>
          <div style={{ textAlign: 'center', marginBottom: 100 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--accent)', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
              <Zap size={16} fill="var(--accent)" /> Işık Hızında Kurulum
            </div>
            <h2 style={{
              fontFamily: 'Playfair Display, serif', fontSize: 'clamp(36px, 4vw, 48px)', fontWeight: 800,
              color: '#1a1a14', marginBottom: 16, lineHeight: 1.2
            }}>
              3 Adımda Sisteme Geçin
            </h2>
            <p style={{ fontSize: 18, color: '#5a5748', maxWidth: 500, margin: '0 auto' }}>
              Karmaşık entegrasyonlar yok. Öğle aranızda bile sistemi kurup canlıya alabilirsiniz.
            </p>
          </div>

          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 32, flexDirection: 'row' }}>
            {/* The Continuous Glowing Line Background */}
            <div style={{
              position: 'absolute', top: 0, left: 60, right: 60, height: 2,
              background: 'linear-gradient(90deg, rgba(45,90,61,0) 0%, rgba(45,90,61,0.2) 20%, rgba(45,90,61,0.2) 80%, rgba(45,90,61,0) 100%)',
              zIndex: 0
            }} />

            {steps.map((s, i) => (
              <div key={s.num} style={{
                flex: 1, position: 'relative', zIndex: 1,
                background: 'white', borderRadius: 24, padding: '50px 32px 40px',
                border: '1px solid #e0dbd0', boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
                transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                textAlign: 'center', marginTop: 0
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-10px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(45,90,61,0.08)';
                  e.currentTarget.style.borderColor = 'var(--accent-light)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.03)';
                  e.currentTarget.style.borderColor = '#e0dbd0';
                }}
              >
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: 'white', border: '1px solid #d8d0be',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '-90px auto 32px', position: 'relative',
                  fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 800, color: 'var(--accent)'
                }}>
                  {/* Subtle Inner Glow */}
                  <div style={{ position: 'absolute', inset: 6, borderRadius: '50%', background: 'linear-gradient(135deg, #eafaf1, transparent)', zIndex: -1 }} />
                  {s.num}
                </div>

                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a14', marginBottom: 12 }}>
                  {s.title}
                </h3>
                <p style={{ fontSize: 15, color: '#5a5748', lineHeight: 1.6, margin: 0 }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST - PREMIUM 2026 */}
      <section style={{ padding: '120px 40px', maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 70 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--accent)', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
            <Shield size={16} fill="var(--accent)" /> Kurumsal Güven
          </div>
          <h2 style={{
            fontFamily: 'Playfair Display, serif', fontSize: 'clamp(32px, 4vw, 44px)', fontWeight: 800,
            color: '#1a1a14', marginBottom: 16, lineHeight: 1.2
          }}>
            Güvenli ve Uyumlu
          </h2>
          <p style={{ fontSize: 18, color: '#5a5748', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
            Verileriniz endüstri standartlarında şifrelenir, altyapımız MEB mevzuatına tam uyumlu çalışır.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
          {[
            {
              icon: Shield,
              title: 'Sıfır Risk, Şifreli Altyapı',
              desc: 'Tüm verileriniz 256-bit şifrelenmiş olarak Supabase bulutunda saklanır. Kimse izniniz olmadan erişemez.',
            },
            {
              icon: CheckCircle,
              title: 'MEB & SGK Uyumluluğu',
              desc: 'Bordro algoritmaları tamamen MEB katsayıları ve SGK güncellemelerine endekslidir. Yasal ceza riski sıfır.',
            },
            {
              icon: Building2,
              title: 'Çoklu Kurum Mimarisi',
              desc: 'Birden fazla işletmeniz varsa tek hesapta birleştirin. Her kurum bağımsız ve verileri mutlak şekilde izolelidir.',
            },
            {
              icon: Activity,
              title: 'Gerçek Zamanlı Senkronizasyon',
              desc: 'Siz bir öğrenci kaydettiğinizde, muhasebenin ekranına anında düşer. Takımınızla saniye sekmeden aynı anda çalışın.',
            },
            {
              icon: Zap,
              title: 'Akıllı Proaktif Bildirimler',
              desc: 'Geciken ödemeler, kritik eksiklikler veya yaklaşan tahsilat günleri size sistem tarafından bildirim olarak gelir.',
            },
            {
              icon: TrendingUp,
              title: 'Otomatik Raporlama Motoru',
              desc: 'Aylık, dönemlik veya anlık mali bilançolarınızı Excel stresine girmeden saniyeler içinde çekin.',
            },
          ].map((t) => (
            <div key={t.title} style={{
              background: '#fffef9', borderRadius: 24, border: '1px solid rgba(216, 208, 190, 0.4)',
              padding: '32px', position: 'relative', overflow: 'hidden',
              boxShadow: '0 4px 15px rgba(0,0,0,0.02)', cursor: 'default',
              transition: 'all 0.3s ease'
            }}
              onMouseEnter={e => {
                const target = e.currentTarget as HTMLElement;
                target.style.boxShadow = '0 12px 30px rgba(45,90,61,0.06)';
                target.style.borderColor = 'var(--accent-light)';
                const iconBg = target.querySelector('.trust-icon-bg') as HTMLElement;
                if (iconBg) iconBg.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={e => {
                const target = e.currentTarget as HTMLElement;
                target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.02)';
                target.style.borderColor = 'rgba(216, 208, 190, 0.4)';
                const iconBg = target.querySelector('.trust-icon-bg') as HTMLElement;
                if (iconBg) iconBg.style.transform = 'scale(1)';
              }}
            >
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div className="trust-icon-bg" style={{
                  width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                  background: 'linear-gradient(135deg, #f5f2ec 0%, #fffef9 100%)', border: '1px solid #e0dbd0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.3s ease'
                }}>
                  <t.icon size={22} color="var(--accent)" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a14', marginBottom: 8, marginTop: 4 }}>{t.title}</h3>
                  <p style={{ fontSize: 14, color: '#5a5748', lineHeight: 1.6, margin: 0 }}>{t.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA - PREMIUM 2026 */}
      <section style={{
        padding: '120px 40px',
        background: '#fffef9',
        display: 'flex', justifyContent: 'center'
      }}>
        <div style={{
          width: '100%', maxWidth: 1200,
          background: 'linear-gradient(135deg, #1e4229 0%, #163620 100%)',
          borderRadius: 40,
          padding: '80px 40px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 30px 60px rgba(45,90,61,0.15)'
        }}>
          {/* Ambient Glow inside the CTA card */}
          <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '60%', height: '200%', background: 'radial-gradient(ellipse, rgba(255,255,255,0.08) 0%, transparent 60%)', transform: 'rotate(-45deg)' }} />
          <div style={{ position: 'absolute', bottom: '-80%', right: '-10%', width: '60%', height: '200%', background: 'radial-gradient(ellipse, var(--accent) 0%, transparent 60%)', opacity: 0.5 }} />

          <div style={{ position: 'relative', zIndex: 10 }}>
            <h2 style={{
              fontFamily: 'Playfair Display, serif',
              fontSize: 'clamp(32px, 5vw, 56px)',
              fontWeight: 800, color: 'white',
              marginBottom: 20, lineHeight: 1.15
            }}>
              Kulübünüzü Dijitale Taşıyın
            </h2>
            <p style={{
              fontSize: 18, color: 'rgba(255,255,255,0.8)',
              maxWidth: 540, margin: '0 auto 48px',
              lineHeight: 1.6,
            }}>
              Kağıt, Excel ve manuel hesaplama dönemine kalıcı olarak son verin.
              Klüp360 ile sadece dakikalar içinde yeni nesil yönetime geçin.
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/signup" style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '18px 48px', borderRadius: 999, fontSize: 17, fontWeight: 700,
                background: 'white', color: '#163620', textDecoration: 'none',
                boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
                }}
              >
                Ücretsiz Başlayın <ArrowRight size={20} />
              </Link>
              <Link href="/fiyatlandirma" style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '18px 48px', borderRadius: 999, fontSize: 17, fontWeight: 600,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)',
                color: 'white', textDecoration: 'none', backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease'
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
              >
                Fiyatları İnceleyin
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        background: '#1e4229', padding: '40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ClipboardList size={16} color="white" />
          </div>
          <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 16, color: 'white' }}>
            Klüp360
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          © {new Date().getFullYear()} Klüp360 — MEB Çocuk Kulüpleri Yönetim Sistemi
        </p>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/fiyatlandirma" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Fiyatlandırma</Link>
          <Link href="/tanitim/kullanim-kosullari" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Kullanım Koşulları</Link>
          <Link href="/tanitim/gizlilik-politikasi" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Gizlilik</Link>
          <Link href="/tanitim/iade-politikasi" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>İade</Link>
          <Link href="/tanitim/iletisim" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>İletişim</Link>
          <Link href="/login" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Giriş</Link>
          <Link href="/signup" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Kayıt</Link>
        </div>
      </footer>

    </div>
  )
}
