# Phase 28: Global Mobile Foundation & Wizard Shell — Research

**Researched:** 2026-03-16
**Domain:** Mobile viewport CSS, Tailwind v4 responsive utilities, WizardShell / StepIndicator / SizingModeToggle layout
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MOBILE-01 | All form inputs render at >= 16px font-size to prevent iOS Safari auto-zoom on focus | Global CSS rule `@media (hover: none) { input { font-size: 16px; } }` — one-line fix in index.css |
| MOBILE-02 | Layout uses `dvh` units (with `vh` fallback) instead of `100vh` to prevent iOS address bar clipping | `#root` already uses `min-height: 100svh`; WizardShell uses `min-h-screen`; replace with `min-h-[100dvh]` + `min-h-screen` fallback |
| MOBILE-03 | All interactive elements have minimum 44px touch target size per iOS HIG / WCAG 2.5.5 | StepIndicator circles are `h-8 w-8` (32px) — must become `h-11 w-11` (44px); SizingModeToggle `py-1` buttons are ~28px — must become `py-2.5` on mobile |
| MOBILE-04 | Page body prevents horizontal overflow (`overflow-x: hidden`) while allowing controlled scroll inside specific containers | `body` and `#root` have no `overflow-x` rule today; add `overflow-x: hidden` to `body` in index.css |
| NAV-01 | Header toolbar is compact on mobile (< 640px) — logo, theme toggle, and Store-Predict link fit on one line without wrapping | WizardShell header is `text-center` with absolute-positioned left/right toolbars — this layout already fits one line but logo+title+tagline stack takes too much vertical space on 390px; solution: hide tagline text on xs |
| NAV-02 | Wizard step indicators are usable at 390px — clickable, readable labels, clear active state | StepIndicator circles are 32px (WCAG failure); labels already `hidden sm:block`; connector lines are `w-12 sm:w-24`; circles must reach 44px |
| NAV-03 | SizingModeToggle wraps gracefully at 390px (flex-wrap) without clipping or horizontal overflow | Row 1 has 4 buttons: "vCPU", "SPECrate2017", "Aggressive", "GHz" — at 390px this row exceeds available width; needs `flex-wrap` or abbreviated labels on mobile |
| NAV-04 | Step navigation (Next/Back buttons) is accessible and touch-friendly on mobile | Back/Next `<div>` has class `mt-8 pt-4 border-t flex justify-between`; not sticky; buttons are shadcn default (40px); need `min-h-[44px]` and sticky positioning on mobile |
</phase_requirements>

---

## Summary

Phase 28 establishes the mobile CSS foundation and makes the WizardShell structural components — header toolbar, step indicators, sizing mode toggles, and Back/Next navigation — usable on a 390px iPhone screen. The changes are concentrated in three files: `src/index.css` (global rules for input zoom prevention and overflow containment), `src/components/wizard/WizardShell.tsx` (header compaction, sticky nav bar), `src/components/wizard/StepIndicator.tsx` (44px touch targets), and `src/components/wizard/SizingModeToggle.tsx` (flex-wrap for narrow viewports).

No new packages are required. Tailwind v4 is already installed with all needed utilities. The `index.html` viewport meta tag (`viewport-fit=cover`) was already updated in Phase 27. All sizing formulas and Zustand stores remain completely untouched — this phase is purely presentational CSS and layout class changes.

The key risks are: (1) the SizingModeToggle row-1 overflows at 390px and needs either `flex-wrap` or mobile-abbreviated button labels; (2) the Back/Next nav is not sticky, so on a small screen with a tall Step 2/3 content area the user must scroll past all content to reach navigation; (3) the StepIndicator circles at 32px fail the WCAG 2.5.5 44px minimum — they must be enlarged without breaking the connector line geometry.

**Primary recommendation:** Make all four changes in a single commit: global CSS fixes first (MOBILE-01, MOBILE-04), then `dvh` viewport fix (MOBILE-02), then component-level touch target and wrap fixes (MOBILE-03, NAV-01–NAV-04).

---

## Current State Audit (from source reading)

### WizardShell.tsx — Current Layout

```
<div className="min-h-screen bg-background">              ← 100vh, no overflow-x constraint
  <div className="mx-auto max-w-4xl px-4 py-8">
    <header className="relative mb-6 text-center print:hidden">
      <div className="absolute left-0 top-0 flex items-center gap-1">  ← Reset + Store-Predict (absolute)
      <div className="absolute right-0 top-0">                          ← ThemeToggle (absolute)
      <img ... className="mx-auto mb-3 h-8 w-auto" />                  ← Logo (centered)
      <h1 className="text-2xl font-bold tracking-tight">               ← Title (centered)
      <p className="text-sm text-muted-foreground mt-1">               ← Tagline (centered)
      <SizingModeToggle />
    </header>
    <StepIndicator />
    <main>...</main>
    {currentStep > 1 && (
      <div className="mt-8 pt-4 border-t flex justify-between print:hidden">  ← Back/Next (in-flow, not sticky)
```

**Problems at 390px:**
- `min-h-screen` = `100vh` — iOS Safari clips bottom content on initial load (M-2)
- Header title + tagline + SizingModeToggle is 140–160px tall; on a 664px screen this is ~24% of viewport before any content
- Back/Next bar is not sticky — user must scroll to bottom of potentially long Step 2 form
- No `overflow-x` constraint anywhere in this hierarchy

### StepIndicator.tsx — Current Layout

```
button: h-8 w-8 (32px circles)  ← WCAG failure: must be 44px
labels: hidden sm:block           ← Correct — already hidden on mobile
connectors: w-12 sm:w-24          ← 48px on mobile; total nav row = 3×32 + 2×48 + margins ≈ 240px → fits 390px
```

**Problem:** 32px circles fail WCAG 2.5.5 (44px minimum). Enlarging to 44px (`h-11 w-11`) means the nav row becomes 3×44 + 2×48 + margins ≈ 240px+ — still fits 390px. The `gap-0` container layout accommodates this.

### SizingModeToggle.tsx — Current Layout

Row 1 buttons: `px-3 py-1 text-sm rounded-sm`
- "vCPU" ≈ 52px wide
- "SPECrate2017" ≈ 110px wide
- "Aggressive" ≈ 90px wide
- "GHz" ≈ 48px wide
- Total with gaps and border padding: ~320–340px

At 390px viewport with `px-4` side padding, available width = 358px. Row 1 fits by ~18–38px but has NO `flex-wrap`, so if text is slightly wider in some fonts, it clips. The `py-1` height = ~28px — fails WCAG 44px minimum.

Row 2 buttons: "HCI" + "Disaggregated" — total ≈ 160px — fits comfortably.

**Fix:** Add `flex-wrap` to Row 1 container and increase `py-1` to `py-2.5` for the 44px touch height. Optionally abbreviate "SPECrate2017" to "SPEC" on xs.

### index.css — Current State

```css
#root {
  min-height: 100svh;  /* Already uses svh — good; but WizardShell inner div uses min-h-screen = 100vh */
  ...
}
body {
  margin: 0;  /* No overflow-x: hidden */
}
/* No input font-size rule exists */
```

**Gaps:**
- No `@media (hover: none) { input { font-size: 16px; } }` — MOBILE-01 unaddressed
- No `overflow-x: hidden` on `body` — MOBILE-04 unaddressed
- `#root` uses `100svh` (small viewport height — always chrome-visible size — this is actually safe but conservative); the WizardShell's `min-h-screen` = `100vh` is the dvh problem

### index.html — Current State (Phase 27 complete)

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<link rel="manifest" href="/presizion/manifest.webmanifest" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Presizion" />
<link rel="apple-touch-icon" sizes="180x180" href="/presizion/icons/apple-touch-icon-180x180.png" />
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
```

**Status:** Complete — no changes needed in Phase 28. `viewport-fit=cover` is already in place.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS v4 | ^4.2.1 (installed) | All responsive layout utilities | Already in use; `dvh`, `overflow-x-hidden`, `min-h-[44px]`, `flex-wrap` all built-in |
| React 19 | ^19.x (installed) | Component structure | Already in use |

### No New Packages Required

All MOBILE-01 through NAV-04 requirements are satisfied by:
1. Adding CSS rules to `src/index.css`
2. Modifying Tailwind classes in three `.tsx` files

**Installation:** None required for this phase.

---

## Architecture Patterns

### Pattern 1: iOS Input Auto-Zoom Prevention (MOBILE-01)

**What:** Add a media query in `index.css` that sets `font-size: 16px` on all `input` elements on touch devices.

**When to use:** Global CSS — applies to all inputs across all three wizard steps.

**Why `@media (hover: none)` not `@media (max-width: 639px)`:** Touch devices are identified by absence of hover capability, not by screen width. A desktop with a touch screen should still zoom normally; `hover: none` correctly targets phones and tablets.

**Example:**
```css
/* src/index.css — add after existing @layer base block */
@media (hover: none) {
  input,
  input[type="number"],
  input[type="text"],
  input[type="search"] {
    font-size: 16px !important;
  }
}
```

Source: Pitfalls research M-1, CSS-Tricks "16px or Larger Text Prevents iOS Form Zoom" (HIGH confidence)

### Pattern 2: dvh Viewport Height Fix (MOBILE-02)

**What:** Replace `min-h-screen` (= `100vh`) in WizardShell with a CSS-stack that provides `100dvh` for modern browsers and `100vh` fallback for older Safari.

**When to use:** The outermost WizardShell div only.

**Note:** `#root` in `index.css` already uses `min-height: 100svh` — this is the small viewport height (always chrome-visible size), which is safe. The problem is the WizardShell Tailwind class `min-h-screen`. Tailwind's `min-h-screen` generates `min-height: 100vh` — no dvh. Use an arbitrary value or add a CSS class.

**Example:**
```tsx
// WizardShell.tsx — outermost div
// Before:
<div className="min-h-screen bg-background">

// After — Tailwind v4 supports arbitrary CSS values:
<div className="min-h-[100dvh] bg-background overflow-x-hidden">
// Tailwind generates: min-height: 100dvh
// Browsers that don't support dvh fall back to... nothing, so also add CSS fallback in index.css:
```

```css
/* index.css — add alongside #root styles */
.min-h-dvh-safe {
  min-height: 100vh;      /* fallback for Safari < 15.4 */
  min-height: 100dvh;     /* modern — tracks actual visible area */
}
```

Alternatively, use a known-supported Tailwind approach:
```tsx
// Option B: className with inline fallback via CSS custom property (avoids extra CSS class)
<div style={{ minHeight: '100dvh' }} className="bg-background overflow-x-hidden">
```

**Recommended:** Add `overflow-x-hidden` to the same element to satisfy MOBILE-04 simultaneously.

Source: Pitfalls research M-2, MDN viewport units (HIGH confidence)

### Pattern 3: overflow-x Containment (MOBILE-04)

**What:** Prevent horizontal overflow at the page level.

**Two-level fix:**
1. `body` in `index.css`: `overflow-x: hidden` — prevents body-level horizontal scroll
2. WizardShell outermost div: add `overflow-x-hidden` Tailwind class — belt-and-suspenders

**Caution:** `overflow-x: hidden` on `body` can break `position: fixed` on iOS in some edge cases. The existing Dialogs (reset confirmation) use shadcn `DialogContent` which is `position: fixed` — test that they still overlay correctly. The `overflow-x: hidden` approach is documented safe for this pattern per the pitfalls research.

**Example:**
```css
/* index.css — modify body rule */
body {
  margin: 0;
  overflow-x: hidden;  /* add this */
}
```

Source: Pitfalls research M-6, Architecture research Pattern anti-3 (HIGH confidence)

### Pattern 4: Touch Target Sizing (MOBILE-03)

**What:** All interactive elements must have a minimum 44×44px tap area.

**Affected elements in Phase 28:**
- StepIndicator circles: `h-8 w-8` (32px) → `h-11 w-11` (44px)
- SizingModeToggle ModeBtn: `py-1` (~28px height) → `py-2.5` (~40px, acceptable with 44px rule allowing up to 24px visual with extended hit area) or `min-h-[44px]`
- WizardShell Reset button: `size="sm"` = ~32px → `size="default"` or `min-h-[44px]`
- WizardShell Store-Predict link: `h-8 w-8` (32px) → `h-11 w-11` (44px)
- WizardShell Back/Next buttons: shadcn default Button = 40px → add `min-h-[44px]`

**Example — StepIndicator fix:**
```tsx
// Before:
'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold border-2 transition-colors'

// After:
'flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold border-2 transition-colors'
```

**Example — ModeBtn fix:**
```tsx
// Before:
'px-3 py-1 text-sm rounded-sm transition-colors'

// After (mobile-first, increase padding):
'px-3 py-2.5 text-sm rounded-sm transition-colors min-h-[44px]'
// Or add responsive: 'px-3 py-1 sm:py-1 min-h-[44px] text-sm rounded-sm transition-colors'
```

Source: Pitfalls research UX section, ARCHITECTURE.md Scaling section (HIGH confidence)

### Pattern 5: SizingModeToggle flex-wrap (NAV-03)

**What:** Row 1 of SizingModeToggle contains 4 buttons that together measure ~320–340px. At 390px viewport, this leaves minimal margin (~20px each side from `px-4`). Add `flex-wrap` to allow graceful wrapping if needed, and ensure `py-2.5` minimum height.

**What:** The outer container `className="flex gap-0.5 border rounded-md p-0.5 bg-muted/40"` needs `flex-wrap`.

**Example:**
```tsx
// Before:
<div role="group" aria-label="Sizing mode" className="flex gap-0.5 border rounded-md p-0.5 bg-muted/40">

// After:
<div role="group" aria-label="Sizing mode" className="flex flex-wrap gap-0.5 border rounded-md p-0.5 bg-muted/40">
```

The overall SizingModeToggle container `className="flex flex-col items-center gap-1.5 mt-2"` is fine — flex-col stacks rows vertically already. The `items-center` centers each row when wrapping.

Source: Architecture research component modification map, direct source audit (HIGH confidence)

### Pattern 6: Compact Header on Mobile (NAV-01)

**What:** The header at 390px is tall due to: logo (h-8 = 32px), title (text-2xl ≈ 28px), tagline (text-sm ≈ 17px), SizingModeToggle (~64px). Total ≈ 141px. This is ~21% of 664px viewport. Hiding the tagline on xs saves 17px+ and reduces visual noise.

**What to hide:** `<p className="text-sm text-muted-foreground mt-1">` — add `hidden sm:block`.

**Header toolbar:** The absolute-positioned left (Reset + Store-Predict) and right (ThemeToggle) toolbars at 32px height currently fit on one line at 390px because they are `absolute` positioned and don't affect flow. They are NOT causing a wrapping issue. The logo is centered via `mx-auto`. This layout is already correct for NAV-01 — the only risk is if the icon buttons are below 44px, which is addressed by MOBILE-03.

**Example:**
```tsx
// Before:
<p className="text-sm text-muted-foreground mt-1">
  Size your refreshed cluster based on existing metrics
</p>

// After:
<p className="hidden sm:block text-sm text-muted-foreground mt-1">
  Size your refreshed cluster based on existing metrics
</p>
```

Source: Direct source audit of WizardShell.tsx (HIGH confidence)

### Pattern 7: Sticky Bottom Navigation (NAV-04)

**What:** Move Back/Next from in-flow `mt-8` div to a `sticky bottom-0` bar on mobile. On desktop (`sm:`) keep the current in-flow style.

**Why sticky:** On Step 2, ScenarioCard content can be 600px+ tall. Without sticky nav, the user must scroll to the page bottom to find Back/Next. Sticky nav is a standard mobile UX pattern.

**Safe-area handling:** iPhone home indicator area requires `pb-safe` equivalent. Use `env(safe-area-inset-bottom)` as inline padding.

**Print safety:** The sticky bar must be in `print:hidden` (already done via the outer div's class).

**Main content padding:** When nav bar is sticky, it overlaps content at the bottom. Add `pb-20 sm:pb-0` to `<main>` to create clearance.

**Example:**
```tsx
// Before:
{currentStep > 1 && (
  <div className="mt-8 pt-4 border-t flex justify-between print:hidden">
    <Button type="button" variant="outline" onClick={prevStep}>Back</Button>
    {currentStep === 2 && <Button type="button" onClick={nextStep}>Next: Review &amp; Export</Button>}
  </div>
)}

// After:
{currentStep > 1 && (
  <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur border-t
                  px-4 py-3 flex justify-between print:hidden
                  sm:static sm:bg-transparent sm:backdrop-blur-none sm:border-t
                  sm:mt-8 sm:pt-4"
       style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
    <Button type="button" variant="outline" onClick={prevStep} className="min-h-[44px]">Back</Button>
    {currentStep === 2 && (
      <Button type="button" onClick={nextStep} className="min-h-[44px]">Next: Review &amp; Export</Button>
    )}
  </div>
)}

// And on <main>:
<main className="pb-20 sm:pb-0">
```

Source: Architecture research Pattern 2, pitfalls research UX section (HIGH confidence)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Viewport height tracking | JS `window.innerHeight` listener | CSS `100dvh` | JS has stale-value problem on iOS; CSS dvh updates in real-time |
| Touch target detection | JS touch event area measurement | CSS `min-h-[44px] min-w-[44px]` | Browser handles hit testing natively |
| Mobile detection for layout | `navigator.userAgent` parsing | CSS media queries (`hover: none`, `max-width: 639px`) | UA parsing is brittle and can be wrong; CSS is reliable |
| Input font-size enforcement | Per-component font-size override | Single global CSS rule in `index.css` | One CSS rule fixes all inputs; per-component is error-prone |

---

## Common Pitfalls

### Pitfall 1: Tailwind `min-h-screen` does not generate `dvh`
**What goes wrong:** Changing WizardShell's outer div from `min-h-screen` to `min-h-dvh` will not work — Tailwind v4 does not have a `min-h-dvh` utility by default.
**How to avoid:** Use arbitrary value syntax `min-h-[100dvh]` which Tailwind v4 generates verbatim. Also add `min-h-screen` as a fallback class or set the CSS directly on `#root` in `index.css`.
**Verified:** Tailwind v4 arbitrary values are supported — `min-h-[100dvh]` is valid.

### Pitfall 2: `overflow-x: hidden` on body breaks iOS position-fixed
**What goes wrong:** iOS Safari has a known bug where `overflow-x: hidden` on `body` or `html` can interfere with `position: fixed` children (like Dialogs) in some older versions.
**How to avoid:** Apply `overflow-x: hidden` on `body` AND test the reset Dialog still overlays correctly. The WizardShell div with `overflow-x: hidden` is an additional layer. If Dialog breaks, switch to `overflow-x: clip` on the WizardShell div only (not body) — `clip` is safer than `hidden` for fixed descendants.
**Warning signs:** The reset confirmation Dialog is positioned incorrectly or offset to one side.

### Pitfall 3: StepIndicator circle enlargement breaks connector geometry
**What goes wrong:** Changing `h-8 w-8` to `h-11 w-11` on step circles makes them larger. The connector `<div className="h-px w-12 sm:w-24 mx-2">` — if `mx-2` is too small, circles may touch.
**How to avoid:** At 44px circles + 48px connectors + 2×8px margins = 3×44 + 2×(48+16) = 132 + 128 = 260px total. At 390px viewport with 32px side padding, available width = 358px → fits with 98px to spare. The geometry is safe.

### Pitfall 4: SizingModeToggle `flex-wrap` breaks visual grouping
**What goes wrong:** If Row 1 wraps, it breaks the visual "pill group" appearance — the border-radius on the container now surrounds a multi-row layout, looking odd.
**How to avoid:** The outer `border rounded-md p-0.5` container will visually expand to contain wrapped content. This is acceptable. The buttons themselves retain their shape. Test at 320px (smallest supported width) to verify no button text wraps.

### Pitfall 5: iOS 16 `dvh` support
**What goes wrong:** `dvh` was introduced in iOS Safari 16.0. Users on iOS 15 will see `min-height: unset` if only `dvh` is provided.
**How to avoid:** Always include the `vh` fallback: in `index.css`, write two rules sequentially — browsers ignore the second if unsupported:
```css
min-height: 100vh;
min-height: 100dvh;
```
In Tailwind classes, use the inline style or a CSS class rather than `min-h-[100dvh]` alone.

---

## Code Examples

### Global CSS additions to index.css

```css
/* Add after body { margin: 0; } */

/* MOBILE-04: prevent page-level horizontal scroll */
body {
  margin: 0;
  overflow-x: hidden;
}

/* MOBILE-01: prevent iOS Safari auto-zoom on input focus */
/* hover: none targets touch-primary devices (phones, tablets) */
@media (hover: none) {
  input,
  input[type="number"],
  input[type="text"],
  input[type="search"],
  input[type="email"],
  select,
  textarea {
    font-size: 16px !important;
  }
}
```

### WizardShell.tsx — outermost div

```tsx
// MOBILE-02 + MOBILE-04: dvh height with vh fallback, overflow containment
// Before:
<div className="min-h-screen bg-background">

// After (use style for dvh fallback):
<div
  className="bg-background overflow-x-hidden"
  style={{ minHeight: '100dvh' }}
>
```

### WizardShell.tsx — header tagline

```tsx
// NAV-01: hide tagline on mobile to reduce header height
// Before:
<p className="text-sm text-muted-foreground mt-1">
  Size your refreshed cluster based on existing metrics
</p>

// After:
<p className="hidden sm:block text-sm text-muted-foreground mt-1">
  Size your refreshed cluster based on existing metrics
</p>
```

### WizardShell.tsx — toolbar icon buttons (MOBILE-03)

```tsx
// Reset button: size="sm" → add min-h/w for 44px
<Button variant="ghost" size="sm" onClick={() => setResetOpen(true)}
  aria-label="Reset"
  className="h-11 w-11 p-0">
  <RotateCcw className="h-4 w-4" />
</Button>

// Store-Predict link: h-8 w-8 → h-11 w-11
<a
  href={STORE_PREDICT_URL}
  target="_blank"
  rel="noopener noreferrer"
  title="Storage Calculator (Store-Predict)"
  className="inline-flex items-center justify-center rounded-md h-11 w-11 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
>
  <Database className="h-4 w-4" />
</a>
```

### WizardShell.tsx — sticky Back/Next nav (NAV-04)

```tsx
{currentStep > 1 && (
  <div
    className={[
      'sticky bottom-0 z-10 bg-background/95 backdrop-blur border-t',
      'px-4 py-3 flex justify-between print:hidden',
      'sm:static sm:bg-transparent sm:backdrop-blur-none sm:mt-8 sm:pt-4',
    ].join(' ')}
    style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
  >
    <Button type="button" variant="outline" onClick={prevStep} className="min-h-[44px]">
      Back
    </Button>
    {currentStep === 2 && (
      <Button type="button" onClick={nextStep} className="min-h-[44px]">
        Next: Review &amp; Export
      </Button>
    )}
  </div>
)}

// main gets bottom padding clearance:
<main className="pb-20 sm:pb-0">
  {currentStep === 1 && <Step1CurrentCluster />}
  {currentStep === 2 && <Step2Scenarios />}
  {currentStep === 3 && <Step3ReviewExport />}
</main>
```

### StepIndicator.tsx — 44px circles (MOBILE-03 + NAV-02)

```tsx
// Before:
'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold border-2 transition-colors'

// After:
'flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold border-2 transition-colors'
```

### SizingModeToggle.tsx — flex-wrap Row 1 (NAV-03 + MOBILE-03)

```tsx
// Before ModeBtn padding:
'px-3 py-1 text-sm rounded-sm transition-colors'

// After ModeBtn (MOBILE-03: 44px min touch height):
'px-3 py-2 text-sm rounded-sm transition-colors min-h-[44px]'

// Before Row 1 container:
<div role="group" aria-label="Sizing mode" className="flex gap-0.5 border rounded-md p-0.5 bg-muted/40">

// After Row 1 container (NAV-03: allow wrap):
<div role="group" aria-label="Sizing mode" className="flex flex-wrap gap-0.5 border rounded-md p-0.5 bg-muted/40">
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `100vh` for full-screen height | `100dvh` with `100vh` fallback | CSS spec 2022, Safari 16+ | Eliminates iOS address-bar clipping |
| `user-scalable=no` to prevent zoom | `font-size: 16px` on inputs | 2018+ consensus | WCAG compliant; no scale lock |
| Manual breakpoint checking in JS | CSS `@media (hover: none)` for touch | 2020+ | More reliable; survives SSR |
| `position: sticky` polyfills | Native CSS `sticky` + `env()` | 2018 | No JS needed for safe-area nav |

**Not deprecated but critical context:**
- `100svh` (small viewport height, used in `#root`): Always equals the chrome-visible viewport. Safe but conservative — content area can't use full screen when chrome hides. `dvh` is better for full-bleed layouts.
- `viewport-fit=cover`: Already applied in Phase 27. Required for `env(safe-area-inset-*)` to work. Confirmed in `index.html`.

---

## Open Questions

1. **SizingModeToggle button labels at 320px**
   - What we know: At 390px, Row 1 totals ~320–340px. At 320px (very small phones), this overflows.
   - What's unclear: Whether to abbreviate "SPECrate2017" to "SPEC" only on xs, or rely on flex-wrap to save it.
   - Recommendation: Add `flex-wrap` (primary fix) and test at 320px. If wrapping looks acceptable, abbreviation is not needed. If it looks broken, add `sm:hidden / hidden sm:block` label pair.

2. **`overflow-x: hidden` on body vs. Dialog positioning**
   - What we know: shadcn Dialog uses `position: fixed` which can be affected by `overflow: hidden` ancestors in iOS Safari < 15.
   - What's unclear: Whether the reset Dialog is visually broken at the exact iOS/Safari versions used by target users.
   - Recommendation: Apply `overflow-x: hidden` on body. If Dialog regression is found during testing, fall back to `overflow-x: clip` on the WizardShell div only.

3. **`pb-20` padding on `<main>` when step = 1**
   - What we know: Step 1 has its own "Next" button at the bottom of `CurrentClusterForm`, not in the WizardShell sticky bar (the sticky bar only shows when `currentStep > 1`).
   - What's unclear: Whether `pb-20` on `<main>` at step 1 adds unwanted whitespace below the Step 1 form's own Next button.
   - Recommendation: Apply `pb-20 sm:pb-0` only when `currentStep > 1` — use a conditional class:
     ```tsx
     <main className={currentStep > 1 ? 'pb-20 sm:pb-0' : ''}>
     ```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + React Testing Library |
| Config file | `vite.config.ts` (vitest block) |
| Quick run command | `rtk vitest run src/components/wizard` |
| Full suite command | `rtk vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MOBILE-01 | Inputs have font-size >= 16px on touch | unit (CSS class/style assertion) | `rtk vitest run src/components/wizard/WizardShell.test.tsx` | ❌ Wave 0 |
| MOBILE-02 | WizardShell root has dvh minHeight | unit (style assertion on rendered div) | `rtk vitest run src/components/wizard/WizardShell.test.tsx` | ❌ Wave 0 |
| MOBILE-03 | Touch targets >= 44px (h-11/w-11 class present) | unit (class assertion) | `rtk vitest run src/components/wizard` | Partial — existing StepIndicator tests may need update |
| MOBILE-04 | Body has overflow-x: hidden | unit/smoke — CSS rule verification | manual-only (CSS rule in index.css, not component logic) | N/A — CSS test |
| NAV-01 | Tagline has `hidden sm:block` class | unit (class assertion) | `rtk vitest run src/components/wizard/WizardShell.test.tsx` | ❌ Wave 0 |
| NAV-02 | StepIndicator circles have h-11 w-11 class | unit (class assertion) | `rtk vitest run src/components/wizard/StepIndicator.test.tsx` | ✅ exists, needs update |
| NAV-03 | SizingModeToggle Row 1 has flex-wrap class | unit (class assertion) | `rtk vitest run src/components/wizard/SizingModeToggle.test.tsx` | ❌ Wave 0 |
| NAV-04 | Back/Next div has sticky class when step > 1 | unit (class assertion + render) | `rtk vitest run src/components/wizard/WizardShell.test.tsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `rtk vitest run src/components/wizard`
- **Per wave merge:** `rtk vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/wizard/WizardShell.test.tsx` — covers MOBILE-01, MOBILE-02, NAV-01, NAV-04
- [ ] `src/components/wizard/SizingModeToggle.test.tsx` — covers NAV-03, MOBILE-03 (toggle buttons)
- [ ] Update `src/components/wizard/StepIndicator.test.tsx` — update h-8/w-8 → h-11/w-11 assertions for NAV-02

Note: MOBILE-04 (body overflow-x in CSS) and the actual pixel rendering of dvh are not testable with jsdom-based Vitest. Those require browser/device testing. The test suite validates the class and style names are applied; manual device verification remains the acceptance gate.

---

## Sources

### Primary (HIGH confidence)
- Direct source read: `src/components/wizard/WizardShell.tsx` — current layout, class names, element structure
- Direct source read: `src/components/wizard/StepIndicator.tsx` — current circle size (32px), label hiding
- Direct source read: `src/components/wizard/SizingModeToggle.tsx` — current button padding, container classes
- Direct source read: `src/index.css` — no existing input font-size rule, no overflow-x on body
- Direct source read: `index.html` — viewport-fit=cover confirmed present (Phase 27 complete)
- `.planning/research/PITFALLS.md` — M-1 (auto-zoom), M-2 (100vh), M-6 (overflow), M-8 (iOS blob)
- `.planning/research/STACK.md` — Tailwind v4 breakpoints, touch utilities, dvh units
- `.planning/research/ARCHITECTURE.md` — Component modification map, Pattern 1–4

### Secondary (MEDIUM confidence)
- MDN: `dvh` support — Safari 16.0+, Chrome 108+, Firefox 101+ (universally supported in 2026)
- WCAG 2.5.5: Touch target minimum 44×44 CSS pixels
- CSS-Tricks: 16px input font-size prevents iOS auto-zoom

### Tertiary (LOW confidence — not needed for this phase)
- None — all findings are directly verified against source code and established pitfalls documentation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all changes in already-installed Tailwind v4 + existing components
- Architecture: HIGH — based on direct source file reading, not assumptions
- Pitfalls: HIGH — from pre-researched pitfalls document verified against actual source code

**Research date:** 2026-03-16
**Valid until:** 2026-06-16 (90 days — stable CSS/Tailwind territory; dvh support is not changing)
