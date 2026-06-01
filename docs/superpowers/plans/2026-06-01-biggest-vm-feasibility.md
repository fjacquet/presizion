# Biggest-VM Feasibility Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Warn (non-blocking) when a refreshed cluster's single largest VM — by vCPU or by RAM — cannot fit on one proposed target host.

**Architecture:** Capture the per-scope largest-VM vCPU/RAM at import (RVTools/LiveOptics only), persist it on `OldCluster`, assess fit in a pure helper (`src/lib/sizing/singleVmFit.ts`), embed the verdict in `ScenarioResult`, and surface it as a presentational amber/red banner in Step 2 plus an info line in the Step 1 import preview. Manual entry has no per-VM data → verdict `unknown` → check silently skipped.

**Tech Stack:** React 19 + TypeScript strict, Zustand, Zod, Vitest + React Testing Library, react-i18next (en/fr/de/it), Biome.

**Source spec:** `docs/superpowers/specs/2026-06-01-biggest-vm-feasibility-design.md`

---

## Key facts verified against the codebase (read before starting)

- `OldCluster` (`src/types/cluster.ts:7-23`) holds **aggregates only**; all extra fields are `readonly … ?`.
- `Scenario` (`src/types/cluster.ts:29-56`) has `socketsPerServer`, `coresPerSocket`, `ramPerServerGb`, and optional vSAN fields. **There is no `coresPerServer` field** — compute it as `socketsPerServer × coresPerSocket`.
- vSAN "applies" iff `scenario.vsanFttPolicy !== undefined`.
- `computeVsanEffectiveRamPerNode(ramPerNodeGb: number, vsanMemoryPerHostGb?: number): number` lives in `src/lib/sizing/vsanFormulas.ts:136-141` and returns `Math.max(0, ramPerNodeGb - vsanMemoryPerHostGb)` (default overhead 6 GiB). It takes **numbers, not a Scenario**.
- `VmRow` (`src/lib/utils/import/index.ts:3-10`) has required `vcpus: number` and `ramMib: number`.
- `ScopeData = Omit<ClusterImportResult, 'sourceFormat'|'detectedScopes'|'scopeLabels'|'rawByScope'|'vmRowsByScope'>` (`index.ts:12-15`). Adding optional fields to `ClusterImportResult` makes them appear on `ScopeData` automatically.
- Both parsers use a named `interface ScopeAccum { totalVcpus; totalMemMib; totalDiskMib; vmCount }` (rvtools `:29-34`, liveoptics `:25-30`) and a `scopeMap` of it.
- `aggregateScopes` (`src/lib/utils/import/scopeAggregator.ts:15-178`) sums/averages fields; largest-VM must use **MAX** across selected scopes.
- Session persistence validates `cluster` against `currentClusterSchema` (`src/schemas/currentClusterSchema.ts:52-66`), which **strips fields not in the schema**. New fields MUST be added there to round-trip through localStorage/session.
- `jsonParser.ts:40-63` maps JSON→`OldCluster` with conditional spreads; add the new fields there for JSON import round-trip.
- `ImportPreviewModal.handleApply` (`src/components/step1/ImportPreviewModal.tsx:113-165`) builds the cluster from `previewCluster: ScopeData` with conditional spreads.
- `useScenariosResults` (`src/hooks/useScenariosResults.ts`) maps every scenario through `computeScenarioResult`, so a new `ScenarioResult` field reaches all consumers with no extra wiring.
- i18n: one JSON file per locale per namespace at `src/i18n/locales/{en,fr,de,it}/{step1,step2}.json`; key-parity test at `src/i18n/__tests__/keyParity.test.ts` fails if any locale is missing a key. Interpolation syntax is `{{var}}`.
- No existing test compares a whole `ScenarioResult` via `toEqual`/`toMatchObject`/snapshot — adding `singleVmFit` breaks nothing.

## File Structure

**Create**

- `src/lib/sizing/singleVmFit.ts` — pure feasibility helper + `FitVerdict`/`SingleVmFit` types + `SMT_THREADS_PER_CORE`.
- `src/lib/sizing/__tests__/singleVmFit.test.ts` — unit tests for the helper.

**Modify**

- `src/lib/utils/import/index.ts` — add `largestVmVcpus?`/`largestVmRamMib?` to `ClusterImportResult`.
- `src/lib/utils/import/rvtoolsParser.ts` — track per-scope largest VM in `ScopeAccum`, emit on `ScopeData`.
- `src/lib/utils/import/liveopticParser.ts` — same.
- `src/lib/utils/import/scopeAggregator.ts` — MAX largest-VM across scopes.
- `src/types/cluster.ts` — add `largestVmVcpus?`/`largestVmRamGb?` to `OldCluster`.
- `src/schemas/currentClusterSchema.ts` — add the two fields so they persist.
- `src/lib/utils/import/jsonParser.ts` — map the two fields on JSON import.
- `src/components/step1/ImportPreviewModal.tsx` — capture into cluster (MiB→GiB) + render info line.
- `src/types/results.ts` — add `readonly singleVmFit: SingleVmFit;`.
- `src/lib/sizing/constraints.ts` — call helper, include in result.
- `src/components/step2/ScenarioResults.tsx` — render amber/red banner.
- `src/i18n/locales/{en,fr,de,it}/step1.json` — `importPreview.largestVm`.
- `src/i18n/locales/{en,fr,de,it}/step2.json` — `singleVmFit.*` keys.

**Test (modify/add)**

- `src/lib/utils/import/__tests__/rvtoolsParser.test.ts` (or existing parser test) — largest-VM capture.
- `src/lib/utils/import/__tests__/scopeAggregator.test.ts` — MAX across scopes.
- `src/lib/sizing/__tests__/constraints.test.ts` — result includes correct `singleVmFit`.
- `src/components/step2/__tests__/ScenarioResults.test.tsx` (new or existing) — banner rendering.
- `src/components/step1/__tests__/ImportPreviewModal.test.tsx` — info line rendering.

---

## Task 1: Capture largest VM per scope in the import parsers

**Files:**
- Modify: `src/lib/utils/import/index.ts:17-44` (ClusterImportResult)
- Modify: `src/lib/utils/import/rvtoolsParser.ts:29-34, 96-156, 164-175`
- Modify: `src/lib/utils/import/liveopticParser.ts:25-30, 290-367`
- Test: `src/lib/utils/import/__tests__/rvtoolsParser.test.ts` (existing) and `liveopticParser.test.ts` (existing)

- [ ] **Step 1: Write a failing parser test (RVTools)**

Add to `src/lib/utils/import/__tests__/rvtoolsParser.test.ts` (match the existing import/build style in that file; it parses a small in-memory workbook/rows fixture):

```ts
it('captures the largest single VM by vCPU and by RAM (MiB) per scope', () => {
  // Two VMs in one cluster: VM-A is the vCPU monster, VM-B is the RAM monster.
  const result = parseRvtools(
    buildWorkbook([
      { VM: 'VM-A', 'CPUs': 32, 'Memory': 65536, 'Provisioned MiB': 100, Cluster: 'CL-1', Datacenter: 'DC1' },
      { VM: 'VM-B', 'CPUs': 8, 'Memory': 524288, 'Provisioned MiB': 100, Cluster: 'CL-1', Datacenter: 'DC1' },
    ]),
  );
  const scope = result.rawByScope?.get('DC1||CL-1');
  expect(scope?.largestVmVcpus).toBe(32);
  expect(scope?.largestVmRamMib).toBe(524288);
});
```

> If the existing test file uses a different fixture builder (e.g. `makeSheet`, raw `rows` arrays), mirror that exact helper — do not invent `buildWorkbook`. The assertions on `largestVmVcpus`/`largestVmRamMib` are the part that matters.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/utils/import/__tests__/rvtoolsParser.test.ts`
Expected: FAIL — `largestVmVcpus`/`largestVmRamMib` are `undefined` (property does not exist on `ScopeData`).

- [ ] **Step 3: Add the fields to `ClusterImportResult`**

In `src/lib/utils/import/index.ts`, inside `interface ClusterImportResult` (after `isStretchCluster?: boolean;` / near the other optional metric fields), add:

```ts
  /** Largest single VM by vCPU count across this scope's VM rows (import only). */
  largestVmVcpus?: number;
  /** Largest single VM by RAM in MiB across this scope's VM rows (import only). */
  largestVmRamMib?: number;
```

(`ScopeData` inherits both automatically — they are not in the `Omit` list.)

- [ ] **Step 4: Track largest VM in the RVTools `ScopeAccum`**

In `src/lib/utils/import/rvtoolsParser.ts`, extend the accumulator interface (`:29-34`):

```ts
interface ScopeAccum {
  totalVcpus: number;
  totalMemMib: number;
  totalDiskMib: number;
  vmCount: number;
  largestVcpus: number;
  largestMemMib: number;
}
```

Update the per-row accumulation (`:143-148` default and `:149-...` set). Replace the `const existing = scopeMap.get(scopeKey) ?? {...}` default and the `scopeMap.set(scopeKey, {...})` call with:

```ts
    const existing = scopeMap.get(scopeKey) ?? {
      totalVcpus: 0,
      totalMemMib: 0,
      totalDiskMib: 0,
      vmCount: 0,
      largestVcpus: 0,
      largestMemMib: 0,
    };
    scopeMap.set(scopeKey, {
      totalVcpus: existing.totalVcpus + cpus,
      totalMemMib: existing.totalMemMib + mem,
      totalDiskMib: existing.totalDiskMib + disk,
      vmCount: existing.vmCount + 1,
      largestVcpus: Math.max(existing.largestVcpus, cpus),
      largestMemMib: Math.max(existing.largestMemMib, mem),
    });
```

Then in the per-scope `rawByScope.set(key, {...})` block (`:164-175`), add the two fields to the emitted `ScopeData`:

```ts
    rawByScope.set(key, {
      totalVcpus: accum.totalVcpus,
      totalVms: accum.vmCount,
      totalDiskGb: Math.round((accum.totalDiskMib / 1024) * 10) / 10,
      avgRamPerVmGb:
        accum.vmCount > 0 ? Math.round((accum.totalMemMib / accum.vmCount / 1024) * 10) / 10 : 0,
      vmCount: accum.vmCount,
      warnings: [],
      largestVmVcpus: accum.largestVcpus,
      largestVmRamMib: accum.largestMemMib,
    });
```

- [ ] **Step 5: Run the RVTools test to verify it passes**

Run: `npx vitest run src/lib/utils/import/__tests__/rvtoolsParser.test.ts`
Expected: PASS.

- [ ] **Step 6: Write the same failing test for LiveOptics**

Add the equivalent test to `src/lib/utils/import/__tests__/liveopticParser.test.ts`, using that file's existing fixture style, asserting `scope?.largestVmVcpus` and `scope?.largestVmRamMib`.

- [ ] **Step 7: Run it to verify it fails**

Run: `npx vitest run src/lib/utils/import/__tests__/liveopticParser.test.ts`
Expected: FAIL.

- [ ] **Step 8: Apply the identical change to the LiveOptics parser**

In `src/lib/utils/import/liveopticParser.ts`, extend `ScopeAccum` (`:25-30`) with `largestVcpus: number;` and `largestMemMib: number;`. Update the accumulator default (`:335-340`) and `scopeMap.set` (`:341-...`) and the per-scope `rawByScope.set` (`:356-367`) exactly as in Step 4 (same field names, `cpus`/`mem` are the same locals here).

- [ ] **Step 9: Run the LiveOptics test to verify it passes**

Run: `npx vitest run src/lib/utils/import/__tests__/liveopticParser.test.ts`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
rtk git add src/lib/utils/import/index.ts src/lib/utils/import/rvtoolsParser.ts src/lib/utils/import/liveopticParser.ts src/lib/utils/import/__tests__/rvtoolsParser.test.ts src/lib/utils/import/__tests__/liveopticParser.test.ts
rtk git commit -m "feat(import): capture largest single VM (vCPU + RAM MiB) per scope"
```

---

## Task 2: Aggregate largest VM as the MAX across selected scopes

**Files:**
- Modify: `src/lib/utils/import/scopeAggregator.ts:15-178`
- Test: `src/lib/utils/import/__tests__/scopeAggregator.test.ts` (existing)

- [ ] **Step 1: Write the failing test**

Add to `src/lib/utils/import/__tests__/scopeAggregator.test.ts` (mirror the existing fixture/`aggregateScopes` call style in that file):

```ts
it('takes the MAX largest-VM vCPU and RAM across selected scopes (not the sum)', () => {
  const rawByScope = new Map<string, ScopeData>([
    ['A', { totalVcpus: 10, totalVms: 5, totalDiskGb: 0, avgRamPerVmGb: 4, vmCount: 5, warnings: [], largestVmVcpus: 16, largestVmRamMib: 32768 }],
    ['B', { totalVcpus: 10, totalVms: 5, totalDiskGb: 0, avgRamPerVmGb: 4, vmCount: 5, warnings: [], largestVmVcpus: 48, largestVmRamMib: 16384 }],
  ]);
  const agg = aggregateScopes(rawByScope, ['A', 'B']);
  expect(agg.largestVmVcpus).toBe(48); // max, not 64
  expect(agg.largestVmRamMib).toBe(32768); // max, not 49152
});

it('omits largest-VM fields when no selected scope has them', () => {
  const rawByScope = new Map<string, ScopeData>([
    ['A', { totalVcpus: 10, totalVms: 5, totalDiskGb: 0, avgRamPerVmGb: 4, vmCount: 5, warnings: [] }],
  ]);
  const agg = aggregateScopes(rawByScope, ['A']);
  expect(agg.largestVmVcpus).toBeUndefined();
  expect(agg.largestVmRamMib).toBeUndefined();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/utils/import/__tests__/scopeAggregator.test.ts`
Expected: FAIL — `agg.largestVmVcpus` is `undefined`.

- [ ] **Step 3: Accumulate the MAX in `aggregateScopes`**

In `src/lib/utils/import/scopeAggregator.ts`, declare accumulators alongside the other locals (near `let anyStretch = false;`):

```ts
  let maxLargestVmVcpus: number | undefined;
  let maxLargestVmRamMib: number | undefined;
```

Inside the `for (const scope of selected)` loop, before the `if (scope.isStretchCluster === true)` block, add:

```ts
    if (scope.largestVmVcpus !== undefined) {
      maxLargestVmVcpus = Math.max(maxLargestVmVcpus ?? 0, scope.largestVmVcpus);
    }
    if (scope.largestVmRamMib !== undefined) {
      maxLargestVmRamMib = Math.max(maxLargestVmRamMib ?? 0, scope.largestVmRamMib);
    }
```

Add them to the `esxFields` partial (after the existing representative-field assignments), so they round-trip through the spread on return:

```ts
  if (maxLargestVmVcpus !== undefined) esxFields.largestVmVcpus = maxLargestVmVcpus;
  if (maxLargestVmRamMib !== undefined) esxFields.largestVmRamMib = maxLargestVmRamMib;
```

(`esxFields` is `Partial<ScopeData>`, which now includes both fields, and is spread into the returned object via `...esxFields`.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/utils/import/__tests__/scopeAggregator.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/lib/utils/import/scopeAggregator.ts src/lib/utils/import/__tests__/scopeAggregator.test.ts
rtk git commit -m "feat(import): aggregate largest-VM vCPU/RAM as max across scopes"
```

---

## Task 3: Persist largest VM on `OldCluster` (type, schema, JSON, import apply)

**Files:**
- Modify: `src/types/cluster.ts:7-23`
- Modify: `src/schemas/currentClusterSchema.ts:52-66`
- Modify: `src/lib/utils/import/jsonParser.ts:40-63`
- Modify: `src/components/step1/ImportPreviewModal.tsx:113-165`
- Test: `src/schemas/__tests__/schemas.test.ts` (existing)

- [ ] **Step 1: Write the failing schema round-trip test**

Add to `src/schemas/__tests__/schemas.test.ts`, inside the `describe('currentClusterSchema', …)` area:

```ts
it('parses and preserves largestVmVcpus and largestVmRamGb', () => {
  const result = currentClusterSchema.parse({
    totalVcpus: 100,
    totalPcores: 50,
    totalVms: 20,
    largestVmVcpus: 48,
    largestVmRamGb: 512,
  });
  expect(result.largestVmVcpus).toBe(48);
  expect(result.largestVmRamGb).toBe(512);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/schemas/__tests__/schemas.test.ts`
Expected: FAIL — Zod strips the unknown fields, so both are `undefined`.

- [ ] **Step 3: Add the fields to `OldCluster`**

In `src/types/cluster.ts`, inside `interface OldCluster` (after `isStretchCluster?: boolean;`):

```ts
  readonly largestVmVcpus?: number; // largest single VM by vCPU (import only) — single-VM fit check
  readonly largestVmRamGb?: number; // largest single VM by RAM in GiB (import only) — single-VM fit check
```

- [ ] **Step 4: Add the fields to the Zod schema**

In `src/schemas/currentClusterSchema.ts`, inside `currentClusterSchema = z.object({ … })` (after `isStretchCluster: z.boolean().optional(),`):

```ts
  largestVmVcpus: optionalNonNegativeNumber,
  largestVmRamGb: optionalNonNegativeNumber,
```

- [ ] **Step 5: Run the schema test to verify it passes**

Run: `npx vitest run src/schemas/__tests__/schemas.test.ts`
Expected: PASS.

- [ ] **Step 6: Map the fields on JSON import**

In `src/lib/utils/import/jsonParser.ts`, inside the `const cluster: OldCluster = { … }` object (after the `isStretchCluster` spread, `:40-63`):

```ts
  ...(c.largestVmVcpus != null && { largestVmVcpus: num(c.largestVmVcpus, 'largestVmVcpus') }),
  ...(c.largestVmRamGb != null && { largestVmRamGb: num(c.largestVmRamGb, 'largestVmRamGb') }),
```

- [ ] **Step 7: Capture the fields in `ImportPreviewModal.handleApply` (MiB→GiB for RAM)**

In `src/components/step1/ImportPreviewModal.tsx`, in the non-JSON branch of `handleApply`, inside the `const cluster = { … }` object (after the `isStretchCluster` spread, `:155-156`):

```ts
      ...(previewCluster.largestVmVcpus != null && {
        largestVmVcpus: previewCluster.largestVmVcpus,
      }),
      ...(previewCluster.largestVmRamMib != null && {
        largestVmRamGb: Math.round((previewCluster.largestVmRamMib / 1024) * 10) / 10,
      }),
```

- [ ] **Step 8: Run the full import + schema suites to verify nothing regressed**

Run: `npx vitest run src/schemas src/lib/utils/import`
Expected: PASS (all green).

- [ ] **Step 9: Commit**

```bash
rtk git add src/types/cluster.ts src/schemas/currentClusterSchema.ts src/lib/utils/import/jsonParser.ts src/components/step1/ImportPreviewModal.tsx src/schemas/__tests__/schemas.test.ts
rtk git commit -m "feat(cluster): persist largest-VM vCPU/RAM on OldCluster (schema, json, import apply)"
```

---

## Task 4: Pure feasibility helper `singleVmFit.ts`

**Files:**
- Create: `src/lib/sizing/singleVmFit.ts`
- Test: `src/lib/sizing/__tests__/singleVmFit.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/sizing/__tests__/singleVmFit.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { OldCluster, Scenario } from '../../../types/cluster';
import { createDefaultScenario } from '../defaults';
import { assessSingleVmFit, SMT_THREADS_PER_CORE } from '../singleVmFit';

// Host: 2 sockets x 16 cores = 32 cores, 64 logical (SMT 2), 512 GiB nameplate, no vSAN.
const HOST: Scenario = {
  ...createDefaultScenario(),
  socketsPerServer: 2,
  coresPerSocket: 16,
  ramPerServerGb: 512,
};

function clusterWith(largestVmVcpus?: number, largestVmRamGb?: number): OldCluster {
  return {
    totalVcpus: 0,
    totalPcores: 0,
    totalVms: 0,
    ...(largestVmVcpus !== undefined && { largestVmVcpus }),
    ...(largestVmRamGb !== undefined && { largestVmRamGb }),
  };
}

describe('SMT_THREADS_PER_CORE', () => {
  it('is 2 (x86 standard)', () => {
    expect(SMT_THREADS_PER_CORE).toBe(2);
  });
});

describe('assessSingleVmFit — vCPU dimension', () => {
  it('ok when largest vCPU <= physical cores', () => {
    expect(assessSingleVmFit(clusterWith(32, 8), HOST).vcpu).toBe('ok');
  });
  it('warn when largest vCPU is between cores and logical CPUs (relies on SMT)', () => {
    expect(assessSingleVmFit(clusterWith(48, 8), HOST).vcpu).toBe('warn');
  });
  it('fail when largest vCPU exceeds logical CPUs', () => {
    expect(assessSingleVmFit(clusterWith(96, 8), HOST).vcpu).toBe('fail');
  });
  it('unknown when no largest-vCPU data', () => {
    expect(assessSingleVmFit(clusterWith(undefined, 8), HOST).vcpu).toBe('unknown');
  });
});

describe('assessSingleVmFit — RAM dimension', () => {
  it('ok when largest RAM <= usable (no vSAN → usable === nameplate)', () => {
    expect(assessSingleVmFit(clusterWith(8, 512), HOST).ram).toBe('ok');
  });
  it('fail when largest RAM exceeds nameplate', () => {
    expect(assessSingleVmFit(clusterWith(8, 768), HOST).ram).toBe('fail');
  });
  it('warn when largest RAM is between usable and nameplate (vSAN overhead)', () => {
    // vSAN on: usable = 512 - 6 = 506 GiB; 510 GiB is > usable but <= nameplate.
    const vsanHost: Scenario = { ...HOST, vsanFttPolicy: 'raid1-ftt1', vsanMemoryPerHostGb: 6 };
    expect(assessSingleVmFit(clusterWith(8, 510), vsanHost).ram).toBe('warn');
    expect(assessSingleVmFit(clusterWith(8, 510), vsanHost).usableRamGb).toBe(506);
  });
  it('unknown when no largest-RAM data', () => {
    expect(assessSingleVmFit(clusterWith(8, undefined), HOST).ram).toBe('unknown');
  });
});

describe('assessSingleVmFit — overall', () => {
  it('overall is the worst of the two known dimensions', () => {
    const fit = assessSingleVmFit(clusterWith(48, 768), HOST); // vcpu=warn, ram=fail
    expect(fit.overall).toBe('fail');
  });
  it('overall ignores an unknown dimension', () => {
    const fit = assessSingleVmFit(clusterWith(48, undefined), HOST); // vcpu=warn, ram=unknown
    expect(fit.overall).toBe('warn');
  });
  it('overall is unknown when both dimensions are unknown', () => {
    const fit = assessSingleVmFit(clusterWith(undefined, undefined), HOST);
    expect(fit.overall).toBe('unknown');
  });
  it('echoes the host geometry and largest-VM numbers for UI copy', () => {
    const fit = assessSingleVmFit(clusterWith(48, 256), HOST);
    expect(fit.coresPerServer).toBe(32);
    expect(fit.logicalCpus).toBe(64);
    expect(fit.largestVmVcpus).toBe(48);
    expect(fit.largestVmRamGb).toBe(256);
  });
});
```

> If `'raid1-ftt1'` is not a valid `VsanFttPolicy` literal, substitute any real member of that union (see `src/lib/sizing/vsanConstants.ts`). The only requirement is that `vsanFttPolicy` is defined so the vSAN path is taken.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/sizing/__tests__/singleVmFit.test.ts`
Expected: FAIL — module `../singleVmFit` does not exist.

- [ ] **Step 3: Implement the helper**

Create `src/lib/sizing/singleVmFit.ts`:

```ts
import type { OldCluster, Scenario } from '../../types/cluster';
import { computeVsanEffectiveRamPerNode } from './vsanFormulas';

export type FitVerdict = 'ok' | 'warn' | 'fail' | 'unknown';

export interface SingleVmFit {
  vcpu: FitVerdict;
  ram: FitVerdict;
  /** Worst of vcpu/ram; an `unknown` dimension is ignored unless both are unknown. */
  overall: FitVerdict;
  largestVmVcpus?: number; // echoed for UI copy
  largestVmRamGb?: number;
  coresPerServer: number; // sockets x cores/socket
  logicalCpus: number; // coresPerServer x SMT_THREADS_PER_CORE
  usableRamGb: number; // vSAN-aware
}

/** x86 standard 2 threads/core. YAGNI to make configurable now. */
export const SMT_THREADS_PER_CORE = 2;

const RANK: Record<FitVerdict, number> = { unknown: -1, ok: 0, warn: 1, fail: 2 };

function assessVcpu(largest: number | undefined, cores: number, logical: number): FitVerdict {
  if (largest === undefined) return 'unknown';
  if (largest <= cores) return 'ok';
  if (largest <= logical) return 'warn';
  return 'fail';
}

function assessRam(largest: number | undefined, usable: number, nameplate: number): FitVerdict {
  if (largest === undefined) return 'unknown';
  if (largest <= usable) return 'ok';
  if (largest <= nameplate) return 'warn';
  return 'fail';
}

function worstVerdict(a: FitVerdict, b: FitVerdict): FitVerdict {
  const known = [a, b].filter((v): v is Exclude<FitVerdict, 'unknown'> => v !== 'unknown');
  if (known.length === 0) return 'unknown';
  return known.reduce((worst, v) => (RANK[v] > RANK[worst] ? v : worst));
}

/**
 * Non-blocking single-VM fit check: can the cluster's largest VM (by vCPU and by
 * RAM, independently) fit on ONE proposed target host? Pure; never divides — only
 * compares — so degenerate host configs (cores=0/RAM=0) compare cleanly.
 */
export function assessSingleVmFit(cluster: OldCluster, scenario: Scenario): SingleVmFit {
  const coresPerServer = scenario.socketsPerServer * scenario.coresPerSocket;
  const logicalCpus = coresPerServer * SMT_THREADS_PER_CORE;
  const vsanApplies = scenario.vsanFttPolicy !== undefined;
  const usableRamGb = vsanApplies
    ? computeVsanEffectiveRamPerNode(scenario.ramPerServerGb, scenario.vsanMemoryPerHostGb)
    : scenario.ramPerServerGb;

  const vcpu = assessVcpu(cluster.largestVmVcpus, coresPerServer, logicalCpus);
  const ram = assessRam(cluster.largestVmRamGb, usableRamGb, scenario.ramPerServerGb);

  return {
    vcpu,
    ram,
    overall: worstVerdict(vcpu, ram),
    ...(cluster.largestVmVcpus !== undefined && { largestVmVcpus: cluster.largestVmVcpus }),
    ...(cluster.largestVmRamGb !== undefined && { largestVmRamGb: cluster.largestVmRamGb }),
    coresPerServer,
    logicalCpus,
    usableRamGb,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/sizing/__tests__/singleVmFit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/lib/sizing/singleVmFit.ts src/lib/sizing/__tests__/singleVmFit.test.ts
rtk git commit -m "feat(sizing): add pure single-VM fit helper (vCPU + RAM, vSAN-aware)"
```

---

## Task 5: Embed `singleVmFit` in `ScenarioResult`

**Files:**
- Modify: `src/types/results.ts:16-38`
- Modify: `src/lib/sizing/constraints.ts:1-15, 82-87, 241-258`
- Test: `src/lib/sizing/__tests__/constraints.test.ts` (existing)

- [ ] **Step 1: Write the failing test**

Add to `src/lib/sizing/__tests__/constraints.test.ts` (reuse the existing exported fixtures `CPU_LIMITED_CLUSTER`/`CPU_LIMITED_SCENARIO`):

```ts
describe('computeScenarioResult — singleVmFit', () => {
  it('includes a singleVmFit verdict on every result', () => {
    const result = computeScenarioResult(CPU_LIMITED_CLUSTER, CPU_LIMITED_SCENARIO);
    expect(result.singleVmFit).toBeDefined();
    // CPU_LIMITED_CLUSTER has no largestVm* fields → both dimensions unknown.
    expect(result.singleVmFit.overall).toBe('unknown');
  });

  it('flags a monster VM that exceeds the host', () => {
    const cluster = { ...CPU_LIMITED_CLUSTER, largestVmVcpus: 999, largestVmRamGb: 99999 };
    const result = computeScenarioResult(cluster, CPU_LIMITED_SCENARIO);
    expect(result.singleVmFit.overall).toBe('fail');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/sizing/__tests__/constraints.test.ts`
Expected: FAIL — `result.singleVmFit` is `undefined`.

- [ ] **Step 3: Add the field to `ScenarioResult`**

In `src/types/results.ts`, add the import at the top (with the other type imports):

```ts
import type { SingleVmFit } from '../lib/sizing/singleVmFit';
```

Inside `interface ScenarioResult` (after `stretchPairedCount?: number;`):

```ts
  /** Non-blocking single-VM feasibility verdict (largest VM vs one host). */
  readonly singleVmFit: SingleVmFit;
```

- [ ] **Step 4: Populate it in `computeScenarioResult`**

In `src/lib/sizing/constraints.ts`, add to the imports block (`:1-15`):

```ts
import { assessSingleVmFit } from './singleVmFit';
```

In the returned frozen object (`:241-258`), add a field (e.g. after `stretchApplied,` and before the conditional `stretchPairedCount` spread):

```ts
    singleVmFit: assessSingleVmFit(cluster, scenario),
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/sizing/__tests__/constraints.test.ts`
Expected: PASS.

- [ ] **Step 6: Type-check the whole project (results flow through `useScenariosResults`)**

Run: `npx tsc -b`
Expected: clean (no errors). Confirms every `ScenarioResult` consumer still type-checks with the new required field.

- [ ] **Step 7: Commit**

```bash
rtk git add src/types/results.ts src/lib/sizing/constraints.ts src/lib/sizing/__tests__/constraints.test.ts
rtk git commit -m "feat(sizing): embed singleVmFit verdict in ScenarioResult"
```

---

## Task 6: i18n keys for the banner and the import preview line (en/fr/de/it)

**Files:**
- Modify: `src/i18n/locales/{en,fr,de,it}/step2.json`
- Modify: `src/i18n/locales/{en,fr,de,it}/step1.json`
- Test: `src/i18n/__tests__/keyParity.test.ts` (existing — must stay green)

- [ ] **Step 1: Add the `singleVmFit` block to `en/step2.json`**

In `src/i18n/locales/en/step2.json`, add a top-level `"singleVmFit"` object (sibling of `"results"`):

```json
  "singleVmFit": {
    "titleWarn": "Largest VM is a tight fit",
    "titleFail": "Largest VM does not fit one host",
    "vcpuWarn": "Largest VM ({{vcpu}} vCPU) exceeds this host's {{cores}} physical cores — it would rely on SMT / span NUMA nodes ({{logical}} logical CPUs).",
    "vcpuFail": "Largest VM ({{vcpu}} vCPU) exceeds this host's {{logical}} logical CPUs — it cannot run on a single host.",
    "ramWarn": "Largest VM needs {{ram}} GiB RAM; host offers {{usable}} GiB usable (of {{nameplate}} GiB) — fits nameplate but not after overhead.",
    "ramFail": "Largest VM needs {{ram}} GiB RAM; host offers only {{nameplate}} GiB — it cannot run on a single host."
  }
```

- [ ] **Step 2: Add the `importPreview.largestVm` key to `en/step1.json`**

In `src/i18n/locales/en/step1.json`, inside the existing `"importPreview"` object:

```json
    "largestVm": "Largest VM: {{vcpu}} vCPU / {{ram}} GiB"
```

(Add a comma after the preceding entry as needed to keep valid JSON.)

- [ ] **Step 3: Mirror both additions into fr/de/it**

Add the same key paths with translated values. Use these (review for tone, but keys must match exactly):

`fr/step2.json` → `singleVmFit`:
```json
  "singleVmFit": {
    "titleWarn": "La plus grande VM tient tout juste",
    "titleFail": "La plus grande VM ne tient pas sur un hôte",
    "vcpuWarn": "La plus grande VM ({{vcpu}} vCPU) dépasse les {{cores}} cœurs physiques de cet hôte — elle reposerait sur le SMT / s'étendrait sur plusieurs nœuds NUMA ({{logical}} CPU logiques).",
    "vcpuFail": "La plus grande VM ({{vcpu}} vCPU) dépasse les {{logical}} CPU logiques de cet hôte — elle ne peut pas tenir sur un seul hôte.",
    "ramWarn": "La plus grande VM nécessite {{ram}} Gio de RAM ; l'hôte offre {{usable}} Gio utilisables (sur {{nameplate}} Gio) — tient sur la capacité nominale mais pas après surcharge.",
    "ramFail": "La plus grande VM nécessite {{ram}} Gio de RAM ; l'hôte n'offre que {{nameplate}} Gio — elle ne peut pas tenir sur un seul hôte."
  }
```
`fr/step1.json` → `importPreview.largestVm`: `"Plus grande VM : {{vcpu}} vCPU / {{ram}} Gio"`

`de/step2.json` → `singleVmFit`:
```json
  "singleVmFit": {
    "titleWarn": "Größte VM passt nur knapp",
    "titleFail": "Größte VM passt nicht auf einen Host",
    "vcpuWarn": "Größte VM ({{vcpu}} vCPU) übersteigt die {{cores}} physischen Kerne dieses Hosts — sie würde auf SMT angewiesen sein / NUMA-Knoten überspannen ({{logical}} logische CPUs).",
    "vcpuFail": "Größte VM ({{vcpu}} vCPU) übersteigt die {{logical}} logischen CPUs dieses Hosts — sie kann nicht auf einem einzelnen Host laufen.",
    "ramWarn": "Größte VM benötigt {{ram}} GiB RAM; Host bietet {{usable}} GiB nutzbar (von {{nameplate}} GiB) — passt auf Nennkapazität, aber nicht nach Overhead.",
    "ramFail": "Größte VM benötigt {{ram}} GiB RAM; Host bietet nur {{nameplate}} GiB — sie kann nicht auf einem einzelnen Host laufen."
  }
```
`de/step1.json` → `importPreview.largestVm`: `"Größte VM: {{vcpu}} vCPU / {{ram}} GiB"`

`it/step2.json` → `singleVmFit`:
```json
  "singleVmFit": {
    "titleWarn": "La VM più grande entra a malapena",
    "titleFail": "La VM più grande non entra in un host",
    "vcpuWarn": "La VM più grande ({{vcpu}} vCPU) supera i {{cores}} core fisici di questo host — si baserebbe su SMT / si estenderebbe su più nodi NUMA ({{logical}} CPU logiche).",
    "vcpuFail": "La VM più grande ({{vcpu}} vCPU) supera le {{logical}} CPU logiche di questo host — non può funzionare su un singolo host.",
    "ramWarn": "La VM più grande richiede {{ram}} GiB di RAM; l'host offre {{usable}} GiB utilizzabili (su {{nameplate}} GiB) — entra nella capacità nominale ma non dopo l'overhead.",
    "ramFail": "La VM più grande richiede {{ram}} GiB di RAM; l'host offre solo {{nameplate}} GiB — non può funzionare su un singolo host."
  }
```
`it/step1.json` → `importPreview.largestVm`: `"VM più grande: {{vcpu}} vCPU / {{ram}} GiB"`

- [ ] **Step 4: Run the key-parity test**

Run: `npx vitest run src/i18n/__tests__/keyParity.test.ts`
Expected: PASS — all 4 locales have identical key sets for `step1` and `step2`.

- [ ] **Step 5: Commit**

```bash
rtk git add src/i18n/locales
rtk git commit -m "feat(i18n): add single-VM fit + largest-VM keys (en/fr/de/it)"
```

---

## Task 7: Step 2 banner in `ScenarioResults`

**Files:**
- Modify: `src/components/step2/ScenarioResults.tsx`
- Test: `src/components/step2/__tests__/ScenarioResults.test.tsx` (add; the existing `ScenarioCard.test.tsx` already imports and renders `ScenarioResults` and mutates stores — mirror that setup)

- [ ] **Step 1: Write the failing component test**

Create `src/components/step2/__tests__/ScenarioResults.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultScenario } from '@/lib/sizing/defaults';
import { useClusterStore } from '@/store/useClusterStore';
import { useScenariosStore } from '@/store/useScenariosStore';
import { useWizardStore } from '@/store/useWizardStore';
import { ScenarioResults } from '../ScenarioResults';

// Host: 2 x 16 = 32 cores / 64 logical, 512 GiB.
const scenario = { ...createDefaultScenario(), socketsPerServer: 2, coresPerSocket: 16, ramPerServerGb: 512 };

beforeEach(() => {
  useScenariosStore.setState({ scenarios: [scenario] });
  useWizardStore.setState({ currentStep: 2, sizingMode: 'vcpu', layoutMode: 'hci' });
});

describe('ScenarioResults — single-VM fit banner', () => {
  it('renders a fail callout when the largest VM cannot fit one host', () => {
    useClusterStore.setState({
      currentCluster: { totalVcpus: 100, totalPcores: 50, totalVms: 20, largestVmVcpus: 999 },
    });
    render(<ScenarioResults scenarioId={scenario.id} />);
    expect(screen.getByText(/cannot run on a single host/i)).toBeInTheDocument();
  });

  it('renders a warn banner when the largest VM relies on SMT', () => {
    useClusterStore.setState({
      currentCluster: { totalVcpus: 100, totalPcores: 50, totalVms: 20, largestVmVcpus: 48 },
    });
    render(<ScenarioResults scenarioId={scenario.id} />);
    expect(screen.getByText(/rely on SMT/i)).toBeInTheDocument();
  });

  it('renders no fit banner when the largest VM fits (ok)', () => {
    useClusterStore.setState({
      currentCluster: { totalVcpus: 100, totalPcores: 50, totalVms: 20, largestVmVcpus: 16, largestVmRamGb: 128 },
    });
    render(<ScenarioResults scenarioId={scenario.id} />);
    expect(screen.queryByText(/single host|rely on SMT/i)).not.toBeInTheDocument();
  });

  it('renders no fit banner for manual entry (unknown — no largest-VM data)', () => {
    useClusterStore.setState({ currentCluster: { totalVcpus: 100, totalPcores: 50, totalVms: 20 } });
    render(<ScenarioResults scenarioId={scenario.id} />);
    expect(screen.queryByText(/single host|rely on SMT/i)).not.toBeInTheDocument();
  });
});
```

> Confirm the prop name `scenarioId` matches the actual `ScenarioResults` signature (it is read via `scenarios.findIndex((s) => s.id === scenarioId)` in the component). If the component instead reads the active scenario from the store, set that store state and drop the prop.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/step2/__tests__/ScenarioResults.test.tsx`
Expected: FAIL — no fit banner rendered.

- [ ] **Step 3: Add the presentational banner**

In `src/components/step2/ScenarioResults.tsx`, after the existing results block (the `<div className="mt-4 p-4 …">` that renders server counts), and only when `result` is defined, render the banner. Add a small helper inside the component body that builds the message from `result.singleVmFit`, then the JSX:

```tsx
  const fit = result?.singleVmFit;
  const showFit = fit !== undefined && (fit.overall === 'warn' || fit.overall === 'fail');

  const fitTitle =
    fit?.overall === 'fail' ? t('singleVmFit.titleFail') : t('singleVmFit.titleWarn');

  const fitLines: string[] = [];
  if (fit) {
    if (fit.vcpu === 'warn') {
      fitLines.push(
        t('singleVmFit.vcpuWarn', { vcpu: fit.largestVmVcpus, cores: fit.coresPerServer, logical: fit.logicalCpus }),
      );
    } else if (fit.vcpu === 'fail') {
      fitLines.push(t('singleVmFit.vcpuFail', { vcpu: fit.largestVmVcpus, logical: fit.logicalCpus }));
    }
    if (fit.ram === 'warn') {
      fitLines.push(
        t('singleVmFit.ramWarn', { ram: fit.largestVmRamGb, usable: fit.usableRamGb, nameplate: scenario?.ramPerServerGb }),
      );
    } else if (fit.ram === 'fail') {
      fitLines.push(t('singleVmFit.ramFail', { ram: fit.largestVmRamGb, nameplate: scenario?.ramPerServerGb }));
    }
  }
```

JSX (place after the results `<div>`; `fail` uses the red `util-high` token, `warn` uses the amber pattern from `ImportPreviewModal:194`):

```tsx
      {showFit && (
        <div
          className={
            fit?.overall === 'fail'
              ? 'mt-3 flex flex-col gap-1 p-3 rounded border border-util-high/40 bg-util-high/10'
              : 'mt-3 flex flex-col gap-1 p-3 rounded border border-amber-400/40 bg-amber-50/60 dark:bg-amber-950/20'
          }
          role="status"
        >
          <p className={fit?.overall === 'fail' ? 'text-sm font-medium text-util-high' : 'text-sm font-medium text-amber-700 dark:text-amber-300'}>
            {fitTitle}
          </p>
          {fitLines.map((line) => (
            <p key={line} className="text-sm text-foreground/80">
              {line}
            </p>
          ))}
        </div>
      )}
```

No math lives in the component — all numbers come from `result.singleVmFit` (and `scenario.ramPerServerGb` for the nameplate echo).

- [ ] **Step 4: Run the component test to verify it passes**

Run: `npx vitest run src/components/step2/__tests__/ScenarioResults.test.tsx`
Expected: PASS (all four cases).

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/step2/ScenarioResults.tsx src/components/step2/__tests__/ScenarioResults.test.tsx
rtk git commit -m "feat(step2): non-blocking single-VM fit banner (amber warn / red fail)"
```

---

## Task 8: Step 1 import-preview largest-VM info line

**Files:**
- Modify: `src/components/step1/ImportPreviewModal.tsx` (render block ~`:249-315`)
- Test: `src/components/step1/__tests__/ImportPreviewModal.test.tsx` (existing)

- [ ] **Step 1: Write the failing test**

Add to `src/components/step1/__tests__/ImportPreviewModal.test.tsx`. The file mocks stores and `aggregateScopes`; use a single-scope `ScopeData`-style result so `previewCluster` is the result itself:

```tsx
describe('Largest-VM info line', () => {
  const RESULT_WITH_LARGEST = {
    totalVcpus: 100,
    totalVms: 20,
    totalDiskGb: 500,
    avgRamPerVmGb: 8,
    sourceFormat: 'rvtools' as const,
    vmCount: 20,
    warnings: [],
    largestVmVcpus: 48,
    largestVmRamMib: 262144, // 256 GiB
  };

  it('shows the largest-VM line (vCPU / GiB) when data is present', () => {
    render(<ImportPreviewModal result={RESULT_WITH_LARGEST} {...defaultProps} />);
    expect(screen.getByText(/Largest VM:\s*48 vCPU\s*\/\s*256 GiB/i)).toBeInTheDocument();
  });

  it('omits the largest-VM line when no per-VM data (manual-equivalent import)', () => {
    const { largestVmVcpus: _v, largestVmRamMib: _r, ...withoutLargest } = RESULT_WITH_LARGEST;
    render(<ImportPreviewModal result={withoutLargest} {...defaultProps} />);
    expect(screen.queryByText(/Largest VM:/i)).not.toBeInTheDocument();
  });
});
```

> Use the same `defaultProps` and render helper the existing tests in this file use. If `previewCluster` is only the aggregated value for multi-scope, this single-scope shape exercises the `result as ScopeData` branch — confirm against `ImportPreviewModal:104-107`.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/step1/__tests__/ImportPreviewModal.test.tsx`
Expected: FAIL — no "Largest VM:" text.

- [ ] **Step 3: Render the info line**

In `src/components/step1/ImportPreviewModal.tsx`, in the non-JSON preview info block (near the avg-RAM / pcores lines, ~`:265-273`), add — converting MiB→GiB for display, no stored math:

```tsx
            {previewCluster.largestVmVcpus != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t('importPreview.largestVm', {
                    vcpu: previewCluster.largestVmVcpus,
                    ram:
                      previewCluster.largestVmRamMib != null
                        ? Math.round((previewCluster.largestVmRamMib / 1024) * 10) / 10
                        : 0,
                  })}
                </span>
              </div>
            )}
```

> Match the existing markup pattern for these info rows (the surrounding lines use a label/value `flex justify-between` row — copy that exact structure so styling is consistent). The `t` namespace here is `step1` (confirm via the component's `useTranslation('step1')` call).

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/step1/__tests__/ImportPreviewModal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/step1/ImportPreviewModal.tsx src/components/step1/__tests__/ImportPreviewModal.test.tsx
rtk git commit -m "feat(step1): show largest-VM info line in import preview"
```

---

## Task 9: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Type-check**

Run: `npx tsc -b`
Expected: clean.

- [ ] **Step 2: Lint + format**

Run: `npx biome check .`
Expected: no errors. (Per CLAUDE.md, do NOT use `rtk lint` for Biome — it mis-parses the output. If autofixable, run `npx biome check --write .` then re-run.)

- [ ] **Step 3: Full test suite**

Run: `npx vitest run`
Expected: all green (757 existing + the new tests).

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: succeeds (`tsc -b && vite build`).

- [ ] **Step 5: Final commit (only if Step 2 auto-fixed formatting)**

```bash
rtk git add -A
rtk git commit -m "chore: biome format for single-VM fit feature"
```

---

## Self-Review

**Spec coverage** (every spec section maps to a task):

- Capture `ScopeData.largestVmVcpus/largestVmRamMib` in both parsers → Task 1.
- `aggregateScopes` takes the MAX (not sum) → Task 2.
- `OldCluster.largestVmVcpus?/largestVmRamGb?`, populated in `handleApply` (MiB→GiB), round-trip via schema + jsonParser → Task 3.
- Pure helper `singleVmFit.ts` with exact thresholds, vSAN-aware `usableRamGb`, `overall` precedence, both-unknown case → Task 4 (+ its tests).
- `ScenarioResult.singleVmFit` + `computeScenarioResult` integration; flows through `useScenariosResults` automatically → Task 5.
- i18n keys in 4 locales, parity test green → Task 6.
- Step 2 amber/red non-blocking banner, `ok`/`unknown` render nothing, copy from numbers via i18n → Task 7.
- Step 1 import-preview largest-VM line, shown only when present → Task 8.
- Edge cases: manual/old-JSON → `unknown` (Task 4 tests + Task 7/8 absence tests); degenerate host (cores=0/RAM=0) handled by pure comparison, no division (Task 4 helper); vSAN-off → `usableRamGb = ramPerServerGb` (Task 4 helper).
- Tests + `tsc`/`vitest`/`biome`/`build` gates → Tasks 1-8 inline + Task 9.

**Out of scope (not planned, per spec):** configurable SMT, per-NUMA fit, Step 3/PPTX surfacing, manual-entry largest-VM capture.

**Type consistency:** `FitVerdict`/`SingleVmFit`/`SMT_THREADS_PER_CORE`/`assessSingleVmFit` defined in Task 4 are used verbatim in Tasks 5/7. `largestVmVcpus`/`largestVmRamMib` (MiB, import layer) vs `largestVmVcpus`/`largestVmRamGb` (GiB, `OldCluster`) — the MiB→GiB conversion happens exactly once, in `handleApply` (Task 3) and in the Step 1 display (Task 8); the helper and banner only ever see GiB. `coresPerServer = socketsPerServer × coresPerSocket` computed once, in the helper.

**Placeholder scan:** every code step contains complete code; the only `>` notes are guard-rails telling the engineer to match an existing fixture/prop name they must confirm by reading the target file — not deferred implementation.
