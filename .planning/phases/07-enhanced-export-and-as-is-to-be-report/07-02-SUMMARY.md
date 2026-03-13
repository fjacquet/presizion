---
phase: 07-enhanced-export-and-as-is-to-be-report
plan: "02"
subsystem: ui
tags: [react, typescript, zustand, form, comparison-table, tdd]

# Dependency graph
requires:
  - phase: 07-01
    provides: it.todo stubs for REPT-01 and REPT-02
provides:
  - existingServerCount field unconditionally visible in Step 1 (vCPU and SPECint modes)
  - totalPcores auto-derive via form.watch subscription (existingServerCount × socketsPerServer × coresPerSocket)
  - As-Is reference column in ComparisonTable (server count, server config, pCores, vCPU:pCore ratio)
  - All REPT-01 and REPT-02 it.todo stubs filled and passing
affects:
  - 07-03: Step 3 export — As-Is column data now available for PDF/Word report generation

# Tech tracking
tech-stack:
  added: []
  patterns:
    - form.watch() subscription with useEffect cleanup for auto-derive (avoids infinite Zustand loop)
    - As-Is column reads directly from useClusterStore (not ScenarioResult type) per RESEARCH.md

key-files:
  created: []
  modified:
    - src/components/step1/CurrentClusterForm.tsx
    - src/components/step1/__tests__/CurrentClusterForm.test.tsx
    - src/components/step3/ComparisonTable.tsx
    - src/components/step3/__tests__/ComparisonTable.test.tsx

key-decisions:
  - "existingServerCount moved to Existing Server Config section (always visible); SPECint section now contains only specintPerServer"
  - "auto-derive guard checks !form.getValues('totalPcores') before setValue to prevent override of manually entered values"
  - "As-Is column uses bg-muted/30 to visually differentiate read-only reference data from scenario projections"
  - "Server Config and Total pCores rows added as required by REPT-01 spec for complete as-is context"

patterns-established:
  - "REPT pattern: As-Is cells read directly from useClusterStore, never stored in ScenarioResult"
  - "Auto-derive pattern: form.watch callback + useEffect with subscription.unsubscribe() cleanup"

requirements-completed: [REPT-01, REPT-02]

# Metrics
duration: 27min
completed: 2026-03-13
---

# Phase 7 Plan 02: As-Is Column and existingServerCount Unconditional Summary

**As-Is reference column added to ComparisonTable (server count, config, pCores, vCPU:pCore ratio) and existingServerCount moved unconditional with totalPcores auto-derive in CurrentClusterForm**

## Performance

- **Duration:** 27 min
- **Started:** 2026-03-13T08:58:33Z
- **Completed:** 2026-03-13T09:25:55Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- REPT-02: existingServerCount now always visible in Step 1 (vCPU and SPECint modes); auto-derives totalPcores = existingServerCount × socketsPerServer × coresPerSocket when totalPcores is 0
- REPT-01: ComparisonTable gains an As-Is column as second column with rows for server count, server config (sockets×cores), total pCores, and vCPU:pCore ratio; utilization rows show '—'
- 9 REPT it.todo stubs filled (4 REPT-02 + 5 REPT-01); full suite 238 tests green; TypeScript build clean

## Task Commits

Each task was committed atomically:

1. **Task 1: REPT-02 — Move existingServerCount unconditional + auto-derive totalPcores** - `6a2e0ea` (feat)
2. **Task 2: REPT-01 — As-Is reference column in ComparisonTable** - `bb2358c` (feat)

_Note: TDD tasks — tests written first (RED), then implementation (GREEN), both in same commit_

## Files Created/Modified

- `src/components/step1/CurrentClusterForm.tsx` - existingServerCount moved to always-visible section; form.watch auto-derive subscription added
- `src/components/step1/__tests__/CurrentClusterForm.test.tsx` - 4 REPT-02 it.todo stubs filled with passing tests (30 total)
- `src/components/step3/ComparisonTable.tsx` - As-Is column header + cells added; Server Config and Total pCores rows added; useClusterStore imported
- `src/components/step3/__tests__/ComparisonTable.test.tsx` - 5 REPT-01 it.todo stubs filled with passing tests (20 total)

## Decisions Made

- existingServerCount moved out of specint-only guard into Existing Server Config section — always visible in both modes
- SPECint section now only contains specintPerServer (cleaner separation of concerns)
- Auto-derive guard: `!form.getValues('totalPcores')` prevents overriding manually entered values (follows STATE.md pattern)
- As-Is column styled with `bg-muted/30` to visually distinguish read-only reference column from scenario projections
- As-Is cells for utilization rows show '—' — no As-Is utilization concept exists (would require live monitoring data)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- As-Is column visible and populated in ComparisonTable; ready for 07-03 enhanced export (PDF/Word with As-Is context)
- existingServerCount captured in OldCluster; auto-derive reduces manual entry burden for presales engineers
- All REPT-01 and REPT-02 requirements fulfilled

---
_Phase: 07-enhanced-export-and-as-is-to-be-report_
_Completed: 2026-03-13_
