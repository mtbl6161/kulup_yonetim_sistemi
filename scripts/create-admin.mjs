/**
 * İlk yönetici hesabını oluşturmak için tek seferlik script.
 * Kullanım: node scripts/create-admin.mjs
 */

const SUPABASE_URL = 'https://wmskmfisbenlrpcgvjlq.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('Hata: SUPABASE_SERVICE_ROLE_KEY ortam değişkeni eksik.')
  console.error('Şu şekilde çalıştırın:')
  console.error('  SUPABASE_SERVICE_ROLE_KEY="..." node scripts/create-admin.mjs')
  process.exit(1)
}

const email    = process.argv[2]
const password = process.argv[3]
const kurum    = process.argv[4] || 'Yönetici'

if (!email || !password) {
  console.error('Kullanım: node scripts/create-admin.mjs <email> <şifre> [kurum-adı]')
  console.error('Örnek:    node scripts/create-admin.mjs admin@ornek.com Sifre123 "Merkez Yönetim"')
  process.exit(1)
}

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'apikey': SERVICE_ROLE_KEY,
}

// 1. Auth kullanıcısı oluştur
console.log(`\n→ Kullanıcı oluşturuluyor: ${email}`)
const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ email, password, email_confirm: true }),
})
const authData = await authRes.json()

if (!authRes.ok) {
  console.error('✗ Kullanıcı oluşturulamadı:', authData.message || JSON.stringify(authData))
  process.exit(1)
}
const userId = authData.id
console.log(`✓ Kullanıcı oluşturuldu. ID: ${userId}`)

// 2. Okul kaydı oluştur
console.log(`→ Okul kaydı oluşturuluyor: "${kurum}"`)
const okulRes = await fetch(`${SUPABASE_URL}/rest/v1/okullar`, {
  method: 'POST',
  headers: { ...headers, 'Prefer': 'return=representation' },
  body: JSON.stringify({ ad: kurum }),
})
const okulData = await okulRes.json()

if (!okulRes.ok) {
  console.error('✗ Okul kaydı oluşturulamadı:', JSON.stringify(okulData))
  process.exit(1)
}
const okulId = okulData[0]?.id
console.log(`✓ Okul kaydı oluşturuldu. ID: ${okulId}`)

// 3. Profil oluştur
console.log(`→ Profil oluşturuluyor...`)
const profilRes = await fetch(`${SUPABASE_URL}/rest/v1/profiller`, {
  method: 'POST',
  headers: { ...headers, 'Prefer': 'return=minimal' },
  body: JSON.stringify({ id: userId, okul_id: okulId, rol: 'admin' }),
})

if (!profilRes.ok) {
  const profilData = await profilRes.json()
  console.error('✗ Profil oluşturulamadı:', JSON.stringify(profilData))
  process.exit(1)
}
console.log(`✓ Profil oluşturuldu.`)

console.log(`\n✅ Yönetici hesabı hazır!`)
console.log(`   E-posta : ${email}`)
console.log(`   Kurum   : ${kurum}`)
console.log(`   Artık /login sayfasından giriş yapabilirsiniz.\n`)
