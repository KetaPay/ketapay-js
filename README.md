# KetaPay checkout for the browser

Opens KetaPay checkout over your page, so buyers pay into escrow without leaving your site. It's a small launcher with no dependencies: the checkout itself (amount, item, card and bank transfer, receipt) is drawn by KetaPay inside a secure frame.

Using React? [`@ketapay/react`](https://github.com/KetaPay/ketapay-react) wraps this package in a hook and a button.

## How it works

1. **Your server** creates a checkout session with your secret key (through [`@ketapay/node`](https://github.com/KetaPay/ketapay-node), [`ketapay/ketapay-php`](https://github.com/KetaPay/ketapay-php) or the API) and sends its `url` to the page.
2. **Your page** calls `KetaPay.open({ url })`. The checkout opens over your page: a centred window on a computer, the whole screen on a phone.
3. The buyer pays. You get `onPaid`, and the `escrow.funded` webhook on your server. Trust the webhook (or fetch the session) before you ship anything: a browser callback can't prove a payment.

Your secret key never goes to the browser, and this library takes no keys at all.

## Install

From the CDN:

```html
<script src="https://js.ketapay.com/v1/checkout.js"></script>
```

Or from npm:

```sh
npm install @ketapay/checkout
```

## Open the checkout

```js
import { KetaPay } from '@ketapay/checkout' // or window.KetaPay with the script tag

payButton.addEventListener('click', async () => {
  const { url } = await fetch('/api/checkout', { method: 'POST' }).then((r) => r.json())

  KetaPay.open({
    url,
    onReady: () => {}, // the checkout is showing
    onPaid: () => showThankYou(), // the buyer paid; the receipt stays up until they close it
    onClose: () => {}, // closed, paid or not
  })
})
```

`open` returns `{ close, result }`. `result` resolves once, to `'paid'` as soon as the buyer pays, or `'closed'` if they close it first:

```js
const checkout = KetaPay.open({ url })
if ((await checkout.result) === 'paid') window.location.href = '/orders'
```

Call `checkout.close()` to close it yourself, for example straight after `onPaid` if you'd rather show your own receipt.

## Branding

The checkout shows your business's logo and colour from your KetaPay settings. There are no styling options here, so every checkout looks the same as your hosted one.

## Errors

`open` throws a `KetaPayCheckoutError` before anything is shown, with a `code`:

| Code             | When                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------- |
| `invalid_url`    | The `url` isn't a KetaPay checkout. Pass the session's `url` exactly as the API gave it |
| `not_in_browser` | Called during server rendering. Call it from a click handler or an effect               |

Opening a second checkout while one is showing returns the one already open.

## Good to know

- **Server rendering:** importing the package touches neither `window` nor `document`, so it's safe in Next.js, Remix and Nuxt.
- **Content Security Policy:** the overlay is styled through the DOM, with no `<style>` tag, so `style-src` needs nothing extra. Allow the checkout in `frame-src https://checkout.ketapay.com`, and the CDN in `script-src https://js.ketapay.com` if you use it.
- **Sandbox:** sessions created with an `sk_test_` key open the same checkout in test mode, with test cards and a test bank transfer.
- **Browsers:** the last two versions of Chrome, Edge, Firefox and Safari, and Safari on iOS 15 or later.

## Versions

`https://js.ketapay.com/v1/checkout.js` always serves the newest `1.x`. To pin one version, use `https://js.ketapay.com/v1.2.3/checkout.js`; published versions never change.

## Licence

MIT
