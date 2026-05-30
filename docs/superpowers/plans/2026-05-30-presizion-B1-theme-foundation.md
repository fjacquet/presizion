# Presizion B1 — Midnight Executive Theme Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce vatlas's Midnight Executive palette (`@theme` tokens + `.panel`/`.label` component classes) and align the chart palette to it, additively — the app keeps rendering on the existing shadcn tokens, which B2 removes.

**Architecture:** Tailwind v4 `@theme` adds a `primary-*`/`surface-*`/`util-*` color namespace that coexists with shadcn's singular `--color-primary`/`--background` semantic tokens (different names, no collision). New `@layer components` classes (`.panel`, `.label`, util-bar) mirror vatlas exactly. `chartColors.ts` is re-pointed to the brand series and gets its first unit test. Nothing is deleted in B1 — it is purely additive so it is independently shippable and low-risk.

**Tech Stack:** Tailwind v4 (`@theme`, `@layer`, `@custom-variant`), Vitest.

---

## Spec coverage

This plan covers the **palette / token-source** portion of `docs/superpowers/specs/2026-05-30-presizion-B-visual-pptx-design.md`:
- "Midnight Executive palette (single source of truth)" → Task 1
- "`.panel`, `.label`, etc." `@layer components` classes → Task 2
- "Auto dark mode stays the default … class strategy" → Task 3
- "`chartColors.ts` (align to tokens — coordinate with C)" → Task 4

Dropping shadcn primitives (B2) and the PPTX/PDF work (B3) are **out of scope** for B1.

## File structure

- `src/index.css` — add Midnight `@theme` block + `@layer components` classes; upgrade the dark `@custom-variant` to vatlas's `:where()` form. Existing shadcn token blocks stay untouched.
- `src/lib/sizing/chartColors.ts` — re-point `CHART_COLORS` to the brand series + status bands.
- `src/lib/sizing/__tests__/chartColors.test.ts` — **new** unit test locking the hex values.

---

### Task 1: Add the Midnight Executive `@theme` token block

**Files:**
- Modify: `src/index.css` (insert after line 6, the `@custom-variant` line)

- [ ] **Step 1: Upgrade the dark custom-variant to the `:where()` form**

In `src/index.css`, replace the existing variant line (line 6):

```css
@custom-variant dark (&:is(.dark *));
```

with vatlas's form (also matches the `.dark` element itself, not only its descendants):

```css
@custom-variant dark (&:where(.dark, .dark *));
```

- [ ] **Step 2: Insert the Midnight Executive `@theme` block**

Immediately after the `@custom-variant` line, insert:

```css
/* Presizion — Midnight Executive palette (matches PPTX export theme, sub-project B).
 * Additive: coexists with the shadcn `--color-*` semantic tokens below until B2
 * removes them. Tailwind v4 exposes these as `primary-500`, `surface-800`, etc. */
@theme {
  /* Navy primary scale (brand primary = primary-500 ≈ #3245b7) */
  --color-primary-50: oklch(96% 0.02 270);
  --color-primary-100: oklch(91% 0.04 270);
  --color-primary-200: oklch(82% 0.08 270);
  --color-primary-300: oklch(70% 0.12 270);
  --color-primary-400: oklch(58% 0.16 270);
  --color-primary-500: oklch(45% 0.18 270);
  --color-primary-600: oklch(36% 0.16 270);
  --color-primary-700: oklch(28% 0.14 270);
  --color-primary-800: oklch(22% 0.12 270);
  --color-primary-900: oklch(18% 0.08 270);
  --color-primary-950: oklch(12% 0.05 270);

  /* Ice blue accent for sub-text on dark */
  --color-ice: oklch(88% 0.04 240);

  /* Gold accent — factual threshold marker only, never a verdict (≈ #f9b935) */
  --color-accent-500: oklch(78% 0.16 75);

  /* Semantic utilization status bands (status only, no judgment) */
  --color-util-low: oklch(64% 0.16 142); /* green  ≈ #4aa342 */
  --color-util-mid: oklch(72% 0.18 65); /* orange ≈ #ef8700 */
  --color-util-high: oklch(58% 0.22 25); /* red    ≈ #df202e */

  /* Surface scale */
  --color-surface-50: oklch(98% 0.005 260);
  --color-surface-100: oklch(95% 0.008 260);
  --color-surface-200: oklch(88% 0.01 260);
  --color-surface-700: oklch(28% 0.02 260);
  --color-surface-800: oklch(20% 0.02 260);
  --color-surface-900: oklch(15% 0.02 260);
}
```

- [ ] **Step 3: Verify the build still compiles**

Run: `npm run build`
Expected: `tsc -b && vite build` succeeds; no Tailwind "unknown utility" errors. (We only added tokens; nothing consumes them yet.)

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat(theme): add Midnight Executive @theme tokens (additive)"
```

---

### Task 2: Add the `@layer components` panel/label/util-bar classes

**Files:**
- Modify: `src/index.css` (append a new `@layer components` block before the `@media print` block at the end)

- [ ] **Step 1: Append the component-class layer**

In `src/index.css`, immediately before the `@media print {` block (currently line 280), insert vatlas's component classes:

```css
@layer components {
  .panel {
    @apply rounded-lg border border-slate-200 bg-white p-4;
  }
  .dark .panel {
    @apply border-surface-700 bg-surface-800;
  }

  .label {
    @apply block text-sm font-medium text-slate-700;
  }
  .dark .label {
    @apply text-slate-300;
  }

  .util-bar-track {
    @apply h-2 w-full rounded-full bg-slate-200;
  }
  .dark .util-bar-track {
    @apply bg-surface-700;
  }

  .util-bar-fill {
    @apply h-full rounded-full transition-all;
  }
}
```

- [ ] **Step 2: Verify the build compiles with the new classes**

Run: `npm run build`
Expected: success — `@apply bg-surface-700` / `border-surface-700` resolve against the Task 1 tokens.

- [ ] **Step 3: Verify Biome is clean**

Run: `npx biome check src/index.css`
Expected: no new errors (warnings unchanged). Do **not** use `rtk lint` (mis-parses Biome output).

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat(theme): add .panel/.label/util-bar component classes"
```

---

### Task 3: Confirm FOUC + auto-dark parity (no behavior change needed)

The FOUC strategy already matches vatlas's intent: `index.html` runs an inline pre-paint script keyed on `localStorage['presizion-theme']` + `prefers-color-scheme` and adds `class="dark"` to `<html>`. B1 keeps the inline script (presizion's CSP differs from vatlas; do not externalize). The only change is aligning the loading-fallback background to a token that exists in both themes.

**Files:**
- Modify: `index.html:26` (loading-state inline background)

- [ ] **Step 1: Point the loading fallback at the background token**

In `index.html`, the loading `<div>` (line 26) currently uses `background:var(--color-background,#fff)`. Leave the light default but make the dark case correct by relying on the FOUC class. Replace the inline style attribute on line 26:

```html
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--color-background,#fff)">
```

with:

```html
      <div class="dark:bg-surface-900" style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--color-background,#fff)">
```

(The inline `background` is the light fallback before CSS loads; once CSS is parsed, `dark:bg-surface-900` takes over under `<html class="dark">`.)

- [ ] **Step 2: Manual verification — auto dark mode follows OS**

Run: `npm run dev`, open the app. With OS in dark mode and no stored preference, the page loads dark with no white flash. Toggle the manual switch; the preference persists across reload. With OS light, it loads light.
Expected: no FOUC; auto-mode honored; manual toggle persists.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat(theme): align loading fallback to surface token for dark FOUC"
```

---

### Task 4: Re-point the chart palette to the brand series (TDD)

The chart series becomes the Midnight primary ramp + status bands. The exact sRGB-hex mirror of the `@theme` oklch values (from the spec table and vatlas's `PPTX_COLORS`) is the single brand source shared with PPTX (B3) and ECharts (C).

**Files:**
- Modify: `src/lib/sizing/chartColors.ts`
- Test: `src/lib/sizing/__tests__/chartColors.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `src/lib/sizing/__tests__/chartColors.test.ts`:

```ts
import { expect, it } from 'vitest';
import { CHART_COLORS } from '../chartColors';

it('CHART_COLORS leads with the Midnight Executive brand series', () => {
  // Brand series shared with PPTX (PPTX_COLORS) and ECharts (sub-project C):
  // primary-500 / primary-300 / primary-200, then status bands + extra series.
  expect(CHART_COLORS[0]).toBe('#3245b7'); // primary-500 — primary bar
  expect(CHART_COLORS[1]).toBe('#819ae9'); // primary-300 — series 2
  expect(CHART_COLORS[2]).toBe('#b0c2f9'); // primary-200 — series 3
});

it('CHART_COLORS includes the utilization status bands', () => {
  expect(CHART_COLORS).toContain('#4aa342'); // util-low  (green)
  expect(CHART_COLORS).toContain('#ef8700'); // util-mid  (orange)
  expect(CHART_COLORS).toContain('#df202e'); // util-high (red)
});

it('CHART_COLORS values are all 6-digit hex', () => {
  for (const c of CHART_COLORS) {
    expect(c).toMatch(/^#[0-9a-f]{6}$/);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- chartColors`
Expected: FAIL — current `CHART_COLORS[0]` is `#3b82f6`, not `#3245b7`.

- [ ] **Step 3: Re-point the palette**

Replace the body of `src/lib/sizing/chartColors.ts`:

```ts
/**
 * Shared brand color palette for all bar charts — the Midnight Executive
 * series (sub-project B). These sRGB-hex values are the single source of
 * truth shared with the PPTX export (`pptx/primitives/colors.ts`, B3) and
 * the ECharts theme (sub-project C): primary ramp first, then status bands
 * and extra series colors.
 */
export const CHART_COLORS = [
  '#3245b7', // primary-500 — primary bar / CPU-limited
  '#819ae9', // primary-300 — series 2 / RAM-limited
  '#b0c2f9', // primary-200 — series 3 / Disk-limited
  '#4aa342', // util-low (green)
  '#ef8700', // util-mid (orange)
  '#df202e', // util-high (red)
] as const;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- chartColors`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full suite — no chart consumer broke**

Run: `npm run test`
Expected: all green (757+ tests). Any snapshot asserting the old `#3b82f6` chart hex must be updated to the new brand hex in the same commit.

- [ ] **Step 6: Commit**

```bash
git add src/lib/sizing/chartColors.ts src/lib/sizing/__tests__/chartColors.test.ts
git commit -m "feat(theme): re-point chart palette to Midnight Executive brand series"
```

---

## Self-review

- **Spec coverage:** palette tokens (T1), component classes (T2), auto-dark/FOUC (T3), chartColors (T4) — all covered. shadcn removal and PPTX/PDF are intentionally deferred to B2/B3.
- **Placeholder scan:** none — every step has concrete CSS/TS.
- **Type consistency:** `CHART_COLORS` stays a `readonly` tuple of `#`-prefixed lowercase hex; the test's regex and the PPTX module's no-`#` form (B3) are deliberately different representations of the same brand values.
- **Risk note:** B1 is additive; the only visible change is chart colors. If a Recharts snapshot test encodes the old hex, update it in Task 4 Step 5.
