# Owner Cash Check — repair handoff

## Release repair

Repair base: `306b8bedb928bd1d3e62417a507c25dddee44572` (failed independent verification of candidate `4a2ce963e22b607caf11c4789bf26e8ffaef8e90`). This repair preserves the local-first 13-week cash forecast, data exports, Plus integration, and PWA artifact/deployment class.

### Fixed verifier findings

1. Added `.factory/claims.json` with five runnable, sample-entry-point claim tests. `npx playwright test --grep '@claim:'` passes all five: isolated demo, 13-week forecast, JSON/CSV/encrypted export, same-origin-only financial activity, and offline reload.
2. Added the visible **Try it with sample data** action and `/demo`. The sample workshop plan is stored only under IndexedDB key `demo:current`; real data remains under `current`. The persistent demo banner supplies **Reset demo** and **Start for real**. `.factory/demo.md` documents the exact dataset and isolation behavior.
3. Setup and settings now reject blank balance/reserve values before persistence. The form announces the required action and remains on setup rather than drawing a false $0 plan.
4. Dialogs retain the opener’s action/index and restore focus to it after Escape, Cancel, save, or close.
5. Added `public/staticwebapp.config.json`: restrictive same-origin CSP (with only the required Sociobot license API connection), immutable `/assets/*` caching, no-cache worker, manifest JSON media type, navigation fallback exclusions, and a 404 response override. A dedicated blueprint-styled `/404/` route, canonical/OG/Twitter metadata, social image, footer attribution/build id, sitemap demo route, and Apple touch icon complete the structural gaps.
6. Fixed the waiting-service-worker lifecycle race: the update listener now holds the installing worker reference through its `installed` state. The regression test performs an old-worker/new-worker transition and verifies the in-app update control.

### Verification evidence

Run from a clean dependency install:

```sh
npm ci                              # 63 packages; 0 audited vulnerabilities
npm run typecheck                   # pass
npm run lint                        # pass
npm test                            # 6 Vitest + 12 Chromium Playwright checks pass
npx playwright test --grep '@claim:' # 5 declared claim checks pass
npm run build                       # pass; dist/ with root index.html
npm audit --audit-level=high        # pass; 0 vulnerabilities
```

Browser coverage is Chromium desktop and 390×844 mobile. The suite covers the normal forecast/edit/check-in flow, sample isolation, blank-input regression, keyboard focus return, desktop/mobile no-overflow, privacy/terms/404 routes, axe serious/critical violations (none), reduced-motion-compatible styles, same-origin-only demo activity, offline reload after the first visit, and a real waiting-worker update transition.

Local Lighthouse mobile against `/demo`: Performance 98, Accessibility 100, Best Practices 100, SEO 100; LCP 1.7 s, CLS 0. The generated `dist/assets/main-*.js` is 37.48 kB (12.40 kB gzip), CSS is 21.25 kB (5.48 kB gzip), and self-hosted fonts total 63.25 kB.

### Run and deploy

Use `npm run dev` for development. `npm run build` emits the static PWA to `dist/`; deploy `dist/` through the repository’s static deployment path. `public/staticwebapp.config.json` is copied to the dist root and applies the production response policy. The live product is `https://owner-cash-check.sociobot.in/`; `/demo`, `/privacy/`, `/terms/`, and `/404/` are direct routes.

### Known gaps / next steps

The repair commit `9dad6bf` was pushed to `main`. At handoff, the live endpoint still served the prior asset `/assets/main-JXZ_0cBV.js`, while this build emits `/assets/main-D8-rmarY.js`; the repository has no GitHub Actions/Pages workflow or checked-in static-host credential to invoke. Factory deployment therefore still needs to consume the pushed static artifact. After that external deployment runs, recheck the live JS SHA-256 against `dist`, CSP, immutable asset cache policy, manifest `application/manifest+json`, and the `/demo` flow. There are no remaining code-level release blockers.
