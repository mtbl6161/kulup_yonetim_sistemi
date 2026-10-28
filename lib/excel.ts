// Ekrandaki listeyi Excel dosyası olarak indirir. xlsx kütüphanesi yalnızca tıklanınca yüklenir.
export type ExcelHucre = string | number | null | undefined

export async function excelIndir(dosyaAdi: string, sayfaAdi: string, basliklar: string[], satirlar: ExcelHucre[][]) {
  const XLSX = await import('xlsx')
  const sayfa = XLSX.utils.aoa_to_sheet([basliklar, ...satirlar.map(r => r.map(h => h ?? ''))])
  // Sütun genişliği: başlık ve en uzun hücreye göre (en fazla 48 karakter)
  sayfa['!cols'] = basliklar.map((b, i) => ({ wch: Math.min(48, Math.max(b.length, ...satirlar.map(r => String(r[i] ?? '').length)) + 2) }))
  const kitap = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(kitap, sayfa, sayfaAdi.slice(0, 31))
  XLSX.writeFile(kitap, dosyaAdi.endsWith('.xlsx') ? dosyaAdi : `${dosyaAdi}.xlsx`)
}

/** Dosya adında kullanılacak bugünün tarihi (2026-10-28) */
export const bugunEtiketi = () => new Date().toISOString().slice(0, 10)
