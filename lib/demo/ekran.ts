// Demoda gerçek bir yan etkisi olan işlemlerin (e-posta, ödeme) yerine gösterilen açıklamalar.
import { onayla, uyari } from '../diyalog'
import { demoDosyaAdi } from './mod'

/** E-posta gönderilmez; gerçek hesapta neyin gideceği anlatılır ve ek (PDF) istenirse indirilir. */
export async function demoEpostaGoster(o: { alici?: string; adet?: number; ek: string; pdf?: () => Promise<Blob | null> }) {
  const kime = o.adet && o.adet > 1
    ? `e-posta adresi kayıtlı ${o.adet} kişiye ayrı ayrı`
    : `${o.alici} adresine`
  const mesaj = `Demoda e-posta gönderilmez. Gerçek hesabınızda bu işlem ${kime} gider; ekinde "${o.ek}" bulunur.`
  if (!o.pdf) return uyari(mesaj, 'Demo: e-posta gönderilmedi')
  const indir = await onayla(mesaj, { baslik: 'Demo: e-posta gönderilmedi', onayMetni: 'Eki indir', iptalMetni: 'Kapat' })
  if (!indir) return
  const blob = await o.pdf()
  if (!blob) return
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = demoDosyaAdi(o.ek.endsWith('.pdf') ? o.ek : `${o.ek}.pdf`)
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

/** base64 PDF → Blob */
export function base64Blob(b64: string, tur = 'application/pdf'): Blob {
  const ikili = atob(b64)
  const bayt = new Uint8Array(ikili.length)
  for (let i = 0; i < ikili.length; i++) bayt[i] = ikili.charCodeAt(i)
  return new Blob([bayt], { type: tur })
}

export const DEMO_KAPALI_MESAJI = 'Bu işlem demoda kapalıdır. 15 gün ücretsiz deneme hesabıyla kullanabilirsiniz.'
