export type KetaPayCheckoutErrorCode = 'invalid_url' | 'not_in_browser'

/** Thrown by `open` before anything is added to the page. Branch on `code`. */
export class KetaPayCheckoutError extends Error {
  readonly code: KetaPayCheckoutErrorCode

  constructor(code: KetaPayCheckoutErrorCode, message: string) {
    super(message)
    this.name = 'KetaPayCheckoutError'
    this.code = code
  }
}
