import { NextResponse, type NextRequest } from 'next/server'
import { DEMO_CEREZ } from '@/lib/demo/mod'

// "Demoyu deneyin": sekmeyi demo moduna alır ve panele yönlendirir.
// Sunucuda hiçbir kayıt ya da hesap oluşturulmaz; çerez yalnızca "bu tarayıcı demo modunda" der.
// Panel bu çerezi görünce verisini tarayıcı belleğindeki kurgusal okuldan alır (lib/supabase.ts).
export function GET(request: NextRequest) {
  const yanit = NextResponse.redirect(new URL('/', request.url), 303)
  yanit.cookies.set(DEMO_CEREZ, '1', {
    path: '/',
    sameSite: 'lax',
    // İstemci kodu çerezi okuyarak demo istemcisini seçer
    httpOnly: false,
    secure: request.nextUrl.protocol === 'https:',
    // maxAge verilmez: tarayıcı kapanınca biten oturum çerezi
  })
  yanit.headers.set('Cache-Control', 'no-store')
  yanit.headers.set('X-Robots-Tag', 'noindex')
  return yanit
}
