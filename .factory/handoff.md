# Owner Cash Check — build handoff

## Shipped

- Finished Vite + vanilla TypeScript offline PWA for a rolling 13-week owner cash decision.
- Local onboarding for balance, keep-back reserve, as-of date, and currency.
- Dated committed outgoings and expected incoming invoices with confirmed/likely/possible confidence labels, edit/delete/handled/restore paths, overdue warnings, and a keyboard-selectable week detail.
- Daily-order cash calculation feeding weekly opening/in/out/closing figures, 13-week low point, reserve risk labels, and a conservative “safe to spend” number (`lowest projected cash − reserve`, floored at zero).
- Weekly actual-balance check-in that resets the drawing’s starting position and records a visible revision history.
- IndexedDB persistence; JSON and CSV export; JSON restore; password-encrypted AES-GCM backup and restore using a locally derived PBKDF2 key.
- Installable manifest, authored 192/512/maskable icons, generated versioned precache, network-first navigation, cache-first assets, direct offline policy routes, offline status, and update-ready flow.
- $19 one-time Plus offer using the Sociobot checkout/verify contract. A returned or pasted license is cached and verified at most daily; only weekly/monthly schedule generation is gated. Forecasting, safety flags, check-ins, accessibility, and all exports remain free.
- Dedicated `/privacy/` and `/terms/` pages, MIT license, and expanded README.
- Product-specific blueprint drafting-sheet system and original generated hero art. The image-generation skill shaped the prompt, review, responsive output, and provenance record in `.factory/design.md`; mobile WebP is 16 KB and desktop WebP is 44 KB.

## Verify

From a clean checkout with Node.js 20+:

```sh
npm ci
npm test
npm run build
```

The deployment command is exactly `npm run build`. Output is `dist/`, with `dist/index.html` at its root.

Verification completed 2026-08-28:

- `npm test`: 5 unit tests and 4 Chromium end-to-end tests passed.
- End-to-end coverage: create/edit forecast data, persisted reload, weekly check-in, axe on welcome/dashboard/dialog, direct privacy/terms routes, and an explicit `context.setOffline(true)` reload from the service-worker cache.
- `npx tsc --noEmit`: passed.
- `npm audit --audit-level=high`: 0 vulnerabilities.
- Console smoke check at 390 × 844 for `/`, `/privacy/`, and `/terms/`: 0 errors; exactly one `h1` and one `main` on each route.
- Lighthouse 12.8.2 mobile on the production build: Performance 99, Accessibility 100, Best Practices 100, SEO 100; LCP 1.6 s, CLS 0, TBT 0 ms. INP is not measured in a synthetic no-interaction run; interaction code has no long tasks and TBT is 0 ms.
- Production transfer budgets: main JS 34.6 KB uncompressed (11.6 KB gzip), CSS 20.3 KB uncompressed (5.3 KB gzip), two Latin WOFF2 files 63.3 KB total, hero 16 KB mobile / 44 KB desktop.

## Known boundaries and next steps

- The factory must register/switch the live `owner-cash-check` billing product and confirm the hosted checkout return URL; no product ID or payment-provider secret is stored here.
- Local browser storage is intentionally device/profile scoped. Encrypted export is the secure portability path; there is no cloud sync or password recovery.
- Recurrence creates dated occurrences within the active 13-week horizon. Editing one occurrence does not rewrite the series, which avoids surprising historical changes in v1.
- Bank feeds, bookkeeping, automatic transaction reconciliation, forecasting AI, and financial advice are intentional non-goals.
