# vCPU Sizing: Density-Cap Honesty + Per-Site Stretch HA

**Date:** 2026-06-01
**Status:** Approved (design), pending implementation plan
**Scope:** `src/lib/sizing/display.ts`, `src/lib/sizing/constraints.ts`, `src/components/step2/ScenarioResults.tsx`, and their tests.

## Problem

Three inconsistencies were found while reviewing how vCPU sizing is presented and how
stretch clusters reserve for HA:

1. **The displayed CPU formula lies.** For an example cluster the UI renders
   `ceil(362 × 10% × 120% / 4 / 32)` but the result shown is `4`. Evaluating the
   displayed string gives `362 × 0.10 × 1.20 / 4 / 32 = 0.34 → ceil = 1`, not 4.
   The actual compute (`serverCountByCpu`, `formulas.ts:36`) is
   `ceil(totalVcpus × demandFactor / ratio / coresPerServer) = ceil(362 × 1.20 / 4 / 32) = 4`
   and **deliberately excludes** CPU utilization (`formulas.ts:19-20`).
   Only the display string (`display.ts:68-69`) injects `× util%`, so the formula text
   contradicts the number next to it.

2. **CPU saturation does not belong in vCPU sizing.** vCPU mode is a hard
   assignment-density cap: the cluster must never assign more than `ratio` vCPUs per
   physical core, regardless of how busy those cores are. A parked VM still consumes
   its vCPU assignment. Utilization is therefore irrelevant to the vCPU count.
   (RAM is different — there, utilization genuinely right-sizes to observed
   consumption, and it is kept.)

3. **Stretch HA reserve is added once, globally.** Current code
   (`constraints.ts:199-205`) computes `effectiveRaw = rawCount × 2` then
   `withHA = effectiveRaw + haReserveCount`, so an HA reserve of 1 yields `2N + 1`.
   In a stretch cluster the reserve is a *per-site* intent: "N+1 local" means each
   site independently survives a host failure, i.e. one spare host **per site**, so
   the total should be `2N + 2`.

## Decisions

- **CPU constraint = pure density cap.** Confirmed direction: utilization is removed
  from the CPU sizing entirely. The count is unchanged (already correct); only the
  misleading display factor is removed.
- **Stretch HA reserve = per-site, doubled.** `finalCount = (rawCount + haReserve) × 2`.
- These apply in **all sizing modes** (stretch is applied after the constraint `max`,
  so it is mode-agnostic).

## Design

### 1. vCPU CPU formula — drop utilization from the display

- `cpuFormulaString` (`display.ts`): remove the `cpuUtilizationPercent !== 100` branch.
  Always render `ceil(totalVcpus × headroom% [× +growth% growth] / ratio / coresPerServer)`.
- `CpuFormulaParams`: remove the `cpuUtilizationPercent` field.
- `ScenarioResults.tsx:46`: stop spreading `cpuUtilizationPercent` into the
  `cpuFormulaString({ ... })` call.
- **Unchanged:** the compute path (`serverCountByCpu`, `constraints.ts` CALC-01) and
  the CALC-06 `cpuUtilizationPercent` **output metric** on the result object
  (`constraints.ts:220-226`). That metric is a separate "you are only 10% busy"
  readout and stays — it is just no longer baked into the count formula string.
- **RAM and disk formula strings are unchanged.** RAM keeps `× util%` because it is
  both displayed and computed (`serverCountByRam` applies it) — internally consistent.

### 2. Stretch HA reserve — per-site

In `constraints.ts`, replace the stretch + HA block:

```ts
const stretchApplied = cluster.isStretchCluster === true;
const haReserveCount = scenario.haReserveCount ?? 0;

let withHA: number;
let stretchPairedCount: number | undefined;
if (stretchApplied) {
  stretchPairedCount = rawCount * 2;            // doubled workload (site symmetry)
  withHA = (rawCount + haReserveCount) * 2;     // per-site reserve: N+1 local → +2 total
} else {
  withHA = rawCount + haReserveCount;           // unchanged
}

const finalCount =
  scenario.minServerCount != null ? Math.max(withHA, scenario.minServerCount) : withHA;
```

- `stretchPairedCount` keeps its meaning: doubled **workload** (= `rawCount × 2`),
  independent of the reserve. For `rawCount=24` it stays `48`.
- `finalCount` for `rawCount=24, haReserve=1, stretch` becomes `(24 + 1) × 2 = 50`
  (was `49`). Equivalently `stretchPairedCount + haReserve × 2`.
- Non-stretch behavior (`rawCount + haReserve`) is untouched.
- `minServerCount` floor still applies to `finalCount`.
- `requiredCount` continues to report pre-stretch demand (`rawCount`).

## Testing

- `display.test.ts`: update the "UTIL-03 display" block (lines ~250-265) and any
  util-bearing CPU assertions — the CPU string no longer contains `× util%`.
  Add a regression test: the value produced by evaluating the displayed CPU formula
  equals `result.cpuLimitedCount`.
- `constraints.test.ts`: update the stretch cases (lines ~743-747):
  `stretch + haReserveCount=1` → `finalCount === 50`, `stretchPairedCount === 48`;
  `stretch + haReserveCount=0` → `finalCount === 48` (unchanged).
  Confirm `minServerCount` floor still holds in stretch.
- Full `npm run test` must pass; no other suites should require changes (compute
  counts are otherwise unchanged).

## Out of scope

- No change to RAM/disk formulas or to any computed counts other than stretch+reserve.
- No change to vCPU:pCore ratio semantics, demand factor, vSAN, or layout modes.
- No UI redesign — only the CPU formula string content changes.
