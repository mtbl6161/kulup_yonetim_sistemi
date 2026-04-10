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

async function syncExemptions() {
  console.log('Syncing Vergi Istisnasi status...')
  
  // Rule: Everyone is exempt except ASLI BELLİLER
  // Step 1: Set everyone to true
  const { error: e1 } = await supabase
    .from('personel')
    .update({ vergi_istisnasi: true })
    .neq('ad', 'ASLI BELLİLER')
  if (e1) console.error(e1)

  // Step 2: Set ASLI BELLİLER to false
  const { error: e2 } = await supabase
    .from('personel')
    .update({ vergi_istisnasi: false })
    .eq('ad', 'ASLI BELLİLER')
  if (e2) console.error(e2)

  console.log('Done.')
}

syncExemptions()
