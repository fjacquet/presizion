---
phase: 02-input-forms
plan: "03"
subsystem: ui
tags: [react-hook-form, zod, zustand, shadcn, switch, tabs, tdd]

# Dependency graph
requires:
  - phase: 02-01
    provides: UI stack (react-hook-form, shadcn/ui, Tailwind v4), path aliases, test setup
  - phase: 01-foundation
    provides: scenarioSchema, useScenariosStore, useScenariosResults hook, Scenario type, defaults

provides:
  - ScenarioCard: per-scenario RHF form with own useForm instance, server config + sizing assumptions
  - ScenarioResults: read-only panel from useScenariosResults — no Zustand result storage
  - Step2Scenarios: container with tabbed navigation, Add Scenario, and key=scenario.id remount

affects: [03-output-display, wizard-integration, step2-testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "form.watch() subscription (not useEffect+watched-dep) to avoid infinite re-render on Zustand sync"
    - "Form wrapper wraps entire Card including CardHeader to avoid FormField outside FormProvider"
    - "key=scenario.id on ScenarioCard forces fresh useForm initialization on duplicate"
    - "scenarioSchema.safeParse in watch subscription — write to store only on success"
    - "getByText/getAllByText for labels (FormControl renders a div wrapper, breaking getByLabelText)"

key-files:
  created:
    - src/components/step2/ScenarioCard.tsx
    - src/components/step2/ScenarioResults.tsx
    - src/components/step2/Step2Scenarios.tsx
  modified:
    - src/components/step2/__tests__/ScenarioCard.test.tsx

key-decisions:
  - "Use form.watch(callback) subscription pattern (not useEffect on watched values) to prevent infinite Zustand setState loop"
  - "Wrap entire Card content (including CardHeader) in <Form> so FormField can access FormProvider context"
  - "Switch uses @base-ui/react/switch which has checked + onCheckedChange — matches RHF field API"
  - "Tests use getByText for labels (not getByLabelText) because FormControl wraps input in a div, not a native label-for linkage"
  - "getAllByText for ScenarioResults because label text appears in both Badge and inline span"

patterns-established:
  - "Scenario store sync: form.watch(cb) subscription with scenarioSchema.safeParse — write only on success"
  - "TDD workflow: replace it.todo stubs with real implementations (RED), then create component file (GREEN)"
  - "ScenarioCard FormProvider scope: <Form> wraps <form> which wraps both CardHeader and CardContent"

requirements-completed: [SCEN-01, SCEN-02, SCEN-03, SCEN-04, SCEN-05]

# Metrics
duration: 8min
completed: 2026-03-12
---

# Phase 02 Plan 03: Step 2 Scenarios Summary

**Per-scenario RHF forms (ScenarioCard) with shadcn Switch toggle, live results panel from useScenariosResults, and tabbed Step2Scenarios container — 21 RTL tests passing for SCEN-01 through SCEN-05**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-12T19:45:16Z
- **Completed:** 2026-03-12T19:50:30Z
- **Tasks:** 2 (TDD: RED + GREEN each)
- **Files modified:** 4

## Accomplishments
- ScenarioCard with independent `useForm` instance per scenario, server config and sizing assumption fields, derived total-cores metric, and haReserveEnabled Switch toggle syncing to store
- ScenarioResults read-only panel reading from `useScenariosResults()` hook — no result storage in Zustand
- Step2Scenarios tabbed container with Add Scenario button, `key={scenario.id}` for fresh form on duplicate
- 21 RTL tests covering all SCEN-01 through SCEN-05 requirements, full test suite still 96 passed / 0 failed
- TypeScript `--noEmit` exits 0

## Task Commits

1. **Task 1 + Task 2: ScenarioCard, ScenarioResults, Step2Scenarios + tests** - `8515b67` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified
- `src/components/step2/ScenarioCard.tsx` - Per-scenario RHF form with own useForm instance, server config fields, sizing assumption fields, haReserveEnabled Switch, store sync via form.watch subscription
- `src/components/step2/ScenarioResults.tsx` - Read-only server count panel from useScenariosResults, correlates by scenario index
- `src/components/step2/Step2Scenarios.tsx` - Tabbed container, Add Scenario button, key=scenario.id for SCEN-05
- `src/components/step2/__tests__/ScenarioCard.test.tsx` - 21 RTL tests replacing it.todo stubs

## Decisions Made

- **form.watch(callback) subscription over useEffect+watched deps:** Using `useEffect` with `watched` in the dependency array caused an infinite re-render loop: `updateScenario` triggers Zustand state change → component re-renders → `watched` changes → useEffect fires again. The `form.watch(callback)` subscription runs outside React's render cycle, preventing this.

- **Form provider scope over CardHeader:** The initial implementation placed FormField for the scenario name inside CardHeader but outside the `<Form>` wrapper. The shadcn `useFormField` hook calls `useFormContext()` which throws when there's no FormProvider ancestor. Fix: wrap the entire `<Card>` content (including CardHeader) inside `<Form {...form}><form>`.

- **getByText not getByLabelText for field labels:** shadcn's `FormControl` renders a `<div>` wrapper with the formItemId, and `FormLabel` uses `htmlFor` pointing to that div. This makes the `<input>` inside non-directly-labelled, causing `getByLabelText` to throw "element associated with this label is non-labellable". Used `getByText` for label presence and `getAllByRole('spinbutton')` for input value checks.

- **getAllByText for ScenarioResults:** The text "CPU-limited" appears in both the Badge span and the inline "CPU-limited: " label span. Used `getAllByText(...).length > 0` to avoid the "Found multiple elements" error.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed infinite re-render loop in store sync useEffect**
- **Found during:** Task 1 (ScenarioCard GREEN phase, first test run)
- **Issue:** `useEffect` with `watched = form.watch()` in dependencies caused infinite loop: each `updateScenario` call changed Zustand state → re-render → new `watched` object → `useEffect` fires → `updateScenario` again
- **Fix:** Replaced `useEffect([watched, ...])` with `form.watch(callback)` subscription pattern; used refs to hold stable `scenarioId` and `updateScenario` references
- **Files modified:** src/components/step2/ScenarioCard.tsx
- **Verification:** `npm test -- src/components/step2` passes without "Maximum update depth exceeded" error
- **Committed in:** 8515b67 (Task 1+2 commit)

**2. [Rule 1 - Bug] Fixed FormField outside FormProvider scope**
- **Found during:** Task 1 (ScenarioCard GREEN phase, first test run)
- **Issue:** Initial implementation placed `<CardHeader>` (with name FormField) outside the `<Form>` wrapper; `useFormField` called `useFormContext()` which returned null
- **Fix:** Restructured so `<Form {...form}><form>` wraps both `<CardHeader>` and `<CardContent>`
- **Files modified:** src/components/step2/ScenarioCard.tsx
- **Verification:** TypeError "Cannot destructure property 'getFieldState' of useFormContext(...)" no longer occurs
- **Committed in:** 8515b67 (Task 1+2 commit)

**3. [Rule 1 - Bug] Fixed test query strategy for shadcn FormControl wrapper**
- **Found during:** Task 1 (test RED phase — tests failing for wrong reason after component created)
- **Issue:** `getByLabelText(/sockets\/server/i)` threw "element associated with label is non-labellable" because `FormControl` renders a `<div>` not a native `<input>` as the label target
- **Fix:** Used `getByText` for label presence checks, `getAllByRole('spinbutton')` for input value checks
- **Files modified:** src/components/step2/__tests__/ScenarioCard.test.tsx
- **Verification:** 21 tests pass green
- **Committed in:** 8515b67 (Task 1+2 commit)

---

**Total deviations:** 3 auto-fixed (Rule 1 — all bugs in component structure or test strategy)
**Impact on plan:** All auto-fixes necessary for correct behavior; no scope creep. The patterns are documented for future ScenarioCard-style forms.

## Issues Encountered
- @base-ui/react Switch has `checked` + `onCheckedChange` (same API as shadcn radix Switch) — no adaptation needed, the plan's specified binding worked directly.

## Next Phase Readiness
- ScenarioCard, ScenarioResults, and Step2Scenarios ready for wizard integration (02-04)
- All SCEN-01 through SCEN-05 requirements satisfied
- TypeScript strict mode passes, no linting errors in new files

---
*Phase: 02-input-forms*
*Completed: 2026-03-12*

## Self-Check: PASSED

- FOUND: src/components/step2/ScenarioCard.tsx
- FOUND: src/components/step2/ScenarioResults.tsx
- FOUND: src/components/step2/Step2Scenarios.tsx
- FOUND: src/components/step2/__tests__/ScenarioCard.test.tsx
- FOUND commit: 8515b67 in git log
- Tests: 21 passed / 0 failed for step2 suite
- Full suite: 96 passed / 0 failed
- TypeScript: exits 0
