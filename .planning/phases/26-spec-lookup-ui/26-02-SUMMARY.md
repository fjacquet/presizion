---
phase: 26-spec-lookup-ui
plan: 02
subsystem: ui
tags: [react, spec-lookup, scenario-card, debounce, specint]

requires:
  - phase: 26-spec-lookup-ui/01
    provides: useSpecLookup hook, SpecResultsPanel component, fetchSpecResults service
provides:
  - ScenarioCard with integrated SPEC lookup for target CPU in SPECint mode
affects: [step2, scenario-card]

tech-stack:
  added: []
  patterns: [debounced-search-input, local-ui-state-not-persisted]

key-files:
  created: []
  modified:
    - src/components/step2/ScenarioCard.tsx
    - src/components/step2/__tests__/ScenarioCard.test.tsx

key-decisions:
  - "targetCpuModel is purely local UI state (useState), not added to Scenario type or Zod schema -- per derive-on-read pattern"
  - "Debounce implemented via useEffect + setTimeout (500ms) to avoid excessive API calls"
  - "SpecResultsPanel only rendered when debouncedCpuModel is set, keeping UI clean before user types"

patterns-established:
  - "Debounced search: useState for raw input, useEffect with setTimeout to produce debounced value, hook consumes debounced value"

requirements-completed: [SPEC-LOOKUP-04]

duration: 4min
completed: 2026-03-15
---

# Phase 26 Plan 02: SPEC Lookup in ScenarioCard Summary

**Target CPU SPEC lookup wired into Step 2 ScenarioCard with debounced search input and auto-fill of targetSpecint on result selection**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-15T19:02:15Z
- **Completed:** 2026-03-15T19:05:45Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- ScenarioCard in SPECint mode now shows a "Target CPU Model" text input with debounced search
- SpecResultsPanel renders below search input showing matching SPECrate2017 benchmark results
- Clicking a result row auto-fills the targetSpecint form field via form.setValue
- Manual targetSpecint input remains fully functional alongside lookup
- All 596 project tests pass, no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Failing tests for SPEC lookup** - `6ef3407` (test)
2. **Task 1 (GREEN): Wire SPEC lookup into ScenarioCard** - `3dde846` (feat)
3. **Task 2: Full regression check** - verification only, no code changes needed

_Note: TDD task had RED + GREEN commits. No REFACTOR needed._

## Files Created/Modified
- `src/components/step2/ScenarioCard.tsx` - Added target CPU model search input, debounce logic, SpecResultsPanel integration, handleSpecSelect callback
- `src/components/step2/__tests__/ScenarioCard.test.tsx` - Added 4 tests for SPEC-LOOKUP-04: input rendering in SPECint/vcpu modes, debounced fetch trigger, result row click auto-fill

## Decisions Made
- targetCpuModel kept as local useState, not persisted in Scenario type (transient search query per derive-on-read pattern)
- 500ms debounce via useEffect+setTimeout avoids extra dependency
- SpecResultsPanel only renders when debouncedCpuModel is truthy, preventing empty panel display

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed handleSpecSelect referencing form before initialization**
- **Found during:** Task 1 GREEN phase
- **Issue:** useCallback for handleSpecSelect was declared before useForm call, causing ReferenceError
- **Fix:** Moved handleSpecSelect declaration after useForm initialization
- **Files modified:** src/components/step2/ScenarioCard.tsx
- **Verification:** All 35 ScenarioCard tests pass
- **Committed in:** 3dde846

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor ordering fix, no scope creep.

## Issues Encountered
- Pre-existing TypeScript errors (6) in `src/lib/utils/__tests__/specLookup.test.ts` from Plan 01 -- logged to deferred-items.md, out of scope for this plan

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- SPEC lookup UI fully integrated in both Step 1 (CurrentClusterForm) and Step 2 (ScenarioCard)
- Ready for any remaining SPEC lookup plans (slug derivation validation, etc.)

---
*Phase: 26-spec-lookup-ui*
*Completed: 2026-03-15*
