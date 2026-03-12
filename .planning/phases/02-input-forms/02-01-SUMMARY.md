---
phase: 02-input-forms
plan: "01"
subsystem: ui
tags: [tailwindcss, shadcn, react-hook-form, postcss, vitest, typescript]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Zod schemas, Zustand stores, TypeScript types, sizing library — all the logic this UI sits on top of

provides:
  - Tailwind v4 via @tailwindcss/postcss (Vite 8 compatible — not @tailwindcss/vite)
  - shadcn/ui components: badge, button, card, form, input, label, separator, switch, tabs, tooltip
  - react-hook-form + @hookform/resolvers installed
  - @/* path alias resolving to ./src/* in both tsconfig.app.json and vite.config.ts
  - Nyquist Wave 0 test stubs for all 13 Phase 2 requirements (45 todo tests)
  - components.json at project root with aliases configured

affects: [02-02, 02-03, 02-04, all Wave 1 and Wave 2 plans in Phase 2]

# Tech tracking
tech-stack:
  added:
    - react-hook-form@7.71.2 (already in package.json from prior setup)
    - "@hookform/resolvers@5.2.2 (already installed)"
    - "tailwindcss@4.2.1 via @tailwindcss/postcss (NOT @tailwindcss/vite — Vite 8 incompatibility)"
    - tw-animate-css@1.4.0
    - postcss@8.5.8
    - "@types/node@24.12.0"
    - shadcn/ui components (copy-owned in src/components/ui/)
  patterns:
    - "Tailwind v4 CSS-first: @import 'tailwindcss' in index.css, no tailwind.config.js"
    - "PostCSS integration: css.postcss.plugins array in vite.config.ts, not Vite plugins array"
    - "Path alias @/* -> ./src/* in both tsconfig.app.json (paths) and vite.config.ts (resolve.alias)"
    - "Nyquist Wave 0: all phase requirements defined as it.todo() stubs before any component exists"
    - "shadcn components are copy-owned in src/components/ui/ — NOT imported from npm"

key-files:
  created:
    - src/components/ui/badge.tsx
    - src/components/ui/button.tsx
    - src/components/ui/card.tsx
    - src/components/ui/form.tsx
    - src/components/ui/input.tsx
    - src/components/ui/label.tsx
    - src/components/ui/separator.tsx
    - src/components/ui/switch.tsx
    - src/components/ui/tabs.tsx
    - src/components/ui/tooltip.tsx
    - src/components/step1/__tests__/CurrentClusterForm.test.tsx
    - src/components/step2/__tests__/ScenarioCard.test.tsx
    - src/components/wizard/__tests__/WizardShell.test.tsx
  modified:
    - src/schemas/currentClusterSchema.ts (Zod v4 API fix)
    - src/schemas/scenarioSchema.ts (Zod v4 API fix)
    - src/hooks/__tests__/useScenariosResults.test.ts (TypeScript noUncheckedIndexedAccess fix)

key-decisions:
  - "Use @tailwindcss/postcss not @tailwindcss/vite — Vite 8 peer dep incompatibility confirmed"
  - "Zod v4 breaking change: required_error renamed to error in z.number() options"
  - "Test stubs must import describe/it explicitly from vitest — tsconfig does not inject globals for tsc"
  - "All 13 Phase 2 requirements represented as it.todo() stubs before any component is written"

patterns-established:
  - "Wave 0 pattern: stubs first, implementations later — all requirements have test shapes before components exist"
  - "Vitest globals=true does not inject types for tsc; explicit import from vitest required in .tsx stub files"

requirements-completed: [INPUT-01, INPUT-02, INPUT-03, INPUT-04, INPUT-05, SCEN-01, SCEN-02, SCEN-03, SCEN-04, SCEN-05, UX-01, UX-02, UX-03]

# Metrics
duration: 4min
completed: 2026-03-12
---

# Phase 2 Plan 01: UI Stack Installation and Wave 0 Test Stubs Summary

**Tailwind v4 via PostCSS, shadcn/ui with 10 components, react-hook-form, and 45 Nyquist Wave 0 todo stubs covering all 13 Phase 2 requirements**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-12T19:36:00Z
- **Completed:** 2026-03-12T19:40:01Z
- **Tasks:** 2
- **Files modified:** 13 created, 3 modified

## Accomplishments

- UI dependency stack fully installed and verified (tailwindcss, @tailwindcss/postcss, tw-animate-css, react-hook-form, @hookform/resolvers, all shadcn components)
- Path alias @/* -> ./src/* configured in both tsconfig.app.json and vite.config.ts
- All 10 required shadcn components installed: badge, button, card, form, input, label, separator, switch, tabs, tooltip
- Three Nyquist Wave 0 test stub files created covering all 13 Phase 2 requirements (45 todo tests)
- npm run build exits 0 (TS + Vite), npm test exits 0 (58 passing + 45 todo)

## Task Commits

1. **Task 1: Install UI stack and configure path aliases** - `2bce558` (feat)
2. **Task 2: Create Nyquist Wave 0 test stubs** - `2423007` (test)
3. **Fix: Add vitest imports to stubs for tsc build** - `3f24b04` (fix)

## Files Created/Modified

- `src/components/ui/*.tsx` (10 files) — shadcn copy-owned components: badge, button, card, form, input, label, separator, switch, tabs, tooltip
- `src/components/step1/__tests__/CurrentClusterForm.test.tsx` — 16 todo stubs for INPUT-01, INPUT-02, INPUT-04, INPUT-05, UX-03
- `src/components/step2/__tests__/ScenarioCard.test.tsx` — 19 todo stubs for SCEN-01 through SCEN-05
- `src/components/wizard/__tests__/WizardShell.test.tsx` — 9 todo stubs for UX-01, UX-02
- `src/schemas/currentClusterSchema.ts` — Fixed Zod v4 API: required_error -> error
- `src/schemas/scenarioSchema.ts` — Fixed Zod v4 API: required_error -> error
- `src/hooks/__tests__/useScenariosResults.test.ts` — Fixed TypeScript noUncheckedIndexedAccess with ! assertions

## Decisions Made

- Used @tailwindcss/postcss instead of @tailwindcss/vite because @tailwindcss/vite declares peer deps vite: "^5.2.0 || ^6 || ^7" and does not support Vite 8
- Zod v4 (present in package.json as ^4.3.6) changed the error key from required_error to error in numeric schema params
- Stub files need explicit `import { describe, it } from 'vitest'` because tsc does not use vitest's globals injection

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Zod v4 API breaking change in schemas**
- **Found during:** Task 1 verification (npm run build)
- **Issue:** currentClusterSchema.ts and scenarioSchema.ts used `required_error` which was renamed to `error` in Zod v4 — causing TS2353 type errors blocking the build
- **Fix:** Renamed `required_error` to `error` in z.number() options in both schema files
- **Files modified:** src/schemas/currentClusterSchema.ts, src/schemas/scenarioSchema.ts
- **Verification:** npm run build exits 0 after fix
- **Committed in:** 2bce558 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed TypeScript noUncheckedIndexedAccess errors in test file**
- **Found during:** Task 1 verification (npm run build)
- **Issue:** useScenariosResults.test.ts accessed array elements with `result.current[0]` and `result.current[1]` — TypeScript strict mode with noUncheckedIndexedAccess flags these as possibly undefined
- **Fix:** Added `!` non-null assertion operator (`result.current[0]!`) at 6 locations in the test file
- **Files modified:** src/hooks/__tests__/useScenariosResults.test.ts
- **Verification:** npm run build exits 0, npm test still passes (58/58)
- **Committed in:** 2bce558 (Task 1 commit)

**3. [Rule 1 - Bug] Added explicit vitest imports to test stub files**
- **Found during:** Task 2 verification (npm run build)
- **Issue:** New .tsx stub files used `describe` and `it` without importing them — valid at runtime (vitest globals: true) but tsc does not see vitest's global injection, causing TS2582 errors
- **Fix:** Added `import { describe, it } from 'vitest'` to all three stub files
- **Files modified:** all three __tests__/*.test.tsx stub files
- **Verification:** npm run build exits 0 after fix
- **Committed in:** 3f24b04 (fix commit)

---

**Total deviations:** 3 auto-fixed (3 Rule 1 bugs — all pre-existing from Phase 1 that the build surface exposed)
**Impact on plan:** All auto-fixes were pre-existing Phase 1 bugs exposed when running the full build pipeline for the first time with new test files. No scope creep. All fixes necessary for correctness.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plans 02-02 (Step 1: CurrentClusterForm) and 02-03 (Step 2: ScenarioCard) can now proceed in parallel (Wave 1)
- All shadcn components importable from @/components/ui/* with no TypeScript errors
- Test stubs provide behavior contracts for all component implementations
- @/* path alias resolves correctly at both build-time and type-check-time

---
*Phase: 02-input-forms*
*Completed: 2026-03-12*
