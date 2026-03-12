# Phase 1: Foundation - Research

**Researched:** 2026-03-12
**Domain:** Pure TypeScript calculation engine, Zod schemas, Zustand state slices, Vitest test infrastructure
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Test Fixtures**
- No external reference spreadsheet — the PRD Figure 1 data was illustrative only; the app defines its own formulas from the spec
- Use hand-crafted fixtures that isolate each constraint: one CPU-limited case, one RAM-limited case, one disk-limited case
- Boundary/rounding edge cases must be explicitly tested — inputs designed to land near integer boundaries verify `Math.ceil()` correctness (pitfalls research flagged this as highest-risk formula bug)
- Tests live in Vitest; strict mode TS build must pass with zero errors

**Formula API Shape**
- Single exported function: `computeScenarioResult(cluster: OldCluster, scenario: Scenario): ScenarioResult`
- One call per scenario update returns the full result object (server counts per constraint, final count, limiting resource, utilization percentages)
- Internal helper functions per constraint (CPU/RAM/disk) are fine but are implementation details — only `computeScenarioResult` is the public contract
- Formula display strings (for CALC-07 inline rendering in UI) live in a **separate display module** (`src/lib/display/` or similar), not inside `src/lib/sizing/` — keeps pure math isolated from presentation concerns

**Type Definitions**
- Plain TypeScript numbers throughout — no branded types; TypeScript strict mode + descriptive field names (`totalVcpus`, `ramPerServerGb`) provide sufficient protection
- `OldCluster` and `Scenario` are `readonly` interfaces — all mutations go through Zustand actions to prevent accidental direct state mutation
- `ScenarioResult` is also readonly (derived, never mutated)

**Defaults Location**
- All industry defaults defined in a single constants file: `src/lib/sizing/defaults.ts`
- This file is the single source of truth — imported by Zod schemas and Zustand store initializer
- Each constant includes a rationale comment explaining why that value (e.g., `// 4:1 is VMware's general-purpose recommendation for mixed workloads — adjust for VDI or compute-heavy profiles`)
- Initial defaults: `DEFAULT_VCPU_TO_PCORE_RATIO = 4`, `DEFAULT_HEADROOM_PERCENT = 20`, `DEFAULT_HA_RESERVE_ENABLED = false`

### Claude's Discretion
- Internal file naming within `src/lib/sizing/` (e.g., `constraints.ts` vs `formulas.ts`)
- `parseNumericInput` helper implementation details
- Zustand slice naming conventions (as long as they match ARCHITECTURE.md's three-slice pattern)
- Exact Zod schema structure for validation (field-level rules beyond non-negative)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CALC-01 | CPU-limited server count: `ceil((totalVcpus × headroom) / targetVcpuToPCoreRatio / coresPerServer)` | Formula math section, floating-point pitfall mitigation |
| CALC-02 | RAM-limited server count: `ceil((totalVms × ramPerVmGb × headroom) / ramPerServerGb)` | Formula math section, NaN cascade mitigation |
| CALC-03 | Disk-limited server count: `ceil((totalVms × diskPerVmGb × headroom) / diskPerServerGb)` | Formula math section, same pattern as CALC-02 |
| CALC-04 | N+1 HA reserve: adds 1 to final server count when enabled | HA reserve as first-class formula parameter, separate from headroom % |
| CALC-05 | Final server count = max(cpuLimited, ramLimited, diskLimited); label limiting resource | `computeScenarioResult` public contract, `LimitingResource` type |
| CALC-06 | Achieved vCPU:pCore ratio, VMs/server, estimated CPU/RAM/disk utilization % | Derived metrics in `ScenarioResult`, verified in `useScenariosResults` hook |
| CALC-07 | Formula display strings per output value (for Phase 2 UI inline rendering) | Separate `src/lib/display/` module, keeps `src/lib/sizing/` pure |
</phase_requirements>

---

## Summary

Phase 1 establishes the correctness foundation for the entire application: pure TypeScript sizing formulas, Zod schemas, Zustand state slices, and a Vitest test suite. No UI is built in this phase. Every downstream phase depends on the math being verifiably correct before any component is connected to it.

The primary risk in this phase is numerical: floating-point drift in chained arithmetic can shift server counts by ±1 on boundary inputs, and NaN cascades from empty form fields corrupt all downstream output silently. Both must be addressed in the formula engine before any UI code touches it. Prior project research (PITFALLS.md, 2026-03-12) rates these as HIGH recovery cost if discovered post-UI.

The secondary risk is structural: the formula's public contract (`computeScenarioResult`) must be locked before Zustand slices and the `useScenariosResults` hook are written, because all three depend on the same `OldCluster`, `Scenario`, and `ScenarioResult` types. Type-first development is required.

**Primary recommendation:** Build in this order — types and interfaces → defaults constants → formula functions (with Vitest fixtures) → Zod schemas → Zustand slices → `useScenariosResults` hook → display module stubs. Each step is independently testable with a strict-mode TypeScript build as the gate.

---

## Standard Stack

### Core (Phase 1 scope)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ^5.9.3 | Static typing with `strict: true` | Strict mode catches null coercions and implicit `any` that silently break sizing formulas. Descriptive field names replace branded types. |
| Vite | ^7.3.1 | Build tooling and dev server | Produces pure static assets. Required as Vitest's host runtime — Vitest major version must match Vite major. |
| Vitest | ^4.0.18 | Unit test runner | Reuses Vite config — no separate babel/jest setup. Jest-compatible API. Required for formula correctness verification. |
| Zod | ^4.x | Schema validation + type inference | `z.infer<typeof schema>` eliminates duplicate type declarations. Use `z.preprocess` for numeric inputs — NOT `z.coerce.number()`. 14× faster than Zod v3. |
| Zustand | ^5.0.11 | Global state management | ~3KB, no provider wrap, uses `useSyncExternalStore`. Three narrow slices for wizard nav, cluster data, and scenarios. |

### Supporting (Phase 1 scope)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vitejs/plugin-react | ^5.1.4 | Vite–React integration | Required for Vitest component tests (even if Phase 1 has none). Install now to avoid config churn. |
| jsdom | latest | DOM environment for Vitest | Required by `@testing-library/react` for hook tests. Configure via `vitest.config.ts` `environment: 'jsdom'`. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand (3 slices) | Single large `useAppStore` | One giant store causes unrelated re-renders. The three-slice pattern is non-negotiable per architecture research. |
| `z.preprocess` for numerics | `z.coerce.number()` | `coerce.number()` converts empty string to `0`, hiding required-field violations. `preprocess` gives explicit control. |
| Vitest | Jest | Jest requires separate babel config. Vitest reuses Vite config — zero extra setup for a Vite project. |

**Installation (Phase 1 scope):**
```bash
npm create vite@latest cluster-sizer -- --template react-ts
cd cluster-sizer

# Runtime dependencies needed in Phase 1
npm install zod@^4 zustand@^5.0.11

# Dev dependencies for Phase 1 testing
npm install -D vitest@^4 jsdom
npm install -D typescript@^5.9.3
```

---

## Architecture Patterns

### Recommended Project Structure (Phase 1 scope)

```
src/
├── lib/
│   ├── sizing/
│   │   ├── defaults.ts        # Industry-standard constants (SINGLE source of truth)
│   │   ├── formulas.ts        # Pure math: serverCountByCpu, serverCountByRam, serverCountByDisk
│   │   ├── constraints.ts     # computeScenarioResult() — public formula API
│   │   └── derived.ts         # OldCluster derived metrics (vCPU:pCore ratio, VMs/server)
│   └── display/
│       └── formulaStrings.ts  # Formula display strings for CALC-07 (UI-facing, not pure math)
├── store/
│   ├── useWizardStore.ts      # Zustand: currentStep, navigation state
│   ├── useClusterStore.ts     # Zustand: OldCluster input values
│   └── useScenariosStore.ts   # Zustand: Scenario[] + CRUD actions
├── hooks/
│   └── useScenariosResults.ts # Derives ScenarioResult[] by calling computeScenarioResult
├── types/
│   ├── cluster.ts             # OldCluster, Scenario (readonly interfaces)
│   └── results.ts             # ScenarioResult (readonly, derived — never stored)
└── schemas/
    ├── currentClusterSchema.ts # Zod schema for OldCluster (non-negative validators)
    └── scenarioSchema.ts       # Zod schema for Scenario (with defaults applied)
```

### Pattern 1: Pure Calculation Layer

**What:** All sizing math lives in `src/lib/sizing/` as pure TypeScript functions. Zero React imports. Every function signature is `(inputs: TypedInputs) => number | ScenarioResult`.

**When to use:** Always, for every formula. This is the non-negotiable correctness pattern per the project constitution and CONTEXT.md.

**How to implement:**
```typescript
// src/lib/sizing/formulas.ts
// Intermediate values held at full precision; Math.ceil applied ONLY at final output.
// Source: ARCHITECTURE.md Pattern 1; PITFALLS.md Pitfall 1

export function serverCountByCpu(
  totalVcpus: number,
  growthHeadroomFactor: number,   // e.g. 1.20 for 20% headroom
  targetVcpuToPCoreRatio: number,
  coresPerServer: number
): number {
  const requiredVcpus = totalVcpus * growthHeadroomFactor;
  const requiredPcores = requiredVcpus / targetVcpuToPCoreRatio;
  return Math.ceil(requiredPcores / coresPerServer);
}

export function serverCountByRam(
  totalVms: number,
  ramPerVmGb: number,
  growthHeadroomFactor: number,
  ramPerServerGb: number
): number {
  return Math.ceil((totalVms * ramPerVmGb * growthHeadroomFactor) / ramPerServerGb);
}

export function serverCountByDisk(
  totalVms: number,
  diskPerVmGb: number,
  growthHeadroomFactor: number,
  diskPerServerGb: number
): number {
  return Math.ceil((totalVms * diskPerVmGb * growthHeadroomFactor) / diskPerServerGb);
}
```

**Critical note on headroom:** The REQUIREMENTS.md formulas express headroom as a multiplier inline (e.g., `totalVcpus × headroom`). The headroom factor must be `1 + (headroomPercent / 100)`, not just `headroomPercent / 100`. This is a common formula transcription error. Verified by deriving from CALC-01: if headroom is 20%, servers needed = ceil(vcpus * 1.20 / ratio / cores).

### Pattern 2: Public Formula Contract

**What:** `computeScenarioResult` is the single exported function that Phase 2+ code calls. Internal helpers (serverCountByCpu etc.) are not exported from `constraints.ts` — they are implementation details.

**Implementation:**
```typescript
// src/lib/sizing/constraints.ts
import { serverCountByCpu, serverCountByRam, serverCountByDisk } from './formulas';
import type { OldCluster, Scenario } from '../types/cluster';
import type { ScenarioResult } from '../types/results';

export function computeScenarioResult(
  cluster: Readonly<OldCluster>,
  scenario: Readonly<Scenario>
): Readonly<ScenarioResult> {
  const headroomFactor = 1 + scenario.headroomPercent / 100;
  const coresPerServer = scenario.socketsPerServer * scenario.coresPerSocket;

  const cpuCount = serverCountByCpu(
    cluster.totalVcpus,
    headroomFactor,
    scenario.targetVcpuToPCoreRatio,
    coresPerServer
  );
  const ramCount = serverCountByRam(
    cluster.totalVms,
    scenario.ramPerVmGb,
    headroomFactor,
    scenario.ramPerServerGb
  );
  const diskCount = serverCountByDisk(
    cluster.totalVms,
    scenario.diskPerVmGb,
    headroomFactor,
    scenario.diskPerServerGb
  );

  const rawCount = Math.max(cpuCount, ramCount, diskCount);
  const limitingResource = determineLimitingResource(cpuCount, ramCount, diskCount);
  const finalCount = scenario.haReserveEnabled ? rawCount + 1 : rawCount;

  return Object.freeze({
    cpuLimitedCount: cpuCount,
    ramLimitedCount: ramCount,
    diskLimitedCount: diskCount,
    rawCount,
    finalCount,
    limitingResource,
    haReserveApplied: scenario.haReserveEnabled,
    // CALC-06: utilization metrics
    achievedVcpuToPCoreRatio: cluster.totalVcpus / (finalCount * coresPerServer),
    vmsPerServer: cluster.totalVms / finalCount,
    cpuUtilizationPercent: (cluster.totalVcpus / scenario.targetVcpuToPCoreRatio / (finalCount * coresPerServer)) * 100,
    ramUtilizationPercent: (cluster.totalVms * scenario.ramPerVmGb / (finalCount * scenario.ramPerServerGb)) * 100,
    diskUtilizationPercent: (cluster.totalVms * scenario.diskPerVmGb / (finalCount * scenario.diskPerServerGb)) * 100,
  });
}
```

### Pattern 3: Zustand Three-Slice Pattern

**What:** Three narrow stores, each with a single concern. Components subscribe to the minimum store needed. No derived results stored — only raw inputs.

**Implementation:**
```typescript
// src/store/useClusterStore.ts
import { create } from 'zustand';
import type { OldCluster } from '../types/cluster';
import { DEFAULT_CLUSTER } from '../lib/sizing/defaults';

interface ClusterStore {
  currentCluster: OldCluster;
  setCurrentCluster: (cluster: OldCluster) => void;
  resetCluster: () => void;
}

export const useClusterStore = create<ClusterStore>((set) => ({
  currentCluster: DEFAULT_CLUSTER,
  setCurrentCluster: (cluster) => set({ currentCluster: cluster }),
  resetCluster: () => set({ currentCluster: DEFAULT_CLUSTER }),
}));
```

```typescript
// src/store/useScenariosStore.ts
import { create } from 'zustand';
import type { Scenario } from '../types/cluster';
import { createDefaultScenario } from '../lib/sizing/defaults';

interface ScenariosStore {
  scenarios: Scenario[];
  addScenario: () => void;
  duplicateScenario: (id: string) => void;
  removeScenario: (id: string) => void;
  updateScenario: (id: string, partial: Partial<Scenario>) => void;
}

export const useScenariosStore = create<ScenariosStore>((set) => ({
  scenarios: [createDefaultScenario()],
  addScenario: () => set((state) => ({
    scenarios: [...state.scenarios, createDefaultScenario()],
  })),
  duplicateScenario: (id) => set((state) => {
    const source = state.scenarios.find((s) => s.id === id);
    if (!source) return state;
    return { scenarios: [...state.scenarios, { ...source, id: crypto.randomUUID(), name: `${source.name} (copy)` }] };
  }),
  removeScenario: (id) => set((state) => ({
    scenarios: state.scenarios.filter((s) => s.id !== id),
  })),
  updateScenario: (id, partial) => set((state) => ({
    scenarios: state.scenarios.map((s) => s.id === id ? { ...s, ...partial } : s),
  })),
}));
```

### Pattern 4: `useScenariosResults` Hook

**What:** Derives `ScenarioResult[]` from store state on every render. Results are NEVER stored in Zustand — always computed on demand.

```typescript
// src/hooks/useScenariosResults.ts
import { useScenariosStore } from '../store/useScenariosStore';
import { useClusterStore } from '../store/useClusterStore';
import { computeScenarioResult } from '../lib/sizing/constraints';
import type { ScenarioResult } from '../types/results';

export function useScenariosResults(): ScenarioResult[] {
  const { scenarios } = useScenariosStore();
  const { currentCluster } = useClusterStore();
  return scenarios.map((scenario) => computeScenarioResult(currentCluster, scenario));
}
```

### Pattern 5: `parseNumericInput` Helper

**What:** All numeric form values must pass through this guard before reaching any formula. Prevents NaN cascade.

```typescript
// src/lib/sizing/parseNumericInput.ts
// Source: PITFALLS.md Pitfall 3; React issue #7779

/**
 * Parses a numeric form input value.
 * Returns null for empty, non-numeric, or negative-when-not-allowed strings.
 * Never passes NaN to formula functions.
 */
export function parseNumericInput(raw: string | number | undefined): number | null {
  if (raw === undefined || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseFloat(raw);
  if (!isFinite(n)) return null;
  return n;
}

export function parsePositiveInput(raw: string | number | undefined): number | null {
  const n = parseNumericInput(raw);
  return n !== null && n > 0 ? n : null;
}
```

### Pattern 6: Zod Schema with `z.preprocess`

**What:** Numeric fields use `z.preprocess` to convert empty strings to `undefined`, then validate as required numbers. Never use `z.coerce.number()` — it converts empty strings to `0`.

```typescript
// src/schemas/scenarioSchema.ts
import { z } from 'zod';
import { DEFAULT_VCPU_TO_PCORE_RATIO, DEFAULT_HEADROOM_PERCENT } from '../lib/sizing/defaults';

const numericPositive = z.preprocess(
  (val) => (val === '' || val === undefined ? undefined : Number(val)),
  z.number({ required_error: 'Required' }).positive('Must be greater than zero')
);

export const scenarioSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Scenario name is required'),
  socketsPerServer: numericPositive,
  coresPerSocket: numericPositive,
  ramPerServerGb: numericPositive,
  diskPerServerGb: numericPositive,
  targetVcpuToPCoreRatio: numericPositive.default(DEFAULT_VCPU_TO_PCORE_RATIO),
  ramPerVmGb: numericPositive,
  diskPerVmGb: numericPositive,
  headroomPercent: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number().min(0).max(100)
  ).default(DEFAULT_HEADROOM_PERCENT),
  haReserveEnabled: z.boolean().default(false),
});

export type Scenario = z.infer<typeof scenarioSchema>;
```

### Pattern 7: Defaults as Single Source of Truth

**What:** `src/lib/sizing/defaults.ts` is the sole source for all industry-standard values. Both Zod schema defaults and Zustand initial state import from this file.

```typescript
// src/lib/sizing/defaults.ts

// 4:1 is VMware's general-purpose recommendation for mixed workloads.
// Adjust for VDI-heavy (3:1) or compute-heavy profiles (2:1 or 1:1).
export const DEFAULT_VCPU_TO_PCORE_RATIO = 4;

// 20% headroom reserves capacity for workload spikes and growth buffer.
// A 20% headroom means the cluster runs at ~80% utilization under normal load.
export const DEFAULT_HEADROOM_PERCENT = 20;

// N+1 HA reserve is OFF by default — the headroom % already provides a
// performance buffer; the user opts in to explicit fault-tolerance reserve.
export const DEFAULT_HA_RESERVE_ENABLED = false;

export function createDefaultScenario(): import('../types/cluster').Scenario {
  return {
    id: crypto.randomUUID(),
    name: 'Scenario 1',
    socketsPerServer: 2,
    coresPerSocket: 16,
    ramPerServerGb: 512,
    diskPerServerGb: 10000,
    targetVcpuToPCoreRatio: DEFAULT_VCPU_TO_PCORE_RATIO,
    ramPerVmGb: 8,
    diskPerVmGb: 100,
    headroomPercent: DEFAULT_HEADROOM_PERCENT,
    haReserveEnabled: DEFAULT_HA_RESERVE_ENABLED,
  };
}
```

### Anti-Patterns to Avoid

- **Storing `ScenarioResult[]` in Zustand:** Creates two sources of truth; cache invalidation bugs guaranteed. Compute in `useScenariosResults` always.
- **Importing React in `src/lib/sizing/`:** Breaks testability and couples pure math to the render cycle. TypeScript will catch this if you configure path aliases correctly — enforce it with an ESLint rule: `no-restricted-imports` for React inside `lib/`.
- **`Math.round` for server counts:** Fundamentally wrong — server count is a ceiling problem because you cannot buy fractional servers. Always `Math.ceil`.
- **Applying `Math.ceil` to intermediates:** Only apply at the final output. Intermediate `Math.ceil` accumulates upward rounding errors that overstate the server count.
- **`z.coerce.number()` for numeric fields:** Silently converts empty string to `0`, hiding required-field violations. Use `z.preprocess` as shown above.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema validation with TypeScript type inference | Custom validator class | Zod v4 `z.infer<>` | Zod v4 handles empty-string-to-undefined, optional fields, default values, and TypeScript inference from a single definition |
| Global state with selective subscriptions | React Context + useReducer | Zustand v5 | Context triggers full subtree re-renders; Zustand components subscribe to exact slices needed |
| Test runner for pure TypeScript | Custom test scripts | Vitest | Vitest reuses Vite config — zero additional configuration for a Vite project; Jest-compatible API |
| UUID generation | Custom ID generator | `crypto.randomUUID()` | Built-in browser API (available in all modern browsers and Node.js 14.17+); no dependency needed |

**Key insight:** The formula layer is pure arithmetic — the "don't hand-roll" principle applies to infrastructure (validation, state, testing), not to the formulas themselves. The formulas ARE the product; implement them from scratch per REQUIREMENTS.md.

---

## Common Pitfalls

### Pitfall 1: Floating-Point Drift at Integer Boundaries (HIGHEST RISK)

**What goes wrong:** JavaScript IEEE 754 arithmetic accumulates tiny errors in chained operations. An intermediate result that should be `12.0` becomes `11.9999999999997`. `Math.ceil(11.9999999999997) = 12` — correct. But `Math.ceil(12.0000000000001) = 13` — wrong by 1. The error only manifests on boundary inputs (where the unrounded result is very close to an integer).

**Why it happens:** Developers apply `Math.ceil` to intermediate values (e.g., rounding required pCores before dividing by coresPerServer). Each intermediate rounding accumulates upward error.

**How to avoid:** Apply `Math.ceil` ONLY to the final server count per constraint. Carry all intermediates at full IEEE 754 precision. Use test fixtures with boundary inputs: e.g., `totalVcpus = 320, headroom = 1.0, ratio = 4, coresPerServer = 20` should yield exactly 4 servers. Check with tolerance `Math.abs(actual - expected) < 0.001` in tests.

**Warning signs:** Formula outputs differ from reference by exactly ±1 on specific inputs. Tests pass for round numbers but fail for fractional scenarios.

### Pitfall 2: NaN Cascade from Empty String Inputs

**What goes wrong:** `<input type="number">` returns `""` when empty. `parseFloat("") === NaN`. Any formula receiving `NaN` produces `NaN`. All downstream outputs show `NaN` or `Infinity` silently — no JavaScript error is thrown.

**Why it happens:** TypeScript types say `number` but the runtime value is `NaN`. `z.coerce.number()` converts `""` to `0`, masking the issue with wrong values instead.

**How to avoid:** All formula call sites must pass inputs through `parseNumericInput()` first. If the result is `null`, display `"—"` in the UI instead of calling the formula. Use `z.preprocess` not `z.coerce.number()` in Zod schemas. This is a Phase 1 requirement even though the form UI is not built yet — the `parseNumericInput` helper must exist and be tested before `computeScenarioResult` is wired to any form.

**Warning signs:** Any output shows `NaN`, `Infinity`, or `undefined` when any input is cleared.

### Pitfall 3: HA Reserve Conflated with Headroom Percent

**What goes wrong:** HA reserve (fault tolerance: 1 extra host survives a host failure) is conceptually different from headroom % (performance buffer: cluster runs at 80% utilization). Conflating them into a single % produces a cluster that is either over-provisioned (user sets 40% to cover both) or has no fault tolerance (user thinks 20% covers HA).

**How to avoid:** Keep them as separate formula parameters. The CONTEXT.md decision is clear: `DEFAULT_HA_RESERVE_ENABLED = false`, and when enabled, N+1 adds exactly 1 server AFTER the max-constraint resolution. The formula is:
```
rawCount = Math.max(cpuCount, ramCount, diskCount)
finalCount = haReserveEnabled ? rawCount + 1 : rawCount
```
CALC-04 is explicit: "adds 1 to the final server count after constraint resolution." The `+1` is not a percentage — it is a literal integer added to `rawCount`.

**Warning signs:** The HA toggle has no visible effect on output. Or HA is expressed as a percentage of the server count rather than a fixed +1.

### Pitfall 4: Headroom Factor Transcription Error

**What goes wrong:** REQUIREMENTS.md expresses headroom as `totalVcpus × headroom`. "Headroom" here means the TOTAL capacity needed including the buffer — i.e., `1 + (headroomPercent / 100)`. If the developer interprets it as `headroomPercent / 100` (the fraction only), the output is dramatically understated.

**How to avoid:** In `defaults.ts` and in all formula functions, explicitly name the parameter `growthHeadroomFactor` where `factor = 1 + (percent / 100)`. A 20% headroom means `factor = 1.20`. Include a unit test: with 20% headroom and all other inputs at round numbers, verify the output is ceiling of a value 20% larger than without headroom.

### Pitfall 5: Importing React into `src/lib/sizing/`

**What goes wrong:** A developer adds a `useState` or `useCallback` import to a formula file for convenience. The sizing lib is no longer a pure TypeScript module — it now requires a React render context to call. Vitest tests that called formula functions directly now need `renderHook` wrappers. The correctness foundation is polluted.

**How to avoid:** Add an ESLint `no-restricted-imports` rule scoped to `src/lib/`:
```json
{ "patterns": [{ "group": ["react", "react-dom"], "message": "src/lib must not import React" }] }
```
The TypeScript strict build will not catch this — ESLint must.

### Pitfall 6: `ScenarioResult` Stored in Zustand

**What goes wrong:** Caching computed results in the store creates stale-result bugs. When `OldCluster` changes (Step 1 edit), the cached `ScenarioResult[]` must be invalidated. Developers forget one invalidation path and the displayed results are stale without any error.

**How to avoid:** `ScenarioResult[]` is NEVER in any Zustand slice. `useScenariosResults()` computes it on every call. For the scale of this app (n ≤ 10 scenarios, pure arithmetic), synchronous computation is <1ms — no memoization needed.

---

## Code Examples

### Fixture-Based Unit Test Pattern

```typescript
// src/lib/sizing/__tests__/constraints.test.ts
import { describe, it, expect } from 'vitest';
import { computeScenarioResult } from '../constraints';
import type { OldCluster, Scenario } from '../../types/cluster';

// CPU-limited fixture: CPU constraint drives final count
const CPU_LIMITED_CLUSTER: OldCluster = {
  totalVcpus: 3200,
  totalVms: 100,
  totalPcores: 800,
};

const CPU_LIMITED_SCENARIO: Scenario = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'CPU-Limited',
  socketsPerServer: 2,
  coresPerSocket: 20,   // 40 physical cores per server
  ramPerServerGb: 1024,
  diskPerServerGb: 50000,
  targetVcpuToPCoreRatio: 4,
  ramPerVmGb: 2,        // 100 VMs × 2 GB = 200 GB RAM needed (1024 GB available)
  diskPerVmGb: 10,      // 100 VMs × 10 GB = 1000 GB disk needed (50000 GB available)
  headroomPercent: 20,
  haReserveEnabled: false,
};

// Manual verification:
// cpuCount = ceil(3200 * 1.20 / 4 / 40) = ceil(3840 / 4 / 40) = ceil(24) = 24
// ramCount = ceil(100 * 2 * 1.20 / 1024) = ceil(240 / 1024) = ceil(0.234) = 1
// diskCount = ceil(100 * 10 * 1.20 / 50000) = ceil(1200 / 50000) = ceil(0.024) = 1
// finalCount = max(24, 1, 1) = 24, limitingResource = 'cpu'

describe('computeScenarioResult', () => {
  it('CPU-limited: returns correct counts, limiting resource, and utilization', () => {
    const result = computeScenarioResult(CPU_LIMITED_CLUSTER, CPU_LIMITED_SCENARIO);
    expect(result.cpuLimitedCount).toBe(24);
    expect(result.ramLimitedCount).toBe(1);
    expect(result.diskLimitedCount).toBe(1);
    expect(result.finalCount).toBe(24);
    expect(result.limitingResource).toBe('cpu');
    expect(result.haReserveApplied).toBe(false);
  });

  it('boundary: ceil is applied ONLY at final step (floating-point safety)', () => {
    // Design: result should be exactly 24, not 23 or 25 due to FP drift
    const result = computeScenarioResult(CPU_LIMITED_CLUSTER, CPU_LIMITED_SCENARIO);
    expect(Math.abs(result.cpuLimitedCount - 24)).toBeLessThan(0.001);
  });
});
```

### TypeScript Type Definitions

```typescript
// src/types/cluster.ts
export interface OldCluster {
  readonly totalVcpus: number;
  readonly totalPcores: number;
  readonly totalVms: number;
  readonly totalDiskGb?: number;   // Optional — may not be available in all environments
  readonly socketsPerServer?: number;
  readonly coresPerSocket?: number;
  readonly ramPerServerGb?: number;
}

export interface Scenario {
  readonly id: string;
  readonly name: string;
  readonly socketsPerServer: number;
  readonly coresPerSocket: number;
  readonly ramPerServerGb: number;
  readonly diskPerServerGb: number;
  readonly targetVcpuToPCoreRatio: number;
  readonly ramPerVmGb: number;
  readonly diskPerVmGb: number;
  readonly headroomPercent: number;
  readonly haReserveEnabled: boolean;
}
```

```typescript
// src/types/results.ts
export type LimitingResource = 'cpu' | 'ram' | 'disk';

export interface ScenarioResult {
  readonly cpuLimitedCount: number;
  readonly ramLimitedCount: number;
  readonly diskLimitedCount: number;
  readonly rawCount: number;          // max(cpu, ram, disk) before HA
  readonly finalCount: number;        // rawCount + 1 if HA enabled
  readonly limitingResource: LimitingResource;
  readonly haReserveApplied: boolean;
  // CALC-06: utilization metrics
  readonly achievedVcpuToPCoreRatio: number;
  readonly vmsPerServer: number;
  readonly cpuUtilizationPercent: number;
  readonly ramUtilizationPercent: number;
  readonly diskUtilizationPercent: number;
}
```

### Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/sizing/**', 'src/store/**', 'src/hooks/**'],
    },
  },
});
```

### tsconfig.json (strict mode)

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "outDir": "dist",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"]
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Zod v3 `.parse()` for form validation | Zod v4 `z.preprocess()` + `z.infer<>` | Zod v4 (2024) | 14× faster, smaller bundle, better TypeScript inference |
| `z.coerce.number()` for numeric fields | `z.preprocess` with explicit empty-string check | Zod v4 best practice (2025) | Prevents silent `0` substitution for empty required fields |
| React Context for global state | Zustand v5 with `useSyncExternalStore` | Zustand v5 (2024) | Eliminates full-subtree re-renders on unrelated state changes |
| CRA (Create React App) | Vite 7 | CRA unmaintained 2023 | 10–100× faster builds, native ESM, no Webpack |
| Jest (standalone) | Vitest | 2022–2023 | Zero config for Vite projects; same API surface |

**Deprecated/outdated:**
- `z.coerce.number()` for required numeric inputs: causes silent `0` for empty fields — use `z.preprocess` always
- Enzyme: incompatible with React 19 — use `@testing-library/react` v16
- Storing derived `ScenarioResult` in Zustand: cache invalidation anti-pattern — compute on demand in hook

---

## Open Questions

1. **Headroom factor semantics — multiplication order**
   - What we know: REQUIREMENTS.md writes `ceil((totalVcpus × headroom) / ratio / cores)`. The intent from CONTEXT.md and PRD is that headroom is a growth buffer.
   - What's unclear: Does `headroom` in the formula mean the multiplicative factor (1.20) or the additive percentage (20)? The formula as written with `headroom = 1.20` matches the stated goal of "20% headroom."
   - Recommendation: Use factor = `1 + (headroomPercent / 100)`. Name the parameter `growthHeadroomFactor` in function signatures to make the convention explicit. Verify with the test fixture: `totalVcpus = 100, headroom = 20%, ratio = 4, coresPerServer = 5 → ceil(100 × 1.20 / 4 / 5) = ceil(6) = 6`. Document this in a code comment at the formula definition.

2. **`OldCluster` disk field availability**
   - What we know: CALC-03 requires `totalVms × diskPerVmGb`. The `diskPerVmGb` comes from the Scenario (target assumption), not from OldCluster. CALC-03 does not require a "total existing disk" field from OldCluster.
   - What's unclear: Is `diskPerVmGb` on the Scenario (target assumption for VM disk size) or derived from OldCluster (average current VM disk)?
   - Recommendation: Per REQUIREMENTS.md SCEN-03: "Each scenario's sizing assumptions include: ... disk per VM GB." Therefore `diskPerVmGb` belongs on `Scenario` as an assumption input, not on `OldCluster`. Implement accordingly.

3. **`crypto.randomUUID()` in Zustand store**
   - What we know: `crypto.randomUUID()` is available in all modern browsers and Node.js 14.17+.
   - What's unclear: Vitest runs tests in jsdom by default; jsdom supports `crypto.randomUUID()` since jsdom 20.
   - Recommendation: Use `crypto.randomUUID()` directly. If test failures occur due to jsdom version, add a simple mock: `vi.stubGlobal('crypto', { randomUUID: () => '00000000-...' })`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 |
| Config file | `vitest.config.ts` — Wave 0 (does not exist yet) |
| Quick run command | `npx vitest run src/lib/sizing/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CALC-01 | CPU-limited server count formula | unit | `npx vitest run src/lib/sizing/__tests__/formulas.test.ts` | ❌ Wave 0 |
| CALC-02 | RAM-limited server count formula | unit | `npx vitest run src/lib/sizing/__tests__/formulas.test.ts` | ❌ Wave 0 |
| CALC-03 | Disk-limited server count formula | unit | `npx vitest run src/lib/sizing/__tests__/formulas.test.ts` | ❌ Wave 0 |
| CALC-04 | N+1 HA reserve adds 1 to final count | unit | `npx vitest run src/lib/sizing/__tests__/constraints.test.ts` | ❌ Wave 0 |
| CALC-05 | Max-constraint selection + limiting resource label | unit | `npx vitest run src/lib/sizing/__tests__/constraints.test.ts` | ❌ Wave 0 |
| CALC-06 | Utilization %, vCPU:pCore ratio, VMs/server | unit | `npx vitest run src/lib/sizing/__tests__/constraints.test.ts` | ❌ Wave 0 |
| CALC-07 | Formula display strings (display module) | unit | `npx vitest run src/lib/display/__tests__/formulaStrings.test.ts` | ❌ Wave 0 |
| (cross-cutting) | `parseNumericInput` handles empty, zero, non-negative | unit | `npx vitest run src/lib/sizing/__tests__/parseNumericInput.test.ts` | ❌ Wave 0 |
| (cross-cutting) | `useScenariosResults` hook returns correct ScenarioResult[] | unit | `npx vitest run src/hooks/__tests__/useScenariosResults.test.ts` | ❌ Wave 0 |
| (cross-cutting) | TypeScript strict build passes | build | `npx tsc --noEmit` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/sizing/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green + `npx tsc --noEmit` zero errors before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `package.json` — project scaffolding (`npm create vite@latest`)
- [ ] `vitest.config.ts` — configure jsdom environment, globals, coverage
- [ ] `tsconfig.json` — strict mode with all flags listed above
- [ ] `src/lib/sizing/__tests__/formulas.test.ts` — CALC-01, CALC-02, CALC-03 with 3 fixture pairs (CPU-limited, RAM-limited, disk-limited) and boundary cases
- [ ] `src/lib/sizing/__tests__/constraints.test.ts` — CALC-04, CALC-05, CALC-06; tests for `computeScenarioResult` public API
- [ ] `src/lib/sizing/__tests__/parseNumericInput.test.ts` — empty string, zero, negative, non-numeric inputs
- [ ] `src/lib/display/__tests__/formulaStrings.test.ts` — CALC-07 display string format verification
- [ ] `src/hooks/__tests__/useScenariosResults.test.ts` — hook returns correct ScenarioResult[] for fixture inputs

---

## Sources

### Primary (HIGH confidence)

- `.planning/research/PITFALLS.md` (2026-03-12) — floating-point drift, NaN cascade, HA omission, uncontrolled inputs
- `.planning/research/ARCHITECTURE.md` (2026-03-12) — three-slice Zustand pattern, pure calc layer, `useScenariosResults` pattern
- `.planning/research/STACK.md` (2026-03-12) — all version numbers verified against npm registry March 2026
- `.planning/research/SUMMARY.md` (2026-03-12) — phase ordering rationale, Phase 1 scope definition
- `.planning/REQUIREMENTS.md` — canonical formula definitions (CALC-01 through CALC-07)
- `CLAUDE.md` — project constitution: strict TS, pure functions, no `any`, formulas in `src/lib/sizing/`

### Secondary (MEDIUM confidence)

- Zod v4 docs (https://zod.dev/v4) — `z.preprocess` vs `z.coerce.number()` behavior confirmed
- Zustand docs (https://zustand.docs.pmnd.rs/) — slice pattern, `useSyncExternalStore`
- React issue #7779 — `<input type="number">` empty string returns `""`
- Zod discussion #2814 — `coerce.number()` empty-string-to-zero behavior

### Tertiary (LOW confidence)

None — all critical claims supported by primary or secondary sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions confirmed against prior project research which was verified against npm registry March 2026
- Architecture: HIGH — patterns sourced from prior project research (ARCHITECTURE.md), which cited multiple production React multi-step form guides
- Formula correctness: HIGH — formulas are explicit in REQUIREMENTS.md; pitfall mitigations are grounded in primary sources (React issues, Zod issues, IEEE 754 behavior)
- Pitfalls: HIGH (formula/numeric), MEDIUM (structural/UX) — numeric pitfalls from primary sources; structural from architecture research

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (stable domain — TypeScript/Vitest/Zustand APIs do not change rapidly; Zod v4 is newly stable)
