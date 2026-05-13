import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutLink } from '@/lib/lemonsqueezy'

export async function POST(req: NextRequest) {
  try {
    const { okulId, variantId, interval } = await req.json()
    
    if (!okulId || !variantId) {
      return NextResponse.json({ error: 'Eksik bilgiler' }, { status: 400 })
    }

    const url = await createCheckoutLink(0, okulId, variantId, interval)
    
    if (!url) {
      return NextResponse.json({ error: 'Lemon Squeezy bağlantısı oluşturulamadı' }, { status: 500 })
    }

    return NextResponse.json({ url })
  } catch (error: any) {
    console.error('Checkout Hatası:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
