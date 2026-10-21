import { open } from './open.js'

declare const __SDK_VERSION__: string

/** The version of this library. */
export const version: string = __SDK_VERSION__

/** `KetaPay.open(...)`, the same object the script tag puts on `window`. */
export const KetaPay = { open, version }

export { open }
export { KetaPayCheckoutError } from './errors.js'
export type { KetaPayCheckoutErrorCode } from './errors.js'
export type { CheckoutHandle, CheckoutOptions, CheckoutResult } from './open.js'
