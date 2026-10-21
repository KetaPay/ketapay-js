import { afterEach, vi } from 'vitest'
import { open } from '../src/open.js'
import type { CheckoutHandle, CheckoutOptions } from '../src/open.js'

export const TOKEN = 'ck_test_4f9a2c7e'
export const CHECKOUT_URL = `https://checkout.ketapay.com/${TOKEN}`
export const CHECKOUT_ORIGIN = 'https://checkout.ketapay.com'

const handles: CheckoutHandle[] = []

/** Opens a checkout and closes it after the test, so one test's overlay never leaks into the next. */
export function openCheckout(options: Partial<CheckoutOptions> = {}): CheckoutHandle {
  const handle = open({ url: CHECKOUT_URL, ...options })
  handles.push(handle)
  return handle
}

afterEach(() => {
  handles.splice(0).forEach((handle) => handle.close())
  vi.useRealTimers()
})

export const overlay = () => document.querySelector<HTMLDivElement>('[role="dialog"]')
export const frame = () => document.querySelector('iframe')!
export const closeButton = () => document.querySelector<HTMLButtonElement>('button[aria-label="Close checkout"]')!
export const spinner = () => document.querySelector('[aria-label="Loading checkout"]')

/** A message as the checkout page posts it. */
export const event = (type: string, token = TOKEN) => ({ source: 'ketapay-checkout', type, token })

/** Delivers a message to the page as if `from` (by default the checkout frame) had posted it. */
export function post(
  data: unknown,
  { origin = CHECKOUT_ORIGIN, from = frame().contentWindow }: { origin?: string; from?: Window | null } = {},
) {
  window.dispatchEvent(new MessageEvent('message', { data, origin, source: from }))
}

/** Pretends the screen is phone-sized (or not), and lets the test change it while open. */
export function screen(phone: boolean) {
  const listeners = new Set<() => void>()
  const media = {
    matches: phone,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  }
  vi.stubGlobal('matchMedia', () => media)
  return {
    resize(toPhone: boolean) {
      media.matches = toPhone
      listeners.forEach((fn) => fn())
    },
    listeners,
  }
}
