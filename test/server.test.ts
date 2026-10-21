// @vitest-environment node
// Runs with no window or document, like server rendering in Next.js or Remix.
import { describe, expect, it } from 'vitest'

describe('without a browser', () => {
  it('[OPEN-004] imports without touching window or document', async () => {
    expect(typeof window).toBe('undefined')
    const { KetaPay, open, version } = await import('../src/index.js')
    expect(typeof open).toBe('function')
    expect(KetaPay.version).toBe(version)
  })

  it('[OPEN-004] open says it needs a browser instead of crashing', async () => {
    const { open } = await import('../src/index.js')
    expect(() => open({ url: 'https://checkout.ketapay.com/ck_test_1' })).toThrow(
      expect.objectContaining({ code: 'not_in_browser' }),
    )
  })
})
