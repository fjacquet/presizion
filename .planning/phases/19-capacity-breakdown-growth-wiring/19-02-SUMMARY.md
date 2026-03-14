---
phase: 19-capacity-breakdown-growth-wiring
plan: 02
subsystem: sizing
tags: [vsan, capacity-breakdown, pure-function, tdd, invariant]

# Dependency graph
requires:
  - phase: 18-vsan-formula-engine
    provides: vsanFormulas.ts computeVsanStorageRaw, vsanConstants.ts FTT_POLICY_MAP
provides:
  - ResourceBreakdown, StorageBreakdown, VsanCapacityBreakdown type definitions
  - computeVsanBreakdown pure function for CPU/Memory/Storage breakdown
  - CAP-06 invariant (required + spare + excess = total) verified by 14 TDD tests
affects: [21-capacity-charts, 22-pdf-report]

# Tech tracking
tech-stack:
  added: []
  patterns: [capacity-breakdown-decomposition, invariant-driven-tdd]

key-files:
  created:
    - src/types/breakdown.ts
    - src/lib/sizing/vsanBreakdown.ts
    - src/lib/sizing/__tests__/vsanBreakdown.test.ts
  modified: []

key-decisions:
  - "Storage invariant: required = rawBeforeSlack (FTT + metadata, no slack); spare = slackSpace + haReserve; avoids double-counting slack"
  - "CPU breakdown reports demand in GHz (vCPU count * target frequency) for consistent unit reporting"
  - "Storage HA reserve = 1/N of total cluster raw (not one node) per VMware recommendation"

patterns-established:
  - "Breakdown invariant pattern: every ResourceBreakdown satisfies required + spare + excess = total"
  - "Decomposed storage pipeline: usable -> compression -> swap -> FTT -> metadata -> slack with each step exposed as a named field"

requirements-completed: [CAP-01, CAP-02, CAP-03, CAP-04, CAP-05, CAP-06]

# Metrics
duration: 4min
completed: 2026-03-14
---

# Phase 19 Plan 02: Capacity Breakdown Summary

**computeVsanBreakdown pure function with CPU/Memory/Storage decomposition, CAP-06 invariant (required + spare + excess = total), vSAN pipeline transparency, and 14 TDD tests**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-14T22:03:23Z
- **Completed:** 2026-03-14T22:07:42Z
- **Tasks:** 3 (type defs + TDD RED + TDD GREEN)
- **Files created:** 3

## Accomplishments
- ResourceBreakdown, StorageBreakdown, VsanCapacityBreakdown type definitions exported from src/types/breakdown.ts
- computeVsanBreakdown function computes CPU (GHz), Memory (GiB), Storage (GiB) breakdowns from a pre-computed ScenarioResult
- CAP-06 invariant (required + spare + excess = total) verified in every test case with floating-point tolerance
- Full vSAN storage pipeline decomposition: compression, swap, FTT, metadata, slack -- each step exposed as a named field
- Non-vSAN and disaggregated scenarios produce valid (zeroed) breakdowns

## Task Commits

Each task was committed atomically:

1. **Task 0: Create breakdown type definitions** - `86ee993` (feat)
2. **TDD RED: Failing tests for computeVsanBreakdown** - `452f4cd` (test)
3. **TDD GREEN: Implement computeVsanBreakdown** - `0e7e575` (feat)

## Files Created/Modified
- `src/types/breakdown.ts` - ResourceBreakdown, StorageBreakdown, VsanCapacityBreakdown interfaces
- `src/lib/sizing/vsanBreakdown.ts` - computeVsanBreakdown pure function with CPU/Memory/Storage breakdown logic
- `src/lib/sizing/__tests__/vsanBreakdown.test.ts` - 14 TDD test cases with CAP-06 invariant assertions

## Decisions Made
- Storage invariant: required = rawBeforeSlack (FTT + metadata, no slack); spare = slackSpace + haReserve. This avoids double-counting slack which would break the invariant.
- CPU breakdown reports demand in GHz (vCPU count * target frequency) for consistent unit reporting across all sizing modes.
- Storage HA reserve = total / finalCount (1/N of cluster) per VMware recommendation, distinct from CPU/Memory HA reserve (one node).
- Storage vSAN path decomposes vsanConsumption = required - usableRequired to maintain the vmsRequired + vsanConsumption = required relationship.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Breakdown types and function ready for Phase 21 (stacked capacity charts) consumption
- Phase 22 (PDF report tables) can import VsanCapacityBreakdown directly
- Growth fields (cpuGrowthPercent, memoryGrowthPercent, storageGrowthPercent) from Plan 01 are NOT yet wired into the breakdown demand calculations -- will need integration when both plans merge

## Self-Check: PASSED

- All 3 created files verified on disk
- All 3 commit hashes (86ee993, 452f4cd, 0e7e575) verified in git log

---
*Phase: 19-capacity-breakdown-growth-wiring*
*Completed: 2026-03-14*
