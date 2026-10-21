import { readFileSync } from 'node:fs'
import { defineConfig } from 'tsup'

const { version } = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string }
const define = { __SDK_VERSION__: JSON.stringify(version) }

export default defineConfig([
  // npm: ESM with types, for bundlers.
  { entry: ['src/index.ts'], format: ['esm'], dts: true, clean: true, sourcemap: true, target: 'es2020', define },
  // Script tag (js.ketapay.com/v1/checkout.js): one minified file that sets window.KetaPay.
  {
    entry: { checkout: 'src/browser.ts' },
    format: ['iife'],
    globalName: 'KetaPay',
    outExtension: () => ({ js: '.js' }),
    minify: true,
    sourcemap: true,
    target: 'es2020',
    define,
  },
])
