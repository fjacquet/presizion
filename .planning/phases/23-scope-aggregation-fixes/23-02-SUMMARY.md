---
phase: 23-scope-aggregation-fixes
plan: 02
subsystem: ui
tags: [react, scope, import, host-count]

requires:
  - phase: 23-01
    provides: "ScopeData with existingServerCount in rawByScope"
provides:
  - "Host count annotations in ImportPreviewModal scope selector"
  - "Host count annotations in ScopeBadge badge text and dialog"
affects: []

tech-stack:
  added: []
  patterns: ["formatScopeLabel helper for consistent host count display"]

key-files:
  created: []
  modified:
    - src/components/step1/ImportPreviewModal.tsx
    - src/components/step1/ScopeBadge.tsx
    - src/components/step1/__tests__/ImportPreviewModal.test.tsx
    - src/components/step1/__tests__/ScopeBadge.test.tsx

key-decisions:
  - "Host count suffix format: 'Label (N hosts)' with graceful omission when existingServerCount is absent"

patterns-established:
  - "formatScopeLabel pattern: lookup rawByScope for host count, append suffix only when defined"

requirements-completed: [SCOPE-10]

duration: 3min
completed: 2026-03-15
---

# Phase 23 Plan 02: Host Count Display in Scope Selectors Summary

**Added "(N hosts)" suffix to scope labels in ImportPreviewModal and ScopeBadge using existingServerCount from rawByScope**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-15T14:50:00Z
- **Completed:** 2026-03-15T14:53:00Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments
- Scope labels in ImportPreviewModal now show host count from rawByScope existingServerCount
- ScopeBadge badge text and dialog labels show host count per scope
- Graceful fallback when existingServerCount is absent (no suffix shown)
- Added SCOPE-10 test coverage for both components

## Task Commits

Each task was committed atomically:

1. **Task 1: Add host count display to ImportPreviewModal and ScopeBadge scope selectors** - `e7c4535` (feat)

**Plan metadata:** (pending)

## Files Created/Modified
- `src/components/step1/ImportPreviewModal.tsx` - Added rawByScope prop to ScopeSelector, host count lookup in label
- `src/components/step1/ScopeBadge.tsx` - Added rawByScope from store, formatScopeLabel helper for badge and dialog
- `src/components/step1/__tests__/ImportPreviewModal.test.tsx` - Added existingServerCount to fixtures, SCOPE-10 host count tests
- `src/components/step1/__tests__/ScopeBadge.test.tsx` - Added rawByScope to mock store, SCOPE-10 host count tests

## Decisions Made
- Host count format uses "(N hosts)" suffix after the scope label, omitted entirely when existingServerCount is undefined/null
- ScopeBadge uses a formatScopeLabel helper shared between badge text and dialog labels for consistency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 23 complete (both plans done)
- All scope aggregation fixes shipped

---
*Phase: 23-scope-aggregation-fixes*
*Completed: 2026-03-15*
