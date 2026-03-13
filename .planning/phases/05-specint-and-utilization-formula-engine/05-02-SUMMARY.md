---
phase: 05-specint-and-utilization-formula-engine
plan: 02
subsystem: formula-engine, display
tags: [typescript, tdd, specint, utilization, formulas, display]

# Dependency graph
requires:
  - phase: 05-specint-and-utilization-formula-engine
    plan: 01
    provides: OldCluster/Scenario types with specint/utilization fields; LimitingResource 4-way union; Wave 0 it.todo stubs
provides:
  - serverCountBySpecint exported from formulas.ts (pure SPECint formula function)
  - serverCountByCpu with optional cpuUtilPct=100 (backward-compat, right-sizing support)
  - serverCountByRam with optional ramUtilPct=100 (backward-compat, right-sizing support)
  - computeScenarioResult with optional sizingMode='vcpu'|'specint' (backward-compat)
  - specintFormulaString exported from display.ts
  - getCpuFormulaString updated to show utilization factor when cpuUtilPct != 100
  - getSpecintFormulaString exported from formulaStrings.ts
affects: [05-03, 06-specint-ui-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optional parameter with default (cpuUtilPct=100, ramUtilPct=100, sizingMode='vcpu') preserves backward-compat"
    - "SPECint zero-guard: if targetSPECint <= 0 return 0 — prevents division by zero"
    - "determineLimitingResource returns 'specint' when sizingMode='specint' and cpu slot wins"
    - "TDD red-green: 14 failing tests committed before any implementation"

key-files:
  modified:
    - src/lib/sizing/formulas.ts
    - src/lib/sizing/constraints.ts
    - src/lib/sizing/display.ts
    - src/lib/display/formulaStrings.ts
    - src/lib/sizing/__tests__/formulas.test.ts
    - src/lib/sizing/__tests__/constraints.test.ts
    - src/lib/sizing/__tests__/display.test.ts
    - src/lib/display/__tests__/formulaStrings.test.ts

key-decisions:
  - "sizingMode passed as optional 3rd param to computeScenarioResult (default 'vcpu') — no breaking change to existing callers"
  - "cpuUtilPct and ramUtilPct use default=100 — division by 100 yields 1.0 multiplier, identity for existing math"
  - "determineLimitingResource reuses cpu slot for specint — consistent tie-breaking priority, avoids 4-arg refactor of max logic"
  - "formulaStrings.ts getSpecintFormulaString computes result via serverCountBySpecint — single source of truth for arithmetic"

# Metrics
duration: 4min
completed: 2026-03-13
---

# Phase 5 Plan 02: SPECint Formula and Utilization Scaling Summary

**TDD implementation of SPECint formula (serverCountBySpecint), utilization scaling (cpuUtilPct/ramUtilPct), and extended display strings — 186 tests green, tsc clean**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-13T06:35:35Z
- **Completed:** 2026-03-13T06:39:00Z (approx)
- **Tasks:** 2 (TDD RED + TDD GREEN)
- **Files modified:** 8 (0 created, 8 modified)

## Accomplishments

- `serverCountBySpecint(existingServers, oldSPECintPerServer, growthHeadroomFactor, targetSPECint)` added to formulas.ts with zero-guard for targetSPECint <= 0
- `serverCountByCpu` gains optional 5th param `cpuUtilPct=100` — backward-compatible; scales vCPU demand by (utilPct/100) before sizing
- `serverCountByRam` gains optional 5th param `ramUtilPct=100` — backward-compatible; scales RAM demand by (utilPct/100) before sizing
- `computeScenarioResult` gains optional 3rd param `sizingMode='vcpu'|'specint'` — SPECint branch uses `serverCountBySpecint`; vcpu branch reads `cluster.cpuUtilizationPercent`; both RAM/disk read `cluster.ramUtilizationPercent`
- `determineLimitingResource` returns `'specint'` (not `'cpu'`) when sizingMode='specint' and cpu slot wins
- `specintFormulaString` added to display.ts — formats `ceil(N servers × X SPECint × F / T SPECint)`
- `cpuFormulaString` in display.ts accepts optional `cpuUtilizationPercent` — shows utilization factor in formula string when not 100
- `getSpecintFormulaString` added to formulaStrings.ts — computes result via `serverCountBySpecint` and appends `= N servers`
- `getCpuFormulaString` in formulaStrings.ts passes utilization to formula and shows `cpuUtilPct%` in string when not 100
- All 14 former it.todo stubs are now real passing tests
- Full test suite: 186 pass, 0 fail; tsc exits 0

## Regression Verification

All existing fixtures confirmed still passing:
- `computeScenarioResult(CPU_LIMITED_CLUSTER, CPU_LIMITED_SCENARIO).finalCount === 24`
- `computeScenarioResult(RAM_LIMITED_CLUSTER, RAM_LIMITED_SCENARIO).finalCount === 19`
- `computeScenarioResult(DISK_LIMITED_CLUSTER, DISK_LIMITED_SCENARIO).finalCount === 12`
- `serverCountByCpu(3200, 1.20, 4, 40)` (no 5th arg) `=== 24`
- `serverCountByRam(500, 16, 1.20, 512)` (no 5th arg) `=== 19`

## Task Commits

Each task committed atomically:

1. **Task 1 (RED): Fill it.todo stubs with failing tests** - `a07aab5` (test)
2. **Task 2 (GREEN): Implement SPECint formula and utilization scaling** - `2490d0f` (feat)

## Files Created/Modified

- `src/lib/sizing/formulas.ts` - +serverCountBySpecint; +cpuUtilPct param to serverCountByCpu; +ramUtilPct param to serverCountByRam
- `src/lib/sizing/constraints.ts` - +sizingMode param; SPECint branch; utilization propagation to formulas
- `src/lib/sizing/display.ts` - +SpecintFormulaParams; +specintFormulaString; +cpuUtilizationPercent to CpuFormulaParams
- `src/lib/display/formulaStrings.ts` - +SpecintFormulaParams; +getSpecintFormulaString; +cpuUtilizationPercent to getCpuFormulaString
- `src/lib/sizing/__tests__/formulas.test.ts` - 8 new tests (SPECint fixture, zero-guard, utl scaling)
- `src/lib/sizing/__tests__/constraints.test.ts` - 7 new tests (SPECint mode, regression, utilization scaling)
- `src/lib/sizing/__tests__/display.test.ts` - 3 new tests (specintFormulaString, cpuFormulaString util)
- `src/lib/display/__tests__/formulaStrings.test.ts` - 4 new tests (getSpecintFormulaString, getCpuFormulaString util)

## Decisions Made

- `sizingMode` passed as optional 3rd param to `computeScenarioResult` (default `'vcpu'`) — no breaking change to existing callers; all existing tests pass without modification
- `cpuUtilPct` and `ramUtilPct` use `default=100` — division by 100 yields 1.0 multiplier, exact identity for existing math ensuring zero regression
- `determineLimitingResource` reuses cpu slot for specint — returns `'specint'` when sizingMode='specint' and cpu-slot count wins — consistent tie-breaking priority
- `getCpuFormulaString` in formulaStrings.ts propagates utilization to `serverCountBySpecint` import — single source of truth for arithmetic

## Deviations from Plan

None - plan executed exactly as written. TDD red-green cycles followed strictly.

## Self-Check: PASSED

All created/modified files verified present. Task commits a07aab5 and 2490d0f confirmed in git history.

---
*Phase: 05-specint-and-utilization-formula-engine*
*Completed: 2026-03-13*
