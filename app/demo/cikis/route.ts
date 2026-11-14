import { NextResponse, type NextRequest } from 'next/server'
import { DEMO_CEREZ } from '@/lib/demo/mod'

// Demodan çıkış: demo çerezini siler ve ziyaretçiyi tanıtıma ya da kayıt sayfasına götürür.
// Bellekteki örnek veri sayfa değişince kendiliğinden yok olur.
const IZINLI = ['/tanitim', '/signup?kaynak=demo']

export function GET(request: NextRequest) {
  const istenen = request.nextUrl.searchParams.get('sonra') || '/tanitim'
  // Açık yönlendirmeye izin verme: yalnızca bilinen site içi adresler
  const hedef = IZINLI.includes(istenen) ? istenen : '/tanitim'
  const yanit = NextResponse.redirect(new URL(hedef, request.url), 303)
  yanit.cookies.set(DEMO_CEREZ, '', { path: '/', maxAge: 0 })
  yanit.headers.set('Cache-Control', 'no-store')
  return yanit
}
