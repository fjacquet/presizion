---
phase: 33-pptx-slide-consolidation
plan: "01"
subsystem: pptx-export
tags: [pptx, slide-consolidation, merge, MERGE-01]
dependency_graph:
  requires: []
  provides: [MERGE-01]
  affects: [src/lib/utils/exportPptx.ts]
tech_stack:
  added: []
  patterns: [stacked-tables-on-slide, gray-section-headers]
key_files:
  created: []
  modified:
    - src/lib/utils/exportPptx.ts
    - src/lib/utils/__tests__/exportPptx.test.ts
decisions:
  - "Use _grayHeaderCell for Server Configuration and Growth Projections section headers to visually distinguish them from the NAVY assumptions header"
  - "Compute serverConfigY dynamically based on generalAssumptions rows and optional vSAN table rows"
  - "Use fontSize 9 on growth data rows when hasGrowth is true to ensure breathing room on slide"
metrics:
  duration: 3 minutes
  completed: "2026-03-24"
  tasks_completed: 2
  files_modified: 2
---

# Phase 33 Plan 01: PPTX Slide Consolidation — Sizing Parameters Merge Summary

**One-liner:** Merged three PPTX parameter slides (Sizing Assumptions, Growth Projections, Per-Scenario Server Configuration) into a single "Sizing Parameters" slide with vertically stacked gray-header sections, satisfying MERGE-01.

## What Was Done

### Task 1: Merge three slides into single Sizing Parameters slide

Replaced the three separate `pptx.addSlide()` calls (lines 450-697 of exportPptx.ts) with a single `sizingParamsSlide` that hosts all three parameter tables stacked vertically:

1. **Assumptions section** — GRAY header "Parameter | Scenario…" with general assumptions rows (unchanged from original)
2. **vSAN sub-table** (conditional) — shown below assumptions when any scenario uses vSAN (unchanged)
3. **Server Configuration section** — new gray section header row (`_grayHeaderCell`) followed by 5 server config data rows; Y-offset computed dynamically
4. **Growth Projections section** (conditional) — new gray section header row followed by 3 growth data rows at fontSize 9; Y-offset computed dynamically after server config

The `void _grayHeaderCell` suppression line was removed since the helper is now actively used.
`addFooter` is called exactly once on `sizingParamsSlide` after all table additions.

### Task 2: Add MERGE-01 test

Added a new test asserting:
- Slide titles contain `'Sizing Parameters'`
- Slide titles do NOT contain `'Sizing Assumptions'`, `'Per-Scenario Server Configuration'`, or `'Growth Projections'`

Also updated the existing `'creates multiple slides'` test comment to reflect the new 4-slide structure.

## Verification Results

| Check | Result |
|-------|--------|
| `vitest run exportPptx.test.ts` | 11/11 PASS |
| `tsc -b` | Clean (0 errors) |
| `grep -c "Sizing Parameters" exportPptx.ts` | 2 (comment + title string) |
| `grep -c "Sizing Assumptions" exportPptx.ts` | 0 |
| `grep -c "Per-Scenario Server Configuration" exportPptx.ts` | 0 |
| `grep -c "growthSlide" exportPptx.ts` | 0 |
| `grep -c "serverConfigSlide" exportPptx.ts` | 0 |
| `grep -c "_grayHeaderCell" exportPptx.ts` | 5 (definition + 4 usages) |
| `grep -c "addSlide" exportPptx.ts` | 8 (was 10, removed 2) |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | e6f7524 | feat(33-01): merge Sizing Assumptions + Server Config + Growth into single Sizing Parameters slide |
| Task 2 | 6956d39 | test(33-01): add MERGE-01 test verifying Sizing Parameters slide title |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `src/lib/utils/exportPptx.ts` — exists and modified
- [x] `src/lib/utils/__tests__/exportPptx.test.ts` — exists and modified
- [x] Commit e6f7524 exists
- [x] Commit 6956d39 exists
