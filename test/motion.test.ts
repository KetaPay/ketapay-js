import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { closeButton, event, openCheckout, overlay, post } from './helpers.js'

// jsdom has no Web Animations API, so these tests give elements a fake one that records each animation
// and only finishes it when the test says so.
interface FakeAnimation {
  target: Element
  onfinish: (() => void) | null
  oncancel: (() => void) | null
  cancel: ReturnType<typeof vi.fn<() => void>>
}

let animations: FakeAnimation[] = []
const animationsOn = (target: Element) => animations.filter((animation) => animation.target === target)

beforeEach(() => {
  animations = []
  Element.prototype.animate = vi.fn(function (this: Element) {
    const animation: FakeAnimation = {
      target: this,
      onfinish: null,
      oncancel: null,
      cancel: vi.fn(() => animation.oncancel?.()),
    }
    animations.push(animation)
    return animation as unknown as Animation
  })
  Element.prototype.getAnimations = function (this: Element) {
    return animationsOn(this) as unknown as Animation[]
  }
})

afterEach(() => {
  delete (Element.prototype as Partial<Element>).animate
  delete (Element.prototype as Partial<Element>).getAnimations
})

describe('the overlay with motion', () => {
  it('[UI-002] closing fades the overlay out and removes it once the fade ends', () => {
    const handle = openCheckout()
    const root = overlay()!
    handle.close()

    // Still on the page while it fades, but no longer catching clicks
    expect(overlay()).toBe(root)
    expect(root.style.pointerEvents).toBe('none')
    expect(root.style.opacity).toBe('0')

    animationsOn(root).at(-1)!.onfinish!()
    expect(overlay()).toBeNull()
  })

  it('[UI-002] a cancelled fade still removes the overlay', () => {
    const handle = openCheckout()
    const root = overlay()!
    handle.close()
    animationsOn(root).at(-1)!.cancel()
    expect(overlay()).toBeNull()
  })

  it('[UI-005] once ready, the close drops its slow-load fade and comes in with the card', () => {
    openCheckout()
    const [loadingFade] = animationsOn(closeButton())
    post(event('ready'))

    expect(loadingFade!.cancel).toHaveBeenCalledOnce()
    expect(animationsOn(closeButton())).toHaveLength(2)
  })
})
