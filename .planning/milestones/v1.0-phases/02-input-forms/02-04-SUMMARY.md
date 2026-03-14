---
phase: 02-input-forms
plan: "04"
subsystem: ui
tags: [react, zustand, tailwind, shadcn, tdd, wizard, step-indicator, routing]

# Dependency graph
requires:
  - phase: 02-02
    provides: Step1CurrentCluster, CurrentClusterForm with navigation guard
  - phase: 02-03
    provides: Step2Scenarios, ScenarioCard, Step2 components
  - phase: 01-foundation
    provides: useWizardStore (currentStep, prevStep, nextStep)

provides:
  - StepIndicator: 3-step visual progress nav with aria-current="step" and data-testid for RTL
  - WizardShell: step routing shell rendering Step1/Step2 by currentStep, Back button on steps 2+
  - App.tsx: root component entry point rendering WizardShell
  - WizardShell integration tests: 9 RTL tests covering UX-01 and UX-02

affects: [03-output-display, end-to-end-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "WizardShell mocks child steps in tests for routing isolation (vi.mock on step components)"
    - "StepIndicator: data-testid=step-indicator-N for RTL testability; aria-current=step for a11y"
    - "zodResolver as any cast for z.preprocess type mismatch with useForm generic"
    - "Control<T, any, T> third type param for NumericFormField when z.preprocess resolver used"

key-files:
  created:
    - src/components/wizard/StepIndicator.tsx
    - src/components/wizard/WizardShell.tsx
  modified:
    - src/components/wizard/__tests__/WizardShell.test.tsx
    - src/App.tsx
    - src/components/step1/CurrentClusterForm.tsx
    - src/components/step2/ScenarioCard.tsx
    - src/components/step1/__tests__/CurrentClusterForm.test.tsx

key-decisions:
  - "vi.mock on Step1CurrentCluster and Step2Scenarios in WizardShell tests — isolates routing logic from full component render trees (avoids testing RHF form state in wizard routing tests)"
  - "zodResolver cast as any in useForm — z.preprocess makes schema input type unknown which conflicts with useForm<ConcreteType>; cast is safe because zodResolver validates correctly at runtime"
  - "Control<T, any, T> in NumericFormField interface — third type param TTransformedValues must match for FormField to accept the control when z.preprocess resolver is used"
  - "Remove asChild from TooltipTrigger — base-ui/react Trigger does not support asChild prop (not Radix-style); removes TypeScript error and React prop warning"

requirements-completed: [UX-01, UX-02]

# Metrics
duration: 5min
completed: 2026-03-12
---

# Phase 2 Plan 04: WizardShell and StepIndicator Summary

**3-step wizard routing shell (WizardShell + StepIndicator) wired as App root with 9 RTL integration tests and clean production build after fixing pre-existing zodResolver/z.preprocess type errors**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-12T19:57:03Z
- **Completed:** 2026-03-12T20:02:00Z
- **Tasks:** 2 (TDD: RED + GREEN for task 1; App.tsx + build fixes for task 2)
- **Files modified:** 7

## Accomplishments

- `StepIndicator`: 3-step visual progress nav with `aria-current="step"` on active step and `data-testid="step-indicator-N"` on each circle for RTL testability
- `WizardShell`: step routing shell reading `useWizardStore.currentStep`, renders `Step1CurrentCluster` or `Step2Scenarios` or Step 3 placeholder; Back button visible only when `currentStep > 1`, calls `prevStep()` without validation
- `App.tsx`: single-line root entry point rendering `WizardShell`
- All 9 WizardShell integration tests green (UX-01 + UX-02)
- Full test suite: 105 passed / 0 failed (no regressions)
- `npm run build` exits 0 — production build clean

## Task Commits

1. **Task 1 RED phase: WizardShell integration tests** - `fcc2e1a` (test: replace todo stubs with real RTL tests)
2. **Task 1 GREEN phase: StepIndicator + WizardShell components** - `05011fe` (feat: implement StepIndicator and WizardShell)
3. **Task 2: App.tsx + build fixes** - `adb72d7` (feat: wire WizardShell into App.tsx; fix pre-existing tsc errors)

## Files Created/Modified

- `src/components/wizard/StepIndicator.tsx` — 3-step progress nav, aria-current, data-testid
- `src/components/wizard/WizardShell.tsx` — step routing shell, StepIndicator, Back button
- `src/components/wizard/__tests__/WizardShell.test.tsx` — 9 RTL tests replacing it.todo stubs
- `src/App.tsx` — root entry point rendering WizardShell
- `src/components/step1/CurrentClusterForm.tsx` — zodResolver cast, TooltipTrigger fix, Control type fix
- `src/components/step2/ScenarioCard.tsx` — zodResolver cast for z.preprocess type compat
- `src/components/step1/__tests__/CurrentClusterForm.test.tsx` — added vi to vitest imports

## Decisions Made

- **vi.mock for child step isolation:** WizardShell tests mock `Step1CurrentCluster` and `Step2Scenarios` with lightweight stubs. This ensures routing logic tests don't require full RHF form rendering and don't fail when shadcn form internals change.

- **zodResolver as any cast:** The `zodResolver` function infers a `Resolver<InputType>` where `InputType` has `unknown` fields for all `z.preprocess` fields. But `useForm<ConcreteOutputType>` expects `Resolver<ConcreteOutputType>`. The cast is safe because `zodResolver` validates correctly at runtime; the type mismatch is a TypeScript-level artifact of how `z.preprocess` generalizes the input type.

- **Control<T, any, T> third type param:** When passing `form.control` to `NumericFormField`, the `Control<TFieldValues, TContext, TTransformedValues>` third param was being inferred as `TFieldValues` (from zodResolver) but the interface expected just `Control<T>`. Fixed by typing the interface with the explicit third param.

- **Remove asChild from TooltipTrigger:** The shadcn tooltip in this project uses `@base-ui/react/tooltip` (not Radix). `@base-ui/react` Trigger does not expose an `asChild` prop. Removing it eliminates both the TypeScript error and the React "unknown prop" warning without changing the visual or functional behavior.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pre-existing TypeScript errors surfaced only in npm run build**

- **Found during:** Task 2 (running npm run build as required by task done criteria)
- **Issue:** `tsc -b` in npm run build is stricter than `npx tsc --noEmit` (which uses a different tsconfig path); three categories of errors: (1) `vi` missing from vitest imports in test file, (2) `zodResolver` with `z.preprocess` creates `Resolver<unknown-input>` incompatible with `useForm<ConcreteType>`, (3) `TooltipTrigger asChild` not supported by base-ui Trigger
- **Fix:** Added `vi` to test imports; cast `zodResolver(schema) as any` in both `CurrentClusterForm` and `ScenarioCard`; fixed `NumericFormField` control prop type; removed `asChild` from `TooltipTrigger`
- **Files modified:** `src/components/step1/CurrentClusterForm.tsx`, `src/components/step2/ScenarioCard.tsx`, `src/components/step1/__tests__/CurrentClusterForm.test.tsx`
- **Verification:** `npm run build` exits 0; `npm test` still passes 105/105
- **Committed in:** `adb72d7`

---

**Total deviations:** 1 auto-fixed (Rule 1 — pre-existing type bugs exposed by strict `tsc -b`)
**Impact on plan:** All fixes necessary to meet task 2 done criteria. No scope creep. Patterns documented for future form components using z.preprocess schemas.

## Issues Encountered

- Font file warnings during production build (`geist-*.woff2`) — pre-existing, unrelated to this plan, not fixed (out of scope).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All Phase 2 requirements (INPUT-01 through INPUT-05, SCEN-01 through SCEN-05, UX-01, UX-02, UX-03) are green
- Phase 2 is complete — ready for Phase 3 (output display / Step 3)
- Production build is clean; app entry point renders full wizard

---
*Phase: 02-input-forms*
*Completed: 2026-03-12*

## Self-Check: PASSED

- FOUND: src/components/wizard/StepIndicator.tsx
- FOUND: src/components/wizard/WizardShell.tsx
- FOUND: src/App.tsx
- FOUND: .planning/phases/02-input-forms/02-04-SUMMARY.md
- FOUND commit: fcc2e1a (test RED phase)
- FOUND commit: 05011fe (feat GREEN phase)
- FOUND commit: adb72d7 (feat App.tsx + build fixes)
- Tests: 105 passed / 0 failed (full suite)
- Build: exits 0
- TypeScript: exits 0
