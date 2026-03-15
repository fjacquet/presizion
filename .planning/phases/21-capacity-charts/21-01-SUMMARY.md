---
phase: 21-capacity-charts
plan: 01
subsystem: ui
tags: [recharts, stacked-bar, capacity-chart, vsan-breakdown, png-export]

# Dependency graph
requires:
  - phase: 19-capacity-breakdown-growth-wiring
    provides: useVsanBreakdowns hook, VsanCapacityBreakdown type, computeVsanBreakdown
provides:
  - CapacityStackedChart component (Required/Spare/Excess stacked bars per scenario)
  - MinNodesChart component (min nodes per constraint with binding highlight)
  - Both charts wired into Step3ReviewExport with Download PNG
affects: [22-pdf-report]

# Tech tracking
tech-stack:
  added: []
  patterns: [callback-ref pattern for dynamic per-scenario refs, renderLabel closure for Recharts custom labels]

key-files:
  created:
    - src/components/step3/CapacityStackedChart.tsx
    - src/components/step3/MinNodesChart.tsx
    - src/components/step3/__tests__/CapacityStackedChart.test.tsx
    - src/components/step3/__tests__/MinNodesChart.test.tsx
  modified:
    - src/components/step3/Step3ReviewExport.tsx

key-decisions:
  - "Return invisible <text> element instead of null from Recharts custom label function (TS2769 type constraint)"
  - "Callback-ref pattern (useRef<Record<string, HTMLDivElement | null>>) for per-scenario chart refs since useRef cannot be called in a loop"

patterns-established:
  - "Callback-ref pattern for dynamic chart refs: useRef<Record<string, HTMLDivElement | null>>({})"
  - "Recharts custom label via closure: renderLabel(rows) returns SegmentLabel component with row data access"

requirements-completed: [VIZ-01, VIZ-02, VIZ-03, VIZ-04]

# Metrics
duration: 4min
completed: 2026-03-15
---

# Phase 21 Plan 01: Capacity Charts Summary

**Two Recharts capacity visualization charts -- stacked capacity breakdown and min-nodes-by-constraint -- with per-scenario PNG download, wired into Step 3**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-15T06:11:30Z
- **Completed:** 2026-03-15T06:15:56Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- CapacityStackedChart renders 4 resource rows (CPU GHz, Memory GiB, Raw Storage TiB, Usable Storage TiB) with Required/Spare/Excess stacked segments and percentage labels
- MinNodesChart renders 5 constraint rows (CPU, Memory, Storage, FT&HA, VM Count) with binding constraint highlighted in blue
- Both charts have per-scenario Download PNG buttons using existing downloadChartPng utility
- 14 new tests (7 per chart), all passing; 526 total tests, zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CapacityStackedChart component and tests**
   - `ec5e5ce` (test: failing tests for CapacityStackedChart)
   - `ff30667` (feat: implement CapacityStackedChart component)
2. **Task 2: Create MinNodesChart component and tests**
   - `0ca3680` (test: failing tests for MinNodesChart)
   - `8125314` (feat: implement MinNodesChart component)
3. **Task 3: Wire charts into Step3ReviewExport and verify full build** - `479c01a` (feat)

_Note: TDD tasks have two commits each (test then feat)_

## Files Created/Modified
- `src/components/step3/CapacityStackedChart.tsx` - Stacked horizontal bar chart with Required/Spare/Excess segments per resource
- `src/components/step3/MinNodesChart.tsx` - Horizontal bar chart showing min nodes per constraint with binding highlight
- `src/components/step3/__tests__/CapacityStackedChart.test.tsx` - 7 tests covering empty guard, heading, download, multi-scenario, segments, legend
- `src/components/step3/__tests__/MinNodesChart.test.tsx` - 7 tests covering empty guard, heading, download, multi-scenario, bar series, label list
- `src/components/step3/Step3ReviewExport.tsx` - Added imports and JSX for both new chart components

## Decisions Made
- Return invisible `<text visibility="hidden" />` instead of null from Recharts custom label function to satisfy TS2769 (ImplicitLabelType does not accept null)
- Use callback-ref pattern (`useRef<Record<string, HTMLDivElement | null>>({})`) for per-scenario chart refs since useRef cannot be called inside a loop

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TS2769 type error in Recharts custom label function**
- **Found during:** Task 3 (TypeScript compilation check)
- **Issue:** Recharts `ImplicitLabelType` requires `ReactElement<SVGElement>` return type; returning `null` caused TS2769 overload mismatch
- **Fix:** Changed `return null` to `return <text visibility="hidden" />` in SegmentLabel function, added explicit return type annotation
- **Files modified:** src/components/step3/CapacityStackedChart.tsx
- **Verification:** `tsc -b --noEmit` passes cleanly
- **Committed in:** 479c01a (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor type compatibility fix, no scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Both capacity chart components are complete and rendered in Step 3
- Phase 22 (PDF report) can reference these chart components for PDF export
- All 526 tests pass, production build succeeds

## Self-Check: PASSED

- All 5 created/modified files exist on disk
- All 5 commit hashes verified in git log

---
*Phase: 21-capacity-charts*
*Completed: 2026-03-15*
