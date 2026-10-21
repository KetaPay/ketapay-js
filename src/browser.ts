// Entry for the script tag build (js.ketapay.com/v1/checkout.js): sets window.KetaPay.
import { KetaPayCheckoutError } from './errors.js'
import { open } from './open.js'

declare const __SDK_VERSION__: string

export { KetaPayCheckoutError, open }
export const version: string = __SDK_VERSION__
