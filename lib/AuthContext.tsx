'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { User, Session } from '@supabase/supabase-js'
import { useRouter, usePathname } from 'next/navigation'
import { Profil, Okul, Il } from './types'

interface AuthContextType {
  user: User | null
  session: Session | null
  profil: Profil | null
  okul: Okul | null
  il: Il | null
  loading: boolean
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profil, setProfil] = useState<Profil | null>(null)
  const [okul, setOkul] = useState<Okul | null>(null)
  const [il, setIl] = useState<Il | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const refresh = async () => {
    if (user) await loadProfile(user.id)
  }

  // Realtime listener for school updates
  useEffect(() => {
    if (!okul?.id) return
    const channel = supabase
      .channel(`okul_status_${okul.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'okullar', filter: `id=eq.${okul.id}` },
        (payload) => {
          setOkul(payload.new as Okul)
        }
      )
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [okul?.id])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else {
        setProfil(null)
        setOkul(null)
        setIl(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Lisans ve Ödeme Durumu Kontrolü — admin kullanıcılar için
  useEffect(() => {
    if (loading || !user || !profil) return
    if (profil.rol === 'super_admin' || profil.rol === 'denetim_yetkilisi') return

    const publicPages = ['/login', '/signup', '/reset-password']
    if (publicPages.includes(pathname)) return

    if (!okul) return

    const lisansBitisTarihi = okul.lisans_bitis ? new Date(okul.lisans_bitis) : null
    const bugun = new Date()
    
    // 1. İzin Verilen Durumlar
    const denemeSuresiVar = okul.odeme_durumu === 'deneme' && lisansBitisTarihi && lisansBitisTarihi > bugun
    const abonelikAktif = okul.odeme_durumu === 'aktif' && (!lisansBitisTarihi || lisansBitisTarihi > bugun)

    if (denemeSuresiVar || abonelikAktif) {
      // Aktif aboneliği olanların da ödeme/yenileme sayfasını görmesine izin ver (erken yenileme vb. için)
      return 
    }

    // 2. Kısıtlanan Durumlar
    const kilitli = ['borclu', 'kapali', 'pasif'].includes(okul.odeme_durumu || '')
    const suresiDolmus = lisansBitisTarihi ? lisansBitisTarihi < bugun : false

    const isPaymentPage = ['/odeme-yap', '/abonelik-yenile'].includes(pathname)

    if (kilitli || suresiDolmus) {
      if (isPaymentPage) return // Zaten doğru yerdeler
      const dahahaOnceAktifti = okul.lisans_bitis != null
      router.replace(dahahaOnceAktifti ? '/abonelik-yenile' : '/odeme-yap')
    } else {
      // Lisans geçerliyse ama ödeme sayfasındaysa dışarı at
      if (isPaymentPage) {
        router.replace('/')
      }
    }
  }, [user, profil, okul, loading, pathname, router])

  async function loadProfile(uid: string) {
    try {
      const { data: pData, error: pErr } = await supabase
        .from('profiller')
        .select('*')
        .eq('id', uid)
        .single()

      if (pErr) {
        console.warn('Profil bulunamadı:', pErr)
        setLoading(false)
        return
      }
      setProfil(pData)

      supabase
        .from('profiller')
        .update({ son_giris: new Date().toISOString() })
        .eq('id', uid)
        .then(({ error }) => {
          if (error) console.error('Son giriş güncelleme hatası:', error)
        })

      if (pData?.rol === 'denetim_yetkilisi' && pData?.il_id) {
        // Denetim yetkilisi: il bilgisini yükle
        const { data: ilData } = await supabase
          .from('iller')
          .select('*')
          .eq('id', pData.il_id)
          .single()
        setIl(ilData)
      } else if (pData?.okul_id) {
        // Admin: okul bilgisini yükle
        const { data: oData } = await supabase
          .from('okullar')
          .select('*')
          .eq('id', pData.okul_id)
          .single()
        setOkul(oData)
      }
    } catch (err) {
      console.error('Profil yükleme hatası:', err)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, session, profil, okul, il, loading, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
