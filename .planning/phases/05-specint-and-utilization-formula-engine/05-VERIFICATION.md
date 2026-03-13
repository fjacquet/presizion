---
phase: 05-specint-and-utilization-formula-engine
verified: 2026-03-13T07:10:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
gaps: []
human_verification: []
---

# Phase 5: SPECint and Utilization Formula Engine — Verification Report

**Phase Goal:** Implement the SPECint-based sizing mode and utilization percentage right-sizing at the formula layer — pure functions only, no UI changes. The formula engine must be complete, tested, and production-build-clean before Phase 6 wires it into the UI.
**Verified:** 2026-03-13T07:10:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | OldCluster interface has 4 new readonly optional fields: `existingServerCount`, `specintPerServer`, `cpuUtilizationPercent`, `ramUtilizationPercent` | VERIFIED | `src/types/cluster.ts` lines 13–16, all fields present with JSDoc |
| 2 | Scenario interface has readonly optional field `targetSpecint` | VERIFIED | `src/types/cluster.ts` line 35, `readonly targetSpecint?: number` |
| 3 | LimitingResource type union is `'cpu' \| 'ram' \| 'disk' \| 'specint'` (4-way) | VERIFIED | `src/types/results.ts` line 5 |
| 4 | `useWizardStore` has `sizingMode` defaulting to `'vcpu'` and `setSizingMode` action | VERIFIED | `src/store/useWizardStore.ts` lines 18, 31, 47; `SizingMode` exported type |
| 5 | `serverCountBySpecint(10, 1200, 1.20, 2400)` returns 6; utilization params added to `serverCountByCpu`/`serverCountByRam` | VERIFIED | `src/lib/sizing/formulas.ts` — all 4 functions exist with correct signatures; 11 formula tests passing |
| 6 | `computeScenarioResult` accepts optional `sizingMode` param; returns `limitingResource='specint'` in specint mode | VERIFIED | `src/lib/sizing/constraints.ts` lines 47–145; 11 constraint tests passing (SPECint + utilization modes) |
| 7 | `useScenariosResults` reads `sizingMode` from `useWizardStore` and passes it to `computeScenarioResult` | VERIFIED | `src/hooks/useScenariosResults.ts` line 23–26; `sizingMode` selector and 3rd arg confirmed |
| 8 | Full test suite green (205 pass, 0 fail), zero pending `it.todo` stubs, production build clean | VERIFIED | `rtk vitest run` → `PASS (205) FAIL (0)`; `npm run build` → `tsc -b && vite build` exits 0 |

**Score: 8/8 truths verified**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types/cluster.ts` | OldCluster + Scenario with Phase 5 optional fields | VERIFIED | All 5 new fields present (`existingServerCount`, `specintPerServer`, `cpuUtilizationPercent`, `ramUtilizationPercent`, `targetSpecint`) |
| `src/types/results.ts` | LimitingResource union extended with `'specint'` | VERIFIED | `'cpu' \| 'ram' \| 'disk' \| 'specint'` at line 5 |
| `src/schemas/currentClusterSchema.ts` | Schema with `cpuUtilizationPercent`, `ramUtilizationPercent`, `existingServerCount`, `specintPerServer` | VERIFIED | All 4 fields present; `optionalPercent` (0–100) and `optionalPositiveNumber` validators defined |
| `src/schemas/scenarioSchema.ts` | Schema with optional `targetSpecint` field | VERIFIED | `targetSpecint: optionalPositiveNumber` at line 62 |
| `src/store/useWizardStore.ts` | `sizingMode` state and `setSizingMode` action; `SizingMode` type exported | VERIFIED | All present; default is `'vcpu'` |
| `src/lib/sizing/formulas.ts` | `serverCountBySpecint` + `cpuUtilPct`/`ramUtilPct` optional params | VERIFIED | All 4 functions exported; `serverCountBySpecint` with zero-guard; default params = 100 for backward-compat |
| `src/lib/sizing/constraints.ts` | `computeScenarioResult` with `sizingMode` param and SPECint branch | VERIFIED | Optional 3rd param `sizingMode='vcpu'`; SPECint branch at lines 60–64; `determineLimitingResource` returns `'specint'` correctly |
| `src/lib/sizing/display.ts` | `specintFormulaString` + utilization-aware `cpuFormulaString` | VERIFIED | `SpecintFormulaParams` interface and `specintFormulaString` exported; `cpuUtilizationPercent` optional on `CpuFormulaParams` |
| `src/lib/display/formulaStrings.ts` | `getSpecintFormulaString` + utilization-aware `getCpuFormulaString` | VERIFIED | Both exported; `getSpecintFormulaString` calls `serverCountBySpecint`; `getCpuFormulaString` shows utilization factor when not 100 |
| `src/hooks/useScenariosResults.ts` | Hook reads `sizingMode` from `useWizardStore`, passes to `computeScenarioResult` | VERIFIED | Lines 23–26: selector + 3rd arg confirmed |
| `src/store/__tests__/useWizardStore.test.ts` | Passing tests for `sizingMode` default and `setSizingMode` | VERIFIED | 3 real assertions (no `it.todo`); all passing |
| `src/store/__tests__/useScenariosResults.test.ts` | Passing integration tests for SPECint mode through formula engine | VERIFIED | 3 real assertions testing `computeScenarioResult` directly |
| `src/schemas/__tests__/schemas.test.ts` | Passing tests for UTIL-01/02 and PERF-01 fields | VERIFIED | 13 new test cases covering range validation, optional fields, rejection cases |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/types/cluster.ts` | `src/schemas/currentClusterSchema.ts` | `CurrentClusterInput = z.infer<typeof currentClusterSchema>` | WIRED | `existingServerCount`, `specintPerServer`, `cpuUtilizationPercent`, `ramUtilizationPercent` present in both |
| `src/types/results.ts` | `src/lib/sizing/constraints.ts` | `LimitingResource` return type | WIRED | `constraints.ts` imports `LimitingResource`; `'specint'` returned at line 25 |
| `src/lib/sizing/constraints.ts` | `src/lib/sizing/formulas.ts` | `import serverCountBySpecint` | WIRED | Line 3: explicit named import; called at line 64 with live cluster data |
| `src/lib/display/formulaStrings.ts` | `src/lib/sizing/formulas.ts` | `import serverCountBySpecint` | WIRED | Lines 14–19: named import; used at line 132 in `getSpecintFormulaString` |
| `src/hooks/useScenariosResults.ts` | `src/store/useWizardStore.ts` | `useWizardStore` selector for `sizingMode` | WIRED | Line 23: `const sizingMode = useWizardStore((state) => state.sizingMode)` |
| `src/hooks/useScenariosResults.ts` | `src/lib/sizing/constraints.ts` | `computeScenarioResult(cluster, scenario, sizingMode)` | WIRED | Line 26: `sizingMode` passed as 3rd argument |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PERF-01 | 05-01, 05-03 | User can select global sizing mode: vCPU-based or SPECint-based | SATISFIED | `SizingMode` type + `sizingMode`/`setSizingMode` in `useWizardStore`; 3 store tests passing |
| PERF-04 | 05-02, 05-03 | SPECint CPU constraint formula: `ceil(existingServers × oldSPECint × headroom / targetSPECint)` | SATISFIED | `serverCountBySpecint` in `formulas.ts`; SPECint branch in `computeScenarioResult`; verified by test `serverCountBySpecint(10,1200,1.20,2400)===6` |
| PERF-05 | 05-02, 05-03 | Limiting resource label shows "SPECint" when SPECint mode drives count | SATISFIED | `determineLimitingResource` returns `'specint'` when `sizingMode==='specint'`; `RESOURCE_LABELS.specint='SPECint-limited'` in `ScenarioResults.tsx`; test confirms `limitingResource==='specint'` |
| UTIL-01 | 05-01, 05-03 | User can enter CPU utilization % (0–100) in Step 1 | SATISFIED | `cpuUtilizationPercent: optionalPercent` in `currentClusterSchema`; schema tests reject -5 and 110; tooltip entry in `CurrentClusterForm.tsx` |
| UTIL-02 | 05-01, 05-03 | User can enter RAM utilization % (0–100) in Step 1 | SATISFIED | `ramUtilizationPercent: optionalPercent` in `currentClusterSchema`; schema tests reject 110; tooltip entry in `CurrentClusterForm.tsx` |
| UTIL-03 | 05-02, 05-03 | Utilization % multiplies effective demand in CPU/RAM formulas | SATISFIED | `serverCountByCpu(1000,1.20,4,40,60)===5`; `serverCountByRam(500,16,1.20,512,80)===15`; both pass in full test suite |

**Orphaned Requirements:** None. All 6 requirements mapped to Phase 5 plans are accounted for.

**PERF-03 note:** `PERF-03` (SPECint field display per scenario) is tagged Phase 6 in `REQUIREMENTS.md` and correctly not claimed by any Phase 5 plan. The `scenarioSchema — targetSpecint (PERF-03)` describe block in `schemas.test.ts` tests the *schema contract* for `targetSpecint`, which is legitimate Phase 5 groundwork for PERF-03's Phase 6 UI implementation. No gap here.

---

### Anti-Patterns Found

No anti-patterns detected in phase 5 production files:
- Zero `TODO`/`FIXME`/`PLACEHOLDER` comments in formula, constraint, display, or hook files
- No stub return values (`return null`, `return {}`, `return []`) in implementation functions
- No `it.todo` or `it.skip` remaining in any test file — all stubs converted to real passing assertions
- Zero TypeScript errors (`tsc -b` passes cleanly)

---

### Human Verification Required

None. All Phase 5 deliverables are pure functions and unit-testable logic. The phase explicitly excludes UI changes — there is nothing requiring visual or behavioral human verification at this stage.

---

### Summary

Phase 5 goal is **fully achieved**. The formula engine is complete, tested, and production-build-clean:

1. **Type contracts** — OldCluster, Scenario, LimitingResource, SizingMode all extended with required fields/values
2. **Schema validation** — `cpuUtilizationPercent`/`ramUtilizationPercent` bounded to [0,100]; `targetSpecint` positive-only; all optional fields correctly absent-by-default
3. **Formula functions** — `serverCountBySpecint` with zero-guard; `serverCountByCpu`/`serverCountByRam` with backward-compatible utilization params (default=100)
4. **Constraint engine** — `computeScenarioResult` branches on `sizingMode`; `determineLimitingResource` returns `'specint'` correctly; utilization scaling propagated
5. **Display strings** — `specintFormulaString` and `getSpecintFormulaString` produce correct output; `getCpuFormulaString` shows utilization factor when not 100
6. **Integration seam** — `useScenariosResults` reads `sizingMode` from store and passes to formula engine — the critical end-to-end wire
7. **Test coverage** — 205 tests, 0 failures, zero pending stubs; TDD red-green cycles documented in commits
8. **Build clean** — `tsc -b && vite build` exits 0; exhaustive `Record<LimitingResource>` sites updated to include `'specint'`

Phase 6 (SPECint UI wiring) has all prerequisites in place.

---

_Verified: 2026-03-13T07:10:00Z_
_Verifier: Claude (gsd-verifier)_
