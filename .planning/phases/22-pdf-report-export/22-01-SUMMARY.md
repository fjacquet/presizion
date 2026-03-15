---
phase: 22-pdf-report-export
plan: 01
subsystem: export
tags: [jspdf, pptxgenjs, svg-capture, recharts, pdf, pptx]

# Dependency graph
requires:
  - phase: 21-capacity-charts
    provides: CapacityStackedChart and MinNodesChart with per-scenario chart containers
provides:
  - chartRefToDataUrl() SVG->canvas->dataURL capture utility
  - Shared chartRefs managed by Step3ReviewExport for export access
  - jspdf, jspdf-autotable, pptxgenjs available as lazy-loadable dependencies
affects: [22-02-PLAN, 22-03-PLAN]

# Tech tracking
tech-stack:
  added: [jspdf@4.2.0, jspdf-autotable@5.0.7, pptxgenjs@3.12.0]
  patterns: [SVG-to-canvas capture pipeline, lifted chart refs pattern]

key-files:
  created:
    - src/lib/utils/chartCapture.ts
    - src/lib/utils/__tests__/chartCapture.test.ts
  modified:
    - src/components/step3/CapacityStackedChart.tsx
    - src/components/step3/MinNodesChart.tsx
    - src/components/step3/Step3ReviewExport.tsx
    - package.json
    - package-lock.json

key-decisions:
  - "chartRefToDataUrl returns logical CSS pixel dimensions (not 2x canvas dims) for correct PDF/PPTX scaling"
  - "Chart refs use namespaced keys (capacity-{id}, minnodes-{id}) to avoid collisions in shared ref object"
  - "Internal refs kept alongside chartRefs for backward-compatible PNG download buttons"

patterns-established:
  - "Lifted ref pattern: parent creates ref, passes to children, children write to both internal and shared refs"
  - "Capture utility returns Promise<ChartCapture | null> with null for all error paths"

requirements-completed: [PDF-04, PPTX-04]

# Metrics
duration: 2min
completed: 2026-03-15
---

# Phase 22 Plan 01: Export Foundation Summary

**Installed jspdf/pptxgenjs export deps, created SVG-to-dataURL chart capture utility, and lifted chart refs to Step3ReviewExport for downstream PDF/PPTX access**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-15T07:18:26Z
- **Completed:** 2026-03-15T07:20:49Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Installed jspdf@4.2.0, jspdf-autotable@5.0.7, and pptxgenjs@3.12.0 as dependencies
- Created chartRefToDataUrl() utility that captures SVG charts as 2x-resolution PNG data URLs
- Lifted chart container refs from CapacityStackedChart and MinNodesChart into Step3ReviewExport
- All 528 existing tests pass, build succeeds, no bundle size regression (deps are not statically imported)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create chartCapture utility** - `a340c16` (feat)
2. **Task 2: Lift chart refs to Step3ReviewExport** - `d24173e` (feat)
3. **Task 3: Verify build and full test suite** - verification only, no code changes

## Files Created/Modified
- `src/lib/utils/chartCapture.ts` - Async SVG->canvas->dataURL capture utility exporting chartRefToDataUrl()
- `src/lib/utils/__tests__/chartCapture.test.ts` - Null-safety tests for chartCapture
- `src/components/step3/CapacityStackedChart.tsx` - Added optional chartRefs prop, dual ref callback
- `src/components/step3/MinNodesChart.tsx` - Added optional chartRefs prop, dual ref callback
- `src/components/step3/Step3ReviewExport.tsx` - Creates shared chartRefs, passes to both chart components
- `package.json` - Added jspdf, jspdf-autotable, pptxgenjs dependencies
- `package-lock.json` - Lockfile updated with 29 new packages

## Decisions Made
- chartRefToDataUrl returns logical CSS pixel dimensions (width/height) not the 2x canvas dimensions, so PDF/PPTX exporters can scale correctly
- Namespaced ref keys (`capacity-{id}`, `minnodes-{id}`) avoid collisions in the shared ref object
- Internal refs kept alongside external chartRefs for backward-compatible PNG download button behavior

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- chartRefToDataUrl() ready for Plan 02 (PDF export) and Plan 03 (PPTX export) to call
- chartRefs populated in Step3ReviewExport, accessible for export button handlers in Plans 02/03
- jspdf and pptxgenjs available for dynamic import() in export functions

## Self-Check: PASSED

- [x] src/lib/utils/chartCapture.ts exists
- [x] src/lib/utils/__tests__/chartCapture.test.ts exists
- [x] 22-01-SUMMARY.md exists
- [x] Commit a340c16 found
- [x] Commit d24173e found

---
*Phase: 22-pdf-report-export*
*Completed: 2026-03-15*
