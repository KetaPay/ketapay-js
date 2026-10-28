// The overlay is styled through element.style only (no <style> tag, no style attributes), which a
// Content Security Policy without 'unsafe-inline' still allows, so it works on strict pages too.

type Style = Partial<CSSStyleDeclaration>

/** Under this width the checkout takes the whole screen, like Paystack's on a phone. */
export const PHONE_QUERY = '(max-width: 639px)'

const overlayStyle: Style = {
  position: 'fixed',
  inset: '0',
  zIndex: '2147483000',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0',
  background: 'rgba(9, 9, 11, 0.6)',
  backdropFilter: 'blur(8px)',
}

// The open and close motion: the backdrop fades, then the card pops in fast and lands softly.
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)'
const FADE_MS = 160
const POP_MS = 280
// A normal load shows just the loader, like Paystack's; the close button only fades in on a slow one.
const CLOSE_DELAY_MS = 5000
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

const frameStyle: Style = {
  position: 'relative',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  background: '#ffffff',
  // Hidden until the checkout says ready, so the page shows the dark backdrop and a loader, then the
  // card pops in already drawn (never an empty white box filling in).
  opacity: '0',
}

const iframeStyle: Style = {
  display: 'block',
  width: '100%',
  height: '100%',
  border: '0',
}

// A plain white × on the backdrop, like Paystack's. While loading it sits in the screen's corner (the
// card isn't there yet); once the checkout is ready it moves above the card's top-right corner. On a
// phone the checkout fills the screen and draws its own, so this one goes.
const closeStyle: Style = {
  position: 'absolute',
  top: '16px',
  right: '16px',
  zIndex: '1',
  width: '34px',
  height: '34px',
  padding: '0',
  border: '0',
  borderRadius: '999px',
  background: 'transparent',
  color: '#ffffff',
  font: '28px/34px system-ui, sans-serif',
  cursor: 'pointer',
}

// A spoke spinner near the top, where the card's header will land, like Paystack's and Flutterwave's.
const SPOKES = 12
const SPIN_MS = 1000

const spinnerStyle: Style = {
  position: 'absolute',
  top: '120px',
  left: '50%',
  width: '28px',
  height: '28px',
  marginLeft: '-14px',
}

const spokeStyle: Style = {
  position: 'absolute',
  top: '0',
  left: '50%',
  width: '3px',
  height: '8px',
  marginLeft: '-1.5px',
  borderRadius: '2px',
  background: '#d4d4d8',
  opacity: '0.25',
  transformOrigin: '50% 14px',
}

export interface Overlay {
  root: HTMLDivElement
  iframe: HTMLIFrameElement
  closeButton: HTMLButtonElement
  /** Pops the checkout in and hides the SDK's loader. */
  reveal(): void
  /** Fades the overlay out, then removes it from the page. */
  remove(): void
  /** Moves the close button above the card once the checkout is ready (hidden on a phone). */
  dockCloseButton(): void
  layout(phone: boolean): void
}

export function createOverlay(src: string): Overlay {
  const root = el('div', overlayStyle)
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-modal', 'true')
  root.setAttribute('aria-label', 'KetaPay checkout')

  const modal = el('div', { position: 'relative', width: '100%' })
  const frame = el('div', frameStyle)
  const spinner = el('div', spinnerStyle)
  spinner.setAttribute('role', 'status')
  spinner.setAttribute('aria-label', 'Loading checkout')
  for (let i = 0; i < SPOKES; i++) {
    const spoke = el('div', { ...spokeStyle, transform: `rotate(${(i * 360) / SPOKES}deg)` })
    // Each spoke fades a step behind the one before it, so the bright one walks round the circle.
    spoke.animate?.([{ opacity: 1 }, { opacity: 0.25 }], {
      duration: SPIN_MS,
      delay: ((i - SPOKES) * SPIN_MS) / SPOKES,
      iterations: Infinity,
    })
    spinner.append(spoke)
  }

  const iframe = el('iframe', iframeStyle)
  iframe.title = 'KetaPay checkout'
  iframe.allow = 'payment; clipboard-write'
  iframe.src = src

  const closeButton = el('button', closeStyle)
  closeButton.type = 'button'
  closeButton.setAttribute('aria-label', 'Close checkout')
  closeButton.textContent = '×'

  // The loader sits on the backdrop itself, so it shows before the card does.
  frame.append(iframe)
  modal.append(frame)
  root.append(modal, spinner, closeButton)

  let phoneLayout = false
  let docked = false
  const placeClose = () => {
    if (!docked) return
    Object.assign(closeButton.style, { display: phoneLayout ? 'none' : 'block', top: '-40px', right: '0' })
  }
  const reducedMotion = () => Boolean(window.matchMedia?.(REDUCED_MOTION_QUERY).matches)
  root.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_MS, easing: 'ease-out' })
  closeButton.animate?.([{ opacity: 0 }, { opacity: 1 }], {
    duration: FADE_MS,
    delay: CLOSE_DELAY_MS,
    fill: 'backwards',
  })

  return {
    root,
    iframe,
    closeButton,
    reveal() {
      spinner.remove()
      frame.style.opacity = '1'
      // A phone's checkout slides up like a sheet; a larger screen's card grows into place.
      const from = reducedMotion() ? 'none' : phoneLayout ? 'translateY(48px)' : 'translateY(12px) scale(0.96)'
      frame.animate?.(
        [
          { opacity: 0, transform: from },
          { opacity: 1, transform: 'none' },
        ],
        { duration: POP_MS, easing: EASE_OUT },
      )
    },
    remove() {
      root.style.pointerEvents = 'none'
      const fade = root.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, easing: 'ease-in' })
      if (!fade) return root.remove()
      root.style.opacity = '0'
      fade.onfinish = fade.oncancel = () => root.remove()
    },
    dockCloseButton() {
      docked = true
      // Whatever its loading fade-in was doing, it now comes in with the card
      closeButton.getAnimations?.().forEach((animation) => animation.cancel())
      modal.append(closeButton)
      placeClose()
      closeButton.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: POP_MS, easing: EASE_OUT })
    },
    layout(phone) {
      phoneLayout = phone
      placeClose()
      // Desktop: an 840x600 card (the checkout's split layout holds from 800px). Phone: the whole screen.
      root.style.padding = phone ? '0' : '16px'
      Object.assign(modal.style, {
        maxWidth: phone ? 'none' : '840px',
        height: phone ? '100%' : 'min(600px, calc(100% - 56px))',
        marginTop: phone ? '0' : '40px',
      })
      Object.assign(frame.style, {
        borderRadius: phone ? '0' : '16px',
        boxShadow: phone ? 'none' : '0 24px 64px rgba(0, 0, 0, 0.35)',
      })
    },
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, style: Style): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  Object.assign(node.style, style)
  return node
}
