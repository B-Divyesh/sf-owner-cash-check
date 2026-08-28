# Independent verification 2 — FAIL

- **Candidate:** `355375bb358fb8f5c67c0116a6bec427cd2d1cc4`
- **Live URL:** https://owner-cash-check.sociobot.in/
- **Verified:** 2026-08-28 UTC
- **Scope:** clean dependency install, local production artifact, and fresh live-browser checks. No product code was changed.

## Decision

**FAIL — do not release.** The live deployment now matches this candidate, but a blank weekly check-in balance is silently persisted as `$0.00`. This is unsafe in a cash-decision tool and fails required invalid-input/recovery behavior. The public/README copy also contains testable claims not declared in the required claims manifest.

## Required first gates

### Claims, run first from the demo entry point

All five declared commands passed after `npm ci`:

| Claim | Exact command | Result |
| --- | --- | --- |
| `demo-sandbox` | `npx playwright test --grep @claim:demo-sandbox` | PASS (1 test) |
| `forecast-13-weeks` | `npx playwright test --grep @claim:forecast-13-weeks` | PASS (1 test) |
| `offline-reload` | `npx playwright test --grep @claim:offline-reload` | PASS (1 test) |
| `backup-export` | `npx playwright test --grep @claim:backup-export` | PASS (1 test) |
| `local-only` | `npx playwright test --grep @claim:local-only` | PASS (1 test) |

The manifest exists and each test begins at the documented `/demo` sandbox. The demo renders a realistic workshop plan, persists the required “Demo — sample data, nothing is saved” banner, and exposes Reset demo and Start for real. The test evidence is the clean Playwright output; no claim trace was generated because all five passed.

### Cold first-read of live landing page

**PASS.** A cold load says it turns a bank balance, bills, invoices, and reserve into a 13-week cash check, names the owner-oriented use case, and gives a visible **Try it with sample data** action. That one click opens `/demo` and says that it opens a sample workshop plan and saves nothing.

### Claim-manifest cross-check

**FAIL / release-blocking under the supplied claims policy.** The claims file has no tagged claim tests for public/README statements that a visitor can rely on, including:

- “Projects a daily low and weekly closing balance”
- “Labels incoming estimates as confirmed, likely, or possible”
- “Records weekly actual-balance check-ins and preserves a small revision history”
- “A $19 one-time Plus license unlocks weekly/monthly repeat scheduling”

Existing untagged unit/E2E tests do not satisfy the stated requirement that every public claim have exactly one `@claim:<id>` demo-entry-point test. Add observable sandbox tests or remove/narrow these statements.

## Defects

### HIGH — blank weekly check-in becomes a false $0 balance

**Live reproduction:** open https://owner-cash-check.sociobot.in/demo in a fresh context; choose **Weekly check-in**; erase **Actual balance today**; choose **Complete check-in**. The dialog closes and records “Actual $0.00”; the live region says “Weekly check-in saved. The plan now starts from the actual balance.”

The app accepts `Number('') === 0` in the check-in path. A missed value therefore redraws the forecast from zero without an error, which can falsely mark cash as unsafe or alter an owner’s decision. Require a nonblank numeric balance and keep focus in the form with an announced recovery message. Add a regression test.

### MEDIUM — live static host does not honor two configured response policies

The candidate contains the intended `staticwebapp.config.json`, but fresh live responses show:

- `/manifest.webmanifest` is `Content-Type: application/octet-stream`, not `application/manifest+json`.
- `/does-not-exist` returns HTTP 200 and the normal onboarding, rather than the configured 404 response override. `/404/` itself is a designed page, but unknown deep links are not served as a real 404.

These are deployment response-policy defects. Hashed assets are correctly immutable and `/sw.js` is `no-cache`.

## Checks that passed

- `npm ci`: 63 packages installed; 0 vulnerabilities.
- `npm test`: 6 Vitest tests and 12 Chromium E2E tests passed.
- `npm run typecheck` and `npm run lint`: passed.
- `npm run build`: passed and emitted `dist/`.
- `npm audit --audit-level=high`: 0 vulnerabilities.
- Candidate identity: SHA-256 of live `/assets/main-D8-rmarY.js` equals local build `4a5aea551923f5d4475f1c70152bfb7b9126c6ef2321b35561a065f9d7c2848b`; live `/sw.js` equals local `ec94308a45f5a35bccbe6c2b532b81889b43748cd50d267ad12a2505b5165f09`.
- Normal flow passed locally and in the suite: create a plan, add a dated outgoing, view the changed low, complete a check-in, reload, and retain the entries/check-in.
- Live `/demo` network capture (including add-item flow) used only `https://owner-cash-check.sociobot.in`; no console or page errors.
- Fresh live service-worker context was controlled after first visit; offline reload kept the demo dashboard and showed the offline notice.
- Live axe scans of landing, demo dashboard, and open item dialog: 0 serious/critical findings.
- At 390×844 there was no horizontal overflow; the visible focus ring is a 3px `rgb(23, 92, 140)` outline; the skip link moves to `#main`; reduced-motion transition duration is `0.00001s`.
- Live response headers include effective same-origin CSP, HSTS, `X-Content-Type-Options: nosniff`, and Referrer-Policy. The app has no sign-in.
- License verification endpoint rate limiting is present. An 80-request parallel burst to `GET https://api.sociobot.in/api/v1/products/owner-cash-check/verify?license=qa-invalid-token` returned 30×200 and 50×429; the first observed 429 was request 12 and every 429 had `Retry-After: 4`. Concurrent ordering prevents a precise fixed threshold claim.
- Production mobile Lighthouse on `/demo`: Performance 99, Accessibility 100, Best Practices 100, SEO 100; LCP 1.0 s, CLS 0, TBT 100 ms. The reporting browser tab crashed after the report was written, but the JSON report at `/tmp/occ-lighthouse.json` contains these completed audit results.
- Built payloads are within budget: main JS 37.48 kB (12.40 kB gzip), CSS 21.25 kB (5.48 kB gzip), self-hosted fonts 63.25 kB total; mobile hero image 15.28 kB.

## Required remediation

1. Reject a blank check-in balance before any persistence or forecast redraw; announce the exact recovery action and add a regression test.
2. Declare and run one demo-entry-point `@claim:` test for each remaining public claim, or remove the claim copy.
3. Correct the live static-host configuration so manifest MIME and unknown-path 404 behavior match `staticwebapp.config.json`.
4. Re-run this verification after deployment.

