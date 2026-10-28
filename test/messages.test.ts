import { describe, expect, it, vi } from 'vitest'
import { closeButton, event, frame, openCheckout, overlay, post, spinner } from './helpers.js'

describe('messages from the checkout', () => {
  it('[MSG-001] ignores messages from any other origin', () => {
    const onSuccess = vi.fn()
    openCheckout({ onSuccess })
    post(event('paid'), { origin: 'https://evil.example' })
    post(event('paid'), { origin: 'https://checkout-staging.ketapay.com' })
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('[MSG-001] ignores messages from another window, even with the right origin', () => {
    const onSuccess = vi.fn()
    openCheckout({ onSuccess })
    post(event('paid'), { from: window })
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it.each([
    ['no source', { type: 'paid', token: 'ck_test_4f9a2c7e' }],
    ['another source', { source: 'someone-else', type: 'paid', token: 'ck_test_4f9a2c7e' }],
    ['an unknown type', { source: 'ketapay-checkout', type: 'refunded', token: 'ck_test_4f9a2c7e' }],
    ['another checkout', { source: 'ketapay-checkout', type: 'paid', token: 'ck_test_other' }],
    ['a string', 'paid'],
    ['nothing', null],
  ])('[MSG-002] ignores %s', async (_, data) => {
    const onSuccess = vi.fn()
    const onClose = vi.fn()
    openCheckout({ onSuccess, onClose })
    post(data)
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(overlay()).not.toBeNull()
  })

  it('[MSG-003] ready calls onReady once, pops the card in, removes the loader and puts the close on the card', () => {
    const onReady = vi.fn()
    openCheckout({ onReady })
    expect(spinner()).not.toBeNull()
    const card = frame().parentElement as HTMLElement
    expect(card.style.opacity).toBe('0')

    post(event('ready'))
    post(event('ready'))
    expect(onReady).toHaveBeenCalledOnce()
    expect(spinner()).toBeNull()
    expect(card.style.opacity).toBe('1')
    // The close moves above the card's top-right corner.
    expect(closeButton().parentElement).toBe(card.parentElement)
    expect(closeButton().style.display).toBe('block')
    expect(closeButton().style.top).toBe('-40px')
  })

  it('[MSG-004] paid calls onSuccess once and resolves the result, however often it arrives', async () => {
    const onSuccess = vi.fn()
    const handle = openCheckout({ onSuccess })
    post(event('paid'))
    post(event('paid'))
    expect(onSuccess).toHaveBeenCalledOnce()
    await expect(handle.result).resolves.toBe('success')
    // The receipt stays on screen until the buyer closes it.
    expect(overlay()).not.toBeNull()
  })

  it('[MSG-004] stays a success when the buyer then closes the receipt', async () => {
    const onClose = vi.fn()
    const handle = openCheckout({ onClose })
    post(event('paid'))
    post(event('closed'))
    expect(onClose).toHaveBeenCalledOnce()
    await expect(handle.result).resolves.toBe('success')
  })

  it('[MSG-005] closed from the page closes the overlay, calls onClose once and resolves closed', async () => {
    const onClose = vi.fn()
    const handle = openCheckout({ onClose })
    const from = frame().contentWindow
    post(event('closed'), { from })
    post(event('closed'), { from })
    expect(overlay()).toBeNull()
    expect(onClose).toHaveBeenCalledOnce()
    await expect(handle.result).resolves.toBe('closed')
  })

  it('[MSG-006] a callback that throws still lets the overlay close and the result resolve', async () => {
    vi.useFakeTimers()
    const handle = openCheckout({
      onSuccess: () => {
        throw new Error('shop bug in onSuccess')
      },
      onClose: () => {
        throw new Error('shop bug in onClose')
      },
    })
    post(event('paid'))
    post(event('closed'))
    expect(overlay()).toBeNull()
    await expect(handle.result).resolves.toBe('success')
    // Each error is re-thrown on its own, so it still shows in the console.
    expect(() => vi.runOnlyPendingTimers()).toThrow('shop bug in onSuccess')
  })
})
