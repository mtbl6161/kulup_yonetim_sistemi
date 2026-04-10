// ============================================================
// MEB Çocuk Kulüpleri Yönetim Sistemi - Tip Tanımları
// Supabase gerçek şemasına göre hizalanmış
// ============================================================

export interface VergiDilimi {
  ust: number
  oran: number
}

export interface Ayarlar {
  id: number
  kurum_adi: string
  mudur_adi: string
  adres: string
  tel: string
  email: string
  vergi_dairesi: string
  vergi_no: string
  sgk_no: string
  ssk_sube?: string
  mudur_unvani?: string
  imza_url?: string
  gosterge: number
  katsayi: number
  saat_ucreti: number
  gunluk_saat: number
  yemek: boolean
  asgari_ucret: number
  sgk_kisi_pay: number
  sgk_issizlik_kisi: number
  sgk_kisa_vadeli: number
  sgk_malulluk: number
  sgk_saglik: number
  sgk_issizlik_isveren: number
  damga_vergi_orani: number
  vergi_dilimleri: VergiDilimi[]
  // Tahakkuk dağılımları (migration ile eklendi)
  dagitim_temel_gider?: number
  dagitim_ogretmen?: number
  dagitim_baskan?: number
  dagitim_baskan_yrd?: number
  dagitim_muhasebe?: number
  dagitim_temizlik?: number
  dagitim_denetim?: number
  tavan_katsayi?: number
  gv_istisna_sabiti?: number
  dv_istisna_sabiti?: number
  duzenleyen_adi?: string
  duzenleyen_unvani?: string
  updated_at?: string
}

export type GorevKategorisi =
  | 'Öğretmen'
  | 'Usta Öğretici'
  | 'Koordinatör Öğretmen'
  | 'Muhasebe Personeli'
  | 'Temizlik Personeli'
  | 'Başkan'
  | 'Başkan Yrd.'
  | 'Denetim Yetkilisi'

export interface Ogrenci {
  id: number
  ad: string
  soyad: string
  tc?: string
  sinif?: string
  ogretmen?: string
  kardes_indirimi: boolean
  anne_adi?: string
  anne_tel?: string
  ucretsiz_mi: boolean
  ucretsiz_nedeni?: string
  aktif?: boolean           // migration ile eklendi
  created_at?: string
}

export interface Personel {
  id: number
  ad: string
  tc?: string
  sgk_no?: string
  gorev: string             // DB kolonunun gerçek adı
  kadro_durumu?: string
  sgk_li: boolean
  vergi_istisnasi: boolean
  iban?: string
  yillik_matrah: number
  meslek_kodu?: string
  kalan_gv_istisnasi?: number
  kalan_dv_istisnasi?: number
  personel_turu?: string
  aktif?: boolean           // migration ile eklendi
  created_at?: string
}

export interface Puantaj {
  id: number
  personel_id: number
  tarih: string
  saat: number              // DB kolonunun gerçek adı
  etkinlik_saati?: number   // migration ile eklendi (saat'in kopyası)
  ay?: number               // migration ile eklendi
  yil?: number              // migration ile eklendi
}

export interface Tahsilat {
  id: number
  ogrenci_id: number
  tarih: string
  tutar: number
  ay: number
  yil: number
  dekont_no?: string
  aciklama?: string
  created_at?: string
  ogrenci?: Ogrenci
}

export interface Tahakkuk {
  id: number
  ay: number
  yil: number
  toplam_gelir: number
  dagilim_json?: TahakkukDagilim
  hesaplandi_mi: boolean
  created_at?: string
}

export interface TahakkukDagilim {
  temel_gider: number
  ogretmen_havuzu: number
  baskan: number
  baskan_yrd: number
  muhasebe: number
  temizlik: number
  denetim: number
  ogretmen_paylari?: { personel_id: number; ad: string; saat: number; pay: number }[]
}

export interface Bordro {
  id: number
  personel_id: number
  ay: number
  yil: number
  toplam_saat: number
  brut: number
  gv_matrah?: number        // migration ile eklendi
  gv_oran: number
  gv_tutar: number          // DB kolonunun gerçek adı (gv değil)
  damga_tutar: number       // DB kolonunun gerçek adı (dv değil)
  sgk_kisi: number
  sgk_issizlik_kisi: number // DB kolonunun gerçek adı
  sgk_issizlik?: number     // migration ile eklendi
  sgk_isveren: number
  toplam_kesinti: number
  net: number
  odendi: boolean
  gv_istisna_tutari?: number
  dv_istisna_tutari?: number
  created_at?: string
  personel?: Personel
}

export interface Gider {
  id: number
  tarih: string
  kategori: string
  tutar: number
  aciklama?: string
  dekont_no?: string
  ay?: number
  yil?: number
  created_at?: string
}

export interface HesapHareketi {
  id: number
  tarih: string
  tutar: number
  tur: 'gelir' | 'gider'
  aciklama?: string
  dekont_no?: string
  kaynak?: string           // migration ile eklendi
  kaynak_id?: number        // migration ile eklendi
  bakiye?: number           // migration ile eklendi
  ay?: number               // migration ile eklendi
  yil?: number              // migration ile eklendi
  created_at?: string
}

export interface Yoklama {
  id: number
  ogrenci_id: number
  tarih: string
  durum: 'geldi' | 'gelmedi' | 'izinli' | 'belirsiz'
  ay?: number               // migration ile eklendi
  yil?: number              // migration ile eklendi
  ogrenci?: Ogrenci
}

export interface DersProgrami {
  id: number
  kulup_adi: string
  sinif_id?: number
  ogretmen_id?: number
  gun: number
  seans: 'sabah' | 'ogle'
  saat?: string
  etkinlik_saati: number
  ders_no?: number
  ay?: number
  yil?: number
  created_at?: string
  ogretmen?: Personel
}

export interface SinifDefteri {
  id: number
  kulup_adi: string
  sinif_id?: number
  ogretmen_id?: number
  gun: number
  ay: number
  yil: number
  seans: 'sabah' | 'ogle'
  ders_no?: number
  etkinlik_saati: number
  durum: 'geldi' | 'gelmedi'
  created_at?: string
  ogretmen?: Personel
}

export interface Tatil {
  id: number
  ad: string
  baslangic_tarihi: string
  bitis_tarihi: string
  tip: string
  created_at?: string
}

export interface Sinif {
  id: number
  ad: string
  ogretmen?: string
  kapasite?: number
  aylik_ucret?: number
  yas_grubu?: string
  aciklama?: string
  aktif: boolean
  created_at?: string
}

// Hesaplama sonuçları
export interface BordroSonuc {
  brut: number
  sgk_kisi: number
  sgk_issizlik: number
  gv_matrah: number
  gv_oran: number
  gv_hesaplanan: number
  gv_istisna: number
  gv: number
  dv_hesaplanan: number
  dv_istisna: number
  dv: number
  toplam_kesinti: number
  net: number
  sgk_isveren: number
  sgk_detay_kisa: number
  sgk_detay_malulluk: number
  sgk_detay_saglik: number
  sgk_detay_issizlik: number
  sgk_detay_toplam: number
}

export interface OdemeOzet {
  ogrenci: Ogrenci
  gereken: number
  odenen: number
  kalan: number
  durum: 'tam' | 'kismi' | 'odenmedi' | 'ucretsiz'
}
export interface BordroSatir {
  personel: Personel
  toplamSaat: number
  saatUcreti: number
  hamBrut: number
  sonuc: BordroSonuc
  odendi: boolean
  bordroId?: number
}
