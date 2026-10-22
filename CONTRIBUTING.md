# Contributing

This library follows the KetaPay SDK standards (`documentation/openapi/public/SDK_STANDARDS.md`, section 3c for browser SDKs). It's a launcher: it opens KetaPay's hosted checkout in an overlay and passes its events on. It never takes keys and never calls the API.

## Layout

```
src/
├── index.ts      npm entry: open, KetaPay, version, KetaPayCheckoutError, types
├── browser.ts    script tag entry (dist/checkout.js): sets window.KetaPay
├── open.ts       open(): the overlay's lifecycle, messages, focus, scroll lock, result
├── overlay.ts    the overlay's elements and their styles (element.style only, so strict CSPs work)
├── origins.ts    which URLs may be opened: KetaPay checkout origins and localhost
└── errors.ts     KetaPayCheckoutError
test/             unit tests in jsdom, one file per area; e2e/ runs real browsers through Playwright
scripts/          catalogue sync and hash check, package smoke test, test report
infra/cdn.yml     the js.ketapay.com stack
```

`src` is browser code: ESLint blocks `node:*` imports, and nothing may touch `window` or `document` until `open` is called (server rendering imports this package).

## The contract with the checkout page

The checkout app (`checkout.ketapay.com`, repo `KetaPay/checkout`) and this library agree on:

- The frame URL: the session `url` plus `embed=1` and `origin=<the business page's origin>`.
- Messages from the page: `{ source: 'ketapay-checkout', type: 'ready' | 'paid' | 'closed', token }`, posted only to that origin.

Adding an event is a minor change in both. Removing or renaming one is a major change, released in the page and every browser SDK together.

## Pull requests and tests

Every change goes through a PR from a branch. CI runs on each PR, one check per kind of test: PR title (conventional commit), Secrets, Catalogue, Format/lint/types/audit, Unit tests (with coverage), Package smoke test, Test catalogue coverage. A test report with every test and the coverage is on the run's Summary page.

**Before every push**, a git hook runs formatting, lint, types and unit tests and refuses the push if any fail. `npm install` turns it on.

Coverage must stay at or above the thresholds in `vitest.config.ts`. Raise them when you add tests; never lower them to get a PR through.

```sh
npm test                 # unit tests (jsdom)
npm run test:coverage    # with coverage; open coverage/index.html
npm run build && npm run smoke:pack   # the packed package, as a business would install it
npm run test:e2e         # real browsers, needs the E2E settings below
```

## The test catalogue

`spec/test-catalogue.md` is synced from `documentation/openapi/public/SDK_BROWSER_TEST_CATALOGUE.md`. Tag each test with its ID in the test name, like `it('[MSG-001] ignores messages from any other origin', ...)`; package checks are tagged in `scripts/smoke-pack.mjs`. `test/catalogue-coverage.test.ts` fails when an ID has no tagged test or a test carries an unknown one. The `RCT` rows belong to `ketapay-react`.

New scenario: add the row in the documentation repo first, `npm run sync-catalogue` here, then write the tagged test. Never edit `spec/test-catalogue.md` by hand: its header records a hash and CI rejects edits.

## End-to-end tests

`test/e2e/` drives Chromium, WebKit and an iPhone-sized WebKit through Playwright. Each test creates a fresh checkout session on the API with a sandbox key, serves a one-line shop page that loads `dist/checkout.js`, opens the checkout and checks what a business would see: `ready`, a test payment firing `onSuccess`, closing, closed sessions, an unknown token firing `onError`, the phone layout.

Settings: `KETAPAY_E2E_BASE_URL` and `KETAPAY_E2E_SECRET_KEY` (see `test/e2e/env.ts`). The checkout URL the API returns must be reachable from the machine running the browsers. Run `npm run build` first, then `npm run test:e2e`.

The **E2E** workflow runs on every merge to `main`, nightly and by hand, reading the settings from Infisical (`ketapay-sdks`, staging); until they exist it reports "not configured" and passes. **Publish to npm** runs it on the release tag and refuses a stable release unless it passed.

## Supported browsers

The last two versions of Chrome, Edge, Firefox and Safari, and Safari on iOS 15 or later. The build targets ES2020. TypeScript 5.0 or later for the types.

## Versioning and publishing

Semantic versioning, automated by Release Please, exactly like the other KetaPay SDKs: conventional commits, a release PR on every push to `main`, merging it tags the version, and the manual **Publish to npm** workflow (dudox only, `publish` environment) runs CI and E2E on the tag, smoke-tests the package and publishes with provenance. Pre-releases go under the `next` dist-tag.

The same workflow uploads the script tag build to **js.ketapay.com** before publishing to npm: `/v1.2.3/checkout.js` (cached for a year, never changed again; a re-run with different bytes fails) and, for stable releases, `/v1/checkout.js` (cached for 5 minutes, follows the newest `1.x`). Pre-releases only get their exact path.

The CDN is its own stack, `infra/cdn.yml` (S3 + CloudFront + certificate + DNS in us-east-1), deployed once by hand:

```sh
aws cloudformation deploy --region us-east-1 --stack-name ketapay-js-cdn \
  --template-file infra/cdn.yml --capabilities CAPABILITY_NAMED_IAM --profile ketapay
```

Then add the stack's `UploadRoleArn` output to Infisical as `CDN_UPLOAD_ROLE_ARN` (project `ketapay-sdks`, environment `prod`). Only the publish job (environment `publish`) can use that role; it can upload but never delete.

Switches (repo variables, on/off only): `RELEASES_ENABLED` and `NPM_PUBLISH_ENABLED`. Keys and config (`NPM_TOKEN`, `CDN_UPLOAD_ROLE_ARN`, the E2E settings) live in Infisical, never in GitHub.

## Style

Prettier (`npm run format`): 120 columns, no semicolons, single quotes. No runtime dependencies, and `dist/checkout.js` stays under 5 KB gzipped.

## Secrets and security

No secret ever goes in this repo. GitHub secret scanning with push protection and the **Secrets** CI check (gitleaks with KetaPay's patterns in `.gitleaks.toml`) enforce it. Vulnerabilities are reported privately (see SECURITY.md).
