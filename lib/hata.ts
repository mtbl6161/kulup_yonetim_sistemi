/** catch bloklarında yakalanan değerden okunabilir mesaj üretir (Error, Supabase hatası veya düz metin). */
export function hataMesaji(e: unknown, varsayilan = 'Bilinmeyen hata'): string {
  if (e instanceof Error) return e.message || varsayilan
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message) || varsayilan
  if (typeof e === 'string') return e || varsayilan
  return varsayilan
}

/** Supabase / Postgres hata kodu (ör. 23505), yoksa boş. */
export function hataKodu(e: unknown): string {
  return e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code ?? '') : ''
}
