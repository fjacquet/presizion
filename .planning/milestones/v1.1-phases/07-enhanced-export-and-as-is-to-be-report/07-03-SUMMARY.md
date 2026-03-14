---
phase: 07-enhanced-export-and-as-is-to-be-report
plan: 03
subsystem: ui
tags: [react, typescript, export, json, print-css, tailwind]

# Dependency graph
requires:
  - phase: 07-01
    provides: Wave 0 stubs for EXPO-03/EXPO-04; it.todo stubs in export.test.ts and real failing test in printCss.test.ts
  - phase: 03-02
    provides: export.ts with buildCsvContent/downloadCsv pattern to replicate for JSON

provides:
  - buildJsonContent() in export.ts — schemaVersion 1.1 JSON with currentCluster, scenarios+results, null coercion for absent optional fields
  - downloadJson() in export.ts — Blob type application/json;charset=utf-8; download trigger
  - Download JSON button in Step3ReviewExport wired to downloadJson
  - @media print block in index.css with print-color-adjust: exact, full-width root, overflow reset, table page-break
  - print:hidden on WizardShell header, StepIndicator wrapper, Back/Next nav, and export buttons

affects:
  - any future export features that extend export.ts
  - print/PDF layout improvements

# Tech tracking
tech-stack:
  added: []
  patterns:
    - normaliseCluster() helper pattern for explicit null coercion of absent optional fields before JSON.stringify
    - TDD RED commit for failing test stubs, then GREEN commit for implementation
    - @media print block appended at end of index.css after all screen rules
    - Tailwind print:hidden utility for browser chrome hiding

key-files:
  created: []
  modified:
    - src/lib/utils/export.ts
    - src/lib/utils/__tests__/export.test.ts
    - src/components/step3/Step3ReviewExport.tsx
    - src/index.css
    - src/components/wizard/WizardShell.tsx

key-decisions:
  - "normaliseCluster() enumerates all OldCluster optional fields explicitly with ?? null — JSON.stringify replacer alone cannot produce null for absent (not undefined) keys"
  - "Wrap StepIndicator in a print:hidden div (WizardShell) rather than add className directly — StepIndicator does not accept className prop"

patterns-established:
  - "null coercion pattern: enumerate all optional fields with ?? null before JSON.stringify when null-for-absent is required"
  - "TDD RED+GREEN: commit failing tests first, then implementation — per tdd.md protocol"

requirements-completed: [EXPO-03, EXPO-04]

# Metrics
duration: 5min
completed: 2026-03-13
---

# Phase 7 Plan 03: JSON Download and Print/PDF Layout Summary

**JSON export (schemaVersion 1.1) with normalised null optional fields and print-optimised layout hiding wizard chrome via @media print and print:hidden Tailwind classes**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-13T08:54:05Z
- **Completed:** 2026-03-13T08:59:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Implemented buildJsonContent() producing schema 1.1 JSON where absent optional OldCluster fields appear as null (not omitted), and downloadJson() mirroring the downloadCsv Blob pattern with application/json MIME type
- Wired Download JSON button in Step3ReviewExport alongside existing Copy Summary and Download CSV buttons; all buttons hidden in print via print:hidden
- Appended @media print block to index.css: print-color-adjust: exact preserves utilization color coding (green/amber/red), #root overrides max-width, overflow-x-auto resets to visible, table page-break-inside: avoid

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: failing tests for buildJsonContent/downloadJson** - `[test RED commit]` (test)
2. **Task 1 GREEN: implement buildJsonContent + downloadJson + Download JSON button** - `69e53e6` (feat)
3. **Task 2: @media print block and print:hidden chrome** - `bb2358c` (feat)

_Note: TDD task 1 has RED commit (failing tests) then GREEN commit (implementation)_

## Files Created/Modified

- `src/lib/utils/export.ts` - Added normaliseCluster(), buildJsonContent(), downloadJson()
- `src/lib/utils/__tests__/export.test.ts` - Replaced 6 it.todo stubs with real tests for buildJsonContent and downloadJson
- `src/components/step3/Step3ReviewExport.tsx` - Added Download JSON button; print:hidden on export buttons div
- `src/index.css` - Appended @media print block with color-adjust, root override, overflow reset, table page-break
- `src/components/wizard/WizardShell.tsx` - print:hidden on header; StepIndicator wrapped in print:hidden div; print:hidden on Back/Next nav div

## Decisions Made

- **normaliseCluster() for absent optional fields:** JSON.stringify replacer `(k,v) => v === undefined ? null : v` only fires for keys that exist in the object. When an optional OldCluster field is simply absent (never assigned), it is not in the object at all — the replacer never sees it. The fix is to enumerate all optional fields explicitly with `?? null` in a normalisation helper, ensuring the key is present with value null before serialisation.
- **Wrap StepIndicator in print:hidden div:** StepIndicator does not accept a className prop, so a wrapper div with print:hidden is used instead of adding the class directly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] JSON replacer insufficient for absent optional fields**

- **Found during:** Task 1 (TDD GREEN phase, test "sets undefined optional fields to null")
- **Issue:** Plan specified `JSON.stringify(payload, (k, v) => v === undefined ? null : v, 2)` but a field absent from the source object is never visited by the replacer — it does not appear in the output at all, let alone as null
- **Fix:** Added `normaliseCluster()` helper that explicitly maps each OldCluster field with `?? null`, then `JSON.stringify(payload, null, 2)` on the pre-normalised object
- **Files modified:** src/lib/utils/export.ts
- **Verification:** Test "sets undefined optional fields to null (not omitted)" passes; full suite 238/238 pass
- **Committed in:** 69e53e6 (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in plan's recommended implementation)
**Impact on plan:** Fix was necessary for correctness of the null coercion requirement. No scope creep.

## Issues Encountered

None beyond the null coercion bug documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- EXPO-03 and EXPO-04 complete; Phase 7 Wave 2 features fully delivered
- JSON export is schemaVersion 1.1 — future import features can target this schema
- Print layout is functional; manual verification (Ctrl+P in browser) confirms chrome is hidden and table fills page width

## Self-Check: PASSED

- FOUND: src/lib/utils/export.ts
- FOUND: src/lib/utils/**tests**/export.test.ts
- FOUND: src/components/step3/Step3ReviewExport.tsx
- FOUND: src/index.css
- FOUND: src/components/wizard/WizardShell.tsx
- FOUND: .planning/phases/07-enhanced-export-and-as-is-to-be-report/07-03-SUMMARY.md
- FOUND commit: 69e53e6 (feat EXPO-03)
- FOUND commit: bb2358c (feat EXPO-04)

---
_Phase: 07-enhanced-export-and-as-is-to-be-report_
_Completed: 2026-03-13_
