# Sub-project B — Visual Style + Arial PPTX + Plain Tailwind — Design

**Date:** 2026-05-30
**Status:** Scoped (key decisions locked); to be planned independently
**Parent:** `2026-05-30-presizion-simplification-design.md`

## Goal

Bring presizion's look and its PowerPoint export to **vatlas parity**: the Midnight
Executive palette on web, Arial-based PPTX, and vatlas's plain-Tailwind UI idiom
(no shadcn/ui). Auto dark mode is preserved.

## Locked decisions

- **Drop shadcn/ui entirely** → plain Tailwind + `@theme` tokens + `@layer components`
  classes (`.panel`, `.label`, etc.), matching vatlas.
- **Trust Tailwind fully:** one token source via `@theme`; utility-first markup; no
  scattered hex; no parallel theming system.
- **Auto dark mode stays the default** (OS `prefers-color-scheme` + FOUC-before-paint
  class strategy), with the manual toggle retained.
- **PPTX = Arial** (body/headings) + **Consolas** (metrics), Midnight Executive palette.

## Midnight Executive palette (single source of truth)

Adopt vatlas's tokens into `src/index.css` `@theme` (oklch source, sRGB-hex mirror for
chart/PPTX modules). Key values:

| Token | sRGB hex | Use |
|---|---|---|
| primary-500 | `#3245b7` | brand primary |
| primary-300 | `#819ae9` | series 2 |
| primary-200 | `#b0c2f9` | series 3 |
| accent (gold) | `#f9b935` | factual threshold marker only — never a verdict |
| util-low / mid / high | `#4aa342` / `#ef8700` / `#df202e` | status bands |
| surface-700/800/900 | `#232933` / `#11161f` / … | dark surfaces |
| ink / inkMuted / paper | `#0f172a` / `#475569` / `#ffffff` | document neutrals |

PPTX uses the no-`#` hex form (`PPTX_COLORS`), identical values — one brand palette.

## Web restyle (drop shadcn)

Replace the 15 shadcn primitives currently in `src/components/ui/` —
`badge, button, card, checkbox, dialog, drawer, form, input, label, separator, switch,
table, tabs, textarea, tooltip` — with plain-Tailwind equivalents in vatlas's idiom.

- Static/simple primitives (badge, button, card, input, label, separator, textarea,
  table) → straightforward Tailwind component classes / small components.
- The `Form*` wrappers are react-hook-form glue → reduce to thin Tailwind label/error
  markup.

## PPTX rebuild

Restructure `src/lib/utils/exportPptx.ts` toward vatlas's engine shape:
`pptx/theme.ts` (SLIDE geometry + `PPTX_THEME`), `pptx/primitives/colors.ts`
(`PPTX_COLORS`), `pptx/slides/*`, `pptx/format.ts`. Title 28 / heading 20 / body 12 /
muted 11 Arial; metric 12 Consolas bold; `LAYOUT_WIDE` 13.333×7.5. Low text density —
the deck presents, the on-screen review carries detail.

## Files touched

`src/index.css` (theme tokens), `index.html` (FOUC script parity), all of
`src/components/ui/**` (replaced), every component importing shadcn primitives,
`src/lib/utils/exportPptx.ts` (+ new `pptx/` module), `src/lib/sizing/chartColors.ts`
(align to tokens — coordinate with C), `useThemeStore`/`ThemeToggle` (keep auto-mode).

## Open questions (resolve during B planning)

- **PDF export:** vatlas is PPTX-only. Do we **drop `jspdf`/`jspdf-autotable`/
  `exportPdf.ts`** for parity, or keep a Midnight-Executive-restyled PDF? (Materially
  changes export surface — decide first.)
- **Interactive-primitive accessibility:** shadcn's `dialog`, `tooltip`, `tabs`,
  `checkbox`, `switch`, `drawer` ride on base-ui for focus-trap/ARIA/keyboard. Plain
  Tailwind loses that. Options: (a) keep a headless a11y lib (base-ui/radix) but style
  with Tailwind tokens — "drop shadcn wrappers, keep headless behavior"; (b) hand-roll
  with care. **Recommend (a)** to avoid regressing accessibility. Confirm.
- **Drawer/tabs usage:** verify which interactive primitives are actually used post-A
  (some may become dead once the scenario card simplifies) before reimplementing them.

## Testing / verification

- Visual: dark + light render correct on all 3 wizard steps; auto-mode follows OS.
- Export: generated `.pptx` opens with Arial/Consolas and palette intact; snapshot the
  slide builder.
- A11y smoke (if option a): dialog focus-trap + escape, tooltip on focus.
- `npm run build` / `test` green.

## Out of scope

Sizing logic (A); Recharts→ECharts (C — coordinated on palette only); i18n (E).
