// Bordro tablosuna test kaydı insert et - hangi sütunlar var görelim
const SUPABASE_URL = 'https://wmskmfisbenlrpcgvjlq.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtc2ttZmlzYmVubHJwY2d2amxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NjI0MTAsImV4cCI6MjA5MDUzODQxMH0.kTLRWHd6TV5S8leeE-C-RpzUtiiCKKv8fRxDDkhIeqo'

// Tüm olası sütunları dene
const testRecord = {
  personel_id: 1,
  ay: 1, yil: 2099,   // test yili
  toplam_saat: 0, brut: 0,
  gv_oran: 0, gv_tutar: 0, damga_tutar: 0,
  sgk_kisi: 0, sgk_issizlik_kisi: 0, sgk_isveren: 0,
  toplam_kesinti: 0, net: 0, odendi: false,
}

async function check() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/bordro`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(testRecord)
  })
  const data = await res.json()
  if (res.ok && Array.isArray(data) && data.length > 0) {
    console.log('✅ Kayıt başarılı! Sütunlar:', Object.keys(data[0]).join(', '))
    // Test kaydını sil
    const del = await fetch(`${SUPABASE_URL}/rest/v1/bordro?yil=eq.2099`, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    })
    console.log('Test kaydı silindi:', del.status)
  } else {
    console.log('❌ Hata:', JSON.stringify(data))
  }
}

check().catch(console.error)
