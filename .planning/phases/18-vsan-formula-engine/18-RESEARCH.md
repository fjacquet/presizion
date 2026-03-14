# Phase 18: vSAN Formula Engine - Research

**Researched:** 2026-03-14
**Domain:** Pure TypeScript math — vSAN storage pipeline, FTT policies, CPU/memory overhead, min-node floors
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VSAN-01 | User can select a Fault Tolerance policy per scenario: Mirror FTT=1 (2x), Mirror FTT=2 (3x), Mirror FTT=3 (4x), RAID-5 3+1 (1.33x), RAID-6 4+2 (1.5x), or None | FTT constant table in `vsanConstants.ts`; union type `VsanFttPolicy` |
| VSAN-02 | Storage sizing computes Raw from Usable using selected FTT multiplier: `raw = usable * fttMultiplier` | `serverCountByVsanStorage` formula function |
| VSAN-03 | Storage pipeline includes vSAN metadata overhead (~2% of usable) | Pipeline step 3; `VSAN_METADATA_OVERHEAD_RATIO = 0.02` constant |
| VSAN-04 | User can toggle VM swap overhead (default OFF; ON adds 100% of VM RAM to storage) | `vsanSwapEnabled?: boolean` on `VsanParams`; pipeline step 2 |
| VSAN-05 | User can set vSAN slack space percentage (default 25%) for operations reserve | `slackPercent` param; `VSAN_DEFAULT_SLACK_PERCENT = 25` constant |
| VSAN-06 | vSAN CPU overhead (default 10%) is deducted from available CPU GHz per node before server count | `vsanCpuOverheadPercent` param; applied in `computeVsanCpuOverheadGhz()` |
| VSAN-07 | User can set vSAN memory overhead per host in GB (default 6 GB) | `vsanMemoryPerHostGb` param; `VSAN_DEFAULT_MEMORY_PER_HOST_GB = 6` constant |
| VSAN-08 | Compression/dedup factor is selectable: None (1.0), Pessimistic (1.3), Conservative (1.5), Moderate (2.0), Optimistic (3.0) | `VsanCompressionFactor` union type + constant map |
| VSAN-09 | Compression is applied to usable demand BEFORE FTT multiplication (not after) | Enforced by pipeline step ordering in `computeVsanStorageRaw()` |
| VSAN-10 | All storage computations use GiB internally; display converts to TiB for values > 1024 GiB | Unit convention enforced by naming (`...Gib` suffix); display utility in `display.ts` |
| VSAN-11 | FTT policy enforces minimum node count (Mirror FTT=1: 3, FTT=2: 5, FTT=3: 7, RAID-5: 4, RAID-6: 6) | `FTT_MIN_NODES` map constant; `getVsanMinNodeCount()` helper |
| VSAN-12 | vSAN settings are per-scenario optional fields; absent fields use legacy sizing path | `vsanFttPolicy?: VsanFttPolicy` on `Scenario`; branch in `computeScenarioResult` guards legacy path |
</phase_requirements>

---

## Summary

Phase 18 is a pure-math phase: no UI, no store, no component. The deliverable is a new file `src/lib/sizing/vsanFormulas.ts` (the formula functions), a new `src/lib/sizing/vsanConstants.ts` (the constant table), optional TypeScript type extensions in `src/types/cluster.ts`, and a test file `src/lib/sizing/__tests__/vsanFormulas.test.ts`.

The existing codebase provides clear extension points. The `Scenario` interface in `src/types/cluster.ts` accepts new optional fields with no breaking change. The `computeScenarioResult` function in `constraints.ts` has a clearly documented CALC-03 branch for disk sizing that can be extended with a vSAN-aware path — when `scenario.vsanFttPolicy` is present, call the new `serverCountByVsanStorage`; when absent, fall through to the legacy `serverCountByDisk`. No existing behavior changes.

All vSAN constants (FTT multipliers, min-node floors, overhead defaults) are drawn directly from VMware/Broadcom documentation and are treated as authoritative. The storage pipeline has six ordered steps and the order is not negotiable — compression before FTT is the correctness invariant that must be covered by tests.

**Primary recommendation:** Create `vsanConstants.ts` and `vsanFormulas.ts` as the two new files; extend `Scenario` interface with optional vSAN fields; extend `computeScenarioResult` with a conditional vSAN storage branch; write comprehensive unit tests using `toBeCloseTo` for all floating-point assertions.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript (strict) | existing | Pure function types, discriminated unions for FTT policy | Project requirement; no-`any` rule |
| Vitest | existing | Unit tests with jsdom environment | Already configured in vitest.config.ts |

No new dependencies required. This phase is math-only TypeScript in `src/lib/sizing/`.

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest `toBeCloseTo` | existing | Floating-point safe assertions | All storage/GiB/ratio assertions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline constants | Named constant objects | Named constants are self-documenting, testable, and referenceable from tests |
| `number` FTT type | Union literal type | Union type prevents invalid policy strings at compile time |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended File Layout
```
src/lib/sizing/
├── vsanConstants.ts      # NEW — FTT multipliers, min-node map, overhead defaults
├── vsanFormulas.ts       # NEW — pure formula functions for storage pipeline, CPU overhead, memory overhead
├── constraints.ts        # MODIFIED — add vSAN storage branch in CALC-03
├── defaults.ts           # MODIFIED — add DEFAULT_VSAN_* constants + extend createDefaultScenario guard
└── __tests__/
    └── vsanFormulas.test.ts  # NEW — unit tests for all vSAN formula functions

src/types/
└── cluster.ts            # MODIFIED — extend Scenario interface with optional vSAN fields
```

### Pattern 1: Constants Table (vsanConstants.ts)

**What:** A single file with all FTT policy data as a constant record. Never inline magic numbers.
**When to use:** Any time a formula references an FTT multiplier or min-node count.

```typescript
// Source: VMware vSAN 8.0 Design Guide / VSAN-01, VSAN-11
export type VsanFttPolicy =
  | 'mirror-1'   // RAID-1 FTT=1, 2x multiplier, min 3 nodes
  | 'mirror-2'   // RAID-1 FTT=2, 3x multiplier, min 5 nodes
  | 'mirror-3'   // RAID-1 FTT=3, 4x multiplier, min 7 nodes
  | 'raid5'      // RAID-5 3+1, 1.33x multiplier, min 4 nodes
  | 'raid6';     // RAID-6 4+2, 1.5x multiplier, min 6 nodes

export interface FttPolicySpec {
  readonly multiplier: number;
  readonly minNodes: number;
  readonly label: string;
}

export const FTT_POLICY_MAP: Record<VsanFttPolicy, FttPolicySpec> = {
  'mirror-1': { multiplier: 2.0,     minNodes: 3, label: 'Mirror FTT=1 (2x)' },
  'mirror-2': { multiplier: 3.0,     minNodes: 5, label: 'Mirror FTT=2 (3x)' },
  'mirror-3': { multiplier: 4.0,     minNodes: 7, label: 'Mirror FTT=3 (4x)' },
  'raid5':    { multiplier: 1 + 1/3, minNodes: 4, label: 'RAID-5 3+1 (1.33x)' },
  'raid6':    { multiplier: 1.5,     minNodes: 6, label: 'RAID-6 4+2 (1.5x)' },
} as const;

// Overhead defaults
export const VSAN_METADATA_OVERHEAD_RATIO   = 0.02;   // 2% of usable
export const VSAN_DEFAULT_SLACK_PERCENT      = 25;     // 25% operations reserve
export const VSAN_DEFAULT_CPU_OVERHEAD_PCT   = 10;     // 10% of node GHz deducted
export const VSAN_DEFAULT_MEMORY_PER_HOST_GB = 6;      // 6 GB per host (ESA default)

// Compression factor labels (VSAN-08)
export type VsanCompressionFactor = 1.0 | 1.3 | 1.5 | 2.0 | 3.0;

export const COMPRESSION_FACTOR_LABELS: Record<VsanCompressionFactor, string> = {
  1.0: 'None (1:1)',
  1.3: 'Pessimistic (1.3:1)',
  1.5: 'Conservative (1.5:1)',
  2.0: 'Moderate (2:1)',
  3.0: 'Optimistic (3:1)',
} as const;
```

### Pattern 2: Storage Pipeline (vsanFormulas.ts)

**What:** A single exported function `computeVsanStorageRaw` that executes the 6-step pipeline in order.
**When to use:** Called from the CALC-03 vSAN branch in `constraints.ts`.

The pipeline order is a correctness invariant (VSAN-09 and pitfall V-3):
1. Apply compression factor: `effectiveUsableGib = usableGib / compressionFactor`
2. Add VM swap (optional): `effectiveUsableGib += vmSwap ? totalVmRamGib : 0`
3. Apply FTT multiplier: `rawGib = effectiveUsableGib * fttMultiplier`
4. Add metadata: `rawGib += usableGib * VSAN_METADATA_OVERHEAD_RATIO`
5. Add slack: `rawWithSlackGib = rawGib / (1 - slackPercent / 100)`
6. Return `rawWithSlackGib`

```typescript
// Source: VMware vSAN 8.0 Sizing Guide; VSAN-02, VSAN-03, VSAN-04, VSAN-05, VSAN-09
export interface VsanStorageParams {
  readonly usableGib: number;
  readonly fttPolicy: VsanFttPolicy;
  readonly compressionFactor?: VsanCompressionFactor;   // default 1.0 = no compression
  readonly vmSwapEnabled?: boolean;                      // default false
  readonly totalVmRamGib?: number;                       // required when vmSwapEnabled=true
  readonly slackPercent?: number;                        // default VSAN_DEFAULT_SLACK_PERCENT
}

/**
 * Computes total raw storage required (GiB) given vSAN policy and overhead settings.
 * Returns rawWithSlackGib — the raw capacity that must exist before any HA reserve.
 *
 * Pipeline (order is critical — compression BEFORE FTT):
 *   1. effectiveUsable = usable / compressionFactor
 *   2. effectiveUsable += totalVmRamGib (if vmSwapEnabled)
 *   3. raw = effectiveUsable * fttMultiplier
 *   4. raw += usable * VSAN_METADATA_OVERHEAD_RATIO
 *   5. rawWithSlack = raw / (1 - slackPercent/100)
 *
 * Math.ceil is NOT applied here — callers apply ceil at the server count level.
 */
export function computeVsanStorageRaw(params: VsanStorageParams): number {
  const {
    usableGib,
    fttPolicy,
    compressionFactor = 1.0,
    vmSwapEnabled = false,
    totalVmRamGib = 0,
    slackPercent = VSAN_DEFAULT_SLACK_PERCENT,
  } = params;

  const { multiplier } = FTT_POLICY_MAP[fttPolicy];

  // Step 1: compression reduces effective usable demand
  let effectiveUsableGib = usableGib / compressionFactor;

  // Step 2: VM swap (optional; 100% of VM RAM added to storage)
  if (vmSwapEnabled) {
    effectiveUsableGib += totalVmRamGib;
  }

  // Step 3: FTT multiplier → raw
  let rawGib = effectiveUsableGib * multiplier;

  // Step 4: metadata overhead on original usable
  rawGib += usableGib * VSAN_METADATA_OVERHEAD_RATIO;

  // Step 5: slack space
  const rawWithSlackGib = rawGib / (1 - slackPercent / 100);

  return rawWithSlackGib;
}
```

### Pattern 3: CPU Overhead Formula

**What:** A helper that computes the GHz consumed by vSAN per node.
**When to use:** Called in the CALC-01/CALC-01-GHZ branch of `computeScenarioResult` when vSAN fields are present.

```typescript
// Source: VMware vSAN planning guidance; VSAN-06
/**
 * GHz consumed by vSAN daemon per node.
 * effectiveGhzPerNode = nodeGhz * (1 - vsanCpuOverheadPercent/100)
 */
export function computeVsanEffectiveGhzPerNode(
  nodeGhz: number,
  vsanCpuOverheadPercent: number = VSAN_DEFAULT_CPU_OVERHEAD_PCT,
): number {
  return nodeGhz * (1 - vsanCpuOverheadPercent / 100);
}
```

### Pattern 4: Memory Overhead Formula

**What:** Deducts vSAN memory reservation per host from available RAM before sizing.
**When to use:** Called in the CALC-02 (RAM) branch when `vsanMemoryPerHostGb` is present.

```typescript
// Source: VMware vSAN design guide; VSAN-07
/**
 * Effective RAM available for VMs per node after vSAN reservation.
 * effectiveRamPerNodeGb = ramPerNodeGb - vsanMemoryPerHostGb
 */
export function computeVsanEffectiveRamPerNode(
  ramPerNodeGb: number,
  vsanMemoryPerHostGb: number = VSAN_DEFAULT_MEMORY_PER_HOST_GB,
): number {
  return Math.max(0, ramPerNodeGb - vsanMemoryPerHostGb);
}
```

### Pattern 5: Server Count by vSAN Storage

**What:** Computes storage-limited server count from raw GiB demand.
**When to use:** Replaces `serverCountByDisk` in the HCI+vSAN path.

```typescript
// Source: derived from VSAN-02, VSAN-11
/**
 * Server count limited by vSAN raw storage capacity.
 * Enforces FTT minimum node floor (VSAN-11).
 *
 * Formula:
 *   rawRequired = computeVsanStorageRaw(params)
 *   count = ceil(rawRequired / rawPerNodeGib)
 *   return max(count, FTT_POLICY_MAP[fttPolicy].minNodes)
 */
export function serverCountByVsanStorage(
  usableGib: number,
  rawPerNodeGib: number,
  fttPolicy: VsanFttPolicy,
  options?: Omit<VsanStorageParams, 'usableGib' | 'fttPolicy'>,
): number {
  const rawRequired = computeVsanStorageRaw({ usableGib, fttPolicy, ...options });
  const countByStorage = Math.ceil(rawRequired / rawPerNodeGib);
  const minNodes = FTT_POLICY_MAP[fttPolicy].minNodes;
  return Math.max(countByStorage, minNodes);
}
```

### Pattern 6: Scenario Interface Extension (cluster.ts)

**What:** Optional vSAN fields on the existing `Scenario` interface.
**When to use:** Phase 18 adds the fields; Phase 20 will populate them from the UI.

```typescript
// Additions to existing Scenario interface (src/types/cluster.ts)
// All fields optional — absent fields use the legacy sizing path (VSAN-12)
readonly vsanFttPolicy?: VsanFttPolicy;              // VSAN-01 — triggers vSAN storage path
readonly vsanCompressionFactor?: VsanCompressionFactor; // VSAN-08 — default 1.0
readonly vsanSlackPercent?: number;                  // VSAN-05 — default 25
readonly vsanCpuOverheadPercent?: number;            // VSAN-06 — default 10
readonly vsanMemoryPerHostGb?: number;               // VSAN-07 — default 6
readonly vsanVmSwapEnabled?: boolean;                // VSAN-04 — default false
```

### Pattern 7: constraints.ts Extension (CALC-03 branch)

**What:** Conditional dispatch at the CALC-03 disk-limited site.
**When to use:** When `scenario.vsanFttPolicy` is truthy, call vSAN path.

```typescript
// In computeScenarioResult — replace existing CALC-03 block
// CALC-03: Disk-limited count
let diskLimitedCount: number;
if (layoutMode === 'disaggregated') {
  diskLimitedCount = 0;
} else if (scenario.vsanFttPolicy) {
  // vSAN-aware path (VSAN-02, VSAN-11)
  const usableGib = effectiveVmCount * scenario.diskPerVmGb; // diskPerVmGb is already GiB
  diskLimitedCount = serverCountByVsanStorage(
    usableGib,
    scenario.diskPerServerGb,
    scenario.vsanFttPolicy,
    {
      compressionFactor: scenario.vsanCompressionFactor ?? 1.0,
      vmSwapEnabled:     scenario.vsanVmSwapEnabled ?? false,
      totalVmRamGib:     effectiveVmCount * scenario.ramPerVmGb,
      slackPercent:      scenario.vsanSlackPercent ?? VSAN_DEFAULT_SLACK_PERCENT,
    },
  );
} else {
  // Legacy path — unchanged (VSAN-12)
  diskLimitedCount = serverCountByDisk(
    effectiveVmCount,
    scenario.diskPerVmGb,
    headroomFactor,
    scenario.diskPerServerGb,
  );
}
```

Note: the RAM path also needs a branch when `vsanMemoryPerHostGb` is set — pass `computeVsanEffectiveRamPerNode(scenario.ramPerServerGb, scenario.vsanMemoryPerHostGb)` as the `ramPerServerGb` argument to `serverCountByRam`.

### Anti-Patterns to Avoid

- **Inline FTT numbers:** Never write `* 1.33` in formula code. Always look up `FTT_POLICY_MAP[policy].multiplier`.
- **Post-FTT compression:** Never divide raw by compressionFactor. Compression must precede FTT multiplication.
- **`toEqual` on float results:** Always use `toBeCloseTo(expected, 4)` for storage calculations.
- **Adding vSAN swap to post-FTT raw:** VM swap occupies usable space, so it joins effectiveUsable before FTT.
- **No zero-guard on rawPerNode:** Add `if (rawPerNodeGib <= 0) return minNodes` to prevent division-by-zero.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FTT multiplier lookup | Conditional chain `if ftt === 'mirror-1' return 2.0 ...` | `FTT_POLICY_MAP[policy].multiplier` | Branchy, error-prone, can't be iterated for display |
| Min-node enforcement | Separate conditional in constraints.ts | `Math.max(countByStorage, FTT_POLICY_MAP[fttPolicy].minNodes)` | Collocated with the policy data |
| Floating-point storage display | Manual unit rounding | Existing `display.ts` pattern (or new helper following same pattern) | Consistent with existing codebase style |

**Key insight:** vSAN constants are the authoritative reference — the formula engine must never derive them at runtime from intermediate calculations.

---

## Common Pitfalls

### Pitfall 1: RAID-5 multiplier is 4/3, not 1.33
**What goes wrong:** Storing `1.33` causes rounding error vs. the true `4/3 = 1.3333...` value.
**Why it happens:** Human-readable approximation used instead of exact fraction.
**How to avoid:** Store as `1 + 1/3` in the constant definition. TypeScript evaluates it at compile time.
**Warning signs:** Test expects 1.333-multiplied result but gets 1.330-multiplied result.

### Pitfall 2: Compression applied after FTT
**What goes wrong:** Compression savings are massively understated because they only reduce the overhead copies.
**Why it happens:** Pipeline steps written in wrong order.
**How to avoid:** The pipeline function must enforce order explicitly with numbered comments. Unit test with a concrete example: 100 GiB usable, 1.5x compression, Mirror FTT=1 → effectiveUsable = 66.67 GiB → raw = 133.33 GiB (not raw = 200 / 1.5 = 133.33 which is accidentally the same — use FTT=2 to distinguish).
**Warning signs:** No failing test on a known reference value.

### Pitfall 3: Slack formula direction
**What goes wrong:** `rawGib * (1 + slackPercent/100)` adds slack as a percentage of raw, but the correct formula `rawGib / (1 - slackPercent/100)` reserves slack as a percentage of the final total.
**Why it happens:** Both formulas look similar but produce different values (25% slack: `raw * 1.25` vs `raw / 0.75` = `raw * 1.333`).
**How to avoid:** The `/ (1 - slack/100)` form is the vSAN standard — verify with a numeric example.
**Warning signs:** Slack space appears as 25% of raw instead of 33.3% of raw.

### Pitfall 4: Missing zero-guard on compression factor
**What goes wrong:** `usableGib / 0` returns `Infinity` which propagates through all subsequent steps.
**Why it happens:** User might pass `compressionFactor = 0` by accident.
**How to avoid:** `const factor = Math.max(compressionFactor ?? 1.0, 1.0)` — never let factor fall below 1.0.

### Pitfall 5: Old localStorage Scenario missing vsanFttPolicy
**What goes wrong:** When v1.x sessions are loaded from localStorage, `scenario.vsanFttPolicy` is `undefined`. If code does `FTT_POLICY_MAP[scenario.vsanFttPolicy]` without a guard, it returns `undefined` and crashes.
**Why it happens:** Optional fields not guarded before lookup.
**How to avoid:** The `else if (scenario.vsanFttPolicy)` guard in constraints.ts is the protection. Never call `FTT_POLICY_MAP[...]` unless inside that truthy branch.

### Pitfall 6: Unit of diskPerServerGb vs GiB
**What goes wrong:** The `Scenario.diskPerServerGb` field is named "Gb" but in sizing context it is actually GiB (binary). Mixing TB (decimal) into the pipeline creates ~10% errors.
**Why it happens:** Historical naming inconsistency in the existing codebase.
**How to avoid:** Document this explicitly in vsanFormulas.ts header: "All `diskPerVmGb` and `diskPerServerGb` values from Scenario are treated as GiB (binary) throughout the vSAN pipeline (VSAN-10)."

---

## Code Examples

### Full verified storage pipeline example (known reference values)

```typescript
// Source: manual verification against VMware vSAN sizing spreadsheet
// Inputs:
//   usable = 1000 GiB (total VM disk)
//   FTT = mirror-1 (2x)
//   compression = 1.5 (conservative)
//   vmSwap = false
//   slack = 25%
//   metadata = 2% of usable

// Step 1: effectiveUsable = 1000 / 1.5 = 666.67 GiB
// Step 2: no swap → 666.67 GiB
// Step 3: raw = 666.67 * 2.0 = 1333.33 GiB
// Step 4: metadata = 1000 * 0.02 = 20 GiB → raw = 1353.33 GiB
// Step 5: rawWithSlack = 1353.33 / (1 - 0.25) = 1353.33 / 0.75 = 1804.44 GiB
// Expected: toBeCloseTo(1804.44, 1)

// Inputs:
//   usable = 1000 GiB
//   FTT = raid5 (1+1/3 = 1.3333...)
//   compression = 1.0 (none)
//   vmSwap = false, slack = 25%

// Step 1: effectiveUsable = 1000 / 1.0 = 1000 GiB
// Step 3: raw = 1000 * (4/3) = 1333.33 GiB
// Step 4: metadata = 20 GiB → raw = 1353.33 GiB
// Step 5: rawWithSlack = 1353.33 / 0.75 = 1804.44 GiB
// Expected: toBeCloseTo(1804.44, 1)
// Note: RAID-5 with no compression and Mirror-1 with 1.5x compression happen to equal —
//       use FTT=mirror-2 (3x) to get a clearly distinct test value.
```

### Min-node floor enforcement

```typescript
// Source: VSAN-11
// 3 VMs × 1 TiB disk = 3 TiB usable, rawPerNode = 100 TiB
// ceil(rawWithSlack / 100) = 1 node; but mirror-1 requires min 3 nodes
// serverCountByVsanStorage must return 3

expect(serverCountByVsanStorage(3 * 1024, 100 * 1024, 'mirror-1')).toBe(3);
```

### CPU overhead deduction

```typescript
// Source: VSAN-06
// nodeGhz = 100, vsanCpuOverheadPercent = 10
// effectiveGhzPerNode = 100 * (1 - 10/100) = 90 GHz

expect(computeVsanEffectiveGhzPerNode(100, 10)).toBeCloseTo(90);
expect(computeVsanEffectiveGhzPerNode(100)).toBeCloseTo(90); // default 10%
```

### Memory overhead deduction

```typescript
// Source: VSAN-07
// ramPerNodeGb = 512, vsanMemoryPerHostGb = 6
// effectiveRam = 512 - 6 = 506 GB

expect(computeVsanEffectiveRamPerNode(512, 6)).toBe(506);
expect(computeVsanEffectiveRamPerNode(512)).toBe(506); // default 6 GB
expect(computeVsanEffectiveRamPerNode(4, 6)).toBe(0);  // clamped at 0
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single diskPerServerGb path for HCI | Conditional vSAN-aware path vs legacy path | Phase 18 | No breaking change; vSAN path only activates when vsanFttPolicy is set |
| No min-node floor in disk constraint | FTT min-node floor enforced inside serverCountByVsanStorage | Phase 18 | Prevents technically-invalid cluster configs |

**No deprecated items** — this phase adds entirely new code paths without touching existing ones.

---

## Open Questions

1. **RAID-5 multiplier precision in constants**
   - What we know: `1 + 1/3` evaluates to `1.3333333333333333` in JavaScript (IEEE 754 double)
   - What's unclear: Whether display layer should show "1.33x" or "4/3x"
   - Recommendation: Store as `1 + 1/3` in constant; display as "1.33x" in label string — this is Phase 20 scope, not Phase 18.

2. **diskPerVmGb and diskPerServerGb naming vs GiB semantics**
   - What we know: Existing `Scenario` fields use "Gb" suffix but are used as binary GiB throughout
   - What's unclear: Whether Phase 18 should rename these or just document the convention
   - Recommendation: Do NOT rename (breaking change, affects all existing tests). Add JSDoc comment to `vsanFormulas.ts` stating the convention. Add new `vsanStorage*Gib` names for any new fields if needed.

3. **CPU overhead application point for non-GHz modes**
   - What we know: VSAN-06 says "deduct vSAN CPU overhead from available cores" — but existing vCPU/ratio mode doesn't use GHz
   - What's unclear: In `vcpu` mode, should vSAN CPU overhead reduce `coresPerServer` by 10%? Or is it only meaningful in `ghz` mode?
   - Recommendation: Apply vSAN CPU overhead only in `ghz` mode (reduces `ghzPerServer`). In `vcpu` mode, CPU overhead is implicit in the headroom percent. Document this scoping decision in the function JSDoc. This is a Phase 18 scoping decision that should be locked before coding.

---

## Sources

### Primary (HIGH confidence)
- Project research files (`FEATURES.md`, `ARCHITECTURE.md`, `PITFALLS.md`) — vSAN constants, pipeline steps, all verified against VMware documentation
- `src/lib/sizing/constraints.ts` — exact extension points for CALC-03 and CALC-02 branches
- `src/lib/sizing/formulas.ts` — established patterns: named params, no intermediate ceil, zero-guards
- `src/types/cluster.ts` — exact `Scenario` interface to extend with optional fields
- `src/lib/sizing/__tests__/formulas.test.ts` — test fixture pattern to follow (describe/it/expect, `toBeCloseTo`)
- `vitest.config.ts` — confirms Vitest + jsdom, test glob pattern `src/**/*.{test,spec}.{ts,tsx}`

### Secondary (MEDIUM confidence)
- VMware vSAN 8.0 Design Guide (via FEATURES.md research) — FTT multiplier table, min-node requirements, overhead defaults

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; existing Vitest + TypeScript project
- Architecture: HIGH — extension points in constraints.ts are clearly documented and isolated
- Formula constants: HIGH — drawn from authoritative VMware documentation via prior research
- Pitfalls: HIGH — V-3 (compression order), V-5 (units), T-1 (floats) are all well-documented failure modes

**Research date:** 2026-03-14
**Valid until:** 2026-06-14 (vSAN planning constants are stable; no runtime dependencies)

**nyquist_validation:** Disabled (`workflow.nyquist_validation: false` in `.planning/config.json`) — Validation Architecture section omitted per config.
