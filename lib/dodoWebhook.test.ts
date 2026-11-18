import { describe, expect, it } from 'vitest'
import { YENILEME_TOLERANSI_SAAT, dodoLisansBitisi, dodoWebhookIslemi, metadataOkulId } from './dodoWebhook'

const tolerans = YENILEME_TOLERANSI_SAAT * 3600_000

describe('dodoWebhookIslemi', () => {
  it('abonelik olayları eşitlenir, diğerleri yoksayılır', () => {
    expect(dodoWebhookIslemi('subscription.active').tur).toBe('esitle')
    expect(dodoWebhookIslemi('subscription.renewed').tur).toBe('esitle')
    expect(dodoWebhookIslemi('subscription.on_hold').tur).toBe('esitle')
    expect(dodoWebhookIslemi('payment.succeeded').tur).toBe('yoksay')
    expect(dodoWebhookIslemi('payout.success').tur).toBe('yoksay')
  })
})

describe('dodoLisansBitisi', () => {
  const sonraki = '2027-01-15T10:00:00Z'
  const hedef = new Date(new Date(sonraki).getTime() + tolerans)

  it('aktif abonelikte lisans bir sonraki ödeme tarihine (+tolerans) eşitlenir', () => {
    expect(dodoLisansBitisi('2026-11-20T00:00:00Z', { status: 'active', next_billing_date: sonraki })).toEqual(hedef)
    expect(dodoLisansBitisi(null, { status: 'active', next_billing_date: sonraki })).toEqual(hedef)
  })

  it('aynı olay tekrar gelirse lisans değişmez', () => {
    expect(dodoLisansBitisi(hedef.toISOString(), { status: 'active', next_billing_date: sonraki })).toBeNull()
  })

  it('daha uzun süre (elle uzatma, yıllıktan aylığa geçiş) kısaltılmaz', () => {
    expect(dodoLisansBitisi('2027-12-20T00:00:00Z', { status: 'active', next_billing_date: sonraki })).toBeNull()
  })

  it('ödeme alınamayan ya da biten abonelik lisansı uzatmaz', () => {
    for (const status of ['on_hold', 'cancelled', 'expired', 'failed', 'paused', 'pending']) {
      expect(dodoLisansBitisi(null, { status, next_billing_date: sonraki })).toBeNull()
    }
  })

  it('ek süredeki (past_due) abonelikte ödenmiş dönem korunur', () => {
    expect(dodoLisansBitisi(null, { status: 'past_due', next_billing_date: sonraki })).toEqual(hedef)
  })

  it('tarih yoksa ya da bozuksa dokunmaz', () => {
    expect(dodoLisansBitisi(null, { status: 'active', next_billing_date: null })).toBeNull()
    expect(dodoLisansBitisi(null, { status: 'active', next_billing_date: 'yarın' })).toBeNull()
  })
})

describe('metadataOkulId', () => {
  it('yalnızca pozitif tam sayıyı kabul eder', () => {
    expect(metadataOkulId({ okul_id: '12' })).toBe(12)
    expect(metadataOkulId({ okul_id: 7 })).toBe(7)
    expect(metadataOkulId({ okul_id: '12; drop' })).toBeNull()
    expect(metadataOkulId({ okul_id: '0' })).toBeNull()
    expect(metadataOkulId({})).toBeNull()
    expect(metadataOkulId(null)).toBeNull()
  })
})
