---
phase: 18-vsan-formula-engine
plan: 01
subsystem: sizing
tags: [vsan, ftt, storage-pipeline, compression, erasure-coding, tdd]

# Dependency graph
requires:
  - phase: none
    provides: standalone vSAN math engine with no prior dependencies
provides:
  - VsanFttPolicy type and FTT_POLICY_MAP with 5 policies (multipliers + min-node floors)
  - computeVsanStorageRaw (5-step pipeline: compression -> swap -> FTT -> metadata -> slack)
  - computeVsanEffectiveGhzPerNode and computeVsanEffectiveRamPerNode overhead functions
  - serverCountByVsanStorage with min-node floor enforcement
  - Scenario interface extended with 6 optional vSAN fields
affects: [18-02-vsan-constraints-wiring, 19-breakdown-hook, 20-form-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: [vsan-storage-pipeline, ftt-min-node-floor, compression-before-ftt]

key-files:
  created:
    - src/lib/sizing/vsanConstants.ts
    - src/lib/sizing/vsanFormulas.ts
    - src/lib/sizing/__tests__/vsanFormulas.test.ts
  modified:
    - src/types/cluster.ts

key-decisions:
  - "raid5 multiplier stored as 1 + 1/3 (exact fraction) not 1.33 (truncated)"
  - "Compression applied BEFORE FTT multiplication in storage pipeline (VSAN-09)"
  - "All vSAN Scenario fields are optional -- absent fields use legacy sizing path (VSAN-12)"
  - "computeVsanStorageRaw returns unrounded GiB; Math.ceil applied only at server count level"

patterns-established:
  - "vSAN storage pipeline: 5-step (compress -> swap -> FTT -> metadata -> slack)"
  - "FTT min-node floor enforcement via Math.max(storageCount, minNodes)"
  - "Zero-guards: compressionFactor clamped to >= 1.0, rawPerNodeGib=0 returns minNodes"

requirements-completed: [VSAN-01, VSAN-02, VSAN-03, VSAN-04, VSAN-05, VSAN-06, VSAN-07, VSAN-08, VSAN-09, VSAN-10, VSAN-11]

# Metrics
duration: 3min
completed: 2026-03-14
---

# Phase 18 Plan 01: vSAN Formula Engine Summary

**Pure vSAN math engine with 5-step storage pipeline (compression before FTT), CPU/RAM overhead functions, min-node floor enforcement for all 5 FTT policies, and 19 TDD-driven unit tests**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-14T21:33:24Z
- **Completed:** 2026-03-14T21:36:52Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created vSAN constants module with FTT policy map (mirror-1/2/3, raid5, raid6), compression factor types, and overhead defaults
- Implemented 4 pure vSAN formula functions: storage pipeline (5-step), CPU overhead, RAM overhead, server count with min-node floors
- Extended Scenario interface with 6 optional vSAN fields -- zero breaking changes to existing code
- 19 new TDD tests pass; 58 existing tests unchanged; TypeScript compiles cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): vSAN formula failing tests** - `f6e3fac` (test)
2. **Task 1 (GREEN): vSAN constants + formula functions** - `784d5cf` (feat)
3. **Task 2: Extend Scenario interface with vSAN fields** - `c035306` (feat)

_Note: TDD task has RED and GREEN commits. No REFACTOR needed -- code was clean._

## Files Created/Modified
- `src/lib/sizing/vsanConstants.ts` - FTT policy map, compression factor types, overhead default constants
- `src/lib/sizing/vsanFormulas.ts` - 4 pure functions: computeVsanStorageRaw, computeVsanEffectiveGhzPerNode, computeVsanEffectiveRamPerNode, serverCountByVsanStorage
- `src/lib/sizing/__tests__/vsanFormulas.test.ts` - 19 unit tests with step-by-step verified reference values
- `src/types/cluster.ts` - Scenario interface extended with 6 optional vSAN fields

## Decisions Made
- raid5 multiplier stored as `1 + 1/3` (exact fraction) rather than `1.33` (truncated) to avoid floating-point drift
- Compression is applied BEFORE FTT multiplication (VSAN-09 invariant) -- this is critical for correct raw storage calculation
- All vSAN Scenario fields are optional, so absent fields trigger the legacy sizing path with zero breaking changes (VSAN-12)
- computeVsanStorageRaw returns unrounded GiB; Math.ceil is applied only at the server count level to preserve accuracy

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- vsanConstants.ts and vsanFormulas.ts are ready for import by 18-02 (constraints wiring)
- Scenario interface is ready with vSAN fields for Phase 20 (form UI)
- All formula functions are independently testable pure functions with zero UI dependencies

## Self-Check: PASSED

- All 5 files exist (4 source + 1 SUMMARY)
- All 3 commits verified (f6e3fac, 784d5cf, c035306)
- 77/77 tests pass (19 new vSAN + 58 existing)
- TypeScript compiles cleanly (tsc --noEmit)

---
*Phase: 18-vsan-formula-engine*
*Completed: 2026-03-14*
