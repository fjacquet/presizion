---
phase: 05-specint-and-utilization-formula-engine
plan: 01
subsystem: types, schemas, store
tags: [typescript, zod, zustand, specint, utilization, tdd]

# Dependency graph
requires:
  - phase: 04-deployment-and-polish
    provides: Completed display module and existing type contracts (OldCluster, Scenario, LimitingResource)
provides:
  - OldCluster interface extended with existingServerCount, specintPerServer, cpuUtilizationPercent, ramUtilizationPercent optional fields
  - Scenario interface extended with targetSpecint optional field
  - LimitingResource union extended with 'specint' literal (4-way union)
  - currentClusterSchema with optionalPercent (0-100) and optionalPositiveNumber validators
  - scenarioSchema with targetSpecint optional field
  - useWizardStore with sizingMode ('vcpu' | 'specint') state and setSizingMode action
  - SizingMode type exported for use in other modules
  - Wave 0 it.todo test stubs for PERF-01, PERF-03, PERF-04, PERF-05, UTIL-01, UTIL-02, UTIL-03 across 5 test files
affects: [05-02, 05-03, 06-specint-ui-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Nyquist Wave 0 stubs use it.todo (not it.skip) so Vitest counts as pending not failing"
    - "optionalPercent validator: z.preprocess(numericPreprocess, z.number().min(0).max(100).optional())"
    - "optionalPositiveNumber validator: z.preprocess(numericPreprocess, z.number().positive().optional())"
    - "SizingMode as exported type alias; store field with setSizingMode action in Zustand"

key-files:
  created:
    - src/store/__tests__/useWizardStore.test.ts
    - src/store/__tests__/useScenariosResults.test.ts
  modified:
    - src/types/cluster.ts
    - src/types/results.ts
    - src/schemas/currentClusterSchema.ts
    - src/schemas/scenarioSchema.ts
    - src/store/useWizardStore.ts
    - src/lib/sizing/__tests__/formulas.test.ts
    - src/lib/sizing/__tests__/constraints.test.ts
    - src/lib/sizing/__tests__/display.test.ts
    - src/schemas/__tests__/schemas.test.ts

key-decisions:
  - "SizingMode exported type alias ('vcpu' | 'specint') from useWizardStore.ts — consumers import type directly, not string literals"
  - "optionalPercent uses z.number().min(0).max(100) — consistent with project's z.preprocess pattern (not z.coerce)"
  - "LimitingResource extended to 4-way union — tsc validates no unhandled switch cases in constraints.ts"

patterns-established:
  - "Wave 0 stubs: all new formula describe blocks added as it.todo in this plan; implementations in 05-02/05-03"
  - "Type-first discipline: types and contracts established before formula engine implementation plans"

requirements-completed:
  - PERF-01
  - UTIL-01
  - UTIL-02

# Metrics
duration: 3min
completed: 2026-03-13
---

# Phase 5 Plan 01: SPECint and Utilization Types, Schemas, Store Summary

**Type contracts and Zod schemas for SPECint/utilization modes established; Zustand sizingMode toggle added; Wave 0 it.todo stubs scaffold all Phase 5 test describe blocks**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-13T06:28:49Z
- **Completed:** 2026-03-13T06:31:41Z
- **Tasks:** 2
- **Files modified:** 9 (2 created, 7 modified)

## Accomplishments

- OldCluster and Scenario interfaces extended with Phase 5 optional fields (4 + 1 new fields)
- LimitingResource union is now a 4-way union including 'specint' — TypeScript validates exhaustive switch coverage
- currentClusterSchema validates cpuUtilizationPercent/ramUtilizationPercent in range [0, 100] via optionalPercent validator
- useWizardStore gains sizingMode ('vcpu' default) and setSizingMode action; SizingMode type exported
- Wave 0 it.todo stubs scaffolded across 5 test files covering PERF-01, PERF-03, PERF-04, PERF-05, UTIL-01, UTIL-02, UTIL-03
- Full test suite: 166 pass, 0 fail (stubs counted as pending)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend TypeScript types and Zod schemas** - `4b62804` (feat)
2. **Task 2: Extend useWizardStore with sizingMode + Wave 0 test stubs** - `22dcdf8` (feat)

## Files Created/Modified

- `src/types/cluster.ts` - OldCluster +4 optional fields; Scenario +targetSpecint
- `src/types/results.ts` - LimitingResource union extended with 'specint'
- `src/schemas/currentClusterSchema.ts` - optionalPercent and optionalPositiveNumber validators; 4 new schema fields
- `src/schemas/scenarioSchema.ts` - optionalPositiveNumber added; targetSpecint field
- `src/store/useWizardStore.ts` - SizingMode type exported; sizingMode + setSizingMode added
- `src/store/__tests__/useWizardStore.test.ts` - Wave 0 PERF-01 it.todo stubs (created)
- `src/store/__tests__/useScenariosResults.test.ts` - Wave 0 PERF-04/05 integration it.todo stubs (created)
- `src/lib/sizing/__tests__/formulas.test.ts` - PERF-04, UTIL-03 it.todo stubs appended
- `src/lib/sizing/__tests__/constraints.test.ts` - PERF-04/05, UTIL-03 it.todo stubs appended
- `src/lib/sizing/__tests__/display.test.ts` - PERF-04 display, UTIL-03 display it.todo stubs appended
- `src/schemas/__tests__/schemas.test.ts` - UTIL-01/02, PERF-01, PERF-03 it.todo stubs appended

## Decisions Made

- SizingMode exported as a type alias ('vcpu' | 'specint') from useWizardStore.ts — consumers import type directly, not raw string literals
- optionalPercent uses z.number().min(0).max(100) with z.preprocess — consistent with project pattern (not z.coerce)
- LimitingResource extended to 4-way union — rtk tsc validates no unhandled switch-cases in downstream code

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- All type contracts established — 05-02 (SPECint formula engine) and 05-03 (utilization scaling) can import from these types
- Wave 0 stubs provide structure for TDD RED phase in 05-02 and 05-03
- useWizardStore.sizingMode ready for formula engine to branch on in 05-02

## Self-Check: PASSED

All created/modified files verified present. Task commits 4b62804 and 22dcdf8 confirmed in git history.

---
*Phase: 05-specint-and-utilization-formula-engine*
*Completed: 2026-03-13*
