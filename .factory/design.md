# Owner Cash Check — visual thesis

## Direction: the working blueprint

Owner Cash Check should feel like the sheet an owner pulls across a desk on Friday afternoon: practical, annotated, and calm enough to make one decision from. The interface borrows the logic of a blueprint drafting sheet—measured grid, ruled baselines, registration marks, handwritten annotations, and a prominent cash contour—without pretending that estimates are engineering certainties. The drawing is the plan; the numbers remain editable.

This is intentionally a single light treatment. A blueprint is a shared working artifact, and keeping the paper color explicit preserves the semantic use of blue ink, graphite, and safety orange. It also avoids making financial status change meaning between color modes.

## Palette

| Token | Value | Use |
| --- | --- | --- |
| `paper` | `#F3F0E7` | warm drafting-stock background |
| `sheet` | `#FBFAF5` | input and detail surfaces |
| `ink` | `#102A43` | primary text and structural strokes |
| `blueprint` | `#175C8C` | actions, plotted cash line, focus |
| `blueprint-dark` | `#0D466F` | accessible action hover/pressed |
| `pencil` | `#566574` | secondary copy and annotations |
| `grid` | `#C9D7DF` | drafting grid and separators |
| `safe` | `#246B52` | cash at/above reserve, always paired with label/icon |
| `warning` | `#9A4D0A` | close to reserve, paired with “tight” |
| `danger` | `#A12B2B` | below reserve, paired with “below reserve” |
| `signal` | `#B84417` | the single high-attention check-in marker; AA with white text |

All body combinations are designed for at least WCAG AA contrast. Status is never encoded by color alone.

## Type and numbers

- Interface and long-form copy: `Inter`, represented by a locally stored variable WOFF2 subset with `font-display: swap`, falling back to system sans.
- Figures and drafting labels: `IBM Plex Mono`, represented by a locally stored WOFF2 subset, falling back to ui-monospace. All financial figures use tabular numerals.
- Scale: 14px annotations, 16px body, 20px section labels, 28–34px screen headings, 44–56px key cash figure. Body leading is 1.55 and reading measure stays below 72 characters.

## Spacing and composition

- Base rhythm: 4px; principal steps: 8, 12, 16, 24, 32, 48, 64px.
- Maximum canvas: 1240px with a 24px desktop gutter and 16px phone gutter.
- The phone version stacks the readout, chart, and ledger; it omits decorative measurement labels but never forecast information.
- Panels are used only for separately actionable things: current position, 13-week drawing, schedule, and weekly check-in. Within panels, proximity and rules do the grouping.
- Controls are at least 44px high, focus uses a 3px blue outline plus paper offset, and destructive controls require a named confirmation.

## Interaction grammar

- Editing a starting assumption immediately redraws the 13-week projection; schedule additions originate in a side sheet/dialog and land in the ledger.
- The cash line is a “drawn” result, but animation is limited to a 220ms opacity/translate transition after a user change. There are no ambient loops.
- Forecast weeks are keyboard-addressable buttons. Selecting one reveals its opening balance, expected money in, committed money out, and closing balance in text.
- Reduced motion removes transforms and performs direct opacity/state changes.
- Saved state is acknowledged in a quiet live region. Offline state is a visible, reassuring header note because local editing continues to work.

## Original asset plan

### Generated hero illustration

- File: `public/assets/blueprint-cash-desk.webp` (responsive fallback derived from the source PNG).
- Use: empty/welcome composition and compact masthead illustration. It clarifies the product as a tactile weekly cash plan, not an accounting dashboard.
- Prompt sheet:
  - **Use case:** stylized-concept
  - **Subject:** top-down drafting desk with one architectural blueprint page where a clean rising-and-dipping cash contour is drawn with a mechanical pencil, a small metal ruler, two simple paper invoice slips, and one orange circular check mark token; no readable numerals or words.
  - **World/materials:** warm ivory paper fibers, cyan blueprint ink, graphite construction marks, brushed aluminum ruler, slightly worn owner-operated workshop desk.
  - **Light/lens:** soft north-window daylight, top-down 50mm editorial still life, crisp but human.
  - **Palette words:** warm drafting paper, deep navy ink, muted cyan rules, graphite, restrained safety orange.
  - **Composition:** landscape, illustration concentrated to the right with calm negative paper space on the left; no UI mockup.
  - **Negative list:** no people, hands, faces, brands, logos, readable text, watermark, currency symbols, glossy corporate 3D, neon gradient, calculators, bank cards.
- Generator: Azure AI Foundry factory image deployment via `/opt/fleet/lib/gen-image.sh`.
- Provenance: generated 2026-08-28 specifically for Owner Cash Check. Original project asset; no third-party marks or source imagery.

### Authored assets

- App icons and interface symbols are hand-authored SVG/HTML primitives using the same stroke weight and palette.
- The data chart is rendered from the owner’s local data in semantic SVG with a complete text alternative. It is functional output, not decorative stock art.

## Motion and accessibility policy

The dominant motion duration is 220ms with ease-out and only transform/opacity properties. A single 150ms pressed state supplies immediate feedback. `prefers-reduced-motion: reduce` disables smooth scroll and all transforms/transitions. Decorative imagery has empty alt text when it repeats nearby copy; the welcome hero gets concise meaningful alt text. Blueprint texture is low-contrast and never sits behind small type without an opaque paper layer.
