---
phase: 05-specint-and-utilization-formula-engine
plan: "03"
subsystem: sizing
tags: [zustand, vitest, typescript, specint, formula-engine]

requires:
  - phase: 05-01
    provides: useWizardStore with sizingMode field and setSizingMode action
  - phase: 05-02
    provides: computeScenarioResult accepting optional sizingMode parameter

provides:
  - useScenariosResults hook wired to useWizardStore sizingMode (integration seam)
  - All Phase 5 it.todo stubs filled with passing assertions (store + schema tests)
  - Production build passing with specint added to LimitingResource exhaustive records

affects:
  - 06-specint-ui
  - phase-7

tech-stack:
  added: []
  patterns:
    - "sizingMode flows from useWizardStore through useScenariosResults to computeScenarioResult — store -> hook -> formula pattern"
    - "Exhaustive Record<LimitingResource, string> maps must include all union members — TypeScript enforces coverage"

key-files:
  created: []
  modified:
    - src/hooks/useScenariosResults.ts
    - src/store/__tests__/useScenariosResults.test.ts
    - src/store/__tests__/useWizardStore.test.ts
    - src/schemas/__tests__/schemas.test.ts
    - src/components/step1/CurrentClusterForm.tsx
    - src/components/step2/ScenarioResults.tsx

key-decisions:
  - "Integration tests for useScenariosResults test computeScenarioResult directly (not the hook via renderHook) — pure formula testing is equivalent and avoids React test setup overhead"
  - "TOOLTIPS Record in CurrentClusterForm uses Record<keyof CurrentClusterInput, string> (exhaustive) — new schema fields require corresponding tooltip entries to satisfy TypeScript"
  - "RESOURCE_LABELS in ScenarioResults adds specint entry as 'SPECint-limited' — Phase 6 will add richer UI treatment"

patterns-established:
  - "Store -> hook -> formula data flow: useWizardStore(sizingMode) -> useScenariosResults -> computeScenarioResult(cluster, scenario, sizingMode)"
  - "Exhaustive Record types catch missing union members at build time — adding to LimitingResource union forces all Record sites to handle the new case"

requirements-completed: [PERF-01, PERF-04, PERF-05, UTIL-01, UTIL-02, UTIL-03]

duration: 8min
completed: 2026-03-13
---

# Phase 5 Plan 03: Wire sizingMode Integration Seam and Fill All Test Stubs

**sizingMode flows from useWizardStore through useScenariosResults to computeScenarioResult, with all Phase 5 test stubs filled and build clean at 205 passing tests**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-13T06:41:18Z
- **Completed:** 2026-03-13T06:49:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Wired `useWizardStore.sizingMode` into `useScenariosResults` hook — the integration seam where global store connects to formula engine
- Filled all `it.todo` stubs in `useScenariosResults.test.ts`, `useWizardStore.test.ts`, and `schemas.test.ts` with passing assertions
- Fixed two TypeScript build errors caused by exhaustive `Record` types requiring new union members

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire sizingMode into useScenariosResults hook** - `a0d0478` (feat)
2. **Task 2: Fill store and schema test stubs + build verification** - `ccf64b8` (feat)

## Files Created/Modified

- `src/hooks/useScenariosResults.ts` - Added `useWizardStore` selector for `sizingMode`, passed as third arg to `computeScenarioResult`
- `src/store/__tests__/useScenariosResults.test.ts` - Filled 3 integration test stubs: SPECint-limited result, vCPU regression, limitingResource assertion
- `src/store/__tests__/useWizardStore.test.ts` - Filled 3 stubs: sizingMode default vcpu, setSizingMode specint, setSizingMode back to vcpu
- `src/schemas/__tests__/schemas.test.ts` - Filled 13 stubs: cpuUtilizationPercent/ramUtilizationPercent range, SPECint cluster fields, targetSpecint validation
- `src/components/step1/CurrentClusterForm.tsx` - Added tooltip entries for 4 new `CurrentClusterInput` fields to satisfy exhaustive `Record<keyof CurrentClusterInput, string>`
- `src/components/step2/ScenarioResults.tsx` - Added `specint: 'SPECint-limited'` to `RESOURCE_LABELS` exhaustive Record

## Decisions Made

- Integration tests for `useScenariosResults` test `computeScenarioResult` directly (not via `renderHook`) — pure formula testing is equivalent and avoids React testing library overhead
- `TOOLTIPS` in `CurrentClusterForm` uses exhaustive `Record<keyof CurrentClusterInput, string>` — when new schema fields are added, TypeScript forces tooltip entries, ensuring UI completeness
- `RESOURCE_LABELS` in `ScenarioResults` adds `specint: 'SPECint-limited'` as minimal Phase 5 fix — Phase 6 will add richer SPECint UI treatment

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed CurrentClusterForm.tsx TOOLTIPS record missing new fields**

- **Found during:** Task 2 (build verification)
- **Issue:** `TOOLTIPS: Record<keyof CurrentClusterInput, string>` was missing `existingServerCount`, `specintPerServer`, `cpuUtilizationPercent`, `ramUtilizationPercent` — TypeScript error TS2739
- **Fix:** Added 4 tooltip string entries for the new schema fields
- **Files modified:** `src/components/step1/CurrentClusterForm.tsx`
- **Verification:** Build exits 0
- **Committed in:** `ccf64b8` (Task 2 commit)

**2. [Rule 1 - Bug] Fixed ScenarioResults.tsx RESOURCE_LABELS missing specint member**

- **Found during:** Task 2 (build verification)
- **Issue:** `RESOURCE_LABELS: Record<LimitingResource, string>` was missing `specint` after 05-02 extended `LimitingResource` union — TypeScript error TS2741
- **Fix:** Added `specint: 'SPECint-limited'` to the record
- **Files modified:** `src/components/step2/ScenarioResults.tsx`
- **Verification:** Build exits 0
- **Committed in:** `ccf64b8` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - TypeScript exhaustiveness bugs surfaced by build)
**Impact on plan:** Both fixes required for build correctness. Minimal scope — no new UI features added (Phase 6 work).

## Issues Encountered

None beyond the two auto-fixed TypeScript exhaustiveness errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 5 formula engine is complete: SPECint mode wired end-to-end from store through hook to formula
- Full test suite at 205 tests, zero failures
- Production build clean
- Phase 6 (SPECint UI) can proceed: `useWizardStore.setSizingMode`, `useScenariosResults`, and `computeScenarioResult` all ready to consume

---
*Phase: 05-specint-and-utilization-formula-engine*
*Completed: 2026-03-13*
