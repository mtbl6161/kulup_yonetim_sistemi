import { describe, expect, it } from 'vitest'
import { gecerliDonem, webhookIslemi, yeniLisansBitisi } from './lemonWebhook'

describe('webhookIslemi', () => {
  it('ilk satın almada gelen olaylardan yalnızca biri lisansı uzatır', () => {
    const ilkSatinAlma = ['order_created', 'subscription_created', 'subscription_payment_success']
    expect(ilkSatinAlma.filter(e => webhookIslemi(e).tur === 'uzat')).toEqual(['subscription_payment_success'])
  })
  it('yenilemede tek uzatma yapılır', () => {
    const yenileme = ['subscription_payment_success', 'subscription_updated']
    expect(yenileme.filter(e => webhookIslemi(e).tur === 'uzat')).toHaveLength(1)
  })
  it('order_created lisansa dokunmaz, subscription_created yalnızca eşleştirir', () => {
    expect(webhookIslemi('order_created').tur).toBe('yoksay')
    expect(webhookIslemi('subscription_created').tur).toBe('eslestir')
    expect(webhookIslemi('subscription_payment_failed').tur).toBe('yoksay')
  })
})

describe('yeniLisansBitisi', () => {
  const simdi = new Date('2026-11-04T10:00:00Z')
  it('süresi geçmişse bugünden başlatır', () => {
    expect(yeniLisansBitisi('2026-10-01T00:00:00Z', 'month', simdi).toISOString()).toBe('2026-12-04T10:00:00.000Z')
  })
  it('deneme/abonelik sürüyorsa bitişin üzerine ekler', () => {
    expect(yeniLisansBitisi('2026-11-19T00:00:00Z', 'year', simdi).toISOString()).toBe('2027-11-19T00:00:00.000Z')
  })
  it('bitiş yoksa bugünden başlatır', () => {
    expect(yeniLisansBitisi(null, 'year', simdi).toISOString()).toBe('2027-11-04T10:00:00.000Z')
  })
})

describe('gecerliDonem', () => {
  it('yalnızca month/year kabul eder', () => {
    expect(gecerliDonem('month')).toBe('month')
    expect(gecerliDonem('year')).toBe('year')
    expect(gecerliDonem(undefined)).toBeNull()
    expect(gecerliDonem('week')).toBeNull()
  })
})
