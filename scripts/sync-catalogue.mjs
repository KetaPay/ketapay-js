// Copies the browser SDK test catalogue from the documentation repo (its source of truth) into spec/,
// with a GENERATED header and a hash of its contents, so hand edits fail CI.
// Usage: npm run sync-catalogue [-- path/to/documentation/openapi/public]
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2] ?? '../documentation/openapi/public'
const from = join(dir, 'SDK_BROWSER_TEST_CATALOGUE.md')
const to = 'spec/test-catalogue.md'
if (!existsSync(from)) {
  console.error(`Not found: ${from}`)
  process.exit(1)
}
const body = readFileSync(from, 'utf8')
const hash = createHash('sha256').update(body).digest('hex')
const header = [
  '<!-- GENERATED: do not edit. Copied from documentation/openapi/public by `npm run sync-catalogue`. -->',
  `<!-- sha256: ${hash} -->`,
  '',
  '',
].join('\n')
writeFileSync(to, header + body)
console.log(`Copied ${from} -> ${to}. Now run: npm run test:catalogue`)
