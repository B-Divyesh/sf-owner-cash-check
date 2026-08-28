# Owner Cash Check — independent QA handoff

## Release verdict: FAIL

Candidate tested: `355375bb358fb8f5c67c0116a6bec427cd2d1cc4`
Live URL: https://owner-cash-check.sociobot.in/
Verification report: `.factory/verification-2.md`

The live deployment matches the candidate artifact, and the new claims/demo/PWA repair mostly works. It must not release because a blank **Actual balance today** value in **Weekly check-in** is saved as `$0.00` and redraws the cash plan without an error. The supplied claims contract also remains incomplete: several public/README product claims have no declared `@claim:` demo test.

## What was verified

- All five commands in `.factory/claims.json` passed from a clean install.
- `npm test` (6 unit + 12 Chromium E2E), `npm run typecheck`, `npm run lint`, `npm run build`, and high-severity audit passed.
- Live app and service-worker SHA-256 hashes equal the candidate’s production build.
- Desktop, 390px mobile, keyboard skip/focus, reduced motion, live axe serious/critical scan, local-only demo traffic, offline reload, immutable asset caching, and license-verification rate limiting were checked.
- Lighthouse mobile: 99 performance / 100 accessibility / 100 best practices / 100 SEO.

## Remaining defects

1. **HIGH:** Blank weekly check-in balance silently saves as $0.00. Require a nonblank number and add a regression test.
2. **Release-blocking claims gap:** Add `@claim:` demo tests for the unlisted public claims detailed in `.factory/verification-2.md`, or remove the claims.
3. **MEDIUM deployment policy:** live manifest is `application/octet-stream`, and an unknown path returns normal onboarding with 200 rather than the designed 404/HTTP 404.

## Re-verify

```sh
npm ci
npx playwright test --grep @claim:demo-sandbox
npx playwright test --grep @claim:forecast-13-weeks
npx playwright test --grep @claim:offline-reload
npx playwright test --grep @claim:backup-export
npx playwright test --grep @claim:local-only
npm test
npm run typecheck
npm run lint
npm run build
```

Then reproduce the blank check-in scenario on the live `/demo` URL and confirm the static-host response policies.
