'use client'
import Link from 'next/link'
import { ClipboardList, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'

export default function IadePolitikasiPage() {
  const { user } = useAuth()
  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', color: '#1a1a14', background: '#f5f2ec', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
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
          
          {user ? (
            <Link href="/" style={{
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
          ) : (
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

      {/* CONTENT */}
      <main style={{ flex: 1, padding: '80px 40px', maxWidth: 800, margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 40, fontWeight: 800, color: '#1a1a14', marginBottom: 40 }}>
          İade Politikası
        </h1>

        <div style={{ background: 'white', borderRadius: 24, padding: 40, border: '1px solid #e0dbd0', boxShadow: '0 10px 30px rgba(0,0,0,0.02)', fontSize: 16, lineHeight: 1.8, color: '#5a5748' }}>
          <h3 style={{ color: '#1a1a14', fontSize: 20, fontWeight: 700, marginBottom: 16, marginTop: 0 }}>1. İptal ve İade Kapsamı</h3>
          <p style={{ marginBottom: 24 }}>
            Klüp360, kullanıcılara ücretli abonelik planları sunmaktadır. Kullanıcılar, satın aldıkları abonelik planını herhangi bir gerekçe göstermeksizin ilk 14 (on dört) gün içerisinde iptal etme ve tam iade talep etme hakkına sahiptir.
          </p>

          <h3 style={{ color: '#1a1a14', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>2. 14 Gün Sonrası İptaller</h3>
          <p style={{ marginBottom: 24 }}>
            14 günlük cayma süresinin bitiminden sonra yapılan iptal başvurularında para iadesi yapılmaz. Ancak kullanıcı, aboneliğini dilediği zaman iptal edebilir ve ödenmiş dönemin sonuna kadar platformu kullanmaya devam edebilir.
          </p>

          <h3 style={{ color: '#1a1a14', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>3. İade Süreci</h3>
          <p style={{ marginBottom: 24 }}>
            İade talepleri iletişim formu üzerinden veya destek e-posta adresimiz aracılığıyla iletilmelidir. Onaylanan iadeler, ödemenin yapıldığı kredi kartına veya banka hesabına 3-7 iş günü içerisinde yansıtılacaktır. Bankaların işlem süreleri nedeniyle bu süre değişiklik gösterebilir.
          </p>

          <h3 style={{ color: '#1a1a14', fontSize: 20, fontWeight: 700, marginBottom: 16 }}>4. Hesap Askıya Alınması</h3>
          <p style={{ marginBottom: 0 }}>
            Kullanım koşullarının ihlali nedeniyle hesapların Klüp360 tarafından askıya alınması veya kapatılması durumunda, kullanılmayan sürelerin ücret iadesi yapılmaz.
          </p>
        </div>
      </main>

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
        <div style={{ display: 'flex', gap: 20 }}>
          <Link href="/tanitim/kullanim-kosullari" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Kullanım Koşulları</Link>
          <Link href="/tanitim/gizlilik-politikasi" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>Gizlilik Politikası</Link>
          <Link href="/tanitim/iade-politikasi" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>İade Politikası</Link>
          <Link href="/tanitim/iletisim" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>İletişim</Link>
        </div>
      </footer>
    </div>
  )
}
