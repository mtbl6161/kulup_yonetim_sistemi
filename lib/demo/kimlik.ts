// Demo istemcisinin kurgusal oturumu. Ağa hiç gitmez, imzasızdır; yalnızca tarayıcı belleğindeki demo istemcisinde kullanılır.
import { DEMO_KULLANICI_ID, DEMO_OKUL_ID } from './mod'

function b64url(metin: string) {
  const bayt = new TextEncoder().encode(metin)
  let s = ''
  for (const b of bayt) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function demoKullanicisi() {
  const t = '2026-01-01T00:00:00.000Z'
  return {
    id: DEMO_KULLANICI_ID, aud: 'authenticated', role: 'authenticated', email: 'demo@example.com',
    email_confirmed_at: t, phone: '', confirmed_at: t, last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: 'demo', providers: ['demo'], demo: true },
    user_metadata: { okul_id: DEMO_OKUL_ID }, identities: [], created_at: t, updated_at: t, is_anonymous: false,
  }
}

/** Ağa hiç gitmeyen, imzasız kurgusal oturum. Yalnızca bellekteki demo istemcisinde kullanılır. */
export function demoOturumu() {
  const simdi = Math.floor(Date.now() / 1000)
  const sure = 60 * 60 * 24 * 365
  const kullanici = demoKullanicisi()
  const jwt = [
    b64url(JSON.stringify({ alg: 'none', typ: 'JWT' })),
    b64url(JSON.stringify({ sub: kullanici.id, role: 'authenticated', aud: 'authenticated', email: kullanici.email, app_metadata: kullanici.app_metadata, iat: simdi, exp: simdi + sure })),
    'demo',
  ].join('.')
  return { access_token: jwt, token_type: 'bearer', expires_in: sure, expires_at: simdi + sure, refresh_token: 'demo-yenileme', user: kullanici }
}
