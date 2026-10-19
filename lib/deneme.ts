// Ücretsiz deneme süresi — yeni kayıtlar, panelden açılan okullar ve
// süresi dolmuş denemelere verilen ek süre bu sabiti kullanır.
export const DENEME_GUN = 15

export function denemeBitisTarihi(gun: number = DENEME_GUN): Date {
  const d = new Date()
  d.setDate(d.getDate() + gun)
  return d
}
