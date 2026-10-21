import { describe, expect, it, vi } from 'vitest'
import { KetaPayCheckoutError } from '../src/errors.js'
import { event, frame, openCheckout, overlay, post } from './helpers.js'

describe('a checkout that does not load', () => {
  it('[MSG-007] the frame loads but never says ready: closes, then onError, onClose and result error', async () => {
    vi.useFakeTimers()
    const calls: string[] = []
    const onError = vi.fn<(error: KetaPayCheckoutError) => void>(() => void calls.push('error'))
    const handle = openCheckout({ onError, onClose: () => calls.push('close') })
    frame().dispatchEvent(new Event('load'))
    vi.advanceTimersByTime(7_999)
    expect(overlay()).not.toBeNull()

    vi.advanceTimersByTime(1)
    expect(overlay()).toBeNull()
    expect(onError).toHaveBeenCalledOnce()
    const [error] = onError.mock.calls[0]!
    expect(error).toBeInstanceOf(KetaPayCheckoutError)
    expect(error.code).toBe('load_failed')
    expect(calls).toEqual(['error', 'close'])
    await expect(handle.result).resolves.toBe('error')
  })

  it('[MSG-007] nothing loads at all: fails after the load timeout', async () => {
    vi.useFakeTimers()
    const onError = vi.fn()
    const handle = openCheckout({ onError })
    vi.advanceTimersByTime(29_999)
    expect(onError).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onError).toHaveBeenCalledOnce()
    await expect(handle.result).resolves.toBe('error')
  })

  it('[MSG-007] a page that reloads itself gets the full time again', () => {
    vi.useFakeTimers()
    const onError = vi.fn()
    openCheckout({ onError })
    frame().dispatchEvent(new Event('load'))
    vi.advanceTimersByTime(6_000)
    frame().dispatchEvent(new Event('load'))
    vi.advanceTimersByTime(6_000)
    expect(onError).not.toHaveBeenCalled()
  })

  it('[MSG-007] a slow page that loads near the timeout still gets its time to say ready', () => {
    vi.useFakeTimers()
    const onError = vi.fn()
    openCheckout({ onError })
    vi.advanceTimersByTime(25_000)
    frame().dispatchEvent(new Event('load'))
    vi.advanceTimersByTime(6_000)
    post(event('ready'))
    vi.advanceTimersByTime(60_000)
    expect(onError).not.toHaveBeenCalled()
    expect(overlay()).not.toBeNull()
  })

  it('[MSG-008] once ready has arrived, no load_failed is reported', async () => {
    vi.useFakeTimers()
    const onError = vi.fn()
    const handle = openCheckout({ onError })
    frame().dispatchEvent(new Event('load'))
    post(event('ready'))
    frame().dispatchEvent(new Event('load'))
    vi.advanceTimersByTime(60_000)
    expect(onError).not.toHaveBeenCalled()
    expect(overlay()).not.toBeNull()
    handle.close()
    await expect(handle.result).resolves.toBe('closed')
  })

  it('[MSG-008] after the overlay is closed, no load_failed is reported', () => {
    vi.useFakeTimers()
    const onError = vi.fn()
    openCheckout({ onError }).close()
    vi.advanceTimersByTime(60_000)
    expect(onError).not.toHaveBeenCalled()
  })

  it('[MSG-006] an onError that throws still lets the overlay close', async () => {
    vi.useFakeTimers()
    const handle = openCheckout({
      onError: () => {
        throw new Error('shop bug in onError')
      },
    })
    vi.advanceTimersByTime(30_000)
    expect(overlay()).toBeNull()
    await expect(handle.result).resolves.toBe('error')
    expect(() => vi.runOnlyPendingTimers()).toThrow('shop bug in onError')
  })
})
