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
const supabaseAnonKey = config.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkData() {
  const { data: per, error: e1 } = await supabase.from('personel').select('id, ad, gorev, sgk_li, vergi_istisnasi, yillik_matrah').order('id')
  if (e1) console.error(e1)
  else console.log('PERSONEL:', JSON.stringify(per, null, 2))
}

checkData()
