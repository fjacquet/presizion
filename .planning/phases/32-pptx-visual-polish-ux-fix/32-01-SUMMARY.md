---
phase: 32-pptx-visual-polish-ux-fix
plan: 01
subsystem: ui
tags: [defaults, scenario, testing, vitest, tdd]

# Dependency graph
requires: []
provides:
  - "createDefaultScenario() returns 'To-Be' as the default scenario name"
  - "Unit test suite for src/lib/sizing/defaults.ts (4 tests)"
affects:
  - "useScenariosStore (calls createDefaultScenario on add)"
  - "Step 2 scenario cards (display name field)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD for pure utility functions in src/lib/sizing/__tests__/"

key-files:
  created:
    - src/lib/sizing/__tests__/defaults.test.ts
  modified:
    - src/lib/sizing/defaults.ts

key-decisions:
  - "Default scenario name changed from 'New Scenario' to 'To-Be' — presales standard terminology"

patterns-established:
  - "Test pattern: createDefaultScenario unit tests cover name, UUID format, required fields, uniqueness"

requirements-completed: [UX-01]

# Metrics
duration: 5min
completed: 2026-03-24
---

# Phase 32 Plan 01: Default Scenario Name "To-Be" Summary

**createDefaultScenario() now returns "To-Be" as scenario name with 4-test TDD coverage in defaults.test.ts**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-24T14:21:30Z
- **Completed:** 2026-03-24T14:26:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Changed default scenario name from "New Scenario" to "To-Be" in createDefaultScenario()
- Created src/lib/sizing/__tests__/defaults.test.ts with 4 tests (TDD RED then GREEN)
- Full test suite: 651 tests pass; 6 pre-existing failures in exportPptx.ts (unrelated, deferred)

## Task Commits

Each task was committed atomically:

1. **Task 1: Change default scenario name to "To-Be" and add test** - `e92ecb4` (feat)

## Files Created/Modified

- `src/lib/sizing/defaults.ts` — changed `name: 'New Scenario'` to `name: 'To-Be'`
- `src/lib/sizing/__tests__/defaults.test.ts` — 4 unit tests: name assertion, UUID format, required fields, unique IDs

## Decisions Made

- "To-Be" chosen over "New Scenario" as it reflects presales domain language (current state = As-Is, target state = To-Be)
- TDD approach used: tests written first (RED), then code fixed (GREEN), confirming test validity

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- 6 pre-existing test failures in `src/lib/utils/exportPptx.ts` (`ReferenceError: Cannot access 'NAVY' before initialization`) — these pre-date this plan and are unrelated to defaults.ts changes. Deferred to phase 32 PPTX work.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- UX-01 satisfied: new scenarios will display "To-Be" label without manual rename
- Phase 32 Plan 02 (PPTX export visual polish) can proceed; the NAVY initialization error in exportPptx.ts needs to be addressed there

---
*Phase: 32-pptx-visual-polish-ux-fix*
*Completed: 2026-03-24*
