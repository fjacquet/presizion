# Phase 5: SPECint and Utilization Formula Engine - Research

**Researched:** 2026-03-13
**Domain:** TypeScript formula engine extension — Zod v4 schema, Zustand v5 store, pure formula functions, Vitest fixtures
**Confidence:** HIGH

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PERF-01 | User can select a global sizing mode: vCPU-based (default) or SPECint-based (mutually exclusive toggle) | `sizingMode` field added to `useWizardStore`; union type `'vcpu' \| 'specint'` |
| PERF-04 | In SPECint mode the CPU constraint uses `ceil(existingServers × oldSPECint × headroom / targetSPECint)`; RAM and disk formulas are unchanged | New `serverCountBySpecint()` formula function; branch in `computeScenarioResult` |
| PERF-05 | The limiting resource label shows "SPECint" when SPECint mode is active and that constraint drives the final server count | `LimitingResource` type extended with `'specint'`; `determineLimitingResource` updated |
| UTIL-01 | User can enter observed current CPU utilization % (0–100) for the existing cluster in Step 1 | `cpuUtilizationPercent?: number` added to `OldCluster` interface and `currentClusterSchema` |
| UTIL-02 | User can enter observed current RAM utilization % (0–100) for the existing cluster in Step 1 | `ramUtilizationPercent?: number` added to `OldCluster` interface and `currentClusterSchema` |
| UTIL-03 | When utilization % values are provided, the CPU and RAM sizing formulas multiply the effective demand by utilization% | `serverCountByCpu` receives `cpuUtilPct` param (default 100); `serverCountByRam` receives `ramUtilPct` param (default 100) |
</phase_requirements>

---

## Summary

Phase 5 is a pure formula-engine and type-system change. No UI components are modified. The work falls across six files in three layers: types (`cluster.ts`, `results.ts`), schemas (`currentClusterSchema.ts`, `scenarioSchema.ts`), formula engine (`formulas.ts`, `constraints.ts`), display strings (`display.ts`, `formulaStrings.ts`), state (`useWizardStore.ts`), and the derive-on-read hook (`useScenariosResults.ts`).

The codebase already enforces TypeScript strict mode with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. Every optional numeric field that has a computational meaning (utilization %) must use the `?? 100` nullish-coalescing pattern before being passed to formula functions — TypeScript will reject direct arithmetic on `number | undefined` under these settings.

The SPECint formula requires `existingServers` as a multiplier. The current `OldCluster` type does NOT include a server count field. Phase 5 must add `existingServerCount?: number` to the `OldCluster` interface and schema. Additionally, `computeScenarioResult` must receive `sizingMode` from the wizard store, which it currently does not. The cleanest path is passing `sizingMode` as a third parameter to `computeScenarioResult`, which then updates `useScenariosResults` to read the mode from `useWizardStore`.

**Primary recommendation:** Extend types first, then schemas, then formula functions, then `computeScenarioResult`, then `useScenariosResults`, then `display.ts`/`formulaStrings.ts` — bottom-up, matching the project's established "math before UI" discipline.

---

## Standard Stack

### Core (already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ~5.9.3 | Type system with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` | Project standard; all new code must pass existing tsconfig |
| Zod | ^4.3.6 | Schema validation with `z.superRefine` for cross-field conditional validation | Project standard; existing schemas use `z.preprocess` pattern |
| Zustand | ^5.0.11 | Global state for `sizingMode` toggle | Project standard; `useWizardStore` is the correct home |
| Vitest | ^4.1.0 | Test runner; existing fixtures in `__tests__/constraints.test.ts` are the pattern to follow | Project standard |

### No New Dependencies

Phase 5 requires zero new npm packages. All required capabilities exist in the installed stack.

---

## Architecture Patterns

### Recommended File Change Set

```
src/
  types/
    cluster.ts          # Add existingServerCount?, cpuUtilizationPercent?, ramUtilizationPercent?, specintPerServer? to OldCluster
                        # Add targetSpecint? to Scenario
    results.ts          # Extend LimitingResource = 'cpu' | 'ram' | 'disk' | 'specint'
  schemas/
    currentClusterSchema.ts   # Add optional fields for existingServerCount, specintPerServer, cpuUtilizationPercent, ramUtilizationPercent
    scenarioSchema.ts         # Add optional targetSpecint field
  lib/
    sizing/
      formulas.ts       # Add serverCountBySpecint(); add cpuUtilPct/ramUtilPct params to existing functions
      constraints.ts    # computeScenarioResult receives sizingMode; branches on mode for CPU constraint
      display.ts        # cpuFormulaString branches on mode; new specintFormulaString
      __tests__/
        formulas.test.ts       # New tests for serverCountBySpecint and utilization-scaled serverCountByCpu
        constraints.test.ts    # New fixtures: specint-limited, util-scaled CPU/RAM, combined
        display.test.ts        # New tests for specint formula string and util-scaled CPU string
    display/
      formulaStrings.ts # getCpuFormulaString branches on mode; new getSpecintFormulaString
  store/
    useWizardStore.ts   # Add sizingMode: 'vcpu' | 'specint'; setSizingMode action
  hooks/
    useScenariosResults.ts    # Read sizingMode from useWizardStore; pass to computeScenarioResult
```

### Pattern 1: Extending OldCluster Type with Optional Fields

The `OldCluster` interface uses `readonly` on all fields and `exactOptionalPropertyTypes` is enabled. New optional fields must follow the same pattern.

```typescript
// Source: src/types/cluster.ts — current pattern, extended
export interface OldCluster {
  readonly totalVcpus: number;
  readonly totalPcores: number;
  readonly totalVms: number;
  readonly totalDiskGb?: number;
  readonly socketsPerServer?: number;
  readonly coresPerSocket?: number;
  readonly ramPerServerGb?: number;
  // Phase 5 additions:
  readonly existingServerCount?: number;   // Required in specint mode — validated via schema superRefine
  readonly specintPerServer?: number;       // Required in specint mode
  readonly cpuUtilizationPercent?: number;  // 0–100; absent means 100% (no right-sizing)
  readonly ramUtilizationPercent?: number;  // 0–100; absent means 100% (no right-sizing)
}
```

**exactOptionalPropertyTypes impact:** With this flag, `property?: T` means the property is truly absent, NOT `T | undefined`. Setting `obj.cpuUtilizationPercent = undefined` is a type error. Callers must omit the property entirely for the "not provided" case. The `??` operator works correctly for reading: `(cluster.cpuUtilizationPercent ?? 100)`.

### Pattern 2: Zod Cross-Field Conditional Validation with superRefine

The project uses `z.preprocess` for numeric inputs (established pattern — see `currentClusterSchema.ts`). Cross-field "required when mode=specint" validation uses `z.superRefine` chained after the object schema. Verified working in Zod 4.3.6.

```typescript
// Source: verified in Zod 4.3.6 node_modules
const optionalPercent = z.preprocess(
  numericPreprocess,
  z.number().min(0).max(100).optional(),
);

const optionalPositiveNumber = z.preprocess(
  numericPreprocess,
  z.number().positive().optional(),
);

export const currentClusterSchema = z
  .object({
    // ... existing fields unchanged ...
    existingServerCount: optionalNonNegativeNumber,  // used in specint mode
    specintPerServer: optionalPositiveNumber,          // required when mode='specint'
    cpuUtilizationPercent: optionalPercent,
    ramUtilizationPercent: optionalPercent,
  })
  .superRefine((data, ctx) => {
    // Note: sizingMode is NOT in this schema — it lives in the wizard store.
    // The schema validates field formats only. Conditional-required logic
    // is enforced at the store/hook layer, not in the schema.
    // This keeps schemas independent of global state.
  });
```

**Design decision confirmed by ADR-001:** The `currentClusterSchema` does NOT receive `sizingMode` as input. Schemas validate field formats only. Conditional-required logic (specintPerServer required when mode='specint') should be enforced in the form validation step (Phase 6 responsibility) via a separate refinement at the UI layer, not in the core schema. Phase 5 adds the fields as optional; Phase 6 makes them conditionally required in the form resolver.

### Pattern 3: Scenario Schema Extension

```typescript
// Source: src/schemas/scenarioSchema.ts — current pattern, extended
const optionalPositiveNumber = z.preprocess(
  numericPreprocess,
  z.number().positive().optional(),
);

export const scenarioSchema = z.object({
  // ... existing fields unchanged ...
  targetSpecint: optionalPositiveNumber,  // required when sizingMode='specint' (Phase 6 enforces)
});
```

### Pattern 4: New Formula Function for SPECint

New pure function following the established `formulas.ts` convention. No React imports, no side effects, `Math.ceil` only at final return.

```typescript
// Source: formulas.ts pattern — extension
/**
 * Computes the number of servers required when SPECint is the CPU constraint.
 *
 * Formula (PERF-04):
 *   ceil( existingServers × oldSPECintPerServer × growthHeadroomFactor / targetSPECint )
 */
export function serverCountBySpecint(
  existingServers: number,
  oldSPECintPerServer: number,
  growthHeadroomFactor: number,
  targetSPECint: number,
): number {
  return Math.ceil(
    (existingServers * oldSPECintPerServer * growthHeadroomFactor) / targetSPECint,
  );
}
```

### Pattern 5: Utilization Scaling in Existing Formula Functions

The ADR specifies adding optional `cpuUtilPct` and `ramUtilPct` parameters with default 100. Under `exactOptionalPropertyTypes`, the cleanest approach is separate parameters with explicit defaults, not optional parameters.

**Warning:** Under `noUncheckedIndexedAccess` and strict TypeScript, optional parameters with defaults are safe. However, the existing `serverCountByCpu` function signature cannot change its parameter count without updating all call sites. Two options:

**Option A (recommended): New parameter with default value**

```typescript
// Add cpuUtilPct with default 100 — backward compatible
export function serverCountByCpu(
  totalVcpus: number,
  growthHeadroomFactor: number,
  targetVcpuToPCoreRatio: number,
  coresPerServer: number,
  cpuUtilPct: number = 100,  // default preserves v1.0 behavior
): number {
  return Math.ceil(
    (totalVcpus * (cpuUtilPct / 100) * growthHeadroomFactor) / targetVcpuToPCoreRatio / coresPerServer,
  );
}
```

**Option B: Extract effective demand before calling**

```typescript
// Caller computes effectiveTotalVcpus = totalVcpus * (cpuUtilPct / 100) before calling
// serverCountByCpu signature unchanged
```

Option A is recommended: self-documenting, backward compatible, single call site change (constraints.ts), ADR-004 explicitly says "formula functions gain optional cpuUtilPct and ramUtilPct parameters (default 100)."

### Pattern 6: computeScenarioResult Signature Extension

The function currently takes `(cluster: OldCluster, scenario: Scenario)`. Phase 5 adds `sizingMode` as a third parameter.

```typescript
// Recommended approach — explicit parameter, not object wrapper
export function computeScenarioResult(
  cluster: OldCluster,
  scenario: Scenario,
  sizingMode: 'vcpu' | 'specint' = 'vcpu',
): ScenarioResult {
  const headroomFactor = 1 + scenario.headroomPercent / 100;
  const coresPerServer = scenario.socketsPerServer * scenario.coresPerSocket;

  let cpuLimitedCount: number;
  if (sizingMode === 'specint') {
    // PERF-04: SPECint formula
    // cluster.existingServerCount and cluster.specintPerServer must be present
    // (schema+store enforce this when mode='specint')
    const existingServers = cluster.existingServerCount ?? 0;
    const oldSPECint = cluster.specintPerServer ?? 0;
    const targetSPECint = scenario.targetSpecint ?? 0;
    cpuLimitedCount = serverCountBySpecint(existingServers, oldSPECint, headroomFactor, targetSPECint);
  } else {
    // CALC-01: vCPU formula with optional utilization scaling (UTIL-03)
    const cpuUtilPct = cluster.cpuUtilizationPercent ?? 100;
    cpuLimitedCount = serverCountByCpu(
      cluster.totalVcpus,
      headroomFactor,
      scenario.targetVcpuToPCoreRatio,
      coresPerServer,
      cpuUtilPct,
    );
  }

  // CALC-02: RAM with optional utilization scaling (UTIL-03)
  const ramUtilPct = cluster.ramUtilizationPercent ?? 100;
  const ramLimitedCount = serverCountByRam(
    cluster.totalVms,
    scenario.ramPerVmGb,
    headroomFactor,
    scenario.ramPerServerGb,
    ramUtilPct,
  );

  // CALC-03: Disk unchanged
  const diskLimitedCount = serverCountByDisk(...);

  // CALC-05: determineLimitingResource now receives sizingMode for 'specint' label (PERF-05)
  const limitingResource = determineLimitingResource(cpuLimitedCount, ramLimitedCount, diskLimitedCount, sizingMode);

  // ... rest of function unchanged ...
}
```

**determineLimitingResource must also receive sizingMode** to return `'specint'` instead of `'cpu'` when in specint mode:

```typescript
function determineLimitingResource(
  cpu: number,
  ram: number,
  disk: number,
  sizingMode: 'vcpu' | 'specint' = 'vcpu',
): LimitingResource {
  if (cpu >= ram && cpu >= disk) return sizingMode === 'specint' ? 'specint' : 'cpu';
  if (ram > cpu && ram >= disk) return 'ram';
  return 'disk';
}
```

### Pattern 7: Zustand sizingMode in useWizardStore

`sizingMode` belongs in `useWizardStore` per ADR-001: "Zustand wizard store gains a `sizingMode: 'vcpu' | 'specint'` field."

```typescript
// Source: src/store/useWizardStore.ts — current pattern, extended
type SizingMode = 'vcpu' | 'specint';

interface WizardStore {
  currentStep: 1 | 2 | 3;
  sizingMode: SizingMode;         // Phase 5 addition
  goToStep: (step: 1 | 2 | 3) => void;
  nextStep: () => void;
  prevStep: () => void;
  setSizingMode: (mode: SizingMode) => void;  // Phase 5 addition
}

export const useWizardStore = create<WizardStore>((set) => ({
  currentStep: 1,
  sizingMode: 'vcpu',             // default: vCPU mode
  // ... existing actions ...
  setSizingMode: (mode) => set({ sizingMode: mode }),
}));
```

### Pattern 8: useScenariosResults Hook Update

The hook must read `sizingMode` from `useWizardStore` and pass it to `computeScenarioResult`.

```typescript
export function useScenariosResults(): readonly ScenarioResult[] {
  const currentCluster = useClusterStore((state) => state.currentCluster);
  const scenarios = useScenariosStore((state) => state.scenarios);
  const sizingMode = useWizardStore((state) => state.sizingMode);  // Phase 5 addition

  return scenarios.map((scenario) =>
    computeScenarioResult(currentCluster, scenario, sizingMode),
  );
}
```

### Pattern 9: Display String Extensions

There are two display modules: `src/lib/sizing/display.ts` (used by Phase 4 tests) and `src/lib/display/formulaStrings.ts` (used by components). Both need extending. The ADR states "display.ts formula strings must branch on mode."

**For `src/lib/sizing/display.ts` (existing):**

- Add `cpuUtilizationPercent?: number` to `CpuFormulaParams` and branch when it's not 100
- Add a new `SpecintFormulaParams` interface and `specintFormulaString` export function

**For `src/lib/display/formulaStrings.ts` (component-facing):**

- `getCpuFormulaString` receives `cpuUtilizationPercent?: number` and conditionally shows the scaler
- New `getSpecintFormulaString(params: SpecintFormulaParams): string`

**SPECint display string format:**

```
"ceil(10 servers × 1200 SPECint × 1.20 / 2400 SPECint) = 6 servers"
```

**vCPU with utilization display string format (when utilization is not 100):**

```
"ceil(2000 × 70% × 120% / 4 / 48) = 9 servers"
```

### Anti-Patterns to Avoid

- **Storing ScenarioResult in Zustand:** Established pattern is derive-on-read. Phase 5 does not change this.
- **Adding sizingMode to `useScenariosStore` or `useClusterStore`:** It belongs in `useWizardStore` (global config, not per-scenario data).
- **Making utilization a scenario-level field:** ADR-004 explicitly places utilization in `OldCluster` (Step 1 input), not per scenario.
- **Treating specintPerServer as a Scenario field:** It belongs in `OldCluster` (it describes the existing infrastructure). `targetSpecint` belongs in `Scenario` (it describes the target).
- **Arithmetic on `cluster.cpuUtilizationPercent` directly:** Under strict TypeScript, `cluster.cpuUtilizationPercent / 100` is `number | undefined` divided by number — type error. Always use `(cluster.cpuUtilizationPercent ?? 100) / 100`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-field conditional validation | Custom validator function outside Zod | `z.superRefine()` on the schema object | Produces proper `ZodError` with field paths; integrates with `zodResolver` |
| Optional numeric with fallback | Ternary `value !== undefined ? value : 100` | `value ?? 100` nullish coalescing | Handles `null` and `undefined` correctly; TypeScript understands the type narrowing |
| Mode branching in display strings | Template string concatenation with if/else | Separate named functions per mode (`cpuFormulaString`, `specintFormulaString`) | Easier to test individually; avoids complex conditional logic in a single function |

---

## Common Pitfalls

### Pitfall 1: exactOptionalPropertyTypes and Optional Assignment

**What goes wrong:** Setting `cluster.cpuUtilizationPercent = undefined` when constructing an `OldCluster` object throws a TypeScript error under `exactOptionalPropertyTypes`. The property must be absent, not explicitly `undefined`.

**Why it happens:** `exactOptionalPropertyTypes` distinguishes `{ x?: number }` (property absent) from `{ x: number | undefined }` (property present with undefined value). TypeScript 4.4+ enforces this strictly.

**How to avoid:** When constructing objects from form data, only include the field if the value is defined:

```typescript
const cluster: OldCluster = {
  totalVcpus: formData.totalVcpus,
  // Conditional spread pattern:
  ...(formData.cpuUtilizationPercent !== undefined && {
    cpuUtilizationPercent: formData.cpuUtilizationPercent,
  }),
};
```

**Warning signs:** TypeScript error "Type 'undefined' is not assignable to type 'number'" on optional property assignment.

### Pitfall 2: Missing existingServerCount in SPECint Formula

**What goes wrong:** `computeScenarioResult` in SPECint mode divides by `targetSPECint` which could be `0` or `undefined`, producing `Infinity` or `NaN`.

**Why it happens:** `existingServerCount`, `specintPerServer`, and `targetSpecint` are all optional in the schemas (Phase 5 adds them as optional; Phase 6 makes them conditionally required in UI validation). At the formula layer, we have no guarantee they are present.

**How to avoid:** Guard against zero/undefined at the formula call site:

```typescript
const existingServers = cluster.existingServerCount ?? 0;
const oldSPECint = cluster.specintPerServer ?? 0;
const targetSPECint = scenario.targetSpecint ?? 0;
// Guard against division by zero before calling formula
if (targetSPECint <= 0) {
  cpuLimitedCount = 0;  // or handle as an error case
} else {
  cpuLimitedCount = serverCountBySpecint(existingServers, oldSPECint, headroomFactor, targetSPECint);
}
```

**Warning signs:** `NaN` or `Infinity` in `cpuLimitedCount`; `Math.max(NaN, 3, 1)` returns `NaN`.

### Pitfall 3: LimitingResource Type Not Extended Before Use

**What goes wrong:** Adding `'specint'` to `LimitingResource` union without updating all exhaustive switch/if-else consumers causes TypeScript errors downstream (Phase 6 components will break at build time).

**Why it happens:** `LimitingResource` is used in `ComparisonTable.tsx` and `utilizationClass` logic. Extending the type without updating consumers causes incomplete type coverage.

**How to avoid:** Extend `LimitingResource` in Phase 5 and run `rtk tsc` after. The TypeScript compiler will report all locations that need updating. Most are in UI components (not touching in Phase 5) — verify they don't use exhaustive checks that would break.

**Warning signs:** TypeScript error "Type 'specint' is not assignable to type 'LimitingResource'" in a switch-case.

### Pitfall 4: Existing Tests Break When Formula Signatures Change

**What goes wrong:** Adding a new optional parameter to `serverCountByCpu` with a default value is backward-compatible in JavaScript but the existing test calls don't need updating. However, if the internal formula changes even slightly (multiplication order, etc.), fixture values could diverge.

**Why it happens:** The existing `constraints.test.ts` passes CPU-limited fixtures that should still work with the new optional `cpuUtilPct = 100` default.

**How to avoid:** Run `rtk vitest run` immediately after each formula signature change to verify existing tests still pass. The existing CPU-limited fixture (`totalVcpus=3200, ratio=4, cores=40 → 24 servers`) must produce the same result with the default `cpuUtilPct=100`.

Verify: `ceil(3200 × (100/100) × 1.20 / 4 / 40) = ceil(3200 × 1 × 1.20 / 160) = ceil(24) = 24`. Confirmed correct.

### Pitfall 5: display.ts vs formulaStrings.ts Duplication

**What goes wrong:** The project has two display string modules: `src/lib/sizing/display.ts` (pure string formatters, tested by `display.test.ts`) and `src/lib/display/formulaStrings.ts` (component-facing, imports formula functions to compute results). Both need Phase 5 extensions.

**Why it happens:** The original `display.ts` from Phase 1 was co-located in `src/lib/sizing/`. Phase 4 added the richer `formulaStrings.ts` with computed results. There is overlapping responsibility.

**How to avoid:** Extend both modules consistently. The tests in `display.test.ts` test `src/lib/sizing/display.ts`. The Phase 4 components use `src/lib/display/formulaStrings.ts`. Both must expose `specintFormulaString`/`getSpecintFormulaString`.

---

## Code Examples

### SPECint Formula Verification

```typescript
// Verified arithmetic: ceil(existingServers × oldSPECint × headroom / targetSPECint)
// existingServers=10, oldSPECint=1200, headroom=1.20, targetSPECint=2400
// = ceil(10 × 1200 × 1.20 / 2400) = ceil(14400 / 2400) = ceil(6.0) = 6
Math.ceil((10 * 1200 * 1.20) / 2400); // = 6
```

### Utilization Scaling Verification

```typescript
// CPU at 60% utilization: only 60% of vCPUs are "real" demand
// totalVcpus=1000, cpuUtilPct=60 → effectiveVcpus=600
// = ceil(1000 × (60/100) × 1.20 / 4 / 40) = ceil(600 × 1.20 / 160) = ceil(4.5) = 5
Math.ceil((1000 * (60 / 100) * 1.20) / 4 / 40); // = 5

// Without utilization: ceil(1000 × 1.20 / 4 / 40) = ceil(7.5) = 8
Math.ceil((1000 * 1.20) / 4 / 40); // = 8
// Right-sizing saves 3 servers (8 → 5)
```

### Zod superRefine Pattern (Verified in Zod 4.3.6)

```typescript
// Source: verified in node_modules/zod@4.3.6
const schema = z.object({
  mode: z.enum(['vcpu', 'specint']),
  specintPerServer: z.preprocess(numericPreprocess, z.number().positive().optional()),
}).superRefine((data, ctx) => {
  if (data.mode === 'specint' && data.specintPerServer === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'specintPerServer is required in SPECint mode',
      path: ['specintPerServer'],
    });
  }
});
// Verified: throws ZodError when mode='specint' and specintPerServer absent
// Verified: passes when mode='vcpu' and specintPerServer absent
```

### Optional Numeric Percent Schema Field (Verified in Zod 4.3.6)

```typescript
// Source: verified in node_modules/zod@4.3.6
const optionalPercent = z.preprocess(
  numericPreprocess,  // '' | null | undefined → undefined; Number(val) otherwise
  z.number().min(0).max(100).optional(),
);
// '' → undefined (no error)
// undefined → undefined (no error)
// 70 → 70
// -5 → ZodError (below min)
// 110 → ZodError (above max)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Zod v3 `.superRefine` | Zod v4 `.superRefine` — same API, different import path (`zod` not `zod/v4`) | v4.0 | No API change needed; project already imports `from 'zod'` which resolves to v4 |
| Zustand v4 selector pattern | Zustand v5 — same `create`, same selector pattern | v5.0 | No API change; existing `create<Store>((set) => ...)` is valid in v5 |

**Deprecated/outdated:**

- `z.coerce.number()`: Project explicitly avoids this in favor of `z.preprocess`. Do not use for any new fields.
- Inline arithmetic on optional fields without nullish coalescing: TypeScript strict mode rejects this.

---

## Open Questions

1. **Naming of existingServerCount field in OldCluster**
   - What we know: INPUT-03 says "optional server count" for the existing cluster. The ADR uses "existingServers".
   - What's unclear: Should the field be named `existingServerCount` (matching the schema convention of verbose names) or `serverCount`?
   - Recommendation: Use `existingServerCount` to be unambiguous (distinguishes it from scenario server count outputs).

2. **SPECint field in OldCluster: specintPerServer vs totalSpecint**
   - What we know: The ADR says `specintPerServer`. The formula uses `existingServers × specintPerServer`.
   - What's unclear: Some benchmark databases report total SPECint for the cluster, others per-server.
   - Recommendation: Use `specintPerServer` as named in the ADR — the formula is `existingServers × specintPerServer`, which is mathematically equivalent to `totalSpecint`. Per-server is more natural for presales (users look up a single server model).

3. **Zero-guard for SPECint formula denominator**
   - What we know: `targetSpecint` is optional and could be absent when mode='specint' if form is not yet filled.
   - What's unclear: Should `computeScenarioResult` throw, return 0, or return a sentinel value when required specint fields are absent?
   - Recommendation: Return `cpuLimitedCount = 0` when `targetSPECint <= 0`. The UI (Phase 6) will prevent form submission with missing required fields, so this is a defensive fallback.

---

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is mandatory.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.0 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `rtk vitest run src/lib/sizing/__tests__/` |
| Full suite command | `rtk vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERF-01 | `useWizardStore` has `sizingMode: 'vcpu'` default; `setSizingMode('specint')` updates it | unit | `rtk vitest run src/store/` | ❌ Wave 0 |
| PERF-04 | `computeScenarioResult` with `sizingMode='specint'` returns `ceil(10 × 1200 × 1.20 / 2400) = 6` | unit | `rtk vitest run src/lib/sizing/__tests__/constraints.test.ts` | ✅ (extend) |
| PERF-05 | `limitingResource === 'specint'` when specint constraint drives final count | unit | `rtk vitest run src/lib/sizing/__tests__/constraints.test.ts` | ✅ (extend) |
| UTIL-01 | `currentClusterSchema.parse` accepts `cpuUtilizationPercent: 70` and rejects `cpuUtilizationPercent: -5` | unit | `rtk vitest run src/schemas/__tests__/schemas.test.ts` | ✅ (extend) |
| UTIL-02 | `currentClusterSchema.parse` accepts `ramUtilizationPercent: 80` and rejects `ramUtilizationPercent: 110` | unit | `rtk vitest run src/schemas/__tests__/schemas.test.ts` | ✅ (extend) |
| UTIL-03 | `serverCountByCpu(1000, 1.20, 4, 40, 60)` returns 5 (not 8); `useScenariosResults` returns right-sized result | unit | `rtk vitest run src/lib/sizing/__tests__/` | ✅ (extend) |

### New Test Fixtures Needed (Wave 0 Stubs)

The following fixture scenarios must be added to `constraints.test.ts` with concrete arithmetic:

**SPECint-limited fixture:**

- `existingServerCount=10, specintPerServer=1200, headroom=20%, targetSpecint=2400`
- Expected: `cpuLimitedCount = ceil(10 × 1200 × 1.20 / 2400) = 6`
- RAM and disk limited counts should be lower → `limitingResource = 'specint'`

**vCPU mode unchanged (regression fixture):**

- Existing `CPU_LIMITED_CLUSTER` + `CPU_LIMITED_SCENARIO` from `constraints.test.ts` with `sizingMode='vcpu'` (explicit)
- Expected: same result as before (24) — verifies backward compatibility

**Utilization-scaled CPU fixture:**

- `totalVcpus=1000, cpuUtilizationPercent=60, headroom=20%, ratio=4, cores=40`
- Expected: `cpuLimitedCount = ceil(1000 × 0.60 × 1.20 / 4 / 40) = ceil(4.5) = 5`

**Utilization-scaled RAM fixture:**

- `totalVms=500, ramPerVmGb=16, ramUtilizationPercent=80, headroom=20%, ramPerServer=512`
- Expected: `ramLimitedCount = ceil(500 × 16 × 0.80 × 1.20 / 512) = ceil(15) = 15` (vs 19 without scaling)

**Combined SPECint + utilization fixture:**

- SPECint mode with `cpuUtilizationPercent` provided: specint mode uses specint formula only; utilization percent has no effect on specint formula (scaling is a vCPU-mode concept)
- Verify: utilization fields are irrelevant in specint mode

### Sampling Rate

- **Per task commit:** `rtk vitest run src/lib/sizing/__tests__/ src/schemas/__tests__/ src/store/`
- **Per wave merge:** `rtk vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/store/__tests__/useWizardStore.test.ts` — covers PERF-01 (sizingMode state)
- [ ] New `describe` blocks in `src/lib/sizing/__tests__/constraints.test.ts` — covers PERF-04, PERF-05, UTIL-03
- [ ] New `describe` blocks in `src/schemas/__tests__/schemas.test.ts` — covers UTIL-01, UTIL-02
- [ ] New `describe` blocks in `src/lib/sizing/__tests__/display.test.ts` — covers display string extensions for specint and utilization modes

---

## Sources

### Primary (HIGH confidence)

- Codebase: `/Users/fjacquet/Projects/cluster-sizer/src/lib/sizing/constraints.ts` — existing `computeScenarioResult` signature and pattern
- Codebase: `/Users/fjacquet/Projects/cluster-sizer/src/lib/sizing/formulas.ts` — existing formula function conventions
- Codebase: `/Users/fjacquet/Projects/cluster-sizer/src/schemas/currentClusterSchema.ts` — `z.preprocess` pattern for all new schema fields
- Codebase: `/Users/fjacquet/Projects/cluster-sizer/src/types/cluster.ts` — `OldCluster` and `Scenario` interface patterns
- Codebase: `/Users/fjacquet/Projects/cluster-sizer/src/types/results.ts` — `LimitingResource` union type
- Codebase: `/Users/fjacquet/Projects/cluster-sizer/docs/adr/ADR-001-sizing-mode-architecture.md` — SPECint as global mode switch, Zustand placement
- Codebase: `/Users/fjacquet/Projects/cluster-sizer/docs/adr/ADR-004-utilization-as-input-scaler.md` — utilization as OldCluster fields, default 100 behavior
- Codebase: `/Users/fjacquet/Projects/cluster-sizer/tsconfig.app.json` — `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` flags confirmed
- Verified: Zod 4.3.6 `z.superRefine` cross-field validation — tested in node process against installed package
- Verified: Zod 4.3.6 optional percent field pattern — tested in node process against installed package
- Verified: SPECint formula arithmetic — `ceil(10 × 1200 × 1.20 / 2400) = 6` computed directly
- Verified: Utilization scaling arithmetic — `ceil(1000 × 0.60 × 1.20 / 4 / 40) = 5` computed directly

### Secondary (MEDIUM confidence)

- Codebase: `/Users/fjacquet/Projects/cluster-sizer/src/lib/display/formulaStrings.ts` — second display module (Phase 4 addition, not in original Phase 1 plan); both modules need extending

### Tertiary (LOW confidence)

- None — all claims in this research are backed by direct codebase inspection or verified runtime behavior.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all packages already installed, versions confirmed
- Architecture: HIGH — ADRs are authoritative, patterns verified in existing codebase
- TypeScript strict mode patterns: HIGH — verified against tsconfig.app.json flags
- Pitfalls: HIGH — derived from direct code inspection and arithmetic verification
- Test fixtures: HIGH — arithmetic verified programmatically

**Research date:** 2026-03-13
**Valid until:** 2026-04-12 (30 days — stable stack, no fast-moving libraries)

---

## RESEARCH COMPLETE

**Phase:** 5 - SPECint and Utilization Formula Engine
**Confidence:** HIGH

### Key Findings

- `OldCluster` type is missing `existingServerCount` — this must be added as the first type change, before schemas or formulas can reference it
- Zod 4.3.6 `z.superRefine` works correctly for cross-field conditional validation (verified against installed package); the project-established `z.preprocess(numericPreprocess, ...)` pattern handles all new optional fields
- `exactOptionalPropertyTypes` requires `?? 100` pattern for utilization defaults — direct arithmetic on `cluster.cpuUtilizationPercent` is a TypeScript error; always use `(cluster.cpuUtilizationPercent ?? 100)`
- Two display string modules exist (`src/lib/sizing/display.ts` and `src/lib/display/formulaStrings.ts`) — both need extending; tests only cover the first
- `useScenariosResults` hook is the single integration point for all three layers (store, formula engine, display); adding `sizingMode` from `useWizardStore` to this hook is the minimal required change to wire Phase 5 work

### File Created

`/Users/fjacquet/Projects/cluster-sizer/.planning/phases/05-specint-and-utilization-formula-engine/05-RESEARCH.md`

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | All packages already installed; versions confirmed |
| Architecture | HIGH | ADRs are authoritative design decisions; patterns verified in codebase |
| TypeScript Patterns | HIGH | Flags confirmed in tsconfig.app.json; patterns verified programmatically |
| Formula Math | HIGH | All fixture arithmetic verified computationally |
| Pitfalls | HIGH | Derived from direct inspection of existing code and TS flag behavior |

### Open Questions

- **existingServerCount naming:** Recommend `existingServerCount` over `serverCount` to distinguish from computed output fields
- **SPECint zero-guard:** Recommend `cpuLimitedCount = 0` when `targetSPECint <= 0` as defensive fallback (UI prevents this at form level)
- **Combined specint + utilization behavior:** Utilization percent fields are irrelevant in specint mode (specint replaces the entire CPU constraint formula); test should verify this non-interaction

### Ready for Planning

Research complete. Planner can now create PLAN.md files for Phase 5.
