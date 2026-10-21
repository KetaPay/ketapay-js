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
  background: 'rgba(9, 9, 11, 0.45)',
  backdropFilter: 'blur(8px)',
}

const frameStyle: Style = {
  position: 'relative',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  background: '#ffffff',
}

const iframeStyle: Style = {
  display: 'block',
  width: '100%',
  height: '100%',
  border: '0',
  opacity: '0',
  transition: 'opacity 0.2s ease',
}

const closeStyle: Style = {
  position: 'absolute',
  zIndex: '1',
  width: '34px',
  height: '34px',
  padding: '0',
  border: '0',
  borderRadius: '999px',
  background: 'rgba(255, 255, 255, 0.92)',
  color: '#09090b',
  font: '20px/34px system-ui, sans-serif',
  cursor: 'pointer',
  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
}

const spinnerStyle: Style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  width: '36px',
  height: '36px',
  margin: '-18px 0 0 -18px',
  boxSizing: 'border-box',
  border: '3px solid #ede9fe',
  borderTopColor: '#5b21b6',
  borderRadius: '50%',
}

export interface Overlay {
  root: HTMLDivElement
  iframe: HTMLIFrameElement
  closeButton: HTMLButtonElement
  /** Shows the checkout and hides the SDK's loader. */
  reveal(): void
  /** The checkout draws its own close button once it's ready. */
  hideCloseButton(): void
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
  spinner.animate?.([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], {
    duration: 800,
    iterations: Infinity,
  })

  const iframe = el('iframe', iframeStyle)
  iframe.title = 'KetaPay checkout'
  iframe.allow = 'payment; clipboard-write'
  iframe.src = src

  const closeButton = el('button', closeStyle)
  closeButton.type = 'button'
  closeButton.setAttribute('aria-label', 'Close checkout')
  closeButton.textContent = '×'

  frame.append(spinner, iframe)
  modal.append(closeButton, frame)
  root.append(modal)

  return {
    root,
    iframe,
    closeButton,
    reveal() {
      spinner.remove()
      iframe.style.opacity = '1'
    },
    hideCloseButton() {
      closeButton.style.display = 'none'
    },
    layout(phone) {
      // Desktop: a 1040x720 card, its close button above the top-right corner. Phone: the whole screen.
      root.style.padding = phone ? '0' : '16px'
      Object.assign(modal.style, {
        maxWidth: phone ? 'none' : '1040px',
        height: phone ? '100%' : 'min(720px, calc(100% - 56px))',
        marginTop: phone ? '0' : '40px',
      })
      Object.assign(frame.style, {
        borderRadius: phone ? '0' : '16px',
        boxShadow: phone ? 'none' : '0 24px 64px rgba(0, 0, 0, 0.35)',
      })
      Object.assign(closeButton.style, { top: phone ? '12px' : '-44px', right: phone ? '12px' : '0' })
    },
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, style: Style): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  Object.assign(node.style, style)
  return node
}
