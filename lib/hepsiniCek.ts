/** Supabase tek sorguda en fazla 1000 satır döner; yıl boyu kayıtlar için sayfa sayfa çekilir */
export async function hepsiniCek<T>(sorgu: (bas: number, son: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const sonuc: T[] = []
  for (let bas = 0; ; bas += 1000) {
    const { data, error } = await sorgu(bas, bas + 999)
    if (error) throw new Error(error.message)
    sonuc.push(...(data || []))
    if (!data || data.length < 1000) return sonuc
  }
}
