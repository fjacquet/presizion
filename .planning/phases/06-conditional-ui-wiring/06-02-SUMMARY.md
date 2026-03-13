---
phase: 06-conditional-ui-wiring
plan: 02
subsystem: ui
tags: [react, typescript, zustand, react-hook-form, specint, conditional-rendering, tdd]

# Dependency graph
requires:
  - phase: 06-conditional-ui-wiring
    provides: SizingModeToggle and useWizardStore.sizingMode — required for conditional rendering
  - phase: 05-specint-and-utilization-formula-engine
    provides: specintFormulaString from display.ts and LimitingResource type from results.ts

provides:
  - CurrentClusterForm with unconditional CPU/RAM utilization % fields (SC-4)
  - CurrentClusterForm with conditional specintPerServer + existingServerCount fields in specint mode (PERF-02)
  - Extended handleNext guard blocking advance when specintPerServer empty in specint mode
  - ScenarioCard with conditional targetSpecint field in specint mode (PERF-03)
  - ScenarioResults with conditional SPECint formula row using specintFormulaString
  - ComparisonTable with RESOURCE_LABELS lookup replacing capitalize() for limitingResource display
affects:
  - 06-03 (if any remaining conditional wiring)
  - Phase 7 export functionality (will need to handle specint mode)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useWizardStore((s) => s.sizingMode) selector pattern used in components to drive conditional rendering"
    - "RESOURCE_LABELS Record<LimitingResource, string> for exhaustive, type-safe label lookup"
    - "TDD: RED (failing tests) → GREEN (implementation) → commit per task"

key-files:
  created: []
  modified:
    - src/components/step1/CurrentClusterForm.tsx
    - src/components/step1/__tests__/CurrentClusterForm.test.tsx
    - src/components/step2/ScenarioCard.tsx
    - src/components/step2/__tests__/ScenarioCard.test.tsx
    - src/components/step2/ScenarioResults.tsx
    - src/components/step3/ComparisonTable.tsx
    - src/components/step3/__tests__/ComparisonTable.test.tsx

key-decisions:
  - "RESOURCE_LABELS in ComparisonTable uses 'SPECint' (not 'SPECint-limited') for brevity in table cells; ScenarioResults uses 'SPECint-limited' for clarity in the results panel"
  - "capitalize() removed from ComparisonTable.tsx after RESOURCE_LABELS replaced its only usage — TS6133 auto-fix"
  - "SPECint formula row in ScenarioResults renders outside the 3-col grid as a separate row below (avoids grid layout disruption)"

patterns-established:
  - "Conditional section: sizingMode === 'specint' wraps the entire section, not individual fields — cleaner JSX structure"
  - "handleNext guard pattern: trigger validation array constructed from alwaysRequired + modeRequired — composable and mode-aware"
  - "Test isolation: useWizardStore.setState() in beforeEach resets sizingMode to 'vcpu' to prevent cross-test contamination"

requirements-completed: [PERF-02, PERF-03]

# Metrics
duration: 6min
completed: 2026-03-13
---

# Phase 06 Plan 02: Conditional UI Wiring Summary

**SPECint mode conditional fields wired across Step 1, Step 2, and Step 3: utilization inputs always visible, specintPerServer/targetSpecint gated on sizingMode, formula row inline, RESOURCE_LABELS replacing capitalize()**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-13T07:05:59Z
- **Completed:** 2026-03-13T07:11:40Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added unconditional CPU/RAM utilization % fields to CurrentClusterForm (SC-4 requirement)
- Added conditional SPECint fields (specintPerServer, existingServerCount) visible only in specint mode with handleNext guard blocking advance when empty (PERF-02)
- Added conditional targetSpecint field in ScenarioCard and SPECint formula row in ScenarioResults (PERF-03)
- Fixed ComparisonTable limitingResource display: 'SPECint' (correct) vs 'Specint' (capitalize bug)
- All 222 tests pass; build clean with zero TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: CurrentClusterForm — add SPECint + utilization fields + extend handleNext** - `ed7ac84` (feat)
2. **Task 2: ScenarioCard + ScenarioResults conditional fields + ComparisonTable fix** - `733daa8` (feat)

## Files Created/Modified

- `src/components/step1/CurrentClusterForm.tsx` - Added sizingMode selector, unconditional utilization % section, conditional SPECint section, extended handleNext guard
- `src/components/step1/__tests__/CurrentClusterForm.test.tsx` - Added PERF-02 and SC-4 test cases (26 total tests)
- `src/components/step2/ScenarioCard.tsx` - Added sizingMode selector, conditional targetSpecint Controller field
- `src/components/step2/__tests__/ScenarioCard.test.tsx` - Added PERF-03 targetSpecint conditional field tests
- `src/components/step2/ScenarioResults.tsx` - Added sizingMode selector, conditional SPECint formula row using specintFormulaString
- `src/components/step3/ComparisonTable.tsx` - Added RESOURCE_LABELS, replaced capitalize(limitingResource) lookup, removed unused capitalize()
- `src/components/step3/__tests__/ComparisonTable.test.tsx` - Filled PERF-03 it.todo stubs with real tests using mocked useScenariosResults

## Decisions Made

- RESOURCE_LABELS in ComparisonTable uses 'SPECint' (not 'SPECint-limited') for brevity in table cells; ScenarioResults uses 'SPECint-limited' for clarity in the results panel
- capitalize() removed from ComparisonTable.tsx after RESOURCE_LABELS replaced its only usage — TypeScript TS6133 error prompted auto-removal
- SPECint formula row in ScenarioResults renders outside the 3-col grid as a separate row below to avoid disrupting the 3-column layout
- ComparisonTable tests mocked useScenariosResults (vi.mock) to control limitingResource = 'specint' independently of actual formula engine

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused capitalize() function in ComparisonTable.tsx**
- **Found during:** Task 2 (npm run build verification)
- **Issue:** After replacing capitalize(result.limitingResource) with RESOURCE_LABELS[result.limitingResource], TypeScript reported TS6133 — capitalize declared but its value is never read
- **Fix:** Removed the capitalize() function entirely since it was only used for limitingResource display
- **Files modified:** src/components/step3/ComparisonTable.tsx
- **Verification:** npm run build exits 0 with zero TypeScript errors
- **Committed in:** 733daa8 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - dead code from replacement)
**Impact on plan:** Fix necessary for clean TypeScript build. No scope creep.

## Issues Encountered

None — both tasks executed exactly as planned with TDD RED/GREEN cycles.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PERF-02 and PERF-03 requirements are complete
- SPECint mode UI is fully wired: toggle → conditional fields in Step 1, Step 2, results panel, and comparison table
- Phase 7 (export) will need to handle specint mode in CSV/JSON output if required

---
*Phase: 06-conditional-ui-wiring*
*Completed: 2026-03-13*
