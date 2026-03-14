---
phase: 07-enhanced-export-and-as-is-to-be-report
verified: 2026-03-13T10:00:00Z
status: human_needed
score: 6/6 must-haves verified
re_verification: false
human_verification:
  - test: "Open app at Step 3, press Ctrl+P / Cmd+P, inspect browser print preview"
    expected: "No buttons visible, no wizard header, no step indicator, no Back/Next nav; comparison table visible and fills page width without horizontal scroll"
    why_human: "JSDOM cannot simulate @media print rendering; CSS visibility of print:hidden elements is not testable in unit tests"
  - test: "In browser print preview, enable ink/color preview and inspect table cells with CPU/RAM utilization >= 70% or >= 90%"
    expected: "Green, amber, and red utilization cell colors are preserved exactly in print (not converted to greyscale)"
    why_human: "print-color-adjust: exact is verified to exist in CSS but its runtime effect on rendered colors requires a real browser print engine"
  - test: "Click 'Download JSON' in Step 3, open the downloaded cluster-sizing.json file in a text editor"
    expected: "File is valid JSON, pretty-printed with 2-space indentation; contains schemaVersion '1.1', generatedAt ISO timestamp, currentCluster object, and scenarios array with interleaved results; optional OldCluster fields absent from the form appear as null (not omitted)"
    why_human: "Unit tests verify buildJsonContent logic but actual browser file download trigger (Blob/URL.createObjectURL) is mocked in jsdom; end-to-end download integrity requires a real browser"
  - test: "Switch Step 1 to vCPU mode, verify 'Existing Server Count' field is visible without switching to SPECint mode"
    expected: "existingServerCount input field is present in the 'Existing Server Config (optional)' section regardless of sizing mode"
    why_human: "Unit test covers this (REPT-02), but UX-level confirmation that the field location and label are clear to end users requires human inspection"
---

# Phase 7: Enhanced Export and As-Is/To-Be Report Verification Report

**Phase Goal:** Users get a complete as-is/to-be comparison report — an "As-Is" reference column in Step 3, JSON download, and print/PDF layout — plus a cleaned-up Step 1 server config section.
**Verified:** 2026-03-13T10:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Clicking "Download JSON" in Step 3 triggers a file download containing all current cluster inputs, all scenario configurations, and all computed outputs in valid, pretty-printed JSON | VERIFIED | `handleDownloadJson` in Step3ReviewExport.tsx calls `buildJsonContent` then `downloadJson`; 4 export tests pass covering JSON structure, schemaVersion 1.1, null coercion, and Blob type |
| 2 | Downloaded JSON is self-contained and human-readable: field names match internal naming and all numeric values are present without truncation | VERIFIED | `buildJsonContent` uses `normaliseCluster()` to enumerate all OldCluster fields with `?? null`; `JSON.stringify(payload, null, 2)` produces pretty-printed output; test "sets undefined optional fields to null" passes |
| 3 | Invoking browser print from Step 3 renders a clean single-column layout: no buttons, no wizard chrome, no truncated table columns, and utilization color coding preserved in print | PARTIAL-VERIFIED | `print:hidden` class confirmed on: `<header>` (WizardShell L20), StepIndicator wrapper div (WizardShell L28), Back/Next nav (WizardShell L39), export buttons div (Step3ReviewExport L70); `print-color-adjust: exact` confirmed in `src/index.css` L268–269; `printCss.test.ts` passes; visual rendering requires human verification |
| 4 | Print layout fits standard A4/Letter paper width without horizontal scrolling or clipped content | PARTIAL-VERIFIED | `@media print { .overflow-x-auto { overflow: visible !important } }` in index.css L279–281; `#root { max-width: 100%; width: 100% }` in index.css L272–276; visual layout on A4/Letter paper requires human verification |
| 5 | Step 3 comparison table has an "As-Is" reference column showing: existing server count, sockets × cores/server, total pCores, and observed vCPU:pCore ratio | VERIFIED | ComparisonTable.tsx: "As-Is" `<TableHead>` at L60; server count `currentCluster.existingServerCount ?? '—'` at L73; Server Config `${socketsPerServer}s × ${coresPerSocket}c` at L88; Total pCores `currentCluster.totalPcores` at L102; vCPU:pCore ratio computed at L130; all 5 REPT-01 tests pass |
| 6 | Step 1 shows existingServerCount unconditionally; totalPcores is optional and auto-derived when count + sockets + cores/socket are all provided | VERIFIED | CurrentClusterForm.tsx: `existingServerCount` at L182 in "Existing Server Config" section (no sizingMode guard); `form.watch` subscription at L131–143 auto-derives totalPcores; all 4 REPT-02 tests pass |

**Score:** 6/6 truths verified (4 automated, 2 require human confirmation for visual rendering)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/utils/export.ts` | buildJsonContent() and downloadJson() functions | VERIFIED | Both exported functions present; normaliseCluster() helper handles null coercion; 179 lines, substantive implementation |
| `src/components/step3/Step3ReviewExport.tsx` | Download JSON button wired to downloadJson | VERIFIED | `handleDownloadJson` handler at L56–59; "Download JSON" Button at L77; `print:hidden` on containing div at L70 |
| `src/index.css` | @media print block with color-adjust, overflow reset, and chrome hide rules | VERIFIED | @media print block at L264–287 with `print-color-adjust: exact`, `#root` override, `.overflow-x-auto` reset, `table page-break-inside: avoid` |
| `src/components/wizard/WizardShell.tsx` | print:hidden on header, StepIndicator, Back/Next nav | VERIFIED | `print:hidden` on: header (L20), StepIndicator wrapper div (L28), nav div (L39) |
| `src/components/step3/ComparisonTable.tsx` | As-Is reference column reading useClusterStore | VERIFIED | `useClusterStore` imported at L10; `currentCluster` read at L52; As-Is column header at L60; 4 As-Is data rows implemented |
| `src/components/step1/CurrentClusterForm.tsx` | Unconditional existingServerCount + form.watch auto-derive for totalPcores | VERIFIED | `existingServerCount` field at L182, outside any mode guard; form.watch subscription at L131–143 with unsubscribe cleanup |
| `src/lib/utils/__tests__/export.test.ts` | EXPO-03 test coverage (6 tests) | VERIFIED | 6 tests in describe('buildJsonContent') and describe('downloadJson'); no it.todo remaining; all pass |
| `src/__tests__/printCss.test.ts` | EXPO-04 automatable check — print-color-adjust in index.css | VERIFIED | Single real test asserting `cssContent.toContain('print-color-adjust: exact')`; passes (was red at Wave 0) |
| `src/components/step3/__tests__/ComparisonTable.test.tsx` | REPT-01 test coverage (5 tests) | VERIFIED | 5 tests in describe('REPT-01: As-Is column in comparison table'); no it.todo remaining; all pass |
| `src/components/step1/__tests__/CurrentClusterForm.test.tsx` | REPT-02 test coverage (4 tests) | VERIFIED | 4 tests in describe('REPT-02: unconditional existingServerCount and totalPcores auto-derive'); no it.todo remaining; all pass |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `Step3ReviewExport.tsx` | `src/lib/utils/export.ts` | `import { buildJsonContent, downloadJson }` | WIRED | Import confirmed at L20; `handleDownloadJson` calls both at L57–58 |
| `src/index.css` | Browser print engine | `@media print { print-color-adjust: exact }` | WIRED | Pattern confirmed at L264–269 in index.css |
| `src/components/wizard/WizardShell.tsx` | Print CSS | `print:hidden` Tailwind v4 class on header, StepIndicator wrapper, nav | WIRED | 3 separate `print:hidden` occurrences confirmed at L20, L28, L39 |
| `ComparisonTable.tsx` | `useClusterStore` | `const currentCluster = useClusterStore((state) => state.currentCluster)` | WIRED | Import at L10; usage at L52; 4 rows reading `currentCluster` data |
| `CurrentClusterForm.tsx` | useClusterStore / OldCluster | `form.watch(callback)` subscription fires → `form.setValue('totalPcores', derived)` | WIRED | `form.watch` subscription confirmed at L131; auto-derive logic at L134–138 |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| EXPO-03 | 07-03 | User can download a JSON file containing all inputs and outputs for all scenarios | SATISFIED | `buildJsonContent` + `downloadJson` in export.ts; "Download JSON" button in Step3ReviewExport; 6 tests passing |
| EXPO-04 | 07-03 | App provides a print-optimized stylesheet; browser print / Save as PDF produces a clean layout | SATISFIED (automated) / HUMAN-NEEDED (visual) | `@media print` block in index.css; `print:hidden` on 4 chrome elements; `printCss.test.ts` passes; visual rendering requires human |
| REPT-01 | 07-02 | Step 3 comparison table includes "As-Is" reference column with server count, sockets×cores, pCores, vCPU:pCore ratio | SATISFIED | As-Is column in ComparisonTable.tsx with all 4 required data points; 5 REPT-01 tests passing |
| REPT-02 | 07-02 | existingServerCount unconditional in Step 1; totalPcores auto-derived when source fields provided | SATISFIED | existingServerCount at L182 outside mode guard; form.watch subscription at L131; 4 REPT-02 tests passing |

No orphaned requirements — all 4 requirement IDs declared in plans are present and accounted for in REQUIREMENTS.md (marked Complete).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

No TODO, FIXME, placeholder, empty return, or stub patterns found in the Phase 7 implementation files. All six export.test.ts it.todo stubs and all nine component it.todo stubs were replaced with real, passing tests.

### Human Verification Required

#### 1. Print Layout — No Chrome Visible

**Test:** Navigate the app to Step 3, then press Cmd+P (macOS) or Ctrl+P (Linux/Windows) to open the browser print preview.
**Expected:** The print preview shows only the comparison table. No visible header ("Cluster Refresh Sizing" title), no step indicator tabs, no "Back" button, no "Copy Summary / Download CSV / Download JSON" buttons.
**Why human:** JSDOM does not render @media print rules. The `print:hidden` class existence is verified in source, but whether the browser correctly applies `display: none` inside @media print cannot be confirmed without a real browser rendering engine.

#### 2. Print Layout — Utilization Color Preserved

**Test:** In the browser print preview from Step 3, enable color/ink preview in print settings. Inspect table cells for CPU Util %, RAM Util %, or Disk Util % rows where values would trigger amber (70–89%) or red (>=90%) coloring.
**Expected:** Green, amber, and red Tailwind color classes (`text-green-600`, `text-amber-600`, `text-red-600`) are rendered with their actual colors in print — not converted to greyscale or black.
**Why human:** `print-color-adjust: exact` is confirmed present in index.css, but its effect on Tailwind color classes at print time requires a real browser print engine with ink preview enabled.

#### 3. Print Layout — Table Fits A4/Letter Width

**Test:** In the browser print preview from Step 3 with multiple scenarios loaded, set paper size to A4 or Letter.
**Expected:** The comparison table renders without horizontal scrolling and without any columns being clipped or cut off at the page edge. Content fills the printable area width.
**Why human:** `overflow: visible !important` on `.overflow-x-auto` and `max-width: 100%` on `#root` are confirmed in CSS, but whether a wide table with multiple scenario columns fits within A4/Letter printable width depends on actual content width at runtime.

#### 4. JSON Download — End-to-End File Integrity

**Test:** With the app at Step 3 and at least one scenario configured, click the "Download JSON" button. Open the downloaded `cluster-sizing.json` file.
**Expected:** File is valid JSON. Contents include: `schemaVersion: "1.1"`, `generatedAt` ISO timestamp, `currentCluster` object where optional absent fields appear as `null` (not omitted), and `scenarios` array with at least one entry containing both scenario config and a nested `result` object.
**Why human:** `buildJsonContent` is unit-tested and the Download JSON button is wired, but the actual browser file download (Blob URL creation → anchor click → file write) is mocked in jsdom. End-to-end download integrity requires a real browser.

### Gaps Summary

No gaps. All 6 observable truths are verified at the code level. Two truths (print layout rendering and JSON download file integrity) additionally require human browser verification because their final delivery mechanism (browser print engine, browser file download) cannot be tested in the JSDOM unit test environment. These are inherent limitations of the testing environment, not missing implementations.

---

_Verified: 2026-03-13T10:00:00Z_
_Verifier: Claude (gsd-verifier)_
