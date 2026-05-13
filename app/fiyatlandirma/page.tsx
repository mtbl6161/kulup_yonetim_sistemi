'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  Check, ClipboardList, Users, GraduationCap, Calendar, BookOpen,
  Clock, FileText, Wallet, BarChart3, Landmark, TrendingUp,
  Settings, School, ArrowRight, Star, Zap, CheckCircle
} from 'lucide-react'

const AYLIK = 750
const YILLIK_TOPLAM = 7500
const YILLIK_AYLIK = Math.round(YILLIK_TOPLAM / 12)

const ozellikler = [
  { icon: Users,         label: 'Öğrenci yönetimi' },
  { icon: GraduationCap, label: 'Personel yönetimi' },
  { icon: School,        label: 'Sınıf tanımları' },
  { icon: Calendar,      label: 'Ders programı' },
  { icon: BookOpen,      label: 'Sınıf defteri & devam' },
  { icon: Clock,         label: 'Puantaj takibi' },
  { icon: FileText,      label: 'Otomatik bordro hesabı' },
  { icon: FileText,      label: 'Bordro e-posta gönderimi' },
  { icon: Wallet,        label: 'Ödeme & tahsilat takibi' },
  { icon: BarChart3,     label: 'Gelir / gider raporları' },
  { icon: Landmark,      label: 'Bilanço' },
  { icon: TrendingUp,    label: 'Hesap hareketleri' },
  { icon: Settings,      label: 'Kurumsal ayarlar' },
  { icon: Zap,           label: 'Akıllı uyarılar' },
  { icon: Star,          label: 'MEB mevzuatına tam uyum' },
]

export default function FiyatlandirmaPage() {
  const [donem, setDonem] = useState<'aylik' | 'yillik'>('aylik')

  const fiyat     = donem === 'aylik' ? AYLIK : YILLIK_AYLIK
  const perLabel  = donem === 'aylik' ? '/ ay' : '/ ay  (yıllık fatura)'
  const toplamLabel = donem === 'yillik'
    ? `Yılda toplam ${YILLIK_TOPLAM.toLocaleString('tr-TR')} TL`
    : null

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
        <Link href="/tanitim" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
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
        </Link>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/signup" style={{
            padding: '8px 18px', borderRadius: 10, fontSize: 14, fontWeight: 500,
            color: '#2d5a3d', border: '1px solid #2d5a3d', textDecoration: 'none',
          }}>Kayıt Ol</Link>
          <Link href="/login" style={{
            padding: '8px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600,
            background: '#2d5a3d', color: 'white', textDecoration: 'none',
          }}>Giriş Yap</Link>
        </div>
      </nav>

      {/* BACKGROUND DECORATIONS */}
      <div style={{ position: 'fixed', top: -200, left: '50%', transform: 'translateX(-50%)', width: 1000, height: 600, background: 'radial-gradient(ellipse, #eafaf1 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -200, right: -200, width: 600, height: 600, background: 'var(--accent)', filter: 'blur(150px)', opacity: 0.1, zIndex: 0, pointerEvents: 'none' }} />

      <main style={{ position: 'relative', zIndex: 10 }}>
        {/* HERO */}
        <section style={{ padding: '80px 40px 60px', textAlign: 'center', maxWidth: 860, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'white', border: '1px solid rgba(45,90,61,0.15)', boxShadow: '0 4px 16px rgba(45,90,61,0.06)', borderRadius: 999, padding: '8px 24px', fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginBottom: 32, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            <Zap size={14} fill="var(--accent)" /> Limit Yok, Sürpriz Yok
          </div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(44px, 5vw, 64px)', fontWeight: 800, lineHeight: 1.1, color: '#1a1a14', marginBottom: 20 }}>
            Sade Fiyat, <br/>
            <span style={{ 
              background: 'linear-gradient(135deg, var(--accent) 0%, #45b673 100%)', 
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>Tam Özellik</span>
          </h1>
          <p style={{ fontSize: 19, color: '#5a5748', lineHeight: 1.7, marginBottom: 48, maxWidth: 600, margin: '0 auto 48px' }}>
            Tek plan, tüm modüller. Sınırsız öğretmen, sınırsız öğrenci. Sisteme kayıtlı işletmeniz kadar ödeyin, gizli ücretlerle asla karşılaşmayın.
          </p>

          {/* TOGGLE */}
          <div style={{
            display: 'inline-flex', background: 'white', border: '1px solid #d8d0be', borderRadius: 999, padding: 6, gap: 4,
            boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
          }}>
            {(['aylik', 'yillik'] as const).map(d => (
              <button key={d} onClick={() => setDonem(d)} style={{
                padding: '14px 32px', borderRadius: 999, fontSize: 15, fontWeight: 700,
                border: 'none', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                background: donem === d ? 'var(--accent)' : 'transparent',
                color: donem === d ? 'white' : '#5a5748',
                boxShadow: donem === d ? '0 8px 20px rgba(45,90,61,0.2)' : 'none'
              }}>
                {d === 'aylik' ? 'Aylık Fatura' : 'Yıllık Fatura'}
                {d === 'yillik' && (
                  <span style={{
                    marginLeft: 10, background: donem === d ? 'rgba(255,255,255,0.2)' : '#eafaf1', color: donem === d ? 'white' : 'var(--accent)',
                    borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 800,
                  }}>%20 İndirim</span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* PLAN KARTI */}
        <section style={{ padding: '0 40px 96px', maxWidth: 1000, margin: '0 auto' }}>
          <div style={{
            background: '#fffef9', borderRadius: 32, border: '1px solid #d8d0be',
            boxShadow: '0 30px 60px rgba(45,90,61,0.1), 0 0 0 10px rgba(255,255,255,0.5)',
            display: 'grid', gridTemplateColumns: 'minmax(340px, 1fr) 1.5fr', overflow: 'hidden',
          }}>
            {/* PRICING INFO (Left Side) */}
            <div style={{
              background: 'linear-gradient(135deg, #1e4229 0%, #163620 100%)',
              padding: '48px 40px', color: 'white', position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '100%', height: '100%', background: 'radial-gradient(ellipse at top left, rgba(255,255,255,0.08) 0%, transparent 60%)' }} />
              
              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 999,
                  padding: '6px 16px', fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 32, backdropFilter: 'blur(10px)'
                }}>
                  <CheckCircle size={15} color="#45b673" /> Premium Deneyim
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 32, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginTop: 8 }}>₺</span>
                  <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 72, fontWeight: 800, color: 'white', lineHeight: 1 }}>
                    {fiyat.toLocaleString('tr-TR')}
                  </span>
                </div>
                <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{perLabel} / Kurum</div>

                {toplamLabel && (
                  <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px', marginBottom: 32 }}>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', margin: 0 }}>
                      {toplamLabel} <br/> <strong style={{ color: '#45b673', display: 'block', marginTop: 6, fontSize: 15 }}>
                        ({(AYLIK * 12 - YILLIK_TOPLAM).toLocaleString('tr-TR')} TL net tasarruf)
                      </strong>
                    </p>
                  </div>
                )}
                {!toplamLabel && <div style={{ height: 32 }} />}

                <Link href="/signup" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  width: '100%', padding: '20px 0', borderRadius: 16,
                  background: 'white', color: '#163620', fontWeight: 800, fontSize: 17,
                  textDecoration: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                }}>
                  7 Gün Ücretsiz Dene <ArrowRight size={20} />
                </Link>
                <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 16, margin: '16px 0 0 0' }}>
                  Kredi Kartı Gerekmez
                </p>
              </div>
            </div>

            {/* FEATURES LIST (Right Side) */}
            <div style={{ padding: '48px', background: '#fffef9' }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#1a1a14', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #f0ede6' }}>
                Pakete Dahil Olan Her Şey
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px 16px' }}>
                {ozellikler.map(o => (
                  <div key={o.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', background: '#eafaf1', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)'
                    }}>
                      <Check size={14} strokeWidth={3} />
                    </div>
                    <span style={{ fontSize: 14, color: '#3a3a2e', fontWeight: 600, lineHeight: 1.4, marginTop: 2 }}>{o.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SSS */}
          <div style={{ marginTop: 80, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {[
              { q: 'İptal edebilir miyim?', a: 'Sistem üzerinden istediğiniz an, kimseyle görüşmeden tek tıkla iptal edebilirsiniz. Uzun sözleşmeler veya cayma bedeli yoktur.' },
              { q: 'Sınırlar var mı?', a: 'Sınırsız personel, sınırsız sınıf ve sınırsız öğrenci. Fiyatlandırma sadece yönetilen kurum (özel ID) başına sabittir.' },
              { q: 'Veri güvenliği nasıl?', a: 'Tüm kişisel ve finansal verileriniz 256-bit uçtan uca şifrelemeyle Supabase global güvenli bulut altyapısında barındırılır.' },
            ].map((item, i) => (
              <div key={item.q} style={{
                background: 'rgba(255,255,255,0.6)', borderRadius: 24, border: '1px solid rgba(216, 208, 190, 0.4)',
                padding: '32px 24px', backdropFilter: 'blur(10px)'
              }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, border: '1px solid #e0dbd0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)' }}>0{i+1}</span>
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#1a1a14', marginBottom: 12 }}>{item.q}</p>
                <p style={{ fontSize: 14, color: '#5a5748', margin: 0, lineHeight: 1.6 }}>{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer style={{
        background: '#1e4229', padding: '32px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 16, color: 'white' }}>Klüp360</span>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          © {new Date().getFullYear()} Klüp360 — MEB Çocuk Kulüpleri Yönetim Sistemi
        </p>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link href="/tanitim" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Tanıtım</Link>
          <Link href="/login"   style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Giriş</Link>
          <Link href="/signup"  style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Kayıt</Link>
        </div>
      </footer>
    </div>
  )
}
