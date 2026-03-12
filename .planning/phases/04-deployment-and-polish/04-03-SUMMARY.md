---
phase: 04-deployment-and-polish
plan: 03
subsystem: ui
tags: [react, typescript, vitest, formula-display, tdd, sizing]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: sizing formula functions (formulas.ts) and type interfaces
  - phase: 04-01
    provides: Wave 0 display.test.ts stubs to fill
provides:
  - src/lib/sizing/display.ts with cpuFormulaString, ramFormulaString, diskFormulaString
  - 6 real unit tests replacing it.todo stubs in display.test.ts
  - ScenarioResults.tsx rendering inline formula strings below each constraint count
affects:
  - step2 components, any future use of CALC-07 formula transparency

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CALC-07 formula transparency: formula strings rendered inline below each server count"
    - "headroomPercent → display string convention: 20% headroom shown as 120% multiplier in formula (e.g. × 120%)"
    - "coresPerServer = socketsPerServer * coresPerSocket computed inline by caller, not imported from constraints.ts"

key-files:
  created:
    - src/lib/sizing/display.ts
  modified:
    - src/lib/sizing/__tests__/display.test.ts
    - src/components/step2/ScenarioResults.tsx

key-decisions:
  - "display.ts placed in src/lib/sizing/ (not src/lib/display/) to co-locate with formulas.ts — CALC-07 is a sibling of the sizing library"
  - "Formula strings show 'ceil(N × 120% / P / Q)' format — 100+headroomPercent% is clearer than 1.20 factor for users"
  - "useClusterStore added to ScenarioResults to supply totalVcpus and totalVms to formula string functions"
  - "Formula strings rendered as font-mono text-xs text-muted-foreground — visible but not dominant"

patterns-established:
  - "Formula string functions accept headroomPercent (user mental model), conversion to display format is internal"
  - "Pure TypeScript formula display functions co-located with formula math in src/lib/sizing/"

requirements-completed: [DEPLOY-01]

# Metrics
duration: 2min
completed: 2026-03-12
---

# Phase 4 Plan 03: Formula Display Module Summary

**Pure formula string generators (CALC-07) with 6 tests and inline rendering in ScenarioResults via TDD**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-12T21:24:17Z
- **Completed:** 2026-03-12T21:26:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created `src/lib/sizing/display.ts` with three pure TypeScript formula string functions (cpuFormulaString, ramFormulaString, diskFormulaString) — no React, no any, strict mode compliant
- Replaced all 6 `it.todo` stubs in display.test.ts with real passing tests covering CALC-07 formula transparency requirement
- Wired display.ts into ScenarioResults.tsx so users see inline formula strings (e.g. `ceil(2000 × 120% / 4 / 48)`) below each constraint server count — 84 lines, under 150-line guideline
- Full test suite: 166 tests pass, 0 failures; build exits 0

## Task Commits

1. **Task 1: Create display.ts and fill display.test.ts with real tests** - `19d1b31` (feat + test, TDD)
2. **Task 2: Wire display.ts into ScenarioResults to show formula strings inline** - `0706f93` (feat)

## Files Created/Modified

- `src/lib/sizing/display.ts` - New: three exported pure formula string functions with TypeScript interfaces, no any
- `src/lib/sizing/__tests__/display.test.ts` - Modified: replaced 6 it.todo stubs with real tests asserting string type, ceil presence, and all parameter values including headroomPercent as "XX%"
- `src/components/step2/ScenarioResults.tsx` - Modified: added useClusterStore, imported formula string functions, rendered formula strings inline below each constraint count in font-mono text-xs

## Decisions Made

- `display.ts` placed in `src/lib/sizing/` alongside `formulas.ts` for co-location — CALC-07 formula transparency is a natural sibling of the sizing math
- Formula format `ceil(N × 120% / P / Q)` chosen over `ceil(N × 1.20 / P / Q)` — the percentage form matches how users think about headroom (STATE.md convention honored: headroomPercent accepted, not factor)
- `coresPerServer` computed inline as `socketsPerServer * coresPerSocket` in ScenarioResults — avoids importing constraints.ts, keeps dependency surface minimal

## Deviations from Plan

None - plan executed exactly as written.

Note: An earlier implementation of formula strings exists at `src/lib/display/formulaStrings.ts` with `getCpuFormulaString` etc. (different function names, different path). The plan specifically requires `src/lib/sizing/display.ts` with `cpuFormulaString` naming — both files serve CALC-07 but from different eras of the implementation. The new display.ts follows the plan's exact spec.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CALC-07 formula transparency is fully implemented and tested
- ScenarioResults shows transparent math inline; users can verify sizing against any reference spreadsheet
- Phase 4 polish goal of formula transparency is complete

## Self-Check

- [x] `src/lib/sizing/display.ts` exists: FOUND
- [x] `src/lib/sizing/__tests__/display.test.ts` updated with real tests: FOUND
- [x] `src/components/step2/ScenarioResults.tsx` imports cpuFormulaString: FOUND
- [x] Commit 19d1b31: FOUND (Task 1)
- [x] Commit 0706f93: FOUND (Task 2)
- [x] 166 tests pass, 0 failures
- [x] npm run build exits 0

## Self-Check: PASSED

---
*Phase: 04-deployment-and-polish*
*Completed: 2026-03-12*
