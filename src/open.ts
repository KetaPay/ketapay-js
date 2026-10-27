import { KetaPayCheckoutError } from './errors.js'
import { checkoutTarget } from './origins.js'
import { createOverlay, PHONE_QUERY } from './overlay.js'

export type CheckoutResult = 'success' | 'closed' | 'error'

export interface CheckoutOptions {
  /** The `url` of a checkout session your server created with its secret key. */
  url: string
  /** The checkout has loaded and is showing. */
  onReady?: () => void
  /**
   * The buyer paid into escrow. The checkout stays open on its receipt until they close it (or you call
   * `close()`). Confirm the payment on your server (the `escrow.funded` webhook) before you ship anything.
   */
  onSuccess?: () => void
  /** The checkout didn't load (`code` is `load_failed`). The overlay has closed; `onClose` follows. */
  onError?: (error: KetaPayCheckoutError) => void
  /** The checkout closed, whether or not the buyer paid. */
  onClose?: () => void
}

export interface CheckoutHandle {
  /** Closes the checkout. Safe to call more than once. */
  close(): void
  /**
   * Resolves once: `'success'` as soon as the buyer pays, `'error'` if the checkout doesn't load, otherwise
   * `'closed'` when the checkout closes.
   */
  result: Promise<CheckoutResult>
}

type CheckoutMessage = { source: 'ketapay-checkout'; type: 'ready' | 'paid' | 'closed'; token: string }

// A KetaPay checkout always says `ready`. If the frame loads something that doesn't (an unknown token,
// a network error page), or nothing loads at all, the checkout failed: close it and tell `onError`.
const READY_AFTER_LOAD_MS = 8_000
const LOAD_TIMEOUT_MS = 30_000

let current: CheckoutHandle | null = null

/** Opens KetaPay checkout over the page. */
export function open(options: CheckoutOptions): CheckoutHandle {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new KetaPayCheckoutError('not_in_browser', 'KetaPay checkout can only be opened in a browser.')
  }
  const { url, token } = checkoutTarget(options?.url)
  if (current) return current

  const src = new URL(url)
  src.searchParams.set('embed', '1')
  src.searchParams.set('origin', window.location.origin)
  const overlay = createOverlay(src.toString())
  const { root, iframe, closeButton } = overlay

  let settle!: (result: CheckoutResult) => void
  const result = new Promise<CheckoutResult>((resolve) => (settle = resolve))
  let ready = false
  let paid = false
  let closed = false
  let readyTimer: ReturnType<typeof setTimeout> | undefined
  const loadTimer = setTimeout(fail, LOAD_TIMEOUT_MS)

  const media = window.matchMedia?.(PHONE_QUERY)
  const onLayout = () => overlay.layout(Boolean(media?.matches))
  const onMessage = (event: MessageEvent) => {
    if (event.source !== iframe.contentWindow || event.origin !== url.origin) return
    const data = event.data as Partial<CheckoutMessage> | null
    if (data?.source !== 'ketapay-checkout' || data.token !== token) return
    if (data.type === 'ready' && !ready) {
      ready = true
      clearTimers()
      overlay.reveal()
      // Moving the close drops its focus, so check before
      const closeHadFocus = document.activeElement === closeButton
      overlay.dockCloseButton()
      if (closeHadFocus) iframe.focus()
      call(options.onReady)
    } else if (data.type === 'paid' && !paid) {
      paid = true
      settle('success')
      call(options.onSuccess)
    } else if (data.type === 'closed') {
      close()
    }
  }
  const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close()
  // Keeps focus inside the checkout while it's open: tabbing out of the page lands back on it.
  const onFocus = (event: FocusEvent) => {
    if (!root.contains(event.target as Node)) (ready ? iframe : closeButton).focus()
  }
  // Once something has loaded, it has READY_AFTER_LOAD_MS to say ready, whatever the overall timeout says.
  // Restarted on every load, so a checkout page that reloads itself gets the full time again.
  const onLoad = () => {
    if (ready) return
    clearTimers()
    readyTimer = setTimeout(fail, READY_AFTER_LOAD_MS)
  }

  function clearTimers() {
    clearTimeout(loadTimer)
    clearTimeout(readyTimer)
  }

  function fail() {
    if (ready || closed) return
    settle('error')
    const error = new KetaPayCheckoutError(
      'load_failed',
      'The KetaPay checkout did not load. Check the session url, or try again: the network may be down.',
    )
    call(() => options.onError?.(error))
    close()
  }

  const previousFocus = document.activeElement as HTMLElement | null
  const scroll = [document.documentElement.style.overflow, document.body.style.overflow] as const

  function close() {
    if (closed) return
    closed = true
    clearTimers()
    window.removeEventListener('message', onMessage)
    window.removeEventListener('keydown', onKey)
    document.removeEventListener('focusin', onFocus)
    media?.removeEventListener?.('change', onLayout)
    iframe.removeEventListener('load', onLoad)
    overlay.remove()
    document.documentElement.style.overflow = scroll[0]
    document.body.style.overflow = scroll[1]
    previousFocus?.focus?.()
    current = null
    settle('closed')
    call(options.onClose)
  }

  closeButton.addEventListener('click', close)
  iframe.addEventListener('load', onLoad)
  window.addEventListener('message', onMessage)
  window.addEventListener('keydown', onKey)
  document.addEventListener('focusin', onFocus)
  media?.addEventListener?.('change', onLayout)
  onLayout()
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
  document.body.append(root)
  closeButton.focus()

  current = { close, result }
  return current
}

// A callback that throws must not leave the overlay half closed: the error is re-thrown on its own
// so it still shows in the console.
function call(callback: (() => void) | undefined) {
  try {
    callback?.()
  } catch (error) {
    setTimeout(() => {
      throw error
    })
  }
}
