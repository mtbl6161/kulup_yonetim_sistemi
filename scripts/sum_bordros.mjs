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

// Helpers from lib/hesaplama.ts
function isBaskan(gorev) {
  const g = (gorev || '').toLowerCase()
  return (g.includes('başkan') || g.includes('baskan') || g.includes('müdür')) &&
    !g.includes('yardımcı') && !g.includes('yardimci') && !g.includes('yrd')
}
function isBaskanYrd(gorev) {
  const g = (gorev || '').toLowerCase()
  return g.includes('yardımcı') || g.includes('yardimci') || g.includes('yrd')
}
function isMuhasebe(gorev) {
  const g = (gorev || '').toLowerCase()
  return g.includes('muhasebe') || g.includes('memur') || g.includes('yazışma')
}
function isTemizlik(gorev) {
  const g = (gorev || '').toLowerCase()
  return g.includes('temizlik') || g.includes('hizmet') || g.includes('bakım')
}
function isDenetim(gorev) {
  return (gorev || '').toLowerCase().includes('denetim')
}
function isOgretmen(gorev) {
  const g = (gorev || '').toLowerCase()
  return g.includes('öğretmen') || g.includes('ogretmen') || g.includes('usta')
}

async function run() {
  const bordro = await get('bordro?okul_id=eq.9&ay=eq.5&yil=eq.2026&select=*,personel(ad,gorev)')
  
  const groups = {
    baskan: { count: 0, brut: 0, net: 0, sgk_isveren: 0 },
    baskan_yrd: { count: 0, brut: 0, net: 0, sgk_isveren: 0 },
    ogretmen: { count: 0, brut: 0, net: 0, sgk_isveren: 0 },
    muhasebe: { count: 0, brut: 0, net: 0, sgk_isveren: 0 },
    temizlik: { count: 0, brut: 0, net: 0, sgk_isveren: 0 },
    denetim: { count: 0, brut: 0, net: 0, sgk_isveren: 0 },
    other: { count: 0, brut: 0, net: 0, sgk_isveren: 0 },
  }

  for (const b of bordro) {
    const gorev = b.personel?.gorev
    let group = 'other'
    if (isBaskan(gorev)) group = 'baskan'
    else if (isBaskanYrd(gorev)) group = 'baskan_yrd'
    else if (isOgretmen(gorev)) group = 'ogretmen'
    else if (isMuhasebe(gorev)) group = 'muhasebe'
    else if (isTemizlik(gorev)) group = 'temizlik'
    else if (isDenetim(gorev)) group = 'denetim'

    groups[group].count++
    groups[group].brut += Number(b.brut)
    groups[group].net += Number(b.net)
    groups[group].sgk_isveren += Number(b.sgk_isveren)
  }

  console.log('=== BORDRO GRUPLARI VE TOPLAMLARI (okul_id = 9, Mayıs 2026) ===')
  console.log(JSON.stringify(groups, null, 2))
}

run()
