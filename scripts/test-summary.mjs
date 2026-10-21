// Turns vitest's JSON results and the coverage summary into a Markdown report for the GitHub run
// summary page: totals, coverage, then every test with a pass or fail mark, grouped by file.
// Usage: node scripts/test-summary.mjs >> "$GITHUB_STEP_SUMMARY"
import { existsSync, readFileSync } from 'node:fs'
import { relative } from 'node:path'

const suites = [['Unit tests', 'reports/unit.json']]
const icon = { passed: '✅', failed: '❌', skipped: '⏭️', pending: '⏭️', todo: '📝' }
const out = []

const results = suites
  .filter(([, file]) => existsSync(file))
  .map(([title, file]) => [title, JSON.parse(readFileSync(file, 'utf8'))])

out.push('## Test results', '')
out.push('| Suite | Result | Passed | Failed | Skipped | Time |', '| --- | --- | --- | --- | --- | --- |')
for (const [title, r] of results) {
  const ms = r.testResults.reduce((sum, f) => sum + (f.endTime - f.startTime), 0)
  const ok = r.numFailedTests === 0 && r.success !== false
  out.push(
    `| ${title} | ${ok ? '✅ Passed' : '❌ Failed'} | ${r.numPassedTests} | ${r.numFailedTests} | ${r.numPendingTests + (r.numTodoTests ?? 0)} | ${(ms / 1000).toFixed(1)}s |`,
  )
}
if (results.length === 0) out.push('| No results found | ❌ | | | | |')

if (existsSync('coverage/coverage-summary.json')) {
  const { total } = JSON.parse(readFileSync('coverage/coverage-summary.json', 'utf8'))
  const cell = (m) => `${m.pct}% (${m.covered}/${m.total})`
  out.push('', '## Coverage', '', '| Lines | Statements | Branches | Functions |', '| --- | --- | --- | --- |')
  out.push(`| ${cell(total.lines)} | ${cell(total.statements)} | ${cell(total.branches)} | ${cell(total.functions)} |`)
  out.push('', 'The full HTML report is attached to this run as the `coverage-report` artifact.')
}

for (const [title, r] of results) {
  out.push('', `## ${title}`, '')
  for (const file of r.testResults) {
    const failed = file.assertionResults.filter((t) => t.status === 'failed').length
    const name = relative(process.cwd(), file.name)
    out.push(
      `<details${failed ? ' open' : ''}><summary>${failed ? '❌' : '✅'} <code>${name}</code> (${file.assertionResults.length} tests)</summary>`,
      '',
    )
    for (const t of file.assertionResults) {
      const path = [...t.ancestorTitles, t.title].join(' › ')
      out.push(`- ${icon[t.status] ?? '❔'} ${path}${t.duration ? ` <sub>${Math.round(t.duration)}ms</sub>` : ''}`)
      if (t.status === 'failed') {
        for (const msg of t.failureMessages ?? [])
          out.push('  ```', `  ${msg.split('\n').slice(0, 6).join('\n  ')}`, '  ```')
      }
    }
    out.push('', '</details>')
  }
}

console.log(out.join('\n'))
