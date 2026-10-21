import { describe, expect, it, vi } from 'vitest'
import { closeButton, event, frame, openCheckout, overlay, post, screen } from './helpers.js'

describe('the overlay', () => {
  it.each([
    ['its close button', () => closeButton().click()],
    ['Esc', () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))],
    ['close()', (close: () => void) => close()],
  ])('[UI-001] closes with %s, calling onClose once and resolving closed', async (_, how) => {
    const onClose = vi.fn()
    const handle = openCheckout({ onClose })
    how(handle.close)
    handle.close()
    expect(overlay()).toBeNull()
    expect(onClose).toHaveBeenCalledOnce()
    await expect(handle.result).resolves.toBe('closed')
  })

  it('[UI-001] other keys do nothing', () => {
    openCheckout()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(overlay()).not.toBeNull()
  })

  it('[UI-002] closing removes every node and listener it added', () => {
    const media = screen(false)
    const added = vi.spyOn(window, 'addEventListener')
    const removed = vi.spyOn(window, 'removeEventListener')
    const docAdded = vi.spyOn(document, 'addEventListener')
    const docRemoved = vi.spyOn(document, 'removeEventListener')
    const before = document.body.innerHTML
    const headBefore = document.head.innerHTML

    const handle = openCheckout()
    expect(media.listeners.size).toBe(1)
    handle.close()

    expect(document.body.innerHTML).toBe(before)
    expect(document.head.innerHTML).toBe(headBefore)
    expect(media.listeners.size).toBe(0)
    const pairs = (on: typeof added, off: typeof removed) =>
      expect(off.mock.calls.map(([type, fn]) => [type, fn])).toEqual(
        expect.arrayContaining(on.mock.calls.map(([type, fn]) => [type, fn])),
      )
    pairs(added, removed)
    pairs(docAdded, docRemoved)
  })

  it('[UI-002] a message after closing does nothing', () => {
    const onSuccess = vi.fn()
    const handle = openCheckout({ onSuccess })
    const target = frame().contentWindow
    handle.close()
    post(event('paid'), { from: target })
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('[UI-003] locks page scroll while open and restores it exactly', () => {
    document.documentElement.style.overflow = 'auto'
    document.body.style.overflow = 'scroll'
    const handle = openCheckout()
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(document.body.style.overflow).toBe('hidden')
    handle.close()
    expect(document.documentElement.style.overflow).toBe('auto')
    expect(document.body.style.overflow).toBe('scroll')
    document.documentElement.style.overflow = ''
    document.body.style.overflow = ''
  })

  it('[UI-004] keeps focus inside while open and gives it back after', () => {
    const pay = document.createElement('button')
    const other = document.createElement('input')
    document.body.append(pay, other)
    pay.focus()

    const handle = openCheckout()
    expect(document.activeElement).toBe(closeButton())
    other.focus()
    expect(document.activeElement).toBe(closeButton())

    post(event('ready'))
    expect(document.activeElement).toBe(frame())
    other.focus()
    expect(document.activeElement).toBe(frame())

    handle.close()
    expect(document.activeElement).toBe(pay)
    pay.remove()
    other.remove()
  })

  it('[UI-005] fills the screen on a phone', () => {
    screen(true)
    openCheckout()
    const modal = overlay()!.firstElementChild as HTMLElement
    expect(overlay()!.style.padding).toBe('0px')
    expect(modal.style.height).toBe('100%')
    expect(modal.style.maxWidth).toBe('none')
    expect((frame().parentElement as HTMLElement).style.borderRadius).toBe('0px')
  })

  it('[UI-005] is a centred modal above 640px, and follows the screen when it changes', () => {
    const media = screen(false)
    openCheckout()
    const modal = overlay()!.firstElementChild as HTMLElement
    expect(overlay()!.style.alignItems).toBe('center')
    expect(overlay()!.style.justifyContent).toBe('center')
    expect(modal.style.maxWidth).toBe('1040px')
    expect(modal.style.height).toMatch(/^min\(720px, (calc\()?100% - 56px\)?\)$/)

    media.resize(true)
    expect(modal.style.height).toBe('100%')
    media.resize(false)
    expect(modal.style.maxWidth).toBe('1040px')
  })

  it('[UI-005] works where matchMedia is missing (treated as a large screen)', () => {
    vi.stubGlobal('matchMedia', undefined)
    openCheckout()
    expect((overlay()!.firstElementChild as HTMLElement).style.maxWidth).toBe('1040px')
  })

  it('[UI-006] is a labelled modal dialog with a titled frame', () => {
    openCheckout()
    expect(overlay()!.getAttribute('aria-modal')).toBe('true')
    expect(overlay()!.getAttribute('aria-label')).toBe('KetaPay checkout')
    expect(frame().title).toBe('KetaPay checkout')
    expect(closeButton().type).toBe('button')
  })

  it('[UI-006] adds no <style> tag, so a strict Content Security Policy is fine', () => {
    openCheckout()
    expect(document.querySelectorAll('style, link[rel="stylesheet"]')).toHaveLength(0)
    expect(document.querySelectorAll('[style]').length).toBeGreaterThan(0)
  })
})
