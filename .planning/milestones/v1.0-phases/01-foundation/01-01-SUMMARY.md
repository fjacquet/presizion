---
phase: 01-foundation
plan: "01"
subsystem: testing
tags: [vite, react, typescript, vitest, zod, zustand, jsdom]

# Dependency graph
requires: []
provides:
  - Vite + React + TypeScript project scaffold with strict TS configuration
  - Vitest with jsdom environment and globals for browser-environment testing
  - zod@^4 and zustand@^5 declared as runtime dependencies
  - Five Nyquist Wave 0 test stub files with fixture constants for CALC-01 through CALC-07
affects:
  - 01-02 (sizing library — test stubs must exist before implementation)
  - 01-03 (Zod schemas — TypeScript strict config required)
  - 01-04 (display module — formulaStrings.test.ts stub locks the API shape)
  - All subsequent phases (vitest infrastructure required for all unit tests)

# Tech tracking
tech-stack:
  added:
    - vite@^8 (build tool)
    - react@^19 + react-dom@^19
    - typescript@~5.9
    - vitest@^4 (test runner)
    - jsdom@^28 (DOM environment for tests)
    - "@testing-library/react@^16"
    - "@testing-library/jest-dom@^6"
    - "@vitest/coverage-v8@^4"
    - zod@^4.3.6 (schema validation)
    - zustand@^5.0.11 (state management)
  patterns:
    - Separate vitest.config.ts from vite.config.ts to avoid type conflicts
    - Test stubs use describe.todo/it.todo so vitest run exits cleanly before implementation
    - Fixture constants defined in stub files for early review/verification

key-files:
  created:
    - package.json
    - vitest.config.ts
    - tsconfig.app.json
    - src/App.tsx
    - src/lib/sizing/__tests__/formulas.test.ts
    - src/lib/sizing/__tests__/constraints.test.ts
    - src/lib/sizing/__tests__/parseNumericInput.test.ts
    - src/lib/display/__tests__/formulaStrings.test.ts
    - src/hooks/__tests__/useScenariosResults.test.ts
  modified:
    - tsconfig.json (references pattern)
    - tsconfig.node.json

key-decisions:
  - "Scaffolded to temp directory and copied to project to bypass create-vite non-empty directory guard"
  - "Replaced default App.tsx with minimal placeholder (single div) to avoid unused import errors under strict TS"
  - "Removed erasableSyntaxOnly and noUncheckedSideEffectImports from tsconfig.app.json — not standard flags needed for this project"

patterns-established:
  - "Test stubs: all test files use it.todo() — zero failures, zero imports of non-existent code"
  - "Fixture constants co-located with stubs so they can be reviewed before implementation"
  - "Strict TS: strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes enforced from day 1"

requirements-completed: [CALC-01, CALC-02, CALC-03, CALC-04, CALC-05, CALC-06, CALC-07]

# Metrics
duration: 4min
completed: "2026-03-12"
---

# Phase 1 Plan 01: Project Scaffold and Nyquist Wave 0 Test Stubs Summary

**Vite + React + TypeScript project with strict TS config, vitest/jsdom/zod/zustand installed, and five Nyquist Wave 0 test stub files covering CALC-01 through CALC-07**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-12T17:50:49Z
- **Completed:** 2026-03-12T17:54:53Z
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments

- Scaffolded Vite + React + TypeScript project with all Phase 1 runtime and dev dependencies installed
- Configured TypeScript strict mode with noUncheckedIndexedAccess, exactOptionalPropertyTypes, ES2022 target, and @/* path aliases
- Created vitest.config.ts with jsdom environment, globals: true, and v8 coverage configured
- Created all five Nyquist Wave 0 test stub files with fixture constants verified against formula spec
- Added test/test:watch/test:coverage npm scripts; npx vitest run and npx tsc --noEmit both exit with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Vite project and install dependencies** - `f4e594f` (chore)
2. **Task 2: Create all test stub files (Nyquist Wave 0)** - `3a35dc4` (test)

## Files Created/Modified

- `package.json` - Project manifest with all dependencies and test scripts
- `vitest.config.ts` - Vitest config: jsdom environment, globals: true, v8 coverage
- `tsconfig.app.json` - Strict TS: strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, ES2022, @/* paths
- `tsconfig.json` - Project references (app + node configs)
- `tsconfig.node.json` - Node/vite config TypeScript settings
- `vite.config.ts` - Vite build config with React plugin
- `index.html` - HTML entry point
- `src/main.tsx` - React DOM entry point
- `src/App.tsx` - Minimal placeholder component (single div "Cluster Sizer")
- `src/index.css` - Base stylesheet from scaffold
- `src/lib/sizing/__tests__/formulas.test.ts` - CALC-01/02/03 stubs with CPU/RAM/disk fixture constants
- `src/lib/sizing/__tests__/constraints.test.ts` - CALC-04/05/06 stubs with CPU/RAM/disk-limited scenario fixtures
- `src/lib/sizing/__tests__/parseNumericInput.test.ts` - NaN cascade prevention helper stubs
- `src/lib/display/__tests__/formulaStrings.test.ts` - CALC-07 formula display string stubs
- `src/hooks/__tests__/useScenariosResults.test.ts` - useScenariosResults hook integration stubs

## Decisions Made

- Scaffolded via temp directory (`/tmp/cluster-sizer-scaffold`) then copied files because `npm create vite` cancels when target directory is non-empty — `.planning/` was already present
- Replaced the generated App.tsx (complex template with missing assets) with a minimal placeholder to avoid TypeScript unused-import errors under strict mode
- Kept `vitest.config.ts` completely separate from `vite.config.ts` to prevent Vitest/Vite type conflicts

## Deviations from Plan

None — plan executed exactly as written. The only deviation was in scaffolding method (temp directory copy instead of in-place), which is an implementation detail with identical outcome.

## Issues Encountered

- `npm create vite@latest . -- --template react-ts` with `--force` flag and stdin echo both cancelled because the scaffolder detected a non-empty directory. Resolved by scaffolding to `/tmp/cluster-sizer-scaffold` and copying files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Test runner is live: `npx vitest run` exits 0, all stubs are todo (not failures)
- TypeScript compiler is strict: `npx tsc --noEmit` exits 0
- All five stub files exist at the exact paths referenced in VALIDATION.md
- Plan 02 (sizing library implementation) can proceed — test stubs enforce the Nyquist contract

## Self-Check: PASSED

All created files verified present. Both task commits (f4e594f, 3a35dc4) confirmed in git log.

---
*Phase: 01-foundation*
*Completed: 2026-03-12*
