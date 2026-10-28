import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { configured, createSession, getSession, payWithTestHelper } from './env.js'

// A business's page, served by Playwright itself: the script tag build, nothing else.
const SHOP = 'https://shop.example/'

declare global {
  interface Window {
    KetaPay: typeof import('../../src/index.js').KetaPay
    events: string[]
    result: Promise<string>
  }
}

test.skip(!configured, 'E2E is not configured (KETAPAY_E2E_BASE_URL, KETAPAY_E2E_SECRET_KEY)')

async function openShop(page: Page, url: string) {
  const script = readFileSync('dist/checkout.js', 'utf8')
  await page.route(`${SHOP}checkout.js`, (route) => route.fulfill({ contentType: 'text/javascript', body: script }))
  await page.route(SHOP, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><h1>Shop</h1><script src="/checkout.js"></script>',
    }),
  )
  await page.goto(SHOP)
  await page.evaluate((url) => {
    window.events = []
    window.result = window.KetaPay.open({
      url,
      onReady: () => window.events.push('ready'),
      onSuccess: () => window.events.push('success'),
      onError: (error) => window.events.push(`error:${error.code}`),
      onClose: () => window.events.push('closed'),
    }).result
  }, url)
}

const events = (page: Page) => page.evaluate(() => window.events)
const result = (page: Page) => page.evaluate(() => window.result)
const checkout = (page: Page) => page.frameLocator('iframe[title="KetaPay checkout"]')
const overlay = (page: Page) => page.getByRole('dialog', { name: 'KetaPay checkout' })

test('[BE2E-001] a session created with a test key opens in the overlay and says ready', async ({ page }) => {
  const session = await createSession()
  await openShop(page, session.url)
  await expect(overlay(page)).toBeVisible()
  await expect.poll(() => events(page)).toEqual(['ready'])
})

test('[BE2E-002] paying in the sandbox fires onSuccess and completes the session', async ({ page }) => {
  const session = await createSession()
  await openShop(page, session.url)
  await expect.poll(() => events(page)).toContain('ready')

  const frame = checkout(page)
  await frame.getByText('Bank transfer', { exact: true }).click()
  await frame.getByRole('button', { name: 'Proceed' }).click()
  await frame.getByRole('button', { name: /sent the money/ }).click()

  await expect.poll(() => events(page)).toContain('success')
  expect(await result(page)).toBe('success')
  await expect.poll(async () => (await getSession(session.id)).status).toBe('complete')
})

test('[BE2E-003] closing without paying fires closed and leaves the session open', async ({ page }) => {
  const session = await createSession()
  await openShop(page, session.url)
  await expect.poll(() => events(page)).toContain('ready')

  // On a large screen the overlay's close sits above the card (the checkout draws its own only on a phone)
  await page.getByRole('button', { name: 'Close checkout' }).click()
  await expect(overlay(page)).toHaveCount(0)
  expect(await events(page)).toEqual(['ready', 'closed'])
  expect(await result(page)).toBe('closed')
  expect((await getSession(session.id)).status).toBe('open')
})

test('[BE2E-004] a completed session shows its closed state, and closing it fires closed', async ({ page }) => {
  const session = await createSession()
  await payWithTestHelper(session.id)
  await openShop(page, session.url)
  await expect.poll(() => events(page)).toContain('ready')

  await expect(checkout(page).getByRole('button', { name: /Pay now|Proceed/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Close checkout' }).click()
  await expect.poll(() => events(page)).toEqual(['ready', 'closed'])
})

test('[BE2E-005] on a phone the overlay fills the screen and the pay button can be reached', async ({ page }) => {
  const session = await createSession()
  await openShop(page, session.url)
  await expect.poll(() => events(page)).toContain('ready')

  const viewport = page.viewportSize()!
  // The frame itself, not just the dimmed backdrop, covers the whole screen.
  const frameBox = await page.locator('iframe[title="KetaPay checkout"]').boundingBox()
  expect(frameBox).toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height })
  const pay = checkout(page).getByRole('button', { name: /Pay now|Proceed/ })
  await pay.scrollIntoViewIfNeeded()
  const box = await pay.boundingBox()
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height)
})

test('[BE2E-006] a checkout url with an unknown token fires onError with load_failed and closes', async ({ page }) => {
  const session = await createSession()
  // The same checkout origin, but a token that was never issued: the page that loads never says ready.
  await openShop(page, session.url.replace(/[^/]+$/, 'cs_test_never_issued'))
  await expect.poll(() => events(page), { timeout: 20_000 }).toEqual(['error:load_failed', 'closed'])
  await expect(overlay(page)).toHaveCount(0)
  expect(await result(page)).toBe('error')
})
