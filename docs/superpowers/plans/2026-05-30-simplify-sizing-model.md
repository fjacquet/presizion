# Sub-project A — Feature Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse presizion's sizing surface to 2 modes + 2 buffers, make observed utilization a required (blocking) input, seed scenarios from import data, and tuck remaining advanced knobs behind a disclosure — without breaking saved sessions.

**Architecture:** Work bottom-up. Pure sizing functions first (`formulas.ts`, `constraints.ts`), then the data model (`types`, `defaults`, schemas), then state + persistence migration, then the UI (mode toggle, scenario card, Step 1 utilization gate), then consumer cleanup (display/export/clipboard) and full-suite green. TDD on every pure function; component tests via React Testing Library.

**Tech Stack:** React 19 + TS strict, Zustand v5, Zod, Vitest + RTL. Run tests with `rtk vitest run` (token-optimized).

**Key model decisions locked here:**
- `SizingMode = 'vcpu' | 'performance'`. `performance` = GHz-primary; uses `serverCountBySpecint` only when a SPEC override is present, else `serverCountByGhz`.
- Demand factor everywhere = `(1 + growthPercent/100) × (1 + safetyPercent/100)`, applied uniformly to all constraints (including SPEC/GHz). Replaces `headroomPercent`, per-resource growth, and target-util divisions.
- `LimitingResource` union is **unchanged** (`'cpu'|'ram'|'disk'|'specint'|'ghz'`) — it labels the limiting *resource*, independent of mode.
- Observed utilization (`cpuUtilizationPercent`, `ramUtilizationPercent`) stays **optional in the storage/`OldCluster` type** (so legacy sessions still load) but is **required at the Step 1 form + enforced by a navigation/results gate** (`isClusterSizingReady`). This is a deliberate deviation from the spec's "required in the type": making it required in the type would make legacy session loads fail schema validation and silently drop the user's whole session. Blocking is enforced where it matters (form + navigation), not in storage.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/lib/sizing/formulas.ts` | Pure per-constraint server-count math | Remove `serverCountByCpuAggressive` |
| `src/store/useWizardStore.ts` | `SizingMode` type + mode state | 4→2 mode union |
| `src/lib/sizing/constraints.ts` | Orchestrates the result | 2-mode dispatch, unified demand factor, SPEC-vs-GHz branch |
| `src/types/cluster.ts` | `Scenario` / `OldCluster` shapes | +`growthPercent`/`safetyPercent`, − dropped fields |
| `src/lib/sizing/defaults.ts` | Default constants + `createDefaultScenario` | new buffer defaults, drop target-util consts |
| `src/lib/sizing/clusterReadiness.ts` | **New** — `isClusterSizingReady` gate | create |
| `src/schemas/scenarioSchema.ts` | Scenario form validation | new buffer fields, drop dropped fields |
| `src/schemas/currentClusterFormSchema.ts` | **New** — Step 1 form schema, util required | create |
| `src/schemas/currentClusterSchema.ts` | Storage schema (util optional) | unchanged (kept lenient) |
| `src/lib/utils/persistence.ts` | Session (de)serialize + migration | version bump, scenario+mode migration |
| `src/store/useScenariosStore.ts` | Scenario list + seeding | extend `seedFromCluster` with ratio/growth/safety |
| `src/components/wizard/SizingModeToggle.tsx` | Mode UI | 2 modes |
| `src/components/step2/ScenarioCard.tsx` | Scenario form UI | buffers, performance inputs, Advanced disclosure, rationale banner |
| `src/components/step1/CurrentClusterForm.tsx` | Step 1 form | required util + guidance + stretch caveat |
| `src/components/wizard/WizardShell.tsx` (or nav) | Step gating | block Step 2/3 until ready |
| `src/lib/sizing/display.ts` | Formula strings | drop per-resource-growth/headroom params → growth/safety |
| `src/lib/utils/{export,exportPdf,exportPptx,clipboard}.ts` | Exports | rename headroom→safety, drop dropped fields |
| `src/lib/utils/import/jsonParser.ts` | JSON session import | tolerate/migrate old scenario fields |

---

## Phase 1 — Sizing logic (pure, TDD)

### Task 1: Remove Aggressive mode + shrink SizingMode

**Files:**
- Modify: `src/lib/sizing/formulas.ts` (remove `serverCountByCpuAggressive`, lines ~119-143)
- Modify: `src/store/useWizardStore.ts:10`
- Test: `src/lib/sizing/__tests__/formulas.test.ts` (remove aggressive cases), `src/store/__tests__/useWizardStore.test.ts`

- [ ] **Step 1: Update the SizingMode union test**

In `src/store/__tests__/useWizardStore.test.ts`, replace any test asserting `'specint'|'aggressive'|'ghz'` are settable with:

```ts
it('only allows vcpu and performance modes', () => {
  const { setSizingMode } = useWizardStore.getState()
  setSizingMode('performance')
  expect(useWizardStore.getState().sizingMode).toBe('performance')
  setSizingMode('vcpu')
  expect(useWizardStore.getState().sizingMode).toBe('vcpu')
})
```

- [ ] **Step 2: Run it — expect TS/type failure**

Run: `rtk vitest run src/store/__tests__/useWizardStore.test.ts`
Expected: FAIL (type error: `'performance'` not assignable to old union).

- [ ] **Step 3: Shrink the union**

In `src/store/useWizardStore.ts` replace lines 3-10:

```ts
/**
 * Controls which CPU/performance formula drives CALC-01.
 * - 'vcpu':        vCPU:pCore ratio hard cap (default)
 * - 'performance': new-vs-old per-core performance (GHz-primary, SPEC-optional)
 */
export type SizingMode = 'vcpu' | 'performance';
```

And default stays `sizingMode: 'vcpu'` (line 43 — unchanged).

- [ ] **Step 4: Delete the aggressive formula**

In `src/lib/sizing/formulas.ts` delete the entire `serverCountByCpuAggressive` function (the block documented "CALC-01-AGG", ~lines 119-143). Leave `serverCountByCpu`, `serverCountByRam`, `serverCountByDisk`, `serverCountBySpecint`, `serverCountByGhz`.

- [ ] **Step 5: Remove aggressive formula tests**

In `src/lib/sizing/__tests__/formulas.test.ts`, delete every `describe`/`it` referencing `serverCountByCpuAggressive`.

- [ ] **Step 6: Run tests**

Run: `rtk vitest run src/lib/sizing/__tests__/formulas.test.ts src/store/__tests__/useWizardStore.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
rtk git add src/lib/sizing/formulas.ts src/store/useWizardStore.ts src/lib/sizing/__tests__/formulas.test.ts src/store/__tests__/useWizardStore.test.ts
rtk git commit -m "refactor(sizing): remove aggressive mode, shrink SizingMode to vcpu|performance"
```

---

### Task 2: Two-knob demand factor in the Scenario type + defaults

**Files:**
- Modify: `src/types/cluster.ts:29-61`
- Modify: `src/lib/sizing/defaults.ts`
- Test: `src/lib/sizing/__tests__/defaults.test.ts`

- [ ] **Step 1: Write the defaults test**

In `src/lib/sizing/__tests__/defaults.test.ts` add:

```ts
import { createDefaultScenario, DEFAULT_GROWTH_PERCENT, DEFAULT_SAFETY_PERCENT } from '../defaults'

it('seeds new buffer model defaults', () => {
  expect(DEFAULT_GROWTH_PERCENT).toBe(0)
  expect(DEFAULT_SAFETY_PERCENT).toBe(20)
  const s = createDefaultScenario()
  expect(s.growthPercent).toBe(0)
  expect(s.safetyPercent).toBe(20)
  // dropped fields must be gone
  expect('headroomPercent' in s).toBe(false)
  expect('targetCpuUtilizationPercent' in s).toBe(false)
  expect('cpuGrowthPercent' in s).toBe(false)
  expect('targetVmCount' in s).toBe(false)
})
```

- [ ] **Step 2: Run it — expect fail**

Run: `rtk vitest run src/lib/sizing/__tests__/defaults.test.ts`
Expected: FAIL (`DEFAULT_GROWTH_PERCENT` undefined).

- [ ] **Step 3: Update the Scenario type**

In `src/types/cluster.ts`, replace the `Scenario` interface body's buffer/growth region. Remove `headroomPercent`, `targetCpuUtilizationPercent`, `targetRamUtilizationPercent`, `targetVmCount`, `cpuGrowthPercent`, `memoryGrowthPercent`, `storageGrowthPercent`. Add:

```ts
  /** Future workload growth %, scales all demand. Default 0. */
  readonly growthPercent: number;
  /** Operational safety buffer % ("don't run hot"). Default 20. Replaces headroomPercent. */
  readonly safetyPercent: number;
```

Keep: `targetSpecint?`, `targetCpuFrequencyGhz?`, `minServerCount?`, and all `vsan*?` fields.

- [ ] **Step 4: Update defaults.ts**

In `src/lib/sizing/defaults.ts`:
- Remove `DEFAULT_HEADROOM_PERCENT`, `DEFAULT_TARGET_CPU_UTILIZATION_PERCENT`, `DEFAULT_TARGET_RAM_UTILIZATION_PERCENT`.
- Add:

```ts
/** Future-growth buffer. 0 = size for today's workload only. */
export const DEFAULT_GROWTH_PERCENT = 0;
/** Operational safety buffer. 20 → cluster sized to run ~83% under current load. */
export const DEFAULT_SAFETY_PERCENT = 20;
```

- In `createDefaultScenario()` replace `headroomPercent: DEFAULT_HEADROOM_PERCENT,` with:

```ts
    growthPercent: DEFAULT_GROWTH_PERCENT,
    safetyPercent: DEFAULT_SAFETY_PERCENT,
```

- [ ] **Step 5: Run defaults test**

Run: `rtk vitest run src/lib/sizing/__tests__/defaults.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add src/types/cluster.ts src/lib/sizing/defaults.ts src/lib/sizing/__tests__/defaults.test.ts
rtk git commit -m "refactor(sizing): replace headroom/target-util/per-resource-growth with growthPercent+safetyPercent"
```

---

### Task 3: Unified demand factor + 2-mode dispatch in constraints

**Files:**
- Modify: `src/lib/sizing/constraints.ts`
- Test: `src/lib/sizing/__tests__/constraints.test.ts`

- [ ] **Step 1: Write the demand-factor + performance-mode tests**

Add to `src/lib/sizing/__tests__/constraints.test.ts`:

```ts
import { computeScenarioResult } from '../constraints'
import { createDefaultScenario } from '../defaults'
import type { OldCluster } from '../../../types/cluster'

const baseCluster: OldCluster = {
  totalVcpus: 1000, totalPcores: 200, totalVms: 100,
  totalDiskGb: 50000, cpuUtilizationPercent: 60, ramUtilizationPercent: 60,
  cpuFrequencyGhz: 2.5, existingServerCount: 10, specintPerServer: 300,
}

it('applies (1+growth)(1+safety) as a single demand factor', () => {
  const s = { ...createDefaultScenario(), growthPercent: 10, safetyPercent: 20,
    targetVcpuToPCoreRatio: 4, socketsPerServer: 2, coresPerSocket: 16 }
  // vCPU mode: ceil(1000 × 1.10 × 1.20 / 4 / 32) = ceil(10.3125) = 11
  const r = computeScenarioResult(baseCluster, s, 'vcpu', 'hci')
  expect(r.cpuLimitedCount).toBe(11)
})

it('performance mode uses GHz by default', () => {
  const s = { ...createDefaultScenario(), growthPercent: 0, safetyPercent: 0,
    targetCpuFrequencyGhz: 3.0, socketsPerServer: 2, coresPerSocket: 16 }
  const r = computeScenarioResult(baseCluster, s, 'performance', 'hci')
  // demandGhz = 200 × 2.5 × 0.60 = 300 ; perServer = 32 × 3.0 × 1.0 = 96 ; ceil(300/96)=4
  expect(r.cpuLimitedCount).toBe(4)
  expect(r.limitingResource === 'ghz' || r.cpuLimitedCount >= r.ramLimitedCount).toBe(true)
})

it('performance mode uses SPEC when a SPEC override is present', () => {
  const s = { ...createDefaultScenario(), growthPercent: 0, safetyPercent: 0,
    targetSpecint: 600 }
  const r = computeScenarioResult(baseCluster, s, 'performance', 'hci')
  // ceil(10 × 300 × 1.0 / 600) = 5
  expect(r.cpuLimitedCount).toBe(5)
})
```

- [ ] **Step 2: Run — expect fail**

Run: `rtk vitest run src/lib/sizing/__tests__/constraints.test.ts`
Expected: FAIL (old signature still divides by target-util / uses 'ghz' literal mode).

- [ ] **Step 3: Rewrite the CPU/perf + factor section of `computeScenarioResult`**

In `src/lib/sizing/constraints.ts`:

Replace the `headroomFactor` + growth-factor block (lines ~84-104) with:

```ts
  const demandFactor =
    (1 + (scenario.growthPercent ?? 0) / 100) *
    (1 + (scenario.safetyPercent ?? 0) / 100);
  const coresPerServer = scenario.socketsPerServer * scenario.coresPerSocket;

  const effectiveVmCount = cluster.totalVms;
  const effectiveVcpus = cluster.totalVcpus;
  const cpuUtilPct = cluster.cpuUtilizationPercent ?? 100;
```

Replace the whole CPU dispatch (the `if (sizingMode === 'specint') … else { serverCountByCpu }` block) with:

```ts
  // CALC-01: CPU/performance-limited count + which resource label it carries
  let cpuLimitedCount: number;
  let cpuResourceLabel: 'cpu' | 'specint' | 'ghz' = 'cpu';
  if (sizingMode === 'performance') {
    const hasSpec =
      (scenario.targetSpecint ?? 0) > 0 &&
      (cluster.existingServerCount ?? 0) > 0 &&
      (cluster.specintPerServer ?? 0) > 0;
    if (hasSpec) {
      cpuResourceLabel = 'specint';
      cpuLimitedCount = serverCountBySpecint(
        cluster.existingServerCount ?? 0,
        cluster.specintPerServer ?? 0,
        demandFactor,
        scenario.targetSpecint ?? 0,
      );
    } else {
      cpuResourceLabel = 'ghz';
      const rawTargetFreqGhz = scenario.targetCpuFrequencyGhz ?? 1;
      const effectiveTargetFreqGhz = scenario.vsanFttPolicy
        ? computeVsanEffectiveGhzPerNode(rawTargetFreqGhz, scenario.vsanCpuOverheadPercent)
        : rawTargetFreqGhz;
      cpuLimitedCount = serverCountByGhz(
        cluster.totalPcores,
        cluster.cpuFrequencyGhz ?? 1,
        cpuUtilPct,
        demandFactor,
        effectiveTargetFreqGhz,
        coresPerServer,
        100, // target util folded into safety buffer — run new servers to full, safety adds margin
      );
    }
  } else {
    cpuLimitedCount = serverCountByCpu(
      effectiveVcpus,
      demandFactor,
      scenario.targetVcpuToPCoreRatio,
      coresPerServer,
    );
  }
```

- [ ] **Step 4: Update RAM/disk to use `demandFactor` and drop target-util**

Replace the RAM block (lines ~150-163) with:

```ts
  // CALC-02: RAM-limited count (observed util scales demand; target-util removed)
  const ramUtilPct = cluster.ramUtilizationPercent ?? 100;
  const effectiveRamPerServerGb = scenario.vsanFttPolicy
    ? computeVsanEffectiveRamPerNode(scenario.ramPerServerGb, scenario.vsanMemoryPerHostGb)
    : scenario.ramPerServerGb;
  const ramLimitedCount = serverCountByRam(
    effectiveVmCount,
    scenario.ramPerVmGb,
    demandFactor,
    effectiveRamPerServerGb,
    ramUtilPct,
    100, // no target-util division anymore
  );
```

Replace the disk block's `grownDiskPerVmGb` usages with `scenario.diskPerVmGb` and `headroomFactor` with `demandFactor`. The vSAN `usableGib`/`totalVmRamGib` use `scenario.diskPerVmGb`/`scenario.ramPerVmGb` directly.

- [ ] **Step 5: Fix `determineLimitingResource` to take the label**

Replace the function signature + call. New function:

```ts
function determineLimitingResource(
  cpu: number,
  ram: number,
  disk: number,
  cpuLabel: 'cpu' | 'specint' | 'ghz',
): LimitingResource {
  if (cpu >= ram && cpu >= disk) return cpuLabel;
  if (ram > cpu && ram >= disk) return 'ram';
  return 'disk';
}
```

And the call site:

```ts
  const limitingResource = determineLimitingResource(
    cpuLimitedCount, ramLimitedCount, diskLimitedCount, cpuResourceLabel,
  );
```

- [ ] **Step 6: Update the utilization-OUTPUT block**

Replace `grownVcpus`/`grownRamPerVmGb`/`grownDiskPerVmGb` in the CALC-06 metrics with `effectiveVcpus`/`scenario.ramPerVmGb`/`scenario.diskPerVmGb`. Remove the now-unused `scenario.targetVcpuToPCoreRatio` divide-by-zero concerns are unchanged. Delete the `effectiveVcpus` proportional-scaling branch (targetVmCount removed) — it's now just `cluster.totalVcpus`.

- [ ] **Step 7: Update the function's JSDoc** to drop targetVmCount/target-util references.

- [ ] **Step 8: Run constraints tests**

Run: `rtk vitest run src/lib/sizing/__tests__/constraints.test.ts`
Expected: PASS (fix any legacy assertions in that file that referenced `headroomPercent`/target-util — update them to the 2-knob model).

- [ ] **Step 9: Commit**

```bash
rtk git add src/lib/sizing/constraints.ts src/lib/sizing/__tests__/constraints.test.ts
rtk git commit -m "refactor(sizing): 2-mode dispatch + unified (growth×safety) demand factor"
```

---

## Phase 2 — Schema + cluster readiness gate

### Task 4: scenarioSchema — new buffer fields, drop dropped fields

**Files:**
- Modify: `src/schemas/scenarioSchema.ts`
- Test: `src/schemas/__tests__/scenarioSchema.test.ts`

- [ ] **Step 1: Write schema test**

```ts
import { scenarioSchema } from '../scenarioSchema'

it('accepts growth/safety and defaults them', () => {
  const parsed = scenarioSchema.parse({
    id: crypto.randomUUID(), name: 'X',
    socketsPerServer: 2, coresPerSocket: 16, ramPerServerGb: 512, diskPerServerGb: 10000,
    ramPerVmGb: 4, diskPerVmGb: 50,
  })
  expect(parsed.growthPercent).toBe(0)
  expect(parsed.safetyPercent).toBe(20)
  expect('headroomPercent' in parsed).toBe(false)
})
```

- [ ] **Step 2: Run — expect fail.** `rtk vitest run src/schemas/__tests__/scenarioSchema.test.ts`

- [ ] **Step 3: Edit scenarioSchema.ts**

- Update the defaults import: replace `DEFAULT_HEADROOM_PERCENT, DEFAULT_TARGET_CPU_UTILIZATION_PERCENT, DEFAULT_TARGET_RAM_UTILIZATION_PERCENT` with `DEFAULT_GROWTH_PERCENT, DEFAULT_SAFETY_PERCENT`.
- Remove the `headroomPercent`, `targetCpuUtilizationPercent`, `targetRamUtilizationPercent`, `targetVmCount`, `cpuGrowthPercent`, `memoryGrowthPercent`, `storageGrowthPercent` keys.
- Add:

```ts
  growthPercent: z
    .preprocess(numericPreprocess, z.number().min(0).max(200).optional())
    .default(DEFAULT_GROWTH_PERCENT),
  safetyPercent: z
    .preprocess(numericPreprocess, z.number().min(0).max(100).optional())
    .default(DEFAULT_SAFETY_PERCENT),
```

Keep `targetSpecint`, `minServerCount`, `targetCpuFrequencyGhz`, and all `vsan*`.

- [ ] **Step 4: Run — expect pass.** Same command.

- [ ] **Step 5: Commit**

```bash
rtk git add src/schemas/scenarioSchema.ts src/schemas/__tests__/scenarioSchema.test.ts
rtk git commit -m "refactor(schema): scenarioSchema growth/safety, drop legacy buffer fields"
```

---

### Task 5: Required-utilization form schema + readiness gate

**Files:**
- Create: `src/schemas/currentClusterFormSchema.ts`
- Create: `src/lib/sizing/clusterReadiness.ts`
- Test: `src/lib/sizing/__tests__/clusterReadiness.test.ts`

- [ ] **Step 1: Write the readiness test**

```ts
import { isClusterSizingReady } from '../clusterReadiness'
import type { OldCluster } from '../../../types/cluster'

const ready: OldCluster = {
  totalVcpus: 10, totalPcores: 4, totalVms: 5,
  cpuUtilizationPercent: 55, ramUtilizationPercent: 60,
}

it('is ready only when both utilizations are present', () => {
  expect(isClusterSizingReady(ready)).toBe(true)
  expect(isClusterSizingReady({ ...ready, cpuUtilizationPercent: undefined })).toBe(false)
  expect(isClusterSizingReady({ ...ready, ramUtilizationPercent: undefined })).toBe(false)
})
```

- [ ] **Step 2: Run — expect fail.** `rtk vitest run src/lib/sizing/__tests__/clusterReadiness.test.ts`

- [ ] **Step 3: Create `src/lib/sizing/clusterReadiness.ts`**

```ts
import type { OldCluster } from '../../types/cluster';

/**
 * Sizing requires observed utilization — we never silently assume 100%
 * (that over-sizes the cluster). Both CPU and RAM utilization must be set
 * (measured or explicitly estimated) before Step 2/3 may run.
 */
export function isClusterSizingReady(cluster: OldCluster): boolean {
  return (
    cluster.cpuUtilizationPercent !== undefined &&
    cluster.ramUtilizationPercent !== undefined
  );
}
```

- [ ] **Step 4: Create `src/schemas/currentClusterFormSchema.ts`**

```ts
import { z } from 'zod';
import { currentClusterSchema } from './currentClusterSchema';

/**
 * Step 1 FORM schema. Identical to the storage schema except utilization is
 * REQUIRED — the user must enter measured-or-estimated CPU and RAM utilization
 * before sizing. No 100% default (that over-sizes). Storage schema stays lenient
 * so legacy sessions still load; the live form is strict.
 */
const requiredPercent = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
  z.number({ error: 'Utilization is required — enter measured or estimated %' })
    .min(1, 'Must be at least 1%')
    .max(100, 'Cannot exceed 100%'),
);

export const currentClusterFormSchema = currentClusterSchema.extend({
  cpuUtilizationPercent: requiredPercent,
  ramUtilizationPercent: requiredPercent,
});

export type CurrentClusterFormInput = z.infer<typeof currentClusterFormSchema>;
```

- [ ] **Step 5: Add a form-schema test** in `src/schemas/__tests__/currentClusterFormSchema.test.ts`:

```ts
import { currentClusterFormSchema } from '../currentClusterFormSchema'

it('rejects missing utilization', () => {
  const r = currentClusterFormSchema.safeParse({ totalVcpus: 1, totalPcores: 1, totalVms: 1 })
  expect(r.success).toBe(false)
})
it('accepts when utilization provided', () => {
  const r = currentClusterFormSchema.safeParse({
    totalVcpus: 1, totalPcores: 1, totalVms: 1,
    cpuUtilizationPercent: 55, ramUtilizationPercent: 60,
  })
  expect(r.success).toBe(true)
})
```

- [ ] **Step 6: Run both new tests — expect pass.**

Run: `rtk vitest run src/lib/sizing/__tests__/clusterReadiness.test.ts src/schemas/__tests__/currentClusterFormSchema.test.ts`

- [ ] **Step 7: Commit**

```bash
rtk git add src/lib/sizing/clusterReadiness.ts src/schemas/currentClusterFormSchema.ts src/lib/sizing/__tests__/clusterReadiness.test.ts src/schemas/__tests__/currentClusterFormSchema.test.ts
rtk git commit -m "feat(step1): required-utilization form schema + isClusterSizingReady gate"
```

---

## Phase 3 — Persistence migration + seeding

### Task 6: Session migration (legacy scenarios + modes)

**Files:**
- Modify: `src/lib/utils/persistence.ts`
- Test: `src/lib/utils/__tests__/persistence.test.ts`

- [ ] **Step 1: Write migration tests**

```ts
import { deserializeSession } from '../persistence'

it('migrates legacy headroomPercent → safetyPercent and old modes', () => {
  const legacy = JSON.stringify({
    cluster: { totalVcpus: 10, totalPcores: 4, totalVms: 5 },
    scenarios: [{
      id: crypto.randomUUID(), name: 'Old', socketsPerServer: 2, coresPerSocket: 16,
      ramPerServerGb: 512, diskPerServerGb: 10000, ramPerVmGb: 4, diskPerVmGb: 50,
      headroomPercent: 30, targetCpuUtilizationPercent: 80, cpuGrowthPercent: 15,
    }],
    sizingMode: 'specint', layoutMode: 'hci',
  })
  const out = deserializeSession(legacy)
  expect(out).not.toBeNull()
  expect(out!.scenarios[0].safetyPercent).toBe(30)
  expect(out!.scenarios[0].growthPercent).toBe(0) // dropped per-resource growth → default
  expect('headroomPercent' in out!.scenarios[0]).toBe(false)
  expect(out!.sizingMode).toBe('performance') // specint → performance
})

it('maps aggressive → vcpu', () => {
  const legacy = JSON.stringify({
    cluster: { totalVcpus: 10, totalPcores: 4, totalVms: 5 },
    scenarios: [], sizingMode: 'aggressive', layoutMode: 'hci',
  })
  expect(deserializeSession(legacy)!.sizingMode).toBe('vcpu')
})
```

- [ ] **Step 2: Run — expect fail.** `rtk vitest run src/lib/utils/__tests__/persistence.test.ts`

- [ ] **Step 3: Add a pre-parse migration in persistence.ts**

Replace the `sessionSchema` `sizingMode` line (line 49) with the 2-value enum and add a migration function used inside `deserializeSession` before `safeParse`:

```ts
  sizingMode: z.enum(['vcpu', 'performance']).default('vcpu'),
```

Add above `deserializeSession`:

```ts
const LEGACY_MODE_MAP: Record<string, 'vcpu' | 'performance'> = {
  vcpu: 'vcpu', performance: 'performance',
  specint: 'performance', ghz: 'performance', aggressive: 'vcpu',
};

/** Map a pre-2-knob persisted payload forward before schema validation. */
function migrateLegacySession(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) return raw;
  const r = raw as Record<string, unknown>;
  const next: Record<string, unknown> = { ...r };
  if (typeof r.sizingMode === 'string') {
    next.sizingMode = LEGACY_MODE_MAP[r.sizingMode] ?? 'vcpu';
  }
  if (Array.isArray(r.scenarios)) {
    next.scenarios = r.scenarios.map((s) => {
      if (typeof s !== 'object' || s === null) return s;
      const sc = s as Record<string, unknown>;
      const {
        headroomPercent, targetCpuUtilizationPercent, targetRamUtilizationPercent,
        targetVmCount, cpuGrowthPercent, memoryGrowthPercent, storageGrowthPercent,
        ...rest
      } = sc;
      return {
        ...rest,
        safetyPercent: rest.safetyPercent ?? headroomPercent ?? 20,
        growthPercent: rest.growthPercent ?? 0,
      };
    });
  }
  return next;
}
```

Then in `deserializeSession`, change `const result = sessionSchema.safeParse(parsed);` to:

```ts
    const result = sessionSchema.safeParse(migrateLegacySession(parsed));
```

- [ ] **Step 4: Run — expect pass.** Same command.

- [ ] **Step 5: Commit**

```bash
rtk git add src/lib/utils/persistence.ts src/lib/utils/__tests__/persistence.test.ts
rtk git commit -m "feat(persistence): forward-migrate legacy buffer fields and sizing modes"
```

---

### Task 7: Extend seedFromCluster with recommended ratio/growth/safety

**Files:**
- Modify: `src/store/useScenariosStore.ts:62-92`
- Test: `src/store/__tests__/useScenariosStore.test.ts`

- [ ] **Step 1: Write the seeding test**

```ts
it('seedFromCluster sets recommended ratio/growth/safety', () => {
  useScenariosStore.setState({ scenarios: [createDefaultScenario()] })
  useScenariosStore.getState().seedFromCluster({
    totalVcpus: 100, totalPcores: 40, totalVms: 50, totalDiskGb: 5000,
    avgRamPerVmGb: 6, cpuUtilizationPercent: 55, ramUtilizationPercent: 60,
  })
  const s = useScenariosStore.getState().scenarios[0]
  expect(s.ramPerVmGb).toBe(6)
  expect(s.targetVcpuToPCoreRatio).toBe(4)
  expect(s.growthPercent).toBe(0)
  expect(s.safetyPercent).toBe(20)
})
```

- [ ] **Step 2: Run — expect fail.** `rtk vitest run src/store/__tests__/useScenariosStore.test.ts`

- [ ] **Step 3: Extend `seedFromCluster`**

In the returned `.map((s) => ({ ... }))`, add after the existing spread fields:

```ts
          targetVcpuToPCoreRatio: s.targetVcpuToPCoreRatio ?? 4,
          growthPercent: s.growthPercent ?? 0,
          safetyPercent: s.safetyPercent ?? 20,
```

And change the `hasUpdates` guard to always allow these recommended defaults to apply on seed (they're idempotent — seeded values equal existing defaults, so no behavior change for fresh scenarios; the point is they're explicit). Leave the `if (!hasUpdates) return state` as-is since a real import always has at least one data field.

- [ ] **Step 4: Run — expect pass.** Same command.

- [ ] **Step 5: Commit**

```bash
rtk git add src/store/useScenariosStore.ts src/store/__tests__/useScenariosStore.test.ts
rtk git commit -m "feat(step2): seed recommended ratio/growth/safety from imported cluster"
```

---

## Phase 4 — UI

### Task 8: SizingModeToggle → 2 modes

**Files:**
- Modify: `src/components/wizard/SizingModeToggle.tsx`
- Test: `src/components/wizard/__tests__/SizingModeToggle.test.tsx`

- [ ] **Step 1: Update test** to assert exactly two sizing buttons ("vCPU", "Performance") and no "Aggressive"/"SPECrate2017"/"GHz" buttons.

```tsx
it('renders only vCPU and Performance modes', () => {
  render(<SizingModeToggle />)
  expect(screen.getByText('vCPU')).toBeInTheDocument()
  expect(screen.getByText('Performance')).toBeInTheDocument()
  expect(screen.queryByText('Aggressive')).not.toBeInTheDocument()
  expect(screen.queryByText('GHz')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run — expect fail.**

- [ ] **Step 3: Replace Row 1** of `SizingModeToggle.tsx` (the sizing-mode group) with two buttons; drop the `hasCpuUtil`/`AMBER_ACTIVE`/aggressive tooltip logic. Keep `hasCpuFreq`/SPEC nuance out of the toggle — performance mode is always selectable (GHz default; SPEC optional inside the card):

```tsx
      <div role="group" aria-label="Sizing mode" className="flex flex-wrap gap-0.5 border rounded-md p-0.5 bg-muted/40">
        <ModeBtn label="vCPU" isActive={sizingMode === 'vcpu'} onClick={() => setSizingMode('vcpu')} />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <span>
                <ModeBtn label="Performance" isActive={sizingMode === 'performance'} onClick={() => setSizingMode('performance')} />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-sm">Sizes on new-vs-old per-core performance (GHz by default; add SPEC scores in the scenario for precision).</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
```

Remove now-unused `AMBER_ACTIVE`, `hasCpuUtil`, `cluster` (if only used for that), and `amber` prop usage.

- [ ] **Step 4: Run — expect pass.**

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/wizard/SizingModeToggle.tsx src/components/wizard/__tests__/SizingModeToggle.test.tsx
rtk git commit -m "feat(ui): 2-mode sizing toggle (vCPU | Performance)"
```

---

### Task 9: ScenarioCard — buffers, performance inputs, Advanced disclosure, rationale banner

**Files:**
- Modify: `src/components/step2/ScenarioCard.tsx`
- Test: `src/components/step2/__tests__/ScenarioCard.test.tsx`

- [ ] **Step 1: Update/extend the card test**

```tsx
it('shows Growth % and Safety % and hides target-util/VM-count', () => {
  renderCard() // existing helper that mounts a scenario
  expect(screen.getByText(/Growth %/)).toBeInTheDocument()
  expect(screen.getByText(/Safety buffer %/)).toBeInTheDocument()
  expect(screen.queryByText(/Target CPU Util/)).not.toBeInTheDocument()
  expect(screen.queryByText(/Target VM Count/)).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run — expect fail.**

- [ ] **Step 3: Edit ScenarioCard.tsx — buffers**

In the "Sizing Assumptions" grid: remove the `targetCpuUtilizationPercent` and `targetRamUtilizationPercent` `FormField`s. Replace the `headroomPercent` field with two fields:

```tsx
                <FormField control={form.control} name="growthPercent" render={({ field }) => (
                  <FormItem>
                    <FieldLabel name="growthPercent">Growth %</FieldLabel>
                    <FormControl><Input type="number" min={0} max={200} {...numericField(field)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="safetyPercent" render={({ field }) => (
                  <FormItem>
                    <FieldLabel name="safetyPercent">Safety buffer %</FieldLabel>
                    <FormControl><Input type="number" min={0} max={100} {...numericField(field)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
```

Update the `TOOLTIPS` map: remove `headroomPercent`, `targetCpuUtilizationPercent`, `targetRamUtilizationPercent`, `targetVmCount`; add:

```ts
  growthPercent: 'Future workload growth. 0% = size for today only. Scales all demand (CPU, RAM, disk).',
  safetyPercent: "Operational buffer so the cluster never runs hot. 20% → sized to run ~83% under current load.",
```

- [ ] **Step 4: Performance-mode inputs (GHz primary, SPEC optional)**

Replace the `sizingMode === 'ghz'` and `sizingMode === 'specint'` blocks with a single `sizingMode === 'performance'` block: GHz frequency input always shown, plus an "I have SPEC scores" checkbox that reveals the SPEC model lookup + `targetSpecint` input (reuse the existing `SpecResultsPanel` + `handleSpecSelect`). Gate `useSpecLookup` on `sizingMode === 'performance' && specEnabled`.

```tsx
            {sizingMode === 'performance' && (
              <div className="border-t pt-4 space-y-4">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Performance Mode</p>
                <FormField control={form.control} name="targetCpuFrequencyGhz" render={({ field }) => (
                  <FormItem>
                    <FieldLabel name="targetCpuFrequencyGhz">New CPU Frequency (GHz)</FieldLabel>
                    <FormControl><Input type="number" min={0.1} step={0.1} {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex items-center gap-2">
                  <Checkbox id={`${scenarioId}-spec-enabled`} checked={specEnabled}
                    onCheckedChange={(c) => { setSpecEnabled(c); if (!c) form.setValue('targetSpecint', undefined) }} />
                  <Label htmlFor={`${scenarioId}-spec-enabled`} className="text-sm cursor-pointer">I have SPEC scores (more precise)</Label>
                </div>
                {specEnabled && (
                  /* existing SPEC model search + SpecResultsPanel + targetSpecint Controller, moved here verbatim */
                )}
              </div>
            )}
```

Add `const [specEnabled, setSpecEnabled] = useState(() => !!scenario?.targetSpecint)` near the other `useState`s. Update the `useSpecLookup` gate to `sizingMode === 'performance' && specEnabled ? debouncedCpuModel : undefined`. Remove the old vcpu-mode "Look up target CPU (optional)" block OR keep it (it's harmless) — recommend keeping it under vcpu since it seeds sockets/cores.

- [ ] **Step 5: Advanced disclosure**

Wrap the existing "Advanced (optional)" `targetVmCount` field — **delete the `targetVmCount` FormField entirely** — and the `minServerCount` pin block, plus `VsanGrowthSection`, inside a single collapsible. Replace the static `<p>Advanced (optional)</p>` header with a button that toggles `const [advancedOpen, setAdvancedOpen] = useState(false)` and render the body only when `advancedOpen`. Keep min-pin + vSAN inside; remove growth-projection inputs from `VsanGrowthSection` (those fields are dropped) — verify `VsanGrowthSection` and rename if it now only carries vSAN.

- [ ] **Step 6: Seeding rationale banner**

At the top of `CardContent`, when the scenario was seeded (cluster has data), render a one-line note:

```tsx
{currentCluster.totalVms > 0 && (
  <p className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-2">
    Seeded from your import: {scenario.targetVcpuToPCoreRatio}:1 ratio, {scenario.growthPercent}% growth, {scenario.safetyPercent}% safety — adjust as needed.
  </p>
)}
```

- [ ] **Step 7: Run card tests — expect pass.** `rtk vitest run src/components/step2/__tests__/ScenarioCard.test.tsx`

- [ ] **Step 8: Commit**

```bash
rtk git add src/components/step2/ScenarioCard.tsx src/components/step2/__tests__/ScenarioCard.test.tsx src/components/step2/VsanGrowthSection.tsx
rtk git commit -m "feat(ui): scenario card growth/safety, performance inputs, advanced disclosure, seed banner"
```

---

### Task 10: Step 1 form — required utilization + guidance + stretch caveat

**Files:**
- Modify: `src/components/step1/CurrentClusterForm.tsx`
- Test: `src/components/step1/__tests__/CurrentClusterForm.test.tsx`

- [ ] **Step 1: Update test** — assert the form blocks submit when utilization is empty and shows the guidance text.

```tsx
it('blocks submit and shows guidance when utilization is empty', async () => {
  render(<CurrentClusterForm />)
  expect(screen.getByText(/Most environments run well below 100%/)).toBeInTheDocument()
  // fill required non-util fields, leave util empty, submit → error
  // (use existing helpers in the test file to fill totals)
})
```

- [ ] **Step 2: Run — expect fail.**

- [ ] **Step 3: Swap the resolver** to `currentClusterFormSchema` (import it) so CPU/RAM utilization are required, and make those two inputs visually required (remove "optional" hints). Add guidance under the utilization fields:

```tsx
<p className="text-xs text-muted-foreground mt-1">
  Most environments run well below 100%. {cluster.isStretchCluster ? 'Stretch clusters often run <50% per site.' : 'Enter measured (LiveOptics) or a careful estimate.'}
</p>
```

- [ ] **Step 4: Run — expect pass.**

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/step1/CurrentClusterForm.tsx src/components/step1/__tests__/CurrentClusterForm.test.tsx
rtk git commit -m "feat(step1): require CPU/RAM utilization with domain guidance"
```

---

### Task 11: Gate Step 2/3 navigation on readiness

**Files:**
- Modify: `src/components/wizard/WizardShell.tsx` (or the nav/next-button component)
- Test: `src/components/wizard/__tests__/WizardShell.test.tsx`

- [ ] **Step 1: Locate the Next control** (grep `nextStep` in `src/components/wizard/`). Write a test that the Step-1 Next button is disabled until `isClusterSizingReady(cluster)` is true.

- [ ] **Step 2: Run — expect fail.**

- [ ] **Step 3: Wire the gate** — import `isClusterSizingReady`, read `cluster` from `useClusterStore`, and `disabled={currentStep === 1 && !isClusterSizingReady(cluster)}` on the Next button, with a tooltip "Enter CPU and RAM utilization to continue."

- [ ] **Step 4: Run — expect pass.**

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/wizard/WizardShell.tsx src/components/wizard/__tests__/WizardShell.test.tsx
rtk git commit -m "feat(wizard): block Step 2/3 until utilization is provided"
```

---

## Phase 5 — Consumer cleanup + full green

### Task 12: Update display/export/clipboard/json consumers

**Files:**
- Modify: `src/lib/sizing/display.ts`, `src/lib/utils/export.ts`, `src/lib/utils/exportPdf.ts`, `src/lib/utils/exportPptx.ts`, `src/lib/utils/clipboard.ts`, `src/lib/utils/import/jsonParser.ts`, `src/components/step2/ScenarioResults.tsx`, `src/components/step3/{ComparisonTable,NodeSizingRows,UtilizationRows}.tsx`, `src/lib/sizing/clusterTotals.ts`, `src/lib/sizing/vsanBreakdown.ts`
- Test: the matching `__tests__` files

- [ ] **Step 1: Run the full type-check to enumerate breakage**

Run: `rtk tsc`
Expected: errors listing every reference to `headroomPercent`, `targetCpuUtilizationPercent`, per-resource growth, `targetVmCount`, and the removed modes. Use this list as the worklist.

- [ ] **Step 2: display.ts** — rename `headroomPercent` params to `safetyPercent` and `*GrowthPercent` to a single `growthPercent`; update the formula strings to show `× (1+growth%) × (1+safety%)`. Update `src/lib/sizing/__tests__/display.test.ts` expected strings to match.

- [ ] **Step 3: export.ts / exportPdf.ts / exportPptx.ts / clipboard.ts** — replace any `headroomPercent` column/label with `safetyPercent` ("Safety %") and add a `growthPercent` ("Growth %") column; remove `targetVmCount`/target-util columns. Update each export's snapshot/assertion test.

- [ ] **Step 4: jsonParser.ts** — when importing a JSON session, pass scenarios through the same legacy→new mapping (reuse `migrateLegacySession` by exporting it from persistence.ts, or replicate the field rename). Add a test importing a legacy JSON.

- [ ] **Step 5: Step 2/3 display components** — replace any `headroomPercent`/target-util/`targetVmCount` display with Growth %/Safety %. Update their tests.

- [ ] **Step 6: Run the full suite + type-check + lint**

Run: `rtk tsc && rtk vitest run && rtk lint`
Expected: all green, 0 type errors. Fix any stragglers (search `rtk grep -rl "headroomPercent" src` returns nothing outside historical comments).

- [ ] **Step 7: Commit**

```bash
rtk git add -A
rtk git commit -m "refactor: update display/export/import consumers to growth+safety model"
```

---

### Task 13: Final verification

- [ ] **Step 1: Confirm no dangling references**

Run: `rtk grep -rl -e "serverCountByCpuAggressive" -e "headroomPercent" -e "targetCpuUtilizationPercent" -e "targetVmCount" -e "cpuGrowthPercent" src`
Expected: no matches (comments referencing history are acceptable but prefer none).

- [ ] **Step 2: Full build**

Run: `rtk npm run build`
Expected: clean `tsc -b && vite build`.

- [ ] **Step 3: Full test + lint**

Run: `rtk vitest run && rtk lint`
Expected: all pass.

- [ ] **Step 4: Manual smoke (optional, via `/run`)** — import a sample RVTools/LiveOptics file, confirm: util is required on Step 1, Next is blocked until set, Step 2 shows Growth/Safety + seed banner + 2 modes, Advanced collapses vSAN/min-pin, results render.

- [ ] **Step 5: Final commit if any fixes**

```bash
rtk git add -A && rtk git commit -m "chore: sub-project A verification fixes"
```

---

## Self-Review notes

- **Spec coverage:** A1 (Task 1,3,8) · A2 (Task 2,3,4) · A3 (Task 5,10,11) · A4 (Task 7,9 banner) · A5 (Task 9 disclosure; stretch already auto via constraints — unchanged) · A6 (Task 6 migration, Task 12 cleanup). All covered.
- **Type consistency:** `SizingMode='vcpu'|'performance'`, `growthPercent`/`safetyPercent`, `isClusterSizingReady`, `migrateLegacySession`, `currentClusterFormSchema` used consistently across tasks.
- **Deliberate spec deviation (flagged):** utilization required at form+gate, not in the storage type — preserves legacy session loading. Confirm acceptable during execution.
- **Open risk:** `VsanGrowthSection` currently bundles vSAN + growth-projection fields; Task 9 Step 5 must split growth out (dropped) from vSAN (kept). Verify the component's actual contents at execution and rename to `VsanSection` if growth is fully removed.
