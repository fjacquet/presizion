# Test Strategy & Patterns

## Test Framework

Presizion uses **Vitest** (v4.x) as the test runner, with **React Testing Library** (v16.x) for component tests. The test environment is **jsdom**, configured in `vitest.config.ts`.

Key configuration (`vitest.config.ts`):

- **Environment**: `jsdom`
- **Globals**: enabled (`true`) -- `describe`, `it`, `expect` are available without import, though most test files import them explicitly from `vitest` for clarity
- **Setup file**: `src/test-setup.ts`
- **Test pattern**: `src/**/*.{test,spec}.{ts,tsx}`
- **Path alias**: `@` maps to `./src`

Coverage is provided by `@vitest/coverage-v8` and scoped to core logic directories:

```
src/lib/sizing/**
src/store/**
src/hooks/**
```

## File Organization

Tests are co-located with source code in `__tests__/` directories adjacent to the modules they test:

```
src/
  lib/
    sizing/
      formulas.ts
      constraints.ts
      __tests__/
        formulas.test.ts
        constraints.test.ts
  components/
    step1/
      CurrentClusterForm.tsx
      __tests__/
        CurrentClusterForm.test.tsx
  lib/
    utils/
      import/
        rvtoolsParser.ts
        __tests__/
          rvtoolsParser.test.ts
  store/
    __tests__/
      useWizardStore.test.ts
```

This convention keeps tests discoverable and close to the code they verify.

## Test Categories

### 1. Formula Tests (`src/lib/sizing/__tests__/formulas.test.ts`)

Pure function tests for individual sizing formulas. These are the fastest and most deterministic tests in the suite.

**Covered formulas**:

- `serverCountByCpu` -- vCPU:pCore ratio hard cap (CALC-01)
- `serverCountByRam` -- RAM-limited server count (CALC-02), with optional `ramUtilPct` (UTIL-03)
- `serverCountByDisk` -- disk-limited server count (CALC-03)
- `serverCountBySpecint` -- SPECint benchmark comparison (PERF-04)
- `serverCountByCpuAggressive` -- utilization-driven density, ratio bypassed (CALC-01-AGG)
- `serverCountByGhz` -- GHz demand/capacity model (CALC-01-GHZ)

**Patterns used**:

- Named fixture constants (`F1`, `F2`, `F3`, `BOUNDARY`) with manually verified expected values documented inline
- Floating-point safety assertions (`Math.abs(result - expected) < 0.001`)
- Zero-guard edge cases (division by zero inputs return 0)
- Boundary tests that confirm `Math.ceil` behavior at exact integer boundaries
- Exported fixtures for reuse in other test files

### 2. Constraint / Integration Tests (`src/lib/sizing/__tests__/constraints.test.ts`)

Tests for `computeScenarioResult`, the public API that orchestrates all formulas and produces a complete `ScenarioResult`. These tests validate the full sizing pipeline including:

- **CALC-05**: Constraint selection -- which resource (cpu, ram, disk, specint, ghz) is limiting
- **CALC-04**: HA reserve -- `haReserveCount` of 0, 1, or 2 adds exact server count after the max
- **CALC-06**: Utilization metrics -- `achievedVcpuToPCoreRatio`, `vmsPerServer`, per-resource utilization percentages (range-checked 0-100)
- **Sizing modes**: `vcpu`, `specint`, `aggressive`, `ghz` -- each mode selects a different CPU formula
- **Layout modes**: `hci` vs `disaggregated` -- disaggregated sets `diskLimitedCount` to 0
- **Growth override**: `targetVmCount` scales vCPUs and VM counts proportionally
- **Pin floor**: `minServerCount` enforces a minimum final count

Each test group uses dedicated cluster+scenario fixture pairs with expected values documented in comments.

### 3. Component Tests (`src/components/*/__tests__/*.test.tsx`)

React component tests using React Testing Library. These test DOM output, user interactions, and store-driven conditional rendering.

**Example**: `CurrentClusterForm.test.tsx` covers:

- `INPUT-01`: Form fields for VM configuration render correctly
- `INPUT-02`: Cluster totals fields are present
- `INPUT-04`: Derived metrics panel updates reactively
- `INPUT-05`: Validation and navigation guard (Next button blocked on invalid input)
- `UX-03`: Tooltip presence and visibility on focus
- `PERF-02`: Conditional fields for SPECint mode
- `SC-4`: Utilization percent fields appear/hide based on sizing mode
- `REPT-02`: Auto-derived totalPcores from server config

### 4. Parser Tests (`src/lib/utils/import/__tests__/`)

Tests for file import parsers (RVTools, LiveOptics). These mock the `@e965/xlsx` library to avoid real file I/O and focus on aggregation logic.

**RVTools parser** (`rvtoolsParser.test.ts`):

- Aggregates `totalVcpus` from the `CPUs` / `Num CPUs` column aliases
- Excludes template VMs from counts
- Computes `totalDiskGb` from `Provisioned MB` (converts MB to GB)
- Computes `avgRamPerVmGb` from `Memory` column
- Extracts `cpuModel` and `cpuFrequencyGhz` from the optional `vHost` sheet
- Scope detection: single-cluster, multi-cluster, Datacenter+Cluster composite keys, fallback to `__all__`
- Per-scope aggregation in `rawByScope`

**LiveOptics parser** (`liveopticParser.test.ts`):

- Same aggregation patterns but with LiveOptics column names (`Virtual CPU`, `Provisioned Memory (MiB)`, etc.)
- Tests both XLSX and CSV code paths
- ESX Hosts sheet extraction for CPU model and frequency
- Scope detection for cluster segmentation

### 5. Other Test Files

The codebase includes additional test files for:

- Store tests (`useWizardStore.test.ts`, `useImportStore.test.ts`, `useThemeStore.test.ts`)
- Hook tests (`useScenariosResults.test.ts`, `useBeforeUnload.test.ts`)
- Schema validation tests (`schemas.test.ts`)
- Export/clipboard tests (`export.test.ts`, `clipboard.test.ts`)
- UI tests (`ComparisonTable.test.tsx`, `ScenarioCard.test.tsx`, `SizingChart.test.tsx`, `WizardShell.test.tsx`, `SizingModeToggle.test.tsx`, `ThemeToggle.test.tsx`)
- Import infrastructure tests (`fileValidation.test.ts`, `formatDetector.test.ts`, `columnResolver.test.ts`, `scopeAggregator.test.ts`)
- CSS/theme tests (`printCss.test.ts`, `darkMode.test.ts`)

## Fixture Patterns and Constants

### Named Fixture Objects

Formula and constraint tests define fixture objects at the top of the file with all inputs and expected outputs:

```ts
const F1 = {
  totalVcpus: 3200,
  growthHeadroomFactor: 1.20,
  targetVcpuToPCoreRatio: 4,
  coresPerServer: 40,
  expectedCpuCount: 24,
};
```

Each fixture includes a comment showing the manual calculation step-by-step. Fixtures are exported so other test files can reuse them.

### Cluster + Scenario Pairs

Constraint tests define paired fixtures (`CPU_LIMITED_CLUSTER` + `CPU_LIMITED_SCENARIO`) that represent complete sizing inputs. Each pair is designed to make one specific resource the bottleneck.

### XLSX Mocking

Parser tests mock the `@e965/xlsx` module at the top of the file:

```ts
vi.mock('@e965/xlsx', () => ({
  read: vi.fn(),
  utils: { sheet_to_json: vi.fn() },
}));
```

Mock workbooks and sheets are defined as constants, and `beforeEach` resets the mock return values.

## Store Setup in Component Tests

Zustand stores are reset before each test using `beforeEach` to prevent cross-test contamination:

```ts
beforeEach(() => {
  useClusterStore.setState({
    currentCluster: { totalVcpus: 0, totalPcores: 0, totalVms: 0 },
  });
  useWizardStore.setState({ currentStep: 1, sizingMode: 'vcpu' });
});
```

To test conditional rendering based on store state, tests set the store directly with `act()`:

```ts
act(() => {
  useWizardStore.setState({ sizingMode: 'specint' });
});
```

This approach avoids the need for a store provider wrapper -- Zustand stores are module-level singletons.

## Requirements Tracing in Test Descriptions

Test files and `describe` blocks reference requirement identifiers from the project specification:

- File-level comments: `// VALIDATION.md: CALC-01, CALC-02, CALC-03`
- JSDoc headers: `/** Tests for INPUT-01, INPUT-02, INPUT-04, INPUT-05, UX-03, PERF-02, SC-4 */`
- Describe blocks: `describe('CALC-05: constraint selection and limiting resource', ...)`
- Individual tests: `it('haReserveCount=1 (N+1): finalCount equals rawCount + 1', ...)`

This tracing links every test back to a specific requirement, making it straightforward to verify coverage of the specification.

## Running Tests

| Command | Description |
|---|---|
| `npm run test` | Run all tests once (`vitest run`) |
| `npm run test:watch` | Run tests in watch mode (`vitest`) |
| `npm run test:coverage` | Run tests with V8 coverage report (`vitest run --coverage`) |

## Coverage Philosophy

Coverage collection is scoped to the three directories that contain business logic and state management:

- `src/lib/sizing/**` -- all sizing formulas and constraint logic
- `src/store/**` -- Zustand stores
- `src/hooks/**` -- custom React hooks

UI components are tested for behavior (rendering, interactions, conditional visibility) but are not included in the coverage target. The rationale is that sizing correctness is the critical invariant -- if formulas produce wrong numbers, the tool is useless. Component tests verify that the correct data reaches the screen, but pixel-level coverage is not tracked.
