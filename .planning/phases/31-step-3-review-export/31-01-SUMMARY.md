---
phase: 31-step-3-review-export
plan: 01
subsystem: ui
tags: [react, tailwind, sticky-css, mobile, comparison-table]

# Dependency graph
requires: []
provides:
  - Horizontally scrollable ComparisonTable with sticky Metric column at 390px
  - min-w-max on Table element to force natural column widths
  - sticky left-0 bg-background z-10 on all 11 first-column cells (1 header + 10 body)
affects: [Phase 31 review/export work, mobile UX testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "sticky left-0 bg-background z-10 pattern for opaque sticky columns in light/dark mode"
    - "min-w-max on shadcn Table to enable overflow-x-auto horizontal scroll"

key-files:
  created: []
  modified:
    - src/components/step3/ComparisonTable.tsx
    - src/components/step3/__tests__/ComparisonTable.test.tsx

key-decisions:
  - "bg-background (not bg-white) required on sticky cells — tracks light/dark CSS variables correctly"
  - "min-w-max on Table prevents browser from compressing columns into viewport, making overflow-x-auto work"
  - "Sticky classes applied at all widths — invisible on desktop (no scroll), functional at 390px (table wider than viewport)"

patterns-established:
  - "Sticky first column: className='font-medium sticky left-0 bg-background z-10' on TableCell/TableHead"
  - "Horizontal scroll table: overflow-x-auto wrapper div + min-w-max on Table"

requirements-completed:
  - REVIEW-01

# Metrics
duration: 4min
completed: 2026-03-16
---

# Phase 31 Plan 01: Step 3 ComparisonTable Horizontal Scroll Summary

**ComparisonTable horizontally scrollable at 390px with sticky Metric column using min-w-max + sticky left-0 bg-background z-10 CSS pattern**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-16T09:53:44Z
- **Completed:** 2026-03-16T09:57:44Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `min-w-max` to `<Table>` element forcing natural column widths so `overflow-x-auto` wrapper triggers horizontal scroll at narrow viewports
- Added `sticky left-0 bg-background z-10` to all 11 first-column cells: Metric header + 10 body rows (Servers Required, Server Config, Total pCores, Limiting Resource, vCPU:pCore Ratio, VMs/Server, Headroom, CPU Util %, RAM Util %, Disk Util %)
- Added 3 test cases confirming min-w-max on table and sticky classes on first-column cells

## Task Commits

Each task was committed atomically:

1. **Task 1: Add min-w-max to Table and sticky classes to first-column cells** - `d81d106` (feat)
2. **Task 2: Add test cases for sticky column classes** - `55896f1` (test)

**Plan metadata:** (final docs commit)

## Files Created/Modified
- `src/components/step3/ComparisonTable.tsx` - Added min-w-max to Table; sticky left-0 bg-background z-10 to all 11 first-column cells
- `src/components/step3/__tests__/ComparisonTable.test.tsx` - Added MOBILE-SCROLL describe block with 3 test cases for sticky CSS classes

## Decisions Made
- Used `bg-background` (Tailwind CSS variable) not `bg-white` — correctly tracks light/dark mode via shadcn CSS variables
- Applied sticky classes at all widths (no responsive prefix) — desktop sees no visual change since no scroll occurs; mobile gets the sticky behavior where needed
- No responsive wrappers or breakpoints — the pattern is transparent at desktop width

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing flaky tests in CapacityStackedChart, MinNodesChart, and exportPdf (from uncommitted Phase 31 changes in working tree) — confirmed pre-existing by stashing our changes and verifying 647/647 baseline. Our changes add 3 tests for a total of 650 in scope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- ComparisonTable horizontal scroll complete — ready for Phase 31 subsequent plans (chart mobile sizing, export improvements)
- Sticky pattern established and tested — follow same pattern for any future table components

---
*Phase: 31-step-3-review-export*
*Completed: 2026-03-16*

## Self-Check: PASSED

- FOUND: src/components/step3/ComparisonTable.tsx
- FOUND: src/components/step3/__tests__/ComparisonTable.test.tsx
- FOUND: .planning/phases/31-step-3-review-export/31-01-SUMMARY.md
- FOUND commit: d81d106 (feat: min-w-max + sticky classes)
- FOUND commit: 55896f1 (test: sticky class assertions)
