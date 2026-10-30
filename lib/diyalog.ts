// Tarayıcının alert()/confirm() pencereleri yerine uygulamanın kendi onay penceresi
// (components/GlobalDiyalog.tsx dinler, ClientLayout'ta bir kez yüklenir).
export const DIYALOG_OLAYI = 'klup360:diyalog'

export interface DiyalogIstegi {
  tur: 'uyari' | 'onay'
  baslik?: string
  mesaj: string
  onayMetni?: string
  iptalMetni?: string
  tehlikeli?: boolean
  sonuc: (evet: boolean) => void
}

function ac(i: Omit<DiyalogIstegi, 'sonuc'>): Promise<boolean> {
  return new Promise(sonuc => {
    if (typeof window === 'undefined') return sonuc(false)
    window.dispatchEvent(new CustomEvent<DiyalogIstegi>(DIYALOG_OLAYI, { detail: { ...i, sonuc } }))
  })
}

/** Bilgi / uyarı penceresi; "Tamam"a basılınca çözülür. */
export function uyari(mesaj: string, baslik = 'Bilgi'): Promise<void> {
  return ac({ tur: 'uyari', mesaj, baslik }).then(() => undefined)
}

/** Onay penceresi; kullanıcı onaylarsa true döner. */
export function onayla(mesaj: string, o: { baslik?: string; onayMetni?: string; iptalMetni?: string; tehlikeli?: boolean } = {}): Promise<boolean> {
  return ac({ tur: 'onay', mesaj, baslik: o.baslik ?? 'Emin misiniz?', onayMetni: o.onayMetni ?? 'Devam et', iptalMetni: o.iptalMetni, tehlikeli: o.tehlikeli ?? false })
}
