# Phase 17: Chart Polish, SPECrate UX & Reset Button — Research

**Researched:** 2026-03-14
**Domain:** Recharts customization, React read-only form fields, Zustand store reset, dialog-based confirmation
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CHART-04 | All charts include a legend mapping scenario names to bar colors | SizingChart already has conditional `<Legend>` — extend to always show; CoreCountChart same |
| CHART-05 | Data values displayed on top of each bar | Recharts `<LabelList position="top">` inside each `<Bar>` |
| CHART-06 | CoreCountChart downloadable as PNG | Copy `downloadChartPng` helper from SizingChart + add Download button + `useRef` |
| CHART-07 | Professional color palette replacing default Recharts colors | Define `CHART_COLORS` constant array; replace hardcoded fill props |
| SPEC-06 | In SPECrate mode, sockets/server and cores/socket auto-derived from benchmark metadata | `OldCluster.socketsPerServer` / `coresPerSocket` already populated by parser; use to seed scenario in SPECrate mode |
| SPEC-07 | Auto-derived socket/core fields are read-only in SPECrate mode | `disabled` prop on RHF `<Input>` when benchmark has metadata + mode is specint |
| SPEC-08 | Switching back to vCPU mode re-enables manual entry for socket/core fields | `useEffect` on `sizingMode` change clears read-only lock |
| SPEC-09 | If benchmark metadata lacks socket/core info, fall back to manual entry with a warning | Check `scenario.socketsPerServer` originates from cluster; show warning banner when absent |
| SPEC-LINK-01 | Detected CPU model from import displayed in Step 1 form | `currentCluster.cpuModel` already stored; already rendered in `CurrentClusterForm` (line 290–295) |
| SPEC-LINK-02 | "Look up SPECrate" link opens SPEC results search in new tab pre-populated with CPU model | `https://www.spec.org/cgi-bin/osgresults?conf=rint2017` + model as search param; or query form URL |
| SPEC-LINK-03 | Lookup link hidden when no CPU model detected | Conditional render based on `currentCluster.cpuModel` |
| RESET-01 | Reset button visible from any wizard step | Add to WizardShell header (near ThemeToggle) |
| RESET-02 | Clicking Reset shows confirmation dialog before clearing data | Base-UI Dialog pattern already in codebase (`ScopeBadge.tsx`) |
| RESET-03 | Reset clears all stores and localStorage; theme preference preserved | Call `resetCluster()`, reset scenarios, reset wizard step; call `localStorage.removeItem('presizion-session')`; leave `presizion-theme` |
| RESET-04 | After reset, user lands on Step 1 with blank form | `useWizardStore.getState().goToStep(1)` |
</phase_requirements>

---

## Summary

Phase 17 consists of three self-contained plans. All three use existing in-codebase patterns with no new dependencies required.

**Plan 01 — Chart Polish** requires adding `<LabelList>` and `<Legend>` to both bar charts, extracting a shared color palette constant, and cloning the existing `downloadChartPng` helper to `CoreCountChart`. Recharts 2.15.4 is already installed and supports these features natively. The existing test mock for recharts must be extended to include `LabelList`.

**Plan 02 — SPECrate UX & Lookup Link** is almost entirely wired already: `cpuModel` is parsed by the LiveOptics parser and stored in `OldCluster`. The CPU model badge is already rendered in `CurrentClusterForm` (lines 290–295). The remaining work is (a) making sockets/cores inputs `disabled` in specint mode when the cluster has those values, (b) a conditional "Look up SPECrate" anchor pointing to the SPEC results query form, and (c) a warning banner when metadata is absent. No form schema changes are needed.

**Plan 03 — Reset Button** follows the existing `ScopeBadge` dialog pattern verbatim. The four stores each expose reset methods (`resetCluster`, `setScenarios([createDefaultScenario()])`, `clearImport`, wizard `goToStep(1)`). The session localStorage key is `presizion-session`; the theme key `presizion-theme` must not be cleared.

**Primary recommendation:** Implement all three plans sequentially; each is independent and < 150 lines of net new code.

---

## Standard Stack

### Core (already installed — no new installs needed)

| Library | Version | Purpose | Why Used |
|---------|---------|---------|----------|
| recharts | ^2.15.4 | Bar charts with LabelList, Legend | Project standard for all charts |
| @base-ui/react | ^1.3.0 | Dialog primitive (Reset confirmation) | Already used in ScopeBadge, dialog.tsx |
| zustand | ^5.0.11 | Store state management | All four stores use it |
| react-hook-form | ^7.71.2 | Form field disabled prop | ScenarioCard already uses it |
| lucide-react | ^0.577.0 | Icons (RotateCcw for reset, ExternalLink for lookup) | Project icon library |
| vitest + @testing-library/react | ^4.1.0 / ^16.3.2 | Tests | Project test framework |

### No New Dependencies Required

All features in Phase 17 use existing libraries. No `npm install` needed.

---

## Architecture Patterns

### Recommended Project Structure (no new directories)

All changes are modifications to existing files or additions of new test files:

```
src/
  components/
    step3/
      SizingChart.tsx          # add LabelList, update Legend logic, color palette
      CoreCountChart.tsx       # add LabelList, Legend, Download PNG button + useRef
      __tests__/
        CoreCountChart.test.tsx  # NEW: download trigger, legend, LabelList
    step1/
      CurrentClusterForm.tsx   # add SPECrate lookup link; cpuModel already displayed
      __tests__/
        CurrentClusterForm.test.tsx  # extend with lookup link tests
    step2/
      ScenarioCard.tsx         # make sockets/cores read-only in specint with metadata
      __tests__/
        ScenarioCard.test.tsx  # extend with auto-derive, read-only, warning tests
    wizard/
      WizardShell.tsx          # add Reset button + confirmation dialog
      __tests__/
        WizardShell.test.tsx   # extend with reset button, dialog, store clearing
  lib/
    sizing/
      chartColors.ts           # NEW: CHART_COLORS constant (shared by both charts)
```

### Pattern 1: Recharts LabelList for bar data labels (CHART-05)

**What:** Nest `<LabelList>` inside each `<Bar>` to display numeric values above each bar.
**When to use:** Always in Phase 17 for both SizingChart and CoreCountChart.

```tsx
// Source: https://recharts.github.io/en-US/api/LabelList/
import { Bar, LabelList } from 'recharts'

<Bar dataKey="cpu" name={cpuBarName} fill={CHART_COLORS[0]}>
  <LabelList dataKey="cpu" position="top" />
</Bar>
```

**Margin note:** The chart must have `margin={{ top: 20, ... }}` (at least 16px top) to prevent labels being clipped. Both existing charts use `margin={{ top: 8, ... }}` — increase to 20.

### Pattern 2: Chart color palette constant (CHART-07)

**What:** Define a named constant array of accessible hex colors; replace hardcoded `fill` strings.
**When to use:** Imported by SizingChart and CoreCountChart.

```ts
// src/lib/sizing/chartColors.ts
// Accessible qualitative palette — distinct under common CVD conditions
export const CHART_COLORS = [
  '#3b82f6', // blue-500   — CPU-limited / scenario primary
  '#22c55e', // green-500  — RAM-limited
  '#f59e0b', // amber-500  — Disk-limited
  '#8b5cf6', // violet-500 — 4th scenario
  '#ec4899', // pink-500   — 5th scenario
  '#14b8a6', // teal-500   — 6th scenario
] as const
```

Note: The existing SizingChart already uses `#6366f1` (indigo), `#22c55e` (green), `#f59e0b` (amber). CHART-07 replaces these with the new palette. The planner can adjust exact hues — the key constraint is that they work on both light and dark backgrounds (Tailwind's 500-level colors do).

### Pattern 3: CoreCountChart PNG download (CHART-06)

**What:** Reuse the exact `downloadChartPng` function from `SizingChart.tsx`.
**When to use:** Extract to `src/lib/utils/downloadChartPng.ts` so both charts import it.

```ts
// src/lib/utils/downloadChartPng.ts
export function downloadChartPng(ref: React.RefObject<HTMLDivElement | null>, filename: string): void {
  const svg = ref.current?.querySelector('svg')
  if (!svg) return
  // ... same SVG-to-canvas approach as SizingChart
}
```

Then `CoreCountChart` adds:
- `const containerRef = useRef<HTMLDivElement | null>(null)`
- wrap chart in `<div ref={containerRef}>`
- Download PNG button (same pattern as SizingChart)
- Update filename to `'core-count-chart.png'`

### Pattern 4: SPECrate read-only fields (SPEC-06, SPEC-07, SPEC-08)

**What:** In `ScenarioCard.tsx`, disable sockets/cores inputs when `sizingMode === 'specint'` AND the cluster has metadata for these fields.
**When to use:** Only in specint mode; re-enable when switching back.

```tsx
// In ScenarioCard.tsx
const sizingMode = useWizardStore((s) => s.sizingMode)
const currentCluster = useClusterStore((s) => s.currentCluster)

const hasMetadata = sizingMode === 'specint' &&
  currentCluster.socketsPerServer != null &&
  currentCluster.coresPerSocket != null

// On the inputs:
<Input type="number" min={1} disabled={hasMetadata} {...numericField(field)} />
```

For SPEC-09 (fallback warning when metadata absent):
```tsx
{sizingMode === 'specint' &&
  (currentCluster.socketsPerServer == null || currentCluster.coresPerSocket == null) && (
  <p className="text-sm text-amber-600">
    No socket/core data from import — enter manually.
  </p>
)}
```

### Pattern 5: SPECrate lookup link (SPEC-LINK-01..03)

**What:** Show a "Look up SPECrate" anchor in Step 1 when `cpuModel` is available; open SPEC query form in new tab.
**When to use:** Only in specint mode with a detected CPU model.

The SPEC CPU2017 Integer Rate results query form is at:
```
https://www.spec.org/cgi-bin/osgresults?conf=rint2017
```

The form interface (with pre-populated processor field) is:
```
https://www.spec.org/cgi-bin/osgresults?conf=rint2017;op=form
```

The CGI interface does not support a clean URL query parameter for CPU name pre-population via a simple GET parameter. The recommended approach is to link to the form and let the user paste the detected model:

```tsx
// In CurrentClusterForm.tsx — in the specint section or near cpuModel badge
{sizingMode === 'specint' && currentCluster.cpuModel && (
  <a
    href={`https://www.spec.org/cgi-bin/osgresults?conf=rint2017`}
    target="_blank"
    rel="noopener noreferrer"
    className="text-sm text-primary underline-offset-3 hover:underline flex items-center gap-1"
  >
    Look up SPECrate <ExternalLink className="h-3 w-3" />
  </a>
)}
```

**Confidence note:** The SPEC `osgresults` CGI does not document a public `hw_cpu_name` GET filter that pre-populates the field. Linking to the query form is the safe approach. The user can copy the model from the badge and paste into the SPEC search field.

### Pattern 6: Reset confirmation dialog (RESET-01..04)

**What:** Add a Reset button to WizardShell header. Use the existing `Dialog` component from `@/components/ui/dialog` (base-ui backed).
**When to use:** Visible on all steps, triggered by user click.

```tsx
// In WizardShell.tsx
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { RotateCcw } from 'lucide-react'
import { useClusterStore } from '@/store/useClusterStore'
import { useScenariosStore } from '@/store/useScenariosStore'
import { useImportStore } from '@/store/useImportStore'
import { createDefaultScenario } from '@/lib/sizing/defaults'

const [resetOpen, setResetOpen] = useState(false)

function handleConfirmReset() {
  useClusterStore.getState().resetCluster()
  useScenariosStore.getState().setScenarios([createDefaultScenario()])
  useImportStore.getState().clearImport()
  useWizardStore.getState().goToStep(1)
  useWizardStore.getState().setSizingMode('vcpu')    // optional: reset mode too
  try { localStorage.removeItem('presizion-session') } catch { /* ignore */ }
  setResetOpen(false)
}
```

**CRITICAL: Do NOT clear `presizion-theme` from localStorage.** Theme preference is preserved per RESET-03.

### Pattern 7: Recharts Legend (CHART-04)

**What:** `<Legend>` is already imported and conditionally rendered in both charts (`showLegend = scenarios.length > 1`). CHART-04 requires the legend always be shown (not just for multiple scenarios).
**Change needed:** Remove the `showLegend` condition; always render `<Legend />` in both charts.

### Anti-Patterns to Avoid

- **Do NOT add `<LabelList>` without increasing top margin** — labels will be clipped by the SVG boundary (observed pattern from recharts GitHub issues)
- **Do NOT clear `presizion-theme` in reset** — violates RESET-03
- **Do NOT use `form.reset()` to make fields read-only** — use `disabled` prop; form values stay valid
- **Do NOT duplicate `downloadChartPng` in CoreCountChart** — extract to shared utility to avoid drift
- **Do NOT use `window.open()` for the SPEC link** — use an `<a target="_blank" rel="noopener noreferrer">` anchor for proper security and accessibility

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bar data labels | Custom SVG label overlay | `<LabelList position="top">` from recharts | Built-in, respects bar positioning |
| Chart legend | Custom HTML legend | `<Legend />` from recharts | Auto-maps dataKey+name+fill |
| Confirmation dialog | Custom modal state machine | `Dialog` from `@/components/ui/dialog` | Already in codebase, tested |
| PNG download | New approach | Reuse `downloadChartPng` helper | Identical SVG→canvas approach needed |
| Store reset | Individual field clearing | Call each store's existing reset method | `resetCluster()`, `setScenarios()`, `clearImport()` all exist |

---

## Common Pitfalls

### Pitfall 1: LabelList clipped at top
**What goes wrong:** With `margin={{ top: 8 }}`, LabelList labels at `position="top"` render outside the SVG viewport and are invisible.
**Why it happens:** SVG clips content outside its bounding box; LabelList adds ~14px above the bar top.
**How to avoid:** Set `margin={{ top: 20, right: 16, bottom: 40, left: 0 }}` on both BarChart elements.
**Warning signs:** Labels appear missing in the browser even though the element is in the DOM.

### Pitfall 2: Recharts mock missing LabelList
**What goes wrong:** Tests that render charts crash with "Element type is invalid" when `LabelList` is not in the recharts vi.mock factory.
**Why it happens:** `SizingChart.test.tsx` has a manual mock for all recharts exports; any new import not in the mock causes the error.
**How to avoid:** Add `LabelList: () => null` to the `vi.mock('recharts', ...)` factory in all chart test files.
**Warning signs:** `Error: Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined`.

### Pitfall 3: Reset clears theme preference
**What goes wrong:** Calling `localStorage.clear()` wipes both `presizion-session` and `presizion-theme`, breaking the user's dark/light mode setting.
**Why it happens:** Easy to reach for `localStorage.clear()` for simplicity.
**How to avoid:** Use `localStorage.removeItem('presizion-session')` specifically. Never `localStorage.clear()`.

### Pitfall 4: useImportStore not reset on app reset
**What goes wrong:** After reset, the scope badge and import buffer persist because `clearImport()` was not called.
**Why it happens:** Import store is separate from cluster/scenarios/wizard stores.
**How to avoid:** Always call `useImportStore.getState().clearImport()` in the reset handler.

### Pitfall 5: ScenarioCard fields not reacting to sizingMode changes
**What goes wrong:** Changing back from specint to vcpu does not re-enable the disabled inputs.
**Why it happens:** `disabled` computed from `sizingMode` is a derived value — if not re-computed on mode change, fields stay locked.
**How to avoid:** Derive `hasMetadata` directly from store selectors read at render time (not stored in local state), so it updates reactively.

### Pitfall 6: SPEC lookup link shown outside specint mode
**What goes wrong:** Lookup link visible even in vCPU mode, cluttering Step 1 for non-SPECrate users.
**Why it happens:** Conditional only checks `cpuModel`, not `sizingMode`.
**How to avoid:** Condition on BOTH `sizingMode === 'specint'` AND `currentCluster.cpuModel != null`. SPEC-LINK-03 says "hide when no CPU model detected" but contextually the link only makes sense in specint mode.

---

## Code Examples

### Verified: LabelList usage in Recharts bar chart

```tsx
// Source: https://recharts.github.io/en-US/api/LabelList/
// Recharts 2.15.4 — LabelList inside Bar
import { Bar, LabelList } from 'recharts'

<Bar dataKey="cpu" name="CPU-limited" fill={CHART_COLORS[0]}>
  <LabelList dataKey="cpu" position="top" style={{ fontSize: 11 }} />
</Bar>
```

### Verified: Dialog-based confirmation (from existing ScopeBadge pattern)

```tsx
// Source: src/components/step1/ScopeBadge.tsx (production code)
const [open, setOpen] = useState(false)

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Reset all data?</DialogTitle>
    </DialogHeader>
    <p className="text-sm text-muted-foreground">
      All cluster data and scenarios will be cleared. This cannot be undone.
    </p>
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      <Button variant="destructive" onClick={handleConfirmReset}>Reset</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Verified: WizardShell header layout for Reset button placement

The WizardShell header uses `relative` + `absolute right-0 top-0` positioning for ThemeToggle:

```tsx
// Source: src/components/wizard/WizardShell.tsx
<header className="relative mb-6 text-center print:hidden">
  <div className="absolute right-0 top-0">
    <ThemeToggle />
  </div>
  {/* ... logo, title ... */}
</header>
```

Reset button should be placed **left** of ThemeToggle (use `absolute left-0 top-0`) to preserve center layout:

```tsx
<header className="relative mb-6 text-center print:hidden">
  <div className="absolute left-0 top-0">
    <Button variant="ghost" size="sm" onClick={() => setResetOpen(true)}>
      <RotateCcw className="h-4 w-4" />
      <span className="sr-only">Reset</span>
    </Button>
  </div>
  <div className="absolute right-0 top-0">
    <ThemeToggle />
  </div>
  {/* ... */}
</header>
```

### Verified: Complete reset handler

```tsx
// Uses existing store methods — no new API needed
function handleConfirmReset() {
  // Clear data stores
  useClusterStore.getState().resetCluster()               // sets EMPTY_CLUSTER
  useScenariosStore.getState().setScenarios([createDefaultScenario()])
  useImportStore.getState().clearImport()
  // Reset wizard navigation (theme NOT reset)
  useWizardStore.getState().goToStep(1)
  // Clear session storage (NOT theme)
  try { localStorage.removeItem('presizion-session') } catch { /* ignore */ }
  setResetOpen(false)
}
```

### Verified: SPECrate link URL

```tsx
// Source: https://www.spec.org/cpu2017/results/ (verified 2026-03-14)
// Links to Integer Rate query form — most relevant for SPECrate2017_int_base
const SPEC_LOOKUP_URL = 'https://www.spec.org/cgi-bin/osgresults?conf=rint2017'
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `showLegend = scenarios.length > 1` | Always show Legend (CHART-04) | Phase 17 | Single-scenario also has legend |
| Hardcoded fill colors per Bar | `CHART_COLORS` constant array | Phase 17 | Consistent, swappable palette |
| No data labels | LabelList position="top" | Phase 17 | Values visible without tooltip hover |
| CoreCountChart: no download | Download PNG button + useRef | Phase 17 | Parity with SizingChart |
| SPECrate: sockets/cores always editable | Read-only when benchmark provides data | Phase 17 | Prevents accidental override |

---

## Key Existing Code Facts

These facts are critical for the planner — they prevent duplicate work and wrong assumptions:

### SPEC-LINK-01 is mostly done
`currentCluster.cpuModel` badge is **already rendered** in `CurrentClusterForm.tsx` at lines 290–295:
```tsx
{currentCluster.cpuModel && (
  <div className="flex items-center gap-2 mb-3">
    <span className="text-sm text-muted-foreground">Detected CPU:</span>
    <Badge variant="secondary">{currentCluster.cpuModel}</Badge>
  </div>
)}
```
Plan 02 only needs to add the lookup link nearby — not re-implement the badge.

### SizingChart already imports LabelList? — NO
Current `SizingChart.tsx` does NOT import `LabelList`. It must be added to the import statement.

### CoreCountChart has no Download button yet
`CoreCountChart.tsx` has no `useRef`, no Download button, no download function. All must be added.

### Both charts have conditional Legend
`showLegend = scenarios.length > 1` in both charts. CHART-04 removes this condition.

### Dialog component is `@base-ui/react` backed, supports `open` prop
`Dialog` in `src/components/ui/dialog.tsx` uses `@base-ui/react/dialog` and accepts `open` / `onOpenChange` props — controlled dialog is supported.

### useWizardStore has `goToStep` but no `resetWizard`
Use `goToStep(1)` to navigate to Step 1. Optionally also call `setSizingMode('vcpu')` to reset mode.

### `createDefaultScenario()` produces a valid Scenario with default values
Import from `@/lib/sizing/defaults` — used in `useScenariosStore` initial state already.

### localStorage key names (NEVER confuse these)
- `presizion-session` — session data — clear on reset
- `presizion-theme` — theme preference — PRESERVE on reset

---

## Open Questions

1. **Should Reset also reset sizingMode and layoutMode?**
   - What we know: RESET-03 says "all stores" cleared. sizingMode/layoutMode live in useWizardStore.
   - What's unclear: Whether "store cleared" means just data stores (cluster, scenarios, import) or also wizard mode settings.
   - Recommendation: Reset sizingMode to 'vcpu' and layoutMode to 'hci' for a clean slate. Omit from localStorage clear (already handled by not saving wizard modes after reset, since saveSession triggers on subscribe).

2. **Should "Look up SPECrate" link be visible in all modes or only specint?**
   - What we know: SPEC-LINK-02 says "Look up SPECrate" link opens the SPEC results page. SPEC-LINK-03 hides it when no CPU model detected.
   - What's unclear: Whether the link appears in vCPU mode (where specintPerServer is not required).
   - Recommendation: Show only when `sizingMode === 'specint'` AND `cpuModel` exists. The link is only actionable in SPECrate mode.

3. **CHART_COLORS: how many colors needed?**
   - What we know: CoreCountChart has 1 bar series (cores per scenario, with scenario name as X-axis label). SizingChart has 3 bar series (cpu, ram, disk). Number of scenarios is unbounded.
   - What's unclear: Whether CHART-07 means per-series colors (3 fixed) or per-scenario colors (N dynamic).
   - Recommendation: Define 6 colors for safety. For SizingChart: fixed 3 (cpu=CHART_COLORS[0], ram=CHART_COLORS[1], disk=CHART_COLORS[2]). For CoreCountChart: single color `CHART_COLORS[0]`.

---

## Sources

### Primary (HIGH confidence)
- Codebase direct inspection — all component files, store files, test patterns
- `src/components/step3/SizingChart.tsx` — existing download pattern, current Legend logic
- `src/components/step3/CoreCountChart.tsx` — missing features confirmed
- `src/components/step1/CurrentClusterForm.tsx` — cpuModel badge already present (line 290)
- `src/components/wizard/WizardShell.tsx` — header layout, button positioning
- `src/components/ui/dialog.tsx` — base-ui Dialog API, controlled open prop
- `src/store/useClusterStore.ts` — `resetCluster()` exists
- `src/store/useImportStore.ts` — `clearImport()` exists
- `src/store/useScenariosStore.ts` — `setScenarios()` exists
- `src/lib/utils/persistence.ts` — `STORAGE_KEY = 'presizion-session'`
- `src/store/useThemeStore.ts` — `STORAGE_KEY = 'presizion-theme'`

### Secondary (MEDIUM confidence)
- https://recharts.github.io/en-US/api/LabelList/ — LabelList props, `position="top"` usage
- https://www.spec.org/cpu2017/results/ — SPEC CPU2017 results page structure
- https://www.spec.org/cgi-bin/osgresults?conf=cpu2017 — CGI query interface (no clean CPU name URL param documented)

### Tertiary (LOW confidence, for validation)
- WebSearch: recharts LabelList label clipping — community reports confirm top-margin requirement

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are in package.json; versions confirmed
- Architecture: HIGH — all patterns traced directly from production codebase
- Chart patterns: HIGH — Recharts official docs verified via WebFetch
- SPEC link URL: MEDIUM — SPEC query interface confirmed; no documented GET param for CPU pre-population
- Pitfalls: MEDIUM — label clipping from community; rest from direct code analysis

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (Recharts 2.x stable; base-ui stable; zustand 5.x stable)
