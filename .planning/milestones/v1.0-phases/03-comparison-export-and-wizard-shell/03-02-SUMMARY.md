---
phase: 03-comparison-export-and-wizard-shell
plan: "02"
subsystem: ui
tags: [comparison-table, csv-export, clipboard, shadcn, vitest, tdd]

# Dependency graph
requires:
  - phase: 03-comparison-export-and-wizard-shell
    plan: "01"
    provides: shadcn Table primitives + Nyquist Wave 0 it.todo stubs
  - src/hooks/useScenariosResults.ts
  - src/store/useClusterStore.ts
  - src/store/useScenariosStore.ts
  - src/types/cluster.ts
  - src/types/results.ts
provides:
  - buildSummaryText() — plain-text cluster sizing report (clipboard export)
  - copyToClipboard() — navigator.clipboard.writeText wrapper
  - buildCsvContent() — RFC 4180 CSV with header + one row per scenario
  - csvEscape() — RFC 4180 field escape helper
  - downloadCsv() — Blob URL download via anchor click pattern
  - ComparisonTable component — metrics-as-rows, scenarios-as-columns table with UX-04 color coding
  - Step3ReviewExport component — Step 3 container with Copy Summary + Download CSV buttons
affects:
  - 03-03 (WizardShell wires Step3ReviewExport at currentStep === 3)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD RED-GREEN: stub-to-real test promotion before implementation creation"
    - "utilizationClass() pure function maps pct to Tailwind class strings — testable in isolation"
    - "Blob URL download pattern: createObjectURL + anchor click + revokeObjectURL"
    - "navigator.clipboard mock: Object.assign(navigator, { clipboard: { writeText: vi.fn() } })"
    - "URL mock: vi.stubGlobal('URL', { createObjectURL: vi.fn(), revokeObjectURL: vi.fn() })"
    - "anchor click test via URL.revokeObjectURL verification (called after click in downloadCsv)"

key-files:
  created:
    - src/lib/utils/clipboard.ts
    - src/lib/utils/export.ts
    - src/components/step3/ComparisonTable.tsx
  modified:
    - src/lib/utils/__tests__/clipboard.test.ts
    - src/lib/utils/__tests__/export.test.ts
    - src/components/step3/__tests__/ComparisonTable.test.tsx
    - src/components/step3/__tests__/Step3ReviewExport.test.tsx
    - src/components/step3/Step3ReviewExport.tsx

key-decisions:
  - "csvEscape exported (not private) for direct unit testing of escape logic"
  - "ComparisonTable reads from Zustand stores directly (no data props) per plan spec"
  - "utilizationClass exported from ComparisonTable.tsx so tests can unit-test color logic in isolation"
  - "downloadCsv anchor click verified via URL.revokeObjectURL assertion (called after click) — avoids createElement mock stack overflow in jsdom"
  - "Step3ReviewExport handleCopy is async (void-wrapped) so onClick handler is synchronous — prevents unhandled promise warnings"

patterns-established:
  - "For downloadCsv in jsdom: verify URL.revokeObjectURL called to confirm full anchor-click flow ran"
  - "Use real DOM anchor (document.createElement('a')) in tests; spy on click with mockImplementation"

requirements-completed: [COMP-01, COMP-02, EXPO-01, EXPO-02, UX-04]

# Metrics
duration: 5min
completed: 2026-03-12
---

# Phase 3 Plan 02: Comparison Table, Clipboard Export, and CSV Download Summary

**Comparison table with color-coded utilization (UX-04) + clipboard plain-text export (EXPO-01) + RFC 4180 CSV download (EXPO-02) — 37 new tests, 155 total passing**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-12T20:40:28Z
- **Completed:** 2026-03-12T20:45:17Z
- **Tasks:** 2
- **Files modified:** 7 (4 created, 3 modified)

## Accomplishments

- Created `src/lib/utils/clipboard.ts` with `buildSummaryText()` (multi-section plain-text report) and `copyToClipboard()` (navigator.clipboard wrapper)
- Created `src/lib/utils/export.ts` with `csvEscape()` (RFC 4180 compliant), `buildCsvContent()` (header + one row per scenario), and `downloadCsv()` (Blob URL anchor click pattern with revoke cleanup)
- Created `src/components/step3/ComparisonTable.tsx` — transposed table (metrics=rows, scenarios=columns) using shadcn Table primitives; exports `utilizationClass()` for color-coded cells (green <70%, amber 70-89%, red >=90%)
- Updated `src/components/step3/Step3ReviewExport.tsx` from placeholder stub to full container component with Copy Summary and Download CSV buttons
- Promoted all 4 Wave 0 it.todo stub files to real test suites: 37 new tests added (17 utils + 20 components)
- Full suite: **155 tests passing, 0 failures** (up from 105 baseline)
- TypeScript strict mode: **0 errors**

## Task Commits

Each task committed atomically:

1. **Task 1: Export utility functions** - `57095a9` (feat) — clipboard.ts, export.ts, 17 tests
2. **Task 2: ComparisonTable and Step3ReviewExport** - `499cd18` (feat) — components + 20 tests

## Files Created/Modified

- `src/lib/utils/clipboard.ts` — buildSummaryText(), copyToClipboard()
- `src/lib/utils/export.ts` — csvEscape(), buildCsvContent(), downloadCsv()
- `src/lib/utils/__tests__/clipboard.test.ts` — 8 tests (promoted from it.todo)
- `src/lib/utils/__tests__/export.test.ts` — 9 tests (promoted from it.todo)
- `src/components/step3/ComparisonTable.tsx` — metrics-as-rows comparison table + utilizationClass()
- `src/components/step3/__tests__/ComparisonTable.test.tsx` — 13 tests (promoted from it.todo)
- `src/components/step3/Step3ReviewExport.tsx` — Step 3 container (replaced stub)
- `src/components/step3/__tests__/Step3ReviewExport.test.tsx` — 7 tests (promoted from it.todo)

## Decisions Made

- `csvEscape` exported (not private) for direct unit testing of the escape logic
- `utilizationClass` exported from ComparisonTable.tsx so color logic can be unit-tested without rendering
- `downloadCsv` anchor click verified via `URL.revokeObjectURL` assertion — avoids `createElement` mock infinite recursion in jsdom
- `Step3ReviewExport` `handleCopy` is async with void-wrapper on `onClick` to keep the handler synchronous while letting the inner promise resolve
- Used real DOM anchor elements in tests (not plain object mocks) to satisfy jsdom's `appendChild` Node type requirement

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] downloadCsv test: plain object mock rejected by jsdom appendChild**

- **Found during:** Task 1 GREEN phase
- **Issue:** Test mock created a plain `{ href: '', click: vi.fn() }` object for the anchor element; jsdom's `appendChild` rejects non-Node objects
- **Fix:** Changed test to use a real `document.createElement('a')` and spy on its `.click` method with `mockImplementation(() => {})`
- **Files modified:** `src/lib/utils/__tests__/export.test.ts`
- **Commit:** Included in 57095a9

**2. [Rule 1 - Bug] Step3ReviewExport anchor click test: `mockReturnValueOnce` consumed during render**

- **Found during:** Task 2 GREEN phase
- **Issue:** `vi.spyOn(document, 'createElement').mockReturnValueOnce(link)` is consumed by React's internal render calls before the button click fires `downloadCsv`
- **Fix:** Changed the test assertion to verify `URL.revokeObjectURL('blob:mock')` was called, which is only called after the anchor click in the `downloadCsv` flow — cleanly verifies the complete download sequence
- **Files modified:** `src/components/step3/__tests__/Step3ReviewExport.test.tsx`
- **Commit:** Included in 499cd18

**3. [Rule 1 - Bug] `createElement` spy stack overflow**

- **Found during:** Task 2 fix attempt
- **Issue:** Attempting to spy on `document.createElement` with `mockImplementation` that calls `originalCreate` caused infinite recursion because `vi.spyOn` replaces the function and `bind` captured the spy, not the original
- **Fix:** Abandoned the `createElement` spy approach; used the `URL.revokeObjectURL` verification pattern instead
- **Files modified:** `src/components/step3/__tests__/Step3ReviewExport.test.tsx`
- **Commit:** Included in 499cd18

## Issues Encountered

None beyond the auto-fixed bugs above.

## User Setup Required

None — no external services, API keys, or browser configuration required.

## Next Phase Readiness

- 03-03 can now wire `<Step3ReviewExport />` into WizardShell at `currentStep === 3`
- WizardShell needs: Step 2 "Next" button + `useBeforeUnload` hook integration
- All 155 existing tests must continue passing after 03-03 changes

## Self-Check: PASSED

- FOUND: src/lib/utils/clipboard.ts
- FOUND: src/lib/utils/export.ts
- FOUND: src/components/step3/ComparisonTable.tsx
- FOUND: src/components/step3/Step3ReviewExport.tsx (updated from stub)
- FOUND: src/lib/utils/**tests**/clipboard.test.ts (17 tests promoted from it.todo)
- FOUND: src/lib/utils/**tests**/export.test.ts (9 tests promoted from it.todo)
- FOUND: src/components/step3/**tests**/ComparisonTable.test.tsx (13 tests promoted)
- FOUND: src/components/step3/**tests**/Step3ReviewExport.test.tsx (7 tests promoted)
- FOUND commit: 57095a9 (feat: clipboard and CSV export utility functions)
- FOUND commit: 499cd18 (feat: ComparisonTable and Step3ReviewExport)
- Test suite: 155 PASSING, 0 FAILING (14 test files)
- TypeScript: 0 errors

---
*Phase: 03-comparison-export-and-wizard-shell*
*Completed: 2026-03-12*
