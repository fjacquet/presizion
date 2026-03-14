---
phase: 19-capacity-breakdown-growth-wiring
plan: 03
subsystem: sizing
tags: [growth, display, formula, hook, derive-on-read, vsan, breakdown]

# Dependency graph
requires:
  - phase: 19-01
    provides: Growth factor integration in constraints.ts sizing pipeline
  - phase: 19-02
    provides: computeVsanBreakdown function and VsanCapacityBreakdown types
provides:
  - Growth-annotated formula display strings (cpuFormulaString, ramFormulaString, diskFormulaString)
  - useVsanBreakdowns derive-on-read hook returning VsanCapacityBreakdown[]
affects: [21-charts, 22-pdf-report, 20-form-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: [growth-suffix-annotation, derive-on-read-hook]

key-files:
  created:
    - src/hooks/useVsanBreakdowns.ts
    - src/hooks/__tests__/useVsanBreakdowns.test.ts
  modified:
    - src/lib/sizing/display.ts
    - src/lib/sizing/__tests__/display.test.ts

key-decisions:
  - "Growth annotation inserted AFTER headroom and BEFORE first division in formula strings"
  - "useVsanBreakdowns calls computeScenarioResult internally (not re-imported from useScenariosResults) for single-pass efficiency"

patterns-established:
  - "Growth suffix pattern: optional growth field on params interface, suffix computed only when non-zero"
  - "Derive-on-read hook pattern for VsanCapacityBreakdown mirroring useScenariosResults"

requirements-completed: [GROW-04]

# Metrics
duration: 3min
completed: 2026-03-14
---

# Phase 19 Plan 03: Display Growth Annotations & useVsanBreakdowns Hook Summary

**Growth-annotated formula display strings for CPU/RAM/disk plus useVsanBreakdowns derive-on-read hook wiring computeVsanBreakdown to Zustand stores**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-14T22:11:01Z
- **Completed:** 2026-03-14T22:14:05Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Extended CpuFormulaParams, RamFormulaParams, DiskFormulaParams with optional growth percent fields
- Formula strings show " x +N% growth" annotation when growth is non-zero, unchanged when zero or absent
- Created useVsanBreakdowns hook following derive-on-read pattern (never caches breakdowns in Zustand)
- 13 new tests total: 7 growth annotation tests + 6 hook tests (all passing, 500 full suite)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add growth annotations to formula display strings** - `675d5fe` (test: TDD RED) + `e3034f1` (feat: TDD GREEN)
2. **Task 2: Create useVsanBreakdowns derive-on-read hook with tests** - `8354544` (feat)

_Note: Task 1 used TDD with separate RED/GREEN commits._

## Files Created/Modified
- `src/lib/sizing/display.ts` - Added cpuGrowthPercent, memoryGrowthPercent, storageGrowthPercent to formula param interfaces; growth suffix logic
- `src/lib/sizing/__tests__/display.test.ts` - 7 new tests in 'Growth annotations (GROW-04)' describe block
- `src/hooks/useVsanBreakdowns.ts` - Derive-on-read hook: reads cluster + scenarios + wizard stores, maps through computeScenarioResult + computeVsanBreakdown
- `src/hooks/__tests__/useVsanBreakdowns.test.ts` - 6 renderHook tests: empty array, per-scenario mapping, properties, invariant, reactivity

## Decisions Made
- Growth annotation inserted AFTER headroom display and BEFORE first division operator for readability
- useVsanBreakdowns calls computeScenarioResult internally rather than consuming useScenariosResults hook, because it needs both the ScenarioResult and the VsanCapacityBreakdown in a single pass

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 19 complete: all 3 plans delivered (growth pipeline, breakdown types, display + hook)
- useVsanBreakdowns hook ready for Phase 21 (charts) and Phase 22 (PDF report) consumption
- Growth-annotated formula strings ready for Phase 20 (form UI) display components

---
*Phase: 19-capacity-breakdown-growth-wiring*
*Completed: 2026-03-14*
