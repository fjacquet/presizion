# Deferred Items — Phase 01-foundation

## Pre-existing Issues (Out of Scope)

### schemas test stub fails with missing implementation
- **Discovered during:** Plan 04 (01-04)
- **File:** `src/schemas/__tests__/schemas.test.ts`
- **Issue:** Test file imports `../currentClusterSchema` and `../scenarioSchema` which do not exist yet. The `src/schemas/` directory has only the test stub — no implementation files.
- **Status:** Pre-existing issue; `src/schemas/` is untracked in git. The directory and test were likely created as a stub for a future plan (01-03 or later).
- **Impact:** Vitest exits with code 1 even though all 34 individual tests pass. The failing entry is the test suite compilation, not any test assertion.
- **Resolution:** Will be fixed when the plan implementing Zod schemas is executed.
