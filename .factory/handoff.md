# Owner Cash Check — independent verification handoff

## Verdict: **FAIL — do not release**

Candidate: `4a2ce963e22b607caf11c4789bf26e8ffaef8e90`

Live URL checked: https://owner-cash-check.sociobot.in/

Verified: 2026-08-28 UTC

The full evidence is in `.factory/verification-1.md`. No product code was modified during verification.

### Release blockers

1. `.factory/claims.json` is missing. The required claim tests therefore cannot be run from a clean checkout or demo entry point.
2. There is no visible one-click “Try it with sample data” action, demo route/data, demo banner, isolated demo storage, or `.factory/demo.md`. `/demo` is the ordinary empty onboarding.
3. Submitting the blank onboarding form stores a plan and renders a $0 “safe to spend” forecast, instead of requiring balance and reserve input.

### Evidence collected

- `npm ci`, `npm test` (5 unit + 4 Chromium tests), `npx tsc --noEmit`, `npm audit --audit-level=high`, and exact `npm run build` passed.
- Live JS and service-worker SHA-256 values exactly match the fresh candidate build.
- Live manual plan creation, item entry, CSV export, privacy routes, 390px view, keyboard basics, reduced motion, populated-state axe (0 serious/critical), and post-first-load offline reload passed without console/page errors.
- Live Lighthouse mobile: Performance 99, Accessibility 100, Best Practices 100, SEO 100; LCP 1.3 s, CLS 0, TBT 110 ms.
- The license verification API rate-limits: an 80-request burst returned 51 HTTP 429 responses with `Retry-After: 4`.

### Remaining defects to fix

- No production CSP; content-hashed assets cache for only 30 seconds rather than immutably; manifest is served as `application/octet-stream`.
- Closing a modal with Escape leaves keyboard focus on `body`, not on the control that opened it.
- Missing canonical/Open Graph/Twitter metadata, designed 404 route, required footer factory/build attribution, and independently demonstrated service-worker update transition.

### Re-verify after remediation

Run the required declared claim tests first from the implemented demo entry point, then:

```sh
npm ci
npm test
npx tsc --noEmit
npm run build
```
