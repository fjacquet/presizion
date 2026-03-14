---
phase: 17-chart-polish-specrate-ux-reset
plan: 03
subsystem: ui
tags: [react, zustand, dialog, reset, wizard, localStorage]

# Dependency graph
requires:
  - phase: 12-dark-mode-toggle
    provides: Dialog component (base-ui), ThemeToggle pattern in WizardShell header
  - phase: 15-persistence
    provides: presizion-session localStorage key, persistence architecture
provides:
  - Reset button in WizardShell header with confirmation dialog
  - Full data reset (cluster, scenarios, import stores, localStorage session)
  - Theme-preserving reset (presizion-theme key survives)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [confirmation-dialog-before-destructive-action, store-reset-via-getState]

key-files:
  created: []
  modified:
    - src/components/wizard/WizardShell.tsx
    - src/components/wizard/__tests__/WizardShell.test.tsx

key-decisions:
  - "Reset uses store.getState() pattern to avoid hook subscription overhead for one-shot operations"
  - "localStorage.removeItem targets only presizion-session; presizion-theme preserved by design"
  - "Reset button uses RotateCcw icon with ghost variant, positioned left-side symmetrical with ThemeToggle right-side"
  - "localStorage mock uses vi.stubGlobal pattern consistent with useThemeStore and persistence test files"

patterns-established:
  - "Confirmation dialog pattern: useState for open state, Dialog with controlled open/onOpenChange, Cancel + destructive action buttons in DialogFooter"

requirements-completed: [RESET-01, RESET-02, RESET-03, RESET-04]

# Metrics
duration: 5min
completed: 2026-03-14
---

# Phase 17 Plan 03: Reset Button Summary

**Reset button with confirmation dialog in WizardShell that clears all stores, localStorage session, and returns to Step 1 while preserving theme preference**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-14T14:44:38Z
- **Completed:** 2026-03-14T14:49:44Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 2

## Accomplishments
- Reset button (RotateCcw icon) visible in WizardShell header on all 3 wizard steps
- Confirmation dialog prevents accidental data loss with Cancel/Reset buttons
- Full store reset: cluster (resetCluster), scenarios (setScenarios with default), import (clearImport), wizard (goToStep(1), setSizingMode('vcpu'), setLayoutMode('hci'))
- localStorage presizion-session removed; presizion-theme preserved
- 11 new tests covering all reset behaviors; all 441 project tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing tests for Reset button** - `5f7ab59` (test)
2. **Task 1 GREEN: Implement Reset button and dialog** - `8271f20` (feat, co-committed with 17-02 due to formatter hook)

_Note: The WizardShell.tsx implementation was auto-staged by a pre-commit formatter hook during the 17-02 plan commit. The code is correct and tested._

## Files Created/Modified
- `src/components/wizard/WizardShell.tsx` - Added Reset button, confirmation dialog, handleConfirmReset function
- `src/components/wizard/__tests__/WizardShell.test.tsx` - Added 11 tests for RESET-01..04 requirements

## Decisions Made
- Reset uses `store.getState()` pattern to avoid hook subscription overhead for one-shot reset operations
- `localStorage.removeItem('presizion-session')` used instead of `localStorage.clear()` to preserve theme preference
- Reset button positioned left-side of header for visual symmetry with ThemeToggle on the right
- localStorage mock uses `vi.stubGlobal` pattern consistent with project test conventions (useThemeStore, persistence tests)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] localStorage mock setup for test environment**
- **Found during:** Task 1 RED (test writing)
- **Issue:** jsdom localStorage unavailable as expected global in test context; `localStorage.setItem is not a function`
- **Fix:** Added `vi.stubGlobal('localStorage', localStorageMock)` with a full mock implementing getItem/setItem/removeItem/clear/length/key, following established project pattern from useThemeStore tests
- **Files modified:** src/components/wizard/__tests__/WizardShell.test.tsx
- **Verification:** All 28 WizardShell tests pass
- **Committed in:** 5f7ab59 (RED commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** localStorage mock was necessary for test environment compatibility. No scope creep.

## Issues Encountered
- WizardShell.tsx implementation was co-committed with 17-02 plan due to pre-commit formatter hook auto-staging the file. The code is functionally correct and all tests verify the behavior.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 17 complete: all 3 plans (chart polish, SPECrate UX, reset button) delivered
- All 441 tests pass, zero TypeScript errors
- No blockers for next milestone

---
*Phase: 17-chart-polish-specrate-ux-reset*
*Completed: 2026-03-14*
