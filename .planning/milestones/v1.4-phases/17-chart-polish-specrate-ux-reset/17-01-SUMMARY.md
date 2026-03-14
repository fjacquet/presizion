---
phase: 17-chart-polish-specrate-ux-reset
plan: 01
subsystem: ui
tags: [recharts, chart, LabelList, Legend, PNG-download, color-palette]

# Dependency graph
requires: []
provides:
  - CHART_COLORS shared color palette for all bar charts
  - downloadChartPng shared SVG-to-canvas PNG download utility
  - Always-on Legend on both SizingChart and CoreCountChart
  - LabelList data labels above bars on both charts
  - Download PNG button on CoreCountChart (parity with SizingChart)
affects: [step3-charts, chart-export]

# Tech tracking
tech-stack:
  added: []
  patterns: [shared-color-palette, extracted-chart-utility, always-on-legend]

key-files:
  created:
    - src/lib/sizing/chartColors.ts
    - src/lib/utils/downloadChartPng.ts
    - src/components/step3/__tests__/CoreCountChart.test.tsx
  modified:
    - src/components/step3/SizingChart.tsx
    - src/components/step3/CoreCountChart.tsx
    - src/components/step3/__tests__/SizingChart.test.tsx

key-decisions:
  - "CHART_COLORS uses Tailwind 500-level hex colors for WCAG AA accessibility on white backgrounds"
  - "downloadChartPng extracted to shared utility with (ref, filename) signature for reuse"
  - "Legend always shown regardless of scenario count (CHART-04)"
  - "LabelList uses fontSize: 11 to avoid overlapping on narrow charts"

patterns-established:
  - "Shared chart constants in src/lib/sizing/ (not inline in components)"
  - "Chart download utilities in src/lib/utils/ (not local to component)"

requirements-completed: [CHART-04, CHART-05, CHART-06, CHART-07]

# Metrics
duration: 4min
completed: 2026-03-14
---

# Phase 17 Plan 01: Chart Polish Summary

**Always-on legends, LabelList data labels, shared CHART_COLORS palette, and CoreCountChart PNG download parity**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-14T14:44:17Z
- **Completed:** 2026-03-14T14:48:28Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created shared CHART_COLORS constant with 6 accessible Tailwind 500-level hex colors
- Extracted downloadChartPng to shared utility with parameterized filename
- Both SizingChart and CoreCountChart always show Legend (removed conditional)
- Both charts display LabelList data values above bars
- CoreCountChart gained Download PNG button (parity with SizingChart)
- Both charts use consistent professional color palette from shared constant

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared chartColors constant and extract downloadChartPng utility** - `c3a23e0` (feat)
2. **Task 2 RED: Add failing tests for chart legend, LabelList, and CoreCountChart download** - `0262400` (test)
3. **Task 2 GREEN: Implement chart polish (Legend, LabelList, colors, download)** - `eb4e8ea` (feat)

_Note: Task 2 was TDD with RED and GREEN commits._

## Files Created/Modified
- `src/lib/sizing/chartColors.ts` - Shared CHART_COLORS constant (6 accessible hex colors)
- `src/lib/utils/downloadChartPng.ts` - Shared SVG-to-canvas PNG download utility
- `src/components/step3/SizingChart.tsx` - Always-on Legend, LabelList, CHART_COLORS, shared download
- `src/components/step3/CoreCountChart.tsx` - Always-on Legend, LabelList, Download PNG button, CHART_COLORS
- `src/components/step3/__tests__/SizingChart.test.tsx` - Added LabelList/ReferenceLine mocks, Legend+LabelList tests
- `src/components/step3/__tests__/CoreCountChart.test.tsx` - New test file: 6 tests for chart rendering, Legend, LabelList, download

## Decisions Made
- CHART_COLORS uses Tailwind 500-level hex colors for WCAG AA accessibility on white backgrounds
- downloadChartPng extracted to shared utility with (ref, filename) signature for reuse across charts
- Legend always shown regardless of scenario count (CHART-04 requirement)
- LabelList uses fontSize: 11 to avoid overlapping bar labels on narrow charts
- Top margin increased to 20px on both charts to give LabelList clearance

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- 3 pre-existing SPEC-LINK test failures observed (unrelated to chart changes, not caused by this plan)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Chart polish complete; both charts are presentation-ready with legends, labels, consistent colors
- Ready for 17-02 (SPECrate UX) and 17-03 plans

## Self-Check: PASSED

- [x] src/lib/sizing/chartColors.ts exists
- [x] src/lib/utils/downloadChartPng.ts exists
- [x] src/components/step3/__tests__/CoreCountChart.test.tsx exists
- [x] Commit c3a23e0 exists (Task 1)
- [x] Commit 0262400 exists (Task 2 RED)
- [x] Commit eb4e8ea exists (Task 2 GREEN)
- [x] All 52 chart tests pass
- [x] TypeScript compilation passes

---
*Phase: 17-chart-polish-specrate-ux-reset*
*Completed: 2026-03-14*
