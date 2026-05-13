import 'server-only'
import { NextResponse } from 'next/server'

export function serverError(err: unknown, context?: string): NextResponse {
  const msg = err instanceof Error ? err.message : String(err)
  console.error(`[API Error]${context ? ` [${context}]` : ''}: ${msg}`)
  return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
}
