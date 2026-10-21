export type KetaPayCheckoutErrorCode = 'invalid_url' | 'not_in_browser' | 'load_failed'

/**
 * Thrown by `open` before anything is added to the page (`invalid_url`, `not_in_browser`), or passed to
 * `onError` when the checkout doesn't load (`load_failed`). Branch on `code`.
 */
export class KetaPayCheckoutError extends Error {
  readonly code: KetaPayCheckoutErrorCode

  constructor(code: KetaPayCheckoutErrorCode, message: string) {
    super(message)
    this.name = 'KetaPayCheckoutError'
    this.code = code
  }
}
