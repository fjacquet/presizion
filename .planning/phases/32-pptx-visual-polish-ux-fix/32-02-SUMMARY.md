---
phase: 32-pptx-visual-polish-ux-fix
plan: 02
subsystem: ui
tags: [pptx, pptxgenjs, export, visual-polish, navy, utilization]

# Dependency graph
requires:
  - phase: 32-pptx-visual-polish-ux-fix/32-01
    provides: plan context and research for PPTX visual polish

provides:
  - Navy accent strip on CONTENT_SLIDE master (0.3" wide, full height)
  - Color-coded utilization cells (green/amber/red dot + percentage) in all comparison tables
  - Navy (#1E3A5F) header fills and slide title text replacing brand blue (#3B82F6)
  - KPI callout boxes with roundRect shape, light blue-gray fill, and navy text
  - Four new targeted tests verifying VISUAL-01..04 requirements

affects: [33-pptx-visual-polish-ux-fix, exportPptx, PPTX export]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "utilCell()/utilColorDot() helpers for TextProps[] cells with color-coded dot prefix"
    - "NAVY constant as primary dark color for headers, titles, and accents (replacing BLUE)"
    - "KPI callout boxes use addText with shape='roundRect' rather than plain text"
    - "CONTENT_SLIDE master objects array with { rect } for persistent accent strip"

key-files:
  created: []
  modified:
    - src/lib/utils/exportPptx.ts
    - src/lib/utils/__tests__/exportPptx.test.ts

key-decisions:
  - "NAVY constant moved before TITLE_OPTS to avoid TDZ (temporal dead zone) error"
  - "VISUAL-03 test uses 'no BLUE fills' assertion rather than 'all NAVY' since gray headers on assumptions sub-tables are intentionally kept as-is"
  - "mockDefineSlideMaster promoted to shared module-level mock so CONTENT_SLIDE master definition can be inspected in tests"

patterns-established:
  - "utilColorDot(pct): returns UTIL_GREEN/UTIL_AMBER/UTIL_RED based on <70/<=85/>85 thresholds"
  - "utilCell(pct, rowIdx): returns TextProps[] cell with colored bullet dot + percentage text"
  - "plainCell(text, rowIdx): alternating-row plain cell for undefined utilization values"

requirements-completed: [VISUAL-01, VISUAL-02, VISUAL-03, VISUAL-04]

# Metrics
duration: 11min
completed: 2026-03-24
---

# Phase 32 Plan 02: PPTX Visual Polish Summary

**Navy accent strip, color-coded utilization dots, navy header bands, and KPI rounded-rect callout boxes added to PPTX export using pptxgenjs shape APIs**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-24T14:22:28Z
- **Completed:** 2026-03-24T14:33:12Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- VISUAL-01: CONTENT_SLIDE master now includes a 0.3"-wide navy vertical accent strip at x=0 covering full slide height via `{ rect: ... }` in the master objects array
- VISUAL-02: CPU/RAM/Disk utilization cells in Executive Summary, As-Is Comparison, and Scenario Comparison tables display colored bullet dot (green/amber/red) using TextProps[] arrays
- VISUAL-03: All table header rows and slide title text switched from brand blue (#3B82F6) to navy (#1E3A5F); footer "Presizion" text and chart legend "Required" color preserved as blue
- VISUAL-04: addKpiCallout rewritten to use `addText` with `shape: 'roundRect'`, `rectRadius: 0.3`, and `fill: { color: KPI_FILL }` creating professional rounded-rectangle callout boxes
- Added 4 targeted tests verifying each VISUAL requirement, promoted `mockDefineSlideMaster` to module scope

## Task Commits

Each task was committed atomically:

1. **Task 1: Add accent strip, navy headers, utilization helpers, and KPI boxes** - `bfa2124` (feat)
2. **Task 2: Add targeted tests for VISUAL-01..04 in exportPptx.test.ts** - `63b6abe` (test)

## Files Created/Modified

- `src/lib/utils/exportPptx.ts` - Added NAVY/UTIL_*/KPI_FILL constants, utilColorDot/utilCell/plainCell helpers, accent strip in CONTENT_SLIDE master, navy headers/titles throughout, KPI roundRect callout, utilization color-coding in all comparison tables
- `src/lib/utils/__tests__/exportPptx.test.ts` - Promoted defineSlideMaster mock to module level; added 4 new tests for VISUAL-01..04

## Decisions Made

- NAVY constant placement: moved from line 63 (after TITLE_OPTS) to line 27 (color constants block) to avoid temporal dead zone error — TITLE_OPTS references NAVY at module evaluation time
- VISUAL-03 test assertion: changed from "all headers must be NAVY" to "no headers may be BLUE" because assumptions/vSAN/growth sub-tables intentionally use gray headers (unchanged)
- mockDefineSlideMaster: promoted to module-level shared mock so all instances of PptxGenJS in the test share the same mock function, enabling call inspection

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TDZ error: NAVY constant used before initialization**
- **Found during:** Task 1 verification (test run)
- **Issue:** `TITLE_OPTS` at line 48 referenced `NAVY`, but `NAVY` was defined at line 63 — TypeScript module evaluation causes `ReferenceError: Cannot access 'NAVY' before initialization`
- **Fix:** Moved NAVY (and all new color constants) from line 63 to the color constants block at lines 27-30, before the helpers section
- **Files modified:** src/lib/utils/exportPptx.ts
- **Verification:** All 6 original tests passed after fix
- **Committed in:** bfa2124 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed overly strict VISUAL-03 test assertion**
- **Found during:** Task 2 (test run)
- **Issue:** Test asserted ALL header fills === NAVY, but assumptions/growth/vSAN sub-tables use GRAY headers (by design, never changed from original)
- **Fix:** Changed assertion to "no header uses BLUE (3B82F6)" + "at least one uses NAVY (1E3A5F)"
- **Files modified:** src/lib/utils/__tests__/exportPptx.test.ts
- **Verification:** All 10 tests pass after fix
- **Committed in:** 63b6abe (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - Bug)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered

- None beyond the two auto-fixed bugs documented above.

## Self-Check

**Files verified:**
- `src/lib/utils/exportPptx.ts` contains `const UTIL_GREEN = '22C55E'` ✓
- `src/lib/utils/exportPptx.ts` contains `const KPI_FILL = 'E8EDF2'` ✓
- `src/lib/utils/exportPptx.ts` contains `shape: 'roundRect'` ✓
- `src/lib/utils/exportPptx.ts` contains `{ rect:` in CONTENT_SLIDE master ✓
- `src/lib/utils/exportPptx.ts` has 0 `fill: { color: BLUE }` references ✓
- `src/lib/utils/exportPptx.ts` has exactly 2 `color: BLUE` references (footer + chart legend) ✓
- `src/lib/utils/__tests__/exportPptx.test.ts` contains `'1E3A5F'` assertions ✓
- `src/lib/utils/__tests__/exportPptx.test.ts` contains `'roundRect'` assertion ✓
- `src/lib/utils/__tests__/exportPptx.test.ts` contains `'E8EDF2'` assertion ✓
- All 10 exportPptx tests pass ✓
- Full suite: 661 tests pass, 0 failures ✓

## Self-Check: PASSED

## Next Phase Readiness

- All four VISUAL requirements (01-04) implemented and tested
- The PPTX export is now visually polished with corporate presales styling
- Phase 32 complete — all requirements satisfied

---
*Phase: 32-pptx-visual-polish-ux-fix*
*Completed: 2026-03-24*
