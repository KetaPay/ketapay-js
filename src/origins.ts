import { KetaPayCheckoutError } from './errors.js'

// Only KetaPay's own checkout can be opened, so a link swapped by a script on the business's page
// can't put someone else's payment form in the overlay. localhost is for local development.
const CHECKOUT_ORIGINS = ['https://checkout.ketapay.com', 'https://checkout-staging.ketapay.com']
const LOCAL_HOSTS = ['localhost', '127.0.0.1']

export interface CheckoutTarget {
  url: URL
  token: string
}

/** Reads the checkout session `url` the business's server got from the API. Throws when it isn't KetaPay's. */
export function checkoutTarget(input: unknown): CheckoutTarget {
  let url: URL
  try {
    url = new URL(String(input))
  } catch {
    throw invalid(input)
  }
  const local = LOCAL_HOSTS.includes(url.hostname) && (url.protocol === 'http:' || url.protocol === 'https:')
  if (!CHECKOUT_ORIGINS.includes(url.origin) && !local) throw invalid(input)

  // The token is the last path segment: https://checkout.ketapay.com/<token>
  const token = url.pathname.split('/').filter(Boolean).pop()
  if (!token) throw invalid(input)
  return { url, token: decodeURIComponent(token) }
}

function invalid(input: unknown) {
  return new KetaPayCheckoutError(
    'invalid_url',
    `Not a KetaPay checkout URL: ${JSON.stringify(String(input))}. Pass the \`url\` of a checkout session created by your server.`,
  )
}
