---
phase: 03-comparison-export-and-wizard-shell
plan: "01"
subsystem: ui
tags: [shadcn, vitest, table, testing, stubs]

# Dependency graph
requires:
  - phase: 02-input-forms
    provides: WizardShell, Step1-2 components, 105 green tests baseline
provides:
  - shadcn Table primitives (Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption) in src/components/ui/table.tsx
  - Nyquist Wave 0 test stubs for all 6 Phase 3 requirements (COMP-01, COMP-02, EXPO-01, EXPO-02, UX-04, UX-05)
  - 5 stub test files covering ComparisonTable, Step3ReviewExport, clipboard utils, export utils, useBeforeUnload hook
affects:
  - 03-02 (ComparisonTable, export utils — imports table.tsx, implementations fill stubs)
  - 03-03 (useBeforeUnload — implementations fill stubs)

# Tech tracking
tech-stack:
  added: [shadcn table component]
  patterns: [Nyquist Wave 0 stubbing — it.todo stubs created before implementation so verify commands work immediately]

key-files:
  created:
    - src/components/ui/table.tsx
    - src/components/step3/__tests__/ComparisonTable.test.tsx
    - src/components/step3/__tests__/Step3ReviewExport.test.tsx
    - src/lib/utils/__tests__/clipboard.test.ts
    - src/lib/utils/__tests__/export.test.ts
    - src/hooks/__tests__/useBeforeUnload.test.ts
  modified: []

key-decisions:
  - "Nyquist Wave 0 stubs use it.todo (not it.skip) so Vitest counts them as pending not failing — test suite exits 0"
  - "shadcn table installed before implementation plans so 03-02 can import @/components/ui/table without extra CLI step"

patterns-established:
  - "Wave 0 stubbing: create all test stubs in wave 0 plan so wave 1 implementation plans have valid verify targets from task 1"
  - "it.todo for pending stubs: exits 0, shows as pending in output, makes intent clear"

requirements-completed: [COMP-01, COMP-02, EXPO-01, EXPO-02, UX-04, UX-05]

# Metrics
duration: 1min
completed: 2026-03-12
---

# Phase 3 Plan 01: Nyquist Wave 0 Stubs and shadcn Table Summary

**shadcn Table primitive installed and 5 it.todo stub files created covering all 6 Phase 3 requirements — full suite stays at 105 passing, 0 failing**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-12T20:37:03Z
- **Completed:** 2026-03-12T20:38:19Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Installed shadcn `table` component generating `src/components/ui/table.tsx` with 8 named exports (Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption)
- Created 5 Nyquist Wave 0 test stub files covering all 6 Phase 3 requirements across ComparisonTable, Step3ReviewExport, clipboard utils, export utils, and useBeforeUnload hook
- Full test suite confirmed at 105 passing, 0 failing after stub creation — all stubs are `it.todo` (pending, not failing)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install shadcn table component** - `47637ab` (chore)
2. **Task 2: Create Nyquist Wave 0 test stubs** - `5557662` (test)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/components/ui/table.tsx` - shadcn Table primitives; required by 03-02 ComparisonTable
- `src/components/step3/__tests__/ComparisonTable.test.tsx` - 13 it.todo stubs for COMP-01, COMP-02, UX-04
- `src/components/step3/__tests__/Step3ReviewExport.test.tsx` - 7 it.todo stubs for EXPO-01, EXPO-02
- `src/lib/utils/__tests__/clipboard.test.ts` - 8 it.todo stubs for EXPO-01 (unit level)
- `src/lib/utils/__tests__/export.test.ts` - 9 it.todo stubs for EXPO-02 (unit level)
- `src/hooks/__tests__/useBeforeUnload.test.ts` - 5 it.todo stubs for UX-05

## Decisions Made

- Used `it.todo` (not `it.skip`) for all stubs so Vitest counts them as pending not failing; test suite exits 0 immediately
- Installed shadcn table component in wave 0 so wave 1 plans (03-02, 03-03) can import `@/components/ui/table` without an extra CLI step mid-plan

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wave 1 plans (03-02 and 03-03) can now both start immediately — stub verify targets exist and shadcn table is importable
- 03-02 implements: `src/lib/utils/clipboard.ts`, `src/lib/utils/export.ts`, `src/components/step3/ComparisonTable.tsx`, `src/components/step3/Step3ReviewExport.tsx`
- 03-03 implements: `src/hooks/useBeforeUnload.ts`, WizardShell Step 2 Next button + Step 3 routing + beforeunload guard

## Self-Check: PASSED

- FOUND: src/components/ui/table.tsx
- FOUND: src/components/step3/**tests**/ComparisonTable.test.tsx
- FOUND: src/components/step3/**tests**/Step3ReviewExport.test.tsx
- FOUND: src/lib/utils/**tests**/clipboard.test.ts
- FOUND: src/lib/utils/**tests**/export.test.ts
- FOUND: src/hooks/**tests**/useBeforeUnload.test.ts
- FOUND commit: 47637ab (chore: install shadcn table)
- FOUND commit: 5557662 (test: Nyquist Wave 0 stubs)
- FOUND commit: 9ee9558 (docs: plan metadata)
- Test suite: 105 PASSING, 0 FAILING

---
*Phase: 03-comparison-export-and-wizard-shell*
*Completed: 2026-03-12*
