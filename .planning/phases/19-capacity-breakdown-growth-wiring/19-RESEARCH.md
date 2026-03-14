# Phase 19: Capacity Breakdown & Growth Wiring - Research

**Researched:** 2026-03-14
**Domain:** TypeScript pure-function math, React hook derivation, formula display strings
**Confidence:** HIGH

## Summary

Phase 19 is a pure math and hook layer — no UI components, no new Zustand stores. The work
splits into two parallel tracks: (1) growth factor wiring into `computeScenarioResult`, and (2)
a new `computeVsanBreakdown` pure function plus a `useVsanBreakdowns` hook that mirrors the
established `useScenariosResults` derive-on-read pattern.

All infrastructure landed in Phase 18: `vsanFormulas.ts`, `vsanConstants.ts`, the updated
`constraints.ts` with vSAN branches, the extended `Scenario` interface with optional vSAN fields,
and 467 passing tests. Phase 19 adds three growth fields to `Scenario`, extends the constraints
pipeline with a growth pre-multiply step, defines `VsanCapacityBreakdown` / `ResourceBreakdown` /
`StorageBreakdown` types, implements the breakdown computation, and exposes it via a hook.

The invariant that anchors this phase is **Required + Spare + Excess = Total Configured** for
every row. Spare = Reserved (max-util buffer) + HA Reserve. This must hold for CPU, Memory, and
Storage before any code ships.

**Primary recommendation:** Implement in file order — types first (new file `src/types/breakdown.ts`),
then growth in `constraints.ts`, then `computeVsanBreakdown` in `src/lib/sizing/vsanBreakdown.ts`,
then `useVsanBreakdowns` hook — each with TDD unit tests before the production code.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CAP-01 | CPU capacity breakdown (VMs Required, vSAN Consumption, Total Required, Reserved, HA Reserve, Spare, Excess, Total Configured) in GHz | ResourceBreakdown type + computeVsanBreakdown function; uses finalCount, scenario.coresPerSocket, scenario.socketsPerServer, scenario.targetCpuFrequencyGhz |
| CAP-02 | Memory capacity breakdown in GiB — same row structure as CPU | ResourceBreakdown type; uses finalCount × ramPerServerGb, effective VM demand |
| CAP-03 | Storage breakdown (VMs Usable, Swap, Metadata, FTT Overhead, Total Raw Required, Slack Space, HA Reserve, Spare, Excess, Total Configured) in TiB | StorageBreakdown type extends ResourceBreakdown with extra raw/usable/ftt/slack fields |
| CAP-04 | HA Reserve for CPU/Memory = one host worth of capacity; for storage = 1/N of cluster raw capacity | Dedicated formula branch in computeVsanBreakdown |
| CAP-05 | Max Utilization Reserve = Required / maxUtilPercent × (1 - maxUtilPercent) | reservedMaxUtil field; depends on scenario.targetCpuUtilizationPercent / targetRamUtilizationPercent |
| CAP-06 | Excess = Total Configured - Required - Spare; invariant Required + Spare + Excess = Total | Enforced as assertion in tests |
| GROW-01 | Per-resource growth percentages on Scenario: cpuGrowthPercent, memoryGrowthPercent, storageGrowthPercent | Three new optional fields on Scenario interface; default 0 |
| GROW-02 | Growth applied as compound factor BEFORE overhead: effectiveDemand = baseDemand × (1 + growthPercent/100) | Pre-multiply in computeScenarioResult before CALC-01/02/03; NOT post-multiply on server count |
| GROW-03 | Growth fields default to 0% and are optional | `?? 0` null-coalescing in constraints.ts |
| GROW-04 | Growth factors shown in formula display strings when non-zero | Extend cpuFormulaString, ramFormulaString, diskFormulaString in display.ts |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript (strict) | 5.x | Type-safe interfaces for breakdown types | Project convention; `no any` rule |
| Vitest | 2.x | Unit tests for pure functions | Established test framework in this project |
| React (hooks) | 18.x | useVsanBreakdowns hook wiring to stores | Existing hook infrastructure |
| @testing-library/react | 16.x | renderHook for hook tests | Already used in useScenariosResults.test.ts |

### No New Dependencies
This phase requires zero new npm packages. All computation is pure TypeScript math. The hook
reads from existing Zustand stores.

## Architecture Patterns

### Recommended File Additions

```
src/
  types/
    breakdown.ts         # VsanCapacityBreakdown, ResourceBreakdown, StorageBreakdown (new)
  lib/sizing/
    vsanBreakdown.ts     # computeVsanBreakdown() pure function (new)
    __tests__/
      vsanBreakdown.test.ts   # TDD tests for breakdown computation (new)
  hooks/
    useVsanBreakdowns.ts      # React hook — derive-on-read, parallel to useScenariosResults (new)
    __tests__/
      useVsanBreakdowns.test.ts # renderHook tests (new)
```

### Files Modified
```
src/types/cluster.ts          # Add cpuGrowthPercent?, memoryGrowthPercent?, storageGrowthPercent? to Scenario
src/lib/sizing/constraints.ts # Apply growth pre-multiply before CALC-01/02/03
src/lib/sizing/display.ts     # Extend formula strings to show growth factor when non-zero
src/lib/sizing/__tests__/display.test.ts  # Tests for growth-annotated formula strings
src/lib/sizing/__tests__/constraints.test.ts  # Integration tests for growth wiring
```

### Pattern 1: Growth Pre-Multiply in constraints.ts

Growth is applied BEFORE any overhead or headroom calculation. The growth factor multiplies the
raw demand inputs — vCPUs, VM RAM demand, and VM storage demand.

```typescript
// Source: REQUIREMENTS.md GROW-02, ARCHITECTURE.md §5
// In computeScenarioResult, after effectiveVcpus/effectiveVmCount derivation:

const cpuGrowthFactor = 1 + (scenario.cpuGrowthPercent ?? 0) / 100;
const memGrowthFactor = 1 + (scenario.memoryGrowthPercent ?? 0) / 100;
const storageGrowthFactor = 1 + (scenario.storageGrowthPercent ?? 0) / 100;

// Then pass effective grown values into CALC-01/02/03:
const grownVcpus = effectiveVcpus * cpuGrowthFactor;
// RAM growth applied to ramPerVmGb demand (or total VM RAM demand)
// Storage growth applied to diskPerVmGb demand
```

**Critical placement:** Growth multiplies demand; headroomFactor (existing) multiplies after growth.
The effective pipeline per resource is: `demand × growthFactor × headroomFactor`.

Growth is conceptually distinct from headroom:
- **Growth** = planned future increase (e.g., 20% more VMs over 3 years)
- **Headroom** = operational buffer for spikes (e.g., 20% runway at any time)

They stack multiplicatively: `effectiveDemand = base × (1 + growth/100) × (1 + headroom/100)`.

### Pattern 2: ResourceBreakdown Type

```typescript
// Source: ARCHITECTURE.md §2, FEATURES.md Capacity Breakdown Table
// src/types/breakdown.ts

interface ResourceBreakdown {
  readonly vmsRequired: number;       // demand from VMs (after growth)
  readonly vsanConsumption: number;   // vSAN overhead contribution
  readonly required: number;          // vmsRequired + vsanConsumption
  readonly reservedMaxUtil: number;   // Required / maxUtilPct * (1 - maxUtilPct)
  readonly haReserve: number;         // one host worth of capacity
  readonly spare: number;             // reservedMaxUtil + haReserve
  readonly excess: number;            // total - required - spare
  readonly total: number;             // nodes * capacityPerNode
}

interface StorageBreakdown extends ResourceBreakdown {
  readonly usableRequired: number;    // VM usable storage demand
  readonly rawRequired: number;       // after FTT multiplier + metadata
  readonly fttOverhead: number;       // rawRequired - effectiveUsable (the extra due to FTT)
  readonly slackSpace: number;        // slack reserve in GiB
}

interface VsanCapacityBreakdown {
  readonly scenarioId: string;        // link back to the scenario
  readonly cpu: ResourceBreakdown;
  readonly memory: ResourceBreakdown;
  readonly storage: StorageBreakdown;
  readonly minNodesByConstraint: Record<string, number>; // for Phase 21 chart
}
```

### Pattern 3: CPU Breakdown Formulas (CAP-01, CAP-04, CAP-05, CAP-06)

```typescript
// Source: FEATURES.md CPU Breakdown table
// All values in GHz

const coresPerServer = scenario.socketsPerServer * scenario.coresPerSocket;
const nodeGhz = coresPerServer * (scenario.targetCpuFrequencyGhz ?? 1);
const totalConfiguredGhz = result.finalCount * nodeGhz;

// vSAN consumption: overhead% of total configured GHz
const vsanCpuOverheadPct = scenario.vsanCpuOverheadPercent ?? VSAN_DEFAULT_CPU_OVERHEAD_PCT;
const vsanConsumptionGhz = scenario.vsanFttPolicy
  ? totalConfiguredGhz * (vsanCpuOverheadPct / 100)
  : 0;

// VM demand (after growth, before headroom — this is the "required" demand to plan for)
// Note: vmsRequired here is the DEMAND, not the scaled capacity
const vmsRequiredGhz = grownVcpus * (cpuUtilPct / 100) * (scenario.targetCpuFrequencyGhz ?? 1) / coresPerServer * coresPerServer;
// Simplification: required = demand the cluster was sized to handle
const requiredGhz = vmsRequiredGhz + vsanConsumptionGhz;

// Max utilization reserve (CAP-05)
const maxUtilFraction = (scenario.targetCpuUtilizationPercent ?? 100) / 100;
const reservedMaxUtilGhz = requiredGhz / maxUtilFraction * (1 - maxUtilFraction);

// HA reserve (CAP-04): one host worth of CPU capacity
const haReserveGhz = nodeGhz;

const spareGhz = reservedMaxUtilGhz + haReserveGhz;
const excessGhz = totalConfiguredGhz - requiredGhz - spareGhz;
// Invariant: requiredGhz + spareGhz + excessGhz === totalConfiguredGhz (CAP-06)
```

**Key design decision for CPU "vmsRequired" calculation:** The breakdown's `vmsRequired` is the
demand in GHz that was fed into sizing. For GHz sizing mode this is straightforward. For vCPU
sizing mode (the common case), convert: `vmsRequiredGhz = grownVcpus * freqGhz`. The sizing
mode affects how the cluster was built but the breakdown always shows GHz values.

### Pattern 4: Memory Breakdown Formulas (CAP-02)

```typescript
// Source: FEATURES.md Memory Breakdown table
// All values in GiB (Scenario.ramPerServerGb treated as GiB per VSAN-10)

const totalConfiguredGib = result.finalCount * scenario.ramPerServerGb;

// vSAN consumption: nodes * memPerHost (CAP-02)
const vsanMemGib = scenario.vsanFttPolicy
  ? result.finalCount * (scenario.vsanMemoryPerHostGb ?? VSAN_DEFAULT_MEMORY_PER_HOST_GB)
  : 0;

// VM demand (after growth)
const vmsRequiredGib = grownVmCount * scenario.ramPerVmGb * (ramUtilPct / 100);

const requiredGib = vmsRequiredGib + vsanMemGib;
const maxUtilFraction = (scenario.targetRamUtilizationPercent ?? 100) / 100;
const reservedMaxUtilGib = requiredGib / maxUtilFraction * (1 - maxUtilFraction);
const haReserveGib = scenario.ramPerServerGb;   // one host worth
const spareGib = reservedMaxUtilGib + haReserveGib;
const excessGib = totalConfiguredGib - requiredGib - spareGib;
```

### Pattern 5: Storage Breakdown Formulas (CAP-03)

```typescript
// Source: FEATURES.md Storage Breakdown table, vsanFormulas.ts pipeline
// All values in GiB internally; display layer converts >1024 GiB to TiB (VSAN-10)

const totalConfiguredGib = result.finalCount * scenario.diskPerServerGb;

// Non-vSAN fallback: simple breakdown without FTT/slack rows
if (!scenario.vsanFttPolicy) {
  const usableRequired = grownVmCount * scenario.diskPerVmGb;
  const haReserveGib = scenario.diskPerServerGb;  // one host worth
  const spare = haReserveGib;
  const excess = totalConfiguredGib - usableRequired - spare;
  // rawRequired = usableRequired (no FTT overhead)
  // ...
}

// vSAN path:
const usableRequired = grownVmCount * scenario.diskPerVmGb;
// Use computeVsanStorageRaw to get rawRequired (already tested in Phase 18)
const rawRequired = computeVsanStorageRaw({
  usableGib: usableRequired,
  fttPolicy: scenario.vsanFttPolicy,
  compressionFactor: scenario.vsanCompressionFactor,
  vmSwapEnabled: scenario.vsanVmSwapEnabled,
  totalVmRamGib: grownVmCount * scenario.ramPerVmGb,
  slackPercent: scenario.vsanSlackPercent,
});

// Decompose rawRequired back to components for display rows
const compressionFactor = Math.max(scenario.vsanCompressionFactor ?? 1.0, 1.0);
const effectiveUsable = usableRequired / compressionFactor;
const policy = FTT_POLICY_MAP[scenario.vsanFttPolicy];
const afterFtt = effectiveUsable * policy.multiplier;
const fttOverhead = afterFtt - effectiveUsable;  // the extra copies
const metadata = usableRequired * VSAN_METADATA_OVERHEAD_RATIO;
const rawBeforeSlack = afterFtt + metadata;
const slackFraction = (scenario.vsanSlackPercent ?? VSAN_DEFAULT_SLACK_PERCENT) / 100;
const slackSpace = rawRequired - rawBeforeSlack;  // = rawRequired * slackFraction / (1-slackFraction) effectively

// HA reserve for storage (CAP-04): 1/N of cluster raw capacity
const haReserveGib = totalConfiguredGib / result.finalCount;  // one host worth of raw

const spare = slackSpace + haReserveGib;
const excess = totalConfiguredGib - rawRequired - spare;
```

**Important:** `computeVsanStorageRaw` is reused directly — do NOT re-implement the pipeline.
The breakdown decomposes the output of that function, not recalculates independently.

### Pattern 6: useVsanBreakdowns Hook

Mirror the `useScenariosResults` pattern exactly.

```typescript
// Source: useScenariosResults.ts (existing) — mirror this exact structure
// src/hooks/useVsanBreakdowns.ts

import { useClusterStore } from '../store/useClusterStore';
import { useScenariosStore } from '../store/useScenariosStore';
import { useWizardStore } from '../store/useWizardStore';
import { computeScenarioResult } from '../lib/sizing/constraints';
import { computeVsanBreakdown } from '../lib/sizing/vsanBreakdown';
import type { VsanCapacityBreakdown } from '../types/breakdown';

export function useVsanBreakdowns(): readonly VsanCapacityBreakdown[] {
  const currentCluster = useClusterStore((state) => state.currentCluster);
  const scenarios = useScenariosStore((state) => state.scenarios);
  const sizingMode = useWizardStore((state) => state.sizingMode);
  const layoutMode = useWizardStore((state) => state.layoutMode);

  return scenarios.map((scenario) => {
    const result = computeScenarioResult(currentCluster, scenario, sizingMode, layoutMode);
    return computeVsanBreakdown(currentCluster, scenario, result);
  });
}
```

`computeScenarioResult` is called INSIDE the hook (not re-imported from results) because
`useVsanBreakdowns` needs both the result AND the breakdown in a single pass. The `useScenariosResults`
hook remains unchanged.

### Pattern 7: Formula Display Strings with Growth (GROW-04)

Extend existing `display.ts` functions to optionally annotate when growth is non-zero.

```typescript
// Source: display.ts existing pattern — additive annotation
// Extend CpuFormulaParams, RamFormulaParams, DiskFormulaParams to accept optional growthPercent

// Example: cpu formula with 20% growth
// Without growth: "ceil(2000 × 120% / 4 / 48)"
// With 20% growth: "ceil(2000 × 120% × +20% growth / 4 / 48)"

export interface CpuFormulaParams {
  // ... existing fields ...
  readonly cpuGrowthPercent?: number;   // new
}

export function cpuFormulaString(params: CpuFormulaParams): string {
  const growthSuffix = (params.cpuGrowthPercent ?? 0) !== 0
    ? ` × +${params.cpuGrowthPercent}% growth`
    : '';
  // insert growthSuffix after the headroomDisplay factor
}
```

### Anti-Patterns to Avoid

- **Storing breakdowns in Zustand:** Breakdowns are derive-on-read only — never cached in state
- **Re-implementing the storage pipeline:** Always call `computeVsanStorageRaw()` from `vsanFormulas.ts`; only decompose its result
- **Rounding intermediate values:** Math.ceil is only for server counts; breakdown values are floating-point
- **Ignoring the invariant:** Every test for breakdowns must assert `required + spare + excess ≈ total`
- **Growth on server count (post-multiply):** Growth multiplies DEMAND inputs, not the final server count
- **Different growth in breakdown vs constraints:** Both must use the same `(1 + growth/100)` factor so breakdown rows are consistent with the server count that was computed

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| vSAN storage raw calculation | Custom re-implementation | `computeVsanStorageRaw()` from vsanFormulas.ts | Already unit-tested in Phase 18; re-use avoids drift |
| FTT multiplier lookup | Inline constants | `FTT_POLICY_MAP` from vsanConstants.ts | Single source of truth; multiplier values already verified |
| vSAN overhead defaults | Hardcoded numbers | `VSAN_DEFAULT_*` constants from vsanConstants.ts | Centralized and re-exported from defaults.ts |
| React state for computed values | New Zustand store | Derive-on-read hook | Project pattern: derived data is never stored |

## Common Pitfalls

### Pitfall 1: Growth Applied in Wrong Location
**What goes wrong:** Growth multiplied after headroom, or after vSAN overhead deduction, producing wrong demand figures.
**Why it happens:** The pipeline in `computeScenarioResult` has multiple transforms; it is easy to insert growth at the end.
**How to avoid:** Growth factor must be the FIRST transform on raw demand inputs, before headroomFactor multiplication and before any overhead deduction. Test: scenario with 20% growth must produce the same result as scaling up the cluster's `totalVcpus` by 1.2 before passing to the formula.
**Warning signs:** GROW-02 test passes but server count with growth equals server count without growth.

### Pitfall 2: Breakdown Invariant Violation (CAP-06)
**What goes wrong:** `excess` becomes negative when demand + spare > total (over-provisioned demand).
**Why it happens:** The breakdown is reporting demand that exceeds capacity — a valid edge case. Excess can be negative (it means the cluster is undersized for that combined demand + spare target).
**How to avoid:** Do not clamp excess to zero. Report the real number; the UI layer (Phase 21) can highlight negatives in red. Tests must allow negative excess but always assert the invariant holds.
**Warning signs:** Clamping `excess = Math.max(0, ...)` silently breaks invariant tests.

### Pitfall 3: HA Reserve Definition Difference for Storage (CAP-04)
**What goes wrong:** Using "one host raw storage capacity" uniformly for all three resources.
**Why it happens:** CAP-04 says HA Reserve for storage = 1/N of cluster raw capacity = one host's raw storage. For a uniform cluster this equals `totalConfigured / finalCount = diskPerServerGb` — same formula, but the semantic grounding is different.
**How to avoid:** Implement as `haReserveStorageGib = totalConfiguredGib / result.finalCount` (cluster fraction), not `scenario.diskPerServerGb` (node config). They produce the same number for HCI but the fraction form is semantically correct.

### Pitfall 4: Scenario Without vSAN Fields
**What goes wrong:** `computeVsanBreakdown` throws or returns NaN when `vsanFttPolicy` is absent.
**Why it happens:** Code paths assume vSAN fields are present.
**How to avoid:** All vSAN fields use `?? default` defensively. Storage breakdown falls back to the non-vSAN path (simple usable demand, no FTT/slack rows). The `vsanConsumption` in CPU/Memory breakdowns is 0 when `vsanFttPolicy` is absent. Tests MUST include a scenario with no vSAN fields.

### Pitfall 5: Confusion Between GiB and GB
**What goes wrong:** Storage values in GB (SI) mixed with GiB (binary) produces 7% errors.
**Why it happens:** `Scenario.ramPerServerGb` and `diskPerServerGb` use "GB" in field names but per VSAN-10 all storage is treated as GiB internally.
**How to avoid:** Follow VSAN-10: treat all storage fields as GiB. Only convert to TiB for display. In breakdown tests, use round numbers (e.g., 1024 GiB = 1 TiB) to make expected values obvious.

### Pitfall 6: computeVsanBreakdown Signature Coupling
**What goes wrong:** `computeVsanBreakdown` recomputes the scenario result internally, drifting from what `computeScenarioResult` already produced.
**Why it happens:** Temptation to make breakdown self-contained.
**How to avoid:** The signature is `computeVsanBreakdown(cluster, scenario, result)` — it accepts the pre-computed `ScenarioResult` as a parameter. The hook calls `computeScenarioResult` first, then passes the result in. This ensures the breakdown rows are consistent with the server count displayed elsewhere.

## Code Examples

### Growth Wiring in constraints.ts

```typescript
// Source: ARCHITECTURE.md §5, REQUIREMENTS.md GROW-02
// Insert immediately after effectiveVcpus and effectiveVmCount derivation

const cpuGrowthFactor    = 1 + (scenario.cpuGrowthPercent    ?? 0) / 100;
const memGrowthFactor    = 1 + (scenario.memoryGrowthPercent ?? 0) / 100;
const storageGrowthFactor = 1 + (scenario.storageGrowthPercent ?? 0) / 100;

// Apply to demand inputs (BEFORE headroomFactor and BEFORE overhead)
const grownVcpus      = effectiveVcpus * cpuGrowthFactor;
const grownRamPerVmGb = scenario.ramPerVmGb * memGrowthFactor;
const grownDiskPerVmGb = scenario.diskPerVmGb * storageGrowthFactor;

// Then use grownVcpus / grownRamPerVmGb / grownDiskPerVmGb in CALC-01/02/03
```

### Breakdown Invariant Test Pattern

```typescript
// Source: REQUIREMENTS.md CAP-06 — test pattern to enforce invariant
it('invariant: required + spare + excess === total for CPU breakdown', () => {
  const breakdown = computeVsanBreakdown(cluster, scenario, result);
  const { required, spare, excess, total } = breakdown.cpu;
  expect(required + spare + excess).toBeCloseTo(total, 6);
});
```

### useVsanBreakdowns Test Pattern

```typescript
// Source: useScenariosResults.test.ts — mirror the renderHook pattern
import { renderHook, act } from '@testing-library/react';
import { useVsanBreakdowns } from '../useVsanBreakdowns';

it('returns empty array when no scenarios in store', () => {
  const { result } = renderHook(() => useVsanBreakdowns());
  expect(result.current).toEqual([]);
});

it('returns one VsanCapacityBreakdown per scenario', () => {
  act(() => {
    useScenariosStore.setState({ scenarios: [SOME_SCENARIO] });
    useClusterStore.setState({ currentCluster: SOME_CLUSTER });
  });
  const { result } = renderHook(() => useVsanBreakdowns());
  expect(result.current).toHaveLength(1);
  expect(result.current[0]).toHaveProperty('cpu');
  expect(result.current[0]).toHaveProperty('memory');
  expect(result.current[0]).toHaveProperty('storage');
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single headroom factor for all demand | Separate growth + headroom factors, multiplicatively stacked | Phase 19 | Growth factors now visible in formula strings; demand can be projected independently of buffer |
| No capacity breakdown (only server counts) | Full ResourceBreakdown + StorageBreakdown with invariant | Phase 19 | Enables Phase 21 stacked capacity charts |
| vSAN absent = crash | vSAN absent = legacy sizing path | Phase 18 | Existing scenarios unaffected |

## Open Questions

1. **CPU "vmsRequired" in GHz sizing mode vs vCPU mode**
   - What we know: ResourceBreakdown.vmsRequired is documented as GHz. In GHz mode this is natural. In vCPU mode, demand was sized by vCPU ratios not GHz.
   - What's unclear: Should `vmsRequired` be `grownVcpus × freqGhz` in vCPU mode even though that is not how the cluster was sized?
   - Recommendation: Yes — the breakdown is a reporting view in consistent units (GHz). Use `grownVcpus × (scenario.targetCpuFrequencyGhz ?? 1)` as a proxy. Flag this in code comments. If `targetCpuFrequencyGhz` is absent, breakdown rows for CPU will be 0 (reasonable; vCPU mode doesn't have a GHz story).

2. **Breakdown for non-HCI (disaggregated) layout**
   - What we know: In disaggregated mode, `diskLimitedCount = 0` and storage is external. The storage breakdown would show Total Configured = 0.
   - What's unclear: Should `computeVsanBreakdown` return a null/empty StorageBreakdown for disaggregated?
   - Recommendation: Return a zeroed-out StorageBreakdown (all fields = 0) rather than making the return type nullable. The hook consumers (Phase 21 charts) can skip rendering zero-total breakdowns.

## Sources

### Primary (HIGH confidence)
- `src/lib/sizing/vsanConstants.ts` — FTT_POLICY_MAP, overhead constants (just read)
- `src/lib/sizing/vsanFormulas.ts` — computeVsanStorageRaw, signature, 5-step pipeline (just read)
- `src/lib/sizing/constraints.ts` — computeScenarioResult, growth insertion point identified (just read)
- `src/lib/sizing/display.ts` — existing formula string pattern, extension points (just read)
- `src/hooks/useScenariosResults.ts` — hook structure to mirror (just read)
- `src/types/cluster.ts` — Scenario interface, existing vSAN fields (just read)
- `src/types/results.ts` — ScenarioResult interface (just read)
- `.planning/REQUIREMENTS.md` — CAP-01 through CAP-06, GROW-01 through GROW-04 (just read)
- `.planning/research/FEATURES.md` — Capacity breakdown table rows and formulas (just read)
- `.planning/research/ARCHITECTURE.md` — VsanCapacityBreakdown type, hook pattern (just read)

### Secondary (MEDIUM confidence)
- `.planning/ROADMAP.md` Phase 19 success criteria — cross-checked invariant and HA reserve definitions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies; all computation is pure TypeScript on established patterns
- Architecture: HIGH — hook pattern is an exact mirror of useScenariosResults; type shapes come directly from ARCHITECTURE.md + FEATURES.md research documents
- Pitfalls: HIGH — growth placement and breakdown invariant are verified by reading the actual formulas in constraints.ts and vsanFormulas.ts
- Formula specifics: HIGH — all formulas sourced from existing code (computeVsanStorageRaw, FTT_POLICY_MAP) plus FEATURES.md breakdown table; cross-checked

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (stable domain; no external dependencies to go stale)
