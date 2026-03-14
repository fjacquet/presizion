---
phase: 03-comparison-export-and-wizard-shell
type: nyquist-validation-spec
created: 2026-03-12
requirements: [COMP-01, COMP-02, EXPO-01, EXPO-02, UX-04, UX-05]
---

# Phase 3 Nyquist Validation Spec

Maps each requirement to the test file, describe block, and test name pattern that verifies it. Every requirement must have at least one automated test that fails before implementation and passes after.

---

## COMP-01: Side-by-side comparison table

**What must be true:** App displays a side-by-side comparison table for all defined scenarios.

| Field | Value |
|-------|-------|
| Test file | `src/components/step3/__tests__/ComparisonTable.test.tsx` |
| Describe block | `ComparisonTable > COMP-01: side-by-side comparison display` |
| Test name patterns | `renders a table with one column per scenario`, `renders metric labels as row headers`, `renders scenario names as column headers` |
| Verification command | `rtk vitest run src/components/step3/__tests__/ComparisonTable.test.tsx` |
| Automated | Yes |

---

## COMP-02: Required fields in comparison table

**What must be true:** Comparison table includes scenario name, final server count, limiting resource, vCPU:pCore ratio, VMs/server, headroom %, estimated CPU/RAM/disk utilization.

| Field | Value |
|-------|-------|
| Test file | `src/components/step3/__tests__/ComparisonTable.test.tsx` |
| Describe block | `ComparisonTable > COMP-02: correct values in table cells` |
| Test name patterns | `displays final server count for each scenario`, `displays limiting resource label`, `displays achieved vCPU:pCore ratio`, `displays VMs per server`, `displays headroom percent`, `displays CPU, RAM, and disk utilization percentages` |
| Verification command | `rtk vitest run src/components/step3/__tests__/ComparisonTable.test.tsx` |
| Automated | Yes |

---

## EXPO-01: Copy plain-text summary to clipboard

**What must be true:** User can copy a plain-text summary to clipboard — includes current cluster inputs, key assumptions, and results per scenario; suitable for pasting into email or slides.

Two-layer verification: unit tests for the pure function, integration test for the button click.

### Layer 1 — Utility unit tests

| Field | Value |
|-------|-------|
| Test file | `src/lib/utils/__tests__/clipboard.test.ts` |
| Describe block | `buildSummaryText` |
| Test name patterns | `returns a non-empty string`, `includes total vCPUs`, `includes total VMs`, `includes scenario name`, `includes final server count`, `includes limiting resource` |
| Verification command | `rtk vitest run src/lib/utils/__tests__/clipboard.test.ts` |
| Automated | Yes |

### Layer 2 — Component integration tests

| Field | Value |
|-------|-------|
| Test file | `src/components/step3/__tests__/Step3ReviewExport.test.tsx` |
| Describe block | `Step3ReviewExport > EXPO-01: copy plain-text summary to clipboard` |
| Test name patterns | `renders a "Copy Summary" button`, `calls navigator.clipboard.writeText with non-empty string when Copy Summary clicked` |
| Verification command | `rtk vitest run src/components/step3/__tests__/Step3ReviewExport.test.tsx` |
| Automated | Yes (clipboard.writeText mocked via Object.assign) |

### Manual verification note

The exact text format of the clipboard output (whitespace, label wording) is validated by human review of a pasted sample. The automated test only asserts writeText was called with a non-empty string.

---

## EXPO-02: Download CSV file

**What must be true:** User can download a CSV file containing all input fields and output metrics for all scenarios.

Two-layer verification: unit tests for the pure function, integration test for the button click.

### Layer 1 — Utility unit tests

| Field | Value |
|-------|-------|
| Test file | `src/lib/utils/__tests__/export.test.ts` |
| Describe block | `buildCsvContent` and `downloadCsv` |
| Test name patterns | `returns a string starting with a header row`, `includes one data row per scenario`, `includes scenario name in each row`, `includes final server count`, `includes limiting resource`, `escapes fields containing commas`, `escapes fields containing double-quotes`, `calls URL.createObjectURL with a Blob`, `calls URL.revokeObjectURL` |
| Verification command | `rtk vitest run src/lib/utils/__tests__/export.test.ts` |
| Automated | Yes (URL.createObjectURL stubbed via vi.stubGlobal) |

### Layer 2 — Component integration tests

| Field | Value |
|-------|-------|
| Test file | `src/components/step3/__tests__/Step3ReviewExport.test.tsx` |
| Describe block | `Step3ReviewExport > EXPO-02: download CSV file` |
| Test name patterns | `renders a "Download CSV" button`, `calls URL.createObjectURL with a Blob when Download CSV clicked`, `triggers anchor download on Download CSV click` |
| Verification command | `rtk vitest run src/components/step3/__tests__/Step3ReviewExport.test.tsx` |
| Automated | Yes |

### Manual verification note

The actual file download and that it opens correctly in Excel/Numbers is validated by human review. jsdom cannot open file picker or verify downloaded file contents.

---

## UX-04: Color-coded utilization indicators

**What must be true:** App provides color-coded visual indicators (green/amber/red) for utilization levels and highlights the bottleneck resource per scenario.

| Field | Value |
|-------|-------|
| Test file | `src/components/step3/__tests__/ComparisonTable.test.tsx` |
| Describe block | `ComparisonTable > UX-04: color-coded utilization indicators` |
| Test name patterns | `applies green class when utilization < 70%`, `applies amber class when utilization >= 70% and < 90%`, `applies red class when utilization >= 90%`, `highlights the limiting resource cell` |
| Verification command | `rtk vitest run src/components/step3/__tests__/ComparisonTable.test.tsx` |
| Automated | Yes — assert className matches /text-green/, /text-amber/, /text-red/ |

Color thresholds (from research, locked):

| Range | Class |
|-------|-------|
| `pct < 70` | `text-green-600` |
| `70 <= pct < 90` | `text-amber-600` |
| `pct >= 90` | `text-red-600 font-semibold` |

---

## UX-05: Warn before navigating away

**What must be true:** App warns user before navigating away from the page with unsaved data (beforeunload event).

Two-layer verification: hook unit tests, WizardShell integration tests.

### Layer 1 — Hook unit tests

| Field | Value |
|-------|-------|
| Test file | `src/hooks/__tests__/useBeforeUnload.test.ts` |
| Describe block | `useBeforeUnload > UX-05: warn before navigating away with unsaved data` |
| Test name patterns | `adds a beforeunload event listener when enabled is true`, `does NOT add a beforeunload listener when enabled is false`, `removes the beforeunload listener on unmount`, `calls event.preventDefault() inside the handler`, `sets event.returnValue to empty string inside the handler` |
| Verification command | `rtk vitest run src/hooks/__tests__/useBeforeUnload.test.ts` |
| Automated | Yes — vi.spyOn(window, 'addEventListener') |

### Layer 2 — WizardShell integration tests

| Field | Value |
|-------|-------|
| Test file | `src/components/wizard/__tests__/WizardShell.test.tsx` |
| Describe block | `WizardShell > UX-05: beforeunload guard` |
| Test name patterns | `calls useBeforeUnload with false when on Step 1`, `calls useBeforeUnload with true when on Step 2`, `calls useBeforeUnload with true when on Step 3` |
| Verification command | `rtk vitest run src/components/wizard/__tests__/WizardShell.test.tsx` |
| Automated | Yes — vi.mock('@/hooks/useBeforeUnload') + expect(useBeforeUnload).toHaveBeenCalledWith(bool) |

### Manual verification note

jsdom does not show browser dialogs. The automated tests verify listener registration and handler logic. Manual verification: navigate away from the app mid-session in a real browser and confirm the "Leave site?" dialog appears.

---

## Phase-Level Full Suite Verification

After all Phase 3 plans complete (03-01 + 03-02 + 03-03), run:

```bash
# 1. Scoped: all Phase 3 test files
cd /Users/fjacquet/Projects/cluster-sizer
rtk vitest run src/components/step3 src/lib/utils/__tests__ src/hooks/__tests__/useBeforeUnload.test.ts src/components/wizard/__tests__/WizardShell.test.tsx

# 2. Full test suite (must not regress Phase 1/2 tests)
npm test

# 3. TypeScript strict mode
npx tsc --noEmit

# 4. Production build
npm run build
```

All four commands must exit 0.

---

## Requirement-to-Plan Traceability

| Requirement | Verified By | Plan(s) |
|-------------|-------------|---------|
| COMP-01 | ComparisonTable.test.tsx > COMP-01 describe | 03-01 (stubs), 03-02 (impl) |
| COMP-02 | ComparisonTable.test.tsx > COMP-02 describe | 03-01 (stubs), 03-02 (impl) |
| EXPO-01 | clipboard.test.ts + Step3ReviewExport.test.tsx | 03-01 (stubs), 03-02 (impl) |
| EXPO-02 | export.test.ts + Step3ReviewExport.test.tsx | 03-01 (stubs), 03-02 (impl) |
| UX-04 | ComparisonTable.test.tsx > UX-04 describe | 03-01 (stubs), 03-02 (impl) |
| UX-05 | useBeforeUnload.test.ts + WizardShell.test.tsx | 03-01 (stubs), 03-03 (impl) |

---

*Validation spec created: 2026-03-12*
*Phase 3 requirements: COMP-01, COMP-02, EXPO-01, EXPO-02, UX-04, UX-05*
