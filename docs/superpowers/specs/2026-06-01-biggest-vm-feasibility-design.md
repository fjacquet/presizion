# Biggest-VM Feasibility Check — Design

**Date:** 2026-06-01
**Status:** Approved (brainstorm); to be planned
**Milestone:** post-v2.9.0

## Context

Presizion sizes a refreshed cluster from aggregate metrics (total vCPUs, total
VMs, average RAM/VM, …) but never checks that the cluster's **largest single
VM** can actually fit on **one** proposed host. `OldCluster` stores only
aggregates, and no constraint validates single-VM fit. So the app can silently
recommend, e.g., a 384 GiB host when a monster VM needs 512 GiB, or a host with
fewer logical CPUs than a VM's vCPU count — a real sizing error a presales
engineer would be embarrassed to ship in a customer deck.

This adds a **non-blocking, two-tier feasibility check**: capture the biggest VM
(by vCPU and by RAM) at import, and warn per-scenario when the proposed host
can't host it. The vCPU:pCore ratio is an *aggregate* consolidation cap and is
deliberately **not** used for single-VM fit.

## Decisions (locked in brainstorm)

- **Behavior:** always non-blocking. **Two tiers** — amber (`warn`) and red
  (`fail`, still non-blocking). Never gate advancing/export.
- **vCPU fit** (vs `coresPerServer = sockets × cores/socket`):
  `ok` ≤ cores · `warn` ≤ cores × SMT(2) · `fail` > cores × SMT(2).
- **RAM fit** (usable = nameplate − vSAN/host overhead):
  `ok` ≤ usable · `warn` ≤ nameplate `ramPerServerGb` · `fail` > nameplate.
- **Data source:** captured at **import only** (RVTools/LiveOptics per-VM rows).
  Manual entry has no per-VM data → verdict `unknown` → check silently skipped.
- **Surfacing:** per-scenario banner in Step 2 `ScenarioResults` + a largest-VM
  info line in the Step 1 import preview.
- **Architecture (Approach A):** pure helper in `src/lib/sizing/`, verdict
  embedded in `ScenarioResult`, UI purely presentational.

The largest-vCPU VM and largest-RAM VM may be **different VMs** — that is
correct: the two host dimensions are independent, so the worst case per
dimension is what must fit.

## Units

`VmRow.ramMib` is MiB; convert to GiB (`/1024`) for `largestVmRamGb`, consistent
with how `avgRamPerVmGb` is derived. `ramPerServerGb` is treated as GiB
throughout (matching existing usage). UI labels use "GiB".

## Components & data flow

### 1. Capture (import → model)

- **`VmRow`** already carries `vcpus` and `ramMib` (`src/lib/utils/import/index.ts`).
- **`ScopeData`**: add `largestVmVcpus: number` and `largestVmRamMib: number`.
  Both parsers (`rvtoolsParser.ts`, `liveopticParser.ts`) compute these as the
  per-scope max while iterating VM rows (same loop that builds `vmRowsByScope`).
- **`aggregateScopes`** (`scopeAggregator.ts`): when combining selected scopes,
  take the **max** of `largestVmVcpus` / `largestVmRamMib` across them (not sum).
- **`OldCluster`** (`src/types/cluster.ts`): add optional
  `largestVmVcpus?: number` and `largestVmRamGb?: number`. Populated in
  `ImportPreviewModal.handleApply` from `previewCluster` (MiB→GiB for RAM).
  Persist in the session/JSON export like other optional cluster fields
  (round-trips through `persistence.ts` / `jsonParser.ts` automatically as plain
  numeric fields). Absent for manual entry and JSON-without-the-fields (v-compat:
  older JSON simply lacks them → `unknown`).

### 2. Feasibility helper (pure)

`src/lib/sizing/singleVmFit.ts`:

```ts
export type FitVerdict = 'ok' | 'warn' | 'fail' | 'unknown';

export interface SingleVmFit {
  vcpu: FitVerdict;
  ram: FitVerdict;
  overall: FitVerdict;        // worst of vcpu/ram; 'unknown' ignored unless both unknown
  largestVmVcpus?: number;    // echoed for UI copy
  largestVmRamGb?: number;
  coresPerServer: number;
  logicalCpus: number;        // coresPerServer × SMT_THREADS_PER_CORE
  usableRamGb: number;        // vSAN-aware
}

export const SMT_THREADS_PER_CORE = 2; // x86 standard; YAGNI to make configurable now

export function assessSingleVmFit(cluster: OldCluster, scenario: Scenario): SingleVmFit;
```

Thresholds exactly as in Decisions. `usableRamGb` = `computeVsanEffectiveRamPerNode(scenario)`
when vSAN applies (HCI), else `scenario.ramPerServerGb`. `overall` precedence
`ok < warn < fail`; a dimension that is `unknown` is ignored; if both dimensions
are `unknown`, `overall = 'unknown'`.

### 3. ScenarioResult integration

- `src/types/results.ts`: add `readonly singleVmFit: SingleVmFit;`.
- `computeScenarioResult` (`constraints.ts`): call `assessSingleVmFit(cluster, scenario)`
  and include it in the returned result. No other result fields change.
- `useScenariosResults` already maps cluster+scenario through `computeScenarioResult`,
  so every consumer receives `singleVmFit` with no extra wiring.

### 4. UI (presentational)

- **`ScenarioResults.tsx`** (Step 2): when `singleVmFit.overall === 'warn'`
  render an amber banner; `=== 'fail'` render a red (non-blocking) callout;
  `ok`/`unknown` render nothing. Reuse the existing amber-banner styling pattern
  (`border-amber-400/40 bg-amber-50/60 …`; red variant uses `util-high`). Copy is
  built from `singleVmFit` numbers via i18n — no math in the component.
- **`ImportPreviewModal.tsx`** (Step 1): info line `t('importPreview.largestVm', { vcpu, ram })`
  shown when `previewCluster.largestVmVcpus` is present.

### 5. i18n (en/fr/de/it, parity-tested)

- `step2.singleVmFit`:
  - `vcpuFail` / `vcpuWarn` — "Largest VM ({{vcpu}} vCPU) exceeds this host's
    {{hostVcpu}} … " (warn: "relies on SMT / spans NUMA nodes").
  - `ramFail` / `ramWarn` — "Largest VM needs {{ram}} GiB RAM; host offers
    {{hostRamGb}} GiB usable …".
  - Banner title/lead keys as needed (e.g. `titleWarn`, `titleFail`).
- `step1.importPreview.largestVm` — "Largest VM: {{vcpu}} vCPU / {{ram}} GiB".

## Error handling / edge cases

- Missing per-VM data (manual, old JSON) → `unknown` → no banner, no info line.
- Zero/degenerate host config (cores=0 or RAM=0) → treated as `fail` only when a
  largest-VM value exists and exceeds it; otherwise `unknown`/`ok` (don't warn on
  an unconfigured scenario). Helper must not divide; it only compares.
- vSAN disabled / disaggregated → `usableRamGb = ramPerServerGb` (no overhead
  subtraction beyond what `computeVsanEffectiveRamPerNode` already returns for the
  non-vSAN path).

## Testing

- **`singleVmFit.test.ts`** — all tiers for vCPU and RAM (ok/warn/fail), `unknown`
  when data absent, vSAN usable-RAM path, `overall = worst`, both-unknown case.
- **Parser/aggregator tests** — per-scope `largestVmVcpus`/`largestVmRamMib`
  captured; `aggregateScopes` returns the max across selected scopes (not sum).
- **`computeScenarioResult`** — result includes a correct `singleVmFit`; update
  existing full-object fixtures to include the new field.
- **Components** — `ScenarioResults` renders amber for `warn`, red for `fail`,
  nothing for `ok`/`unknown`; `ImportPreviewModal` shows the largest-VM line only
  when data present.
- Key-parity test stays green (new keys in all 4 locales).
- `tsc -b` clean · full `vitest` green · `biome check` clean · `npm run build` ok.

## Out of scope (follow-ups)

- Making SMT threads-per-core a configurable scenario field.
- Per-NUMA-node fit (vCPU/RAM per socket) beyond the cores-vs-logical heuristic.
- Surfacing feasibility in the Step 3 review / PPTX export.
- Capturing largest-VM for manual entry (no per-VM data exists there).

## Self-review notes

- **Placeholders:** none.
- **Consistency:** units (MiB→GiB) stated once and applied in capture + helper +
  UI; `usableRamGb` defined once and reused. Verdict precedence defined once.
- **Scope:** single implementation plan — capture, one pure helper, one result
  field, two UI touch-points, i18n, tests. No decomposition needed.
- **Ambiguity:** "largest VM" = independent per-dimension maxima (explicit);
  manual entry = `unknown` (explicit); ratio explicitly excluded from single-VM
  fit.
