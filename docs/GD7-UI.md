# GĐ7 — Accessibility and UI performance

## Implemented

- The chat dialog moves focus to its message field when opened, keeps Tab navigation
  inside the dialog, closes on Escape, and restores focus to the opener (or the
  remounted chat launcher when its original node was removed).
- Chat messages use a polite live region; the typing indicator announces its state.
- Available/status badges and chat timestamps use darker text colors. Mobile
  bottom navigation has larger labels and icons, at least 48px control height,
  and exposes its current destination with `aria-current="page"`.
- Keyboard users receive a visible focus outline. The reduced-motion preference
  disables decorative animation and smooth scrolling.
- Added an index and three policy draft routes from the reviewed copy. Every
  route sends `noindex, nofollow`; the policy pages are omitted from the sitemap.
  Checkout links to the VAT draft note without claiming tax invoice status. No
  mandatory acceptance checkbox was added.

## Verification

- Lint, typecheck and the production build pass. The reviewer independently ran
  62 unit tests (including the final optional alert transport) and checked the server log redaction boundary.
- `node scripts/check-gd7-ui.mjs` passes on the final production build: keyboard
  focus entry, forward/reverse Tab trap, Enter submission, Escape and focus return;
  visible focus outline, live-region markup, reduced motion, and policy draft routes.
- Computed contrast on rendered backgrounds: available badge **7.01:1**, chat
  timestamps **5.88:1**, active navigation **4.67:1**, inactive navigation **6.20:1**.
  This is focused verification, not a complete WCAG audit or screen-reader certification.
- Draft pages use `noindex`, stay outside the sitemap, and fit a 390px viewport.

## Performance scope

The root hero image was the measured LCP bottleneck. A shared responsive source set
and matching server preload start its request before the client-only demo renders;
the 390px viewport selects the smaller image. LocalStorage and app rendering logic
were not refactored.

The final benchmark uses three cold-browser runs per route, 150ms latency,
1.6Mbps download, 750kbps upload and 4x CPU slowdown. The server is a local
production build; the figures do not establish deployed or real-user 4G performance.

| Route | Median simulated LCP | Initial JavaScript gzip estimate |
| --- | ---: | ---: |
| `/` | 2,116ms | 120,972 bytes |
| `/san-pham` | 1,368ms | 116,588 bytes |
| `/huong-dan` | 1,108ms | 106,701 bytes |

The root baseline was 3,252ms before the targeted image change. Script URLs are
deduplicated, including runtime/polyfills and excluding prefetch-only requests;
gzip sizes are calculated from their response bodies. All measured routes meet
the local thresholds of median LCP <2,500ms and JavaScript <200,000 gzip bytes.
Raw measurements and profile: [gd7-ui-measurements.json](gd7-ui-measurements.json).
