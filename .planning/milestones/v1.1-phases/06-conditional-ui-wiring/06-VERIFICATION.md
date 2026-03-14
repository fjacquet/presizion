---
phase: 06-conditional-ui-wiring
verified: 2026-03-13T08:00:00Z
status: human_needed
score: 4/4 must-haves verified
re_verification: false
human_verification:
  - test: "Toggle visible on all 3 wizard steps"
    expected: "vCPU / SPECint toggle button group appears in the page header when the user is on Step 1, Step 2, and Step 3"
    why_human: "Visual/layout placement in WizardShell header cannot be confirmed by grep; requires browser or rendered DOM walk across all steps"
  - test: "Switching SPECint to vCPU hides fields but retains values on switch-back"
    expected: "After entering specintPerServer and targetSpecint values, switching to vCPU hides those inputs; switching back to SPECint reveals them with the previously entered values still populated"
    why_human: "State retention on conditional unmount/remount requires interactive browser test; react-hook-form defaultValues behavior on remount is not verified by existing automated tests"
---

# Phase 06: Conditional UI Wiring Verification Report

**Phase Goal:** Users can see and interact with the SPECint and utilization fields in the existing wizard steps, with results and the comparison table reflecting the active mode.
**Verified:** 2026-03-13T08:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A mode toggle (vCPU / SPECint) is visible and accessible in the wizard; selecting SPECint reveals SPECint fields in Step 1 and each scenario card, switching back hides them | VERIFIED | `SizingModeToggle.tsx` renders `role="group"` with two buttons; `WizardShell.tsx` line 25 renders `<SizingModeToggle />`; `CurrentClusterForm.tsx` lines 181-191 gate specint section on `sizingMode === 'specint'`; `ScenarioCard.tsx` lines 275-302 gate targetSpecint on `sizingMode === 'specint'` |
| 2 | SPECint score fields validate as positive numbers; user cannot advance past Step 1 while specintPerServer is empty/invalid when SPECint mode is active | VERIFIED | `handleNext` in `CurrentClusterForm.tsx` lines 130-141 triggers validation on `specintPerServer` and returns early if `!specintVal`; tests at lines 202-244 confirm block and allow behavior |
| 3 | ScenarioResults and comparison table display the "SPECint" limiting resource label with the correct server count when SPECint mode is active | VERIFIED | `ScenarioResults.tsx` lines 85-101 show conditional SPECint formula row using `specintFormulaString`; `ComparisonTable.tsx` lines 25-30 define `RESOURCE_LABELS` with `specint: 'SPECint'`; line 85 renders `RESOURCE_LABELS[result.limitingResource]`; ComparisonTable PERF-03 tests pass |
| 4 | CPU and RAM utilization % fields appear in Step 1; scenario server counts and formula display strings update live when values are entered | VERIFIED | `CurrentClusterForm.tsx` lines 171-178 render `cpuUtilizationPercent` and `ramUtilizationPercent` unconditionally; `useEffect` at lines 121-126 syncs valid form values to Zustand on every watch cycle; SC-4 tests at lines 247-274 confirm both fields always present |

**Score:** 4/4 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/wizard/SizingModeToggle.tsx` | vCPU / SPECint toggle in WizardShell header | VERIFIED | 37 lines; exports `SizingModeToggle`; reads `sizingMode` and `setSizingMode` from `useWizardStore` via selectors; renders `role="group"` with `aria-label="Sizing mode"` |
| `src/components/wizard/__tests__/SizingModeToggle.test.tsx` | Toggle behavior tests | VERIFIED | 4 passing tests covering aria-pressed state for both modes and click handler dispatch for both buttons |
| `src/components/wizard/WizardShell.tsx` | WizardShell with SizingModeToggle in header | VERIFIED | Imports `SizingModeToggle` line 6; renders `<SizingModeToggle />` line 25 inside `<header>` |
| `src/components/step1/CurrentClusterForm.tsx` | Conditional SPECint fields + unconditional utilization % fields + extended handleNext guard | VERIFIED | `sizingMode` selector at line 97; utilization section lines 171-179; SPECint section lines 181-191; handleNext guard lines 130-141 |
| `src/components/step2/ScenarioCard.tsx` | Conditional targetSpecint field when sizingMode is 'specint' | VERIFIED | `sizingMode` selector line 33; conditional Controller block lines 275-302 |
| `src/components/step2/ScenarioResults.tsx` | Conditional SPECint formula row when mode is specint and params present | VERIFIED | `sizingMode` selector line 24; conditional SPECint row lines 85-101 using `specintFormulaString` |
| `src/components/step3/ComparisonTable.tsx` | RESOURCE_LABELS lookup replacing capitalize() for limitingResource display | VERIFIED | `RESOURCE_LABELS` constant lines 25-30; `specint: 'SPECint'` (correct casing); applied at line 85; `capitalize()` removed |
| `src/components/step3/__tests__/ComparisonTable.test.tsx` | PERF-03 stub stubs filled with real tests | VERIFIED | Lines 129-148 contain two real tests (not it.todo) verifying 'SPECint' label and 'CPU-limited' label |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `WizardShell.tsx` | `SizingModeToggle.tsx` | import + render in header | WIRED | Line 6 imports `SizingModeToggle`; line 25 renders `<SizingModeToggle />` inside `<header>` |
| `SizingModeToggle.tsx` | `useWizardStore.ts` | `useWizardStore` selector | WIRED | Lines 10-11 use selector pattern: `useWizardStore((s) => s.sizingMode)` and `useWizardStore((s) => s.setSizingMode)` |
| `CurrentClusterForm.tsx` | `useWizardStore.ts` | `useWizardStore` selector for sizingMode | WIRED | Line 97: `const sizingMode = useWizardStore((s) => s.sizingMode)` |
| `ScenarioCard.tsx` | `useWizardStore.ts` | `useWizardStore` selector for sizingMode | WIRED | Line 33: `const sizingMode = useWizardStore((s) => s.sizingMode)` |
| `ScenarioResults.tsx` | `display.ts` | `specintFormulaString` import | WIRED | Line 6 imports `specintFormulaString`; used at line 93 inside conditional SPECint row |
| `ComparisonTable.tsx` | `results.ts` | `RESOURCE_LABELS Record<LimitingResource, string>` | WIRED | Line 18 imports `LimitingResource`; `RESOURCE_LABELS` defined lines 25-30; used at line 85 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PERF-02 | 06-01, 06-02 | In SPECint mode, Step 1 shows SPECint benchmark score field for existing server model | SATISFIED | `specintPerServer` and `existingServerCount` fields conditionally rendered in `CurrentClusterForm`; handleNext guard blocks advance when empty; 7 tests covering visibility, hiding, and navigation blocking/allowing |
| PERF-03 | 06-01, 06-02 | In SPECint mode, each scenario shows SPECint benchmark score field for target server model | SATISFIED | `targetSpecint` field conditionally rendered in `ScenarioCard`; `ComparisonTable` uses `RESOURCE_LABELS` with `specint: 'SPECint'`; SPECint formula row in `ScenarioResults`; 4 tests covering targetSpecint presence/absence and label correctness |

No orphaned requirements found — both PERF-02 and PERF-03 map exclusively to Phase 6 per REQUIREMENTS.md tracking table. PERF-04 and PERF-05 belong to Phase 5 (already complete).

---

### Anti-Patterns Found

No anti-patterns detected. Scan of all 6 modified files found:

- Zero TODO/FIXME/HACK/PLACEHOLDER comments
- Zero empty handler stubs (`() => {}`, `console.log`-only handlers)
- Zero `return null` stubs (the single `return null` in `ScenarioCard.tsx` is a legitimate guard for missing scenario)
- Zero `return {}` or `return []` API stubs

---

### Human Verification Required

#### 1. Toggle visible on all 3 wizard steps

**Test:** Open the app in a browser. Confirm the "vCPU / SPECint" toggle group appears in the page header. Navigate from Step 1 to Step 2 (enter valid cluster values and click Next), then to Step 3. Verify the toggle remains visible on each step.
**Expected:** The vCPU / SPECint toggle is visible in the header on all three wizard steps.
**Why human:** `SizingModeToggle` is imported and rendered in `WizardShell.tsx` which always renders the header, but confirming visual presence across step transitions requires a browser or rendered DOM assertion not covered by existing tests.

#### 2. Switching SPECint to vCPU hides fields but retains values on switch-back

**Test:** Select SPECint mode. In Step 1 enter a value for "SPECint/Server (existing)" (e.g. 1200). In Step 2 open a scenario card and enter a "Target SPECint/Server" value (e.g. 2400). Switch the toggle back to vCPU mode — verify those fields disappear. Switch back to SPECint mode — verify the previously entered values are still populated.
**Expected:** SPECint fields hide in vCPU mode; values are retained when switching back to SPECint mode (react-hook-form retains registered field values across conditional unmount/remount).
**Why human:** RHF field value retention on conditional unmount depends on the `keepValues` option or `unregister` behavior. The code does not explicitly set `shouldUnregister: false`, which is the default, so values should be retained — but this behavior is not covered by any automated test in the suite.

---

### Gaps Summary

No gaps found. All four observable truths are verified by code inspection and passing automated tests. The two human verification items cover interactive and visual behavior that cannot be confirmed programmatically.

---

_Verified: 2026-03-13T08:00:00Z_
_Verifier: Claude (gsd-verifier)_
