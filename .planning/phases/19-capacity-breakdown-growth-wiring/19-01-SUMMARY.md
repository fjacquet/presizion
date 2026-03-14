---
phase: 19-capacity-breakdown-growth-wiring
plan: 01
subsystem: sizing
tags: [growth-projections, constraints, sizing-engine, typescript]

# Dependency graph
requires:
  - phase: 18-vsan-formula-engine
    provides: "vSAN-aware storage/CPU/RAM constraints pipeline in computeScenarioResult"
provides:
  - "Scenario.cpuGrowthPercent, memoryGrowthPercent, storageGrowthPercent optional fields"
  - "Growth factor pre-multiply step in computeScenarioResult (GROW-02)"
  - "6 integration tests proving growth wiring across all sizing modes and paths"
affects: [19-02-capacity-breakdown, 19-03-growth-ui, 20-form-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: ["growth pre-multiply before headroom: demand x growthFactor x headroomFactor"]

key-files:
  created: []
  modified:
    - src/types/cluster.ts
    - src/lib/sizing/constraints.ts
    - src/lib/sizing/__tests__/constraints.test.ts

key-decisions:
  - "Growth multiplies DEMAND not server count -- pipeline is demand x growthFactor x headroomFactor"
  - "SPECint mode exempt from growth (benchmark comparison, not demand-driven)"
  - "GHz mode applies cpuGrowthFactor to pCores (not vCPUs) since GHz sizing uses pCores"
  - "Absent growth fields default to 0% via null-coalescing (same pattern as vSAN fields per VSAN-12)"

patterns-established:
  - "Growth factor pattern: 1 + (scenario.xxxGrowthPercent ?? 0) / 100"

requirements-completed: [GROW-01, GROW-02, GROW-03]

# Metrics
duration: 4min
completed: 2026-03-14
---

# Phase 19 Plan 01: Growth Factor Wiring Summary

**Per-resource growth percentage fields on Scenario with pre-multiply wiring into computeScenarioResult for CPU, RAM, and storage demand scaling**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-14T22:03:30Z
- **Completed:** 2026-03-14T22:07:25Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Extended Scenario interface with 3 optional growth percentage fields (cpuGrowthPercent, memoryGrowthPercent, storageGrowthPercent)
- Wired growth factor pre-multiplication into all sizing paths (vcpu, aggressive, ghz modes for CPU; legacy + vSAN for storage)
- 6 new integration tests covering growth wiring: CPU 20%, RAM 50%, storage 100% (legacy + vSAN), absent=zero equivalence, regression guard
- All 487 tests pass with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Add growth fields to Scenario interface** - `2e43fd2` (feat)
2. **Task 2 (TDD RED): Failing growth tests** - `e278d49` (test)
3. **Task 2 (TDD GREEN): Growth wiring implementation** - `452f4cd` (feat)

_Note: TDD GREEN commit was co-committed with plan 19-02 test setup due to concurrent execution._

## Files Created/Modified
- `src/types/cluster.ts` - Added cpuGrowthPercent, memoryGrowthPercent, storageGrowthPercent to Scenario interface
- `src/lib/sizing/constraints.ts` - Growth factor pre-multiply step: grownVcpus, grownRamPerVmGb, grownDiskPerVmGb applied throughout CALC-01/02/03/06
- `src/lib/sizing/__tests__/constraints.test.ts` - 6 new tests in "Growth factor wiring (Phase 19)" describe block

## Decisions Made
- Growth multiplies DEMAND, not server count. Pipeline order: demand x growthFactor x headroomFactor
- SPECint mode is exempt from growth factors (benchmark comparison, not demand-driven)
- GHz mode applies cpuGrowthFactor to pCores since GHz sizing uses physical cores, not vCPUs
- Absent growth fields default to 0% via null-coalescing (consistent with vSAN absent=legacy pattern)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Task 2 GREEN commit was absorbed by a concurrent plan 19-02 execution that staged the same file. The growth wiring code is committed in `452f4cd`. No code was lost.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Growth fields ready for Phase 19 Plan 02 (capacity breakdown) and Plan 03 (growth UI form)
- computeScenarioResult now supports per-resource growth projections for all sizing modes
- No blockers

## Self-Check: PASSED

All files exist, all commits verified, all content confirmed in source.

---
*Phase: 19-capacity-breakdown-growth-wiring*
*Completed: 2026-03-14*
