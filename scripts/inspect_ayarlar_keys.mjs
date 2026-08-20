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

async function run() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/ayarlar?okul_id=eq.9&select=*`, { headers })
  const data = await res.json()
  if (data && data[0]) {
    console.log('=== ALL KEYS AND VALUES IN AYARLAR ===')
    for (const [key, val] of Object.entries(data[0])) {
      console.log(`${key}: ${JSON.stringify(val)}`)
    }
  } else {
    console.log('No data found in ayarlar')
  }
}

run()
