---
phase: 07-enhanced-export-and-as-is-to-be-report
plan: 01
subsystem: testing
tags: [vitest, tdd, wave-0, nyquist, test-stubs, export, print-css]

# Dependency graph
requires:
  - phase: 06-conditional-ui-wiring
    provides: ComparisonTable.test.tsx and CurrentClusterForm.test.tsx as base test files to extend
  - phase: 03-comparison-export-and-wizard-shell
    provides: export.test.ts base test file to extend
provides:
  - "it.todo stubs for EXPO-03: buildJsonContent and downloadJson"
  - "it.todo stubs for REPT-01: As-Is column in ComparisonTable"
  - "it.todo stubs for REPT-02: unconditional existingServerCount and totalPcores auto-derive"
  - "Real RED test for EXPO-04: printCss.test.ts asserting print-color-adjust: exact in index.css"
affects:
  - 07-02
  - 07-03
  - 07-04

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Nyquist Wave 0: it.todo stubs keep suite exit code 0 (pending, not failing) while providing TDD red/green targets"
    - "EXPO-04 leading indicator: real test (not todo) that is intentionally red — serves as acceptance criterion for Plan 03"
    - "printCss.test.ts uses node:fs readFileSync + resolve(__dirname, ...) to read index.css as string — same pattern as darkMode.test.ts"

key-files:
  created:
    - src/__tests__/printCss.test.ts
  modified:
    - src/lib/utils/__tests__/export.test.ts
    - src/components/step3/__tests__/ComparisonTable.test.tsx
    - src/components/step1/__tests__/CurrentClusterForm.test.tsx

key-decisions:
  - "printCss.test.ts uses it() not it.todo() for the print-color-adjust check — intentionally red RED test as EXPO-04 leading indicator, matches plan intent"
  - "Path to index.css from src/__tests__/ is ../index.css (not ../../index.css) — index.css lives at src/index.css"
  - "REPT-02 stubs placed in top-level describe block (not inside CurrentClusterForm describe) to avoid nesting interference with existing test structure"

patterns-established:
  - "Wave 0 stubs use it.todo (no callback) so Vitest counts as pending — suite exit code stays 0"
  - "Leading indicator tests (EXPO-04) use real it() assertions so they appear as FAIL until implementation — gives clear done signal"

requirements-completed: [EXPO-03, EXPO-04, REPT-01, REPT-02]

# Metrics
duration: 10min
completed: 2026-03-13
---

# Phase 7 Plan 01: Enhanced Export and As-Is/To-Be Report Wave 0 Summary

**Nyquist Wave 0 stubs planted for EXPO-03 (JSON export), EXPO-04 (print CSS), REPT-01 (As-Is column), and REPT-02 (existingServerCount/totalPcores auto-derive) — 222 existing tests green, printCss.test.ts intentionally red as EXPO-04 leading indicator**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-13T08:35:38Z
- **Completed:** 2026-03-13T08:45:44Z
- **Tasks:** 2
- **Files modified:** 4 (1 created, 3 extended)

## Accomplishments
- Extended export.test.ts with 6 it.todo stubs for buildJsonContent (4) and downloadJson (2) covering EXPO-03
- Created printCss.test.ts with a real RED test asserting index.css contains 'print-color-adjust: exact' as EXPO-04 leading indicator
- Extended ComparisonTable.test.tsx with 5 it.todo stubs for As-Is column rendering (REPT-01)
- Extended CurrentClusterForm.test.tsx with 4 it.todo stubs for unconditional existingServerCount and totalPcores auto-derive (REPT-02)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add EXPO-03 and EXPO-04 test stubs** - `baa8042` (test)
2. **Task 2: Add REPT-01 and REPT-02 component test stubs** - `5acdc98` (test)

## Files Created/Modified
- `src/__tests__/printCss.test.ts` - New: EXPO-04 leading indicator test; real assertion on index.css for print-color-adjust: exact
- `src/lib/utils/__tests__/export.test.ts` - Extended: added describe('buildJsonContent') and describe('downloadJson') with it.todo stubs (EXPO-03)
- `src/components/step3/__tests__/ComparisonTable.test.tsx` - Extended: added describe('REPT-01') with 5 it.todo stubs for As-Is column
- `src/components/step1/__tests__/CurrentClusterForm.test.tsx` - Extended: added describe('REPT-02') with 4 it.todo stubs for existingServerCount/totalPcores

## Decisions Made
- printCss.test.ts uses `it()` not `it.todo()` for the print-color-adjust assertion — intentionally red as EXPO-04 leading indicator per plan specification
- Path to index.css from `src/__tests__/` is `../index.css` since index.css lives at `src/index.css` (not project root)
- REPT-02 stubs placed in a new top-level `describe('REPT-02')` block (not nested inside 'CurrentClusterForm') to preserve existing test structure

## Deviations from Plan

**1. [Rule 1 - Bug] Fixed incorrect CSS file path in printCss.test.ts**
- **Found during:** Task 1 verification
- **Issue:** Initial resolve used `../../index.css` (would point to project root) but index.css lives at `src/index.css`, requiring `../index.css`
- **Fix:** Changed `resolve(__dirname, '../../index.css')` to `resolve(__dirname, '../index.css')`
- **Files modified:** `src/__tests__/printCss.test.ts`
- **Verification:** Test ran (and failed correctly on missing CSS rule) instead of ENOENT error
- **Committed in:** `baa8042` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug: wrong path)
**Impact on plan:** Minor correction during Task 1; test infrastructure now correct. No scope creep.

## Issues Encountered
- printCss.test.ts initially threw ENOENT because `../../index.css` resolved to project root; fixed by using `../index.css` (index.css is at src/index.css)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 4 requirement stubs are planted; Plans 02-04 have clear red/green targets
- printCss.test.ts will turn green once Plan 03 adds `@media print { * { print-color-adjust: exact } }` to index.css
- ComparisonTable and CurrentClusterForm stubs will activate when Plans 02 and 04 implement REPT-01 and REPT-02 respectively
- 222 existing tests remain green — zero regression

## Self-Check: PASSED

- FOUND: src/__tests__/printCss.test.ts
- FOUND: src/lib/utils/__tests__/export.test.ts
- FOUND: src/components/step3/__tests__/ComparisonTable.test.tsx
- FOUND: src/components/step1/__tests__/CurrentClusterForm.test.tsx
- FOUND commit: baa8042 (Task 1)
- FOUND commit: 5acdc98 (Task 2)

---
*Phase: 07-enhanced-export-and-as-is-to-be-report*
*Completed: 2026-03-13*
