---
phase: 03-comparison-export-and-wizard-shell
verified: 2026-03-12T22:00:00Z
status: human_needed
score: 5/5 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "npm run build exits 0 (tsc -b + vite build)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Copy Summary clipboard output quality"
    expected: "Pasted text is readable in email or slide; correct cluster inputs, per-scenario assumptions, and all result metrics appear with sensible labels"
    why_human: "jsdom asserts writeText was called with a non-empty string but cannot validate text format or readability"
  - test: "Download CSV opens correctly in Excel/Numbers"
    expected: "One header row, one data row per scenario, all columns populated; file is valid RFC 4180"
    why_human: "jsdom cannot open a file picker or verify downloaded file integrity"
  - test: "Browser 'Leave site?' dialog"
    expected: "Navigating away (close tab, back button, address bar) while on Step 2 or Step 3 shows the browser's native beforeunload dialog"
    why_human: "jsdom does not show native browser dialogs; automated tests only verify listener registration"
  - test: "Full wizard round-trip"
    expected: "Step 1 data entered -> Next to Step 2 -> scenarios defined -> Next: Review & Export -> Step 3 shows comparison table -> Back returns to Step 2 with state preserved -> Step 3 results refresh after editing Step 2"
    why_human: "Multi-step state persistence through navigation requires interactive browser verification"
---

# Phase 3: Comparison, Export, and Wizard Shell Verification Report

**Phase Goal:** Users can review all scenario results side by side, export a plain-text summary to clipboard and a CSV file, and navigate the full 3-step wizard with guarded transitions
**Verified:** 2026-03-12T22:00:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (previous status: gaps_found, score 4/5)

---

## Re-Verification Summary

| Gap from Previous Verification | Resolved? |
|-------------------------------|-----------|
| `npm run build` exits non-zero (7 tsc -b errors in 4 files) | CLOSED — `npm run build` now exits 0; `tsc -b` and `vite build` both succeed |

**All automated checks now pass. Score moves from 4/5 to 5/5.**

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Step 3 comparison table shows all scenarios side by side with all required metrics | VERIFIED | ComparisonTable.tsx: 155 lines, 8 metric rows (Servers Required, Limiting Resource, vCPU:pCore Ratio, VMs/Server, Headroom, CPU Util, RAM Util, Disk Util); reads from useScenariosResults() and useScenariosStore(); 13 passing tests covering COMP-01, COMP-02, UX-04 |
| 2 | Clicking "Copy Summary" places plain-text block on clipboard suitable for email/slide | VERIFIED | clipboard.ts: buildSummaryText() produces multi-section report with cluster inputs + per-scenario assumptions + results; copyToClipboard() wraps navigator.clipboard.writeText; Step3ReviewExport wires button to handler; 8 unit tests + 4 integration tests pass |
| 3 | Clicking "Download CSV" triggers RFC 4180-compliant file download | VERIFIED | export.ts: csvEscape(), buildCsvContent() (header + one row per scenario, 20 columns), downloadCsv() (Blob URL anchor click + revoke); Step3ReviewExport wires button to handler; 9 unit tests + 3 integration tests pass |
| 4 | Wizard step indicator always visible; Step 2 Next button navigates to Step 3; back navigation works | VERIFIED | WizardShell.tsx: StepIndicator always rendered, currentStep === 3 renders Step3ReviewExport, Step 2 has "Next: Review & Export" button calling nextStep(), Back button calls prevStep() from steps 2 and 3; 8 new WizardShell tests pass |
| 5 | npm run build exits 0 (tsc -b + vite build) | VERIFIED | `npm run build` exits 0; `tsc -b` completes without errors; vite builds 2052 modules, output: dist/index.html + dist/assets/; all 4 previously-erroring files corrected — no `:JSX.Element` annotations remain, test file implicit-any and unchecked-index errors resolved |

**Score:** 5/5 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/step3/ComparisonTable.tsx` | Side-by-side comparison table with UX-04 color coding | VERIFIED | 155 lines, substantive; reads Zustand stores directly; exports utilizationClass(); 8 metric rows; shadcn Table primitives used; no `:JSX.Element` return type annotation |
| `src/components/step3/Step3ReviewExport.tsx` | Step 3 container with Copy Summary + Download CSV | VERIFIED | 57 lines, substantive; imports ComparisonTable, clipboard.ts, export.ts; renders both buttons; wired to Zustand stores; no `:JSX.Element` return type annotation |
| `src/lib/utils/clipboard.ts` | buildSummaryText() + copyToClipboard() | VERIFIED | 61 lines; buildSummaryText() produces multi-section report; copyToClipboard() wraps navigator.clipboard.writeText; no stubs |
| `src/lib/utils/export.ts` | csvEscape(), buildCsvContent(), downloadCsv() | VERIFIED | 109 lines; full RFC 4180 implementation; Blob URL download pattern with cleanup; no stubs |
| `src/hooks/useBeforeUnload.ts` | useBeforeUnload(enabled) hook with cleanup | VERIFIED | 21 lines; useEffect with enabled guard; addEventListener + cleanup via return function; handler calls e.preventDefault() and sets e.returnValue = '' |
| `src/components/wizard/WizardShell.tsx` | Step 2 Next, Step 3 routing, beforeunload wired | VERIFIED | 49 lines; imports Step3ReviewExport; calls useBeforeUnload(currentStep > 1); renders Step3ReviewExport at currentStep === 3; "Next: Review & Export" button on Step 2 calling nextStep() |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| WizardShell.tsx | Step3ReviewExport | `currentStep === 3` conditional render | WIRED | Line 31: `{currentStep === 3 && <Step3ReviewExport />}` |
| WizardShell.tsx | useBeforeUnload | `useBeforeUnload(currentStep > 1)` at line 14 | WIRED | Called with false on Step 1, true on Steps 2 and 3 |
| WizardShell.tsx | nextStep (Step 2 to Step 3) | Button onClick at lines 39-42 | WIRED | `<Button type="button" onClick={nextStep}>Next: Review & Export</Button>` on Step 2 only |
| Step3ReviewExport.tsx | ComparisonTable | Direct JSX render at line 54 | WIRED | `<ComparisonTable />` rendered in return |
| Step3ReviewExport.tsx | clipboard.ts | handleCopy -> buildSummaryText + copyToClipboard | WIRED | Lines 27-29; button onClick at line 46 |
| Step3ReviewExport.tsx | export.ts | handleDownloadCsv -> buildCsvContent + downloadCsv | WIRED | Lines 31-34; button onClick at line 49 |
| ComparisonTable.tsx | useScenariosResults | Direct hook call at line 43 | WIRED | `const results = useScenariosResults()` |
| ComparisonTable.tsx | useScenariosStore | Direct hook call at line 42 | WIRED | `const scenarios = useScenariosStore(...)` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| COMP-01 | 03-02 | Side-by-side comparison table for all scenarios | SATISFIED | ComparisonTable.tsx renders one column per scenario; 3 passing tests in COMP-01 describe block |
| COMP-02 | 03-02 | Table includes: name, server count, limiting resource, vCPU:pCore ratio, VMs/server, headroom %, CPU/RAM/disk util | SATISFIED | All 8 metrics rendered as row headers; 6 passing tests in COMP-02 describe block verify each metric |
| EXPO-01 | 03-02 | Copy plain-text summary to clipboard | SATISFIED | buildSummaryText() + copyToClipboard() in clipboard.ts; Copy Summary button in Step3ReviewExport; 12 passing tests (8 unit + 4 integration) |
| EXPO-02 | 03-02 | Download CSV with all input fields and output metrics | SATISFIED | buildCsvContent() + downloadCsv() in export.ts; Download CSV button in Step3ReviewExport; 12 passing tests (9 unit + 3 integration) |
| UX-04 | 03-02 | Color-coded utilization indicators (green/amber/red); bottleneck highlighted | SATISFIED | utilizationClass() in ComparisonTable.tsx maps pct to Tailwind classes; limiting resource cell has font-bold; 4 passing tests in UX-04 describe block |
| UX-05 | 03-03 | Warn user before navigating away with unsaved data | SATISFIED | useBeforeUnload hook adds/removes event listener; WizardShell calls useBeforeUnload(currentStep > 1); 5 hook unit tests + 3 WizardShell integration tests pass |

---

## Anti-Patterns Found

None. All previously-identified blockers have been resolved:

- `: JSX.Element` return type annotations removed from ComparisonTable.tsx and Step3ReviewExport.tsx
- Implicit-any destructuring in useBeforeUnload.test.ts corrected
- Unchecked index access in Step3ReviewExport.test.tsx guarded

---

## Command Results

| Command | Exit Code | Result |
|---------|-----------|--------|
| `npm test` (vitest run) | 0 | PASS (155) FAIL (0) |
| `npx tsc --noEmit` | 0 | No errors |
| `npm run build` (tsc -b + vite build) | 0 | 2052 modules transformed; dist artifacts generated |

---

## Human Verification Required

### 1. Copy Summary clipboard output quality

**Test:** Navigate the full wizard, enter real cluster data, define 2 scenarios, reach Step 3, click "Copy Summary", paste into an email or Google Slides text box.
**Expected:** Plain-text is readable; "CLUSTER REFRESH SIZING REPORT" header appears; current cluster vCPUs, pCores, VMs are present; each scenario section shows assumptions (sockets, cores, RAM, disk, ratio, headroom) and results (CPU/RAM/disk-limited counts, final count, limiting resource, utilization percentages).
**Why human:** jsdom asserts `navigator.clipboard.writeText` was called with a non-empty string but cannot validate the textual format, label wording, or pasting behavior.

### 2. Download CSV opens correctly in Excel / Numbers

**Test:** Click "Download CSV" in Step 3, open the downloaded `cluster-sizing.csv` file in Excel or Apple Numbers.
**Expected:** One header row (20 column names), one data row per defined scenario; all numeric fields populated with correct values; no broken quotes or encoding artifacts; file opens without import warnings.
**Why human:** jsdom verifies `URL.createObjectURL` was called with a Blob and `URL.revokeObjectURL` was called, but cannot open a file picker or inspect the actual downloaded file.

### 3. Browser "Leave site?" dialog on navigation away

**Test:** Enter data in Step 1, advance to Step 2 or Step 3, then close the browser tab or click the browser Back button.
**Expected:** The browser shows its native "Leave site? Changes you made may not be saved." dialog before unloading the page.
**Why human:** jsdom does not render native browser dialogs; automated tests only verify that `window.addEventListener('beforeunload', ...)` was called with a handler that calls `e.preventDefault()` and sets `e.returnValue = ''`.

### 4. Full wizard round-trip with state persistence

**Test:** Enter current cluster data -> Next to Step 2 -> define 2+ scenarios -> "Next: Review & Export" -> verify Step 3 table shows all scenarios -> click Back to Step 2 -> modify a scenario value -> go to Step 3 -> verify Step 3 results immediately reflect the change.
**Expected:** All inputs are preserved when navigating back; Step 3 outputs refresh automatically when upstream data changes; StepIndicator always shows current step highlighted.
**Why human:** Multi-step Zustand state persistence through navigation and reactive re-computation requires interactive browser verification to confirm end-to-end behavior.

---

_Verified: 2026-03-12T22:00:00Z_
_Verifier: Claude (gsd-verifier)_
