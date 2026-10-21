<!-- GENERATED: do not edit. Copied from documentation/openapi/public by `npm run sync-catalogue`. -->
<!-- sha256: 627d0d99beb580c7e37d8e4eb9254bebd2d4a651eea8f0d8d07c27fcd05a2bd4 -->

# KetaPay browser SDK test catalogue

Every scenario below must be tested in the browser SDKs (`@ketapay/checkout`, and `@ketapay/react` for the RCT rows). The rules are the same as the [server catalogue](SDK_TEST_CATALOGUE.md): tag tests with the ID in square brackets, one row is one behaviour, add rows with the next free ID, never delete or renumber a row, and a catalogue coverage test fails CI when an ID has no tagged test or a test carries an unknown ID. See [SDK_STANDARDS.md](SDK_STANDARDS.md) section 3c for the rules these rows check.

Layers: **unit** (jsdom, a fake checkout frame, no network), **package** (the packed artifact installed and run as a customer would), **e2e** (a real browser against the staging checkout, with sandbox keys).

## OPEN: opening the checkout

| ID | Layer | Must hold |
| --- | --- | --- |
| OPEN-001 | unit | A URL on a KetaPay checkout origin opens; any other origin, a non-https URL (except `localhost`) or a malformed URL is refused before anything is added to the page |
| OPEN-002 | unit | The frame URL carries `embed=1` and the exact origin of the business's page |
| OPEN-003 | unit | A second `open` while one is showing returns the one already open and adds nothing to the page |
| OPEN-004 | unit | Importing the package touches neither `window` nor `document` |

## MSG: messages from the checkout

| ID | Layer | Must hold |
| --- | --- | --- |
| MSG-001 | unit | Messages from any origin other than the frame's are ignored |
| MSG-002 | unit | Messages without `source: 'ketapay-checkout'`, with an unknown `type` or for another `token` are ignored |
| MSG-003 | unit | `ready` calls `onReady` and removes the SDK's own loader |
| MSG-004 | unit | `paid` calls `onPaid` once and resolves `result` to `'paid'`, however many times the message arrives |
| MSG-005 | unit | `closed` from the page closes the overlay, calls `onClose` once and resolves `result` to `'closed'` |
| MSG-006 | unit | A callback that throws doesn't stop the overlay from closing or `result` from resolving |

## UI: the overlay

| ID | Layer | Must hold |
| --- | --- | --- |
| UI-001 | unit | The close button, Esc and `close()` each close the overlay, call `onClose` once and resolve `result` to `'closed'` |
| UI-002 | unit | Closing removes every node and listener the SDK added |
| UI-003 | unit | Page scroll is locked while open and restored exactly as it was |
| UI-004 | unit | Focus stays inside the overlay while open and returns to the element that had it before |
| UI-005 | unit | Under 640px wide the overlay is full screen; above it, a centred modal |
| UI-006 | unit | The overlay is a labelled dialog (`role="dialog"`, `aria-modal`) and the frame has a title |

## RCT: React

| ID | Layer | Must hold |
| --- | --- | --- |
| RCT-001 | unit | `useKetaPayCheckout().open` calls `@ketapay/checkout` with the same options |
| RCT-002 | unit | `<KetaPayButton>` opens the checkout on click and passes its callbacks through |
| RCT-003 | unit | Unmounting while open closes the overlay and cleans up |
| RCT-004 | unit | Rendering on the server doesn't throw |

## BPKG: the published package

| ID | Layer | Must hold |
| --- | --- | --- |
| BPKG-001 | package | The npm artifact installs into an empty project and works as ESM, in a bundler and in a browser |
| BPKG-002 | package | The CDN build works from a plain `<script>` tag and exposes `KetaPay` |
| BPKG-003 | package | The public types compile in a customer project (TypeScript 5.0 and current) |
| BPKG-004 | package | The artifact contains only built code, licence and readme |
| BPKG-005 | package | No runtime dependencies (`@ketapay/react`: only `@ketapay/checkout`, with React as a peer) |
| BPKG-006 | package | `@ketapay/checkout` is under 5 KB gzipped |
| BPKG-007 | package | The version reported by the SDK equals the published version |

## BE2E: end to end against staging (sandbox keys)

| ID | Layer | Must hold |
| --- | --- | --- |
| BE2E-001 | e2e | A checkout session created with `sk_test_` opens in the overlay and `ready` arrives |
| BE2E-002 | e2e | Paying in the sandbox (the test bank transfer) fires `paid`, and the session is `complete` through the API |
| BE2E-003 | e2e | Closing without paying fires `closed`, and the session is still open |
| BE2E-004 | e2e | An expired or completed session shows the closed state, and closing it fires `closed` |
| BE2E-005 | e2e | Opened on a phone-sized screen, the overlay is full screen and the Pay button can be reached |
