---
phase: 01-foundation
plan: 03
subsystem: state
tags: [typescript, zod, zustand, react-hooks, vitest, tdd, validation, state-management]

# Dependency graph
requires:
  - phase: 01-foundation
    plan: 02
    provides: "OldCluster, Scenario types; computeScenarioResult; createDefaultScenario; sizing defaults"
provides:
  - "currentClusterSchema: Zod schema for OldCluster form input with z.preprocess numeric validation"
  - "scenarioSchema: Zod schema for Scenario form input with z.preprocess and defaults from defaults.ts"
  - "useWizardStore: Zustand slice for 3-step wizard navigation"
  - "useClusterStore: Zustand slice for current cluster state with setCurrentCluster/resetCluster"
  - "useScenariosStore: Zustand slice for scenarios CRUD (add/duplicate/remove/update)"
  - "useScenariosResults: Hook deriving ScenarioResult[] from store state on demand"
affects: [02-components, 03-hooks, 04-export]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD: write failing tests (RED) before any implementation (GREEN)"
    - "z.preprocess for all numeric Zod fields — empty strings throw ZodError, not silently coerce to 0"
    - "Zustand create() with typed interface slices — separate files per slice"
    - "Derive-on-read pattern: ScenarioResult computed in hook, never stored in Zustand"
    - "Store reset in beforeEach via store.setState() for test isolation"
    - "vi.stubGlobal('crypto', ...) for deterministic crypto.randomUUID() in jsdom tests"

key-files:
  created:
    - src/schemas/currentClusterSchema.ts
    - src/schemas/scenarioSchema.ts
    - src/schemas/__tests__/schemas.test.ts
    - src/store/useWizardStore.ts
    - src/store/useClusterStore.ts
    - src/store/useScenariosStore.ts
    - src/hooks/useScenariosResults.ts
  modified:
    - src/hooks/__tests__/useScenariosResults.test.ts

key-decisions:
  - "z.preprocess (not z.coerce.number) for numeric Zod fields — ensures empty string inputs throw ZodError instead of coercing to 0, protecting form validation"
  - "Default values (DEFAULT_VCPU_TO_PCORE_RATIO, DEFAULT_HEADROOM_PERCENT) imported from defaults.ts into schemas — single source of truth"
  - "ScenarioResult never stored in Zustand — useScenariosResults derives on each render from store state (derive-on-read pattern)"
  - "OldCluster imported from types (not schemas) in useClusterStore — schemas are for form input validation, types are for pure data"
  - "Zod v4 strict UUID validation requires RFC 4122 variant bits — test fixtures updated from 00000000-... to valid UUIDs (a0eebc99-...)"

patterns-established:
  - "Schema pattern: z.preprocess wrapper for numeric fields to reject empty strings"
  - "Store pattern: separate .ts file per Zustand slice, typed interface, create() factory"
  - "Hook pattern: read from multiple stores, compute derived state, return without storing"
  - "Test pattern: beforeEach store.setState() reset + vi.stubGlobal for crypto in jsdom"

requirements-completed: [CALC-05, CALC-06]

# Metrics
duration: 6min
completed: 2026-03-12
---

# Phase 1 Plan 3: Zod Schemas, Zustand Stores, and useScenariosResults Hook Summary

**Zod schemas with z.preprocess numeric validation, three Zustand slices (wizard/cluster/scenarios), and useScenariosResults derive-on-read hook — 58 tests green, zero TypeScript errors**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-12T18:04:33Z
- **Completed:** 2026-03-12T18:09:51Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Implemented currentClusterSchema and scenarioSchema using z.preprocess for all numeric fields — empty string inputs throw ZodError (not silently coerced to 0), defaults imported from defaults.ts (single source of truth)
- Implemented three Zustand slices: useWizardStore (step 1|2|3 navigation), useClusterStore (cluster CRUD), useScenariosStore (scenarios CRUD with add/duplicate/remove/update)
- Implemented useScenariosResults hook using derive-on-read pattern — computes ScenarioResult[] on demand from store state, never caches results in Zustand
- All fixture verifications pass: CPU-limited scenario returns finalCount=24 as expected
- Full test suite: 58 tests pass across 6 test files; zero TypeScript errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Zod validation schemas for OldCluster and Scenario (TDD green)** - `f947169` (feat)
2. **Task 2: Zustand stores and useScenariosResults hook (TDD green)** - `dd9e8b6` (feat)

## Files Created/Modified

- `src/schemas/currentClusterSchema.ts` - Zod schema: OldCluster with z.preprocess numeric, exports currentClusterSchema + CurrentClusterInput
- `src/schemas/scenarioSchema.ts` - Zod schema: Scenario with z.preprocess and defaults from defaults.ts, exports scenarioSchema + ScenarioInput
- `src/schemas/__tests__/schemas.test.ts` - 12 schema tests: empty string rejection, default values, optional fields, valid parse
- `src/store/useWizardStore.ts` - Zustand slice: currentStep (1|2|3), goToStep, nextStep, prevStep
- `src/store/useClusterStore.ts` - Zustand slice: currentCluster OldCluster, setCurrentCluster, resetCluster
- `src/store/useScenariosStore.ts` - Zustand slice: scenarios[], addScenario, duplicateScenario, removeScenario, updateScenario
- `src/hooks/useScenariosResults.ts` - Hook: reads from useClusterStore + useScenariosStore, maps computeScenarioResult per scenario
- `src/hooks/__tests__/useScenariosResults.test.ts` - 12 hook/store tests: empty/populated stores, fixture verification, reactivity

## Decisions Made

- **z.preprocess over z.coerce.number:** The plan explicitly required z.preprocess to prevent empty form field inputs from silently becoming 0. This protects UX — invalid form inputs surface as errors, not as a 0-server calculation.
- **Default values from defaults.ts in schemas:** targetVcpuToPCoreRatio and headroomPercent defaults are pulled from `DEFAULT_VCPU_TO_PCORE_RATIO` and `DEFAULT_HEADROOM_PERCENT` constants — one update to defaults.ts changes both the factory function and schema defaults.
- **Derive-on-read for ScenarioResult:** Computing results in useScenariosResults on every render (rather than storing in Zustand) ensures results are always consistent with store state — no stale cache invalidation logic needed.
- **Zod v4 strict UUID validation:** Test fixtures using `00000000-0000-0000-0000-000000000001` are rejected by Zod v4's stricter UUID regex (requires RFC 4122 variant bits `[89abAB]`). Updated to use `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11` which is valid. This is a Zod v4 behavior change from v3.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated test UUID fixtures for Zod v4 strict UUID validation**
- **Found during:** Task 1 (Zod schemas, TDD GREEN phase)
- **Issue:** Test fixtures used `00000000-0000-0000-0000-000000000001` UUIDs which fail Zod v4's stricter `z.string().uuid()` validation (requires valid RFC 4122 variant bits in position 17)
- **Fix:** Updated test UUIDs to `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11` (valid RFC 4122 v4) throughout schema and hook tests
- **Files modified:** `src/schemas/__tests__/schemas.test.ts`, `src/hooks/__tests__/useScenariosResults.test.ts`
- **Verification:** All 12 schema tests pass; UUID validation works correctly for both valid and invalid formats
- **Committed in:** f947169 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug, Zod v4 UUID validation strictness)
**Impact on plan:** Required only test fixture UUID updates — schema implementation unchanged. No scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All three Zustand slices are ready for Phase 2 form components to read from and write to
- useScenariosResults hook is ready for Phase 3 results display components
- Both schemas are ready for form validation in wizard Step 1 and Step 2 form components
- The derive-on-read pattern means results always reflect current store state — no cache invalidation needed

---
*Phase: 01-foundation*
*Completed: 2026-03-12*
