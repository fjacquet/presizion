---
phase: 16-bug-fixes-import-scoping-vm-override-asis
plan: 02
subsystem: sizing, ui
tags: [constraints, comparison-table, vm-override, as-is-column, tdd]

requires:
  - phase: 04-sizing-engine
    provides: computeScenarioResult with effectiveVmCount propagation
  - phase: 06-comparison-table
    provides: ComparisonTable component with As-Is column structure
provides:
  - Explicit VM override test coverage for RAM and disk formulas
  - Populated As-Is column with VMs/Server, CPU/RAM utilization, disk, N/A markers
affects: [comparison-table, step3, sizing-engine]

tech-stack:
  added: []
  patterns:
    - "As-Is cell pattern: computed value when data available, em-dash when unavailable, N/A when not applicable"

key-files:
  created: []
  modified:
    - src/lib/sizing/__tests__/constraints.test.ts
    - src/components/step3/ComparisonTable.tsx
    - src/components/step3/__tests__/ComparisonTable.test.tsx

key-decisions:
  - "VM override tests confirm existing code correctness -- no bug fix needed, tests are the deliverable"
  - "As-Is cells use em-dash for unavailable data and literal N/A for not-applicable concepts"
  - "Disk As-Is cell shows totalDiskGb only in disaggregated mode; HCI mode shows em-dash since per-server disk capacity is unknown from import"

patterns-established:
  - "As-Is cell computation: derive values from currentCluster fields with fallback to em-dash"
  - "getAsIsCell() test helper: query second td in row for precise As-Is cell assertions"

requirements-completed: [FIX-VM-01, FIX-VM-02, FIX-ASIS-01, FIX-ASIS-02, FIX-ASIS-03, FIX-ASIS-04]

duration: 4min
completed: 2026-03-14
---

# Phase 16 Plan 02: VM Override Tests & As-Is Column Summary

**VM override test coverage for RAM/disk formulas, plus populated As-Is column with VMs/Server, CPU/RAM utilization, disk, and N/A markers**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-14T14:12:58Z
- **Completed:** 2026-03-14T14:17:22Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added 4 explicit tests confirming targetVmCount override propagates to RAM-limited and disk-limited server counts
- Populated As-Is column in ComparisonTable: VMs/Server (computed), CPU Util %, RAM Util %, Total Disk (disaggregated)
- Changed Limiting Resource and Headroom As-Is cells from dashes to "N/A" (not applicable vs unavailable)
- All 65 tests pass (36 constraints + 29 ComparisonTable), zero TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: VM override test coverage for RAM and Disk** - `4d4389c` (test)
2. **Task 2 RED: Failing FIX-ASIS tests** - `c3f7ede` (test)
3. **Task 2 GREEN: Populate As-Is column** - `c249a7c` (feat)

## Files Created/Modified
- `src/lib/sizing/__tests__/constraints.test.ts` - 4 new tests in FIX-VM-01/02 describe block
- `src/components/step3/ComparisonTable.tsx` - As-Is cells populated with computed values
- `src/components/step3/__tests__/ComparisonTable.test.tsx` - 9 new tests in FIX-ASIS describe block

## Decisions Made
- VM override tests confirm existing code correctness -- effectiveVmCount was already correctly propagated to both serverCountByRam and serverCountByDisk. Tests are the deliverable (no bug fix needed).
- As-Is cells use em-dash (\u2014) for "data not available" and literal string "N/A" for "not applicable" (Limiting Resource and Headroom concepts don't apply to existing cluster).
- Disk As-Is cell shows totalDiskGb only in disaggregated mode; HCI mode shows em-dash since per-server disk capacity from the existing cluster is unknown from import data.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All Phase 16 requirements covered (Plan 01 handles import scoping, Plan 02 handles VM override and As-Is)
- ComparisonTable As-Is column now provides meaningful baseline comparison data
- Ready for any subsequent phases

## Self-Check: PASSED

- All 3 source/test files exist on disk
- All 3 task commits verified in git log (4d4389c, c3f7ede, c249a7c)
- 65/65 tests passing, 0 TypeScript errors

---
*Phase: 16-bug-fixes-import-scoping-vm-override-asis*
*Completed: 2026-03-14*
