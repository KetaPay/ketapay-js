// E2E: the built script tag library in real browsers, opening checkouts created on the KetaPay API with a
// sandbox key. Settings come from Infisical (project ketapay-sdks, environment staging), see test/e2e/env.ts.
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'test/e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  retries: 1,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list'], ['html', { open: 'never' }]] : 'list',
  use: { trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, grepInvert: /\[BE2E-005\]/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, grepInvert: /\[BE2E-005\]/ },
    { name: 'iphone', use: { ...devices['iPhone 13'] }, grep: /\[BE2E-005\]/ },
  ],
})
