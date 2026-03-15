---
phase: 24-average-vm-metrics
plan: 01
subsystem: ui
tags: [react, zustand, derived-metrics, per-vm-averages]

requires:
  - phase: 13-import-store
    provides: useImportStore with scope aggregation and avgRamPerVmGb
provides:
  - Avg vCPU/VM, Avg RAM/VM, Avg Disk/VM in Step 1 DerivedMetricsPanel
  - Test coverage confirming scenario seeding from import data
affects: [step1, step2, import]

tech-stack:
  added: []
  patterns: [derive-on-read avg metrics from cluster store]

key-files:
  created:
    - src/components/step1/__tests__/DerivedMetricsPanel.test.tsx
    - src/store/__tests__/useScenariosStore.seed.test.ts
  modified:
    - src/components/step1/DerivedMetricsPanel.tsx
    - src/components/step1/__tests__/CurrentClusterForm.test.tsx

key-decisions:
  - "Avg RAM/VM reads avgRamPerVmGb directly (no re-derivation from totals) since OldCluster has no totalRamGb field"
  - "Grid expanded to sm:grid-cols-5 to accommodate 5 metric items"

patterns-established:
  - "Per-VM avg metrics derived inline in DerivedMetricsPanel from cluster store fields"

requirements-completed: [AVG-01, AVG-02, AVG-03, AVG-04]

duration: 17min
completed: 2026-03-15
---

# Phase 24 Plan 01: Average VM Metrics Summary

**Avg vCPU/VM, RAM/VM (GiB), Disk/VM (GiB) displayed in Step 1 derived metrics panel with em-dash fallbacks and import-seeded scenario defaults confirmed by tests**

## Performance

- **Duration:** 17 min
- **Started:** 2026-03-15T16:28:11Z
- **Completed:** 2026-03-15T16:45:50Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- DerivedMetricsPanel shows 5 metrics total (2 existing + 3 new avg per-VM metrics)
- Em-dash displayed when data unavailable (0 VMs, missing avgRamPerVmGb, missing totalDiskGb)
- Scenario seeding from import confirmed: seedFromCluster and addScenario both propagate import-derived values
- Full test suite passes with 561 tests, zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add avg vCPU/VM, RAM/VM, Disk/VM to DerivedMetricsPanel** - `cdc5564` (test: RED), `7197721` (feat: GREEN)
2. **Task 2: Verify and test scenario seeding from import data** - `d90802b` (test)

_Note: TDD tasks have multiple commits (test then feat)_

## Files Created/Modified
- `src/components/step1/DerivedMetricsPanel.tsx` - Added 3 avg per-VM metric computations and MetricItem entries
- `src/components/step1/__tests__/DerivedMetricsPanel.test.tsx` - 5 tests for avg metric display and em-dash fallbacks
- `src/store/__tests__/useScenariosStore.seed.test.ts` - 4 tests for seedFromCluster and addScenario seeding
- `src/components/step1/__tests__/CurrentClusterForm.test.tsx` - Fixed em-dash assertion for multiple em-dash elements

## Decisions Made
- Avg RAM/VM reads avgRamPerVmGb directly rather than deriving from totals, since OldCluster has no totalRamGb field
- Grid expanded to sm:grid-cols-5 to fit 5 metric items in a single row on wider screens

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed em-dash assertion in CurrentClusterForm test**
- **Found during:** Verification (full test suite)
- **Issue:** Existing test used `getByText('\u2014')` which found multiple em-dash elements after adding 3 new avg metrics
- **Fix:** Changed to `getAllByText('\u2014').length >= 1` assertion
- **Files modified:** src/components/step1/__tests__/CurrentClusterForm.test.tsx
- **Verification:** Full suite passes (561 tests)
- **Committed in:** be86876

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor test assertion fix required by our changes. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 24 complete (single plan phase)
- All AVG requirements (AVG-01 through AVG-04) satisfied
- v2.1 milestone ready for final review

---
*Phase: 24-average-vm-metrics*
*Completed: 2026-03-15*
