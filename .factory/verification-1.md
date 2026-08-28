# Independent verification — FAIL

- **Candidate:** `4a2ce963e22b607caf11c4789bf26e8ffaef8e90`
- **Live URL:** https://owner-cash-check.sociobot.in/
- **Verified:** 2026-08-28 (UTC)
- **Method:** clean candidate checkout; production build; fresh Chromium contexts against the live deployment. No product code was changed.

## Release decision

**FAIL — do not release this candidate.** The required claim-test contract is absent, there is no one-click isolated sample-data demo, and blank monetary inputs silently create a $0 cash plan. Any one of the first two findings is explicitly release-blocking under the work order.

## Mandatory first gates

| Gate | Result | Evidence |
| --- | --- | --- |
| Claims manifest and every listed test | **FAIL / BLOCKER** | `.factory/claims.json` does not exist in the clean checkout. Consequently there were no declared commands to run and no observable claim tests using the demo entry point. The claims skill makes a missing manifest release-blocking. |
| Cold first-read | **FAIL / BLOCKER** | A fresh live load says “Know what’s committed. Know what’s safe.” and asks for a balance, reserve, date, and currency. It gives a reasonable owner-oriented description, but has no “Try it with sample data” action. The live DOM contained 0 matching sample-data actions and 0 demo banners. |
| Demo sandbox | **FAIL / BLOCKER** | No `/demo` implementation or `.factory/demo.md` exists. Direct `https://owner-cash-check.sociobot.in/demo` returns the ordinary empty onboarding at `/demo`, with no sample records, persistent “Demo — sample data, nothing is saved” banner, reset control, separate storage namespace, or real-data isolation. |

The following testable public claims are also unlisted because the required claims manifest is absent: works offline, exports JSON/CSV/encrypted backup, “no tracking” / financial plan stays in the browser, and daily license verification. They must either have a sandbox-observable test entry or be removed from the copy.

## Blocking product defect

### HIGH — blank required money fields create a misleading $0 forecast

In a fresh live context, submitting the untouched onboarding form produced the dashboard headed “Your 13-week cash plan,” with Cash today, 13-week low, and reserve all `$0.00`; no error was announced. The cause is `Number('') === 0` in the input parser combined with `novalidate`. This is an unsafe recovery path for a cash-decision product: omitted data is presented as a valid plan.

Reproduction: open `/` in a new browser profile, submit the empty setup form, and observe the $0 dashboard. Expected: stay on setup and announce that balance and reserve are required.

## Other defects and contract gaps

### MEDIUM — production has no Content-Security-Policy and does not cache hashed assets immutably

Live responses for `/`, `/assets/main-JXZ_0cBV.js`, `/sw.js`, manifest, and policy pages have HSTS, `X-Content-Type-Options`, and Referrer-Policy, but no `Content-Security-Policy`. Every checked asset is served as `Cache-Control: public, must-revalidate, max-age=30`, including the content-hashed JS. This does not meet the PWA/static requirement for a CSP and long-lived immutable hashed-asset caching. The manifest is also delivered as `application/octet-stream`, rather than a manifest JSON media type.

### MEDIUM — dialog focus is not restored to its invoking control

Keyboard opening “Add cash item” opens a modal and moves focus inside it. Pressing Escape closes the dialog but leaves `document.activeElement` as `BODY`, not the Add cash item button. This fails the required dialog focus-management smoke test and makes keyboard continuation less predictable.

### LOW — required site-structure metadata/routes are incomplete

The app has title, language, one main, and one h1, but lacks canonical, Open Graph/Twitter metadata, a real 404 route, the required footer “Built by Param Factory” and build id, and `staticwebapp.config.json`. `/demo` and unknown client paths are served as the app shell rather than a designed 404 or demo route.

### UNVERIFIED — service-worker update transition

Offline reload was independently exercised successfully. A new deployment version was not available during verification, so the waiting-worker/update-toast transition could not be observed end to end. The code contains the intended message and controller-change path, but this does not replace a version-to-version deployment test.

## Checks that passed

### Clean checkout and build

Commands run from this candidate checkout:

```sh
npm ci
npm test
npx tsc --noEmit
npm audit --audit-level=high
npm run build
```

- Install completed with 0 audited vulnerabilities.
- `npm test` passed: 5 Vitest tests and 4 Chromium Playwright tests.
- `npx tsc --noEmit` passed. There is no lint script in `package.json`.
- Exact production build passed and produced `dist/`. Main JS: 34.55 kB (11.54 kB gzip); CSS: 20.31 kB (5.30 kB gzip); local fonts total 63.25 kB. These are within the stated static budgets.

### Live deployment identity and browser smoke

- SHA-256 of live `/assets/main-JXZ_0cBV.js` exactly matched `dist/assets/main-JXZ_0cBV.js`: `fa3c30b018fc7f327f1809f02d7f90476ee8b4617da18516bba8a83626eb8088`.
- SHA-256 of live `/sw.js` exactly matched the build output: `4e751e5249b611aad09e571259d5c0e6ced49553d1679c087198c19c07eff0f5`.
- The live normal flow successfully created a $10,000/$2,500 plan, added a $4,200 outgoing due 2026-08-29, showed the $5,800 weekly low, and downloaded CSV with one header and one record. No console or page errors occurred.
- Normal-flow network capture contained only same-origin app assets. No financial-entry request left the browser. The billing endpoint was not invoked because no license was used.
- Fresh live pages have a title, `lang="en"`, one h1 and one main; direct `/privacy/` and `/terms/` returned 200.
- At a 390×844 viewport there was no horizontal page overflow. Keyboard skip link received a visible solid focus outline and navigated to `#main`; modal opening worked. Reduced motion was honored (`transition-duration: 0.01ms`).
- Live axe scan of the populated dashboard and Data & ownership dialog found 0 serious/critical violations. (This does not negate the focus-return defect above.)
- Fresh-context service worker check: controlled by `https://owner-cash-check.sociobot.in/sw.js`; after initial load and reload, `context.setOffline(true)` reload rendered the app shell and visible offline banner without errors.

### Performance

Independent Lighthouse 12.8.2 mobile run against the live URL:

| Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 99 | 100 | 100 | 100 | 1.3 s | 0 | 110 ms |

### Server-side endpoint rate limiting

The only product server-side call is license verification at `https://api.sociobot.in/api/v1/products/owner-cash-check/verify`. A single invalid-token request returned 200 JSON `{ "valid": false, "reason": "invalid" }` with `Cache-Control: no-store`. An 80-request rapid burst produced 29 `200` responses and 51 `429` responses, each 429 carrying `Retry-After: 4`. A follow-up probe while the window remained active returned 429 with `Retry-After: 1` after two accepted requests. Rate limiting is therefore present; the exact steady-state threshold cannot be inferred from the overlapping cooldown window.

## Required remediation before re-verification

1. Add `.factory/claims.json`; add exactly one runnable demo-entry-point test for every public claim; run all of them clean.
2. Add `/demo` (or `?demo=1`) with one-click realistic sample data, a persistent demo banner/reset/start-real controls, documented separate storage namespace, and `.factory/demo.md`.
3. Reject blank setup balance and reserve before storing or drawing a forecast; add a regression test.
4. Restore focus to the invoking control after every dialog close.
5. Configure a restrictive working CSP, immutable caching for content-hashed assets, correct manifest content type, and the outstanding site metadata/404 requirements.
6. Re-run an actual old-SW/new-SW update flow after a deployment version changes.
