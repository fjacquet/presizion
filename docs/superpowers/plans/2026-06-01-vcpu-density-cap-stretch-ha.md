# vCPU Density-Cap Honesty + Per-Site Stretch HA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the displayed vCPU CPU formula match the number it produces (drop the spurious utilization factor — vCPU sizing is a pure density cap), and make the stretch-cluster HA reserve per-site so "N+1 local" yields one spare host per site.

**Architecture:** Two independent, surgical changes. (1) The CPU *display string* in `display.ts` stops rendering `× util%`; the compute path and the separate CALC-06 utilization *output metric* are unchanged. Removing the `cpuUtilizationPercent` field from `CpuFormulaParams` forces the one call site (`ScenarioResults.tsx`) to stop passing it — `tsc` enforces this structurally. (2) In `constraints.ts`, the stretch branch changes `finalCount` from `rawCount × 2 + haReserve` to `(rawCount + haReserve) × 2`; `stretchPairedCount` (doubled workload) stays `rawCount × 2`.

**Tech Stack:** React 19 + TypeScript strict, Vitest, Biome. Spec: `docs/superpowers/specs/2026-06-01-vcpu-density-cap-stretch-ha-design.md`.

---

## File Structure

- `src/lib/sizing/display.ts` — `cpuFormulaString` + `CpuFormulaParams`: remove the utilization branch and field.
- `src/components/step2/ScenarioResults.tsx` — drop the `cpuUtilizationPercent` spread into `cpuFormulaString(...)`.
- `src/lib/sizing/constraints.ts` — per-site stretch HA reserve.
- `src/lib/sizing/__tests__/display.test.ts` — replace the "UTIL-03 display" block with a density-cap assertion; add an eval-equals-count regression test.
- `src/lib/sizing/__tests__/constraints.test.ts` — update the two stretch + reserve expectations.

---

## Task 1: vCPU CPU formula is a pure density cap (no utilization in the display)

**Files:**
- Modify: `src/lib/sizing/display.ts:14-21` (`CpuFormulaParams`), `:57-72` (`cpuFormulaString`)
- Modify: `src/components/step2/ScenarioResults.tsx:46-56`
- Test: `src/lib/sizing/__tests__/display.test.ts:250-275`

- [ ] **Step 1: Replace the "UTIL-03 display" test block with a density-cap test + regression test**

In `src/lib/sizing/__tests__/display.test.ts`, replace the entire block that begins
`describe('cpuFormulaString with utilization (UTIL-03 display)', () => {` (around line 250)
through its closing `});` with:

```ts
describe('cpuFormulaString — pure density cap (no utilization factor)', () => {
  it('never renders a utilization factor: ceil(2000 × 120% / 4 / 48)', () => {
    const result = cpuFormulaString({
      totalVcpus: 2000,
      growthPercent: 0,
      safetyPercent: 20,
      targetVcpuToPCoreRatio: 4,
      coresPerServer: 48,
    });
    expect(result).toBe('ceil(2000 × 120% / 4 / 48)');
  });
});

// Regression (the displayed CPU formula must equal the number it sits next to).
// Evaluates the rendered string's arithmetic for the growth=0 case and compares
// it to computeScenarioResult's cpuLimitedCount. Before the fix, util≠100 made
// the string evaluate to a different (smaller) number than the count shown.
describe('cpuFormulaString — displayed value equals computed count (regression)', () => {
  function evalCpuFormula(s: string): number {
    // "ceil(3200 × 120% / 4 / 40)" -> 3200 * 1.20 / 4 / 40 -> Math.ceil
    const inner = s.replace(/^ceil\(/, '').replace(/\)$/, '');
    const [factorPart, ...divisors] = inner.split(' / ');
    const pieces = factorPart.split(' × ').map((p) => p.trim());
    let value = Number(pieces[0]);
    for (const p of pieces.slice(1)) {
      const pct = p.match(/^([\d.]+)%$/);
      if (pct) value *= Number(pct[1]) / 100;
    }
    for (const d of divisors) value /= Number(d);
    return Math.ceil(value);
  }

  it('util≠100, growth=0: rendered CPU formula evaluates to cpuLimitedCount', () => {
    const cluster = {
      totalVcpus: 3200,
      totalVms: 100,
      totalPcores: 800,
      cpuUtilizationPercent: 10,
    };
    const scenario = {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'CPU-Limited',
      socketsPerServer: 2,
      coresPerSocket: 20,
      ramPerServerGb: 1024,
      diskPerServerGb: 50000,
      targetVcpuToPCoreRatio: 4,
      ramPerVmGb: 2,
      diskPerVmGb: 10,
      growthPercent: 0,
      safetyPercent: 20,
      haReserveCount: 0 as const,
    };
    const result = computeScenarioResult(cluster, scenario);
    const formula = cpuFormulaString({
      totalVcpus: cluster.totalVcpus,
      safetyPercent: scenario.safetyPercent,
      growthPercent: scenario.growthPercent,
      targetVcpuToPCoreRatio: scenario.targetVcpuToPCoreRatio,
      coresPerServer: scenario.socketsPerServer * scenario.coresPerSocket,
    });
    expect(evalCpuFormula(formula)).toBe(result.cpuLimitedCount); // 24, not 3
  });
});
```

Add `computeScenarioResult` to the imports at the top of `display.test.ts` if not already present:

```ts
import { computeScenarioResult } from '../constraints';
```

- [ ] **Step 2: Run the updated tests to verify they fail (red)**

Run: `rtk vitest run src/lib/sizing/__tests__/display.test.ts`
Expected: FAIL. The regression test fails because the current code (`display.ts:68-69`) renders `ceil(3200 × 10% × 120% / 4 / 40)`, which `evalCpuFormula` reduces to `ceil(3200 × 0.10 × 1.20 / 4 / 40) = ceil(2.4) = 3`, not the `24` from `cpuLimitedCount`. (Compilation still succeeds at this point.)

- [ ] **Step 3: Remove the utilization branch and field from `display.ts`**

In `src/lib/sizing/display.ts`, change `CpuFormulaParams` (remove `cpuUtilizationPercent`):

```ts
export interface CpuFormulaParams {
  readonly totalVcpus: number;
  readonly safetyPercent: number;
  readonly targetVcpuToPCoreRatio: number;
  readonly coresPerServer: number;
  readonly growthPercent?: number;
}
```

Replace `cpuFormulaString` with the density-cap-only version (drop the `cpuUtilizationPercent` branch and its destructure):

```ts
/**
 * Returns a human-readable formula string for the CPU-limited server count (CALC-01).
 *
 * vCPU sizing is a pure assignment-density cap: the count never depends on observed
 * CPU utilization (a parked VM still consumes its vCPU assignment). Utilization is
 * therefore NOT rendered here — doing so previously produced a formula string that
 * evaluated to a different number than the count shown beside it. Observed CPU % is
 * surfaced separately as a result output metric (CALC-06), not inside this formula.
 *
 * Format: ceil(totalVcpus × headroom% [× +growth% growth] / ratio / coresPerServer)
 * Example: "ceil(2000 × 120% / 4 / 48)"
 */
export function cpuFormulaString(params: CpuFormulaParams): string {
  const { totalVcpus, safetyPercent, targetVcpuToPCoreRatio, coresPerServer, growthPercent } =
    params;
  const headroomDisplay = `${100 + safetyPercent}%`;
  const growthSuffix = (growthPercent ?? 0) !== 0 ? ` × +${growthPercent}% growth` : '';
  return `ceil(${totalVcpus} × ${headroomDisplay}${growthSuffix} / ${targetVcpuToPCoreRatio} / ${coresPerServer})`;
}
```

- [ ] **Step 4: Drop the `cpuUtilizationPercent` spread in `ScenarioResults.tsx`**

In `src/components/step2/ScenarioResults.tsx`, the `cpuFormulaString({ ... })` call (around line 46) currently ends with:

```ts
    coresPerServer,
    ...(currentCluster.cpuUtilizationPercent !== undefined && {
      cpuUtilizationPercent: currentCluster.cpuUtilizationPercent,
    }),
  });
```

Remove the spread so it reads:

```ts
    coresPerServer,
  });
```

- [ ] **Step 5: Run the display tests to verify they pass (green)**

Run: `rtk vitest run src/lib/sizing/__tests__/display.test.ts`
Expected: PASS. The regression test now evaluates `ceil(3200 × 120% / 4 / 40) = ceil(24) = 24 === cpuLimitedCount`.

- [ ] **Step 6: Type-check to confirm no stale `cpuUtilizationPercent` usages remain**

Run: `npx tsc -b`
Expected: PASS with no errors. (If `ScenarioResults.tsx` still passed `cpuUtilizationPercent`, `tsc` would error here because the field no longer exists on `CpuFormulaParams` — this is the structural guard against the bug reappearing.)

- [ ] **Step 7: Commit**

```bash
rtk git add src/lib/sizing/display.ts src/components/step2/ScenarioResults.tsx src/lib/sizing/__tests__/display.test.ts
rtk git commit -m "fix(sizing): vCPU formula is a pure density cap — drop spurious util factor from display"
```

---

## Task 2: Per-site stretch HA reserve

**Files:**
- Modify: `src/lib/sizing/constraints.ts:195-209`
- Test: `src/lib/sizing/__tests__/constraints.test.ts:743-753`

- [ ] **Step 1: Update the stretch + reserve expectations (red)**

In `src/lib/sizing/__tests__/constraints.test.ts`, replace the test titled
`'stretch + haReserveCount=1 adds the reserve on top of the paired count'` (around line 743) with:

```ts
  it('stretch + haReserveCount=1 applies the reserve per-site (doubled): (rawCount + 1) × 2', () => {
    const stretchedCluster = { ...CPU_LIMITED_CLUSTER, isStretchCluster: true };
    const stretchedScenario = { ...CPU_LIMITED_SCENARIO, haReserveCount: 1 as const };
    const result = computeScenarioResult(stretchedCluster, stretchedScenario);
    // workload doubling is reserve-independent; reserve is one spare host per site
    expect(result.stretchPairedCount).toBe(48); // rawCount(24) × 2
    expect(result.finalCount).toBe(50); // (24 + 1) × 2
    expect(result.haReserveApplied).toBe(true);
  });
```

Leave the `haReserveCount=0` test (around line 752) unchanged — it must still expect `finalCount` `48` and `stretchPairedCount` `48`. Leave the `minServerCount`, odd-rawCount, and non-stretch regression tests unchanged.

- [ ] **Step 2: Run the stretch tests to verify the changed one fails (red)**

Run: `rtk vitest run src/lib/sizing/__tests__/constraints.test.ts -t stretch`
Expected: FAIL on the per-site test — current code yields `finalCount = 24 × 2 + 1 = 49`, but the test now expects `50`.

- [ ] **Step 3: Make the stretch reserve per-site in `constraints.ts`**

In `src/lib/sizing/constraints.ts`, replace the block from the `stretchApplied` declaration
through the `finalCount` assignment (currently lines ~195-209):

```ts
  // CALC-STRETCH: stretched topology — each site must carry the full workload,
  // so the raw count is doubled for site symmetry. Stretch provides site-level
  // fault tolerance; any explicit haReserveCount set by the user adds on top
  // (belt-and-suspenders) but is not implied.
  const stretchApplied = cluster.isStretchCluster === true;
  let effectiveRaw = rawCount;
  let stretchPairedCount: number | undefined;
  if (stretchApplied) {
    effectiveRaw = rawCount * 2;
    stretchPairedCount = effectiveRaw;
  }

  // CALC-04: HA reserve — add 0, 1, or 2 servers after the constraint max
  const haReserveCount = scenario.haReserveCount ?? 0;
  const withHA = effectiveRaw + haReserveCount;

  // Pin floor: finalCount is never less than minServerCount when set
  const finalCount =
    scenario.minServerCount != null ? Math.max(withHA, scenario.minServerCount) : withHA;
```

with:

```ts
  // CALC-STRETCH + CALC-04: stretched topology — each site carries the full
  // workload, so the workload is doubled for site symmetry (stretchPairedCount).
  // The HA reserve is a PER-SITE intent ("N+1 local"): in a stretch cluster it
  // applies to each site independently, so it is doubled along with the workload.
  // Non-stretch clusters add the reserve once.
  const stretchApplied = cluster.isStretchCluster === true;
  const haReserveCount = scenario.haReserveCount ?? 0;

  let stretchPairedCount: number | undefined;
  let withHA: number;
  if (stretchApplied) {
    stretchPairedCount = rawCount * 2; // doubled workload (reserve-independent)
    withHA = (rawCount + haReserveCount) * 2; // one spare host per site
  } else {
    withHA = rawCount + haReserveCount;
  }

  // Pin floor: finalCount is never less than minServerCount when set
  const finalCount =
    scenario.minServerCount != null ? Math.max(withHA, scenario.minServerCount) : withHA;
```

(`haReserveCount` and `stretchPairedCount` keep the same names/types used later in the
return object and in `haReserveApplied = haReserveCount > 0`, so no other lines change.)

- [ ] **Step 4: Run the stretch tests to verify they pass (green)**

Run: `rtk vitest run src/lib/sizing/__tests__/constraints.test.ts -t stretch`
Expected: PASS. Per-site test → `finalCount` `50`, `stretchPairedCount` `48`; reserve=0 → `48`; `minServerCount` floor (100) and odd-rawCount (38) cases still pass.

- [ ] **Step 5: Run the full sizing suite to catch any dependents**

Run: `rtk vitest run src/lib/sizing`
Expected: PASS. No other sizing test asserts stretch+reserve totals.

- [ ] **Step 6: Commit**

```bash
rtk git add src/lib/sizing/constraints.ts src/lib/sizing/__tests__/constraints.test.ts
rtk git commit -m "fix(sizing): stretch HA reserve is per-site — N+1 local now yields +2 total"
```

---

## Task 3: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the entire test suite**

Run: `rtk vitest run`
Expected: PASS — all suites green (no count changes outside stretch+reserve; CPU display string is the only display change).

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc -b && npx biome check .`
Expected: PASS — no type errors, no new lint violations.

- [ ] **Step 3: Production build sanity**

Run: `npm run build`
Expected: PASS — `tsc -b && vite build` completes cleanly.

---

## Self-Review

- **Spec coverage:** (1) drop CPU util from display → Task 1 Steps 3-4; keep compute + CALC-06 metric → unchanged by design, confirmed by Task 3 full suite. (2) per-site stretch reserve `(rawCount + haReserve) × 2`, `stretchPairedCount = rawCount × 2` → Task 2 Step 3. (3) update both test files + eval-equals-count regression → Task 1 Step 1, Task 2 Step 1. All spec sections map to a task.
- **Placeholder scan:** none — every code step shows full code; every run step shows the command and expected result.
- **Type consistency:** `CpuFormulaParams` field removal is enforced by `tsc -b` (Task 1 Step 6); `haReserveCount` / `stretchPairedCount` / `withHA` names preserved so the return object and `haReserveApplied` are unaffected.
