---
phase: 14-persistent-scope-widget
plan: 01
subsystem: ui
tags: [zustand, react, import, scope, aggregation]

# Dependency graph
requires:
  - phase: 13-import-scope-filter
    provides: aggregateScopes(), rawByScope Map in ClusterImportResult, ScopeData type alias
  - phase: 13-import-scope-filter
    provides: ImportPreviewModal with ScopeSelector and selectedScopes state
provides:
  - useImportStore Zustand store with setImportBuffer, setActiveScope, clearImport actions
  - ImportPreviewModal wired to call setImportBuffer after confirming a non-JSON multi-scope import
affects:
  - 14-persistent-scope-widget-02 (ScopeBadge reads/writes via useImportStore)

# Tech tracking
tech-stack:
  added: []
  patterns: [cross-store side-effect via getState() call inside Zustand action]

key-files:
  created:
    - src/store/useImportStore.ts
    - src/store/__tests__/useImportStore.test.ts
  modified:
    - src/components/step1/ImportPreviewModal.tsx
    - src/components/step1/__tests__/ImportPreviewModal.test.tsx

key-decisions:
  - "useImportStore calls useClusterStore.getState().setCurrentCluster() directly inside setActiveScope — avoids hook-in-hook constraint while keeping re-aggregation logic in the store"
  - "setImportBuffer called only when result.rawByScope != null — JSON imports bypass useImportStore entirely"
  - "ScopeData (Omit alias) is used as the per-scope value type in the store Map to match scopeAggregator signature"

patterns-established:
  - "Cross-store side-effects: call sibling store via .getState() inside actions, not via hook selectors"
  - "vi.mock factories must not reference outer variables; use vi.mocked() in beforeEach to set return values"

requirements-completed: [SCOPE-04]

# Metrics
duration: 6min
completed: 2026-03-13
---

# Phase 14 Plan 01: Persistent Scope Widget — Import Store Summary

**Zustand useImportStore persists rawByScope buffer and re-aggregates on scope change; ImportPreviewModal calls setImportBuffer on Apply for non-JSON multi-scope imports**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-13T21:01:50Z
- **Completed:** 2026-03-13T21:07:49Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created useImportStore with full Zustand store shape holding rawByScope, scopeLabels, activeScope, scopeOptions
- setActiveScope re-aggregates via aggregateScopes() and drives useClusterStore.setCurrentCluster — scope change updates cluster without re-import
- ImportPreviewModal calls setImportBuffer(rawByScope, scopeLabels, selectedScopes) in handleApply for non-JSON multi-scope imports
- 6 new unit tests for useImportStore + 2 new tests in ImportPreviewModal, 313 total tests passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Create useImportStore with re-aggregation logic** - `d50d677` (feat)
2. **Task 2: Wire ImportPreviewModal to populate useImportStore on Apply** - `6766ba8` (feat)

## Files Created/Modified

- `src/store/useImportStore.ts` - New Zustand store: rawByScope buffer, setImportBuffer, setActiveScope (re-aggregates and updates cluster), clearImport
- `src/store/__tests__/useImportStore.test.ts` - 6 unit tests covering all store actions and null guard
- `src/components/step1/ImportPreviewModal.tsx` - Added useImportStore selector and setImportBuffer call in handleApply non-JSON branch
- `src/components/step1/__tests__/ImportPreviewModal.test.tsx` - Added useImportStore mock and 2 new tests (Test 7 multi-scope, Test 8 JSON bypass)

## Decisions Made

- Cross-store side-effects use `.getState()` pattern — `useClusterStore.getState().setCurrentCluster()` called inside `setActiveScope` to avoid hooks-in-non-component constraints
- JSON imports (presizion-json) do not call setImportBuffer — they carry full Scenario[] and bypass scope filtering entirely
- ScopeData type alias reused from `@/lib/utils/import` to match aggregateScopes() parameter type exactly

## Deviations from Plan

**1. [Rule 1 - Bug] Fixed vi.mock factory referencing outer variable (hoisting error)**

- **Found during:** Task 1 RED phase
- **Issue:** Initial test file used `const mockAggregateScopes = vi.fn()` at module level and referenced it inside `vi.mock()` factory, causing "Cannot access before initialization" due to vitest hoisting
- **Fix:** Moved `vi.fn()` into the factory directly; used `vi.mocked()` in beforeEach to configure return values
- **Files modified:** src/store/__tests__/useImportStore.test.ts
- **Verification:** All 6 tests pass after fix
- **Committed in:** d50d677 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in test hoisting)
**Impact on plan:** Necessary fix for test correctness. No scope creep.

## Issues Encountered

None beyond the vi.mock hoisting issue documented above.

## Next Phase Readiness

- useImportStore is fully functional and tested — ready for Wave 2 (ScopeBadge)
- ScopeBadge reads scopeOptions/activeScope/scopeLabels and writes via setActiveScope
- clearImport available for fresh import flow cleanup

---
*Phase: 14-persistent-scope-widget*
*Completed: 2026-03-13*
