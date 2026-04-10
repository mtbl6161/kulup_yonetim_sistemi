import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf8')
const lines = env.split('\n')
const config: Record<string, string> = {}
lines.forEach(line => {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) config[key.trim()] = rest.join('=').trim()
})

const supabaseUrl = config.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = config.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function fix() {
  // Fix 1: Update sgk_li for both 'sgk' and 'sgkli' strings
  console.log('Syncing SGK status...')
  const { error: e1 } = await supabase
    .from('personel')
    .update({ sgk_li: true })
    .in('personel_turu', ['sgk', 'sgkli'])
  if (e1) console.error(e1)

  // Fix 2: Ensure all Usta Ogreticiler are SGK'li
  const { error: e2 } = await supabase
    .from('personel')
    .update({ sgk_li: true })
    .eq('gorev', 'Usta Öğretici')
  if (e2) console.error(e2)

  // Fix 3: Ensure Teachers are NOT SGK'li (unless specific)
  const { error: e3 } = await supabase
    .from('personel')
    .update({ sgk_li: false })
    .in('gorev', ['Öğretmen', 'Koordinatör Öğretmen', 'Başkan'])
  if (e3) console.error(e3)

  console.log('Done.')
}

fix()
