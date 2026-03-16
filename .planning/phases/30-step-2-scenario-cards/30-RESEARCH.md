# Phase 30: Step 2 Scenario Cards - Research

**Researched:** 2026-03-16
**Domain:** Tailwind v4 responsive grid layout — Step 2 components
**Confidence:** HIGH

## Summary

Phase 30 makes Step 2 (Define Target Scenarios) fully usable on a 390px phone. The work is purely presentational — no Zustand stores, no sizing formulas, no new dependencies. Four components need Tailwind class changes, and one (ScenarioResults) needs a grid fix plus font-size consideration for mono formula strings.

The card container layout is already tab-based (one card visible at a time via shadcn Tabs), so CARD-01 (full-width stacking) is effectively satisfied by the existing Tabs implementation — scenarios are never side-by-side. The remaining requirements are all internal grid collapses within a single visible card.

**Primary recommendation:** Apply mobile-first Tailwind grid pattern (`grid-cols-1 sm:grid-cols-2`) across four grids in three files. No structural changes. No new components. No new dependencies.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CARD-01 | Scenario cards stack full-width on mobile (no side-by-side) | Tabs architecture already shows one card at a time; Step2Scenarios header row needs `flex-col sm:flex-row` |
| CARD-02 | Server config grid (sockets/cores/RAM/disk) collapses to 2-column on mobile | ScenarioCard line 237: `grid grid-cols-2 sm:grid-cols-4` — change base to `grid-cols-1`, add `sm:grid-cols-2 md:grid-cols-4` |
| CARD-03 | Sizing assumptions grid collapses to 2-column on mobile | ScenarioCard line 326: same `grid grid-cols-2 sm:grid-cols-4` pattern — same fix |
| CARD-04 | VsanGrowthSection internal grids are responsive at 390px | VsanGrowthSection line 68: `grid-cols-2 sm:grid-cols-3`; line 223: `grid-cols-3` — both need mobile-first fix |
| CARD-05 | SPEC lookup search input and results panel are usable on mobile | SpecResultsPanel already has `overflow-x-auto` + `min-w-max` — verify usability; Input is full-width already |
</phase_requirements>

## Standard Stack

No new libraries. All changes use existing stack.

### Core (unchanged)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind v4 | 4.x | Responsive utility classes | Project standard |
| React 19 | 19.x | Component rendering | Project standard |
| shadcn/ui | latest | Card, Input, Button, Tabs | Already installed |

### Installation
No new packages needed.

## Architecture Patterns

### CARD-01: Step2Scenarios Header — Already Mostly Done

The card container is shadcn `<Tabs>` which shows one `<TabsContent>` at a time. Scenarios are never side-by-side — the concern is only the header row (title + "Add Scenario" button).

**Current Step2Scenarios header (line 18-45):**
```tsx
// Current — flex row, always side-by-side
<div className="flex items-center justify-between">
  <div>
    <h2>Step 2: Define Target Scenarios</h2>
    ...
  </div>
  <Button>Add Scenario</Button>
</div>
```

**Fix:**
```tsx
// Mobile-first: stack on xs, row on sm+
<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
```

The `<Card className="w-full">` on ScenarioCard already ensures full-width — no change needed there.

### CARD-02: Server Config Grid

**Current (ScenarioCard.tsx line 237):**
```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
```

At 390px with `grid-cols-2`, each of the 4 fields (Sockets, Cores, RAM, Disk) gets ~175px minus gaps. Labels like "Sockets/Server" and "RAM/Server GB" overflow at this width. The fix:

```tsx
// Mobile: 1-col (full width, comfortable label); sm: 2-col; md: 4-col
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
```

Note: when `layoutMode === 'disaggregated'`, the Disk field is hidden, leaving 3 fields. The grid collapses correctly regardless — no conditional logic needed.

### CARD-03: Sizing Assumptions Grid

**Current (ScenarioCard.tsx line 326):**
```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
```

Same pattern as server config. The number of visible fields varies by `sizingMode`:
- `vcpu` mode: ratio + RAM/VM + Disk/VM + Headroom + CPU Util + RAM Util = up to 6 fields
- `specint` mode: RAM/VM + Disk/VM + Headroom + RAM Util = 4 fields
- `aggressive` mode: RAM/VM + Disk/VM + Headroom + CPU Util + RAM Util = 5 fields
- `ghz` mode: RAM/VM + Disk/VM + Headroom + CPU Util + RAM Util = 5 fields

The grid change is the same regardless of mode:
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
```

The HA Reserve toggle row is outside this grid (its own `mt-4` div) — no change needed there.

### CARD-04: VsanGrowthSection Grids

Two grids need fixing.

**vSAN settings grid (VsanGrowthSection.tsx line 68) — 5 fields: FTT, Compression, Slack, CPU Overhead, Memory/Host:**
```tsx
// Current
<div className="grid grid-cols-2 sm:grid-cols-3 gap-4">

// Fix — 1-col mobile, 2-col sm, 3-col md
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
```

**Growth projections grid (VsanGrowthSection.tsx line 223) — 3 fields: CPU, Memory, Storage Growth %:**
```tsx
// Current — 3 columns on all sizes, cramped at 390px
<div className="grid grid-cols-3 gap-4">

// Fix — 1-col mobile, 3-col sm+
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
```

The VM Swap toggle (Switch + Label) is outside both grids — already a flex row with no overflow risk.

### CARD-05: SPEC Results Panel — Already Functional

**SpecResultsPanel.tsx (Phase 29 already delivered this):**
```tsx
// Line 58-88 — already has overflow-x-auto + min-w-max
<div className="overflow-x-auto">
  <table className="min-w-max w-full text-sm">
```

The search `<Input>` in both vcpu and specint modes is a block-level element — full-width by default. No change needed.

The collapsible button and "SPECrate2017 Results" label are full-width (`w-full`). No overflow risk.

**CARD-05 status: already complete from Phase 29.** Verify passes without code changes.

### Pattern: Mobile-First Tailwind Grid
```tsx
// Wrong (desktop-biased — 2 cols even at 390px):
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

// Right (mobile-first):
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
```

Tailwind v4 breakpoints: `sm` = 640px, `md` = 768px. Unprefixed class is the mobile default.

### Anti-Patterns to Avoid

- **Using `sm:grid-cols-1`:** Does not affect 390px — `sm:` applies only at 640px+. Always set the mobile base without prefix.
- **Changing sizing logic:** CARD requirements are purely visual. `src/lib/sizing/` must not be touched.
- **Adding `overflow-x: hidden` inside a card:** The SpecResultsPanel must be allowed to scroll horizontally — do not add overflow-hidden on any parent of SpecResultsPanel.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Responsive breakpoints | Custom CSS media queries | Tailwind `sm:` / `md:` prefixes | Already in build, zero overhead |
| Tab-based card switching | Custom state machine | shadcn Tabs (already used) | Already implemented |

## Common Pitfalls

### Pitfall 1: Forgetting the Aggressive Mode Banner
**What goes wrong:** The amber `<Info>` banner in the Sizing Assumptions section (lines 318-324 of ScenarioCard) is a flex row outside the grid. At 390px it is fine — no overflow. But if changes accidentally wrap it inside the grid div, it breaks.
**Prevention:** The banner div stays outside and above the `<div className="grid ...">` — maintain this structure.

### Pitfall 2: ScenarioResults grid-cols-3 Formula Strings
**What goes wrong:** ScenarioResults line 77 has `grid grid-cols-3 gap-3`. At 390px, each column is ~118px. The `font-mono` formula strings (lines 83-105) like `ceil(240 × 1.2 / 4.0 / 48)` can overflow their column.
**What to check:** The architecture doc recommends `grid-cols-1 sm:grid-cols-3`. Formula string font size may need `text-xs` (already `text-xs` at line 83) or `break-all`.
**How to avoid:** Change `grid grid-cols-3 gap-3` to `grid grid-cols-1 sm:grid-cols-3 gap-3`. The formula divs already have `text-xs font-mono` — this may be sufficient at single-column width.

### Pitfall 3: HA Reserve Toggle Width on Mobile
**What goes wrong:** The HA Reserve toggle (lines 395-415) uses `w-fit` on the button group. At 390px the three buttons "N (None)", "N+1", "N+2" together are ~180px which fits comfortably. No change needed — verify visually.
**Warning sign:** If the three buttons wrap to separate lines, add `gap-0` and ensure `flex-nowrap`.

### Pitfall 4: Button Sizes in Card Header
**What goes wrong:** Duplicate and Remove buttons use `size="sm"` (~32px height), which is below the 44px WCAG minimum established in Phase 28.
**What to check:** Phase 28 decisions used CSS child selectors rather than modifying components. For these card action buttons, either upgrade to `size="default"` or add explicit `min-h-[44px]`.
**Recommendation:** Change `size="sm"` to `size="icon"` with `h-9 w-9` (consistent with Phase 29 ScopeBadge fix) — icon buttons at 36px are reasonable when the card provides additional tap area context. This is a judgment call; document whatever is chosen.

## Code Examples

### Verified Grid Pattern — Server Config (CARD-02)

```tsx
// ScenarioCard.tsx — before
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

// ScenarioCard.tsx — after
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
```

### Verified Grid Pattern — Sizing Assumptions (CARD-03)

```tsx
// ScenarioCard.tsx — before (line 326)
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

// After
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
```

### Verified Grid Pattern — vSAN Settings (CARD-04, first grid)

```tsx
// VsanGrowthSection.tsx — before (line 68)
<div className="grid grid-cols-2 sm:grid-cols-3 gap-4">

// After
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
```

### Verified Grid Pattern — Growth Projections (CARD-04, second grid)

```tsx
// VsanGrowthSection.tsx — before (line 223)
<div className="grid grid-cols-3 gap-4">

// After
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
```

### Verified Grid Pattern — ScenarioResults (needed for CARD-01)

```tsx
// ScenarioResults.tsx — before (line 77)
<div className="grid grid-cols-3 gap-3 text-sm">

// After
<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
```

### Step2Scenarios Header Fix (CARD-01)

```tsx
// Step2Scenarios.tsx — before (line 18)
<div className="flex items-center justify-between">

// After
<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Desktop-only grid sizing | Mobile-first with `sm:` overrides | Phase 28-29 standard | Apply same pattern to Step 2 |
| Fixed-height elements | dvh + touch targets | Phase 28 | No action for Step 2 |

**Already done (do not re-implement):**
- `overflow-x: hidden` on body (Phase 28)
- SpecResultsPanel `min-w-max` scroll (Phase 29)
- Form inputs `font-size: 16px` for iOS no-zoom (Phase 28 global CSS)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + React Testing Library |
| Config file | `vite.config.ts` (vitest inline) |
| Quick run command | `rtk vitest run src/components/step2` |
| Full suite command | `rtk vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CARD-01 | Step2Scenarios header stacks on mobile | visual/manual | N/A — CSS class change only | N/A |
| CARD-02 | Server config grid is 1-col at 390px | visual/manual | N/A — CSS class change only | N/A |
| CARD-03 | Sizing assumptions grid is 1-col at 390px | visual/manual | N/A — CSS class change only | N/A |
| CARD-04 | VsanGrowthSection grids are 1-col at 390px | visual/manual | N/A — CSS class change only | N/A |
| CARD-05 | SPEC results panel scrolls on mobile | smoke | `rtk vitest run src/components/common/__tests__/SpecResultsPanel.test.tsx` | ✅ |

**Important:** All CARD-01 through CARD-04 requirements are pure CSS class changes — Tailwind responsive grids are not testable with RTL unit tests (jsdom has no real CSS engine). Acceptance is visual verification at 390px using Chrome DevTools or a physical device.

### Sampling Rate
- **Per task commit:** `rtk vitest run src/components/step2`
- **Per wave merge:** `rtk vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all automated tests for this phase. The SpecResultsPanel test file exists. CARD-01 through CARD-04 are CSS-only and verified visually.

## File Inventory — What Changes

| File | Lines to Change | Change |
|------|----------------|--------|
| `src/components/step2/Step2Scenarios.tsx` | Line 18 | Header flex → `flex-col gap-2 sm:flex-row sm:items-center sm:justify-between` |
| `src/components/step2/ScenarioCard.tsx` | Line 237 | Server config grid → `grid-cols-1 sm:grid-cols-2 md:grid-cols-4` |
| `src/components/step2/ScenarioCard.tsx` | Line 326 | Sizing assumptions grid → `grid-cols-1 sm:grid-cols-2 md:grid-cols-4` |
| `src/components/step2/VsanGrowthSection.tsx` | Line 68 | vSAN settings grid → `grid-cols-1 sm:grid-cols-2 md:grid-cols-3` |
| `src/components/step2/VsanGrowthSection.tsx` | Line 223 | Growth projections grid → `grid-cols-1 sm:grid-cols-3` |
| `src/components/step2/ScenarioResults.tsx` | Line 77 | Results breakdown grid → `grid-cols-1 sm:grid-cols-3` |
| `src/components/common/SpecResultsPanel.tsx` | None | Already correct (Phase 29) — verify only |

Total: 6 line-level changes across 4 files. Zero new files. Zero new dependencies.

## Sources

### Primary (HIGH confidence)
- Direct source file inspection: `src/components/step2/ScenarioCard.tsx` — grid classes at lines 237, 326 confirmed
- Direct source file inspection: `src/components/step2/VsanGrowthSection.tsx` — grid classes at lines 68, 223 confirmed
- Direct source file inspection: `src/components/step2/ScenarioResults.tsx` — grid class at line 77 confirmed
- Direct source file inspection: `src/components/step2/Step2Scenarios.tsx` — header flex at line 18 confirmed
- Direct source file inspection: `src/components/common/SpecResultsPanel.tsx` — `overflow-x-auto` + `min-w-max` confirmed present
- `.planning/research/ARCHITECTURE.md` — mobile pattern guidance (Phase 28-29 reference)

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — Phase 29 decisions: SpecResultsPanel `min-w-max` delivered in Phase 29
- Tailwind v4 breakpoints: `sm` = 640px confirmed in ARCHITECTURE.md

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — direct source file inspection, no inference
- Architecture: HIGH — all grid classes found, exact line numbers known
- Pitfalls: HIGH — learned from Phase 28-29 (STATE.md decisions log)
- CARD-05 status: HIGH — `min-w-max` + `overflow-x-auto` confirmed in SpecResultsPanel.tsx

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable codebase, no external dependencies changing)
