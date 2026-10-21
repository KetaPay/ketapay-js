// Fails when spec/test-catalogue.md was edited by hand: its body must match the hash in its header.
// To change the catalogue, edit it in the documentation repo and run `npm run sync-catalogue`.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const file = 'spec/test-catalogue.md'
const text = readFileSync(file, 'utf8')
const match = text.match(/^<!-- GENERATED: .* -->\n<!-- sha256: ([a-f0-9]{64}) -->\n\n/)
if (!match) {
  console.error(`${file} has no GENERATED header. Run \`npm run sync-catalogue\`.`)
  process.exit(1)
}
const body = text.slice(match[0].length)
if (createHash('sha256').update(body).digest('hex') !== match[1]) {
  console.error(`${file} was edited by hand. Change it in the documentation repo, then run \`npm run sync-catalogue\`.`)
  process.exit(1)
}
console.log(`${file} matches its hash.`)
