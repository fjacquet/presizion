# How to Extend Presizion

This guide covers the four main extension points in the Presizion codebase: sizing modes, import formats, export formats, and layout modes.

---

## 1. Adding a New Sizing Mode

Sizing modes control which CPU/performance formula drives the CALC-01 server count. The existing modes are `vcpu`, `specint`, `aggressive`, and `ghz`.

### Files to Modify

| File | Change |
|---|---|
| `src/store/useWizardStore.ts` | Add the new mode to the `SizingMode` union type |
| `src/lib/sizing/constraints.ts` | Add the new mode to the `SizingMode` type alias and the `determineLimitingResource` function |
| `src/lib/sizing/formulas.ts` | Add a new `serverCountByXxx` pure function |
| `src/lib/sizing/constraints.ts` | Add an `else if (sizingMode === 'xxx')` branch in `computeScenarioResult` |
| `src/components/wizard/SizingModeToggle.tsx` | Add a `ModeBtn` for the new mode |
| `src/types/cluster.ts` | Add any new fields to `OldCluster` or `Scenario` interfaces |
| `src/schemas/currentClusterSchema.ts` | Add Zod validation for new cluster input fields |
| `src/schemas/scenarioSchema.ts` | Add Zod validation for new scenario fields |

### Step-by-Step

1. **Define the formula** in `src/lib/sizing/formulas.ts`:
   - Write a pure function that takes numeric inputs and returns `Math.ceil(...)`.
   - Accept `growthHeadroomFactor` (already computed as `1 + headroomPercent / 100`).
   - Add zero-guard returns for division-by-zero inputs.
   - Document the formula in JSDoc with the requirement ID.

2. **Register the mode** in `src/lib/sizing/constraints.ts`:
   - Add the mode string to the `SizingMode` type union.
   - Add an `else if` branch in `computeScenarioResult` that calls the new formula.
   - Update `determineLimitingResource` to return the correct `LimitingResource` label.

3. **Update the store type** in `src/store/useWizardStore.ts`:
   - Add the new mode string to the `SizingMode` type union (must match the one in `constraints.ts`).

4. **Add the UI toggle** in `src/components/wizard/SizingModeToggle.tsx`:
   - Add a `ModeBtn` in the sizing mode row.
   - If the mode requires prerequisite data (like `aggressive` requires CPU utilization), wrap in a `Tooltip` and add a `disabled` guard.

5. **Add types** to `src/types/cluster.ts` if the mode needs new fields on `OldCluster` or `Scenario`.

6. **Add schema validation** in `src/schemas/currentClusterSchema.ts` and/or `src/schemas/scenarioSchema.ts` for any new fields.

7. **Write tests**:
   - Unit test the formula in `src/lib/sizing/__tests__/formulas.test.ts`.
   - Integration test through `computeScenarioResult` in `src/lib/sizing/__tests__/constraints.test.ts`.
   - Component test for conditional field visibility in `src/components/step1/__tests__/CurrentClusterForm.test.tsx`.
   - Toggle test in `src/components/wizard/__tests__/SizingModeToggle.test.tsx`.

### Checklist

- [ ] Pure formula function in `formulas.ts` with JSDoc and zero-guards
- [ ] `SizingMode` type updated in both `constraints.ts` and `useWizardStore.ts`
- [ ] `computeScenarioResult` branch added
- [ ] `determineLimitingResource` updated
- [ ] `ModeBtn` added to `SizingModeToggle.tsx`
- [ ] New cluster/scenario types and Zod schemas if needed
- [ ] Formula unit tests with named fixtures
- [ ] Constraint integration tests
- [ ] Component tests for conditional rendering

---

## 2. Adding a New Import Format

Import formats are file parsers that extract cluster metrics from third-party tools (e.g., RVTools, LiveOptics). The import pipeline is in `src/lib/utils/import/`.

### Architecture

The import flow is:

1. `importFile(file)` in `src/lib/utils/import/index.ts` -- entry point
2. File validation and magic byte checking (`fileValidation.ts`)
3. Format detection (`formatDetector.ts`) -- determines which parser to use
4. Parser execution -- returns a `ClusterImportResult`

### Files to Modify

| File | Change |
|---|---|
| `src/lib/utils/import/index.ts` | Add `sourceFormat` value to `ClusterImportResult` union; wire parser in `importFile` |
| `src/lib/utils/import/formatDetector.ts` | Add detection logic for the new format |
| `src/lib/utils/import/myParser.ts` | New file: the parser itself |
| `src/lib/utils/import/columnResolver.ts` | Add column alias mappings if the format uses non-standard column names |

### Step-by-Step

1. **Create the parser** as a new file (e.g., `src/lib/utils/import/myToolParser.ts`):
   - Export an async function: `parseMyTool(buffer: ArrayBuffer): Promise<Omit<ClusterImportResult, 'sourceFormat'>>`.
   - Use `@e965/xlsx` for XLSX files or `TextDecoder` for CSV.
   - Use `columnResolver.ts` to resolve column name aliases.
   - Aggregate: `totalVcpus`, `totalVms`, `totalDiskGb`, `avgRamPerVmGb`, `vmCount`, `warnings`.
   - Optionally extract: `totalPcores`, `existingServerCount`, `socketsPerServer`, `coresPerSocket`, `cpuModel`, `cpuFrequencyGhz`.
   - Implement scope detection (`detectedScopes`, `scopeLabels`, `rawByScope`) if the format contains cluster/datacenter columns.

2. **Add format detection** in `formatDetector.ts`:
   - The detector examines sheet names (for XLSX), file extensions, or header rows (for CSV) to identify the format.

3. **Register the parser** in `importFile()` inside `index.ts`:
   - Add the new format string to the `sourceFormat` type in `ClusterImportResult`.
   - Add a branch in `importFile` to call the parser when the format is detected.

4. **Add column aliases** in `columnResolver.ts` if the format uses different column names for the same data (e.g., `Num CPUs` vs `CPUs` vs `Virtual CPU`).

5. **Write tests** in `src/lib/utils/import/__tests__/myToolParser.test.ts`:
   - Mock `@e965/xlsx` with `vi.mock`.
   - Define mock rows and workbook structures.
   - Test aggregation, template exclusion, column alias handling, and scope detection.
   - Test edge cases: missing columns, empty sheets, zero values.

### Checklist

- [ ] Parser function in a new file under `src/lib/utils/import/`
- [ ] Format detection logic added
- [ ] `sourceFormat` type extended in `ClusterImportResult`
- [ ] Parser wired into `importFile()`
- [ ] Column aliases registered if needed
- [ ] Tests with mocked XLSX/CSV data
- [ ] Edge case tests (missing columns, empty data)

---

## 3. Adding a New Export Format

Export formats produce downloadable files from sizing results. The existing formats are CSV and JSON, both in `src/lib/utils/export.ts`.

### Architecture

Each export format has two functions:
1. A **builder** that produces a string: `buildXxxContent(cluster, scenarios, results) => string`
2. A **downloader** that triggers the browser download: `downloadXxx(filename, content) => void`

### Files to Modify

| File | Change |
|---|---|
| `src/lib/utils/export.ts` | Add `buildXxxContent` and `downloadXxx` functions |
| `src/components/step3/` | Add a download button that calls the new export |

### Step-by-Step

1. **Add the builder function** in `src/lib/utils/export.ts`:
   - Signature: `buildXxxContent(cluster: OldCluster, scenarios: readonly Scenario[], results: readonly ScenarioResult[]): string`
   - The builder is a pure function with no side effects.

2. **Add the download function** in `src/lib/utils/export.ts`:
   - Create a `Blob` with the appropriate MIME type.
   - Generate an object URL, simulate an anchor click, then revoke the URL.
   - Follow the pattern of `downloadCsv` or `downloadJson`.

3. **Add a UI trigger** in the Step 3 component:
   - Add a button that calls `buildXxxContent` then `downloadXxx`.
   - Follow the existing pattern of CSV/JSON download buttons.

4. **Write tests** in `src/lib/utils/__tests__/export.test.ts`:
   - Test the builder function with known inputs and verify the output string.
   - Test edge cases (empty scenarios array, special characters in names).

### Checklist

- [ ] Builder function (pure, no side effects)
- [ ] Download function (Blob + object URL pattern)
- [ ] UI button in Step 3
- [ ] Unit tests for the builder

---

## 4. Adding a New Layout Mode

Layout modes control whether disk is included as a per-server sizing constraint. The existing modes are `hci` (hyperconverged, disk counted) and `disaggregated` (external storage, disk excluded).

### Files to Modify

| File | Change |
|---|---|
| `src/store/useWizardStore.ts` | Add the new mode to the `LayoutMode` type union |
| `src/lib/sizing/constraints.ts` | Add the new mode to the `LayoutMode` type and modify disk constraint logic in `computeScenarioResult` |
| `src/components/wizard/SizingModeToggle.tsx` | Add a `ModeBtn` in the layout mode row |

### Step-by-Step

1. **Extend the type** in both `src/store/useWizardStore.ts` and `src/lib/sizing/constraints.ts`:
   - Add the new mode string to the `LayoutMode` union.

2. **Update constraint logic** in `computeScenarioResult`:
   - The current logic is: `layoutMode === 'disaggregated' ? 0 : serverCountByDisk(...)`.
   - Add a new branch for the new layout mode's behavior.

3. **Add UI toggle** in `SizingModeToggle.tsx`:
   - The layout mode row iterates over an array of `LayoutMode` values -- add the new mode to the array.

4. **Write tests**:
   - Constraint test in `src/lib/sizing/__tests__/constraints.test.ts` verifying the new layout mode's effect on `diskLimitedCount` and `limitingResource`.
   - Toggle test in `src/components/wizard/__tests__/SizingModeToggle.test.tsx`.

### Checklist

- [ ] `LayoutMode` type updated in both `useWizardStore.ts` and `constraints.ts`
- [ ] Constraint logic updated in `computeScenarioResult`
- [ ] `ModeBtn` added to layout mode row in `SizingModeToggle.tsx`
- [ ] Constraint integration tests
- [ ] Toggle component tests
