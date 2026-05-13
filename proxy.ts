import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return response
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  const { pathname } = request.nextUrl

  if (pathname.startsWith('/_next') || pathname.includes('.') || pathname.startsWith('/api')) {
    return response
  }

  if (request.method === 'POST') {
    return response
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    const isAuthPage     = pathname === '/login' || pathname === '/signup'
    const isPaymentPage  = pathname === '/odeme-yap' || pathname === '/abonelik-yenile'
    const isPublicPage   = isAuthPage
                        || pathname === '/reset-password'
                        || pathname === '/bakim'
                        || pathname.startsWith('/tanitim')
                        || pathname === '/fiyatlandirma'
                        || isPaymentPage

    // 1. BAKIM MODU KONTROLÜ
    if (!isPublicPage && pathname !== '/favicon.ico') {
      const { data: setting } = await supabase
        .from('sistem_ayarlari')
        .select('deger')
        .eq('anahtar', 'bakim_modu')
        .single()

      if (setting?.deger?.aktif === true) {
        let isSuperAdmin = false
        if (user) {
          const { data: p } = await supabase.from('profiller').select('rol').eq('id', user.id).single()
          isSuperAdmin = p?.rol === 'super_admin'
        }
        if (!isSuperAdmin) {
          return NextResponse.redirect(new URL('/bakim', request.url))
        }
      }
    }

    // 2. GİRİŞ YAPMAMIŞ → LOGIN
    if (!user && !isPublicPage) {
      if (pathname === '/') {
        return NextResponse.redirect(new URL('/tanitim', request.url))
      }
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // 3. GİRİŞ YAPMIŞ + AUTH SAYFASINDA → ANA SAYFA
    if (user && isAuthPage) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // 4. ROL & LİSANS KONTROLÜ
    if (user && pathname !== '/reset-password' && !isPaymentPage) {
      const { data: profil } = await supabase
        .from('profiller')
        .select('rol, okul_id')
        .eq('id', user.id)
        .single()

      const rol = profil?.rol

      if (rol === 'super_admin' && !pathname.startsWith('/yonetim')) {
        return NextResponse.redirect(new URL('/yonetim', request.url))
      }
      if (rol !== 'super_admin' && pathname.startsWith('/yonetim')) {
        return NextResponse.redirect(new URL('/', request.url))
      }

      if (rol === 'denetim_yetkilisi' && !pathname.startsWith('/denetim')) {
        return NextResponse.redirect(new URL('/denetim', request.url))
      }
      if (rol !== 'denetim_yetkilisi' && pathname.startsWith('/denetim')) {
        return NextResponse.redirect(new URL('/', request.url))
      }

      if (rol !== 'super_admin' && rol !== 'denetim_yetkilisi') {
        const okulId = profil?.okul_id
        if (!okulId) return NextResponse.redirect(new URL('/odeme-yap', request.url))

        const { data: okul } = await supabase
          .from('okullar')
          .select('odeme_durumu, lisans_bitis')
          .eq('id', okulId)
          .single()

        const isDeneme = okul?.odeme_durumu === 'deneme' &&
                         okul?.lisans_bitis != null &&
                         new Date(okul.lisans_bitis) > new Date()

        const isAktif = okul?.odeme_durumu === 'aktif' &&
                        okul?.lisans_bitis != null &&
                        new Date(okul.lisans_bitis) > new Date()

        const lisansGecerli = isDeneme || isAktif

        if (lisansGecerli && isPaymentPage) {
          return NextResponse.redirect(new URL('/', request.url))
        }

        if (!lisansGecerli) {
          const dahahaOnceAktifti = okul?.lisans_bitis != null
          if (isPaymentPage) return response
          return NextResponse.redirect(new URL(
            dahahaOnceAktifti ? '/abonelik-yenile' : '/odeme-yap',
            request.url
          ))
        }
      }
    }
  } catch (e) {
    console.error('[Proxy Error]:', e)
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
