// SGK aylık prim ve hizmet belgesi eksik gün nedeni kodları (e-Bildirge listesi; 14 numara kullanılmıyor)
export const EKSIK_GUN_NEDENLERI: { kod: string; ad: string }[] = [
  { kod: '01', ad: 'İstirahat' },
  { kod: '02', ad: 'Ücretsiz izin' },
  { kod: '03', ad: 'Disiplin cezası' },
  { kod: '04', ad: 'Gözaltına alınma' },
  { kod: '05', ad: 'Tutukluluk' },
  { kod: '06', ad: 'Kısmi istihdam' },
  { kod: '07', ad: 'Puantaj kayıtları' },
  { kod: '08', ad: 'Grev' },
  { kod: '09', ad: 'Lokavt' },
  { kod: '10', ad: 'Genel hayatı etkileyen olaylar' },
  { kod: '11', ad: 'Doğal afet' },
  { kod: '12', ad: 'Birden fazla' },
  { kod: '13', ad: 'Diğer nedenler' },
  { kod: '15', ad: 'Devamsızlık' },
  { kod: '16', ad: 'Fesih tarihinde çalışmamış' },
  { kod: '17', ad: 'Ev hizmetlerinde 30 günden az çalışma' },
  { kod: '18', ad: 'Kısa çalışma ödeneği' },
  { kod: '19', ad: 'Ücretsiz doğum izni' },
  { kod: '20', ad: 'Ücretsiz yol izni' },
  { kod: '21', ad: 'Diğer ücretsiz izin' },
  { kod: '22', ad: '5434 SK. ek 76, GM 192' },
  { kod: '23', ad: 'Yarım çalışma ödeneği' },
  { kod: '24', ad: 'Yarım çalışma ödeneği ve diğer nedenler' },
  { kod: '25', ad: 'Diğer belge/kanun türlerinden gün tamamlama' },
  { kod: '26', ad: 'Kısmi istihdama izin verilen yabancı uyruklu sigortalı' },
  { kod: '27', ad: 'Kısa çalışma ödeneği ve diğer nedenler' },
  { kod: '28', ad: 'Pandemi ücretsiz izin (4857 Geç. 10 Md.)' },
  { kod: '29', ad: 'Pandemi ücretsiz izin (4857 Geç. 10 Md.) ve diğer' },
]

export const eksikGunAdi = (kod: string | null | undefined) => EKSIK_GUN_NEDENLERI.find(n => n.kod === kod)?.ad ?? ''

/** SGK ayı 30 gün sayar: tam çalışan 30 gün bildirilir, eksik gün = 30 − prim günü. */
export function primGunu(toplamSaat: number) {
  return Math.min(30, Math.round(toplamSaat / 7.5)) || 1
}
export const eksikGunSayisi = (gun: number) => Math.max(0, 30 - gun)

export interface EksikGunKaydi { id?: number; personel_id: number; yil: number; ay: number; kod: string; aciklama: string | null }
