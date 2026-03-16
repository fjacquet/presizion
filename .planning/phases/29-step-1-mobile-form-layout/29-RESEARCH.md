# Phase 29: Step 1 Mobile Form Layout - Research

**Researched:** 2026-03-16
**Domain:** Tailwind v4 responsive CSS + shadcn Drawer + base-ui Dialog — all within existing React 19 + Vitest stack
**Confidence:** HIGH

## Summary

Phase 29 makes Step 1 usable on a 390px phone. The work is surgical: add Tailwind responsive prefixes to four components, swap one Dialog for a conditional Dialog/Drawer, and ensure the SpecResultsPanel table scrolls horizontally rather than clipping. No new runtime dependencies are needed for the form grid work; the Drawer component (vaul via shadcn) must be installed fresh because `src/components/ui/drawer.tsx` does not yet exist.

The critical discovery from reading source files: `CurrentClusterForm.tsx` already uses correct mobile-first class patterns for all its grids (`grid-cols-1 sm:grid-cols-3`, `grid-cols-1 sm:grid-cols-2`). The only grid that needs adjustment there is the "Existing Server Config" section, which has a 3-column `sm:` breakpoint but renders 4 fields — on `sm` screens the 4th field wraps naturally. This is acceptable behavior. The real work concentrates on: `Step1CurrentCluster` header row, `FileImportButton` touch target, `DerivedMetricsPanel` grid verification, `SpecResultsPanel` table overflow, and `ImportPreviewModal` Drawer conversion.

The `ImportPreviewModal` currently uses **base-ui `Dialog`** (not shadcn `Dialog`) — this is a critical architectural distinction. The Drawer must come from shadcn (vaul-based). The two co-exist without conflict but the conditional render needs to import from two different libraries.

**Primary recommendation:** Install shadcn Drawer, add `useIsMobile` hook inside `ImportPreviewModal`, wrap `SpecResultsPanel` table in `overflow-x-auto` with a `min-w-max` inner table, fix `FileImportButton` to `size="default"` for 44px touch target, fix `Step1CurrentCluster` header to stack on mobile, verify `DerivedMetricsPanel` `grid-cols-2 sm:grid-cols-5` renders acceptably at 390px.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FORM-01 | Form fields stack to single-column layout on screens < 640px (currently grid-cols-2/3/4) | CurrentClusterForm already uses grid-cols-1 sm:grid-cols-N — verify all 4 sections; Step1CurrentCluster header row needs flex-col on mobile |
| FORM-02 | DerivedMetricsPanel grid collapses to 2-3 columns on mobile (currently 5-column) | Already uses grid-cols-2 sm:grid-cols-5 — base mobile value is already 2 cols; verify 390px rendering is acceptable |
| FORM-03 | SPEC results panel table is horizontally scrollable on mobile if it overflows | SpecResultsPanel has overflow-x-auto wrapper but table uses w-full without min-width — add min-w-max to inner table |
| FORM-04 | ImportPreviewModal renders as a bottom Drawer on mobile (< 640px), Dialog on desktop | Modal uses base-ui Dialog; need shadcn Drawer installed + useIsMobile hook for conditional render |
| FORM-05 | File import button and scope badge are accessible and readable at 390px | FileImportButton uses size="sm" (~32px) — needs size="default" for 44px; ScopeBadge label may truncate long cluster names |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS v4 | ^4.2.1 | Responsive class utilities (sm: prefix = 640px) | Already installed; sm: breakpoint = 40rem is the 390px→640px boundary |
| shadcn/ui Drawer | (via `npx shadcn@latest add drawer`) | Bottom sheet on mobile for ImportPreviewModal | Official shadcn component wrapping vaul; matches existing shadcn Dialog pattern |
| vaul | (peer dep of drawer) | Headless accessible drawer/bottom-sheet | Powers shadcn Drawer; handles gestures, aria, focus trap |
| base-ui Dialog | ^1.3.0 (already installed) | Desktop path for ImportPreviewModal | Already used — keep for desktop render |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React `window.matchMedia` | built-in | `useIsMobile` hook for conditional Drawer/Dialog | Only in ImportPreviewModal; do not add a global breakpoint lib |
| Vitest + RTL | ^4.1.0 / ^16.3.2 | Test that grids + drawer render correctly | Existing setup covers all component tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn Drawer (vaul) | Radix Sheet (`side="bottom"`) | Sheet is already available (no install) but lacks gesture/drag handle UX; Drawer is the correct mobile pattern per FEATURES.md research |
| `useIsMobile` hook | CSS-only (`@container`) | Container queries don't control conditional component mounting (Dialog vs Drawer are different DOM trees); JS hook required |

**Installation:**
```bash
npx shadcn@latest add drawer
```
This adds `src/components/ui/drawer.tsx` and installs `vaul` as a dep.

## Architecture Patterns

### Recommended Project Structure
```
src/
  components/
    step1/
      Step1CurrentCluster.tsx      # modify: stack header row on mobile
      CurrentClusterForm.tsx       # verify only: grids already mobile-first
      DerivedMetricsPanel.tsx      # verify: grid-cols-2 sm:grid-cols-5 (OK as-is)
      FileImportButton.tsx         # modify: size="default" for 44px touch target
      ScopeBadge.tsx               # modify: truncate long labels with max-w + truncate
      ImportPreviewModal.tsx       # structural: add useIsMobile + Drawer path
    common/
      SpecResultsPanel.tsx         # modify: min-w-max on inner <table>
    ui/
      drawer.tsx                   # NEW: installed by shadcn add drawer
```

### Pattern 1: Mobile-First Grid — Already Done in CurrentClusterForm

**What:** The form already applies `grid-cols-1 sm:grid-cols-N` everywhere. This is the correct Tailwind v4 pattern.

**Verification needed:** Read all 4 sections in `CurrentClusterForm.tsx` — confirmed:
- "Cluster Totals": `grid grid-cols-1 sm:grid-cols-3` — CORRECT
- "Existing Server Config": `grid grid-cols-1 sm:grid-cols-3` with 4 fields (4th wraps) — ACCEPTABLE
- "Current Utilization": `grid grid-cols-1 sm:grid-cols-2` — CORRECT
- "SPECrate2017 Mode": `grid grid-cols-1 sm:grid-cols-2` — CORRECT
- "GHz Mode": `grid grid-cols-1 sm:grid-cols-2` — CORRECT

**Conclusion:** FORM-01 for `CurrentClusterForm` itself is already complete. The remaining FORM-01 work is the `Step1CurrentCluster` header row.

**Example (Step1CurrentCluster header — needs fix):**
```tsx
// Before (causes horizontal overflow at 390px when title is long):
<div className="flex items-start justify-between">
  <div>
    <h2 className="text-xl font-semibold">Step 1: Enter Current Cluster</h2>
    <p className="text-sm text-muted-foreground mt-1">...</p>
  </div>
  <FileImportButton />
</div>

// After (stack vertically on mobile, side-by-side on sm+):
<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
  <div>
    <h2 className="text-xl font-semibold">Step 1: Enter Current Cluster</h2>
    <p className="text-sm text-muted-foreground mt-1">...</p>
  </div>
  <FileImportButton />
</div>
```

### Pattern 2: SpecResultsPanel Table Overflow (FORM-03)

**What:** The table has `overflow-x-auto` on the wrapper div but the inner `<table>` uses `w-full` without a minimum width. On 390px with 5 columns (Vendor, System, Base Score, Cores, Chips), `w-full` collapses all columns to tiny widths rather than triggering scroll.

**When to use:** Any table inside an `overflow-x-auto` wrapper that has 4+ columns with data that should not wrap.

**Example:**
```tsx
// Before (collapses at 390px):
<div className="overflow-x-auto">
  <table className="w-full text-sm">

// After (scrolls at 390px):
<div className="overflow-x-auto">
  <table className="min-w-max w-full text-sm">
```

**Alternative:** Use explicit column widths with `<colgroup>`. But `min-w-max` is simpler and sufficient for a read-only results table.

### Pattern 3: Conditional Dialog/Drawer for ImportPreviewModal (FORM-04)

**What:** `ImportPreviewModal` currently uses `base-ui Dialog` (not shadcn Dialog). On mobile < 640px, replace with shadcn Drawer (vaul bottom sheet). On desktop, keep the base-ui Dialog. Both share the same content via a shared `content` variable.

**Critical distinction:** The existing Dialog import is from `@base-ui/react/dialog`, NOT from `@/components/ui/dialog`. The new Drawer comes from `@/components/ui/drawer` (shadcn). These are entirely separate libraries and can co-exist.

**When to use:** Only ImportPreviewModal. The ScopeBadge dialog is small and simple enough to remain as shadcn Dialog on all viewports.

**Example:**
```tsx
// Add at top of ImportPreviewModal.tsx:
import { useEffect, useState } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer'
import { Dialog } from '@base-ui/react/dialog'  // existing import unchanged

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 639px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

// In ImportPreviewModal component:
const isMobile = useIsMobile()

if (isMobile) {
  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Import Preview</DrawerTitle>
          <DrawerDescription>Review the extracted data before populating the form.</DrawerDescription>
        </DrawerHeader>
        {/* ... scope selector + data summary ... */}
        <DrawerFooter className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply}>Apply</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

// Existing base-ui Dialog path unchanged:
return (
  <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
    ...
  </Dialog.Root>
)
```

**SSR safety:** The `typeof window !== 'undefined'` guard in the `useState` initializer prevents crashes in test environments and potential SSR contexts.

### Pattern 4: FileImportButton Touch Target (FORM-05)

**What:** `FileImportButton` uses `size="sm"` on the Button, which renders at ~32px height. iOS HIG minimum is 44px. The fix is `size="default"` which renders at 40px, or add `min-h-[44px]` explicitly.

**Example:**
```tsx
// Before (32px — too small for touch):
<Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={loading}>

// After (40px with default size — acceptable; or add min-h-[44px] for strict WCAG):
<Button variant="outline" onClick={() => inputRef.current?.click()} disabled={loading}>
```

Note: Phase 28 already handled 44px touch targets on wizard chrome. The MOBILE-03 requirement covers all interactive elements. FileImportButton is in Step 1 content, not wizard chrome, so it was not caught in Phase 28.

### Pattern 5: ScopeBadge Label Truncation (FORM-05)

**What:** `ScopeBadge` shows `activeLabels` which is a comma-joined list of all active scope labels (e.g., "DataCenter1||Cluster-Prod (4 hosts), DataCenter1||Cluster-Dev (2 hosts)"). At 390px this string can overflow the flex row.

**Current code:**
```tsx
<div className="flex items-center gap-2 text-sm text-muted-foreground">
  <span>
    <span className="font-medium text-foreground">Scope:</span>{' '}
    {activeLabels}
  </span>
  <Button variant="ghost" size="sm" ...>
```

**Fix:** Add `truncate` and `max-w` to the label span, or wrap to a new line.

```tsx
// Option A — truncate with ellipsis:
<span className="truncate max-w-[200px] sm:max-w-none">
  <span className="font-medium text-foreground">Scope:</span>{' '}
  {activeLabels}
</span>

// Option B — wrap entire badge to flex-col on mobile:
<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 text-sm text-muted-foreground">
```

Option A (truncate) is simpler and keeps the edit button on the same line. The user can open the dialog to see full labels.

### Anti-Patterns to Avoid

- **Using `sm:grid-cols-1` to "reset" for mobile:** `sm:` applies at 640px+. On 390px the unprefixed class applies. Always write `grid-cols-1` (no prefix) as the mobile base.
- **Forgetting `min-w-max` on overflow tables:** `overflow-x-auto` on the wrapper without `min-w-max` on the inner table causes column collapse, not scroll.
- **Mutating sizing logic for mobile layout:** `src/lib/sizing/` and Zustand stores must not be touched. Layout changes are CSS-only.
- **Adding `useIsMobile` globally:** Keep the hook local to `ImportPreviewModal.tsx` — it should not become a shared utility for this phase. If it's needed in Phase 30/31, extract then.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bottom sheet / mobile drawer | Custom slide-up animation | shadcn Drawer (vaul) | Focus trap, gesture handling, aria-modal, iOS overscroll-behavior all handled |
| Breakpoint detection | Resize event listener with debounce | `window.matchMedia` with `addEventListener('change', ...)` | Native API, no resize loop, fires only on breakpoint cross |
| Touch target padding | Custom CSS wrapper divs | `size="default"` on shadcn Button | Built-in 40px height in default size; cleaner than wrapper approach |

**Key insight:** The Drawer is the only non-trivial addition. Everything else is one-to-three class changes per component.

## Common Pitfalls

### Pitfall 1: ImportPreviewModal Dialog Library Confusion
**What goes wrong:** Developer imports from `@/components/ui/dialog` (shadcn) instead of `@base-ui/react/dialog` — the existing modal uses base-ui Dialog, not the shadcn one.
**Why it happens:** Two Dialog implementations exist in the project. `src/components/ui/dialog.tsx` is the shadcn Dialog used in ScopeBadge; `@base-ui/react/dialog` is used directly in ImportPreviewModal.
**How to avoid:** Keep the existing `import { Dialog } from '@base-ui/react/dialog'` for the desktop path. Add the new Drawer import from `@/components/ui/drawer` for the mobile path.
**Warning signs:** TypeScript error "Property 'Root' does not exist on type" indicates wrong Dialog import.

### Pitfall 2: Drawer Not Installed — No `src/components/ui/drawer.tsx`
**What goes wrong:** Code imports from `@/components/ui/drawer` but the file does not exist → build fails.
**Why it happens:** Drawer must be installed with `npx shadcn@latest add drawer` before any import is written.
**How to avoid:** Run `npx shadcn@latest add drawer` as Wave 0 task before implementing FORM-04.
**Warning signs:** Module not found error for `@/components/ui/drawer`.

### Pitfall 3: `useIsMobile` SSR / Test Environment
**What goes wrong:** `window.matchMedia` throws in jsdom test environment without mock.
**Why it happens:** jsdom does not implement `matchMedia` by default. Test files that render ImportPreviewModal will fail if `useIsMobile` calls `window.matchMedia` unconditionally.
**How to avoid:** Guard with `typeof window !== 'undefined'`. Add `vi.fn()` mock for `matchMedia` in test setup if needed.
**Warning signs:** `TypeError: window.matchMedia is not a function` in vitest output.

### Pitfall 4: DerivedMetricsPanel Grid — Already Correct
**What goes wrong:** Over-engineering a component that is already mobile-first.
**Why it happens:** FORM-02 says "collapses to 2-3 columns on mobile (currently 5-column)" — but reading the source shows `grid-cols-2 sm:grid-cols-5`. The mobile base IS 2 columns. At 390px this renders 2 columns × 3 rows for 5 items.
**How to avoid:** Verify at 390px that 2 columns fit (each column ~183px at 390px with 16px gap — text labels + `text-lg font-semibold tabular-nums` values — this works). Do not change unless visual testing shows overflow.
**Warning signs:** If the label "vCPU:pCore Ratio" truncates, consider `text-xs` labels but do not change grid.

### Pitfall 5: FileImportButton Without `w-full` on Mobile
**What goes wrong:** After the `Step1CurrentCluster` header stacks vertically on mobile, the FileImportButton appears below the title as a narrow button. At 390px it should be full-width to be easily tappable.
**Why it happens:** `Step1CurrentCluster` change makes FileImportButton appear in a flex-col context, but the button itself remains `w-auto` (default).
**How to avoid:** Add `w-full sm:w-auto` to the Button in `FileImportButton.tsx` alongside the size fix.
**Warning signs:** Narrow button floating left-aligned below the title on mobile.

## Code Examples

Verified patterns from reading source files:

### CurrentClusterForm — All Grids (Already Correct, Documented for Verification)
```tsx
// "Cluster Totals" section — grid already mobile-first
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

// "Existing Server Config" section — 4 fields in 3-col sm grid (4th wraps to 2nd row on sm)
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

// "Current Utilization" section
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

// SPECrate and GHz mode sections
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

// Next button — already w-full sm:w-auto
<Button type="button" onClick={handleNext} className="w-full sm:w-auto">
```

### Input Component — Font Size Check (Phase 28 Already Handled)
```tsx
// src/components/ui/input.tsx — already uses text-base (16px) from base class
// "text-base ... md:text-sm" — at 390px this renders 16px (no auto-zoom on iOS Safari)
// No change needed
```

### SpecResultsPanel — Before and After
```tsx
// FORM-03: Add min-w-max to trigger horizontal scroll at 390px

// Before:
<div className="overflow-x-auto">
  <table className="w-full text-sm">
    <thead>
      <tr className="border-b text-left text-muted-foreground">
        <th className="py-1 pr-3">Vendor</th>
        <th className="py-1 pr-3">System</th>
        <th className="py-1 pr-3">Base Score</th>
        <th className="py-1 pr-3">Cores</th>
        <th className="py-1">Chips</th>

// After (one word change):
<div className="overflow-x-auto">
  <table className="min-w-max w-full text-sm">
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `100vh` for full-height | `dvh` units with `vh` fallback | Phase 28 | iOS address bar no longer clips layout |
| `16px` input font-size via global CSS | `text-base` in Input component | Phase 28 | iOS Safari auto-zoom prevented |
| `overflow-x: hidden` on body | Applied in Phase 28 | Phase 28 | Horizontal overflow already blocked |
| 44px touch targets on wizard chrome | Handled in Phase 28 | Phase 28 | This phase handles Step 1 content targets |

**Completed in Phase 28 (do not re-implement):**
- iOS auto-zoom prevention (font-size >= 16px)
- dvh viewport units
- overflow-x hidden on body
- 44px touch targets on Header, ThemeToggle, SizingModeToggle, sticky Back/Next nav

## Open Questions

1. **Does `DerivedMetricsPanel` need column reduction?**
   - What we know: Source shows `grid-cols-2 sm:grid-cols-5` — already 2 cols on mobile
   - What's unclear: At 390px with padding, each of 2 columns is ~175px; `text-lg font-semibold` values for "vCPU:pCore Ratio" (e.g., "15.23") may fit fine
   - Recommendation: Do a visual check at 390px. If "vCPU:pCore Ratio" label wraps awkwardly, change label to `text-xs` or truncate. Grid itself is already correct.

2. **Should the Drawer for ImportPreviewModal match shadcn Dialog API or base-ui Dialog API?**
   - What we know: Drawer comes from shadcn (vaul); existing desktop path uses base-ui Dialog
   - What's unclear: Whether the content needs to be refactored into a shared inner component or duplicated for both paths
   - Recommendation: Extract modal content (scope selector + data summary + buttons) into a `<ImportPreviewContent>` sub-component that both Dialog and Drawer paths render. Avoids duplication of the 100+ line content block.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 + React Testing Library 16.3.2 |
| Config file | vite.config.ts (vitest config inline) |
| Quick run command | `rtk vitest run src/components/step1/__tests__/` |
| Full suite command | `rtk vitest run` |

### Phase Requirements — Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FORM-01 | Step1CurrentCluster header stacks on mobile (visual) | manual-only | — | N/A |
| FORM-01 | CurrentClusterForm grids render single-column on xs (CSS, not testable in jsdom) | manual-only | — | N/A |
| FORM-02 | DerivedMetricsPanel renders 5 metric items | unit | `rtk vitest run src/components/step1/__tests__/DerivedMetricsPanel.test.tsx` | ✅ |
| FORM-03 | SpecResultsPanel table has overflow-x-auto wrapper (DOM structure) | unit | `rtk vitest run src/components/common/__tests__/SpecResultsPanel.test.tsx` | ❌ Wave 0 |
| FORM-04 | ImportPreviewModal renders Drawer on mobile viewport | unit (with matchMedia mock) | `rtk vitest run src/components/step1/__tests__/ImportPreviewModal.test.tsx` | ✅ (needs new test case) |
| FORM-05 | FileImportButton Button has min-h or size="default" (attribute check) | unit | `rtk vitest run src/components/step1/__tests__/FileImportButton.test.tsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `rtk vitest run src/components/step1/__tests__/`
- **Per wave merge:** `rtk vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/common/__tests__/SpecResultsPanel.test.tsx` — covers FORM-03 (overflow-x-auto + min-w-max on table)
- [ ] `src/components/step1/__tests__/FileImportButton.test.tsx` — covers FORM-05 (button renders, correct size/accessible label)
- [ ] `matchMedia` mock in `src/setupTests.ts` or vitest setup — required for `useIsMobile` hook tests in ImportPreviewModal
- [ ] New test case in existing `ImportPreviewModal.test.tsx` — covers FORM-04 (Drawer renders on mobile viewport)

Note: Responsive CSS classes (grid-cols-1 etc.) are not testable in jsdom — Tailwind classes are not applied in the test environment. Layout acceptance criteria for FORM-01, FORM-02 are manual visual checks at 390px viewport. Tests cover DOM structure and behavior, not CSS rendering.

## Sources

### Primary (HIGH confidence)
- Source code read directly: `src/components/step1/CurrentClusterForm.tsx` — all grid classes audited
- Source code read directly: `src/components/step1/DerivedMetricsPanel.tsx` — `grid-cols-2 sm:grid-cols-5` confirmed
- Source code read directly: `src/components/step1/ImportPreviewModal.tsx` — base-ui Dialog (not shadcn) confirmed
- Source code read directly: `src/components/step1/FileImportButton.tsx` — `size="sm"` confirmed
- Source code read directly: `src/components/step1/ScopeBadge.tsx` — flex row with no truncation
- Source code read directly: `src/components/common/SpecResultsPanel.tsx` — `w-full` without `min-w-max`
- Source code read directly: `src/components/step1/Step1CurrentCluster.tsx` — `flex items-start justify-between` header
- Source code read directly: `src/components/ui/input.tsx` — `text-base md:text-sm` already present (no iOS zoom)
- `package.json` — no vaul/drawer dependency; confirms Drawer install required
- `.planning/research/ARCHITECTURE.md` — component modification map, shadcn Drawer recommendation
- `.planning/research/FEATURES.md` — NNgroup-backed responsive pattern recommendations

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — prior phase decisions (Phase 28 deliverables, no-service-worker constraint)
- `.planning/REQUIREMENTS.md` — FORM-01 through FORM-05 requirement text

### Tertiary (LOW confidence)
- None for this phase — all findings from direct source inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all from direct source file inspection + existing project research docs
- Architecture: HIGH — exact class strings and import paths verified by reading source
- Pitfalls: HIGH — pitfalls derived from actual code discrepancies found (base-ui vs shadcn Dialog, size="sm", w-full without min-w-max)

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable stack — Tailwind v4 breakpoints and shadcn Drawer API are stable)
