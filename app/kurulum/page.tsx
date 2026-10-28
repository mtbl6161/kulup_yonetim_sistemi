'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, LogOut, School } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { DENEME_GUN } from '@/lib/deneme'
import { useYukleme } from '@/lib/useYukleme'

// Auth hesabı açılmış ama okul/profil kaydı yarım kalmış kullanıcılar buraya
// yönlenir; formu doldurunca ücretsiz deneme ile okulları oluşturulur.
export default function KurulumPage() {
  const router = useRouter()
  const { user, profil, session, loading, signOut } = useAuth()

  const [okulAdi, setOkulAdi]       = useState('')
  const [mudurAdi, setMudurAdi]     = useState('')
  const [tel, setTel]               = useState('')
  const [ilId, setIlId]             = useState('')
  const [ilceId, setIlceId]         = useState('')
  const [gunlukSaat, setGunlukSaat] = useState('6')
  const [saatUcreti, setSaatUcreti] = useState('')
  const [iller, setIller]           = useState<{ id: number; ad: string }[]>([])
  const [ilceler, setIlceler]       = useState<{ id: number; ad: string }[]>([])
  const [hata, setHata]             = useState<string | null>(null)
  const [kaydediliyor, setKaydediliyor] = useState(false)

  useEffect(() => {
    if (!loading && profil) router.replace('/')
  }, [loading, profil, router])

  useEffect(() => {
    supabase.from('iller').select('id, ad').order('ad').then(({ data }) => setIller(data ?? []))
  }, [])

  useYukleme(() => {
    setIlceId('')
    if (!ilId) { setIlceler([]); return }
    supabase.from('ilceler').select('id, ad').eq('il_id', ilId).order('ad').then(({ data }) => setIlceler(data ?? []))
  }, [ilId])

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setHata(null)
    if (!okulAdi.trim()) return setHata('Kurum adı zorunludur.')
    if (!mudurAdi.trim()) return setHata('Müdür/Yetkili adı zorunludur.')
    if (!ilId || !ilceId) return setHata('İl ve ilçe seçmelisiniz.')
    if (!saatUcreti || Number(saatUcreti) <= 0) return setHata('Saatlik ücret zorunludur.')
    if (!session?.access_token) return setHata('Oturum bulunamadı. Lütfen tekrar giriş yapın.')

    setKaydediliyor(true)
    try {
      const res = await fetch('/api/kayit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: session.access_token,
          schoolName: okulAdi,
          mudurAdi, tel, adres: '',
          ilId, ilceId,
          gunlukSaat: Number(gunlukSaat),
          saatUcreti: Number(saatUcreti),
        }),
      })
      const body = await res.json()
      if (!res.ok) { setHata(body.error ?? 'Kurulum tamamlanamadı.'); return }
      // Profil/okul bilgisinin AuthContext'e baştan yüklenmesi için tam yenileme
      window.location.href = '/'
    } catch {
      setHata('Bağlantı hatası. Lütfen tekrar deneyin.')
    } finally {
      setKaydediliyor(false)
    }
  }

  if (loading || profil) {
    return <div style={wrap}><Loader2 size={28} className="animate-spin" color="var(--accent)" /></div>
  }

  return (
    <div style={wrap}>
      <form onSubmit={handleSubmit} style={card}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={iconBox}><School size={24} color="var(--accent)" /></div>
          <h1 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>Kurulumu Tamamlayın</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text2)' }}>
            Kurum bilgilerinizi girin, <strong>{DENEME_GUN} gün ücretsiz deneme</strong> hemen başlasın.
          </p>
        </div>

        <label style={label}>Kurum Adı</label>
        <input style={input} value={okulAdi} onChange={e => setOkulAdi(e.target.value)} placeholder="Örn. Atatürk İlkokulu Çocuk Kulübü" />

        <label style={label}>Müdür / Yetkili Adı</label>
        <input style={input} value={mudurAdi} onChange={e => setMudurAdi(e.target.value)} />

        <label style={label}>Telefon (isteğe bağlı)</label>
        <input style={input} value={tel} onChange={e => setTel(e.target.value)} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={label}>İl</label>
            <select style={input} value={ilId} onChange={e => setIlId(e.target.value)}>
              <option value="">Seçin…</option>
              {iller.map(il => <option key={il.id} value={il.id}>{il.ad}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>İlçe</label>
            <select style={input} value={ilceId} onChange={e => setIlceId(e.target.value)} disabled={!ilId}>
              <option value="">Seçin…</option>
              {ilceler.map(ilce => <option key={ilce.id} value={ilce.id}>{ilce.ad}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={label}>Günlük Ders Saati</label>
            <input style={input} type="number" min={1} value={gunlukSaat} onChange={e => setGunlukSaat(e.target.value)} />
          </div>
          <div>
            <label style={label}>Saatlik Ücret (₺)</label>
            <input style={input} type="number" min={0} step="0.01" value={saatUcreti} onChange={e => setSaatUcreti(e.target.value)} />
          </div>
        </div>

        {hata && <div style={{ color: 'var(--danger)', fontSize: 12, margin: '4px 0 10px', textAlign: 'center' }}>{hata}</div>}

        <button type="submit" disabled={kaydediliyor} style={btn}>
          {kaydediliyor ? <Loader2 size={16} className="animate-spin" /> : null}
          {kaydediliyor ? 'Oluşturuluyor…' : 'Denemeyi Başlat'}
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: 11, color: 'var(--text3)' }}>
          <span>{user?.email}</span>
          <button type="button" onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 11 }}>
            <LogOut size={12} /> Çıkış Yap
          </button>
        </div>
      </form>
    </div>
  )
}

const wrap: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--bg)', padding: '20px 16px', fontFamily: 'var(--font-sans)',
}
const card: React.CSSProperties = {
  width: '100%', maxWidth: 440, background: 'var(--surface)', borderRadius: 20, padding: 24,
  border: '1px solid var(--border)', boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
  display: 'flex', flexDirection: 'column',
}
const iconBox: React.CSSProperties = {
  width: 48, height: 48, background: 'var(--accent-lighter)', borderRadius: 16,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  border: '1px solid var(--accent-light)',
}
const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--text2)', margin: '0 0 4px', display: 'block' }
const input: React.CSSProperties = {
  width: '100%', height: 40, padding: '0 12px', borderRadius: 10, border: '1px solid var(--border)',
  background: 'var(--bg)', color: 'var(--text)', fontSize: 13, marginBottom: 12, boxSizing: 'border-box',
}
const btn: React.CSSProperties = {
  height: 44, borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff',
  fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center',
  justifyContent: 'center', gap: 8, marginTop: 4,
}
