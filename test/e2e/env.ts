// E2E settings. CI reads them from Infisical (project ketapay-sdks, shared by every KetaPay SDK, environment staging).
//
//   KETAPAY_E2E_BASE_URL    API base URL, e.g. https://<api>/v1    (required)
//   KETAPAY_E2E_SECRET_KEY  sk_test_ key of the e2e organisation    (required)
//
// The checkout URL the API returns must be reachable from the machine running the browsers.
export const env = {
  baseUrl: process.env.KETAPAY_E2E_BASE_URL,
  key: process.env.KETAPAY_E2E_SECRET_KEY,
}

export const configured = Boolean(env.baseUrl && env.key)

const RUN_ID = process.env.KETAPAY_E2E_RUN_ID ?? `e2e-js-${Date.now().toString(36)}`
let counter = 0

export interface Session {
  id: string
  url: string
  status: string
}

async function api<T>(method: string, path: string, body?: object): Promise<T> {
  const res = await fetch(`${env.baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.key}`,
      'Content-Type': 'application/json',
      ...(method === 'POST' ? { 'Idempotency-Key': crypto.randomUUID() } : {}),
    },
    body: body && JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`)
  return (await res.json()) as T
}

/** A fresh open checkout session, tagged with the run id for cleanup. */
export function createSession(): Promise<Session> {
  counter++
  return api('POST', '/checkout_sessions', {
    amount: 1_500_000,
    category: 'services',
    title: 'E2E browser checkout',
    description: 'Created by the ketapay-js e2e suite to test the checkout overlay.',
    milestones: [{ title: 'Whole job', amount: 1_500_000 }],
    buyer: { email: `buyer+${RUN_ID}-${counter}@e2e.ketapay.test`, name: 'E2E Buyer' },
    seller: { email: `seller+${RUN_ID}-${counter}@e2e.ketapay.test`, name: 'E2E Seller' },
    release: { method: 'buyer_confirms' },
    external_reference: `${RUN_ID}-${counter}`,
    metadata: { e2e_run: RUN_ID },
  })
}

export const getSession = (id: string) => api<Session>('GET', `/checkout_sessions/${id}`)

/** Pays a session through the API's test helper, without the checkout page. */
export const payWithTestHelper = (id: string) => api('POST', `/test_helpers/checkout_sessions/${id}/pay`, {})
