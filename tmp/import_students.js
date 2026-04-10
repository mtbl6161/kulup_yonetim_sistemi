const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// .env.local dosyasından URL ve KEY'İ manuel oku (dotenv yüklü olmayabilir)
const env = fs.readFileSync('.env.local', 'utf8');
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key)).split('=')[1].trim();

const supabase = createClient(
  getEnv('NEXT_PUBLIC_SUPABASE_URL'),
  getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
);

const students = [
  { ad: 'DEFNE', soyad: 'DAL', sinif: '3/A', ogretmen: 'PINAR ŞAHİN' },
  { ad: 'DEREN', soyad: 'YAVUZ', sinif: '3/A', ogretmen: 'PINAR ŞAHİN' },
  { ad: 'ELA', soyad: 'EREN', sinif: '3/A', ogretmen: 'PINAR ŞAHİN' },
  { ad: 'ELISA', soyad: 'BULUR', sinif: '3/A', ogretmen: 'PINAR ŞAHİN' },
  { ad: 'ELİZ ADA', soyad: 'ÇİRKİN', sinif: '3/A', ogretmen: 'PINAR ŞAHİN' },
  { ad: 'EZGİ', soyad: 'UĞUR', sinif: '3/A', ogretmen: 'PINAR ŞAHİN' },
  { ad: 'GÜNEŞ', soyad: 'DALGIÇ', sinif: '3/A', ogretmen: 'PINAR ŞAHİN' },
  { ad: 'HAMZA', soyad: 'ÇEVİREN', sinif: '3/A', ogretmen: 'PINAR ŞAHİN' },
  { ad: 'MERİH ALPARSLAN', soyad: 'VIZVIZ', sinif: '3/A', ogretmen: 'PINAR ŞAHİN' },
  { ad: 'ÖMER KARAN', soyad: 'ÜN', sinif: '3/A', ogretmen: 'PINAR ŞAHİN' },
  { ad: 'PAMİR', soyad: 'AKSOY', sinif: '3/A', ogretmen: 'PINAR ŞAHİN' },
  { ad: 'ZEYNEP ECE', soyad: 'AYDIN', sinif: '3/A', ogretmen: 'PINAR ŞAHİN' }
];

async function importData() {
  console.log('🔄 Aktarım başlıyor...');
  const { data, error } = await supabase.from('ogrenciler').insert(students);
  if (error) {
    console.error('❌ Hata:', error.message);
  } else {
    console.log('✅ 12 öğrenci başarıyla eklendi!');
  }
}

importData();
