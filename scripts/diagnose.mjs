import fs from 'fs'
import path from 'path'

const envPath = path.resolve('.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
  if (match) {
    let value = match[2] || ''
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1)
    }
    env[match[1]] = value
  }
})

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'apikey': SERVICE_ROLE_KEY,
}

async function get(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers })
  if (!res.ok) {
    console.error(`Hata (${path}):`, await res.text())
    return []
  }
  return res.json()
}

async function run() {
  console.log('=== OKULLAR ===')
  const okullar = await get('okullar?select=*')
  console.log(JSON.stringify(okullar, null, 2))

  console.log('=== AYARLAR ===')
  const ayarlar = await get('ayarlar?select=*')
  console.log(JSON.stringify(ayarlar, null, 2))

  console.log('=== BORDRO (okul_id = 9, Mayıs 2026) ===')
  const bordro = await get('bordro?okul_id=eq.9&ay=eq.5&yil=eq.2026&select=*,personel(ad,gorev)')
  console.log(JSON.stringify(bordro, null, 2))
}

run()
