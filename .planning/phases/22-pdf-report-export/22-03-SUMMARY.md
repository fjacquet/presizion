---
phase: 22-pdf-report-export
plan: 03
subsystem: export
tags: [pptxgenjs, pptx, powerpoint, lazy-load, chart-capture]

# Dependency graph
requires:
  - phase: 22-pdf-report-export
    plan: 01
    provides: chartRefToDataUrl utility, shared chartRefs, pptxgenjs dependency
provides:
  - exportPptx() function generating professional PowerPoint presentations
  - Export PPTX button in Step3ReviewExport toolbar
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [class-based vi.mock for constructor mocks, data URL prefix stripping for pptxgenjs]

key-files:
  created:
    - src/lib/utils/exportPptx.ts
    - src/lib/utils/__tests__/exportPptx.test.ts
  modified:
    - src/components/step3/Step3ReviewExport.tsx

key-decisions:
  - "Strip data: prefix from canvas.toDataURL() output for pptxgenjs data property compatibility"
  - "Class-based mock pattern for pptxgenjs constructor (vi.fn().mockImplementation fails with new keyword)"
  - "Export PPTX button placed after Share in toolbar; ordered: Copy Summary | CSV | JSON | Share | Export PPTX"

patterns-established:
  - "Class-based vi.mock for libraries that need constructor invocation (new PptxGenJS())"
  - "Overflow detection for chart images: if two charts exceed 7.2in on a slide, split to second slide"

requirements-completed: [PPTX-01, PPTX-02, PPTX-03, PPTX-05]

# Metrics
duration: 5min
completed: 2026-03-15
---

# Phase 22 Plan 03: PPTX Export Summary

**exportPptx utility generating title/summary/breakdown/charts/comparison slides with lazy-loaded pptxgenjs, wired to Export PPTX button in Step 3**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-15T07:23:36Z
- **Completed:** 2026-03-15T07:28:36Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Created exportPptx.ts with 7+ slide types: title, executive summary table, per-scenario capacity breakdown tables, per-scenario chart image slides, and scenario comparison table
- pptxgenjs lazy-loaded via dynamic import -- separate chunk in production build (279 KB, not in main bundle)
- Export PPTX button wired in Step3ReviewExport with loading state and disabled feedback during generation
- Charts captured as PNG data URLs via existing chartRefToDataUrl pipeline, with automatic overflow to second slide when images exceed slide height

## Task Commits

Each task was committed atomically:

1. **Task 1: Create exportPptx.ts with full PPTX generation** - `7501c25` (feat)
2. **Task 2: Wire Export PPTX button in Step3ReviewExport** - `fa89c2b` (feat)
3. **Task 3: Full build and test suite verification** - verification only, no code changes

## Files Created/Modified
- `src/lib/utils/exportPptx.ts` - Async PPTX generation function with 7 slide types, lazy-loads pptxgenjs
- `src/lib/utils/__tests__/exportPptx.test.ts` - 6 unit tests with class-based pptxgenjs mock
- `src/components/step3/Step3ReviewExport.tsx` - Added Export PPTX button, useVsanBreakdowns hook, pptxLoading state

## Decisions Made
- Strip `data:` prefix from canvas.toDataURL() output because pptxgenjs expects `image/png;base64,...` format (not `data:image/png;base64,...`)
- Used class-based mock pattern for pptxgenjs in tests (vi.fn().mockImplementation doesn't support `new` keyword)
- Export PPTX button placed at end of toolbar after Share button, maintaining logical grouping of document exports

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pptxgenjs mock constructor pattern in tests**
- **Found during:** Task 1
- **Issue:** vi.fn().mockImplementation(() => ({...})) creates a plain function that cannot be used with `new` keyword, causing "is not a constructor" error
- **Fix:** Replaced with a proper `class MockPptxGenJS` definition inside vi.mock factory
- **Files modified:** src/lib/utils/__tests__/exportPptx.test.ts
- **Verification:** All 6 tests pass
- **Committed in:** 7501c25 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary fix for test mock pattern. No scope creep.

## Issues Encountered

- Pre-existing `exportPdf.test.ts` (untracked, from Plan 22-02) has 6 failing tests with the same "is not a constructor" mock pattern. Logged to `deferred-items.md` -- out of scope per deviation rules (not caused by this plan's changes).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- PPTX export fully functional alongside existing CSV/JSON/clipboard/share exports
- When Plan 22-02 (PDF export) is executed, both Export PDF and Export PPTX buttons will appear in Step 3 toolbar
- The exportPdf.test.ts mock should use the class-based pattern established here

## Self-Check: PASSED

---
*Phase: 22-pdf-report-export*
*Completed: 2026-03-15*
