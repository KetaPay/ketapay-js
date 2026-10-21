// Packs the library exactly as npm would publish it, installs the .tgz into an empty project and uses it
// the way a business would: from npm through a bundler, from a <script> tag, and from TypeScript.
// Run after `npm run build`. Exits non-zero on the first failure.
//
// [BPKG-001] installs and works as ESM, in a bundler and in a browser
// [BPKG-002] the CDN build works from a plain <script> tag and exposes KetaPay
// [BPKG-003] the public types compile (TypeScript 5.0 and current)
// [BPKG-004] the artifact contains only built code, licence and readme
// [BPKG-005] no runtime dependencies
// [BPKG-006] the script tag build is under 5 KB gzipped
// [BPKG-007] the reported version equals the published version
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { build } from 'esbuild'
import { JSDOM } from 'jsdom'

const MAX_GZIP_BYTES = 5 * 1024
const CHECKOUT_URL = 'https://checkout.ketapay.com/ck_test_smoke'
const root = resolve('.')
const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
const check = (ok, message) => {
  if (!ok) {
    console.error(`FAIL ${message}`)
    process.exit(1)
  }
  console.log(`ok   ${message}`)
}

const dir = mkdtempSync(join(tmpdir(), 'ketapay-js-smoke-'))
try {
  const tgz = join(dir, run('npm', ['pack', '--pack-destination', dir, '--silent'], root).trim())

  // [BPKG-004] only built code, licence, readme and package.json
  const files = run('tar', ['-tzf', tgz], dir).trim().split('\n')
  const stray = files.filter((f) => !/^package\/(dist\/.+|LICENSE|README\.md|package\.json)$/.test(f))
  check(
    stray.length === 0,
    `[BPKG-004] package holds only dist, LICENSE, README.md (stray: ${stray.join(', ') || 'none'})`,
  )

  // [BPKG-005] nothing to install alongside it
  const packed = JSON.parse(run('tar', ['-xzOf', tgz, 'package/package.json'], dir))
  const deps = Object.keys({ ...packed.dependencies, ...packed.peerDependencies })
  check(deps.length === 0, `[BPKG-005] no runtime dependencies (${deps.join(', ') || 'none'})`)

  const app = join(dir, 'app')
  run('mkdir', ['-p', app], dir)
  writeFileSync(join(app, 'package.json'), JSON.stringify({ name: 'shop', private: true, type: 'module' }))
  run(
    'npm',
    [
      'install',
      '--silent',
      '--no-audit',
      '--no-fund',
      tgz,
      'typescript@5.0.4',
      'typescript-current@npm:typescript@5.9.3',
    ],
    app,
  )
  const installed = join(app, 'node_modules/@ketapay/checkout')

  // [BPKG-001] ESM import with no window (server rendering) works and refuses to open
  writeFileSync(
    join(app, 'server.mjs'),
    `import { open, version } from '@ketapay/checkout'
try { open({ url: '${CHECKOUT_URL}' }); process.exit(1) } catch (e) { if (e.code !== 'not_in_browser') throw e }
console.log(version)`,
  )
  check(run('node', ['server.mjs'], app).trim() === version, '[BPKG-001] ESM import works in Node without a window')

  // [BPKG-001] a bundler resolves the package, and the bundle opens the checkout in a browser page
  writeFileSync(join(app, 'shop.js'), `import { KetaPay } from '@ketapay/checkout'\nwindow.shop = KetaPay\n`)
  const bundled = await build({
    entryPoints: [join(app, 'shop.js')],
    bundle: true,
    write: false,
    platform: 'browser',
    absWorkingDir: app,
  })
  const page = browserPage()
  page.window.eval(bundled.outputFiles[0].text)
  page.window.shop.open({ url: CHECKOUT_URL })
  check(
    page.window.document.querySelector('[role="dialog"] iframe') !== null,
    '[BPKG-001] bundled with esbuild, opens in a page',
  )

  // [BPKG-002] [BPKG-007] the script tag build sets window.KetaPay with the package's version
  const script = readFileSync(join(installed, 'dist/checkout.js'), 'utf8')
  const tagPage = browserPage(`<script>${script}</script>`)
  const KetaPay = tagPage.window.KetaPay
  check(typeof KetaPay?.open === 'function', '[BPKG-002] <script> build exposes window.KetaPay.open')
  check(KetaPay.version === version && packed.version === version, `[BPKG-007] reports version ${version}`)
  KetaPay.open({ url: CHECKOUT_URL })
  check(
    tagPage.window.document.querySelector('iframe')?.src.startsWith(CHECKOUT_URL),
    '[BPKG-002] <script> build opens the checkout',
  )

  // [BPKG-006] small enough to add to any page
  const gzip = gzipSync(script).length
  check(gzip < MAX_GZIP_BYTES, `[BPKG-006] checkout.js is ${gzip} bytes gzipped (limit ${MAX_GZIP_BYTES})`)

  // [BPKG-003] the public types compile in a customer project, old and new TypeScript, both resolutions
  writeFileSync(
    join(app, 'shop.ts'),
    `import { KetaPay, KetaPayCheckoutError, open, type CheckoutHandle, type CheckoutResult } from '@ketapay/checkout'
const handle: CheckoutHandle = open({ url: '${CHECKOUT_URL}', onReady() {}, onSuccess() {}, onError(error) { void error.code }, onClose() {} })
const result: Promise<CheckoutResult> = handle.result
KetaPay.open({ url: '${CHECKOUT_URL}' }).close()
export const isOurs = (e: unknown) => e instanceof KetaPayCheckoutError && e.code === 'invalid_url'
export { result }
// @ts-expect-error url is required
open({})
`,
  )
  for (const [label, bin] of [
    ['5.0', 'node_modules/typescript/bin/tsc'],
    ['current', 'node_modules/typescript-current/bin/tsc'],
  ]) {
    for (const resolution of ['bundler', 'nodenext']) {
      const mod = resolution === 'bundler' ? 'esnext' : 'nodenext'
      run(
        'node',
        [
          bin,
          '--noEmit',
          '--strict',
          '--lib',
          'es2020,dom',
          '--module',
          mod,
          '--moduleResolution',
          resolution,
          'shop.ts',
        ],
        app,
      )
      console.log(`ok   [BPKG-003] types compile with TypeScript ${label}, ${resolution} resolution`)
    }
  }
} finally {
  rmSync(dir, { recursive: true, force: true })
}

function browserPage(body = '') {
  return new JSDOM(`<!doctype html><html><body>${body}</body></html>`, {
    url: 'https://shop.example/cart',
    runScripts: 'dangerously',
  })
}
