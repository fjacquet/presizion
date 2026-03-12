---
phase: 01-foundation
plan: 02
subsystem: sizing
tags: [typescript, vitest, tdd, pure-functions, sizing-engine]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Vite + React + TypeScript project scaffold with vitest configured"
provides:
  - "OldCluster and Scenario readonly TypeScript interfaces"
  - "ScenarioResult readonly interface and LimitingResource union type"
  - "Industry-standard sizing defaults and createDefaultScenario factory"
  - "parseNumericInput and parsePositiveInput NaN cascade prevention helpers"
  - "serverCountByCpu, serverCountByRam, serverCountByDisk pure formula functions"
  - "computeScenarioResult public API implementing CALC-01 through CALC-06"
affects: [02-components, 03-hooks, 04-export]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD: write failing tests before any implementation"
    - "Pure functions only in src/lib/sizing/ — no React imports"
    - "Math.ceil only at formula return statements, not intermediates"
    - "headroomFactor = 1 + headroomPercent/100 computed in constraints.ts, passed as factor to formulas"
    - "Object.freeze() on ScenarioResult return value for immutability"
    - "Tie-breaking priority for limitingResource: cpu > ram > disk"

key-files:
  created:
    - src/types/cluster.ts
    - src/types/results.ts
    - src/lib/sizing/defaults.ts
    - src/lib/sizing/parseNumericInput.ts
    - src/lib/sizing/formulas.ts
    - src/lib/sizing/constraints.ts
  modified:
    - src/lib/sizing/__tests__/parseNumericInput.test.ts
    - src/lib/sizing/__tests__/formulas.test.ts
    - src/lib/sizing/__tests__/constraints.test.ts

key-decisions:
  - "growthHeadroomFactor is passed to formulas as a multiplicative factor (e.g. 1.20) — callers compute 1 + percent/100, not the raw percent"
  - "HA reserve (+1) is applied after Math.max() of the three constraints, not before — prevents double-counting"
  - "determineLimitingResource is private to constraints.ts — only computeScenarioResult is exported"
  - "Utilization metrics use finalCount (post-HA) as the denominator, not rawCount"

patterns-established:
  - "Formula pattern: single Math.ceil at the return statement, no intermediate rounding"
  - "NaN cascade prevention: all numeric inputs pass through parseNumericInput before arithmetic"
  - "Type pattern: readonly interfaces for all data structures; Object.freeze on results"

requirements-completed: [CALC-01, CALC-02, CALC-03, CALC-04, CALC-05, CALC-06]

# Metrics
duration: 3min
completed: 2026-03-12
---

# Phase 1 Plan 2: Sizing Calculation Engine Summary

**Pure TypeScript sizing engine with CPU/RAM/disk constraints, N+1 HA reserve, and utilization metrics — 30 tests green, zero TypeScript errors**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-12T18:57:35Z
- **Completed:** 2026-03-12T19:01:15Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Implemented three pure formula functions (CALC-01/02/03) with correct headroom factor handling and Math.ceil only at final output
- Implemented computeScenarioResult (CALC-04/05/06) with max-constraint selection, N+1 HA reserve, and per-resource utilization metrics
- All three fixture pairs verified: CPU-limited (24 servers), RAM-limited (19 servers), disk-limited (12 servers)
- HA reserve test: CPU-limited fixture with haReserveEnabled=true returns finalCount=25 (rawCount+1)
- 30 tests pass across all three test files; npx tsc --noEmit zero errors; no React imports in src/lib/

## Task Commits

Each task was committed atomically:

1. **Task 1: Type contracts, defaults, and parseNumericInput (TDD green)** - `72f0182` (feat)
2. **Task 2: Formula functions and computeScenarioResult (TDD green)** - `b836c92` (feat)

_Note: TDD tasks include RED (failing test) and GREEN (implementation) within the same task commit_

## Files Created/Modified

- `src/types/cluster.ts` - OldCluster and Scenario readonly interfaces
- `src/types/results.ts` - ScenarioResult readonly interface and LimitingResource union type
- `src/lib/sizing/defaults.ts` - Industry-standard constants (4:1 vCPU:pCore, 20% headroom) and createDefaultScenario factory
- `src/lib/sizing/parseNumericInput.ts` - parseNumericInput and parsePositiveInput with isFinite() NaN cascade prevention
- `src/lib/sizing/formulas.ts` - serverCountByCpu, serverCountByRam, serverCountByDisk pure math functions
- `src/lib/sizing/constraints.ts` - computeScenarioResult public API, private determineLimitingResource helper
- `src/lib/sizing/__tests__/parseNumericInput.test.ts` - 12 tests: null returns for invalid inputs, correct values for valid
- `src/lib/sizing/__tests__/formulas.test.ts` - 7 tests: fixture assertions + FP boundary + ceil rounding
- `src/lib/sizing/__tests__/constraints.test.ts` - 11 tests: three constraint fixtures, HA reserve, utilization metrics

## Decisions Made

- **headroomFactor as multiplicative factor:** Formulas receive the pre-computed factor (1.20) not the raw percent (20). This keeps formula functions as pure math with no magic constants.
- **HA reserve post-max():** The +1 is applied after Math.max(cpu, ram, disk). Applying it before would incorrectly inflate the max selection.
- **Object.freeze on result:** ScenarioResult is never mutated; freeze enforces the readonly contract at runtime, not just TypeScript type-checking.
- **Utilization uses finalCount:** Denominators use finalCount (including any HA server) to reflect true per-server load in the deployed configuration.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Sizing engine is correct and fully tested — ready for React component and hook layers to consume computeScenarioResult
- All six files match the exact interface shapes specified in the plan
- Any component importing from src/lib/sizing/ can rely on the frozen, typed return value

---
*Phase: 01-foundation*
*Completed: 2026-03-12*
