---
phase: 03-comparison-export-and-wizard-shell
plan: "03"
subsystem: ui
tags: [hooks, wizard, beforeunload, navigation, ux]

# Dependency graph
requires:
  - phase: 03-comparison-export-and-wizard-shell
    plan: "01"
    provides: Nyquist Wave 0 stubs for useBeforeUnload; shadcn table installed
provides:
  - src/hooks/useBeforeUnload.ts (useBeforeUnload(enabled: boolean): void hook)
  - src/components/wizard/WizardShell.tsx (Step 2 Next button, Step 3 routing, beforeunload guard wired)
  - src/components/step3/Step3ReviewExport.tsx (stub for parallel plan safety — 03-02 replaces with full impl)
affects:
  - 03-02: Step3ReviewExport stub exists so 03-02 can replace it with the real component

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useBeforeUnload hook: useEffect with enabled guard, cleanup via return function"
    - "parallel plan stub: create minimal export so import resolves; parallel plan replaces"

key-files:
  created:
    - src/hooks/useBeforeUnload.ts
    - src/components/step3/Step3ReviewExport.tsx
  modified:
    - src/hooks/__tests__/useBeforeUnload.test.ts
    - src/components/wizard/WizardShell.tsx
    - src/components/wizard/__tests__/WizardShell.test.tsx

key-decisions:
  - "Step3ReviewExport stub created by 03-03 (not 03-02) so WizardShell import resolves during parallel execution — 03-02 replaces stub with full implementation"
  - "vi.mock for Step3ReviewExport and useBeforeUnload in WizardShell tests isolates routing from parallel plan artifacts"

patterns-established:
  - "Parallel plan stub pattern: create minimal module stub so importing component resolves; parallel plan owns the implementation"

requirements-completed: [UX-05]

# Metrics
duration: 3min
completed: 2026-03-12
---

# Phase 3 Plan 03: useBeforeUnload Hook and WizardShell Navigation Completion Summary

**useBeforeUnload hook implemented with UX-05 page-exit guard; WizardShell completed with Step 2 Next button, Step 3 routing to Step3ReviewExport, and beforeunload wired — 135 tests green, 0 failures**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-12T20:40:29Z
- **Completed:** 2026-03-12T20:43:02Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Created `src/hooks/useBeforeUnload.ts`: pure hook that registers/removes `beforeunload` event listener based on `enabled` boolean; handler calls `e.preventDefault()` and sets `e.returnValue = ''` for cross-browser support
- Promoted all 5 `it.todo` stubs in `useBeforeUnload.test.ts` to real assertions; all pass via spy on `window.addEventListener` and `window.removeEventListener`
- Updated `WizardShell.tsx` surgically: added `useBeforeUnload(currentStep > 1)` call, imported `Step3ReviewExport`, added "Next: Review & Export" button on Step 2
- Added 8 new WizardShell tests covering Step 3 routing, Step 2 Next button, and UX-05 beforeunload guard; all 9 original tests still pass
- Created `Step3ReviewExport.tsx` stub so WizardShell import resolves during parallel execution with 03-02

## Task Commits

Each task was committed atomically:

1. **Task 1: useBeforeUnload hook with tests** - `e8d3331` (feat)
2. **Task 2: Update WizardShell** - `d113761` (feat)

## Files Created/Modified

- `src/hooks/useBeforeUnload.ts` — useBeforeUnload(enabled) hook; requirements UX-05
- `src/hooks/__tests__/useBeforeUnload.test.ts` — 5 real tests promoted from it.todo stubs
- `src/components/wizard/WizardShell.tsx` — Step 2 Next button, Step 3 routing, beforeunload wired
- `src/components/wizard/__tests__/WizardShell.test.tsx` — 8 new tests added; vi.mock for Step3ReviewExport and useBeforeUnload
- `src/components/step3/Step3ReviewExport.tsx` — minimal stub for parallel plan import resolution (03-02 replaces)

## Decisions Made

- Created Step3ReviewExport stub in 03-03 (not 03-02) so WizardShell's production import resolves immediately — vi.mock intercepts in tests but Vite needs the file to exist to parse the importing module
- Used `vi.mock('@/hooks/useBeforeUnload')` in WizardShell tests to verify the hook is called with correct `enabled` argument without triggering actual addEventListener calls

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created Step3ReviewExport stub to resolve parallel import**

- **Found during:** Task 2 GREEN phase
- **Issue:** Vite module resolution fails when WizardShell.tsx imports Step3ReviewExport and the file doesn't exist, even though vi.mock intercepts it in tests — the importer's module transform fails before mocks apply
- **Fix:** Created minimal `src/components/step3/Step3ReviewExport.tsx` stub; 03-02 will replace with full implementation
- **Files modified:** `src/components/step3/Step3ReviewExport.tsx`
- **Commit:** `d113761`

## Issues Encountered

None beyond the auto-fixed parallel import blocking issue above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 03-02 can now replace the Step3ReviewExport stub with the full implementation (ComparisonTable, export buttons, clipboard, CSV)
- Full wizard flow is navigable: Step 1 → 2 → 3 → Back works end-to-end
- UX-05 page-exit warning is active from Step 2 onward

## Self-Check: PASSED

- FOUND: src/hooks/useBeforeUnload.ts
- FOUND: src/hooks/**tests**/useBeforeUnload.test.ts
- FOUND: src/components/wizard/WizardShell.tsx
- FOUND: src/components/wizard/**tests**/WizardShell.test.tsx
- FOUND: src/components/step3/Step3ReviewExport.tsx
- FOUND commit: e8d3331 (feat: useBeforeUnload hook)
- FOUND commit: d113761 (feat: WizardShell updates)
- Test suite: 135 PASSING, 0 FAILING, 20 todo

---
*Phase: 03-comparison-export-and-wizard-shell*
*Completed: 2026-03-12*
