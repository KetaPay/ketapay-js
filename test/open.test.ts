import { describe, expect, it } from 'vitest'
import { KetaPayCheckoutError, open } from '../src/index.js'
import { CHECKOUT_URL, frame, openCheckout, overlay, TOKEN } from './helpers.js'

describe('open', () => {
  it.each([
    `https://checkout.ketapay.com/${TOKEN}`,
    `https://checkout-staging.ketapay.com/${TOKEN}`,
    `http://localhost:3020/${TOKEN}`,
    `http://127.0.0.1:3020/${TOKEN}?foo=bar`,
  ])('[OPEN-001] opens a KetaPay checkout URL: %s', (url) => {
    openCheckout({ url })
    expect(overlay()).not.toBeNull()
  })

  it.each([
    'https://evil.example/ck_test_123',
    'https://checkout.ketapay.com.evil.example/ck_test_123',
    'http://checkout.ketapay.com/ck_test_123',
    'https://checkout.ketapay.com/',
    'javascript:alert(1)',
    'not a url',
    '',
    undefined,
  ])('[OPEN-001] refuses %s before adding anything to the page', (url) => {
    const before = document.body.innerHTML
    expect(() => open({ url } as never)).toThrow(KetaPayCheckoutError)
    expect(() => open({ url } as never)).toThrow(expect.objectContaining({ code: 'invalid_url' }))
    expect(document.body.innerHTML).toBe(before)
  })

  it('[OPEN-002] sends embed=1 and the exact origin of the page, keeping the URL it was given', () => {
    openCheckout({ url: `${CHECKOUT_URL}?lang=en` })
    const src = new URL(frame().src)
    expect(src.origin + src.pathname).toBe(CHECKOUT_URL)
    expect(src.searchParams.get('embed')).toBe('1')
    expect(src.searchParams.get('origin')).toBe(window.location.origin)
    expect(src.searchParams.get('lang')).toBe('en')
  })

  it('[OPEN-003] a second open while one is showing returns the one already open', () => {
    const first = openCheckout()
    const second = openCheckout({ url: `https://checkout.ketapay.com/ck_test_other` })
    expect(second).toBe(first)
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1)
    expect(document.querySelectorAll('iframe')).toHaveLength(1)
  })

  it('[OPEN-003] opens again once the first one is closed', () => {
    const first = openCheckout()
    first.close()
    const second = openCheckout()
    expect(second).not.toBe(first)
    expect(overlay()).not.toBeNull()
  })

  it('exposes KetaPay.open and the version', async () => {
    const { KetaPay, version } = await import('../src/index.js')
    expect(KetaPay.open).toBe(open)
    expect(version).toMatch(/^\d+\.\d+\.\d+/)
  })
})
