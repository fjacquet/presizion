---
phase: 01-foundation
plan: 04
subsystem: display
tags: [typescript, vitest, tdd, pure-functions, display, formula-strings]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "serverCountByCpu, serverCountByRam, serverCountByDisk pure formula functions from src/lib/sizing/formulas.ts"
provides:
  - "getCpuFormulaString, getRamFormulaString, getDiskFormulaString display functions (CALC-07)"
  - "CpuFormulaParams, RamFormulaParams, DiskFormulaParams TypeScript interfaces"
  - "Human-readable formula strings with substituted values for inline UI rendering"
affects: [02-components, 03-hooks]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Display module is pure TypeScript with zero React imports — presentation-only, no framework dependency"
    - "headroomPercent is converted to headroomFactor (1 + percent/100) in display layer, not passed as raw percent"
    - "headroomFactor displayed with .toFixed(2) for consistent 2-decimal-place formatting"
    - "Display functions delegate math to existing formulas.ts (DRY — no duplicated Math.ceil logic)"

key-files:
  created:
    - src/lib/display/formulaStrings.ts
  modified:
    - src/lib/display/__tests__/formulaStrings.test.ts

key-decisions:
  - "Display functions import from formulas.ts rather than duplicating Math.ceil logic — DRY principle keeps single source of truth for math"
  - "headroomPercent (not headroomFactor) is the external-facing param for display functions — matches user mental model; conversion to factor is internal"
  - "Output format 'ceil(...) = N servers' mirrors CONTEXT.md examples exactly for slide/email readability"

patterns-established:
  - "Display pattern: human-readable formula strings live in src/lib/display/, separate from src/lib/sizing/ math"
  - "Param interface pattern: each display function has its own named param interface (CpuFormulaParams, RamFormulaParams, DiskFormulaParams)"

requirements-completed: [CALC-07]

# Metrics
duration: 5min
completed: 2026-03-12
---

# Phase 1 Plan 4: Formula Display Strings Summary

**Pure TypeScript display module with getCpuFormulaString/getRamFormulaString/getDiskFormulaString producing "ceil(...) = N servers" strings for CALC-07 inline UI rendering — 34 tests green, zero TypeScript errors**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-12T18:03:58Z
- **Completed:** 2026-03-12T18:08:00Z
- **Tasks:** 1 (TDD: RED → GREEN)
- **Files modified:** 2

## Accomplishments

- Implemented getCpuFormulaString, getRamFormulaString, and getDiskFormulaString as a pure TypeScript module with zero React imports
- Each function converts headroomPercent to headroomFactor (1+percent/100), delegates math to formulas.ts, and returns a human-readable template literal
- All three fixture pairs verified: CPU (24 servers), RAM (19 servers), disk (12 servers) match CALC-01/02/03 formula results
- Full test suite: 34 tests pass across all test files; npx tsc --noEmit zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Formula display strings (TDD red → green)** - `e04660c` (feat)

**Plan metadata:** (pending docs commit)

_Note: TDD task includes RED (failing test import) and GREEN (implementation) within the same task commit_

## Files Created/Modified

- `src/lib/display/formulaStrings.ts` - Three display functions + three TypeScript parameter interfaces; imports serverCount* from sizing/formulas.ts
- `src/lib/display/__tests__/formulaStrings.test.ts` - 4 real assertions replacing .todo stubs; tests contain/type checks on all substituted values

## Decisions Made

- **DRY math via import:** Display functions import from `../sizing/formulas.ts` rather than duplicating the Math.ceil arithmetic. This ensures display strings always show the same result as the calculation engine.
- **headroomPercent as external param:** The display interfaces accept `headroomPercent` (e.g., 20) rather than `headroomFactor` (1.20). Conversion to the multiplicative factor is an internal implementation detail, matching user-facing mental models.
- **Output format:** `"ceil(${inputs}) = ${result} servers"` format uses × (multiplication sign) for readability in slides and emails, matching CONTEXT.md specification.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

**Pre-existing issue (out of scope, deferred):** `src/schemas/__tests__/schemas.test.ts` is an untracked stub file referencing `currentClusterSchema` and `scenarioSchema` that don't exist yet. This causes Vitest to exit with code 1 even though all 34 test assertions pass. This is a pre-existing issue from a future plan stub, not caused by Plan 04 changes. Logged to `deferred-items.md`.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Formula display module is complete and ready for React components to consume in Plan 02 (components phase)
- The display module's named param interfaces (CpuFormulaParams etc.) provide clean TypeScript contracts for component integration
- No React dependency means the module can be imported anywhere without framework coupling

---
_Phase: 01-foundation_
_Completed: 2026-03-12_
