import 'server-only'
import { Resend } from 'resend'

// Tüm sistem e-postaları Resend üzerinden gider (RESEND_API_KEY, RESEND_FROM).
const GONDEREN = () => process.env.RESEND_FROM || 'Klüp360 <destek@klup360.com>'

export interface Eposta {
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
  attachments?: { filename: string; content: string }[]
}

/** E-postayı gönderir; başarısız olursa hata fırlatır. Gönderim kimliğini döner. */
export async function epostaGonder(e: Eposta): Promise<string | undefined> {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY tanımlı değil')
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { data, error } = await resend.emails.send({ from: GONDEREN(), ...e })
  if (error) throw new Error(error.message)
  return data?.id
}

/** Kullanıcıdan gelen metni e-posta HTML'ine güvenle yerleştirir. */
export function htmlKacis(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}
