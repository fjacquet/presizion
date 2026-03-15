---
phase: 23-scope-aggregation-fixes
plan: 01
subsystem: import
tags: [rvtools, liveoptics, scope, aggregation, standalone, weighted-average]

requires:
  - phase: none
    provides: n/a
provides:
  - Standalone scope routing in RVTools parser (dc||__standalone__)
  - Host-count-weighted ramPerServerGb in scope aggregator
affects: [24-import-ux-polish, useImportStore]

tech-stack:
  added: []
  patterns: [standalone-scope-key, weighted-average-aggregation]

key-files:
  created: []
  modified:
    - src/lib/utils/import/rvtoolsParser.ts
    - src/lib/utils/import/scopeAggregator.ts
    - src/lib/utils/import/__tests__/rvtoolsParser.test.ts
    - src/lib/utils/import/__tests__/scopeAggregator.test.ts

key-decisions:
  - "RVTools standalone scope uses same dc||__standalone__ pattern as LiveOptics for consistency"
  - "ramPerServerGb weighted average falls back to hostCount=1 when existingServerCount is undefined"

patterns-established:
  - "Standalone scope key: dc||__standalone__ for clusterless VMs with datacenter in both parsers"
  - "Weighted average pattern: collect (value, weight) tuples then sum(v*w)/sum(w) with fallback weight"

requirements-completed: [SCOPE-07, SCOPE-08, SCOPE-09]

duration: 3min
completed: 2026-03-15
---

# Phase 23 Plan 01: Scope Aggregation Fixes Summary

**RVTools standalone scope routing (dc||__standalone__) and host-count-weighted ramPerServerGb aggregation across multi-scope selections**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-15T14:43:43Z
- **Completed:** 2026-03-15T14:46:45Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- RVTools parser now routes clusterless VMs with a datacenter to dc||__standalone__ scope instead of __all__, matching LiveOptics behavior
- buildScopeLabel in RVTools parser handles __standalone__ rendering as "Standalone (DC)"
- scopeAggregator uses host-count-weighted average for ramPerServerGb instead of first-scope-wins
- 84 import tests passing with no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix RVTools standalone scope routing** - `a9561bb` (fix)
2. **Task 2: Weighted average ramPerServerGb in scopeAggregator** - `0877206` (fix)

_Note: Both tasks followed TDD flow (RED -> GREEN)_

## Files Created/Modified
- `src/lib/utils/import/rvtoolsParser.ts` - Added dc||__standalone__ scope routing and __standalone__ label handling
- `src/lib/utils/import/scopeAggregator.ts` - Replaced first-scope-wins ramPerServerGb with host-count-weighted average
- `src/lib/utils/import/__tests__/rvtoolsParser.test.ts` - Added 4 tests for standalone scope routing and labeling
- `src/lib/utils/import/__tests__/scopeAggregator.test.ts` - Added 4 tests for weighted average, updated existing heterogeneity test

## Decisions Made
- RVTools standalone scope uses same dc||__standalone__ pattern as LiveOptics for cross-parser consistency
- ramPerServerGb weighted average falls back to hostCount=1 when existingServerCount is undefined, ensuring scopes without host data still contribute
- Updated heterogeneity warning text to say "weighted average" instead of "first cluster as representative"

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Scope aggregation logic is correct for both parsers
- Phase 24 (Import UX Polish) can proceed without blockers
- useImportStore consumers will automatically benefit from the corrected aggregation

---
*Phase: 23-scope-aggregation-fixes*
*Completed: 2026-03-15*
