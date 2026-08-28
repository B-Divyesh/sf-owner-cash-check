# Owner Cash Check

Owner Cash Check gives an owner-operated business one weekly answer: what cash is committed, what is expected, and what remains safe to spend across the next 13 weeks. It is a small planning tool—not a bank feed, accounting ledger, or financial adviser.

Live product: <https://owner-cash-check.sociobot.in>

## What it does

- Projects a daily low and weekly closing balance from today’s cash, dated outgoings, expected invoices, and an owner-chosen reserve.
- Labels incoming estimates as confirmed, likely, or possible and flags every week that drops below reserve.
- Records weekly actual-balance check-ins and preserves a small revision history.
- Stores the plan in IndexedDB, works offline as an installable PWA, and never asks for bank credentials.
- Exports readable JSON/CSV or a password-encrypted JSON backup; restores JSON and encrypted backups.
- Keeps the complete manual forecast free. A $19 one-time Plus license unlocks weekly/monthly repeat scheduling through Sociobot billing.

## Run and verify

Requirements: Node.js 20+ and npm.

```sh
npm ci
npm run dev
npm test
npm run build
```

`npm test` runs unit tests plus Chromium end-to-end, axe accessibility, persistence, and offline tests. The exact production command is `npm run build`; deploy the generated `dist/` directory, whose root contains `index.html`. Preview it with `npm run preview`.

Playwright is pinned to 1.58.2. If its browser is not already available, run `npx playwright install chromium`.

## Privacy and purchase behavior

Financial entries never leave the browser. Only a Plus license token is sent to `api.sociobot.in` for verification, at most once daily. Checkout is hosted by Sociobot/Dodo; no payment provider is embedded. See [/privacy](https://owner-cash-check.sociobot.in/privacy/) and [/terms](https://owner-cash-check.sociobot.in/terms/).

The product brief lives in `.factory/brief.json` when supplied by the factory. The product-specific visual system and generated-art provenance are in `.factory/design.md`.

## License

MIT — see `LICENSE`.
