---
phase: 31-step-3-review-export
plan: 02
subsystem: ui
tags: [recharts, responsive, mobile, tailwind, charts]

# Dependency graph
requires:
  - phase: 28-global-mobile-foundation-wizard-shell
    provides: responsive wrapper pattern (h-48 sm:h-72 / h-full chain)
  - phase: 30-step-2-scenario-cards
    provides: mobile layout breakpoint pattern
provides:
  - Responsive height wrappers on all four Step 3 charts
  - Reduced CapacityStackedChart left margin and YAxis width for 390px legibility
  - PNG download continues to work (ref divs preserved in correct position)
affects:
  - Step3ReviewExport (consumes SizingChart, CoreCountChart, CapacityStackedChart, MinNodesChart)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Responsive chart pattern: outer h-48 sm:h-72 sizing div + inner h-full ref div + height=100% ResponsiveContainer"
    - "Data-driven heights: conditional h-[Npx] sm:h-[Mpx] for charts where row count drives height (horizontal bar charts)"

key-files:
  created: []
  modified:
    - src/components/step3/SizingChart.tsx
    - src/components/step3/CoreCountChart.tsx
    - src/components/step3/CapacityStackedChart.tsx
    - src/components/step3/MinNodesChart.tsx
    - src/components/step3/__tests__/CapacityStackedChart.test.tsx
    - src/components/step3/__tests__/MinNodesChart.test.tsx

key-decisions:
  - "SizingChart and CoreCountChart use h-48 sm:h-72 (standard breakpoint) — vertical bar charts with generic height"
  - "CapacityStackedChart uses h-[140px] sm:h-[220px] (HCI) or h-[100px] sm:h-[130px] (disaggregated) — height data-driven by row count"
  - "MinNodesChart uses h-[180px] sm:h-[220px] — 5-row horizontal bar chart needs taller mobile baseline than 48 (192px)"
  - "CapacityStackedChart left margin reduced 120->90, YAxis width 110->80, tick fontSize 12->11 to gain ~20% bar area at 390px"
  - "CapacityStackedChart legend div moved outside the sizing/ref div — only the ResponsiveContainer needs height propagation"

patterns-established:
  - "Responsive chart wrapper: <div className='h-48 sm:h-72'><div ref={ref} className='h-full'><ResponsiveContainer height='100%'>"
  - "Data-driven wrapper: <div className={condition ? 'h-[Npx] sm:h-[Mpx]' : 'h-[Xpx] sm:h-[Ypx]'}> for horizontal bar charts"
  - "Ref stays on innermost div wrapping the SVG — legend/annotation divs live outside the sizing chain"

requirements-completed: [REVIEW-02, REVIEW-05, REVIEW-06]

# Metrics
duration: 6min
completed: 2026-03-16
---

# Phase 31 Plan 02: Step 3 Charts Responsive Height Summary

**All four Step 3 charts (SizingChart, CoreCountChart, CapacityStackedChart, MinNodesChart) converted from fixed pixel heights to responsive h-48 sm:h-72 / data-driven wrappers with height="100%" ResponsiveContainers**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-16T09:54:02Z
- **Completed:** 2026-03-16T10:00:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- SizingChart: both charts (Server Count Comparison + Constraint Breakdown) wrapped in h-48 sm:h-72 with height="100%" on ResponsiveContainers
- CoreCountChart: wrapped in h-48 sm:h-72 with height="100%" on ResponsiveContainer
- CapacityStackedChart: conditional responsive heights based on showStorage (HCI vs disaggregated), plus left margin/YAxis width reduced for 390px legibility
- MinNodesChart: wrapped in h-[180px] sm:h-[220px] with height="100%" on ResponsiveContainer
- Tests updated with h-full class presence assertions for CapacityStackedChart and MinNodesChart
- All 653 tests passing, TypeScript clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Add responsive height wrappers to SizingChart and CoreCountChart** - `36d2fc8` (feat)
2. **Task 2: Add responsive height wrappers to CapacityStackedChart and MinNodesChart + legibility audit** - `b77a186` (feat)

## Files Created/Modified

- `src/components/step3/SizingChart.tsx` - Two charts wrapped in h-48 sm:h-72 divs; height="100%" on both ResponsiveContainers
- `src/components/step3/CoreCountChart.tsx` - Wrapped in h-48 sm:h-72 div; height="100%" on ResponsiveContainer
- `src/components/step3/CapacityStackedChart.tsx` - Conditional data-driven heights; left margin 90px, YAxis width 80px, fontSize 11
- `src/components/step3/MinNodesChart.tsx` - Wrapped in h-[180px] sm:h-[220px] div; height="100%"
- `src/components/step3/__tests__/CapacityStackedChart.test.tsx` - Added h-full class assertion test
- `src/components/step3/__tests__/MinNodesChart.test.tsx` - Added h-full class assertion test

## Decisions Made

- Used h-48 sm:h-72 for vertical bar charts (SizingChart, CoreCountChart) — standard responsive pattern from Phase 28/29
- Used data-driven heights for horizontal bar charts (CapacityStackedChart, MinNodesChart) where row count constrains chart height
- CapacityStackedChart legend div moved outside the height-propagation chain (sizing div + ref div) so it doesn't consume chart height
- MinNodesChart baseline height set to h-[180px] (not h-48=192px) to give tighter mobile appearance while ensuring 5 bars are visible

## Deviations from Plan

### Additional Files Committed (Out-of-scope from pre-staged changes)

**Note:** Task 2 commit (b77a186) accidentally included pre-staged changes to `Step3ReviewExport.tsx`, `exportPdf.ts`, `Step3ReviewExport.test.tsx`, and `exportPdf.test.ts` that were already in the working tree from another plan executor. These changes add iOS PDF window.open fallback support. All tests pass and TypeScript is clean with these changes included.

**Total deviations:** 1 (unintended file inclusion from pre-staged changes — all changes valid and tests passing)

## Issues Encountered

- Pre-existing TypeScript error in `exportPdf.ts` (URL-to-string cast) was present before this plan and got fixed by the iOS PDF changes included in Task 2 commit
- Flaky test in `exportPdf.test.ts` appeared on one run but passed consistently afterward

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All four Step 3 charts are now responsive at 390px mobile width
- PNG download functionality preserved (ref divs maintained on innermost chart-containing divs)
- Ready for Step 3 overall layout review and any remaining export work

## Self-Check: PASSED

- FOUND: src/components/step3/SizingChart.tsx (h-48 sm:h-72 wrappers with height="100%")
- FOUND: src/components/step3/CoreCountChart.tsx (h-48 sm:h-72 wrapper with height="100%")
- FOUND: src/components/step3/CapacityStackedChart.tsx (data-driven heights, reduced margins)
- FOUND: src/components/step3/MinNodesChart.tsx (h-[180px] sm:h-[220px] wrapper with height="100%")
- FOUND: .planning/phases/31-step-3-review-export/31-02-SUMMARY.md
- FOUND commit 36d2fc8 (Task 1)
- FOUND commit b77a186 (Task 2)
- All 653 tests passing, TypeScript clean

---
*Phase: 31-step-3-review-export*
*Completed: 2026-03-16*
