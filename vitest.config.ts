import { readFileSync } from 'node:fs'
import { configDefaults, defineConfig } from 'vitest/config'

const { version } = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string }

export default defineConfig({
  define: { __SDK_VERSION__: JSON.stringify(version) },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.ts'],
    // E2E runs in real browsers through Playwright (npm run test:e2e).
    exclude: [...configDefaults.exclude, 'test/e2e/**'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/index.ts', 'src/browser.ts'],
      reporter: ['text-summary', 'json-summary', 'html'],
      reportsDirectory: 'coverage',
      thresholds: { lines: 95, statements: 95, branches: 90, functions: 95 },
    },
  },
})
