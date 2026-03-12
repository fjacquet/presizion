---
phase: 02-input-forms
plan: "02"
subsystem: ui
tags: [react, react-hook-form, zod, zustand, shadcn, vitest, testing-library]

# Dependency graph
requires:
  - phase: 02-input-forms-01
    provides: UI stack (RHF, shadcn/ui, Tailwind v4), Wave 0 test stubs, Zustand stores
  - phase: 01-foundation
    provides: currentClusterSchema, useClusterStore, useScenariosResults, OldCluster type

provides:
  - CurrentClusterForm: RHF form with zodResolver, mode:onBlur, Zustand sync via useEffect
  - DerivedMetricsPanel: live vCPU:pCore ratio read from useClusterStore, VMs/Server from useScenariosResults
  - Step1CurrentCluster: composed container for wizard step 1
  - NumericFormField: reusable helper component for numeric shadcn form fields
  - vitest resolve alias for @/components/* imports in component tests
  - jest-dom matchers via test-setup.ts

affects: [02-03, 02-04, wizard, step2]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "NumericFormField: reusable shadcn FormField wrapper for numeric inputs with tooltip"
    - "RHF + zodResolver + mode:onBlur with useEffect Zustand sync on form.watch()"
    - "Navigation guard: form.trigger(['totalVcpus','totalPcores','totalVms']) on Next click"
    - "z.preprocess compatibility: pass e.target.value (raw string) to field.onChange"
    - "data-testid on inputs for RTL testing since shadcn FormControl wraps label htmlFor to div"

key-files:
  created:
    - src/components/step1/CurrentClusterForm.tsx
    - src/components/step1/DerivedMetricsPanel.tsx
    - src/components/step1/Step1CurrentCluster.tsx
    - src/test-setup.ts
  modified:
    - src/components/step1/__tests__/CurrentClusterForm.test.tsx
    - vitest.config.ts

key-decisions:
  - "data-testid on input elements required because shadcn FormControl sets label htmlFor to the wrapping div, not the input — getByLabelText returns div, not input"
  - "NumericFormField extracted to keep CurrentClusterForm near 150-line guideline and eliminate 7x FormField repetition"
  - "fireEvent used instead of userEvent since @testing-library/user-event is not installed"
  - "vitest.config.ts required resolve.alias for @ to match vite.config.ts so @/components/* imports resolve in tests"

patterns-established:
  - "Pattern 1: NumericFormField wrapper — use for all numeric fields in forms"
  - "Pattern 2: vitest resolve alias must mirror vite.config.ts alias for consistent @/ resolution"
  - "Pattern 3: data-testid pattern — use testId prop on form field wrappers for RTL test queries"

requirements-completed: [INPUT-01, INPUT-02, INPUT-03, INPUT-04, INPUT-05, UX-03]

# Metrics
duration: 35min
completed: 2026-03-12
---

# Phase 2 Plan 02: Step 1 Current Cluster Form Summary

**RHF + Zod + Zustand three-component Step 1 with live derived metrics panel and navigation guard**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-03-12T20:00:00Z
- **Completed:** 2026-03-12T20:35:00Z
- **Tasks:** 2 (TDD: 2 RED + 2 GREEN + 1 REFACTOR)
- **Files modified:** 6

## Accomplishments

- `CurrentClusterForm`: RHF form wired to `zodResolver(currentClusterSchema)` with `mode: 'onBlur'`, `useEffect` Zustand sync on `form.watch()`, and `form.trigger()` navigation guard
- `DerivedMetricsPanel`: reads `useClusterStore` for live vCPU:pCore ratio; em dash shown when pCores is 0; updates reactively when store changes
- `Step1CurrentCluster`: composed container ready for `WizardShell` to render at step 1
- All 17 tests green (INPUT-01 through INPUT-05, UX-03)
- TypeScript strict mode passes (`npx tsc --noEmit` exits 0)

## Task Commits

Each task was committed atomically:

1. **Infrastructure fix (Rule 3 - Blocking)** - `22742ae` (chore: vitest resolve alias + jest-dom setup)
2. **Task 1 RED phase: CurrentClusterForm tests** - `d72056e` (test: replace todo stubs with real RTL tests)
3. **Task 1 GREEN phase: Component implementations** - `49b7b13` (feat: CurrentClusterForm, DerivedMetricsPanel, Step1CurrentCluster)
4. **REFACTOR: Extract NumericFormField** - `cd5221c` (refactor: reduce CurrentClusterForm to ~150 lines)

## Files Created/Modified

- `src/components/step1/CurrentClusterForm.tsx` — RHF form with zodResolver, Zustand sync, nav guard, tooltip info icons
- `src/components/step1/DerivedMetricsPanel.tsx` — Read-only live metrics panel from useClusterStore + useScenariosResults
- `src/components/step1/Step1CurrentCluster.tsx` — Composed wizard step 1 container
- `src/components/step1/__tests__/CurrentClusterForm.test.tsx` — 17 RTL tests covering all requirements
- `src/test-setup.ts` — Global jest-dom matcher setup for component tests
- `vitest.config.ts` — Added resolve.alias for @ and setupFiles for jest-dom

## Decisions Made

- `data-testid` attributes added to all numeric inputs because shadcn `FormControl` sets label `htmlFor` to the wrapping div (not the input), so `getByLabelText` returns the div — `getByRole('spinbutton', { name })` also fails for the same reason. `data-testid` is the correct testability hook here.
- `NumericFormField` component extracted to eliminate 7x repeated FormField pattern and keep component near 150-line guideline.
- `fireEvent` used instead of `userEvent` since `@testing-library/user-event` is not installed in this project.
- `vitest.config.ts` required `resolve.alias` mirroring `vite.config.ts` so `@/components/*` imports resolve correctly in the jsdom test environment.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] vitest config missing resolve alias for @ path**
- **Found during:** Task 1 pre-execution (verifying test infrastructure)
- **Issue:** `vitest.config.ts` had no `resolve.alias` for `@`, causing `@/components/ui/form` imports to fail in tests
- **Fix:** Added `resolve: { alias: { '@': path.resolve(__dirname, './src') } }` to `vitest.config.ts`
- **Files modified:** `vitest.config.ts`
- **Verification:** Tests now resolve all `@/` imports correctly
- **Committed in:** `22742ae`

**2. [Rule 3 - Blocking] Missing jest-dom matchers setup for component tests**
- **Found during:** Task 1 pre-execution (checking test infrastructure)
- **Issue:** No `setupFiles` in `vitest.config.ts` means `toBeInTheDocument()` and other jest-dom matchers are unavailable
- **Fix:** Created `src/test-setup.ts` importing `@testing-library/jest-dom`, added `setupFiles` to vitest config
- **Files modified:** `vitest.config.ts`, `src/test-setup.ts` (created)
- **Verification:** All jest-dom assertions work in tests
- **Committed in:** `22742ae`

**3. [Rule 1 - Bug] shadcn FormControl label/input linkage prevents standard RTL queries**
- **Found during:** Task 1 RED execution (first test run showed fireEvent.change errors)
- **Issue:** `getByLabelText()` returns the `FormControl` div (not the `input`) because shadcn links label `htmlFor` to the div's id; `fireEvent.change` on a div fails with "element does not have a value setter"; `getByRole('spinbutton', { name })` also fails because the accessible name doesn't propagate through the div wrapper
- **Fix:** Added `data-testid` prop to each numeric `Input` component; tests use `getByTestId`
- **Files modified:** `src/components/step1/CurrentClusterForm.tsx`
- **Verification:** All 17 tests pass
- **Committed in:** `49b7b13`

---

**Total deviations:** 3 auto-fixed (2 blocking infrastructure, 1 shadcn label wiring bug)
**Impact on plan:** All auto-fixes necessary for tests to function. Tooltip text slightly shortened (no behavioral impact). No scope creep.

## Issues Encountered

- shadcn `TooltipTrigger asChild` on SVG `Info` icon emits a React prop warning (`asChild` on DOM element). This is a known shadcn/radix pattern issue — it doesn't affect functionality and is pre-existing in the shadcn tooltip component. Not fixed (out of scope).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `Step1CurrentCluster` is ready for `WizardShell` to render at `currentStep === 1`
- `NumericFormField` pattern is available for reuse in ScenarioCard forms (plan 02-03)
- `data-testid` pattern established for shadcn form inputs — plan 02-03 should follow same approach
- Pre-existing: `ScenarioCard.test.tsx` tests fail because ScenarioCard/Step2Scenarios/ScenarioResults components don't exist yet (plan 02-03 scope)

---
*Phase: 02-input-forms*
*Completed: 2026-03-12*
