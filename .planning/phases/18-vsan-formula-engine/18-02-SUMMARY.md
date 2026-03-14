---
phase: 18-vsan-formula-engine
plan: 02
subsystem: sizing
tags: [vsan, constraints, storage-pipeline, cpu-overhead, ram-overhead, integration-tests]

# Dependency graph
requires:
  - phase: 18-01
    provides: vsanFormulas.ts (serverCountByVsanStorage, computeVsanEffectiveGhzPerNode, computeVsanEffectiveRamPerNode), vsanConstants.ts (VSAN_DEFAULT_SLACK_PERCENT), Scenario vSAN fields
provides:
  - computeScenarioResult with conditional vSAN branches in CALC-01-GHZ, CALC-02, CALC-03
  - vSAN default constants re-exported from defaults.ts for Phase 20 form consumption
  - Integration tests proving full vSAN pipeline through computeScenarioResult
affects: [19-breakdown-hook, 20-form-ui, 21-charts]

# Tech tracking
tech-stack:
  added: []
  patterns: [conditional-vsan-branching, legacy-path-preservation]

key-files:
  created: []
  modified:
    - src/lib/sizing/constraints.ts
    - src/lib/sizing/defaults.ts
    - src/lib/sizing/__tests__/constraints.test.ts

key-decisions:
  - "vSAN CPU overhead only applied in GHz sizing mode (not vcpu/specint/aggressive)"
  - "Disaggregated layout overrides vSAN for disk constraint (always 0, even with vsanFttPolicy set)"
  - "createDefaultScenario unchanged -- absent vSAN fields trigger legacy path (VSAN-12)"
  - "vSAN default constants re-exported from defaults.ts for Phase 20 form use"

patterns-established:
  - "Conditional vSAN branching: vsanFttPolicy presence triggers vSAN paths, absence preserves legacy"
  - "Three-way CALC-03: disaggregated > vSAN storage > legacy disk"
  - "Integration tests with hand-verified math and boundary-crossing assertions"

requirements-completed: [VSAN-06, VSAN-07, VSAN-11, VSAN-12]

# Metrics
duration: 3min
completed: 2026-03-14
---

# Phase 18 Plan 02: vSAN Constraints Wiring Summary

**Wired vSAN formula functions into computeScenarioResult with conditional CALC-01-GHZ/CALC-02/CALC-03 branches, legacy-path preservation (VSAN-12), and 8 integration tests proving full pipeline**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-14T21:39:46Z
- **Completed:** 2026-03-14T21:43:30Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- CALC-03 disk/storage constraint now three-way: disaggregated (0), vSAN storage path (serverCountByVsanStorage), or legacy disk path
- CALC-02 RAM constraint deducts vSAN memory overhead per host (default 6 GB) when vsanFttPolicy is set
- CALC-01-GHZ deducts vSAN CPU overhead (default 10%) from target per-core GHz when vsanFttPolicy is set
- 8 new integration tests covering: vSAN storage path, legacy regression, min-node floor, RAM deduction, CPU overhead, disaggregated override, VM swap
- vSAN default constants re-exported from defaults.ts for Phase 20 form consumption
- All 467 tests pass (zero regression), TypeScript compiles cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire vSAN branches into computeScenarioResult** - `3631701` (feat)
2. **Task 2: Integration tests for vSAN-enabled scenarios** - `45d338a` (test)

## Files Created/Modified
- `src/lib/sizing/constraints.ts` - Added vSAN imports and conditional branches for CALC-01-GHZ, CALC-02, CALC-03
- `src/lib/sizing/defaults.ts` - Re-exported VSAN_DEFAULT_SLACK_PERCENT, VSAN_DEFAULT_CPU_OVERHEAD_PCT, VSAN_DEFAULT_MEMORY_PER_HOST_GB
- `src/lib/sizing/__tests__/constraints.test.ts` - 8 new integration tests in 'vSAN integration (Phase 18)' describe block

## Decisions Made
- vSAN CPU overhead only applies in GHz mode (per Research open question #3) -- in vcpu/specint/aggressive modes, no vSAN CPU deduction
- Disaggregated layout takes priority over vSAN for CALC-03 (diskLimitedCount=0 regardless of vsanFttPolicy)
- createDefaultScenario left unchanged -- no vSAN fields added to defaults (VSAN-12: absent = legacy path)
- vSAN default constants re-exported from defaults.ts so Phase 20 form can use them as initial values

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 18 (vSAN Formula Engine) is now complete: both constants/formulas (Plan 01) and constraints wiring (Plan 02) are done
- Ready for Phase 19 (breakdown hook) to add detailed vSAN storage breakdown to the results
- Ready for Phase 20 (form UI) to add vSAN configuration fields to the scenario form
- All vSAN default constants are available from defaults.ts for form initial values

## Self-Check: PASSED

- All 3 source files exist (constraints.ts, defaults.ts, constraints.test.ts)
- SUMMARY file exists (18-02-SUMMARY.md)
- Both commits verified (3631701, 45d338a)
- 467/467 tests pass (8 new vSAN integration + 459 existing)
- TypeScript compiles cleanly (tsc --noEmit)

---
*Phase: 18-vsan-formula-engine*
*Completed: 2026-03-14*
