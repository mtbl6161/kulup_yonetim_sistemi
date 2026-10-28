import 'server-only'
import { createClient, type User } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

// API uçlarının ortak yetki yardımcıları. İstemci, oturum anahtarını
// "Authorization: Bearer <access_token>" başlığıyla gönderir.

/** RLS'yi atlayan sunucu istemcisi — yalnızca yetki doğrulandıktan sonra kullanın. */
export function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export interface Cagiran {
  user: { id: string; email?: string }
  rol: string | null
  okulId: number | null
}

/** İsteği yapan oturumlu kullanıcı ve profili; oturum yoksa null. */
export async function cagiraniGetir(request: NextRequest): Promise<Cagiran | null> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const admin = adminClient()
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return null
  const { data: profil } = await admin.from('profiller').select('rol, okul_id').eq('id', user.id).maybeSingle()
  return { user: { id: user.id, email: user.email }, rol: profil?.rol ?? null, okulId: profil?.okul_id ?? null }
}

/** Yalnızca süper yönetici ise kullanıcıyı döner. */
export async function getCallerIfSuperAdmin(request: NextRequest) {
  const c = await cagiraniGetir(request)
  return c?.rol === 'super_admin' ? c.user : null
}

/** Tüm giriş hesapları (Supabase listUsers sayfalıdır; varsayılan 50 kayıt döner). */
export async function tumKullanicilar(admin: ReturnType<typeof adminClient>): Promise<User[]> {
  const users: User[] = []
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    users.push(...data.users)
    if (data.users.length < 1000) return users
  }
}
