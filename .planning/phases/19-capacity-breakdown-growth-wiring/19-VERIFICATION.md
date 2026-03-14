---
phase: 19-capacity-breakdown-growth-wiring
verified: 2026-03-14T23:00:00Z
status: gaps_found
score: 9/11 must-haves verified
re_verification: false
gaps:
  - truth: "CPU breakdown shows VMs Required (grown demand) in GHz"
    status: failed
    reason: "computeVsanBreakdown uses cluster.totalVcpus (ungrown) for vmsRequired instead of applying cpuGrowthPercent. When growth is non-zero, the breakdown vmsRequired field shows base demand, not the grown demand that was used to compute finalCount."
    artifacts:
      - path: "src/lib/sizing/vsanBreakdown.ts"
        issue: "Line 122: vmsRequired = cluster.totalVcpus * freqGhz — does not apply cpuGrowthPercent. When cpuGrowthPercent=20 and totalVcpus=200, vmsRequired shows 200*freq but constraints.ts used 240*freq."
    missing:
      - "Apply cpuGrowthFactor in computeCpuBreakdown: vmsRequired = cluster.totalVcpus * freqGhz * (1 + (scenario.cpuGrowthPercent ?? 0) / 100)"
      - "Apply memGrowthFactor in computeMemoryBreakdown: vmsRequired = effectiveVmCount * scenario.ramPerVmGb * (1 + (scenario.memoryGrowthPercent ?? 0) / 100)"
      - "Apply storageGrowthFactor in computeStorageBreakdown: usableRequired = effectiveVmCount * scenario.diskPerVmGb * (1 + (scenario.storageGrowthPercent ?? 0) / 100)"
      - "Add growth-aware tests in vsanBreakdown.test.ts verifying that vmsRequired reflects grown demand"
  - truth: "The invariant Required + Spare + Excess = Total holds for every resource breakdown"
    status: partial
    reason: "Invariant holds mathematically (all 14 tests pass), but the 'Required' component in the invariant reflects ungrown demand when growth is set. The invariant will continue to hold after growth is applied (it's a math identity) but is currently computed on ungrown values. This is a consistency gap rather than a logic error."
    artifacts:
      - path: "src/lib/sizing/vsanBreakdown.ts"
        issue: "Invariant holds but Required uses ungrown demand — once growth is applied, invariant will still hold"
    missing:
      - "No additional invariant fix needed — this resolves when the demand gap above is fixed"
---

# Phase 19: Capacity Breakdown & Growth Wiring Verification Report

**Phase Goal:** Users who have defined a scenario receive a complete capacity breakdown for CPU, Memory, and Storage — showing Required, Reserved, HA Reserve, Spare, Excess, and Total Configured — with growth factors applied to all demand inputs before overhead calculation.
**Verified:** 2026-03-14T23:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Setting cpuGrowthPercent=20 causes 20% more CPU demand before headroom | VERIFIED | constraints.ts lines 98-102; test "cpuGrowthPercent=20 increases cpuLimitedCount from 7 to 8" passes |
| 2  | Setting memoryGrowthPercent=30 causes 30% more RAM demand before headroom | VERIFIED | constraints.ts lines 99, 103; test "memoryGrowthPercent=50 increases ramLimitedCount from 1 to 2" passes |
| 3  | Setting storageGrowthPercent=15 causes 15% more storage demand before headroom | VERIFIED | constraints.ts lines 100, 104; test "storageGrowthPercent=100 doubles diskLimitedCount" passes |
| 4  | Absent growth fields default to 0% with no change in sizing result | VERIFIED | Null-coalescing: `?? 0` on all three growth fields; regression test passes |
| 5  | CPU breakdown shows VMs Required (grown), vSAN Consumption, Total Required, Reserved, HA Reserve, Spare, Excess, Total Configured in GHz | FAILED | vsanBreakdown.ts line 122 uses `cluster.totalVcpus * freqGhz` (ungrown). Growth factor NOT applied to vmsRequired in breakdown |
| 6  | Memory breakdown shows same row structure in GiB with grown demand | FAILED | vsanBreakdown.ts line 175 uses `effectiveVmCount * scenario.ramPerVmGb` (ungrown). Growth factor NOT applied |
| 7  | Storage breakdown shows decomposed vSAN pipeline with grown demand | FAILED | vsanBreakdown.ts line 244 uses `effectiveVmCount * scenario.diskPerVmGb` (ungrown). Growth factor NOT applied |
| 8  | Invariant Required + Spare + Excess = Total holds for every breakdown | VERIFIED | 14 TDD tests all assert `required + spare + excess ≈ total` within 1e-5 tolerance; all pass |
| 9  | Formula display strings show growth factor annotation when growth is non-zero | VERIFIED | display.ts lines 60, 80, 96; 7 tests in "Growth annotations (GROW-04)" block pass |
| 10 | Formula display strings unchanged when growth is 0% or absent | VERIFIED | Condition `!== 0` guards suffix insertion; tests for cpuGrowthPercent=0 and absent pass |
| 11 | useVsanBreakdowns hook returns one VsanCapacityBreakdown per scenario | VERIFIED | useVsanBreakdowns.ts lines 25-28; 6 renderHook tests pass including reactivity test |

**Score:** 8/11 truths verified (3 failed due to missing growth application in vsanBreakdown.ts)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types/cluster.ts` | Scenario interface with cpuGrowthPercent, memoryGrowthPercent, storageGrowthPercent optional fields | VERIFIED | Lines 56-59: all 3 growth fields present with GROW-01 comments |
| `src/lib/sizing/constraints.ts` | Growth factor pre-multiply step in computeScenarioResult | VERIFIED | Lines 97-104: cpuGrowthFactor, memGrowthFactor, storageGrowthFactor computed and applied |
| `src/lib/sizing/__tests__/constraints.test.ts` | 6 integration tests proving growth wiring | VERIFIED | Lines 583-700+: "Growth factor wiring (Phase 19)" describe block with 6 test cases |
| `src/types/breakdown.ts` | ResourceBreakdown, StorageBreakdown, VsanCapacityBreakdown interfaces | VERIFIED | All 3 interfaces exported; includes all required fields |
| `src/lib/sizing/vsanBreakdown.ts` | computeVsanBreakdown pure function | VERIFIED (partial) | Function exists and computes breakdown; however growth factors NOT applied to demand fields |
| `src/lib/sizing/__tests__/vsanBreakdown.test.ts` | TDD tests with invariant checks | VERIFIED | 14 test cases; invariant assertions present in every test; all pass |
| `src/lib/sizing/display.ts` | Growth-annotated formula strings | VERIFIED | cpuGrowthPercent, memoryGrowthPercent, storageGrowthPercent added to params; suffix logic in lines 60, 80, 96 |
| `src/lib/sizing/__tests__/display.test.ts` | Tests for growth annotation | VERIFIED | 7 tests in "Growth annotations (GROW-04)" describe block |
| `src/hooks/useVsanBreakdowns.ts` | Derive-on-read hook for capacity breakdowns | VERIFIED | Exports useVsanBreakdowns; reads 3 stores; calls computeScenarioResult + computeVsanBreakdown per scenario |
| `src/hooks/__tests__/useVsanBreakdowns.test.ts` | renderHook tests for useVsanBreakdowns | VERIFIED | 6 tests; covers empty array, per-scenario mapping, properties, invariant, reactivity |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/sizing/constraints.ts` | `src/types/cluster.ts` | `scenario.cpuGrowthPercent` | WIRED | Line 98: `scenario.cpuGrowthPercent ?? 0` |
| `src/lib/sizing/vsanBreakdown.ts` | `src/types/breakdown.ts` | `VsanCapacityBreakdown` return type | WIRED | Import at line 15-19; return type at line 40 |
| `src/lib/sizing/vsanBreakdown.ts` | `src/types/results.ts` | `ScenarioResult` input parameter | WIRED | Import at line 14; parameter at line 39 |
| `src/lib/sizing/vsanBreakdown.ts` | `src/lib/sizing/vsanFormulas.ts` | `computeVsanStorageRaw` reuse | NOT WIRED | vsanBreakdown.ts reimplements the vSAN storage pipeline inline; it does NOT import or call `computeVsanStorageRaw`. Plan 02 key_link specified this reuse. |
| `src/hooks/useVsanBreakdowns.ts` | `src/lib/sizing/vsanBreakdown.ts` | `computeVsanBreakdown` import | WIRED | Line 5: `import { computeVsanBreakdown }` |
| `src/hooks/useVsanBreakdowns.ts` | `src/lib/sizing/constraints.ts` | `computeScenarioResult` import | WIRED | Line 4: `import { computeScenarioResult }` |
| `src/hooks/useVsanBreakdowns.ts` | `src/store/useClusterStore.ts` | Zustand store selector | WIRED | Line 20: `useClusterStore((state) => state.currentCluster)` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| GROW-01 | 19-01-PLAN.md | User can set per-resource growth percentages | SATISFIED | Scenario.cpuGrowthPercent, memoryGrowthPercent, storageGrowthPercent fields in cluster.ts |
| GROW-02 | 19-01-PLAN.md | Growth applied as compound factor BEFORE overhead | SATISFIED | constraints.ts lines 97-104: growth factor applied before headroomFactor in CALC-01/02/03 |
| GROW-03 | 19-01-PLAN.md | Growth fields default to 0% and are optional | SATISFIED | All three fields are `?: number`; null-coalesced with `?? 0` |
| GROW-04 | 19-03-PLAN.md | Growth factors visible in formula display strings | SATISFIED | display.ts growth suffix logic; 7 tests passing |
| CAP-01 | 19-02-PLAN.md | CPU breakdown table structure in GHz | PARTIAL | ResourceBreakdown type has all required fields; computeCpuBreakdown computes all rows. However vmsRequired uses ungrown totalVcpus, so the "VMs Required" row shows base demand, not grown demand when cpuGrowthPercent is set |
| CAP-02 | 19-02-PLAN.md | Memory breakdown table structure in GiB | PARTIAL | Same issue: vmsRequired uses ungrown scenario.ramPerVmGb |
| CAP-03 | 19-02-PLAN.md | Storage breakdown table structure | PARTIAL | Same issue: usableRequired uses ungrown scenario.diskPerVmGb |
| CAP-04 | 19-02-PLAN.md | HA Reserve = one host (CPU/Mem), 1/N cluster (storage) | SATISFIED | CPU: `coresPerServer * freqGhz`; Memory: `scenario.ramPerServerGb`; Storage: `total / finalCount` |
| CAP-05 | 19-02-PLAN.md | Max Utilization Reserve formula | SATISFIED | computeMaxUtilReserve function at lines 344-348: `(required / fraction) * (1 - fraction)` |
| CAP-06 | 19-02-PLAN.md | Excess = Total - Required - Spare (invariant) | SATISFIED | All 14 breakdown tests assert invariant; holds mathematically |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| No anti-patterns found | — | — | — | — |

All 500 tests pass. TypeScript compiles cleanly with zero errors.

### Human Verification Required

#### 1. Growth Demand Discrepancy (UI Impact)

**Test:** Configure a scenario with cpuGrowthPercent=20. Navigate to Step 3. Inspect the capacity breakdown table's "VMs Required" CPU row.
**Expected:** "VMs Required" should show grown CPU demand (e.g., 240 GHz when base is 200 GHz and growth is 20%), matching what was used in the server count calculation.
**Why human:** The breakdown table rendering (Phase 21) has not been built yet. When it is built, the demand figures shown will be inconsistent with the server count calculation unless vsanBreakdown.ts is patched to apply growth factors.

#### 2. computeVsanStorageRaw Inline Reimplementation

**Test:** Compare the vSAN storage pipeline in vsanBreakdown.ts against vsanFormulas.ts for correctness of intermediate steps.
**Expected:** The inline reimplementation should produce identical results to computeVsanStorageRaw for all policy/compression/swap combinations.
**Why human:** The plan required reuse of computeVsanStorageRaw, but the implementation inlined it. All current tests pass, but future changes to vsanFormulas.ts will not automatically propagate to vsanBreakdown.ts, risking divergence.

### Gaps Summary

**Root cause:** `computeVsanBreakdown` was intended (per PLAN-02) to apply growth factors when reconstructing demand for display, but the SUMMARY-02 explicitly acknowledged this was "NOT yet wired." The breakdown's `vmsRequired`, `usableRequired` fields show base (ungrown) demand while the server count (`finalCount`) was computed using grown demand. This makes the breakdown table display internally inconsistent when growth percentages are non-zero.

**Impact:** When a user sets cpuGrowthPercent=20%, the breakdown table will show:
- VMs Required: 500 GHz (base)
- Total Configured: 480 GHz
- Excess: -140 GHz

But the actual server count calculation used 600 GHz CPU demand (500 * 1.20), which is why 4 servers were allocated. The table will appear to show the cluster is allocated correctly when the real driver (growth) is invisible.

**Secondary gap:** `computeVsanStorageRaw` from `vsanFormulas.ts` is not reused — the vSAN pipeline is reimplemented inline in `vsanBreakdown.ts`. This creates maintenance risk but all tests currently pass.

**Scope clarification:** GROW-02 ("growth applied before overhead calculation") is SATISFIED in the sizing engine. The gap is specifically in the breakdown display layer where grown demand is not surfaced in `vmsRequired`/`usableRequired` fields.

---

_Verified: 2026-03-14T23:00:00Z_
_Verifier: Claude (gsd-verifier)_
